/** Agent runtime that produced an event. */
export type AgentSource = 'claude-code' | 'cursor' | 'mock';

/**
 * Coarse tool category. Skins map categories to stations
 * (e.g. `read` → the cat sniffs a book).
 */
export type ToolCategory = 'read' | 'edit' | 'shell' | 'web' | 'delegate' | 'other';

export type DenEventKind =
  | 'session-start'
  | 'session-end'
  | 'prompt'
  | 'tool-start'
  | 'tool-end'
  | 'tool-error'
  | 'subagent-start'
  | 'subagent-stop'
  | 'waiting'
  | 'stop';

/** Normalized event — every adapter (hooks, JSONL, mock) emits this shape. */
export type DenEvent = {
  id: string;
  source: AgentSource;
  kind: DenEventKind;
  /** Root session id. */
  sessionId: string;
  /** Agent the event belongs to: equals `sessionId` for the main agent, subagent id otherwise. */
  agentId: string;
  /** Set for subagents — the agent that spawned it. */
  parentAgentId?: string;
  /** Working directory → room in the den. */
  cwd?: string;
  toolName?: string;
  toolCategory?: ToolCategory;
  /** Short human readable detail: file path, command, prompt excerpt, notification text. */
  detail?: string;
  /** Session title (Claude Code sends `session_title` with prompts). */
  title?: string;
  /** Epoch milliseconds. */
  timestamp: number;
};

/** One content block of a transcript message, clipped for display. */
export type TranscriptBlock =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | { kind: 'tool-use'; id: string; name: string; input: string; summary?: string }
  | { kind: 'tool-result'; toolUseId: string; text: string; isError: boolean; clipped: boolean };

export type TranscriptItem = {
  id: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  blocks: TranscriptBlock[];
};

/** Messages sent from the collector to web clients over WebSocket. */
export type ServerMessage =
  | { type: 'snapshot'; agents: AgentState[] }
  | { type: 'event'; event: DenEvent }
  /** `reset` — replace everything shown so far (first load or the file was rewritten). */
  | { type: 'transcript'; agentId: string; items: TranscriptItem[]; reset: boolean }
  | { type: 'transcript-missing'; agentId: string };

/** Messages sent from web clients to the collector. One watched transcript per connection. */
export type ClientMessage = { type: 'watch-transcript'; agentId: string } | { type: 'unwatch-transcript' };

export type AgentActivity = 'idle' | 'thinking' | 'tool' | 'waiting' | 'done' | 'error' | 'gone';

export interface AgentState {
  agentId: string;
  sessionId: string;
  parentAgentId?: string;
  source: AgentSource;
  cwd?: string;
  activity: AgentActivity;
  toolName?: string;
  toolCategory?: ToolCategory;
  detail?: string;
  title?: string;
  startedAt: number;
  updatedAt: number;
  toolCounts: Partial<Record<ToolCategory, number>>;
}
