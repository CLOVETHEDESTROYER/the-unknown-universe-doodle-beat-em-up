# Level 1 run-and-gun pacing pass

Built on `codex/run-and-gun-feel`; no jump/aim control changes or weapon balance changes.

## Flow

- Keep the opening ground grunt as the initial shooting lesson.
- Move the existing Rapid Fire station to x=880, y=418 over the safe lower route. No extra gun station is added. It remains available only with a blaster, preserving equipment rules and Turkey King's restrictions.
- Ink Rush (1080–1650): two ground walkers, one advancing wave, no progression hold.
- Hold the Rooftop (1770–2320): a ground ranged attacker followed by a charger. One enemy per wave, 1.3 seconds between waves, visible boundary marks and brief camera/player bounds. Existing patrols inside the beat are removed, not stacked on top.
- Clear the fight for +300 and up to 20 health, once. A heart at x=2370 and the existing checkpoint at x=2290 provide recovery before the first gap. Checkpoints do not activate while a combat hold is active.
- Preserve the existing spring route, optional star challenge, stomp bridge, companion rewards, branching course and rooftop escape.
- Last Line: one ground walker and charger before the boss, with boundaries released immediately on defeat. End-relative positions follow all course insertions. Remove stray heavy approach patrols; retain the original boss and arena.

## Lifecycle and compatibility

Combat arrivals have one second of warning and a 1.4-second attack-free window. Gates use player physics bounds rather than solid walls that could trap projectiles. Gates clear on completion, fall/retry reset, scene shutdown and test cleanup. Defeat checks ignore dying enemies (zero HP).

New encounter IDs use the existing campaign completed-encounter serialization and validation. A resumed checkpoint already beyond a combat beat treats it as complete without granting rewards. Saved completed beats never respawn their enemies. Existing rescue, escape and ferry objectives keep their own rules.

## Tests

`node scripts/test_level1_pacing_v1.mjs`: real attacks clear waves, ground-plane spawns, boundary enforcement/release, reward-once behavior, phone screenshot, fall/retry reset, and boss entry after the final wave.

`node scripts/test_run_gun_v1.mjs`: sustained cadence, running/jumping fire, touch cancellation.

`GAME_TEST_URL=http://127.0.0.1:4178 node scripts/test_route_encounters_v1.mjs`: existing escape/rescue/ferry regression.

`npm run build`: TypeScript and production bundle. Manual playtesting is still needed to judge pacing and difficulty with non-invincible heroes on physical phones/tablets.
