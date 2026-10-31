# Unnamed shadow kid — approved design and first sprite batch

Version B was approved by the creator on October 31, 2026. `shadow-kid` is a file identifier, not his name.

`approved-design.png` is the exact crop of version B from the approved comparison, preserved without redrawing. `approved-options.png` retains the original sheet. This is the canonical design; generated animations are drafts derived from it.

## Design invariants

- Nine-year-old boy in the game's bold-outline, crayon / colored-pencil style.
- Short black hair combed forward; front bangs stick forward and upward into a point.
- Black shadow face, large expressive white eyes, mischievous smile.
- No hoodie. Charcoal short-sleeve T-shirt with purple spiral emblem.
- Dark joggers with purple side stripe; purple canvas sneakers with white toes.
- Detached shadow hands and ankle gaps, small purple energy rings.
- Throws black holes with black centers, white scribbled rims, purple accents.

## First batch

`seed.png`: transparent derived idle reference with empty hands.

| Animation | Frames | Preview speed |
| --- | ---: | ---: |
| Idle | 4 | 6 fps |
| Jump | 4 | 9 fps |
| Run | 8 | 12 fps |
| Black-hole throw | 8 | 10 fps |

Generated whole-sheet sources are retained here. Packed transparent sheets and manifest are in `public/characters/shadow-kid-v1/`. Cells are 512 × 384, four columns, shared source scale 0.56 and ground anchor (256, 352). Jump apex retains vertical lift. Throw release is zero-based frame 5. Individual frames and looping review GIFs are retained alongside these sources. GIFs loop for inspection even for one-shot actions.

Rebuild with `python scripts/pack_shadow_kid_v1.py` (Pillow, NumPy, SciPy). Packing keeps detached components and effects, removes disconnected background haze, and never scales poses individually. Open `preview.html` for an animated review.

## Playable integration — October 31, 2026

The second generated run pass replaces the first with longer split strides, higher knee drives, and a stronger forward lean. The original remains in `run-v1-source.png`. Added 16 generated crouch/hurt/defeat/victory frames and a separate black-hole projectile. Total: 40 character frames. Full sources stay here; all production atlas pages fit within 2048 pixels per edge. Generated sequences still have some size variation and could receive further animation polish.

Registered as `shadow_kid`, displayed as **??? / Shadow Kid**; no permanent name has been assigned. Uses the same roster unlock rules as the other unlockable heroes. The approved image above remains canonical.

- Space / C / HIT: form and throw a black hole after 500 ms; three damage, 800 ms attack cycle.
- X / SP: **Void Burst**, a larger seven-damage black hole that can hit three distinct enemies; five-second cooldown. Pausing freezes the cast.
- Normal directional movement, crouch, double jump and Void Drop. Pickups work independently; when equipment breaks, his black-hole throw returns.
- Own hurt, defeat, victory, flight boarding and pilot art. Modern renderer also handles legacy-engine links.

`gameplay/shadowKid.ts` defines pose selection and art dimensions. `scripts/test_shadow_kid_v1.mjs` covers real roster selection, six stages, controls, actual projectile damage, special pause/cooldown, touch throws, all five powerups, defeat/respawn and boss victory. Browser evidence is under ignored `output/shadow-kid/`. In-engine screenshots and the shared gameplay smoke client have been reviewed. No deployment performed.
