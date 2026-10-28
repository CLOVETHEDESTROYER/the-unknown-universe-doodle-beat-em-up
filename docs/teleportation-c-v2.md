# Teleportation C: movement, blink counters and companion assistance

## Playable moves

| Control | Action |
| --- | --- |
| X / BLINK | Blink up to190units in the facing direction.1150ms shared cooldown,140ms phase protection against enemies/projectiles. Holding the button does not repeat the move. |
| R / return button | Return to the supported departure marker. The anchor lasts3200ms, shares the blink cooldown and is consumed by recall. Down+X also requests a return. |
| Space/C / attack after a blink | A melee attack started within520ms receives45extra reach and1extra damage. The counter has55ms windup; ordinary punches use125ms. Normal equipment attacks retain their existing rules. |

Teleportation is innate: losing a gun, sword or elemental power does not remove these moves. Grounded blinks require supported, hazard-free destinations. Air blinks preserve jump momentum and do not create unsupported return anchors. Walls, solid hurdles, world bounds, active vents and the boss gate constrain movement. Recall checks its destination and full path, with a380unit horizontal/130unit vertical reach limit. Death/pit recovery clears the anchor and counter window. Falls bypass phase protection; hazard checks also constrain blink and return destinations.

The original drawn art is retained. Running uses four poses paced by distance traveled, with a slight lean/skid motion. Idle resets to an upright pose. Jump tilts follow velocity, blink plays the four drawn dash poses, and melee plays all five attack poses. Per-pose foot anchors compensate for the originals' transparent margins while keeping the same collision body. Portal bursts, a fading departure image, a floor return marker and a small cooldown display make the move readable.

Quick X/R taps are buffered briefly between game frames. Keyboard repeats and held touch buttons cannot produce automatic teleports. Pausing freezes gameplay cooldowns and anchor time. Pending melee is canceled if equipment changes, the hero takes damage, or another teleport occurs before impact. Immediate blink counters land during phase protection rather than being interrupted by contact before their hit frame.

## Companion role

With another hero, collecting Teleportation C's existing level3 orb still activates him. He now follows with the four drawn walk poses, smoothly adjusts his pace, and uses visible portals when catching up across large distances.

Every2600ms he can perform one assist, prioritizing an enemy projectile within125units of the hero. He teleports to absorb that projectile, then returns after280ms. If there is no immediate projectile, he can strike a boss during its normal vulnerable opening, or finish a regular enemy with2HP or less. The strike deals2damage through the normal damage system, including boss multipliers and guard/hit cooldown rules. He does not force a boss opening. No separate companion is spawned while playing as Teleportation C; his own orb refreshes blink readiness instead.

## Implementation

- `gameplay/teleportation.ts`: pure destination/path checks, cooldown, phase/counter windows and return anchor state.
- `components/PlatformerGameEngine.tsx`: input buffering, momentum-safe relocation, portal animation, frame anchors, counter hit timing, companion behavior and capture state.
- `components/TouchControls.tsx` / `App.tsx`: dedicated BLINK and return controls for the selected hero. Existing flight and other heroes retain their controls.
- Existing art: `public/characters/teleportation_c/{walk,dash,attack,jump}.png`; the companion now shares these approved drawings. No new art generation or Blender rendering.

## Verification

- Build passed (`index-DyvK0yGJ.js`). Full TypeScript retains pre-existing legacy/platformer errors; none target the new teleportation module, App or touch changes.
- `scripts/test_teleportation_c_v2.mjs` passed15 grouped checks: safe destination/path rules and expiry; running/idle/body stability; blink/phase immunity/held input/recall; phase protection ending; pause; air momentum/no unsafe anchor; real hurdle collision; actual counter damage/reach; innate moves after equipment loss; boss guard; companion waiting for a real opening; actual projectile interception; phone blink/return/cancel; duplicate prevention; checkpoint cleanup. The damage-loss scenario waits out contact protection before its three isolated hits.
- Existing14-group powerup regression and eight-group stomp/course regression passed. `test_ground_springs_v1.mjs --teleportation-c` passed all three elevated landings on levels3/4/6 and kept attack footing stable. The optional flag narrows this run; the default test still selects the full roster.
- The established production client ran `tests/game-teleportation-c-v2.actions.json` with real movement, touch-button clicks, attack and recall. State records one blink, one counter attempt, one recall,100health, three lives, no failed assets or browser error files. The production image was inspected, along with desktop phase/counter/boss-assist/intercept images and phone controls. Fixed touch coordinates in this recording target the client's default1280×720 viewport.
- Evidence: `output/teleportation-c-v2/`, `output/ground-powerups-v1/`, `output/stomp-flow/`, and `output/ground-obstacles-v1/springs/`. These are automated gameplay and screenshot checks, not a complete manual campaign clear with this hero.

## Try it

- Playable: `http://127.0.0.1:3000/?autostart=1&level=2&character=teleportation_c&unlockRoster=1`
- Companion at the boss: `http://127.0.0.1:3000/?autostart=1&level=2&finishLevel=1&teleportc=1`

The playable link enables the existing roster preview bypass; normal roster unlock rules are unchanged. The companion link carries the ally directly for a boss preview. Stop for user playtesting of blink range, recall timing, counter feel and assist frequency. No deployment or commit.
