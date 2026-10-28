# Original enemies restored to the platformer

This milestone reintroduces four drawn enemies already shipped with the original brawler. Existing placements are replaced; enemy counts and boss encounters stay the same. Xgod's movement and the campaign's platform layout are retained.

| Enemy | Movement and attack | Counterplay |
| --- | --- | --- |
| Bramble Spider | Three-frame scuttle, 500ms arrow warning, real physics hop and committed pounce, 700ms recovery | Jump over the pounce, stomp its crown, or shoot it before it closes |
| Red Wisp | Floating patrol with bob and sway; marks a position for 650ms, dives to that fixed spot, glides home over 1100ms | Move away from the mark; stomp from above or attack during its low dive |
| Moonlight Terror | Slow walk, 750ms direction warning, five-slot drawn tongue-flail sequence, 1000ms recovery | Stay outside its forward reach or jump behind it, then counter |
| Cosmic Sentry | Ground patrol, 650ms visible aiming line, two shots 220ms apart at one fixed target, 950ms recovery | Change height or direction after aim locks; use terrain and its recovery |

Every restored enemy takes normal weapon damage and can be defeated with a descending stomp. They have 3/3/6/4 HP respectively. No new boss armor rules apply to them. Attack targets and directions are committed at the warning rather than tracking the hero throughout the attack.

## Stage placement

- Scratch (1): spiders and Moonlight Terror; the first walker and the three bounce-lane targets remain.
- Graveyard (2): wisps, spiders, and Moonlight Terror.
- Furnace (3), Witchwood (4), Dread Planet (6): all four, mixed with the existing walkers, aliens, dashers, and giants.
- Starbreak Run (5) keeps its flight enemy roster.

`gameplay/enemyVariety.ts` defines the roles, timing, and replacement slots. The replacements operate on a copied level plan after the existing level extensions, so shared campaign data is not mutated.

## Art and footing

`scripts/pack_restored_enemies_v1.py` packs `spider_walk/attack.png`, `ghost_float.png`, `moonlight_terror_walk/attack.png`, and `doodles/cosmic_grunt_walk_ai.png` into `public/enemies/restored-v1/`. It preserves the original raster art and alpha; no image generation or redraw was needed.

- Cells are 512px, with feet at `(256,480)` and one shared scale per character across its actions.
- Horizontal packing uses the feet rather than the full silhouette, preventing the Terror's extended tongue from shifting its body sideways.
- Main-silhouette bounds exclude remnants of adjacent sprites in the original strips. The original Terror's broken second attack cell is replaced by its next complete pose. The ghost keeps its approved floating appearance throughout the dive, rather than switching to the differently proportioned legacy attack image.
- Body profiles are measured from the packed walk art, saved in `metadata.json`, and generated into `gameplay/restoredEnemyBodies.ts` for the runtime.
- Ground patrols are constrained to supporting platforms with margins measured at actual display scale. Normal enemies honor one-way platforms on descent and pass upward through them. Wisps deliberately float through terrain.
- Scripted ghost movement uses the existing synchronized body-placement helper, including custom body offsets and previous positions, so collision bounds track the visible dive.
- Death destroys aim markers. Checkpoint falls clear restored-enemy markers/volleys and give encounters a fresh delay. Normal hostile pulses now expire after 3200ms.

Rebuild art with `python scripts/pack_restored_enemies_v1.py`. The review sheet is `output/enemy-variety-v1/restored-art-review.jpg`.

## Playtest links

- Normal opening: `http://127.0.0.1:3000/?autostart=1&level=1`
- Spider preview: `http://127.0.0.1:3000/?autostart=1&level=1&enemyPreview=spider`
- Wisp preview: `http://127.0.0.1:3000/?autostart=1&level=2&enemyPreview=ghost`
- Sentry preview: `http://127.0.0.1:3000/?autostart=1&level=3&enemyPreview=cosmic`
- Terror preview: `http://127.0.0.1:3000/?autostart=1&level=2&enemyPreview=terror`

Preview links position the player before an actual campaign enemy. The existing setup-position hook now centers an unlocked camera for readable automated captures; boss arena camera locks remain intact.

## Verification and limits

Focused browser checks: `scripts/test_enemy_variety_v1.mjs`. It verifies all five ground-stage rosters and supporting surfaces, all four complete attack cycles with fixed targets, paused warnings, ghost body alignment, real pounce/dive displacement, drawn attack frames, two-shot sentry volleys, four real stomp kills, gun defeats of ground enemies, actual sentry projectile damage, checkpoint arrival/shot cleanup, and phone framing. Position hooks establish the scenario; actual keyboard/game collision produces damage and kills. Capturing canvas pixels while paused keeps short poses readable without the pause overlay obscuring them.

Build passed (`index-Do6h5fOK.js`). The focused enemy checks passed with no browser errors. Existing regressions passed: all eight groups in `scripts/test_stomp_flow.mjs`, and ten groups in `scripts/test_combat_presentation.mjs`, including gun controls/damage, grounded aliens in four stages, sword attacks, dragon defeat, and the exit transition. Production captures use the established `scripts/run_game_test.mjs` with `tests/game-enemy-variety.actions.json` and `tests/game-enemy-gallery.actions.json`.

Evidence lives in `output/enemy-variety-v1/`. Production captures were inspected for all four encounters with no failed assets or browser error files; ghost/Terror captures use the final build. These are focused automated checks, not a manual full-campaign playthrough. Existing legacy/Phaser TypeScript diagnostics are recorded separately in `typecheck.txt`. Human feedback on encounter spacing, warning clarity, and difficulty should guide the next tuning pass.

The playable-roster animation/special-move pass and Teleportation C's expanded teleport toolkit remain queued requests; they are not implemented by this enemy milestone. No deployment or commit.
