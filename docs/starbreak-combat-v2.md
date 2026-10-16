# Starbreak Run — milestone 2: combat

Latest update: [destructible asteroids and ships](starbreak-destruction-v4.md) supersedes the older rock-cover and regular-gunship armor rules below. All regular ships now take cannon damage at any time; boss guard windows remain.

Update: the [finished chapter](starbreak-finale-v3.md) now includes dedicated backgrounds, a final checkpoint, and the Void Pursuer. It replaces the last ordinary gunship wave with that closing encounter. The notes below record the approved second milestone's earlier six-wave layout.

## Controls and weapons

- Arrow keys / WASD steer. Hold **Space or C** to fire both cannons, with no ammunition limit. Every hero uses the ship's weapons. The touch pad and FIRE button can be held simultaneously; cancel/pause/landing release held controls.
- The generated ship now has visible twin barrels under its nose. Local muzzle sockets `(84,16)` and `(84,20)` rotate with the ship. The model and renderer share the same visual bank angle, so shots and muzzle flashes stay on those barrels while steering.
- Two one-damage bolts fire every 190 ms at 920 px/s. Shots expire and asteroids block both friendly and hostile fire. Cyan-white player bolts differ from pink-red enemy plasma.
- Contact/asteroid damage retains shared hit protection. Enemy plasma deals 12/16/20 hull on Easy/Hard/X-GOD; ship contact deals 16. The original rock damage and movement values remain. Landing and checkpoint retries clear hostile ships, bullets, effects, and repairs.

## Encounter roles

| Role | Behavior | Response |
| --- | --- | --- |
| Scout | Compact purple drone, 2 HP; groups weave through distinct lanes | Align the cannons and clear a lane, or steer past |
| Interceptor | Crimson dart, 4 HP; warns for 1 s on Easy / .85 s otherwise, then commits to its marked lane for a 1.05 s charge | Leave the fixed mark or destroy it before arrival; it cannot track during the charge |
| Armored gunship | Heavy silver/plum craft, 8/10/12 HP; a 1 s committed warning precedes a three-bolt fan | Dodge, then counter during its 1.75 s gold opening; purple guard blocks all shots |

Waves begin at route distances 650, 3300, 6400, 9000, 11650, and 13900, for twelve ships total. Warnings remain bright over the background; marked aim locks before attacks. Gunships fire from their visible forward cannon and cannot shoot backward through their bodies. Each encounter can be passed without a mandatory kill.

Scouts/interceptors/gunships award 100/180/300 points. A destroyed gunship drops a green cross repair restoring up to 15 hull. Stable enemy IDs retain credited defeats across checkpoint retries; already destroyed enemies do not respawn to award points or repairs again. The HUD's KO count carries those defeats into Level 6.

## Implementation and assets

`gameplay/flightCombat.ts` owns waves, entity lifetimes, warnings, committed aim, shots, armor, hit checks, scoring, repairs, and retry cleanup. `gameplay/flight.ts` calls it from the existing small simulation steps. `components/FlightGameEngine.tsx` renders the model, and the shared touch controls provide simultaneous steering/fire.

Built-in `image_gen` generated the armed craft from the approved original ship and a three-enemy source illustration. Original transparency is retained. Project-bound assets:

- `public/flight/starbreak-ship-armed-v2.png`.
- `public/flight/{scout,interceptor,gunship}-v2.png`.
- Original enemy sheet: `art/starbreak-combat-v2/enemies-generated.png`.
- Repack: `python scripts/pack_starbreak_enemies_v2.py`. It detects the three separated alpha silhouettes, crops and adds transparent padding without redrawing.
- Complete generation prompts and original tool filenames: [generation record](../art/starbreak-combat-v2/README.md).

## Checks and user review

`scripts/test_starbreak_combat_v2.mjs` covers actual keyboard shots and muzzle/cadence alignment, scout kills, rock cover, committed charges, real plasma damage and protection, guarded/open gunship hits, repairs, pause, retry cleanup, duplicate-reward prevention, and simultaneous touch steering/fire/cancel. Setup hooks position the player for isolated scenarios; all weapon damage comes from real keyboard shots.

`scripts/test_starbreak_flight.mjs` repeats the full course using real steering and held firing, followed by landing/gear/companion and held-input handoff, damage/checkpoint/game-over, all-hero asset, touch, and navigation checks. Automation advances simulation time and is not a manual real-time playthrough. The established production client uses `tests/game-flight-combat.actions.json`. Evidence is in `output/starbreak-combat-v2/` and the existing flight playtest folder. Existing legacy/older platformer TypeScript failures remain; no diagnostics target the new flight combat files.

Play `http://127.0.0.1:3000/?autostart=1&level=5`. Review firing feel, warning visibility, gunship counter time, and pressure while weaving between rocks. The next milestone follows this feedback and covers dedicated flight scenery and the closing encounter.
