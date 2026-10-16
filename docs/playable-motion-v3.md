# Unlocked character movement v3

## Changes

- Barrett: generated eight-pose athletic lope, four airborne poses, upright ready idle and windup/claw extension/recovery. Preserves his original red hoodie, bear arms, jeans and sneakers.
- Nico: complete launcher and full-body poses in padded frames. Replaces the walk strip whose rocket nose crossed fixed256px frame cuts and the jump image already clipped at the head. Preserves the shoulder launcher and energetic running style.
- Ezra: eight run poses with alternating legs/arms, four jumps, idle and three punch poses; full flame hair remains within each frame.
- Teleportation C: complete takeoff/rise/apex/fall drawings, standing idle and landing compression. Existing travel-based stride, blink/recall/counter and companion systems remain. Original walk/dash/attack sheets are retained.

Runs use actual travel distance rather than an animation clock: Barrett advances every27units, Nico31, Ezra29, Teleportation C32. Releasing movement selects an upright idle. Air poses follow vertical velocity; landing compression lasts65–120ms (90ms for C). Three-pose attacks show anticipation, impact and recovery; ordinary non-X God/non-C attacks now resolve after100ms to meet the visible impact. Existing damage, range, equipment and character movement speeds remain.

New sheets use640×512 cells, one shared scale per hero and a480px foot baseline. The body stays96×270 texture units at the same render scale as before. C's old walk/attack/dash baseline corrections still apply; new C poses use the new baseline. Art bounds are separate from the collider, so a larger launcher or extended claw does not enlarge collision reach.

## Source and rebuild

Built-in imagegen sources, exact prompt set and contact sheets: `art/playable-motion-v3/`. Packer: `scripts/pack_playable_motion_v3.py`. Runtime files and frame-bound metadata: `public/characters/playable-v3/`. The previous files are retained. Packing rejects drawings that would leave the new cells. Production build passes. This pass has not been browser playtested; user review should focus on run cadence, jump/landing transitions, mirrored poses and attack timing.

## Direct previews

- Barrett: `?autostart=1&level=1&character=barrett&unlockRoster=1`
- Nico: `?autostart=1&level=1&character=nico&unlockRoster=1`
- Ezra: `?autostart=1&level=1&character=ezra&unlockRoster=1`
- Teleportation C: `?autostart=1&level=1&character=teleportation_c&unlockRoster=1`

The explicit preview URL bypasses the roster lock for that visit. Normal unlock rules are unchanged. Stop for user playtest at this milestone; damage/death artwork and equipment-specific alternate hero poses can follow separately.
