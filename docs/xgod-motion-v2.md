# X God movement and weapon hand pass

Standing sword artwork is superseded by the [upright sword idle pass](xgod-upright-sword-v3.md), jumps by the [eight-pose jump pass](xgod-jump-v3.md), and the gun run by the [sixteen-pose athletic run](xgod-blaster-run-v3.md). The remaining motion-v2 poses and socket data still apply.

## Artwork and poses

The existing pencil puppet now supplies a revised blaster stride, idle, recoil, jump, and six-frame crouch. Sword idle, crouch, and jump use that same puppet. The approved traditional sword run and slash remain the reference for the visible weapon arm.

The weapon stays in the right hand represented by the near arm in the drawn sword run. The original Blender puppet calls this socket `hand_left_back`; that historical object name is retained internally. Both new props attach to its evaluated hand center with the fingers rendered over the grip. Left-facing play mirrors the complete sprite, following the existing game convention.

The blaster run uses alternating contact, passing, and recovery foot targets, two-bone leg solving, level soles, restrained torso lean, and a stable carrying arm. Calf meshes no longer contain a second copy of the separately articulated shoe. The crouch brings both ankles beneath the hips so the knees stay above the soles, and lowers the torso without folding the head into the knees.

## Runtime

- Art: `public/characters/xgod/motion-v2/` (eight sprite sheets and socket metadata).
- Source scene: `art/xgod-side-scroll-v1/blender/xgod-motion-v2.blend`.
- Rebuild: run Blender on `runner-polished-v4.blend` with `scripts/render_xgod_motion_v2.py`, then run `python scripts/pack_xgod_motion_v2.py`.
- Packing uses a separate foot alpha pass, a shared scale, and origin `(256, 480)`. A low-held sword does not change the player's ground anchor.
- Crouch art travels through six poses in 180 ms and reverses on release. Collider resizing responds immediately. Jump and fire interrupt the visual recovery immediately.
- Gunshot and muzzle flash positions come from each rendered frame's barrel socket. Firing immediately after releasing crouch selects the raised attack pose before resolving that socket.

## Verification

`npm run build` passed. `scripts/test_xgod_motion_v2.mjs` passed keyboard running, frame cycling, crouch depth, planted collision bounds, reverse rise, crouch-to-jump, both facings, sword slash, crouch-to-fire barrel alignment, and touch cancellation. No browser errors or missing assets were reported.

The established gameplay client also traversed the opening Level 1 obstacle route against the production build, reaching the raised platform after the spring with full health. Gameplay screenshots were visually inspected on desktop and phone sizes. Evidence is in `output/xgod-motion-v2/playtest/` and `output/xgod-motion-v2/route-smoke/`.

Stop at this milestone for user feedback on the stride and crouch timing.
