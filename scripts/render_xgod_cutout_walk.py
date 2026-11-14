#!/usr/bin/env python3
"""Render an eight-frame X-God walk from the separated cutout-rig package."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "art" / "xgod-rig-v1"
MANIFEST_PATH = PACKAGE / "manifest.json"
OUTPUT_SHEET = ROOT / "public" / "player_walk_rig_v1.png"
PREVIEW_GIF = PACKAGE / "previews" / "xgod-walk-rig-v1.gif"
PREVIEW_SHEET = PACKAGE / "previews" / "xgod-walk-rig-v1-contact-sheet.png"
PREVIEW_FRAMES = PACKAGE / "previews" / "walk-frames"

MASTER_SIZE = 1024
FRAME_SIZE = 512
FRAME_COUNT = 8
OUTPUT_BASELINE = 462


# Local rotations are in visual screen degrees: positive turns a downward limb
# toward screen-left; negative turns it toward screen-right.
POSES = [
    {
        "name": "contact_pocket_forward",
        "torso_y": 0,
        "front_leg": "left",
        "angles": {
            "leg_left_thigh_pocket_back": -52,
            "leg_left_shin_back": 4,
            "foot_left_back": 48,
            "leg_right_thigh_plain_front": 42,
            "leg_right_shin_front": -4,
            "foot_right_front": -38,
            "arm_left_upper_back": 0,
            "arm_left_forearm_back": 4,
            "arm_right_upper_front": 0,
            "arm_right_forearm_front": -4,
        },
    },
    {
        "name": "down_pocket_support",
        "torso_y": 12,
        "front_leg": "left",
        "angles": {
            "leg_left_thigh_pocket_back": -36,
            "leg_left_shin_back": 16,
            "foot_left_back": 20,
            "leg_right_thigh_plain_front": 32,
            "leg_right_shin_front": -18,
            "foot_right_front": -14,
            "arm_left_upper_back": -12,
            "arm_left_forearm_back": 10,
            "arm_right_upper_front": 14,
            "arm_right_forearm_front": -10,
            "torso_shirt": -2,
            "head_hair": 2,
        },
    },
    {
        "name": "passing_plain_forward",
        "torso_y": 4,
        "front_leg": "right",
        "angles": {
            "leg_left_thigh_pocket_back": -16,
            "leg_left_shin_back": 8,
            "foot_left_back": 8,
            "leg_right_thigh_plain_front": -8,
            "leg_right_shin_front": 62,
            "foot_right_front": -54,
            "arm_left_upper_back": -28,
            "arm_left_forearm_back": 12,
            "arm_right_upper_front": 31,
            "arm_right_forearm_front": -12,
            "torso_shirt": -3,
            "head_hair": 3,
        },
    },
    {
        "name": "up_plain_swing",
        "torso_y": -6,
        "front_leg": "right",
        "angles": {
            "leg_left_thigh_pocket_back": -6,
            "leg_left_shin_back": 2,
            "foot_left_back": 4,
            "leg_right_thigh_plain_front": -23,
            "leg_right_shin_front": 38,
            "foot_right_front": -15,
            "arm_left_upper_back": -46,
            "arm_left_forearm_back": 9,
            "arm_right_upper_front": 50,
            "arm_right_forearm_front": -9,
            "torso_shirt": -2,
            "head_hair": 2,
        },
    },
    {
        "name": "contact_plain_forward",
        "torso_y": 0,
        "front_leg": "right",
        "angles": {
            "leg_left_thigh_pocket_back": 4,
            "leg_left_shin_back": -4,
            "foot_left_back": 0,
            "leg_right_thigh_plain_front": -13,
            "leg_right_shin_front": 3,
            "foot_right_front": 10,
            "arm_left_upper_back": -62,
            "arm_left_forearm_back": 4,
            "arm_right_upper_front": 68,
            "arm_right_forearm_front": -4,
        },
    },
    {
        "name": "down_plain_support",
        "torso_y": 12,
        "front_leg": "right",
        "angles": {
            "leg_left_thigh_pocket_back": -1,
            "leg_left_shin_back": -18,
            "foot_left_back": 19,
            "leg_right_thigh_plain_front": -3,
            "leg_right_shin_front": 16,
            "foot_right_front": -13,
            "arm_left_upper_back": -46,
            "arm_left_forearm_back": 10,
            "arm_right_upper_front": 50,
            "arm_right_forearm_front": -10,
            "torso_shirt": 2,
            "head_hair": -2,
        },
    },
    {
        "name": "passing_pocket_forward",
        "torso_y": 4,
        "front_leg": "left",
        "angles": {
            "leg_left_thigh_pocket_back": -41,
            "leg_left_shin_back": 62,
            "foot_left_back": -21,
            "leg_right_thigh_plain_front": 17,
            "leg_right_shin_front": 8,
            "foot_right_front": -25,
            "arm_left_upper_back": -28,
            "arm_left_forearm_back": 12,
            "arm_right_upper_front": 31,
            "arm_right_forearm_front": -12,
            "torso_shirt": 3,
            "head_hair": -3,
        },
    },
    {
        "name": "up_pocket_swing",
        "torso_y": -6,
        "front_leg": "left",
        "angles": {
            "leg_left_thigh_pocket_back": -56,
            "leg_left_shin_back": 38,
            "foot_left_back": 18,
            "leg_right_thigh_plain_front": 27,
            "leg_right_shin_front": 2,
            "foot_right_front": -29,
            "arm_left_upper_back": -12,
            "arm_left_forearm_back": 9,
            "arm_right_upper_front": 14,
            "arm_right_forearm_front": -9,
            "torso_shirt": 2,
            "head_hair": -2,
        },
    },
]


LEFT_LEG = ["leg_left_thigh_pocket_back", "leg_left_shin_back", "foot_left_back"]
RIGHT_LEG = ["leg_right_thigh_plain_front", "leg_right_shin_front", "foot_right_front"]
LEFT_ARM = ["arm_left_upper_back", "arm_left_forearm_back", "hand_left_back"]
RIGHT_ARM = ["arm_right_upper_front", "arm_right_forearm_front", "hand_right_front"]


def translate(x: float, y: float) -> np.ndarray:
    return np.array([[1.0, 0.0, x], [0.0, 1.0, y], [0.0, 0.0, 1.0]])


def rotate_about(pivot: tuple[float, float], degrees: float) -> np.ndarray:
    radians = math.radians(degrees)
    cosine = math.cos(radians)
    sine = math.sin(radians)
    rotation = np.array([[cosine, -sine, 0.0], [sine, cosine, 0.0], [0.0, 0.0, 1.0]])
    return translate(*pivot) @ rotation @ translate(-pivot[0], -pivot[1])


def warp(image: Image.Image, matrix: np.ndarray) -> Image.Image:
    inverse = np.linalg.inv(matrix)
    coefficients = (
        inverse[0, 0],
        inverse[0, 1],
        inverse[0, 2],
        inverse[1, 0],
        inverse[1, 1],
        inverse[1, 2],
    )
    return image.transform(
        (MASTER_SIZE, MASTER_SIZE),
        Image.Transform.AFFINE,
        coefficients,
        resample=Image.Resampling.BICUBIC,
    )


def checker(size: tuple[int, int], cell: int = 20) -> Image.Image:
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(225, 225, 225))
    return image


def render_frame(manifest: dict, images: dict[str, Image.Image], pose: dict) -> Image.Image:
    definitions = {part["name"]: part for part in manifest["parts"]}
    matrices: dict[str, np.ndarray] = {}
    global_shift = translate(7, -30)

    def matrix_for(name: str) -> np.ndarray:
        if name in matrices:
            return matrices[name]
        definition = definitions[name]
        angle = pose["angles"].get(name, 0)
        local = rotate_about(tuple(definition["pivotCanvas"]), angle)
        if name == "torso_shirt":
            local = translate(0, pose["torso_y"]) @ local
        parent_name = definition["parent"]
        if parent_name:
            matrix = matrix_for(parent_name) @ local
        else:
            matrix = global_shift @ local
        matrices[name] = matrix
        return matrix

    left_is_front = pose["front_leg"] == "left"
    back_leg = RIGHT_LEG if left_is_front else LEFT_LEG
    front_leg = LEFT_LEG if left_is_front else RIGHT_LEG
    back_arm = LEFT_ARM if left_is_front else RIGHT_ARM
    front_arm = RIGHT_ARM if left_is_front else LEFT_ARM
    order = [
        *back_arm,
        *back_leg,
        "pelvis",
        *front_leg,
        "torso_shirt",
        "head_hair",
        *front_arm,
    ]

    frame = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    for name in order:
        frame = Image.alpha_composite(frame, warp(images[name], matrix_for(name)))
    bbox = frame.getchannel("A").getbbox()
    if bbox is not None:
        baseline_shift = OUTPUT_BASELINE * 2 - bbox[3]
        frame = frame.transform(
            frame.size,
            Image.Transform.AFFINE,
            (1, 0, 0, 0, 1, -baseline_shift),
            resample=Image.Resampling.BICUBIC,
        )
    return frame.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)


def make_preview(frames: list[Image.Image]) -> None:
    display_frames = []
    for frame in frames:
        background = checker(frame.size).convert("RGBA")
        display_frames.append(Image.alpha_composite(background, frame).convert("RGB"))
    display_frames[0].save(
        PREVIEW_GIF,
        save_all=True,
        append_images=display_frames[1:],
        duration=83,
        loop=0,
        disposal=2,
    )
    sheet = Image.new("RGB", (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE), "white")
    for index, frame in enumerate(display_frames):
        sheet.paste(frame, (index * FRAME_SIZE, 0))
    sheet.save(PREVIEW_SHEET)


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    images = {
        part["name"]: Image.open(PACKAGE / part["registeredFile"]).convert("RGBA")
        for part in manifest["parts"]
    }
    frames = [render_frame(manifest, images, pose) for pose in POSES]
    PREVIEW_FRAMES.mkdir(parents=True, exist_ok=True)
    for index, (frame, pose) in enumerate(zip(frames, POSES)):
        frame.save(PREVIEW_FRAMES / f"{index:02d}-{pose['name']}.png")
    sheet = Image.new("RGBA", (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
    OUTPUT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT_SHEET)
    make_preview(frames)
    print(f"Wrote {OUTPUT_SHEET} ({sheet.width}x{sheet.height})")
    print(f"Wrote {PREVIEW_GIF}")


if __name__ == "__main__":
    main()
