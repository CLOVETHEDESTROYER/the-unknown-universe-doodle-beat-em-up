"""Render the 16-frame X-God rig v2 walk as transparent PNGs in Blender."""

from __future__ import annotations

from pathlib import Path

import bpy


OUTPUT_DIR = Path(__file__).resolve().parents[1] / "blender" / "renders" / "walk-v3"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    for frame in range(1, 17):
        scene.frame_set(frame)
        scene.render.filepath = str(OUTPUT_DIR / f"xgod-walk-{frame:04d}.png")
        bpy.ops.render.render(write_still=True)
    print(f"Rendered 16 X-God rig v2 walk frames to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
