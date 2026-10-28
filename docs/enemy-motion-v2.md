# Enemy motion and level rosters

The modern platformer keeps a recognizable grunt in every ground stage, with a
different drawn outfit for each setting. The first grunt placement always remains
a grunt, and the three rooftop bounce-course targets retain their slow patrols.
Other existing placements are assigned to the local roster; density, terrain and
boss encounters are retained. Original art is preserved for the legacy editor.

| Level | Grunt appearance | Local specialists and attacks |
| --- | --- | --- |
| 1 — Scratch / rooftops | Rooftop Punk, original red hoodie | Chalk Crawler: crouch and committed pounce. Locker Rusher: windup, shoulder charge, skid and recovery. |
| 2 — Graveyard | Grave Thrall, pale fur and burial shawl | Red Wisp: mark a position, dive, float home. Moonlight Terror: coil and extend its drawn tongue, then retract. |
| 3 — Furnace | Ash Grunt, charred clothes and glowing seams | Furnace Spitter: two aimed embers. Cinder Brute: raise both fists, slam and send ground waves in both directions. Jump over the waves. |
| 4 — Witchwood | Briar Grunt, moss, leaves and vines | Bramble Weaver: pounce plus three-shot web fan. Hex Wisp: marked dive followed by two hex pulses. Distinct idle palette from the earlier variants. |
| 5 — Starbreak flight | Ship roster | Scout: weaving flight and a telegraphed eye shot. Interceptor: locked charge and braking. Gunship: charged three-shot cannon fan and recovery. |
| 6 — Dread Planet | Void Grunt, violet seams and cosmic detail | Cosmic Sentry: aim lock and two-shot volley. Rift Rusher: telegraphed short blink, shoulder rush, parting pulse, recovery. |

The grunt's claw lunge has a real forward hitbox aligned to its impact pose. Every
attack commits its direction/aim at the warning, with an explicit recovery. Solid
platforms stop projectiles; ground-wave centers stay above the floor so they can
travel. Enemy patrols and charges stay on their assigned platform. Boss guards,
vulnerability cues, attacks and existing boss death art stay intact.

## Animation and defeat contract

Fifteen generated sets cover the eight existing ground silhouettes, four additional
grunt outfits and three ship classes. Every set has eight locomotion/cruise poses,
four attack poses and four defeat poses: **240 authored frames** total. Locomotion
uses alternating contacts/passing poses rather than sliding a static drawing.
Warnings use frames8–9; impact/follow-through use10–11. Dying enemies leave combat
immediately and stop receiving hits, hurting the player or earning additional kill
rewards. A separate body-free sprite plays frames12–15 and fades over700ms. Wisps
dissipate; other ground enemies recoil/buckle/collapse. Ships use their four actual
destruction poses over the existing850ms effect lifetime. Pause freezes the scene
clock and defeat animation. Scene shutdown cleans up the visuals.

Testing this exposed a prior hit-stop bug: a window timer fired while the scene was
paused, skipped resuming the physics world, and left enemies/players stuck after
resume. Hit-stop now uses a Phaser scene timer, which pauses and cleans up with the
scene and resumes physics when active.

## Assets and maintenance

- `art/enemy-motion-v2/` holds shipped reference poses, the contact sheet, original
  built-in ImageGen outputs, all prompts and packed review sheets. No CLI fallback
  or new species was needed. `roster-preview.jpg` shows the full lineup.
- `python scripts/prepare_enemy_motion_v2.py` rebuilds the shipped seed references.
- `python scripts/pack_enemy_motion_v2.py` normalizes the generated4x4 grids with a
  shared scale per set and a shared foot anchor, removes disconnected neighboring
  fragments, recovers a tongue/arm that crossed the generated cell boundary and
  packs trimmed lossless WebP pages under `public/enemies/motion-v2/`.
- Logical ground cells are half the previous dimensions and scene scale doubles,
  preserving the previous collision sizes/feet (the odd-width grunt differs by
  less than one world pixel). No per-frame stretching. Death pieces can extend
  outside the logical body cell without expanding its collider.
- Each stage loads only its three ground types. The complete runtime library is
  roughly9MiB on disk across all15sets. These versioned paths revalidate normally;
  the older immutable content-hash delivery directory is unchanged.
- `gameplay/enemyMotion.ts` defines art/pose keys; `enemyVariety.ts` defines rosters;
  `enemyMotionRuntime.ts` holds ordinary enemy attack/defeat behavior. The platformer
  adapts existing collision, damage, projectile and restored-enemy systems.

## Verification and known limits

`scripts/test_enemy_motion_v2.mjs` checks all15ground encounters: exact stage
rosters, locomotion frames, telegraphs, pause, fixed attack targets, real projectile
fans/waves, weapon or aerial-special defeats, non-colliding corpses, final poses and
single kill rewards. `scripts/test_flight_enemy_motion_v2.mjs` checks all three ship
classes with actual cannon hits and every destruction frame. Both accept
`GAME_TEST_URL`, `GAME_TEST_BROWSER` and `GAME_TEST_EXECUTABLE`.

Also checked all six stages/all six heroes, mobile controls, the standard game
client, checkpoint warning/volley cleanup and the cold-start transfer budget.
Ordinary X God takes the actual claw hit and his actual blaster triggers the same
defeat path. Asset integrity passes15sets/240frames/15pages,9.2MiB compressed and
32.28MiB decoded across the entire library; stages load only their local subset.
The full TypeScript check retains the
established legacy engine/Phaser errors, with no new module diagnostics.

The historical `test_stomp_flow.mjs` low/high bounce checks pass, but its old
hold-Right-and-Jump three-enemy-course assertion fails (0rather than3) on both this
update and an unchanged HEAD baseline served through a read-only Vite source
override. It is an existing course/movement issue, not reported as a passing check.
The dedicated current joystick/jump/slam checks are separate. Physical iPhone/iPad
memory pressure, long-session performance and full-campaign difficulty still need
human playtesting; desktop WebKit is not a physical device test.
