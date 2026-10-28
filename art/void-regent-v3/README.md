# Void Regent v3 sprite pipeline

The final boss is a 2D frame animation so its hand-inked texture matches the game's generated character art. The built-in image generation tool created transparent source images in `source/`. The reproducible PowerShell packer `scripts/pack_void_regent_v3.ps1` converts the final 2x2 grids into four-frame horizontal Phaser sheets:

- `public/bosses/void_regent_walk_v3.png` (four 768x512 frames)
- `public/bosses/void_regent_attack_v3.png` (four 768x512 frames)

The sprite preserves the old Void Regent's crown, angular mask, glowing eye and chest core, armor, claws, and void cape. It replaces the small, cramped existing poses with distinct walk, anticipation, gather, release, and recovery silhouettes. The release pose was generated separately because its cape crossed the source grid boundary; the packer places it in frame three and clears its spill from frame four.

## Built-in image generation prompts

Reference images: `public/doodles/void_regent_ai_sheet.png` for identity and `public/characters/xgod/runner-v4/idle.png` for the game's pencil-and-ink medium. All generations requested `transparent_background: true`.

**Seed:** “One full-body original Void Regent boss in grounded 3/4 side-view facing left. Preserve floating thorn crown, angular mask and violet eye, faceted violet chest core, ink armor with small gold accents, two claws and feet, wide ragged purple void cape. Reinterpret in The Unknown Universe's hand-drawn ink and colored-pencil style, with larger readable masses and lavender edge highlights. Transparent, no scene, text, projectile, or crop.”

**Walk grid:** “Exactly four full-body walking poses, 2 columns by 2 rows, same character and left-facing orientation. Left foot contact, weight shift/opposite arm swing, passing pose with cape folding, right foot contact with cape trailing. Keep crown gap, chest core, proportions, palette, and foot baseline consistent. Transparent, no borders, labels, scenery, overlap, or crop.” The final grid was edited once to create more margin around the figures.

**Attack grid:** “Exactly four full-body attack poses, 2 columns by 2 rows, same character and left-facing orientation. Crouched warning and brighter core; both claws raised to gather power; leftward claw thrust and cape snap; lowered recovery. Distinct torso and arm poses with stable costume and foot baseline. Transparent, no free-floating projectile, borders, labels, scenery, overlap, or crop.” The final grid was edited once for frame spacing.

**Release replacement:** “One transparent full-body Void Regent release frame based on the seed and grid. Left arm thrust toward the left, right arm drawn back, torso twisted, one knee bent, cape trailing right. Same crown, mask, eye, core, armor, colors, and pencil texture. No projectile, scenery, labels, or crop.”

The final game uses the packed sheets and leaves the earlier v2 files available for comparison.
