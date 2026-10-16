# Xgod jump and consistent sword

The default Xgod renderer now uses eight purpose-built poses for both sword and blaster jumps: takeoff, rise, tuck, apex, unfold, reaching feet, landing compression, and settling. Rendered from the existing approved pencil puppet; no character redesign or replacement image generation.

## Sword and pose consistency

- The sword is the same `flame-sword-upright-v1.png` prop used by the approved upright idle, with identical 2.8×5.1 Blender dimensions and grip `(0.5,0.835)`. The evaluated near-hand socket stays attached throughout. That socket's historical name is `hand_left_back`; it represents the weapon arm matching the drawn right-handed run. Whole-sprite mirroring handles left-facing play.
- Airborne frames share one scale and one root transform. Packing no longer shifts every tucked shoe back to the floor, which previously erased the leg lift and made the body bob between poses. Landing frames alone use the shared planted shoe baseline.
- The trailing knee uses the appropriate IK bend direction during the tuck, keeping it above the shoe. Calf overlap is trimmed to avoid duplicate shoe geometry. Torso and free-arm motion balance the pose; sword angle changes only slightly around the same grip.
- Existing approved drawn sword run/slash and upright idle remain in use. Blaster airborne frames use updated rendered barrel sockets for actual shots.

## Runtime

Velocity and elapsed airborne time select the six airborne poses. The first 55 ms shows takeoff; ascent tucks the knees, the apex relaxes the pose, and descent extends the legs. A normal landing displays compression/settle for 120 ms when standing, or at most 65 ms while moving. Jump, crouch, fire, and sword attack can interrupt those visual poses immediately. Spring/stomp relaunches restart takeoff. Damage/respawn clears landing state.

Jump speed, gravity, coyote time, buffering, movement, and collision shape are unchanged. The extra frames only affect presentation.

## Sources and reproduction

- Source scene: `art/xgod-side-scroll-v1/blender/runner-polished-v4.blend`.
- New saved Blender scene: `art/xgod-side-scroll-v1/blender/xgod-jump-v3.blend`.
- Render: `blender -b art/xgod-side-scroll-v1/blender/runner-polished-v4.blend --python scripts/render_xgod_jump_v3.py`.
- Pack: `python scripts/pack_xgod_jump_v3.py`. One fixed `(1.02,-5,43)` scale/translation, calibrated against the approved upright idle, supplies the common root reference without requiring older output files.
- Shipped sheets: `public/characters/xgod/jump-v3/{sword-jump,blaster-jump}.png`, eight 512×512 cells each, plus metadata with grip/muzzle sockets, shared transform, weapon source, and pose names.
- Preview: `output/xgod-jump-v3/pose-review.jpg`.

The existing render helper now accepts optional calf-clearance and IK-bend overrides; its defaults preserve prior render behavior. The jump renderer uses those overrides without modifying shipped idle/run/crouch assets.

## Verification

`scripts/test_xgod_jump_v3.mjs` checks all eight poses in both directions with both weapons, stable collision bounds and normal jump height, held-jump landing, immediate re-jump, airborne slash, actual airborne muzzle alignment, and phone touch cancellation. Existing `test_xgod_motion_v2.mjs` and `test_stomp_flow.mjs` cover running, crouching/rising, weapon use, barrel attachment, low/high bounces, the real spring/stomp course, companion behavior, damage/respawn, and touch release. The established production client uses `tests/game-xgod-jump-v3.actions.json`. Evidence is under `output/xgod-jump-v3/` and the existing regression folders.

Browser checks use automated inputs; human review should judge the final pose feel. No deployment or commit is included.

Final production build, jump checks, motion checks, and eight-group stomp regression passed. Both production captures have no failed assets or browser error files. Desktop/phone artwork was visually inspected after the final knee correction. Project-wide TypeScript retains its existing legacy/Phaser diagnostics.
