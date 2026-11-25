export interface UnitAssetConfig {
  pixelSprite: string;
  combatIllustration?: string; // Bottom-left side stance (Heroes/Hostages) or Boss Ult Cut-In
  scale: number;               // Relative visual height multiplier on the circle pad
  footOffsetPx: number;        // Fine vertical grounding inside the formation circle
}

export const HERO_ASSETS: Record<string, UnitAssetConfig> = {
  // 4 Starter Heroes
  seraphina: {
    pixelSprite: './assets/sprites/heroes/seraphina.png',
    combatIllustration: './assets/illustrations/heroes/seraphina-combat.png',
    scale: 1.05,
    footOffsetPx: 4,
  },
  kaelen: {
    pixelSprite: './assets/sprites/heroes/kaelen.png',
    combatIllustration: './assets/illustrations/heroes/kaelen-combat.png',
    scale: 1.0,
    footOffsetPx: 4,
  },
  bram: {
    pixelSprite: './assets/sprites/heroes/bram.png',
    combatIllustration: './assets/illustrations/heroes/bram-combat.png',
    scale: 1.12,
    footOffsetPx: 6,
  },
  lyra: {
    pixelSprite: './assets/sprites/heroes/lyra.png',
    combatIllustration: './assets/illustrations/heroes/lyra-combat.png',
    scale: 1.02,
    footOffsetPx: 4,
  },

  // 10 Recruitable Hostages (Beings & Mythical Creatures)
  'sylph-archer': {
    pixelSprite: './assets/sprites/heroes/sylph-archer.png',
    combatIllustration: './assets/illustrations/heroes/sylph-archer-combat.png',
    scale: 1.0,
    footOffsetPx: 4,
  },
  'cinder-drake': {
    pixelSprite: './assets/sprites/heroes/cinder-drake.png',
    combatIllustration: './assets/illustrations/heroes/cinder-drake-combat.png',
    scale: 1.04,
    footOffsetPx: 4,
  },
  'obsidian-golem': {
    pixelSprite: './assets/sprites/heroes/obsidian-golem.png',
    combatIllustration: './assets/illustrations/heroes/obsidian-golem-combat.png',
    scale: 1.15,
    footOffsetPx: 6,
  },
  'moonlit-kitsune': {
    pixelSprite: './assets/sprites/heroes/moonlit-kitsune.png',
    combatIllustration: './assets/illustrations/heroes/moonlit-kitsune-combat.png',
    scale: 1.0,
    footOffsetPx: 4,
  },
  'gale-griffon': {
    pixelSprite: './assets/sprites/heroes/gale-griffon.png',
    combatIllustration: './assets/illustrations/heroes/gale-griffon-combat.png',
    scale: 1.08,
    footOffsetPx: 2,
  },
  'sunforge-paladin': {
    pixelSprite: './assets/sprites/heroes/sunforge-paladin.png',
    combatIllustration: './assets/illustrations/heroes/sunforge-paladin-combat.png',
    scale: 1.12,
    footOffsetPx: 5,
  },
  'bramble-dryad': {
    pixelSprite: './assets/sprites/heroes/bramble-dryad.png',
    combatIllustration: './assets/illustrations/heroes/bramble-dryad-combat.png',
    scale: 1.04,
    footOffsetPx: 4,
  },
  'ember-ronin': {
    pixelSprite: './assets/sprites/heroes/ember-ronin.png',
    combatIllustration: './assets/illustrations/heroes/ember-ronin-combat.png',
    scale: 1.05,
    footOffsetPx: 4,
  },
  'frost-wraith': {
    pixelSprite: './assets/sprites/heroes/frost-wraith.png',
    combatIllustration: './assets/illustrations/heroes/frost-wraith-combat.png',
    scale: 1.05,
    footOffsetPx: 0,
  },
  'starlight-falcon': {
    pixelSprite: './assets/sprites/heroes/starlight-falcon.png',
    combatIllustration: './assets/illustrations/heroes/starlight-falcon-combat.png',
    scale: 1.0,
    footOffsetPx: 0,
  },
};

export const ENEMY_ASSETS: Record<string, UnitAssetConfig> = {
  // 3 High-Detail Scary Bosses (Huge scale + Illustrated Ultimate Cut-In)
  'boss-bone-dragon': {
    pixelSprite: './assets/bosses/boss-bone-dragon.png',
    combatIllustration: './assets/bosses/boss-bone-dragon-ult.png',
    scale: 1.9,
    footOffsetPx: 10,
  },
  'boss-choir-monolith': {
    pixelSprite: './assets/bosses/boss-choir-monolith.png',
    combatIllustration: './assets/bosses/boss-choir-monolith-ult.png',
    scale: 1.85,
    footOffsetPx: 10,
  },
  'boss-eclipse-seraph': {
    pixelSprite: './assets/bosses/boss-eclipse-seraph.png',
    combatIllustration: './assets/bosses/boss-eclipse-seraph-ult.png',
    scale: 1.95,
    footOffsetPx: 8,
  },

  // Elemental Mini-Dragons (Bone Dragon Brood & Mid/Late Dungeon)
  'minidragon-fire':  { pixelSprite: './assets/sprites/enemies/minidragon-fire.png',  scale: 1.0, footOffsetPx: 4 },
  'minidragon-ice':   { pixelSprite: './assets/sprites/enemies/minidragon-ice.png',   scale: 1.0, footOffsetPx: 4 },
  'minidragon-earth': { pixelSprite: './assets/sprites/enemies/minidragon-earth.png', scale: 1.04, footOffsetPx: 4 },
  'minidragon-sound': { pixelSprite: './assets/sprites/enemies/minidragon-sound.png', scale: 1.0, footOffsetPx: 4 },
  'minidragon-light': { pixelSprite: './assets/sprites/enemies/minidragon-light.png', scale: 1.0, footOffsetPx: 4 },

  // Scary Dungeon Minions (Normal size, basic animations only)
  'minion-crypt-knight':  { pixelSprite: './assets/sprites/enemies/minion-crypt-knight.png',  scale: 1.08, footOffsetPx: 5 },
  'minion-dread-stalker': { pixelSprite: './assets/sprites/enemies/minion-dread-stalker.png', scale: 1.0,  footOffsetPx: 4 },
  'minion-ash-cultist':   { pixelSprite: './assets/sprites/enemies/minion-ash-cultist.png',   scale: 1.02, footOffsetPx: 4 },
  'minion-plague-cantor': { pixelSprite: './assets/sprites/enemies/minion-plague-cantor.png', scale: 1.02, footOffsetPx: 4 },
  'minion-bone-archer':   { pixelSprite: './assets/sprites/enemies/minion-bone-archer.png',   scale: 1.0,  footOffsetPx: 4 },
};

