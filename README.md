# The Unknown Universe

A hand-drawn side-scrolling action platformer built with React, Phaser and Vite. The campaign combines ground platforming, melee/ranged combat, companions, powerups and a spaceship stage.

## Campaign

| Level | Setting | Boss |
| --- | --- | --- |
| 1 | The Scratch | Dark Dragon |
| 2 | Graveyard | Kilina's Daughter |
| 3 | Furnace / Cinder Rampart | Cinder Colossus |
| 4 | Witchwood | Kilina |
| 5 | Starbreak Run — spaceship flight | Pursuer |
| 6 | Dread Planet | Void Regent |

X God is the starting hero. Barrett, Nico, Ezra and Teleportation C form the unlocked playable roster. Collect companion orbs to release Dinio, Doghost and Teleportation C on their stages. Heroes can equip the blaster, flame sword, frost gauntlet, ember boots or storm halo; three unblocked hits remove the equipped powerup. The flight stage has destructible ships/asteroids and separate weapon upgrades.

## Run locally

Use Node.js 20 or 22, then:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. Create a static production build with `npm run build`; output is in `dist/`. `npm run preview` serves that build locally. The game is frontend-only and does not require an API key. Local `.env` files are ignored.

## Controls

- Left/right arrows: move; reverse direction to skid.
- Z or Up: jump. Down: crouch where supported.
- Space or C: use the equipped weapon/power, or punch while unarmed.
- Teleportation C: X to blink; R or Down+X to return to a valid anchor.
- Flight: arrows to steer; Space/C to fire.
- P: pause. Options and Pause contain separate music/effects volume and mute controls.
- Touch controls support phones/tablets; use landscape orientation. Slide your thumb across the D-pad to move or steer (diagonals supported). Up also jumps on ground stages; Down crouches or triggers an airborne slam. Phone controls sit in side rails outside the playfield so the hero stays visible.

## Save and Continue

Normal campaigns autosave to this browser as progress changes. Use **P → Save & Quit** to return to the title, then **Continue Game** (or Enter) to resume your hero, difficulty, health, lives, score, equipment, companions and last activated checkpoint. Story chapters between levels resume too. Enemies and hazards reset when loading; this is a checkpoint save rather than a frozen scene.

There is one campaign slot per browser/site. Choosing a new hero after confirming a new campaign replaces it. Completing the campaign clears it; death/game over keeps the last healthy save. Clearing browser data removes the save, and saves do not sync between devices. Query-string preview/test runs, the legacy brawler and custom uploaded sprites do not autosave. Storage errors are shown in the pause menu, and Save & Quit keeps you in-game if saving fails.

Save regression: `node scripts/test_campaign_save_v1.mjs` with a running dev server (`GAME_TEST_URL` defaults to `http://127.0.0.1:4383`).

## Development and assets

- `components/PlatformerGameEngine.tsx`: ground campaign.
- `components/FlightGameEngine.tsx` and `gameplay/flight*.ts`: flight simulation and presentation.
- `gameplay/`: shared equipment, movement and encounter rules.
- `audio/`: effects library and mixer; `public/audio/music/`: supplied level/boss music.
- `public/`: shipped graphics, sounds and sprites.
- `art/`: editable source artwork, Blender scenes, generation prompts and rebuild notes.
- `scripts/`: asset preparation and existing focused gameplay checks.
- `docs/`: milestone designs, controls, reproduction notes and known limits.

Existing automated gameplay checks can be invoked with `npm run test:game` and the focused scripts under `scripts/`; their browser setup is described in the milestone docs. These checks are not run automatically by the production build. The full TypeScript check currently has older legacy/Phaser diagnostics recorded in `progress.md`.

Direct previews use `?autostart=1&level=1` through `level=6`. A hero preview can add `character=nico&unlockRoster=1`; boss previews on ground levels can add `finishLevel=1`. Explicit preview flags are separate from normal campaign progression. The older brawler remains available through its existing `legacyBrawler=1` switch.

## Previous main backup

The pre-platformer remote `main` is preserved as `codex/backup-main-2026-10-16` at commit `74126add1b20bff6dce1211c0c582e28f4b680d5`. See [release notes](docs/main-release-2026-10-16.md) for the replacement procedure and scope.
