# Signature special animation sources

Generated with the built-in ImageGen tool from the approved in-game sprites.
Each `*-source.png` is an original six-pose transparent animation sheet. Each
`*-reference.png` contains the shipped seed pose on a larger edit canvas.
`prompts.json` records the shared constraints and move choreography.

`python scripts/pack_signature_specials.py --references` rebuilds seed canvases.
`python scripts/pack_signature_specials.py` rebuilds runtime atlases and preview.
Original generated images are preserved. Packing assigns alpha pixels to their
nearest complete pose so effects crossing a grid boundary cannot cut a face or
leak into the next frame. A shared scale and foot anchor keep poses consistent.
Two-pixel transparent gutters protect the trimmed runtime atlas frames.

Runtime atlases are `public/characters/signature-specials-v1/{hero}.json/.png`.
Each has six logical 256px frames on one 780x520 page (1.55 MiB decoded RGBA).
Only the selected hero's page loads. Ezra also loads a 520x520 four-frame pure
flame atlas, generated from his flame artwork with the casting hand removed.
Its original is `ezra-pillar-source.png`.

The row order in `preview.jpg` is X God, Barrett, Nico, Ezra, Teleportation C,
Z-God. The preview is for review and is not loaded by the game.
