# Original Kilina: Witchwood chapter

Update: the [ground obstacle pass](ground-obstacles-v1.md) extends Witchwood to 9,700 units with a second spring court, crumbling ledges, a sideways ferry, and two more checkpoints. Its original arena and final checkpoint move forward by 2,200 units. The design notes below record the original 7,500-unit version.

## Campaign

| Level | Chapter | Boss |
| --- | --- | --- |
| 1 | The Scratch | Dark Dragon |
| 2 | The Graveyard | Kilina's Daughter |
| 3 | The Furnace | Cinder Colossus |
| 4 | The Witchwood | Kilina |
| 5 | Starbreak Run | Flight transition |
| 6 | The Dread Planet | Void Regent |

The original Kilina is a separate boss ID (`kilina`). The prior `killinas_daughter` encounter, including the historically named `kilina-v3` sprite folder and tests, remains the Daughter. The user authorized a newly generated design for the original Kilina after separate original artwork could not be located.

## Level

Witchwood is a 7,500 px route with generated purple woodland/observatory scenery, ruined stone footholds, rooftop coin paths, a 155 px jumpable ruined wall, five 130–160 px ground gaps, three vertical lifts, a spring, seven ordinary enemies, five checkpoints, and a sanctuary arena. No new traversal control is required. The final checkpoint at x6340 is outside the boss's retreat boundary; the last giant's patrol ends at x6200. Respawning therefore returns to solid ground before the encounter.

The two generated background layers scroll at 0.18 and 0.45, alternating horizontal mirrors. The nearer tree/arch overlay uses 0.35 alpha so Kilina's dark robe remains readable. Existing mossy stone and fog artwork supplies terrain and hazards. The established 58×82 checkpoint flags and smaller end gate remain in use. Companions and equipment carry forward from the prior chapters; the Gravity Core remains on the final Dread Planet route.

## Kilina's encounter

Kilina is an athletic adult witch with long purple hair, glowing red eyes, and layered plum robes. Her displayed height is roughly 240 px, with a compact 78×187 torso body. Her hair, extended hands, and robe tails do not expand the contact collider.

- **Hex bolts:** an 850 ms warning commits the side of attack. She releases three generated red-violet orbs with different initial vertical speeds and gentle ballistic gravity. Move between trajectories or counter from the opposite side after she exhausts the burst.
- **Rune bloom:** a 1,050 ms warning marks three fixed floor lanes. Pillars rise from those marks for 600 ms; standing in one deals 12 damage. Moving after the warning does not move the marks. She remains guarded until the spell ends.
- **Witch step:** an 850 ms marker shows the committed landing point. She makes a 950 ms evasive leap on a 125 px arc, then releases two low outward wisps. Leave the landing ring, then jump the wisp approaching your lane.
- **Second wind:** at half of her 52 HP, she finishes the full current counter window, then signals a guarded 950 ms transition. Her spacing movement increases from 120 to 155, bolts increase to five, rune lanes increase to five with two pulses, and the step speeds up by 100 ms. Warnings shorten by 120 ms.
- **Counter windows:** purple means guarded in every direction. Gold rings, a shrinking arc, and the OPEN countdown show vulnerability: 1.35 seconds after bolts/step and 1.4 seconds after runes, shortened by 250 ms in phase two. All accepted attacks receive the shared 1.5× counter bonus and 160 ms damage interval. Counters cannot cancel a commitment; blocked stomps bounce without free points.
- **Defeat:** she drops into her generated drained/kneeling pose and dissolves. Warnings, hostile spells, and arena camera lock clear. The exit advances to Level 5's [Starbreak flight](starbreak-flight-v1.md); victory is reserved for Void Regent in Level 6.

Projectile collision now reads the configured damage **before** destroying the sprite, preserving the spell's damage metadata instead of falling back to 10. This fixes the new pillar's 12-damage value and the existing bosses' intended projectile values.

## Assets

- Original generated sheet: `art/kilina-witch-v1/poses-generated.png`.
- Runtime sheets: `public/bosses/kilina-witch-v1/{walk,attack}.png` and metadata.
- Environment: `public/platformer/witchwood-panorama-generated.png` and `witchwood-parallax-generated.png`.
- Reproduction: `python scripts/pack_kilina_witch_v1.py`. Eight full connected silhouettes are sorted into the intended pose order, preserving hands and hair that cross a nominal grid boundary. A single .72 source scale and `(320,600)` foot anchor are shared across all 640 px frames. Display scale is .68. Original image alpha is preserved.
- Built-in imagegen was used for all three new source images. The complete prompts are recorded in [the generation record](../art/kilina-witch-v1/README.md).

## Checks and playtest

`scripts/test_witchwood_route.mjs` traverses the route through real keyboard movement, jumps, and attacks; `--companions` repeats with carried pals. It checks every main gap, animation progression, the final flag, a forced-fall respawn, and settled phone framing. The player is not teleported through the route.

`scripts/test_boss_encounters_v2.mjs 4` isolates the fight with position setup and real sword counters, checking all three moves in both phases, phase protection, fixed targeting, body/arena alignment, visible cues, phone layout, defeat, and advancement to flight. Level `6` checks the final encounter and the actual campaign victory screen.

`scripts/test_boss_dodges_v2.mjs 4` uses real blaster shots for zero guarded damage/full counters, checks that a marked rune really damages the player for 12, and uses a real held keyboard jump to clear a landing wisp. These isolated checks are not a continuous no-hit campaign run.

Production packaging is checked with `npm run build` and the established gameplay client. Existing Daughter, movement/stomp, and campaign UI checks cover shared behavior. Evidence lives in `output/kilina-witch-v1/`. Earlier failed artifacts are retained; consult the latest passing JSON. Project-wide TypeScript checking still has the existing legacy engine/movement/Phaser typing failures.

Review the whole level with `?autostart=1&level=4&sword=1&swordUnlocked=1`. Add `finishLevel=1` to start at Kilina's arena. Void Regent is now `level=6`. Stop for user feedback on visual scale, warning readability, and phase-two pressure before adding more mechanics.
