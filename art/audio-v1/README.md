# Original sound effects v1

Source: `scripts/generate_sfx_v1.py`, original procedural synthesis using Python's standard library. No sample packs, third-party recordings, voice actors, or remote generation service. Recipes combine chirped oscillators, filtered seeded noise and smooth envelopes. Master WAVs ship directly in `public/audio/sfx-v1/` with their manifest. Runtime event definitions are in `audio/soundBank.ts`.

Regenerate with `python scripts/generate_sfx_v1.py`. Rebuild the 8-second example reel with `python scripts/build_sfx_preview_v1.py`.

`sound-preview.wav` is a quieter sequence for auditioning punch/sword, damage/defeat, teleport/pickup, gun/crash/explosion and player death. `preview-order.json` gives exact cue order. In-game mixing uses separate music/effects volume, priority, retrigger limits and a compressor; this concatenated reel is not a recording of gameplay.

See `docs/audio-v1.md` for integration, controls and verification.
