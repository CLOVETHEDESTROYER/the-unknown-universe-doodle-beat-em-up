# Generated flight weapon pickups

Generated with the built-in image-generation tool in three separate calls, with native transparent backgrounds. Style reference: `public/flight/starbreak-ship-armed-v2.png`. This is the game's existing ship, used only for its pencil/ink texture, palette, and outline treatment.

Source originals saved here:

- `spread-generated.png` — generated output `exec-394e68e8-702c-430b-bf50-7fd704d63b2e.png`.
- `lance-generated.png` — generated output `exec-828e8b60-78f9-44dc-9972-29e209b9b6e1.png`.
- `homing-generated.png` — generated output `exec-f9a69948-2950-4ea8-8d68-c9b6886cd509.png`.

The tool's originals remain in `C:/Users/analo/.codex/generated_images/01a0caad-9736-7522-ab57-30b47ac85363/`. Project originals above are independent copies. `scripts/pack_flight_weapon_icons_v5.py` trims transparent padding and fits each icon inside a256px cell without redrawing or removing its native alpha. Shipped icons and a review atlas are in `public/flight/weapons-v5/`.

## Exact prompt set

Each call used this exact prompt, substituting the description below for `{description}`:

```text
Use case: stylized-concept. Asset type: one collectible spaceship weapon upgrade icon for a hand-drawn side scrolling space shooter. The attached spaceship is STYLE REFERENCE ONLY. Draw a single {description}. Match the reference's expressive black pencil/ink outlines, textured colored-pencil shading, off-white paper-like highlights, playful handmade science fiction design. Compact clear silhouette legible at 48 pixels. Front/three-quarter view, symmetrical centered composition with generous transparent margin. Entire object visible, no clipped parts. One single isolated pickup, no spacecraft, no scene, no labels, letters or text, no grids, no cast shadow, no watermark. Transparent background with true alpha. NOT glossy 3D, not pixel art. Production game item art.
```

Descriptions:

- Spread: `orange amber core with three short divergent blaster barrel nozzles in a fan, chunky rounded metal collectible`
- Lance: `magenta violet plasma crystal in a silver focusing coil, elongated sharp diamond silhouette`
- Homing: `cyan teal core holding two tiny tracking rockets with white bodies and orange rocket exhaust, distinct paired missile silhouette`

Tool arguments: `transparent_background: true`, `referenced_image_paths` containing the ship reference above; no CLI/API fallback. Inspected the normalized atlas and all three icons in the running game on desktop and phone.
