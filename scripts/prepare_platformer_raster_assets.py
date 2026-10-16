"""Make platformer sprite strips transparent and create the raster melee flash."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SPRITES = [
    ROOT / "public" / "grunt_walking_ai.png",
    ROOT / "public" / "doodles" / "m_alien_walk_ai.png",
    ROOT / "public" / "doodles" / "m_dasher_walk_ai.png",
    ROOT / "public" / "doodles" / "m_giant_walk_ai.png",
]


def is_near_black(pixel: tuple[int, int, int, int]) -> bool:
    return pixel[3] > 0 and max(pixel[:3]) <= 18


def remove_connected_black_background(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(1, height - 1):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not is_near_black(pixels[x, y]):
            continue
        visited.add((x, y))
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                queue.append((nx, ny))

    image.save(path)


def create_attack_slash(path: Path) -> None:
    image = Image.new("RGBA", (240, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    arcs = [
        ((24, 30, 224, 140), 205, 322, 16),
        ((38, 50, 208, 138), 210, 318, 11),
        ((58, 70, 190, 136), 218, 312, 7),
    ]
    for box, start, end, width in arcs:
        draw.arc(box, start, end, fill=(24, 16, 18, 230), width=width + 6)
        draw.arc(box, start, end, fill=(255, 229, 138, 255), width=width)
        draw.arc(box, start + 3, end - 4, fill=(255, 255, 235, 230), width=max(2, width // 4))
    draw.ellipse((194, 108, 209, 123), fill=(255, 141, 54, 255), outline=(37, 21, 23, 255), width=3)
    image.save(path)


for sprite_path in SPRITES:
    remove_connected_black_background(sprite_path)

create_attack_slash(ROOT / "public" / "doodles" / "attack_slash.png")
