import type { Attribute, Role, Skill, Unit } from '../engine/combat'

const conciseDescription = (power: number, type: Skill['type'], target: Skill['target'], effect?: Skill['effect'], selfEffect?: Skill['selfEffect']) => {
  const targetName = target === 'all-enemies' ? 'all enemies' : target === 'all-allies' ? 'all allies' : target === 'ally' ? 'one ally' : '1 enemy'
  const description = type === 'heal'
    ? power > 0 ? `Heals ${targetName} by ${power}% of Max HP.` : ''
    : `Deals ${power}% ${type === 'physical' ? 'Phys' : 'Mag'} ATK to ${targetName}.`
  const targetEffects = effect ? Array.isArray(effect) ? effect : [effect] : []
  const effectText = [...new Set(targetEffects)].map((kind) => {
    const turns = kind === 'Freeze' ? 1 : 2
    const grants = ['ATK Up', 'DEF Up', 'Stealth'].includes(kind)
    const effectTarget = target === 'all-enemies' ? 'all enemies' : target === 'all-allies' ? 'all allies' : target === 'ally' ? '1 ally' : '1 enemy'
    return `${grants ? 'Grants' : 'Inflicts'} ${kind} (${turns}t) ${grants ? 'to' : 'on'} ${effectTarget}.`
  })
  if (selfEffect) effectText.push(`Grants ${selfEffect} for 2 turns.`)
  return [description, ...effectText].filter(Boolean).join(' ')
}

const bossHp: Record<string, number> = {
  'boss-frostfire': 1000,
  'boss-choir-monolith': 1250,
  'boss-eclipse-seraph': 1500,
  'boss-bone-dragon': 2000,
}
const bossAttackMultiplier: Record<string, number> = {
  'boss-frostfire': 2,
  'boss-choir-monolith': 2,
  'boss-eclipse-seraph': 2,
}

const skill = (
  name: string,
  cost: number,
  power: number,
  attribute: Attribute,
  type: Skill['type'],
  target: Skill['target'],
  _description: string,
  effect?: Skill['effect'],
  selfEffect?: Skill['selfEffect'],
  additionalAttributes?: Skill['additionalAttributes'],
): Skill => ({ name, cost, power, attribute, type, target, description: conciseDescription(power, type, target, effect, selfEffect), effect, selfEffect, additionalAttributes })

const enemy = (
  id: string,
  name: string,
  role: Role,
  attributes: Attribute[],
  stats: [number, number, number, number, number],
  ability: string,
  skills: Unit['skills'],
  options: Partial<Unit> = {},
): Unit => {
  const bossMultiplier = options.isBoss ? 0.5 : 1
  const maxHp = bossHp[id] ?? Math.round(stats[0] * bossMultiplier)
  const attackMultiplier = bossAttackMultiplier[id] ?? 1
  const physAtk = Math.round(Math.round(stats[1] * bossMultiplier) * attackMultiplier)
  const magAtk = Math.round(Math.round(stats[2] * bossMultiplier) * attackMultiplier)
  return {
    id, name, role, attributes, hp: maxHp, maxHp,
    physAtk, magAtk,
    def: stats[3], spd: Math.min(stats[4], 90), ability, passive: ability,
    skills, statuses: [], gauge: [0, 0, 0], ...options,
  }
}

const basic = (
  name: string,
  attribute: Attribute,
  type: Skill['type'] = 'physical',
  target: Skill['target'] = 'enemy',
  power = 100,
  description = `A ${attribute.toLowerCase()} strike.`,
  effect?: Skill['effect'],
  selfEffect?: Skill['selfEffect'],
) => skill(name, 0, power, attribute, type, target, description, effect, selfEffect)

const placeholder = { ...skill('Unused Skill', 0, 0, 'Earth', 'heal', 'all-allies', 'No effect.'), description: 'No effect; this skill slot is unused.' }
const ultimate = (
  name: string,
  attribute: Attribute,
  type: Skill['type'],
  target: Skill['target'],
  power: number,
  description: string,
  effect?: Skill['effect'],
  selfEffect?: Skill['selfEffect'],
  additionalAttributes?: Skill['additionalAttributes'],
) => skill(name, 5, power, attribute, type, target, description, effect, selfEffect, additionalAttributes)

