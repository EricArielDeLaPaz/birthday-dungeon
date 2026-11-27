import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Backpack, ChevronRight, Coins, Heart, Plus,
  Shield, ShoppingBag, Sparkles, Swords, UsersRound, X,
} from 'lucide-react'
import './App.css'
import { assetMap, DUNGEON_BACKGROUNDS, resolveAssetPath } from './data/assetMap'
import { BIRTHDAY_CONFIG } from './data/birthdayConfig'
import { createEnemy } from './data/enemies'
import { ENEMY_SLOTS, PLAYER_SLOTS } from './data/formationSlots'
import { heroes, recruits } from './data/heroes'
import { shopItems, applyItem, type ItemId } from './data/items'
import { stages, type Stage } from './data/stages'
import {
  addStatus, calculateDamage, chargeGauge, expireStageBuffs, formationBonus,
  getTargetId, isStatusImmune, opposingAttribute, sortBySpeed, tickStatuses, type FloatingText, type Skill, type Unit,
} from './engine/combat'

type Modal = 'shop' | 'team' | 'items' | 'details' | 'hostage' | 'hostage-details' | 'camp' | 'chart' | null
type TeamTab = 'squad' | 'enemies'
type VfxEvent = {
  id: number
  attribute: Unit['attributes'][number]
  intensity: 'basic' | 'stage1' | 'stage2' | 'ultimate' | 'heal'
  targetIds: string[]
  actorId: string
  targetSide: 'heroes' | 'enemies'
  targetMode: 'single' | 'aoe'
  destination: { x: number; y: number }
}
type SavedRun = {
  schemaVersion: number
  stageNumber: number
  gold: number
  roster: Unit[]
  teamIds: string[]
  items: Record<ItemId, number>
  turns: number
  enemies?: Unit[]
  hostagesLeft?: number
  hostageOfferIds?: string[]
  enemyTurnIndex?: number
  sold?: ItemId[]
  enemiesDefeated?: number
}
const SAVE_SCHEMA_VERSION = 3
const initialItems: Record<ItemId, number> = {
  'healing-potion': 1, 'cleanse-herb': 0, 'valor-tonic': 0, 'ironbark-draught': 0, 'revive-feather': 0,
}

function randomEnemyGroup(stage: Stage) {
  const statScale = stage.number === 1 ? 0.9 : 1.5
  return stage.enemies.map((id, index) => {
    const unit = createEnemy(id, index)
    const maxHp = Math.round(unit.maxHp * statScale)
    return {
      ...unit,
      hp: maxHp,
      maxHp,
      def: Math.round(unit.def * 1.15),
    }
  })
}

function makeDefaultParty(starterId: string): { roster: Unit[]; teamIds: string[] } {
  const starter = heroes.find((unit) => unit.id === starterId)
  if (!starter) throw new Error(`Unknown starter hero: ${starterId}`)
  const row: 'Front' | 'Back' = starter.role === 'Tank' || starter.role === 'Assassin' ? 'Front' : 'Back'
  const initialHero = { ...starter, statuses: [], gauge: [0, 0, 0] as Unit['gauge'], passiveUsed: false, row }
  return { roster: [initialHero], teamIds: [starter.id] }
}

function prepareBattleRoster(roster: Unit[], teamIds: string[]) {
  return roster.map((unit) => {
    const clean = { ...unit, passiveUsed: false, statuses: unit.statuses.filter((status) => status.kind !== 'Stealth') }
    return unit.id === 'kaelen' && teamIds.includes(unit.id) ? addStatus(clean, 'Stealth') : clean
  })
}

function firstLivingHero(roster: Unit[], teamIds: string[]) {
  return sortBySpeed(teamIds.map((id) => roster.find((unit) => unit.id === id))
    .filter((unit): unit is Unit => unit !== undefined && unit.hp > 0))[0]
}

function replaceFallenWithBench(roster: Unit[], teamIds: string[]) {
  const updatedRoster = [...roster]
  const updatedTeamIds = [...teamIds]
  const substitutions: Array<{ fallen: string; replacement: string }> = []
  for (const [slotIndex, id] of updatedTeamIds.entries()) {
    const fallen = updatedRoster.find((unit) => unit.id === id)
    if (!fallen || fallen.hp > 0) continue
    const replacement = updatedRoster.find((unit) => unit.hp > 0 && !updatedTeamIds.includes(unit.id))
    if (!replacement) continue
    updatedTeamIds[slotIndex] = replacement.id
    const rosterIndex = updatedRoster.findIndex((unit) => unit.id === replacement.id)
    updatedRoster[rosterIndex] = { ...replacement, row: fallen.row ?? 'Back' }
    substitutions.push({ fallen: fallen.name, replacement: replacement.name })
  }
  return { roster: updatedRoster, teamIds: updatedTeamIds, substitutions }
}

function unitBattlePosition(unit: Unit, units: Unit[], side: 'heroes' | 'enemies') {
  if (side === 'heroes') {
    const row = unit.row ?? 'Back'
    const rowSlots = PLAYER_SLOTS.filter((slot) => slot.row === row.toLowerCase())
    const rowIndex = units.filter((candidate) => (candidate.row ?? 'Back') === row)
      .findIndex((candidate) => candidate.id === unit.id)
    const slot = rowSlots[Math.max(rowIndex, 0) % rowSlots.length]
    return { x: slot.x, y: slot.y }
  }
  const bossWithMinions = units.some((candidate) => candidate.isBoss) && units.some((candidate) => !candidate.isBoss)
  if (unit.isBoss && !bossWithMinions) return { x: 73, y: 52 }
  if (unit.isBoss) return { x: 84, y: 52 }
  const index = units.filter((candidate) => !candidate.isBoss).findIndex((candidate) => candidate.id === unit.id)
  const slots = ENEMY_SLOTS.filter((slot) => !bossWithMinions || slot.slot !== 3)
  const slot = slots[Math.max(index, 0) % slots.length]
  return { x: slot.x, y: slot.y }
}

function UnitSprite({ unit, compact = false, combat = false, facing }: { unit: Unit; compact?: boolean; combat?: boolean; facing?: 'left' | 'right' }) {
  const assetId = unit.id.replace(/-\d+$/, '')
  const art = assetMap[assetId] ?? { accent: '#C9A45C', glyph: '✦', scale: 1, footOffsetPx: 4 }
  const illustrationSrc = combat && art.combatIllustrationUrl ? resolveAssetPath(art.combatIllustrationUrl) : undefined
  const pixelSpriteSrc = art.pixelSpriteUrl ? resolveAssetPath(art.pixelSpriteUrl) : undefined
  const sourceKey = illustrationSrc ?? pixelSpriteSrc ?? ''
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  useEffect(() => setFailedSrc(null), [sourceKey])
  const resolvedSrc = illustrationSrc && failedSrc !== illustrationSrc
    ? illustrationSrc
    : pixelSpriteSrc && failedSrc !== pixelSpriteSrc
      ? pixelSpriteSrc
      : undefined
  const flipSprite = facing === 'left' ? !art.flipX : Boolean(art.flipX)
  const boss = assetId.startsWith('boss-')
  const dragon = assetId.startsWith('minidragon-')
  const accent = art.accent
  const ink = '#171a20'
  return (
    <span className={`avatar ${compact ? 'avatar-small' : ''} ${combat ? 'combat-avatar' : ''} ${boss ? 'sprite-boss' : ''} ${dragon ? 'sprite-dragon' : ''}`} style={{ '--avatar-accent': accent, '--sprite-scale': art.scale } as React.CSSProperties} aria-hidden="true">
      {resolvedSrc && <img key={resolvedSrc} className={flipSprite ? 'sprite-flipped' : ''} src={resolvedSrc} alt="" onError={() => setFailedSrc(resolvedSrc)} />}
      {!resolvedSrc && <svg className={`pixel-sprite procedural-sprite ${flipSprite ? 'sprite-flipped' : ''}`} viewBox="0 0 120 150" shapeRendering="crispEdges" aria-hidden="true">
        <ellipse cx="60" cy="142" rx="34" ry="5" fill="#090b0f" opacity=".7" />
        {assetId === 'boss-bone-dragon' ? <>
          <path d="M56 59 11 15 19 50 5 39 22 75 44 87M64 59l45-44-8 35 14-11-17 36-22 8" fill="#d4c9ac" stroke={ink} strokeWidth="4" />
          <path d="M46 81q-11 13-6 34l11 14 8-7 8 7 15-17-7-28-12-9z" fill="#b5aa91" stroke={ink} strokeWidth="4" />
          <path d="M45 87q15 9 32 0m-30 9q16 10 30 1m-28 9q14 10 27 1m-24 9q12 7 22-1" fill="none" stroke="#484b4c" strokeWidth="4" />
          <path d="m43 74-15-13 7 21-10 15 20-5m35-18 17-13-8 21 11 15-21-5" fill="#dad0b6" stroke={ink} strokeWidth="4" />
          <path d="m76 50 18-11-9 19 14 4-24 5-15-9z" fill="#ddd3bb" stroke={ink} strokeWidth="4" />
          <path d="m89 42 13-15-3 19m-23 10 13-2" fill="none" stroke={ink} strokeWidth="4" />
          <path d="M91 59h5v4h-5z" fill="#b76258" />
        </> : assetId === 'boss-choir-monolith' ? <>
          <path d="M31 134V37l11-12v-9h36v9l11 12v97z" fill="#626b70" stroke={ink} strokeWidth="5" />
          <path d="M24 49h72v9H24zm4 28h64v5H28zm0 28h64v5H28z" fill="#98a09c" />
          <path d="M51 31h18v18H51zm-2 33 11-8 11 8v22L60 94 49 86zm-7 47h36v8H42z" fill="#292e34" stroke="#c9a45c" strokeWidth="3" />
          <path d="M8 135h104v8H8zM15 122h90v8H15z" fill="#3c444b" stroke={ink} strokeWidth="4" />
          <path d="M58 67h4v14h-4zm-2 38h8v5h-8z" fill="#ddd2b5" />
        </> : assetId === 'boss-eclipse-seraph' ? <>
          <circle cx="60" cy="35" r="22" fill="none" stroke="#c9a45c" strokeWidth="5" />
          <path d="M47 58 13 22l13 42L7 54l30 40m36-36 34-36-13 42 19-12-30 40" fill="#7a7778" stroke={ink} strokeWidth="4" />
          <path d="m43 70-35-2 28 17-22 12 37-3m31-24 35-2-28 17 22 12-37-3" fill="#908b88" stroke={ink} strokeWidth="4" />
          <path d="m50 57-10 16 12 9-8 44 16 10 17-10-10-44 13-9-11-16z" fill="#b7ad9c" stroke={ink} strokeWidth="4" />
          <path d="M49 29h22l8 13-7 17H48l-8-17z" fill="#d4c9ac" stroke={ink} strokeWidth="4" />
          <path d="M47 42h8v4h-8zm18 0h8v4h-8zm-6 14h6" fill="none" stroke="#8c4a48" strokeWidth="4" />
          <path d="M42 77 19 60l16 30-7 25 21 10m28-48 24-17-17 30 8 24-23 11" fill="#d4c9ac" stroke={ink} strokeWidth="4" />
        </> : dragon ? <>
          <path d="m49 71-32-37 7 38-15-9 23 37 22 1m17-30 28-37-4 40 14-10-22 38-23 2" fill={accent} stroke={ink} strokeWidth="5" />
          <path d="m34 99 10-25 24-9 20 13 5 29-19 20-29-5z" fill="#625b52" stroke={ink} strokeWidth="5" />
          <path d="m76 78 22-15 13 7-5 14-21 7-14-5z" fill={accent} stroke={ink} strokeWidth="4" />
          <path d="m96 67 5-14 6 13m-19 8 8-14" fill="none" stroke={ink} strokeWidth="4" />
          <path d="M102 78h5v4h-5zM44 98l-8 27 14 8 9-24m15-4 13 28 11-8-8-28" fill="#8b806d" stroke={ink} strokeWidth="4" />
          <path d="m44 113 20 6 20-9m-29-21 15 3" fill="none" stroke="#d4c9ac" strokeWidth="3" />
        </> : <>
          <path d="M40 43 29 24l17 9 14-9 14 10 16-8-8 20 9 20-12 17 5 31-18 14-6-5-7 5-18-14 5-31-13-17z" fill={accent} stroke={ink} strokeWidth="5" />
          <path d="M43 40h34l8 17-9 15H43l-9-15z" fill="#c6b8a2" stroke={ink} strokeWidth="4" />
          <path d="M44 55h8v5h-8zm24 0h8v5h-8zm-12 13h9" fill="none" stroke="#282b31" strokeWidth="4" />
          <path d="M40 83 21 108l6 8 23-19m28-14 21 22-7 8-24-17" fill="none" stroke={ink} strokeWidth="7" />
          {unit.role === 'Tank' && <path d="m91 74 20 8v34l-20 8z" fill="#7b827f" stroke={ink} strokeWidth="4" />}
          {unit.role === 'Assassin' && <path d="m27 96-15 26 6 3 19-22m58-10 16 26-6 4-22-20" fill="none" stroke="#c9c1ae" strokeWidth="4" />}
          {unit.role === 'Mage' && <path d="M101 41v72m-9-62h18m-15-7 6-10 6 10" fill="none" stroke="#d2c8b1" strokeWidth="4" />}
          {unit.role === 'Healer' && <path d="M56 88h8v23h-8zm-8 7h24v8H48z" fill="#ece3ce" stroke={ink} strokeWidth="2" />}
          {unit.role === 'Attacker' && <path d="M94 41q24 25 0 50m0-25 16-14m-16 14 16 14M91 43l18 47" fill="none" stroke="#d2c8b1" strokeWidth="4" />}
        </>}
      </svg>}
    </span>
  )
}

