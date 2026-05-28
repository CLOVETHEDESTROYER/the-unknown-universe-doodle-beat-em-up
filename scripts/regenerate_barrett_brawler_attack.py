from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "public" / "characters" / "barrett"
SOURCE_SHEET = Path.home() / "Downloads" / "barrettSpriteSheet.png"

WALK_W, WALK_H = 256, 360
ATTACK_W, ATTACK_H = 480, 360


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    return img.getchannel("A").getbbox() or (0, 0, img.width, img.height)


def crop_frame(strip: Image.Image, index: int, width: int, height: int) -> Image.Image:
    return strip.crop((index * width, 0, (index + 1) * width, height)).convert("RGBA")


def remove_edge_checker(source: Image.Image) -> Image.Image:
    img = source.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    seen: set[tuple[int, int]] = set()
    stack: list[tuple[int, int]] = []

    def is_bg(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        return r >= 226 and g >= 226 and b >= 226 and max(r, g, b) - min(r, g, b) <= 20

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

    img.putalpha(img.getchannel("A").filter(ImageFilter.MinFilter(3)))
    return img


def source_frames() -> list[Image.Image]:
    source = remove_edge_checker(Image.open(SOURCE_SHEET))
    src_w = source.width // 4
    return [keep_largest_alpha_component(crop_frame(source, i, src_w, source.height)) for i in range(4)]


def keep_largest_alpha_component(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    pixels = alpha.load()
    w, h = img.size
    seen: set[tuple[int, int]] = set()
    largest: list[tuple[int, int]] = []

    for y in range(h):
        for x in range(w):
            if (x, y) in seen or pixels[x, y] < 16:
                continue
            stack = [(x, y)]
            component: list[tuple[int, int]] = []
            while stack:
                px, py = stack.pop()
                if (px, py) in seen or not (0 <= px < w and 0 <= py < h) or pixels[px, py] < 16:
                    continue
                seen.add((px, py))
                component.append((px, py))
                stack.extend(((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)))
            if len(component) > len(largest):
                largest = component

    mask = Image.new("L", img.size, 0)
    mask_pixels = mask.load()
    for x, y in largest:
        mask_pixels[x, y] = pixels[x, y]
    out = img.copy()
    out.putalpha(mask)
    return out


def normalize_source_pose(
    src: Image.Image,
    width: int = ATTACK_W,
    height: int = ATTACK_H,
    target_h: int = 292,
    dx: int = 0,
    dy: int = 0,
    lean: float = 0.0,
    rotate: float = 0.0,
) -> Image.Image:
    bbox = alpha_bbox(src)
    crop = src.crop(bbox)
    scale = min((width - 28) / crop.width, target_h / crop.height)
    resized = crop.resize((max(1, int(crop.width * scale)), max(1, int(crop.height * scale))), Image.Resampling.LANCZOS)
    if rotate:
        resized = resized.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True)
    if lean:
        resized = resized.transform(
            resized.size,
            Image.Transform.AFFINE,
            (1, lean, 0, 0, 1, 0),
            resample=Image.Resampling.BICUBIC,
        )
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((width - resized.width) // 2 + dx, height - resized.height - 18 + dy))
    return canvas


def paste_body(canvas: Image.Image, sprite: Image.Image, dx: int = 0, dy: int = 0, lean: float = 0.0, scale_x: float = 1.0) -> None:
    bbox = alpha_bbox(sprite)
    crop = sprite.crop(bbox)
    if scale_x != 1.0:
      crop = crop.resize((max(1, int(crop.width * scale_x)), crop.height), Image.Resampling.LANCZOS)
    if lean:
        crop = crop.transform(
            crop.size,
            Image.Transform.AFFINE,
            (1, lean, 0, 0, 1, 0),
            resample=Image.Resampling.BICUBIC,
        )
    x = (canvas.width - crop.width) // 2 + dx
    y = canvas.height - crop.height - 18 + dy
    canvas.alpha_composite(crop, (x, y))


def make_fur_arm(length: int, height: int, angle: float, claw_count: int = 4) -> Image.Image:
    pad = 58
    img = Image.new("RGBA", (length + pad * 2, height + pad * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cy = img.height // 2
    x0 = pad
    x1 = pad + length
    fur = (95, 57, 30, 255)
    dark = (25, 18, 13, 240)
    light = (169, 116, 62, 185)

    points = [
        (x0, cy - height // 3),
        (x1 - 34, cy - height // 2),
        (x1 + 6, cy),
        (x1 - 38, cy + height // 2),
        (x0, cy + height // 3),
        (x0 - 10, cy),
    ]
    draw.polygon(points, fill=fur, outline=dark)
    draw.line(points + [points[0]], fill=dark, width=5)
    for i in range(14):
        x = x0 + 8 + i * max(7, length // 15)
        wiggle = (-1) ** i * 8
        draw.line((x, cy - height // 3 + 3, x + 20, cy + wiggle), fill=light, width=2)
        draw.line((x + 3, cy + height // 3 - 2, x + 24, cy - wiggle), fill=(45, 28, 18, 150), width=2)

    claw_base_x = x1 - 4
    for i in range(claw_count):
        claw_y = cy - 28 + i * 18
        claw = [
            (claw_base_x, claw_y - 10),
            (claw_base_x + 52, claw_y - 18),
            (claw_base_x + 62, claw_y - 4),
            (claw_base_x + 10, claw_y + 12),
        ]
        draw.polygon(claw, fill=(247, 222, 174, 255), outline=dark)
        draw.line((claw_base_x + 12, claw_y - 4, claw_base_x + 48, claw_y - 10), fill=(124, 80, 42, 120), width=2)

    img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=130, threshold=2))
    return img.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)


def draw_speed_arcs(draw: ImageDraw.ImageDraw, frame_i: int) -> None:
    colors = [(249, 115, 22, 230), (185, 83, 42, 190), (255, 237, 213, 150)]
    if frame_i == 2:
        boxes = [(250, 78, 438, 214), (270, 96, 456, 238)]
        starts = [-34, -26]
    elif frame_i == 3:
        boxes = [(226, 94, 466, 262), (248, 112, 478, 288), (278, 134, 486, 306)]
        starts = [-22, -18, -12]
    else:
        boxes = [(274, 86, 466, 232), (298, 108, 480, 252)]
        starts = [-5, 0]
    for idx, box in enumerate(boxes):
        draw.arc(box, starts[idx], 36 + idx * 8, fill=colors[idx % len(colors)], width=5)
    for k in range(5):
        y = 110 + frame_i * 9 + k * 17
        draw.line((296 + k * 13, y, 408 + k * 13, y - 18), fill=(120, 53, 15, 160), width=2)


def scratch_texture(img: Image.Image, phase: int) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for i in range(44):
        x = (phase * 37 + i * 41) % img.width
        y = 34 + ((phase * 19 + i * 17) % max(1, img.height - 68))
        draw.line((x, y, x + 12, y - 2), fill=(255, 255, 255, 22), width=1)
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), img.getchannel("A").filter(ImageFilter.MaxFilter(5))))
    return Image.alpha_composite(img, overlay)


def main() -> None:
    src = source_frames()
    pose_plan = [
        # guard, wind-up, commit, impact, follow-through
        (src[0], -70, 0, 0.0, 0.0, 286),
        (src[1], -78, -5, -0.04, 0.0, 292),
        (src[2], -74, -2, 0.0, 0.0, 294),
        (src[3], 4, 4, 0.0, 0.0, 298),
        (src[3], 20, 7, 0.0, 3.0, 294),
    ]

    strip = Image.new("RGBA", (ATTACK_W * 5, ATTACK_H), (0, 0, 0, 0))
    for i in range(5):
        source_pose, dx, dy, lean, rotate, target_h = pose_plan[i]
        canvas = normalize_source_pose(source_pose, dx=dx, dy=dy, lean=lean, rotate=rotate, target_h=target_h)
        fx = Image.new("RGBA", (ATTACK_W, ATTACK_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(fx)
        if i >= 1:
            draw_speed_arcs(draw, i)
        if i == 1:
            draw.arc((140, 76, 316, 236), 186, 286, fill=(249, 115, 22, 155), width=5)
        if i == 2:
            draw.arc((206, 70, 424, 246), 210, 356, fill=(255, 237, 213, 125), width=6)
        if i == 3:
            draw.arc((224, 84, 474, 286), -28, 52, fill=(248, 113, 113, 170), width=8)
            draw.arc((248, 104, 486, 306), -18, 44, fill=(249, 115, 22, 210), width=7)
        if i == 4:
            draw.arc((188, 118, 456, 324), -10, 58, fill=(249, 115, 22, 180), width=6)
            draw.arc((210, 136, 480, 338), -6, 45, fill=(248, 113, 113, 140), width=5)
        canvas = Image.alpha_composite(canvas, fx)
        canvas = scratch_texture(canvas, i)
        strip.alpha_composite(canvas, (i * ATTACK_W, 0))

    strip.save(CHAR_DIR / "attack.png")
    print("Regenerated Barrett brawler attack sprite.")


if __name__ == "__main__":
    main()
