import { randomUUID } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { type AgentState, categorizeTool, type DenEvent, type DenEventKind } from '@agent-den/contracts';

import { cursorSubagentTranscript } from '../transcripts/transcript-registry';

/** Subset of the Cursor hook stdin payload we rely on. */
export type CursorHookPayload = {
  hook_event_name: string;
  /** The agent the hook fired in: the session, or a subagent inside it. */
  conversation_id: string;
  workspace_roots?: string[];
  /** The session transcript; `null` in hooks fired inside a subagent. */
  transcript_path?: string | null;
  prompt?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  /** `postToolUseFailure`: the user stopped the tool. */
  is_interrupt?: boolean;
  /** `stop` and `subagentStop`: how the turn ended. */
  status?: 'completed' | 'aborted' | 'error';
  /** `subagentStart` / `subagentStop`. */
  subagent_id?: string;
  subagent_type?: string;
  task?: string;
  parent_conversation_id?: string;
  agent_transcript_path?: string | null;
};

type AgentLookup = { get(agentId: string): AgentState | undefined };

/** A subagent Cursor has started but whose own conversation id we may not know yet. */
type StartedKitten = {
  /** Id from `subagentStart` — also the den id, so the kitten exists before its first own hook. */
  id: string;
  parent: string;
  /** When `subagentStart` was seen. Files older than this belong to earlier kittens. */
  startedAt: number;
  /** The parent's transcript, so the kitten's own file can be found once its conversation id is known. */
  parentTranscript?: string;
  /** The conversation id its own hooks use, once seen. Equals `id` when Cursor uses one id for both. */
  bound?: string;
};

/**
 * Parallel workers report `subagent_id` as two ids joined by a newline (`call-…\\nfc_…`). The first line
 * differs per kitten; the rest is the same tool-call batch.
 */
function hookAgentId(raw: string | undefined): string | undefined {
  const id = raw?.split(/[\r\n]/).find(line => line.trim());
  return id?.trim() || undefined;
}

/** `…/subagents/<id>.jsonl` belongs to the subagent `<id>`, not to a separate session. */
function isSubagentTranscript(transcriptPath: string, conversationId: string): boolean {
  return basename(dirname(transcriptPath)) === 'subagents' && basename(transcriptPath, '.jsonl') === conversationId;
}

const kindByHook: Record<string, DenEventKind> = {
  sessionStart: 'session-start',
  sessionEnd: 'session-end',
  beforeSubmitPrompt: 'prompt',
  preToolUse: 'tool-start',
  postToolUse: 'tool-end',
  postToolUseFailure: 'tool-error',
  subagentStart: 'subagent-start',
  subagentStop: 'subagent-stop',
  stop: 'stop',
};

/** Hooks with a `status`: an aborted turn is the user's Esc, an error ends it with a failure. */
const kindByStatus: Partial<Record<NonNullable<CursorHookPayload['status']>, DenEventKind>> = {
  aborted: 'interrupted',
  error: 'tool-error',
};

function describeToolInput(input: Record<string, unknown> | undefined): string | undefined {
  const value =
    input?.['file_path'] ??
    input?.['path'] ??
    input?.['command'] ??
    input?.['pattern'] ??
    input?.['url'] ??
    input?.['query'] ??
    input?.['description'];
  return typeof value === 'string' ? value.slice(0, 160) : undefined;
}

/**
 * Cursor hooks → den events. Stateful: hooks fired inside a subagent carry only the subagent's own id, so the
 * subagent → parent link from `subagentStart` is remembered (and recovered from the store after a restart).
 */
export class CursorAdapter {
  private readonly parents = new Map<string, string>();
  /** Conversation id used by hooks inside a subagent → the kitten id from `subagentStart`. */
  private readonly alias = new Map<string, string>();
  private readonly started: StartedKitten[] = [];
  /** Kitten id → its real transcript. Parallel workers name that file by the conversation id, not `subagent_id`. */
  private readonly transcripts = new Map<string, string>();
  /** Agents Cursor hooks reported on since the collector started — the rest are known from transcripts only. */
  private readonly heard = new Set<string>();

