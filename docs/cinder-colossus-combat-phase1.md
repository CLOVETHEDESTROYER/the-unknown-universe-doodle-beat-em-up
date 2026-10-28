# Cinder Colossus combat pass 1

Historical pass. The current multi-attack encounter and verification are documented in [Boss encounter pass](boss-encounters-v2.md).

The Level 3 Cinder Colossus now has a two-phase encounter built around its furnace core.

## Fight loop

- The orange tell precedes a floor-hugging lava shockwave aimed toward the player's side of the arena. The player can jump it.
- After the wave reaches the player's lane, the Colossus exposes its core for 820 ms. The HUD calls out `CORE OPEN - ATTACK!`; the boss flashes gold and takes double damage during this window. Hits while closed are deflected.
- At half health, the boss announces `FURNACE SURGE!`. Phase 2 sends a second shockwave 250 ms after the first and shortens the cooldown before the next tell.
- The boss arena, base health, and Level 3 route remain as they were.

## Test

`npm run build` passed. A focused browser run with the Level 3 boss was completed using `tests/game-level3-cinder-boss.actions.json`. The game state reported no failed assets or console errors. In the first captured cycle the Colossus reached its exposed state and fell from 20 to 14 HP; in the next cycle it entered phase 2 at 8 HP. The unattended test sequence then let the player take repeated hits and respawn, so it did not establish a tuned no-hit clear. Playtest manually to judge the jump timing, readability, and phase-two pressure.

The headless browser produced black canvas screenshots despite healthy game-state output and no console errors. Inspect the normal localhost game window for visuals; the test state snapshots are in `output/playtest-cinder-boss-20260926-repeat/`.
