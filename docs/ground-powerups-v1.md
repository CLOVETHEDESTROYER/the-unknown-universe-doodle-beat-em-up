# Shared powerups and equipment loss

## Rules

The current platformer campaign has one active equipment slot. Equipment survives three unblocked damage events; the HUD's three dots show remaining hits. The third hit switches immediately to fists. Damage still reduces health normally. The850ms hit protection prevents repeated overlaps from spending multiple equipment hits. Ink Shield consumes itself before health or equipment damage. Death or a pit retry drops the current power immediately, retaining the list of powers discovered during the run. Companions remain separate.

Space/C or the A touch button uses the equipped attack. Blaster and Frost also support held fire and the S button. C no longer produces a weak projectile while holding the sword or using fists. X God uses his existing unarmed run/idle/jump/crouch/punch art when equipment is lost; sword and gun retain their approved poses. Other heroes can collect the same equipment and punch when unarmed; Barrett retains stronger fists. No new controls are required.

| Power | First appearance | Action |
| --- | --- | --- |
| Ink Blaster | Scratch; X God's starting equipment |2-damage shots every230ms, original gun sockets |
| Flame Sword | Scratch boss reward; replacement swords from Graveyard | Existing sword combo, now with three-hit durability |
| Frost Gauntlet | Graveyard, level2 |1.5-damage icy fist shots every470ms; ordinary enemies lose horizontal movement/attacks for900ms, with a thaw warning delay before their next attack. Bosses take normal damage during openings and cannot be frozen. |
| Ember Boots | Furnace, level3 |600ms dash at700px/s (~420px),3damage once per enemy,1050ms cooldown. Animated PNG heel jets and drawn X God dash poses; see [Ember jet pass](ember-jets-v1.md). Runs through normal enemies while the dash is active. Solid walls, gaps, hazards, enemy projectiles and guarded bosses still matter. |
| Storm Halo | Witchwood, level4 |150-unit pulse,2.5damage,850ms cooldown; clears hostile projectiles inside its radius. Uses the existing boss guard/opening rules. |

Every ground stage, including Dread Planet, has labeled supplies on supported platforms. The first new ability appears near the opening; later supplies cycle through the powers available by that stage near checkpoints and before the boss. Pickup placement avoids nearby floor hazards. A replacement equips immediately and restores three hits. Supplies recharge after12seconds once the player has moved140units away; on checkpoint retries they recharge after800ms. Each supply awards150points on its first collection only. The route does not restore dropped gear automatically.

The equipped item, remaining hits and discovered powers carry through normal chapter transitions, including boarding/landing. Flight retains its three existing ship upgrades: they now also survive three hull hits, then return to twin cannons. Ship death drops the upgrade, and checkpoint retries retain the existing post-checkpoint core rollback so subsequent cores can be collected again. A ship always has its standard cannons; the hero's ground equipment is carried separately.

## Implementation and artwork

- `gameplay/powerups.ts`: definitions, stage gates, pure equip/hit/restore rules and platform-supported supply plans.
- `components/PlatformerGameEngine.tsx`: pickups, attacks, thaw behavior, equipment loss, unarmed poses, readable equipment HUD, supplied-item recharge and capture state.
- `types.ts` / `App.tsx`: optional shared loadout in campaign stats, starting equipment, scene carry and concise pause help.
- `components/TouchControls.tsx`: buttons follow the active tool; no gun button when unarmed or wielding melee/elemental powers.
- `gameplay/flight.ts` / `components/FlightGameEngine.tsx`: three-hit ship upgrades and their HUD.
- Built-in image generation created three transparent pencil/ink pickup icons. Originals/exact prompts: `art/ground-powerups-v1/README.md`. Runtime icons/atlas: `public/powerups/v1/`; repack using `python scripts/pack_ground_powerups_v1.py`. Existing approved blaster/sword art is reused. Power effects are runtime animation rather than new character sprite sheets.

## Verification

- Production build passed (`index-KAe072N3.js`). Full TypeScript retains the existing legacy/platformer diagnostics; none target the new powerup module, App, flight engine, or touch changes.
- `scripts/test_powerups_v1.mjs` passed14 grouped checks: three-hit loss/refill/death and stage gates; ship wear/death loss; real walking pickup collection and supported placement in all five ground stages; real unarmed damage; hit protection and refill; supply recharge without repeat points; shield protection and checkpoint loss; real frost contact and horizontal freeze; real fire-dash damage; real shock-pulse damage; actual hostile projectile clearing; boss guard immunity to freezing; alternate-hero phone attack/cancel; pause freezes supply timers.
- Existing eight-group stomp/course regression, ten-group flight-weapons regression, and four-group player-ship death regression passed without browser errors. Weapon/death expectations now reflect the intentional loss of upgrades after ship death.
- Full keyboard flight route passed with all10beacons, three lives,90hull,12ship kills,1447shots, boss defeat and landing into Level6 with inventory/companions. All pilots, navigation, collision, retry and Game Over checks passed.
- Established production client captured `tests/game-ground-powerups-v1.actions.json` on levels2/3/4. All three new powers were collected and activated; no failed assets or browser error files. Inspected the three final production images, pickup atlas, desktop attacks, unarmed stance/punch, supply pickups and phone Barrett pulse. The first production movement burst was too short on slower software rendering, so the burst was extended before the final captures.
- Evidence: `output/ground-powerups-v1/`, existing stomp/flight/weapon/ship-death folders. Final production state: Frost3hits/1use/100health; Ember2hits/1use/88health after a normal enemy hit; Storm3hits/1use/100health.

These are automated gameplay and accelerated simulation checks with screenshot review, not a complete manual run of every hero through every ground stage. Human playtesting should guide the three-hit limit, melee reach, dash range and boss pressure. No deployment or commit.

## Direct playtest links

- Frost: `http://127.0.0.1:3000/?autostart=1&level=2&powerupPreview=1`
- Ember: `http://127.0.0.1:3000/?autostart=1&level=3&powerupPreview=1`
- Storm: `http://127.0.0.1:3000/?autostart=1&level=4&powerupPreview=1`

Walk right into the first supply, then press Space/C or A. These links position the player before actual collectibles; they do not grant the equipment. Normal campaign routes contain the same pickups.
