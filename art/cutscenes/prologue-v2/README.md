# Opening continuity pass — expanded edition

The creator approved the four-image static-screen look. This follow-up fills
the missing travel and arrival beats, using the approved images as references.

[Open the six-screen local preview](http://127.0.0.1:4380/cutscenes/prologue-v1/preview.html?edition=expanded).
The original URL without `edition=expanded` still shows the four-screen version.

## New artwork

Generated with the **built-in ImageGen tool**, preserving the approved brown-haired,
ordinary-eyed boy, white smile-emblem shirt, orange cargo trousers, sneakers,
black/lime backpack and pencil/ink style. His parents' fate remains unknown.

| New screen | Archived original | Preview asset |
| --- | --- | --- |
| Through the rift | [03-through-the-rift-source.png](03-through-the-rift-source.png) | [03-through-the-rift.png](../../../public/cutscenes/prologue-v2/03-through-the-rift.png) |
| Waking alone | [04-alone-in-the-alley-source.png](04-alone-in-the-alley-source.png) | [04-alone-in-the-alley.png](../../../public/cutscenes/prologue-v2/04-alone-in-the-alley.png) |

Complete prompts and reference roles: [prompts.json](prompts.json).
Original ImageGen paths and workspace destinations: [generation-record.json](generation-record.json).
No source image or previously approved illustration was overwritten.

## Sequence

1. Earthior school life — approved v1 art.
2. Meteor impact — approved v1 art.
3. Pulled through the dimensional tear — new art.
4. Waking alone in the alley — new art; X calls for his parents and sister, with no answer.
5. Dark Dragon's fire — approved v1 art; revised caption avoids repeating the waking beat.
6. Elemental awakening — approved v1 art; revised caption leads into following the Dragon onto the rooftops.

The ordered [expanded scenes.json](../../../public/cutscenes/prologue-v2/scenes.json)
is the caption/source-of-truth manifest. It references the four original image
files directly; no duplicate copies are needed. Captions remain separate from art.
The same preview player supports both editions, including portrait full-image
layout, keyboard/touch navigation and one-image-at-startup loading.

## Coverage and next batch

See the [story production map](../../../docs/story/production-map-v1.md): the
opening now covers six of the 32 planned core storyboard beats. Next comes
the four-beat Dark Dragon ending: sword reward, recognition of the meteor
mark, Barrett's lead, and departure toward the Graveyard. Individual family
fates, ally introductions, optional companions and alternate-hero viewpoints
must remain consistent as later images are made.

Test the expanded edition with:

```powershell
$env:GAME_TEST_STORY_EDITION='expanded'
node scripts/test_cutscene_art_v1.mjs
```

Omit the variable to verify the original four-screen edition. The existing
browser/executable/URL variables select installed Chromium or WebKit and
the local server. `tests/game-cutscene-continuity.actions.json` drives the
standard game smoke client through all six screens.

These PNGs remain source-resolution review assets. The expanded opening now
plays after normal character selection using optimized WebP copies and
Next/Back/Skip controls. A persistent chapter replay menu remains future work.
See [campaign integration](../../../docs/story/campaign-cutscenes-v1.md).
