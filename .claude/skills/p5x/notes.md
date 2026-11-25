# Phantom Roster (P5X) — project notes

Started 2026-11-25. Fan site for Persona 5: The Phantom X, modelled on lufel.net. Repo ~/Documents/Prg/p5x, private GitHub Justin4625/p5x.

## Scope so far
- Global units roster: 57 pickable units (49 thieves + 8 navigators) + Wonder. Filters by element, role and search, plus sorting by newest, A–Z or speed.
- Team builder: 3 thief slots, Wonder always in (as in the game), 1 optional Navigator slot. Team is saved in the URL hash (`#t=a,b,c&n=navi`), so links can be shared. localStorage is used as a fallback.
- Turn order: fighters sorted by base Speed (lv1 A0 from lufel `base_stats`), then Wonder ("Persona / fill gaps", no data), then the navigator. Cells come from lufel `operation.js` rotations, with an awareness picker per unit. Tap a move to see the skill text.
- Synergy highlights: BEST (top 4 with score ≥ 5) and GOOD (next up to 12 total with score ≥ 2.5). Navigators are ranked separately (1 BEST, 3 total). Units that don't match are dimmed. Reasons show on hover (desktop) and in the drawer under "Fit with your crew".
- Detail drawer per unit: overview (lufel review_en), best partners, skills, rotations.

## Data (lufel.net)
- Roster: `/data/character_info_glb.js` (`characterList.mainParty` / `supportParty` = navigators). Full info (en names, element, position, color, tags) is in `/data/character_info.js` (KR, covers more units than Global).
- Per unit: `/data/characters/<KR name>/{party,operation,skill,setting,review,base_stats}.js`.
  - party.js `party[].members` = 3 thieves + navigator (Wonder is never listed). `friends[]` = best partners with `comment_en`.
  - operation.js `basic[]` = `{label: '의식 N', value: '1 › 2↺+3 › …'}` (↺ = auto, HL = highlight, TH = theurgy, ⓘA = item, `·` = hold).
  - skill.js has `enCharacterSkillsData`.
- Card art: `/assets/img/character-cards/<KR name>.webp`, resized to 360px wide by sharp into `public/cards/<index>.webp`.
- The scraper runs lufel's JS in a `vm` context with a null-prototype global and only reads back JSON strings.
- Position → role map: 지배 Sweeper, 반항 Assassin, 우월 Strategist, 굴복 Saboteur, 방위 Guardian, 구원 Medic, 해명 Elucidator (navigators), 자율 Virtuoso (J&C).
- Korean tags are translated to English mechanics in `src/data.ts` (`TAG_EN`). Rotation tokens use `TOKEN_KR`. Miku's song tokens (불/춘/고) are a guess: Fire / Spring / Heaven.

## Synergy model (src/synergy.ts)
1. lufel best partners: +3..5. Units with many partners count less; Tempest Riko lists 11.
2. Shared lufel recommended teams: +2 each, up to 3.
3. Element supporter + a dealer of that element: +2.5. The supporter is detected from its mechanics (Burn/Fire AoE → Fire, Windswept → Wind, and so on).
4. Shared core mechanic (Burn, Freeze, Shock, Windswept, DoT, Down, Highlight, Extra Turn, Theurgy…): +1.5.
5. Role balance: +1 for a missing sustain or support role, −1.5 for a third damage dealer.
Team meter 0–100 = average pair score ×6 + role coverage bonus, scaled by how many of the 3 slots are filled.

## Gotchas
- `.builder` needs `min-width: 0`, otherwise the turn table widens the page on mobile.
- Card stamps (scale 2.4 while hidden) overflow, so `.roster` has `overflow-x: clip`.
- Codenames like `WIND·Tempest` are split: the base is shown big and the variant small (`code()` in main.ts).

## Open points / next steps
- More lufel features: tactic library (Firestore), revelations, persona, weapons.
- Wonder's persona choice in the team (buff/debuff persona per element).
- Real action order uses gear speed. A user-editable speed per slot would make the turn order exact.
- Check the Miku token translation and Kotone (no rotations on lufel yet).
