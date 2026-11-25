# Phantom Roster

Fan-made Persona 5: The Phantom X (Global) unit roster and team builder. Pick three thieves, see the turn-by-turn rotation, and watch the units that fit your crew light up.

Data, teams and rotations come from [lufel.net](https://lufel.net). Not affiliated with SEGA or Atlus.

## Run

```
npm install
npx vite --port 5181
```

## Update data

```
npm run scrape
```

This rewrites `src/data/units.json` and downloads missing card art to `public/cards/`. Delete `public/cards/*` to refresh the art too.

A GitHub Action (`.github/workflows/update-units.yml`) does this every day and commits new units to main automatically. Trigger it by hand from the Actions tab when a unit just dropped. Warnings about things the site can't translate yet show on the run page.

## Modules

- `scripts/scrape-lufel.mjs` — pulls the Global roster plus per-unit party, rotation, skill, review and stats data from lufel.net.
- `src/data.ts` — unit types, Korean→English translation tables, rotation token parsing.
- `src/data/tags.json` — Korean tag → English mechanic table (shared with the scraper).
- `src/skills.ts` — reads skill texts into a gives/wants profile per unit and links pairs on it.
- `src/synergy.ts` — synergy scoring between units, tier ranking, team meter.
- `src/main.ts` — UI: roster grid, team slots, turn order, detail drawer, skill popover.
- `src/style.css` — the Persona 5 look and all animations.