  constructor(private readonly agents: AgentLookup) {}

  heardFrom(agentId: string): boolean {
    return this.heard.has(agentId);
  }

  parentOf(agentId: string): string | undefined {
    const id = this.canonical(agentId);
    return this.parents.get(id) ?? this.agents.get(id)?.parentAgentId;
  }

  private canonical(agentId: string): string {
    return this.alias.get(agentId) ?? agentId;
  }

  /**
   * Hooks inside a subagent carry only its conversation id, which for a parallel worker is not the
   * `subagent_id` from `subagentStart`. Bind the first unknown conversation (no transcript path — that
   * belongs to a root session) to the oldest kitten still waiting for one.
   */
  private claim(conversationId: string, transcriptPath: string | null | undefined): void {
    const own = this.started.find(kitten => kitten.id === conversationId);
    if (own) {
      own.bound = conversationId;
      this.rememberTranscript(own, conversationId);
      return;
    }
    if (this.alias.has(conversationId) || this.parentOf(conversationId)) {
      return;
    }
    // A root session's transcript lives next to its folder. A file under `subagents/` is a kitten, even when
    // the hook carries that path — otherwise the subagent is stored as its own grown cat.
    if (transcriptPath && !isSubagentTranscript(transcriptPath, conversationId)) {
      return;
    }
    const next = this.started.find(kitten => !kitten.bound);
    if (!next) {
      return;
    }
    next.bound = conversationId;
    this.alias.set(conversationId, next.id);
    this.parents.set(conversationId, next.parent);
    this.rememberTranscript(next, conversationId);
  }

  private rememberTranscript(kitten: StartedKitten, conversationId: string): void {
    if (!kitten.parentTranscript) {
      return;
    }
    this.transcripts.set(kitten.id, cursorSubagentTranscript(kitten.parentTranscript, conversationId));
  }

  /** Transcript paths learned since the adapter started. Keyed by the kitten id the den stores. */
  transcriptPaths(): [agentId: string, path: string][] {
    return [...this.transcripts];
  }

