import type { AgentState, ToolCategory } from '@agent-den/contracts';

export function activityLabel(agent: AgentState): string {
  switch (agent.activity) {
    case 'tool':
      return `using ${agent.toolName ?? 'a tool'}`;
    case 'thinking':
      return 'thinking';
    case 'waiting':
      return 'waiting for you';
    case 'done':
      return agent.parentAgentId ? 'finished' : 'done, napping';
    case 'error':
      return 'tool failed';
    case 'gone':
      return 'left the den';
    default:
      return 'idle';
  }
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export const toolCategoryLabels: Record<ToolCategory, string> = {
  read: '📖 read',
  edit: '✏️ edit',
  shell: '💥 shell',
  web: '🌐 web',
  delegate: '📦 kittens',
  other: '… other',
};