const Avatar = UnitSprite

function DungeonBackdrop({ areaId }: { areaId: string }) {
  const [imageFailed, setImageFailed] = useState(false)
  const background = DUNGEON_BACKGROUNDS[areaId]
  return (
    <div className={`dungeon-backdrop backdrop-${areaId}`} aria-hidden="true">
      {background && !imageFailed && <img src={background} alt="" onError={() => setImageFailed(true)} />}
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
        <path d="M0 700V420Q80 390 120 320L150 160Q225 80 300 160L330 420M0 700h1200V410q-100-40-130-120l-20-140q-75-75-150 0l-30 260M390 700V300q210-290 420 0v400" fill="none" stroke="currentColor" strokeWidth="22" opacity=".35" />
        <path d="M410 700V310q190-230 380 0v390M465 700V340q135-160 270 0v360" fill="none" stroke="currentColor" strokeWidth="8" opacity=".25" />
        <path d="M0 575Q220 535 410 585T800 575t400 0v125H0z" fill="currentColor" opacity=".1" />
        <path d="M0 610h1200M160 570l28-90 28 90m710 0 30-100 30 100" fill="none" stroke="currentColor" strokeWidth="5" opacity=".2" />
        {areaId === 'ashen-ossuary' && <g fill="currentColor" opacity=".25"><path d="m155 440 35-130 35 130zm835 0 35-130 35 130z" /><circle cx="190" cy="360" r="12" /><circle cx="1025" cy="360" r="12" /></g>}
        {areaId === 'sunken-catacombs' && <g fill="none" stroke="currentColor" strokeWidth="5" opacity=".28"><path d="M0 540q150-40 300 0t300 0 300 0 300 0m-900 45q150-35 300 0t300 0 300 0" /><path d="M310 580v-75q40-50 80 0v75m420 0v-75q40-50 80 0v75" /></g>}
        {areaId === 'echoing-vault' && <g fill="currentColor" opacity=".28"><path d="M410 570V260h54v310zm130 0V200h54v370zm130 0V200h54v370zm130 0V260h54v310z" /><path d="m450 185 40-40 40 40m80-20 40-40 40 40m80 20 40-40 40 40" fill="none" stroke="currentColor" strokeWidth="8" /></g>}
        {areaId === 'starless-nave' && <g fill="none" stroke="currentColor" strokeWidth="8" opacity=".23"><path d="M410 600V220l40-120 40 120v380m260 0V220l40-120 40 120v380M500 300h200M520 360h160" /><path d="m600 155 14 30 33 5-24 23 6 34-29-16-29 16 6-34-24-23 33-5z" fill="currentColor" /></g>}
        {areaId === 'eclipse-throne' && <g fill="none" stroke="currentColor" strokeWidth="8" opacity=".3"><circle cx="600" cy="330" r="175" /><circle cx="600" cy="330" r="128" /><path d="M440 575h320l-40-90H480zm55-110h210l-30-55H525zm55-75h100v-80H550z" fill="currentColor" /></g>}
      </svg>
      <span className="backdrop-vignette" />
    </div>
  )
}

function AttributeBadge({ attributes }: { attributes: Unit['attributes'] }) {
  return <span className={`attribute-badge attr-${attributes[0].toLowerCase()}`}>{attributes.join(' · ')}</span>
}

function HealthBar({ unit }: { unit: Unit }) {
  const percent = Math.max(0, Math.min(100, unit.hp / unit.maxHp * 100))
  const tone = percent > 55 ? 'healthy' : percent > 25 ? 'wounded' : 'critical'
  return <div className="health-track" aria-label={`${unit.hp} of ${unit.maxHp} health`}><span className={tone} style={{ width: `${percent}%` }} /></div>
}

function BattleVfxOverlay({ attribute, intensity, targetMode }: { attribute: Unit['attributes'][number]; intensity: VfxEvent['intensity']; targetMode: VfxEvent['targetMode'] }) {
  return <span className={`battle-vfx vfx-${attribute.toLowerCase()} vfx-${intensity}`} aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      {attribute === 'Fire' && <g><path d="M50 8 58 38 78 21 70 48 94 45 72 61 91 78 63 69 54 96 45 69 18 82 35 60 8 48 39 45 29 20 48 39Z" /><circle cx="50" cy="50" r="18" /></g>}
      {attribute === 'Ice' && <g><path d="M50 5 60 36 87 18 69 43 98 50 68 58 87 82 60 65 50 95 40 65 13 82 32 58 3 50 32 43 13 18 40 36Z" /><path d="m25 25 50 50m0-50L25 75" /></g>}
      {attribute === 'Shadow' && <g><path d="M10 28 88 8 37 47 95 42 17 70 68 54 8 92" /><path d="M22 18 77 13M25 83l53-20" /></g>}
      {attribute === 'Light' && <g><path d="m50 3 10 31 32-16-16 32 31 10-31 10 16 32-32-16-10 31-10-31L8 102l16-32-31-10 31-10L8 18l32 16Z" /><circle cx="50" cy="50" r="17" /></g>}
      {attribute === 'Sound' && <g><circle cx="50" cy="50" r="15" /><circle cx="50" cy="50" r="30" /><circle cx="50" cy="50" r="45" /></g>}
      {attribute === 'Earth' && <g><path d="m4 84 19-44 15 24 15-54 18 52 13-27 12 49Z" /><path d="M8 92h84" /></g>}
      {intensity === 'ultimate' && (targetMode === 'aoe'
        ? <g className="ultimate-rings"><circle cx="50" cy="50" r="22" /><circle cx="50" cy="50" r="38" /><path d="M8 50h84M50 8v84M20 20l60 60m0-60L20 80" /></g>
        : <g className="ultimate-finisher"><path d="M15 15 85 85M85 15 15 85M50 0v100M0 50h100" /><path d="M50 12 62 42 92 50 62 58 50 88 38 58 8 50 38 42Z" /></g>)}
    </svg>
  </span>
}

function StatusMarks({ unit }: { unit: Unit }) {
  if (!unit.statuses.length) return null
  return <div className="status-marks">{unit.statuses.map((status) => <span key={status.kind} title={`${status.kind}, ${status.turns} turns`}>{status.kind}</span>)}</div>
}

