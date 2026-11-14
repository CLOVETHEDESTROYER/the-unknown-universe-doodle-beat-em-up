#!/usr/bin/env python3
"""Validate the rendered X-God cutout walk sheet and preview."""

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "public" / "player_walk_rig_v1.png"
PREVIEW = ROOT / "art" / "xgod-rig-v1" / "previews" / "xgod-walk-rig-v1.gif"
FRAME_SIZE = 512
FRAME_COUNT = 8


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def main() -> None:
    image = Image.open(SHEET)
    if image.size != (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE):
        fail(f"sheet is {image.size}, expected 4096x512")
    if image.mode != "RGBA":
        fail(f"sheet mode is {image.mode}, expected RGBA")
    if not PREVIEW.exists():
        fail("animated preview is missing")

    centroids = []
    bboxes = []
    frames = []
    for index in range(FRAME_COUNT):
        frame = image.crop((index * FRAME_SIZE, 0, (index + 1) * FRAME_SIZE, FRAME_SIZE))
        frames.append(frame)
        alpha = np.array(frame.getchannel("A"))
        visible = alpha > 12
        ys, xs = np.nonzero(visible)
        if not len(xs):
            fail(f"frame {index} is empty")
        bbox = (int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1))
        bboxes.append(bbox)
        if bbox[0] < 24 or bbox[2] > FRAME_SIZE - 24 or bbox[1] < 24:
            fail(f"frame {index} violates safe canvas margins: {bbox}")
        if not 458 <= bbox[3] <= 466:
            fail(f"frame {index} misses the ground baseline: {bbox}")
        centroids.append((float(xs.mean()), float(ys.mean())))

    for index in range(FRAME_COUNT):
        next_index = (index + 1) % FRAME_COUNT
        dx = centroids[next_index][0] - centroids[index][0]
        dy = centroids[next_index][1] - centroids[index][1]
        if (dx * dx + dy * dy) ** 0.5 > 28:
            fail(f"centroid pop between frames {index} and {next_index}")

    contact_a = np.array(frames[0], dtype=np.int16)
    contact_b = np.array(frames[4], dtype=np.int16)
    mean_contact_difference = float(np.abs(contact_a - contact_b).mean())
    if mean_contact_difference < 8:
        fail("opposite contact poses are not visually distinct")

    print("PASS: 8 RGBA frames of 512x512 on a 4096x512 sheet")
    print("PASS: safe margins and stable ground baseline")
    print("PASS: continuous frame centroids and distinct opposite contacts")
    for index, bbox in enumerate(bboxes):
        print(f"  frame {index}: bbox={bbox}")


if __name__ == "__main__":
    main()
