# Void Regent: final-boss revision

The final boss has **84 HP**, up from 56, and an 880px movement arena on the
existing continuous floor. Portal landing points adapt to viewport width so
the drawing stays visible while moving between opposite screen sides.

Phase one rotates through **star fans → rift teleport → shadow dash → void rain**.
At half health the current opening finishes before the protected second wind.
Phase two uses **double rift → star fans → void rain → double rift → shadow dash
→ star fans**, then repeats.

| Attack | Phase one | Phase two |
| --- | --- | --- |
| Rift teleport | 900ms warning; snap across at 160ms; five-star burst | 780ms warning; snap across, warn again, snap back; two seven-star bursts |
| Star fan | Two five-star volleys | Three seven-star volleys |
| Shadow dash | Warned cross-arena rush with echoes | Faster travel and jumpable low waves, with 450ms of guarded settling so waves can threaten before the opening |
| Void rain | Three fixed, marked falling-star lanes | Five fixed lanes |

Star projectiles travel at 480px/s. Attack durations allow ranged shots to cross
the wider arena before the safe opening clears them. Teleport destinations and
aim lock during the warning rather than following the player. The return portal
gets another visible warning before its snap at 1240ms into the attack.

The boss cannot deal contact damage while vanishing/reappearing, and each actual
arrival grants 240ms of contact protection. An opponent can leave the marked
landing before the boss becomes solid. Normal damage resumes after the visible
arrival. Butt bombs retain their existing armor bypass; Z-God retains her power.

Every attack ends in a real counter window with the existing red highlight and
ATTACK badge. Rift recovery lasts 3.0s in phase one and 2.6s in phase two; the
other moves retain 2.6–2.8s / 2.2–2.4s. Boss contact and its remaining projectiles
are harmless during these windows. The warning, teleport, projectile expiry and
counter timers preserve their remaining duration through pause/resume.

`gameplay/voidRegent.ts` owns health, move ordering, landing calculation, blink
presentation timing and disposable portal/echo effects. It reuses existing boss
art, adding no image downloads. The scene adapter owns physics, damage, projectile
creation and guard rules. Effects clear on retreat, death and scene shutdown.

```powershell
npm run build
node scripts/test_void_regent_v3.mjs
node scripts/test_boss_fairness.mjs
```

Tests default to port 4381. Set `GAME_TEST_URL` to override it; select WebKit with
`GAME_TEST_BROWSER=webkit` and `GAME_TEST_EXECUTABLE`. The dedicated test covers
the actual four-move rotation, both phases, committed destinations, quick snaps,
safe arrivals, pause, real opening damage, rain, active dash waves and retreat.
The existing encounter script also verifies a complete sword-counter clear,
phase transition, death sequence and victory; use `GAME_TEST_URL` and pass `6`.

Play locally: `/?autostart=1&level=6&finishLevel=1&character=xgod`.