function FormationPad({
  side,
  units,
  activeHeroId,
  selectedEnemyId,
  targetType,
  actingUnitId,
  floating,
  animatingUnitId,
  vfxEvent,
  onSelect,
}: {
  side: 'heroes' | 'enemies'
  units: Unit[]
  activeHeroId: string | null
  selectedEnemyId: string | null
  targetType: Skill['target'] | null
  actingUnitId: string | null
  floating: FloatingText[]
  animatingUnitId: string | null
  vfxEvent: VfxEvent | null
  onSelect: (unit: Unit) => void
}) {
  const isEnemyPad = side === 'enemies'
  const formationSlots = isEnemyPad ? ENEMY_SLOTS : PLAYER_SLOTS
  const colossalBoss = isEnemyPad && units.find((unit) => unit.isColossal)
  const visibleUnits = units.filter((unit) => unit.hp > 0 || vfxEvent?.targetIds.includes(unit.id))
  const bossWithMinions = isEnemyPad && units.some((unit) => unit.isBoss) && units.some((unit) => !unit.isBoss)
  const bossSolo = isEnemyPad && !bossWithMinions && visibleUnits.length === 1 && visibleUnits[0].isBoss
  const enemyMinionSlots = ENEMY_SLOTS.filter((slot) => !bossWithMinions || slot.slot !== 3)
  const placed = visibleUnits.map((unit) => {
    const unitIndex = units.findIndex((candidate) => candidate.id === unit.id)
    let placement: { row: 'Front' | 'Back'; x: number; y: number; zIndex: number }
    if (isEnemyPad && unit.isColossal) {
      placement = { row: 'Back', x: 73, y: 52, zIndex: 30 }
    } else if (isEnemyPad) {
      if (bossSolo) {
        placement = { row: 'Back', x: 73, y: 52, zIndex: 30 }
      } else if (unit.isBoss && bossWithMinions) {
        const slot = ENEMY_SLOTS[3]
        placement = { row: 'Back', x: slot.x, y: slot.y, zIndex: slot.zIndex }
      } else {
        const minionIndex = units.slice(0, units.findIndex((candidate) => candidate.id === unit.id)).filter((candidate) => !candidate.isBoss).length
        const slot = bossWithMinions
          ? enemyMinionSlots[minionIndex]
          : ENEMY_SLOTS[unitIndex]
        placement = {
          row: slot.row === 'front' ? 'Front' : 'Back',
          x: slot.x,
          y: slot.y,
          zIndex: slot.zIndex,
        }
      }
    } else {
      const row = unit.row ?? 'Back'
      const rowSlots = PLAYER_SLOTS.filter((slot) => slot.row === row.toLowerCase())
      const rowIndex = units.filter((candidate) => (candidate.row ?? 'Back') === row)
        .findIndex((candidate) => candidate.id === unit.id)
      const slot = rowSlots[rowIndex % rowSlots.length]
      placement = { row, x: slot.x, y: slot.y, zIndex: slot.zIndex }
    }
    return { unit, ...placement }
  })

  return (
    <div className={`formation-pad ${isEnemyPad ? 'enemy-formation' : 'player-formation'}`}>
      {formationSlots.filter(() => !colossalBoss && !bossSolo).map((slot) => {
        const row = slot.row === 'front' ? 'Front' : 'Back'
        return <span key={slot.slot} className={`pad-circle circle-${row.toLowerCase()}`} style={{ left: `${slot.x}%`, top: `${slot.y}%`, zIndex: slot.zIndex }} />
      })}
      {(colossalBoss || bossSolo) && <span className={`colossal-boss-dais ${bossSolo ? 'solo-boss-dais' : ''}`} aria-hidden="true" />}
      {placed.map(({ unit, row, x, y, zIndex }) => {
        const isHero = !isEnemyPad
        const isValidTarget = targetType && (
          (isHero && (targetType === 'ally' || targetType === 'all-allies')) ||
          (isEnemyPad && (targetType === 'enemy' || targetType === 'all-enemies'))
        )
        const asset = assetMap[unit.id.replace(/-\d+$/, '')]
        const bonus = formationBonus({ ...unit, row })
        const roleMatch = isHero && (bonus.phys > 0 || bonus.mag > 0 || bonus.def > 0 || bonus.heal > 0)
        return (
          <button
            type="button"
            key={unit.id}
            className={`pad-unit ${isEnemyPad ? 'foe-unit' : 'ally-unit'} ${unit.isBoss ? 'boss-unit' : ''} ${unit.isColossal ? 'colossal-unit' : ''} ${unit.hp <= 0 ? 'fallen' : ''} ${unit.statuses.some((status) => status.kind === 'Freeze') ? 'frozen-unit' : ''} ${roleMatch ? 'row-bonus' : ''} ${activeHeroId === unit.id || selectedEnemyId === unit.id ? 'selected' : ''} ${isValidTarget ? 'target-valid' : ''} ${actingUnitId === unit.id ? 'turn-acting' : ''} ${animatingUnitId === unit.id ? 'animating' : ''} ${vfxEvent?.targetIds.includes(unit.id) ? `vfx-target vfx-${vfxEvent.intensity} vfx-mode-${vfxEvent.targetMode}` : ''} ${vfxEvent?.actorId === unit.id ? `attacking attack-${vfxEvent.intensity} attack-mode-${vfxEvent.targetMode}` : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, zIndex, '--dash-x': `${(vfxEvent?.destination.x ?? x) - x}cqi`, '--dash-y': `${(vfxEvent?.destination.y ?? y) - y}cqb`, '--unit-accent': asset?.accent ?? '#C9A45C', '--foot-offset': `${asset?.footOffsetPx ?? 4}px`, '--sprite-scale': asset?.scale ?? 1 } as React.CSSProperties}
            onClick={(event) => { event.stopPropagation(); onSelect(unit) }}
            title={`${unit.name} · ${unit.role} · ${unit.hp}/${unit.maxHp} HP`}
            aria-label={`Inspect ${unit.name}, ${unit.hp} of ${unit.maxHp} health`}
          >
            <span className={`pad-circle-marker circle-${row.toLowerCase()} ${roleMatch ? 'buffed' : ''}`} />
            <span className="sprite-anchor"><UnitSprite unit={unit} compact facing={isEnemyPad ? 'left' : 'right'} /></span>
            <span className="pad-unit-nameplate"><b title={unit.name}>{unit.name}</b><span>{unit.hp}/{unit.maxHp}</span><HealthBar unit={unit} /></span>
            {vfxEvent?.targetIds.includes(unit.id) && <BattleVfxOverlay key={`${vfxEvent.id}-${unit.id}`} attribute={vfxEvent.attribute} intensity={vfxEvent.intensity} targetMode={vfxEvent.targetMode} />}
            {floating.filter((text) => text.targetId === unit.id).map((text) => <span key={text.id} className={`float-number ${text.kind}`}>{text.text}</span>)}
          </button>
        )
      })}
    </div>
  )
}

function App() {
  const [saved, setSaved] = useState<SavedRun | null>(() => {
    try {
      const raw = localStorage.getItem('mythic-dungeon-save')
      if (!raw) return null
      const loaded = JSON.parse(raw) as SavedRun
      if (loaded.schemaVersion !== SAVE_SCHEMA_VERSION) {
        localStorage.removeItem('mythic-dungeon-save')
        return null
      }
      return loaded
    } catch (error) {
      console.error('Unable to load the saved dungeon run.', error)
      return null
    }
  })
  const [started, setStarted] = useState(false)
  const [selectedStarterId, setSelectedStarterId] = useState(heroes[0].id)
  const [starterDetailsOpen, setStarterDetailsOpen] = useState(true)
  const [victory, setVictory] = useState(false)
  const [defeat, setDefeat] = useState(false)
  const [stageNumber, setStageNumber] = useState(saved?.stageNumber ?? 1)
  const [gold, setGold] = useState(saved?.gold ?? 60)
  const [roster, setRoster] = useState<Unit[]>(saved?.roster ?? [])
  const [teamIds, setTeamIds] = useState<string[]>(saved?.teamIds ?? [])
  const [enemies, setEnemies] = useState<Unit[]>([])
  const [items, setItems] = useState<Record<ItemId, number>>(saved?.items ?? initialItems)
  const [turns, setTurns] = useState(saved?.turns ?? 0)
  const [enemiesDefeated, setEnemiesDefeated] = useState(saved?.enemiesDefeated ?? 0)
  const [enemyTurnIndex, setEnemyTurnIndex] = useState(0)
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null)
  const [attackMode, setAttackMode] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [hostagesLeft, setHostagesLeft] = useState(0)
  const [hostageOfferIds, setHostageOfferIds] = useState<string[]>(saved?.hostageOfferIds ?? [])
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null)
  const [selectedDetailsId, setSelectedDetailsId] = useState<string | null>(null)
  const [selectedUnitForItem, setSelectedUnitForItem] = useState<string | null>(null)
  const [pendingItem, setPendingItem] = useState<ItemId | null>(null)
  const [selectedTeamSwapId, setSelectedTeamSwapId] = useState<string | null>(null)
  const [teamTab, setTeamTab] = useState<TeamTab>('squad')
  const [sold, setSold] = useState<ItemId[]>(saved?.sold ?? [])
  const [floating, setFloating] = useState<FloatingText[]>([])
  const [cutIn, setCutIn] = useState<Unit | null>(null)
  const [impact, setImpact] = useState<string | null>(null)
  const [vfxEvent, setVfxEvent] = useState<VfxEvent | null>(null)
  const vfxSequence = useRef(0)
  const floatingSequence = useRef(0)
  const [animatingUnitId, setAnimatingUnitId] = useState<string | null>(null)
  const [actingUnitId, setActingUnitId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [log, setLog] = useState('Choose Attack to take your turn.')

  const party = teamIds.map((id) => roster.find((unit) => unit.id === id)).filter((unit): unit is Unit => Boolean(unit))
  const livingParty = party.filter((unit) => unit.hp > 0)
  const turnOrder = sortBySpeed([...livingParty, ...enemies.filter((unit) => unit.hp > 0)])
  const activeHero = livingParty.find((unit) => unit.id === activeHeroId) ?? livingParty[0]
  const activeStage = stages[Math.min(stageNumber - 1, stages.length - 1)]
  const stage = activeStage
  const detailsUnit = roster.find((unit) => unit.id === selectedDetailsId) ??
    enemies.find((unit) => unit.id === selectedDetailsId)
  const detailsAreEnemy = detailsUnit ? enemies.some((unit) => unit.id === detailsUnit.id) : false
  const ultimateChargeMax = detailsAreEnemy ? 4 : 5
  const detailsHaveDualAttribute = detailsUnit?.attributes.some((attribute) =>
    detailsUnit.attributes.includes(opposingAttribute[attribute]),
  ) ?? false
  const currentHostageOffers = (activeStage.hostageRecruitIds ?? [])
    .map((id) => recruits.find((unit) => unit.id === id))
    .filter((unit): unit is Unit => unit !== undefined)

  useEffect(() => {
    if (started && roster.length) {
      const next = { schemaVersion: SAVE_SCHEMA_VERSION, stageNumber, gold, roster, teamIds, items, turns, enemies, hostagesLeft, hostageOfferIds, enemyTurnIndex, sold, enemiesDefeated }
      localStorage.setItem('mythic-dungeon-save', JSON.stringify(next))
    }
  }, [started, stageNumber, gold, roster, teamIds, items, turns, enemies, hostagesLeft, hostageOfferIds, enemyTurnIndex, sold, enemiesDefeated])

  useEffect(() => {
    if (!floating.length) return
    const timer = window.setTimeout(() => setFloating([]), 1200)
    return () => window.clearTimeout(timer)
  }, [floating])

  useEffect(() => {
    if (!attackMode && !modal) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (modal) {
          if (modal !== 'hostage' && modal !== 'camp') setModal(null)
          return
        }
        setAttackMode(false)
        setSelectedSkill(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [attackMode, modal])

  useEffect(() => {
    if (!cutIn) return
    const timer = window.setTimeout(() => setCutIn(null), 700)
    return () => window.clearTimeout(timer)
  }, [cutIn])

  const addFloats = (texts: FloatingText[]) => setFloating((current) => [...current, ...texts])
  const makeFloat = (targetId: string, text: string, kind: FloatingText['kind']): FloatingText =>
    ({ id: ++floatingSequence.current, targetId, text, kind })
  const setMessage = (message: string) => setLog(message)
  const updateRoster = (id: string, updater: (unit: Unit) => Unit) =>
    setRoster((current) => current.map((unit) => unit.id === id ? updater(unit) : unit))
  const beginRun = (starterId: string) => {
    const initial = makeDefaultParty(starterId)
    const preparedRoster = prepareBattleRoster(initial.roster, initial.teamIds)
    setRoster(preparedRoster)
    setTeamIds(initial.teamIds)
    setStageNumber(1)
    setGold(60)
    setTurns(0)
    setEnemiesDefeated(0)
    setEnemyTurnIndex(0)
    setItems(initialItems)
    setEnemies(randomEnemyGroup(stages[0]))
    setSold([])
    setHostageOfferIds([])
    setStarted(true)
    setVictory(false)
    setDefeat(false)
    setActiveHeroId(starterId)
    setLog(`Your party enters the ${stages[0].areaName}.`)
  }

  const applyStatus = (target: Unit, effect?: Skill['effect'], duration = 2) =>
    effect ? (Array.isArray(effect) ? effect : [effect]).reduce((unit, kind) => addStatus(unit, kind, kind === 'Freeze' ? 1 : duration), target) : target

  const executePlayerSkill = (skillIndex: number, targetId?: string) => {
    if (!activeHero || activeHero.hp <= 0) return
    const actor = roster.find((unit) => unit.id === activeHero.id) ?? activeHero
    if (actor.statuses.some((status) => status.kind === 'Freeze')) {
      const thawed = tickStatuses(actor)
      const skippedRoster = roster.map((unit) => unit.id === actor.id ? thawed.unit : unit)
      const substitution = replaceFallenWithBench(skippedRoster, teamIds)
      setRoster(substitution.roster)
      setTeamIds(substitution.teamIds)
      if (thawed.damage) addFloats([makeFloat(actor.id, `-${thawed.damage}`, 'damage')])
      setMessage(substitution.substitutions.length
        ? `${actor.name} is frozen solid! ${substitution.substitutions.map(({ fallen, replacement }) => `${fallen} fell; ${replacement} steps into the fight.`).join(' ')}`
        : `${actor.name} is frozen solid! Their turn is skipped.`)
      setSelectedSkill(null)
      setAttackMode(false)
      setTurns((value) => value + 1)
      setIsResolving(true)
      if (substitution.roster.every((unit) => unit.hp <= 0)) {
        setStarted(false)
        setDefeat(true)
        setSaved(null)
        localStorage.removeItem('mythic-dungeon-save')
        return
      }
      const action = enemyTurn(enemies, substitution.roster, substitution.teamIds)
      window.setTimeout(() => {
        setIsResolving(false)
        const queue = sortBySpeed(action.teamIds.map((id) => action.roster.find((unit) => unit.id === id))
          .filter((unit): unit is Unit => unit !== undefined && unit.hp > 0))
        setActiveHeroId(queue[0]?.id ?? null)
      }, action.duration)
      return
    }
    const skill = actor.skills[skillIndex]
    if (skillIndex > 0 && actor.gauge[skillIndex - 1] < skill.cost) {
      setMessage(`${skill.name} needs ${skill.cost} charges.`)
      return
    }
    const allAlly = skill.target === 'all-allies'
    const allEnemy = skill.target === 'all-enemies'
    const targets = allAlly ? party.filter((unit) => unit.hp > 0) :
      allEnemy ? enemies.filter((unit) => unit.hp > 0) :
        (skill.target === 'ally' ? party : enemies).filter((unit) => unit.hp > 0).filter((unit) => !targetId || unit.id === targetId)
    if (!targets.length) return
    const texts: FloatingText[] = []
    let updatedRoster = [...roster]
    let updatedEnemies = [...enemies]
    const bonus = formationBonus(actor)
    const skillDuration = actor.id === 'ember' && (skill.effect === 'Burn' || (Array.isArray(skill.effect) && skill.effect.includes('Burn'))) ? 3 : 2
    const immunityCallouts: string[] = []
    const lyraBonus = actor.id === 'lyra' && skill.attribute === 'Ice' && !actor.passiveUsed && skill.type !== 'heal'
    const applySkillEffects = (target: Unit) => {
      const effects = skill.effect ? (Array.isArray(skill.effect) ? skill.effect : [skill.effect]) : []
      const blocked = effects.filter((kind) => isStatusImmune(target, kind))
      if (blocked.length) {
        texts.push(makeFloat(target.id, 'IMMUNE', 'status'))
        immunityCallouts.push(`${target.name} is immune to ${[...new Set(blocked)].join(', ')}!`)
      }
      let updated = applyStatus(target, skill.effect, skillDuration)
      if (skill.cleanseDebuffs) updated = { ...updated, statuses: updated.statuses.filter((status) =>
        !['Burn', 'Curse', 'Freeze', 'DEF Down', 'Taunt'].includes(status.kind),
      ) }
      if (skill.gaugeDrain && enemies.some((enemy) => enemy.id === target.id)) {
        const drained = Math.min(updated.gauge[0], skill.gaugeDrain)
        updated = { ...updated, gauge: [Math.max(0, updated.gauge[0] - skill.gaugeDrain), updated.gauge[1], updated.gauge[2]] }
        texts.push(makeFloat(target.id, `-${drained} ULT`, 'status'))
      }
      return updated
    }

    targets.forEach((target) => {
      if (skill.type === 'heal') {
        const healingReduction = target.statuses.some((status) => status.kind === 'Curse') ? 0.5 : 1
        const amount = Math.max(0, Math.round(target.maxHp * skill.power / 100 * (1 + bonus.heal) * healingReduction))
        const healed = Math.min(target.maxHp, target.hp + amount)
        const nextTarget = applySkillEffects({ ...target, hp: healed })
        if (party.some((unit) => unit.id === target.id)) updatedRoster = updatedRoster.map((unit) => unit.id === target.id ? nextTarget : unit)
        else updatedEnemies = updatedEnemies.map((unit) => unit.id === target.id ? nextTarget : unit)
        texts.push(makeFloat(target.id, `+${healed - target.hp}`, 'heal'))
      } else {
        const passiveSkill = lyraBonus ? { ...skill, power: Math.round(skill.power * 1.25) } : skill
        const damage = calculateDamage(actor, target, passiveSkill, skill.type === 'physical' ? bonus.phys : bonus.mag)
        const nextTarget = damage === 0 ? target : applySkillEffects({ ...target, hp: Math.max(0, target.hp - damage) })
        if (party.some((unit) => unit.id === target.id)) updatedRoster = updatedRoster.map((unit) => unit.id === target.id ? nextTarget : unit)
        else updatedEnemies = updatedEnemies.map((unit) => unit.id === target.id ? nextTarget : unit)
        texts.push(makeFloat(target.id, damage === 0 ? 'DODGE' : `-${damage}`, damage === 0 ? 'status' : 'damage'))
      }
    })

    const actorBeforeCharge = updatedRoster.find((unit) => unit.id === actor.id) ?? actor
    const charged = chargeGauge(actorBeforeCharge, skillIndex)
    const actorAfterCharge = { ...charged, passiveUsed: actor.passiveUsed || lyraBonus }
    const actorAfterSkill = skill.selfEffect ? addStatus(actorAfterCharge, skill.selfEffect) : actorAfterCharge
    const actorTick = tickStatuses(actorAfterSkill)
    updatedRoster = updatedRoster.map((unit) => unit.id === actor.id ? actorTick.unit : unit)
    if (actorTick.damage) texts.push(makeFloat(actor.id, `-${actorTick.damage}`, 'damage'))
    const substitution = replaceFallenWithBench(updatedRoster, teamIds)
    updatedRoster = substitution.roster
    const updatedTeamIds = substitution.teamIds
    const defeatedCount = enemies.filter((unit) => unit.hp > 0).length - updatedEnemies.filter((unit) => unit.hp > 0).length
    const dramatic = skillIndex === 3 && !actor.isMinion
    const aoe = skill.target === 'all-enemies' || skill.target === 'all-allies'
    const targetSide = skill.target === 'ally' || skill.target === 'all-allies' ? 'heroes' : 'enemies'
    const destination = skill.target === 'all-enemies'
      ? { x: 50, y: 52 }
      : skill.target === 'all-allies'
        ? { x: 28, y: 52 }
        : unitBattlePosition(targets[0], targetSide === 'heroes' ? party : enemies, targetSide)
    const vfx: VfxEvent = {
      id: ++vfxSequence.current,
      actorId: actor.id,
      targetSide,
      attribute: skill.attribute,
      intensity: skill.type === 'heal' ? 'heal' : dramatic ? 'ultimate' : skillIndex === 2 ? 'stage2' : skillIndex === 1 ? 'stage1' : 'basic',
      targetIds: targets.map((target) => target.id),
      targetMode: aoe ? 'aoe' : 'single',
      destination,
    }
    const prelude = dramatic ? 700 : 280
    const hitHold = dramatic ? 580 : 420
    const actionDuration = 380 + hitHold + 320 + 380
    setIsResolving(true)
    setActingUnitId(actor.id)
    if (dramatic) setCutIn(actor)
    const weaknessHit = targets.some((target) =>
      [skill.attribute, ...(skill.additionalAttributes ?? [])].some((attribute) =>
        target.attributes.includes(opposingAttribute[attribute]) && !target.attributes.includes(attribute),
      ),
    )
    setMessage(`${weaknessHit
      ? `WEAKNESS! 2× DAMAGE! ${actor.name} used ${skill.name}.`
      : `${actor.name} used ${skill.name}.`}${immunityCallouts.length ? ` ${[...new Set(immunityCallouts)].join(' ')}` : ''}`)
    setSelectedSkill(null)
    setAttackMode(false)
    window.setTimeout(() => {
      setAnimatingUnitId(actor.id)
      setVfxEvent(vfx)
      setImpact(skill.attribute.toLowerCase())
      window.setTimeout(() => {
        setRoster(updatedRoster)
        setTeamIds(updatedTeamIds)
        setEnemies(updatedEnemies)
        setTurns((value) => value + 1)
        if (defeatedCount > 0) setEnemiesDefeated((count) => count + defeatedCount)
        addFloats(texts)
        if (substitution.substitutions.length) {
          setLog(substitution.substitutions.map(({ fallen, replacement }) => `${fallen} fell! ${replacement} steps into the fight!`).join(' '))
        }
      }, 380)
      window.setTimeout(() => setImpact(null), 380 + hitHold)
      window.setTimeout(() => setVfxEvent((current) => current?.id === vfx.id ? null : current), actionDuration)
    }, prelude)
    window.setTimeout(() => {
      setAnimatingUnitId(null)
      setActingUnitId(null)
    }, prelude + actionDuration)
    if (updatedEnemies.every((unit) => unit.hp <= 0)) {
      window.setTimeout(() => finishBattle(updatedEnemies, updatedRoster), prelude + actionDuration)
      return
    }
    if (updatedRoster.every((unit) => unit.hp <= 0)) {
      window.setTimeout(() => {
        setRoster(updatedRoster)
        setTeamIds(updatedTeamIds)
        setStarted(false)
        setDefeat(true)
        setSaved(null)
        localStorage.removeItem('mythic-dungeon-save')
      }, prelude + actionDuration)
      return
    }
    window.setTimeout(() => {
      const enemyAction = enemyTurn(updatedEnemies, updatedRoster, updatedTeamIds)
      window.setTimeout(() => {
        setIsResolving(false)
        const queue = sortBySpeed(enemyAction.teamIds.map((id) => enemyAction.roster.find((unit) => unit.id === id))
          .filter((unit): unit is Unit => unit !== undefined && unit.hp > 0))
        const currentIndex = queue.findIndex((unit) => unit.id === actor.id)
        setActiveHeroId(queue[(currentIndex + 1) % Math.max(queue.length, 1)]?.id ?? queue[0]?.id ?? null)
      }, enemyAction.duration)
    }, prelude + actionDuration)
  }

  const enemyTurn = (currentEnemies: Unit[], currentRoster: Unit[], currentTeamIds = teamIds) => {
    const aliveEnemies = currentEnemies.filter((unit) => unit.hp > 0)
    if (!aliveEnemies.length) return { duration: 0, roster: currentRoster, teamIds: currentTeamIds, defeated: false }
    const actingEnemy = sortBySpeed(aliveEnemies)[enemyTurnIndex % aliveEnemies.length]
    setEnemyTurnIndex((current) => current + 1)
    let partyAfter = [...currentRoster]
    let enemyAfter = [...currentEnemies]
    const texts: FloatingText[] = []

    if (actingEnemy.statuses.some((status) => status.kind === 'Freeze')) {
      const thawed = tickStatuses(actingEnemy)
      enemyAfter = enemyAfter.map((unit) => unit.id === actingEnemy.id ? thawed.unit : unit)
      if (thawed.damage) texts.push(makeFloat(actingEnemy.id, `-${thawed.damage}`, 'damage'))
      setEnemies(enemyAfter)
      setLog(`${actingEnemy.name} is frozen solid! Its turn is skipped.`)
      const duration = 660
      if (enemyAfter.every((unit) => unit.hp <= 0)) window.setTimeout(() => finishBattle(enemyAfter, partyAfter), duration)
      return { duration, roster: partyAfter, teamIds: currentTeamIds, defeated: false }
    }

    const targets = currentTeamIds.map((id) => partyAfter.find((unit) => unit.id === id))
      .filter((unit): unit is Unit => unit !== undefined && unit.hp > 0)
    if (!targets.length) return { duration: 0, roster: partyAfter, teamIds: currentTeamIds, defeated: false }

    const gauge = [actingEnemy.gauge[0] + 1, actingEnemy.gauge[1], actingEnemy.gauge[2]] as Unit['gauge']
    const useUltimate = gauge[0] >= 4
    const isUmbral = actingEnemy.id.startsWith('boss-eclipse-seraph') && Boolean(actingEnemy.passiveUsed)
    const enemySkill = useUltimate ? actingEnemy.skills[3] : isUmbral
      ? { ...actingEnemy.skills[0], name: 'Eclipse Brand · Umbral', power: 205, attribute: 'Shadow' as const, type: 'physical' as const, target: 'enemy' as const, description: 'Deals 205% Phys ATK to 1 enemy. Inflicts Burn (2t) on 1 enemy.', effect: 'Burn' as const }
      : actingEnemy.skills[0]
    const finalExecution = actingEnemy.isColossal && useUltimate
    const targetId = finalExecution
      ? [...targets].sort((a, b) => (a.row === 'Front' ? 0 : 1) - (b.row === 'Front' ? 0 : 1))
        .find((unit) => unit.row === 'Front')?.id ?? targets.find((unit) => unit.row === 'Back')?.id
      : enemySkill.target === 'enemy' ? getTargetId(targets) : undefined
    const enemyTeamHeal = enemySkill.type === 'heal' && enemySkill.target === 'all-allies'
    const targetsForAction = enemyTeamHeal
      ? enemyAfter.filter((unit) => unit.hp > 0)
      : enemySkill.target === 'all-enemies' ? targets : targets.filter((unit) => unit.id === targetId)
    const immunityCallouts: string[] = []

    targetsForAction.forEach((target) => {
      if (enemySkill.type === 'heal') {
        const healingReduction = target.statuses.some((status) => status.kind === 'Curse') ? 0.5 : 1
        const heal = Math.round(target.maxHp * Math.max(enemySkill.power, 10) / 100 * healingReduction)
        if (enemyTeamHeal) enemyAfter = enemyAfter.map((unit) => unit.id === target.id ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + heal) } : unit)
        else partyAfter = partyAfter.map((unit) => unit.id === target.id ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + heal) } : unit)
        texts.push(makeFloat(target.id, `+${heal}`, 'heal'))
      } else {
        const damage = calculateDamage(actingEnemy, target, enemySkill)
        const effects = enemySkill.effect ? (Array.isArray(enemySkill.effect) ? enemySkill.effect : [enemySkill.effect]) : []
        const blocked = damage === 0 ? [] : effects.filter((kind) => isStatusImmune(target, kind))
        if (blocked.length) {
          texts.push(makeFloat(target.id, 'IMMUNE', 'status'))
          immunityCallouts.push(`${target.name} is immune to ${[...new Set(blocked)].join(', ')}!`)
        }
        const wounded = damage === 0 ? target : applyStatus({ ...target, hp: Math.max(0, target.hp - damage) }, enemySkill.effect)
        partyAfter = partyAfter.map((unit) => unit.id === target.id ? wounded : unit)
        texts.push(makeFloat(target.id, damage ? `-${damage}` : 'DODGE', damage ? 'damage' : 'status'))
      }
    })

    enemyAfter = enemyAfter.map((unit) => {
      if (unit.id !== actingEnemy.id) return unit
      const acted = {
        ...unit,
        gauge: useUltimate ? [0, gauge[1], gauge[2]] as Unit['gauge'] : gauge,
        passiveUsed: unit.id.startsWith('boss-eclipse-seraph') ? !unit.passiveUsed : unit.passiveUsed,
      }
      return enemySkill.selfEffect ? addStatus(acted, enemySkill.selfEffect) : acted
    })
    const actorTick = tickStatuses(enemyAfter.find((unit) => unit.id === actingEnemy.id) ?? actingEnemy)
    enemyAfter = enemyAfter.map((unit) => unit.id === actingEnemy.id ? actorTick.unit : unit)
    if (actorTick.damage) texts.push(makeFloat(actingEnemy.id, `-${actorTick.damage}`, 'damage'))

    const substitutions = replaceFallenWithBench(partyAfter, currentTeamIds)
    partyAfter = substitutions.roster
    const updatedTeamIds = substitutions.teamIds
    const dramatic = useUltimate && !actingEnemy.isMinion
    const aoe = enemySkill.target === 'all-enemies' || enemySkill.target === 'all-allies'
    const targetSide = enemySkill.target === 'all-allies' ? 'enemies' : 'heroes'
    const destination = enemySkill.target === 'all-enemies'
      ? { x: 50, y: 52 }
      : enemySkill.target === 'all-allies'
        ? { x: 72, y: 52 }
        : unitBattlePosition(targetsForAction[0] ?? targets[0], targetSide === 'heroes' ? targets : currentEnemies, targetSide)
    const enemyVfx: VfxEvent = {
      id: ++vfxSequence.current,
      actorId: actingEnemy.id,
      targetSide,
      attribute: enemySkill.attribute,
      intensity: enemySkill.type === 'heal' ? 'heal' : dramatic ? 'ultimate' : 'basic',
      targetIds: targetsForAction.map((target) => target.id),
      targetMode: aoe ? 'aoe' : 'single',
      destination,
    }
    const prelude = dramatic ? 700 : 280
    const hitHold = dramatic ? 580 : 420
    const duration = prelude + 380 + hitHold + 320 + 380
    const defeatedCount = currentEnemies.filter((unit) => unit.hp > 0).length - enemyAfter.filter((unit) => unit.hp > 0).length
    const defeated = partyAfter.every((unit) => unit.hp <= 0) && enemyAfter.some((unit) => unit.hp > 0)
    setActingUnitId(actingEnemy.id)
    if (dramatic) setCutIn(actingEnemy)
    window.setTimeout(() => {
      setAnimatingUnitId(actingEnemy.id)
      setVfxEvent(enemyVfx)
      setImpact(enemySkill.attribute.toLowerCase())
      window.setTimeout(() => {
        setRoster(partyAfter)
        setTeamIds(updatedTeamIds)
        setEnemies(enemyAfter)
        if (defeatedCount > 0) setEnemiesDefeated((count) => count + defeatedCount)
        addFloats(texts)
        if (substitutions.substitutions.length) {
          setLog(substitutions.substitutions.map(({ fallen, replacement }) => `${fallen} fell! ${replacement} steps into the fight!`).join(' '))
        }
      }, 380)
      window.setTimeout(() => setImpact(null), 380 + hitHold)
      window.setTimeout(() => setVfxEvent((current) => current?.id === enemyVfx.id ? null : current), duration - prelude)
    }, prelude)
    window.setTimeout(() => {
      setAnimatingUnitId(null)
      setActingUnitId(null)
    }, duration)
    if (enemyAfter.every((unit) => unit.hp <= 0)) window.setTimeout(() => finishBattle(enemyAfter, partyAfter), duration)
    if (defeated) {
      window.setTimeout(() => {
        setStarted(false)
        setDefeat(true)
        setSaved(null)
        localStorage.removeItem('mythic-dungeon-save')
      }, duration)
    }
    setLog(`${useUltimate
      ? `${actingEnemy.name} unleashes ${enemySkill.name}!`
      : gauge[0] === 3 ? `${actingEnemy.name} charges ${actingEnemy.skills[3].name}!` : `${actingEnemy.name} used ${enemySkill.name}.`}${immunityCallouts.length ? ` ${[...new Set(immunityCallouts)].join(' ')}` : ''}`)
    return { duration, roster: partyAfter, teamIds: updatedTeamIds, defeated }
  }

  const finishBattle = (defeated = enemies, endingRoster = roster) => {
    if (defeated.some((unit) => unit.hp > 0)) return
    setIsResolving(false)
    setGold((current) => current + activeStage.reward)
    const afterVictory = endingRoster.map((unit) => {
      const afterPassive = unit.id === 'seraphina'
        ? { ...unit, hp: unit.hp > 0 ? Math.min(unit.maxHp, unit.hp + Math.round(unit.maxHp * 0.1)) : 0 }
        : unit.id === 'nyx'
          ? { ...unit, gauge: unit.gauge.map((charge) => charge + 3) as Unit['gauge'] }
          : unit
      return afterPassive.statuses.some((status) => status.kind === 'ATK Up' || status.kind === 'DEF Up') ? expireStageBuffs(afterPassive) : afterPassive
    })
    setRoster(afterVictory)
    setAttackMode(false)
    setSelectedSkill(null)
    if (stageNumber === 16) {
      setStarted(false)
      setVictory(true)
      setDefeat(false)
      setSaved(null)
      localStorage.removeItem('mythic-dungeon-save')
      setModal(null)
      setLog('The eclipse is broken. Happy Birthday!')
      return
    }
    if (activeStage.hostages > 0) {
      setHostagesLeft(activeStage.hostages)
      setHostageOfferIds(activeStage.hostageRecruitIds ?? recruits
        .filter((unit) => !afterVictory.some((hero) => hero.id === unit.id))
        .slice(0, activeStage.hostages).map((unit) => unit.id))
      setModal('hostage')
    } else advanceStage(afterVictory)
  }

  const advanceStage = (currentRoster: Unit[] = roster) => {
    const nextStage = stages[stageNumber]
    if (!nextStage) return
    setModal(null)
    setStageNumber((current) => current + 1)
    const nextRoster = prepareBattleRoster(currentRoster.map((unit) => ({ ...expireStageBuffs(unit), statuses: [] })), teamIds)
    setRoster(nextRoster)
    setEnemies(nextStage.kind === 'camp' ? [] : randomEnemyGroup(nextStage))
    setHostageOfferIds([])
    setEnemyTurnIndex(0)
    setSold([])
    setActiveHeroId(firstLivingHero(nextRoster, teamIds)?.id ?? null)
    if (nextStage.kind === 'camp') setModal('camp')
    setSelectedEnemyId(null)
    setLog(`Stage ${stageNumber + 1} awaits.`)
  }

  const chooseHostage = (recruit: boolean) => {
    let updatedRoster = roster
    if (recruit) {
      const offerIndex = activeStage.hostages - hostagesLeft
      const available = recruits.find((unit) => unit.id === hostageOfferIds[offerIndex])
      if (available && !roster.some((hero) => hero.id === available.id)) {
        const preferredRow: 'Front' | 'Back' = available.role === 'Tank' || available.role === 'Assassin' ? 'Front' : 'Back'
        const rowCounts = {
          Front: party.filter((unit) => unit.row === 'Front').length,
          Back: party.filter((unit) => unit.row === 'Back').length,
        }
        const row = teamIds.length < 5
          ? ([preferredRow, preferredRow === 'Front' ? 'Back' : 'Front'] as const)
            .find((candidate) => rowCounts[candidate] < (candidate === 'Front' ? 2 : 3))
          : preferredRow
        const newHero = {
          ...available,
          statuses: [],
          gauge: [0, 0, 0] as Unit['gauge'],
          row: row ?? preferredRow,
        }
        updatedRoster = [...roster, newHero]
        setRoster(updatedRoster)
        if (teamIds.length < 5) {
          const nextTeamIds = [...new Set([...teamIds, available.id])]
          setTeamIds(nextTeamIds)
          if (!activeHeroId || !livingParty.some((unit) => unit.id === activeHeroId)) setActiveHeroId(available.id)
        }
        setMessage(`${available.name} joined your roster.`)
      } else setGold((current) => current + 60)
    } else setGold((current) => current + 60)
    if (hostagesLeft <= 1) {
      setHostagesLeft(0)
      advanceStage(updatedRoster)
    } else setHostagesLeft((current) => current - 1)
  }

  const chooseCamp = (choice: 'rest' | 'scavenge') => {
    let updatedRoster = roster
    if (choice === 'rest') {
      updatedRoster = roster.map((unit) => ({ ...unit, hp: unit.hp > 0 ? Math.min(unit.maxHp, unit.hp + Math.round(unit.maxHp * 0.5)) : Math.round(unit.maxHp * 0.5), statuses: [] }))
      setRoster(updatedRoster)
      setLog('Rested by the fire. The whole party is restored.')
    } else {
      setGold((current) => current + 100)
      setLog('You found 100 gold tucked beneath the stones.')
    }
    advanceStage(updatedRoster)
  }

  const buyItem = (itemId: ItemId) => {
    const item = shopItems.find((entry) => entry.id === itemId)!
    if (gold < item.cost || sold.includes(itemId)) return
    setGold((current) => current - item.cost)
    setItems((current) => ({ ...current, [itemId]: current[itemId] + 1 }))
    setSold((current) => [...current, itemId])
  }

  const handleInventoryItem = (itemId: ItemId) => {
    const usable = itemId === 'revive-feather' ? party.find((unit) => unit.hp <= 0) : party.find((unit) => unit.hp > 0)
    if (items[itemId] <= 0) return
    if (!usable) {
      setMessage(itemId === 'revive-feather' ? 'No fallen hero needs a Revive Feather.' : 'No living party member can use this item.')
      return
    }
    if ((itemId === 'healing-potion' || itemId === 'cleanse-herb' || itemId === 'valor-tonic' || itemId === 'ironbark-draught') &&
      (!selectedUnitForItem || selectedUnitForItem === 'choose')) {
      setSelectedUnitForItem('choose')
      setPendingItem(itemId)
      return
    }
    const target = selectedUnitForItem && selectedUnitForItem !== 'choose'
      ? roster.find((unit) => unit.id === selectedUnitForItem) ?? usable
      : usable
    if (itemId === 'revive-feather' && target.hp > 0) {
      setMessage('Choose a fallen hero for the Revive Feather.')
      return
    }
    updateRoster(target.id, (unit) => applyItem(unit, itemId))
    setItems((current) => ({ ...current, [itemId]: current[itemId] - 1 }))
    setSelectedUnitForItem(null)
    setPendingItem(null)
    setMessage(`${itemId.replaceAll('-', ' ')} used on ${target.name}.`)
  }

  const chooseTeamMember = (unit: Unit) => {
    setSelectedTeamSwapId((selected) => selected === unit.id ? null : unit.id)
  }

  const chooseFormationSlot = (row: 'Front' | 'Back', targetId?: string) => {
    const source = roster.find((unit) => unit.id === selectedTeamSwapId)
    if (!source) return
    const sourceInTeam = teamIds.includes(source.id)
    const target = targetId ? roster.find((unit) => unit.id === targetId) : undefined
    if (targetId && !target) return

    if (!sourceInTeam) {
      if (target) {
        setTeamIds((current) => current.map((id) => id === target.id ? source.id : id))
        updateRoster(source.id, (hero) => ({ ...hero, row }))
        if (activeHeroId === target.id) setActiveHeroId(source.id)
      } else if (teamIds.length < 5) {
        setTeamIds((current) => current.includes(source.id) ? current : [...current, source.id])
        updateRoster(source.id, (hero) => ({ ...hero, row }))
        if (!activeHeroId || !party.some((hero) => hero.id === activeHeroId && hero.hp > 0)) setActiveHeroId(source.id)
      }
      setSelectedTeamSwapId(null)
      return
    }

    if (target && target.id !== source.id) {
      setTeamIds((current) => current.map((id) => id === source.id ? target.id : id === target.id ? source.id : id))
      updateRoster(source.id, (hero) => ({ ...hero, row: target.row ?? row }))
      updateRoster(target.id, (hero) => ({ ...hero, row }))
      if (activeHeroId === source.id) setActiveHeroId(target.id)
      else if (activeHeroId === target.id) setActiveHeroId(source.id)
      setSelectedTeamSwapId(null)
      return
    }

    const targetCapacity = row === 'Front' ? 2 : 3
    const targetCount = party.filter((unit) => unit.id !== source.id && unit.row === row).length
    if ((source.row ?? 'Back') !== row && targetCount >= targetCapacity) {
      setMessage(`${row} row is full. Move a hero out first.`)
      return
    }
    updateRoster(source.id, (hero) => ({ ...hero, row }))
    setSelectedTeamSwapId(null)
  }

  const moveToBench = (unit: Unit) => {
    if (teamIds.length <= 1) return
    setTeamIds((current) => current.filter((id) => id !== unit.id))
    if (activeHeroId === unit.id) setActiveHeroId(firstLivingHero(roster, teamIds.filter((id) => id !== unit.id))?.id ?? null)
    setSelectedTeamSwapId(null)
  }

  const swapInBench = (unit: Unit) => {
    if (teamIds.length >= 5) {
      setSelectedTeamSwapId(unit.id)
      return
    }
    const preferredRow: 'Front' | 'Back' = unit.role === 'Tank' || unit.role === 'Assassin' ? 'Front' : 'Back'
    const rowCounts = {
      Front: party.filter((member) => member.row === 'Front').length,
      Back: party.filter((member) => member.row === 'Back').length,
    }
    const candidateRows: Array<'Front' | 'Back'> = [preferredRow, preferredRow === 'Front' ? 'Back' : 'Front']
    const row = candidateRows
      .find((candidate) => rowCounts[candidate] < (candidate === 'Front' ? 2 : 3))
    if (!row) {
      setMessage('Your formation is full. Select a hero to swap out first.')
      return
    }
    setTeamIds((current) => [...current, unit.id])
    updateRoster(unit.id, (hero) => ({ ...hero, row }))
    setSelectedTeamSwapId(null)
  }

  const selectSkill = (index: number) => {
    if (!activeHero) return
    if (selectedSkill === index) {
      setSelectedSkill(null)
      setMessage('Skill unselected. Choose another action.')
      return
    }
    const skill = activeHero.skills[index]
    if (index > 0 && activeHero.gauge[index - 1] < skill.cost) {
      setMessage(`${skill.name} is charging (${activeHero.gauge[index - 1]}/${skill.cost}).`)
      return
    }
    setSelectedSkill(index)
    setMessage(skill.target === 'all-enemies'
      ? 'Choose any highlighted enemy to strike the whole enemy line.'
      : skill.target === 'all-allies'
        ? 'Choose any highlighted ally to affect the whole party.'
        : skill.target === 'ally'
          ? 'Choose a highlighted ally.'
          : 'Choose a highlighted enemy.')
  }

  const chooseTarget = (unit: Unit) => {
    if (modal === 'details') {
      setSelectedDetailsId(unit.id)
      return
    }
    if (selectedSkill === null || !activeHero) {
      if (enemies.some((enemy) => enemy.id === unit.id) || party.some((hero) => hero.id === unit.id)) {
        setSelectedDetailsId(unit.id)
        setModal('details')
      }
      return
    }
    const skill = activeHero.skills[selectedSkill]
    const isEnemy = enemies.some((enemy) => enemy.id === unit.id)
    if ((skill.target === 'enemy' && isEnemy) || (skill.target === 'ally' && !isEnemy) ||
      (skill.target === 'all-enemies' && isEnemy) || (skill.target === 'all-allies' && !isEnemy)) {
      executePlayerSkill(selectedSkill, unit.id)
    }
  }

  const resumeSavedRun = () => {
    if (!saved) return
    setStarted(true)
    setVictory(false)
    setRoster(saved.roster)
    setTeamIds(saved.teamIds)
    setStageNumber(saved.stageNumber)
    setGold(saved.gold)
    setItems(saved.items)
    setTurns(saved.turns)
    setEnemiesDefeated(saved.enemiesDefeated ?? 0)
    setDefeat(false)
    setHostagesLeft(saved.hostagesLeft ?? 0)
    setEnemyTurnIndex(saved.enemyTurnIndex ?? 0)
    setSold(saved.sold ?? [])
    setActiveHeroId(firstLivingHero(saved.roster, saved.teamIds)?.id ?? null)
    const resumeStage = stages[saved.stageNumber - 1]
    setHostageOfferIds(saved.hostageOfferIds ?? recruits.filter((unit) => !saved.roster.some((hero) => hero.id === unit.id))
      .slice(0, resumeStage?.hostages ?? 0).map((unit) => unit.id))
    if ((saved.hostagesLeft ?? 0) > 0) {
      setEnemies(saved.enemies ?? [])
      setModal('hostage')
    } else if (resumeStage?.kind === 'camp') {
      setEnemies([])
      setModal('camp')
    } else if (resumeStage) setEnemies(saved.enemies?.length ? saved.enemies : randomEnemyGroup(resumeStage))
  }

  const restartRun = () => {
    localStorage.removeItem('mythic-dungeon-save')
    setSaved(null)
    beginRun(selectedStarterId)
  }

  const openTeamModal = () => {
    setTeamTab('squad')
    setSelectedTeamSwapId(null)
    setModal('team')
  }

  if (!started && defeat) {
    return (
      <main className="victory-screen defeat-screen">
        <div className="defeat-content">
          <div className="dialog-kicker">DESCENT ENDED</div>
          <h1>FALLEN IN<br /><em>THE DUNGEON</em></h1>
          <p>Your companions fought as far as they could. The dungeon keeps its silence.</p>
          <div className="victory-summary">
            <span>Stage reached · {stageNumber} / 16</span>
            <span>Turns survived · {turns}</span>
            <span>Enemies defeated · {enemiesDefeated}</span>
          </div>
          <button className="gold-button" onClick={() => {
            setStarted(false)
            setDefeat(false)
            setVictory(false)
            setStageNumber(1)
            setGold(60)
            setTurns(0)
            setEnemiesDefeated(0)
            setRoster([])
            setTeamIds([])
            setEnemies([])
            setActiveHeroId(null)
            setSaved(null)
            localStorage.removeItem('mythic-dungeon-save')
          }}>Return to Start <ChevronRight size={16} /></button>
        </div>
      </main>
    )
  }

  if (!started && !victory) {
    return (
      <main className="title-screen">
        <div className="title-atmosphere" />
        <header className="title-brand"><span className="brand-mark"><Sparkles size={18} /></span> MYTHIC DUNGEON <i>✦</i></header>
        <section className="title-content">
          <div className="eyebrow"><span /> A BIRTHDAY ADVENTURE <span /></div>
          <h1>DESCEND INTO<br /><em>LEGEND</em></h1>
          <p className="title-copy">Choose your first champion. Gather companions.<br />Break the eclipse and claim a birthday legend.</p>
          <div className="starter-label"><span>01</span> CHOOSE YOUR FIRST COMPANION</div>
          <div className={`starter-layout ${starterDetailsOpen ? 'details-open' : ''}`}>
            <div className="starter-grid">
              {heroes.map((hero) => {
                return (
                  <button type="button" aria-pressed={selectedStarterId === hero.id} className={`starter-card ${selectedStarterId === hero.id ? 'selected' : ''}`} key={hero.id} onClick={() => { setSelectedStarterId(hero.id); setStarterDetailsOpen(true) }}>
                    <span className="starter-portrait"><Avatar unit={hero} /><span>{hero.attributes[0]}</span></span>
                    <span className="starter-meta">
                      <span className="starter-role">{hero.role} <b>·</b> {hero.attributes[0]}</span>
                      <strong>{hero.name}</strong>
                      <small className="starter-passive"><b>PASSIVE</b> {hero.ability}</small>
                      <span className="starter-skill-list">{hero.skills.map((skill, index) => (
                        <small key={skill.name}><i>{index === 0 ? 'BASIC' : index === 3 ? 'ULT' : `S${index}`}</i>{skill.name}<b>{skill.power}%</b></small>
                      ))}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {starterDetailsOpen && (() => {
              const hero = heroes.find((unit) => unit.id === selectedStarterId) ?? heroes[0]
              const rowBonus = {
                Tank: 'Front · +25% DEF',
                Assassin: 'Front · +20% Phys ATK',
                Attacker: 'Back · +20% Phys ATK',
                Mage: 'Back · +20% Mag ATK',
                Healer: 'Back · +25% Healing',
              }[hero.role]
              return <aside className="starter-detail-panel">
                <div className="starter-detail-heading"><span>CHAMPION DOSSIER</span></div>
                <div className="starter-detail-identity"><Avatar unit={hero} /><div><AttributeBadge attributes={hero.attributes} /><h2>{hero.name}</h2><span>{hero.role} · {rowBonus}</span></div></div>
                <div className="starter-detail-stats"><span>HP <b>{hero.maxHp}</b></span><span>Phys ATK <b>{hero.physAtk}</b></span><span>Mag ATK <b>{hero.magAtk}</b></span><span>DEF <b>{hero.def}</b></span><span>SPD <b>{hero.spd}</b></span></div>
                <p className="starter-detail-passive"><b>PASSIVE</b>{hero.ability}</p>
                <div className="starter-detail-skills">{hero.skills.map((skill, index) => <article key={skill.name}>
                  <div><b>{skill.name}</b><span>{index === 0 ? 'BASIC · FREE' : `${index === 3 ? 'ULTIMATE' : `STAGE ${index}`} · ${skill.cost} GAUGE`}</span></div>
                  <p>{skill.description}</p>
                </article>)}</div>
              </aside>
            })()}
          </div>
          <div className="start-actions">
            {saved
              ? <div className="saved-run-actions"><button className="begin-descent-button" onClick={resumeSavedRun}>Continue Descent <ChevronRight size={20} /></button><button className="restart-descent-button" onClick={restartRun}>Restart</button></div>
              : <button className="begin-descent-button" onClick={() => beginRun(selectedStarterId)}>Begin Descent <ChevronRight size={20} /></button>}
          </div>
        </section>
        <footer className="title-footer"><span>EIGHT DUNGEON AREAS · SIXTEEN STAGES · ONE UNFORGETTABLE DAY</span><span>✦ A tale made just for you ✦</span></footer>
      </main>
    )
  }

  if (!started && victory) {
    return (
      <main className="victory-screen">
        <div className="confetti-field" aria-hidden="true">{Array.from({ length: 44 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>
        <div className="victory-content"><div className="victory-seal"><Sparkles size={42} /></div><p className="eyebrow">THE FINAL ECLIPSE HAS FALLEN</p>
          <h1>{BIRTHDAY_CONFIG.headline.toUpperCase()}<br /><em>{BIRTHDAY_CONFIG.recipientName.toUpperCase()}!</em></h1>
          <p className="victory-subheadline">{BIRTHDAY_CONFIG.subheadline}</p>
          <p className="victory-message">{BIRTHDAY_CONFIG.personalMessage}</p>
          <div className="victory-summary"><span><Swords size={16} /> {turns} turns</span><span><UsersRound size={16} /> {party.length} companions</span><span><Coins size={16} /> {gold} gold earned</span></div>
          <div className="victory-party">{party.map((unit) => <div key={unit.id}><Avatar unit={unit} compact /><b>{unit.name}</b></div>)}</div>
          <p className="victory-signature">{BIRTHDAY_CONFIG.fromSignature}</p>
          <button className="gold-button" onClick={() => { setStarted(false); setVictory(false); setDefeat(false); setStageNumber(1); setSaved(null); setRoster([]); setTeamIds([]); setLog('') }}>Begin another legend <ChevronRight size={16} /></button>
        </div>
      </main>
    )
  }

  const skillCost = (unit: Unit, index: number) => index === 0 ? 0 : unit.gauge[index - 1]
  const segmentStart = Math.floor((stage.number - 1) / 5) * 5 + 1
  const segmentStages = stages.slice(segmentStart - 1, segmentStart + 4)

  return (
    <main className="game-shell">
      <DungeonBackdrop key={stage.areaId} areaId={stage.areaId} />
      <header className="topbar">
        <div className="game-brand"><span className="brand-mark"><Sparkles size={15} /></span><span>MYTHIC <b>DUNGEON</b></span></div>
        <section className="stage-progress" aria-label="Dungeon stage progress">
          <div className="stage-segment-heading"><span>DESCENT TRACK</span><b>STAGE {stage.number} / 16</b><i>{stage.areaName}</i></div>
          <div className="stage-nodes">{segmentStages.map((entry) => (
              <span key={entry.number} aria-label={`Stage ${entry.number}: ${entry.title} · ${entry.kind}`} title={`${entry.number}. ${entry.title}`}
                className={`stage-node ${entry.kind} ${entry.number === 16 ? 'final-boss-node' : ''} ${entry.number === stageNumber ? 'current' : ''} ${entry.number < stageNumber ? 'complete' : ''}`}>
                <span>{entry.kind === 'boss' ? '♛' : entry.kind === 'camp' ? '✦' : entry.number < stageNumber ? '✓' : entry.number}</span>
              </span>
          ))}</div>
        </section>
        <div className="top-tools"><div className="gold-counter"><Coins size={16} /><b>{gold}</b><small>GOLD</small></div>
          <button className="wheel-button" aria-label="Open attribute chart" title="Open the attribute chart" onClick={() => setModal('chart')}>
            <span className="attribute-wheel-mini"><i className="attr-light">L</i><b>↔</b><i className="attr-shadow">S</i></span>
            <span className="attribute-wheel-mini"><i className="attr-ice">I</i><b>↔</b><i className="attr-fire">F</i></span>
            <span className="attribute-wheel-mini"><i className="attr-sound">♫</i><b>↔</b><i className="attr-earth">E</i></span>
          </button>
        </div>
      </header>

      <div className="battle-layout">
        <aside className="unit-sidebar hero-sidebar">
          <div className="sidebar-heading"><span>YOUR COMPANY</span><b>{party.length}/5</b></div>
          <div className="unit-list">
            {sortBySpeed(party).map((unit) => {
              const order = turnOrder.findIndex((candidate) => candidate.id === unit.id) + 1
              const bonus = formationBonus(unit)
              return <button key={unit.id} className={`unit-card hero-unit ${activeHero?.id === unit.id ? 'active' : ''} ${actingUnitId === unit.id ? 'turn-acting' : ''} ${unit.hp <= 0 ? 'fallen' : ''}`} onClick={() => { setSelectedDetailsId(unit.id); setModal('details') }}>
                <div className="unit-card-top"><span className="turn-badge">{order ? `${order}${order === 1 ? 'st' : order === 2 ? 'nd' : order === 3 ? 'rd' : 'th'}` : '—'}</span><Avatar unit={unit} compact /><div className="unit-name-wrap"><b>{unit.name}</b><span>{unit.role} · {unit.row ?? 'Back'}</span></div><span className="unit-hp-value">{unit.hp}/{unit.maxHp}</span></div>
                <div className="unit-attributes"><AttributeBadge attributes={unit.attributes} /><span>PHY {unit.physAtk} · MAG {unit.magAtk} · SPD {unit.spd}{bonus.phys || bonus.mag ? ' · ROW ATK' : bonus.def ? ' · ROW DEF' : bonus.heal ? ' · ROW HEAL' : ''}</span></div>
                <HealthBar unit={unit} /><StatusMarks unit={unit} />
              </button>
            })}
          </div>
          <button className="sidebar-link" onClick={openTeamModal}><UsersRound size={14} /> Edit formation <ChevronRight size={13} /></button>
          <div className="turn-status" role="status"><span>TURN STATUS</span><b>{isResolving ? 'Enemy action resolving' : activeHero ? `${activeHero.name} · Your turn` : 'No active hero'}</b></div>
        </aside>

        <section className={`arena ${attackMode ? 'attack-open' : ''} ${impact ? 'impact' : ''} ${vfxEvent?.targetMode === 'aoe' ? 'impact-aoe' : vfxEvent ? 'impact-single' : ''} ${vfxEvent?.targetSide === 'heroes' ? 'impact-targets-heroes' : ''} ${vfxEvent?.intensity ? `impact-${vfxEvent.intensity}` : ''}`} data-impact={impact ?? undefined} data-area={stage.areaId} onClick={(event) => {
          if ((event.target as HTMLElement).closest('.pad-unit') || selectedSkill === null || !activeHero) return
          const skill = activeHero.skills[selectedSkill]
          if (skill.target === 'all-enemies' || skill.target === 'all-allies') executePlayerSkill(selectedSkill)
        }}>
          <div className="arena-topline"><span><i /> {stage.areaName}</span><b>STAGE {String(stage.number).padStart(2, '0')} <small>/ 16</small></b></div>
          <div className="battle-callout" role="status" aria-live="polite">{log}</div>
          <div className="arena-location"><span>✦</span><h2>{stage.title}</h2><p>{stage.description}</p></div>
          <div className="battle-pads">
            <FormationPad side="heroes" units={party} activeHeroId={activeHero?.id ?? null} selectedEnemyId={selectedEnemyId} targetType={selectedSkill === null ? null : activeHero?.skills[selectedSkill].target ?? null} actingUnitId={actingUnitId} floating={floating} animatingUnitId={animatingUnitId} vfxEvent={vfxEvent} onSelect={chooseTarget} />
            <div className="battle-divider"><span>VS</span></div>
            <FormationPad side="enemies" units={enemies} activeHeroId={activeHero?.id ?? null} selectedEnemyId={selectedEnemyId} targetType={selectedSkill === null ? null : activeHero?.skills[selectedSkill].target ?? null} actingUnitId={actingUnitId} floating={floating} animatingUnitId={animatingUnitId} vfxEvent={vfxEvent} onSelect={chooseTarget} />
          </div>
          {attackMode && <div className="combat-illustration"><Avatar unit={activeHero ?? heroes[0]} combat /><span>{activeHero?.name}</span></div>}
          {attackMode && <div className="skill-deck">
            {activeHero?.skills.map((skill, index) => {
              const gauge = skillCost(activeHero, index)
              const ready = index === 0 || gauge >= skill.cost
              const targetLabel = skill.target === 'all-enemies' || skill.target === 'all-allies' ? 'AOE' : 'SINGLE'
              const skillAttributes = [skill.attribute, ...(skill.additionalAttributes ?? [])].join('/')
              return <button className={`skill-card ${ready ? 'ready' : 'charging'} ${selectedSkill === index ? 'chosen' : ''} ${index === 3 ? 'ultimate-card' : ''}`} key={skill.name} onClick={() => selectSkill(index)} title={skill.description}>
                <span className="skill-topline"><span className="skill-level">{index === 0 ? 'BASIC' : index === 3 ? 'ULTIMATE' : `STAGE ${index}`}</span><span className="skill-attribute"><i>{({ Light: '✦', Shadow: '◈', Ice: '❄', Fire: '♨', Sound: '♫', Earth: '⬟' })[skill.attribute]}</i>{skillAttributes} · {targetLabel}</span></span>
                <b>{skill.name}</b>
                <span className="skill-scale"><i>{skill.type.toUpperCase()} · {skill.power}%</i><strong>{index === 0 ? 'READY' : `${gauge}/${skill.cost}`}</strong></span>
                <small>{skill.description}</small>
                <span className="gauge-pips" aria-label={index === 0 ? 'Basic skill, no charge required' : `${gauge} of ${skill.cost} charges`}>
                  {Array.from({ length: Math.max(skill.cost, 1) }, (_, pip) => <i key={pip} className={index === 0 || pip < gauge ? 'filled' : ''} />)}
                </span>
              </button>
            })}
          </div>}
          <div className="bottom-actions">
            {attackMode ? <><button onClick={() => setModal('items')}><Backpack size={15} /> Items</button><button onClick={() => setModal('shop')}><ShoppingBag size={15} /> Shop</button><button className="back-action" onClick={() => { setAttackMode(false); setSelectedSkill(null) }}><ArrowLeft size={15} /> Back</button></>
              : <><button className="primary-action" disabled={isResolving || !livingParty.length} onClick={() => { setAttackMode(true); setSelectedSkill(null) }}><Swords size={16} /> {isResolving ? 'Resolving…' : 'Attack'}</button><button onClick={() => setModal('items')}><Backpack size={15} /> Items</button><button onClick={() => setModal('shop')}><ShoppingBag size={15} /> Shop</button><button onClick={openTeamModal}><UsersRound size={15} /> Team</button></>}
          </div>
        </section>

        <aside className="unit-sidebar enemy-sidebar">
          <div className="sidebar-heading"><span>ENEMY PARTY</span><b>{enemies.filter((unit) => unit.hp > 0).length}</b></div>
          <div className="unit-list">
            {sortBySpeed(enemies).map((unit) => {
              const order = turnOrder.findIndex((candidate) => candidate.id === unit.id) + 1
              return <button key={unit.id} className={`unit-card enemy-unit ${actingUnitId === unit.id ? 'turn-acting' : ''} ${unit.hp <= 0 ? 'fallen' : ''}`} onClick={() => { setSelectedEnemyId(unit.id); setSelectedDetailsId(unit.id); setModal('details') }}>
                <div className="unit-card-top"><span className="turn-badge">{order ? `${order}${order === 1 ? 'st' : order === 2 ? 'nd' : order === 3 ? 'rd' : 'th'}` : '—'}</span><Avatar unit={unit} compact /><div className="unit-name-wrap"><b>{unit.name}</b><span>{unit.isBoss ? 'DUNGEON BOSS' : unit.role}</span></div><span className="unit-hp-value">{unit.hp}/{unit.maxHp}</span></div>
                <div className="unit-attributes"><AttributeBadge attributes={unit.attributes} /><span>PHY {unit.physAtk} · MAG {unit.magAtk} · SPD {unit.spd}</span></div>
                <HealthBar unit={unit} /><StatusMarks unit={unit} />
              </button>
            })}
          </div>
          <div className="enemy-inspect-hint"><Sparkles size={13} /> Select an enemy to inspect</div>
          {stage.kind === 'fight' && stage.hostages > 0 && <button className="hostage-cage" onClick={() => setModal('hostage-details')} title={`${stage.hostages} hostages await rescue`}>
            <span className="cage-mark">✦</span><span className="cage-bars">╫╫╫</span>
            <span className="cage-captives">{currentHostageOffers.slice(0, stage.hostages).map((unit) => <Avatar key={unit.id} unit={unit} compact />)}</span>
            <b>{stage.hostages}</b><small>HOSTAGE CAGE · INSPECT</small>
          </button>}
        </aside>
      </div>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && modal !== 'hostage' && modal !== 'camp') setModal(null) }}>
        <section className={`dialog ${modal === 'details' ? 'details-dialog' : ''} ${modal === 'hostage-details' ? 'hostage-details-dialog' : ''} ${modal === 'chart' ? 'chart-dialog' : ''} ${modal === 'camp' ? 'camp-dialog' : ''} ${modal === 'team' ? 'team-dialog' : ''}`} role="dialog" aria-modal="true">
          {modal !== 'hostage' && modal !== 'camp' && <button className="dialog-close" onClick={() => setModal(null)} aria-label="Close"><X size={18} /></button>}
          {modal === 'details' && detailsUnit && <>
            <div className="dialog-kicker">{detailsUnit.isBoss ? 'BOSS INTELLIGENCE' : party.some((unit) => unit.id === detailsUnit.id) ? 'COMPANION PROFILE' : 'ENEMY INTELLIGENCE'}</div>
            <div className="detail-hero"><Avatar unit={detailsUnit} facing={enemies.some((unit) => unit.id === detailsUnit.id) ? 'left' : 'right'} /><div><AttributeBadge attributes={detailsUnit.attributes} /><h2>{detailsUnit.name}</h2><span>{detailsUnit.role}{detailsUnit.isBoss ? ' · DUNGEON BOSS' : ''}</span></div></div>
            <div className="detail-stats"><span><Heart size={14} /> HP <b>{detailsUnit.hp}/{detailsUnit.maxHp}</b></span><span><Swords size={14} /> Phys ATK <b>{detailsUnit.physAtk}</b></span><span><Sparkles size={14} /> Mag ATK <b>{detailsUnit.magAtk}</b></span><span><Shield size={14} /> DEF <b>{detailsUnit.def}</b></span><span><ChevronRight size={14} /> SPD <b>{detailsUnit.spd}</b></span></div>
            <p className="dialog-description"><b>ATTRIBUTE · </b>{detailsUnit.attributes.join(' / ')}</p>
            {detailsUnit.isColossal && <p className="all-attributes-badge">ALL ATTRIBUTES — NO WEAKNESSES</p>}
            {detailsHaveDualAttribute && !detailsUnit.isColossal && <p className="dual-cancel-note">DUAL ATTRIBUTE · matching opposing attacks are neutralized to 1.0× damage.</p>}
            <p className="dialog-description"><b>PASSIVE · </b>{detailsUnit.ability}</p>
            <div className="detail-statuses"><b>ACTIVE STATUS</b>{detailsUnit.statuses.length
              ? detailsUnit.statuses.map((status) => <span key={status.kind}>{status.kind} · {status.turns}t</span>)
              : <span>None</span>}</div>
            <div className="enemy-skill-details">{detailsUnit.skills.map((skill, index) => {
              const charge = index === 0 ? 0 : detailsAreEnemy
                ? index === 3 ? detailsUnit.gauge[0] : 0
                : detailsUnit.gauge[index - 1]
              return <div key={skill.name}>
                <b>{index === 0 ? 'BASIC' : index === 3 ? 'ULTIMATE' : `STAGE ${index}`} · {skill.name} · {index === 0 ? 'FREE' : `${charge}/${index === 3 && detailsAreEnemy ? ultimateChargeMax : skill.cost} GAUGE`}</b>
                <small>{skill.description}</small>
              </div>
            })}</div>
            <div className="enemy-ult"><span>ULTIMATE CHARGE</span><div className="gauge-track"><i style={{ width: `${Math.min(100, detailsUnit.gauge[0] / ultimateChargeMax * 100)}%` }} /></div><b>{detailsUnit.gauge[0]}/{ultimateChargeMax}</b></div>
          </>}
          {modal === 'chart' && <>
            <div className="dialog-kicker">ELEMENTAL MATCHUPS</div><h2>Attribute Chart</h2>
            <div className="attribute-chart">{[
              ['Light', 'Shadow'], ['Ice', 'Fire'], ['Sound', 'Earth'],
            ].map(([first, second]) => <div className="attribute-chart-row" key={first}>
              <span className={`attribute-emblem attr-${first.toLowerCase()}`}>{first === 'Light' ? '✦' : first === 'Ice' ? '❄' : '♫'}<b>{first}</b></span>
              <i>↔</i><b className="chart-multiplier">2×</b><i>↔</i>
              <span className={`attribute-emblem attr-${second.toLowerCase()}`}>{second === 'Shadow' ? '◈' : second === 'Fire' ? '♨' : '⬟'}<b>{second}</b></span>
            </div>)}</div>
            <p className="dual-cancel-note">Dual-attribute bosses with both opposing elements take 1.0× normal damage instead.</p>
            <p className="dual-cancel-note"><b>Elemental Immunities</b> · Ice: Immune to Freeze · Fire: Immune to Burn · Light: Immune to Curse</p>
          </>}
          {modal === 'hostage-details' && <>
            <div className="dialog-kicker">HOSTAGE CAGE · STAGE {stage.number}</div><h2>Captives awaiting rescue</h2>
            <p className="dialog-description">On victory, each captive can join your roster or be exchanged for 60 Gold.</p>
            <div className="cage-hostage-list">{currentHostageOffers.slice(0, stage.hostages).map((unit) => <article key={unit.id}>
              <Avatar unit={unit} /><div><b>{unit.name}</b><span>{unit.role} · {unit.attributes.join(' / ')}</span><small>Passive · {unit.ability}</small><small>Reward · Recruit or 60 Gold</small></div>
            </article>)}</div>
          </>}
          {modal === 'camp' && <><div className="campfire-scene"><DungeonBackdrop key="campfire-rest" areaId="campfire-rest" /><span>♨</span></div><div className="dialog-kicker">A MOMENT OF RESPITE · STAGE {stage.number}</div><h2>{stage.title}</h2><p className="dialog-description">The road is quiet. Choose how your party spends this pause.</p><div className="camp-choices"><button onClick={() => chooseCamp('rest')}><Heart size={19} /><b>Rest at Campfire</b><span>Heal the whole party by 50% and revive fallen heroes.</span></button><button onClick={() => chooseCamp('scavenge')}><Coins size={19} /><b>Claim Hidden Cache</b><span>Find 100 gold for your journey.</span></button></div></>}
          {modal === 'hostage' && <><div className="dialog-icon"><Sparkles size={24} /></div><div className="dialog-kicker">A CAGE UNLOCKED</div><h2>A new companion awaits.</h2><p className="dialog-description">Freed companion {activeStage.hostages - hostagesLeft + 1} of {activeStage.hostages}. Choose a place in your roster or accept 60 gold.</p>{(() => { const offerIndex = activeStage.hostages - hostagesLeft; const rescued = recruits.find((unit) => unit.id === hostageOfferIds[offerIndex]) ?? recruits.find((unit) => !roster.some((hero) => hero.id === unit.id)); return rescued ? <div className="hostage-recruit"><Avatar unit={rescued} /><div><b>{rescued.name}</b><span>{rescued.role} · {rescued.attributes.join(' / ')}</span><small>Passive: {rescued.ability}</small><small>{rescued.skills.map((skill) => skill.name).join(' · ')}</small></div></div> : <div className="hostage-recruit"><Avatar unit={heroes[0]} /><div><b>Your roster is complete</b><span>Accept gold to continue the descent.</span></div></div> })()}<div className="dialog-actions"><button className="gold-button" onClick={() => chooseHostage(true)}><Plus size={15} /> Recruit to Roster</button><button className="outline-button" onClick={() => chooseHostage(false)}><Coins size={15} /> Accept 60 Gold</button></div></>}
          {modal === 'shop' && <><div className="dialog-kicker">THE WAYFARER’S STALL · STAGE {stageNumber}</div><h2>Useful things, fair prices.</h2><p className="dialog-description">Stock refreshes at every stage. Supplies last until used.</p><div className="shop-list">{shopItems.map((item) => <div className="shop-row" key={item.id}><span className="shop-item-icon"><Sparkles size={16} /></span><div><b>{item.name}</b><small>{item.description}</small></div><button disabled={gold < item.cost || sold.includes(item.id)} onClick={() => buyItem(item.id)}>{sold.includes(item.id) ? 'SOLD' : <><Coins size={13} /> {item.cost}</>}</button></div>)}</div><div className="dialog-foot"><span><Coins size={14} /> Purse</span><b>{gold} G</b></div></>}
          {modal === 'items' && <><div className="dialog-kicker">YOUR PACK</div><h2>Carry a little magic.</h2><p className="dialog-description">{selectedUnitForItem === 'choose' ? `Choose a hero for ${pendingItem?.replaceAll('-', ' ') ?? 'this item'}.` : 'Select an item to use during this stage.'}</p><div className="inventory-list">{shopItems.map((item) => <button key={item.id} disabled={items[item.id] < 1} className="inventory-row" onClick={() => handleInventoryItem(item.id)}><span className="inventory-count">{items[item.id]}</span><span><b>{item.name}</b><small>{item.description}</small></span><ChevronRight size={15} /></button>)}</div>{selectedUnitForItem && <div className="item-targets"><b>USE ON</b>{party.map((unit) => <button key={unit.id} disabled={pendingItem === 'revive-feather' ? unit.hp > 0 : unit.hp <= 0} onClick={() => { setSelectedUnitForItem(unit.id); setMessage(`${unit.name} selected.`) }} className={selectedUnitForItem === unit.id ? 'picked' : ''}><Avatar unit={unit} compact />{unit.name} <small>{unit.hp}/{unit.maxHp}</small></button>)}</div>}</>}
          {modal === 'team' && <>
            <div className="dialog-kicker">COMPANY & FORMATION</div>
            <h2>Your team, your tactics.</h2>
            <p className="dialog-description">Select a hero, then choose a glowing formation slot to move or replace a teammate.</p>
            <div className="team-tabs" role="tablist" aria-label="Team manager sections">
              <button role="tab" aria-selected={teamTab === 'squad'} className={teamTab === 'squad' ? 'active' : ''} onClick={() => setTeamTab('squad')}>SQUAD & FORMATION</button>
              <button role="tab" aria-selected={teamTab === 'enemies'} className={teamTab === 'enemies' ? 'active' : ''} onClick={() => setTeamTab('enemies')}>STAGE ENEMIES ({enemies.length})</button>
            </div>
            {teamTab === 'squad' ? <div className="team-manager">
              <div className="formation-board">
                <div className="formation-map-heading"><b>BACK · 3 SLOTS</b><b>FRONT · 2 SLOTS</b></div>
                <div className="formation-map">
                  {PLAYER_SLOTS.map((slot) => {
                    const row = slot.row === 'front' ? 'Front' : 'Back'
                    const rowSlots = PLAYER_SLOTS.filter((candidate) => candidate.row === slot.row)
                    const slotIndex = rowSlots.findIndex((candidate) => candidate.slot === slot.slot)
                    const unit = party.filter((member) => (member.row ?? 'Back') === row)[slotIndex]
                    const bonus = unit ? formationBonus({ ...unit, row }) : null
                    const buffActive = bonus ? bonus.phys > 0 || bonus.mag > 0 || bonus.def > 0 || bonus.heal > 0 : false
                    const targetable = Boolean(selectedTeamSwapId && selectedTeamSwapId !== unit?.id)
                    return <article className={`formation-slot-wrap formation-slot-position formation-${slot.row} ${targetable ? 'slot-targetable' : ''}`} key={`${row}-${slot.slot}`} style={{ left: row === 'Back' ? '28%' : '72%', top: `${slot.y}%`, zIndex: slot.zIndex }}>
                      <button className={`formation-slot ${unit ? '' : 'empty'} ${unit && selectedTeamSwapId === unit.id ? 'swap-selected' : ''} ${targetable ? 'slot-targetable' : ''}`} onClick={() => {
                        if (selectedTeamSwapId) chooseFormationSlot(row, unit?.id)
                        else if (unit) chooseTeamMember(unit)
                      }}>
                        {unit ? <>
                          <Avatar unit={unit} />
                          <b>{unit.name}</b>
                          <span>{unit.role} · {unit.attributes.join(' / ')}</span>
                          <span className="formation-hp">HP {unit.hp}/{unit.maxHp}</span>
                          <HealthBar unit={unit} />
                          <i className={buffActive ? 'buff-active' : ''}>{buffActive ? 'ROW BUFF ACTIVE' : 'NO ROW BUFF'}</i>
                        </> : <>
                          <span className="empty-slot-mark">+</span>
                          <b>OPEN SLOT</b>
                          <span>{selectedTeamSwapId ? 'CLICK TO MOVE HERE' : 'SELECT A HERO'}</span>
                        </>}
                        {targetable && <strong className="slot-target-label">CLICK TO SWAP / MOVE HERE</strong>}
                      </button>
                      {unit && <button className="move-to-bench" disabled={teamIds.length <= 1} onClick={() => moveToBench(unit)}>MOVE TO BENCH</button>}
                    </article>
                  })}
                </div>
              </div>
              <aside className="team-bench">
                <header><b>RECRUITED BENCH</b><span>{roster.length - teamIds.length} available</span></header>
                <div className="bench-roster">{roster.filter((unit) => !teamIds.includes(unit.id)).map((unit) => <article className={`bench-card ${selectedTeamSwapId === unit.id ? 'swap-selected' : ''}`} key={unit.id}>
                  <button className="bench-hero-select" onClick={() => chooseTeamMember(unit)} aria-pressed={selectedTeamSwapId === unit.id}>
                    <Avatar unit={unit} compact />
                    <span><b>{unit.name}</b><small>{unit.role} · {unit.attributes.join(' / ')}</small><small>HP {unit.hp}/{unit.maxHp} · PHY {unit.physAtk} · MAG {unit.magAtk}</small></span>
                  </button>
                  <button className="bench-swap-button" onClick={() => swapInBench(unit)}>{teamIds.length < 5 ? 'SWAP IN' : 'SELECT TO SWAP'}</button>
                </article>)}</div>
              </aside>
            </div> : <div className="team-enemies">{enemies.length ? enemies.map((unit) => <article key={unit.id}><Avatar unit={unit} compact /><span><b>{unit.name}</b><small>{unit.role} · {unit.attributes.join(' / ')} · {unit.hp}/{unit.maxHp} HP</small><small>PHY ATK {unit.physAtk} · MAG ATK {unit.magAtk} · DEF {unit.def} · SPD {unit.spd}</small><small>PASSIVE · {unit.ability}</small><small>BASIC · {unit.skills[0].name} — {unit.skills[0].description}</small><small>ULTIMATE · {unit.skills[3].name} — {unit.skills[3].description}</small></span></article>) : <p className="dialog-description">There are no enemies at this camp.</p>}</div>}
            <div className="team-modal-hint">Close with X, Escape, or outside the panel. Formation changes are saved immediately.</div>
          </>}
        </section>
      </div>}

      {cutIn && <div className={`ultimate-cutin ${cutIn.isBoss ? 'boss-cutin' : ''}`}><div className="cutin-flash" /><UnitSprite unit={cutIn} combat facing={cutIn.isBoss || cutIn.isMinion ? 'left' : 'right'} /><div><span>{cutIn.isBoss ? 'BOSS ULTIMATE' : 'HEROIC ULTIMATE'}</span><h2>{cutIn.name}</h2><b>{cutIn.skills[3].name}</b></div><i>✦</i></div>}
    </main>
  )
}

export default App
