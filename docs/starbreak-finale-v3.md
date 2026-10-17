# Starbreak Run — completed flight chapter

Current boss: [Pursuer movement/difficulty pass](pursuer-v4.md) adds three
health phases, four moving attack patterns, marked barrage corridors and
72/92/112 health. The longer counter windows and four-pose wreck remain.

Latest: the [weapon pickup and speed pass](starbreak-weapons-v5.md) adds Spread Shot, Plasma Lance, Homing Missiles, checkpoint equipment saves, and faster visual motion.

Update: the [destruction and asteroid-field pass](starbreak-destruction-v4.md) replaces the fixed fifteen rocks with randomized destructible asteroids, expands explosion effects, and makes regular gunships damageable throughout their attacks. The Pursuer encounter below remains current.

Level 5 is ready in the current game: Witchwood → **Starbreak Run** → Dread Planet. All planned flight milestones are implemented. The optional legacy brawler keeps its four-stage campaign.

## The finished route

- Board the armed ship after original Kilina's Witchwood exit. Every selectable hero can pilot it; equipment, companions, score, and remaining lives carry through landing.
- Climb through generated pencil-and-ink cloud scenery into a dedicated orbital panorama. Cloud and distant scenery move at different rates. The orbit camera drifts inside one wide illustration so its destination planet does not repeat at a tile seam.
- Follow ten gold beacons through fifteen asteroid obstacles and five enemy formations. Existing scouts, interceptors, cannon sockets, rock cover, gunship counter windows, and repair drops remain.
- Checkpoints at 6000, 11500, and 15300 route units. The final checkpoint supplies up to 25 hull once; retries restore full hull and briefly protect the ship. Stable credited enemy/beacon IDs prevent reward farming.
- Defeat the Void Pursuer before landing. Route progress stops at 15400 while background motion continues; the final 1600 route units unlock after its defeat animation. Landing and disembarking lead into Void Regent's Level 6.

## Void Pursuer

An original silver/plum command craft with a red crystal reactor. Existing ready/attack art now joins a dedicated four-frame hull destruction sequence. Banking, wreck drift and timed explosions support the progressively buckled, broken and blackened hull drawings. Sources and timing: [boss defeat pass](boss-defeats-v1.md).

| Mechanic | Phase one | Phase two | Phase three |
| --- | --- | --- | --- |
| Base attack warning | 1.1–1.4s, fixed targets | 0.975–1.275s | 0.85–1.15s |
| Weaving prism fan | One 3-bolt fan | Two 5-bolt fans | Two 7-bolt fans |
| Curved sweep | 1.75s out-and-back arc | 1.55s plus 2 outward bolts | 1.4s plus 4 bolts |
| Firing strafe | 3 single shots | 4 paired volleys | 5 triple volleys |
| Lane barrage | 2 walls, marked safe lane | 3 faster walls | 3 faster walls |
| Gold counter opening | 3.0s | 2.6s | 2.6s |

Purple guard blocks shots throughout entry, warnings, attacks, and phase change. Only the gold recovery window accepts ordinary damage. At 68% and 34% health, the current full opening finishes before a protected one-second phase change. Phase-specific rotations use all four attacks. Easy/Hard/X-GOD health is 72/92/112 and plasma damage is 10/14/18; higher difficulties also shorten warnings and speed up aimed plasma. Shared hit protection prevents one volley stacking multiple immediate hits. The boss awards 700 points once. Its 2.35-second defeat sequence clears hostile bolts, plays four damaged/wrecked hull frames, drifts/falls through timed explosions, then opens the landing corridor.

Arrow keys/WASD steer; hold **Space/C** or touch **FIRE** for twin cannons. Pause freezes the simulation. Held touch controls clear before returning to platforming.

## Implementation and assets

- `gameplay/flightPursuer.ts`: closing encounter and timing.
- `gameplay/flightCombat.ts`: encounter integration, guard checks, hits, projectile cleanup, and retained rewards.
- `gameplay/flight.ts`: progress lock, independent scenery travel, final checkpoint, and hull repair.
- `components/FlightGameEngine.tsx`: generated backgrounds, sprite poses, attack marks, gold cues, health bar, boarding, and landing.
- Calling the automation hook `advanceTime` transfers the flight simulation to manual stepping, preventing screenshot/render delays from advancing attacks twice. Ordinary gameplay retains its real-time clock.
- New assets: `public/flight/{ascent-panorama,orbit-panorama,cloud-parallax}-v3.png` and `public/flight/void-pursuer-v3.png`.
- Exact generation prompts, sources, and normalization: [asset record](../art/starbreak-finale-v3/README.md).

## Verification

- `npm run build` succeeds.
- `scripts/test_starbreak_flight.mjs` traverses the entire course using real steering and held fire, collects all ten beacons, defeats the Pursuer, and lands with three lives. It also checks all heroes, companion/equipment carryover, held-input cleanup, hull damage/protection, checkpoint recovery, game over, touch cancellation, and six-stage navigation. Final checkpoint repair is asserted separately during traversal.
- `scripts/test_starbreak_finale_v3.mjs` runs the expanded `test_pursuer_v4.mjs` suite: all four attacks in all three phases, guarded shots, route lock/scrolling, pause, fixed marks, real keyboard counter damage and barrage steering, wreck frames, landing, checkpoint retry and difficulty health/plasma damage. Position hooks isolate individual scenarios; no hook directly kills or damages the boss. `test_pursuer_v4_sim.mjs` checks all 36 difficulty/phase/pattern combinations and complete phase-change openings.
- `scripts/test_starbreak_combat_v2.mjs` repeats nine ordinary combat checks: cannons, scouts, rock cover, charge commitment, actual plasma damage, gunship guard/opening/repair, pause, retry cleanup/reward retention, and simultaneous touch steering/fire.
- The established production gameplay client captures both the ordinary route and final encounter with the action files under `tests/`. Evidence and inspected desktop/phone images are under `output/starbreak-finale-v3/`, with the full-route and combat results in their existing output folders.

These are browser automation runs with accelerated simulation, not a manual real-time playthrough. Human feedback can still tune difficulty and feel. Repository-wide TypeScript continues to report existing legacy/platformer typing problems; no diagnostics target the flight modules. Current validation is recorded in [the Pursuer pass](pursuer-v4.md) and progress.md.

Play the complete level at `http://localhost:4380/?autostart=1&level=5`. The optional `flightFinale=1` review query starts at the final checkpoint; normal campaign entry starts with boarding.
