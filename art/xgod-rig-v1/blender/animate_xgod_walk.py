"""Build and animate the X-God cutout walk inside Blender.

Run this file from Blender's Text Editor or Python Console. It reimports the
canonical layered artwork, keys an interpolated 16-frame walk cycle, preserves
the permanent pocketed-left/plain-right anatomy contract, and saves a reusable
Blend file beside this script.
"""

from __future__ import annotations

import math
import os
import runpy
from pathlib import Path

import bpy


SCRIPT_DIR = Path(__file__).resolve().parent
IMPORTER_PATH = SCRIPT_DIR / "import_xgod_rig.py"
BLEND_PATH = Path(os.environ.get("XGOD_RIG_BLEND_PATH", SCRIPT_DIR / "xgod-rig-walk-v2.blend"))
COLLECTION_NAME = "XGod_Rig_Art"
ROOT_NAME = "XGod_Rig_Root"

KEY_FRAMES = (1, 3, 5, 7, 9, 11, 13, 15)
LOOP_CLOSE_FRAME = 17
FPS = 24

# The eight canonical poses match the approved cutout walk. Angles are visual
# screen degrees; they are negated when converted to Blender's +Z rotation.
POSES = (
    {
        "name": "CONTACT_POCKET_FORWARD",
        "front_leg": "left",
        # Root Y is baseline-corrected from the Blender render so the support
        # shoe stays on one floor line throughout the loop.
        "root": (0.00, -0.24, 0.0),
        "angles": {
            "leg_left_thigh_pocket_back": -52, "leg_left_shin_back": 4, "foot_left_back": 48,
            "leg_right_thigh_plain_front": 42, "leg_right_shin_front": -4, "foot_right_front": -38,
            "arm_left_upper_back": 0, "arm_left_forearm_back": 4,
            "arm_right_upper_front": 0, "arm_right_forearm_front": -4,
        },
    },
    {
        "name": "DOWN_POCKET_SUPPORT",
        "front_leg": "left",
        "root": (0.01, -0.05, -1.0),
        "angles": {
            "leg_left_thigh_pocket_back": -36, "leg_left_shin_back": 16, "foot_left_back": 20,
            "leg_right_thigh_plain_front": 32, "leg_right_shin_front": -18, "foot_right_front": -14,
            "arm_left_upper_back": -12, "arm_left_forearm_back": 10,
            "arm_right_upper_front": 14, "arm_right_forearm_front": -10,
            "torso_shirt": -2, "head_hair": 2,
        },
    },
    {
        "name": "PASSING_PLAIN_FORWARD",
        "front_leg": "right",
        "root": (0.02, -0.06, 1.5),
        "angles": {
            "leg_left_thigh_pocket_back": -16, "leg_left_shin_back": 8, "foot_left_back": 8,
            "leg_right_thigh_plain_front": -8, "leg_right_shin_front": 62, "foot_right_front": -54,
            "arm_left_upper_back": -28, "arm_left_forearm_back": 12,
            "arm_right_upper_front": 31, "arm_right_forearm_front": -12,
            "torso_shirt": -3, "head_hair": 3,
        },
    },
    {
        "name": "UP_PLAIN_SWING",
        "front_leg": "right",
        "root": (0.01, -0.10, 1.0),
        "angles": {
            "leg_left_thigh_pocket_back": -6, "leg_left_shin_back": 2, "foot_left_back": 4,
            "leg_right_thigh_plain_front": -23, "leg_right_shin_front": 38, "foot_right_front": -15,
            "arm_left_upper_back": -46, "arm_left_forearm_back": 9,
            "arm_right_upper_front": 50, "arm_right_forearm_front": -9,
            "torso_shirt": -2, "head_hair": 2,
        },
    },
    {
        "name": "CONTACT_PLAIN_FORWARD",
        "front_leg": "right",
        "root": (0.00, -0.20, 0.0),
        "angles": {
            "leg_left_thigh_pocket_back": 4, "leg_left_shin_back": -4, "foot_left_back": 0,
            "leg_right_thigh_plain_front": -13, "leg_right_shin_front": 3, "foot_right_front": 10,
            "arm_left_upper_back": -62, "arm_left_forearm_back": 4,
            "arm_right_upper_front": 68, "arm_right_forearm_front": -4,
        },
    },
    {
        "name": "DOWN_PLAIN_SUPPORT",
        "front_leg": "right",
        "root": (-0.01, -0.09, 1.0),
        "angles": {
            "leg_left_thigh_pocket_back": -1, "leg_left_shin_back": -18, "foot_left_back": 19,
            "leg_right_thigh_plain_front": -3, "leg_right_shin_front": 16, "foot_right_front": -13,
            "arm_left_upper_back": -46, "arm_left_forearm_back": 10,
            "arm_right_upper_front": 50, "arm_right_forearm_front": -10,
            "torso_shirt": 2, "head_hair": -2,
        },
    },
    {
        "name": "PASSING_POCKET_FORWARD",
        "front_leg": "left",
        "root": (-0.02, -0.22, -1.5),
        "angles": {
            "leg_left_thigh_pocket_back": -41, "leg_left_shin_back": 62, "foot_left_back": -21,
            "leg_right_thigh_plain_front": 17, "leg_right_shin_front": 8, "foot_right_front": -25,
            "arm_left_upper_back": -28, "arm_left_forearm_back": 12,
            "arm_right_upper_front": 31, "arm_right_forearm_front": -12,
            "torso_shirt": 3, "head_hair": -3,
        },
    },
    {
        "name": "UP_POCKET_SWING",
        "front_leg": "left",
        "root": (-0.01, -0.20, -1.0),
        "angles": {
            "leg_left_thigh_pocket_back": -56, "leg_left_shin_back": 38, "foot_left_back": 18,
            "leg_right_thigh_plain_front": 27, "leg_right_shin_front": 2, "foot_right_front": -29,
            "arm_left_upper_back": -12, "arm_left_forearm_back": 9,
            "arm_right_upper_front": 14, "arm_right_forearm_front": -9,
            "torso_shirt": 2, "head_hair": -2,
        },
    },
)

