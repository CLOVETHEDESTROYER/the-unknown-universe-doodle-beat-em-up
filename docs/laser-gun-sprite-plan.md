# Laser gun sprite integration

## Direction

Use the existing hand-drawn ink-marker blaster artwork as a transparent texture on a Blender plane. Render the plane together with X God's polished runner rig so the gun appears in the hand in every pose, while retaining the pencil-and-ink finish of the game. Keep this set separate from runner-v4 and the Fire Sword set.

## Production pipeline

1. Load `art/xgod-side-scroll-v1/blender/runner-polished-v4.blend` and attach `public/characters/xgod/ink-marker-blaster-v1.png` to the forward hand position.
2. Render idle, run, jump, crouch, and attack frames into `output/runner-blaster-v1/frames/` with `scripts/render_xgod_blaster_runner_v1.py`.
3. Pack the frames into `public/characters/xgod/runner-blaster-v1/` with `scripts/pack_runner_blaster_v1.ps1`. This uses the runner-v4 512px frame size, foot origin, and display scale.
4. Load the new sheets in Phaser for X God when the Fire Sword is not equipped. The Fire Sword continues to use its existing sheets. Projectile spawn is calibrated to the rendered barrel tip; facing left mirrors the full character and shot direction.
5. Playtest idle, run-and-fire, jump-and-fire, crouch, and left/right facing. Adjust the Blender hand offsets and muzzle coordinates based on that in-game review before changing damage, rate of fire, or enemy balance.

## Current pass

The v1 blaster set is rendered and wired into Phaser. The separate overlay is removed, so weapon and character animate as one sprite. Level routes 1–4 have been expanded by 30% in their end-to-gate distance with new gaps, platforms, hazards, moving platforms, checkpoints, pickups, and enemy encounters. The next milestone is user playtest and targeted tuning.
