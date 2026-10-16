# Four-hero death and equipment artwork

All new drawings were made with the built-in imagegen tool, using the shipped Barrett, Nico, Ezra and Teleportation C idle drawings as identity references. Shared blaster, sword and elemental pickup drawings supplied equipment references. The previous art remains intact.

Exact prompt sets and generation provenance:

- `prompts.json`: four gun/sword sheets, initial four-hero death sheet, and Nico's empty-handed action sheet.
- `elemental-prompts.json`: four frost/ember/storm sheets and death-spacing edit.
- `correction-prompts.json`: mixed-equipment correction and death-spacing instructions.
- `ezra-final-prompt.txt`: replacement three-row Ezra elemental sheet after the corrected version developed touching drawings.

## Sources selected for runtime

- `barrett-weapons-source.png`, `nico-weapons-source.png`, `ezra-weapons-source.png`, `teleportation_c-weapons-source.png`.
- `barrett-elemental-source.png`, `nico-elemental-corrected.png`, `ezra-elemental-final.png`, `teleportation_c-elemental-source.png`.
- `deaths-spaced-source.png`: four characters × recoil/buckle/fall/rest. The first generation had touching Nico/Ezra drawings; this version separates them.
- `nico-unarmed-source.png`: complete run/jump/idle/punch with no permanent rocket launcher.

Other outputs are retained as provenance and are not shipped. Equipment is drawn into the body poses, including the fingers around the gun/sword grip. Frost gauntlets, ember boots and storm halos are part of their corresponding full-body drawings.

## Packing

Run `python scripts/pack_hero_equipment_v4.py` with Pillow, NumPy and SciPy. It identifies connected silhouettes instead of cutting a nominal grid across weapons. It retains native alpha around each selected drawing, isolates disconnected muzzle flashes/background remnants, and associates deliberately floating halo pieces with the corresponding head below them.

Runtime PNGs and per-frame bounds/attachment points: `public/characters/equipment-v4/`. Cells are768×512, foot baseline480, horizontal foot anchor384. Wider cells preserve full sword extension. Scale is shared across a hero's gun/sword actions, and across elemental actions, calibrated against the prior idle height. Collapse frames retain one scale throughout so the fallen body does not grow to fill the cell. Bounding checks reject clipped drawings.

Gun and sword sets each have eight run, four jump, one idle and three attack frames. Elemental sets each have four run, two jump, one idle and one activation pose. Four death frames per character and16 unarmed Nico frames bring the runtime total to256 frames across88 PNGs, plus metadata. Ezra's gun generation omitted an anticipation drawing; its idle supplies that windup. Barrett's frost falling drawing omitted the glove; its complete equipped rising pose is reused for both air phases rather than showing unequipped hands.

The compact `*-preview.jpg` sheets show run/jump/idle/attack examples; death previews show the full collapse sequence. They are review images on a light backdrop, not runtime assets. The source sheets also preserve the complete generated pose set.

Integration, limitations and direct preview links: `docs/hero-equipment-v4.md`.
