#!/usr/bin/env python3
"""Build the registered and trimmed X-God cutout-rig art package."""

from __future__ import annotations

import json
import os
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_NAME = os.environ.get("XGOD_RIG_PACKAGE", "xgod-rig-v1")
PACKAGE = ROOT / "art" / PACKAGE_NAME
MASTER_PATH = PACKAGE / "master" / "xgod-rig-master.png"
REGISTERED_DIR = PACKAGE / "parts" / "registered"
TRIMMED_DIR = PACKAGE / "parts" / "trimmed"
PREVIEW_DIR = PACKAGE / "previews"

CANVAS_SIZE = (1024, 1024)
BASELINE_Y = 954
ROOT_PIVOT = (505, 696)
TRIM_PADDING = 16


PARTS = [
    {
        "name": "pelvis",
        "parent": None,
        "pivot": ROOT_PIVOT,
        "z": 30,
        "role": "Narrow waistband and crotch cover; thigh mass belongs to the moving legs",
        "shapes": [("polygon", [(425, 670), (568, 670), (563, 701), (430, 701)])],
    },
    {
        "name": "sleeve_left_back",
        "parent": "arm_left_upper_back",
        "pivot": (431, 568),
        "z": 10.25,
        "role": "Moving left/back shirt sleeve cap, attached to the upper arm",
        "shapes": [("polygon", [(384, 539), (429, 533), (460, 562), (434, 605), (392, 577)])],
    },
    {
        "name": "arm_left_upper_back",
        "parent": "torso_shirt",
        "pivot": (431, 568),
        "z": 10,
        "role": "Anatomical left/back upper arm",
        "shapes": [("line", [(418, 585), (389, 632)], 38)],
    },
    {
        "name": "arm_left_forearm_back",
        "parent": "arm_left_upper_back",
        "pivot": (389, 632),
        "z": 11,
        "role": "Anatomical left/back forearm",
        "shapes": [("line", [(392, 621), (357, 673)], 38)],
    },
    {
        "name": "hand_left_back",
        "parent": "arm_left_forearm_back",
        "pivot": (355, 682),
        "z": 12,
        "role": "Anatomical left/back hand",
        "shapes": [("ellipse", (313, 651, 393, 735))],
    },
    {
        "name": "leg_left_thigh_pocket_back",
        "parent": "pelvis",
        "pivot": (478, 718),
        "z": 20,
        "role": "Permanent pocketed anatomical left/back thigh",
        "shapes": [
            ("polygon", [(421, 696), (505, 696), (510, 775), (475, 838), (392, 853), (386, 811), (418, 733)]),
        ],
    },
    {
        "name": "leg_left_shin_back",
        "parent": "leg_left_thigh_pocket_back",
        "pivot": (438, 820),
        "z": 21,
        "role": "Anatomical left/back shin",
        "shapes": [
            ("polygon", [(388, 795), (482, 795), (475, 864), (452, 918), (358, 923), (370, 865)]),
        ],
    },
    {
        "name": "foot_left_back",
        "parent": "leg_left_shin_back",
        "pivot": (405, 895),
        "z": 22,
        "role": "Anatomical left/back shoe",
        "shapes": [("polygon", [(338, 872), (489, 872), (516, 970), (326, 970)])],
    },
    {
        "name": "leg_right_thigh_plain_front",
        "parent": "pelvis",
        "pivot": (523, 718),
        "z": 40,
        "role": "Permanent plain anatomical right/front thigh",
        "shapes": [
            ("polygon", [(503, 696), (563, 696), (583, 809), (578, 846), (500, 845), (490, 774)]),
        ],
    },
    {
        "name": "leg_right_shin_front",
        "parent": "leg_right_thigh_plain_front",
        "pivot": (545, 821),
        "z": 41,
        "role": "Anatomical right/front shin",
        "shapes": [
            ("polygon", [(497, 795), (587, 795), (622, 922), (500, 925), (496, 860)]),
        ],
    },
    {
        "name": "foot_right_front",
        "parent": "leg_right_shin_front",
        "pivot": (548, 895),
        "z": 42,
        "role": "Anatomical right/front shoe",
        "shapes": [("polygon", [(490, 870), (662, 870), (681, 970), (486, 970)])],
    },
    {
        "name": "sleeve_right_front",
        "parent": "arm_right_upper_front",
        "pivot": (553, 570),
        "z": 70.25,
        "role": "Moving right/front shirt sleeve cap, attached to the upper arm",
        "shapes": [("polygon", [(532, 534), (570, 540), (594, 569), (568, 607), (536, 577)])],
    },
    {
        "name": "torso_shirt",
        "parent": "pelvis",
        "pivot": (505, 684),
        "z": 50,
        "role": "Core torso and shirt body; sleeve caps are separate moving parts",
        "shapes": [
            ("polygon", [(424, 494), (535, 485), (554, 539), (546, 578), (562, 695), (426, 699), (430, 580), (405, 555)]),
        ],
    },
    {
        "name": "head_hair",
        "parent": "torso_shirt",
        "pivot": (498, 507),
        "z": 60,
        "role": "Locked canonical head, face, ear, neck, and hair silhouette",
        "shapes": [
            ("polygon", [(298, 126), (730, 126), (730, 526), (565, 535), (500, 540), (393, 520), (298, 444)]),
        ],
    },
    {
        "name": "arm_right_upper_front",
        "parent": "torso_shirt",
        "pivot": (553, 570),
        "z": 70,
        "role": "Anatomical right/front upper arm",
        "shapes": [("line", [(565, 585), (600, 629)], 38)],
    },
    {
        "name": "arm_right_forearm_front",
        "parent": "arm_right_upper_front",
        "pivot": (600, 629),
        "z": 71,
        "role": "Anatomical right/front forearm",
        "shapes": [("line", [(592, 620), (632, 669)], 38)],
    },
    {
        "name": "hand_right_front",
        "parent": "arm_right_forearm_front",
        "pivot": (633, 676),
        "z": 72,
        "role": "Anatomical right/front hand",
        "shapes": [("ellipse", (606, 646, 682, 725))],
    },
]


