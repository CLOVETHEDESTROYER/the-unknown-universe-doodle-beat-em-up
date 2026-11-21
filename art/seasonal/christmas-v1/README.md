# Killer Klause / Christmas asset pack v1

Open `public/seasonal/christmas-v1/review.html` for the complete local art review. It works directly from disk and through the existing Vite development server at `/seasonal/christmas-v1/review.html`. The playable preview is now available through the exact-case main-screen code `SantaKisComing`; see `docs/christmas-v1/preview.md`.

## Deliverables

- 48 Killer Klause animation poses in three 4 × 4 sheets: movement, combat, and special/support/defeat.
- 24 elf-helper poses across medic and engineer sheets.
- 20 present, explosion, muzzle, healing, and transformation effect frames.
- 12 workshop/Christmas props, as an atlas and individual PNGs.
- Three 2172 × 724 winter background panoramas, not seamless tiles.
- Twelve individual storyboard panels with separate captions and proposed timings.
- Character portrait, idle frame, and collectible presentation card.
- Animation gallery, checkerboard contact sheets, GIF review loops, metadata, and source artwork.

All new artwork was created with the built-in image-generation tool. Exact generation prompts are retained in `prompts.json`, `environment-prompts.json`, `support-prompts.json`, `storyboard-prompts.json`, and `card-prompt.json`. The original PNG outputs are copied into `source/`. Mechanical extraction, shared-scale registration, packing, WebP exports, and GIF previews use Pillow, NumPy, and OpenCV; there is no hand-painted substitute for generated artwork.

The master design was selected as the consistency reference during this pass; creator art review remains open. All animation families were generated together as whole sheets from that reference, rather than separately generating each pose. Elf sheets share the two-helper master reference. The packer assigns whole silhouettes to cells, retains transparent edges, uses a shared scale across a sheet, and records frame bounds and origins. Review loops repeat one-shot actions for inspection; runtime repeat values are recorded separately in the manifest.

## Rebuild and inspect

```powershell
python scripts/pack_christmas_v1.py
python scripts/audit_christmas_v1.py
```

See `public/seasonal/christmas-v1/manifest.json` for image paths, sheet dimensions, frame indices, proposed playback rates, anchors, shared scales, and release status. Hero cells are 640 × 640, helpers 320 × 320, effects 256 × 256, props 320 × 320. No animation replaces an existing character asset.

Story facts, proposed additions, content treatment, and release behavior are documented in `docs/christmas-v1/creative-brief.md`. Automatic public availability is implemented for November 26 through December 25, 2026 in America/Denver, with an exclusive end at midnight on December 26. No code is required during that window. Deployment of the updated build remains pending.

The review gallery is a presentation tool. Separate runtime checks now exercise combat, helpers, save compatibility, event gating, and world-space scale in Phaser; their scope and evidence are documented in `docs/christmas-v1/preview.md`.
