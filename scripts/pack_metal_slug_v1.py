"""Pack generated Metal Slug hand-drawn sprites into transparent WebP runtime assets.

Uses exterior flood-fill background keying (so interior white shirts, sneakers,
medkit pouches, and comic starburst centers stay 100% opaque) and normalizes
X-God aim sheets to the exact 768x512 (baseline y=480) drawn-v1 cell geometry.
"""
from collections import deque
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "art" / "metal-slug-v1"
XGOD_OUT = ROOT / "public" / "characters" / "xgod" / "drawn-v1"
MS_OUT = ROOT / "public" / "metal-slug-v1"

BRAIN = Path(r"C:\Users\analo\.gemini\antigravity\brain\87e31531-a6e7-4a80-8db4-908b541021ff")

SOURCES = {
    "xgod-aim-up-source.jpg": BRAIN / "xgod_aim_up_source_v2_1795753703366.jpg",
    "xgod-aim-up-diag-source.jpg": BRAIN / "xgod_aim_up_diag_source_v2_1795753706215.jpg",
    "xgod-aim-down-source.jpg": BRAIN / "xgod_aim_down_source_v2_1795753712654.jpg",
    "props-sheet-source.jpg": BRAIN / "props_sheet_source_1795753686429.jpg",
    "items-sheet-source.jpg": BRAIN / "items_sheet_source_1795753692760.jpg",
    "go-arrow-source.jpg": BRAIN / "go_arrow_source_1795753689834.jpg",
    "popup-burst-source.jpg": BRAIN / "popup_burst_source_1795753695602.jpg",
}


