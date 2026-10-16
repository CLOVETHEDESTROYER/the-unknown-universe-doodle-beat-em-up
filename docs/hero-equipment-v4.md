# Hero death and equipped sprite sets

Barrett, Nico, Ezra and Teleportation C now have four-frame drawn defeat sequences and full-body variants for each shared campaign powerup. X God's existing artwork remains.

## Visual states

| Equipment | Appearance |
| --- | --- |
| Hands | Original character with fists. Nico now has an empty-handed action sheet rather than a permanent shoulder launcher. |
| Ink Blaster | White/lime blaster held by its grip through idle, eight run poses, four jumps and firing/recovery. |
| Flame Sword | Broad silver/red blade in hand; upright idle, eight run poses, four jumps and anticipation/slash/recovery. |
| Frost Gauntlet | Blue armored ice glove drawn on the hand; four run poses, two airborne poses, idle and forward punch. |
| Ember Boots | Flame-trimmed boots worn on both feet through run/jump/idle/dash poses. |
| Storm Halo | Violet crystal/gold halo above the head through run/jump/idle/cast poses. |

Equipment selection follows the actual shared loadout. Pickup, replacement, three-hit loss and death return to the corresponding art. No extra visual gear survives a dropped item. Teleportation C keeps the equipped drawing during phase instead of switching to an empty-handed dash. Run poses still advance by traveled distance; elemental frames use a longer distance per frame to preserve cycle length. Existing movement speeds, damage, unlocks, equipment durability and boss guard rules remain.

Blaster muzzle and frost-hand positions are recorded from the packed drawings and transformed with facing/scale/rotation when shots spawn. Nico/Ezra's sword attacks now use melee damage rather than the old equipment-independent rocket/fireball branch. X God's attachment metadata is retained.

## Death lifecycle

The ordinary player sprite and collider are hidden/disabled during defeat. A separate sprite plays recoil → buckle → fall → resting body at5fps. Retry happens after1100ms and restores the checkpoint, normal collider, unarmed pose and appropriate health. Pit retries retain the existing health/life policy. Further damage cannot run while dying. The final life sets shared `isDying` while the sequence plays, delaying Game Over until the resting frame; that frame stays visible beneath the overlay. Pause freezes the sequence and its retry timer.

Debug text includes `heroDeath` frame/elapsed/final/respawn state. The existing selected-character and equipment fields describe the active hero and loadout. Art-only preview sheets are in `art/hero-equipment-v4/`.

## Assets and limits

Built-in imagegen sources/exact prompts: `art/hero-equipment-v4/README.md`. Rebuild: `python scripts/pack_hero_equipment_v4.py`. Runtime: `public/characters/equipment-v4/` (88 PNGs plus metadata, roughly31.5MB total across all four characters; the game loads only the selected hero's sets).

Generated images needed correction for mixed powers and touching drawings. Packed examples/death sequences were visually inspected; packer bounds pass. Barrett's frost falling frame reuses the equipped rising drawing because the generated fall omitted its glove. Elemental activation art is a single held pose with the existing runtime attack effects, while gun/sword have full attack sequences. Color-derived shot attachment points are approximate and need subjective in-game review, especially across mirrored poses.

Production build passes. No browser gameplay tests were requested or run for this milestone. The full TypeScript check still reports older legacy/Phaser diagnostics; no new diagnostics target the death/equipment additions. Stop for user playtest of loadout changes, movement transitions, hits, checkpoint retry and final-life timing.

## Direct previews

Use any of `barrett`, `nico`, `ezra`, `teleportation_c` as the character:

- Level1 with sword: `?autostart=1&level=1&character=nico&unlockRoster=1&sword=1`
- Level1 unarmed / first blaster supply: `?autostart=1&level=1&character=barrett&unlockRoster=1`
- Frost pickup: `?autostart=1&level=2&character=ezra&unlockRoster=1&powerupPreview=1`
- Ember pickup: `?autostart=1&level=3&character=barrett&unlockRoster=1&powerupPreview=1`
- Storm pickup: `?autostart=1&level=4&character=teleportation_c&unlockRoster=1&powerupPreview=1`

The preview URL's explicit roster bypass does not alter normal unlock progression.
