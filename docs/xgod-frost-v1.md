# X-God ice-gauntlet sprites

The frost pickup now gives drawn X-God visible cyan crystal gauntlets on both hands instead of using unarmed sprites plus a floating blue dot. Seven animation sets cover idle, run, jump, cast, crouch/crouched cast, skid and hurt, for 32 generated frames. The shared roster size and foot baseline are preserved.

`gameplay/xgodFrost.ts` chooses the equipped pose. `PlatformerGameEngine` loads the selected hero's frost atlases from level 2 onward, reads hand sockets for projectile placement, and uses equipped hurt art until the equipment breaks. `AirborneMoves` keeps gauntlets visible through double jump and slam, restoring ordinary mobility presentation when switching equipment. Projectile speed, damage, freezing and equipment durability retain their existing rules.

Flight boarding and disembark also retain the gauntlets when X-God enters the flight stage with frost equipped. The saved-game Continue regression covers this path and verifies both boarding art and cockpit loading.

Assets and rebuild instructions: `art/xgod-frost-v1/README.md`. Test with `node scripts/test_xgod_frost_v1.mjs`; use `FROST_MOBILE=1` for phone emulation, `GAME_TEST_URL` to select the server, and `GAME_TEST_BROWSER` for the browser engine. No online deployment is included.