def remove_exterior_white(img: Image.Image, threshold: int = 236, feather: int = 212) -> Image.Image:
    """Flood-fill near-white pixels connected to image borders, preserving interior whites."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    visited = bytearray(w * h)
    bg = bytearray(w * h)
    q = deque()

    def is_white(r: int, g: int, b: int) -> bool:
        return r >= threshold and g >= threshold and b >= threshold and (max(r, g, b) - min(r, g, b)) <= 24

    for x in range(w):
        for y in (0, h - 1):
            idx = y * w + x
            if not visited[idx] and is_white(*px[x, y][:3]):
                visited[idx] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            idx = y * w + x
            if not visited[idx] and is_white(*px[x, y][:3]):
                visited[idx] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        idx = y * w + x
        bg[idx] = 1
        px[x, y] = (255, 255, 255, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not visited[nidx]:
                    visited[nidx] = 1
                    r, g, b, _ = px[nx, ny]
                    if is_white(r, g, b):
                        q.append((nx, ny))

    # Soften 1-2px JPEG white halo directly touching cleared background pixels
    for _ in range(2):
        to_soften = []
        for y in range(1, h - 1):
            row = y * w
            for x in range(1, w - 1):
                idx = row + x
                if bg[idx]:
                    continue
                if bg[idx - 1] or bg[idx + 1] or bg[idx - w] or bg[idx + w]:
                    r, g, b, a = px[x, y]
                    lum = (r + g + b) // 3
                    sat = max(r, g, b) - min(r, g, b)
                    if lum >= feather and sat <= 28:
                        new_a = int(a * max(0.0, (threshold - lum) / max(1, threshold - feather)))
                        to_soften.append((x, y, (r, g, b, new_a), new_a == 0))
        for x, y, color, became_bg in to_soften:
            px[x, y] = color
            if became_bg:
                bg[y * w + x] = 1

    return rgba


def trim_alpha(img: Image.Image, min_alpha: int = 18) -> Image.Image:
    alpha = img.getchannel("A")
    mask = alpha.point(lambda v: 255 if v >= min_alpha else 0)
    bbox = mask.getbbox()
    return img.crop(bbox) if bbox else img


def fit_centered(img: Image.Image, size: tuple[int, int], pad: int = 4) -> Image.Image:
    tw, th = size
    trimmed = trim_alpha(img)
    scale = min((tw - pad * 2) / max(1, trimmed.width), (th - pad * 2) / max(1, trimmed.height))
    nw = max(1, round(trimmed.width * scale))
    nh = max(1, round(trimmed.height * scale))
    resized = trimmed.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2), resized)
    return canvas


def pack_xgod_3frame(source_path: Path, out_path: Path, target_body_height: int, baseline_y: int, midair: bool = False):
    """Split a 3-column horizontal strip into 3x (768x512) frames sharing one consistent scale."""
    src = Image.open(source_path)
    w, h = src.size
    col_w = w // 3
    cells = [remove_exterior_white(src.crop((i * col_w, 0, (i + 1) * col_w if i < 2 else w, h))) for i in range(3)]
    trimmed = [trim_alpha(c) for c in cells]

    # Use Frame 0 (no muzzle flash) as the reference body height so Frame 1 doesn't shrink when firing!
    ref_h = trimmed[0].height
    scale = target_body_height / max(1, ref_h)

    # Also ensure Frame 1 (with upward/downward muzzle burst) never clips out of 512px height
    max_frame_h = max(t.height for t in trimmed)
    if max_frame_h * scale > 470:
        scale = min(scale, 470 / max_frame_h)

    sheet = Image.new("RGBA", (768 * 3, 512), (0, 0, 0, 0))
    for i, frame in enumerate(trimmed):
        nw = max(1, round(frame.width * scale))
        nh = max(1, round(frame.height * scale))
        resized = frame.resize((nw, nh), Image.Resampling.LANCZOS)
        x = i * 768 + (768 - nw) // 2
        if midair:
            # Align tops across midair frames so downward muzzle flash extends below the knees cleanly
            y = max(14, min(512 - nh - 8, 92 if i != 2 else 74))
        else:
            # Grounded poses share the exact y=480 sneaker baseline from drawn-v1/metadata.json
            y = max(6, baseline_y - nh)
        sheet.paste(resized, (x, y), resized)

    sheet.save(out_path, format="WEBP", lossless=False, quality=92, method=6, exact=True)
    print(f"Saved {out_path.relative_to(ROOT)} ({sheet.size[0]}x{sheet.size[1]}, {out_path.stat().st_size // 1024} KB)")


def save_webp(img: Image.Image, out_path: Path, size: tuple[int, int]):
    fitted = fit_centered(img, size)
    fitted.save(out_path, format="WEBP", lossless=False, quality=92, method=6, exact=True)
    print(f"Saved {out_path.relative_to(ROOT)} ({size[0]}x{size[1]}, {out_path.stat().st_size // 1024} KB)")


def main():
    ART_DIR.mkdir(parents=True, exist_ok=True)
    MS_OUT.mkdir(parents=True, exist_ok=True)

    # Preserve editable source artwork in art/metal-slug-v1/
    for name, src in SOURCES.items():
        dest = ART_DIR / name
        if src.exists():
            shutil.copy2(src, dest)

    # 1. X-God Aim Sprite Sheets (768x512 x 3 frames, matching drawn-v1/blaster-attack.png)
    pack_xgod_3frame(ART_DIR / "xgod-aim-up-source.jpg", XGOD_OUT / "blaster-aim-up.webp", target_body_height=348, baseline_y=480)
    pack_xgod_3frame(ART_DIR / "xgod-aim-up-diag-source.jpg", XGOD_OUT / "blaster-aim-up-diag.webp", target_body_height=342, baseline_y=480)
    pack_xgod_3frame(ART_DIR / "xgod-aim-down-source.jpg", XGOD_OUT / "blaster-aim-down.webp", target_body_height=300, baseline_y=480, midair=True)

    # 2. Battlefield Props (2x2 sheet)
    props = Image.open(ART_DIR / "props-sheet-source.jpg")
    pw, ph = props.size
    mx, my = pw // 2, ph // 2
    save_webp(remove_exterior_white(props.crop((0, 0, mx, my))), MS_OUT / "barrel.webp", (160, 196))
    save_webp(remove_exterior_white(props.crop((mx, 0, pw, my))), MS_OUT / "barricade.webp", (220, 200))
    save_webp(remove_exterior_white(props.crop((0, my, mx, ph))), MS_OUT / "ammo-crate.webp", (180, 160))
    save_webp(remove_exterior_white(props.crop((mx, my, pw, ph))), MS_OUT / "crush-crate.webp", (200, 200))

    # 3. Pickups & Winch Switch (3 top, 2 bottom)
    items = Image.open(ART_DIR / "items-sheet-source.jpg")
    iw, ih = items.size
    row_split = int(ih * 0.50)
    t3 = iw // 3
    b2 = iw // 2
    save_webp(remove_exterior_white(items.crop((0, 0, t3, row_split))), MS_OUT / "grenade.webp", (96, 96))
    save_webp(remove_exterior_white(items.crop((t3, 0, t3 * 2, row_split))), MS_OUT / "medkit.webp", (112, 112))
    save_webp(remove_exterior_white(items.crop((t3 * 2, 0, iw, row_split))), MS_OUT / "bomb-pack.webp", (112, 112))
    save_webp(remove_exterior_white(items.crop((0, row_split, b2, ih))), MS_OUT / "medal.webp", (112, 112))
    save_webp(remove_exterior_white(items.crop((b2, row_split, iw, ih))), MS_OUT / "winch-switch.webp", (128, 128))

    # 4. Arcade Comic Pop-Up Graphics
    go_img = remove_exterior_white(Image.open(ART_DIR / "go-arrow-source.jpg"))
    save_webp(go_img, MS_OUT / "go-arrow.webp", (360, 220))
    burst_img = remove_exterior_white(Image.open(ART_DIR / "popup-burst-source.jpg"))
    save_webp(burst_img, MS_OUT / "popup-burst.webp", (360, 230))


if __name__ == "__main__":
    main()
