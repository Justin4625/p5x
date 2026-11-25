---
name: p5x
description: Continue working on Phantom Roster, Justin's Persona 5: The Phantom X (P5X) fan site (Global units + team builder with turn order and synergy highlights, data from lufel.net), with full project context. Use for /p5x or any work on this site.
argument-hint: [what to do next]
---

We're continuing work on **Phantom Roster**: a P5X fan site inspired by lufel.net. Right now it has the Global unit roster and a team builder: pick 3 thieves (+ Wonder always in, + optional Navigator), see the turn-by-turn rotation, and cards that fit the crew light up. Vite + TypeScript (vanilla DOM, no framework), Persona 5 look (red/black/white, slanted panels, ransom-note type, lots of motion). Work from the repo root (locally ~/Documents/Prg/p5x; in a cloud/phone session the checked-out repo).

Before doing anything:
0. Sync with the other device: run `git fetch` and compare with `origin/main`. Only if main is behind, say so first in one line (in Dutch) with the commit subjects in short, then `git pull`. If local uncommitted changes would clash, stop and ask. If up to date, don't mention it.
1. Read `.claude/skills/p5x/notes.md` (decisions, data model, gotchas, open points). It is the one source of project memory on every device.
2. Read README.md for the module map.
3. Start it locally (laptop only, not in a cloud session): check `curl -s -o /dev/null -w '%{http_code}' http://localhost:5181/`. If it answers, leave it running and don't mention it. Otherwise run `npm install` if node_modules is missing, start `npx vite --port 5181` in the background and say in one line (in Dutch) that it runs on http://localhost:5181.
4. Reply in Dutch; keep the site's UI text in English.
5. House rules:
   - Game data must be correct. All unit data comes from lufel.net through `scripts/scrape-lufel.mjs` into `src/data/units.json` and `public/cards/`. Never hand-edit units.json; fix the scraper or the translation tables in `src/data.ts` and re-run `node scripts/scrape-lufel.mjs`.
   - Global server only: the roster is lufel's `character_info_glb.js` list.
   - Synergy logic lives in `src/synergy.ts` with its weights documented at the top. Every highlight must be explainable: each score comes with readable reasons.
   - Persona 5 style: tokens in `:root` of `src/style.css`, Anton display font, ransom letters via `ransom()` in main.ts. Respect `prefers-reduced-motion`.
   - Mobile matters: no horizontal page scroll at 390px; the turn table scrolls inside its panel with a sticky first column.
6. To see changes: `npm run build` (runs `tsc` too), then screenshot with `playwright-cli` (open http://localhost:5181/, `resize 1440 900` and `resize 390 844`, `screenshot`) and Read the PNG.
7. Once a change is verified, commit and push to GitHub (main, private repo Justin4625/p5x).
8. When a decision, gotcha or open point changes, update `.claude/skills/p5x/notes.md` in the same commit.
9. Work left unfinished at the end of a session goes in `.claude/skills/p5x/pending.md`, committed and pushed.
10. When done, close what you started: `playwright-cli close`, and stop a dev server you started yourself.

If `.claude/skills/p5x/pending.md` exists, say in one line (in Dutch) that you're picking it up and continue it, unless the text below asks for something else. Delete the file when that work is done.

Then do this: $ARGUMENTS

If nothing is given above, briefly say (in Dutch) where the site stands and list the next steps and open points from the notes, then ask what I'd like to do.
