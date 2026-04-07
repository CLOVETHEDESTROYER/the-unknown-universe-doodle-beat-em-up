# The Unknown Universe: Doodle Beat 'Em Up

Side-scrolling doodle brawler built with React, Phaser, and Vite. You fight through notebook monsters, collect souls, break props for pickups, and can optionally use a Gemini-powered Inspiration Lab to brainstorm new enemy ideas.

Current campaign features:
- 3 playable chapters: `THE SCRATCH`, `THE GRID`, and `THE FURNACE`
- persistent Flame Sword power-up earned from the level 1 boss
- persistent Ink Shield power-up earned from the level 2 boss
- sword durability that can be lost on repeated defeats and recovered from a pickup drop
- Ink Shield auto-blocks one incoming hit when charged, then recharges on a cooldown
- level-specific objectives, enemy mixes, and doodle dressing

## Local setup

Prerequisites:
- Node.js 20 or 22 is recommended

Run the project:
1. Install dependencies with `npm install`
2. Optional: copy `.env.example` to `.env.local` and add `GEMINI_API_KEY` if you want live AI monster ideas
3. Start the dev server with `npm run dev`
4. Create a production build with `npm run build`
5. Run the gameplay smoke test with `npm run test:game`
6. Run chapter-specific smoke tests with `npm run test:game:level2` or `npm run test:game:level3`

## Controls

- Arrow keys: move
- `Space`: attack
- `Z`: jump
- `X`: dash
- `P`: pause

## Notes

- The game itself runs locally without any API key.
- If no `GEMINI_API_KEY` is configured, the Inspiration Lab falls back to a built-in deck of doodle prompts.
- PNG art assets are mirrored under `public/` so Vite builds and smoke tests include the Phaser-loaded sprites.
- Purpose-built doodle props and enemy stand-ins now live under `public/doodles/` and are loaded directly by Phaser.
- A production art handoff list now lives in `asset-spec.md` with the current doodle filenames plus recommended export sizes.
- The Inspiration Lab and Gemini client now load lazily, so the core gameplay bundle stays leaner.
- Smoke tests can start from a specific chapter by passing wrapper flags like `--start-level 2 --start-sword` or `--start-level 3 --start-shield`, which map to the app's internal query-param boot hook for level-specific checks.
