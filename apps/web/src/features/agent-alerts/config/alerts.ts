/** Only events this fresh can alert — replays from transcript backfill carry old timestamps. */
export const FRESH_EVENT_MS = 30_000;

/** One alert per agent per this long, so a flapping agent doesn't meow in a loop. */
export const PER_AGENT_COOLDOWN_MS = 5_000;

export const ALERT_SETTINGS_STORAGE_KEY = 'agent-den.alert-settings';

/** Playback speeds of the recordings: every cat gets one of these voices (1 = as recorded). */
export const CAT_VOICES = [0.9, 0.95, 1, 1.05, 1.1, 1.15] as const;

/** Kittens sound this much higher than grown cats. */
export const KITTEN_VOICE_BOOST = 1.2;
