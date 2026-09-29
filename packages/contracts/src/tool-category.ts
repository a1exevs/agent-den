import type { ToolCategory } from './events';

const categoryByTool: Record<string, ToolCategory> = {
  Read: 'read',
  Grep: 'read',
  Glob: 'read',
  LS: 'read',
  NotebookRead: 'read',
  Edit: 'edit',
  MultiEdit: 'edit',
  Write: 'edit',
  NotebookEdit: 'edit',
  Bash: 'shell',
  PowerShell: 'shell',
  WebFetch: 'web',
  WebSearch: 'web',
  Task: 'delegate',
  Agent: 'delegate',
};

/** Maps a raw tool name to a category; MCP tools (`mcp__*`) are treated as `web`. */
export function categorizeTool(toolName: string | undefined): ToolCategory {
  if (!toolName) {
    return 'other';
  }
  if (toolName.startsWith('mcp__')) {
    return 'web';
  }
  return categoryByTool[toolName] ?? 'other';
}
