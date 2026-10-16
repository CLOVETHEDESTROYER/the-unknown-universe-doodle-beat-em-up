"""Render the existing pencil puppet with a compact stride and one weapon hand.

blender -b art/xgod-side-scroll-v1/blender/runner-polished-v4.blend --python scripts/render_xgod_motion_v2.py
The approved drawn sword run/slash remain the runtime's sword movement actions.
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/xgod-motion-v2/frames'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
objects = bpy.data.objects
for obj in objects:
    obj.animation_data_clear()
    if obj.type != 'CAMERA':
        obj.rotation_euler = (0, 0, 0)
objects['XGod_Dash_Root'].location = (0, 0, 0)
bpy.context.view_layer.update()
rest_locations = {obj.name: obj.location.copy() for obj in objects}

# The source puppet's historical left/back label is the visible near arm.
# That is the weapon arm in the approved drawn right-handed sword run.
WEAPON_HAND = 'hand_left_back'
FEET = {'foot_left_back', 'foot_right_front'}
legs = {}
for side, thigh, knee, foot in [
    ('front', 'leg_right_thigh_plain_front', 'leg_right_shin_front', 'foot_right_front'),
    ('back', 'leg_left_thigh_pocket_back', 'leg_left_shin_back', 'foot_left_back'),
]:
    hip = objects[thigh].matrix_world.translation.xy.copy()
    middle = objects[knee].matrix_world.translation.xy.copy()
    ankle = objects[foot].matrix_world.translation.xy.copy()
    upper, lower = middle - hip, ankle - middle
    legs[side] = (thigh, knee, foot, hip, upper.length, lower.length,
                  math.atan2(upper.y, upper.x), math.atan2(lower.y, lower.x))

    # The old calf cutout also contains a shoe. Remove that duplicate before
    # articulating the separate, level foot or it protrudes on bent-knee poses.
    calf = objects[knee]
    world_vertices = [calf.matrix_world @ vertex.co for vertex in calf.data.vertices]
    low, high = min(point.y for point in world_vertices), max(point.y for point in world_vertices)
    uv = calf.data.uv_layers.active.data
    uv_span = max(loop.uv.y for loop in uv) - min(loop.uv.y for loop in uv)
    shifts = {}
    for vertex, point in zip(calf.data.vertices, world_vertices):
        shift = max(0, ankle.y + globals().get('CALF_SHOE_CLEARANCE', 0.08) - point.y)
        if shift:
            vertex.co += calf.matrix_world.inverted().to_3x3() @ Vector((0, shift, 0))
            shifts[vertex.index] = shift
    for loop in calf.data.loops:
        if loop.vertex_index in shifts:
            uv[loop.index].uv.y += shifts[loop.vertex_index] / (high - low) * uv_span

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


def reset():
    for name, location in rest_locations.items():
        objects[name].location = location
        if objects[name].type != 'CAMERA':
            objects[name].rotation_euler = (0, 0, 0)


def leg_target(side, x, y):
    thigh, knee, foot, hip, upper, lower, rest_upper, rest_lower = legs[side]
    delta = Vector((x, y)) - hip
    distance = max(abs(upper - lower) + 0.01, min(delta.length, upper + lower - 0.01))
    direction = math.atan2(delta.y, delta.x)
    bend = math.acos(max(-1, min(1, (upper * upper + distance * distance - lower * lower) / (2 * upper * distance))))
    upper_angle = direction + bend * globals().get('LEG_BEND_SIGNS', {}).get(side, 1)
    middle = hip + Vector((math.cos(upper_angle), math.sin(upper_angle))) * upper
    lower_angle = math.atan2(y - middle.y, x - middle.x)
    first = upper_angle - rest_upper
    second = lower_angle - rest_lower - first
    angle(thigh, math.degrees(first))
    angle(knee, math.degrees(second))
    # Keep the soles level, including the passing leg, instead of twisting shoes.
    angle(foot, -math.degrees(first + second))


def arms(near_upper, near_elbow, far_upper, far_elbow):
    angle('arm_left_upper_back', near_upper)
    angle('arm_left_forearm_back', near_elbow)
    angle('arm_right_upper_front', far_upper)
    angle('arm_right_forearm_front', far_elbow)


def torso(lean, compress=0):
    angle('torso_shirt', lean)
    angle('head_hair', -lean * 0.6)
    objects['torso_shirt'].location.y -= compress


def make_prop(name, path, width, height, grip):
    bpy.ops.mesh.primitive_plane_add(size=1)
    prop = bpy.context.object
    prop.name = name
    for vertex in prop.data.vertices:
        vertex.co.x = vertex.co.x * width + (0.5 - grip[0]) * width
        vertex.co.y = vertex.co.y * height + (grip[1] - 0.5) * height
    material = bpy.data.materials.new(name + '_paper_alpha')
    material.use_nodes = True
    material.surface_render_method = 'DITHERED'
    nodes = material.node_tree.nodes
    nodes.clear()
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = bpy.data.images.load(str(ROOT / path))
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
    prop.data.materials.append(material)
    prop.hide_render = True
    return prop


blaster = make_prop('XGod_Right_Hand_Blaster', 'public/characters/xgod/ink-marker-blaster-v1.png', 3.9, 2.6, (0.23, 0.60))
sword = make_prop('XGod_Right_Hand_Sword', 'public/xgod_sword_reward_fit.png', 2.1, 4.5, (0.502, 0.83))


def pixel(point):
    value = world_to_camera_view(scene, scene.camera, point)
    return [value.x * 512, (1 - value.y) * 512]


def place_prop(prop, degrees):
    bpy.context.view_layer.update()
    hand = objects[WEAPON_HAND]
    center = sum((hand.matrix_world @ Vector(corner) for corner in hand.bound_box), Vector()) / 8
    prop.location = center
    # Fingers overlap the handle; the tool stays ahead of the torso's ink layer.
    prop.location.z = center.z - 0.0008
    prop.rotation_euler.z = math.radians(degrees)
    prop.hide_render = False
    bpy.context.view_layer.update()
    return center


actions = {}
for weapon in ['blaster', 'sword']:
    for action, count in [('idle', 4), ('jump', 6), ('crouch', 6)]:
        actions[f'{weapon}-{action}'] = count
actions['blaster-run'] = 8
actions['blaster-attack'] = 8
manifest = {'weaponHand': 'right', 'sourceHandSocket': WEAPON_HAND, 'actions': {}}

for action, count in actions.items():
    weapon, state = action.split('-')
    records = []
    for index in range(count):
        reset()
        blaster.hide_render = sword.hide_render = True
        phase = index * math.tau / count
        if state == 'run':
            torso(-9 + math.sin(phase * 2) * 1.0)
            for side, offset in [('front', 0), ('back', 4)]:
                step = (index + offset) % 8
                swing = max(0, math.sin((step - 4) * math.pi / 4)) if step > 4 else 0
                x = 0.75 - 0.375 * step if step <= 4 else -0.75 + 0.375 * (step - 4)
                leg_target(side, legs[side][3].x + x, -1.80 + swing * 0.90 + math.sin(phase * 2) * 0.035)
            arms(50 + 2 * math.sin(phase), 75 - 2 * math.sin(phase), -18 * math.cos(phase), 48 + 8 * math.sin(phase))
        elif state == 'crouch':
            t = index / (count - 1)
            t = t * t * (3 - 2 * t)
            torso(-14 * t, 0.18 * t)
            leg_target('front', 0.43 + 0.30 * t, -1.99 + 1.20 * t)
            # Bring the rear ankle beneath the hips so the knee folds forward,
            # rather than dipping below the sole in the deepest squat.
            leg_target('back', -1.00 + 1.00 * t, -1.99 + 1.20 * t)
            if weapon == 'blaster':
                arms(50 - 8 * t, 75 + 20 * t, -14 + 16 * t, 28 + 22 * t)
            else:
                arms(16 + 16 * t, 26 + 29 * t, -14 + 12 * t, 28 + 20 * t)
        elif state == 'jump':
            tuck = [0.35, 0.8, 1.0, 0.65, 0.15, 0.0][index]
            torso(-5 - 3 * tuck)
            leg_target('front', 0.43 + 0.38 * tuck, -1.90 + 0.90 * tuck)
            leg_target('back', -0.80 - 0.10 * tuck, -1.90 + 1.1 * tuck)
            arms(50, 75, 12 + 16 * tuck, 45) if weapon == 'blaster' else arms(20 + 8 * tuck, 38, 8 + 30 * tuck, 48)
        else:
            recoil = [0, -2, -4, -3, -1, 0, 0, 0][index] if state == 'attack' else math.sin(phase) * 0.6
            torso(recoil)
            angle('leg_right_thigh_plain_front', -8)
            angle('leg_left_thigh_pocket_back', 24)
            angle('foot_right_front', 8)
            angle('foot_left_back', -24)
            arms(50, 75, -14 + recoil * 0.3, 28) if weapon == 'blaster' else arms(16, 26, -14, 28)

        prop = blaster if weapon == 'blaster' else sword
        sword_angle = 132 if state == 'idle' else 132 - 22 * (index / (count - 1)) if state == 'crouch' else 115
        center = place_prop(prop, 0 if weapon == 'blaster' else sword_angle)
        record = {'grip': pixel(center)}
        if weapon == 'blaster':
            record['muzzle'] = pixel(prop.matrix_world @ Vector(((0.90 - 0.23) * 3.9, (0.60 - 0.38) * 2.6, 0)))
        scene.render.filepath = str(OUT / f'{action}-{index:02d}.png')
        bpy.ops.render.render(write_still=True)

        if '--inspect-crouch' in sys.argv and action == 'blaster-crouch' and index == 5:
            hidden = {obj.name: obj.hide_render for obj in objects if obj.type == 'MESH'}
            for name in hidden:
                for other in hidden:
                    objects[other].hide_render = other != name
                scene.render.filepath = str(OUT / f'inspect-{name}.png')
                bpy.ops.render.render(write_still=True)
            for name, value in hidden.items():
                objects[name].hide_render = value

        # A weapon below a shoe must not shift the character's ground anchor.
        visibility = {obj.name: obj.hide_render for obj in objects if obj.type == 'MESH'}
        for name in visibility:
            objects[name].hide_render = name not in FEET
        scene.render.filepath = str(OUT / f'{action}-{index:02d}-feet.png')
        bpy.ops.render.render(write_still=True)
        for name, hidden in visibility.items():
            objects[name].hide_render = hidden
        records.append(record)
    manifest['actions'][action] = records

(OUT.parent / 'render-attachments.json').write_text(json.dumps(manifest, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/xgod-side-scroll-v1/blender/xgod-motion-v2.blend'))
