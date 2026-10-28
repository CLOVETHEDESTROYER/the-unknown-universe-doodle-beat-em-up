"""Create Dinio's editable Blender model and transparent platformer frames.

Run with: blender --background --python scripts/create_dinio_blender.py
"""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "dinio" / "blender"
FRAMES = ROOT / "public" / "companions" / "dinio"
ART.mkdir(parents=True, exist_ok=True)
FRAMES.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color, roughness=0.82):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Roughness"].default_value = roughness
    return mat


pink = material("Dinio bubblegum pink", (0.91, 0.25, 0.56))
light_pink = material("Dinio highlight", (1.0, 0.49, 0.69))
deep_pink = material("Dinio shaded edge", (0.54, 0.11, 0.32))
cream = material("Warm chalk belly", (1.0, 0.88, 0.70))
ink = material("Soft black ink", (0.10, 0.055, 0.105))
blush = material("Cheek blush", (1.0, 0.28, 0.46))
crown = material("Sunny yellow crown", (1.0, 0.70, 0.17))
white = material("Eye glint", (1.0, 0.96, 0.90))


def ellipsoid(name, location, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def cone_between(name, a, b, radius_a, radius_b, mat):
    middle = (Vector(a) + Vector(b)) / 2
    direction = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=radius_a, radius2=radius_b,
                                    depth=direction.length, location=middle)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    bevel = obj.modifiers.new("Soft clay edges", "BEVEL")
    bevel.width = 0.05
    bevel.segments = 2
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(mat)
    return obj


def stroke(name, points, radius, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coord in zip(spline.bezier_points, points):
        point.co = coord
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


# The camera sees Dinio from the side. Rounded, slightly uneven forms preserve
# the old pink crayon character while giving the new sprite real volume.
ellipsoid("body", (-0.23, 0.0, 1.28), (0.69, 0.48, 0.91), pink)
ellipsoid("belly", (0.12, -0.39, 1.22), (0.39, 0.15, 0.68), cream)
ellipsoid("neck", (0.03, 0.01, 1.97), (0.40, 0.36, 0.55), pink)
ellipsoid("head", (0.35, 0.0, 2.41), (0.67, 0.48, 0.53), light_pink)
ellipsoid("snout", (0.97, -0.03, 2.30), (0.51, 0.40, 0.27), light_pink)
ellipsoid("lower jaw", (0.91, -0.02, 2.09), (0.48, 0.34, 0.13), pink)
ellipsoid("nostril", (1.23, -0.37, 2.37), (0.035, 0.022, 0.043), ink)
ellipsoid("eye white", (0.57, -0.432, 2.58), (0.10, 0.035, 0.13), white)
ellipsoid("eye ink", (0.60, -0.466, 2.57), (0.056, 0.025, 0.080), ink)
ellipsoid("cheek", (0.63, -0.43, 2.31), (0.15, 0.024, 0.085), blush)
stroke("smile line", [(0.78, -0.416, 2.19), (1.02, -0.42, 2.16), (1.31, -0.35, 2.18)], 0.025, ink)

# A small jagged crown identifies Dinio even when the sprite is game sized.
for index, (x, height) in enumerate([(-0.11, 0.26), (0.12, 0.36), (0.36, 0.25)]):
    cone_between(f"crown point {index + 1}", (x, 0, 2.84), (x - 0.045, 0, 2.84 + height), 0.15, 0.018, crown)
ellipsoid("crown band", (0.14, 0.0, 2.84), (0.40, 0.26, 0.08), crown)

# Swept tail, dorsal plates, tiny arms, and separately animated legs.
cone_between("tail root", (-0.66, 0.08, 1.29), (-1.57, 0.08, 1.17), 0.37, 0.045, pink)
cone_between("tail tip", (-1.54, 0.08, 1.17), (-1.95, 0.08, 1.34), 0.10, 0.005, light_pink)
for index, x in enumerate([-0.90, -0.67, -0.46]):
    cone_between(f"back spike {index + 1}", (x, 0.07, 1.77 + index * 0.20),
                 (x - 0.12, 0.07, 1.96 + index * 0.23), 0.12, 0.008, deep_pink)
ellipsoid("left tiny arm", (0.40, -0.48, 1.75), (0.25, 0.12, 0.12), pink)
ellipsoid("left tiny hand", (0.57, -0.52, 1.68), (0.11, 0.09, 0.11), light_pink)
ellipsoid("right tiny arm", (0.25, 0.45, 1.71), (0.26, 0.11, 0.12), deep_pink)

legs = []
for index, (x, y) in enumerate([(-0.47, -0.23), (0.02, 0.22)]):
    pivot = bpy.data.objects.new(f"leg pivot {index + 1}", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (x, y, 0.91)
    leg = ellipsoid(f"leg {index + 1}", (x, y, 0.52), (0.22, 0.21, 0.45), pink, pivot)
    foot = ellipsoid(f"foot {index + 1}", (x + 0.20, y - 0.04, 0.12), (0.38, 0.24, 0.14), light_pink, pivot)
    legs.append(pivot)

# Lighting gives gentle volume; the world stays transparent for Phaser.
world = bpy.context.scene.world
world.color = (0.8, 0.8, 0.8)
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.72, 0.66, 0.75, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8

def area(name, location, energy, size):
    light_data = bpy.data.lights.new(name, "AREA")
    light = bpy.data.objects.new(name, light_data)
    bpy.context.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 1.6)) - light.location).to_track_quat("-Z", "Y").to_euler()
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size


