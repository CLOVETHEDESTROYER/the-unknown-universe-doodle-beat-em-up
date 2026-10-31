# Route encounter design and verification

Three short set pieces add a setup, mechanical challenge and payoff within existing levels. They use shipped terrain/enemy/companion assets and simple in-world cage/sign cues. Boss arenas, exits and cutscenes remain separate.

| Level | Encounter | Challenge | Payoff |
| --- | --- | --- | --- |
| 1 — The Scratch | Rooftop Runout | Warning, two-enemy ambush, then three cracking roof sections between the existing gaps. Keep moving; the raised route remains usable. | +300 score and up to 20 health on reaching safe ground |
| 2 — Graveyard | Doghost’s Rescue | Two guards protect a cage above the graves. Defeat both, jump to the released orb and collect it. | Doghost joins through the existing companion system; +300 score |
| 4 — Witchwood | The Last Ferry | Ride the horizontal moving platform for at least 250ms, clear two small waves, and reach the far shore. Second wave gets its own warning. | +400 score and a ready shield |

No encounter closes a passage or locks the camera. Players can continue toward the boss without finishing the rescue/ferry objectives. New groups replace nearby patrols so these are composed encounters rather than a large increase in enemy density. Warnings last 2.2 seconds; the second-wave warning lasts 1.3 seconds. Arriving guards cannot attack for their first 1.4 seconds.

Encounter logic advances on simulation delta and freezes during pause/hit-stop. Failed, unfinished attempts reset guards and crumbling terrain. If a rescue orb has already been released, it stays available on that scene’s retry instead of spawning twice. Saved runs persist completed encounter IDs; older saves without the field still load. Completed bonuses cannot be granted again after reload. A save during an unfinished encounter resumes the campaign checkpoint and restarts that encounter normally.

Implementation: gameplay/routeEncounters.ts holds plans; gameplay/routeEncounterRuntime.ts manages warnings, waves, cage/orb state, ferry riding and payoff. The platformer supplies combat/terrain callbacks and includes encounter state in render_game_to_text. Objectives scale to a minimum readable phone text size inside the canvas. Level terrain/checkpoint indexes are unchanged apart from the three bridge floor sections becoming crumbling surfaces.

Preview with the normal dev server:

- `?autostart=1&level=1&encounter=rooftop_runout`
- `?autostart=1&level=2&encounter=doghost_rescue`
- `?autostart=1&level=4&encounter=last_ferry`

These are preview runs and do not overwrite the browser campaign save.

Browser regression: `node scripts/test_route_encounters_v1.mjs` (GAME_TEST_URL defaults to http://127.0.0.1:4385). Optional GAME_TEST_BROWSER=webkit and GAME_TEST_EXECUTABLE select an installed WebKit executable. Tests use actual keyboard attacks against event guards and real pickup/collision paths; position hooks bound the traversal time. Evidence is written to ignored output/route-encounters-v1.
