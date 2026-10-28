# Companion movement and attacks

Dinio accelerates into his following position, cycles his six running poses,
hops steps and follows the hero's jumps, then lands on level terrain. His three
attack poses show windup, release and recovery. He fires a 2-damage shot every
880ms when an enemy is in range and his muzzle has a clear firing lane.
Long separations trigger catch-up placement rather than leaving him behind.

Doghost has eight glide poses and four inhale/howl/recovery poses. His howl
releases an aimed 3-damage soundwave every 1450ms; it can hit two distinct enemies
once each before disappearing. He floats behind the hero and turns toward his
target during the howl. Both ranged companions wait for boss openings, check
the real muzzle-to-target line against solid platforms, and recheck targets at
release. Their shots have independent lifetimes and do not spend the hero's
weapon durability or projectile allowance.

Teleportation C now assists against healthy enemies, rather than waiting for
enemies to reach 2 HP. His portal strike deals 3 damage, returns him to formation,
and has a 1900ms assist cooldown. Nearby hostile-projectile interception retains
priority. Boss guard rules and terrain separation still apply.

All three freeze with the scene during pause. Debug output exposes Dinio's ground
state/velocity and each ranged companion's shots/hits/animation state, plus
Teleportation C's intercepts and strikes.

Generated Doghost source: `art/companion-v2/doghost-generated.png`.
Prompt provenance (also X God's card): `art/ui-v2/prompts.json`.
Normalized review: `art/companion-v2/doghost-review.jpg`.
Delivery: `public/companions/motion-v2/doghost.{json,webp}`.
The 960x720 atlas has twelve 240px logical frames with a shared scale and foot
anchor. It loads only when Doghost is active. The packer uses measured row gaps
and removes clipped gutter components to avoid neighboring-pose fragments.

X God's new selection card uses his lime hair, X eyes, white shirt, orange cargo
trousers and sneakers from the current drawn idle sprite. The Fire Sword is
identified as an unlock. Original source is `art/ui-v2/xgod-card-generated.png`;
delivery is `public/cards/xgod-current-v2.webp`. Existing roster scrolling and
locked-character rules remain in effect.

Repack both assets with `python scripts/pack_companion_v2.py` (Pillow, NumPy,
SciPy). Test with `node scripts/test_companion_assists_v2.mjs` and
`node scripts/test_xgod_card_v2.mjs`. Use `GAME_TEST_BROWSER=webkit` and
`GAME_TEST_EXECUTABLE` for an explicitly installed WebKit binary; optional
`GAME_TEST_URL` defaults to the production preview at port 4381.
