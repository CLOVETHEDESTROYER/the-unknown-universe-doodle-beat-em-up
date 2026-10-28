# Layered action sound design

This pass replaces the basic core action cues with original offline-rendered
layered effects. It adds expressive weight and clearer gameplay feedback rather
than trying to imitate recorded firearms or people. No external samples, voices,
music generation service or new runtime dependency is involved.

The current bank contains 77 clips across 36 event families: 68 new versioned
clips plus nine retained v1 collection/death/shield clips. The new files total
2,147,632 bytes; the active combined bank totals 2,479,668 bytes. New files are
32kHz mono 16-bit WAV and decode after a user gesture through the existing
two-worker warmup. Title loading still does not fetch effects or construct an
AudioContext before interaction.

| Action | Sound character |
| --- | --- |
| Ink blaster | Trigger snap, pressure body, modulated discharge, barrel air and short metal resonance |
| Ship cannons / spread | Brighter FM laser discharge, separate from the ground blaster |
| Plasma lance | Longer harmonic energy tail |
| Homing missiles | Launch thump and accelerating propellant/motor rush |
| Enemy ship / boss lasers | Quieter distinct discharge on actual enemy volleys |
| Jump / double jump | Shoe push and rising air; the extra jump adds a higher shimmer |
| Landing | Quiet contact/grit after a real airborne return; omitted during a slam |
| Punch / sword | Airy swing separated from confirmed contact, with body/material resonance |
| X God slam | Ground impact and debris |
| Barrett slam | Heavier low body and longer settling resonance |
| Nico slam | Pressure blast and propellant bloom |
| Ezra slam | Impact followed by a rising flame texture |
| Teleportation C slam | Falling portal sweep/vortex |
| Z God slam | Powerful impact with a short star chord and radiant tail |
| Frost / ember / storm / teleport | Distinct ice resonance, thrust rush, electrical crack/thunder, or portal inhale/release |

Each sound combines several timed layers. Band-shaped noise, FM sweeps and
inharmonic resonances provide detail in the midrange as well as bass. Short
filtered reflections add space without a long wash. The generator applies
gentle saturation, a 35Hz high-pass, fade-in/out and a silent endpoint. Sample
peaks stay below 0.75; variants use distinct deterministic noise seeds and small
pitch differences. The existing runtime mixer still limits repeats and voices,
prioritizes important events, compresses the mix and respects pause/mute/sliders.

Slams own one main impact cue. Damage to several targets no longer stacks a bass
hit for each enemy; boss contact can retain a quieter confirmation. Flight sounds
follow successful volley counters, with separate player/enemy weapon families;
counter resets do not emit a shot. Scene repositioning does not emit a landing.

Options and pause → Sound now offer a preview selector for weapons, movement
and hero slams. Test effects works while paused. The short landscape panel uses
two columns so previews, both sliders and Resume remain visible on phone screens.
Music stays on its existing independent channel.

Rebuild with `python scripts/generate_sfx_v2.py` (NumPy/SciPy). Delivery files and
layer metadata are in `public/audio/sfx-v2`. The reproducible 15-second A/B reel
is `art/audio-v2/sound-preview-v2.wav`; its timestamped order is in
`art/audio-v2/preview-order.json`. It begins with old/new blaster and jump cues,
then the double jump, old stomp/new slam, flight weapons and six slam flavors.

Verification: `scripts/test_audio_v1.mjs` remains the broad sound/settings/gameplay
regression and now resolves the active versioned bank. `scripts/test_audio_v2.mjs`
checks all six real jump/double/slam/landing sequences, preview output, phone
geometry, actual weapon pickups/firing and a boss laser volley. Chromium verifies
nonzero signal through the actual audio graph with music muted. The installed
Windows WebKit build does not expose AudioContext: it verifies silent fallback,
gameplay continuity and phone controls, not sound output. Final timbre and balance
still benefit from listening on the physical iPhone, headphones and speakers.