def draw_shapes(size: tuple[int, int], shapes: list[tuple]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for shape in shapes:
        kind, payload, *rest = shape
        if kind == "polygon":
            draw.polygon(payload, fill=255)
        elif kind == "ellipse":
            draw.ellipse(payload, fill=255)
        elif kind == "line":
            draw.line(payload, fill=255, width=rest[0], joint="curve")
            radius = rest[0] // 2
            for x, y in (payload[0], payload[-1]):
                draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)
        else:
            raise ValueError(f"Unknown mask shape: {kind}")
    return mask


def apply_mask(source: Image.Image, mask: Image.Image) -> Image.Image:
    part = source.copy()
    source_alpha = source.getchannel("A")
    part.putalpha(Image.composite(source_alpha, Image.new("L", source.size, 0), mask))
    return part


def keep_largest_component(part: Image.Image) -> Image.Image:
    alpha = np.array(part.getchannel("A"))
    opaque = alpha > 0
    visited = np.zeros_like(opaque, dtype=bool)
    components: list[list[tuple[int, int]]] = []
    height, width = opaque.shape
    for y in range(height):
        for x in range(width):
            if not opaque[y, x] or visited[y, x]:
                continue
            component: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[y, x] = True
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx, ny in (
                    (cx - 1, cy),
                    (cx + 1, cy),
                    (cx, cy - 1),
                    (cx, cy + 1),
                    (cx - 1, cy - 1),
                    (cx + 1, cy - 1),
                    (cx - 1, cy + 1),
                    (cx + 1, cy + 1),
                ):
                    if 0 <= nx < width and 0 <= ny < height and opaque[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((nx, ny))
            components.append(component)
    if not components:
        return part
    largest = max(components, key=len)
    keep = np.zeros_like(alpha, dtype=np.uint8)
    for x, y in largest:
        keep[y, x] = alpha[y, x]
    cleaned = part.copy()
    cleaned.putalpha(Image.fromarray(keep))
    return cleaned


def checker(size: tuple[int, int], cell: int = 32) -> Image.Image:
    result = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(result)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(226, 226, 226))
    return result


