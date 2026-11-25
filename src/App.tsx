import { useEffect, useState } from 'react'
import {
  ArrowLeft, Backpack, ChevronRight, Coins, Heart, Plus,
  Shield, ShoppingBag, Sparkles, Swords, UsersRound, X,
} from 'lucide-react'
import './App.css'
import { assetMap, DUNGEON_BACKGROUNDS } from './data/assetMap'
import { BIRTHDAY_CONFIG } from './data/birthdayConfig'
import { createEnemy } from './data/enemies'
import { heroes, recruits } from './data/heroes'
import { shopItems, applyItem, type ItemId } from './data/items'
import { stages, type Stage } from './data/stages'
import {
  addStatus, calculateDamage, chargeGauge, expireStageBuffs, formationBonus,
  getTargetId, sortBySpeed, tickStatuses, type FloatingText, type Skill, type Unit,
} from './engine/combat'

type Modal = 'shop' | 'team' | 'items' | 'details' | 'hostage' | 'camp' | null
type TeamTab = 'squad' | 'enemies'
type SavedRun = {
  stageNumber: number
  gold: number
  roster: Unit[]
  teamIds: string[]
  items: Record<ItemId, number>
  turns: number
  enemies?: Unit[]
  hostagesLeft?: number
  enemyTurnIndex?: number
  sold?: ItemId[]
}
const initialItems: Record<ItemId, number> = {
  'healing-potion': 1, 'cleanse-herb': 0, 'valor-tonic': 0, 'ironbark-draught': 0, 'revive-feather': 0,
}

function randomEnemyGroup(stage: Stage) {
  return stage.enemies.map((id, index) => createEnemy(id, index))
}

