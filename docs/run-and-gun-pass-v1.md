# Run-and-gun foundation, pass 1

Branch: `codex/run-and-gun-feel`, based on main `52f386d`. Existing X-God WIP is untouched.

## Implemented

- Load generated transparent PNG pickups for Rapid Fire, Fan Shots and Heat Seekers. Preserve procedural textures if loading fails. Flight pickup art is unchanged.
- Raise the baseline blaster's projectile safety budget from three to six so its 900ms projectile lifetime cannot throttle its 230ms cadence in empty space.
- Keep each existing upgrade's damage, interval, lifetime, spread and tracking behavior; do not change equipment loss, saves, melee, bosses or touch mappings in this foundation pass.
- Preserve horizontal movement when choosing non-X-God/non-special-hero firing poses rather than requesting a stationary pose with zero velocity.
- Match muzzle flash color to the active gun upgrade; fan fire has a broader flash. No per-bullet hit-stop added.

## Verification

`npm run typecheck`

`GAME_TEST_URL=http://127.0.0.1:4178 node scripts/test_run_gun_v1.mjs`

The focused regression covers projectile budget boundaries for all gun modes, desktop movement/jumping while holding fire, independent phone movement/fire pointers, cancellation releasing fire, served PNG assets, screenshots and runtime errors. Existing `scripts/test_gun_upgrades_v1.mjs` checks weapon patterns and campaign progression/loadout rules.

Results: focused regression, TypeScript, and production build pass. Build retains the existing Phaser vendor chunk-size warning. The broader gun-upgrade suite times out at line 51 waiting for its sword collection helper, on both this branch (4178) and the unchanged main preview (4177). Earlier route, upgrade-pattern, homing-hit and save/continue assertions pass; later suite assertions are not reached. This is an existing test/pickup setup issue, not a claimed full regression pass.

## Next implementation slices

1. Upward aim: resolve the existing Up-to-jump mapping explicitly; add matching muzzle/arm poses before shipping a new shooting direction. Do not silently repurpose a mobile jump gesture.
2. Weapon identity: focused playtests of Rapid Fire pressure, Fan Shots crowd coverage and Heat Seekers tracking. Tune roles from measured encounter outcomes, not simultaneous arbitrary damage buffs.
3. Level 1 authored vertical slice: short advancing combat, elevated shooter, upgrade reward, optional rescue, deliberate arena and dragon encounter. Reuse route encounter systems; avoid locking every screen.
4. Enemy role readability, hit reactions, restrained impact/audio feedback, environmental rewards, then bosses and the remaining levels.

## Artwork provenance

The three pickup PNGs are copied from the generated assets committed on the sprite WIP branch in `9aa3fd8`, `art/gun-upgrade-icons-v1`. Bold black outlines and colored-pencil hatching match the existing game art. Originals and the broad concept atlas remain on that branch; only the three relevant runtime icons are included here.
