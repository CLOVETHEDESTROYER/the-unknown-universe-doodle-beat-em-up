from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CHAR_DIR = PUBLIC / "characters" / "teleportation_c"

WALK_W, WALK_H = 256, 360
ATTACK_W, ATTACK_H = 480, 360
ALLY_WALK_W, ALLY_WALK_H = 526, 482
ALLY_ATTACK_W, ALLY_ATTACK_H = 551, 342


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    return img.getchannel("A").getbbox() or (0, 0, img.width, img.height)


def crop_frame(strip: Image.Image, index: int, width: int, height: int) -> Image.Image:
    return strip.crop((index * width, 0, (index + 1) * width, height)).convert("RGBA")


def normalize_sprite(
    src: Image.Image,
    width: int,
    height: int,
    target_h: int,
    baseline_pad: int = 18,
    dx: int = 0,
    dy: int = 0,
) -> Image.Image:
    bbox = alpha_bbox(src)
    crop = src.crop(bbox)
    scale = min((width - 26) / crop.width, target_h / crop.height)
    resized = crop.resize(
        (max(1, int(crop.width * scale)), max(1, int(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = (width - resized.width) // 2 + dx
    y = height - resized.height - baseline_pad + dy
    canvas.alpha_composite(resized, (x, y))
    return canvas


def glow_under_alpha(img: Image.Image, color: tuple[int, int, int], radius: int = 8, strength: float = 0.58) -> Image.Image:
    alpha = img.getchannel("A").filter(ImageFilter.GaussianBlur(radius))
    glow = Image.new("RGBA", img.size, (*color, 0))
    glow.putalpha(alpha.point(lambda p: int(p * strength)))
    return Image.alpha_composite(glow, img)


def pencil_spark(img: Image.Image, phase: int) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    accent = [(34, 211, 238, 135), (168, 85, 247, 145)]
    for i in range(8):
        x = 34 + ((phase * 41 + i * 29) % max(1, img.width - 68))
        y = 44 + ((phase * 53 + i * 23) % max(1, img.height - 92))
        color = accent[(i + phase) % 2]
        draw.line((x - 5, y, x + 7, y - 2), fill=color, width=2)
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), img.getchannel("A").filter(ImageFilter.MaxFilter(9))))
    return Image.alpha_composite(img, overlay)


def make_walk() -> None:
    source = Image.open(PUBLIC / "teleportation_c_walk.png").convert("RGBA")
    source_frames = [
        crop_frame(source, 0, ALLY_WALK_W, ALLY_WALK_H),
        crop_frame(source, 1, ALLY_WALK_W, ALLY_WALK_H),
        crop_frame(source, 2, ALLY_WALK_W, ALLY_WALK_H),
    ]
    order = [0, 1, 2, 1]
    offsets = [(0, 0), (-2, -7), (2, -2), (3, -7)]
    strip = Image.new("RGBA", (WALK_W * 4, WALK_H), (0, 0, 0, 0))
    for i, frame_index in enumerate(order):
        frame = normalize_sprite(source_frames[frame_index], WALK_W, WALK_H, 294, dx=offsets[i][0], dy=offsets[i][1])
        frame = glow_under_alpha(frame, (93, 63, 211), radius=4, strength=0.28)
        frame = pencil_spark(frame, i)
        strip.alpha_composite(frame, (i * WALK_W, 0))
    strip.save(CHAR_DIR / "walk.png")


def make_dash() -> None:
    walk = Image.open(CHAR_DIR / "walk.png").convert("RGBA")
    strip = Image.new("RGBA", (WALK_W * 4, WALK_H), (0, 0, 0, 0))
    for i in range(4):
        base = crop_frame(walk, min(i, 3), WALK_W, WALK_H)
        motion = Image.new("RGBA", (WALK_W, WALK_H), (0, 0, 0, 0))
        for trail in range(3, 0, -1):
            ghost = base.copy()
            ghost.putalpha(ghost.getchannel("A").point(lambda p, t=trail: int(p * (0.13 * t))))
            motion.alpha_composite(ghost, (-trail * 18, trail * 3))
        motion.alpha_composite(base, (i * 5, -i * 2))
        draw = ImageDraw.Draw(motion)
        draw.arc((14 - i * 12, 62, 210 - i * 12, 288), 212, 42, fill=(34, 211, 238, 165), width=7)
        draw.arc((38 - i * 13, 82, 230 - i * 13, 306), 212, 42, fill=(168, 85, 247, 160), width=6)
        strip.alpha_composite(motion, (i * WALK_W, 0))
    strip.save(CHAR_DIR / "dash.png")


def make_attack() -> None:
    source = Image.open(PUBLIC / "teleportation_c_attack.png").convert("RGBA")
    strip = Image.new("RGBA", (ATTACK_W * 5, ATTACK_H), (0, 0, 0, 0))
    for i in range(5):
        src = crop_frame(source, i, ALLY_ATTACK_W, ALLY_ATTACK_H)
        frame = normalize_sprite(src, ATTACK_W, ATTACK_H, 300, baseline_pad=22, dx=[-46, -18, 0, 16, -18][i])
        draw = ImageDraw.Draw(frame)
        if i in (2, 3):
            draw.arc((238, 60, 456, 258), -38, 58, fill=(34, 211, 238, 180), width=8)
            draw.arc((258, 76, 470, 276), -42, 62, fill=(168, 85, 247, 175), width=8)
        frame = glow_under_alpha(frame, (124, 58, 237), radius=5, strength=0.25)
        strip.alpha_composite(frame, (i * ATTACK_W, 0))
    strip.save(CHAR_DIR / "attack.png")


def make_single_poses() -> None:
    walk = Image.open(CHAR_DIR / "walk.png").convert("RGBA")
    run = crop_frame(walk, 1, WALK_W, WALK_H)
    crouch = crop_frame(walk, 2, WALK_W, WALK_H)

    jump = Image.new("RGBA", (WALK_W, WALK_H), (0, 0, 0, 0))
    bbox = alpha_bbox(run)
    sprite = run.crop(bbox).rotate(-8, resample=Image.Resampling.BICUBIC, expand=True)
    jump.alpha_composite(sprite, ((WALK_W - sprite.width) // 2 + 6, WALK_H - sprite.height - 72))
    draw = ImageDraw.Draw(jump)
    draw.arc((28, 222, 230, 350), 202, 352, fill=(34, 211, 238, 185), width=7)
    draw.arc((50, 236, 210, 332), 202, 352, fill=(168, 85, 247, 185), width=6)
    jump = glow_under_alpha(jump, (34, 211, 238), radius=8, strength=0.38)
    jump.save(CHAR_DIR / "jump.png")

    butt = Image.new("RGBA", (WALK_W, WALK_H), (0, 0, 0, 0))
    bbox = alpha_bbox(crouch)
    sprite = crouch.crop(bbox)
    sprite = sprite.resize((int(sprite.width * 1.12), int(sprite.height * 0.84)), Image.Resampling.LANCZOS)
    butt.alpha_composite(sprite, ((WALK_W - sprite.width) // 2, WALK_H - sprite.height - 7))
    draw = ImageDraw.Draw(butt)
    draw.ellipse((34, 292, 222, 346), outline=(168, 85, 247, 230), width=8)
    draw.ellipse((58, 302, 198, 338), outline=(34, 211, 238, 200), width=5)
    butt = glow_under_alpha(butt, (168, 85, 247), radius=8, strength=0.35)
    butt.save(CHAR_DIR / "buttbounce.png")

    dazed = crop_frame(walk, 0, WALK_W, WALK_H)
    draw = ImageDraw.Draw(dazed)
    for x in (84, 148):
        draw.line((x - 7, 72, x + 7, 86), fill=(245, 243, 255, 230), width=3)
        draw.line((x + 7, 72, x - 7, 86), fill=(245, 243, 255, 230), width=3)
    dazed.save(CHAR_DIR / "dazed.png")

    dead = crop_frame(walk, 0, WALK_W, WALK_H).rotate(82, resample=Image.Resampling.BICUBIC, expand=False)
    dead.save(CHAR_DIR / "dead.png")


def update_metadata() -> None:
    path = CHAR_DIR / "metadata.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    data.update(
        {
            "id": "teleportation_c",
            "name": "Teleportation C",
            "frame": {
                "walk": [WALK_W, WALK_H, 4],
                "attack": [ATTACK_W, ATTACK_H, 5],
                "dash": [WALK_W, WALK_H, 4],
            },
            "naturalFacing": "right",
            "scale": 0.5,
            "source": "Derived from the hand-drawn level 3 Teleportation C ally spritesheet.",
            "notes": "Playable PNG sprite pass rebuilt from the hand-drawn ally sheet so it no longer uses the vector-looking placeholder style.",
        }
    )
    path.write_text(json.dumps(data, indent=2) + "\n")


def main() -> None:
    CHAR_DIR.mkdir(parents=True, exist_ok=True)
    make_walk()
    make_dash()
    make_attack()
    make_single_poses()
    update_metadata()
    print("Regenerated Teleportation C playable sprites from the hand-drawn ally sheet.")


if __name__ == "__main__":
    main()
