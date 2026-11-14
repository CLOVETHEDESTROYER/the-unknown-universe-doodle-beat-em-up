# Alley blaster-arm celebration

Generated using the built-in image tool from shipped flat-sprite references: X-God's `kai-arm-v1/arm.png` and Killer Kai's `reactions-0.webp`. No retired Blender assets are used. Prompts and original transparent source grids are retained here.

Each source has eight poses in a four-column/two-row grid. The existing normalizer with its new opt-in `--shared-scale` flag packs eight horizontal 512px cells with 26px bottom padding, maximum 420px art width and 400px height. Relative pose sizes are preserved instead of stretching each raised-arm pose to the same total height. Runtime sheets: `public/characters/alley-dance-v1/{xgod,kai}.png`. Playback: eight frames per second for 15 active scene seconds.

Flow: approach -> transfer -> rise -> thanks -> equip gift -> dance (movement/fire locked) -> persist rescue/unlock -> walk right to continue. Save/quit is always available. Quitting before the dance completes preserves the incomplete interlude; it replays on continue. Completed saves may continue without replaying. Interacting with Kai again deliberately replays the sequence.

Audio: the original party track is now stored at `public/audio/music/alley-blaster-party.mp3`, restored at the user's request after the earlier Git-ignored local-only path was missing from deployed builds. The runtime no longer depends on `public/audio/alley-disco-local.mp3`. See `public/audio/music/USER_TRACKS.md` for provenance and the unverified licensing status. Missing/blocked audio shows a notice and never blocks completion.

The parent stops other music in this scene. The track starts when the arm is equipped, continues after the 15-second dance and across alley rooms, and loops until leaving the level. Replaying the rescue does not rewind it. It respects global music volume/mute, pauses in a hidden tab and resumes at the same position, offers a playback retry button on autoplay rejection, and stops on level unmount so the next scene's music can take over. Slow translucent color sweeps replace strobing; reduced motion freezes the lighting sweeps. Existing dance sprites continue their pose animation.

Verification: `npm run build`; `node scripts/test_alley_dance_v1.mjs`. The test enters real doors, completes the arm sequence, verifies both sprite sheets and audio, confirms locked movement/fire, waits through the celebration, checks phone/reduced-motion layout, then exits right. Existing campaign helpers now use state-based door traversal instead of fixed timing.

## Sword revival sound cues

`audio/alleyRescueAudio.ts` synchronizes eight one-shot cues to the existing phase clock: sword channel at transfer start, fire-link energy at 0.22s, ascending charge pulses at 0.8/1.6/2.5s, energy release at 3.1s, a revival spark when Kai begins rising, and a power-up chime at 1.5s as he stands. These reuse the shipped sound bank with tailored volume/pitch and do not download or synthesize additional audio.

Alley Rescue is now an effects-enabled app phase. Global mute/effects volume still apply, non-game menus remain effects-paused, and sounds stop on leaving or hiding the scene. The cue scheduler is animation-time based, deduplicates frames and resets for deliberate rescue replays. The dance song remains independent and continuous until level exit.

`node scripts/test_alley_rescue_audio_v1.mjs` checks cue timing/deduplication/replay, actual sound-bank playback in the scene, a muted run, and exit voice cleanup.
