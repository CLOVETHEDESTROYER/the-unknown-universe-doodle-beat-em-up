"""Pack Pass 2 hand-drawn Metal Slug set-piece & architecture sprites into transparent WebPs.

Crops and keys:
- watchtower.webp & watchtower-rubble.webp
- blast-gate.webp, blast-gate-broken.webp, & lock-gate.webp
- bunker-facade.webp, cantilever-bracket.webp, truss-girder.webp, & sandbags.webp
- drawbridge-deck.webp & trestle-plank.webp (composited directly from the real hand-drawn wood/steel art!)
- lantern.webp & pennant.webp (hand-inked comic-shaded sprites matching the palette)
"""
from collections import deque
from pathlib import Path
import random
import shutil
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "art" / "metal-slug-v1"
MS_OUT = ROOT / "public" / "metal-slug-v1"
BRAIN = Path(r"C:\Users\analo\.gemini\antigravity\brain\87e31531-a6e7-4a80-8db4-908b541021ff")

SOURCES = {
    "watchtower-sheet-source.jpg": BRAIN / "watchtower_sheet_source_1795756679380.jpg",
    "gates-sheet-source.jpg": BRAIN / "gates_sheet_source_jpg_1795756680398.jpg",
    "arch-pieces-sheet-source.jpg": BRAIN / "arch_pieces_sheet_source_1795756681989.jpg",
}


def key_background(
    img: Image.Image,
    include_interior_white: bool = False,
    threshold: int = 234,
    feather: int = 208,
    max_sat: int = 22,
    red_halo_soften: bool = False,
) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    bg = bytearray(w * h)

    def is_bg_pixel(r: int, g: int, b: int) -> bool:
        sat = max(r, g, b) - min(r, g, b)
        if r >= threshold and g >= threshold and b >= threshold and sat <= max_sat:
            return True
        if red_halo_soften and r >= 238 and g >= 216 and b >= 216 and (r - b) <= 36:
            return True
        return False

    if include_interior_white:
        for y in range(h):
            row = y * w
            for x in range(w):
                r, g, b, _ = px[x, y]
                if is_bg_pixel(r, g, b):
                    bg[row + x] = 1
                    px[x, y] = (255, 255, 255, 0)
    else:
        visited = bytearray(w * h)
        q = deque()
        for x in range(w):
            for y in (0, h - 1):
                idx = y * w + x
                if not visited[idx] and is_bg_pixel(*px[x, y][:3]):
                    visited[idx] = 1
                    q.append((x, y))
        for y in range(h):
            for x in (0, w - 1):
                idx = y * w + x
                if not visited[idx] and is_bg_pixel(*px[x, y][:3]):
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
                        if is_bg_pixel(*px[nx, ny][:3]):
                            q.append((nx, ny))

    # 2-pass border feather to dissolve JPEG halos
    for _ in range(2):
        updates = []
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
                    if lum >= feather and sat <= max_sat + 14:
                        new_a = int(a * max(0.0, (threshold - lum) / max(1, threshold - feather)))
                        updates.append((x, y, (r, g, b, new_a), new_a == 0))
                    elif red_halo_soften and lum >= 210 and r > g + 8 and r > b + 8:
                        new_a = int(a * max(0.0, (245 - lum) / 45.0))
                        updates.append((x, y, (r, g, b, new_a), new_a == 0))
        for x, y, color, became_bg in updates:
            px[x, y] = color
            if became_bg:
                bg[y * w + x] = 1
    return rgba


def trim_alpha(img: Image.Image, min_alpha: int = 20) -> Image.Image:
    alpha = img.getchannel("A")
    mask = alpha.point(lambda v: 255 if v >= min_alpha else 0)
    bbox = mask.getbbox()
    return img.crop(bbox) if bbox else img


def fit_box(img: Image.Image, max_size: tuple[int, int], pad: int = 4) -> Image.Image:
    trimmed = trim_alpha(img)
    mw, mh = max_size
    scale = min((mw - pad * 2) / max(1, trimmed.width), (mh - pad * 2) / max(1, trimmed.height))
    nw = max(1, round(trimmed.width * scale))
    nh = max(1, round(trimmed.height * scale))
    resized = trimmed.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (nw + pad * 2, nh + pad * 2), (0, 0, 0, 0))
    out.paste(resized, (pad, pad), resized)
    return out


