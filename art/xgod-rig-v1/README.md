# X-God Cutout Rig Package v1

This package is the canonical handoff for building X-God's Blender walk rig. Every visible part is cut from one 1024 x 1024 master image, so the face, hair, shirt, pants, shoes, outline weight, and colored-pencil texture remain consistent.

## Design lock

- Strict right-facing side profile.
- Lime-green spiky hair and one visible black X eye.
- White T-shirt with the yellow X-eye emblem.
- Loose brown cargo pants.
- Black-and-white sneakers with green accents.
- Anatomical **left** leg owns the cargo pocket permanently.
- Anatomical **right** leg is permanently plain.
- Left/right names never change when a limb moves to the opposite side of the screen.

The combined `head_hair` layer is intentional. It prevents face, hair, ear, and neck proportions from drifting during the first animation pass. Hair secondary animation should be added later as corrective Grease Pencil frames or a dedicated hair-tip overlay.

## Package contents

- `master/xgod-rig-master.png` — canonical transparent master.
- `parts/registered/` — 1024 x 1024 layers with original canvas registration.
- `parts/trimmed/` — compact transparent layers for Blender planes.
- `manifest.json` — hierarchy, pivots, crop rectangles, layer order, and design contract.
- `previews/xgod-rig-reassembled.png` — reconstruction check.
- `previews/xgod-rig-exploded-parts.png` — all isolated pieces.
- `previews/xgod-rig-joint-guide.png` — skeleton and permanent physical-side colors.
- `blender/import_xgod_rig.py` — imports the trimmed layers as pivot-correct planes.
- `blender/animate_xgod_walk.py` — builds the reusable 16-frame interpolated walk.
- `blender/xgod-rig-walk-v2.blend` — latest ready-to-edit Blender 5.2 project.
- `blender/renders/walk-v2/xgod-walk-blender-v2.gif` — Blender-rendered motion check.
- `blender/renders/walk-v2/xgod-walk-blender-v2-sheet.png` — transparent 16-cell export sheet.

## Joint color convention

- Magenta: anatomical left/back side, including the permanent pocketed leg.
- Cyan: anatomical right/front side, including the permanent plain leg.
- Yellow: root, torso, neck, and head.
- Green: export baseline.

These colors are guides only and are never exported into final sprites.

## Blender import

1. Open Blender and switch to the Scripting workspace.
2. Open `blender/import_xgod_rig.py` in the Text Editor.
3. Run the script.
4. The script creates `XGod_Rig_Art`, imports all parts as transparent planes, positions every object at its animation pivot, and creates an orthographic 1024 x 1024 camera.
5. Save the resulting `.blend` beside this package before adding an armature.

For the complete prepared walk, open `blender/animate_xgod_walk.py` and run it
instead. It safely reimports the canonical parts, adds the `XGod_Rig_Root`
control, keys eight canonical poses across a smooth 16-frame/24 fps loop,
animates front/back layer swaps, applies a ground-line correction, and saves
`xgod-rig-walk-v2.blend`.

The Blender materials are unlit emission/alpha materials. This preserves the
original hand-drawn colors without scene lighting changing the sprite.

The setup pose uses a 100 pixels-per-Blender-unit scale. The master root is `(505, 696)` and the reference baseline is `y = 954`.

## First animation test

Do not start with an eight-frame walk. First prove the physical leg swap with three keys:

1. Frame 1: pocketed left leg trailing.
2. Frame 5: pocketed left knee passing beneath the pelvis.
3. Frame 9: pocketed left leg leading.

The finished walk uses labeled timeline markers at frames 1, 3, 5, 7, 9, 11,
13, and 15. Frame 17 duplicates frame 1 to close the interpolation; the scene
render range remains 1-16 for a seamless loop. Render all 16 frames for the
smooth version, or the odd frames for an eight-cell game sheet.

The pocket texture must remain parented to `leg_left_thigh_pocket_back`. If the pocket appears to jump to the other thigh, the hierarchy is incorrect.

## Corrective artwork

The joint cutouts intentionally overlap beneath sleeves, the pelvis, pant cuffs, and hands. Extreme bends will still need corrective drawings for elbows, knees, crotch folds, hair drag, shoe roll, and shirt compression. Blender supplies consistent anatomy and motion; the final render should retain hand-drawn corrections.
