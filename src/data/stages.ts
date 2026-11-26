export type DungeonArea = {
  id: string
  name: string
}

export const dungeonAreas: DungeonArea[] = [
  { id: 'mossbound-crypt', name: 'Mossbound Crypt' },
  { id: 'ashen-ossuary', name: 'Ashen Ossuary' },
  { id: 'sunken-catacombs', name: 'Sunken Catacombs' },
  { id: 'echoing-vault', name: 'Echoing Vault' },
  { id: 'starless-nave', name: 'Starless Nave' },
  { id: 'eclipse-throne', name: 'Eclipse Throne' },
]

export type Stage = {
  number: number
  areaId: string
  areaName: string
  kind: 'fight' | 'camp' | 'boss'
  title: string
  enemies: string[]
  hostages: number
  hostageRecruitIds?: string[]
  reward: number
  description: string
}

const areaAt = (stage: number) => {
  const area = dungeonAreas.find((entry) => {
    const [first, last] = areaRanges[entry.id]
    return stage >= first && stage <= last
  })!
  return { areaId: area.id, areaName: area.name }
}

const areaRanges: Record<string, [number, number]> = {
  'mossbound-crypt': [1, 3],
  'ashen-ossuary': [4, 5],
  'sunken-catacombs': [6, 8],
  'echoing-vault': [9, 10],
  'starless-nave': [11, 13],
  'eclipse-throne': [14, 15],
}

const stage = (
  number: number,
  kind: Stage['kind'],
  title: string,
  enemies: string[],
  hostages: number,
  reward: number,
  description: string,
  hostageRecruitIds?: string[],
): Stage => ({ number, ...areaAt(number), kind, title, enemies, hostages, reward, description, hostageRecruitIds })

export const stages: Stage[] = [
  stage(1, 'fight', 'The Rootbound Gate', ['minion-dread-stalker'], 2, 45, 'Moss-covered stone gives way beneath the old forest.', ['mira', 'thorn']),
  stage(2, 'camp', 'Lantern Rest', [], 0, 0, 'A sheltered fire glows beneath the roots.'),
  stage(3, 'fight', 'The Green Sepulcher', ['minion-ash-cultist', 'minion-bone-archer'], 1, 65, 'A burial chamber stirs with thorn and ash.', ['nyx']),
  stage(4, 'fight', 'Pillars of the Unquiet', ['minion-crypt-knight', 'minion-dread-stalker', 'minidragon-fire'], 2, 85, 'Bone pillars crowd a hall of smoldering braziers.', ['ember', 'syl']),
  stage(5, 'boss', 'Vaelgor’s Ossuary', ['boss-bone-dragon', 'minidragon-fire', 'minidragon-ice', 'minidragon-earth'], 0, 120, 'The Bone Dragon descends with its three surviving brood.'),
  stage(6, 'fight', 'The Drowned Stair', ['minion-plague-cantor', 'minion-dread-stalker', 'minidragon-ice'], 2, 90, 'Black water laps at stairs sunk beneath the earth.', ['zephyr', 'aurelia']),
  stage(7, 'fight', 'The Silted Reliquary', ['minion-crypt-knight', 'minion-bone-archer', 'minion-ash-cultist', 'minidragon-earth'], 1, 100, 'Relics glimmer below the flooded flagstones.', ['glacia']),
  stage(8, 'camp', 'The Dry Bell', [], 0, 0, 'A raised stone island offers a rare, dry place to rest.'),
  stage(9, 'fight', 'The Listening Gallery', ['minion-dread-stalker', 'minion-plague-cantor', 'minidragon-sound'], 2, 115, 'Whispering echoes travel through the drowned vault.', ['cinder', 'orion']),
  stage(10, 'boss', 'The Resonant Heart', ['boss-choir-monolith', 'minion-crypt-knight', 'minion-plague-cantor'], 0, 145, 'A monolith sings through the stone, shielded by its keepers.'),
  stage(11, 'fight', 'The Astral Ossuary', ['minion-bone-archer', 'minion-ash-cultist', 'minion-dread-stalker'], 0, 110, 'Starless constellations mark the walls above the dead.'),
  stage(12, 'camp', 'Wayfarer’s Ember', [], 0, 0, 'One last quiet hearth burns before the upper nave.'),
  stage(13, 'fight', 'The Choirless Nave', ['minion-plague-cantor', 'minion-crypt-knight', 'minidragon-light'], 0, 125, 'An empty cathedral waits beneath a hollow sky.'),
  stage(14, 'fight', 'The Eclipse Threshold', ['minion-ash-cultist', 'minion-dread-stalker', 'minion-bone-archer', 'minidragon-fire'], 0, 150, 'The last guards stand beneath the eclipsed arch.'),
  stage(15, 'boss', 'The Eclipse Throne', ['boss-eclipse-seraph'], 0, 220, 'Nyx-Aurelia waits alone where light and shadow meet.'),
]
