# Character signature specials

All on-foot heroes have their signature from the start, independently of weapon
pickups, unlock rewards and weapon durability. Press **X** on keyboard or **SP**
on the touch controls. Cooldown readiness appears below the stage title. Holding
the button does not repeat the move. Pause stops both animation and cooldown.
The flight stage retains ship controls; character specials return on landing.

| Hero | Special | Behavior | Cooldown |
| --- | --- | --- | --- |
| X God | X Breaker | Forward fiery X hits for 5 and removes hostile projectiles in its lane. | 5.5s |
| Barrett | Bearquake | Grounded double-fist slam hits nearby enemies for 4, launches survivors, and stuns them for 1.1s. Bosses are not launched and stagger at most 0.12s. | 6s |
| Nico | Rocket Vault | Downward blast hits below for 4 and propels Nico upward and forward, with brief recoil protection. | 5s |
| Ezra | Hellfire Pillar | Places a reachable flame column ahead for 2.6s, hitting for 1.5 on 0.42s ticks. It cannot be placed through a solid wall. | 6.5s |
| Teleportation C | Rift Ambush | Finds a safe supported position behind a nearby enemy and hits for 6. Without a safe target, attempts a safe forward blink; a blocked cast spends no cooldown. R still recalls to the departure portal. | 5.5s |
| Z-God | Star Comet | Chains through up to three reachable nearby enemies, retaining her invincibility and one-hit power. Stops at walls and unsafe destinations. | 6s |

Boss guard and recovery rules still apply to normal heroes. Z-God retains her
existing one-hit boss power. Special attacks neither consume nor replace equipped
weapons. Crouch moved into the center of the touch D-pad for X God so SP is always
available without adding another action-button row.

The animation frames include anticipation, impact and recovery. Damage begins
at the impact frame, not when the button is first pressed. Actual hit counts,
cooldown, frame, ricochet count, projectile clears and persistent-zone state are
included in `render_game_to_text().special` for browser validation.

Implementation: `gameplay/signatureSpecials.ts` contains definitions/timing;
`gameplay/signatureSpecialRuntime.ts` owns casts, visuals and combat effects;
the platformer supplies its existing damage, collision and safe-teleport rules.
Scene shutdown, death and level transitions clear the special's visual objects
and lingering damage. Only the selected hero's compact sprite atlas loads.

Artwork sources, exact choreography prompts and the preview sheet are preserved
under `art/signature-specials-v1`. Rebuild runtime atlases with
`python scripts/pack_signature_specials.py`.
