"""Run the shared walk animator against the X-God rig v2 source artwork.

Open this file in Blender's Text Editor and choose Run Script.  The v2 package
keeps moving sleeve caps and upper thigh mass attached to their proper limbs.
"""

from __future__ import annotations

import os
import runpy
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
V1_ANIMATOR = PACKAGE_ROOT.parent / "xgod-rig-v1" / "blender" / "animate_xgod_walk.py"

os.environ["XGOD_RIG_PACKAGE_ROOT"] = str(PACKAGE_ROOT)
os.environ["XGOD_RIG_BLEND_PATH"] = str(PACKAGE_ROOT / "blender" / "xgod-rig-walk-v3.blend")
runpy.run_path(str(V1_ANIMATOR), run_name="__main__")
