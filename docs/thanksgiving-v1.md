# Thanksgiving mode

On **Pick Your Player**, enter `happyturkey` in **Secret code** and press **Apply code** (or Enter). Then choose a hero. Capitalization and surrounding spaces are ignored. Invalid codes display feedback. The D-pad roster unlock remains separate and works as before.

The preference stays on in this browser until **Thanksgiving ON · Turn off** is selected. That setting applies to new games. Each saved campaign stores its own theme; Continue restores that theme, even if the new-game preference has changed. Existing version-one saves without a theme continue with the classic boss. If browser storage is unavailable, code activation still works for the current session.

## Level and encounter

- Level one has the autumn skyline and a bounded pool of drifting leaves. Other ground stages have the leaf effect; flight retains its existing presentation. Reduced-motion mode uses six stationary decorative leaves.
- The level-one Dark Dragon is replaced by **Giant Turkey** only in Thanksgiving runs. All other bosses retain their existing encounters.
- **Talon charge:** a 1.1-second warning shows the turkey raising its wings and extending its talons. It takes off, commits to a fast charge at the player's warned position, flies back harmlessly, lands, and recovers for 2.9 seconds (2.5 seconds in phase two). The player can counter during recovery.
- **Wing gust:** a raised-wing warning precedes three moving gusts (four in phase two). An unblocked gust deals seven damage and pushes the player away, briefly overriding movement for a visible displacement. Jump over the low wind pulses or use the existing platforms. Z-God, shields, and invulnerable actions retain their protection. Remaining gusts clear when recovery starts.
- Both attacks alternate naturally, use the existing boss guard and phase transition rules, and preserve the original reward, defeat score, barrier, and level exit.
- Warning, flight, recovery, defeat, and leaf motion freeze with Pause. Resume preserves the turkey's timing.

## Artwork

The approved turkey was expanded with built-in imagegen into twelve poses in one generation. Source sheet, edit canvas, prompt, extracted frames, and checkerboard preview are in `art/seasonal/thanksgiving-v1/`. The runtime sprite sheet is `public/seasonal/thanksgiving-v1/turkey.png`: four columns by three rows, 512 × 512 frames, left-facing, foot anchor (256, 480). Frame names are in the adjacent metadata file. The generated sheet's small grid drift is corrected by extracting whole silhouettes, then using one shared scale and anchor.

Rebuild runtime artwork with `python scripts/pack_turkey_v1.py` (Pillow, OpenCV, NumPy, and the installed game-studio sprite normalizer). The packer also extracts leaf frames and crops the approved environment concept to a distant skyline so gameplay retains its collidable foreground.

## Verification

Run `npm run build`, then start Vite and set `GAME_TEST_URL` to that exact origin before running `node scripts/test_thanksgiving_v1.mjs`. Set `GAME_TEST_OUTPUT` to an external evidence folder; its default is the OS temporary directory. The browser test covers actual text entry, wrong codes, both attack phases, knockback, retreat, counter windows, jump clearance, pause, a real projectile defeat, rewards, other bosses, old/new saves, classic toggle, D-pad unlocking, storage failure, desktop, and phone layouts. The shared develop-web-game client supplies an additional normal movement/attack smoke test.
