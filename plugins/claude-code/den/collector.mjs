import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
import {
  Hono,
  cors,
  serve
} from "./lib/chunk-FVGQQPKG.mjs";
import {
  import_websocket_server
} from "./lib/chunk-EUGCPJNI.mjs";
import "./lib/chunk-3KQJ5KT2.mjs";

// packages/contracts/src/freshness.ts
var MINUTE = 6e4;
var STALE_AFTER_MS = {
  thinking: 5 * MINUTE,
  tool: 10 * MINUTE
};

// packages/contracts/src/tool-category.ts
var categoryByTool = {
  Read: "read",
  Grep: "read",
  Glob: "read",
  LS: "read",
  NotebookRead: "read",
  Edit: "edit",
  MultiEdit: "edit",
  Write: "edit",
  NotebookEdit: "edit",
  Bash: "shell",
  PowerShell: "shell",
  WebFetch: "web",
  WebSearch: "web",
  Task: "delegate",
  Agent: "delegate"
};
function categorizeTool(toolName) {
  if (!toolName) {
    return "other";
  }
  if (toolName.startsWith("mcp__")) {
    return "web";
  }
  return categoryByTool[toolName] ?? "other";
}

// packages/contracts/src/reduce-agents.ts
var activityByKind = {
  "session-start": "idle",
  "session-end": "gone",
  prompt: "thinking",
  "tool-start": "tool",
  "tool-end": "thinking",
  "tool-error": "error",
  "subagent-start": "thinking",
  "subagent-stop": "done",
  waiting: "waiting",
  stop: "done",
  interrupted: "interrupted"
};
var isVisibilityKind = (kind) => kind === "dismissed" || kind === "recalled";
function activityOf(kind) {
  return isVisibilityKind(kind) ? void 0 : activityByKind[kind];
}
function applyVisibility(agents, event2) {
  const next = new Map(agents);
  const target = agents.get(event2.agentId);
  if (!target) {
    return next;
  }
  const dismissed = event2.kind === "dismissed";
  const isSession = !target.parentAgentId;
  for (const [id, agent] of agents) {
    if (id === target.agentId || isSession && agent.sessionId === target.sessionId) {
      next.set(id, { ...agent, dismissed });
    }
  }
  return next;
}
function reduceAgents(agents, event2) {
  if (isVisibilityKind(event2.kind)) {
    return applyVisibility(agents, event2);
  }
  const next = new Map(agents);
  const previous = agents.get(event2.agentId);
  const toolCounts = { ...previous?.toolCounts };
  if (event2.kind === "tool-start" && event2.toolCategory) {
    toolCounts[event2.toolCategory] = (toolCounts[event2.toolCategory] ?? 0) + 1;
  }
  const isToolKind = event2.kind === "tool-start" || event2.kind === "tool-error";
  next.set(event2.agentId, {
    agentId: event2.agentId,
    sessionId: event2.sessionId,
    parentAgentId: event2.parentAgentId ?? previous?.parentAgentId,
    source: event2.source,
    // Sticky: the first known directory is the agent's room, later `cd`s don't move it.
    cwd: previous?.cwd ?? event2.cwd,
    activity: activityByKind[event2.kind],
    toolName: isToolKind ? event2.toolName : void 0,
    toolCategory: isToolKind ? event2.toolCategory : void 0,
    detail: event2.detail ?? (isToolKind ? void 0 : previous?.detail),
    title: event2.title ?? previous?.title,
    startedAt: previous?.startedAt ?? event2.timestamp,
    updatedAt: event2.timestamp,
    toolCounts,
    // Any activity brings a hidden agent back: a live agent can never get lost.
    dismissed: false
  });
  if (event2.kind === "session-end") {
    for (const [id, agent] of next) {
      if (agent.sessionId === event2.sessionId) {
        next.set(id, { ...agent, activity: "gone", updatedAt: event2.timestamp });
      }
    }
  }
  return next;
}

// packages/contracts/src/index.ts
var COLLECTOR_PORT = 4317;

