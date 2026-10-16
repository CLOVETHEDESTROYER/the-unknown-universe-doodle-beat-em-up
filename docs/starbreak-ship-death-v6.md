# Starbreak Run: player ship death

The newer [shared powerup pass](ground-powerups-v1.md) changes weapon recovery: ship death now drops upgraded weapons and retries use twin cannons. The explosion timing and sequence below remain current.

## Behavior

When the ship's hull reaches zero, it flashes, breaks into twelve spinning hull pieces, and fades through secondary explosions, sparks, and smoke. The pieces reuse the actual drawn ship texture and the approved impact art, preserving the flight level's style. This is an animated breakup assembled in the renderer, with no new image generation.

The effect lasts 1100ms. Controls and firing stop during destruction, and combat is cleared. One life is deducted once. With lives remaining, the existing 1200ms checkpoint retry restores the hull, pilot, checkpoint weapon, and collected-pickup snapshot. On the last life, the new `dying` phase keeps Game Over from covering the explosion until it finishes. Pause freezes the sequence. Dedicated debris is destroyed when it ends or the checkpoint returns.

## Implementation

- `gameplay/flightDeath.ts`: captured impact position/bank and simulation-time animation stages. Sub-millisecond clock drift is rounded so the final frozen Game Over frame has no remaining fragments.
- `gameplay/flight.ts`: one-shot fatal damage transition, frozen controls, delayed final Game Over, checkpoint cleanup.
- `components/FlightGameEngine.tsx`: hull flash, cropped ship fragments, explosion bursts, smoke, sparks, and capture state.
- `App.tsx`: lets the flight engine finish its final-life animation before showing Game Over. Ground and legacy engines retain their existing behavior.

## Verification

- Production build passed (`index-Cn_YA3qP.js`). Full TypeScript still reports the pre-existing legacy/platformer diagnostics; no diagnostics target App or the flight modules.
- `scripts/test_flight_ship_death_v6.mjs`: simulation checks for fatal damage, frozen route/controls, one life per death, checkpoint and weapon recovery; browser checks for ordinary nonfatal damage, every animation stage, pause/resume, fragment cleanup, delayed last-life overlay, phone layout, alternate pilot, and fatal contact with an actual asteroid.
- Existing nine-group combat and fourteen-group finale regressions passed without browser errors, including boss phases, guard windows, death cleanup, final-checkpoint retry, difficulty and landing. The complete flight route passed with all ten beacons, three lives,90 hull,12 ship kills and1447 shots, then landed into Level6 with gear/companions. All pilots, touch controls, pause, checkpoint recovery and last-life Game Over also passed.
- Evidence: `output/starbreak-ship-death-v6/playtest/`.
- Production capture uses the existing develop-web-game client and `tests/game-flight-ship-death-v6.actions.json`. `production/state-0.json` records the breakup at392ms with twelve fragments and no failed assets; the screenshot was inspected and no browser error file was produced.

## Try it

- Normal level: `http://127.0.0.1:3000/?autostart=1&level=5`.
- Direct animation preview: `http://127.0.0.1:3000/?autostart=1&level=5&shipDeathPreview=1`. Press FIRE/Space for a single forced fatal hit. The retry then plays normally. This opt-in preview is separate from normal campaign behavior.

These are automated and accelerated checks, including visual inspection of desktop and phone screenshots. User playtesting should guide explosion timing and intensity. No deployment or commit.
