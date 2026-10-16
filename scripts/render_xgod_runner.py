"""Render versioned runner actions from the existing paper-cut Blender rig."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/runner-motion-v3/frames'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
objects = bpy.data.objects
for obj in objects:
    obj.animation_data_clear()
    if obj.type != 'CAMERA':
        obj.rotation_euler = (0, 0, 0)
root = objects['XGod_Dash_Root']
root.location = (0, 0, 0)
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
actions['run'] = []
for index in range(8):
    phase = index * math.tau / 8
    front = math.cos(phase)
    back = -front
    # The two paper-cut thighs have different rest angles; compensate before the swing.
    actions['run'].append((52*front - 8, -88*max(0,-front), 52*back + 24, -88*max(0,-back),
                           -55*front, 80, 55*front, 80, -28))
actions['jump'] = [
    (35,-55,-12,-30,105,0,-25,25,-6),
    (55,-90,-8,-45,115,-5,-35,25,-3),
    (60,-95,5,-65,115,-5,-30,25,-2),
    (45,-75,-10,-45,105,-5,-25,30,-4),
    (20,-25,-8,-20,85,10,-15,25,-8),
    (15,-35,14,-40,40,35,-20,35,-14),
]
actions['crouch'] = [
    (45,-80,65,-85,65,-20,-25,50,-26),
    (75,-125,95,-130,75,-30,-35,55,-48),
    (90,-150,110,-150,80,-35,-35,60,-65),
    (90,-150,110,-150,80,-35,-35,60,-65),
]
actions['attack'] = [
    (25,-20,-25,-15,-45,65,20,35,-8),
    (20,-25,-30,-25,-65,80,35,60,-14),
    (32,-30,-35,-10,10,35,-35,60,-16),
    (35,-28,-40,-5,95,-8,-50,65,-18),
    (35,-28,-40,-5,95,-8,-50,65,-18),
    (28,-20,-25,-25,20,40,-25,50,-12),
    (25,-20,-25,-15,-10,55,10,40,-10),
    (25,-20,-25,-15,-25,58,25,58,-12),
]

# Use the approved raster sword as a prop, attached to the rendered hand.
bpy.ops.mesh.primitive_plane_add(size=1)
sword = bpy.context.object
sword.name = 'Runner_Flame_Sword'
for vertex in sword.data.vertices:
    vertex.co.x *= 1.55
    vertex.co.y = vertex.co.y * 3.3 + 1.22
material = bpy.data.materials.new('Runner_Sword_Alpha')
material.use_nodes = True
material.surface_render_method = 'DITHERED'
nodes = material.node_tree.nodes
nodes.clear()
tex = nodes.new('ShaderNodeTexImage')
tex.image = bpy.data.images.load(str(ROOT / 'public/xgod_sword_reward_fit.png'))
tex.image.pack()
emission = nodes.new('ShaderNodeEmission')
transparent = nodes.new('ShaderNodeBsdfTransparent')
mix = nodes.new('ShaderNodeMixShader')
output = nodes.new('ShaderNodeOutputMaterial')
links = material.node_tree.links
links.new(tex.outputs['Color'], emission.inputs['Color'])
links.new(tex.outputs['Alpha'], mix.inputs[0])
links.new(transparent.outputs[0], mix.inputs[1])
links.new(emission.outputs[0], mix.inputs[2])
links.new(mix.outputs[0], output.inputs[0])
sword.data.materials.append(material)

for action, poses in list(actions.items()) + [(f'sword-{name}', poses) for name, poses in actions.items()]:
    sword.hide_render = not action.startswith('sword-')
    for index, values in enumerate(poses, 1):
        scene.frame_set(index)
        pose(*values)
        bpy.context.view_layer.update()
        hand = objects['hand_right_front']
        sword.location = sum((hand.matrix_world @ Vector(corner) for corner in hand.bound_box), Vector()) / 8
        sword.location.z = 0.15
        sword.rotation_euler.z = math.radians([-30, 20, -30, -85, -85, -55, -35, -30][index - 1] if action == 'sword-attack' else -80 if action == 'sword-crouch' else -25)
        for obj in objects:
            if obj.type != 'CAMERA':
                obj.keyframe_insert('rotation_euler', frame=index)
        scene.render.filepath = str(OUT / f'{action}-{index:02d}.png')
        bpy.ops.render.render(write_still=True)
    scene.frame_start, scene.frame_end = 1, len(poses)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / f'art/xgod-side-scroll-v1/blender/runner-{action}-v3.blend'))
    for obj in objects:
        obj.animation_data_clear()
