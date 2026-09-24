export type {
  AgentActivity,
  AgentSource,
  AgentState,
  ClientMessage,
  DenEvent,
  DenEventKind,
  ServerMessage,
  ToolCategory,
  TranscriptBlock,
  TranscriptItem,
} from './events';
export { categorizeTool } from './tool-category';
export { reduceAgents } from './reduce-agents';

/** Default collector port (hooks POST here, web connects via WebSocket). */
export const COLLECTOR_PORT = 4317;
