import { useEffect, useState } from 'react'
import {
  ArrowLeft, Backpack, ChevronRight, Coins, Heart, Plus,
  Shield, ShoppingBag, Sparkles, Swords, UsersRound, X,
} from 'lucide-react'
import './App.css'
import { assetMap } from './data/assetMap'
import { BIRTHDAY_CONFIG } from './data/birthdayConfig'
import { createEnemy } from './data/enemies'
import { heroes, recruits } from './data/heroes'
import { shopItems, applyItem, type ItemId } from './data/items'
import { actNames, stages, type Stage } from './data/stages'
import {
  addStatus, calculateDamage, chargeGauge, expireStageBuffs, formationBonus,
  getTargetId, sortBySpeed, tickStatuses, type FloatingText, type Skill, type Unit,
} from './engine/combat'

type Modal = 'shop' | 'team' | 'items' | 'details' | 'hostage' | 'camp' | null
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

function Avatar({ unit, compact = false, combat = false }: { unit: Unit; compact?: boolean; combat?: boolean }) {
  const art = assetMap[unit.id.replace(/-\d+$/, '')] ?? { accent: '#d8b86e', glyph: '✦' }
  const sprite = combat ? art.combatIllustrationUrl : art.pixelSpriteUrl
  return (
    <span className={`avatar ${compact ? 'avatar-small' : ''} ${combat ? 'combat-avatar' : ''}`} style={{ '--avatar-accent': art.accent } as React.CSSProperties} aria-hidden="true">
      {sprite ? <img src={sprite} alt="" /> : combat ? <svg className="pixel-sprite" viewBox="0 0 64 64" shapeRendering="crispEdges">
        <path d="M7 57h18V45h8V36h8l10 8 7 11H43l-9-5H22v7H7z" fill="#171619" />
        <path d="M17 49h13v6H17zM36 44l9 5-4 5-9-5z" fill={art.accent} />
        <path d="M22 30h16v16H22z" fill={art.accent} />
        <path d="M25 18h15v14H25z" fill="#d3a887" />
        <path d="M23 15h19v8h-4v4h-5v-4h-7v4h-4z" fill={art.accent} />
        <path d="M35 26h3v2h-3zM27 27h4v2h-4z" fill="#171619" />
        <path d="M11 59h44v3H11z" fill={art.accent} opacity=".7" />
      </svg> : <svg className="pixel-sprite" viewBox="0 0 64 64" shapeRendering="crispEdges">
        <path d="M12 58h40v-7h-5V40h-4V29H21v11h-4v11h-5z" fill="#171619" />
        <path d="M18 53h7V42h4V30h-8v10h-3zM39 30h8v10h3v13h-7V42h-4z" fill={art.accent} />
        <path d="M25 42h14v11H25z" fill={art.accent} />
        <path d="M25 19h14v15H25z" fill="#d3a887" />
        <path d="M21 15h22v8h-4v4h-4v-4h-8v4h-4v-4h-2z" fill={art.accent} />
        <path d="M27 27h3v2h-3zM35 27h3v2h-3z" fill="#171619" />
        <path d="M20 39h5v5h-5zM39 39h5v5h-5zM29 36h6v2h-6z" fill="#eee1c8" />
        <path d="M28 46h3v7h-3zM35 46h3v7h-3z" fill="#211e20" />
        <path d="M10 58h44v3H10z" fill={art.accent} opacity=".7" />
      </svg>}
    </span>
  )
}

function AttributeBadge({ attributes }: { attributes: Unit['attributes'] }) {
  return <span className={`attribute-badge attr-${attributes[0].toLowerCase()}`}>{attributes.join(' · ')}</span>
}

function HealthBar({ unit }: { unit: Unit }) {
  const percent = Math.max(0, Math.min(100, unit.hp / unit.maxHp * 100))
  return <div className="health-track" aria-label={`${unit.hp} of ${unit.maxHp} health`}><span style={{ width: `${percent}%` }} /></div>
}

