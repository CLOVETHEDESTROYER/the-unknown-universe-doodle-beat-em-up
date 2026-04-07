# The Unknown Universe: Doodle Beat 'Em Up

Side-scrolling doodle brawler built with React, Phaser, and Vite. You fight through notebook monsters, collect souls, break props for pickups, and progress through a 3-chapter doodle campaign.

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
2. Start the dev server with `npm run dev`
3. Create a production build with `npm run build`
4. Run the gameplay smoke test with `npm run test:game`
5. Run chapter-specific smoke tests with `npm run test:game:level2` or `npm run test:game:level3`

## Controls

- Arrow keys: move
- `Space`: attack
- `Z`: jump
- `X`: dash
- `P`: pause

## Notes

- The hosted game is now frontend-only and does not require any API key.
- PNG art assets are mirrored under `public/` so Vite builds and smoke tests include the Phaser-loaded sprites.
- Purpose-built doodle props and enemy stand-ins now live under `public/doodles/` and are loaded directly by Phaser.
- A production art handoff list now lives in `asset-spec.md` with the current doodle filenames plus recommended export sizes.
- The side workshop panel is safe to ship on Vercel and is currently used for local sprite upload/testing only.
- Smoke tests can start from a specific chapter by passing wrapper flags like `--start-level 2 --start-sword` or `--start-level 3 --start-shield`, which map to the app's internal query-param boot hook for level-specific checks.