def build_drawbridge_deck(watchtower_src: Image.Image, truss_img: Image.Image) -> Image.Image:
    """Composite a hand-drawn timber-and-steel drawbridge deck from real generated wood & steel art."""
    # Extract the crisp hand-drawn horizontal wooden roof deck plank strip from watchtower
    wt_w, wt_h = watchtower_src.size
    deck_crop = watchtower_src.crop((int(wt_w * 0.05), int(wt_h * 0.13), int(wt_w * 0.42), int(wt_h * 0.19)))
    deck_keyed = trim_alpha(key_background(deck_crop, include_interior_white=True))
    # Build a sturdy 360x60 horizontal riveted timber bridge beam
    out = Image.new("RGBA", (360, 62), (0, 0, 0, 0))
    # Tile 2 slightly overlapping hand-drawn wood plank strips across the span
    plank = deck_keyed.resize((190, 44), Image.Resampling.LANCZOS)
    out.paste(plank, (16, 10), plank)
    out.paste(plank.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (156, 10), plank.transpose(Image.Transpose.FLIP_LEFT_RIGHT))

    # Add riveted iron end straps & center splice plate sampled from truss_girder
    truss_trim = trim_alpha(truss_img)
    steel_bar = truss_trim.crop((0, 0, truss_trim.width, int(truss_trim.height * 0.24)))
    top_trim = steel_bar.resize((332, 14), Image.Resampling.LANCZOS)
    out.paste(top_trim, (14, 42), top_trim)

    draw = ImageDraw.Draw(out)
    ink = (27, 21, 38, 255)
    # Chunky comic iron straps & gold hinge knuckle on the left
    for sx in (14, 118, 224, 330):
        draw.rounded_rectangle([sx, 8, sx + 16, 54], radius=3, fill=(68, 76, 96, 255), outline=ink, width=3)
        draw.ellipse([sx + 5, 16, sx + 11, 22], fill=(180, 194, 214, 255), outline=ink, width=1)
        draw.ellipse([sx + 5, 38, sx + 11, 44], fill=(180, 194, 214, 255), outline=ink, width=1)
    # Left brass hinge collar
    draw.ellipse([4, 14, 38, 48], fill=(238, 178, 44, 255), outline=ink, width=4)
    draw.ellipse([13, 23, 29, 39], fill=(92, 74, 52, 255), outline=ink, width=3)
    draw.rounded_rectangle([14, 10, 348, 52], radius=4, outline=ink, width=4)
    return out


def build_trestle_plank(watchtower_src: Image.Image) -> Image.Image:
    """Composite a single collapsing trestle bridge section from the hand-drawn watchtower stilts & plank."""
    wt_w, wt_h = watchtower_src.size
    # Grab the clean wooden platform + cross-braced wooden stilt bay from watchtower!
    stilt_crop = watchtower_src.crop((int(wt_w * 0.08), int(wt_h * 0.44), int(wt_w * 0.39), int(wt_h * 0.72)))
    stilt_keyed = trim_alpha(key_background(stilt_crop, include_interior_white=True, threshold=228))
    out = Image.new("RGBA", (112, 220), (0, 0, 0, 0))
    # Resize stilt bay cleanly into the bottom 178px
    stilts = stilt_keyed.resize((98, 182), Image.Resampling.LANCZOS)
    out.paste(stilts, (7, 34), stilts)
    # Grab crisp top wooden deck plank cap
    cap_crop = watchtower_src.crop((int(wt_w * 0.08), int(wt_h * 0.43), int(wt_w * 0.39), int(wt_h * 0.49)))
    cap_keyed = trim_alpha(key_background(cap_crop, include_interior_white=True, threshold=228))
    cap = cap_keyed.resize((104, 38), Image.Resampling.LANCZOS)
    out.paste(cap, (4, 4), cap)
    draw = ImageDraw.Draw(out)
    ink = (27, 21, 38, 255)
    # Rivet bolts on deck cap
    for rx in (16, 56, 96):
        draw.ellipse([rx - 5, 16, rx + 5, 26], fill=(196, 206, 222, 255), outline=ink, width=2)
    return out


def add_comic_grain(img: Image.Image, strength: int = 8) -> Image.Image:
    rng = random.Random(42)
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 30:
                n = rng.randint(-strength, strength)
                px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)), a)
    return img


