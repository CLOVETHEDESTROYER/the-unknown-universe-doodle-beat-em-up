#!/usr/bin/env python3
"""Build the six-frame, game-ready X-God Blender jump sheet."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RENDER_DIR = ROOT / "art" / "xgod-rig-v2" / "blender" / "renders" / "jump-v1"
GAME_PATH = ROOT / "public" / "player_jump_blender_v1.png"
CONTACT_PATH = RENDER_DIR / "xgod-jump-blender-v1-contact-sheet.png"


def main() -> None:
    frames = [Image.open(RENDER_DIR / f"xgod-jump-{frame:04d}.png").convert("RGBA") for frame in range(1, 7)]
    if any(frame.size != (1024, 1024) for frame in frames):
        raise SystemExit(f"Expected six 1024x1024 Blender frames, got {sorted({frame.size for frame in frames})}")
    sheet = Image.new("RGBA", (512 * 6, 512), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame.resize((512, 512), Image.Resampling.LANCZOS), (index * 512, 0))
    sheet.save(GAME_PATH)

    contact = Image.new("RGBA", (1024 * 3, 1024 * 2), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        contact.alpha_composite(frame, ((index % 3) * 1024, (index // 3) * 1024))
    contact.save(CONTACT_PATH)
    print(f"Built {GAME_PATH.relative_to(ROOT)} and {CONTACT_PATH.name}")


if __name__ == "__main__":
    main()