ANIMATED_PARTS = {
    name
    for pose in POSES
    for name in pose["angles"]
}


def import_canonical_art() -> dict[str, bpy.types.Object]:
    runpy.run_path(str(IMPORTER_PATH), run_name="__main__")
    collection = bpy.data.collections[COLLECTION_NAME]
    return {obj.name: obj for obj in collection.objects}


def ensure_root(objects: dict[str, bpy.types.Object]) -> bpy.types.Object:
    old_root = bpy.data.objects.get(ROOT_NAME)
    if old_root is not None:
        bpy.data.objects.remove(old_root, do_unlink=True)
    root = bpy.data.objects.new(ROOT_NAME, None)
    root.empty_display_type = "CIRCLE"
    root.empty_display_size = 0.6
    bpy.context.scene.collection.objects.link(root)
    pelvis = objects["pelvis"]
    world = pelvis.matrix_world.copy()
    pelvis.parent = root
    pelvis.matrix_world = world
    root["xgod_control"] = "master_root"
    return root


def clear_animation(objects: dict[str, bpy.types.Object], root: bpy.types.Object) -> None:
    for obj in (*objects.values(), root):
        obj.animation_data_clear()


def key_rotation(obj: bpy.types.Object, base_angle: float, screen_angle: float, frame: int) -> None:
    obj.rotation_mode = "XYZ"
    obj.rotation_euler.z = base_angle - math.radians(screen_angle)
    obj.keyframe_insert(data_path="rotation_euler", index=2, frame=frame, group="XGod_Walk")


def key_location(obj: bpy.types.Object, value: tuple[float, float, float], frame: int) -> None:
    obj.location = value
    obj.keyframe_insert(data_path="location", frame=frame, group="XGod_Walk")


