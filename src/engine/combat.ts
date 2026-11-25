export type Attribute = 'Light' | 'Shadow' | 'Ice' | 'Fire' | 'Sound' | 'Earth'
export type Role = 'Tank' | 'Assassin' | 'Attacker' | 'Mage' | 'Healer'
export type StatusKind = 'Burn' | 'Curse' | 'Taunt' | 'Stealth' | 'ATK Up' | 'DEF Up' | 'DEF Down'
export type StatusEffect = { kind: StatusKind; turns: number }
export type Skill = {
  name: string
  cost: number
  power: number
  attribute: Attribute
  type: 'physical' | 'magic' | 'heal'
  target: 'enemy' | 'all-enemies' | 'ally' | 'all-allies'
  effect?: StatusKind | StatusKind[]
  selfEffect?: StatusKind
  description: string
}
export type Unit = {
  id: string
  name: string
  role: Role
  attributes: Attribute[]
  hp: number
  maxHp: number
  physAtk: number
  magAtk: number
  def: number
  spd: number
  ability: string
  passive: string
  skills: [Skill, Skill, Skill, Skill]
  statuses: StatusEffect[]
  gauge: [number, number, number]
  isBoss?: boolean
  isMinion?: boolean
  bossUltimate?: boolean
  passiveUsed?: boolean
  art?: string
  row?: 'Front' | 'Back'
}

export type FloatingText = { id: number; targetId: string; text: string; kind: 'damage' | 'heal' | 'status' }

export const opposingAttribute: Record<Attribute, Attribute> = {
  Light: 'Shadow', Shadow: 'Light', Ice: 'Fire', Fire: 'Ice', Sound: 'Earth', Earth: 'Sound',
}

export const sortBySpeed = <T extends Pick<Unit, 'spd'>>(units: T[]) =>
  [...units].sort((a, b) => b.spd - a.spd)

export function calculateDamage(attacker: Unit, defender: Unit, skill: Skill, attackBonus = 0) {
  if (defender.statuses.some((status) => status.kind === 'Stealth')) return 0
  const attack = skill.type === 'physical' ? attacker.physAtk : attacker.magAtk
  const weakened = skill.type === 'physical' && attacker.statuses.some((status) => status.kind === 'Burn')
  const boosted = attacker.statuses.some((status) => status.kind === 'ATK Up')
  const defenseDown = defender.statuses.some((status) => status.kind === 'DEF Down')
  const dualCancel = defender.attributes.includes(skill.attribute) &&
    defender.attributes.includes(opposingAttribute[skill.attribute])
  const advantage = dualCancel ? 1 : defender.attributes.includes(opposingAttribute[skill.attribute]) ? 2 : 1
  const defense = defender.def * (1 + formationBonus(defender).def) * (defenseDown ? 0.7 : 1) *
    (defender.statuses.some((status) => status.kind === 'DEF Up') ? 1.25 : 1)
  const passiveMitigation = defender.ability.startsWith('Stoneheart') ? 0.85 : 1
  return Math.max(1, Math.round(((attack * (1 + attackBonus) * (weakened ? 0.5 : 1) *
    (boosted ? 1.25 : 1) * skill.power / 100 * advantage) - defense * 0.35))
    * passiveMitigation)
}

export function chargeGauge(unit: Unit, skillIndex: number): Unit {
  const gauge = [...unit.gauge] as Unit['gauge']
  if (skillIndex === 0) {
    for (let i = 0; i < gauge.length; i += 1) gauge[i] += 1
  } else gauge[skillIndex - 1] = 0
  return { ...unit, gauge }
}

export function getTargetId(targets: Unit[]) {
  const taunter = targets.find((unit) => unit.role === 'Tank' && unit.hp > 0 &&
    unit.statuses.some((status) => status.kind === 'Taunt'))
  return taunter?.id ?? targets.find((unit) => unit.hp > 0)?.id
}

export function tickStatuses(unit: Unit): { unit: Unit; damage: number } {
  let damage = 0
  const statuses = unit.statuses.flatMap((status) => {
    if (status.kind === 'Burn' || status.kind === 'Curse') {
      damage += Math.max(1, Math.round(unit.maxHp * (status.kind === 'Burn' ? 0.06 : 0.08)))
    }
    return status.turns > 1 ? [{ ...status, turns: status.turns - 1 }] : []
  })
  return { unit: { ...unit, hp: Math.max(0, unit.hp - damage), statuses }, damage }
}

export function addStatus(unit: Unit, kind: StatusKind, turns = 2): Unit {
  return { ...unit, statuses: [...unit.statuses.filter((status) => status.kind !== kind), { kind, turns }] }
}

export function formationBonus(unit: Unit) {
  if (unit.row === 'Front' && unit.role === 'Tank') return { def: 0.25, phys: 0, mag: 0, heal: 0 }
  if (unit.row === 'Front' && unit.role === 'Assassin') return { def: 0, phys: 0.2, mag: 0, heal: 0 }
  if (unit.row === 'Back' && unit.role === 'Attacker') return { def: 0, phys: 0.2, mag: 0, heal: 0 }
  if (unit.row === 'Back' && unit.role === 'Mage') return { def: 0, phys: 0, mag: 0.2, heal: 0 }
  if (unit.row === 'Back' && unit.role === 'Healer') return { def: 0, phys: 0, mag: 0, heal: 0.25 }
  return { def: 0, phys: 0, mag: 0, heal: 0 }
}

export function expireStageBuffs(unit: Unit): Unit {
  return { ...unit, statuses: unit.statuses.filter((status) => status.kind !== 'ATK Up' && status.kind !== 'DEF Up') }
}