def assign_uncovered_pixels(source: Image.Image, masks: dict[str, Image.Image]) -> None:
    import numpy as np

    names = list(masks)
    alpha = np.array(source.getchannel("A")) > 0
    labels = np.full((source.height, source.width), -1, dtype=np.int16)
    queue: deque[tuple[int, int]] = deque()
    for index, name in enumerate(names):
        seeded = (np.array(masks[name]) > 0) & alpha & (labels < 0)
        labels[seeded] = index
    seeded_y, seeded_x = np.nonzero(labels >= 0)
    queue.extend(zip(seeded_x.tolist(), seeded_y.tolist()))

    while queue:
        x, y = queue.popleft()
        label = labels[y, x]
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < source.width and 0 <= ny < source.height and labels[ny, nx] < 0:
                labels[ny, nx] = label
                queue.append((nx, ny))

    for index, name in enumerate(names):
        addition = np.where(labels == index, 255, 0).astype("uint8")
        masks[name] = Image.fromarray(np.maximum(np.array(masks[name]), addition).astype("uint8"))


def make_previews(source: Image.Image, entries: list[dict], rendered_parts: dict[str, Image.Image]) -> None:
    ordered = sorted(entries, key=lambda item: item["zIndex"])
    reassembled = Image.new("RGBA", source.size, (0, 0, 0, 0))
    for entry in ordered:
        reassembled = Image.alpha_composite(reassembled, rendered_parts[entry["name"]])
    reassembled.save(PREVIEW_DIR / "xgod-rig-reassembled.png")

    guide = checker(source.size).convert("RGBA")
    guide = Image.alpha_composite(guide, source)
    draw = ImageDraw.Draw(guide)
    bones = [
        ((505, 696), (505, 555), "#ffe135"),
        ((505, 555), (498, 507), "#ffe135"),
        ((431, 568), (389, 632), "#ff4f9a"),
        ((389, 632), (355, 682), "#ff4f9a"),
        ((553, 570), (600, 629), "#42d9ff"),
        ((600, 629), (633, 676), "#42d9ff"),
        ((478, 718), (438, 820), "#ff4f9a"),
        ((438, 820), (405, 895), "#ff4f9a"),
        ((523, 718), (545, 821), "#42d9ff"),
        ((545, 821), (548, 895), "#42d9ff"),
    ]
    for start, end, color in bones:
        draw.line((start, end), fill=color, width=8)
        for x, y in (start, end):
            draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill="white", outline=color, width=4)
    draw.line((250, BASELINE_Y, 760, BASELINE_Y), fill="#00ff88", width=3)
    guide.save(PREVIEW_DIR / "xgod-rig-joint-guide.png")

    font = ImageFont.load_default()
    columns = 4
    cell_w, cell_h = 300, 250
    rows = (len(entries) + columns - 1) // columns
    exploded = checker((columns * cell_w, rows * cell_h), 24).convert("RGBA")
    draw = ImageDraw.Draw(exploded)
    for index, entry in enumerate(ordered):
        part = Image.open(PACKAGE / entry["trimmedFile"]).convert("RGBA")
        max_w, max_h = cell_w - 36, cell_h - 52
        scale = min(max_w / part.width, max_h / part.height, 1.0)
        display = part.resize((max(1, round(part.width * scale)), max(1, round(part.height * scale))), Image.Resampling.LANCZOS)
        x = (index % columns) * cell_w + (cell_w - display.width) // 2
        y = (index // columns) * cell_h + 26 + (max_h - display.height) // 2
        exploded.alpha_composite(display, (x, y))
        label_x = (index % columns) * cell_w + 8
        label_y = (index // columns) * cell_h + 8
        draw.rectangle((label_x - 3, label_y - 2, label_x + 278, label_y + 13), fill=(255, 255, 255, 220))
        draw.text((label_x, label_y), entry["name"], font=font, fill="black")
    exploded.save(PREVIEW_DIR / "xgod-rig-exploded-parts.png")


def main() -> None:
    import numpy as np

    REGISTERED_DIR.mkdir(parents=True, exist_ok=True)
    TRIMMED_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(MASTER_PATH).convert("RGBA")
    if source.size != CANVAS_SIZE:
        raise SystemExit(f"Expected {CANVAS_SIZE}, got {source.size}")

    masks = {part["name"]: draw_shapes(source.size, part["shapes"]) for part in PARTS}
    assign_uncovered_pixels(source, masks)

    entries: list[dict] = []
    rendered_parts: dict[str, Image.Image] = {}
    for definition in PARTS:
        name = definition["name"]
        part = keep_largest_component(apply_mask(source, masks[name]))
        rendered_parts[name] = part
        registered_path = REGISTERED_DIR / f"{name}.png"
        part.save(registered_path)

        bbox = part.getchannel("A").getbbox()
        if bbox is None:
            raise SystemExit(f"Part {name} is empty")
        left = max(0, bbox[0] - TRIM_PADDING)
        top = max(0, bbox[1] - TRIM_PADDING)
        right = min(source.width, bbox[2] + TRIM_PADDING)
        bottom = min(source.height, bbox[3] + TRIM_PADDING)
        trimmed = part.crop((left, top, right, bottom))
        trimmed_path = TRIMMED_DIR / f"{name}.png"
        trimmed.save(trimmed_path)
        pivot_x, pivot_y = definition["pivot"]
        entries.append(
            {
                "name": name,
                "role": definition["role"],
                "parent": definition["parent"],
                "zIndex": definition["z"],
                "registeredFile": str(registered_path.relative_to(PACKAGE)),
                "trimmedFile": str(trimmed_path.relative_to(PACKAGE)),
                "pivotCanvas": [pivot_x, pivot_y],
                "trimRect": [left, top, right - left, bottom - top],
                "pivotTrimmed": [pivot_x - left, pivot_y - top],
                "size": [trimmed.width, trimmed.height],
            }
        )

    make_previews(source, entries, rendered_parts)

    manifest = {
        "format": "xgod-cutout-rig",
        "version": 2 if PACKAGE_NAME.endswith("-v2") else 1,
        "character": "X-God",
        "orientation": "strict right-facing side profile",
        "canvas": {
            "width": source.width,
            "height": source.height,
            "baselineY": BASELINE_Y,
            "rootPivot": list(ROOT_PIVOT),
            "pixelsPerBlenderUnit": 100,
        },
        "anatomyContract": {
            "left": "Permanent pocketed physical side; back layer in setup pose",
            "right": "Permanent plain physical side; front layer in setup pose",
            "screenDirection": "Facing screen-right; never rename limbs by screen position",
        },
        "canonicalDesign": {
            "hair": "Lime-green spiky silhouette with black ink and colored-pencil texture",
            "face": "Single visible black X eye, peach skin, compact side profile",
            "shirt": "White T-shirt with yellow circular X-eye emblem",
            "pants": "Loose brown cargo pants; pocket permanently belongs to anatomical left thigh",
            "shoes": "Black and white sneakers with green accents",
        },
        "parts": entries,
    }
    (PACKAGE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    coverage = Image.new("L", source.size, 0)
    for mask in masks.values():
        coverage = Image.fromarray(np.maximum(np.array(coverage), np.array(mask)).astype("uint8"))
    source_pixels = np.array(source.getchannel("A")) > 0
    missing = int(np.count_nonzero(source_pixels & (np.array(coverage) == 0)))
    print(f"Built {len(entries)} X-God rig parts; uncovered opaque pixels: {missing}")


if __name__ == "__main__":
    main()
