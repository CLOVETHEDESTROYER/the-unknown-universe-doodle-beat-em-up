# Mobility and crouched combat for the full roster

Every current on-foot hero now shares these controls:

- Z / Up or the JUMP touch button: jump, release, double jump, release, third-tap slam.
- Down / S or joystick down: crouch on the ground; direct slam while airborne.
- Hold crouch and Space / C / FIRE to shoot low. Unarmed and sword attacks also work while crouched.

An extra jump replenishes on landing, spring launch and retry. Holding jump does
not advance the chain. Slams have committed windup, dive and recovery; movement,
attacks, signature specials and teleport recall cannot interrupt them. Pause
freezes the move. Weapon durability and the separate SP signature remain independent.

| Hero | Third-tap move | Direct / shockwave damage | Distinction |
| --- | --- | --- | --- |
| X God | Butt Bomb | 6 / 4 | Existing 180px local shockwave |
| Barrett | Bear Drop | 8 / 5 | 230px reach, stronger launch and 750ms stun |
| Nico | Rocket Drop | 7 / 5 | 205px blast also clears nearby hostile shots |
| Ezra | Flame Crash | 6 / 5 | 225px-high flame burst catches higher enemies |
| Teleportation C | Rift Drop | 6 / 3 | 250px wave pulls surviving ordinary enemies inward during a 650ms stun |
| Z God | Starfall Ground Punch | Defeats visible enemies | Existing screen-wide enemy/projectile clear, invincibility and one-hit power |

All local slams respect terrain separation and hit a target once per cast.
They bypass boss armor and recent ordinary-hit cooldowns. Opening multipliers
remain; bosses keep their normal defeat/reward sequence. Z God's screen clear
retains its existing ability to cross platforms.

Crouching reduces the real collider without shifting the feet. Releasing crouch
restores the standing body when there is room. Shots use a lower, facing-aware
muzzle; the new heroes have low aiming/recoil poses for blaster and frost,
plus unarmed and sword poses. X God and Z God keep their existing crouch art;
the old shared rule that blocked crouched firing was removed for everyone.

`gameplay/heroMobility.ts` defines the move differences. `AirborneMoves` owns
the shared jump/slam state and the new crouch overlay. The ordinary player body
remains the physics authority; no second player collider is created. Debug
state is under `movement.heroMobility`, with the existing X God/Z God aliases.

Four generated sixteen-pose sheets match the current shipped identities:
four double-jump poses, four slam poses, and eight crouch/attack poses. Exact
prompts, original transparent PNGs, packing metadata and reviews are preserved
in `art/roster-mobility-v2`. `scripts/pack_roster_mobility_v2.py` (Pillow, NumPy,
SciPy) finds the sixteen main body components, removes translucent spillover,
and uses one scale/anchor to pack each 1040x1040 trimmed WebP atlas with 256px
logical frames. Delivery lives under `public/characters/mobility-v2`.
Only the selected new hero loads its atlas: approximately 0.52–0.68 MiB transfer
and 4.13 MiB decoded RGBA. X God/Z God load their existing mobility atlases.

Verification scripts: `scripts/test_roster_mobility_v2.mjs` (all six heroes,
keyboard/touch, real crouched kills, jump chain and pause) and
`scripts/test_roster_mobility_edges_v2.mjs` (four unique effects, weapon variants,
left-facing shots, guarded bosses, retry and selected-asset loading).
Both support `GAME_TEST_BROWSER`, optional `GAME_TEST_EXECUTABLE` and
`GAME_TEST_URL` (defaults to the production preview at port 4381).
