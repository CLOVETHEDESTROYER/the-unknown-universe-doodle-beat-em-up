# Platform routes and momentum obstacles

Five new 2,000-unit sections sit between the existing encounters and the ground
boss yards. These add 50 raised ledges, hurdles, conveyor decks, crumbling
platforms and ferries, plus five conveyor strips on the lower route. Coin trails
show the upper path; the ground path uses a 140-unit gap and normal jumps.
No new controls or character abilities are required.

| Stage | New section | Length before / after | Character of the section |
| --- | --- | --- | --- |
| 1 — Scratch | Skyline Express | 10,855 / 12,855 | Gentle forward belts, one swinging weight, spring entry and rooftop chain |
| 2 — Graveyard | Bell Tower Crossing | 10,855 / 12,855 | Reversing lower belt, two swinging weights and a vertical lift |
| 3 — Furnace | Cinder Conveyor Works | 9,485 / 11,485 | Forward belts, timed fire vent and moving crossing |
| 4 — Witchwood | Moonthorn Canopy | 9,700 / 11,700 | Reverse belt, crumbling canopy ledges and two swinging weights |
| 6 — Dread Planet | Orbital Causeway | 9,624 / 11,624 | Faster final pendulum, void vent and combined upper/lower routes |

The broad inspiration is platformer momentum, branching routes and readable
timing challenges. The game keeps its own terrain art, movement and combat.
Chapter five retains ship flight.

Conveyor arrows indicate direction and move with the belt. They carry a grounded
player at +85 or -75 units/second in addition to normal movement. They do not pull
an airborne player. Swinging weights show their anchors, chains and dotted swing
envelopes; their circular contact area deals the ordinary 12 terrain damage,
including the existing hit protection and character rules. Falling from an upper
route can lead back to the lower floor. Three flags per section provide safe
retries. The final raised landing ends early enough to drop onto its exit flag;
the following patrol starts farther inside the boss yard.

The camera gains vertical room only around these courses, keeping a full held
jump visible above the high route. Backgrounds remain filled while the camera
follows upward. Boss engagement restores the fixed arena frame and its exit
restrictions. Existing encounters, boss floors, patrol bounds, pickups and gates
move through the shared extension helper. Checkpoints stay sorted by route
position. Existing saves still resolve to a valid checkpoint index; checkpoints
near the inserted section can resume earlier in the revised route.

Turkey Storm measures its lightning height and rain spawn against the camera's
top edge, so elevated casts still call turkeys down from above the view.

Implementation:

- `gameplay/platformRoutes.ts` — course geometry and mechanism plans.
- `gameplay/platformRouteRuntime.ts` — conveyor carry, animated mechanism cues,
  swinging weights and shared damage callbacks, all using simulation delta.
- `components/PlatformerGameEngine.tsx` — terrain insertion, preview, checkpoint,
  camera and scene integration.
- `scripts/test_platform_routes_v2.mjs` — real keyboard spring/jump/ferry chains,
  low-route obstacles, conveyor carry, damage, pause, high-jump framing,
  checkpoint respawn, slower/taller heroes and phone jump checks.

Preview a section with
`?autostart=1&level=1&platformCourse=1&capture=1` (also levels 2, 3, 4, 6).
`render_game_to_text` exposes `platformRoute` with conveyor plans, current rider,
carried distance, moving weight positions and camera top. Browser evidence is
ignored under `output/platform-routes-v2`.

Validation passes: production build/typecheck, all five course mechanism and
camera groups, seven upper-route jump chains including Barrett and Turkey King,
two isolated lower-route traversals, checkpoint retries, phone jump, older
obstacle-section regression, all five boss arenas/reward rules, elevated Turkey
Storm, and the shared gameplay client. Upper jump chains finish without damage;
lower challenges finish with 88/76 health and no life loss. Screenshots were
visually inspected. Tests use position fixtures to isolate sections and actual
keyboard/touch inputs for traversal and combat; this is not a continuous manual
campaign playthrough or physical Safari verification.
