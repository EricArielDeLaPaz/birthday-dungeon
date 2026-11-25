import type { Attribute, Role, Skill, Unit } from '../engine/combat'

const skill = (name: string, cost: number, power: number, attribute: Attribute, type: Skill['type'], target: Skill['target'], description: string, effect?: Skill['effect']): Skill =>
  ({ name, cost, power, attribute, type, target, description, effect })
const enemy = (id: string, name: string, role: Role, attributes: Attribute[], stats: [number, number, number, number, number], ability: string, skills: Unit['skills'], options: Partial<Unit> = {}): Unit =>
  ({ id, name, role, attributes, hp: stats[0], maxHp: stats[0], physAtk: stats[1], magAtk: stats[2], def: stats[3], spd: stats[4], ability, passive: ability, skills, statuses: [], gauge: [0, 0, 0], ...options })

const basic = (name: string, attribute: Attribute, type: Skill['type'] = 'physical') => skill(name, 0, 100, attribute, type, 'enemy', `A ${attribute.toLowerCase()} strike.`)
const dummy = skill('Ward', 0, 0, 'Earth', 'heal', 'all-allies', 'A practiced stance.')
const ultimate = (name: string, attribute: Attribute, type: Skill['type'], target: Skill['target'], power: number, description: string, effect?: Skill['effect']) =>
  skill(name, 5, power, attribute, type, target, description, effect)

export const minions: Unit[] = [
  enemy('goblin-guard', 'Gilded Goblin', 'Tank', ['Earth'], [82, 20, 8, 8, 13], 'Scavenger · drops extra coins', [basic('Rusty Chop', 'Earth'), dummy, dummy, ultimate('Goblin King’s Yell', 'Earth', 'physical', 'enemy', 135, 'An overconfident chop.')], { isMinion: true }),
  enemy('shade-stalker', 'Shade Stalker', 'Assassin', ['Shadow'], [62, 29, 8, 4, 25], 'Skulk · swift and hard to pin down', [basic('Night Talon', 'Shadow'), dummy, dummy, ultimate('Deep Cut', 'Shadow', 'physical', 'enemy', 145, 'A sharp strike.')], { isMinion: true }),
  enemy('ember-adept', 'Ember Adept', 'Mage', ['Fire'], [66, 9, 28, 5, 18], 'Kindle · fire attacks can Burn', [basic('Cinderbolt', 'Fire', 'magic'), dummy, dummy, ultimate('Flaring Hex', 'Fire', 'magic', 'enemy', 140, 'A flare of fire.', 'Burn')], { isMinion: true }),
  enemy('moss-priest', 'Mossbound Acolyte', 'Healer', ['Earth'], [74, 11, 23, 7, 12], 'Patchwork · mends the weakest foe', [basic('Thorn Prayer', 'Earth', 'magic'), dummy, dummy, ultimate('Spore Benediction', 'Earth', 'heal', 'all-allies', 15, 'A small enemy heal.')], { isMinion: true }),
  enemy('iron-hound', 'Ironroot Hound', 'Attacker', ['Earth'], [76, 26, 10, 6, 20], 'Packhunter · attacks with its pack', [basic('Iron Bite', 'Earth'), dummy, dummy, ultimate('Rending Bite', 'Earth', 'physical', 'enemy', 150, 'A hard bite.')], { isMinion: true }),
  enemy('emberling', 'Ember Minion', 'Attacker', ['Fire'], [72, 26, 12, 7, 19], 'Kindling · a spark of the old dragon', [basic('Coalclaw', 'Fire'), dummy, dummy, ultimate('Hothead Rush', 'Fire', 'physical', 'enemy', 145, 'A fiery rush.')], { isMinion: true }),
]

export const bosses: Unit[] = [
  enemy('ignis-rex', 'Ignis Rex', 'Attacker', ['Fire'], [420, 50, 36, 20, 27], 'Crown of Cinders · Fire attacks Burn for 2 turns', [
    skill('Rex’s Talon', 0, 130, 'Fire', 'physical', 'enemy', 'A heavy scorching claw.', 'Burn'),
    dummy, dummy,
    ultimate('Worldfire', 'Fire', 'magic', 'all-enemies', 205, 'The dragon king breathes a cathedral of flame.', 'Burn'),
  ], { isBoss: true, bossUltimate: true }),
  enemy('resonance-golem', 'Resonance Golem', 'Tank', ['Sound', 'Earth'], [560, 35, 44, 33, 17], 'Twin Resonance · Sound/Earth weakness is canceled', [
    skill('Seismic Palm', 0, 125, 'Earth', 'physical', 'enemy', 'A seismic strike.', 'DEF Down'),
    dummy, dummy,
    ultimate('Dirge of Stone', 'Sound', 'magic', 'all-enemies', 165, 'A low, crushing requiem.', 'Curse'),
  ], { isBoss: true, bossUltimate: true }),
  enemy('eclipse-sovereign', 'Eclipse Sovereign', 'Mage', ['Light', 'Shadow'], [720, 49, 56, 26, 31], 'Eternal Eclipse · Light/Shadow weakness is canceled', [
    skill('Alternating Eclipse', 0, 145, 'Shadow', 'magic', 'enemy', 'Light and shadow trade places.', 'Curse'),
    dummy, dummy,
    ultimate('Totality', 'Light', 'magic', 'all-enemies', 190, 'Burn and curse bloom beneath the final eclipse.', ['Burn', 'Curse']),
  ], { isBoss: true, bossUltimate: true }),
]

export function createEnemy(id: string, index = 0): Unit {
  const template = [...minions, ...bosses].find((item) => item.id === id)
  if (!template) throw new Error(`Unknown enemy: ${id}`)
  return { ...template, id: `${id}-${index}`, hp: template.maxHp, statuses: [], gauge: [0, 0, 0] }
}
