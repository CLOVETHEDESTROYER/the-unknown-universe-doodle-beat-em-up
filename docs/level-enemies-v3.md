# Exclusive chapter enemies

One new silhouette and signature attack per chapter. The common themed grunt remains; the Witchwood replaces its repeated graveyard ghost with the mantis. New ground enemies replace existing placements, keeping simultaneous enemy density and bounce lessons unchanged. Existing bosses and their deaths remain.

| Chapter | New enemy | Signature and counterplay |
| --- | --- | --- |
| 1 Rooftops | Spray Skater | Shakes its spray can, then fires three skipping paint blobs. Jump over the low shots or leave the committed firing direction; attack during the skid recovery. |
| 2 Graveyard | Bone Bellkeeper | Rings its bell to raise two tombstones beside the locked player position. Ground rings warn first; the two pillars activate in sequence. Leave the rings and counter while it recovers. |
| 3 Furnace | Boiler Crab | Marks a landing circle and lobs a coal bomb along an arc. The bomb bursts on terrain or at the committed landing point. Leave the landing zone; closed armor has no artificial invulnerability. |
| 4 Witchwood | Thorn Mantis | Winds up and throws a spinning serrated leaf which reverses after 600 ms. Jump or dodge both passes; the mantis stays still during recovery. |
| 5 Starbreak | Prism Ray | Folds its fins and marks three horizontal lanes relative to the committed aim. Fires one pulse per lane, 200 ms apart, then recovers for 1.4 seconds. Move between lanes; aim does not follow a dodge. Replaces the later scout wave. |
| 6 Void | Rift Maw | Opens its chest-mouth, marks the player's old position and releases four delayed diagonal stars. Leave the marked point before the stars arm; no pulling or input locking. |

All ground enemies have 650–900 ms warnings, committed aim, and 1–1.3 second recovery windows, followed by an additional attack cooldown. Contact and attack damage use the existing player invulnerability rules. Z God's immunity remains. Her pit return now clears normal enemy warnings/projectiles using the same cleanup as an ordinary checkpoint retry.

## Art and loading

Built-in ImageGen generated the original transparent colored-pencil sheets. Final source sheets, prompts/refinement instructions, contact sheet and per-frame reviews are in `art/level-enemies-v3/`. Conventional fixed-cell transparent PNGs are exported as `*-sheet.png` alongside the sources. Each sheet contains 16 poses: eight locomotion, two windup and two release/follow-through poses, then four defeat poses. Mantis and Prism Ray sheets were regenerated to separate overflowing attack art.

`python scripts/pack_level_enemies_v3.py` normalizes shared scale/foot anchors, removes stray fragments, and packs trimmed lossless WebP multiatlases in `public/enemies/level-v3/`. The runtime loads only the current chapter's enemy sets. Small paint/tombstone/coal/leaf/star/burst VFX textures are generated once per scene and reused; no extra network requests or per-frame canvases.

All six delivered sets total 2.43 MiB compressed and 8.83 MiB decoded, with six texture pages and 96 frames. Only the appropriate new set is loaded in each chapter. The final startup-budget check passes (423,916 title bytes, 25,748,383 completed-response bytes through first-level readiness in the local run); this is a bandwidth check, not a physical-phone speed measurement.

Combat removal and one defeat reward happen immediately on lethal damage. A separate sprite plays four defeat poses over 700 ms (ground) or 850 ms (flight), with no remaining enemy collider. Scene clocks pause warnings, projectile phases and deaths; checkpoint resets remove hostile hazards.

## Verification

- `scripts/test_level_enemies_v3.mjs`: real campaign placements/exclusivity, forest ghost removal, locomotion, committed warnings, actual signatures, bounce/return/arm/burst behavior, pause, real sword kills, defeat animation, and pit-reset cleanup. Chromium and WebKit phone-sized viewports.
- `scripts/test_unique_enemy_damage_v3.mjs`: ordinary X God takes each signature's exact damage without contact, and avoids the next attack by leaving its warning; checks real coal arc coordinates.
- `scripts/test_flight_enemy_motion_v2.mjs`: original ships plus Prism Ray, committed attack aim/pulses, pause, real cannon kill and all four destruction poses.
- Existing enemy, mobile controls, startup budget and standard web-game client checks cover surrounding behavior. Browser emulation does not replace physical-phone playtesting or a full manual campaign difficulty pass.

Production build is the release gate. The repository-wide TypeScript check has established legacy GameEngine/Phaser/mobileRuntime diagnostics; this change introduces no new diagnostics.

Quick ground encounters: `?autostart=1&level=1&enemyPreview=tagger`, chapter 2 `bellkeeper`, chapter 3 `boiler`, chapter 4 `mantis`, chapter 6 `mimic`. The flight Prism Ray is in the regular wave at distance 9000; capture mode exposes the existing `__unknownFlightEnemyTest('prism')` fixture for focused verification.
