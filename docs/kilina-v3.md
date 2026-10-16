# Kilina combat pass

This historical pass covers **Kilina's Daughter on Level 2**. The original Kilina is a separate witch boss on Level 4; see [the Witchwood chapter](kilina-witch-level.md).

Kilina's Daughter now uses a separate combat loop with committed attacks, visible recoveries, and a second phase. Her existing purple armor, axe, cannon, and hand-drawn palette are preserved in the new attack art.

## Encounter

- **Spacing:** she advances when farther than 345 px and backs away inside 225 px. Her feet remain on the arena floor; a compact torso collider excludes her weapon's empty space. The arena camera holds both ends of the fight in view, then resumes following the player on retreat or defeat.
- **Axe dash:** a 680 ms wind-up marks the committed direction. She dashes through a fixed destination, follows through, and recovers for 1.1 seconds. Jumping, using the ledges, or moving behind her creates a counterattack opportunity.
- **Cannon burst:** a sight line shows the locked aim point, then she fires three rounds with recoil and a small backward step. The first-phase spread can be crouched under from a standing-height aim. If crowded inside 215 px she chooses a slam instead of firing backwards through her muzzle.
- **Leap slam:** an 800 ms warning marks a 224 px landing zone, followed by a 960 ms jump. The marker stays in place when the player moves. Landing damages the ground zone and leaves a long recovery.
- **Second wind:** below half health, she finishes the entire current recovery window, signals a guarded 950 ms transition, then uses faster attacks. Dashes can gain a return dash with a fresh 420 ms warning; bursts grow to five rounds with wider final shots; slams release two low outward waves. Recovery remains 850 ms.

## Damage and fairness

Health remains 44. Kilina blocks **all damage from every direction** while repositioning, winding up, attacking, or entering her second phase. Only the recovery after a completed attack is vulnerable: 1.1 seconds in phase one and 850 ms in phase two. A return dash must finish before its recovery opens. Sword hits, gunshots, companion attacks, and stomps all pass through the same damage gate. Blocked hits cannot spend the opening's hit cooldown, cancel an attack, or extend the window.

Recovery takes 1.5× damage. Successful hits have a 160 ms damage gate and do not interrupt her moves. A purple outline, blocked-impact ring, purple health bar, and GUARDED label show protection. Gold rings, a shrinking arc, a gold health bar, and an OPEN countdown show the counter opportunity. The phase transition waits until the window expires, even if a counter crosses half health. Blocked stomps still bounce safely but give no points; successful opening stomps retain their 50-point bonus.

Attack direction, cannon aim, and slam destination lock during the warning. Boss projectiles expire and are removed on defeat. The boss's movement stays inside the existing solid arena floor, and thin elevated ledges do not block her movement. Counters, stomps, gunshots, normal player damage immunity, and the exit barrier still use the existing combat systems.

## Assets and reproduction

- Source: `art/kilina-attack-poses-v3-generated.png`, generated using the approved first frame of `public/bosses/killinas_daughter_walk_v2.png` as the reference.
- Prompt intent: an eight-pose transparent 4×2 sheet of the same pencil-and-ink warrior, facing right, preserving purple armor, short dark hair, bare legs, silver axe, and handheld cannon. Poses: ready, raised axe wind-up, sweeping dash, follow-through, cannon aim, recoil, airborne tuck, and crouched axe landing. No scenery or labels.
- `python scripts/pack_kilina_v3.py` extracts the eight connected silhouettes before normalization so the extended axe is preserved across the source grid border. One shared scale preserves anatomy. The original walk is normalized and neighboring-frame debris removed.
- Runtime sheets: `public/bosses/kilina-v3/{walk,attack}.png`, eight 640 px frames each, origin `(320, 600)`, scale 0.9. Muzzle metadata is recorded alongside the sheets.
- Gameplay code: `components/PlatformerGameEngine.tsx`; dedicated `beginKilinaMove`, `updateKilina`, and pose/projectile helpers.

## Playtest focus

Try jump timing against the dash, crouching for the first cannon burst, leaving the slam ring, then attacking during recovery. In the second phase, watch for the return dash and jump the low slam waves. The intended next step is user feedback on difficulty and recovery length before changing another boss.

## Verification

`npm run build` passed. `scripts/test_kilina_v3.mjs` exercises zero-damage front and rear hits without attack cancellation, committed dash targeting and recovery counters, a crouch dodge against the three-round burst, fixed slam targeting and landing, a full opening before the half-health transition, protection during second wind, the warned return dash, low slam waves, the five-round burst, defeat cleanup, and the exit into Level 3. The dash and airborne collider bottoms are checked against the boss's actual position, together with locked-camera coverage. All boss health loss and defeat use real keyboard attacks; positioning hooks isolate scenarios.

`scripts/test_kilina_blaster_v3.mjs` checks zero guarded blaster damage, full recovery counter damage, phone arena presentation, and the airborne body. `scripts/test_kilina_recovery_stomps.mjs` checks guarded bounces, no blocked-hit point farming, successful opening stomps, and closing the window. `scripts/test_stomp_flow.mjs` covers the shared normal-enemy stomp and movement behavior. Desktop and phone screenshots are inspected, and the established gameplay client exercises movement, jumping, attacks, and crouching against the production build. Current recovery-window evidence: `output/kilina-recovery/{playtest,blaster-playtest,stomps,production-smoke}/`. Previous movement/art evidence remains in `output/kilina-v3/`.
