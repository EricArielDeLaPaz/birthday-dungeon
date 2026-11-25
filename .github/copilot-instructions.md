# Mythic Dungeon RPG — Project Rules

## Tech Stack
- Vite + React + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite` plugin, `@import "tailwindcss";` in `src/index.css` — do NOT create `tailwind.config.js` or `postcss.config.js`).
- Pure state-driven turn-based combat in `src/engine/combat.ts` (keep UI components thin).
- Persist run progress and settings in `localStorage`.

## Non-Negotiable Game Rules
1. **Attributes:** Light <-> Shadow (2x), Ice <-> Fire (2x), Sound <-> Earth (2x). If a defender has BOTH attributes of an opposing pair, incoming attacks of either attribute in that pair deal 1.0x (canceled out).
2. **Stats:** Every unit has `hp`, `maxHp`, `physAtk`, `magAtk`, `def` (unified defense for both phys & mag), `spd`, `role`, `attributes[]`, and `ability`.
3. **Independent Gauges:** Heroes have 4 skills: Basic (cost 0), Stage 1 (cost 2), Stage 2 (cost 3), Ultimate (cost 5). Using Basic adds +1 charge to ALL three skill gauges without capping/wasting others. Using Stage 1, Stage 2, or Ultimate resets ONLY that skill's gauge.
4. **Formation Bonuses (5 slots: 2 Front, 3 Back):**
   - Front row: Tank (+25% DEF), Assassin (+20% Phys ATK).
   - Back row: Attacker (+20% Phys ATK), Mage (+20% Mag ATK), Healer (+25% Healing).
5. **Status Effects:** Burn (-50% Phys ATK + 6% HP DoT, 2t), Curse (-50% Healing + 8% HP DoT, 2t), Taunt (forces single-target enemy hits to Tank, 2t), Stealth (evades attacks, 2t), ATK/DEF Buffs (+25%).
6. **Animations:** Basic attacks = lunge + simple elemental hit VFX. Hero Ultimates & Act Boss Ultimates = dramatic illustrated cut-in + screen flash + heavy VFX. Minions only use basic animations even for their Ultimates.
7. **Layout:** High-contrast dark obsidian & gold fantasy UI matching the 5-node top stage bar, left hero sidebar, right enemy sidebar, angled 2-front/3-back pads, bottom-left transparent hero combat illustration during Attack mode, and 4 skill cards.