def set_layer_order(objects: dict[str, bpy.types.Object], front_leg: str, frame: int) -> None:
    leg_world = {"back": 0.020, "front": 0.040}
    arm_world = {"back": 0.010, "front": 0.070}

    left_leg_front = front_leg == "left"
    leg_targets = {
        "leg_left_thigh_pocket_back": leg_world["front" if left_leg_front else "back"],
        "leg_right_thigh_plain_front": leg_world["back" if left_leg_front else "front"],
    }
    # Arms oppose the legs: when the pocketed leg leads, the plain/right arm
    # remains the front arm, matching the approved contact pose.
    arm_targets = {
        "arm_left_upper_back": arm_world["back" if left_leg_front else "front"],
        "arm_right_upper_front": arm_world["front" if left_leg_front else "back"],
    }
    for name, world_z in leg_targets.items():
        obj = objects[name]
        bpy.context.view_layer.update()
        world = obj.matrix_world.copy()
        world.translation.z = world_z
        obj.matrix_world = world
        obj.keyframe_insert(data_path="location", index=2, frame=frame, group="XGod_Layers")
    for name, world_z in arm_targets.items():
        obj = objects[name]
        bpy.context.view_layer.update()
        world = obj.matrix_world.copy()
        world.translation.z = world_z
        obj.matrix_world = world
        obj.keyframe_insert(data_path="location", index=2, frame=frame, group="XGod_Layers")


def apply_pose(
    pose: dict,
    frame: int,
    objects: dict[str, bpy.types.Object],
    root: bpy.types.Object,
    base_rotations: dict[str, float],
    root_base: tuple[float, float, float],
) -> None:
    for name in ANIMATED_PARTS:
        key_rotation(objects[name], base_rotations[name], pose["angles"].get(name, 0.0), frame)
    x, y, degrees = pose["root"]
    key_location(root, (root_base[0] + x, root_base[1] + y, root_base[2]), frame)
    root.rotation_euler.z = math.radians(degrees)
    root.keyframe_insert(data_path="rotation_euler", index=2, frame=frame, group="XGod_Walk")
    set_layer_order(objects, pose["front_leg"], frame)
    bpy.context.scene.timeline_markers.new(pose["name"], frame=frame)


def polish_curves(objects: dict[str, bpy.types.Object], root: bpy.types.Object) -> None:
    for obj in (*objects.values(), root):
        animation = obj.animation_data
        action = animation.action if animation else None
        if action is None:
            continue
        action.use_fake_user = True
        if hasattr(action, "fcurves"):
            # Legacy/Blender 4.3 and earlier action API.
            curves = list(action.fcurves)
        else:
            # Blender 4.4+ stores curves in per-slot channel bags inside a
            # layered action's keyframe strips.
            curves = [
                curve
                for layer in action.layers
                for strip in layer.strips
                for channel_bag in strip.channelbags
                for curve in channel_bag.fcurves
            ]
        for curve in curves:
            for point in curve.keyframe_points:
                point.interpolation = "BEZIER"
                point.handle_left_type = "AUTO_CLAMPED"
                point.handle_right_type = "AUTO_CLAMPED"
            curve.modifiers.new(type="CYCLES")


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 16
    scene.render.fps = FPS
    scene.render.fps_base = 1.0
    scene.frame_set(1)
    scene.sync_mode = "FRAME_DROP"
    scene.render.film_transparent = True
    scene["xgod_walk_key_frames"] = list(KEY_FRAMES)
    scene["xgod_walk_loop_close_frame"] = LOOP_CLOSE_FRAME
    scene["xgod_export_note"] = "Render frames 1-16 at 24 fps, or odd frames 1-15 for an 8-cell sheet."


def main() -> None:
    objects = import_canonical_art()
    root = ensure_root(objects)
    clear_animation(objects, root)
    bpy.context.scene.timeline_markers.clear()

    base_rotations = {name: objects[name].rotation_euler.z for name in ANIMATED_PARTS}
    root_base = tuple(root.location)
    for pose, frame in zip(POSES, KEY_FRAMES):
        apply_pose(pose, frame, objects, root, base_rotations, root_base)
    apply_pose(POSES[0], LOOP_CLOSE_FRAME, objects, root, base_rotations, root_base)

    polish_curves(objects, root)
    configure_scene()
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Saved animated X-God cutout rig to {BLEND_PATH}")


if __name__ == "__main__":
    main()
