# Phantom Roster (P5X) — project notes

Started 2026-11-25. Fan site for Persona 5: The Phantom X, modelled on lufel.net. Repo ~/Documents/Prg/p5x, private GitHub Justin4625/p5x.

## Scope so far
- Global units roster: 57 pickable units (49 thieves + 8 navigators) + Wonder. Filters by element, role and search, plus sorting by newest, A–Z or speed.
- Team builder: 3 thief slots, Wonder always in (as in the game), 1 optional Navigator slot. Team is saved in the URL hash (`#t=a,b,c&n=navi`), so links can be shared. localStorage is used as a fallback.
- Turn order: fighters sorted by base Speed (lv1 A0 from lufel `base_stats`), then Wonder ("Persona / fill gaps", no data), then the navigator. Cells come from lufel `operation.js` rotations, with an awareness picker per unit. Tap a move to see the skill text.
- Synergy highlights: BEST (top 4 with score ≥ 5) and GOOD (next up to 12 total with score ≥ 2.5). Navigators are ranked separately (1 BEST, 3 total). Units that don't match are dimmed. Reasons show on hover (desktop) and in the drawer under "Fit with your crew".
- Detail drawer per unit: overview (lufel review_en), best partners, skills, rotations.

## My roster · Should I pull? (roster.html, src/roster.ts)
- Second page (Vite multi-page via `vite.config.js`). Nav links on both heroes (`navHTML()` in `src/ui.ts`, shared helpers live there).
- Collection (`src/collection.ts`): owned units + awareness A0–A6 + 5★ signature weapon, in localStorage `p5x-collection`. "Copy link" makes `roster.html#have=CODENAME~6w.…` to move it to another device; opening it asks before replacing.
- Advice (`src/advice.ts`, weights at the top): candidates = Global banners running now (lufel gacha feed) + next 8 upcoming units. Crew value = team meter × 0.5 + member strength by tier (T0 20 … T4 0); score = crew upgrade (≤30) + partners (≤15) + role gap (15) + first dealer of element (4) + tier (25…0) + limited (+8/−5) − same-role-same-or-better-tier (8). PULL ≥ 50, MAYBE ≥ 32. No ticked units → no verdict, just facts. Highest PULL = "BEST BET".
- Weapon advice: only for owned/PULL units; WORTH IT if in best crew and dealer or T0; OPTIONAL if in crew or tier ≤ T0.5.
- Calibrated on a starter roster (old T2–T4 units → T0 limiteds become PULL) and a stacked roster (mostly MAYBE/SKIP).

## Data (lufel.net)
- Roster: `/data/character_info_glb.js` (`characterList.mainParty` / `supportParty` = navigators). Full info (en names, element, position, color, tags) is in `/data/character_info.js` (KR, covers more units than Global).
- Per unit: `/data/characters/<KR name>/{party,operation,skill,setting,review,base_stats}.js`.
  - party.js `party[].members` = 3 thieves + navigator (Wonder is never listed). `friends[]` = best partners with `comment_en`.
  - operation.js `basic[]` = `{label: '의식 N', value: '1 › 2↺+3 › …'}` (↺ = auto, HL = highlight, TH = theurgy, ⓘA = item, `·` = hold).
  - skill.js has `enCharacterSkillsData`.
- Weapons: `/data/characters/<KR>/weapon.js` (`enCharacterWeaponData`, keys weapon5-1 = 5★ signature, weapon4-1 = 4★).
- Tiers: `/apps/tier/global_tier.json` (Global units) and `kr_tier.json` (used for units not on Global yet). Best label per unit; `awareness` = rated at A-n.
- Upcoming: `/apps/schedule/data.js` (`ReleaseScheduleData`: manualReleases + autoGenerateCharacters; date given or previous date + previous `days`; then KR release_order). Next 8 are scraped like normal units into `src/data/upcoming.json` with `eta` (estimate).
- Banners: `/data/external/gacha/en.json` (Global, thief + weapon banners, start/end UTC), matched to units by English name and to weapons by 5★ name. Banners that haven't started show "starts <date>".
- Reruns: a banner is a rerun when the unit's first Global release (walk of lufel's schedule → `released` on each unit) is 3+ weeks before the banner start. lufel's schedule has no future reruns; they appear once lufel's gacha feed lists them.
- Card art: `/assets/img/character-cards/<KR name>.webp`, resized to 360px wide by sharp into `public/cards/<sha1(KR id) first 12 hex>.webp`. Stable per unit: index-based names broke when a unit was inserted mid-list. Unused card files are deleted on each scrape.

