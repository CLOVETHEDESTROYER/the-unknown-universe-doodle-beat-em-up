# X-God Animation Production Guide

This is the single source of truth for rebuilding X-God into a consistently animated, hand-drawn 2D character. It uses the current game artwork as visual reference only; it does not retain any of the legacy sprite geometry as the final production standard.

## Canonical design

Every X-God action must preserve these identifiers:

- lime-green, sharply spiked hair with colored-pencil texture;
- black X-shaped eyes and thick hand-inked outline;
- white T-shirt with the yellow smiley emblem;
- loose brown cargo pants and black-and-white sneakers;
- short, compact silhouette with a forward-facing right-side profile;
- Fire Sword is a separate equipment layer whenever possible, not baked into the body art.

The current approved visual references are `public/player_walk_v5.png` (unarmed body and proportions), `public/player_dash_v2.png` (dash silhouette), and `public/player_sword_attack_v3.png` (Fire Sword colors and scale).

The first cutout-rig walk candidate is `public/player_walk_rig_v1.png`. Test it non-destructively with `?xgodWalk=rig`.

The latest Blender-rendered walk candidate is `public/player_walk_blender_v2.png`: 16 frames at 24 fps with a measured ground-line correction. Test it with `?xgodWalk=blender`; omit the parameter to retain the current `player_walk_v5.png` walk.

The joint-cleanup Blender candidate is `public/player_walk_blender_v3.png`. Its source is the non-destructive `art/xgod-rig-v2/` package: both sleeve caps move with their upper arms, and the pelvis is limited to a narrow waistband so the upper-leg art moves with the thighs. Test it with `?xgodWalk=blender-v3`.

The first velocity-driven Blender jump candidate is `public/player_jump_blender_v1.png`. It supplies launch, rise, apex, fall, and landing-compression poses for the game's existing physics-driven jump selection. Test it alongside the cleaned walk with `?xgodWalk=blender-v3&xgodJump=blender-v1`.

The first low sprint Blender dash candidate is `public/player_dash_blender_v1.png`. It uses the same cleaned sleeves and moving thigh structure. Test the complete locomotion set with `?xgodWalk=blender-v3&xgodJump=blender-v1&xgodDash=blender-v1`.

## Current inventory

| Action | Current source | Cells | Cell size | Rebuild status |
| --- | --- | ---: | ---: | --- |
| Walk | `player_walk_v5.png` | 8 | 512 x 512 | Production 8-frame alternating unarmed cycle |
| Dash | `player_dash_v2.png` | 4 | 320 x 360 | Usable interim animation |
| Jump | `player_jump_v2.png` | 6 | 240 x 360 | Rebuild with better airborne spacing |
| Unarmed attack | `player_unarmed_attack_v2.png` | 3 | 400 x 400 | Rebuild as a readable combo |
| Sword walk | `player_sword_walk_v2.png` | 8 | 260 x 360 | Rebuild; move sword out of body art |
| Sword attack | `player_sword_attack_v3.png` | 3 | 500 x 400 | Rebuild; use stronger anticipation/follow-through |
| Sword jump | `player_sword_jump_v2.png` | 6 | 300 x 360 | Rebuild after the unarmed jump is approved |

Run `npm run validate:xgod-assets` before importing a new sheet. It validates the present assets and makes any accidental incorrect export visible immediately.

## New master-art contract

Create all future X-God **body** frames on a 512 x 512 transparent canvas.

- Ground/baseline: `y = 462`.
- Root/pivot: bottom centre, `(256, 462)`.
- In-game origin: `0.5, 0.9` remains unchanged until all replacement actions ship.
- Keep a minimum 24 px transparent margin around hair, elbows and shoes.
- Never crop an extended hand, knee, hair point or weapon.
- Keep the body facing right. The game mirrors it for left-facing play.

Build weapons and effects separately:

| Layer | Master canvas | Purpose |
| --- | --- | --- |
| Body | 512 x 512 | All movement and combat poses |
| Fire Sword | 512 x 512 | Independent sword arc, flame and recoil timing |
| Attack effects | 768 x 512 | Trails, dust, sparks and impact flashes |

This gives attacks enough room without changing the body pivot or causing the cut-off transitions seen in the old sheets.

## Animation order and quality bar

1. **Idle, 6 frames at 8 fps** — breath, hair overlap and a tiny weight shift.
2. **Walk, 8 frames at 12 fps** — contact, down, passing, up, contact, down, passing, up. The head should bob less than the hips.
3. **Dash, 8 frames at 18–22 fps** — anticipation, launch, two speed poses, peak, deceleration, recovery, settle.
4. **Jump, 8 frames** — crouch, launch, rise, apex, fall, landing compression, recovery, idle return. The jump state must follow real vertical velocity, not a looping animation timer.
5. **Unarmed combo, three attacks, 7–9 frames each** — anticipation, strike, one impact hold, follow-through, recovery.
6. **Sword combo, three attacks, 9–12 frames each** — use a separate sword layer and a readable arc. Effects may trail the sword by one frame.
7. **Hit, knockdown, recovery and death** — at least 6 frames each; these make combat feel weighted.

The test is always: can a player identify the action, facing direction and hit moment in one tenth of a second on a phone? If not, the pose needs a stronger silhouette—not more detail.

## Blender handoff (wait until approved)

When the Blender pass begins, import the three approved references above on planes facing the game camera. First build a simple pose mannequin—head, torso, upper/lower arms, upper/lower legs, shoes, hair mass and sword. Animate only the key poses listed above. Render the same orthographic right-facing view at 512 x 512 with alpha, then hand-ink and color over those renders in 2D.

Do not export Blender's shaded render directly into the game. Blender supplies perspective, spacing and believable weight; the final sprite must retain X-God's hand-drawn ink and colored-pencil finish.

## Acceptance checklist

- Same hair, face, shirt emblem, pants and shoes in every action.
- Every frame has the fixed 512 x 512 body canvas and baseline.
- Feet do not skate during idle/walk; landing has a visible compression frame.
- No duplicate body fragments, exposed next cell, or frame-edge clipping.
- Sword body pose, weapon arc and hit effect are separately controllable.
- Tested in-game at phone-scale before replacing a shipped animation.
