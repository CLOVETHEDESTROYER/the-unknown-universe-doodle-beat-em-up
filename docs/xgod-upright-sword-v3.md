# X God upright sword idle

The standing sword pose now raises the existing right weapon arm into a ready stance. A broad silver/red flame blade with a round gold guard replaces the slender reward-sword prop in this pose. It leans forward 22 degrees to keep X God's face readable. His fingers overlap the handle, and four subtle breathing frames share the existing foot anchor and display scale.

## Assets and rebuild

- Generated prop: `public/characters/xgod/flame-sword-upright-v1.png` (original RGBA alpha).
- Runtime idle: `public/characters/xgod/sword-idle-v3/sword-idle.png`, four 512px frames, with `metadata.json` recording the hand sockets.
- Editable scene: `art/xgod-side-scroll-v1/blender/xgod-sword-idle-v3.blend`.
- Render: Blender background mode on `art/xgod-side-scroll-v1/blender/runner-polished-v4.blend`, using `scripts/render_xgod_sword_idle_v3.py`.
- Pack: `python scripts/pack_xgod_sword_idle_v3.py`.
- Review: `output/xgod-sword-idle-v3/idle-review.jpg` and production capture directory.

The renderer shares the existing motion-v2 puppet setup, uses the historical `hand_left_back` socket for the right weapon arm, and renders the fingers over the prop. Packing uses the original 1.02 scale, foot alpha pass, and `(256,480)` anchor. Runtime selects this version for `runner_sword-idle`; collider size, movement, attacks, and weapon damage use the existing logic.

## Generation record

Built-in `image_gen` was used with a transparent background. The approved `xgod_side_scroll_fire_sword_run_v1.png` and `xgod_side_scroll_fire_sword_attack_v1.png` were style/design references. Source output: `exec-4201c127-69b7-4134-bc05-0d1be31e613a.png` in the session's generated-images folder, copied into the project path above.

Prompt:

> Generate ONE isolated weapon prop for this existing hand-drawn colored-pencil platformer. Reference images show the approved X God running and attacking character; match HIS broad flaming sword design exactly as closely as possible. Output only the sword, no person, no hand. Straight UPRIGHT VERTICAL orientation, pointed tip up, grip down, full sword centered on genuinely transparent alpha background with ample margin. Robust broad double-edged leaf-shaped silver blade, red-orange inner blade details and red fuller line, chunky black ink outline, small orange-yellow flames licking along BOTH edges, round gold/yellow crossguard medallion with tiny black X motif as in reference, short dark wrapped handle with small gold pommel. Blade length about 3.5 times blade width; blade is visibly broad rather than katana-thin. Sword total length about 5 times widest flaming blade width. Strong readable silhouette at small game size. Preserve rough colored pencil paper texture and hand-drawn contours, no glossy 3D, no text, no scene, no shadows or floor. One single production sprite prop only.

The first native render obscured his face. The revised arm angles and forward blade tilt separate the blade from his expression while preserving the evaluated hand attachment.

## Verification

Production build and the established gameplay capture client passed, with no failed assets or browser error files. The existing `test_xgod_motion_v2.mjs` passed both weapon sets, running, crouching/rising, jumping, mirrored idle, sword attacks, gun attachment checks, and touch cancellation. Native and in-game standing, mirrored standing, and running screenshots were inspected. Stop here for the user's visual playtest.