## Hosting (GitHub Pages)
- `.github/workflows/deploy-pages.yml` builds with `BASE_PATH=/<repo>/` (vite `base`) and deploys `dist` on every push to main, after each "Update units from lufel.net" run (workflow_run, because bot commits don't trigger push workflows) and by hand.
- Pages must be enabled once in repo Settings → Pages → Source: GitHub Actions. A private repo needs a paid GitHub plan for Pages.
- Always build URLs with `import.meta.env.BASE_URL` (cards, nav), never a leading `/`.
- Live since 2026-11-25 at https://justin4625.github.io/p5x/ (repo made public for this: free plan has no Pages for private repos).
- Actions are blocked for now ("account is locked due to a billing issue"), so deploy-pages.yml and update-units.yml don't run. Pages is set to deploy from the `gh-pages` branch instead (GitHub's own pages-build-deployment still runs). Manual deploy: `BASE_PATH=/p5x/ npm run build && touch dist/.nojekyll`, then force-push `dist` as the `gh-pages` branch. Once billing is fixed, switch Pages source back to GitHub Actions (`gh api -X PUT repos/Justin4625/p5x/pages -f build_type=workflow`).

## Auto-update (new units)
- `.github/workflows/update-units.yml` runs `npm run scrape` daily (04:23 UTC) and on demand (Actions → "Run workflow"), then `npm run build`, and commits `src/data` + `public/cards` to main only if something changed. Commit subject names new units ("Add X from lufel.net").
- Scraper safety: per-unit load failure keeps the previous data; an empty/unknown roster or a drop below 80% of the previous count writes nothing and exits 1. Unchanged data keeps the old `scraped` timestamp so the daily run doesn't commit noise.
- Warnings (unknown role/element, Korean tag missing from `src/data/tags.json`, no English codename/skills yet, no card art) print to the log, the run page (`::warning::`) and the job summary. Fix them in the tables, never in units.json.
- `added` (ISO date) is set when a unit first shows up; the original roster has `null`. `isNew()` shows a NEW pill for 30 days. Roles not in the known list still get a filter chip.
- Korean tag → English mechanic table lives in `src/data/tags.json` (shared by data.ts and the scraper).
- In a cloud session: lufel.net is only reachable in the "p5x" environment, and Node's fetch needs `NODE_USE_ENV_PROXY=1` to use the proxy.
- The scraper runs lufel's JS in a `vm` context with a null-prototype global and only reads back JSON strings.
- Position → role map: 지배 Sweeper, 반항 Assassin, 우월 Strategist, 굴복 Saboteur, 방위 Guardian, 구원 Medic, 해명 Elucidator (navigators), 자율 Virtuoso (J&C).
- Korean tags are translated to English mechanics in `src/data.ts` (`TAG_EN`). Rotation tokens use `TOKEN_KR`. Miku's song tokens (불/춘/고) are a guess: Fire / Spring / Heaven.

