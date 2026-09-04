"""Create a four-frame, low forward-lean X-God dash from the cleaned rig."""

from __future__ import annotations

import math
import os
import runpy
from pathlib import Path

import bpy


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
V1_IMPORTER = PACKAGE_ROOT.parent / "xgod-rig-v1" / "blender" / "import_xgod_rig.py"
COLLECTION_NAME = "XGod_Rig_Art"
ROOT_NAME = "XGod_Dash_Root"
BLEND_PATH = PACKAGE_ROOT / "blender" / "xgod-rig-dash-v1.blend"

POSES = (
    {"name": "DASH_LAUNCH", "front_leg": "right", "root": (0.00, -0.04, 7), "angles": {"leg_left_thigh_pocket_back": 42, "leg_left_shin_back": -18, "foot_left_back": 12, "leg_right_thigh_plain_front": -38, "leg_right_shin_front": 22, "foot_right_front": -16, "arm_left_upper_back": -48, "arm_left_forearm_back": 18, "arm_right_upper_front": 58, "arm_right_forearm_front": -22, "torso_shirt": -7, "head_hair": 5}},
    {"name": "DASH_EXTEND", "front_leg": "right", "root": (0.03, -0.08, 10), "angles": {"leg_left_thigh_pocket_back": 54, "leg_left_shin_back": -10, "foot_left_back": 18, "leg_right_thigh_plain_front": -52, "leg_right_shin_front": 8, "foot_right_front": -6, "arm_left_upper_back": -62, "arm_left_forearm_back": 10, "arm_right_upper_front": 72, "arm_right_forearm_front": -12, "torso_shirt": -10, "head_hair": 7}},
    {"name": "DASH_PASS", "front_leg": "left", "root": (0.01, -0.10, 9), "angles": {"leg_left_thigh_pocket_back": -26, "leg_left_shin_back": 68, "foot_left_back": -38, "leg_right_thigh_plain_front": 28, "leg_right_shin_front": -26, "foot_right_front": 20, "arm_left_upper_back": -8, "arm_left_forearm_back": 6, "arm_right_upper_front": 14, "arm_right_forearm_front": -6, "torso_shirt": -9, "head_hair": 6}},
    {"name": "DASH_CONTACT", "front_leg": "left", "root": (-0.01, -0.06, 8), "angles": {"leg_left_thigh_pocket_back": -48, "leg_left_shin_back": 6, "foot_left_back": -8, "leg_right_thigh_plain_front": 46, "leg_right_shin_front": -16, "foot_right_front": 14, "arm_left_upper_back": 48, "arm_left_forearm_back": -14, "arm_right_upper_front": -54, "arm_right_forearm_front": 16, "torso_shirt": -8, "head_hair": 6}},
)


def key_angle(obj: bpy.types.Object, base: float, degrees: float, frame: int) -> None:
    obj.rotation_mode = "XYZ"
    obj.rotation_euler.z = base - math.radians(degrees)
    obj.keyframe_insert(data_path="rotation_euler", index=2, frame=frame, group="XGod_Dash")


def set_layers(objects: dict[str, bpy.types.Object], front_leg: str, frame: int) -> None:
    leg_z = {"back": 0.020, "front": 0.040}
    arm_z = {"back": 0.010, "front": 0.070}
    left_front = front_leg == "left"
    targets = {
        "leg_left_thigh_pocket_back": leg_z["front" if left_front else "back"],
        "leg_right_thigh_plain_front": leg_z["back" if left_front else "front"],
        "arm_left_upper_back": arm_z["back" if left_front else "front"],
        "arm_right_upper_front": arm_z["front" if left_front else "back"],
    }
    for name, z in targets.items():
        obj = objects[name]
        world = obj.matrix_world.copy()
        world.translation.z = z
        obj.matrix_world = world
        obj.keyframe_insert(data_path="location", index=2, frame=frame, group="XGod_Dash_Layers")


def main() -> None:
    os.environ["XGOD_RIG_PACKAGE_ROOT"] = str(PACKAGE_ROOT)
    runpy.run_path(str(V1_IMPORTER), run_name="__main__")
    objects = {obj.name: obj for obj in bpy.data.collections[COLLECTION_NAME].objects}
    pelvis = objects["pelvis"]
    root = bpy.data.objects.get(ROOT_NAME) or bpy.data.objects.new(ROOT_NAME, None)
    if root.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(root)
    world = pelvis.matrix_world.copy()
    pelvis.parent = root
    pelvis.matrix_world = world
    for obj in (*objects.values(), root):
        obj.animation_data_clear()
    bpy.context.scene.timeline_markers.clear()

    animated = {name for pose in POSES for name in pose["angles"]}
    base = {name: objects[name].rotation_euler.z for name in animated}
    root_base = tuple(root.location)
    for frame, pose in enumerate(POSES, start=1):
        for name in animated:
            key_angle(objects[name], base[name], pose["angles"].get(name, 0), frame)
        dx, dy, lean = pose["root"]
        root.location = (root_base[0] + dx, root_base[1] + dy, root_base[2])
        root.rotation_euler.z = math.radians(lean)
        root.keyframe_insert(data_path="location", frame=frame, group="XGod_Dash")
        root.keyframe_insert(data_path="rotation_euler", index=2, frame=frame, group="XGod_Dash")
        set_layers(objects, pose["front_leg"], frame)
        bpy.context.scene.timeline_markers.new(pose["name"], frame=frame)

    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 4
    scene.render.fps = 24
    scene.render.film_transparent = True
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Saved four-pose X-God dash rig to {BLEND_PATH}")


if __name__ == "__main__":
    main()
