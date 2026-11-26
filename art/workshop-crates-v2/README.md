# Workshop crates & character art · Volume 01

Generated with the built-in ImageGen tool on 2026-11-25. `generation.json` preserves each exact prompt and identity reference. The `crates` and `cards` folders contain all 35 original generated PNGs, copied into the project. `crate-preview.jpg` and `card-preview.jpg` show the packed results.

`python scripts/pack_workshop_crates_v2.py` rebuilds the runtime assets in `public/workshop/crates-v2`. It uses the local source copies after the first run; the original generation paths are provenance only. Pillow is required.

Each crate was generated as one coherent 2×2 animation sheet: closed, charged, opening, and fully open. Packing applies one shared scale to all four frames and aligns solid geometry to a common bottom center. Generated transparency is preserved. Runtime sheets contain four 384×384 frames in a horizontal strip. CSS supplies the rattle, recoil, shockwave, rays, confetti, and rising reward; reduced motion presents a steady open chest and reward. Existing game sounds respect volume/mute settings.

The original 17 portrait illustrations form three collectible series: **Harvest Party** (Thanksgiving X God and turkey-suit Kai), **Style Switch** (pixel Nico, watercolor Z-God, noir Barrett, ink-wash Ezra), and **Beyond the Page** (a 3D-rendered version of all 11 playable characters). Original roster artwork was used as an identity reference. Runtime WebP conversion preserves the full generated composition without cropping or repainting.

Collection ownership belongs to the existing browser wallet. These are gallery illustrations; they do not grant playable heroes, gameplay costumes, or additional combat damage. See `docs/workshop.md` for economy, saving, inventory, and validation.

The Playtime expansion adds 16 illustrations (six starring X God, one for every other hero), for 33 total collectible cards. New series: Off Duty, Family Album, Hero Academy, City Legends. `playtime-generation.json` preserves the new exact built-in ImageGen prompts and references; originals are saved in `cards`, and all new jobs are included in `generation.json` for repeatable packing. The crate pool contains 64 rewards.
