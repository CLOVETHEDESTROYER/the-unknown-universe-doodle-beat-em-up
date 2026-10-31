# X-God Ice Gauntlets v1

Fixes the drawn X-God using bare-handed poses while the frost equipment is active. The original frost-shot and freezing mechanics already existed; this set supplies the missing equipped presentation.

Reference: the first frame of `public/characters/xgod/drawn-v1/idle.png`, preserved in `reference.png`. Built-in imagegen generated two full transparent 4×4 sheets, preserving lime spiky hair, X eyes, white skull-emblem T-shirt, orange cargo pants and black/green sneakers. Both hands wear cyan crystalline ice gauntlets. Raw outputs are `movement-source.png` and `actions-source.png`.

| Animation | Frames |
| --- | ---: |
| Idle | 4 |
| Run | 8 |
| Jump | 4 |
| Cast | 4 |
| Crouch / crouched cast | 4 |
| Skid | 4 |
| Hurt | 4 |

Rebuild with `python scripts/pack_xgod_frost_v1.py`, then `python scripts/audit_character_sizes.py`. This retains one scale per generated sheet, extracts complete poses and attached shards, anchors feet at (384,480) in 768×512 logical cells, and emits seven trimmed lossless WebP atlases with pages <=2048px. Original sources are never overwritten. Per-frame cyan-gauntlet tip positions are stored as hand sockets in `public/characters/xgod/frost-v1/metadata.json`.

Review `animation-preview.jpg` and the per-action review GIFs here. In-game artwork remains at the shared 160px standing reference. The active drawn campaign renderer selects the new art while frost is equipped, including ordinary jump, double-jump/slam, crouch, casting and surviving-equipment hurt. Shots use the authored hand sockets in both directions. Three unblocked equipment hits restore bare-handed art; switching equipment restores the appropriate existing art. Frost assets load only on levels where frost is available.

Regression: `scripts/test_xgod_frost_v1.mjs` checks desktop and emulated phone equipment/movement, casts, damage/freezing, left-facing touch use, hurt/durability, equipment switching, first frost level and Z-God independence. Evidence stays under ignored `output/xgod-frost-v1/`. Custom/model X-God and the retired brawler keep their existing art.
