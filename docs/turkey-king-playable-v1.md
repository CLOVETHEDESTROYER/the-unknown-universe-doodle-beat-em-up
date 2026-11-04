# The Turkey King: playable Thanksgiving hero

Enter `allhailking` in Secret code on Pick Your Player, then select The Turkey
King's card. Codes ignore surrounding spaces and letter case. This unlocks
only him and enables Thanksgiving mode; ordinary locked heroes still require
their existing unlock. The unlock and selected-King preference persist in the
browser, so Restart and an autostart page without a character parameter keep
him selected. Picking another hero clears that selection preference. Save and
Continue retain the King and his native weapons.

Direct local play:
`http://127.0.0.1:54821/?autostart=1&level=1&character=turkey_king&code=allhailking`
The link applies the same code and starts level one with the King. His new
card and right-facing animation sheet now load in the actual campaign engine.

| Control | Action |
| --- | --- |
| Arrows / movement pad | Walk, face left/right, crouch |
| Z / Up / JUMP | Jump and double jump; existing third-tap/Down slam |
| Space / HIT | Royal staff strike: 4 damage, 145px reach, 550ms cooldown |
| C or X / SP | Turkey throw: 4 damage, 850ms cooldown |

The throw uses the approved four-frame flap loop at 620px/s, a 1700ms lifetime,
and a single hit. It releases after a 110ms windup and slightly aims toward a
nearby visible enemy in front, including shorter foes. Strikes and throws have
distinct poses, cannot start simultaneously, and buffer brief input taps. Boss
armor, counter multipliers and hit-triggered stuns use the shared damage rules.
Pause preserves native cooldowns and projectile lifetimes; hurt, freezing,
death and scene teardown cancel committed windups as appropriate.

Coins, hearts and level collectibles remain available. Equipment, shields,
gravity cores and companion powerups cannot replace or supplement his native
weapons. Initial saves/query equipment is sanitized for the King. Power stations
and incompatible pickups are omitted; scripted level-clear and route rewards
also respect this restriction. The flight chapter uses its standard vehicle
cannons with weapon upgrades disabled, plus King pilot, boarding and victory
art. Legacy brawler mode falls back to the current campaign for this hero.

## Assets and implementation

- `gameplay/turkeyKingUnlock.ts`: persistent unlock and selected preference,
  with an in-memory fallback when storage is unavailable.
- `gameplay/turkeyKing.ts`: native weapon timing, staff hit areas, animated
  projectile creation, pose selection, local HUD and pause handling.
- `public/characters/turkey-king-v2/`: approved sheet/projectile, derived card,
  flight walk, death and victory strips. Rebuild derived assets and sizing with
  `python scripts/pack_turkey_king_playable_v1.py` after the v2 art packer.
- Character identity/sizing, campaign saves, code entry, roster, level adapters,
  celebration and airborne presentation recognize `turkey_king`.

## Validation

`npm run build` and `git diff --check` pass. Browser plugin unavailable; local
project Playwright was used. `scripts/test_turkey_king_v1.mjs` passes locked and
invalid-code handling, case/space tolerance, independent unlock, actual roster
selection, Thanksgiving mode, persistent restart and Save/Continue, movement,
double jump, real staff and projectile damage in both directions, powerup
exclusion, damage/respawn persistence, boss counter/stun, pause, flight loading
and real 844x390 phone button presses. No page errors or missing assets.

`scripts/test_turkey_king_progression_v1.mjs` defeats the first boss with a real
turkey hit (reduced-health setup), checks the victory sequence and absence of a
replacement reward, then advances through the cutscene into level two with his
native weapons. Positioning fixtures isolate combat; tests do not claim a full
continuous campaign clear. The shared develop-web-game client also checks a
loaded first level with actual movement/staff input. Desktop, phone, attack,
flight and progression screenshots were inspected. Physical Safari is untested.

Both scripts accept `GAME_TEST_URL` and `GAME_TEST_OUTPUT`. Evidence is saved
outside the repository by default. The local Windows browser cache may require
`PLAYWRIGHT_BROWSERS_PATH=C:\Users\analo\AppData\Local\ms-playwright`.

The Turkey King renders at a calibrated 250px standing height (over 1.5× the 160px kids). The shared profile also scales his movement, victory, death, and flight presentation. His existing collider remains fixed for level traversal. Regeneration preserves this size.
