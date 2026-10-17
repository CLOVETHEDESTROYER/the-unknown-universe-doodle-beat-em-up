# Ember Boots: drawn jet dash

Space/C or touch A activates 600ms of thrust at 700px/s: about 420px on clear
ground, versus the old 260ms at 620px/s (~161px). This is about 2.6 times the
nominal range. The existing 1050ms cooldown and three damage once per enemy
remain. The dash commits to its starting direction. Jumping and gravity still
work; walls stop the dash, and gaps, hazards, hostile shots and boss armor
retain their ordinary rules. SP cannot overlap a committed jet dash.

Four colored-pencil PNG exhaust frames replace the short procedural line.
Twin white-hot heel jets taper into long orange/red flames with cinders.
Drawn X God also uses four new full-body Ember Boots dash poses; other heroes
keep their existing equipped boot artwork with the shared animated exhaust.
The visual follows the unchanged physics body and adds no attack/collision
area. Leftward dashes mirror the sprite and move its attachment origin so
the exhaust always trails behind the boots. Flames stop on interruption.

Dash duration and its cooldown now advance with the same smoothed simulation
delta as Arcade physics. Pausing or a slow captured frame cannot spend the
thrust duration while the player stands still. Quick touch A/S taps are
buffered for Ember activation, matching the existing jump/SP input approach.
Equipment replacement releases the dash's movement lock immediately; damage,
pit recovery, checkpoint placement and scene shutdown clear its visuals.

`gameplay/emberJets.ts` owns the constants and disposable sprite presentation;
the platformer retains equipment, collision and damage rules. Only ground
stages 3/4/6 load the 1.54 MiB exhaust atlas. Only drawn X God loads the
additional 1.03 MiB pose atlas. Flight and the first two stages load neither.

Built-in ImageGen generated both entire four-frame sheets from the shipped
X God reference and Ember Boots pickup. Sources, exact prompts, alpha-cleaned
packing metadata and preview: `art/ember-jets-v1`. Runtime atlases:
`public/powerups/ember-jets-v1`. Rebuild with:

```powershell
python scripts/pack_ember_jets_v1.py
```

Requires Pillow, NumPy and SciPy. The packer preserves opaque pencil edges,
removes diffuse generated alpha halos, shares scale/anchors across frames,
and writes trimmed Phaser multiatlases.

`scripts/test_ember_jets_v1.mjs` checks measured travel both ways, all frames,
pause/cooldown, fixed collider, damage deduplication, SP exclusion, equipment
replacement, damage interruption, gravity, gap hazards, walls, boss armor,
all six heroes and stage-only loading. Configure `GAME_TEST_URL`,
`GAME_TEST_BROWSER`, `GAME_TEST_DEVICE`, optional `GAME_TEST_EXECUTABLE`.
Evidence: `output/ember-jets-v1`. Browser profiles do not replace physical
phone/tablet playtesting.

Preview: `http://localhost:4380/?autostart=1&level=3&powerupPreview=1`.
Walk into the first boots pickup, then press Space/C or A.