// apps/collector/src/adapters/claude-code.ts
import { randomUUID } from "node:crypto";
var kindByHook = {
  SessionStart: "session-start",
  SessionEnd: "session-end",
  UserPromptSubmit: "prompt",
  PreToolUse: "tool-start",
  PostToolUse: "tool-end",
  PostToolUseFailure: "tool-error",
  SubagentStart: "subagent-start",
  SubagentStop: "subagent-stop",
  Notification: "waiting",
  PermissionRequest: "waiting",
  Stop: "stop"
};
function describeToolInput(input) {
  const value = input?.["file_path"] ?? input?.["command"] ?? input?.["pattern"] ?? input?.["url"] ?? input?.["description"];
  return typeof value === "string" ? value.slice(0, 160) : void 0;
}
function isIdleReminder(payload) {
  return payload.hook_event_name === "Notification" && (payload.notification_type === "idle_prompt" || /waiting for your input/i.test(payload.message ?? ""));
}
var normalizeDir = (dir) => dir.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
function roomDir(payload) {
  const { cwd, project_dir: projectDir } = payload;
  if (!projectDir || !cwd) {
    return projectDir ?? cwd;
  }
  const project = normalizeDir(projectDir);
  const current = normalizeDir(cwd);
  return current === project || current.startsWith(`${project}/`) ? projectDir : cwd;
}
function fromClaudeCodeHook(payload) {
  const kind = kindByHook[payload.hook_event_name];
  if (!kind || !payload.session_id || isIdleReminder(payload)) {
    return null;
  }
  const isSubagent = Boolean(payload.agent_id);
  return {
    id: randomUUID(),
    source: "claude-code",
    kind,
    sessionId: payload.session_id,
    agentId: payload.agent_id ?? payload.session_id,
    parentAgentId: isSubagent ? payload.session_id : void 0,
    cwd: roomDir(payload),
    toolName: payload.tool_name,
    toolCategory: payload.tool_name ? categorizeTool(payload.tool_name) : void 0,
    detail: payload.message ?? payload.prompt?.slice(0, 160) ?? describeToolInput(payload.tool_input) ?? payload.agent_type,
    title: isSubagent ? payload.agent_type : payload.session_title,
    timestamp: Date.now()
  };
}

// apps/collector/src/den-state.ts
import { readFile, rename, writeFile } from "node:fs/promises";
function isSavedDen(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const saved = value;
  return saved.format === 1 && Array.isArray(saved.agents) && Array.isArray(saved.transcripts);
}
async function saveDen(file, store2, transcripts2) {
  const saved = {
    format: 1,
    savedAt: Date.now(),
    agents: store2.export(),
    transcripts: transcripts2.entries()
  };
  const temp = `${file}.tmp`;
  await writeFile(temp, JSON.stringify(saved));
  await rename(temp, file);
}
async function loadDen(file, store2, transcripts2) {
  let saved;
  try {
    saved = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return 0;
  }
  if (!isSavedDen(saved)) {
    return 0;
  }
  store2.restore(saved.agents.filter((agent) => typeof agent?.agentId === "string"));
  for (const [agentId, path] of saved.transcripts) {
    if (typeof agentId === "string" && typeof path === "string") {
      transcripts2.set(agentId, path);
    }
  }
  return store2.snapshot().length;
}

