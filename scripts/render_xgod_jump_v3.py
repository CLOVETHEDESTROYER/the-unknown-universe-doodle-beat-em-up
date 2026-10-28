"""Render a coherent eight-pose airborne/landing strip from the approved pencil puppet.

blender -b art/xgod-side-scroll-v1/blender/runner-polished-v4.blend --python scripts/render_xgod_jump_v3.py
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'scripts/render_xgod_motion_v2.py'
CALF_SHOE_CLEARANCE=.28
exec(compile(source.read_text().split('actions = {}')[0],str(source),'exec'))
OUT=ROOT/'output/xgod-jump-v3/frames'
OUT.mkdir(parents=True,exist_ok=True)
upright=make_prop('XGod_Jump_Flame_Sword','public/characters/xgod/flame-sword-upright-v1.png',2.8,5.1,(.5,.835))
manifest={'weaponHand':'right','sourceHandSocket':WEAPON_HAND,'swordAsset':'characters/xgod/flame-sword-upright-v1.png',
          'swordSize':[2.8,5.1],'actions':{}}
# front ankle, rear ankle, torso lean, compression, sword angle, free-arm swing
poses=[
    ((.45,-1.88),(-1.05,-1.65),-7,0,-24,-18),
    ((.90,-1.12),(-.90,-1.25),-9,0,-26,4),
    ((1.05,-.76),(-.42,-.78),-6,0,-29,20),
    ((.86,-.82),(-.65,-.94),-2,0,-27,26),
    ((.70,-1.35),(-.95,-1.20),1,0,-24,12),
    ((.52,-1.94),(-.86,-1.82),2,0,-22,-4),
    ((.65,-1.48),(-.80,-1.48),-7,.42,-26,12),
    ((.48,-1.82),(-.95,-1.82),-1,.08,-22,-8),
]
for weapon in ['sword','blaster']:
    records=[]
    for index,(front,back,lean,compression,sword_angle,free_arm) in enumerate(poses):
        reset();blaster.hide_render=sword.hide_render=upright.hide_render=True
        torso(lean,compression)
        # The trailing knee folds behind the hip, above the ankle, rather than
        # folding below the shoe when the ankle is tucked close to the body.
        LEG_BEND_SIGNS={'back':-1 if index in (1,2,3,4) else 1}
        leg_target('front',*front);leg_target('back',*back)
        if weapon=='sword':
            arms(92+(2 if index in (1,2) else 0),20,free_arm,38)
            prop=upright;center=place_prop(prop,sword_angle)
        else:
            arms(50,75,free_arm,38)
            prop=blaster;center=place_prop(prop,0)
        record={'grip':pixel(center)}
        if weapon=='blaster':record['muzzle']=pixel(prop.matrix_world@Vector(((.90-.23)*3.9,(.60-.38)*2.6,0)))
        scene.render.filepath=str(OUT/f'{weapon}-jump-{index:02d}.png')
        bpy.ops.render.render(write_still=True)
        if '--inspect-jump' in sys.argv and weapon=='sword' and index==2:
            hidden={obj.name:obj.hide_render for obj in objects if obj.type=='MESH'}
            for part in ['leg_right_thigh_plain_front','leg_left_thigh_pocket_back','leg_right_shin_front','leg_left_shin_back','joint_front_knee_fill','joint_back_knee_fill']:
                if part not in objects:continue
                for name in hidden:objects[name].hide_render=name!=part
                scene.render.filepath=str(OUT/f'inspect-{part}.png');bpy.ops.render.render(write_still=True)
            for name,value in hidden.items():objects[name].hide_render=value
        # Landing frames are foot-anchored; airborne frames share one root transform.
        if index>=6:
            hidden={obj.name:obj.hide_render for obj in objects if obj.type=='MESH'}
            for name in hidden:objects[name].hide_render=name not in FEET
            scene.render.filepath=str(OUT/f'{weapon}-jump-{index:02d}-feet.png')
            bpy.ops.render.render(write_still=True)
            for name,value in hidden.items():objects[name].hide_render=value
        records.append(record)
    manifest['actions'][f'{weapon}-jump']=records
(OUT.parent/'render-attachments.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/xgod-side-scroll-v1/blender/xgod-jump-v3.blend'))