def build_lantern() -> Image.Image:
    """Hand-inked comic wrought-iron lantern with warm glowing glass & soft bloom."""
    out = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    # Warm glow halo
    glow = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([12, 34, 116, 142], fill=(255, 205, 86, 95))
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    out.alpha_composite(glow)

    draw = ImageDraw.Draw(out)
    ink = (24, 18, 34, 255)
    iron = (62, 68, 86, 255)
    iron_hi = (118, 128, 152, 255)

    # Top hanging ring & cap
    draw.ellipse([50, 8, 78, 36], outline=ink, width=6)
    draw.ellipse([52, 10, 76, 34], outline=iron_hi, width=2)
    draw.polygon([(30, 56), (64, 26), (98, 56)], fill=iron, outline=ink)
    draw.line([(30, 56), (64, 26), (98, 56), (30, 56)], fill=ink, width=5)
    draw.line([(44, 48), (64, 32)], fill=iron_hi, width=3)

    # Lantern glass body (gradient warm amber -> bright cream center)
    draw.polygon([(36, 56), (92, 56), (84, 122), (44, 122)], fill=(247, 158, 42, 255), outline=ink)
    draw.polygon([(44, 62), (84, 62), (78, 116), (50, 116)], fill=(255, 214, 92, 255))
    draw.ellipse([52, 74, 76, 108], fill=(255, 248, 196, 255))

    # Iron cage bars & base
    draw.line([(36, 56), (44, 122)], fill=ink, width=5)
    draw.line([(92, 56), (84, 122)], fill=ink, width=5)
    draw.line([(64, 56), (64, 122)], fill=ink, width=4)
    draw.line([(38, 88), (90, 88)], fill=ink, width=4)
    draw.rounded_rectangle([32, 50, 96, 62], radius=4, fill=iron, outline=ink, width=4)
    draw.rounded_rectangle([38, 118, 90, 134], radius=5, fill=iron, outline=ink, width=4)
    draw.polygon([(48, 134), (80, 134), (64, 148)], fill=iron, outline=ink)
    draw.line([(48, 134), (64, 148), (80, 134)], fill=ink, width=4)
    return add_comic_grain(out, 6)


