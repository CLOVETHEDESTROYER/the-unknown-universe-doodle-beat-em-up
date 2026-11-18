# Wallet and level results

Normal campaigns now stop at a results screen after every completed level, including Starbreak and the finale. Continue opens the existing chapter story; the first chapter still leads to Alley Rescue. The gameplay renderer and controls are released while reviewing results.

The screen shows points earned in this level, total campaign points, gems collected in this level, enemies defeated, the Gold breakdown, and the saved wallet balance. The gameplay HUD also shows collected gems. The internal `souls` field remains the campaign's cumulative gem counter for compatibility with older saves.

## Starting economy

- Each collected gem earns **5 Gold**.
- Completing a level earns **100 Gold**.
- Each full 1,000 eligible performance points earns **10 Gold**, capped at 150 Gold per level. Eligible points exclude the gem points (100 each) and the standard 900-point clear reward.
- Points are never spent or reduced when earning Gold.

These are initial tuning values; the working shop is a separate pass. The first version rewards points-based performance, rather than grading damage, speed, or deaths.

## Persistence

`gameplay/levelRewards.ts` owns `unknownUniverse.wallet.v1`. It stores the persistent Gold balance, credited run/level receipt IDs, and an unacknowledged result together in one storage write. A new campaign resets campaign totals but keeps the wallet. This is one local wallet per browser; named profiles and cross-device syncing are not implemented.

The result includes the exact next-level campaign snapshot and story. Reloading an unacknowledged result reopens it. Continue saves that next snapshot before acknowledging the result, so an interrupted write can safely be retried. The finale uses the same recovery path before opening the last story. If storage is unavailable, the screen stays open and offers a retry.

Campaign saves retain the run ID, per-level starting totals, and IDs of collected gems. Quit/resume therefore includes the whole level's earnings and does not respawn already-collected gems. Older saves remain readable; their reward baseline begins when first resumed because they did not record earlier level totals. Developer preview runs show results without depositing Gold into a real campaign wallet.

## Verification

Run the local server, then `node scripts/test_level_results.mjs`. Override `GAME_TEST_URL` or `GAME_TEST_EXECUTABLE` if needed. The browser test covers actual pickups and boss exits, checkpoint resume, desktop/phone layouts, reload, repeated claims, storage failure and retry, a new campaign, and final-stage rewards. Campaign story and save regressions also cover the updated results boundary.

## Tally animation and Game Over

Totals count up over 1.15 seconds, then the points pulse twice with a warm halo and sparkle. Gem and Gold totals receive a short glow. Continue is always available; reduced-motion users see settled totals immediately without pulses.

After the final life, both ground and flight campaigns use the same paper stats card with a Game Over variant. It shows the unfinished level totals and existing wallet; it does not credit an unfinished level. Ordinary checkpoint respawns keep their existing timing. Draw again remounts a fresh renderer, including in autostart previews. Run `node scripts/test_results_motion.mjs` for tally, pulse, ground/flight death, restart, phone layout and reduced-motion checks.
