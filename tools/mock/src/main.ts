import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { categorizeTool, COLLECTOR_PORT, type DenEvent, type DenEventKind } from '@agent-den/contracts';

const endpoint = `http://127.0.0.1:${process.env['AGENT_DEN_PORT'] ?? COLLECTOR_PORT}/events`;

const projects = ['D:/projects/agent-den', 'D:/projects/set-forge', 'D:/projects/pet-shop'];
const tools = ['Read', 'Grep', 'Edit', 'Write', 'Bash', 'WebFetch', 'Glob', 'mcp__figma__get_screenshot'];

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) {
    throw new Error('pick: items must not be empty');
  }
  return item;
}
const pause = (min: number, max: number): Promise<void> => sleep(min + Math.random() * (max - min));

async function emit(
  base: Pick<DenEvent, 'sessionId' | 'agentId' | 'parentAgentId' | 'cwd'>,
  kind: DenEventKind,
  toolName?: string,
): Promise<void> {
  const event: DenEvent = {
    ...base,
    id: randomUUID(),
    source: 'mock',
    kind,
    toolName,
    toolCategory: toolName ? categorizeTool(toolName) : undefined,
    detail: toolName ? `mock ${toolName}` : undefined,
    timestamp: Date.now(),
  };
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // Collector restarting (tsx watch) — drop the event, the scenario keeps going.
  }
}

async function runTools(
  base: Pick<DenEvent, 'sessionId' | 'agentId' | 'parentAgentId' | 'cwd'>,
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i++) {
    const tool = pick(tools);
    await emit(base, 'tool-start', tool);
    await pause(800, 3000);
    await emit(base, Math.random() < 0.08 ? 'tool-error' : 'tool-end', tool);
    await pause(300, 1200);
  }
}

/** One session: prompt → tools → maybe subagents → maybe permission wait → stop. */
async function runSession(cwd: string): Promise<void> {
  const sessionId = randomUUID();
  const main = { sessionId, agentId: sessionId, cwd };

  await emit(main, 'session-start');
  await pause(500, 1500);
  await emit(main, 'prompt');
  await runTools(main, 3);

  if (Math.random() < 0.7) {
    const kittens = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({
      sessionId,
      agentId: randomUUID(),
      parentAgentId: sessionId,
      cwd,
    }));
    await emit(main, 'tool-start', 'Task');
    await Promise.all(
      kittens.map(async kitten => {
        await emit(kitten, 'subagent-start');
        await runTools(kitten, 2 + Math.floor(Math.random() * 4));
        await emit(kitten, 'subagent-stop');
      }),
    );
    await emit(main, 'tool-end', 'Task');
  }

  if (Math.random() < 0.5) {
    await emit(main, 'waiting');
    await pause(4000, 8000);
  }

  await runTools(main, 2);
  // Now and then the user hits Esc instead of letting the turn finish.
  await emit(main, Math.random() < 0.2 ? 'interrupted' : 'stop');
  await pause(5000, 10000);
  await emit(main, 'session-end');
}

process.stdout.write(`mock: sending scenarios to ${endpoint} (Ctrl+C to stop)\n`);

// Keep ~3 sessions alive, each in its own room.
await Promise.all(
  projects.map(async (cwd, index) => {
    await pause(index * 2000, index * 2000 + 1000);
    for (;;) {
      await runSession(cwd);
    }
  }),
);
