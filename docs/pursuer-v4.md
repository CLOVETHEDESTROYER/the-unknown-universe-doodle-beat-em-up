# Void Pursuer: movement and difficulty pass

The flight finale now has three escalating health phases and four attack
patterns. Easy/Hard/X-GOD health is 72/92/112 (previously 28/36/44), so ordinary
counter fire leaves room for the later patterns. Plasma damage remains
10/14/18. Z God retains her intentional invincibility and one-hit power.

| Attack | Movement | Phase escalation |
| --- | --- | --- |
| Prism fans | Weaves vertically and bows forward while firing at the warning's fixed aim point | One 3-bolt fan, two 5-bolt fans, then two 7-bolt fans |
| Curved sweep | Warned out-and-back arc from the opposite vertical side, reaching x285/x260/x235 | Faster charge; phase two adds 2 outward bolts, phase three adds 4 |
| Firing strafe | Crosses from high to low or low to high while advancing 180–220px | Three single shots, four paired volleys, then five triple volleys |
| Lane barrage | Sways behind successive horizontal plasma walls | Two walls, then three; projectile speed increases; the marked green corridor remains safe |

LOCK ON begins at full health. HUNT MODE starts after a complete counter
window with health at or below 68%; CORE OVERDRIVE starts after another
complete counter window at or below 34%. Each transition is guarded for one
second. Phase-specific four-move rotations introduce the strafe on entering
phase two and the barrage on entering phase three. The boss never retargets
its aim, charge path or safe lane after the warning begins.

Warnings last 1.1–1.4s initially, reducing by 125ms each phase; Hard/X-GOD
reduce them by another 60/100ms. Barrage warnings remain at least 1.05s,
enough to steer to any of its 190/300/410px lanes. The 100px-high green band
fits inside the actual gap between projectile hitboxes and stays left of the
boss's collision area. Its lane stays fixed across every wall. The charge
warning uses the same sampled path function as the moving physics body.

Counter windows stay at 3.0s in phase one and 2.6s in phases two/three. The
boss settles back to the firing lane over the first 350ms, accepts damage
throughout recovery, then finishes the full opening before changing phase.
The route lock, final checkpoint repair/retry, 700-point reward and four-frame
2.35s wreck sequence remain. No new textures or image downloads are needed.

`gameplay/flightPursuer.ts` owns paths, locked warning targets, volleys and
phases. `components/FlightGameEngine.tsx` renders the same root movement with
banking, the sweep path, barrage corridor and phase/countdown HUD. Ordinary
flight enemies and all on-foot bosses retain their current rules.

Validation commands:

```powershell
node scripts/test_pursuer_v4_sim.mjs
$env:GAME_TEST_URL='http://127.0.0.1:4381'
node scripts/test_pursuer_v4.mjs
```

Simulation covers all 36 difficulty/phase/pattern combinations, movement
bounds, fixed targets, projectile counts/escalation, corridor hitbox safety
and travel time, complete counter windows, guarded transitions and pressure
on a stationary pilot. The browser suite uses actual keyboard counter fire
through all 12 phase/attack combinations; position hooks isolate scenarios.
A separate barrage check uses real steering from the wrong lane. It also
checks pause, all four wreck frames, landing into level six, clean checkpoint
retry, difficulty damage and Z God's power. Select engine/device with
`GAME_TEST_BROWSER`, `GAME_TEST_DEVICE`, optional `GAME_TEST_EXECUTABLE`.
The old `test_starbreak_finale_v3.mjs` entry point runs this expanded suite.
Evidence lives in `output/pursuer-v4`.

Play locally at
`http://localhost:4380/?autostart=1&level=5&flightFinale=1&character=xgod`.
Browser automation does not replace physical-device play or subjective
difficulty feedback.
