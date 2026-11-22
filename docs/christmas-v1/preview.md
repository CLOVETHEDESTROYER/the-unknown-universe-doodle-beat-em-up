# Christmas playable preview

On the main screen, enter **`SantaKisComing`** in **Secret code**, then choose **Apply code** or press Enter. The match is exact and case sensitive, including spacing. `santakiscoming` and `SANTAKISCOMING` do not work. Choose **Start game**, then **Killer Klause**. The same field also works on Pick Your Player.

Enter the exact lowercase phrase **`spirit of christmas`** to unlock Klause's invincible rainbow form. The unlock persists in this browser. Choose Killer Klause from the roster to play him; he ignores all damage and shows the moving translucent rainbow overlay. This code also enables the Christmas preview outside the seasonal window.

The preview remains enabled in this browser after reload. **Christmas preview ON · Turn off** disables the testing override. If browser storage is unavailable, activation still works for the current page session. The code does not unlock unrelated heroes or replace a saved campaign until the existing new-game confirmation is accepted.

## Playing Killer Klause

- Arrows / A,D: move; Z / Up / JUMP: jump and double jump. Down in midair triggers North Pole Drop.
- Space / HIT: launcher bash, three damage through the ordinary melee/guard path.
- C / FIRE: launch a wrapped present, five damage through ordinary projectile collisions and boss guards. Tap once or hold for repeated fire. A tap during reload queues one next shot. The firing cycle takes 900 ms; the next shot becomes available after 950 ms. Presents fly at 520 world pixels/second and remain larger and visible for up to 2.4 seconds, ending on impact. Standing fire plays the reload; moving fire keeps the eight-frame run cycle. Each run frame advances with 24 world pixels of movement, with fixed scale and hip/floor registration.
- X / SP: call the surviving elves. The medic restores up to twelve health; the engineer fires two supporting presents, three damage each. Ten-second cooldown. Finish a committed attack/reload and damage recovery before calling helpers.
- P or the pause button: pause. Helper cooldowns and animations freeze with the game.

Killer Klause keeps his native weapons. Coins and hearts remain available; generic weapon swaps, gun upgrades, and ordinary campaign companions are disabled for his run. His medic and engineer elves are his support ability. Existing collision geometry, boss guards, rewards, and progression remain in use. The existing campaign includes his boarding/pilot and victory artwork in Starbreak Run.

His twelve-panel origin opens before Level 1. Story navigation, Skip, save/resume, and the usual campaign chapters remain available. The first three ground-stage backgrounds use the city, North Pole, and workshop art; the later ground stages retain their own scenery with snow. Other heroes can also enter the Christmas theme.

## Automatic public availability

No code is required from **November 26, 2026 at 00:00 America/Denver** through **Christmas Day, December 25**, with an exclusive end on **December 26 at 00:00**. The browser checks this interval at menu load, the calendar boundary, return to the app, and new-run selection. Christmas takes priority over the stored Thanksgiving scenery preference for new runs during this window. The older Thanksgiving code and Turkey King unlock continue to work; their preferences remain available outside the Christmas window.

Existing runs and saves retain their captured theme and hero after the public window ends or the preview override is disabled. The preview code deliberately grants testing access outside the public window. The static game uses the browser's date; this is calendar availability in the deployed build, not server-enforced time or a scheduled deployment. The updated build must be deployed before Thanksgiving for the live site to gain this behavior. Publishing the updated build is separate from this in-game calendar; pushing main may trigger the configured hosting pipeline.

## Verification

`node scripts/test_christmas_event_v1.mjs` checks exact-case matching, Denver midnight boundaries, override reset, and blocked storage. `node scripts/test_christmas_preview_v1.mjs` checks real menu entry, all twelve story panels, movement/projectile defeat, elf healing/fire, pause, saves after expiry, code-free public opening, mobile title layouts, Thanksgiving compatibility, every campaign stage, double jump/slam, defeat/respawn, and boss victory. The latter uses `GAME_TEST_URL` for an already running built-game preview and optionally `GAME_TEST_BROWSER` for an installed Chromium executable.

The November 21 launcher/run pass adds `node scripts/test_klause_launcher_run.mjs`: released keyboard taps, quick FIRE clicks, one queued shot during reload, pause, repeat/release, both directions, actual enemy defeat, every live run frame, fixed collider/scale, moving fire, jump/landing, phone landscape and Starbreak assets. It copies the rendered canvas while presents are in flight; earlier screenshots only captured the enemy after impact. Evidence is in `output/klause-launcher-run/`. The generated eight-frame source, built-in ImageGen prompt/provenance and preview GIF are in `art/seasonal/christmas-v1/`; `scripts/pack_klause_run_v2.py` reproduces hip/floor registration and the barrel anchors used by gameplay. The main packer also includes it, and the export audit now covers 112 frames.

Evidence: `output/christmas-preview-v1/`. The standard develop-web-game client also ran through `scripts/run_game_test.mjs`, and its screenshot/text state are in `output/christmas-smoke-v1/`. Existing Turkey King progression checks passed. These are browser checks, not a physical-phone certification or a deployed-site check.