export const DUNGEON_BACKGROUNDS: Record<string, string> = {
  'mossbound-crypt':  './assets/backgrounds/bg-mossbound-crypt.png',
  'ashen-ossuary':    './assets/backgrounds/bg-ashen-ossuary.png',
  'sunken-catacombs': './assets/backgrounds/bg-sunken-catacombs.png',
  'echoing-vault':    './assets/backgrounds/bg-echoing-vault.png',
  'starless-nave':    './assets/backgrounds/bg-starless-nave.png',
  'eclipse-throne':   './assets/backgrounds/bg-eclipse-throne.png',
  'campfire-rest':    './assets/backgrounds/bg-campfire-rest.png',
};

export type AssetEntry = UnitAssetConfig & {
  pixelSpriteUrl?: string
  combatIllustrationUrl?: string
  accent: string
  glyph: string
}

const accents: Record<string, [string, string]> = {
  seraphina: ['#C9A45C', '✦'], kaelen: ['#9A8B83', '◈'], bram: ['#A6AE92', '⬟'], lyra: ['#AAB8C8', '❄'],
  mira: ['#B5A989', '♫'], thorn: ['#899673', '♧'], nyx: ['#AAA0B0', '✧'], ember: ['#C18458', '♨'],
  syl: ['#A1A889', '❧'], zephyr: ['#9AA9AB', '〰'], aurelia: ['#C9A45C', '☼'], glacia: ['#AAB8C8', '❄'],
  cinder: ['#C18458', '⬟'], orion: ['#A8A6B6', '♫'], 'sylph-archer': ['#9BA98B', '➶'],
  'cinder-drake': ['#C18458', '♨'], 'obsidian-golem': ['#8C929B', '⬟'], 'moonlit-kitsune': ['#AAA0B0', '✧'],
  'gale-griffon': ['#9AA9AB', '➶'], 'sunforge-paladin': ['#C9A45C', '✦'], 'bramble-dryad': ['#899673', '♧'],
  'ember-ronin': ['#C18458', '⚔'], 'frost-wraith': ['#AAB8C8', '❄'], 'starlight-falcon': ['#C9A45C', '✧'],
  'boss-bone-dragon': ['#B76258', '♜'], 'boss-choir-monolith': ['#9AA9AB', '⬟'], 'boss-eclipse-seraph': ['#B76258', '✦'],
  'minidragon-fire': ['#C18458', '♨'], 'minidragon-ice': ['#AAB8C8', '❄'], 'minidragon-earth': ['#A6AE92', '⬟'],
  'minidragon-sound': ['#9AA9AB', '♫'], 'minidragon-light': ['#C9A45C', '☼'],
  'minion-crypt-knight': ['#A6AE92', '♜'], 'minion-dread-stalker': ['#9A8B83', '◈'],
  'minion-ash-cultist': ['#C18458', '♨'], 'minion-plague-cantor': ['#899673', '♫'],
  'minion-bone-archer': ['#B7AD98', '➶'],
}

const unitAssets: Record<string, UnitAssetConfig> = {
  ...HERO_ASSETS,
  ...ENEMY_ASSETS,
  mira: HERO_ASSETS['sylph-archer'],
  thorn: HERO_ASSETS['bramble-dryad'],
  nyx: HERO_ASSETS['moonlit-kitsune'],
  ember: HERO_ASSETS['ember-ronin'],
  syl: HERO_ASSETS['bramble-dryad'],
  zephyr: HERO_ASSETS['gale-griffon'],
  aurelia: HERO_ASSETS['sunforge-paladin'],
  glacia: HERO_ASSETS['frost-wraith'],
  cinder: HERO_ASSETS['cinder-drake'],
  orion: HERO_ASSETS['starlight-falcon'],
}

export const assetMap: Record<string, AssetEntry> = Object.fromEntries(
  Object.keys(accents).map((id) => {
    const config = unitAssets[id]
    return [id, {
      ...(config ?? { scale: 1, footOffsetPx: 4 }),
      pixelSpriteUrl: config?.pixelSprite,
      combatIllustrationUrl: config?.combatIllustration,
      accent: accents[id][0],
      glyph: accents[id][1],
    }]
  }),
)
