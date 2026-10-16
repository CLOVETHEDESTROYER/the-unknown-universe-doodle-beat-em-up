# Starbreak Run — milestone 1: flight feel

Update: all flight milestones are complete. See the [finished chapter](starbreak-finale-v3.md) for the current scenery, combat, closing boss, and verification. The remaining notes record the original traversal pass.

The six-stage platformer campaign now travels through Scratch → Graveyard → Furnace → Witchwood → **Starbreak Run** → Dread Planet. Kilina's Level 4 exit boards a spacecraft; landing advances to Void Regent's Level 6. The optional legacy brawler retains four levels.

## This playable milestone

- The selected hero walks to the craft, boards, and appears in the cockpit. The craft lifts off from Witchwood's clearing, and the same hero disembarks on arrival.
- Arrow keys or WASD steer in four directions. Diagonal input is normalized. Acceleration is 2300 px/s², reversal 3000, release braking 2600, maximum ship speed 340 px/s. Screen bounds prevent leaving the playfield; vertical velocity drives a restrained bank.
- A 17,000 px route scrolls at 230 px/s (about 74 seconds of controlled flight). Fifteen asteroid placements teach low/high avoidance, wide paired gaps, and gently bobbing rocks. Gold beacons suggest optional paths and award 75 points each. No route requires collecting them.
- Compact ship collision uses a 92×32 core and asteroid circles, excluding decorative fins. Hits cost 20/26/32 hull on Easy/Hard/X-GOD, with 1.6 seconds of protection. Losing the hull costs one carried life. Checkpoints at 6000 and 11500 restore the ship safely with 2.5 seconds of protection; collected beacons cannot be farmed on retries. Last-life loss uses the existing Game Over screen.
- Launch, smooth landing, and disembarking are automatic. Inventory and companions remain on board and carry forward. The platformer now receives carried lives instead of resetting them to three on mount. Hull refills for the next chapter, consistent with the existing chapter health reset.
- The flight HUD shows ship hull, carried ships/lives, progress, checkpoints, and steering guidance. Touch uses a four-direction pad. Pause freezes simulation and route progress. Fullscreen uses the existing F shortcut.

Combat, enemy formations, weapon upgrades, an interceptor encounter, and bespoke atmosphere/orbit scenery belong to the next milestones. This first course is deliberately open and forgiving so the user can judge steering, drift, speed, and obstacle spacing first.

## Implementation and artwork

`gameplay/flight.ts` owns deterministic simulation, route data, damage, and progression. `components/FlightGameEngine.tsx` adapts that state to Phaser sprites, boarding/landing animation, input, parallax, effects, and shared React HUD updates. It runs only at `FLIGHT_LEVEL`; ground stages retain their engine and controls. `campaign.ts` defines flight level 5 and final level 6. App routing, music, navigation, labels, victory cap, final terrain preload, and the Gravity Core's stage follow those numbers.

Generated with the built-in `image_gen` tool; original RGBA alpha is preserved:

| Asset | Project path | Source output |
| --- | --- | --- |
| Ship | `public/flight/starbreak-ship-v1.png` | `exec-cc9fae51-1308-4342-9a95-3e626c168cbf.png` |
| Asteroid | `public/flight/starbreak-asteroid-v1.png` | `exec-71583462-97e5-4b44-83e5-7adb153ac351.png` |

Existing Witchwood, cosmic landscape, and Dread Planet artwork supplies the milestone's changing backgrounds, scrolling at different speeds. Existing hero walk/head sprites, stone texture, and impact artwork supply the remaining visuals. Exhaust, stars, beacon rings, and warning chevrons are native Phaser effects.

### Ship prompt

> Create ONE isolated side-view spaceship sprite for a hand-drawn colored-pencil and black-ink platform game called The Unknown Universe. Ship faces RIGHT, horizontal level flight, full vehicle comfortably inside frame, genuinely transparent background. A small nimble single-pilot fighter with cream/off-white pencil-shaded fuselage, lime green chunky swept fins, burnt-orange bolts and belly panel, black hand-inked outlines, worn paper-pencil texture. Friendly homemade space adventure aesthetic with strong readable silhouette. Pointed nose at right, rear engine nozzle at left (NO flame/exhaust, engine will be animated separately). A LARGE pale blue transparent-looking rounded cockpit canopy on top around 55 percent across from left, empty interior with a dark seat visible, no pilot or characters. Landing struts folded underneath, two small gold wing lights. Medium clean side elevation, no perspective tilt, no detached pieces, no text, no logo, no ground shadow or background, no glossy 3D or photorealism. Output width about 2.5 times height. Keep cockpit easy to see and entire craft opaque except true transparent outside silhouette.

### Asteroid prompt

> One isolated asteroid obstacle sprite for a hand-drawn colored-pencil and ink side-scrolling space game. A roughly round irregular chunky meteor rock, dark lavender-gray stone with warm tan exposed facets and tiny cyan mineral veins, clearly defined black ink outer contour, pencil cross-hatching and grain matching an illustrated children's adventure platformer. Strong readable silhouette, no glowing aura. Single full rock centered with generous transparent margin, about 70 percent of square frame, genuinely transparent background, no stars, no scenery, no floor, no shadow, no text, no other rocks or objects, no glossy 3D. Craters and cracks give it weight; readable at 80 pixels.

## Verification and handoff

`scripts/test_starbreak_flight.mjs` uses real keyboard input for a complete course, steering response/release, diagonal normalization, screen bounds, and pause. Position/damage hooks isolate individual collision and respawn checks. Additional checks cover checkpoint recovery, game over, touch cancellation, all five hero assets, inventory/companion arrival, carried lives, and six-level navigation. `window.advanceTime` advances the flight simulation in small steps to keep the route reproducible. This automation is not a manual real-time playthrough.

The established production client uses `tests/game-flight-steering.actions.json`. Evidence is saved under `output/starbreak-flight-v1/`. Consult the newest passing JSON; earlier failure artifacts are retained. Boss transition checks use `scripts/test_boss_encounters_v2.mjs 4` and `6`. Shared campaign UI checks use `scripts/test_witchwood_ui.mjs`. Existing project-wide TypeScript failures in the legacy/older platformer code remain; no diagnostics target the new flight files.

Play: `http://127.0.0.1:3000/?autostart=1&level=5`. Start from Witchwood's boss normally to experience the preceding transition. **Stop for user feedback on flight feel before milestone 2 combat.**
