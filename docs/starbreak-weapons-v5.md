# Starbreak Run: weapon pickups and stronger sense of speed

Player ship destruction and delayed last-life Game Over are covered in [the ship death pass](starbreak-ship-death-v6.md).

Current equipment wear/drop rules are covered in [the shared powerup pass](ground-powerups-v1.md): ship upgrades survive three hull hits, then revert to twin cannons; death also drops the upgrade. These rules supersede the original retention rules below.

## Three upgrades

Fly into a colored weapon core to equip it. Hold Space/C or the phone's FIRE button as before. The latest pickup replaces the active weapon, with unlimited ammunition; ordinary hull damage does not remove it.

| Pickup | Weapon | Firing behavior |
| --- | --- | --- |
| Amber fan core | Spread Shot | Five1-damage bolts in a ±0.22rad fan every230ms; broad coverage |
| Magenta crystal | Plasma Lance | One3-damage bolt every280ms, piercing up to four different ships/asteroids; focused line clearing |
| Cyan rocket core | Homing Missiles | Two1.75-damage tracking rockets every340ms; steers toward forward enemies, or rocks when no preferred enemy is available |

The original twin cannons remain the starting weapon (two1-damage bolts every190ms). Shots use the ship's existing visible muzzle sockets and banking. Each upgrade has its own art, projectile color/shape, concise collection message, and permanent HUD badge. Pickups carry the weapon name rather than a misleading keyboard prompt.

Six cores appear along the normal route: Spread1350/9700, Lance4050/12450, Homing7000/15000, with different heights encouraging steering. All three types are available before the boss. Picking up another type changes the firing pattern immediately. Core positions and their bob are shared by collision/render/debug output.

Checkpoints snapshot the current weapon and collected-core IDs. A lost ship restores the checkpoint's weapon, and cores collected since that checkpoint become available again. A retry before the first checkpoint restores twin cannons. The final checkpoint saves the weapon carried into the Pursuer fight. Landing clears combat; vehicle weapons do not change ground equipment.

The lance can damage each object only once per bolt. Homing missiles turn at a bounded rate, favor live forward enemies, retarget after a kill, and expire normally. All weapons respect the Pursuer's guard; spread pellets deal half damage to that boss to keep a close-range fan from bypassing the intended fight. Boss HP labels round up for readable display with fractional rocket damage.

## Faster visual motion

The cloud layer now scrolls at1.35× travel instead of0.45× (three times its prior speed). Ascent scenery moves at0.34× instead of0.12×; Witchwood at0.30× instead of0.18×; the destination at0.13× instead of0.07×. The single wide orbital panorama drifts faster within its bounds, without tiling the destination planet.

Thirty-four subtle streaks at several speeds pass behind the action, with a longer animated engine flame. Launch ramps the streaks up, landing fades them out, and pause freezes them. Route travel stays230px/s, retaining obstacle reaction time, checkpoint spacing, and encounter timing. The faster motion is presentation rather than a shortened route.

## Sources

- `gameplay/flightWeapons.ts`: weapon definitions, pickup plans, bob.
- `gameplay/flightCombat.ts`: firing patterns, piercing hit history, homing, boss guard.
- `gameplay/flight.ts`: real pickup collection and checkpoint snapshots.
- `gameplay/flightVisuals.ts`: scenery rates and streak positions.
- `components/FlightGameEngine.tsx`: icons, weapon HUD, projectiles, pickup presentation and parallax.
- Generated originals/prompts/tool details: `art/starbreak-weapons-v5/README.md`; shipped art: `public/flight/weapons-v5/{spread,lance,homing}.png`. Repack with `python scripts/pack_flight_weapon_icons_v5.py`.

## Verification

- Build passed (`index-CsGJCOWI.js`). TypeScript retains pre-existing legacy/platformer errors; none target the changed flight modules.
- `test_flight_weapons_v5.mjs` passed ten groups: distinct shot patterns; lance damage through successive objects without duplicate hits; off-axis homing hits; all upgraded shots blocked by boss guard; checkpoint equipment/pickup restoration; real keyboard collection and firing for all three upgrades; faster scenery with unchanged230px/s travel and pause; simultaneous phone steering/fire/cancel. Controlled simulation checks isolate weapon mechanics; browser tests fly into actual pickups rather than granting an equipped weapon.
- Existing nine-group flight combat regression passed. The complete flight regression passed with all10beacons, three lives,90hull,12ship kills, and successful boss defeat/landing intoLevel6, plus inventory, companions, all pilots, steering, pause, collision, checkpoints and game over.
- All fourteen finale groups passed: both boss phases and patterns, guards/counters, transition, death cleanup, checkpoint retry, touch, difficulty and landing.
- Inspected the icon atlas, three pickups/firing patterns, phone HUD and upgraded firing. The established production client ran `tests/game-flight-weapons-v5.actions.json`: real Spread core collected/equipped,34streaks, three lives,80hull,25shots, no missing assets or browser error files. Its final image was inspected. Evidence: `output/starbreak-weapons-v5/` plus the existing flight/combat/finale regression folders.

These are automated checks, including accelerated simulation; the complete route used the fixed verification seed20261016. Human playtesting should guide weapon balance and the strength of the speed streaks. No deployment or commit.

## Try it

- Normal route: `http://127.0.0.1:3000/?autostart=1&level=5`
- First Spread core: add `&weaponPreview=spread`.
- First Lance core: add `&weaponPreview=lance`.
- First Homing core: add `&weaponPreview=homing`.

Preview links position the ship before a real core; the player still has to collect it. They are optional setup links, not the normal campaign flow.
