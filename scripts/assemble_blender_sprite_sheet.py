"""Assemble consistently rendered Blender frames into a game-ready sprite sheet."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--frame-size", type=int, default=None)
    args = parser.parse_args()

    source_frames = [
        args.input_dir / f"{args.prefix}-{frame:02d}.png"
        for frame in range(1, args.frames + 1)
    ]
    if missing := [path for path in source_frames if not path.exists()]:
        raise SystemExit(f"Missing source frames: {', '.join(str(path) for path in missing)}")

    frames = [Image.open(path).convert("RGBA") for path in source_frames]
    if args.frame_size is not None:
        target_size = (args.frame_size, args.frame_size)
        frames = [frame.resize(target_size, Image.Resampling.LANCZOS) for frame in frames]
    width, height = frames[0].size
    if any(frame.size != (width, height) for frame in frames):
        raise SystemExit("Every source frame must use the same dimensions.")

    sheet = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, 0))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)

    rows = (len(frames) + args.columns - 1) // args.columns
    preview = Image.new("RGBA", (width * args.columns, height * rows), (32, 36, 44, 255))
    for index, frame in enumerate(frames):
        x = (index % args.columns) * width
        y = (index // args.columns) * height
        preview.alpha_composite(frame, (x, y))
    args.preview.parent.mkdir(parents=True, exist_ok=True)
    preview.save(args.preview)


if __name__ == "__main__":
    main()
