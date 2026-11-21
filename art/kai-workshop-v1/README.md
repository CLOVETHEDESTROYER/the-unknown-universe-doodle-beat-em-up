# Kai's Workshop — generated catalog art v1

This pack covers the **actual 19-item `SHOP_ITEMS` catalog** in `gameplay/shopCatalog.ts`. It is integrated into Kai's Workshop, its permanent buddies, four alternate specials and cosmetic effects. Existing orb companions are a separate system.

All raster artwork was produced with the built-in ImageGen tool. Exact prompts are in `prompts.json`; original output paths are in `sources.json`. Each generated original and the shipped buddy seed references are retained here. Three initial sheets needed a second ImageGen pass to remove pale background mattes; the original and `*-alpha.png` outputs are both preserved. Frost Gauntlet, Ember Boots, Ink Shield and the heart reuse the matching generated art from the earlier session, copied into this pack with their original prompts.

| Shelf | Generated items |
| --- | --- |
| Supplies | Weapon tune-up, Ink Shield, Extra life, Frost Gauntlet, Ember Boots |
| Specials | Ink Fan, Chalk Ring, Rail Pulse, Static Net |
| Buddies | Spark Moth, Patch Beetle |
| Ink & trails | Arctic Ink, Neon Rose, Chalk Sparks, Starlight, Prism Burst |
| Wardrobe | Rooftop Shades, Sunset Headband, Blue Kicks |

There are **136 painted frames**: four inventory-loop frames per item; four additional gameplay-effect frames for the five ink/trail/burst styles and four specials; and twelve additional flight/assist frames per buddy. Buddy frame ranges are idle 0–3, flight 4–11, spark-shot/intercept 12–15. Effect sheets use inventory frames 0–3 and actual gameplay VFX 4–7.

## Rebuild and review

Run `python scripts/pack_kai_workshop_art.py` from this project root. Requires Pillow, NumPy and SciPy. It audits the live catalog for complete coverage, requires native alpha, isolates sprite components where needed, and crops/scales/packs generated pixels without fabricating poses. A single scale is used within each animation family. All runtime frames are 256 × 256 in four columns, with maximum sheet dimension 1024. Runtime sheets and posters are lossless WebP under `public/workshop/kai-v1/`; the manifest records every layout.

`catalog.jpg` is the complete catalog overview. `buddies.gif` shows both new companions' idle, flight and assist cycles. Individual `*-preview.jpg` sheets show the actual packed frames.

Open the title wallet button to enter **Kai's Workshop**. Every catalog entry has generated card art and a sprite preview with pause, pose stepping and facing controls. Specials/styles have an **In action** preview; buddies expose idle, flight and assist actions. Wardrobe entries also retain the existing **Try on X God** preview. Generated shades and headband art follow the existing hero anchors; Blue Kicks retains the established sneaker recoloring.

In the campaign, alternate specials play generated activation effects; Arctic/Neon projectiles and Chalk/Starlight trails use separate visual sprites that follow existing projectile bodies. Prism uses generated hit/landing effects. Spark Moth and Patch Beetle retain their established attack/interception rules and use generated sprites in ground levels and Starbreak, plus the same generated frames in the canvas Alley. Prices, purchases, ownership, cooldowns and damage rules are preserved. Reduced-motion previews begin paused, and gameplay effects use restrained static poses where appropriate.

## Verification

After `npm run build`, run `node scripts/test_kai_workshop_art.mjs`. It starts a production preview unless `GAME_TEST_URL` is set. `GAME_TEST_EXECUTABLE` can select an installed Chrome/Chromium executable. It checks every item and action, wallet preview isolation, purchases/reload, mobile layouts, reduced motion, real specials, both buddy assists, generated ink/trails, Starbreak and the Alley.

The established `scripts/test_workshop.mjs`, `scripts/test_combat_cosmetics.mjs` and develop-web-game action client provide transaction, damage and gameplay regression coverage. Browser artifacts are ignored under `output/kai-workshop-art/`. Actual results and remaining limitations are recorded in `progress.md`.
