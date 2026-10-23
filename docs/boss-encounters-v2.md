# Boss encounter pass

The campaign now has five bosses with distinct movement and attack patterns, committed warnings, a guarded second-wind transition, and recovery windows for ordinary attacks. Butt bombs can damage armor in every state. The axe/cannon boss is Kilina's Daughter. Original Kilina's new Witchwood chapter is documented in [Kilina's encounter](kilina-witch-level.md); [Starbreak flight](starbreak-flight-v1.md) follows at Level 5 and Void Regent is now Level 6.

## Fight identities

| Level | Boss | Attacks | Second phase | HP | Recovery |
| --- | --- | --- | --- | --- | --- |
| 1 | Dark Dragon | Aimed sequential fireballs, an arcing lunge, low creeping fire | Four shots instead of three; faster lunge | 32 | 2.6–2.7 s; 2.2–2.3 s in phase two |
| 2 | Kilina's Daughter | Axe dash, aimed cannon, marked leap slam | Warned return dash, five cannon shots, low slam waves | 44 | 2.6 s; 2.2 s in phase two |
| 3 | Cinder Colossus | Outward floor quake, bounding slam with landing waves, marked falling embers | Double quake, five ember lanes, faster bound | 48 | 2.8 s; 2.4 s in phase two |
| 4 | Kilina | Ballistic hexes, marked rune pillars, evasive leap and low wisps | Five bolts, five rune lanes with two pulses, faster leap | 52 | 2.6–2.7 s; 2.2–2.3 s in phase two |
| 6 | Void Regent | Marked blink then star burst, aimed star fan, shadow dash with fading echoes | Two five-star bursts; dash releases outward low waves | 56 | 2.6–2.7 s; 2.2–2.3 s in phase two |

The Dragon's oversized painted flame cone is excluded from its individual-shot animation. Its mouth and neck recoil while the actual fireballs show where damage is possible. Cinder's heavy poses, root motion, leap arc, and impact shake give the giant weight. The Regent fades out and reappears at a marked destination before firing, and leaves short-lived echoes during its dash.

## Shared fairness rules

- Purple status/health bar and GUARDED advice block ordinary weapon, companion and head-stomp damage. X God's butt bomb bypasses this guard; Z God's screen clear retains its existing power. During the counter window, the boss gains a slow coral-red highlight and a bold yellow **ATTACK!** sign with a draining time bar. Gold rings, a shrinking arc, and the OPEN countdown reinforce the same opening. The sign stays visible for the whole opening and vanishes as soon as armor returns, including between guarded phase-two follow-up attacks.
- The highlight tracks the currently rendered boss pose without changing its original tint, alpha, collider or movement. The sign follows the head, stays within the camera and below the HUD, and moves beside tall bosses when needed. Reduced-motion preferences use a steady red highlight. The cue is shared by all five on-foot bosses, including Dark Dragon and Kilina's Daughter, and clears on retreat, death and scene transitions.
- Sword, blaster, companion, and stomp attacks pass through the same strict state/time check. Opening damage is 1.5×, with Cinder retaining its 2× core bonus. Accepted hits have a 160 ms interval and never interrupt a boss commitment. Guarded attempts cannot consume that interval, extend the opening, or award stomp points.
- X God's butt bomb deals its normal direct/shockwave damage even during warnings, attacks and second wind. It bypasses the ordinary hit interval, while still hitting each target once per bomb. Openings retain their damage bonus. During an opening, boss contact, direct attacks and that boss's projectiles cannot hurt or knock back the hero; existing boss shots clear as recovery starts. Other enemies and hazards remain dangerous. The flight Pursuer also stops contact/laser damage during recovery.
- Aim, rain lanes, and travel destinations lock during the warning. Faster phase-two warnings remain explicit. The second wind waits until the current recovery has fully ended.
- Dragon lunge and Regent dash advise moving clear of the marked travel path. Low fire, quake waves, and the Regent's phase-two ground waves can be jumped. The movement hints do not promise that a ground jump clears a tall boss's entire body.
- Cornered movement attacks choose a marked destination across the arena rather than charging in place. Arena bounds stay on solid ground. Animated lean/squash affects the artwork while the collision body stays stable and follows the actual root immediately.
- The encounter camera holds the whole yard; it resumes player following on retreat or after the complete defeat sequence. Retreat clears enemy projectiles for the three revised encounters; defeat clears all warnings and hostile projectiles. Kilina's retreat behavior is preserved.
- All bosses now have dedicated four-pose death art and a 2.35s sequence. The enemy leaves physics immediately; rewards and the existing exit unlock once the final pose/fade finishes. See [boss defeat pass](boss-defeats-v1.md) for timing, assets and current validation.

## Assets and code

`scripts/pack_boss_encounters_v2.py` normalizes the already approved source images into `public/bosses/encounters-v2/{dark_dragon,ink_behemoth,void_regent}/{walk,attack}.png`. Each frame is 640 px with a shared bottom-center anchor at `(320,600)`. Each boss uses one shared source scale across both actions; isolated neighboring-frame fragments are removed while the Regent's separate crown is preserved. Original source assets remain available. Metadata records source paths and scale. Preview sheets are in `output/boss-encounters-v2/`.

`components/PlatformerGameEngine.tsx` contains the move timing table `BOSS_MOVES`, `beginStageBossMove`, `updateStageBoss`, warning/projectile/pose helpers, shared camera/guard helpers, and Kilina's existing dedicated controller. Debug output includes configured recovery duration, elapsed state time, rendered warning/status flags, body dimensions, and projectile patterns/velocities.

`gameplay/bossVulnerabilityCue.ts` draws the live pose highlight and ATTACK sign
using existing textures and Phaser graphics/text. `bossCues.vulnerability` in
`render_game_to_text()` reports prompt/highlight visibility, frame, remaining
time, bar fraction, reduced-motion preference and sign placement. The cue receives
the same `isBossVulnerable()` result used by the damage gate.

## Verification and review

- `node scripts/test_boss_vulnerability_cues.mjs`: first two bosses, actual guarded/open blaster hits, per-frame cue/damage-gate agreement, phase-two/return-dash timing, countdown pause, reduced motion, retreat and defeat cleanup. Set `GAME_TEST_URL`, `GAME_TEST_BROWSER=webkit`, optional `GAME_TEST_EXECUTABLE`, and `GAME_TEST_DEVICE` (a Playwright device name or `desktop`) to select the local server/browser/profile. `GAME_TEST_PHASE_TWO=0` runs the shorter presentation check for additional layouts.
- `node scripts/test_boss_encounters_v2.mjs [1|3|4|6]`: actual keyboard sword counters through every attack in both phases, protected rear hits and second wind, fixed targeting, body/arena alignment, rendered warning/status cues, settled phone captures, defeat cleanup, and exit activation. Positioning hooks isolate scenarios; they do not damage bosses.
- `node scripts/test_boss_dodges_v2.mjs`: zero guarded blaster damage and full opening damage for all three revised bosses; real held keyboard jumps clear Dragon low fire and Cinder quake; Regent arrives at its already marked blink destination.
- Existing Kilina encounter, blaster, boss-stomp, normal stomp/movement, and combat-presentation regressions cover the shared systems. The Dragon blaster-clear regression now uses real recovery counters instead of assuming the old unguarded 16 HP fight.
- `npm run build` and the established `scripts/run_game_test.mjs` production client cover packaging and ordinary movement/jump/crouch/attack inputs. Visual review includes desktop attack/warning/open states, phone arena framing, actual jump dodges, and boss defeats.

Evidence is stored in `output/boss-encounters-v2/`. Earlier failed captures are retained for diagnosis; use the latest results JSON and screenshots. Repository-wide TypeScript checking still reports existing errors in the legacy engine and older movement/Phaser typings; this pass does not claim a clean project-wide typecheck.

Final runs passed: all three revised full encounters (27 grouped checks), Kilina's full encounter (12), normal stomp/movement (8), Kilina boss stomps (4), Kilina blaster/phone (4), and combat presentation including a blaster Dragon clear (10). The focused dodge/blaster script additionally passed for all three revised bosses. Production captures for Levels 1, 3, and 4 reported no missing assets or browser error files. Desktop and settled phone screenshots were inspected. Full encounter automation uses position setup and verifies real counters; this is not a continuous no-hit run through every level.

## User playtest

Start each fight with `?autostart=1&level=N&finishLevel=1&sword=1&swordUnlocked=1`, where N is 1–4 or 6. Level 5 is the flight transition. Omit the sword parameters to try the blaster. Watch the warnings, dodge the committed attack, and counter on gold. Next tuning should follow feedback on the warning readability, counter travel time, phase-two pressure, and the time needed to finish each fight.
