# Xgod athletic blaster run

The gun run now follows the energy of the approved drawn sword run: a longer stride, higher knee lift, stronger forward lean, swinging free arm, and visible body bounce. It retains the existing pencil puppet and gun rather than changing the character design.

## Animation and attachment

- Sixteen poses at 32 fps replace eight poses at 16 fps. Both cycles last 500 ms at full speed; existing speed-based animation scaling remains.
- World-space two-bone leg solving plants the stance foot while the other leg swings. Level soles, alternating contacts, and short airborne intervals create a running gait. Measured maximum stance error is below 0.000001 world units.
- A single scale/translation applies to the entire cycle, preserving body bounce and airborne poses. Feet origin remains `(256,480)` in each 512-pixel cell; display scale remains 0.4.
- The gun stays on the same right-hand socket as the other weapon poses. The puppet's historical socket name is `hand_left_back`. Fingers render over the grip. Each frame includes its own grip and muzzle coordinates; actual shots use those coordinates while running.
- Runtime key remains `runner_blaster-run`. The approved sword run/slash, other gun poses, jump art, collider, acceleration, top speed, and jump physics are unchanged.

## Sources and rebuild

1. Run Blender on `art/xgod-side-scroll-v1/blender/runner-polished-v4.blend` with `scripts/render_xgod_blaster_run_v3.py`.
2. Run `python scripts/pack_xgod_blaster_run_v3.py`.

Saved scene: `art/xgod-side-scroll-v1/blender/xgod-blaster-run-v3.blend`.
Shipped sheet and metadata: `public/characters/xgod/blaster-run-v3/`.
Packing rejects clipped silhouettes and unreachable stance feet. Shared transform is scale 1.02, translation (-5,55), without per-frame recentering.

Review strip and animated preview: `output/xgod-blaster-run-v3/pose-review.jpg` and `run-preview.gif`.

## Verification

- `npm run build` passed (`index-CIYaZaSy.js`).
- `scripts/test_xgod_blaster_run_v3.mjs` passed all sixteen frames in both directions, actual running projectile/barrel alignment, unchanged 350px/s speed and 108px collider, stopping, skid/reversal, jump-to-run, approved sword run, and simultaneous phone running/fire/cancel. No browser errors.
- Existing `test_xgod_motion_v2.mjs` and `test_xgod_jump_v3.mjs` passed for both weapon sets, including crouch, rise, both facings, all eight jump/landing poses, airborne slash/fire, responsive landing, and touch cancellation.
- Established production gameplay client ran `tests/game-xgod-blaster-run-v3.actions.json` with an initial asset-loading wait. Final capture shows the new run frame 15, one shot, full health, and no failed assets or browser error files. Evidence: `output/xgod-blaster-run-v3/{playtest,production}/`.
- Inspected the full pose strip, both running directions, phone running/fire, and production capture. These are automated focused checks; visual feel still needs the user's playtest. Repository-wide TypeScript retains existing legacy/Phaser diagnostics; no clean typecheck is claimed.

Try a ground stage with no sword: `http://127.0.0.1:3000/?autostart=1&level=2&sword=0`.

No deployment or commit. Stop at this animation milestone for visual feedback.
