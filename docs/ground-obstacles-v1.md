# Ground-level obstacle pass

The three shortest ground stages now have substantial new sections before their original boss arenas. Existing generated artwork supplies the platforms, springs, and hazards. Campaign order and combat remain intact.

| Level | Previous length | Current length | Addition |
| --- | ---: | ---: | ---: |
| Scratch (1) | 10,855 | 10,855 | Existing longer rooftop course |
| Graveyard (2) | 10,855 | 10,855 | Existing longer lift course |
| Furnace (3) | 7,085 | 9,485 | 2,400 / 34% |
| Witchwood (4) | 7,500 | 9,700 | 2,200 / 29% |
| Starbreak Run (5) | 17,000 | 17,000 | Flight chapter |
| Dread Planet (6) | 7,124 | 9,624 | 2,500 / 35% |

## Obstacles and route choices

- **Spring shortcuts:** a spring launches toward an elevated coin route. The ground below remains a simpler alternative, with only normal-jump gaps.
- **Crumbling ledges:** visible cracks identify unstable surfaces. Landing starts a 700 ms shake; the ledge then drops/fades and loses collision. It returns after 2.6 seconds, waiting if the player occupies its space. Death/fall resets these ledges. Keep moving and jump to the next ledge rather than waiting on one.
- **Sideways moving platforms:** guide rails show the travel range. Platforms carry a standing rider; jumping off keeps normal player controls. Existing vertical lifts retain their behavior.
- **Timed eruptions:** Furnace flame vents and Dread Planet void plumes remain dormant for 1.5 seconds, show an amber outline over the exact danger rectangle for .95 seconds, then activate for 1.75 seconds. They deal normal 12-point terrain damage and share existing hit protection. Players can wait, jump over, or take the raised route. The active art uses cropped flame tips from the existing generated hazard sheets, avoiding empty transparent texture corners.
- **Readable combinations:** the first Furnace vent is separated from the nearest ranged enemy; later areas combine terrain and enemy pressure. Witchwood emphasizes ruins, springs, crumbling paths, and a moving crossing; Dread Planet combines the learned mechanisms.

New mandatory gaps are 140–170 units wide. Hurdles are 78–90 units high. Each section has safe ground around its new checkpoints and health pickups before the arena. Optional upper paths can pass over small flags; players can drop to activate them.

The extension helper moves boss floors, patrol limits, rewards, and exits together. It now also shifts springs, challenge stars, and obstacle plans consistently, and sorts checkpoints by position. This corrects older appended checkpoints whose indices could otherwise prevent a later flag activating. Ground-level **P** now pauses and resumes; its listener remains active while the scene is paused.

## Code and review

- `gameplay/groundObstacles.ts`: crumble state and eruption timing.
- `components/PlatformerGameEngine.tsx`: stage plans, world integration, moving platform collision/carry, generated art, obstacle feedback, and debug state.
- `scripts/test_ground_obstacles_v1.mjs`: stage lengths/assets, checkpoint ordering, crumble/drop/return/pause, ferry ride/jump/bounds, real eruption damage and safe interval, keyboard traversal of each extension, checkpoint respawn, and phone framing.
- `scripts/test_witchwood_route.mjs`: complete Witchwood traversal, updated for its longer layout.
- `scripts/test_ground_springs_v1.mjs`: all fifteen hero/stage spring landings, attack footing, and Nico/Ezra shot height.
- `scripts/test_boss_encounters_v2.mjs`: full boss/campaign regressions for the shifted arenas.
- `tests/game-ground-obstacles.actions.json`: established production gameplay client input.

Evidence is stored under `output/ground-obstacles-v1/`. Route position hooks start isolated scenarios; traversal and fighting use actual keyboard inputs. Production captures and phone screenshots are inspected separately. Browser automation is not a manual human playthrough, and further difficulty/feel tuning should follow user feedback.

Final checks passed: all three added sections without checkpoint falls or life loss (Furnace/Witchwood 100 health at the final flag; Dread Planet 88), safe checkpoint respawns, all fifteen hero/stage spring landings and attack-footing checks, the full Witchwood route with carried companions, all three complete shifted boss encounters (27 grouped checks including final victory), and the existing eight-group Level 1 stomp regression. The production build and all three established gameplay-client captures passed with no failed assets or browser errors. Desktop, phone, active hazard, ferry, and Barrett attack images were inspected. Full repository TypeScript still has the known legacy/platformer typing diagnostics; the new obstacle module has none. No deployment or commit is included.

Roster compatibility checks also uncovered an older floor-snap that reset the traditionally drawn heroes' movement. They now use a consistent foot origin and collider across walk/jump/attack cells, including the wider attack frames. Nico/Ezra shots originate at body center. Xgod's approved sprite poses and collider stay intact.

Play normally using `?autostart=1&level=3`, `level=4`, or `level=6`. Add `&obstacleCourse=1` to start at that level's new section for focused review. No new controls are required.
