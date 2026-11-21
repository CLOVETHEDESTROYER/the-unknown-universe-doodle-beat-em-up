# Ground gun upgrade icons

Audit target: main commit `52f386d`.

The three ground gun pickup textures `gun_upgrade_rapid`, `gun_upgrade_fan`, and `gun_upgrade_homing` are procedural Phaser Graphics placeholders, not SVG files. They are created by `makeGunUpgradeTextures` in `gameplay/gunUpgradeRuntime.ts` and displayed at 58 x 58 by `addGunStation` in `components/PlatformerGameEngine.tsx`.

Replacement PNGs: `rapid.png`, `fan.png`, `homing.png`. Existing hand-drawn equipment and flight pickups are intentionally not replaced. Flight Spread Shot, Plasma Lance, and Homing Missiles already load PNGs from `public/flight/weapons-v5/`.

Legacy engine SVG pickups still referenced: `doodles/sword_pickup.svg`, `doodles/doghost_orb.svg`, `doodles/gravity_core.svg`, and emergency `doodles/fallback_powerup.svg`. These are not the active ground gun upgrade icons.

Generated using the built-in image tool, one standalone transparent icon per upgrade. Shared prompt direction: bold imperfect black ink outlines, vivid colored-pencil/crayon hatching, notebook doodle style, centered square canvas, 18 percent clear padding, recognizable at 58px, no text or tile backgrounds. Rapid Fire uses three parallel gold projectiles; Fan Shots uses five spreading orange projectiles; Heat Seekers uses a cyan rocket curling around a red reticle.

These are non-destructive generated assets. Load the PNGs under the existing `gun_upgrade_*` texture keys during preload when integrating with main. The existing runtime texture helper skips already-loaded keys, preserving the original drawings as a failure fallback. No gameplay balance or collision changes are needed.
