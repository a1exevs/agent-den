import { describe, expect, it } from 'vitest';

import { fromClaudeCodeHook, roomDir } from './claude-code';

describe('roomDir', () => {
  it('uses the project root while the agent only cd-s into its subfolders', () => {
    expect(roomDir({ project_dir: 'D:\\projects\\agent-den', cwd: 'D:\\projects\\agent-den\\apps\\web' })).toBe(
      'D:\\projects\\agent-den',
    );
    expect(roomDir({ project_dir: 'D:/projects/agent-den', cwd: 'd:\\projects\\agent-den' })).toBe(
      'D:/projects/agent-den',
    );
  });

  it('follows cwd when the session moved out of its start folder (CLAUDE_PROJECT_DIR is fixed at start)', () => {
    expect(roomDir({ project_dir: 'D:/projects/cat-herder', cwd: 'D:\\projects\\agent-den' })).toBe(
      'D:\\projects\\agent-den',
    );
  });

  it('does not treat a sibling with a common prefix as a subfolder', () => {
    expect(roomDir({ project_dir: 'D:/projects/agent', cwd: 'D:/projects/agent-den' })).toBe('D:/projects/agent-den');
  });

  it('falls back to whichever one is present', () => {
    expect(roomDir({ cwd: 'D:/a' })).toBe('D:/a');
    expect(roomDir({ project_dir: 'D:/b' })).toBe('D:/b');
  });
});

describe('fromClaudeCodeHook', () => {
  it('maps a subagent tool hook to its kitten, with the session as parent and the tool category', () => {
    const event = fromClaudeCodeHook({
      hook_event_name: 'PreToolUse',
      session_id: 's1',
      agent_id: 'k1',
      agent_type: 'Explore',
      tool_name: 'Grep',
      tool_input: { pattern: 'COLLECTOR_PORT' },
      cwd: 'D:/projects/agent-den',
    });
    expect(event).toMatchObject({
      kind: 'tool-start',
      sessionId: 's1',
      agentId: 'k1',
      parentAgentId: 's1',
      toolCategory: 'read',
      detail: 'COLLECTOR_PORT',
      title: 'Explore',
    });
  });

  it('maps permission requests and notifications to waiting, but ignores the idle reminder', () => {
    expect(fromClaudeCodeHook({ hook_event_name: 'PermissionRequest', session_id: 's1' })?.kind).toBe('waiting');
    expect(
      fromClaudeCodeHook({ hook_event_name: 'Notification', session_id: 's1', notification_type: 'idle_prompt' }),
    ).toBeNull();
    expect(
      fromClaudeCodeHook({
        hook_event_name: 'Notification',
        session_id: 's1',
        message: 'Claude is waiting for your input',
      }),
    ).toBeNull();
  });

  it('ignores unknown hooks and payloads without a session', () => {
    expect(fromClaudeCodeHook({ hook_event_name: 'PreCompact', session_id: 's1' })).toBeNull();
    expect(fromClaudeCodeHook({ hook_event_name: 'Stop', session_id: '' })).toBeNull();
  });
});
