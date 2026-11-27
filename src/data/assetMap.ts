export interface UnitAssetConfig {
  pixelSprite?: string
  combatIllustration?: string
  scale: number
  footOffsetPx: number
  flipX?: boolean
}

const spriteFiles = import.meta.glob('../assets/sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const backgroundFiles = import.meta.glob('../assets/backgrounds/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const spriteUrl = (fileName: string) => spriteFiles[`../assets/sprites/${fileName}.png`]
const publicAssetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`
const heroAsset = (fileName: string, scale = 1, footOffsetPx = 4): UnitAssetConfig => ({
  pixelSprite: spriteUrl(fileName),
  scale,
  footOffsetPx,
  flipX: false,
})

export const HERO_ASSETS: Record<string, UnitAssetConfig> = {
  seraphina: heroAsset('seraphina', 1.05),
  kaelen: heroAsset('kaelen'),
  bram: heroAsset('bram', 1.12, 6),
  lyra: heroAsset('lyra'),
  mira: heroAsset('mira'),
  thorn: heroAsset('thorn', 1.08, 5),
  nyx: heroAsset('nyx'),
  ember: heroAsset('ember'),
  syl: heroAsset('syl', 1.04),
  zephyr: heroAsset('zephyr'),
  aurelia: heroAsset('aurelia'),
  glacia: heroAsset('glacia'),
}

export const ENEMY_ASSETS: Record<string, UnitAssetConfig> = {
  'boss-bone-dragon': { pixelSprite: publicAssetUrl('assets/bosses/boss-bone-dragon.png'), combatIllustration: publicAssetUrl('assets/bosses/boss-bone-dragon-ult.png'), scale: 2.5, footOffsetPx: 10 },
  'boss-choir-monolith': { scale: 1.85, footOffsetPx: 10 },
  'boss-eclipse-seraph': { scale: 1.95, footOffsetPx: 8 },
  'boss-frostfire': { pixelSprite: publicAssetUrl('assets/bosses/boss-frostfire.png'), combatIllustration: publicAssetUrl('assets/bosses/boss-frostfire-ult.png'), scale: 1.9, footOffsetPx: 10 },
  'minidragon-fire': { scale: 1, footOffsetPx: 4 },
  'minidragon-ice': { scale: 1, footOffsetPx: 4 },
  'minidragon-earth': { scale: 1.04, footOffsetPx: 4 },
  'minidragon-sound': { scale: 1, footOffsetPx: 4 },
  'minidragon-light': { scale: 1, footOffsetPx: 4 },
  'minion-crypt-knight': { scale: 1.08, footOffsetPx: 5 },
  'minion-dread-stalker': { scale: 1, footOffsetPx: 4 },
  'minion-ash-cultist': { scale: 1.02, footOffsetPx: 4 },
  'minion-plague-cantor': { scale: 1.02, footOffsetPx: 4 },
  'minion-bone-archer': { scale: 1, footOffsetPx: 4 },
}

const backgroundUrl = (fileName: string) => backgroundFiles[`../assets/backgrounds/${fileName}.png`]

export const DUNGEON_BACKGROUNDS: Record<string, string | undefined> = {
  'mossbound-crypt': backgroundUrl('bg-mossbound-crypt'),
  'ashen-ossuary': backgroundUrl('bg-ashen-ossuary'),
  'sunken-catacombs': backgroundUrl('bg-sunken-catacombs'),
  'echoing-vault': backgroundUrl('bg-echoing-vault'),
  'starless-nave': backgroundUrl('bg-starless-nave'),
  'eclipse-throne': backgroundUrl('bg-eclipse-throne'),
  'frostfire-crucible': publicAssetUrl('assets/backgrounds/bg-frostfire-crucible.png'),
  'campfire-rest': backgroundUrl('bg-campfire-rest'),
}

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
  'boss-frostfire': ['#AAB8C8', '❄'],
  'minidragon-fire': ['#C18458', '♨'], 'minidragon-ice': ['#AAB8C8', '❄'], 'minidragon-earth': ['#A6AE92', '⬟'],
  'minidragon-sound': ['#9AA9AB', '♫'], 'minidragon-light': ['#C9A45C', '☼'],
  'minion-crypt-knight': ['#A6AE92', '♜'], 'minion-dread-stalker': ['#9A8B83', '◈'],
  'minion-ash-cultist': ['#C18458', '♨'], 'minion-plague-cantor': ['#899673', '♫'],
  'minion-bone-archer': ['#B7AD98', '➶'],
}

const unitAssets: Record<string, UnitAssetConfig> = { ...HERO_ASSETS, ...ENEMY_ASSETS }

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
