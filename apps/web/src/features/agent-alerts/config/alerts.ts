/** Only events this fresh can alert — replays from transcript backfill carry old timestamps. */
export const FRESH_EVENT_MS = 30_000;

/** One alert per agent per this long, so a flapping agent doesn't meow in a loop. */
export const PER_AGENT_COOLDOWN_MS = 5_000;

export const ALERT_SETTINGS_STORAGE_KEY = 'agent-den.alert-settings';
