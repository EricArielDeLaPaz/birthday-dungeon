import type { Attribute, Role, Skill, Unit } from '../engine/combat'

const skill = (name: string, cost: number, power: number, attribute: Attribute, type: Skill['type'], target: Skill['target'], description: string, effect?: Skill['effect'], selfEffect?: Skill['selfEffect']): Skill =>
  ({ name, cost, power, attribute, type, target, description, effect, selfEffect })

const makeHero = (hero: Omit<Unit, 'statuses' | 'gauge'>): Unit => ({
  ...hero, statuses: [], gauge: [0, 0, 0],
})

const starter = (id: string, name: string, role: Role, attribute: Attribute, ability: string, stats: [number, number, number, number, number], skills: Unit['skills']): Unit =>
  makeHero({ id, name, role, attributes: [attribute], hp: stats[0], maxHp: stats[0], physAtk: stats[1], magAtk: stats[2], def: stats[3], spd: stats[4], ability, passive: ability, skills, art: id })

export const heroes: Unit[] = [
  starter('seraphina', 'Seraphina', 'Healer', 'Light', 'Dawn’s Grace · heals 10% HP after each victory', [118, 22, 38, 13, 30], [
    skill('Sunlit Bolt', 0, 95, 'Light', 'magic', 'enemy', 'A measured beam of dawn.'),
    skill('Mending Light', 2, 95, 'Light', 'heal', 'ally', 'Restore a single ally.', 'ATK Up'),
    skill('Radiant Chorus', 3, 70, 'Light', 'heal', 'all-allies', 'Restore the entire party.'),
    skill('Daybreak Benediction', 5, 125, 'Light', 'heal', 'all-allies', 'Massive party restoration and protection.', 'DEF Up'),
  ]),
  starter('kaelen', 'Kaelen', 'Assassin', 'Shadow', 'Umbral Step · begins each battle with Stealth', [104, 45, 20, 10, 47], [
    skill('Gloomfang', 0, 110, 'Shadow', 'physical', 'enemy', 'A swift shadow-laced strike.'),
    skill('Nightfall Cut', 2, 155, 'Shadow', 'physical', 'enemy', 'A focused execution blow.'),
    skill('Veilstep', 3, 95, 'Shadow', 'physical', 'all-enemies', 'Strike through every shadow.', undefined, 'Stealth'),
    skill('Eclipse Fang', 5, 230, 'Shadow', 'physical', 'enemy', 'A devastating single-target ambush.'),
  ]),
  starter('bram', 'Bram', 'Tank', 'Earth', 'Stoneheart · takes 15% less damage', [168, 32, 18, 24, 19], [
    skill('Granite Knuckle', 0, 105, 'Earth', 'physical', 'enemy', 'A reliable, heavy blow.'),
    skill('Faultline', 2, 125, 'Earth', 'physical', 'all-enemies', 'Rattle the whole enemy line.', undefined, 'Taunt'),
    skill('Bulwark Oath', 3, 0, 'Earth', 'heal', 'all-allies', 'Fortify the party.', 'DEF Up'),
    skill('Mountain’s Verdict', 5, 205, 'Earth', 'physical', 'enemy', 'An earth-shattering strike.'),
  ]),
  starter('lyra', 'Lyra', 'Mage', 'Ice', 'Frostweave · first Ice attack each battle deals +25%', [108, 19, 44, 11, 34], [
    skill('Frost Shard', 0, 105, 'Ice', 'magic', 'enemy', 'A sharp, precise ice spell.'),
    skill('Glacier Lance', 2, 160, 'Ice', 'magic', 'enemy', 'Pierce one target with glacial force.'),
    skill('Snowblind', 3, 105, 'Ice', 'magic', 'all-enemies', 'Sweep the field in frost.'),
    skill('Winter’s Crown', 5, 175, 'Ice', 'magic', 'all-enemies', 'A storm of ancient winter.', 'DEF Down'),
  ]),
]

const recruit = (id: string, name: string, role: Role, attributes: Attribute[], stats: [number, number, number, number, number], passive: string, skills: Unit['skills']): Unit =>
  makeHero({ id, name, role, attributes, hp: stats[0], maxHp: stats[0], physAtk: stats[1], magAtk: stats[2], def: stats[3], spd: stats[4], ability: passive, passive, skills, art: id })

