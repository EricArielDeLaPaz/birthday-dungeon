## Strict UI, Spacing & Interaction Rules
- **4px Scale System:** Use a strict 4px rhythm for all spacing (`4px, 8px, 12px, 16px, 20px, 24px, 32px` -> `p-1/2/3/4/5/6/8`, `gap-1/2/3/4/5/6/8`) and typography (`12px, 16px, 20px, 24px, 32px`).
- **Locked Viewport (No Page Scroll):** The battle screen MUST lock to `h-screen w-screen overflow-hidden`. Only the `Your Company` (left) and `Enemy Party` (right) sidebar lists scroll internally (`overflow-y-auto`).
- **Start Screen Colors:** Use clean antique gold (`#D4AF37` / `#E2C15A`) for primary actions—NO red buttons on the start screen.
- **No Redundant Close Buttons:** Any modal/popup with an `X` close button MUST NOT include an `"Understood"` button. Support `X`, Escape key, and backdrop click.
- **Full Status Names Only:** Always display full readable status names (`Stealth`, `Burn`, `Curse`, `Taunt`, `ATK Up`, `DEF Up`). Never abbreviate (no `STL`, `BRN`, `CRS`).
- **Concise Skill Descriptions:** Keep every skill description short and mechanical (e.g., `"Deals 100% Phys ATK to 1 enemy."`, `"Heals party by 30% of their Max HP."`).
- **No Row Text Labels in Arena:** Do NOT render `"FRONT ROW"` or `"BACK ROW"` text labels on the battlefield pads.
- **Boss HP:** Bosses have exact max/current HP values: Kryo-Ignis (Stage 5) 1,000; Choir-Warden Monolith (Stage 10) 1,250; Nyx-Aurelia (Stage 15) 1,500; Vaelgor (Stage 16) 2,000. Keep their reduced attack stats unchanged unless specifically requested.
- **Elemental Status Immunities:** Ice-attribute units are immune to Freeze, Fire-attribute units are immune to Burn, and Light-attribute units are immune to Curse. Apply these centrally through `addStatus` in `src/engine/combat.ts`; blocked skill effects still allow damage and show an `IMMUNE` popup and callout.