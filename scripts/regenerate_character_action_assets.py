from __future__ import annotations

import json
import math
import random
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "public" / "characters"
DOWNLOADS = Path.home() / "Downloads"

WALK_W, WALK_H = 256, 360
ATTACK_W, ATTACK_H = 480, 360


def alpha_bbox(img: Image.Image) -> Tuple[int, int, int, int]:
    return img.getchannel("A").getbbox() or (0, 0, img.width, img.height)


def frame(strip: Image.Image, index: int, width: int, height: int) -> Image.Image:
    return strip.crop((index * width, 0, (index + 1) * width, height)).convert("RGBA")


def paste_centered(canvas: Image.Image, sprite: Image.Image, dx: int = 0, dy: int = 0) -> None:
    bbox = alpha_bbox(sprite)
    crop = sprite.crop(bbox)
    x = (canvas.width - crop.width) // 2 + dx
    y = canvas.height - crop.height - 18 + dy
    canvas.alpha_composite(crop, (x, y))


def scratch_lines(img: Image.Image, color=(255, 255, 255, 34), count: int = 120) -> Image.Image:
    rng = random.Random(87)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(count):
        x = rng.randrange(0, img.width)
        y = rng.randrange(0, img.height)
        draw.line((x, y, x + rng.randrange(-8, 9), y + rng.randrange(-2, 3)), fill=color, width=1)
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), img.getchannel("A")))
    return Image.alpha_composite(img, overlay)


def remove_edge_checker(source: Image.Image) -> Image.Image:
    img = source.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    seen = set()
    stack = []

    def is_bg(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        return r >= 225 and g >= 225 and b >= 225 and max(r, g, b) - min(r, g, b) <= 18

    for x in range(w):
        if is_bg(x, 0):
            stack.append((x, 0))
        if is_bg(x, h - 1):
            stack.append((x, h - 1))
    for y in range(h):
        if is_bg(0, y):
            stack.append((0, y))
        if is_bg(w - 1, y):
            stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not is_bg(x, y):
            continue
        seen.add((x, y))
        pixels[x, y] = (255, 255, 255, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    alpha = img.getchannel("A").filter(ImageFilter.MinFilter(3))
    img.putalpha(alpha)
    return img


def lower_step_pose(src: Image.Image, phase: int, lift: int = 0) -> Image.Image:
    bbox = alpha_bbox(src)
    split_y = bbox[1] + int((bbox[3] - bbox[1]) * 0.58)
    split_x = bbox[0] + int((bbox[2] - bbox[0]) * 0.52)
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))

    upper_mask = Image.new("L", src.size, 0)
    ImageDraw.Draw(upper_mask).rectangle((0, 0, src.width, split_y), fill=255)
    upper = Image.new("RGBA", src.size, (0, 0, 0, 0))
    upper.alpha_composite(src)
    upper.putalpha(ImageChops.multiply(upper.getchannel("A"), upper_mask))
    out.alpha_composite(upper, (0, -lift))

    leg_mask_left = Image.new("L", src.size, 0)
    leg_mask_right = Image.new("L", src.size, 0)
    ImageDraw.Draw(leg_mask_left).rectangle((0, split_y - 12, split_x, src.height), fill=255)
    ImageDraw.Draw(leg_mask_right).rectangle((split_x, split_y - 12, src.width, src.height), fill=255)

    left = Image.new("RGBA", src.size, (0, 0, 0, 0))
    right = Image.new("RGBA", src.size, (0, 0, 0, 0))
    left.alpha_composite(src)
    right.alpha_composite(src)
    left.putalpha(ImageChops.multiply(left.getchannel("A"), leg_mask_left))
    right.putalpha(ImageChops.multiply(right.getchannel("A"), leg_mask_right))

    if phase == 1:
        offsets = ((18, 4), (-13, -3))
    elif phase == 3:
        offsets = ((-13, -3), (18, 4))
    else:
        offsets = ((0, -lift), (0, -lift))
    out.alpha_composite(left, offsets[0])
    out.alpha_composite(right, offsets[1])
    return out


