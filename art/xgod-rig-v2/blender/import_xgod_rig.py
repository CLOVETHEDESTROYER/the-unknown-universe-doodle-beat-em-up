"""Import the X-God rig v2 artwork while reusing the shared Blender importer."""

from __future__ import annotations

import os
import runpy
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
V1_IMPORTER = PACKAGE_ROOT.parent / "xgod-rig-v1" / "blender" / "import_xgod_rig.py"

os.environ["XGOD_RIG_PACKAGE_ROOT"] = str(PACKAGE_ROOT)
runpy.run_path(str(V1_IMPORTER), run_name="__main__")
