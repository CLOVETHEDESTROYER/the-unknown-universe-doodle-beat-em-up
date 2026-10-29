# Elytron sprite set

Approved option 01: electrical spirit, shaggy black hair, striped yellow/black robot mask, black jacket, off-white shirt, cargo pants, charged fists and chunky sneakers.

Created with built-in image_gen. Exact prompts are in generation-prompts.json. Raw generations are retained as *-source.png; the seed was extracted from the approved preliminary sheet. The dedicated locomotion pass replaces the initial run study. Frames are cropped and resampled with a shared scale within each source sheet, then aligned into transparent 640 x 512 logical cells with a foot baseline at y=480. The animation art is hand-drawn; small drawing variations remain between frames.

## Deliverables

- Runtime assets: ../../public/characters/elytron-v1/
- 23 transparent per-animation PNG strips, 96 distinct frames total.
- Eight groups of lossless WebP atlas pages with Phaser multiatlas JSON; each page is at most 1024 x 1024. Prefer atlases for mobile rendering: the eight-frame run PNG strip is 5120 pixels wide.
- manifest.json records animation frame ranges, frame rates, looping, sheet groups, and origin (0.5, 0.9375).
- Individual transparent frames in frames/, animated GIFs beside this file, and animation-overview.jpg for review.
- Normalized transparent group sheets: movement-sheet.png, locomotion-sheet.png, combat-sheet.png, mobility-sheet.png, reactions-sheet.png, special-sheet.png, extras-sheet.png, fx-sheet.png.

## Animation inventory

Movement: idle (4), run (8), jump (4), crouch (4), double-jump (4), dash (4), skid (2), land (2), butt-bomb (4).

Combat: attack (4), crouch-attack (4), pulse-cast (4), pulse-storm (8).

Reactions and extras: damage (4), dazed (4), death (4), celebrate (4), arrival (4), reward (4).

Effects: pulse-projectile (4), pulse-impact (4), charge (4), slam-wave (4).

Pulse Storm: charge frames 0-2, volley frames 3-5, recovery frames 6-7. Spawn separate pulse-projectile effects during the volley; no continuous beam or lightning from the sky. Projectiles face right; flip the sprite horizontally to travel left. Projectile and effect origin is the center of the 640 x 512 cell, rather than the foot baseline.

## Preview and verification

Run the project's Vite dev server and open /art/elytron-sprites-v2/preview.html. The preview loads the actual atlas pages in Phaser, offers all 23 animations, and demonstrates traveling pulses during Pulse Storm. It replays one-shot animations for review; the manifest preserves their proper non-looping configuration.

Verified with installed Playwright and Chrome: all 23 sequences animate; no missing textures, failed network loads or console errors; pause, facing flip, speed control and mobile layout work. Evidence: ../../output/elytron-sprite-qa/verification.json. All 23 PNG strip dimensions and alpha channels were also checked. This set is now wired into the playable roster, modern platform campaign, and flight stage. See ../../docs/elytron-v1.md.

Repack deterministically with: python scripts/pack_elytron_sprites_v2.py
