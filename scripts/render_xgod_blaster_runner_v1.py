"""Render X God with the hand-drawn laser blaster integrated into each pose.

Run from the project root with Blender's background Python. This script reads
the polished v4 scene but saves a separate scene copy and output frame set.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/runner-blaster-v1/frames'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
objects = bpy.data.objects
for obj in objects:
    obj.animation_data_clear()
    if obj.type != 'CAMERA':
        obj.rotation_euler = (0, 0, 0)
root = objects['XGod_Dash_Root']
root.location = (0, 0, 0)


def paper_material(name, dark, light):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 15
    noise.inputs['Roughness'].default_value = 0.75
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (*light, 1)
    emission = nodes.new('ShaderNodeEmission')
    output = nodes.new('ShaderNodeOutputMaterial')
    links = material.node_tree.links
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs[0])
    return material


ink = paper_material('blaster-v1 soft ink seam', (0.045, 0.025, 0.015), (0.09, 0.06, 0.035))
denim = paper_material('blaster-v1 orange pencil pants', (0.45, 0.19, 0.025), (0.69, 0.36, 0.07))
skin = paper_material('blaster-v1 pencil skin', (0.56, 0.34, 0.17), (0.79, 0.59, 0.37))
shirt = paper_material('blaster-v1 shaded shirt', (0.53, 0.53, 0.50), (0.79, 0.77, 0.70))


def disk(name, radius_x, radius_y, material):
    vertices = [(radius_x * math.cos(i * math.tau / 20), radius_y * math.sin(i * math.tau / 20), 0) for i in range(20)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [tuple(range(20))])
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj['joint_cover'] = True
    return obj


def cover_joint(name, child_name, radius_x, radius_y, fill):
    child = objects[child_name]
    for suffix, material, radius, z_offset in [('outline', ink, 1.10, -0.0015), ('fill', fill, 1, -0.0005)]:
        obj = disk(f'joint_{name}_{suffix}', radius_x * radius, radius_y * radius, material)
        obj.parent = child.parent
        obj.matrix_parent_inverse = child.matrix_parent_inverse.copy()
        obj.location = child.location.copy()
        obj.location.z += z_offset


for name, child, rx, ry, material in [
    ('front_hip', 'leg_right_thigh_plain_front', 0.39, 0.37, denim),
    ('back_hip', 'leg_left_thigh_pocket_back', 0.38, 0.36, denim),
    ('front_knee', 'leg_right_shin_front', 0.31, 0.32, denim),
    ('back_knee', 'leg_left_shin_back', 0.31, 0.32, denim),
    ('front_shoulder', 'arm_right_upper_front', 0.26, 0.24, shirt),
    ('back_shoulder', 'arm_left_upper_back', 0.27, 0.24, shirt),
    ('front_elbow', 'arm_right_forearm_front', 0.22, 0.22, skin),
    ('back_elbow', 'arm_left_forearm_back', 0.22, 0.22, skin),
]:
    cover_joint(name, child, rx, ry, material)

scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.engine = 'BLENDER_EEVEE'
scene.render.fps = 16
scene.camera.data.ortho_scale = 10.8
scene.camera.location.y = 0.9


def angle(name, degrees):
    objects[name].rotation_euler.z = math.radians(degrees)


def pose(thigh_front, knee_front, thigh_back, knee_back, arm_front, elbow_front, arm_back, elbow_back, lean=-10):
    angle('torso_shirt', lean)
    angle('head_hair', -lean * 0.3)
    # Keep the weapon hand in a stable forward grip through locomotion. The
    # rear arm still counter-swings, while the front hand remains attached to
    # the blaster instead of making it float around the chest and face.
    arm_front, elbow_front = -14, 28
    for name, value in [
        ('leg_right_thigh_plain_front', thigh_front), ('leg_right_shin_front', knee_front),
        ('leg_left_thigh_pocket_back', thigh_back), ('leg_left_shin_back', knee_back),
        ('arm_right_upper_front', arm_front), ('arm_right_forearm_front', elbow_front),
        ('arm_left_upper_back', arm_back), ('arm_left_forearm_back', elbow_back),
    ]:
        angle(name, value)
    angle('foot_right_front', -(thigh_front + knee_front) * 0.35)
    angle('foot_left_back', -(thigh_back + knee_back) * 0.35)


actions = {}
actions['idle'] = [
    (-8, 0, 24, 0, -14, 28, 16, 26, 0),
    (-8, 0, 24, 0, -13, 29, 15, 27, 1),
    (-8, 0, 24, 0, -14, 28, 16, 26, 0),
    (-8, 0, 24, 0, -15, 27, 17, 25, -1),
]
actions['run'] = []
for index in range(8):
    phase = index * math.tau / 8
    front = math.cos(phase)
    back = -front
    actions['run'].append((52*front - 8, -88*max(0,-front), 52*back + 24, -88*max(0,-back),
                           -55*front, 80, 55*front, 80, -28))
actions['jump'] = [
    (35,-55,-12,-30,105,0,-25,25,-6), (55,-90,-8,-45,115,-5,-35,25,-3),
    (60,-95,5,-65,115,-5,-30,25,-2), (45,-75,-10,-45,105,-5,-25,30,-4),
    (20,-25,-8,-20,85,10,-15,25,-8), (15,-35,14,-40,40,35,-20,35,-14),
]
actions['crouch'] = [
    (45,-80,65,-85,65,-20,-25,50,-26), (75,-125,95,-130,75,-30,-35,55,-48),
    (90,-150,110,-150,80,-35,-35,60,-65), (90,-150,110,-150,80,-35,-35,60,-65),
]
actions['attack'] = [
    (-8,0,24,0,-14,28,16,26,-2), (-8,0,24,0,-14,28,16,26,-5),
    (-8,0,24,0,-14,28,16,26,-7), (-8,0,24,0,-14,28,16,26,-5),
    (-8,0,24,0,-14,28,16,26,-2), (-8,0,24,0,-14,28,16,26,1),
    (-8,0,24,0,-14,28,16,26,0), (-8,0,24,0,-14,28,16,26,0),
]

# A transparent raster plane keeps the original pencil-and-ink art while the
# hand position follows the Blender rig independently in every rendered pose.
bpy.ops.mesh.primitive_plane_add(size=1)
blaster = bpy.context.object
blaster.name = 'Runner_Ink_Marker_Blaster'
for vertex in blaster.data.vertices:
    vertex.co.x *= 4.4
    vertex.co.y *= 2.93
material = bpy.data.materials.new('Runner_Blaster_Alpha')
material.use_nodes = True
material.surface_render_method = 'DITHERED'
nodes = material.node_tree.nodes
nodes.clear()
texture = nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(ROOT / 'public/characters/xgod/ink-marker-blaster-v1.png'))
texture.image.pack()
emission = nodes.new('ShaderNodeEmission')
transparent = nodes.new('ShaderNodeBsdfTransparent')
mix = nodes.new('ShaderNodeMixShader')
output = nodes.new('ShaderNodeOutputMaterial')
links = material.node_tree.links
links.new(texture.outputs['Color'], emission.inputs['Color'])
links.new(texture.outputs['Alpha'], mix.inputs[0])
links.new(transparent.outputs[0], mix.inputs[1])
links.new(emission.outputs[0], mix.inputs[2])
links.new(mix.outputs[0], output.inputs[0])
blaster.data.materials.append(material)

pose(*actions['idle'][0])
bpy.context.view_layer.update()
scene.frame_start, scene.frame_end = 1, 4
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/xgod-side-scroll-v1/blender/runner-blaster-v1.blend'))

for action, poses in actions.items():
    for index, values in enumerate(poses, 1):
        scene.frame_set(index)
        pose(*values)
        bpy.context.view_layer.update()
        hand = objects['hand_right_front']
        hand_position = sum((hand.matrix_world @ Vector(corner) for corner in hand.bound_box), Vector()) / 8
        # The sprite's grip sits well left of the plane center. Place that grip
        # at the rigged forward hand, and keep the hand in front of the weapon
        # so the contact reads clearly in the 2D render.
        blaster.location = (hand_position.x + 1.30, hand_position.y + 0.50, 1.20)
        blaster.rotation_euler = (0, 0, 0)
        for obj in objects:
            if obj.type != 'CAMERA':
                obj.keyframe_insert('rotation_euler', frame=index)
        scene.render.filepath = str(OUT / f'{action}-{index:02d}.png')
        bpy.ops.render.render(write_still=True)
    scene.frame_start, scene.frame_end = 1, len(poses)
    for obj in objects:
        obj.animation_data_clear()
