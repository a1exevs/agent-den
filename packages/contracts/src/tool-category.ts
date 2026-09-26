import type { ToolCategory } from './events';

const categoryByTool: Record<string, ToolCategory> = {
  // Claude Code
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
  // Cursor
  Shell: 'shell',
  StrReplace: 'edit',
  Delete: 'edit',
  EditNotebook: 'edit',
  read_file: 'read',
  edit_file: 'edit',
  shell: 'shell',
};

/** Maps a raw tool name to a category; MCP tools (`mcp__*`, Cursor's `MCP:*`) are treated as `web`. */
export function categorizeTool(toolName: string | undefined): ToolCategory {
  if (!toolName) {
    return 'other';
  }
  if (toolName.startsWith('mcp__') || toolName.startsWith('MCP:')) {
    return 'web';
  }
  return categoryByTool[toolName] ?? 'other';
}