export const recruits: Unit[] = [
  recruit('mira', 'Mira Moonwhisper', 'Healer', ['Sound'], [112, 22, 37, 13, 32], 'Resonant Heart · healing is 10% stronger', [skill('Lullaby Note', 0, 85, 'Sound', 'magic', 'enemy', 'A dissonant note.'), skill('Harmonic Mend', 2, 105, 'Sound', 'heal', 'ally', 'Restore one ally.'), skill('Chorus of Calm', 3, 80, 'Sound', 'heal', 'all-allies', 'Restore the party.'), skill('Worldsong', 5, 140, 'Sound', 'heal', 'all-allies', 'A great restorative song.')]),
  recruit('thorn', 'Thorn the Stagknight', 'Tank', ['Earth'], [174, 34, 15, 23, 18], 'Antler Guard · gains 10% DEF', [skill('Briar Bash', 0, 105, 'Earth', 'physical', 'enemy', 'A sturdy antler strike.'), skill('Root Snare', 2, 95, 'Earth', 'physical', 'all-enemies', 'Roots lash the enemy line.', 'Taunt'), skill('Verdant Wall', 3, 0, 'Earth', 'heal', 'all-allies', 'Raise a living wall.', 'DEF Up'), skill('Wildwood Crash', 5, 210, 'Earth', 'physical', 'enemy', 'A crushing charge.')]),
  recruit('nyx', 'Nyx, Starling Thief', 'Assassin', ['Shadow'], [99, 46, 18, 9, 48], 'Quickstep · gains 3 gauge after a victory', [skill('Starsteel', 0, 112, 'Shadow', 'physical', 'enemy', 'A flashing blade.'), skill('Twin Comet', 2, 145, 'Shadow', 'physical', 'enemy', 'A paired strike.'), skill('Blackwing Sweep', 3, 92, 'Shadow', 'physical', 'all-enemies', 'Cut across all foes.'), skill('Eventide', 5, 225, 'Shadow', 'physical', 'enemy', 'A perfect ambush.')]),
  recruit('ember', 'Emberfox', 'Mage', ['Fire'], [105, 18, 45, 10, 35], 'Kindling · Burn lasts one extra turn', [skill('Cinder', 0, 105, 'Fire', 'magic', 'enemy', 'A bright spark.'), skill('Foxfire', 2, 150, 'Fire', 'magic', 'enemy', 'A fox-shaped flame.', 'Burn'), skill('Wildfire', 3, 100, 'Fire', 'magic', 'all-enemies', 'A sweeping flame.', 'Burn'), skill('Phoenix Flare', 5, 180, 'Fire', 'magic', 'all-enemies', 'A rebirth of fire.')]),
  recruit('syl', 'Sylva, Grove Warden', 'Attacker', ['Earth', 'Sound'], [129, 40, 25, 16, 27], 'Old Growth · heals 5% HP each turn', [skill('Branchstrike', 0, 110, 'Earth', 'physical', 'enemy', 'A hard-grown staff strike.'), skill('Bramble Volley', 2, 135, 'Earth', 'physical', 'all-enemies', 'Thorny vines lash out.'), skill('Green Pulse', 3, 0, 'Sound', 'heal', 'all-allies', 'A gentle restorative pulse.'), skill('Heart of the Grove', 5, 190, 'Earth', 'physical', 'all-enemies', 'The forest answers.')]),
  recruit('zephyr', 'Zephyr Wisp', 'Assassin', ['Sound'], [101, 42, 30, 10, 45], 'Slipstream · evades the first hit', [skill('Gust Dart', 0, 105, 'Sound', 'physical', 'enemy', 'A needle of wind.'), skill('Cyclone Kick', 2, 135, 'Sound', 'physical', 'enemy', 'A fast, focused kick.'), skill('Whirling Gale', 3, 95, 'Sound', 'magic', 'all-enemies', 'A swirling gust.'), skill('Tempest Dive', 5, 200, 'Sound', 'physical', 'enemy', 'Strike like a storm.')]),
  recruit('aurelia', 'Aurelia, Dawnwing', 'Healer', ['Light', 'Fire'], [114, 20, 39, 12, 31], 'Warmth · party starts with 10% bonus HP', [skill('Dawn Spark', 0, 95, 'Light', 'magic', 'enemy', 'A warm ray.'), skill('Golden Feather', 2, 105, 'Light', 'heal', 'ally', 'Restore a companion.'), skill('Sunflare', 3, 100, 'Fire', 'magic', 'all-enemies', 'A cleansing flare.', 'Burn'), skill('Aurora Reborn', 5, 135, 'Light', 'heal', 'all-allies', 'Restore the whole party.')]),
  recruit('glacia', 'Glacia the Snow Lynx', 'Attacker', ['Ice'], [126, 42, 25, 15, 36], 'Snow Prowl · +10% damage to Burning foes', [skill('Rime Claw', 0, 110, 'Ice', 'physical', 'enemy', 'A frosted claw.'), skill('Icebound Pounce', 2, 150, 'Ice', 'physical', 'enemy', 'A freezing leap.'), skill('Shardstorm', 3, 100, 'Ice', 'magic', 'all-enemies', 'A blizzard of shards.'), skill('Whiteout', 5, 180, 'Ice', 'magic', 'all-enemies', 'The world disappears in snow.')]),
  recruit('cinder', 'Cinder, Ash Knight', 'Tank', ['Fire'], [162, 34, 20, 21, 21], 'Ashen Armor · Burn damage reduced by half', [skill('Coalbrand', 0, 105, 'Fire', 'physical', 'enemy', 'A scorched blade.'), skill('Searing Guard', 2, 0, 'Fire', 'heal', 'all-allies', 'Brace the group.', 'DEF Up'), skill('Ashfall', 3, 105, 'Fire', 'magic', 'all-enemies', 'A rain of cinders.', 'Burn'), skill('Pyre Sentinel', 5, 195, 'Fire', 'physical', 'enemy', 'An unstoppable charge.')]),
  recruit('orion', 'Orion, Echo Bard', 'Mage', ['Sound'], [110, 21, 42, 12, 33], 'Encore · Basic attacks add 1 extra gauge to one skill', [skill('Resonant Ping', 0, 105, 'Sound', 'magic', 'enemy', 'A sharp echo.'), skill('Sonic Arc', 2, 145, 'Sound', 'magic', 'enemy', 'Focus a sound wave.'), skill('Feedback', 3, 105, 'Sound', 'magic', 'all-enemies', 'A wall of sound.', 'Curse'), skill('Grand Finale', 5, 180, 'Sound', 'magic', 'all-enemies', 'A crashing crescendo.')]),
]

export const starters = heroes
