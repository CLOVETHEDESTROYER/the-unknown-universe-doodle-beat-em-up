# After the Graveyard — A World on a Page

Four original story illustrations created with **built-in ImageGen**. The
complete [prompt set](prompts.json) records character/style/location references;
[generation-record.json](generation-record.json) records the original output
paths and workspace copies. Generated originals remain preserved.

| Beat | Archived source | Preview artwork |
| --- | --- | --- |
| Opening the registry | [l2-01-the-registry-source.png](l2-01-the-registry-source.png) | [PNG](../../../public/cutscenes/level2-v1/l2-01-the-registry.png) |
| Earthior's extraction entry | [l2-02-earthior-source.png](l2-02-earthior-source.png) | [PNG](../../../public/cutscenes/level2-v1/l2-02-earthior.png) |
| Schoolmate Nico on the radio | [l2-03-a-familiar-voice-source.png](l2-03-a-familiar-voice-source.png) | [PNG](../../../public/cutscenes/level2-v1/l2-03-a-familiar-voice.png) |
| Toward the Furnace | [l2-04-toward-the-furnace-source.png](l2-04-toward-the-furnace-source.png) | [PNG](../../../public/cutscenes/level2-v1/l2-04-toward-the-furnace.png) |

The editable [manifest](../../../public/cutscenes/level2-v1/scenes.json) supplies
speakers/captions independently of art. Only the ledger's EARTHIOR heading is
part of an illustration. The registry records planets and resources, not the
individual fates of their inhabitants. Parents remain unresolved.

X and Barrett retain their established schoolmate designs. Nico's recognizable
voice comes through Barrett's radio; this does not invent a native history or
place a duplicate Nico in the shot. The physical shipment tag works with or
without Doghost recruited. No creature ability or equipment reward is silently
granted by the story. The boss remains defeated; no post-death speech or return.

## In the game

Start at [the game](http://127.0.0.1:4380/) and choose a hero to see the opening.
The first ending plays after Dark Dragon and the Level 1 exit. This new sequence
plays after Kilina's Daughter and the Level 2 exit, then Continue enters the
Furnace. The header identifies these scenes as X God's story even when another
schoolmate is selected for gameplay.

[Isolated artwork preview](http://127.0.0.1:4380/cutscenes/prologue-v1/preview.html?chapter=level2)
also remains available. Campaign integration and tests are described in the
[runtime notes](../../../docs/story/campaign-cutscenes-v1.md).

All 14 integrated screens use 1440px WebP delivery copies beside the review
PNGs. Run `node scripts/prepare_cutscene_delivery.mjs` to recreate them without
changing the source illustrations. Complete set: 6,493,478 bytes versus
49,916,352 PNG bytes, approximately 87% smaller. Only the current image is
requested; the Phaser renderer is released during the story.
