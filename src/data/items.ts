import type { Unit } from '../engine/combat'

export type ItemId = 'healing-potion' | 'cleanse-herb' | 'valor-tonic' | 'ironbark-draught' | 'revive-feather'
export type ShopItem = { id: ItemId; name: string; cost: number; description: string }

export const shopItems: ShopItem[] = [
  { id: 'healing-potion', name: 'Healing Potion', cost: 70, description: 'Restore 30% of max HP.' },
  { id: 'cleanse-herb', name: 'Cleanse Herb', cost: 60, description: 'Remove Burn, Curse, Freeze, Taunt, and DEF Down.' },
  { id: 'valor-tonic', name: 'Valor Tonic', cost: 90, description: '+25% ATK for this stage.' },
  { id: 'ironbark-draught', name: 'Ironbark Draught', cost: 90, description: '+25% DEF for this stage.' },
  { id: 'revive-feather', name: 'Revive Feather', cost: 130, description: 'Revive with 30% HP.' },
]

export function applyItem(unit: Unit, item: ItemId): Unit {
  if (item === 'healing-potion') {
    const healing = unit.statuses.some((status) => status.kind === 'Curse') ? 0.15 : 0.3
    return { ...unit, hp: Math.min(unit.maxHp, unit.hp + Math.round(unit.maxHp * healing)) }
  }
  if (item === 'revive-feather') return { ...unit, hp: Math.max(unit.hp, Math.round(unit.maxHp * 0.3)) }
  if (item === 'cleanse-herb') return { ...unit, statuses: unit.statuses.filter((status) => !['Burn', 'Curse', 'Freeze', 'Taunt', 'DEF Down'].includes(status.kind)) }
  const kind = item === 'valor-tonic' ? 'ATK Up' : 'DEF Up'
  return { ...unit, statuses: [...unit.statuses.filter((status) => status.kind !== kind), { kind, turns: 99 }] }
}
