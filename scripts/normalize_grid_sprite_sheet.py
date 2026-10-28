"""Turn a transparent generation grid into baseline-aligned Phaser frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def clear_checkerboard_background(image: Image.Image) -> Image.Image:
    """Remove only neutral checkerboard pixels connected to a cell edge."""
    pixels = image.load()
    width, height = image.size
    queue: list[tuple[int, int]] = []
    visited: set[tuple[int, int]] = set()

    def is_background(x: int, y: int) -> bool:
        red, green, blue, alpha = pixels[x, y]
        return alpha > 0 and min(red, green, blue) >= 205 and max(red, green, blue) - min(red, green, blue) <= 14

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.pop()
        if (x, y) in visited or not (0 <= x < width and 0 <= y < height) or not is_background(x, y):
            continue
        visited.add((x, y))
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    return image


def clear_small_islands(image: Image.Image, minimum_area: int) -> Image.Image:
    """Drop isolated neighbor-cell fragments while retaining the main sprite pieces."""
    pixels = image.load()
    width, height = image.size
    visited: set[tuple[int, int]] = set()
    for start_y in range(height):
        for start_x in range(width):
            if (start_x, start_y) in visited or pixels[start_x, start_y][3] == 0:
                continue
            component: list[tuple[int, int]] = []
            queue = [(start_x, start_y)]
            visited.add((start_x, start_y))
            while queue:
                x, y = queue.pop()
                component.append((x, y))
                for neighbor_x in range(x - 1, x + 2):
                    for neighbor_y in range(y - 1, y + 2):
                        if not (0 <= neighbor_x < width and 0 <= neighbor_y < height):
                            continue
                        if (neighbor_x, neighbor_y) in visited or pixels[neighbor_x, neighbor_y][3] == 0:
                            continue
                        visited.add((neighbor_x, neighbor_y))
                        queue.append((neighbor_x, neighbor_y))
            if len(component) < minimum_area:
                for x, y in component:
                    red, green, blue, _ = pixels[x, y]
                    pixels[x, y] = (red, green, blue, 0)
    return image


def retain_largest_island(image: Image.Image) -> Image.Image:
    """Keep the character pose while removing effects that crossed into a neighbor cell."""
    pixels = image.load()
    width, height = image.size
    visited: set[tuple[int, int]] = set()
    islands: list[list[tuple[int, int]]] = []
    for start_y in range(height):
        for start_x in range(width):
            if (start_x, start_y) in visited or pixels[start_x, start_y][3] == 0:
                continue
            island: list[tuple[int, int]] = []
            queue = [(start_x, start_y)]
            visited.add((start_x, start_y))
            while queue:
                x, y = queue.pop()
                island.append((x, y))
                for neighbor_x in range(x - 1, x + 2):
                    for neighbor_y in range(y - 1, y + 2):
                        if not (0 <= neighbor_x < width and 0 <= neighbor_y < height):
                            continue
                        if (neighbor_x, neighbor_y) in visited or pixels[neighbor_x, neighbor_y][3] == 0:
                            continue
                        visited.add((neighbor_x, neighbor_y))
                        queue.append((neighbor_x, neighbor_y))
            islands.append(island)
    if not islands:
        return image
    keep = set(max(islands, key=len))
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] and (x, y) not in keep:
                red, green, blue, _ = pixels[x, y]
                pixels[x, y] = (red, green, blue, 0)
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--frame-size", type=int, default=512)
    parser.add_argument("--max-art-width", type=int, default=448)
    parser.add_argument("--max-art-height", type=int, default=462)
    parser.add_argument("--bottom-padding", type=int, default=26)
    parser.add_argument("--remove-checkerboard", action="store_true")
    parser.add_argument("--minimum-island-area", type=int, default=0)
    parser.add_argument("--largest-island-only", action="store_true")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    frames: list[Image.Image] = []
    for row in range(args.rows):
        for column in range(args.columns):
            left = round(column * source.width / args.columns)
            right = round((column + 1) * source.width / args.columns)
            top = round(row * source.height / args.rows)
            bottom = round((row + 1) * source.height / args.rows)
            cell = source.crop((left, top, right, bottom))
            if args.remove_checkerboard:
                cell = clear_checkerboard_background(cell)
            if args.largest_island_only:
                cell = retain_largest_island(cell)
            bounds = alpha_bounds(cell)
            if not bounds:
                raise SystemExit(f"Grid cell {row},{column} does not contain visible artwork.")
            art = cell.crop(bounds)
            scale = min(args.max_art_width / art.width, args.max_art_height / art.height, 1)
            size = (max(1, round(art.width * scale)), max(1, round(art.height * scale)))
            art = art.resize(size, Image.Resampling.LANCZOS)
            if args.minimum_island_area:
                art = clear_small_islands(art, args.minimum_island_area)
            frame = Image.new("RGBA", (args.frame_size, args.frame_size), (0, 0, 0, 0))
            x = (args.frame_size - art.width) // 2
            y = args.frame_size - args.bottom_padding - art.height
            frame.alpha_composite(art, (x, y))
            frames.append(frame)

    sheet = Image.new("RGBA", (args.frame_size * len(frames), args.frame_size), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * args.frame_size, 0))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)

    preview = Image.new("RGBA", (args.frame_size * args.columns, args.frame_size * args.rows), (31, 36, 45, 255))
    for index, frame in enumerate(frames):
        x = (index % args.columns) * args.frame_size
        y = (index // args.columns) * args.frame_size
        preview.alpha_composite(frame, (x, y))
    args.preview.parent.mkdir(parents=True, exist_ok=True)
    preview.save(args.preview)


if __name__ == "__main__":
    main()
