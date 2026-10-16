# Dark Dragon death crop correction

The old `public/bosses/dark_dragon_dead_v2.png` has a snout/head cut off at its internal silhouette boundary. Its900×720 padding does not restore the missing drawing. The original source `public/dark_dragon_dead.png` is also visibly cropped, so positioning alone cannot repair it.

Built-in imagegen created a complete collapsed head/neck drawing using the currently shipped `public/bosses/encounters-v2/dark_dragon/walk.png` as identity/style reference. Exact prompt: `prompt.txt`; generation: `source.png`. Original output also remains in the tool's generated-images folder. Old art is preserved.

`python scripts/pack_dark_dragon_death_v3.py` packs native alpha into a768×384 image with64px side padding and floor anchor352. Visible bounds are(64,93,704,352). Output: `public/bosses/dark-dragon-death-v3.png`. The packer rejects source drawings touching the source canvas or packed margins; it does not draw missing parts.

Platformer keeps the existing `boss_dead_dark_dragon` texture key but loads the new asset. Collapse now uses origin(0.5,352/384), clears the preceding recoil rotation, and uses a boss-relative scale calibrated to the complete silhouette. Existing recoil, floor settle, reward unlock, hold and fade timing remain.

The packed light-background preview was inspected and production build passed. No browser playtest was requested or run. Direct encounter preview: `?autostart=1&level=1&finishLevel=1`.
