# Z-God v1

Approved design: `approved-design.png`, supplied by the user (concept A).
Six-year-old sister of X God: shoulder-length brown hair, pink side bow,
pink star sweater, raspberry skirt, lavender leggings and pink sneakers.

## Artwork

The built-in image generation tool produced whole animation sheets from this
approved reference. Exact prompts and generated source paths are recorded in
`prompts.json` and `crouch-prompt.json`. Generated originals are preserved.

- 16 unarmed poses: eight run, four jump, upright idle, three punch stages.
- 80 equipped poses: the same actions with blaster, sword, frost, ember, storm.
- 16 additional poses: breathing idle, crouch, dash, invincibility reactions,
  and victory.
- 16 equipped crouch poses across all five power-ups.
- One generated roster card.

`scripts/pack_z_god_v1.py` isolates connected drawings, preserves detached small
effects with their pose, uses a shared scale per sequence, and anchors the feet
at (384,480) in padded 768x512 cells. Sheets use at most four columns. No drawings
are synthesized by the packing script. Packed artwork is in
`public/characters/z-god-v1`; the preview is `animation-preview.jpg`.

Mobile atlas generation includes this folder; rerun
`python scripts/pack_mobile_assets.py` after repacking sprites.

## Gameplay

- Select Z-God from the start without a roster unlock; X God remains the default.
- Her rendered standing height is approximately 25% shorter than the other drawn
  heroes, with a smaller collider and quick running/jumping.
- All attacks, including stomps/projectiles, defeat ordinary enemies and bosses
  in one hit. Boss guard windows do not block her damage.
- Enemy hits, hazards and projectiles cannot reduce her health or equipment.
- Falling returns her to the last checkpoint without a death or lost life.
- X or the STAR touch button triggers a short Star Dash with a one-second
  cooldown; nearby enemies along the dash are defeated.
- Down crouches; touch controls include a down button between left/right.
- Space/C attacks or fires the equipped power-up as with other heroes.
- Flight boarding/pilot visuals use Z-God's generated art. Her ship is invincible
  and its shots defeat enemies, the Pursuer, and asteroids in one hit.
- Invincibility reactions replace damage/death animations: she cannot enter a
  death state. Her victory poses play after a boss defeat when unarmed and idle.
- The retired brawler debug mode uses the current platformer engine for Z-God.

The production build and focused browser checks pass. Checks covered immunity
to damage, checkpoint return after a fall, Star Dash, one-hit boss defeat and
flight immunity. The release check also passed phone-emulated compact-atlas
loading, touch controls and rotation handling. Physical iPhone/iPad testing
remains outstanding.

Preview: http://127.0.0.1:3000/?autostart=1&level=1&character=zgod
