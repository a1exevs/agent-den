import { COLLECTOR_PORT } from '@agent-den/contracts';

/** WebSocket endpoint of the local collector. */
export const collectorSocketUrl = `ws://127.0.0.1:${COLLECTOR_PORT}/ws`;