// apps/collector/src/den-store.ts
import { randomUUID as randomUUID2 } from "node:crypto";
var MINUTE2 = 6e4;
var DAY = 24 * 60 * MINUTE2;
var SILENT_BUSY_MS = 30 * MINUTE2;
var SLEEPING_MS = 60 * MINUTE2;
var RESTING = /* @__PURE__ */ new Set(["done", "interrupted", "idle"]);
var SILENT_KITTEN_MS = 10 * MINUTE2;
var DenStore = class {
  agents = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  push(event2) {
    this.agents = reduceAgents(this.agents, event2);
    for (const listener of this.listeners) {
      listener(event2);
    }
  }
  /** Known in any state, including `gone` — so backfill never resurrects a session that ended. */
  /** Hide an agent (its kittens too, for a session) or call it back. Unknown or ended agents are ignored. */
  setDismissed(agentId, dismissed) {
    const agent = this.agents.get(agentId);
    if (!agent || agent.activity === "gone") {
      return;
    }
    this.push({
      id: randomUUID2(),
      source: agent.source,
      kind: dismissed ? "dismissed" : "recalled",
      sessionId: agent.sessionId,
      agentId,
      parentAgentId: agent.parentAgentId,
      timestamp: Date.now()
    });
  }
  has(agentId) {
    return this.agents.has(agentId);
  }
  snapshot() {
    return [...this.agents.values()].filter((agent) => agent.activity !== "gone");
  }
  /**
   * Everything worth keeping across a collector restart (plugin update, reboot). Ended agents stay for a day, so
   * transcript backfill doesn't bring back a session that already left.
   */
  export(now = Date.now()) {
    return [...this.agents.values()].filter((agent) => agent.activity !== "gone" || now - agent.updatedAt < DAY);
  }
  /** Loads saved agents before anyone subscribes; the next `sweep` retires those that went quiet meanwhile. */
  restore(agents) {
    this.agents = new Map(agents.map((agent) => [agent.agentId, agent]));
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /** Ends agents that stopped reporting. Emits regular events, so clients animate the exit. */
  sweep(now = Date.now()) {
    const expired = [];
    for (const agent of this.agents.values()) {
      const silentFor = now - agent.updatedAt;
      if (agent.activity === "gone") {
        continue;
      }
      const resting = RESTING.has(agent.activity);
      if (agent.parentAgentId) {
        if (!resting && silentFor > SILENT_KITTEN_MS) {
          expired.push({ agent, kind: "subagent-stop" });
        }
        continue;
      }
      const limit = resting ? SLEEPING_MS : SILENT_BUSY_MS;
      if (silentFor > limit) {
        expired.push({ agent, kind: "session-end" });
      }
    }
    for (const { agent, kind } of expired) {
      if (this.agents.get(agent.agentId)?.activity === "gone") {
        continue;
      }
      this.push({
        id: randomUUID2(),
        source: agent.source,
        kind,
        sessionId: agent.sessionId,
        agentId: agent.agentId,
        parentAgentId: agent.parentAgentId,
        detail: "went quiet",
        timestamp: now
      });
    }
    return expired.length;
  }
};

// apps/collector/src/local-origin.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]"]);
function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }
  try {
    return LOCAL_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}
function isAllowedHost(host) {
  if (!host) {
    return false;
  }
  try {
    return LOCAL_HOSTS.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

// apps/collector/src/static-web.ts
import { readFile as readFile2, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
var CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};
async function readStaticFile(root, urlPath) {
  const base = resolve(root);
  let relative;
  try {
    relative = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, "");
  } catch {
    return null;
  }
  const target = resolve(join(base, relative));
  if (target !== base && !target.startsWith(base + sep)) {
    return null;
  }
  const file = await isFile(target) ? target : extname(target) ? null : join(base, "index.html");
  if (!file) {
    return null;
  }
  try {
    return {
      body: await readFile2(file),
      contentType: CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream"
    };
  } catch {
    return null;
  }
}
async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

// apps/collector/src/transcripts/transcript-follower.ts
import { open, stat as stat2 } from "node:fs/promises";

// apps/collector/src/transcripts/normalize.ts
var MAX_TEXT = 8 * 1024;
var MAX_INPUT = 2 * 1024;
function clip(text, limit) {
  return text.length > limit ? { text: text.slice(0, limit), clipped: true } : { text, clipped: false };
}
function contentToText(content) {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((block) => block.type === "text" ? block.text ?? "" : block.type === "image" ? "[image]" : "").join("\n");
  }
  return content === void 0 ? "" : JSON.stringify(content);
}
function summarize(input) {
  if (typeof input !== "object" || input === null) {
    return void 0;
  }
  const record = input;
  const value = record["description"] ?? record["file_path"] ?? record["command"] ?? record["pattern"] ?? record["url"] ?? record["query"];
  return typeof value === "string" ? value.replace(/s+/g, " ").slice(0, 120) : void 0;
}
function toBlock(block) {
  switch (block.type) {
    case "text":
      return block.text ? { kind: "text", text: clip(block.text, MAX_TEXT).text } : null;
    case "thinking":
      return block.thinking ? { kind: "thinking", text: clip(block.thinking, MAX_TEXT).text } : null;
    case "tool_use":
      return {
        kind: "tool-use",
        id: block.id ?? "",
        name: block.name ?? "tool",
        input: clip(JSON.stringify(block.input ?? {}, null, 2), MAX_INPUT).text,
        summary: summarize(block.input)
      };
    case "tool_result": {
      const { text, clipped } = clip(contentToText(block.content), MAX_TEXT);
      return {
        kind: "tool-result",
        toolUseId: block.tool_use_id ?? "",
        text,
        isError: Boolean(block.is_error),
        clipped
      };
    }
    default:
      return null;
  }
}
function normalizeEntry(value) {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const entry = value;
  if (entry.type !== "user" && entry.type !== "assistant" || entry.isMeta || !entry.message) {
    return null;
  }
  const content = entry.message.content;
  const blocks2 = typeof content === "string" ? [{ kind: "text", text: clip(content, MAX_TEXT).text }] : Array.isArray(content) ? content.map(toBlock).filter((block) => block !== null) : [];
  if (blocks2.length === 0) {
    return null;
  }
  return { id: entry.uuid ?? `${entry.timestamp}-${entry.type}`, role: entry.type, timestamp: entry.timestamp, blocks: blocks2 };
}

