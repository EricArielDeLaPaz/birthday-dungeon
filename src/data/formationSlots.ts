// Drop-in percentage coordinates for the BattleArena container (no rotation/skew)
export const PLAYER_SLOTS = [
  // Front Column (directly left of VS — staggered between Back slots)
  { slot: 0, row: 'front', x: 38, y: 39, zIndex: 20 }, // Slot 1 (Upper-Front)
  { slot: 1, row: 'front', x: 38, y: 65, zIndex: 40 }, // Slot 2 (Lower-Front)
  // Back Column (far left — 3 evenly spaced vertical circles)
  { slot: 2, row: 'back',  x: 16, y: 26, zIndex: 10 }, // Slot 3 (Top-Back)
  { slot: 3, row: 'back',  x: 16, y: 52, zIndex: 30 }, // Slot 4 (Mid-Back)
  { slot: 4, row: 'back',  x: 16, y: 78, zIndex: 50 }, // Slot 5 (Bottom-Back)
] as const;

export const ENEMY_SLOTS = [
  // Front Column (directly right of VS — mirrors Player Front)
  { slot: 0, row: 'front', x: 62, y: 39, zIndex: 20 }, // Enemy 1 (Upper-Front)
  { slot: 1, row: 'front', x: 62, y: 65, zIndex: 40 }, // Enemy 2 (Lower-Front)
  // Back Column (far right — mirrors Player Back)
  { slot: 2, row: 'back',  x: 84, y: 26, zIndex: 10 }, // Enemy 3 (Top-Back)
  { slot: 3, row: 'back',  x: 84, y: 52, zIndex: 30 }, // Enemy 4 (Mid-Back / Boss Anchor w/ Minions)
  { slot: 4, row: 'back',  x: 84, y: 78, zIndex: 50 }, // Enemy 5 (Bottom-Back)
] as const;