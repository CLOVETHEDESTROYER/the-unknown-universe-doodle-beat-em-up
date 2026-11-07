# Helper, checkpoint and boss animation pass

Teleportation C's level-three helper uses a dedicated 24-frame sheet: four idle,
eight run, four airborne/landing, four portal-strike and four intercept/arrival
poses. His run phase follows actual distance travelled; idle no longer runs in
place. He follows surface height, transitions through airborne and landing poses,
and settles after returning through a portal. All poses use a common scale and
foot anchor at the existing 160-unit character height. Playable C keeps his own
art. The helper retains 3 damage, a 1,900ms cooldown, interception priority and
boss/terrain guard checks. The assist animation lasts 360ms, with impact at the
existing 110ms release. Its clock freezes during pause and stale strikes are
cancelled on respawn.

Every ground checkpoint's painted pedestal now touches a solid supporting top.
The anchor accounts for transparent padding and the pole being left of the
image's center. Display size is 69.6 x 98.4, up from 58 x 82 (1.2x on both axes);
the trigger is also 1.2x. Flags near a platform edge clamp to safe base support.
Activation, checkpoint order and respawn mechanics retain their existing paths.

| Boss | Confirmed animation gap | Change |
| --- | --- | --- |
| Dark Dragon | Four attack cells; abrupt swaps between walking jaw poses and breath pose | Twelve new head/neck poses: inhale, jaw opening, thrust, release, recoil, lunge and settling |
| Killina's Daughter | Eight cells with a large jump from raised axe to extended hit | Twelve added poses for weight transfer, downswing, follow-through, leap and landing; original cannon key poses retained to match the real muzzle |
| Cinder Colossus | Four cells jump from raised fist to planted fist | Twelve new weighted lift, downswing, impact, rebound, leap, landing and fatigue poses |
| Kilina | Twelve useful poses, but several spells held one frame for most of the attack | Gather, release, follow-through and recovery sequences follow actual shot pulses; dash and airborne transitions use more of the existing bank |
| Void Regent | Twelve useful attack poses but static fan/nova/blink holds | Pulse-driven charge/discharge/settle, complete crash phases and clearer blink preparation/release; existing dedicated stun strip retained |
| Seasonal Giant Turkey | Twelve poses available; retreat held one flying cell for almost a second | Flapping retreat, staged lift/landing and a reversible gust wing loop; recover settles unless stunned |
| Flight Void Pursuer | Three hull/core states, one held through warning and attack | Eight new spool, charge, discharge, recoil, cooling and banking cells |

Boss rendering follows the existing movement, impact events, tell durations,
contact gates and counter windows. Daughter's axe follow-through tracks the real
12–78% active interval of her dash. Stunned bosses stay in exhausted poses instead
of returning to ready early. No boss damage, health, cooldown or phase thresholds
were changed. Generated bodies register against the shipped ready-pose size and
shared anchors; existing death art remains.

Generated with the built-in `image_gen` tool, using shipped sprites as identity
references. Original generations, seed/reference canvases, exact prompts and
GIF/contact-sheet previews are retained:

- Helper sources and prompt: `art/companions/teleportation-c-v3/` (`prompt.md`).
- Helper delivery: `public/companions/teleportation-c-v3/helper.png` and metadata.
- Boss sources and prompt set: `art/boss-flow-v3/` (`prompts.json`).
- Boss delivery: `public/bosses/flow-v3/{dark_dragon,killinas_daughter,ink_behemoth,pursuer}.png` and metadata.
- Repeatable packers: `scripts/pack_teleport_helper_v3.py` and `scripts/pack_boss_flow_v3.py`.

Runtime helpers are `gameplay/teleportHelper.ts`, `gameplay/checkpointPlacement.ts`
and `gameplay/bossFlow.ts`; caster/turkey pose sequences live with their existing
combat modules. New atlases load conditionally for the active helper or boss.

Validation includes all 47 checkpoint supports and exact sizes, actual activation
and respawn on all five ground stages, the real level-three helper pickup,
idle/run/air/strike/intercept/return frames, real enemy damage and projectile
interception, pause, phone framing, arena bounds/facing/reward regression and
counter-stun checks across every ground boss phase and all three flight phases.
Boss recordings sample anticipation, action and recovery at animation-frame
cadence across eighteen ground attacks plus the Pursuer. Capture-only fixtures
use real warning durations and real combat progression; they isolate animations
and do not claim a continuous campaign playthrough. The shared gameplay client
also runs the first level-three section with C active. Evidence and screenshots
are ignored under `output/helper-checkpoints-v3/` and `output/boss-flow-v3/`.

Local helper preview:
`?autostart=1&level=3&character=xgod&teleportc=1`.
