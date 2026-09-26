import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DenStore } from '../den-store';
import { CursorAdapter } from './cursor';

const root = ['/Users/me/projects/agent-den'];

function setup(): { store: DenStore; adapter: CursorAdapter; push: (payload: object) => void } {
  const store = new DenStore();
  const adapter = new CursorAdapter(store);
  const push = (payload: object): void => {
    for (const event of adapter.toEvents({ conversation_id: '', hook_event_name: '', ...payload })) {
      store.push(event);
    }
  };
  return { store, adapter, push };
}

describe('CursorAdapter', () => {
  it('maps a tool call of the session to its cat, with the workspace as the room', () => {
    const { adapter } = setup();
    const event = adapter.toEvent({
      hook_event_name: 'preToolUse',
      conversation_id: 'c1',
      workspace_roots: root,
      tool_name: 'Shell',
      tool_input: { command: 'npm test' },
    });
    expect(event).toMatchObject({
      source: 'cursor',
      kind: 'tool-start',
      sessionId: 'c1',
      agentId: 'c1',
      cwd: root[0],
      toolCategory: 'shell',
      detail: 'npm test',
    });
    expect(event?.parentAgentId).toBeUndefined();
  });

  it('turns subagentStart into a kitten and routes the hooks fired inside it to that kitten', () => {
    const { store, adapter, push } = setup();
    push({ hook_event_name: 'beforeSubmitPrompt', conversation_id: 'c1', prompt: 'explore it' });
    push({
      hook_event_name: 'subagentStart',
      conversation_id: 'c1',
      parent_conversation_id: 'c1',
      subagent_id: 'k1',
      subagent_type: 'explore',
      task: 'Find the collector port',
    });
    expect(store.get('k1')).toMatchObject({ sessionId: 'c1', parentAgentId: 'c1', title: 'explore' });

    const inside = adapter.toEvent({ hook_event_name: 'postToolUse', conversation_id: 'k1', tool_name: 'Grep' });
    expect(inside).toMatchObject({ agentId: 'k1', parentAgentId: 'c1', sessionId: 'c1', kind: 'tool-end' });
  });

  it('links a kitten of a kitten to the root session', () => {
    const { store, push } = setup();
    push({ hook_event_name: 'subagentStart', conversation_id: 'c1', subagent_id: 'k1' });
    push({ hook_event_name: 'subagentStart', conversation_id: 'k1', subagent_id: 'k2' });
    expect(store.get('k2')).toMatchObject({ sessionId: 'c1', parentAgentId: 'k1' });
  });

  it('recovers the parent from the restored den after a collector restart', () => {
    const { store, push } = setup();
    push({ hook_event_name: 'subagentStart', conversation_id: 'c1', subagent_id: 'k1' });
    const restarted = new CursorAdapter(store);
    expect(restarted.toEvent({ hook_event_name: 'stop', conversation_id: 'k1' })).toMatchObject({
      parentAgentId: 'c1',
    });
  });

  it('ignores the session hooks of a subagent conversation', () => {
    const { adapter, push } = setup();
    push({ hook_event_name: 'subagentStart', conversation_id: 'c1', subagent_id: 'k1' });
    expect(adapter.toEvent({ hook_event_name: 'sessionStart', conversation_id: 'k1' })).toBeNull();
  });

  it('reads how a turn ended: Esc is interrupted, an error is a failure', () => {
    const { adapter } = setup();
    const kind = (payload: object): string | undefined =>
      adapter.toEvent({ conversation_id: 'c1', hook_event_name: 'stop', workspace_roots: root, ...payload })?.kind;
    expect(kind({ status: 'completed' })).toBe('stop');
    expect(kind({ status: 'aborted' })).toBe('interrupted');
    expect(kind({ status: 'error' })).toBe('tool-error');
    expect(kind({ hook_event_name: 'subagentStop', subagent_id: 'k1', status: 'completed' })).toBe('subagent-stop');
    expect(kind({ hook_event_name: 'postToolUseFailure', is_interrupt: true })).toBe('interrupted');
    expect(kind({ hook_event_name: 'postToolUseFailure', is_interrupt: false })).toBe('tool-error');
  });

  it('keeps one kitten when the subagent’s own hooks use a different id', () => {
    const { store, adapter, push } = setup();
    push({
      hook_event_name: 'subagentStart',
      conversation_id: 'c1',
      subagent_id: 'call-1\nfc_same',
      subagent_type: 'general-purpose',
      transcript_path: '/t/c1/c1.jsonl',
      workspace_roots: root,
    });
    push({
      hook_event_name: 'preToolUse',
      conversation_id: 'uuid-1',
      transcript_path: null,
      tool_name: 'Shell',
      tool_input: { command: 'sleep 15' },
      workspace_roots: root,
    });
    push({
      hook_event_name: 'subagentStop',
      conversation_id: 'c1',
      subagent_id: 'call-1\nfc_same',
      status: 'completed',
      agent_transcript_path: '/t/subagents/uuid-1.jsonl',
      workspace_roots: root,
    });

    expect(store.has('uuid-1')).toBe(false);
    expect(store.get('call-1')).toMatchObject({
      parentAgentId: 'c1',
      activity: 'done',
      title: 'general-purpose',
    });
    expect(adapter.transcriptPaths()).toContainEqual(['call-1', '/t/subagents/uuid-1.jsonl']);
  });

  it('sends home a cat already opened for the subagent conversation', () => {
    const { store, push } = setup();
    push({ hook_event_name: 'sessionStart', conversation_id: 'uuid-1', workspace_roots: root });
    push({
      hook_event_name: 'subagentStart',
      conversation_id: 'c1',
      subagent_id: 'call-1',
      workspace_roots: root,
    });
    push({
      hook_event_name: 'preToolUse',
      conversation_id: 'uuid-1',
      transcript_path: null,
      tool_name: 'Shell',
      workspace_roots: root,
    });

    expect(store.get('uuid-1')?.activity).toBe('gone');
    expect(store.get('call-1')).toMatchObject({ parentAgentId: 'c1', activity: 'tool' });
  });

  it('pairs transcript files with kittens whose own hooks never arrived', () => {
    const dir = mkdtempSync(join(tmpdir(), 'den-kittens-'));
    const parent = join(dir, 'c1', 'c1.jsonl');
    mkdirSync(join(dir, 'c1', 'subagents'), { recursive: true });
    writeFileSync(join(dir, 'c1', 'subagents', 'uuid-a.jsonl'), '{}\n');
    writeFileSync(join(dir, 'c1', 'subagents', 'uuid-b.jsonl'), '{}\n');
    const { adapter, push } = setup();
    push({
      hook_event_name: 'subagentStart',
      conversation_id: 'c1',
      subagent_id: 'call-a',
      transcript_path: parent,
      workspace_roots: root,
    });
    push({
      hook_event_name: 'subagentStart',
      conversation_id: 'c1',
      subagent_id: 'call-b',
      transcript_path: parent,
      workspace_roots: root,
    });

    const paths = adapter.transcriptPaths();
    expect(paths).toEqual([
      ['call-a', join(dir, 'c1', 'subagents', 'uuid-a.jsonl')],
      ['call-b', join(dir, 'c1', 'subagents', 'uuid-b.jsonl')],
    ]);
  });

  it('sends home a subagent opened as its own cat before subagentStart, ignoring older files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'den-kittens-'));
    const parent = join(dir, 'c1', 'c1.jsonl');
    const subagents = join(dir, 'c1', 'subagents');
    mkdirSync(subagents, { recursive: true });
    const oldFile = join(subagents, 'old-kitten.jsonl');
    writeFileSync(oldFile, '{}\n');
    utimesSync(oldFile, new Date(Date.now() - 3 * 60_000), new Date(Date.now() - 3 * 60_000));
    writeFileSync(join(subagents, 'uuid-new.jsonl'), '{}\n');
    const { store, adapter, push } = setup();
    store.push({
      id: 'e',
      source: 'cursor',
      kind: 'tool-start',
      sessionId: 'uuid-new',
      agentId: 'uuid-new',
      toolName: 'Shell',
      timestamp: Date.now(),
    });
    push({
      hook_event_name: 'subagentStart',
      conversation_id: 'c1',
      subagent_id: 'call-1',
      transcript_path: parent,
      workspace_roots: root,
    });

    expect(store.get('uuid-new')?.activity).toBe('gone');
    expect(store.get('call-1')?.parentAgentId).toBe('c1');
    expect(adapter.transcriptPaths()).toContainEqual(['call-1', join(subagents, 'uuid-new.jsonl')]);
  });

  it('does not grow a second cat when the subagent hook names its own transcript', () => {
    const { store, push } = setup();
    push({
      hook_event_name: 'subagentStart',
      conversation_id: 'c1',
      subagent_id: 'call-1',
      transcript_path: '/t/c1/c1.jsonl',
      workspace_roots: root,
    });
    push({
      hook_event_name: 'preToolUse',
      conversation_id: 'uuid-1',
      transcript_path: '/t/c1/subagents/uuid-1.jsonl',
      tool_name: 'Shell',
      tool_input: { command: 'sleep 10' },
      workspace_roots: root,
    });

    expect(store.has('uuid-1')).toBe(false);
    expect(store.get('call-1')).toMatchObject({ parentAgentId: 'c1', activity: 'tool', detail: 'sleep 10' });
  });

  it('does not open a room for a chat with no project folder', () => {
    const { store, adapter } = setup();
    expect(adapter.toEvent({ hook_event_name: 'sessionStart', conversation_id: 'loose' })).toBeNull();
    expect(store.has('loose')).toBe(false);
  });

  it('ignores unknown hooks and payloads without a conversation', () => {
    const { adapter } = setup();
    expect(adapter.toEvent({ hook_event_name: 'afterAgentThought', conversation_id: 'c1' })).toBeNull();
    expect(adapter.toEvent({ hook_event_name: 'stop', conversation_id: '' })).toBeNull();
    expect(adapter.toEvent({ hook_event_name: 'subagentStart', conversation_id: 'c1' })).toBeNull();
  });
});
