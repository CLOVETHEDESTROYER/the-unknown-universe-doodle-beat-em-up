"""Normalize a chroma-keyed horizontal sprite strip into Phaser-sized frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--frames", required=True, type=int)
    parser.add_argument("--input-frames", type=int)
    parser.add_argument("--source-indices")
    parser.add_argument("--frame-width", required=True, type=int)
    parser.add_argument("--frame-height", required=True, type=int)
    parser.add_argument("--sprite-height", type=int)
    parser.add_argument("--max-sprite-width", type=int)
    parser.add_argument("--baseline", type=int)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = Image.open(args.input).convert("RGBA")
    sprite_height = args.sprite_height or args.frame_height - 22
    baseline = args.baseline or args.frame_height - 10
    output = Image.new("RGBA", (args.frame_width * args.frames, args.frame_height))
    input_frames = args.input_frames or args.frames
    source_indices = (
        [int(index.strip()) for index in args.source_indices.split(",")]
        if args.source_indices
        else list(range(args.frames))
    )
    if len(source_indices) != args.frames:
        raise ValueError("--source-indices must contain exactly --frames entries")

    for index, source_index in enumerate(source_indices):
        left = round(source_index * source.width / input_frames)
        right = round((source_index + 1) * source.width / input_frames)
        cell = source.crop((left, 0, right, source.height))
        bounds = cell.getchannel("A").getbbox()
        if not bounds:
            continue

        sprite = cell.crop(bounds)
        scale = sprite_height / sprite.height
        if args.max_sprite_width:
            scale = min(scale, args.max_sprite_width / sprite.width)
        width = max(1, round(sprite.width * scale))
        height = max(1, round(sprite.height * scale))
        sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
        x = index * args.frame_width + (args.frame_width - width) // 2
        y = baseline - sprite.height
        output.alpha_composite(sprite, (x, y))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.output)


if __name__ == "__main__":
    main()
