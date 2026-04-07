# Custom Asset Spec

This project currently uses doodle stand-in SVGs in [`public/doodles/`](C:/Users/analo/Documents/Playground/the-unknown-universe-doodle-beat-em-up/public/doodles). When you replace them with custom game art, keep the same filenames so the game continues to load them without code changes.

## Format

- Preferred source file: layered master file in your art tool, plus a clean SVG when the art is simple and line-based.
- Preferred in-game export: transparent PNG for characters, weapons, pickups, and textured effects.
- SVG is still fine for flat props, posters, shadows, rings, and simple impact/tell graphics.
- Keep the visual anchor centered unless noted otherwise.
- For standing characters and tall props, keep the feet/base aligned near the bottom of the canvas.

## Characters And Enemies

| File | Use | Current placeholder canvas | Recommended final export |
| --- | --- | --- | --- |
| `p_happy.svg` | fallback player icon | `96x96` | `256x256` PNG |
| `m_devil.svg` | basic melee enemy | `96x96` | `256x256` PNG |
| `m_alien.svg` | alternate enemy silhouette | `96x96` | `256x256` PNG |
| `m_floater.svg` | floater enemy | `96x96` | `256x256` PNG |
| `m_dasher.svg` | dasher enemy | `112x96` | `256x256` PNG |
| `m_giant.svg` | giant enemy | `128x140` | `320x320` PNG |
| `m_boss.svg` | boss enemy | `96x96` | `384x384` PNG |

## Weapons, Power-Ups, And Pickups

| File | Use | Current placeholder canvas | Recommended final export |
| --- | --- | --- | --- |
| `flame_sword.svg` | equipped sword on player | `84x164` | `192x256` PNG |
| `sword_pickup.svg` | dropped sword pickup | `128x164` | `192x256` PNG |
| `ink_shield.svg` | orbiting shield on player | `160x160` | `192x192` PNG |
| `h_heart.svg` | health pickup | `96x96` | `128x128` PNG |
| `soul_orb.svg` | soul pickup | `96x96` | `128x128` PNG |

## Destructibles And Environment Props

| File | Use | Current placeholder canvas | Recommended final export |
| --- | --- | --- | --- |
| `o_trash.svg` | trash can destructible | `96x96` | `192x192` PNG |
| `o_box.svg` | cardboard box destructible | `96x96` | `192x192` PNG |
| `o_books.svg` | book stack destructible | `96x96` | `192x192` PNG |
| `o_vending.svg` | vending machine destructible | `96x96` | `256x256` PNG |
| `d_cone.svg` | traffic cone street dressing | `90x110` | `128x192` PNG |
| `d_lamp.svg` | tall street lamp | `96x230` | `192x384` PNG |
| `d_puddle.svg` | ground puddle | `150x70` | `256x128` PNG or SVG |
| `d_poster.svg` | wall poster | `110x150` | `192x256` PNG or SVG |

## Combat And Feedback Effects

| File | Use | Current placeholder canvas | Recommended final export |
| --- | --- | --- | --- |
| `attack_slash.svg` | player melee arc | `160x96` | `256x128` PNG |
| `slam_wave.svg` | landing slam ring | `200x200` | `256x256` PNG or SVG |
| `impact_vfx.svg` | enemy hit burst | `96x96` | `192x192` PNG |
| `ink_splat.svg` | projectile / splat | `96x96` | `192x192` PNG |
| `scrap.svg` | destructible debris | `96x96` | `128x128` PNG |
| `spawn_burst.svg` | enemy spawn burst | `160x160` | `256x256` PNG |
| `shield_burst.svg` | Ink Shield block burst | `220x220` | `256x256` PNG |
| `shadow_oval.svg` | player ground shadow | `160x60` | `256x96` PNG or SVG |

## Encounter Tells And UI-Adjacent FX

| File | Use | Current placeholder canvas | Recommended final export |
| --- | --- | --- | --- |
| `tell_ring.svg` | generic enemy tell | `200x200` | `256x256` PNG or SVG |
| `dash_tell.svg` | dasher wind-up tell | `180x100` | `256x160` PNG or SVG |
| `giant_quake.svg` | giant slam warning | `220x120` | `320x192` PNG or SVG |
| `boss_warning.svg` | boss intro warning panel | `520x160` | `1024x320` PNG or SVG |

## Practical Export Notes

- Keep line weight bold and readable at gameplay scale; thin strokes disappear quickly.
- Export with transparent backgrounds.
- Avoid anti-aliased soft edges on tiny props if you want the doodle look to stay crisp.
- If you animate later, keep the same overall canvas size per animation set so swapping into sprite sheets is easy.
- If you replace an SVG with a PNG, keep the filename stem the same and update the extension in code only if needed.
