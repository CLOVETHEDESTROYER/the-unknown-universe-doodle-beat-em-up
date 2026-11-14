"""Create six velocity-driven X-God jump poses from the cleaned v2 cutout rig."""

from __future__ import annotations

import math
import os
import runpy
from pathlib import Path

import bpy


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
V1_IMPORTER = PACKAGE_ROOT.parent / "xgod-rig-v1" / "blender" / "import_xgod_rig.py"
COLLECTION_NAME = "XGod_Rig_Art"
ROOT_NAME = "XGod_Jump_Root"
BLEND_PATH = PACKAGE_ROOT / "blender" / "xgod-rig-jump-v1.blend"

POSES = (
    # Indexed by GameEngine's real vertical velocity thresholds: launch, rise,
    # near apex, falling, fast fall, and grounded compression.
    {"name": "LAUNCH", "angles": {"leg_left_thigh_pocket_back": 16, "leg_left_shin_back": -42, "foot_left_back": 20, "leg_right_thigh_plain_front": 20, "leg_right_shin_front": -48, "foot_right_front": 22, "arm_left_upper_back": -20, "arm_left_forearm_back": 16, "arm_right_upper_front": 28, "arm_right_forearm_front": -14, "torso_shirt": 2, "head_hair": -2}},
    {"name": "RISING", "angles": {"leg_left_thigh_pocket_back": -34, "leg_left_shin_back": 74, "foot_left_back": -40, "leg_right_thigh_plain_front": -12, "leg_right_shin_front": 70, "foot_right_front": -46, "arm_left_upper_back": -48, "arm_left_forearm_back": 24, "arm_right_upper_front": 58, "arm_right_forearm_front": -18, "torso_shirt": -3, "head_hair": 3}},
    {"name": "APEX_RISE", "angles": {"leg_left_thigh_pocket_back": -44, "leg_left_shin_back": 88, "foot_left_back": -46, "leg_right_thigh_plain_front": -18, "leg_right_shin_front": 76, "foot_right_front": -42, "arm_left_upper_back": -58, "arm_left_forearm_back": 18, "arm_right_upper_front": 64, "arm_right_forearm_front": -15, "torso_shirt": -4, "head_hair": 4}},
    {"name": "APEX_FALL", "angles": {"leg_left_thigh_pocket_back": -22, "leg_left_shin_back": 52, "foot_left_back": -25, "leg_right_thigh_plain_front": -4, "leg_right_shin_front": 42, "foot_right_front": -22, "arm_left_upper_back": -38, "arm_left_forearm_back": 8, "arm_right_upper_front": 45, "arm_right_forearm_front": -8, "torso_shirt": -1, "head_hair": 1}},
    {"name": "FALLING", "angles": {"leg_left_thigh_pocket_back": 2, "leg_left_shin_back": 16, "foot_left_back": -2, "leg_right_thigh_plain_front": 8, "leg_right_shin_front": 14, "foot_right_front": 2, "arm_left_upper_back": -15, "arm_left_forearm_back": 4, "arm_right_upper_front": 20, "arm_right_forearm_front": -4}},
    {"name": "LANDING", "angles": {"leg_left_thigh_pocket_back": 22, "leg_left_shin_back": -50, "foot_left_back": 23, "leg_right_thigh_plain_front": 18, "leg_right_shin_front": -48, "foot_right_front": 22, "arm_left_upper_back": 4, "arm_left_forearm_back": -6, "arm_right_upper_front": -2, "arm_right_forearm_front": 6, "torso_shirt": 3, "head_hair": -3}},
)


def key_angle(obj: bpy.types.Object, base: float, degrees: float, frame: int) -> None:
    obj.rotation_mode = "XYZ"
    obj.rotation_euler.z = base - math.radians(degrees)
    obj.keyframe_insert(data_path="rotation_euler", index=2, frame=frame, group="XGod_Jump")


def main() -> None:
    os.environ["XGOD_RIG_PACKAGE_ROOT"] = str(PACKAGE_ROOT)
    runpy.run_path(str(V1_IMPORTER), run_name="__main__")
    objects = {obj.name: obj for obj in bpy.data.collections[COLLECTION_NAME].objects}
    pelvis = objects["pelvis"]
    root = bpy.data.objects.get(ROOT_NAME) or bpy.data.objects.new(ROOT_NAME, None)
    if root.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(root)
    pelvis_world = pelvis.matrix_world.copy()
    pelvis.parent = root
    pelvis.matrix_world = pelvis_world
    for obj in (*objects.values(), root):
        obj.animation_data_clear()
    bpy.context.scene.timeline_markers.clear()

    animated = {name for pose in POSES for name in pose["angles"]}
    base_rotations = {name: objects[name].rotation_euler.z for name in animated}
    for frame, pose in enumerate(POSES, start=1):
        for name in animated:
            key_angle(objects[name], base_rotations[name], pose["angles"].get(name, 0), frame)
        bpy.context.scene.timeline_markers.new(pose["name"], frame=frame)

    # Stable layers during the jump; the pocketed left and plain right legs keep
    # their identity while crossing without a static duplicate behind them.
    for name, z in (("arm_left_upper_back", 0.010), ("leg_left_thigh_pocket_back", 0.020), ("leg_right_thigh_plain_front", 0.040), ("arm_right_upper_front", 0.070)):
        obj = objects[name]
        world = obj.matrix_world.copy()
        world.translation.z = z
        obj.matrix_world = world
        obj.keyframe_insert(data_path="location", index=2, frame=1, group="XGod_Layers")
        obj.keyframe_insert(data_path="location", index=2, frame=6, group="XGod_Layers")

    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 6
    scene.render.fps = 24
    scene.render.film_transparent = True
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Saved six-pose X-God jump rig to {BLEND_PATH}")


if __name__ == "__main__":
    main()
