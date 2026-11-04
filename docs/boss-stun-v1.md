# Boss stall and stun

All current campaign bosses, including the seasonal turkey and flight Pursuer,
stall for 3000ms after each attack. HIT TO STUN marks that opening. The first
accepted, nonlethal hit during it starts a fresh 2000ms stun. Projectiles,
melee, companions, stomps and specials use the same ground-boss damage path.
Repeated hits deal damage without refreshing the stun. A killing hit proceeds
straight to the existing death sequence. Untouched bosses resume normally.
Phase changes wait until the current stall or stun finishes.

Stall/stun remain harmless, clear boss hazards, and preserve their timers through
pause. Damage during a guarded attack cannot stun or interrupt it; existing
armor-bypass abilities retain their damage rules. STUNNED labels and gold orbiting
sparks distinguish a stun from an untouched opening. The Pursuer stays in place
while stalled/stunned and follows the same timers through actual bolt collisions.

Void Regent additionally has a silhouette-only violet pulse while attacking
(360ms cycle with a 75ms bright hold, 60ms fade and dark gap; pale-violet
alpha .04–.86). Reduced motion uses a steady .18 tint.
Teleport invisibility still governs the pulse's visibility/alpha. No full-screen
flash is added. His new four-frame stun strip plays an impact recoil followed
by a dazed loop; other bosses use their existing recovery poses and shared cue.

Built-in imagegen source, exact prompt, edit canvas, normalized frames and preview:
`art/void-regent-stun-v1/`. Runtime: `public/bosses/void-regent-stun-v1/stun.png`.
Rebuild with `python scripts/pack_void_regent_stun_v1.py` (Pillow, OpenCV, NumPy).
Frames use one shared source scale, 640px cells and the existing (320,600) anchor.

`scripts/test_boss_stun_v1.mjs` checks actual projectile-triggered stuns, missed
windows, repeated-hit clocks, harmless openings and pause for every ground boss
and phase, plus flight projectile collisions in all three phases. It also checks
the Regent's pulse and reduced-motion setting. Additional cases verify real fists,
butt bombs, the phone stun pose and the flight boss's rendered stun. Run only
those extras with `BOSS_STUN_EXTRA_ONLY=1`. Screenshots/results default to
the OS temporary directory; `GAME_TEST_OUTPUT` overrides it. Playwright's local
browser cache may require `PLAYWRIGHT_BROWSERS_PATH`.
