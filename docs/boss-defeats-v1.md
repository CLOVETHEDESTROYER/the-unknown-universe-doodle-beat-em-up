# Boss counter and defeat pass

Ground-boss openings now last 2.6–2.8 seconds in phase one and 2.2–2.4 seconds
in phase two. Kilina's Daughter uses 2.6/2.2 seconds. Cinder uses 2.8/2.4;
low Dragon fire, Kilina's runes and the Regent's dash use 2.7/2.3; other
ground moves use 2.6/2.2. Pursuer's flight openings last 3.0/2.6 seconds.
The red wash, ATTACK sign, gold ring and countdown still read the same damage
gate. Pursuer's opening hint now includes its actual seconds remaining.
Aim commitment, guarded follow-ups and the full opening before a phase change
remain. Normal damage, health and Z God's intentional one-hit power remain.

All six bosses have four new drawn death poses: recoil, buckle, fall, rest.
The dragon folds its neck onto the floor; the Daughter collapses with her
cannon; Cinder slumps with a dimming furnace; Kilina sinks to her side;
the Regent falls with its crown; Pursuer's hull progressively breaks and
blackens before drifting down. These use dedicated artwork rather than
flattening/fading an attack pose. All poses preserve a shared anatomy scale,
floor/center anchor and original facing. Airborne ground bosses settle onto
their configured arena floor during the first 540ms.

`gameplay/bossPresentation.ts` owns counter timing and the shared 2.35s defeat
clock. The frame changes at 240ms, 540ms and 900ms; the last pose holds until
1900ms, then fades over 450ms. Ground bosses leave physics immediately, clear
warnings/hostile shots and award their existing score once. The arena camera
stays locked and the exit stays closed until the sequence finishes, then the
normal boss rewards and gate release run once. Pursuer similarly blocks
landing until its wreck sequence finishes. Pause freezes both sequences.

Built-in ImageGen produced one full four-pose sheet per boss from its approved
shipped seed. Sources, seeds, edit canvases, exact prompts, scale/atlas metadata
and the contact preview are preserved under `art/boss-deaths-v1`. Rebuild:

```powershell
python scripts/pack_boss_deaths_v1.py
```

Requires Pillow, NumPy and SciPy. The packer finds connected opaque silhouettes
instead of cutting across nominal grid rows, keeps the Regent's separate
crown and nearby wreck pieces, removes generated diffuse alpha halos, and
uses one scale per boss. Four trimmed frames retain logical 640x640 ground
or 640x400 flight canvases. Each stage loads only its own atlas: 0.61–2.15 MiB
decoded RGBA, no oversized power-of-two terrain allocation.

`scripts/test_boss_defeats_v1.mjs` uses real blaster/ship fire through both
phases, checks longer openings and damage-cue agreement, captures every
rendered death frame, checks pause, hostile cleanup, stage-only loading,
single score/reward and exit progression. Debug hooks only position the hero
or collect real supply pickups. Configure `GAME_TEST_URL`, `GAME_TEST_BROWSER`,
`GAME_TEST_DEVICE`, optional `GAME_TEST_EXECUTABLE` and `GAME_TEST_LEVELS`.
Evidence lives in `output/boss-defeats-v1`. Browser profiles do not establish
physical iPhone/iPad performance.
