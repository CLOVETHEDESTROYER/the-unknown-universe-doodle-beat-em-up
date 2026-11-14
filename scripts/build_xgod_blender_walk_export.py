#!/usr/bin/env python3
"""Assemble the transparent Blender X-God walk frames into game-ready exports."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RENDER_DIR = ROOT / "art" / "xgod-rig-v2" / "blender" / "renders" / "walk-v3"
SHEET_PATH = RENDER_DIR / "xgod-walk-blender-v3-sheet.png"
GIF_PATH = RENDER_DIR / "xgod-walk-blender-v3.gif"
CONTACT_PATH = RENDER_DIR / "xgod-walk-blender-v3-contact-sheet.png"
GAME_PATH = ROOT / "public" / "player_walk_blender_v3.png"
FRAME_SIZE = (1024, 1024)
GAME_FRAME_SIZE = (512, 512)


def frame_path(frame: int) -> Path:
    return RENDER_DIR / f"xgod-walk-{frame:04d}.png"


def main() -> None:
    frames = [Image.open(frame_path(frame)).convert("RGBA") for frame in range(1, 17)]
    if any(image.size != FRAME_SIZE for image in frames):
        sizes = sorted({image.size for image in frames})
        raise SystemExit(f"Unexpected Blender frame sizes: {sizes}")

    sheet = Image.new("RGBA", (FRAME_SIZE[0] * len(frames), FRAME_SIZE[1]), (0, 0, 0, 0))
    for index, image in enumerate(frames):
        sheet.alpha_composite(image, (FRAME_SIZE[0] * index, 0))
    sheet.save(SHEET_PATH)
    frames[0].save(GIF_PATH, save_all=True, append_images=frames[1:], duration=1000 // 24, loop=0, disposal=2)

    contact = Image.new("RGBA", (FRAME_SIZE[0] * 4, FRAME_SIZE[1] * 4), (0, 0, 0, 0))
    for index, image in enumerate(frames):
        contact.alpha_composite(image, ((index % 4) * FRAME_SIZE[0], (index // 4) * FRAME_SIZE[1]))
    contact.save(CONTACT_PATH)

    game_sheet = Image.new("RGBA", (GAME_FRAME_SIZE[0] * len(frames), GAME_FRAME_SIZE[1]), (0, 0, 0, 0))
    for index, image in enumerate(frames):
        resized = image.resize(GAME_FRAME_SIZE, Image.Resampling.LANCZOS)
        game_sheet.alpha_composite(resized, (GAME_FRAME_SIZE[0] * index, 0))
    game_sheet.save(GAME_PATH)
    print(f"Built {SHEET_PATH.name}, {GIF_PATH.name}, and {GAME_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
