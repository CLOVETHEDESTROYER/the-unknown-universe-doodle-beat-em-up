# Supply crates: all six campaign levels

Ground-pound landing shockwaves (including X-God's Butt Bomb) now break nearby landed crates in one impact using the hero's existing slam area and damage. Ordinary jumps and airborne windups do not damage them. Parachuting crates remain protected until landing; break effects, rewards and save/retry deduplication use the existing crate runtime. Z-God's prop damage stays local even though her enemy attack clears the screen.

`node scripts/test_supply_crate_slams.mjs` checks real impacts with X-God, Barrett and Z-God: protected airborne deliveries, ordinary jumps, out-of-range slams, one-impact breaks, reward collection and repeat-impact deduplication. It uses Level 2 to isolate crate behavior from Level 1's gated combat encounters and spring pads. The existing `test_supply_crates_v1.mjs` remains the shooting/melee/save/retry regression.

Three non-solid, hand-drawn crates reuse `public/doodles/o_box.png`:

- x=1060: Rapid Fire; collecting equips the Ink Blaster if necessary.
- x=2370: up to 30 health, replacing the previous loose heart after the two-wave encounter.
- x=level end minus 1580: Fan Shots before the boss approach.

Those fixed placements remain for Level 1. Levels 2, 3, 4 and 6 each receive Rapid Fire, health and Fan Shots near the opening, midpoint and boss approach. The planner selects wide solid supporting platforms, avoids hazards, overhangs/obstructions and existing supply stations, and keeps the final crate out of the boss yard. The same parachute animation, attacks and ledger apply on every ground stage.

Level 5 uses `gameplay/flightSupplyCrates.ts`: three drifting sky crates at route distances 2600, 8200 and 13200. They descend under a parachute into a reachable flight lane over 2.4 seconds. Ship projectiles open them; flying into the released icon collects Spread Shot, 30 hull repair, or Homing Missiles. They are non-solid, ignore enemy bullets, consume impacting ship bolts, preserve Turkey King's no-weapon rule (health instead), and share the campaign's broken/collected/landed save ledger. Existing flight weapon pickups and checkpoint weapon rules are unchanged. Missed supplies are optional and do not gate progress.

`node scripts/test_campaign_supply_crates_v1.mjs` verifies all six levels, three supported crate placements on every ground route, actual delivery/opening/collection and a gun reward on each ground level, plus ship-fire opening and flight-weapon collection in Level 5.

## Parachute delivery

Intact crates begin hidden and start a 3.6-second descent when the player is within 650 world units. They enter from above the camera with a gently swaying cloth canopy and suspension lines drawn with Phaser graphics. No new controls or downloaded art are needed. At the assigned safe landing point the crate settles with a small squash while the canopy folds and fades over 650ms. Only landed crates accept damage; invisible or descending crates cannot be shot at their future ground position. Crates remain non-solid and cannot crush or trap anyone.

Descent uses simulation delta and freezes during pause/hit-stop. `supplyCrates.landed` is an optional save field; landed crates restore on the ground, broken crates restore only their uncollected reward, and collected rewards never respawn. Old saves without delivery state remain valid. Reloading during flight can replay that single intact crate's delivery, not create another crate or reward.

The crate regression also verifies the visible descent, pause freeze, exact landing, and save/continue restoring the landed state.

Crates have 3 HP and can be broken by normal player shots, frost shots, flame blades, or the existing melee hit rectangle. Point-blank barrel checks also hit crates. Normal shots are consumed; piercing flame blades can hit each crate only once per blade. Enemy and companion projectiles cannot break crates. Crates are not enemies: no kills, enemy AI changes, homing targets, or collision walls are introduced. No new controls, explosions, or damage to the player.

Breaking produces small wooden fragments and one stationary, visibly identifiable drop. Reward collection uses player-body overlap and no score farming bonus. Turkey King gets health instead of guns, retaining his weapon restrictions.

`GameStats.supplyCrates` persists broken and collected IDs. Uncollected drops survive saves; collected drops stay collected across retries and reloads. Existing saves without this optional field remain valid. Unknown IDs or collected IDs without a matching broken ID are rejected by campaign-save validation. Starting a new campaign resets progress normally. Partial crate HP is session-local; reloading a save can restore an unbroken crate to full health.

Verification: `npm run build`, `node scripts/test_supply_crates_v1.mjs`, `node scripts/test_run_gun_v1.mjs`, and `node scripts/test_level1_pacing_v1.mjs`. Crate browser coverage uses actual shots/melee, save/quit/continue for broken and collected states, a health pickup, no duplicate reward, and a phone-sized screenshot. Physical-device testing and other heroes' specials are outside this first pass.

Build, focused crate checks, run-and-gun tests and Level 1 pacing checks pass. The broader campaign-save script passed ground checkpoint and flight restore checks, then stopped inside its separate Alley Rescue helper (`Spare gun room did not open`); the entire campaign-save suite is not claimed as passing.
