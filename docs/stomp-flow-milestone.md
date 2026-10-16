# Stomp flow milestone

This pass makes enemies useful as stepping stones and gives Level 1 a short, optional bounce route using the existing hand-drawn artwork.

## Play it

Start normally at `http://127.0.0.1:3000/?autostart=1&level=1`, or use `&stompCourse=1` to start on the entry bridge at x=3078. The review shortcut also sets a local checkpoint there; normal runs retain their usual checkpoints.

Run right onto the spring at x=3235, then hold Right and Jump (Up/Z or the touch J button). Three predictable walkers at x=3450, 3730, and 4010 form a continuous bounce line. Coin arcs guide the jumps. The third high bounce reaches a shield ledge at x=4240–4460, y=300. A missed bounce can still use the lower route and its existing gap jump. Shooting the walkers remains an alternative.

## Movement and scoring

- A normal enemy stomp produces a short 420 px/s bounce; holding Jump at contact produces a 650 px/s bounce. Releasing Jump while rising cuts the high bounce to 380 px/s. The touch control uses the same behavior.
- Normal stomps preserve horizontal velocity and skip the old melee hit-stop pause. The enemy briefly flattens and fades while a score pop marks the bounce.
- Consecutive normal stomps before landing award total kill-plus-bounce values of 200, 400, 800, and 1600 points, capped at 1600. Landing, a spring launch, a hit, or a boss stomp breaks the chain. Dead enemies and collected rewards do not regenerate on a checkpoint respawn.
- Boss stomps keep their prior 430 px/s bounce, damage, and 50-point bonus. They do not contribute to the chain.

## Collision fixes

Arcade overlap checks set `touching.down` even for coins, checkpoints, and enemies. The old grounded check treated those contacts as landings. Grounding now requires a blocked floor or geometry that supports the feet, including moving lifts. This prevents pickups from resetting airborne combos, affecting gravity, or granting false coyote-time ground contact.

A second check prevents contact damage and stomps through a platform separating the player from an enemy underneath. This fixes the opening walker hurting X God while he stands on the roof above it.

## Implementation and verification

`components/PlatformerGameEngine.tsx` holds the level data, held-jump bounce, capped scoring, support checks, squash feedback, and review shortcut. Course walkers use a bounded 28 px/s patrol instead of a rush so their head positions remain readable. `tests/game-stomp-flow.actions.json` runs the route through the established game client.

`npm run build` passed. Twenty-five grouped browser checks passed:

- `scripts/test_stomp_flow.mjs`: eight checks for low/high bounces, the complete keyboard route, the route with Dinio, damage/respawn resets, touch boost/release, and Level 2 isolation. Both complete route runs retain 100 health and reach the shield ledge. Measured low/high apexes were approximately y=328 and y=245 from the same head contact.
- `scripts/test_rooftop_playground.mjs`: all seven checks for the original spring/star route, reward, second spring, timeout and respawn behavior, and Level 2 isolation.
- `scripts/test_kilina_v3.mjs`: all ten checks through both boss phases, counters, crouch dodge, body/camera alignment, defeat cleanup, and exit into Level 3. Its dash pose check accepts both valid strike/follow-through frames to avoid depending on screenshot timing.

Desktop and phone gameplay captures were inspected. Evidence: `output/stomp-flow/`, `output/rooftop-playground-check/`, and `output/kilina-v3/playtest/`. The established client also captures the production build in `output/stomp-flow/verified-smoke/`.

Stop for user feedback on bounce height, forward flow, and the entry spring before adding another level mechanic.
