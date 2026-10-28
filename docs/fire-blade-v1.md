# Flame Sword: stronger slash and flying fire blade

Space/C or mobile A swings the equipped sword and launches a drawn fire crescent.
All six heroes get 4 damage on combo steps one and two, and 6 on the finisher
(X God previously dealt 2/2/3). Teleportation C retains her extra counter damage.
Z God retains her invincibility and one-hit power.
Nico and Ezra use actual sword reach while equipped; their ranged-tool reach no
longer creates an invisible 420–520px melee hit that would swallow the wave.

The crescent travels at 620px/s for about 560px, deals 3 damage once per target,
and passes through up to two ordinary enemies. It cannot damage a target that
the same swing already reached in melee, even if that initial hit was guarded.
This keeps close attacks predictable while giving the sword a useful crowd lane.
Solid terrain stops it; one-way platforms use the existing projectile rules.
Bosses absorb the wave, taking damage only during the actual ATTACK opening.
Normal opening multipliers and hit protection remain in use.

The existing 440ms cooldown, swing windup, combo reset, equipment loss and
three-hit durability remain. Windup damage, crouching or equipment replacement
cancels the pending swing using the existing resolution path. Once launched,
a wave travels independently of equipment replacement; death/respawn and scene
exit clear it. Quick touch/Space/C taps are buffered for the sword and Ember Boots.
Pause freezes flight, lifetime and animation. Physics hit-stop freezes lifetime.

`gameplay/fireBlade.ts` owns damage constants, bounded projectile lifetime,
target sets and piercing. The platformer owns collisions and the existing damage
gate. The projectile collider is narrower than the flame artwork. The four-frame
512x224 PNG strip uses 0.44 MiB decoded memory and is shared by every hero.
Only the platformer loads it; the spaceship stage uses its existing weapons.

Built-in ImageGen generated one complete four-frame sheet using the shipped
Flame Sword as its style reference. Original source, exact prompt, normalized
preview and packing metadata: `art/fire-blade-v1`. Runtime strip:
`public/powerups/fire-blade-v1/blade.png`. Repack with
`python scripts/pack_fire_blade_v1.py` (Pillow, NumPy and SciPy required).

`scripts/test_fire_blade_v1.mjs` uses real keyboard/touch attacks, ordinary
physics enemies and the actual Daughter encounter to check damage, animation,
range, piercing, pause, armor and each hero. Positioning/target fixtures use the
existing capture hooks. Configure GAME_TEST_URL, GAME_TEST_BROWSER,
GAME_TEST_DEVICE and optional GAME_TEST_EXECUTABLE. Evidence goes under
`output/fire-blade-v1`. Browser profiles do not replace physical-device play.

Local preview: `http://localhost:4380/?autostart=1&level=3&sword=1`.