function makeDefaultParty(starterId: string): { roster: Unit[]; teamIds: string[] } {
  const roster = heroes.map((unit) => ({ ...unit, statuses: [], gauge: [0, 0, 0] as Unit['gauge'], passiveUsed: false, row: unit.id === 'bram' || unit.id === 'kaelen' ? 'Front' as const : 'Back' as const }))
  const ordered = [starterId, ...roster.map((unit) => unit.id).filter((id) => id !== starterId)]
  return { roster: ordered.map((id) => roster.find((unit) => unit.id === id)!), teamIds: ordered }
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

function UnitSprite({ unit, compact = false, combat = false }: { unit: Unit; compact?: boolean; combat?: boolean }) {
  const assetId = unit.id.replace(/-\d+$/, '')
  const art = assetMap[assetId] ?? { accent: '#C9A45C', glyph: '✦', scale: 1, footOffsetPx: 4 }
  const sprite = combat ? art.combatIllustrationUrl : art.pixelSpriteUrl
  const [failedSprite, setFailedSprite] = useState<string | null>(null)
  const failed = failedSprite === sprite
  const boss = assetId.startsWith('boss-')
  const dragon = assetId.startsWith('minidragon-')
  const accent = art.accent
  const ink = '#171a20'
  return (
    <span className={`avatar ${compact ? 'avatar-small' : ''} ${combat ? 'combat-avatar' : ''} ${boss ? 'sprite-boss' : ''} ${dragon ? 'sprite-dragon' : ''}`} style={{ '--avatar-accent': accent, '--sprite-scale': art.scale } as React.CSSProperties} aria-hidden="true">
      {sprite && !failed && <img src={sprite} alt="" onError={(event) => setFailedSprite(event.currentTarget.getAttribute('src') ?? '')} />}
      {(!sprite || failed) && <svg className="pixel-sprite procedural-sprite" viewBox="0 0 120 150" shapeRendering="crispEdges" aria-hidden="true">
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

function StatusMarks({ unit }: { unit: Unit }) {
  if (!unit.statuses.length) return null
  const marks: Record<string, string> = { Burn: 'BRN', Curse: 'CUR', Taunt: 'TAU', Stealth: 'STL', 'ATK Up': 'ATK+', 'DEF Up': 'DEF+', 'DEF Down': 'DEF−' }
  return <div className="status-marks">{unit.statuses.map((status) => <span key={status.kind} title={`${status.kind}, ${status.turns} turns`}>{marks[status.kind]}</span>)}</div>
}

function FormationPad({
  side,
  units,
  activeHeroId,
  selectedEnemyId,
  targetType,
  floating,
  animatingUnitId,
  onSelect,
}: {
  side: 'heroes' | 'enemies'
  units: Unit[]
  activeHeroId: string | null
  selectedEnemyId: string | null
  targetType: Skill['target'] | null
  floating: FloatingText[]
  animatingUnitId: string | null
  onSelect: (unit: Unit) => void
}) {
  const isEnemyPad = side === 'enemies'
  const livingUnits = units.filter((unit) => unit.hp > 0)
  const placed = livingUnits.map((unit, index) => {
    const row = isEnemyPad ? (index < 2 ? 'Front' : 'Back') : unit.row ?? 'Back'
    const rowIndex = livingUnits.filter((candidate, candidateIndex) => {
      const candidateRow = isEnemyPad ? (candidateIndex < 2 ? 'Front' : 'Back') : candidate.row ?? 'Back'
      return candidateRow === row
    }).findIndex((candidate) => candidate.id === unit.id)
    const coordinates = row === 'Front'
      ? [{ x: 27, y: 76 }, { x: 72, y: 78 }]
      : [{ x: 12, y: 43 }, { x: 50, y: 40 }, { x: 88, y: 43 }]
    const position = coordinates[rowIndex % coordinates.length]
    return { unit, row, position }
  })

  return (
    <div className={`formation-pad ${isEnemyPad ? 'enemy-formation' : 'player-formation'}`}>
      <div className="pad-heading">{isEnemyPad ? 'HOSTILE FORMATION' : 'YOUR FORMATION'}</div>
      <div className="pad-row-label front-row-label"><Shield size={12} /> FRONT ROW</div>
      <div className="pad-row-label back-row-label"><Sparkles size={12} /> BACK ROW</div>
      <div className="formation-lane-divider" />
      {[
        { row: 'Front', positions: [{ x: 27, y: 76 }, { x: 72, y: 78 }] },
        { row: 'Back', positions: [{ x: 12, y: 43 }, { x: 50, y: 40 }, { x: 88, y: 43 }] },
      ].flatMap(({ row, positions }) => positions.map((position, index) => (
        <span key={`${row}-${index}`} className={`pad-circle circle-${row.toLowerCase()}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} />
      )))}
      {placed.map(({ unit, row, position }) => {
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
            className={`pad-unit ${isEnemyPad ? 'foe-unit' : 'ally-unit'} ${unit.isBoss ? 'boss-unit' : ''} ${roleMatch ? 'row-bonus' : ''} ${activeHeroId === unit.id || selectedEnemyId === unit.id ? 'selected' : ''} ${isValidTarget ? 'target-valid' : ''} ${animatingUnitId === unit.id ? 'animating' : ''}`}
            style={{ left: `${position.x}%`, top: `${position.y}%`, '--unit-accent': asset?.accent ?? '#C9A45C', '--foot-offset': `${asset?.footOffsetPx ?? 4}px`, '--sprite-scale': asset?.scale ?? 1 } as React.CSSProperties}
            onClick={() => onSelect(unit)}
            title={`${unit.name} · ${unit.role} · ${unit.hp}/${unit.maxHp} HP`}
            aria-label={`Inspect ${unit.name}, ${unit.hp} of ${unit.maxHp} health`}
          >
            <span className={`pad-circle-marker circle-${row.toLowerCase()} ${roleMatch ? 'buffed' : ''}`} />
            <span className="sprite-anchor"><UnitSprite unit={unit} compact /></span>
            <span className="pad-unit-name">{unit.name}</span>
            <span className="pad-unit-health">{unit.hp}</span>
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
      return raw ? JSON.parse(raw) as SavedRun : null
    } catch (error) {
      console.error('Unable to load the saved dungeon run.', error)
      return null
    }
  })
  const [started, setStarted] = useState(false)
  const [victory, setVictory] = useState(false)
  const [stageNumber, setStageNumber] = useState(saved?.stageNumber ?? 1)
  const [gold, setGold] = useState(saved?.gold ?? 60)
  const [roster, setRoster] = useState<Unit[]>(saved?.roster ?? [])
  const [teamIds, setTeamIds] = useState<string[]>(saved?.teamIds ?? [])
  const [enemies, setEnemies] = useState<Unit[]>([])
  const [items, setItems] = useState<Record<ItemId, number>>(saved?.items ?? initialItems)
  const [turns, setTurns] = useState(saved?.turns ?? 0)
  const [enemyTurnIndex, setEnemyTurnIndex] = useState(0)
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null)
  const [attackMode, setAttackMode] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [hostagesLeft, setHostagesLeft] = useState(0)
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null)
  const [selectedUnitForItem, setSelectedUnitForItem] = useState<string | null>(null)
  const [pendingItem, setPendingItem] = useState<ItemId | null>(null)
  const [selectedTeamSwapId, setSelectedTeamSwapId] = useState<string | null>(null)
  const [teamTab, setTeamTab] = useState<TeamTab>('squad')
  const [sold, setSold] = useState<ItemId[]>(saved?.sold ?? [])
  const [floating, setFloating] = useState<FloatingText[]>([])
  const [cutIn, setCutIn] = useState<Unit | null>(null)
  const [impact, setImpact] = useState<string | null>(null)
  const [animatingUnitId, setAnimatingUnitId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [log, setLog] = useState('Choose Attack to take your turn.')

  const party = teamIds.map((id) => roster.find((unit) => unit.id === id)).filter((unit): unit is Unit => Boolean(unit))
  const livingParty = party.filter((unit) => unit.hp > 0)
  const turnOrder = sortBySpeed([...livingParty, ...enemies.filter((unit) => unit.hp > 0)])
  const activeHero = livingParty.find((unit) => unit.id === activeHeroId) ?? livingParty[0]
  const activeStage = stages[Math.min(stageNumber - 1, stages.length - 1)]
  const stage = activeStage
  const enemyDetails = enemies.find((unit) => unit.id === selectedEnemyId)

  useEffect(() => {
    if (started && roster.length) {
      const next = { stageNumber, gold, roster, teamIds, items, turns, enemies, hostagesLeft, enemyTurnIndex, sold }
      localStorage.setItem('mythic-dungeon-save', JSON.stringify(next))
    }
  }, [started, stageNumber, gold, roster, teamIds, items, turns, enemies, hostagesLeft, enemyTurnIndex, sold])

  useEffect(() => {
    if (!floating.length) return
    const timer = window.setTimeout(() => setFloating([]), 1200)
    return () => window.clearTimeout(timer)
  }, [floating])

  useEffect(() => {
    if (!cutIn) return
    const timer = window.setTimeout(() => setCutIn(null), 1900)
    return () => window.clearTimeout(timer)
  }, [cutIn])

  const addFloats = (texts: FloatingText[]) => setFloating((current) => [...current, ...texts])
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
    setEnemyTurnIndex(0)
    setItems(initialItems)
    setEnemies(randomEnemyGroup(stages[0]))
    setSold([])
    setStarted(true)
    setVictory(false)
    setActiveHeroId(starterId)
    setLog(`Your party enters the ${stages[0].areaName}.`)
  }

  const applyStatus = (target: Unit, effect?: Skill['effect'], duration = 2) =>
    effect ? (Array.isArray(effect) ? effect : [effect]).reduce((unit, kind) => addStatus(unit, kind, duration), target) : target

  const executePlayerSkill = (skillIndex: number, targetId?: string) => {
    if (!activeHero || activeHero.hp <= 0) return
    const actor = roster.find((unit) => unit.id === activeHero.id) ?? activeHero
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
    const lyraBonus = actor.id === 'lyra' && skill.attribute === 'Ice' && !actor.passiveUsed && skill.type !== 'heal'

    targets.forEach((target) => {
      if (skill.type === 'heal') {
        const healingReduction = target.statuses.some((status) => status.kind === 'Curse') ? 0.5 : 1
        const amount = Math.max(0, Math.round(target.maxHp * skill.power / 100 * (1 + bonus.heal) * healingReduction))
        const healed = Math.min(target.maxHp, target.hp + amount)
        const nextTarget = applyStatus({ ...target, hp: healed }, skill.effect, skillDuration)
        if (party.some((unit) => unit.id === target.id)) updatedRoster = updatedRoster.map((unit) => unit.id === target.id ? nextTarget : unit)
        else updatedEnemies = updatedEnemies.map((unit) => unit.id === target.id ? nextTarget : unit)
        texts.push({ id: Date.now() + Math.random(), targetId: target.id, text: `+${healed - target.hp}`, kind: 'heal' })
      } else {
        const passiveSkill = lyraBonus ? { ...skill, power: Math.round(skill.power * 1.25) } : skill
        const damage = calculateDamage(actor, target, passiveSkill, skill.type === 'physical' ? bonus.phys : bonus.mag)
        const nextTarget = damage === 0 ? target : applyStatus({ ...target, hp: Math.max(0, target.hp - damage) }, skill.effect, skillDuration)
        if (party.some((unit) => unit.id === target.id)) updatedRoster = updatedRoster.map((unit) => unit.id === target.id ? nextTarget : unit)
        else updatedEnemies = updatedEnemies.map((unit) => unit.id === target.id ? nextTarget : unit)
        texts.push({ id: Date.now() + Math.random(), targetId: target.id, text: damage === 0 ? 'DODGE' : `-${damage}`, kind: damage === 0 ? 'status' : 'damage' })
      }
    })

    const charged = chargeGauge(actor, skillIndex)
    const actorAfterCharge = { ...charged, passiveUsed: actor.passiveUsed || lyraBonus }
    const actorAfterSkill = skill.selfEffect ? addStatus(actorAfterCharge, skill.selfEffect) : actorAfterCharge
    updatedRoster = updatedRoster.map((unit) => unit.id === actor.id ? actorAfterSkill : unit)
    setRoster(updatedRoster)
    setEnemies(updatedEnemies)
    addFloats(texts)
    setTurns((value) => value + 1)
    setImpact(skill.attribute.toLowerCase())
    window.setTimeout(() => setImpact(null), 520)
    setAnimatingUnitId(actor.id)
    window.setTimeout(() => setAnimatingUnitId(null), 450)
    setIsResolving(true)
    const dramatic = skillIndex === 3 && !actor.isMinion
    if (dramatic) setCutIn(actor)
    setMessage(`${actor.name} used ${skill.name}.`)
    setSelectedSkill(null)
    setAttackMode(false)
    if (updatedEnemies.every((unit) => unit.hp <= 0)) {
      window.setTimeout(() => finishBattle(updatedEnemies, updatedRoster), dramatic ? 1200 : 550)
      return
    }
    const queue = sortBySpeed(updatedRoster.filter((unit) => teamIds.includes(unit.id) && unit.hp > 0))
    const currentIndex = queue.findIndex((unit) => unit.id === actor.id)
    const nextActor = queue[(currentIndex + 1) % Math.max(queue.length, 1)]
    window.setTimeout(() => {
      enemyTurn(updatedEnemies, updatedRoster)
      setIsResolving(false)
      if (nextActor) setActiveHeroId(nextActor.id)
    }, dramatic ? 1000 : 350)
  }

  const enemyTurn = (currentEnemies: Unit[], currentRoster: Unit[]) => {
    const aliveEnemies = currentEnemies.filter((unit) => unit.hp > 0)
    if (!aliveEnemies.length) return
    const actingEnemy = sortBySpeed(aliveEnemies)[enemyTurnIndex % aliveEnemies.length]
    setEnemyTurnIndex((current) => current + 1)
    let partyAfter = [...currentRoster]
    let enemyAfter = [...currentEnemies]
    const texts: FloatingText[] = []
    ;[actingEnemy].forEach((enemy) => {
      const targets = teamIds.map((id) => partyAfter.find((unit) => unit.id === id)).filter((unit): unit is Unit => unit !== undefined && unit.hp > 0)
      if (!targets.length) return
      const gauge = [enemy.gauge[0] + 1, enemy.gauge[1], enemy.gauge[2]] as Unit['gauge']
      const useUltimate = gauge[0] >= 4
      const isUmbral = enemy.id.startsWith('boss-eclipse-seraph') && Boolean(enemy.passiveUsed)
      const enemySkill = useUltimate ? enemy.skills[3] : isUmbral
        ? { ...enemy.skills[0], name: 'Eclipse Brand · Umbral', power: 205, attribute: 'Shadow' as const, type: 'physical' as const, target: 'enemy' as const, description: 'Umbral stance: a Shadow strike burns a single target.', effect: 'Burn' as const }
        : enemy.skills[0]
      const targetId = enemySkill.target === 'enemy' ? getTargetId(targets) : undefined
      const enemyTeamHeal = enemySkill.type === 'heal' && enemySkill.target === 'all-allies'
      const targetsForAction = enemyTeamHeal
        ? enemyAfter.filter((unit) => unit.hp > 0)
        : enemySkill.target === 'all-enemies' ? targets : targets.filter((unit) => unit.id === targetId)
      targetsForAction.forEach((target) => {
        if (enemySkill.type === 'heal') {
          const healingReduction = target.statuses.some((status) => status.kind === 'Curse') ? 0.5 : 1
          const heal = Math.round(target.maxHp * Math.max(enemySkill.power, 10) / 100 * healingReduction)
          if (enemyTeamHeal) enemyAfter = enemyAfter.map((unit) => unit.id === target.id ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + heal) } : unit)
          else partyAfter = partyAfter.map((unit) => unit.id === target.id ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + heal) } : unit)
          texts.push({ id: Date.now() + Math.random(), targetId: target.id, text: `+${heal}`, kind: 'heal' })
        } else {
          const broodCount = enemy.id.startsWith('boss-bone-dragon')
            ? enemyAfter.filter((unit) => unit.hp > 0 && unit.id.startsWith('minidragon-')).length
            : 0
          const attacker = broodCount
            ? { ...enemy, physAtk: Math.round(enemy.physAtk * (1 + broodCount * 0.12)), magAtk: Math.round(enemy.magAtk * (1 + broodCount * 0.12)) }
            : enemy
          const damage = calculateDamage(attacker, target, enemySkill)
          const wounded = damage === 0 ? target : applyStatus({ ...target, hp: Math.max(0, target.hp - damage) }, enemySkill.effect)
          partyAfter = partyAfter.map((unit) => unit.id === target.id ? wounded : unit)
          texts.push({ id: Date.now() + Math.random(), targetId: target.id, text: damage ? `-${damage}` : 'DODGE', kind: damage ? 'damage' : 'status' })
        }
      })
      enemyAfter = enemyAfter.map((unit) => {
        if (unit.id !== enemy.id) return unit
        const acted = {
          ...unit,
          gauge: useUltimate ? [0, gauge[1], gauge[2]] as Unit['gauge'] : gauge,
          passiveUsed: unit.id.startsWith('boss-eclipse-seraph') ? !unit.passiveUsed : unit.passiveUsed,
        }
        return enemySkill.selfEffect ? addStatus(acted, enemySkill.selfEffect) : acted
      })
      if (useUltimate && enemy.isBoss) setCutIn(enemy)
      setImpact(enemySkill.attribute.toLowerCase())
      window.setTimeout(() => setImpact(null), 520)
      setAnimatingUnitId(enemy.id)
      window.setTimeout(() => setAnimatingUnitId(null), 450)
      setLog(`${enemy.name} used ${enemySkill.name}.`)
    })
    partyAfter = partyAfter.map((unit) => {
      const ticked = tickStatuses(unit)
      if (ticked.damage) texts.push({ id: Date.now() + Math.random(), targetId: unit.id, text: `-${ticked.damage}`, kind: 'damage' })
      return ticked.unit
    })
    enemyAfter = enemyAfter.map((unit) => {
      const ticked = tickStatuses(unit)
      if (ticked.damage) texts.push({ id: Date.now() + Math.random(), targetId: unit.id, text: `-${ticked.damage}`, kind: 'damage' })
      return ticked.unit
    })
    setRoster(partyAfter)
    setEnemies(enemyAfter)
    addFloats(texts)
    if (enemyAfter.every((unit) => unit.hp <= 0)) {
      window.setTimeout(() => finishBattle(enemyAfter, partyAfter), 350)
      return
    }
    if (!partyAfter.some((unit) => teamIds.includes(unit.id) && unit.hp > 0)) {
      setLog('Your party is exhausted. Resting at camp to rise again.')
      setRoster((current) => current.map((unit) => unit.hp > 0 ? unit : { ...unit, hp: Math.round(unit.maxHp * 0.3) }))
    }
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
    if (stageNumber === 15) {
      setStarted(false)
      setVictory(true)
      setSaved(null)
      localStorage.removeItem('mythic-dungeon-save')
      setModal(null)
      setLog('The eclipse is broken. Happy Birthday!')
      return
    }
    if (activeStage.hostages > 0) {
      setHostagesLeft(activeStage.hostages)
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
      const available = recruits.find((unit) => !roster.some((hero) => hero.id === unit.id))
      if (available) {
        const newHero = { ...available, statuses: [], gauge: [0, 0, 0] as Unit['gauge'], row: teamIds.length < 2 ? 'Front' as const : 'Back' as const }
        updatedRoster = [...roster, newHero]
        setRoster(updatedRoster)
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
    if (teamIds.includes(unit.id)) {
      if (selectedTeamSwapId && !teamIds.includes(selectedTeamSwapId)) {
        setTeamIds((current) => current.map((id) => id === unit.id ? selectedTeamSwapId : id))
        updateRoster(selectedTeamSwapId, (hero) => ({ ...hero, row: unit.row ?? 'Back' }))
        setSelectedTeamSwapId(null)
        return
      }
      const targetRow = unit.row === 'Front' ? 'Back' : 'Front'
      const targetCapacity = targetRow === 'Front' ? 2 : 3
      const targetCount = party.filter((member) => member.row === targetRow).length
      if (targetCount >= targetCapacity) {
        setMessage(`${targetRow} row is full. Move a hero out first.`)
        return
      }
      updateRoster(unit.id, (hero) => ({ ...hero, row: targetRow }))
      return
    }
    if (teamIds.length < 5) {
      setTeamIds((current) => [...current, unit.id])
      updateRoster(unit.id, (hero) => ({ ...hero, row: teamIds.filter((id) => roster.find((member) => member.id === id)?.row === 'Front').length < 2 ? 'Front' : 'Back' }))
      setSelectedTeamSwapId(null)
      return
    }
    setSelectedTeamSwapId(unit.id)
  }

  const dropTeamMember = (target: Unit, sourceId: string) => {
    if (!teamIds.includes(target.id) || teamIds.includes(sourceId)) return
    const source = roster.find((unit) => unit.id === sourceId)
    if (!source) return
    if (teamIds.length < 5) {
      const frontCount = teamIds.filter((id) => roster.find((unit) => unit.id === id)?.row === 'Front').length
      setTeamIds((current) => [...current, source.id])
      updateRoster(source.id, (unit) => ({ ...unit, row: frontCount < 2 ? 'Front' : 'Back' }))
    } else {
      setTeamIds((current) => current.map((id) => id === target.id ? source.id : id))
      updateRoster(source.id, (unit) => ({ ...unit, row: target.row ?? 'Back' }))
    }
    setSelectedTeamSwapId(null)
  }

  const selectSkill = (index: number) => {
    if (!activeHero) return
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
      setSelectedEnemyId(unit.id)
      return
    }
    if (selectedSkill === null || !activeHero) {
      if (enemies.some((enemy) => enemy.id === unit.id)) {
        setSelectedEnemyId(unit.id)
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
    setHostagesLeft(saved.hostagesLeft ?? 0)
    setEnemyTurnIndex(saved.enemyTurnIndex ?? 0)
    setSold(saved.sold ?? [])
    setActiveHeroId(firstLivingHero(saved.roster, saved.teamIds)?.id ?? null)
    const resumeStage = stages[saved.stageNumber - 1]
    if ((saved.hostagesLeft ?? 0) > 0) {
      setEnemies(saved.enemies ?? [])
      setModal('hostage')
    } else if (resumeStage?.kind === 'camp') {
      setEnemies([])
      setModal('camp')
    } else if (resumeStage) setEnemies(saved.enemies?.length ? saved.enemies : randomEnemyGroup(resumeStage))
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
          <div className="starter-grid">
            {heroes.map((hero) => {
              const rowBonus = {
                Tank: 'FRONT · +25% DEF',
                Assassin: 'FRONT · +20% PHY ATK',
                Attacker: 'BACK · +20% PHY ATK',
                Mage: 'BACK · +20% MAG ATK',
                Healer: 'BACK · +25% HEAL',
              }[hero.role]
              return (
              <button className="starter-card" key={hero.id} onClick={() => beginRun(hero.id)}>
                <span className="starter-portrait"><Avatar unit={hero} /><span>{hero.attributes[0]}</span></span>
                <span className="starter-meta">
                  <span className="starter-role">{hero.role} <b>·</b> {hero.attributes[0]}</span>
                  <strong>{hero.name}</strong>
                  <small className="starter-passive"><b>PASSIVE</b> {hero.ability}</small>
                  <span className="starter-skill-list">{hero.skills.map((skill, index) => (
                    <small key={skill.name}><i>{index === 0 ? 'BASIC' : index === 3 ? 'ULT' : `S${index}`}</i>{skill.name}<b>{skill.power}%</b></small>
                  ))}</span>
                </span>
                <span className="starter-bonus">{rowBonus}<ChevronRight className="starter-arrow" size={16} /></span>
              </button>
              )
            })}
          </div>
          {saved && <button className="resume-button" onClick={resumeSavedRun}>Continue your journey <ChevronRight size={15} /></button>}
        </section>
        <footer className="title-footer"><span>SIX DUNGEON AREAS · FIFTEEN STAGES · ONE UNFORGETTABLE DAY</span><span>✦ A tale made just for you ✦</span></footer>
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
          <button className="gold-button" onClick={() => { setStarted(false); setVictory(false); setStageNumber(1); setSaved(null); setRoster([]); setTeamIds([]); setLog('') }}>Begin another legend <ChevronRight size={16} /></button>
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
          <div className="stage-segment-heading"><span>DESCENT TRACK</span><b>STAGE {stage.number} / 15</b><i>{stage.areaName}</i></div>
          <div className="stage-nodes">{segmentStages.map((entry) => (
              <span key={entry.number} aria-label={`Stage ${entry.number}: ${entry.title} · ${entry.kind}`} title={`${entry.number}. ${entry.title}`}
                className={`stage-node ${entry.kind} ${entry.number === stageNumber ? 'current' : ''} ${entry.number < stageNumber ? 'complete' : ''}`}>
                <span>{entry.kind === 'boss' ? '♛' : entry.kind === 'camp' ? '✦' : entry.number < stageNumber ? '✓' : entry.number}</span>
              </span>
          ))}</div>
        </section>
        <div className="top-tools"><div className="gold-counter"><Coins size={16} /><b>{gold}</b><small>GOLD</small></div>
          <button className="wheel-button" aria-label="Attribute wheel: Light and Shadow, Ice and Fire, Sound and Earth deal double damage when opposed; dual attributes cancel this weakness." title="Opposing attributes deal 2× damage. If a defender holds both attributes in a pair, the weakness cancels to 1×." onClick={() => setMessage('Light ↔ Shadow, Ice ↔ Fire, and Sound ↔ Earth deal 2× damage. Dual opposing attributes cancel to 1×.')}>
            <span className="wheel-icon">✦</span><span className="wheel-copy">LIGHT ↔ SHADOW<br />ICE ↔ FIRE · SOUND ↔ EARTH</span>
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
              return <button key={unit.id} className={`unit-card hero-unit ${activeHero?.id === unit.id ? 'active' : ''} ${unit.hp <= 0 ? 'fallen' : ''}`} onClick={() => unit.hp > 0 && setActiveHeroId(unit.id)}>
                <div className="unit-card-top"><span className="turn-badge">{order ? `${order}${order === 1 ? 'st' : order === 2 ? 'nd' : order === 3 ? 'rd' : 'th'}` : '—'}</span><Avatar unit={unit} compact /><div className="unit-name-wrap"><b>{unit.name}</b><span>{unit.role} · {unit.row ?? 'Back'}</span></div><span className="unit-hp-value">{unit.hp}/{unit.maxHp}</span></div>
                <div className="unit-attributes"><AttributeBadge attributes={unit.attributes} /><span>PHY {unit.physAtk} · MAG {unit.magAtk} · SPD {unit.spd}{bonus.phys || bonus.mag ? ' · ROW ATK' : bonus.def ? ' · ROW DEF' : bonus.heal ? ' · ROW HEAL' : ''}</span></div>
                <HealthBar unit={unit} /><StatusMarks unit={unit} />
              </button>
            })}
          </div>
          <button className="sidebar-link" onClick={() => setModal('team')}><UsersRound size={14} /> Edit formation <ChevronRight size={13} /></button>
        </aside>

        <section className={`arena ${attackMode ? 'attack-open' : ''} ${impact ? 'impact' : ''}`} data-impact={impact ?? undefined} data-area={stage.areaId}>
          <div className="arena-topline"><span><i /> {stage.areaName}</span><b>STAGE {String(stage.number).padStart(2, '0')} <small>/ 15</small></b></div>
          <div className="arena-location"><span>✦</span><h2>{stage.title}</h2><p>{stage.description}</p></div>
          <div className="battle-pads">
            <FormationPad side="heroes" units={party} activeHeroId={activeHero?.id ?? null} selectedEnemyId={selectedEnemyId} targetType={selectedSkill === null ? null : activeHero?.skills[selectedSkill].target ?? null} floating={floating} animatingUnitId={animatingUnitId} onSelect={chooseTarget} />
            <div className="battle-divider"><span>VS</span></div>
            <FormationPad side="enemies" units={enemies} activeHeroId={activeHero?.id ?? null} selectedEnemyId={selectedEnemyId} targetType={selectedSkill === null ? null : activeHero?.skills[selectedSkill].target ?? null} floating={floating} animatingUnitId={animatingUnitId} onSelect={chooseTarget} />
            {stage.kind === 'fight' && <div className="hostage-cage" title={`${stage.hostages} hostages await rescue`}><span className="cage-mark">✦</span><span className="cage-bars">╫╫╫</span><span className="cage-captives">{recruits.filter((unit) => !roster.some((hero) => hero.id === unit.id)).slice(0, stage.hostages).map((unit) => <Avatar key={unit.id} unit={unit} compact />)}</span><b>{stage.hostages}</b><small>HOSTAGE CAGE</small></div>}
          </div>
          <div className="battle-log"><span>✦</span>{log}</div>
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
                <span className="skill-scale"><i>{skill.type.toUpperCase()} · {skill.power}%</i><strong>{index === 0 ? 'FREE' : `${gauge}/${skill.cost}`}</strong></span>
                <small>{skill.description}</small>
                <span className="gauge-pips" aria-label={index === 0 ? 'Basic skill, no charge required' : `${gauge} of ${skill.cost} charges`}>
                  {Array.from({ length: Math.max(skill.cost, 1) }, (_, pip) => <i key={pip} className={index === 0 || pip < gauge ? 'filled' : ''} />)}
                </span>
              </button>
            })}
          </div>}
          <div className="bottom-actions">
            {attackMode ? <><button onClick={() => setModal('items')}><Backpack size={15} /> Items</button><button onClick={() => setModal('shop')}><ShoppingBag size={15} /> Shop</button><button className="back-action" onClick={() => { setAttackMode(false); setSelectedSkill(null) }}><ArrowLeft size={15} /> Back</button></>
              : <><button className="primary-action" disabled={isResolving || !livingParty.length} onClick={() => { setAttackMode(true); setSelectedSkill(null); setMessage(`${activeHero?.name ?? 'Your hero'} is ready. Choose a skill.`) }}><Swords size={16} /> {isResolving ? 'Resolving…' : 'Attack'}</button><button onClick={() => setModal('items')}><Backpack size={15} /> Items</button><button onClick={() => setModal('shop')}><ShoppingBag size={15} /> Shop</button><button onClick={() => setModal('team')}><UsersRound size={15} /> Team</button></>}
          </div>
        </section>

        <aside className="unit-sidebar enemy-sidebar">
          <div className="sidebar-heading"><span>ENEMY PARTY</span><b>{enemies.filter((unit) => unit.hp > 0).length}</b></div>
          <div className="unit-list">
            {sortBySpeed(enemies).map((unit) => {
              const order = turnOrder.findIndex((candidate) => candidate.id === unit.id) + 1
              return <button key={unit.id} className={`unit-card enemy-unit ${unit.hp <= 0 ? 'fallen' : ''}`} onClick={() => { setSelectedEnemyId(unit.id); setModal('details') }}>
                <div className="unit-card-top"><span className="turn-badge">{order ? `${order}${order === 1 ? 'st' : order === 2 ? 'nd' : order === 3 ? 'rd' : 'th'}` : '—'}</span><Avatar unit={unit} compact /><div className="unit-name-wrap"><b>{unit.name}</b><span>{unit.isBoss ? 'DUNGEON BOSS' : unit.role}</span></div><span className="unit-hp-value">{unit.hp}/{unit.maxHp}</span></div>
                <div className="unit-attributes"><AttributeBadge attributes={unit.attributes} /><span>PHY {unit.physAtk} · MAG {unit.magAtk} · SPD {unit.spd}</span></div>
                <HealthBar unit={unit} /><StatusMarks unit={unit} />
              </button>
            })}
          </div>
          <div className="enemy-inspect-hint"><Sparkles size={13} /> Select an enemy to inspect</div>
        </aside>
      </div>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && modal !== 'hostage' && modal !== 'camp') setModal(null) }}>
        <section className={`dialog ${modal === 'details' ? 'details-dialog' : ''} ${modal === 'camp' ? 'camp-dialog' : ''}`} role="dialog" aria-modal="true">
          <button className="dialog-close" onClick={() => modal !== 'hostage' && modal !== 'camp' && setModal(null)} aria-label="Close"><X size={18} /></button>
          {modal === 'details' && enemyDetails && <><div className="dialog-kicker">ENEMY INTELLIGENCE</div><div className="detail-hero"><Avatar unit={enemyDetails} /><div><AttributeBadge attributes={enemyDetails.attributes} /><h2>{enemyDetails.name}</h2><span>{enemyDetails.isBoss ? 'DUNGEON BOSS' : enemyDetails.role}</span></div></div><p className="dialog-description"><b>PASSIVE · </b>{enemyDetails.ability}</p><div className="detail-stats"><span><Heart size={14} /> HP <b>{enemyDetails.hp}/{enemyDetails.maxHp}</b></span><span><Swords size={14} /> PHY ATK <b>{enemyDetails.physAtk}</b></span><span><Sparkles size={14} /> MAG ATK <b>{enemyDetails.magAtk}</b></span><span><Shield size={14} /> DEF <b>{enemyDetails.def}</b></span><span><ChevronRight size={14} /> SPD <b>{enemyDetails.spd}</b></span></div>
            {enemyDetails.attributes.some((attribute) => [['Light', 'Shadow'], ['Ice', 'Fire'], ['Sound', 'Earth']].some((pair) => pair.includes(attribute) && pair.every((item) => enemyDetails.attributes.includes(item as Unit['attributes'][number])))) && <p className="dual-cancel-note">DUAL ATTRIBUTE · opposing weakness cancels to 1× damage.</p>}
            <div className="enemy-skill-details"><div><b>BASIC · {enemyDetails.skills[0].name}</b><small>{enemyDetails.skills[0].description}</small></div><div><b>ULTIMATE · {enemyDetails.skills[3].name}</b><small>{enemyDetails.skills[3].description}</small></div></div>
            <div className="enemy-ult"><span>ULTIMATE CHARGE</span><div className="gauge-track"><i style={{ width: `${Math.min(100, enemyDetails.gauge[0] / 4 * 100)}%` }} /></div><b>{enemyDetails.gauge[0]}/4</b></div><button className="gold-button" onClick={() => setModal(null)}>Understood</button></>}
          {modal === 'camp' && <><div className="campfire-scene"><DungeonBackdrop key="campfire-rest" areaId="campfire-rest" /><span>♨</span></div><div className="dialog-kicker">A MOMENT OF RESPITE · STAGE {stage.number}</div><h2>{stage.title}</h2><p className="dialog-description">The road is quiet. Choose how your party spends this pause.</p><div className="camp-choices"><button onClick={() => chooseCamp('rest')}><Heart size={19} /><b>Rest at Campfire</b><span>Heal the whole party by 50% and revive fallen heroes.</span></button><button onClick={() => chooseCamp('scavenge')}><Coins size={19} /><b>Claim Hidden Cache</b><span>Find 100 gold for your journey.</span></button></div></>}
          {modal === 'hostage' && <><div className="dialog-icon"><Sparkles size={24} /></div><div className="dialog-kicker">A CAGE UNLOCKED</div><h2>A new companion awaits.</h2><p className="dialog-description">Freed companion {activeStage.hostages - hostagesLeft + 1} of {activeStage.hostages}. Choose a place in your roster or accept 60 gold.</p>{(() => { const rescued = recruits.find((unit) => !roster.some((hero) => hero.id === unit.id)); return rescued ? <div className="hostage-recruit"><Avatar unit={rescued} /><div><b>{rescued.name}</b><span>{rescued.role} · {rescued.attributes.join(' / ')}</span><small>Passive: {rescued.ability}</small><small>{rescued.skills.map((skill) => skill.name).join(' · ')}</small></div></div> : <div className="hostage-recruit"><Avatar unit={heroes[0]} /><div><b>Your roster is complete</b><span>Accept gold to continue the descent.</span></div></div> })()}<div className="dialog-actions"><button className="gold-button" onClick={() => chooseHostage(true)}><Plus size={15} /> Recruit to Roster</button><button className="outline-button" onClick={() => chooseHostage(false)}><Coins size={15} /> Accept 60 Gold</button></div></>}
          {modal === 'shop' && <><div className="dialog-kicker">THE WAYFARER’S STALL · STAGE {stageNumber}</div><h2>Useful things, fair prices.</h2><p className="dialog-description">Stock refreshes at every stage. Supplies last until used.</p><div className="shop-list">{shopItems.map((item) => <div className="shop-row" key={item.id}><span className="shop-item-icon"><Sparkles size={16} /></span><div><b>{item.name}</b><small>{item.description}</small></div><button disabled={gold < item.cost || sold.includes(item.id)} onClick={() => buyItem(item.id)}>{sold.includes(item.id) ? 'SOLD' : <><Coins size={13} /> {item.cost}</>}</button></div>)}</div><div className="dialog-foot"><span><Coins size={14} /> Purse</span><b>{gold} G</b></div></>}
          {modal === 'items' && <><div className="dialog-kicker">YOUR PACK</div><h2>Carry a little magic.</h2><p className="dialog-description">{selectedUnitForItem === 'choose' ? `Choose a hero for ${pendingItem?.replaceAll('-', ' ') ?? 'this item'}.` : 'Select an item to use during this stage.'}</p><div className="inventory-list">{shopItems.map((item) => <button key={item.id} disabled={items[item.id] < 1} className="inventory-row" onClick={() => handleInventoryItem(item.id)}><span className="inventory-count">{items[item.id]}</span><span><b>{item.name}</b><small>{item.description}</small></span><ChevronRight size={15} /></button>)}</div>{selectedUnitForItem && <div className="item-targets"><b>USE ON</b>{party.map((unit) => <button key={unit.id} disabled={pendingItem === 'revive-feather' ? unit.hp > 0 : unit.hp <= 0} onClick={() => { setSelectedUnitForItem(unit.id); setMessage(`${unit.name} selected.`) }} className={selectedUnitForItem === unit.id ? 'picked' : ''}><Avatar unit={unit} compact />{unit.name} <small>{unit.hp}/{unit.maxHp}</small></button>)}</div>}</>}
          {modal === 'team' && <><div className="dialog-kicker">COMPANY & FORMATION</div><h2>Your team, your tactics.</h2><p className="dialog-description">Click a squad member to change rows. Select a bench hero and a squad member to swap; dragging also works.</p><div className="team-tabs" role="tablist" aria-label="Team manager sections"><button role="tab" aria-selected={teamTab === 'squad'} className={teamTab === 'squad' ? 'active' : ''} onClick={() => setTeamTab('squad')}>YOUR SQUAD & BENCH</button><button role="tab" aria-selected={teamTab === 'enemies'} className={teamTab === 'enemies' ? 'active' : ''} onClick={() => setTeamTab('enemies')}>STAGE ENEMIES ({enemies.length})</button></div>
            {teamTab === 'squad' ? <><div className="formation-summary"><span>FRONT ROW <small>Tank +25% DEF · Assassin +20% Physical ATK</small></span><span>BACK ROW <small>Attacker +20% Physical ATK · Mage +20% Magic ATK · Healer +25% Healing</small></span></div><div className="team-roster">{roster.map((unit) => { const inTeam = teamIds.includes(unit.id); const bonus = formationBonus(unit); return <button key={unit.id} draggable={!inTeam} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', unit.id); setSelectedTeamSwapId(unit.id) }} onDragOver={(event) => { if (inTeam) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); dropTeamMember(unit, event.dataTransfer.getData('text/plain')) }} className={`team-member ${inTeam ? 'in-team' : ''} ${selectedTeamSwapId === unit.id ? 'swap-selected' : ''} ${unit.hp <= 0 ? 'fallen' : ''}`} onClick={() => chooseTeamMember(unit)}><Avatar unit={unit} compact /><span className="team-member-info"><b>{unit.name}</b><small>{unit.role} · {unit.attributes.join('/')}</small><small>Passive: {unit.ability}</small><small>Skills: {unit.skills.map((skill) => skill.name).join(' · ')}</small></span><span className="team-member-stats">HP {unit.hp}/{unit.maxHp}<small>PHY {unit.physAtk} · MAG {unit.magAtk} · DEF {unit.def} · SPD {unit.spd}</small>{inTeam && <i>{unit.row} {bonus.phys ? '· +20% ATK' : bonus.def ? '· +25% DEF' : bonus.mag ? '· +20% MATK' : bonus.heal ? '· +25% heal' : '· no row bonus'}</i>}</span><span className="team-marker">{inTeam ? 'IN PARTY' : 'BENCH'}</span></button> })}</div></> : <div className="team-enemies">{enemies.length ? enemies.map((unit) => <article key={unit.id}><Avatar unit={unit} compact /><span><b>{unit.name}</b><small>{unit.role} · {unit.attributes.join(' / ')} · {unit.hp}/{unit.maxHp} HP</small><small>PHY ATK {unit.physAtk} · MAG ATK {unit.magAtk} · DEF {unit.def} · SPD {unit.spd}</small><small>PASSIVE · {unit.ability}</small><small>BASIC · {unit.skills[0].name} — {unit.skills[0].description}</small><small>ULTIMATE · {unit.skills[3].name} — {unit.skills[3].description}</small></span></article>) : <p className="dialog-description">There are no enemies at this camp.</p>}</div>}
            <div className="dialog-actions"><button className="gold-button" onClick={() => { setModal(null); setSelectedTeamSwapId(null) }}>Done · {teamIds.length}/5 <ChevronRight size={15} /></button></div></>}
        </section>
      </div>}

      {cutIn && <div className={`ultimate-cutin ${cutIn.isBoss ? 'boss-cutin' : ''}`}><div className="cutin-flash" /><UnitSprite unit={cutIn} combat /><div><span>{cutIn.isBoss ? 'BOSS ULTIMATE' : 'HEROIC ULTIMATE'}</span><h2>{cutIn.name}</h2><b>{cutIn.skills[3].name}</b></div><i>✦</i></div>}
    </main>
  )
}

export default App
