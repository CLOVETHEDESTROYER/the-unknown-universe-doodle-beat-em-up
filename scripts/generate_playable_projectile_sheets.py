from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "public" / "characters"
FRAME_W = 192
FRAME_H = 96
FRAMES = 6


def jittered_line(draw: ImageDraw.ImageDraw, points, fill, width=3, repeats=2, seed=0):
    rng = random.Random(seed)
    for _ in range(repeats):
        jittered = []
        for x, y in points:
            jittered.append((x + rng.randint(-2, 2), y + rng.randint(-2, 2)))
        draw.line(jittered, fill=fill, width=width, joint="curve")


def add_pencil_texture(img: Image.Image, seed: int) -> Image.Image:
    rng = random.Random(seed)
    alpha = img.getchannel("A")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(80):
        x = rng.randrange(0, img.width)
        y = rng.randrange(0, img.height)
        draw.line(
            (x, y, x + rng.randrange(-12, 13), y + rng.randrange(-3, 4)),
            fill=(255, 255, 255, rng.randrange(16, 46)),
            width=1,
        )
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), alpha))
    return Image.alpha_composite(img, overlay)


def draw_smoke(draw: ImageDraw.ImageDraw, i: int) -> None:
    rng = random.Random(500 + i)
    for puff in range(5):
        x = 30 - i * 2 - puff * 9 + rng.randint(-3, 3)
        y = 48 + math.sin((i + puff) * 0.8) * 9 + rng.randint(-4, 4)
        r = 8 + puff * 2 + rng.randint(-1, 2)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(200, 200, 188, 65), outline=(30, 30, 28, 90), width=1)


def nico_frame(i: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    y = 48 + int(math.sin(i * 0.9) * 4)
    wobble = int(math.sin(i * 1.7) * 3)

    draw_smoke(draw, i)
    flame_len = 32 + (i % 3) * 8
    draw.polygon(
        [(22, y), (56, y - 18 - wobble), (56, y + 18 + wobble)],
        fill=(245, 158, 11, 205),
        outline=(104, 38, 8, 220),
    )
    draw.polygon([(16, y), (46, y - 10), (46, y + 10)], fill=(254, 240, 138, 230))
    draw.polygon(
        [(44, y), (44 + flame_len, y - 11), (44 + flame_len, y + 11)],
        fill=(249, 115, 22, 180),
    )

    body = [(64, y - 18), (133, y - 20), (164, y), (133, y + 20), (64, y + 18)]
    draw.polygon(body, fill=(95, 121, 72, 255), outline=(17, 24, 39, 255))
    draw.polygon([(133, y - 20), (164, y), (133, y + 20)], fill=(211, 65, 42, 255), outline=(17, 24, 39, 255))
    draw.rectangle((62, y - 13, 76, y + 13), fill=(54, 67, 46, 255), outline=(17, 24, 39, 255), width=2)
    draw.line((82, y - 16, 125, y + 13), fill=(228, 228, 204, 70), width=2)
    for n, yy in enumerate((y - 21, y + 21)):
        jittered_line(draw, [(64, yy), (132, yy + (2 if n == 0 else -2)), (164, y)], (17, 24, 39, 230), 3, 2, 80 + i + n)

    img = add_pencil_texture(img, 900 + i)
    return img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))


def ezra_frame(i: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = 104 + int(math.sin(i * 1.4) * 3)
    cy = 48 + int(math.cos(i * 1.1) * 4)
    pulse = i % 3

    for t in range(5):
        x = 22 + t * 14 - i * 3
        y = cy + int(math.sin(i + t) * 10)
        draw.polygon(
            [(x, y), (x + 24, y - 9 - pulse), (x + 20, y + 10 + pulse)],
            fill=(249, 115, 22, 70),
            outline=(127, 29, 29, 70),
        )

    for r, color in ((39 + pulse * 2, (127, 29, 29, 245)), (32 + pulse * 2, (249, 115, 22, 245)), (23 + pulse, (254, 240, 138, 255))):
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    draw.ellipse((cx - 39 - pulse * 2, cy - 39 - pulse * 2, cx + 39 + pulse * 2, cy + 39 + pulse * 2), outline=(17, 24, 39, 245), width=4)

    rng = random.Random(300 + i)
    for _ in range(9):
        ang = rng.random() * math.tau
        inner = 15 + rng.random() * 16
        outer = 34 + rng.random() * 16
        x1 = cx + math.cos(ang) * inner
        y1 = cy + math.sin(ang) * inner
        x2 = cx + math.cos(ang) * outer
        y2 = cy + math.sin(ang) * outer
        draw.line((x1, y1, x2, y2), fill=(70, 22, 12, 185), width=3)

    for _ in range(5):
        x = cx - 46 + rng.randint(-20, 20)
        y = cy + rng.randint(-32, 32)
        draw.polygon([(x, y), (x - 18, y - 8), (x - 14, y + 10)], fill=(251, 146, 60, 155))

    img = add_pencil_texture(img, 1200 + i)
    return img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))


def make_strip(char_id: str, frame_fn) -> None:
    out_dir = CHAR_DIR / char_id
    strip = Image.new("RGBA", (FRAME_W * FRAMES, FRAME_H), (0, 0, 0, 0))
    for i in range(FRAMES):
        strip.alpha_composite(frame_fn(i), (i * FRAME_W, 0))
    strip.save(out_dir / "projectile-sheet.png")

    # Keep the legacy single-image path useful for fallbacks and non-animated callers.
    frame_fn(2).save(out_dir / "projectile.png")

    meta_path = out_dir / "metadata.json"
    metadata = {}
    if meta_path.exists():
        metadata = json.loads(meta_path.read_text())
    metadata["projectileSheet"] = {
        "file": "projectile-sheet.png",
        "frameWidth": FRAME_W,
        "frameHeight": FRAME_H,
        "frames": FRAMES,
        "naturalFacing": "right",
        "notes": "Animated raster projectile strip for the playable character shot.",
    }
    meta_path.write_text(json.dumps(metadata, indent=2) + "\n")


def main() -> None:
    make_strip("nico", nico_frame)
    make_strip("ezra", ezra_frame)
    print("Generated Nico and Ezra projectile sheets.")


if __name__ == "__main__":
    main()
