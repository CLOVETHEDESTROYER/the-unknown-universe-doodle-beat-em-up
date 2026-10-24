# Starbreak Run: faster, multidirectional encounters

Flight now has 13 waves and 28 ordinary ships, up from five waves and ten ships. Waves arrive every 4.8–5.4 seconds after the opening formation, instead of roughly 12 seconds. The route, checkpoints and Void Pursuer remain at their established distances.

| Enemy | Flight behavior |
| --- | --- |
| Scout | Faster forward travel, wider 60px weaving, paired aimed plasma and shorter intervals between attacks. |
| Interceptor | Approaches from the front, above or below; locks its target before a 0.95-second diagonal dash that continues past the marked point. |
| Gunship | Enters from above/below, then shifts horizontally and vertically while reloading between three-shot fans. |
| Prism Ray | Arrives from the front or above, repositions between committed three-lane laser volleys and reloads faster. |

Top/bottom formations hold outside the playfield for at least 950ms, with staggered arrivals, pulsing directional markers and ABOVE/BELOW labels. They then visibly enter over 1.25 seconds before attacking. Warning timers freeze while paused. Interceptor warnings display the same committed endpoint used by collisions; dodging cannot cause the charge to retarget. Ships face their actual firing direction, including a pilot who has flown behind them.

Ordinary ship base HP is now 3 / 5 / 7 for scouts / interceptors / Prism Rays, and 10 / 12 / 14 for gunships on Easy / Hard / X-GOD, before the existing 1.15 enemy-health multiplier. All regular ships still take damage at any time. Gunship repairs, four-frame death animations, scoring and checkpoint defeat credits remain active. Entering the Pursuer fight clears the ordinary waves and prevents pending waves from joining the boss.

No additional textures are loaded: the encounters reuse the current movement, warning, attack and death sprite sheets. A no-fire route simulation reaches at most six concurrent regular enemies and eleven hostile bolts, across all difficulty modes.

Checks:

- `node scripts/test_flight_pressure_v3_sim.mjs`: campaign schedule, entry holds, movement, committed charges, health, damage/rewards, checkpoint cleanup, integration and boss handoff.
- `node scripts/test_flight_pressure_v3.mjs`: phone/tablet browser campaign, visible warnings and pause, simultaneous touch steering/fire/cancel, actual damage, destruction and repair collection. Supports `GAME_TEST_BROWSER`, `GAME_TEST_DEVICE`, `GAME_TEST_EXECUTABLE` and `GAME_TEST_URL`.
- Existing enemy-animation and Pursuer suites cover death frames, attacks, the three-phase boss, and landing.

Local play: <http://localhost:4380/?autostart=1&level=5&character=xgod>.
