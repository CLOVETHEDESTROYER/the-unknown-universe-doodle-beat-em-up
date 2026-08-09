from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_COUNT = 8
FRAME_WIDTH = 200
FRAME_HEIGHT = 327
SOURCE_BASELINE = 631
OUTPUT_BASELINE = 319
TARGET_CHARACTER_HEIGHT = 312


def frame_bounds(width: int, frame_index: int) -> tuple[int, int]:
    return round(frame_index * width / FRAME_COUNT), round((frame_index + 1) * width / FRAME_COUNT)


def build_sheet(source_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    alpha = source.getchannel("A")
    bboxes = []
    for frame_index in range(FRAME_COUNT):
        left, right = frame_bounds(source.width, frame_index)
        bbox = alpha.crop((left, 0, right, source.height)).getbbox()
        if bbox is None:
            raise ValueError(f"Frame {frame_index} has no opaque pixels.")
        bboxes.append((left + bbox[0], bbox[1], left + bbox[2], bbox[3]))

    tallest_frame = max(bbox[3] - bbox[1] for bbox in bboxes)
    scale = TARGET_CHARACTER_HEIGHT / tallest_frame
    sheet = Image.new("RGBA", (FRAME_WIDTH * FRAME_COUNT, FRAME_HEIGHT), (0, 0, 0, 0))

    for frame_index, bbox in enumerate(bboxes):
        character = source.crop(bbox)
        resized = character.resize(
            (round(character.width * scale), round(character.height * scale)),
            Image.Resampling.LANCZOS,
        )
        x = frame_index * FRAME_WIDTH + round((FRAME_WIDTH - resized.width) / 2)
        y = round(OUTPUT_BASELINE + (bbox[1] - SOURCE_BASELINE) * scale)
        sheet.alpha_composite(resized, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    print(f"Wrote {output_path} ({sheet.width}x{sheet.height})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert the generated X God walk strip into the Phaser sprite-sheet contract.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build_sheet(args.input, args.output)


if __name__ == "__main__":
    main()
