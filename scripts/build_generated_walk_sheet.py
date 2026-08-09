from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def frame_bounds(width: int, frame_index: int, frames: int) -> tuple[int, int]:
    return round(frame_index * width / frames), round((frame_index + 1) * width / frames)


def build_sheet(
    source_path: Path,
    output_path: Path,
    frames: int,
    frame_width: int,
    frame_height: int,
    character_height: int,
    bottom_padding: int,
) -> None:
    source = Image.open(source_path).convert("RGBA")
    alpha = source.getchannel("A")
    bboxes = []
    for frame_index in range(frames):
        left, right = frame_bounds(source.width, frame_index, frames)
        bbox = alpha.crop((left, 0, right, source.height)).getbbox()
        if bbox is None:
            raise ValueError(f"Frame {frame_index} has no opaque pixels.")
        bboxes.append((left + bbox[0], bbox[1], left + bbox[2], bbox[3]))

    tallest_frame = max(bbox[3] - bbox[1] for bbox in bboxes)
    source_baseline = max(bbox[3] for bbox in bboxes)
    scale = character_height / tallest_frame
    output_baseline = frame_height - bottom_padding
    sheet = Image.new("RGBA", (frame_width * frames, frame_height), (0, 0, 0, 0))

    for frame_index, bbox in enumerate(bboxes):
        character = source.crop(bbox)
        resized = character.resize(
            (round(character.width * scale), round(character.height * scale)),
            Image.Resampling.LANCZOS,
        )
        x = frame_index * frame_width + round((frame_width - resized.width) / 2)
        y = round(output_baseline + (bbox[1] - source_baseline) * scale)
        sheet.alpha_composite(resized, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    print(f"Wrote {output_path} ({sheet.width}x{sheet.height}; {frames} frames)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a chroma-keyed horizontal walk strip into a Phaser spritesheet.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=8)
    parser.add_argument("--frame-width", type=int, required=True)
    parser.add_argument("--frame-height", type=int, required=True)
    parser.add_argument("--character-height", type=int, required=True)
    parser.add_argument("--bottom-padding", type=int, default=8)
    args = parser.parse_args()
    build_sheet(
        args.input,
        args.output,
        args.frames,
        args.frame_width,
        args.frame_height,
        args.character_height,
        args.bottom_padding,
    )


if __name__ == "__main__":
    main()
