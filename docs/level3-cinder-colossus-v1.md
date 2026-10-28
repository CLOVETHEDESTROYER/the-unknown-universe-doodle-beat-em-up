# Level 3 boss visual pass

Historical asset pass. Current normalized sprites, movement, and attacks are documented in [Boss encounter pass](boss-encounters-v2.md).

Level 3's former Ink Behemoth has a new visual identity: **Cinder Colossus**, a basalt furnace golem with an oversized molten fist and glowing chest core.

## Sprite sheets

- `public/bosses/cinder_colossus_idle_v1.png`: six-frame idle/breathing loop, arranged as three columns by two rows with 418 × 627 frame cells.
- `public/bosses/cinder_colossus_attack_v1.png`: four-frame wind-up, slam, and recovery sequence, arranged as two columns by two rows with 627 × 627 frame cells.

Both sheets use a transparent background and hand-drawn ink and colored-pencil texture. The game uses the idle sheet for the existing looping boss animation and swaps to attack poses for the existing tell and quake attack windows. The existing boss ID and gameplay tuning remain in place, so the arena, health, timing, and quake projectile pattern are unchanged. The visual hitbox and facing were adjusted for the new art.

No gameplay test was run. Ready for playtest.
