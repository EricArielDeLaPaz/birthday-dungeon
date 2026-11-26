## Strict UI, Spacing & Interaction Rules
- **4px Scale System:** Use a strict 4px rhythm for all spacing (`4px, 8px, 12px, 16px, 20px, 24px, 32px` -> `p-1/2/3/4/5/6/8`, `gap-1/2/3/4/5/6/8`) and typography (`12px, 16px, 20px, 24px, 32px`).
- **Locked Viewport (No Page Scroll):** The battle screen MUST lock to `h-screen w-screen overflow-hidden`. Only the `Your Company` (left) and `Enemy Party` (right) sidebar lists scroll internally (`overflow-y-auto`).
- **Start Screen Colors:** Use clean antique gold (`#D4AF37` / `#E2C15A`) for primary actions—NO red buttons on the start screen.
- **No Redundant Close Buttons:** Any modal/popup with an `X` close button MUST NOT include an `"Understood"` button. Support `X`, Escape key, and backdrop click.
- **Full Status Names Only:** Always display full readable status names (`Stealth`, `Burn`, `Curse`, `Taunt`, `ATK Up`, `DEF Up`). Never abbreviate (no `STL`, `BRN`, `CRS`).
- **Concise Skill Descriptions:** Keep every skill description short and mechanical (e.g., `"Deals 100% Phys ATK to 1 enemy."`, `"Heals party by 30% of their Max HP."`).
- **No Row Text Labels in Arena:** Do NOT render `"FRONT ROW"` or `"BACK ROW"` text labels on the battlefield pads.