def normalize_to_frame(src: Image.Image, width: int = WALK_W, height: int = WALK_H, target_h: int = 285) -> Image.Image:
    bbox = alpha_bbox(src)
    crop = src.crop(bbox)
    scale = min((width - 22) / crop.width, target_h / crop.height)
    resized = crop.resize((max(1, int(crop.width * scale)), max(1, int(crop.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((width - resized.width) // 2, height - resized.height - 18))
    return canvas


def source_frames(char_id: str) -> list[Image.Image]:
    source_path = DOWNLOADS / f"{char_id}SpriteSheet.png"
    source = remove_edge_checker(Image.open(source_path))
    src_w = source.width // 4
    return [normalize_to_frame(frame(source, i, src_w, source.height)) for i in range(4)]


def whole_body_step(src: Image.Image, x_shift: int = 0, y_shift: int = 0, lean: float = 0) -> Image.Image:
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    posed = src.transform(src.size, Image.Transform.AFFINE, (1, lean, 0, 0, 1, 0), resample=Image.Resampling.BICUBIC)
    out.alpha_composite(posed, (x_shift, y_shift))
    return out


def make_walk_from_existing(char_id: str) -> None:
    path = CHAR_DIR / char_id / "walk.png"
    base = source_frames(char_id)
    refs = [base[0], base[1], base[2], base[1]]
    transforms = [(0, 0, 0), (-5, -5, -0.02), (1, -1, 0.0), (7, -5, 0.02)]
    strip = Image.new("RGBA", (WALK_W * 4, WALK_H), (0, 0, 0, 0))
    for i, (ref, (x, y, lean)) in enumerate(zip(refs, transforms)):
        posed = whole_body_step(ref, x, y, lean)
        posed = scratch_lines(posed, count=18)
        strip.alpha_composite(posed, (i * WALK_W, 0))
    strip.save(path)


def add_effect(draw: ImageDraw.ImageDraw, char_id: str, x: int, y: int, scale: float = 1.0) -> None:
    if char_id == "barrett":
        for k in range(4):
            yy = y + k * 18
            draw.arc((x - 20, yy - 34, x + 145, yy + 26), -35, 32, fill=(236, 129, 45, 210), width=max(2, int(4 * scale)))
            draw.line((x, yy, x + 118, yy - 22), fill=(47, 24, 12, 190), width=2)
    elif char_id == "nico":
        draw.polygon([(x + 18, y - 18), (x + 132, y), (x + 18, y + 18)], fill=(255, 115, 20, 170))
        draw.ellipse((x + 96, y - 18, x + 168, y + 18), fill=(245, 245, 210, 205), outline=(18, 24, 38, 220), width=3)
    elif char_id == "ezra":
        draw.ellipse((x + 62, y - 42, x + 162, y + 58), fill=(251, 146, 60, 190), outline=(127, 29, 29, 230), width=4)
        draw.ellipse((x + 84, y - 22, x + 140, y + 34), fill=(254, 240, 138, 210))
    else:
        for r, color in [(96, (34, 211, 238, 120)), (70, (168, 85, 247, 150)), (42, (15, 23, 42, 210))]:
            draw.arc((x - r, y - r, x + r, y + r), 205, 35, fill=color, width=7)


def make_attack_from_existing(char_id: str) -> None:
    char_path = CHAR_DIR / char_id
    base = source_frames(char_id)
    refs = [base[0], base[1], base[2], base[3], base[1]]
    strip = Image.new("RGBA", (ATTACK_W * 5, ATTACK_H), (0, 0, 0, 0))
    for i in range(5):
        src_frame = refs[i]
        canvas = Image.new("RGBA", (ATTACK_W, ATTACK_H), (0, 0, 0, 0))
        posed = src_frame
        if i in (1, 2, 3):
            posed = src_frame.rotate([-3, -7, -2][i - 1], resample=Image.Resampling.BICUBIC, expand=False)
        paste_centered(canvas, posed, dx=[-18, -4, 6, 16, 0][i], dy=[0, -4, 0, 3, 0][i])
        overlay = Image.new("RGBA", (ATTACK_W, ATTACK_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        if i >= 1:
            add_effect(draw, char_id, 280 + i * 12, 128 + i * 5, 1.0)
        canvas = Image.alpha_composite(canvas, overlay)
        canvas = scratch_lines(canvas, count=18)
        strip.alpha_composite(canvas, (i * ATTACK_W, 0))
    strip.save(char_path / "attack.png")


def make_jump_and_butt(char_id: str) -> None:
    char_path = CHAR_DIR / char_id
    src = frame(Image.open(char_path / "walk.png").convert("RGBA"), 1, WALK_W, WALK_H)
    bbox = alpha_bbox(src)
    crop = src.crop(bbox)

    jump = Image.new("RGBA", (WALK_W, WALK_H), (0, 0, 0, 0))
    jump_sprite = crop.rotate(-10, resample=Image.Resampling.BICUBIC, expand=True)
    paste_centered(jump, jump_sprite, dx=6, dy=-48)
    draw = ImageDraw.Draw(jump)
    if char_id == "barrett":
        draw.arc((36, 250, 220, 344), 188, 345, fill=(245, 158, 11, 170), width=5)
    elif char_id == "nico":
        draw.polygon([(54, 316), (126, 254), (104, 336)], fill=(249, 115, 22, 150))
    elif char_id == "ezra":
        draw.ellipse((58, 284, 196, 342), outline=(251, 146, 60, 180), width=6)
    else:
        draw.arc((36, 242, 220, 346), 200, 350, fill=(34, 211, 238, 180), width=6)
        draw.arc((56, 254, 202, 334), 200, 350, fill=(168, 85, 247, 180), width=5)
    jump = scratch_lines(jump, count=30)
    jump.save(char_path / "jump.png")

    butt = Image.new("RGBA", (WALK_W, WALK_H), (0, 0, 0, 0))
    squashed = crop.resize((max(1, int(crop.width * 1.12)), max(1, int(crop.height * 0.82))), Image.Resampling.LANCZOS)
    paste_centered(butt, squashed, dx=0, dy=18)
    draw = ImageDraw.Draw(butt)
    colors = {
        "barrett": (245, 158, 11, 220),
        "nico": (132, 204, 22, 220),
        "ezra": (249, 115, 22, 230),
        "teleportation_c": (168, 85, 247, 230),
    }
    c = colors[char_id]
    draw.ellipse((38, 292, 218, 344), outline=c, width=7)
    draw.line((58, 318, 24, 342), fill=c, width=5)
    draw.line((198, 318, 232, 342), fill=c, width=5)
    butt = scratch_lines(butt, count=30)
    butt.save(char_path / "buttbounce.png")


def glow(img: Image.Image, color: Tuple[int, int, int], radius: int = 10) -> Image.Image:
    alpha = img.getchannel("A")
    blurred = alpha.filter(ImageFilter.GaussianBlur(radius))
    layer = Image.new("RGBA", img.size, (*color, 0))
    layer.putalpha(blurred.point(lambda p: int(p * 0.7)))
    return Image.alpha_composite(layer, img)


def draw_tc_pose(size: Tuple[int, int], pose: str, phase: int = 0) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, base = w // 2, h - 34
    bob = [-2, -14, -7, -14][phase % 4] if pose == "walk" else 0
    body = (15, 18, 40, 255)
    ink = (7, 10, 24, 255)
    cyan = (34, 211, 238, 230)
    purple = (168, 85, 247, 230)

    # portal glow first
    for off, col in [(-7, cyan), (7, purple)]:
        draw.arc((cx - 82 + off, base - 238 + bob, cx + 102 + off, base - 42 + bob), 250, 72, fill=col, width=9)
    if pose in {"dash", "attack"}:
        for t in range(3):
            draw.arc((cx - 130 - t * 26, base - 218 + t * 20, cx + 54 - t * 26, base - 66 + t * 20), 230, 40, fill=(34, 211, 238, 80 - t * 18), width=8)

    # legs by phase
    if pose == "walk":
        leg_pairs = [
            ((-24, -62, -34, -8), (22, -62, 34, -8)),
            ((-20, -62, -48, -5), (18, -62, 45, -18)),
            ((-24, -62, -26, -8), (24, -62, 26, -8)),
            ((-18, -62, 45, -18), (20, -62, -48, -5)),
        ][phase % 4]
    elif pose == "jump":
        leg_pairs = ((-20, -70, -55, -48), (20, -70, 56, -42))
    elif pose == "butt":
        leg_pairs = ((-28, -38, -62, -16), (28, -38, 62, -16))
    else:
        leg_pairs = ((-24, -58, -44, -8), (24, -58, 45, -12))
    for x1, y1, x2, y2 in leg_pairs:
        draw.line((cx + x1, base + y1 + bob, cx + x2, base + y2 + bob), fill=ink, width=17)
        draw.ellipse((cx + x2 - 16, base + y2 - 5 + bob, cx + x2 + 18, base + y2 + 9 + bob), fill=ink)

    # body, head, ears
    draw.ellipse((cx - 42, base - 168 + bob, cx + 40, base - 62 + bob), fill=body, outline=ink, width=5)
    head = [(cx - 58, base - 212 + bob), (cx - 10, base - 250 + bob), (cx + 4, base - 222 + bob), (cx + 50, base - 250 + bob), (cx + 66, base - 196 + bob), (cx + 12, base - 178 + bob), (cx - 50, base - 190 + bob)]
    draw.polygon(head, fill=body, outline=ink)
    draw.line((cx - 50, base - 190 + bob, cx - 78, base - 142 + bob), fill=ink, width=17)
    draw.line((cx + 35, base - 160 + bob, cx + 74, base - 108 + bob), fill=ink, width=17)
    draw.ellipse((cx - 32, base - 212 + bob, cx - 16, base - 196 + bob), fill=(255, 255, 214, 255))
    draw.ellipse((cx + 18, base - 212 + bob, cx + 34, base - 196 + bob), fill=(255, 255, 214, 255))
    draw.arc((cx - 20, base - 128 + bob, cx + 22, base - 92 + bob), 100, 270, fill=(245, 243, 255, 255), width=3)

    if pose == "attack":
        progress = phase / 4
        draw.line((cx + 28, base - 148, cx + 118 + int(progress * 80), base - 148 - int(progress * 30)), fill=ink, width=18)
        for r, col in [(66, cyan), (48, purple), (28, (255, 255, 255, 210))]:
            draw.arc((cx + 62, base - 216 - r // 2, cx + 62 + r * 2, base - 216 + r * 2), -40, 75, fill=col, width=7)
    elif pose == "jump":
        draw.arc((cx - 92, base - 260, cx + 105, base - 96), 210, 20, fill=purple, width=8)
    elif pose == "butt":
        draw.ellipse((cx - 92, base - 26, cx + 92, base + 24), outline=purple, width=8)
        draw.ellipse((cx - 64, base - 20, cx + 64, base + 14), outline=cyan, width=5)

    img = glow(img, (34, 211, 238), 8)
    img = scratch_lines(img, color=(255, 255, 255, 28), count=90)
    return img


def make_tc_assets() -> None:
    char_path = CHAR_DIR / "teleportation_c"
    char_path.mkdir(parents=True, exist_ok=True)
    walk = Image.new("RGBA", (WALK_W * 4, WALK_H), (0, 0, 0, 0))
    for i in range(4):
        walk.alpha_composite(draw_tc_pose((WALK_W, WALK_H), "walk", i), (i * WALK_W, 0))
    walk.save(char_path / "walk.png")

    dash = Image.new("RGBA", (WALK_W * 4, WALK_H), (0, 0, 0, 0))
    for i in range(4):
        pose = draw_tc_pose((WALK_W, WALK_H), "dash", i)
        dash.alpha_composite(pose.transform((WALK_W, WALK_H), Image.Transform.AFFINE, (1, -0.12, i * -7, 0, 1, 0), resample=Image.Resampling.BICUBIC), (i * WALK_W, 0))
    dash.save(char_path / "dash.png")

    attack = Image.new("RGBA", (ATTACK_W * 5, ATTACK_H), (0, 0, 0, 0))
    for i in range(5):
        pose = draw_tc_pose((ATTACK_W, ATTACK_H), "attack", i)
        attack.alpha_composite(pose, (i * ATTACK_W, 0))
    attack.save(char_path / "attack.png")

    draw_tc_pose((WALK_W, WALK_H), "jump", 0).save(char_path / "jump.png")
    draw_tc_pose((WALK_W, WALK_H), "butt", 0).save(char_path / "buttbounce.png")
    draw_tc_pose((WALK_W, WALK_H), "walk", 0).save(char_path / "dazed.png")
    dead = draw_tc_pose((WALK_W, WALK_H), "butt", 0).rotate(90, resample=Image.Resampling.BICUBIC, expand=False)
    dead.save(char_path / "dead.png")


def update_metadata(char_id: str) -> None:
    path = CHAR_DIR / char_id / "metadata.json"
    data = {}
    if path.exists():
        data = json.loads(path.read_text())
    data.setdefault("id", char_id)
    data.setdefault("name", char_id.replace("_", " ").title())
    data["frame"] = {"walk": [WALK_W, WALK_H, 4], "attack": [ATTACK_W, ATTACK_H, 5], "dash": [WALK_W, WALK_H, 4]}
    data["buttbounce"] = {"width": WALK_W, "height": WALK_H, "frames": 1}
    data["notes"] = "Regenerated action pass with stronger left-foot/right-foot walk cycle, unique jump, attack, and butt-bounce assets."
    path.write_text(json.dumps(data, indent=2))


def main() -> None:
    for char_id in ["barrett", "nico", "ezra"]:
        make_walk_from_existing(char_id)
        make_attack_from_existing(char_id)
        make_jump_and_butt(char_id)
        update_metadata(char_id)
    make_tc_assets()
    make_jump_and_butt("teleportation_c")
    update_metadata("teleportation_c")


if __name__ == "__main__":
    main()
