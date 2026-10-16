# Core sound effects v1

Original synthesized effects for the current platformer campaign and Starbreak flight level. No third-party samples, voices, or external generation service are used. Existing background music stays on its separate music channel. The old optional brawler runtime has not been given these new gameplay hooks.

## Dark Dragon battle music

The user-provided `Dragon's Breath.mp3` is preserved without conversion at `public/audio/music/dark-dragon-dragons-breath.mp3`. Level1 switches from its normal theme when the Dark Dragon arena engages, loops the boss track, and restores the level theme when the encounter disengages or the boss is defeated. The existing music slider, mute, pause/resume and browser gesture unlock apply. Direct encounter preview: `?autostart=1&level=1&finishLevel=1`.

## Kilina's Daughter battle music

The user-provided `The Brooding Collosus.mp3` is preserved without conversion at `public/audio/music/killinas-daughter-the-brooding-collosus.mp3`. Level 2 switches to it only when Kilina's Daughter's arena engages, using the same loop, volume, pause and encounter-exit behavior as Dark Dragon. `BOSS_MUSIC` in App maps each stage to its encounter ID and track. Direct encounter preview: `?autostart=1&level=2&finishLevel=1`.

## Cinder Colossus battle music and Starbreak level music

User-provided `Heart of the Furnace.mp3` is preserved at `public/audio/music/cinder-colossus-heart-of-the-furnace.mp3`. Level 3 selects it only during the Cinder Colossus encounter (internal ID `ink_behemoth`), with the same arena engagement/exit music behavior as the first two bosses. Direct preview: `?autostart=1&level=3&finishLevel=1`.

User-provided `StarBreak Overdrive.mp3` is preserved at `public/audio/music/starbreak-overdrive.mp3` and assigned as Level 5's normal music throughout the flight. Direct preview: `?autostart=1&level=5`. Both original MP3s are copied without conversion and use the existing looping player, music volume, mute and pause/resume controls.

## Player controls

- Start screen → Options, or pause during gameplay → Sound.
- Music and Effects have independent sliders; Mute all audio silences both.
- Test effects previews a punch impact, including while paused. It is disabled when muted or Effects is zero.
- Settings persist in local storage when the browser permits it. Defaults: Music 42%, Effects 65%, unmuted.
- Browsers require a click, tap, or key press to unlock audio. An autostart preview can stay silent until the first input.
- The short landscape pause layout fits sliders and Resume together. The longer equipment explanation remains in the taller layout.

## Events

`audio/soundBank.ts` defines 23 event families with 39 WAV clips (986,066 bytes total), relative volume, priority and retrigger limits.

| Action | Sound behavior |
| --- | --- |
| Punch / sword | Swing on accepted attack; separate impact on confirmed damage. A miss has no impact sound. |
| Gun / elemental power | Short blaster pulse, icy chime, ember rush, or storm crack on successful use. |
| Movement | Jump, stomp impact and spring launch; failed inputs do not play a launch cue. |
| Damage / defeat | Separate player hurt, enemy hurt/defeat, player death and boss collapse. Invulnerability rejects repeat hurt cues. |
| Pickups | Small collection chime, stronger equipment/companion cue, shield shimmer. |
| Teleportation C | Blink/recall portal and quieter companion assist. Recall uses a lower pitch. |
| Flight | Volley pulse, hull crash, destruction explosion and larger ship death explosion. Effects follow simulation IDs/counters rather than redraws. |

Some cues rotate through several variants with a small pitch variation. The shared Web Audio mixer caps concurrent voices at 12, gives important events priority, rate limits rapid repetitions, and compresses the combined effects signal. Pause stops active effects. Death tails can finish during Game Over; the paused engine stops further gameplay events. Effects volume changes do not recreate the game scene or restart music.

## Rebuild and preview

```powershell
python scripts/generate_sfx_v1.py
python scripts/build_sfx_preview_v1.py
```

The first script uses only Python's standard library to layer tones, chirps, filtered noise and envelopes. Output: 44.1 kHz mono 16-bit PCM files plus manifest in `public/audio/sfx-v1/`. The second builds a short listening reel in `art/audio-v1/sound-preview.wav`; its order is in `preview-order.json`. These are synthesized arcade/cartoon effects, not recorded human vocalizations. The mix/style should be tuned from user listening feedback.

## Verification and limits

`scripts/test_audio_v1.mjs` checks the 39 WAV headers/peaks/energy/end silence, real browser gesture unlock and complete decoding, nonzero signal from the actual audio graph, accepted gun shots, sword misses versus connected hits, punches and player damage, one death cue per life and final-life tail, elemental powers, actual blink, paused preview/settings persistence/mute, phone controls/resume, ship crash/death/retry, cooldown suppression and the voice ceiling. Debug audio counts are available only with `capture=1` or `devTools=1` through `window.__unknownGameAudio`.

Evidence is under `output/audio-v1/`. The existing powerup regression and established production gameplay captures check surrounding behavior. Automated signal checks do not judge subjective timbre or replace listening on real speakers/headphones, and this pass is not a full manual campaign clear. The repository-wide TypeScript check retains previous legacy/platformer diagnostics; the new audio modules, sound controls and App/flight edits have no diagnostics. Production build passes.

Stop at this milestone for user feedback on loudness, repetition, impact strength and the balance against music.