// apps/collector/src/transcripts/transcript-follower.ts
var POLL_MS = 700;
var INITIAL_TAIL_BYTES = 2 * 1024 * 1024;
var INITIAL_ITEMS = 300;
async function readRange(path, start, end) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(end - start);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
    return buffer.toString("utf8", 0, bytesRead);
  } finally {
    await handle.close();
  }
}
function parse(lines) {
  return lines.flatMap((line) => {
    if (!line.trim()) {
      return [];
    }
    try {
      const item = normalizeEntry(JSON.parse(line));
      return item ? [item] : [];
    } catch {
      return [];
    }
  });
}
function followTranscript(path, onItems, onMissing) {
  let offset = 0;
  let partial = "";
  let stopped = false;
  let timer;
  const load = async () => {
    const { size } = await stat2(path);
    const start = Math.max(0, size - INITIAL_TAIL_BYTES);
    const lines = (await readRange(path, start, size)).split("\n");
    if (start > 0) {
      lines.shift();
    }
    partial = lines.pop() ?? "";
    offset = size;
    onItems(parse(lines).slice(-INITIAL_ITEMS), true);
  };
  const poll = async () => {
    const { size } = await stat2(path);
    if (size < offset) {
      await load();
      return;
    }
    if (size === offset) {
      return;
    }
    const lines = (partial + await readRange(path, offset, size)).split("\n");
    offset = size;
    partial = lines.pop() ?? "";
    const items = parse(lines);
    if (items.length > 0) {
      onItems(items, false);
    }
  };
  const loop = () => {
    timer = setTimeout(() => {
      poll().catch(() => void 0).finally(() => {
        if (!stopped) {
          loop();
        }
      });
    }, POLL_MS);
  };
  load().then(() => {
    if (!stopped) {
      loop();
    }
  }).catch(() => onMissing());
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

// apps/collector/src/transcripts/transcript-registry.ts
import { dirname, join as join2 } from "node:path";
var TranscriptRegistry = class {
  paths = /* @__PURE__ */ new Map();
  set(agentId, path) {
    this.paths.set(agentId, path);
  }
  get(agentId) {
    return this.paths.get(agentId);
  }
  entries() {
    return [...this.paths.entries()];
  }
  /**
   * Hooks always carry the session `transcript_path`; subagent hooks add `agent_id` (and sometimes
   * `agent_transcript_path`). Subagent transcripts live in `<session>/subagents/agent-<id>.jsonl` next to it.
   */
  rememberHook(payload) {
    const { session_id: sessionId, transcript_path: sessionPath, agent_id: agentId } = payload;
    if (!sessionId || !sessionPath) {
      return;
    }
    if (!agentId) {
      this.set(sessionId, sessionPath);
      return;
    }
    this.set(
      agentId,
      payload.agent_transcript_path ?? join2(dirname(sessionPath), sessionId, "subagents", `agent-${agentId}.jsonl`)
    );
  }
};

// apps/collector/src/transcripts/reconcile.ts
import { randomUUID as randomUUID3 } from "node:crypto";
import { stat as stat3 } from "node:fs/promises";

// apps/collector/src/transcripts/infer-state.ts
var TURN_ENDING_STOP_REASONS = /* @__PURE__ */ new Set(["end_turn", "stop_sequence", "max_tokens"]);
var INTERRUPTED_MARKER = "[Request interrupted";
function isEntry(value) {
  return typeof value === "object" && value !== null;
}
function blocks(entry) {
  const content = entry.message?.content;
  return Array.isArray(content) ? content : [];
}
function userText(entry) {
  const content = entry.message?.content;
  if (typeof content === "string") {
    return content;
  }
  return blocks(entry).filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n");
}
function describeInput(input) {
  const value = input?.["file_path"] ?? input?.["command"] ?? input?.["pattern"] ?? input?.["description"];
  return typeof value === "string" ? value.slice(0, 160) : void 0;
}
function assistantState(entry) {
  const toolUse = blocks(entry).findLast((block) => block.type === "tool_use");
  const stopReason = entry.message?.stop_reason;
  if (toolUse || stopReason === "tool_use") {
    return { kind: "tool-start", toolName: toolUse?.name, detail: describeInput(toolUse?.input) };
  }
  if (stopReason && TURN_ENDING_STOP_REASONS.has(stopReason)) {
    return { kind: "stop" };
  }
  return { kind: blocks(entry).some((block) => block.type === "text") ? "stop" : "prompt" };
}
function stateOf(entry) {
  if (entry.type === "system" && entry.subtype === "stop_hook_summary") {
    return { kind: "stop" };
  }
  if (entry.type === "assistant") {
    return assistantState(entry);
  }
  if (entry.type === "user") {
    if (userText(entry).trimStart().startsWith(INTERRUPTED_MARKER)) {
      return { kind: "interrupted" };
    }
    if (typeof entry.message?.content === "string" || blocks(entry).some((block) => block.type === "text")) {
      return { kind: "prompt" };
    }
    if (blocks(entry).some((block) => block.type === "tool_result")) {
      return { kind: "tool-end" };
    }
  }
  return null;
}
function inferState(entries) {
  const typed = entries.filter(isEntry);
  const cwd = typed.findLast((entry) => typeof entry.cwd === "string")?.cwd;
  for (let index = typed.length - 1; index >= 0; index--) {
    const entry = typed[index];
    const state = entry ? stateOf(entry) : null;
    if (state) {
      return { ...state, cwd };
    }
  }
  return null;
}
function notificationVerdict(text, toolUseId) {
  if (!text.includes(`<tool-use-id>${toolUseId}</tool-use-id>`)) {
    return null;
  }
  const status = /<status>(\w+)<\/status>/.exec(text)?.[1] ?? "completed";
  return status === "completed" ? "done" : "stopped";
}
function inferSubagentVerdict(parentEntries, toolUseId) {
  let verdict = null;
  for (const entry of parentEntries.filter(isEntry)) {
    if (entry.type !== "user") {
      continue;
    }
    const fromNotification = notificationVerdict(userText(entry), toolUseId);
    const result = blocks(entry).find((block) => block.type === "tool_result" && block.tool_use_id === toolUseId);
    const launchedOnly = entry.toolUseResult?.status === "async_launched";
    if (fromNotification) {
      verdict = fromNotification;
    } else if (result && !launchedOnly) {
      verdict = result.is_error ? "stopped" : "done";
    }
  }
  return verdict;
}

// apps/collector/src/transcripts/transcript-files.ts
import { open as open2, readFile as readFile3 } from "node:fs/promises";
import { dirname as dirname2, join as join3 } from "node:path";
var TAIL_BYTES = 256 * 1024;
async function readTail(path) {
  const handle = await open2(path, "r");
  try {
    const { size } = await handle.stat();
    const start = Math.max(0, size - TAIL_BYTES);
    const buffer = Buffer.alloc(size - start);
    await handle.read(buffer, 0, buffer.length, start);
    const lines = buffer.toString("utf8").split("\n");
    const complete = start > 0 ? lines.slice(1) : lines;
    return complete.flatMap((line) => {
      try {
        return line.trim() ? [JSON.parse(line)] : [];
      } catch {
        return [];
      }
    });
  } finally {
    await handle.close();
  }
}
async function readJson(path) {
  try {
    return JSON.parse(await readFile3(path, "utf8"));
  } catch {
    return void 0;
  }
}
function readSubagentMeta(subagentPath) {
  return readJson(subagentPath.replace(/\.jsonl$/, ".meta.json"));
}
function parentTranscriptPath(subagentPath) {
  const sessionDir = dirname2(dirname2(subagentPath));
  return join3(dirname2(sessionDir), `${sessionDir.split(/[\\/]/).at(-1)}.jsonl`);
}
async function readSubagentVerdict(subagentPath) {
  const toolUseId = (await readSubagentMeta(subagentPath))?.toolUseId;
  if (!toolUseId) {
    return null;
  }
  try {
    return inferSubagentVerdict(await readTail(parentTranscriptPath(subagentPath)), toolUseId);
  } catch {
    return null;
  }
}

// apps/collector/src/transcripts/reconcile.ts
var QUIET_MS = 15e3;
var TranscriptReconciler = class {
  constructor(store2, registry) {
    this.store = store2;
    this.registry = registry;
  }
  store;
  registry;
  /** Transcript mtime we last reconciled per agent — unchanged files are not re-read. */
  seen = /* @__PURE__ */ new Map();
  async reconcile(now = Date.now()) {
    let updated = 0;
    for (const agent of this.store.snapshot()) {
      const path = this.registry.get(agent.agentId);
      if (!path || now - agent.updatedAt < QUIET_MS) {
        continue;
      }
      let mtime;
      try {
        mtime = (await stat3(path)).mtimeMs;
      } catch {
        continue;
      }
      if (mtime <= agent.updatedAt || mtime <= (this.seen.get(agent.agentId) ?? 0)) {
        continue;
      }
      this.seen.set(agent.agentId, mtime);
      const state = inferState(await readTail(path));
      if (!state) {
        continue;
      }
      let kind = state.kind;
      if (agent.parentAgentId) {
        const verdict = kind === "stop" ? "done" : await readSubagentVerdict(path);
        if (verdict) {
          kind = verdict === "done" ? "subagent-stop" : "interrupted";
        }
      }
      if (activityOf(kind) === agent.activity && state.toolName === agent.toolName) {
        continue;
      }
      this.store.push({
        id: randomUUID3(),
        source: agent.source,
        kind,
        sessionId: agent.sessionId,
        agentId: agent.agentId,
        parentAgentId: agent.parentAgentId,
        toolName: state.toolName,
        toolCategory: state.toolName ? categorizeTool(state.toolName) : void 0,
        detail: state.detail,
        timestamp: mtime
      });
      updated++;
    }
    return updated;
  }
};

// apps/collector/src/transcripts/transcript-scanner.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { open as open3, readdir, stat as stat4 } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join as join4 } from "node:path";
var PROJECTS_DIR = join4(homedir(), ".claude", "projects");
var ACTIVE_WINDOW_MS = 10 * 6e4;
var HEAD_BYTES = 32 * 1024;
async function readHeadCwds(path) {
  const handle = await open3(path, "r");
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEAD_BYTES, 0);
    const head = buffer.toString("utf8", 0, bytesRead);
    return [...head.matchAll(/"cwd":("(?:[^"\\]|\\.)*")/g)].map((match) => JSON.parse(match[1] ?? '""'));
  } finally {
    await handle.close();
  }
}
var encodeProjectDir = (dir) => dir.replace(/[^a-zA-Z0-9]/g, "-");
async function resolveProjectDir(path, projectFolder, tail) {
  const tailCwds = tail.flatMap(
    (entry) => typeof entry === "object" && entry !== null && "cwd" in entry && typeof entry.cwd === "string" ? [entry.cwd] : []
  );
  const candidates = [...await readHeadCwds(path), ...tailCwds];
  return candidates.find((cwd) => encodeProjectDir(cwd) === projectFolder) ?? candidates[0];
}
async function freshFiles(dir, now, pattern) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const files = await Promise.all(
    names.filter((name) => pattern.test(name)).map(async (name) => {
      const path = join4(dir, name);
      const { mtimeMs } = await stat4(path);
      return { path, mtime: mtimeMs };
    })
  );
  return files.filter((file) => now - file.mtime < ACTIVE_WINDOW_MS);
}
function event(identity, kind, timestamp, extra = {}) {
  return { id: randomUUID4(), source: "claude-code", kind, timestamp, ...identity, ...extra };
}
function stateEvent(identity, state, timestamp) {
  return event(identity, state.kind, timestamp, {
    toolName: state.toolName,
    toolCategory: state.toolName ? categorizeTool(state.toolName) : void 0,
    detail: state.detail
  });
}
async function scanTranscripts(store2, registry, now = Date.now()) {
  let added = 0;
  let projects;
  try {
    projects = await readdir(PROJECTS_DIR);
  } catch {
    return 0;
  }
  for (const project of projects) {
    const projectDir = join4(PROJECTS_DIR, project);
    for (const file of await freshFiles(projectDir, now, /\.jsonl$/)) {
      const sessionId = basename(file.path, ".jsonl");
      const sessionDir = join4(projectDir, sessionId);
      registry.set(sessionId, file.path);
      if (!store2.has(sessionId)) {
        const tail = await readTail(file.path);
        const state = inferState(tail);
        if (state) {
          const title = (await readJson(join4(sessionDir, "custom-title.json")))?.customTitle;
          const identity = { sessionId, agentId: sessionId };
          const cwd = await resolveProjectDir(file.path, project, tail);
          store2.push(event(identity, "session-start", file.mtime, { cwd, title }));
          store2.push(stateEvent(identity, state, file.mtime));
          added++;
        }
      }
      for (const subagent of await freshFiles(join4(sessionDir, "subagents"), now, /^agent-.+\.jsonl$/)) {
        const agentId = basename(subagent.path, ".jsonl").replace(/^agent-/, "");
        registry.set(agentId, subagent.path);
        if (store2.has(agentId)) {
          continue;
        }
        const state = inferState(await readTail(subagent.path));
        if (!state || state.kind === "stop" || await readSubagentVerdict(subagent.path)) {
          continue;
        }
        const meta = await readSubagentMeta(subagent.path);
        const identity = { sessionId, agentId, parentAgentId: sessionId };
        store2.push(event(identity, "subagent-start", subagent.mtime, { cwd: state.cwd, title: meta?.agentType }));
        store2.push(stateEvent(identity, state, subagent.mtime));
        added++;
      }
    }
  }
  return added;
}

