from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def frame_bounds(width: int, frame_index: int, frames: int) -> tuple[int, int]:
    return round(frame_index * width / frames), round((frame_index + 1) * width / frames)


def remove_small_alpha_components(image: Image.Image, minimum_pixels: int) -> Image.Image:
    if minimum_pixels <= 0:
        return image

    alpha = image.getchannel("A")
    pixels = alpha.load()
    width, height = alpha.size
    visited: set[tuple[int, int]] = set()

    for y in range(height):
        for x in range(width):
            if (x, y) in visited or pixels[x, y] < 40:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            visited.add((x, y))
            while queue:
                current_x, current_y = queue.popleft()
                component.append((current_x, current_y))
                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if (
                        0 <= next_x < width
                        and 0 <= next_y < height
                        and (next_x, next_y) not in visited
                        and pixels[next_x, next_y] >= 40
                    ):
                        visited.add((next_x, next_y))
                        queue.append((next_x, next_y))
            if len(component) < minimum_pixels:
                for component_x, component_y in component:
                    pixels[component_x, component_y] = 0

    image.putalpha(alpha)
    return image


def build_sheet(
    source_path: Path,
    output_path: Path,
    frames: int,
    frame_width: int,
    frame_height: int,
    character_height: int,
    bottom_padding: int,
    align_bottoms: bool,
    min_component_pixels: int,
) -> None:
    source = Image.open(source_path).convert("RGBA")
    bboxes = []
    source_frames = []
    for frame_index in range(frames):
        left, right = frame_bounds(source.width, frame_index, frames)
        frame = remove_small_alpha_components(
            source.crop((left, 0, right, source.height)),
            min_component_pixels,
        )
        bbox = frame.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Frame {frame_index} has no opaque pixels.")
        source_frames.append(frame)
        bboxes.append(bbox)

    tallest_frame = max(bbox[3] - bbox[1] for bbox in bboxes)
    source_baseline = max(bbox[3] for bbox in bboxes)
    scale = character_height / tallest_frame
    output_baseline = frame_height - bottom_padding
    sheet = Image.new("RGBA", (frame_width * frames, frame_height), (0, 0, 0, 0))

    for frame_index, bbox in enumerate(bboxes):
        character = source_frames[frame_index].crop(bbox)
        resized = character.resize(
            (round(character.width * scale), round(character.height * scale)),
            Image.Resampling.LANCZOS,
        )
        x = frame_index * frame_width + round((frame_width - resized.width) / 2)
        y = round(output_baseline - resized.height) if align_bottoms else round(
            output_baseline + (bbox[1] - source_baseline) * scale
        )
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
    parser.add_argument("--align-bottoms", action="store_true")
    parser.add_argument("--min-component-pixels", type=int, default=0)
    args = parser.parse_args()
    build_sheet(
        args.input,
        args.output,
        args.frames,
        args.frame_width,
        args.frame_height,
        args.character_height,
        args.bottom_padding,
        args.align_bottoms,
        args.min_component_pixels,
    )


if __name__ == "__main__":
    main()
