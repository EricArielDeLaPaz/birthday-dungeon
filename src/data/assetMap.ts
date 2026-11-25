export type AssetEntry = { pixelSpriteUrl?: string; combatIllustrationUrl?: string; accent: string; glyph: string }

export const assetMap: Record<string, AssetEntry> = {
  seraphina: { accent: '#f5cf72', glyph: '✦' }, kaelen: { accent: '#a48bff', glyph: '☾' },
  bram: { accent: '#91b779', glyph: '◆' }, lyra: { accent: '#8ac8ee', glyph: '❄' },
  mira: { accent: '#83d7d0', glyph: '♫' }, thorn: { accent: '#9ab76f', glyph: '♧' },
  nyx: { accent: '#b59afa', glyph: '✧' }, ember: { accent: '#ff925d', glyph: '♨' },
  syl: { accent: '#a8c586', glyph: '❧' }, zephyr: { accent: '#7ac9da', glyph: '〰' },
  aurelia: { accent: '#f4d17c', glyph: '☼' }, glacia: { accent: '#a5dcf4', glyph: '❄' },
  cinder: { accent: '#f38e5d', glyph: '⬟' }, orion: { accent: '#99b9f4', glyph: '♫' },
  'goblin-guard': { accent: '#a3bf77', glyph: '♜' }, 'shade-stalker': { accent: '#a48bff', glyph: '☾' },
  'ember-adept': { accent: '#ff965f', glyph: '♨' }, 'moss-priest': { accent: '#9bb785', glyph: '♧' },
  'iron-hound': { accent: '#b2a884', glyph: '◆' }, emberling: { accent: '#ff8858', glyph: '♨' },
  'ignis-rex': { accent: '#ff8754', glyph: '♜' }, 'resonance-golem': { accent: '#80c3bd', glyph: '⬟' },
  'eclipse-sovereign': { accent: '#b49cff', glyph: '☾' },
}