// apps/collector/src/main.ts
var port = Number(process.env["AGENT_DEN_PORT"] ?? COLLECTOR_PORT);
var version = process.env["AGENT_DEN_VERSION"] ?? "dev";
var webDir = process.env["AGENT_DEN_WEB_DIR"];
var store = new DenStore();
var transcripts = new TranscriptRegistry();
var stateFile = process.env["AGENT_DEN_STATE_FILE"];
var SAVE_INTERVAL_MS = 6e4;
var unsaved = false;
async function save() {
  if (!stateFile || !unsaved) {
    return;
  }
  unsaved = false;
  await saveDen(stateFile, store, transcripts).catch((error) => {
    unsaved = true;
    process.stderr.write(`saving the den failed: ${String(error)}
`);
  });
}
if (stateFile) {
  const restored = await loadDen(stateFile, store, transcripts);
  store.sweep();
  process.stdout.write(`restored ${restored} agent(s) from ${stateFile}
`);
  store.subscribe(() => {
    unsaved = true;
  });
  setInterval(() => void save(), SAVE_INTERVAL_MS);
}
async function shutdown() {
  await save();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
var app = new Hono();
var recentHooks = [];
var RECENT_HOOKS_LIMIT = 50;
function remember(payload) {
  recentHooks.push(payload);
  if (recentHooks.length > RECENT_HOOKS_LIMIT) {
    recentHooks.shift();
  }
}
app.use("*", async (c, next) => {
  if (!isAllowedHost(c.req.header("host"))) {
    return c.text("forbidden host", 403);
  }
  if (!isAllowedOrigin(c.req.header("origin"))) {
    return c.text("forbidden origin", 403);
  }
  await next();
});
app.use("*", cors({ origin: (origin) => isAllowedOrigin(origin) ? origin : null }));
app.get("/health", (c) => c.json({ ok: true, version }));
app.get("/agents", (c) => c.json(store.snapshot()));
app.get("/debug/hooks", (c) => c.json(recentHooks));
app.post("/hooks/claude-code", async (c) => {
  const payload = await c.req.json();
  remember(payload);
  transcripts.rememberHook(payload);
  const event2 = fromClaudeCodeHook(payload);
  if (event2) {
    store.push(event2);
  }
  return c.body(null, 204);
});
app.post("/shutdown", (c) => {
  setTimeout(() => void shutdown(), 100);
  return c.body(null, 204);
});
app.post("/events", async (c) => {
  store.push(await c.req.json());
  return c.body(null, 204);
});
if (webDir) {
  app.get("*", async (c) => {
    const file = await readStaticFile(webDir, c.req.path);
    if (!file) {
      return c.notFound();
    }
    const cacheControl = file.contentType.startsWith("text/html") ? "no-cache" : "public, max-age=3600";
    return c.body(new Uint8Array(file.body), 200, { "content-type": file.contentType, "cache-control": cacheControl });
  });
}
var server = serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
  const den = webDir ? `, the den is at http://localhost:${info.port}` : "";
  process.stdout.write(`agent-den collector ${version} listening on http://127.0.0.1:${info.port}${den}
`);
});
var wss = new import_websocket_server.default({
  server,
  path: "/ws",
  verifyClient: ({ origin, req }) => isAllowedOrigin(origin) && isAllowedHost(req.headers.host)
});
var SCAN_INTERVAL_MS = 3e4;
var SWEEP_INTERVAL_MS = 6e4;
var RECONCILE_INTERVAL_MS = 5e3;
var reconciler = new TranscriptReconciler(store, transcripts);
var scan = () => {
  scanTranscripts(store, transcripts).then((added) => {
    if (added > 0) {
      process.stdout.write(`backfilled ${added} agent(s) from transcripts
`);
    }
  }).catch((error) => process.stderr.write(`transcript scan failed: ${String(error)}
`));
};
scan();
setInterval(scan, SCAN_INTERVAL_MS);
setInterval(() => store.sweep(), SWEEP_INTERVAL_MS);
setInterval(() => {
  reconciler.reconcile().catch((error) => process.stderr.write(`reconcile failed: ${String(error)}
`));
}, RECONCILE_INTERVAL_MS);
function parseClientMessage(data) {
  try {
    const message = JSON.parse(String(data));
    const known = ["watch-transcript", "unwatch-transcript", "dismiss", "recall"];
    return known.includes(message.type) ? message : null;
  } catch {
    return null;
  }
}
wss.on("connection", (socket) => {
  const send = (message) => socket.send(JSON.stringify(message));
  send({ type: "snapshot", agents: store.snapshot() });
  const unsubscribe = store.subscribe((event2) => send({ type: "event", event: event2 }));
  let stopFollowing;
  socket.on("message", (data) => {
    const message = parseClientMessage(data);
    if (!message) {
      return;
    }
    if (message.type === "dismiss" || message.type === "recall") {
      store.setDismissed(message.agentId, message.type === "dismiss");
      return;
    }
    stopFollowing?.();
    stopFollowing = void 0;
    if (message.type === "unwatch-transcript") {
      return;
    }
    const { agentId } = message;
    const path = transcripts.get(agentId);
    if (!path) {
      send({ type: "transcript-missing", agentId });
      return;
    }
    stopFollowing = followTranscript(
      path,
      (items, reset) => send({ type: "transcript", agentId, items, reset }),
      () => send({ type: "transcript-missing", agentId })
    );
  });
  socket.on("close", () => {
    unsubscribe();
    stopFollowing?.();
  });
});
