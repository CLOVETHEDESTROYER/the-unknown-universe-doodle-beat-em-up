# X God drawn sprite audit and first pass

## Findings

The platformer started X God with a blaster, but the default starter animations
were Blender-derived (`runner-v4`, `motion-v2`, `blaster-run-v3`, `jump-v3`).
The sword run and sword attack already used older pencil-drawn artwork. Sword
idle, jump and crouch switched back to model-derived artwork. Damage was one
drawn pose and death was a static pose. These sources had different framing and
body proportions, making the transitions inconsistent.

The older unarmed walk/sprint/jump strips existed, but offered limited body and
arm movement. Some sword attack tips touched/crossed frame edges.

## Coverage after this pass

| State | Artwork used now | Frames |
| --- | --- | --- |
| Empty hands: run/jump/idle/punch | New drawn sheets | 8 / 4 / 4 / 3 |
| Blaster: run/jump/idle/fire | New drawn sheets, held in both hands | 8 / 4 / 4 / 3 |
| Empty hands/blaster crouch | New drawn sheets | 4 each |
| Sword run | Existing drawn choreography, repacked with padding | 8 |
| Sword idle/jump/crouch | New matching drawn sheets; upright idle blade | 4 each |
| Sword attack | New six-stage sequence preserving the old choreography | 6 |
| Empty hands/blaster/sword skid | New drawn sheets | 4 each |
| Damage | New distressed reaction sequence | 4 |
| Death | New stagger/buckle/fall/rest sequence | 4 |
| Flight boarding/pilot | Uses the same new drawn run/idle artwork | Shared |

This is 20 runtime sheets and 92 shipped frame slots. Drawn artwork is the
default, including the starting blaster. The model-derived files remain available
for comparison with `xgodArt=model`; custom sprites and `xgodRun=legacy` retain
their existing paths.

## Remaining sprite needs

1. **Dedicated Frost, Ember and Storm equipment sheets.** These currently use
   the new drawn empty-handed body with the existing procedural power effects.
   A later art pass should draw their gauntlets/bracelets into run, jump, idle,
   crouch and attack frames, as with the other playable heroes.
2. **Optional extra actions.** A victory/door-entry pose and a distinct heavy
   landing would improve presentation but are not required for the current
   movement states. Current landings reuse the jump preparation drawing.
3. **Retired brawler actions.** Butt-bomb, dazed and old dash artwork belongs to
   the separate `legacyBrawler` mode; it is not used by the normal platformer.

## Pipeline

The original approved seed was extracted from the existing drawn sword run.
The built-in image generation tool produced complete action sheets from that
reference. Exact prompts and source paths are in `prompts.json`; originals stay
in place. `scripts/pack_xgod_drawn_v1.py` isolates whole connected poses instead
of blindly cutting grid lines, uses one scale per source sequence, and anchors
feet in padded 768x512 cells at (384,480). Barrel openings have per-frame muzzle
coordinates. Detached generated bullets are excluded from character frames.

Generated runtime art: `public/characters/xgod/drawn-v1/`.
Preview: `animation-preview.jpg`. Mobile atlas generation includes this folder.

Physics, jump tuning, weapon damage and boss timing are unchanged. The new death
sequence completes before the final game-over overlay, using the same delayed
death handling as the other drawn heroes.

Production compilation and the gameplay smoke check pass. Focused browser checks
passed for the starter blaster, equipment loss, unarmed movement, jump, crouch,
turnaround skid, sword actions, damage, death/retry timing and flight boarding.
Representative gameplay screenshots were visually reviewed. Phone emulation
passed compact-atlas loading, touch controls and rotation handling; physical
iPhone/iPad testing remains outstanding.

Local preview: http://127.0.0.1:3000/?autostart=1&level=1&character=xgod
