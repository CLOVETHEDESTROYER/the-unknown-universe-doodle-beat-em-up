# Killer Kai

Kai is a pale-skinned, curly-haired cyborg with an integrated cyan arm cannon.
His approved ink-and-colored-pencil design is preserved in `art/killer-kai-v1`.
He joins the unlockable roster under the existing rule: finish the game as X God.
For local review, open `/?autostart=1&unlockRoster=1&character=killer_kai`.

## Controls and abilities

- Move with the joystick or arrow keys. Jump with JUMP / Z / Up.
- A second jump press uses boot jets for a double jump. A third press triggers
  **Jet Slam**. Down while airborne also starts the slam.
- Jet Slam deals 7 direct damage and 5 shockwave damage, with a 220px radius,
  550ms normal-enemy stun and knock-up. A target takes one hit per slam.
  Like the other heroes' slams, it can damage a guarded boss.
- Hold FIRE / Space / C for the arm cannon. Crouch with Down / S or joystick down
  and keep firing for a low shot. Normal shots deal 2 damage.
- SP / X uses **Thunderfall** while grounded, including when crouched. Kai
  crouches and charges for 650ms, punches the ground, then summons three waves
  of six electrical beams from the sky. Cooldown: 7 seconds.
- The punch deals 3 nearby damage. A lightning wave deals 3 damage per enemy,
  at most once per wave even if beams overlap, with brief normal-enemy stun.
  Marked enemy lanes and additional nearby lanes receive 18 staggered strikes.
  Electrical columns also clear hostile shots. Boss armor still guards this
  special; strike during an opening. Jet Slam retains its boss-guard bypass.
- Kai has a shorter crouch collider during charging/punching. Movement resumes
  after recovery, and the final rain finishes shortly afterward. Pause freezes
  the cast and beams. Damage, death and transitions cancel remaining strikes.
- Weapon pickups retain their existing behavior. Losing a pickup after three
  unblocked hits restores Kai's permanent arm cannon rather than removing it.
- The flight stage uses the existing spaceship weapons, with Kai boarding and
  appearing in the cockpit.

## Animation inventory

Runtime contains **98 frames** in eight trimmed, lossless WebP atlases.

| Sheet | Frames | Sequences |
| --- | ---: | --- |
| movement | 16 | Idle breathing ×4, run ×8, takeoff/rise/apex/fall ×4 |
| combat | 16 | Standing cannon fire ×4, crouch/fire ×4, punch ×4, sword slash ×4 |
| mobility | 16 | Double jump ×4, slam ×4, crouch/punch/cannon ×4, crouch sword/frost ×4 |
| reactions | 16 | Hurt ×4, defeat collapse ×4, victory ×4, dash/skid/land/recover |
| sword | 16 | Sword run ×8, jump ×4, idle/windup/slash/recover |
| Thunderfall special | 6 | Crouch, power up, ground punch, summon, rise, recover |
| Thunderfall beams | 4 | Descending filament, lightning beam, impact, fading electricity |
| fx | 8 | Normal plasma pellet ×4; reserved charged-bolt artwork ×4 |

The punch poses are included for future melee variations; Kai's default attack
uses his cannon. Frost, ember and storm retain Kai's armor and add their existing
elemental effects. Flight strips, selection portrait and reactor pickup icon
are derived from the same approved artwork.

Only Kai loads these atlases. Pages are at most 1024px, with approximately
16.6 MiB decoded RGBA storage for the eight on-foot atlases. The new special
and beam pages add about 428 KiB compressed. Their sources, prompt metadata
and preview live in `art/kai-thunderfall-v1`; the previous cannon special is
preserved in the original art folder and is no longer loaded.

## Rebuild and verify

```powershell
python scripts/pack_killer_kai_v1.py
python scripts/pack_kai_thunderfall_v1.py
npm run build
$env:GAME_TEST_HERO='killer_kai'
node scripts/test_roster_mobility_v2.mjs
node scripts/test_killer_kai_v1.mjs
node scripts/test_kai_thunderfall_v1.mjs
```

Tests default to the production preview at port 4381; `GAME_TEST_URL` overrides it.
`GAME_TEST_BROWSER=webkit` and `GAME_TEST_EXECUTABLE` select the installed WebKit.
Sources, generation prompts, per-sheet scale/anchor metadata and review sheets
live in `art/killer-kai-v1`. Packing preserves one scale per source sheet and
stable foot anchors, with no vector or procedural replacement of character art.
