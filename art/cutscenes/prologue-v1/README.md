# Opening story — first static art pass

Four original illustrations generated with the **built-in ImageGen tool**.
The presentation takes the static-illustration/bottom-caption approach of
classic RPG and arcade fighting-game story screens, while retaining this
game's existing pencil/crayon textures, bold ink and character designs.

Local preview: <http://127.0.0.1:4380/cutscenes/prologue-v1/preview.html>.
Use Next/Back, tap the image, or use arrow keys / Enter / Space. The last
screen offers Replay. `?frame=3` opens the transformation screen directly.

## Delivered images

| Screen | Archived full-resolution source | Preview/game asset |
| --- | --- | --- |
| Earthior before the impact | [01-earthior-source.png](01-earthior-source.png) | [01-earthior.png](../../../public/cutscenes/prologue-v1/01-earthior.png) |
| Meteor and dimensional rupture | [02-impact-source.png](02-impact-source.png) | [02-impact.png](../../../public/cutscenes/prologue-v1/02-impact.png) |
| Dark Dragon's alley attack | [03-alley-fire-source.png](03-alley-fire-source.png) | [03-alley-fire.png](../../../public/cutscenes/prologue-v1/03-alley-fire.png) |
| X God's transformation | [04-transformation-source.png](04-transformation-source.png) | [04-transformation.png](../../../public/cutscenes/prologue-v1/04-transformation.png) |

The saved assets are unmodified 1672×941 PNG outputs. Each generated original
also remains in the ImageGen output directory recorded in
[generation-record.json](generation-record.json).

[prompts.json](prompts.json) contains the complete final prompts and reference
roles for all four requests. Inputs were the current X God selection card,
approved drawn X God seed, shipped Dark Dragon seed and school panorama.
The first generated school image additionally anchors the pre-mutation boy
in the alley image. No external API/CLI fallback was used.

## Captions and presentation

Text is kept separate in [scenes.json](../../../public/cutscenes/prologue-v1/scenes.json).
The preview uses actual HTML text rather than baking dialogue into artwork,
so words can change without redrawing scenes. A navy-black bottom bar, ivory
monospace captions, gold speaker labels and discrete navigation establish
the classic story-screen presentation. There is no auto-advance or typewriter
delay; the reader controls the pace. Portrait phones show the complete wide
illustration above the caption instead of cropping the two-character scene.

This is a condensed four-screen **style preview** based on the prologue in
[the story outline](../../../docs/story/cutscene-beats-v1.md). It is not the
complete planned campaign or a new automatic transition in the main game.
Brown hair and round eyes are the proposed pre-mutation look; the final
image restores X God's established lime hair, X eyes and white/orange outfit.
Parent faces remain outside the frame. Original game assets are unchanged.

Only the current image loads on opening, and additional images load when
requested. Before campaign integration, create optimized delivery variants
and budget preloading rather than adding all full-resolution images to the
game's initial asset queue.

## Verification

- `node scripts/test_cutscene_art_v1.mjs`: all four images, caption bounds,
  44px controls, Next/Back/Replay, keyboard and touch, rapid navigation,
  direct-frame links and initial one-image loading. Chromium and installed
  WebKit pass desktop, iPhone 15 landscape/portrait and iPad landscape.
- The standard game client passes with `tests/game-cutscene-art.actions.json`;
  `render_game_to_text()` reports the actual displayed scene/captions.
- Inspected full desktop frames, phone landscape, portrait composition and
  tablet screenshots. Fixed the initial portrait center crop so X God and
  Dark Dragon both remain visible.
- Production build passes. Browser artifacts are ignored under
  `output/cutscene-art-v1/`.
