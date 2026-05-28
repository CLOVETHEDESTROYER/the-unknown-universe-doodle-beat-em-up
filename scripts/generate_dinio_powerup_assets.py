from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DOODLES = ROOT / "public" / "doodles"


def add_pencil_texture(img: Image.Image, seed: int, count: int = 120) -> Image.Image:
    rng = random.Random(seed)
    alpha = img.getchannel("A")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(count):
        x = rng.randrange(0, img.width)
        y = rng.randrange(0, img.height)
        draw.line(
            (x, y, x + rng.randrange(-16, 17), y + rng.randrange(-4, 5)),
            fill=(255, 255, 255, rng.randrange(16, 48)),
            width=1,
        )
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), alpha))
    return Image.alpha_composite(img, overlay).filter(ImageFilter.UnsharpMask(radius=1, percent=115, threshold=2))


def rough_circle(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, fill, outline, width: int, seed: int) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)
    rng = random.Random(seed)
    pts = []
    for i in range(44):
        t = math.tau * i / 43
        rr = r + rng.randint(-3, 3)
        pts.append((cx + math.cos(t) * rr, cy + math.sin(t) * rr))
    for _ in range(2):
        jittered = [(x + rng.randint(-2, 2), y + rng.randint(-2, 2)) for x, y in pts]
        draw.line(jittered, fill=outline, width=width, joint="curve")


def make_orb() -> None:
    size = 192
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = size // 2

    for r, alpha in [(88, 28), (76, 44), (66, 70)]:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 79, 216, alpha))

    rough_circle(draw, cx, cy, 62, (255, 122, 229, 230), (83, 18, 73, 210), 5, 10)
    rough_circle(draw, cx, cy, 45, (255, 151, 236, 235), (255, 213, 251, 110), 3, 20)
    rough_circle(draw, cx - 14, cy - 18, 20, (255, 248, 255, 170), (255, 255, 255, 120), 2, 30)
    draw.arc((56, 88, 150, 150), 20, 160, fill=(255, 245, 253, 190), width=9)

    for i in range(9):
        angle = math.tau * i / 9
        x1 = cx + math.cos(angle) * 74
        y1 = cy + math.sin(angle) * 74
        x2 = cx + math.cos(angle) * 90
        y2 = cy + math.sin(angle) * 90
        draw.line((x1, y1, x2, y2), fill=(255, 213, 251, 115), width=3)

    add_pencil_texture(img, 100).save(DOODLES / "dinio_orb.png")


def make_shot() -> None:
    img = Image.new("RGBA", (160, 96), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.polygon([(60, 24), (136, 48), (60, 72), (78, 48)], fill=(255, 143, 232, 195))
    draw.polygon([(74, 34), (126, 48), (74, 62), (84, 48)], fill=(255, 242, 251, 220))
    rough_circle(draw, 50, 48, 28, (255, 102, 220, 235), (83, 18, 73, 210), 4, 200)
    rough_circle(draw, 42, 44, 10, (255, 255, 255, 180), (255, 255, 255, 100), 2, 210)
    add_pencil_texture(img, 220, 70).save(DOODLES / "dinio_shot.png")


def make_muzzle_flash() -> None:
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = 112, 128
    for r, alpha in [(72, 34), (54, 72), (38, 145)]:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 79, 216, alpha))
    draw.polygon([(38, 128), (170, 68), (136, 128), (170, 188)], fill=(255, 123, 207, 210))
    draw.polygon([(82, 128), (178, 88), (150, 128), (178, 168)], fill=(255, 242, 251, 235))
    draw.polygon([(156, 88), (224, 72), (200, 112)], fill=(255, 192, 236, 190))
    draw.polygon([(156, 168), (224, 184), (200, 144)], fill=(255, 192, 236, 190))
    rough_circle(draw, cx, cy, 34, (255, 208, 246, 225), (83, 18, 73, 160), 3, 300)
    add_pencil_texture(img, 320, 100).save(DOODLES / "dinio_muzzle_flash.png")


def make_doghost_assets() -> None:
    orb = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(orb)
    cx = cy = 128
    for r, color in [(92, (191, 219, 254, 40)), (74, (248, 250, 252, 150)), (54, (255, 255, 255, 230))]:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    rough_circle(draw, cx, cy, 64, (255, 255, 255, 190), (148, 163, 184, 160), 4, 410)
    rough_circle(draw, cx, cy, 34, (219, 234, 254, 80), (226, 232, 240, 210), 6, 420)
    rough_circle(draw, 98, 102, 8, (255, 255, 255, 210), (255, 255, 255, 120), 2, 430)
    rough_circle(draw, 156, 156, 10, (255, 255, 255, 180), (255, 255, 255, 100), 2, 440)
    add_pencil_texture(orb, 450, 95).save(DOODLES / "doghost_orb.png")

    wave = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(wave)
    for i, (cx, r, alpha) in enumerate([(110, 28, 230), (138, 52, 195), (170, 76, 160)]):
        for wobble in range(2):
            draw.ellipse(
                (cx - r - wobble, 128 - r - wobble, cx + r + wobble, 128 + r + wobble),
                outline=(224, 242, 254, alpha),
                width=max(6, 14 - i * 2),
            )
    add_pencil_texture(wave, 470, 45).save(DOODLES / "doghost_wave.png")


def make_teleportation_orb() -> None:
    img = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = 80
    for r, color in [(72, (124, 58, 237, 60)), (58, (109, 40, 217, 170)), (44, (2, 6, 23, 245))]:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    rough_circle(draw, cx, cy, 54, (17, 24, 39, 230), (196, 181, 253, 220), 5, 500)
    rough_circle(draw, 64, 58, 18, (255, 255, 255, 120), (196, 181, 253, 80), 2, 510)
    draw.arc((36, 82, 128, 132), 10, 170, fill=(167, 139, 250, 190), width=7)
    add_pencil_texture(img, 520, 70).save(DOODLES / "teleportation_c_orb.png")


def make_gravity_core() -> None:
    img = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = 80
    for r, color in [(56, (139, 92, 246, 70)), (42, (147, 197, 253, 210)), (25, (255, 255, 255, 210))]:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    rough_circle(draw, cx, cy, 42, (139, 92, 246, 180), (17, 24, 39, 230), 4, 600)
    for angle, color, width in [(-14, (249, 168, 212, 220), 5), (31, (103, 232, 249, 200), 4)]:
        box = (10, 62, 150, 98)
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).ellipse(box, outline=color, width=width)
        layer = layer.rotate(angle, center=(cx, cy), resample=Image.Resampling.BICUBIC)
        img.alpha_composite(layer)
    draw.arc((48, 58, 122, 96), 190, 340, fill=(254, 243, 199, 200), width=4)
    draw.arc((50, 74, 126, 112), 20, 170, fill=(254, 243, 199, 180), width=4)
    rough_circle(draw, 58, 35, 5, (253, 230, 138, 255), (17, 24, 39, 220), 2, 610)
    rough_circle(draw, 122, 111, 6, (191, 219, 254, 255), (17, 24, 39, 220), 2, 620)
    add_pencil_texture(img, 630, 80).save(DOODLES / "gravity_core.png")


def main() -> None:
    make_orb()
    make_shot()
    make_muzzle_flash()
    make_doghost_assets()
    make_teleportation_orb()
    make_gravity_core()
    print("Generated PNG power-up assets.")


if __name__ == "__main__":
    main()