  /**
   * Cursor often never sends the hooks that run inside a parallel subagent, so nothing claims it.
   * The transcript file still shows up next to the parent. Pair those files with kittens still waiting.
   * Returns conversation ids that were already stored as their own cats and should be sent home.
   */
  private absorbSubagentFiles(parentTranscript: string): string[] {
    const dir = join(dirname(parentTranscript), 'subagents');
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return [];
    }
    const files = names
      .filter(name => name.endsWith('.jsonl'))
      .map(name => {
        const id = name.slice(0, -'.jsonl'.length);
        return { id, mtime: statSync(join(dir, name)).mtimeMs };
      })
      .sort((a, b) => a.mtime - b.mtime);
    // Any root cat whose id is a file in this parent's `subagents/` is a subagent hook that arrived
    // before `subagentStart`. It is the grown cat the user sees standing. Send it home.
    const strays = files.flatMap(({ id }) => {
      const agent = this.agents.get(id);
      return agent && !agent.parentAgentId && agent.activity !== 'gone' ? [id] : [];
    });
    const used = new Set(this.started.flatMap(kitten => (kitten.bound ? [kitten.bound] : [])));
    const waiting = this.started.filter(kitten => !kitten.bound && kitten.parentTranscript === parentTranscript);
    const available = files.filter(file => !used.has(file.id) && !this.started.some(kitten => kitten.id === file.id));
    for (const kitten of waiting) {
      // The transcript is often flushed before `subagentStart` arrives. A few seconds is not enough.
      const match = available.find(file => file.mtime >= kitten.startedAt - 60_000);
      if (!match) {
        continue;
      }
      available.splice(available.indexOf(match), 1);
      kitten.bound = match.id;
      this.alias.set(match.id, kitten.id);
      this.parents.set(match.id, kitten.parent);
      this.transcripts.set(kitten.id, join(dir, `${match.id}.jsonl`));
    }
    return strays;
  }

  /** The root session of an agent: subagents may spawn subagents. */
  private homeEvents(ids: string[]): DenEvent[] {
    return ids.map(id => ({
      id: randomUUID(),
      source: 'cursor' as const,
      kind: 'session-end' as const,
      sessionId: id,
      agentId: id,
      timestamp: Date.now(),
    }));
  }

  private sessionOf(agentId: string): string {
    return this.agents.get(agentId)?.sessionId ?? agentId;
  }

  toEvent(payload: CursorHookPayload): DenEvent | null {
    return this.toEvents(payload).at(-1) ?? null;
  }

  toEvents(payload: CursorHookPayload): DenEvent[] {
    const hook = payload.hook_event_name;
    let kind = kindByHook[hook];
    if (!kind || !payload.conversation_id) {
      return [];
    }
    if (payload.status) {
      kind = kindByStatus[payload.status] ?? kind;
    }
    if (hook === 'postToolUseFailure' && payload.is_interrupt) {
      kind = 'interrupted';
    }

    const isSubagentHook = hook === 'subagentStart' || hook === 'subagentStop';
    const reportedId = isSubagentHook ? hookAgentId(payload.subagent_id) : payload.conversation_id;
    if (!reportedId) {
      return [];
    }
    if (hook === 'subagentStart') {
      const parent = payload.parent_conversation_id ?? payload.conversation_id;
      this.parents.set(reportedId, parent);
      // Cursor repeats subagentStart. A second slot would steal another kitten's transcript.
      if (!this.started.some(kitten => kitten.id === reportedId)) {
        this.started.push({
          id: reportedId,
          parent,
          startedAt: Date.now(),
          parentTranscript: typeof payload.transcript_path === 'string' ? payload.transcript_path : undefined,
        });
      }
    }
    if (hook === 'subagentStop' && payload.agent_transcript_path) {
      this.claim(basename(payload.agent_transcript_path, '.jsonl'), null);
      this.transcripts.set(this.canonical(reportedId), payload.agent_transcript_path);
    }
    if (!isSubagentHook) {
      this.claim(payload.conversation_id, payload.transcript_path);
    }
    const strayFromFiles =
      typeof payload.transcript_path === 'string' ? this.absorbSubagentFiles(payload.transcript_path) : [];

    const agentId = this.canonical(reportedId);
    const parentAgentId = this.parentOf(agentId);
    // A subagent runs as a conversation of its own; its session hooks are not a new cat.
    if (parentAgentId && (hook === 'sessionStart' || hook === 'sessionEnd')) {
      return this.homeEvents(strayFromFiles);
    }

    const cwd = payload.workspace_roots?.[0];
    // No project folder — don't invent a room ("somewhere") for a chat that has none.
    if (!parentAgentId && !cwd && !this.agents.get(agentId)?.cwd) {
      return this.homeEvents(strayFromFiles);
    }

    const stray = this.agents.get(reportedId);
    const retireStray = reportedId !== agentId && stray && !stray.parentAgentId;
    this.heard.add(agentId);
    const toolName = payload.tool_name;
    const event: DenEvent = {
      id: randomUUID(),
      source: 'cursor',
      kind,
      sessionId: parentAgentId ? this.sessionOf(parentAgentId) : agentId,
      agentId,
      parentAgentId,
      cwd,
      toolName,
      toolCategory: toolName ? categorizeTool(toolName) : undefined,
      detail: payload.prompt?.slice(0, 160) ?? describeToolInput(payload.tool_input) ?? payload.task?.slice(0, 160),
      title: isSubagentHook ? payload.subagent_type : undefined,
      timestamp: Date.now(),
    };
    const home = this.homeEvents(strayFromFiles.filter(id => id !== reportedId || !retireStray));
    if (!retireStray) {
      return [...home, event];
    }
    // The subagent's conversation was already stored as its own cat. Send it home; the kitten stays.
    return [
      ...home,
      {
        ...event,
        id: randomUUID(),
        kind: 'session-end',
        agentId: reportedId,
        sessionId: reportedId,
        parentAgentId: undefined,
      },
      event,
    ];
  }
}
