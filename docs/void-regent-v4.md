# Void Regent: three-phase finale

Level six's final boss now has 120 HP and six attacks. Phase two starts at
80 HP and the final ascension at 40 HP. Each threshold waits for the full
current counter window before a guarded 950ms transition. Large hits can cross
both thresholds; transitions still advance in order. The original defeat and
Universe Saved ending remain in place.

| Attack | Phase one | Phase two | Phase three |
| --- | --- | --- | --- |
| Crown nova | Two radial bursts of eight stars | Three bursts of ten | Four bursts of twelve, alternating gaps |
| Void crash | Marked leap/dive and one pair of low shockwaves | Two wave pairs | Three wave pairs |
| Rift burst | One teleport and five stars | Two teleports, seven stars each | Three teleports, nine stars each |
| Star fan | Two five-star volleys | Three seven-star volleys | Four nine-star volleys |
| Shadow dash | Committed rush | Faster rush with low waves | Faster again, with low waves |
| Void rain | Three fixed lanes | Five fixed lanes | Seven fixed lanes, two passes |

Nova attacks both sides so camping behind the Regent is unsafe. Stars deal
11 damage and have visible gaps. Crash marks its landing before takeoff,
locks that destination, and follows an 850ms arc with 145px lift. Its low
shockwaves deal 13 damage and can be jumped; the slam/body deals 16.
Pursuit speeds increase from 120 to 155 to 185, with attack gaps of
500/300/180ms. Targeting stays fixed during each warning.

Every attack ends with the existing ATTACK cue and a safe opening. Base
windows now follow the [shared stall/stun rule](boss-stun-v1.md): three seconds
to land a hit, then a two-second stun on the first hit, without repeated refresh.
Boss shots clear at recovery, retreat and defeat. Teleport protection applies
to the arriving body, while stars already visible continue travelling and
dealing damage through later departures and arrivals. Pause preserves warning,
attack, projectile and counter clocks. Existing armor bypass and Z God's
special rules are retained.

## Artwork

Built-in imagegen expanded the approved Regent into twelve poses in one
transparent generation. Source, exact prompt, seed canvas, individual frames
and preview are in `art/void-regent-v4/`. The runtime sheet is
`public/bosses/void-regent-v4/attack.png`, with metadata beside it.
`scripts/pack_void_regent_v4.py` preserves whole silhouettes and floating crowns,
uses one shared scale and the existing `(320,600)` foot anchor, and packs a
four-column, three-row sheet with 640px cells. Existing walk and death art stays
in use. Stars and shockwaves use small native Phaser textures.

The packer requires Pillow, NumPy, OpenCV and the installed game-studio
`normalize_sprite_strip.py` helper. Rebuild with
`python scripts/pack_void_regent_v4.py`.

## Verification

`scripts/test_void_regent_v4.mjs` checks all eighteen move/phase combinations,
committed targets and stable bodies, burst counts, full safe openings, real
rear-camper damage, keyboard jump dodges, body-versus-projectile rift safety,
pause, real opening damage, health-driven phase changes and the complete final
victory flow. A reduced-health fixture isolates the transition/ending test;
positioning hooks isolate scenarios and all damage uses real keyboard attacks.
The ending test collects existing blaster supplies if damage costs the loadout.
Phone profiles cover 844×390 and 734×290. This is browser emulation, not a
physical Safari playtest or a continuous no-hit campaign clear.

The focused suite, production build, standard game client and shared fairness
checks for all five bosses pass. `scripts/test_boss_encounters_v2.mjs 6` also
passes the full natural 120-HP fight with actual sword counters, all six moves
in each phase, protected transitions, defeat and final exit. Its in-page
sampler records brief motion/projectiles while screenshots are captured.

```powershell
npm run build
$env:GAME_TEST_URL='http://127.0.0.1:54821'
node scripts/test_void_regent_v4.mjs
```

The script saves screenshots and JSON outside the repository by default;
`GAME_TEST_OUTPUT` overrides that location. Use the installed browser cache via
`PLAYWRIGHT_BROWSERS_PATH` if required by the local environment.

Play locally with `/?autostart=1&level=6&finishLevel=1`.