export const minions: Unit[] = [
  enemy('minion-crypt-knight', 'Crypt Knight', 'Tank', ['Earth'], [112, 25, 10, 15, 13], 'Graveguard · draws attacks and braces behind a stone shield.', [
    basic('Grave Taunt', 'Earth', 'physical', 'enemy', 90, 'Calls out a living foe and draws its focus.', 'Taunt'),
    placeholder, placeholder,
    ultimate('Sepulcher Slam', 'Earth', 'physical', 'enemy', 140, 'A heavy shield strike that taunts its target.', 'Taunt'),
  ], { isMinion: true }),
  enemy('minion-dread-stalker', 'Dread Stalker', 'Assassin', ['Shadow'], [76, 35, 14, 8, 29], 'Unseen Hunter · vanishes between strikes.', [
    basic('Gloam Shank', 'Shadow', 'physical', 'enemy', 110, 'A swift cut from the dark.', undefined, 'Stealth'),
    placeholder, placeholder,
    ultimate('Midnight Pounce', 'Shadow', 'physical', 'enemy', 155, 'A sudden attack before it slips from sight.', undefined),
  ], { isMinion: true }),
  enemy('minion-ash-cultist', 'Ash Cultist', 'Mage', ['Fire'], [80, 14, 32, 9, 20], 'Cinder Rite · ash magic leaves a lingering burn.', [
    basic('Searing Cinder', 'Fire', 'magic', 'enemy', 100, 'A charred sigil bites into its target.', 'Burn'),
    placeholder, placeholder,
    ultimate('Ashen Brand', 'Fire', 'magic', 'enemy', 145, 'A concentrated brand of hungry ash.', 'Burn'),
  ], { isMinion: true }),
  enemy('minion-plague-cantor', 'Plague Cantor', 'Healer', ['Sound'], [92, 12, 27, 11, 16], 'Dirge of Rot · curses enemies and mends its allies.', [
    basic('Rotting Verse', 'Sound', 'magic', 'enemy', 90, 'A sickly note carries a creeping curse.', 'Curse'),
    placeholder, placeholder,
    ultimate('Grave Refrain', 'Sound', 'heal', 'all-allies', 18, 'The choir mends its own with a blighted refrain.'),
  ], { isMinion: true }),
  enemy('minion-bone-archer', 'Bone Archer', 'Attacker', ['Shadow'], [82, 33, 14, 8, 23], 'Grave Volley · excels at piercing volleys.', [
    basic('Grave Arrow', 'Shadow', 'physical', 'enemy', 112, 'A bone arrow seeks a single target.'),
    placeholder, placeholder,
    ultimate('Marrow Volley', 'Shadow', 'physical', 'all-enemies', 105, 'A fan of arrows crosses the whole party.'),
  ], { isMinion: true }),
  enemy('minidragon-fire', 'Cinder Drake', 'Attacker', ['Fire'], [94, 31, 20, 10, 25], 'Kindled Maw · bites with a searing flame.', [
    basic('Ember Bite', 'Fire', 'physical', 'enemy', 105, 'A hot bite leaves a lasting burn.', 'Burn'),
    placeholder, placeholder,
    ultimate('Flamecrest Rush', 'Fire', 'physical', 'enemy', 150, 'A fiery dive that leaves a burning wound.', 'Burn'),
  ], { isMinion: true }),
  enemy('minidragon-ice', 'Rime Drake', 'Attacker', ['Ice'], [96, 30, 21, 11, 22], 'Rimehide · frost gathers along its plated wings.', [
    basic('Rime Claw', 'Ice', 'physical', 'enemy', 105, 'A chilled claw slows a foe with frost.', 'DEF Down'),
    placeholder, placeholder,
    ultimate('Whiteout Dive', 'Ice', 'magic', 'enemy', 145, 'A glacial plunge chills its target.', 'DEF Down'),
  ], { isMinion: true }),
  enemy('minidragon-earth', 'Basalt Drake', 'Tank', ['Earth'], [124, 29, 17, 16, 15], 'Stoneback · bolsters the brood with living stone.', [
    basic('Basalt Guard', 'Earth', 'physical', 'enemy', 92, 'Its impact hardens the whole brood.', undefined, 'DEF Up'),
    placeholder, placeholder,
    ultimate('Faultshell Roar', 'Earth', 'physical', 'enemy', 132, 'Stone plates rise across its allies.', undefined),
  ], { isMinion: true }),
  enemy('minidragon-sound', 'Chime Drake', 'Mage', ['Sound'], [88, 18, 30, 9, 24], 'Resonant Lungs · releases a cutting sonic cry.', [
    basic('Glasswing Screech', 'Sound', 'magic', 'all-enemies', 86, 'A piercing cry shudders through the party.'),
    placeholder, placeholder,
    ultimate('Shattering Note', 'Sound', 'magic', 'all-enemies', 118, 'A sharper note fractures the air.'),
  ], { isMinion: true }),
  enemy('minidragon-light', 'Dawn Drake', 'Healer', ['Light'], [98, 21, 26, 11, 21], 'Lantern Scale · shares a warm restorative radiance.', [
    basic('Halo Bolt', 'Light', 'magic', 'enemy', 90, 'A small ray of radiant force.'),
    placeholder, placeholder,
    ultimate('Dawn Mend', 'Light', 'heal', 'all-allies', 14, 'A clean flare restores every living ally.'),
  ], { isMinion: true }),
]

