from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
DOODLES = PUBLIC / "doodles"
TC_DIR = PUBLIC / "characters" / "teleportation_c"

SMALL_W, SMALL_H = 280, 280
GIANT_W, GIANT_H = 360, 420
CHAR_W, CHAR_H = 256, 360
ATTACK_W, ATTACK_H = 480, 360


def rough(draw: ImageDraw.ImageDraw, points, fill, width=4, seed=0, repeats=2):
    rng = random.Random(seed)
    for _ in range(repeats):
        jittered = [(x + rng.randint(-3, 3), y + rng.randint(-3, 3)) for x, y in points]
        draw.line(jittered, fill=fill, width=width, joint="curve")


def poly(draw: ImageDraw.ImageDraw, points, fill, outline=(17, 24, 39, 255), width=4, seed=0):
    draw.polygon(points, fill=fill)
    closed = list(points) + [points[0]]
    rough(draw, closed, outline, width, seed, 2)


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=(17, 24, 39, 255), width=4, seed=0):
    draw.ellipse(box, fill=fill)
    x1, y1, x2, y2 = box
    pts = []
    for i in range(34):
        t = math.tau * i / 33
        pts.append(((x1 + x2) / 2 + math.cos(t) * (x2 - x1) / 2, (y1 + y2) / 2 + math.sin(t) * (y2 - y1) / 2))
    rough(draw, pts, outline, width, seed, 2)


def pencil_texture(img: Image.Image, seed: int, count: int = 160) -> Image.Image:
    rng = random.Random(seed)
    alpha = img.getchannel("A")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(count):
        x = rng.randrange(0, img.width)
        y = rng.randrange(0, img.height)
        draw.line((x, y, x + rng.randrange(-18, 19), y + rng.randrange(-5, 6)), fill=(255, 255, 255, rng.randrange(18, 52)), width=1)
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), alpha))
    return Image.alpha_composite(img, overlay).filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=2))