area("warm key", (0, -4.5, 5), 550, 5)
area("pink rim", (-3, 2.5, 3.5), 340, 4)

camera_data = bpy.data.cameras.new("Side sprite camera")
camera = bpy.data.objects.new("Side sprite camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (0.0, -11.5, 1.7)
camera.rotation_euler = (Vector((0, 0, 1.52)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.8
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.render.resolution_x = 320
scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.exposure = -1.1

# The .blend opens on an easy-to-edit neutral pose. Frame assets are generated
# from the same model and camera, keeping their scale and foot placement fixed.
for pose, count in [("walk", 6), ("attack", 3)]:
    for frame in range(count):
        phase = frame / count * math.tau
        legs[0].rotation_euler[1] = math.sin(phase) * (0.26 if pose == "walk" else 0.09)
        legs[1].rotation_euler[1] = -math.sin(phase) * (0.26 if pose == "walk" else 0.09)
        scene.camera.location.z = 1.7 + (0.025 * math.sin(phase * 2) if pose == "walk" else 0)
        scene.camera.rotation_euler = (Vector((0, 0, 1.52)) - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
        jaw = bpy.data.objects.get("lower jaw")
        mouth = bpy.data.objects.get("smile line")
        jaw.location.z = 2.09 - (0.10 if pose == "attack" else 0)
        mouth.hide_render = pose == "attack"
        if pose == "attack":
            if "open mouth" not in bpy.data.objects:
                ellipsoid("open mouth", (1.01, -0.382, 2.13), (0.38, 0.045, 0.12), ink)
            bpy.data.objects["open mouth"].hide_render = False
        elif "open mouth" in bpy.data.objects:
            bpy.data.objects["open mouth"].hide_render = True
        scene.render.filepath = str(FRAMES / f"{pose}_{frame}.png")
        bpy.ops.render.render(write_still=True)

legs[0].rotation_euler[1] = 0
legs[1].rotation_euler[1] = 0
bpy.data.objects["lower jaw"].location.z = 2.09
bpy.data.objects["smile line"].hide_render = False
bpy.data.objects["open mouth"].hide_render = True
scene.camera.location.z = 1.7
scene.render.filepath = "//preview.png"
bpy.ops.wm.save_as_mainfile(filepath=str(ART / "dinio-v1.blend"))
