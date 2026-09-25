/** How long a character takes to walk between two stations. */
export const WALK_MS = 1200;

/** Screen pixels per art pixel. Integers keep the pixel art crisp. */
export const CAT_SCALE = 3;
export const KITTEN_SCALE = 2;
export const STATION_SCALE = 5;

/** Horizontal step between characters sharing a station. */
export const SPREAD_PX = 30;

/** Station position used when a skin doesn't define the slot, percent of the room width. */
export const FALLBACK_STATION_X = 50;

/** localStorage key for the rooms the viewer folded. */
export const COLLAPSED_ROOMS_STORAGE_KEY = 'agent-den.collapsed-rooms';
