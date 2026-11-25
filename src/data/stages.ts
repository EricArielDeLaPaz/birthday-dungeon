export type Stage = { number: number; act: number; kind: 'fight' | 'camp' | 'boss'; title: string; enemies: string[]; hostages: number; reward: number; description: string }

export const stages: Stage[] = [
  { number: 1, act: 1, kind: 'fight', title: 'The Mossgate', enemies: ['goblin-guard', 'shade-stalker'], hostages: 1, reward: 45, description: 'A lantern-lit path into the old wood.' },
  { number: 2, act: 1, kind: 'fight', title: 'Foxfire Hollow', enemies: ['ember-adept', 'iron-hound', 'goblin-guard'], hostages: 1, reward: 50, description: 'Blue foxfire dances between the roots.' },
  { number: 3, act: 1, kind: 'camp', title: 'Mosslight Camp', enemies: [], hostages: 0, reward: 0, description: 'A quiet clearing beneath ancient boughs.' },
  { number: 4, act: 1, kind: 'fight', title: 'The Broken Shrine', enemies: ['moss-priest', 'shade-stalker', 'iron-hound'], hostages: 2, reward: 60, description: 'A forgotten shrine stirs with restless life.' },
  { number: 5, act: 1, kind: 'boss', title: 'Cinder Throne', enemies: ['ignis-rex', 'emberling', 'emberling'], hostages: 0, reward: 100, description: 'Ignis Rex, the crowned flame.' },
  { number: 6, act: 2, kind: 'fight', title: 'Singing Steps', enemies: ['shade-stalker', 'moss-priest', 'goblin-guard'], hostages: 1, reward: 60, description: 'The mountain echoes your every footfall.' },
  { number: 7, act: 2, kind: 'fight', title: 'The Rattlepass', enemies: ['iron-hound', 'ember-adept', 'shade-stalker', 'goblin-guard'], hostages: 1, reward: 65, description: 'Loose stones roll in time with a distant hum.' },
  { number: 8, act: 2, kind: 'camp', title: 'Echo Camp', enemies: [], hostages: 0, reward: 0, description: 'Warm tea and stillness before the summit.' },
  { number: 9, act: 2, kind: 'fight', title: 'The Resonant Vault', enemies: ['moss-priest', 'iron-hound', 'ember-adept'], hostages: 2, reward: 75, description: 'A sealed vault thrums behind the stone.' },
  { number: 10, act: 2, kind: 'boss', title: 'Heart of the Mountain', enemies: ['resonance-golem'], hostages: 0, reward: 130, description: 'Two ancient elements, one unyielding will.' },
  { number: 11, act: 3, kind: 'fight', title: 'The Starless Road', enemies: ['shade-stalker', 'ember-adept', 'iron-hound'], hostages: 1, reward: 75, description: 'The sky dims as the dungeon climbs.' },
  { number: 12, act: 3, kind: 'fight', title: 'Prismfall', enemies: ['moss-priest', 'shade-stalker', 'emberling', 'iron-hound'], hostages: 1, reward: 80, description: 'Fragments of starlight fall like snow.' },
  { number: 13, act: 3, kind: 'camp', title: 'Last Hearth', enemies: [], hostages: 0, reward: 0, description: 'One last fire burns against the dark.' },
  { number: 14, act: 3, kind: 'fight', title: 'The Eclipse Gate', enemies: ['ember-adept', 'shade-stalker', 'moss-priest', 'iron-hound'], hostages: 3, reward: 90, description: 'Beyond this gate waits the final hour.' },
  { number: 15, act: 3, kind: 'boss', title: 'The Last Eclipse', enemies: ['eclipse-sovereign'], hostages: 0, reward: 200, description: 'The Sovereign waits beneath an empty sky.' },
]

export const actNames = ['Whispering Wilds', 'Resonant Peaks', 'Eclipse Citadel']
