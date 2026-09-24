export type {
  AgentActivity,
  AgentSource,
  AgentState,
  DenEvent,
  DenEventKind,
  ServerMessage,
  ToolCategory,
} from './events';
export { categorizeTool } from './tool-category';
export { reduceAgents } from './reduce-agents';

/** Default collector port (hooks POST here, web connects via WebSocket). */
export const COLLECTOR_PORT = 4317;
