# Scripts Overview

## Core Verification Suite

Run the curated Playwright regression checks through a single runner:

```sh
npm run test:suite                         # build + run all core checks
node scripts/run_regression_suite.mjs --list
node scripts/run_regression_suite.mjs --skip-build --only loading,save
```

Included core checks:
- `loading` (`test_loading_v1.mjs`) — title & Level 1 transfer budgets, lazy bundle isolation, zero failed assets
- `save` (`test_campaign_save_v1.mjs`) — autosave, checkpoint resume, flight & story saves, invalid save rejection
- `mobile` (`test_mobile_edge_to_edge.mjs`) — phone/tablet/desktop viewports and touch target bounds
- `metalslug` (`test_metal_slug_v1.mjs`) — X-God directional aiming, Ink Grenades, explosive barrels, and 5-level strongpoints
- `workshop` (`test_workshop_crates_v2.mjs`) — Kai's Workshop crates, loot odds, wallet persistence, gallery

## Asset Packing & Optimization

- `pack_mobile_assets.py` — generates trimmed lossless mobile sprite atlases under `public/mobile-v1/`
- `optimize_loading_assets.py` — encodes WebP delivery copies under `public/performance-v1/` and updates `gameplay/performanceAssetManifest.json`
- `prepare_cutscene_delivery.mjs` — generates `.webp` delivery panels under `public/cutscenes/`
- `audit_character_sizes.py` — verifies standing-height calibration against the 160px / 105px reference
- `build_printable_hero_cards.py` — generates printable hero card PDFs into `output/pdf/`

## Historical Milestone Checks (`test_*.mjs`)

The remaining `test_*.mjs` scripts are focused milestone verifications referenced by design notes in `docs/`. Most accept `GAME_TEST_URL=http://127.0.0.1:<port>` against a running Vite server.
