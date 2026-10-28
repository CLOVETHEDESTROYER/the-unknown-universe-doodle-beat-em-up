# After The Scratch — first level ending

Four new static illustrations generated with the **built-in ImageGen tool**,
using the approved cutscene look and the actual X God, Flame Sword, Dark Dragon
and Barrett references. Text stays in an editable manifest.

[Open the local Level 1 ending](http://127.0.0.1:4380/cutscenes/prologue-v1/preview.html?chapter=level1).
Next/Back, image taps, arrow keys, Enter/Space and Replay use the existing
preview player. The opening previews retain their original routes.

| Screen | Archived source | Preview asset | Speaker |
| --- | --- | --- | --- |
| Flame Sword reward | [l1-01-flame-sword-source.png](l1-01-flame-sword-source.png) | [l1-01-flame-sword.png](../../../public/cutscenes/level1-v1/l1-01-flame-sword.png) | X God |
| Meteor-mark recognition | [l1-02-the-mark-source.png](l1-02-the-mark-source.png) | [l1-02-the-mark.png](../../../public/cutscenes/level1-v1/l1-02-the-mark.png) | X God |
| Schoolmate reunion | [l1-03-schoolmate-source.png](l1-03-schoolmate-source.png) | [l1-03-schoolmate.png](../../../public/cutscenes/level1-v1/l1-03-schoolmate.png) | Barrett |
| Graveyard departure | [l1-04-graveyard-road-source.png](l1-04-graveyard-road-source.png) | [l1-04-graveyard-road.png](../../../public/cutscenes/level1-v1/l1-04-graveyard-road.png) | X God |

[scenes.json](../../../public/cutscenes/level1-v1/scenes.json) is the authoritative
caption/speaker manifest. Full prompts and inputs are in [prompts.json](prompts.json);
ImageGen output paths and workspace destinations are in
[generation-record.json](generation-record.json). All generated originals
remain in place; established art is not overwritten.

## Story continuity

- Barrett and X are **schoolmates from Earthior** recognizing one another after
  both survived transportation. The friendly fist bump and familiar greeting
  replace the earlier proposed stranger/native-protector introduction.
- Barrett shares a shipment he observed after arriving. He does not suddenly
  possess a native guide's lifelong knowledge of the universe.
- The meteor emblem is a broken gold-circle band on a freight seal, referenced
  directly from the approved impact illustration. The actual sword's design
  is preserved rather than adding a new story emblem to its guard.
- X gains the sword only after Dark Dragon's actual defeat. Its resting green
  head/neck remains recognizable and non-gory; no new wings/body are added.
- Parents' fate is not resolved. A possible eventual rescue on a dark planet
  remains an unconfirmed future direction, not a scene in this ending.
- Clean X/Barrett compositions work without optional creature pickups. Local
  helpers' voluntary kindness is retained in the story bible and their own
  introductions. Teleportation C remains a schoolmate who is also an ally,
  not a separate native character.

See [creator canon](../../../docs/story/creator-canon.md) and the
[production map](../../../docs/story/production-map-v1.md). Together with the
six-image opening, this covers ten of the 32 planned core story beats.

## Review and verification

Run with `GAME_TEST_STORY_CHAPTER=level1`:

```powershell
$env:GAME_TEST_STORY_CHAPTER='level1'
node scripts/test_cutscene_art_v1.mjs
```

The test checks all four assets, changing speaker labels, captions, thumb-size
controls, keyboard/touch navigation, portrait composition, Replay, rapid
navigation and loading only the current art on startup. Browser engine,
executable and server overrides are the same as the prologue tests.

The separate art preview remains available. This chapter is now connected to
the actual first boss/exit and the Graveyard entry, with WebP delivery copies,
Skip and preserved run state. Alternate heroes view the explicitly labeled
X God's story; the clean artwork works with optional pickups absent. See
[campaign integration](../../../docs/story/campaign-cutscenes-v1.md).
