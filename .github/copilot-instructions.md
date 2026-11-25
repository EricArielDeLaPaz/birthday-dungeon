# Birthday Dungeon — Master Engineering & Design Rules

## Tech Stack
- Vite + React + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss";` in `src/index.css`).
- Pure combat math & state transitions in `src/engine/combat.ts`. Keep UI components thin and deterministic.
- Persist run state in `localStorage`.

## Visual Direction (Strict — No Neon / No Heavy Gradients)
- **Clean Dark-Fantasy Tactical UI:** Matte slate/obsidian panels (`#12151C`, `#1A1E28`, `#232936`), crisp 1px–2px borders (`#343C4E` default, `#C9A45C` antique gold for active/selected), bone-white primary text (`#F3EFE6`), muted slate secondary text (`#A3ACBE`), and solid high-contrast HP bars (`#2EB872` healthy, `#D99B26` mid, `#D94848` low).
- **Zero Neon Aesthetics:** Do NOT use glowing cyberpunk gradients, rainbow borders, neon purple/cyan drop shadows, or blurry glassmorphism blobs.
- **No "Acts":** Never display "Act 1 / Act 2 / Act 3" labels anywhere. Progress is a continuous 15-stage dungeon descent organized by named **Dungeon Areas** (Mossbound Crypt, Ashen Ossuary, Sunken Catacombs, Echoing Vault, Starless Nave, Eclipse Throne). Each area renders a distinct full-bleed dungeon background. The top-left 5-node tracker shows the current 5-stage dungeon segment (Stages 1–5, 6–10, 11–15) using clean square nodes: White = Fight, Gold = Camp, Red = Boss.

## Arena Scale, Circle Grounding & Row Clarity
- **Proper Circle Anchoring:** Every character/enemy sprite container MUST anchor its feet to the center of its formation circle (`bottom-center` aligned inside the pad ellipse, never floating above or drifting outside the circle).
- **Larger, Distinct Scale:**
  - Heroes: `104px–120px` tall on desktop (`76px–88px` on smaller screens).
  - Normal Minions & Mini-Dragons: `96px–112px` tall, menacing silhouettes.
  - Bosses: `176px–210px` tall (towering 1.7x–2.0x over minions), anchored firmly to their oversized boss pad.
- **Unmistakable Front vs. Back Rows:** Both player and enemy angled formation platforms must clearly separate the **FRONT ROW (2 circles)** and **BACK ROW (3 circles)** with subtle etched lane dividers, explicit crisp micro-labels (`FRONT` / `BACK`), distinct circle ring accents (antique gold/amber rim on Front, steel-silver rim on Back), and a clear role-match indicator when a hero occupies their buffed row.

## Core Combat Rules (Non-Negotiable)
1. **Attributes (Top-Right Wheel + Gold Counter):**
   - Light ↔ Shadow (2x to each other)
   - Ice ↔ Fire (2x to each other)
   - Sound ↔ Earth (2x to each other)
   - **Dual-Attribute Cancellation:** If a boss has BOTH attributes of an opposing pair (e.g., Sound + Earth or Light + Shadow), incoming attacks of either attribute in that pair cancel out and deal `1.0x` normal damage.
2. **Stats & Unified Defense:** Every unit has `hp`, `maxHp`, `physAtk`, `magAtk`, `def` (single unified defense covering both Physical and Magic attacks), `spd`, `role`, `attributes[]`, and `ability`.
3. **Turn Order:** Sorted descending by `spd` (ties favor heroes). Left sidebar (Heroes) and Right sidebar (Enemies) display live `1st`, `2nd`, `3rd`... badges, portrait, attribute icon, ATK, SPD, HP bar, and status pills.
4. **Independent Multi-Gauge Skills:**
   - Heroes have 4 skills: **Basic** (cost 0), **Stage 1** (cost 2), **Stage 2** (cost 3), **Ultimate** (cost 5), plus 1 Passive Ability.
   - Using **Basic** adds `+1` charge to Stage 1, Stage 2, and Ultimate simultaneously without wasting or resetting other charged gauges.
   - Using Stage 1, Stage 2, or Ultimate resets **only that skill's gauge**.
   - Basic damage target: ~`2/8` (25%) HP on single-target basics, ~`1/8` (12.5%) HP on AoE basics. Some kits have only AoE or only single-target skills.
   - Enemies have **Basic**, **Ultimate**, and 1 Passive Ability.
5. **Formation Row Bonuses:**
   - Front (2 circles): Tank (`+25% DEF`), Assassin (`+20% Phys ATK`).
   - Back (3 circles): Attacker (`+20% Phys ATK`), Mage (`+20% Mag ATK`), Healer (`+25% Healing`).
6. **Status Effects:**
   - Burn (2t): `-50% Phys ATK` + `6% Max HP` end-of-turn damage.
   - Curse (2t): `-50%` incoming healing + `8% Max HP` end-of-turn damage.
   - Taunt (2t): Forces enemy single-target attacks onto the Tank.
   - Stealth (2t): Evades enemy attacks (`100%` dodge).
   - Stage Buffs (from Shop potions): `+25% ATK` or `+25% DEF` for the current stage only; automatically cleared on stage transition.
7. **Animations:**
   - Basic attacks: character lunge + clean elemental impact effect on target sprite.
   - Hero Ultimates & Boss Ultimates: dramatic illustrated fighting cut-in + impact burst.
   - Minions & Mini-Dragons: basic animations ONLY, even when casting their Ultimate.
8. **Hostages, Shop & Camp:**
   - Regular fights feature a visible Hostage Cage (1–3 hostages per box). Winning offers **Recruit** or **Accept Gold** per hostage. Players can swap any bench hero into their 5-slot squad and reorder Front/Back rows anytime via **Team**.
   - Shop refreshes stock every stage (consumables only, no weapons): 30% Heal Potion, Cleanse Herb, Stage ATK Potion, Stage DEF Potion, Revive Feather. Usable via the **Items** button in battle.
   - Gold Camp stages offer **Rest & Heal (+50% HP + Revive)** or **Claim Gold (+100g)**.