## Synergy model (src/synergy.ts + src/skills.ts)
1. lufel best partners: +3..5. Units with many partners count less; Tempest Riko lists 11.
2. Shared lufel recommended teams: +2 each, up to 3.
3. Skill reading (`src/skills.ts`): regex rules over each unit's English skill text build a profile of what it GIVES (ailments, DEF down / damage taken, `taken:<El>`, `boost:<El>`, single-ally buffs, crit, Theurgy/Highlight gauge, shields, heals, max HP, Defense, ailment accuracy, extra turns, Down Points, Blessing, Technical Precision, DoT) and WANTS (hits harder on Shocked/Burning/ailing/debuffed foes, scales on Defense or max HP, spends HP, has a Theurgy, bonuses on extra actions, Resonance dealer…). Dealers (Sweeper/Assassin) implicitly want their own element's `taken`/`boost`, single-ally buffs and a Highlight boost. A pair scores +1..2.5 per give→want link, capped at 5, and each reason names both skills. The drawer shows the profile as "From the skills: Brings / Looks for".
   - Before regexes: markup stripped, numbers collapsed to `N` (decimals broke `[^.]` patterns), own name tokens replaced by `SELF` (so "Increase SELF's Attack" isn't read as an ally buff).
   - Check a change with a profile dump: bundle a small script with esbuild and print gives/wants per unit.
3b. Fallback from lufel tags (element supporter + dealer of that element): +1.5, only when the skill reading found no element link.
4. Shared core mechanic (Burn, Freeze, Shock, Windswept, DoT, Theurgy…): +1.5. Down and Highlight are left out as noise.
5. Role balance: +1 for a missing sustain or support role, −1.5 for a third damage dealer.
Team meter 0–100 = average pair score ×6 + role coverage bonus, scaled by how many of the 3 slots are filled.
Not modelled yet: overall unit strength/meta, awareness (A0–A6), Wonder's persona.

## Team builder × collection
- "All units / My units" toggle (state `mine`, saved in localStorage `p5x-mine`). My units shows only units ticked on My roster, and BEST/GOOD are ranked among those only. Empty collection shows a link to roster.html.
- An owned unit's turn order starts at your awareness, or the highest route at or below it (A3 owned, routes A0/A6 -> A0), until you pick one by hand.
- The builder re-reads the collection on the `storage` event (other tab) and on `pageshow` from the back/forward cache.

## Look preview (2026-11-25, open)
- Justin asked for 10 versions to choose from. All colours, tilts and slants in style.css are tokens (`--bg --surface --surface-2 --plate --text --text-2 --paper --on-paper --on-accent --hi --tilt`, `clip-path: var(--slant, polygon(…))`); `--red` is the accent in every look.
- `src/looks.css` holds 10 looks keyed on `html[data-look]`: phantom (default), calling, velvet, darkhour, midnight, minimal, clean, newsprint, mementos, leblanc. Switcher bottom left (`mountLooks()` in ui.ts), `?look=<id>`, saved in localStorage `p5x-look`; an inline script in both HTML heads applies it before paint.
- When Justin picks one: fold its tokens into `:root`, delete looks.css + the switcher + unused Google fonts.
- He then asked for real new layouts (same P5 style): `scripts/build-concepts.mjs` writes 10 static, lightly interactive mockups to `public/concepts/` (live at /p5x/concepts/) from units.json with an example crew (Kotone, Queen, J&C, Miku). Fit picks there are simplified (lufel partners + shared element), not the real synergy model. Build the chosen layout into the real app, then delete the concepts.

## Gotchas
- Calmer look (2026-11-25, Justin found it too busy): background is static and only behind the header (no spinning rays, drifting dots or bottom slash), smaller header, intro wipe once per session (`sessionStorage p5x-intro`), BEST badge/ring don't animate, gentler card entrance, role chips behind a "Role" button (opens by itself when a role is active), plain hint text. Don't add constant background motion back.
- Pull advice: upcoming 4★ units without a banner are skipped (story/standard units, e.g. Anri). With no collection the cards drop the repeated "tick your units" lines; the 5★ weapon block is a collapsed `<details>` (open when WORTH IT).
- `.builder` needs `min-width: 0`, otherwise the turn table widens the page on mobile.
- Horizontal overflow is clipped on `html`/`body` (`overflow-x: clip`, `hidden` as fallback), not on `.roster`: clipping the roster cut off the left column's card text on hover. Card stamps (scale 2.4 while hidden) still overflow, harmlessly.
- Hover lifts (cards, slots, moves, chips, partners) sit in `@media (hover: hover)`; keyboard focus uses `:has(:focus-visible)`. Otherwise a tapped card stays lifted on touch.
- The pick "fly" only flies when the target slot is on screen; otherwise the art pops in place and a toast confirms (phone: builder is above the roster).
- Sticky builder and drawer use `overflow: hidden auto` so slam/hover animations don't flash a horizontal scrollbar. iOS gets 16px on the awareness `select` to stop focus zoom.
- Codenames like `WIND·Tempest` are split: the base is shown big and the variant small (`code()` in main.ts).

- Kotone's operation.js uses a per-turn table (`skills[]` per turn, several routes per awareness, `variant: 'miku'`) instead of `value` strings. `readRotations()` in the scraper reads `basic_en`, trims to the turn count and labels them `A0 · 1` (no number when there is only one). Variant routes get `with: <unit id>` (`VARIANT_UNIT`, miku → 미쿠); the turn order shows only the `with` routes when that unit is in the team (Miku as navigator), otherwise only the standard ones, and keeps the chosen awareness when switching. `state.aw` stores the label, not an index.
- Older-format routes tagged with a teammate's codename (Makoto `의식 0(VINO)` = with Chizuko, Wavecatcher Miyu `(ANGE)` = with Manaka as navigator) are linked by `linkTeamRoutes()` after the roster scrape: tag stripped, `with` set. Tags that aren't codenames stay in the label (Tempest Riko `(질풍)` = Wind party, `(단일)`/`(다중)`, `(NAVI)`). Switching keeps the awareness number (`A 6` ↔ `A 6(단일)`).
- My roster: ticks re-render with `.calm` (no `cardIn` replay); only the tapped tile's star pops (`.own-flash`). Focus is restored to the same control after a re-render. `Fatigue` turns show as idle FTG cells.

## Open points / next steps
- More lufel features: tactic library (Firestore), revelations, persona.
- Pull advice ignores currency/pity and dupes (awareness) value; could add a "tickets on hand" input.
- Wonder's persona choice in the team (buff/debuff persona per element).
- Real action order uses gear speed. A user-editable speed per slot would make the turn order exact.
- Check the Miku token translation.