export const bosses: Unit[] = [
  enemy('boss-bone-dragon', 'Vaelgor, The Eternal Bone Dragon', 'Attacker', ['Light', 'Shadow', 'Ice', 'Fire', 'Sound', 'Earth'], [8500, 240, 180, 120, 1], 'Ossuary Aegis · permanently reduces incoming damage by 25%; all opposing attributes cancel.', [
    basic('Abyssal Plague Breath', 'Shadow', 'magic', 'all-enemies', 115, 'Breathes a plague across the active party.', ['Burn', 'Curse', 'Freeze']),
    placeholder, placeholder,
    ultimate('Sovereign Execution', 'Shadow', 'physical', 'enemy', 400, 'Executes the frontmost active hero, then the backmost row.'),
  ], { isBoss: true, isColossal: true, bossUltimate: true }),
  enemy('boss-choir-monolith', 'Choir-Warden Monolith', 'Tank', ['Sound', 'Earth'], [790, 39, 48, 38, 17], 'Resonant Stone · Sound/Earth cancellation; takes 15% less damage above half HP.', [
    basic('Shatter Chime', 'Earth', 'magic', 'enemy', 125, 'A resonant earth strike leaves a two-turn Burn.', 'Burn'),
    placeholder, placeholder,
    ultimate('Tectonic Requiem', 'Sound', 'magic', 'all-enemies', 168, 'A crushing soundwave lays a two-turn Curse.', 'Curse'),
  ], { isBoss: true, bossUltimate: true }),
  enemy('boss-eclipse-seraph', 'Nyx-Aurelia, Eclipse Seraph', 'Mage', ['Light', 'Shadow'], [920, 60, 68, 32, 34], 'Twin Eclipse · Light/Shadow cancellation; alternates Solar and Umbral stances.', [
    basic('Eclipse Brand', 'Light', 'magic', 'all-enemies', 160, 'Solar stance: a light brand strikes the whole party.'),
    placeholder, placeholder,
    ultimate('Shattered Halo', 'Light', 'magic', 'all-enemies', 190, 'A devastating Light and Shadow strike inflicts Burn and Curse.', ['Burn', 'Curse'], undefined, ['Shadow']),
  ], { isBoss: true, bossUltimate: true }),
  enemy('boss-frostfire', 'Kryo-Ignis, The Frostfire Sovereign', 'Mage', ['Ice', 'Fire'], [1850, 98, 145, 55, 39], 'Frostfire Balance · Ice and Fire attacks deal neutral damage.', [
    basic('Frostfire Lance', 'Fire', 'magic', 'enemy', 160, 'Deals a focused Frostfire strike.'),
    placeholder, placeholder,
    ultimate('Frostfire Cataclysm', 'Fire', 'magic', 'all-enemies', 180, 'Blasts all active heroes with frost and flame.', ['Freeze', 'Burn'], undefined, ['Ice']),
  ], { isBoss: true, bossUltimate: true }),
]

export function createEnemy(id: string, index = 0): Unit {
  const template = [...minions, ...bosses].find((item) => item.id === id)
  if (!template) throw new Error(`Unknown enemy: ${id}`)
  return {
    ...template,
    id: `${id}-${index}`,
    hp: template.maxHp,
    statuses: [],
    gauge: [0, 0, 0],
    passiveUsed: false,
  }
}
