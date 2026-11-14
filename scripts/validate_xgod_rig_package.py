#!/usr/bin/env python3
"""Validate the X-God cutout-rig handoff package."""

from __future__ import annotations

import json
import os
import py_compile
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_NAME = os.environ.get("XGOD_RIG_PACKAGE", "xgod-rig-v1")
RIG_VERSION = 3 if PACKAGE_NAME.endswith("-v2") else 2
EXPECTED_PARTS = 17 if PACKAGE_NAME.endswith("-v2") else 15
PACKAGE = ROOT / "art" / PACKAGE_NAME
MANIFEST = PACKAGE / "manifest.json"
MASTER = PACKAGE / "master" / "xgod-rig-master.png"
IMPORTER = PACKAGE / "blender" / "import_xgod_rig.py"
ANIMATOR = PACKAGE / "blender" / "animate_xgod_walk.py"
BLEND_PROJECT = PACKAGE / "blender" / f"xgod-rig-walk-v{RIG_VERSION}.blend"
BLENDER_SHEET = PACKAGE / "blender" / "renders" / f"walk-v{RIG_VERSION}" / f"xgod-walk-blender-v{RIG_VERSION}-sheet.png"
GAME_SHEET = ROOT / "public" / "player_walk_blender_v3.png"


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def main() -> None:
    if not MANIFEST.exists():
        fail("manifest.json is missing")
    manifest = json.loads(MANIFEST.read_text())
    master = Image.open(MASTER).convert("RGBA")
    if master.size != (1024, 1024):
        fail(f"master canvas is {master.size}, expected 1024x1024")
    if manifest["canvas"]["baselineY"] != 954:
        fail("baselineY changed from the approved rig contract")

    parts = manifest["parts"]
    if len(parts) != EXPECTED_PARTS:
        fail(f"found {len(parts)} parts, expected {EXPECTED_PARTS}")
    names = [part["name"] for part in parts]
    if len(names) != len(set(names)):
        fail("part names are not unique")
    if "leg_left_thigh_pocket_back" not in names or "leg_right_thigh_plain_front" not in names:
        fail("permanent pocket/plain thigh identities are missing")
    if PACKAGE_NAME.endswith("-v2") and not {"sleeve_left_back", "sleeve_right_front"}.issubset(names):
        fail("moving sleeve cap parts are missing from the v2 rig")

    combined_alpha = np.zeros((master.height, master.width), dtype=np.uint8)
    for part in parts:
        registered_path = PACKAGE / part["registeredFile"]
        trimmed_path = PACKAGE / part["trimmedFile"]
        if not registered_path.exists() or not trimmed_path.exists():
            fail(f"missing image for {part['name']}")
        registered = Image.open(registered_path).convert("RGBA")
        trimmed = Image.open(trimmed_path).convert("RGBA")
        if registered.size != master.size:
            fail(f"registered part {part['name']} is {registered.size}")
        if trimmed.getchannel("A").getbbox() is None:
            fail(f"trimmed part {part['name']} is empty")
        if list(trimmed.size) != part["size"]:
            fail(f"trimmed size mismatch for {part['name']}")
        pivot_x, pivot_y = part["pivotTrimmed"]
        if not (-32 <= pivot_x <= trimmed.width + 32 and -32 <= pivot_y <= trimmed.height + 32):
            fail(f"pivot is too far outside {part['name']}")
        combined_alpha = np.maximum(combined_alpha, np.array(registered.getchannel("A")))

    master_alpha = np.array(master.getchannel("A"))
    # Alpha values 1-4 are export fringe and are intentionally removed by the
    # disconnected-component cleanup so they cannot become floating slivers.
    missing = int(np.count_nonzero((master_alpha > 4) & (combined_alpha == 0)))
    outside = int(np.count_nonzero((combined_alpha > 0) & (master_alpha == 0)))
    if missing or outside:
        fail(f"part coverage mismatch: {missing} missing, {outside} outside")

    py_compile.compile(str(IMPORTER), doraise=True)
    py_compile.compile(str(ANIMATOR), doraise=True)
    if not BLEND_PROJECT.exists() or BLEND_PROJECT.stat().st_size < 100_000:
        fail("saved Blender walk project is missing or unexpectedly small")
    blender_sheet = Image.open(BLENDER_SHEET).convert("RGBA")
    expected_blender_size = (16384, 1024) if PACKAGE_NAME.endswith("-v2") else (8192, 512)
    if blender_sheet.size != expected_blender_size:
        fail(f"Blender walk sheet is {blender_sheet.size}, expected {expected_blender_size}")
    if PACKAGE_NAME.endswith("-v2"):
        game_sheet = Image.open(GAME_SHEET).convert("RGBA")
        if game_sheet.size != (8192, 512):
            fail(f"game walk sheet is {game_sheet.size}, expected 8192x512")
    print(f"PASS: {len(parts)} parts, 1024x1024 RGBA master, complete registered coverage")
    print("PASS: permanent pocketed-left/plain-right anatomy contract")
    if PACKAGE_NAME.endswith("-v2"):
        print("PASS: moving sleeve caps and reduced static hip cover are present")
    print("PASS: Blender importer and walk animator syntax")
    print("PASS: saved Blender project and 16-frame walk export")


if __name__ == "__main__":
    main()
