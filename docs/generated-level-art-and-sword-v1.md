# Generated level art and X God sword pass

## Level art

All raster assets in this pass were generated with the built-in image generator. The existing graveyard moss blocks/panorama, level 1/2 backgrounds, generated checkpoint and gate, and generated impact/tell effects are reused. New art is saved in `public/platformer/` and `public/doodles/`:

- `fog-hazard-generated.png`: transparent, pale moonlit graveyard fog strip.
- `furnace-block-generated.png`: ember-cracked basalt platform texture. The generated art was cropped to its platform face for correct top alignment.
- `lava-hazard-generated.png`: transparent molten lava strip.
- `dread-planet-block-generated.png`: violet rune-stone platform face, cropped to its top ledge.
- `void-hazard-generated.png`: transparent purple rift hazard strip.
- `space_level_1_ai.png` and `space_level_2_ai.png`: separate violet cosmic landscape backdrops. Level 4's existing `space_level_3_ai.png` remains in use.

Prompt set: hand-drawn colored-pencil and dark-ink game illustration; seamless or platform-aligned furnace basalt and violet alien stone; transparent low-profile lava, rift, and graveyard fog hazards; wide, layered violet cosmic landscapes with low-detail playable midgrounds. All prompts excluded characters, text, and interface elements.

Level 2 retains its existing generated stone blocks and panorama. Shared checkpoint flags, end gate, hit impact, and boss tell ring now use their generated PNGs on every level. The level 2–4 platformer path no longer references SVG art.

## X God sword

`scripts/render_xgod_sword_runner_v1.py` and `scripts/pack_xgod_sword_runner_v1.ps1` create `public/characters/xgod/runner-sword-v1/` from a separate Blender scene copy at `art/xgod-side-scroll-v1/blender/runner-sword-v1.blend`. The sword plane's width and height are both twice runner-v4's values; the grip orientation was adjusted to keep the longer blade readable within the sprite frame. The old runner-v4 sheets remain unchanged.

For fighting, the platformer now loads the existing six-frame, hand-drawn `xgod_side_scroll_fire_sword_attack_v1.png` directly in side-scroll mode. The animation runs through wind-up, draw-back, forward slash, follow-through, and recovery; the melee strike is timed at 172 ms to land on the slash frame. Walking and other poses use the larger Blender-integrated sword sheets.
