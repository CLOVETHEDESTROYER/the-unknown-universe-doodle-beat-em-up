"""Package rendered X-God run frames into a mobile-safe Phaser sprite sheet."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--preview", required=True, type=Path)
    parser.add_argument(
        "--source-indices",
        default="1,3,5,7,9,11,13,15",
        help="One-based rendered frame indices to include in the game cycle.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    indices = [int(value.strip()) for value in args.source_indices.split(",")]
    paths = [args.input_dir / f"xgod-side-scroll-run-{index:04d}.png" for index in indices]
    missing = [path for path in paths if not path.exists()]
    if missing:
        raise SystemExit(f"Missing rendered frames: {', '.join(str(path) for path in missing)}")

    frames = [Image.open(path).convert("RGBA") for path in paths]
    frame_sizes = {frame.size for frame in frames}
    if len(frame_sizes) != 1:
        raise SystemExit(f"Expected consistent frame sizes, found {sorted(frame_sizes)}")

    width, height = frames[0].size
    sheet = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    preview = Image.new("RGBA", (width * 4, height * 2), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, 0))
        preview.alpha_composite(frame, ((index % 4) * width, (index // 4) * height))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.preview.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    preview.save(args.preview)
    print(f"Packed {len(frames)} frames at {width}x{height}: {args.output}")


if __name__ == "__main__":
    main()
