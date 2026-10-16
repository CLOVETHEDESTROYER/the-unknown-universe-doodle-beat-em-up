"""Render an upright broad sword using the existing pencil puppet and hand socket.

blender -b art/xgod-side-scroll-v1/blender/runner-polished-v4.blend --python scripts/render_xgod_sword_idle_v3.py
"""
from pathlib import Path

# Share the source puppet setup, leg cleanup, camera, and alpha prop helpers.
ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'scripts/render_xgod_motion_v2.py'
exec(compile(source.read_text().split('actions = {}')[0], str(source), 'exec'))
OUT = ROOT / 'output/xgod-sword-idle-v3/frames'
OUT.mkdir(parents=True, exist_ok=True)
blaster.hide_render = sword.hide_render = True
upright = make_prop('XGod_Upright_Flame_Sword',
                    'public/characters/xgod/flame-sword-upright-v1.png',
                    2.8, 5.1, (0.5, 0.835))
manifest = {'weaponHand': 'right', 'sourceHandSocket': WEAPON_HAND, 'actions': {'sword-idle': []}}
for index in range(4):
    reset()
    torso(math.sin(index * math.tau / 4) * 0.6)
    angle('leg_right_thigh_plain_front', -8)
    angle('leg_left_thigh_pocket_back', 24)
    angle('foot_right_front', 8)
    angle('foot_left_back', -24)
    arms(92, 20, -14, 28)
    center = place_prop(upright, -22)
    manifest['actions']['sword-idle'].append({'grip': pixel(center)})
    scene.render.filepath = str(OUT / f'sword-idle-{index:02d}.png')
    bpy.ops.render.render(write_still=True)
    hidden = {obj.name: obj.hide_render for obj in objects if obj.type == 'MESH'}
    for name in hidden:
        objects[name].hide_render = name not in FEET
    scene.render.filepath = str(OUT / f'sword-idle-{index:02d}-feet.png')
    bpy.ops.render.render(write_still=True)
    for name, value in hidden.items():
        objects[name].hide_render = value
(OUT.parent / 'render-attachments.json').write_text(json.dumps(manifest, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/xgod-side-scroll-v1/blender/xgod-sword-idle-v3.blend'))
