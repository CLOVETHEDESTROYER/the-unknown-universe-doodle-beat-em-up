# Starbreak Run: destructible ships and randomized asteroid field

Update: the [weapon pickup and speed pass](starbreak-weapons-v5.md) adds three collectible firing patterns and faster scenery. The destruction/asteroid rules below remain, with the starting twin cannons now one of four available weapons.

## Gameplay

- Scouts, interceptors, and heavy gunships take cannon damage throughout their attack cycles. Gunships retain their larger health pool, warned fan attack, reload period, and repair drop. The regular gunship's previous invulnerability gate is removed; its label now reads HEAVY GUNSHIP / RELOADING. The Void Pursuer retains the established boss guard/opening fight.
- Asteroids have 3, 4, or 6 HP according to size. Twin cannons still fire two 1-damage bolts every190ms. Hits tint/crack the rock; destruction awards50 points once, removes its collision and shot blocking, and creates an animated explosion.
- Destruction uses an expanding generated-art impact burst, bright core, expanding ring, and seven rotating fragments sampled from the actual asteroid/enemy artwork. Fragments spread, fall, fade, and disappear over850ms. Damaged ships briefly flash. Effects use simulation time and stop during pause.
- Enemy plasma is blocked by intact asteroids. Destroyed rocks let both player and enemy shots through. Enemy ship kills still award the existing score/KO and heavy-gunship repair rewards; asteroid points are separate from ship KO counts.

## Random route

`gameplay/flightAsteroids.ts` generates a field from a per-flight seed. Fresh flights choose a new seed, while checkpoint retries retain the layout, partial rock damage, and destroyed-rock IDs. Cleared rocks cannot return to award points again.

Rows begin at1650 route units and continue with650–830-unit spacing before the finale. Individual rocks vary their vertical position, radius29–56, bob8–22, horizontal sway5–18, rotation, and starting phase. Later rows sometimes add a second rock170–300 units farther along in a separated vertical band. This staggers obstacles and leaves maneuvering room instead of making vertical walls. No new rocks enter the Pursuer arena. A typical field has roughly two dozen rocks; the verification seed20261016 has28, replacing the original15 fixed obstacles.

Field generation, HP, collision, scoring and destruction live in the simulation. The renderer and debug output both use the same `rockX` / `rockY` positions and active HP. Runtime changes are in `gameplay/flight.ts`, `gameplay/flightCombat.ts`, and `components/FlightGameEngine.tsx`. No new art generation was needed; all visuals reuse approved raster assets.

## Verification

- `npm run build` passed (`index-EYmnR5nz.js`). Full TypeScript still reports existing legacy/platformer diagnostics; no diagnostics target the changed flight modules.
- `scripts/test_flight_destruction_v4.mjs` passed ten groups: bounds/HP/reproducibility across200 generated fields; different fresh-flight seeds; real cannon damage/explosion/+50/removal; same-field retry with destruction retained; actual intact-rock hull damage; destruction of each of the three normal ship types (including gunship damage outside reload); pause freezing; and phone firing into an asteroid. Explosion debris and lifetime are checked in state and visually inspected.
- Updated `test_starbreak_combat_v2.mjs` passed all nine groups. Its expected regular-gunship behavior now checks damage during attacks instead of invulnerability, and the rock-fire check expects damage. It still verifies muzzle cadence, scout kills, locked interceptor charges, actual enemy bolt damage/hit protection, gunship fan/repair, pause, no-farming retries, and simultaneous touch steering/fire/cancel.
- `test_starbreak_flight.mjs` passed the complete route with real steering/fire, all10 beacons, three lives,80 hull, eight ship kills, and successful Pursuer defeat/landing into Level6. Boarding, steering/bounds, pause, inventory/companions, collision, lives, checkpoint retries/game over, all five pilots, and chapter navigation passed. This route regression pins its seed so failures are reproducible.
- All fourteen `test_starbreak_finale_v3.mjs` groups passed, including both boss phases/patterns, guard/counters, death animation/cleanup, final checkpoint, landing, touch, and difficulty scaling.
- Established production client ran `tests/game-flight-destruction-v4.actions.json`: seed20261016,28 rocks, one destroyed asteroid, three ship kills, full hull, no failed assets or browser error files. Inspected the production image plus damaged/breaking asteroid, debris, gunship explosion, and phone captures.

Evidence: `output/starbreak-destruction-v4/` and the existing flight/combat/finale regression folders. These are automated playtests, including accelerated simulation, not a manual real-time campaign run. Generator checks cover bounds and reproducibility across200 seeds; the complete route was checked on one fixed seed. Human feedback should guide further random-field difficulty tuning.

Play a fresh randomized run: `http://127.0.0.1:3000/?autostart=1&level=5`.
Use `&flightSeed=20261016` to replay the verification field. No deployment or commit.