function StatusMarks({ unit }: { unit: Unit }) {
  if (!unit.statuses.length) return null
  const marks: Record<string, string> = { Burn: '🔥', Curse: '☠', Taunt: '⚑', Stealth: '◌', 'ATK Up': '↑', 'DEF Up': '⬟', 'DEF Down': '↓' }
  return <div className="status-marks">{unit.statuses.map((status) => <span key={status.kind} title={`${status.kind}, ${status.turns} turns`}>{marks[status.kind]}</span>)}</div>
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
  const [sold, setSold] = useState<ItemId[]>(saved?.sold ?? [])
  const [floating, setFloating] = useState<FloatingText[]>([])
  const [cutIn, setCutIn] = useState<Unit | null>(null)
  const [impact, setImpact] = useState<string | null>(null)
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
    setLog('Your party enters the Whispering Wilds.')
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
      const enemySkill = useUltimate ? enemy.skills[3] : enemy.skills[0]
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
          const damage = calculateDamage(enemy, target, enemySkill)
          const wounded = damage === 0 ? target : applyStatus({ ...target, hp: Math.max(0, target.hp - damage) }, enemySkill.effect)
          partyAfter = partyAfter.map((unit) => unit.id === target.id ? wounded : unit)
          texts.push({ id: Date.now() + Math.random(), targetId: target.id, text: damage ? `-${damage}` : 'DODGE', kind: damage ? 'damage' : 'status' })
        }
      })
      enemyAfter = enemyAfter.map((unit) => {
        if (unit.id !== enemy.id) return unit
        const acted = { ...unit, gauge: useUltimate ? [0, gauge[1], gauge[2]] as Unit['gauge'] : gauge }
        return enemySkill.selfEffect ? addStatus(acted, enemySkill.selfEffect) : acted
      })
      if (useUltimate && enemy.isBoss) setCutIn(enemy)
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
          <h1>THE ECLIPSE<br /><em>AWAKENS</em></h1>
          <p className="title-copy">Gather your companions. Break the ancient curse.<br />Write a legend worth celebrating.</p>
          <div className="starter-label"><span>01</span> CHOOSE YOUR FIRST COMPANION</div>
          <div className="starter-grid">
            {heroes.map((hero) => (
              <button className="starter-card" key={hero.id} onClick={() => beginRun(hero.id)}>
                <Avatar unit={hero} />
                <div className="starter-meta"><span className="starter-role">{hero.role} <b>·</b> {hero.attributes[0]}</span><strong>{hero.name}</strong><small>{hero.ability}</small><small className="starter-skill-names">{hero.skills.map((skill) => skill.name).join(' · ')}</small></div>
                <ChevronRight className="starter-arrow" size={16} />
              </button>
            ))}
          </div>
          {saved && <button className="resume-button" onClick={resumeSavedRun}>Continue your journey <ChevronRight size={15} /></button>}
        </section>
        <footer className="title-footer"><span>THREE ACTS · FIFTEEN STAGES · ONE UNFORGETTABLE DAY</span><span>✦ A tale made just for you ✦</span></footer>
      </main>
    )
  }

  if (!started && victory) {
    return (
      <main className="victory-screen">
        <div className="confetti-field" aria-hidden="true">{Array.from({ length: 44 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>
        <div className="victory-content"><div className="victory-seal"><Sparkles size={42} /></div><p className="eyebrow">THE FINAL ECLIPSE HAS FALLEN</p>
          <h1>HAPPY BIRTHDAY,<br /><em>{BIRTHDAY_CONFIG.recipientName.toUpperCase()}!</em></h1>
          <p className="victory-message">{BIRTHDAY_CONFIG.customMessage}</p>
          <div className="victory-summary"><span><Swords size={16} /> {turns} turns</span><span><UsersRound size={16} /> {party.length} companions</span><span><Coins size={16} /> {gold} gold earned</span></div>
          <div className="victory-party">{party.map((unit) => <div key={unit.id}><Avatar unit={unit} compact /><b>{unit.name}</b></div>)}</div>
          <button className="gold-button" onClick={() => { setStarted(false); setVictory(false); setStageNumber(1); setSaved(null); setRoster([]); setTeamIds([]); setLog('') }}>Begin another legend <ChevronRight size={16} /></button>
        </div>
      </main>
    )
  }

  const actStageRange = (act: number) => stages.filter((entry) => entry.act === act)
  const skillCost = (unit: Unit, index: number) => index === 0 ? 0 : unit.gauge[index - 1]

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="game-brand"><span className="brand-mark"><Sparkles size={15} /></span><span>MYTHIC <b>DUNGEON</b></span></div>
        <section className="stage-progress" aria-label="Stage progress">
          {[1, 2, 3].map((act) => <div className="act-track" key={act}>
            <span className="act-title">ACT 0{act} <i>{actNames[act - 1]}</i></span>
            <div className="stage-nodes">{actStageRange(act).map((entry) => (
              <span key={entry.number} aria-label={`Stage ${entry.number}: ${entry.title}`} title={`${entry.number}. ${entry.title}`}
                className={`stage-node ${entry.kind} ${entry.number === stageNumber ? 'current' : ''} ${entry.number < stageNumber || (!started && stageNumber === 15) ? 'complete' : ''}`}>
                <span>{entry.kind === 'boss' ? '♛' : entry.kind === 'camp' ? '✦' : entry.number < stageNumber ? '✓' : entry.number}</span>
              </span>
            ))}</div>
          </div>)}
        </section>
        <div className="top-tools"><div className="gold-counter"><Coins size={16} /><b>{gold}</b><small>G</small></div>
          <button className="wheel-button" title="Element wheel: opposing elements deal 2× damage. Dual opposing attributes cancel the weakness." onClick={() => setMessage('Opposing attributes deal 2× damage. Dual attributes cancel this weakness.')}>
            <span className="wheel-icon">✦</span><span className="wheel-copy">ATTRIBUTE<br />WHEEL</span>
          </button>
        </div>
      </header>

      <div className="act-scenery" data-act={stage.act}><span className="scenery-orb" /><span className="scenery-line one" /><span className="scenery-line two" /></div>

      <div className="battle-layout">
        <aside className="unit-sidebar hero-sidebar">
          <div className="sidebar-heading"><span>YOUR COMPANY</span><b>{party.length}/5</b></div>
          <div className="unit-list">
            {sortBySpeed(party).map((unit) => {
              const order = turnOrder.findIndex((candidate) => candidate.id === unit.id) + 1
              const bonus = formationBonus(unit)
              return <button key={unit.id} className={`unit-card hero-unit ${activeHero?.id === unit.id ? 'active' : ''} ${unit.hp <= 0 ? 'fallen' : ''}`} onClick={() => unit.hp > 0 && setActiveHeroId(unit.id)}>
                <div className="unit-card-top"><span className="turn-badge">{order ? `${order}${order === 1 ? 'st' : order === 2 ? 'nd' : order === 3 ? 'rd' : 'th'}` : '—'}</span><Avatar unit={unit} compact /><div className="unit-name-wrap"><b>{unit.name}</b><span>{unit.role} · {unit.row ?? 'Back'}</span></div><span className="unit-hp-value">{unit.hp}</span></div>
                <div className="unit-attributes"><AttributeBadge attributes={unit.attributes} /><span>ATK {unit.physAtk + unit.magAtk} · SPD {unit.spd}{bonus.phys || bonus.mag ? ' · +ATK' : bonus.def ? ' · +DEF' : bonus.heal ? ' · +HEAL' : ''}</span></div>
                <HealthBar unit={unit} /><StatusMarks unit={unit} />
              </button>
            })}
          </div>
          <button className="sidebar-link" onClick={() => setModal('team')}><UsersRound size={14} /> Edit formation <ChevronRight size={13} /></button>
        </aside>

        <section className={`arena ${attackMode ? 'attack-open' : ''} ${impact ? 'impact' : ''}`} data-impact={impact ?? undefined}>
          <div className="arena-topline"><span><i /> {actNames[stage.act - 1]}</span><b>STAGE {String(stage.number).padStart(2, '0')} <small>/ 15</small></b></div>
          <div className="arena-location"><span>✦</span><h2>{stage.title}</h2><p>{stage.description}</p></div>
          <div className="arena-ground"><span className="ground-ring ring-a" /><span className="ground-ring ring-b" /><span className="ground-horizon" /></div>
          <div className="battle-pads">
            <div className="formation player-formation"><span className="formation-label">ALLIES</span>
              {party.map((unit, index) => {
                const row = unit.row ?? 'Back'
                const targetType = selectedSkill === null ? null : activeHero?.skills[selectedSkill].target
                const validTarget = targetType === 'ally' || targetType === 'all-allies'
                const rowIndex = party.filter((member) => (member.row ?? 'Back') === row).findIndex((member) => member.id === unit.id)
                const positions = row === 'Front'
                  ? [{ left: '28%', top: '67%' }, { left: '62%', top: '79%' }]
                  : [{ left: '13%', top: '37%' }, { left: '48%', top: '44%' }, { left: '27%', top: '18%' }]
                return <button key={unit.id} className={`arena-unit ally-pixel row-${row.toLowerCase()} ${unit.hp <= 0 ? 'fallen' : ''} ${activeHero?.id === unit.id ? 'selected' : ''} ${selectedSkill !== null && validTarget && unit.hp > 0 ? 'target-valid' : ''}`} style={{ '--unit-index': index, '--unit-accent': assetMap[unit.id]?.accent ?? '#d8b86e', ...positions[rowIndex % positions.length] } as React.CSSProperties} onClick={() => selectedSkill !== null ? chooseTarget(unit) : unit.hp > 0 && setActiveHeroId(unit.id)} title={`${unit.name} · ${unit.role} · ${unit.hp}/${unit.maxHp} HP`}>
                <Avatar unit={unit} compact /><span className="arena-unit-name">{unit.name}</span><span className="arena-unit-hp">{unit.hp}</span>
                {floating.filter((text) => text.targetId === unit.id).map((text) => <span key={text.id} className={`float-number ${text.kind}`}>{text.text}</span>)}
              </button>
              })}
              <span className="pad-dot dot-f1" /><span className="pad-dot dot-f2" /><span className="pad-dot dot-b1" /><span className="pad-dot dot-b2" /><span className="pad-dot dot-b3" />
            </div>
            <div className="battle-divider"><span>VS</span></div>
            <div className="formation enemy-formation"><span className="formation-label">FOES</span>
              {enemies.filter((unit) => unit.hp > 0).map((unit, index) => <button key={unit.id} className={`arena-unit enemy-pixel ${unit.isBoss ? 'boss-pixel' : ''} ${selectedEnemyId === unit.id ? 'selected' : ''} ${selectedSkill !== null && (activeHero?.skills[selectedSkill].target === 'enemy' || activeHero?.skills[selectedSkill].target === 'all-enemies') ? 'target-valid' : ''}`} style={{ '--unit-index': index, '--unit-accent': assetMap[unit.id.replace(/-\d+$/, '')]?.accent ?? '#e59a65' } as React.CSSProperties} onClick={() => chooseTarget(unit)} title={`${unit.name} · ${unit.hp}/${unit.maxHp} HP`}>
                <Avatar unit={unit} compact /><span className="arena-unit-name">{unit.name}</span><span className="arena-unit-hp">{unit.hp}</span>
                {floating.filter((text) => text.targetId === unit.id).map((text) => <span key={text.id} className={`float-number ${text.kind}`}>{text.text}</span>)}
              </button>)}
              <span className="pad-dot dot-f1" /><span className="pad-dot dot-f2" /><span className="pad-dot dot-b1" /><span className="pad-dot dot-b2" /><span className="pad-dot dot-b3" />
            </div>
            {stage.kind === 'fight' && <div className="hostage-cage" title={`${stage.hostages} hostages await rescue`}><span className="cage-glow">✦</span><span className="cage-bars">╫╫╫</span><span className="cage-captives">{recruits.filter((unit) => !roster.some((hero) => hero.id === unit.id)).slice(0, stage.hostages).map((unit) => <Avatar key={unit.id} unit={unit} compact />)}</span><b>{stage.hostages}</b><small>HOSTAGE<br />CAGE</small></div>}
          </div>
          <div className="battle-log"><span>✦</span>{log}</div>
          {attackMode && <div className="combat-illustration"><Avatar unit={activeHero ?? heroes[0]} combat /><span>{activeHero?.name}</span></div>}
          {attackMode && <div className="skill-deck">
            {activeHero?.skills.map((skill, index) => {
              const gauge = skillCost(activeHero, index)
              const ready = index === 0 || gauge >= skill.cost
              return <button className={`skill-card ${ready ? 'ready' : 'charging'} ${selectedSkill === index ? 'chosen' : ''} ${index === 3 ? 'ultimate-card' : ''}`} key={skill.name} onClick={() => selectSkill(index)} title={skill.description}>
                <span className="skill-level">{index === 0 ? 'BASIC' : index === 3 ? 'ULTIMATE' : `STAGE ${index}`}</span><span className="skill-cost">{index === 0 ? 'FREE' : <>{gauge}<i> / {skill.cost}</i></>}</span><b>{skill.name}</b><small>{skill.description}</small><span className="gauge-track"><i style={{ width: `${index === 0 ? 100 : Math.min(100, gauge / skill.cost * 100)}%` }} /></span>
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
                <div className="unit-card-top"><span className="turn-badge">{order ? `${order}${order === 1 ? 'st' : order === 2 ? 'nd' : order === 3 ? 'rd' : 'th'}` : '—'}</span><Avatar unit={unit} compact /><div className="unit-name-wrap"><b>{unit.name}</b><span>{unit.isBoss ? 'Act Boss' : unit.role}</span></div><span className="unit-hp-value">{unit.hp}</span></div>
                <div className="unit-attributes"><AttributeBadge attributes={unit.attributes} /><span>ATK {unit.physAtk + unit.magAtk} · SPD {unit.spd}</span></div>
                <HealthBar unit={unit} /><StatusMarks unit={unit} />
              </button>
            })}
          </div>
          <div className="enemy-inspect-hint"><Sparkles size={13} /> Select an enemy to inspect</div>
        </aside>
      </div>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && modal !== 'hostage' && modal !== 'camp') setModal(null) }}>
        <section className={`dialog ${modal === 'details' ? 'details-dialog' : ''}`} role="dialog" aria-modal="true">
          <button className="dialog-close" onClick={() => modal !== 'hostage' && modal !== 'camp' && setModal(null)} aria-label="Close"><X size={18} /></button>
          {modal === 'details' && enemyDetails && <><div className="dialog-kicker">ENEMY INTELLIGENCE</div><div className="detail-hero"><Avatar unit={enemyDetails} /><div><AttributeBadge attributes={enemyDetails.attributes} /><h2>{enemyDetails.name}</h2><span>{enemyDetails.isBoss ? 'Act Boss' : enemyDetails.role}</span></div></div><p className="dialog-description">{enemyDetails.ability}</p><div className="detail-stats"><span><Heart size={14} /> HP <b>{enemyDetails.hp}/{enemyDetails.maxHp}</b></span><span><Swords size={14} /> ATK <b>{enemyDetails.physAtk + enemyDetails.magAtk}</b></span><span><Shield size={14} /> DEF <b>{enemyDetails.def}</b></span><span><Sparkles size={14} /> SPD <b>{enemyDetails.spd}</b></span></div><div className="enemy-ult"><span>ULTIMATE GAUGE</span><div className="gauge-track"><i style={{ width: `${Math.min(100, enemyDetails.gauge[0] / 4 * 100)}%` }} /></div><b>{enemyDetails.gauge[0]}/4</b></div><button className="gold-button" onClick={() => setModal(null)}>Understood</button></>}
          {modal === 'camp' && <><div className="dialog-icon"><Sparkles size={24} /></div><div className="dialog-kicker">A MOMENT OF RESPITE</div><h2>{stage.title}</h2><p className="dialog-description">The road is quiet. How will your party spend this pause?</p><div className="camp-choices"><button onClick={() => chooseCamp('rest')}><Heart size={19} /><b>Rest at Campfire</b><span>Heal 50% HP and revive fallen heroes.</span></button><button onClick={() => chooseCamp('scavenge')}><Coins size={19} /><b>Scavenge Treasure</b><span>Find 100 gold for your journey.</span></button></div></>}
          {modal === 'hostage' && <><div className="dialog-icon"><Sparkles size={24} /></div><div className="dialog-kicker">A CAGE UNLOCKED</div><h2>Someone needs a new party.</h2><p className="dialog-description">Freed companion {activeStage.hostages - hostagesLeft + 1} of {activeStage.hostages}. Make room in your roster or take the reward.</p><div className="hostage-recruit"><Avatar unit={recruits.find((unit) => !roster.some((hero) => hero.id === unit.id)) ?? heroes[0]} /><div><b>{recruits.find((unit) => !roster.some((hero) => hero.id === unit.id))?.name ?? 'A grateful traveler'}</b><span>New companion · full details in Team</span></div></div><div className="dialog-actions"><button className="gold-button" onClick={() => chooseHostage(true)}><Plus size={15} /> Recruit to Roster</button><button className="outline-button" onClick={() => chooseHostage(false)}><Coins size={15} /> Accept 60 Gold</button></div></>}
          {modal === 'shop' && <><div className="dialog-kicker">THE WAYFARER’S STALL · STAGE {stageNumber}</div><h2>Useful things, fair prices.</h2><p className="dialog-description">Stock refreshes at every stage. Supplies last until used.</p><div className="shop-list">{shopItems.map((item) => <div className="shop-row" key={item.id}><span className="shop-item-icon"><Sparkles size={16} /></span><div><b>{item.name}</b><small>{item.description}</small></div><button disabled={gold < item.cost || sold.includes(item.id)} onClick={() => buyItem(item.id)}>{sold.includes(item.id) ? 'SOLD' : <><Coins size={13} /> {item.cost}</>}</button></div>)}</div><div className="dialog-foot"><span><Coins size={14} /> Purse</span><b>{gold} G</b></div></>}
          {modal === 'items' && <><div className="dialog-kicker">YOUR PACK</div><h2>Carry a little magic.</h2><p className="dialog-description">{selectedUnitForItem === 'choose' ? `Choose a hero for ${pendingItem?.replaceAll('-', ' ') ?? 'this item'}.` : 'Select an item to use during this stage.'}</p><div className="inventory-list">{shopItems.map((item) => <button key={item.id} disabled={items[item.id] < 1} className="inventory-row" onClick={() => handleInventoryItem(item.id)}><span className="inventory-count">{items[item.id]}</span><span><b>{item.name}</b><small>{item.description}</small></span><ChevronRight size={15} /></button>)}</div>{selectedUnitForItem && <div className="item-targets"><b>USE ON</b>{party.map((unit) => <button key={unit.id} disabled={pendingItem === 'revive-feather' ? unit.hp > 0 : unit.hp <= 0} onClick={() => { setSelectedUnitForItem(unit.id); setMessage(`${unit.name} selected.`) }} className={selectedUnitForItem === unit.id ? 'picked' : ''}><Avatar unit={unit} compact />{unit.name} <small>{unit.hp}/{unit.maxHp}</small></button>)}</div>}</>}
          {modal === 'team' && <><div className="dialog-kicker">COMPANY & FORMATION</div><h2>Every legend needs a team.</h2><p className="dialog-description">Select a squad member to change rows. Select a bench hero, then a squad member, to swap.</p><div className="formation-summary"><span>FRONT <small>Tank +25% DEF · Assassin +20% ATK</small></span><span>BACK <small>Attacker +20% ATK · Mage +20% MATK · Healer +25% heal</small></span></div><div className="team-roster">{roster.map((unit) => { const inTeam = teamIds.includes(unit.id); const bonus = formationBonus(unit); return <button key={unit.id} className={`team-member ${inTeam ? 'in-team' : ''} ${selectedTeamSwapId === unit.id ? 'swap-selected' : ''} ${unit.hp <= 0 ? 'fallen' : ''}`} onClick={() => chooseTeamMember(unit)}><Avatar unit={unit} compact /><span className="team-member-info"><b>{unit.name}</b><small>{unit.role} · {unit.attributes.join('/')}</small><small>Passive: {unit.ability}</small><small>Skills: {unit.skills.map((skill) => skill.name).join(' · ')}</small></span><span className="team-member-stats">HP {unit.hp}/{unit.maxHp}<small>ATK {unit.physAtk + unit.magAtk} · DEF {unit.def} · SPD {unit.spd}</small>{inTeam && <i>{unit.row} {bonus.phys ? '· +20% ATK' : bonus.def ? '· +25% DEF' : bonus.mag ? '· +20% MATK' : bonus.heal ? '· +25% heal' : ''}</i>}</span><span className="team-marker">{inTeam ? 'IN PARTY' : 'BENCH'}</span></button> })}</div><div className="dialog-actions"><button className="gold-button" onClick={() => { setModal(null); setSelectedTeamSwapId(null) }}>Done · {teamIds.length}/5 <ChevronRight size={15} /></button></div></>}
          {modal === 'team' && <div className="team-enemies"><b>CURRENT ENEMIES</b>{enemies.map((unit) => <div key={unit.id}><Avatar unit={unit} compact /><span><b>{unit.name}</b><small>{unit.role} · {unit.attributes.join(' / ')} · {unit.hp}/{unit.maxHp} HP</small><small>ATK {unit.physAtk + unit.magAtk} · DEF {unit.def} · SPD {unit.spd} · {unit.ability}</small><small>{unit.skills.map((skill) => skill.name).join(' · ')}</small></span></div>)}</div>}
        </section>
      </div>}

      {cutIn && <div className={`ultimate-cutin ${cutIn.isBoss ? 'boss-cutin' : ''}`}><div className="cutin-flash" /><Avatar unit={cutIn} /><div><span>{cutIn.isBoss ? 'ANCIENT POWER AWAKENS' : 'HEROIC ULTIMATE'}</span><h2>{cutIn.name}</h2><b>{cutIn.skills[3].name}</b></div><i>✦</i></div>}
    </main>
  )
}

export default App
