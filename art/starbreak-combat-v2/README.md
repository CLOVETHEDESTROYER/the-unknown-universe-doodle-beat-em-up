# Generation record

Both images used the built-in `image_gen` tool with `transparent_background: true`. The approved ship was inspected and passed as the explicit edit target; the enemy illustration was a new generation. Generated outputs were copied into the workspace and original RGBA alpha was preserved.

| Output | Source tool file | Project copy |
| --- | --- | --- |
| Armed ship | `exec-6cc253e4-8c1b-4783-97e1-42666134cf71.png` | `public/flight/starbreak-ship-armed-v2.png` |
| Enemy source | `exec-4cd18b48-50ca-42e1-a5e6-46defd0a393f.png` | `art/starbreak-combat-v2/enemies-generated.png` |

The source outputs remain in the session's `$CODEX_HOME/generated_images/01a0caad-9736-7522-ab57-30b47ac85363/` directory. `scripts/pack_starbreak_enemies_v2.py` extracts the three complete separated silhouettes into `public/flight/{scout,interceptor,gunship}-v2.png`. Their widths in the generated illustration differ, so extraction uses alpha gaps rather than assumed equal cell cuts.

## Ship edit prompt

Edit this exact hand-drawn cream, lime-green and orange spaceship sprite. Preserve the identical ship silhouette, view, scale, cockpit position, colors, pencil grain and true transparent background. Add ONE clearly readable short chunky forward-facing twin-barrel laser cannon mounted under the front nose, on the lower-right fuselage. The two closely spaced parallel metal barrels extend horizontally RIGHT; dark circular muzzle holes near the rightmost tip. Cream mounting bracket, steel barrels with lime glowing muzzle rings, bold hand-inked outlines. Place weapon visibly below the orange pointed nose, with muzzles aligned around 96 percent of image width and 64 percent of image height. Keep the entire ship and barrels inside frame; add a little transparent padding if necessary. No beams, no bullets, no muzzle flash, no characters, no other changes. This is the player's armed flight sprite; practical visible guns where projectiles will emerge.

Edit target: `public/flight/starbreak-ship-v1.png`. The generated muzzle locations were inspected; runtime sockets match the actual barrels at roughly 95% across and 72–77% down the image.

## Enemy generation prompt

Production enemy sprite contact sheet for a hand-drawn colored-pencil space side-scroller. EXACTLY THREE separate enemy spacecraft, each facing LEFT in clean side elevation, arranged in THREE evenly spaced columns in ONE horizontal row on genuinely transparent alpha, large clear gutters and 10 percent outer padding, no overlap. All fit entirely inside their own equal cell. Same ink outlines and textured colored pencil shading as an illustrated storybook action game, no glossy 3D. LEFT CELL: small round purple scout drone, single red glass eye at left nose, short batlike swept fins, tiny rear engine on right, silver rivets, nimble compact silhouette. MIDDLE CELL: slender crimson and charcoal interceptor, sharp pointed LEFT nose, long swept-back fins, one yellow eye, engine at RIGHT, clearly longer and more aggressive silhouette than scout. RIGHT CELL: bulky dark plum armored gunship, thick layered silver armor plates, red LEFT cannon muzzle in front, gold reactor panel on lower middle hull, small rear engine on right, heavy oval silhouette distinct from other two. No beams, bullets, flames, pilots, labels, words, borders, background, floor or shadows. Three consistent production sprites only, one of each described type. Keep each around 65 percent of its cell width and vertically centered.
