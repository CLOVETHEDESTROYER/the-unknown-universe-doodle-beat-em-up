# Kilina: frost and shadow combat pass

This revises the original level-four witch Kilina. The level-two axe/cannon Daughter keeps her encounter. The Thanksgiving code and turkey encounter remain separate.

Kilina has **72 HP** (previously 52), pursues at 140 world units/sec in phase one and 185 in phase two (previously 120/155), and alternates six different moves. At half health she finishes the full current opening before a guarded second-wind transition; phase two begins with a dash and increases spell pressure.

| Move | Warning | Action | Counter window, phases 1 / 2 |
| --- | --- | --- | --- |
| Freezing Hex | Cyan palm charge and committed aim line, 1.1 s | One icy orb, two in phase two. Eight damage and a brief freeze on an unblocked hit. Jump or duck; aim stays fixed after the warning. | 2.6 / 2.2 s |
| Ice Storm | Blue vertical lanes and floor rings, 1.2 s | Levitation and three falling shards; phase two has five lanes and two volleys. Shards deal 13 damage and do not freeze. Move into the clearly unmarked gaps. | 2.8 / 2.4 s |
| Shadow Dash | A fixed travel line and destination ring, .95 s | Fast ground crossing with fading echoes, then a low crescent spell. Phase two crosses faster and releases two crescents. Leave the line; jump the low follow-up. | 2.6 / 2.2 s |
| Ballistic Hexes | Violet charge, .85 s | Existing three/five arcing hexes, with new release art. | 2.6 / 2.2 s |
| Rune Bloom | Existing marked floor lanes, 1.05 s | Existing three/five pillars, one/two pulses, with new summoning poses. | 2.7 / 2.3 s |
| Witch Step | Marked landing ring, .85 s | Existing evasive leap and jumpable landing wisps, with new preparation/air/braking poses. | 2.6 / 2.2 s |

Second-phase warnings shorten by .12 s. Attacks still commit their aim, destination and marked lanes during the warning. The compact collision body stays 78 × 187 while artwork changes pose. Ordinary hits respect armor and receive the existing 1.5× opening bonus. Butt bombs and Z-God retain their established rules. Openings clear boss projectiles and show the shared ATTACK cue.

## Freeze behavior

- A real unblocked freezing-hex collision deals eight damage, then wraps the player in a hollow crystal overlay with **FROZEN · TAP JUMP / FIRE** advice.
- Horizontal movement, jumping, weapons and special activation stop for at most .9 seconds. Gravity remains active. Jump/fire taps shorten the freeze by .16 s each, subject to an .08-second tap interval and a minimum .2-second freeze. Event queues preserve brief taps even between rendered frames; holding a button does not repeatedly shorten the status.
- Kilina cannot chain more boss damage while the player is frozen or for .65 seconds after thawing. Existing shields, Z-God, signature invulnerability and teleport phase protection prevent the initial freeze. Unrelated enemies and environmental hazards retain their rules.
- Pause freezes the status countdown. Forced falls/death, boss retreat, defeat and scene cleanup remove it. Recovery thaws the player so the full opening can be used. The status is temporary encounter state and does not serialize into a checkpoint save.

## Art and code

Built-in imagegen expanded the approved witch into twelve poses in one sheet. A targeted edit repaired raised fingertips before packing. The same long purple hair, red eyes, plum robes and silver accents are preserved. `art/kilina-combat-v2/prompts.md` records the full prompts and references; the directory includes source images, extracted frames, edit canvas and checkerboard preview.

`python scripts/pack_kilina_combat_v2.py` extracts complete silhouettes and normalizes them with a shared scale calibrated to the established walk sheet. It uses Pillow/OpenCV/NumPy and the installed game-studio normalizer. Runtime art is `public/bosses/kilina-combat-v2/`: a 4 × 3 sheet of 640 px poses with foot anchor (320,600), plus freezing orb, icicle, crescent and hollow ice-prison images. Her walk and defeat art remain the approved existing versions.

`gameplay/kilinaCombat.ts` defines the new moves, phase order, pose selection and simulation-time freeze status. `components/PlatformerGameEngine.tsx` integrates casts, root motion, committed warnings and collision handling. Debug text exposes `playerFreeze` countdown/grace/hits/taps along with the existing boss, projectile and counter state.

## Checks

`npm run build` includes TypeScript checking. With a running local server, set `GAME_TEST_URL` to its origin and run `node scripts/test_kilina_combat_v2.mjs`. `GAME_TEST_OUTPUT` selects an external evidence folder (the default is the OS temp folder). The focused browser regression covers six moves in both phases, body/target stability, real counters, freeze damage and controls, automatic/tap thaw, pause, no chaining, shield/Z protection, retry cleanup, shard damage, actual duck clearance, two phone sizes and touch escape, real defeat and advancement to flight.

The existing `scripts/test_boss_encounters_v2.mjs 4` now observes all six moves during the natural phase cycles and uses real sword counters through the half-health transition and defeat. The shared develop-web-game client uses `tests/game-kilina-combat-v2.actions.json` for a loaded encounter smoke test.

Preview: `?autostart=1&level=4&finishLevel=1`. Add `sword=1&swordUnlocked=1` to try the sword. These direct previews do not replace normal saves. Physical iPhone/Safari testing remains separate from Chromium phone emulation.
