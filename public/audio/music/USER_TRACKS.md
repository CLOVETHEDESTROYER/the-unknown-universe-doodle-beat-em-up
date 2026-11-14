# User-supplied soundtrack

Added November 14, 2026 from the user's supplied MP3 files; originals copied without re-encoding.

- `unknown-universe-intro-new.mp3`: “UnknownUniverseINtronew.mp3”, 162.8 seconds. Replaces the title/character-selection intro music; loops and respects global audio settings. Level and boss music are unchanged.
- `uneasy-pursuit-alleyway.mp3`: “Uneasy Pursuit-Alleyway scene.mp3”, 172 seconds. Loops during the Alley rescue's exploration, dialogue and sword revival. Stops at the gift-to-dance transition; the existing dance track continues until leaving the scene.

Both Alley tracks respect music volume/mute and pause while the tab is hidden. Door transitions do not restart the current track. Leaving the Alley releases both media elements so the next level's soundtrack can play.

`alley-blaster-party.mp3` restores the original party track (68.255 seconds), previously stored only as the Git-ignored `/audio/alley-disco-local.mp3`. On November 14, 2026 the user requested restoring it after its absence from deployed builds. The runtime now uses this regular repository asset: it starts when the arm gift completes, loops after the 15-second dance and stops only on leaving the Alley. The ignored old path remains a local backup and is no longer requested by the game.

Party track source: the previously user-selected “Peppa Pig (Dugzy Trap Remix)” YouTube extraction. Its redistribution/synchronization rights have not been independently verified; including the file in the repository does not establish or grant those rights.
