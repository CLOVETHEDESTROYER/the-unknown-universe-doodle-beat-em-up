# Playable movement v3

Created with the built-in imagegen tool using the original approved walk sheets as identity/style references. Source generations remain alongside these notes; old shipped character art is preserved. Normalized runtime files are in `public/characters/playable-v3/`. Rebuild with `python scripts/pack_playable_motion_v3.py` (Pillow, NumPy, SciPy).

## Generation prompt set

Common prompt for Barrett, Nico and Ezra, followed by the matching character paragraph:

> Create a production animation sprite sheet for a hand-drawn pencil/crayon and black-ink side scrolling game. Reference is character identity and drawing style. Transparent background, no scenery, text, frame borders, shadows on ground, labels or effects crossing cells. EXACTLY 16 complete separate full-body poses arranged in a regular 4 column x 4 row grid; generous transparent gutters, absolutely no clipped hair, hands, feet, weapons or flames. All poses face RIGHT, same costume, same body scale and camera, feet at consistent baseline in each cell. Row 1 and row 2 together are an 8-frame running cycle in chronological order: contact, compression, passing, lift, opposite contact, compression, passing, lift. Clear opposite leg motion and arm counter-swing; keep torso and head stable. Row 3 is four jump poses: takeoff, rising knees tucked, apex, falling legs extended. Row 4 is four attack poses: upright ready idle stance, anticipation, full forward strike, recovery. Keep silhouette fully INSIDE each cell with generous padding. Preserve approved style and identity, no 3D.

Barrett, reference `public/characters/barrett/walk.png`:

> Barrett is the brown-haired orange-eyed bear-clawed boy shown in reference, torn red sleeveless hoodie, huge furry brown forearms with white claws, torn dark jeans and red sneakers. Preserve that character, NOT an actual bear. Running should be a heavy athletic lope with bent knees, alternating planted feet and pumping heavy arms; no repeated identical poses. Jump compresses body naturally; attack a broad forward claw swipe without detached effects.

Nico, reference `public/characters/nico/walk.png`:

> Nico is the black-haired muscular man with white tank top, dog tags, green cargo pants, brown boots, fingerless gloves, green shoulder rocket launcher with red nose. Preserve the existing energetic run and identity. Launcher held firmly on his shoulder in ALL run and jump poses with same grip and consistent size, FULL launcher rear and nose inside each cell. No loose gun parts or extra weapons. Jump must show COMPLETE top of hair and launcher and feet, never cropped. Attack is shoulder launcher braced forward, no projectiles or muzzle flashes.

Ezra, reference `public/characters/ezra/walk.png`:

> Ezra is the orange flame-haired fire warrior in reference, glowing orange lava cracks on muscular arms, torn dark sleeveless top, belt, torn brown trousers and brown boots. Preserve identity. Athletic low aggressive run, alternating legs with strong natural arm swing. Full flame hair and hands inside all cells. Four jumping poses should tuck knees then extend on descent. Attack a forward flaming fist punch with fire attached to the hand only.

Teleportation C, reference `public/characters/teleportation_c/walk.png`:

> Create a production hand-drawn pencil/crayon and ink animation sheet for Teleportation C, exactly the small black charcoal masked boy in reference, white eyes, short tousled black hair, black bodysuit with the white capital C on chest, thin purple outline. Preserve this identity, no redesign. Transparent background, no cyan/colored background or scenery. EXACTLY eight full-body poses in 4 columns x 2 rows, equally spaced grid, large transparent margins; no parts cross cells. All face RIGHT, same body scale and proportions. Row 1: four airborne poses: takeoff knee lift, ascending knees tucked, apex balanced, descending feet ready. Row 2: upright relaxed idle, crouched landing compression, forward teleport launch lean, teleport arrival balanced stance. No detached effects, portals, labels, grid lines or text except the C on shirt. Complete head, feet and hands visible in every cell. Production sprite drawings that match the original homemade ink-and-crayon character, 2D side view, consistent palette, all characters safely within their cells.

Follow-up edit of `teleportation-c-raw.png`:

> Remove every trace of the purple backdrop and purple atmospheric haze from this exact sprite sheet. Keep all EIGHT character drawings, their positions, size, pose, black pencil texture, white eyes and white C shirt symbol EXACTLY unchanged. Preserve a fine purple ink contour attached directly to character outlines only. The gutters and all areas outside the characters must be truly fully transparent with alpha zero, not a transparent-looking purple backdrop. No added objects. Exact same 4 by 2 arrangement.

## Packing

The generated poses are not perfectly centered in nominal grid cells. The packer finds the 16 (or eight) main connected alpha silhouettes and sorts them into rows, then columns. This avoids cutting a launcher or hand that crosses an imagined grid line. It isolates the selected drawing from neighboring pieces and low-opacity backdrop noise, retains the native alpha around it, and uses one scale across all actions for a hero. Each runtime cell is640×512 with feet at480 and a foot-centered horizontal anchor. Wider cells keep the forward claw reach and launcher intact. Metadata records each frame's visible bounds. Preview JPGs show the packed drawings on a light background.

Three heroes use eight run frames, four jump frames, one idle and three attack frames. Teleportation C retains his existing four-frame run, dash and five-frame attack; new jump/idle/landing replace the clipped cyan-background jump source. The arrival drawing is saved for future use; it is not active in this pass.
