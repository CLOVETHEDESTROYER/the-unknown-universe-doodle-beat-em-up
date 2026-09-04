"""Import the X-God v1 cutout package as pivot-correct Blender planes.

Open this file in Blender's Text Editor and choose Run Script.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import bpy


PACKAGE_ROOT = Path(os.environ.get("XGOD_RIG_PACKAGE_ROOT", Path(__file__).resolve().parents[1]))
MANIFEST_PATH = PACKAGE_ROOT / "manifest.json"
COLLECTION_NAME = "XGod_Rig_Art"
CAMERA_NAME = "XGod_Sprite_Camera"


def remove_default_scene_objects() -> None:
    """Remove only Blender's untouched starter objects from a new scene."""
    for name in ("Cube", "Light", "Camera"):
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)


def remove_existing_collection(name: str) -> None:
    collection = bpy.data.collections.get(name)
    if collection is None:
        return
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def create_material(name: str, image_path: Path) -> bpy.types.Material:
    image = bpy.data.images.load(str(image_path), check_existing=True)
    image.colorspace_settings.name = "sRGB"
    material = bpy.data.materials.new(f"MAT_{name}")
    material.use_nodes = True
    material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    elif hasattr(material, "blend_method"):
        material.blend_method = "BLEND"
    if hasattr(material, "use_transparency_overlap"):
        material.use_transparency_overlap = False

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    alpha_mix = nodes.new("ShaderNodeMixShader")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    emission.inputs["Strength"].default_value = 1.0
    links.new(texture.outputs["Color"], emission.inputs["Color"])
    links.new(texture.outputs["Alpha"], alpha_mix.inputs["Fac"])
    links.new(transparent.outputs["BSDF"], alpha_mix.inputs[1])
    links.new(emission.outputs["Emission"], alpha_mix.inputs[2])
    links.new(alpha_mix.outputs["Shader"], output.inputs["Surface"])
    return material


def create_part_plane(part: dict, manifest: dict, collection: bpy.types.Collection) -> bpy.types.Object:
    trim_x, trim_y, width, height = part["trimRect"]
    pivot_x, pivot_y = part["pivotCanvas"]
    pixels_per_unit = manifest["canvas"]["pixelsPerBlenderUnit"]
    root_x, root_y = manifest["canvas"]["rootPivot"]

    left = (trim_x - pivot_x) / pixels_per_unit
    right = (trim_x + width - pivot_x) / pixels_per_unit
    top = (pivot_y - trim_y) / pixels_per_unit
    bottom = (pivot_y - (trim_y + height)) / pixels_per_unit

    vertices = [
        (left, bottom, 0.0),
        (right, bottom, 0.0),
        (right, top, 0.0),
        (left, top, 0.0),
    ]
    mesh = bpy.data.meshes.new(f"MESH_{part['name']}")
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for loop, uv in zip(mesh.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv_layer.data[loop.index].uv = uv

    obj = bpy.data.objects.new(part["name"], mesh)
    collection.objects.link(obj)
    obj.location = (
        (pivot_x - root_x) / pixels_per_unit,
        (root_y - pivot_y) / pixels_per_unit,
        part["zIndex"] * 0.001,
    )
    obj["xgod_role"] = part["role"]
    obj["xgod_parent_part"] = part["parent"] or ""
    obj["xgod_pivot_canvas"] = part["pivotCanvas"]
    image_path = PACKAGE_ROOT / part["trimmedFile"]
    obj.data.materials.append(create_material(part["name"], image_path))
    return obj


def create_camera(manifest: dict, scene: bpy.types.Scene) -> bpy.types.Object:
    old_camera = bpy.data.objects.get(CAMERA_NAME)
    if old_camera is not None:
        bpy.data.objects.remove(old_camera, do_unlink=True)
    camera_data = bpy.data.cameras.new(CAMERA_NAME)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = manifest["canvas"]["height"] / manifest["canvas"]["pixelsPerBlenderUnit"]
    camera = bpy.data.objects.new(CAMERA_NAME, camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0.0, 0.0, 10.0)
    camera.rotation_euler = (0.0, 0.0, 0.0)
    scene.camera = camera
    return camera


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    scene = bpy.context.scene
    remove_default_scene_objects()
    remove_existing_collection(COLLECTION_NAME)
    collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(collection)

    objects = {}
    for part in sorted(manifest["parts"], key=lambda item: item["zIndex"]):
        objects[part["name"]] = create_part_plane(part, manifest, collection)

    bpy.context.view_layer.update()
    for part in manifest["parts"]:
        parent_name = part["parent"]
        if parent_name:
            child = objects[part["name"]]
            parent = objects[parent_name]
            child.parent = parent
            # Keep the registered canvas-space pivot when adding hierarchy.
            # Explicit parent inverses are reliable across Blender 4.x and 5.x
            # and still allow later parent rotations to drive child joints.
            child.matrix_parent_inverse = parent.matrix_world.inverted()
            bpy.context.view_layer.update()

    create_camera(manifest, scene)
    # Blender 4.x exposes Eevee as BLENDER_EEVEE_NEXT; Blender 5.x renamed the
    # same realtime engine back to BLENDER_EEVEE. Select the first identifier
    # accepted by the running Blender version.
    for engine_name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine_name
            break
        except TypeError:
            continue
    scene.render.resolution_x = manifest["canvas"]["width"]
    scene.render.resolution_y = manifest["canvas"]["height"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.fps = 24
    scene.render.fps_base = 1.0
    scene.frame_start = 1
    scene.frame_end = 17

    bpy.context.view_layer.objects.active = objects["pelvis"]
    objects["pelvis"].select_set(True)
    print(f"Imported {len(objects)} X-God cutout parts from {PACKAGE_ROOT}")


if __name__ == "__main__":
    main()