def alien_frame(i: int) -> Image.Image:
    img = Image.new("RGBA", (SMALL_W, SMALL_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = int(math.sin(i * math.tau / 4) * 6)
    leg = [-18, 16, 18, -16][i]
    cx, cy = 142, 128 + bob
    ellipse(d, (72, 42 + bob, 208, 178 + bob), (75, 214, 170, 255), seed=10 + i)
    ellipse(d, (100, 90 + bob, 124, 116 + bob), (10, 18, 28, 255), width=2, seed=20 + i)
    ellipse(d, (160, 90 + bob, 184, 116 + bob), (10, 18, 28, 255), width=2, seed=30 + i)
    rough(d, [(111, 138 + bob), (128, 150 + bob), (150, 152 + bob), (170, 138 + bob)], (17, 24, 39, 255), 4, 40 + i)
    rough(d, [(106, 52 + bob), (80, 16 + bob), (66, 18 + bob)], (17, 24, 39, 255), 5, 50 + i)
    rough(d, [(178, 52 + bob), (202, 16 + bob), (218, 18 + bob)], (17, 24, 39, 255), 5, 60 + i)
    ellipse(d, (57, 6 + bob, 77, 26 + bob), (247, 220, 86, 255), width=3, seed=70 + i)
    ellipse(d, (208, 6 + bob, 228, 26 + bob), (247, 220, 86, 255), width=3, seed=80 + i)
    rough(d, [(92, 164 + bob), (68, 202 + bob), (48, 222 + bob)], (17, 24, 39, 255), 7, 90 + i)
    rough(d, [(192, 164 + bob), (216, 202 + bob), (236, 222 + bob)], (17, 24, 39, 255), 7, 100 + i)
    rough(d, [(112, 176 + bob), (102 + leg, 236), (80 + leg, 250)], (17, 24, 39, 255), 8, 110 + i)
    rough(d, [(172, 176 + bob), (182 - leg, 236), (204 - leg, 250)], (17, 24, 39, 255), 8, 120 + i)
    return pencil_texture(img, 1000 + i)


def dasher_frame(i: int) -> Image.Image:
    img = Image.new("RGBA", (SMALL_W, SMALL_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = int(math.sin(i * math.tau / 4) * 5)
    leg = [-22, 18, 22, -18][i]
    for t in range(4):
        rough(d, [(28 - t * 12, 138 + t * 11), (74 - t * 8, 128 + t * 8)], (249, 115, 22, 90), 5, 200 + i + t)
    ellipse(d, (66, 68 + bob, 214, 170 + bob), (248, 216, 72, 255), seed=210 + i)
    poly(d, [(194, 92 + bob), (246, 118 + bob), (192, 142 + bob)], (249, 115, 22, 230), seed=220 + i)
    ellipse(d, (116, 108 + bob, 130, 122 + bob), (17, 24, 39, 255), width=2, seed=230 + i)
    ellipse(d, (166, 108 + bob, 180, 122 + bob), (17, 24, 39, 255), width=2, seed=240 + i)
    rough(d, [(124, 146 + bob), (146, 155 + bob), (170, 146 + bob)], (17, 24, 39, 255), 4, 250 + i)
    rough(d, [(92, 158 + bob), (70 + leg, 218), (46 + leg, 236)], (17, 24, 39, 255), 7, 260 + i)
    rough(d, [(178, 158 + bob), (196 - leg, 218), (226 - leg, 236)], (17, 24, 39, 255), 7, 270 + i)
    return pencil_texture(img, 1200 + i)


def giant_frame(i: int) -> Image.Image:
    img = Image.new("RGBA", (GIANT_W, GIANT_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = int(math.sin(i * math.tau / 4) * 5)
    step = [-18, 14, 18, -14][i]
    poly(d, [(104, 74 + bob), (260, 54 + bob), (304, 172 + bob), (282, 308 + bob), (92, 318 + bob), (58, 176 + bob)], (132, 76, 208, 255), seed=300 + i)
    poly(d, [(136, 78 + bob), (176, 130 + bob), (206, 74 + bob), (196, 164 + bob), (148, 164 + bob)], (35, 20, 66, 210), seed=310 + i)
    ellipse(d, (126, 178 + bob, 152, 206 + bob), (238, 226, 255, 255), width=2, seed=320 + i)
    ellipse(d, (212, 178 + bob, 238, 206 + bob), (238, 226, 255, 255), width=2, seed=330 + i)
    rough(d, [(135, 244 + bob), (174, 250 + bob), (226, 244 + bob)], (17, 24, 39, 255), 6, 340 + i)
    rough(d, [(76, 172 + bob), (40, 246 + bob), (22, 306 + bob)], (17, 24, 39, 255), 8, 350 + i)
    rough(d, [(292, 172 + bob), (326, 246 + bob), (342, 306 + bob)], (17, 24, 39, 255), 8, 360 + i)
    rough(d, [(128, 314 + bob), (104 + step, 382), (76 + step, 398)], (17, 24, 39, 255), 12, 370 + i)
    rough(d, [(232, 314 + bob), (252 - step, 382), (286 - step, 398)], (17, 24, 39, 255), 12, 380 + i)
    return pencil_texture(img, 1400 + i, 220)


def make_sheet(path: Path, frame_fn, width: int, height: int, frames: int = 4) -> None:
    sheet = Image.new("RGBA", (width * frames, height), (0, 0, 0, 0))
    for i in range(frames):
        sheet.alpha_composite(frame_fn(i), (i * width, 0))
    sheet.save(path)


def static_monster(path: Path, kind: str) -> None:
    img = Image.new("RGBA", (320, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if kind == "devil":
        poly(d, [(88, 94), (118, 40), (150, 88), (196, 38), (224, 102), (210, 232), (106, 238)], (191, 50, 39, 255), seed=500)
        ellipse(d, (116, 128, 138, 150), (255, 236, 148, 255), width=2, seed=501)
        ellipse(d, (178, 128, 200, 150), (255, 236, 148, 255), width=2, seed=502)
        rough(d, [(118, 184), (150, 202), (196, 184)], (17, 24, 39, 255), 5, 503)
    elif kind == "floater":
        ellipse(d, (76, 60, 244, 218), (125, 211, 252, 220), seed=510)
        for x in (98, 132, 176, 214):
            rough(d, [(x, 202), (x - 24, 268)], (17, 24, 39, 210), 5, 511 + x)
        ellipse(d, (120, 122, 144, 150), (17, 24, 39, 255), width=2, seed=512)
        ellipse(d, (176, 122, 200, 150), (17, 24, 39, 255), width=2, seed=513)
    else:
        ellipse(d, (70, 54, 250, 244), (30, 30, 38, 255), seed=520)
        for a in range(10):
            x = 160 + math.cos(a * math.tau / 10) * 126
            y = 148 + math.sin(a * math.tau / 10) * 126
            rough(d, [(160, 148), (x, y)], (17, 24, 39, 255), 9, 530 + a)
        ellipse(d, (116, 112, 142, 140), (132, 204, 22, 255), width=2, seed=540)
        ellipse(d, (182, 112, 208, 140), (132, 204, 22, 255), width=2, seed=541)
        rough(d, [(110, 184), (146, 210), (198, 184)], (132, 204, 22, 255), 7, 542)
    pencil_texture(img, 1600).save(path)


def tc_body(draw: ImageDraw.ImageDraw, cx: int, base: int, pose: int, scale: float = 1.0, attack: bool = False):
    bob = int(math.sin(pose * math.tau / 4) * 5)
    leg = [-24, 16, 24, -16][pose % 4]
    head = [(cx - 48, base - 226 + bob), (cx - 8, base - 260 + bob), (cx + 34, base - 228 + bob), (cx + 54, base - 178 + bob), (cx - 42, base - 176 + bob)]
    poly(draw, head, (8, 12, 24, 255), outline=(8, 12, 24, 255), width=7, seed=700 + pose)
    ellipse(draw, (cx - 34, base - 214 + bob, cx - 12, base - 190 + bob), (240, 249, 255, 245), width=1, seed=710 + pose)
    ellipse(draw, (cx + 18, base - 214 + bob, cx + 40, base - 190 + bob), (240, 249, 255, 245), width=1, seed=720 + pose)
    ellipse(draw, (cx - 44, base - 172 + bob, cx + 48, base - 78 + bob), (8, 12, 24, 255), outline=(8, 12, 24, 255), width=6, seed=730 + pose)
    rough(draw, [(cx - 24, base - 156 + bob), (cx - 76 - (32 if attack else 0), base - 112 + bob)], (8, 12, 24, 255), 16, 740 + pose)
    rough(draw, [(cx + 28, base - 156 + bob), (cx + 78 + (54 if attack else 0), base - 116 + bob)], (8, 12, 24, 255), 16, 750 + pose)
    rough(draw, [(cx - 18, base - 88 + bob), (cx - 34 + leg, base - 22), (cx - 56 + leg, base - 10)], (8, 12, 24, 255), 17, 760 + pose)
    rough(draw, [(cx + 18, base - 88 + bob), (cx + 28 - leg, base - 22), (cx + 54 - leg, base - 10)], (8, 12, 24, 255), 17, 770 + pose)
    draw.arc((cx - 82, base - 236 + bob, cx + 88, base - 66 + bob), 310, 110, fill=(34, 211, 238, 145), width=5)
    draw.arc((cx - 96, base - 246 + bob, cx + 98, base - 54 + bob), 130, 285, fill=(168, 85, 247, 155), width=5)


def make_teleportation_c() -> None:
    walk = Image.new("RGBA", (CHAR_W * 4, CHAR_H), (0, 0, 0, 0))
    for i in range(4):
        frame = Image.new("RGBA", (CHAR_W, CHAR_H), (0, 0, 0, 0))
        tc_body(ImageDraw.Draw(frame), 128, 330, i)
        walk.alpha_composite(pencil_texture(frame, 1900 + i, 95), (i * CHAR_W, 0))
    walk.save(TC_DIR / "walk.png")

    attack = Image.new("RGBA", (ATTACK_W * 5, ATTACK_H), (0, 0, 0, 0))
    for i in range(5):
        frame = Image.new("RGBA", (ATTACK_W, ATTACK_H), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        tc_body(d, 170, 330, i % 4, attack=i in (2, 3))
        if i >= 1:
            for r, color in [(84, (34, 211, 238, 130)), (62, (168, 85, 247, 155)), (38, (8, 12, 24, 220))]:
                d.arc((276 - r, 166 - r, 276 + r, 166 + r), 205 - i * 16, 50 + i * 20, fill=color, width=7)
            rough(d, [(248, 172), (354, 126), (414, 150)], (240, 249, 255, 180), 5, 2000 + i)
        attack.alpha_composite(pencil_texture(frame, 2000 + i, 120), (i * ATTACK_W, 0))
    attack.save(TC_DIR / "attack.png")

    dash = Image.new("RGBA", (CHAR_W * 4, CHAR_H), (0, 0, 0, 0))
    for i in range(4):
        frame = Image.new("RGBA", (CHAR_W, CHAR_H), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        for t in range(3):
            d.arc((34 - t * 16, 72 + t * 18, 238 - t * 16, 286 + t * 12), 210, 35, fill=(168, 85, 247, 70), width=8)
        tc_body(d, 136 + i * 4, 330, i, attack=True)
        dash.alpha_composite(pencil_texture(frame, 2100 + i, 80), (i * CHAR_W, 0))
    dash.save(TC_DIR / "dash.png")

    for name, pose, dy in [("jump.png", 1, -48), ("buttbounce.png", 2, 14), ("dazed.png", 0, 0), ("dead.png", 3, 22)]:
        frame = Image.new("RGBA", (CHAR_W, CHAR_H), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        tc_body(d, 128, 330 + dy, pose, attack=False)
        if name == "buttbounce.png":
            d.arc((40, 286, 216, 350), 190, 350, fill=(34, 211, 238, 180), width=6)
            d.arc((52, 298, 204, 344), 190, 350, fill=(168, 85, 247, 180), width=5)
        if name == "jump.png":
            d.arc((42, 246, 218, 340), 200, 350, fill=(34, 211, 238, 170), width=5)
        pencil_texture(frame, 2200 + pose, 120).save(TC_DIR / name)


def main() -> None:
    make_sheet(DOODLES / "m_alien_walk_ai.png", alien_frame, SMALL_W, SMALL_H)
    make_sheet(DOODLES / "m_dasher_walk_ai.png", dasher_frame, SMALL_W, SMALL_H)
    make_sheet(DOODLES / "m_giant_walk_ai.png", giant_frame, GIANT_W, GIANT_H)
    static_monster(DOODLES / "m_devil.png", "devil")
    static_monster(DOODLES / "m_floater.png", "floater")
    static_monster(DOODLES / "m_boss.png", "boss")
    make_teleportation_c()
    print("Generated gameplay polish assets.")


if __name__ == "__main__":
    main()
