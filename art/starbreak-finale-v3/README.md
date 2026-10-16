# Starbreak finale generation record

All four illustrations were generated with the built-in `image_gen` tool. The ascent/orbit panoramas are opaque; cloud and boss generations requested true transparent backgrounds. Original RGBA alpha is preserved. The existing interceptor was inspected and supplied as the boss's style reference.

| Source tool filename | Project asset |
| --- | --- |
| `exec-c91e8fb7-212c-4651-b9e5-da7648c10ae3.png` | `public/flight/ascent-panorama-v3.png` |
| `exec-111f399e-d066-463e-b6e8-7067e6d9474a.png` | `public/flight/orbit-panorama-v3.png` |
| `exec-c1303029-7326-4a76-9882-551bf8060560.png` | `public/flight/cloud-parallax-v3.png` |
| `exec-3967f385-c174-4ab7-8885-8610c15b67f0.png` | `art/starbreak-finale-v3/pursuer-poses-generated.png` |

Source tool outputs live in `$CODEX_HOME/generated_images/01a0caad-9736-7522-ab57-30b47ac85363/`. All sources are 2172×724. `python scripts/pack_starbreak_pursuer_v3.py` detects the three separated alpha silhouettes and uses one .6391 scale and shared hull baseline to pack `public/flight/void-pursuer-v3.png` (three 640×400 frames). It preserves transparent edges and does not repaint the artwork. Metadata is in `pursuer-metadata.json`; preview in `output/starbreak-finale-v3/pursuer-review.jpg`.

## Ascent prompt

Generate a very wide 3:1 background panorama for an existing colored-pencil and hand-inked side-scrolling spaceship game. This is STARBREAK RUN atmospheric ascent above a lavender enchanted woodland world. Match a warm hand-drawn storybook action platformer: visible pencil grain, fine ink outlines, layered colored-pencil shading, no glossy 3D or photorealism. Vast open lavender and dusty rose sky fading to indigo at the top, long distant soft cloud banks toward the lower fifth, bright sunlit pale peach cloud tops, tiny far-away violet mountain silhouettes ONLY along the very bottom edge. The middle 65 percent must remain calm open sky with subtle pencil texture and sparse fine wisps, so small spacecraft, red warning lines, and enemies are very readable. No buildings, castles, ground platforms, characters, spacecraft, rocks, text, or UI. Gentle atmospheric depth, sense of great height above the world. Full opaque illustration, clean seamless-feeling continuation at left and right, exact horizontal panoramic composition.

## Orbit prompt

Create a very wide horizontal 3:1 SPACE BACKGROUND panorama for a hand-drawn colored-pencil and ink side-scrolling spaceship game. Match a richly pencil-textured illustrated adventure game, delicate cross-hatching, muted indigo and plum space, soft lilac nebula haze along the OUTER top and bottom edges, sparse tiny warm ivory stars with lots of calm dark open negative space in the middle 65 percent. At upper right show a distant coral-red alien planet with a subtle pale violet atmospheric rim, small enough to occupy only about 20 percent of image height. Tiny distant moons and faint orbital arcs add depth at the edges. The playable middle region must remain uncluttered and moderately contrasted for cyan bolts, red plasma, gray asteroids and small ships. NO castles, buildings, floating islands, ground, platforms, foreground rocks, ships, characters, text or interface. No black opaque wall, no bright full-screen vortex, no glossy 3D or photorealism. Opaque landscape illustration, seamless-feeling left/right starfield continuation.

## Cloud prompt

A very wide horizontal 3:1 TRANSPARENT foreground parallax layer for a hand-drawn colored-pencil spaceship game. Soft pale peach and lilac pencil-shaded wispy clouds, one flowing irregular bank along ONLY the bottom 15 percent of the canvas and a few very thin wisps in the top 8 percent. The entire middle 75 percent must be empty genuinely transparent alpha, with large transparent gaps toward left and right. Delicate crosshatched pencil edges, hand-inked contours only on the densest far outer edges, pastel sky-adventure palette. Clouds fade naturally to transparency, no opaque sky or background, no stars, no planets, no solid rocks, no ships, no characters, no text, no shadows, no scene behind the layer. This is a gentle atmosphere overlay for motion depth, not an obstacle. Clean wide panorama with true transparency preserved.

## Pursuer prompt

Style reference: `public/flight/interceptor-v2.png`.

Use the attached pencil-and-ink enemy fighter only as a STYLE reference. Create an ORIGINAL larger closing boss spacecraft named VOID PURSUER, with THREE animation state frames in one horizontal strip. This is a different command ship, not three copies of the small fighter. Exact same side-view craft in all three frames, facing LEFT: blackened silver armored central hull, deep plum swept bat wings, two left-forward cannon prongs framing a LARGE bright red crystal reactor/eye at its front, gold mechanical fasteners, rear twin engines on the RIGHT. Powerful but compact arrowhead silhouette, no pilot. Match rough colored-pencil shading, black hand-inked contours, silver facets, crimson glow, no glossy 3D. EXACTLY THREE equal-sized cells, one row, very generous transparent gaps between ships and margin all around. Maintain same torso/hull size and position in each cell. LEFT FRAME: intact ready craft with wings level and reactor small glow. MIDDLE FRAME: attack craft with wings flexed slightly back, red reactor bright and cannon mouths lit; small rear engine glow but no projectile beams. RIGHT FRAME: defeated craft, same root orientation and scale, drooping broken wing tips, cracked dark reactor, a few attached hanging armor panels, subdued small ember glow; no giant explosion, no detached debris outside the silhouette. Fully isolated on genuinely transparent alpha, no background, no text, no labels, no ground shadow, no other objects. Full ships must fit in cells with all fins intact.