def build_pennant() -> Image.Image:
    """Hand-inked comic tattered crimson outpost pennant on an iron pole."""
    out = Image.new("RGBA", (180, 240), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    ink = (24, 18, 34, 255)
    # Iron flagpole with finial ball & ground bracket
    draw.rounded_rectangle([14, 26, 28, 232], radius=4, fill=(76, 82, 104, 255), outline=ink, width=4)
    draw.line([(18, 32), (18, 224)], fill=(138, 148, 174, 255), width=2)
    draw.ellipse([10, 10, 32, 32], fill=(238, 182, 56, 255), outline=ink, width=4)
    draw.rounded_rectangle([6, 220, 36, 234], radius=4, fill=(58, 62, 78, 255), outline=ink, width=4)

    # Tattered waving swallowtail banner with shading fold & comic ink lines
    pts = [(26, 36), (164, 54), (138, 78), (168, 102), (96, 108), (26, 112)]
    draw.polygon(pts, fill=(216, 48, 62, 255))
    # Darker cloth fold shadow along lower half
    fold = [(26, 82), (94, 76), (138, 78), (168, 102), (96, 108), (26, 112)]
    draw.polygon(fold, fill=(166, 28, 44, 255))
    # Bright comic gold trim stripe & star emblem
    draw.line([(28, 46), (150, 60)], fill=(250, 204, 78, 255), width=5)
    draw.line([(28, 100), (146, 94)], fill=(250, 204, 78, 255), width=4)
    # Bold hand-inked outline & cloth crease hatch marks
    draw.line(pts + [pts[0]], fill=ink, width=5)
    draw.line([(56, 62), (82, 66)], fill=ink, width=3)
    draw.line([(68, 86), (104, 84)], fill=ink, width=3)
    # Rope rings attaching flag to pole
    for ry in (42, 74, 104):
        draw.rounded_rectangle([12, ry - 4, 30, ry + 4], radius=3, fill=(214, 180, 116, 255), outline=ink, width=2)
    return add_comic_grain(out, 7)


def main():
    ART_DIR.mkdir(parents=True, exist_ok=True)
    MS_OUT.mkdir(parents=True, exist_ok=True)

    for dest_name, src_path in SOURCES.items():
        if src_path.exists():
            shutil.copy2(src_path, ART_DIR / dest_name)

    # 1. Watchtower & Rubble (2-column split)
    wt_src = Image.open(ART_DIR / "watchtower-sheet-source.jpg")
    w, h = wt_src.size
    wt_left = key_background(wt_src.crop((0, 0, int(w * 0.46), h)), include_interior_white=True, threshold=230)
    wt_right = key_background(wt_src.crop((int(w * 0.47), 0, w, h)), include_interior_white=False, threshold=234)
    fit_box(wt_left, (280, 360)).save(MS_OUT / "watchtower.webp", "WEBP", quality=92, method=6)
    fit_box(wt_right, (280, 160)).save(MS_OUT / "watchtower-rubble.webp", "WEBP", quality=92, method=6)

    # 2. Blast Gate, Breached Wreckage, Lock Gate (3-column split)
    gt_src = Image.open(ART_DIR / "gates-sheet-source.jpg")
    gw, gh = gt_src.size
    gt_left = key_background(gt_src.crop((0, 0, int(gw * 0.305), gh)), include_interior_white=False, threshold=232, red_halo_soften=True)
    gt_mid = key_background(gt_src.crop((int(gw * 0.305), 0, int(gw * 0.71), gh)), include_interior_white=True, threshold=232)
    gt_right = key_background(gt_src.crop((int(gw * 0.71), 0, gw, gh)), include_interior_white=True, threshold=230)
    fit_box(gt_left, (170, 320)).save(MS_OUT / "blast-gate.webp", "WEBP", quality=92, method=6)
    fit_box(gt_mid, (220, 130)).save(MS_OUT / "blast-gate-broken.webp", "WEBP", quality=92, method=6)
    fit_box(gt_right, (170, 320)).save(MS_OUT / "lock-gate.webp", "WEBP", quality=92, method=6)

    # 3. Architectural Pieces (2x2 split, inset 14px from center grid lines so `+` lines never appear!)
    ar_src = Image.open(ART_DIR / "arch-pieces-sheet-source.jpg")
    aw, ah = ar_src.size
    mx, my = aw // 2, ah // 2
    pad = 14
    bunker_img = key_background(ar_src.crop((0, 0, mx - pad, my - pad)), include_interior_white=False, threshold=232)
    canti_img = key_background(ar_src.crop((mx + pad, 0, aw, my - pad)), include_interior_white=True, threshold=232)
    truss_img = key_background(ar_src.crop((0, my + pad, mx - pad, ah)), include_interior_white=True, threshold=232)
    sandbags_img = key_background(ar_src.crop((mx + pad, my + pad, aw, ah)), include_interior_white=False, threshold=232)

    fit_box(bunker_img, (340, 300)).save(MS_OUT / "bunker-facade.webp", "WEBP", quality=92, method=6)
    fit_box(canti_img, (260, 260)).save(MS_OUT / "cantilever-bracket.webp", "WEBP", quality=92, method=6)
    fit_box(truss_img, (360, 120)).save(MS_OUT / "truss-girder.webp", "WEBP", quality=92, method=6)
    fit_box(sandbags_img, (260, 100)).save(MS_OUT / "sandbags.webp", "WEBP", quality=92, method=6)

    # 4. Composited hand-drawn timber bridges & comic ambient props
    build_drawbridge_deck(wt_src, truss_img).save(MS_OUT / "drawbridge-deck.webp", "WEBP", quality=92, method=6)
    build_trestle_plank(wt_src).save(MS_OUT / "trestle-plank.webp", "WEBP", quality=92, method=6)
    build_lantern().save(MS_OUT / "lantern.webp", "WEBP", quality=92, method=6)
    build_pennant().save(MS_OUT / "pennant.webp", "WEBP", quality=92, method=6)

    # Generate quick contact sheet on checkered background for visual QA
    names = [
        "watchtower.webp", "watchtower-rubble.webp", "blast-gate.webp", "blast-gate-broken.webp",
        "lock-gate.webp", "bunker-facade.webp", "cantilever-bracket.webp", "truss-girder.webp",
        "sandbags.webp", "drawbridge-deck.webp", "trestle-plank.webp", "lantern.webp", "pennant.webp",
    ]
    sheet = Image.new("RGBA", (1200, 900), (45, 52, 72, 255))
    d = ImageDraw.Draw(sheet)
    for gy in range(0, 900, 24):
        for gx in range(0, 1200, 24):
            if (gx // 24 + gy // 24) % 2 == 0:
                d.rectangle([gx, gy, gx + 24, gy + 24], fill=(56, 64, 88, 255))
    for i, name in enumerate(names):
        im = Image.open(MS_OUT / name)
        col, row = i % 4, i // 4
        cx, cy = col * 300 + 150, row * 225 + 112
        thumb = im.copy()
        thumb.thumbnail((260, 195), Image.Resampling.LANCZOS)
        sheet.alpha_composite(thumb, (cx - thumb.width // 2, cy - thumb.height // 2))
        print(f"Packed {name}: {im.size} ({(MS_OUT / name).stat().st_size // 1024} KB)")
    sheet.save(BRAIN / "scratch" / "ms_v2_contact_sheet.png")
    print("Saved QA contact sheet!")


if __name__ == "__main__":
    main()
