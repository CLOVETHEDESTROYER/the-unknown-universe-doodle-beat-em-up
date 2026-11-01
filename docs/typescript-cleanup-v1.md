# TypeScript and playability cleanup

The application now passes `npm run typecheck`. Production builds run the type check first, so source errors cannot be silently bundled. `tsconfig.json` excludes generated output, dependency folders and old project copies; application source files remain checked.

## Source fixes

- Removed three duplicated legacy brawler functions. The retained boss HUD keeps the complete existing intent-color mapping, including Void Regent attacks.
- Removed the invalid second argument to the legacy hit-flash tween call by eliminating that unnecessary cancellation. The tint uses its own clear timer; movement and attack tweens now survive nonfatal damage and finish normally.
- Gave legacy wave-plan lookups an explicit common return shape. Enemy selections, counts, spawn slots and timing values are unchanged.
- Typed the three dynamic projectile bodies explicitly before setting gravity. These are created by an Arcade dynamic group; no projectile speed, damage or collision dimensions changed.
- Passed `false` as the supported second argument to `scene.make.graphics`, preserving the off-scene shockwave texture generator.
- Removed the unused top-level `resolution` mobile option. The installed Phaser runtime does not read it; mobile loader settings, viewport calculations and control layout remain intact.

## Gameplay issue found during verification

Cinder Bound and Witch Step generated landing waves at the same moment the boss entered recovery. Recovery deliberately clears boss-owned projectiles, so those waves vanished immediately. Both moves now retain a 450ms guarded landing interval, matching the existing pattern used by the final boss's landing waves. Their warning, damage, movement path and full counter-window durations are preserved. All boss projectiles still clear when recovery starts, keeping the opening safe.

## Regression coverage

- `scripts/test_legacy_playability_v1.mjs`: actual attack tween survives both hit flash and damage; tint clears; movement, jump and pause/resume work; all four legacy level profiles and boss HUDs load.
- `scripts/test_projectile_playability_v1.mjs`: ordinary shots hit enemies; cannon bullets spawn; both phases of Cinder Bound and Witch Step have live horizontal waves, safe recovery and unchanged counter-window durations.
- `scripts/test_boss_encounters_v2.mjs 3` and `4`: full combat/phase/defeat/exit checks. The setup now supplies sufficient test HP to observe every phase-one move before crossing half health, and verifies committed movement destinations rather than an arbitrary minimum travel distance.
- `scripts/test_phone_dpad_v1.mjs`: phone/tablet controls, independent inputs, pause, rotation and flight.
- Shared production gameplay client: real movement, pickup and firing. Evidence stays under ignored `output/` folders.

The legacy hit hook used for QA is exposed only with `capture=1` and is removed when the engine unmounts. No new player-facing debug controls were added.
