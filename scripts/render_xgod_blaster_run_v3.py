"""Bake a sixteen-pose athletic blaster run from the approved pencil puppet."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'scripts/render_xgod_motion_v2.py'
CALF_SHOE_CLEARANCE=.28
exec(compile(source.read_text().split('actions = {}')[0],str(source),'exec'))
OUT=ROOT/'output/xgod-blaster-run-v3/frames';OUT.mkdir(parents=True,exist_ok=True)

def solve_leg(side,target,swing):
    thigh,knee,foot,*_=legs[side]
    bpy.context.view_layer.update()
    hip=objects[thigh].matrix_world.translation.xy.copy()
    middle=objects[knee].matrix_world.translation.xy.copy()
    ankle=objects[foot].matrix_world.translation.xy.copy()
    upper=(middle-hip).length;lower=(ankle-middle).length
    delta=Vector(target)-hip
    distance=max(abs(upper-lower)+.01,min(delta.length,upper+lower-.01))
    direction=math.atan2(delta.y,delta.x)
    bend=math.acos(max(-1,min(1,(upper*upper+distance*distance-lower*lower)/(2*upper*distance))))
    upper_angle=direction+bend
    knee_y=hip.y+math.sin(upper_angle)*upper
    if swing>.8 and knee_y<target[1]-.05:upper_angle=direction-bend
    rest_angle=math.atan2((middle-hip).y,(middle-hip).x)
    angle(thigh,math.degrees(upper_angle-rest_angle))
    bpy.context.view_layer.update()
    middle=objects[knee].matrix_world.translation.xy.copy()
    ankle=objects[foot].matrix_world.translation.xy.copy()
    desired=math.atan2(target[1]-middle.y,target[0]-middle.x)
    actual=math.atan2((ankle-middle).y,(ankle-middle).x)
    angle(knee,math.degrees(desired-actual))
    bpy.context.view_layer.update()
    # Preserve a planted sole, with a small toe-off through the recovery arc.
    matrix=objects[foot].matrix_world
    sole=math.atan2(matrix[1][0],matrix[0][0])
    objects[foot].rotation_euler.z-=sole
    bpy.context.view_layer.update()
    return (objects[foot].matrix_world.translation.xy-Vector(target)).length

records=[]
for index in range(16):
    reset();blaster.hide_render=sword.hide_render=True
    phase=index/16;cycle=phase*math.tau
    objects['XGod_Dash_Root'].location.y=-.80+.12*math.cos(cycle*2)
    torso(-22+math.sin(cycle*2)*2.2)
    arms(50+math.sin(cycle*2)*4,75-math.sin(cycle*2)*5,
         -15+math.sin(cycle)*45,52+math.cos(cycle)*14)
    bpy.context.view_layer.update()
    contacts=[];plant_errors=[]
    for side,offset in [('front',0),('back',.5)]:
        step=(phase+offset)%1
        if step<.3:
            x=1.3*(1-2*step/.3);lift=0;contacts.append(side)
        else:
            t=(step-.3)/.7;smooth=t*t*(3-2*t)
            x=-1.3+2.6*smooth;lift=math.sin(t*math.pi)*1.35
        hip=objects[legs[side][0]].matrix_world.translation.xy.copy()
        error=solve_leg(side,(hip.x+x,-1.96+lift),lift)
        if step<.3:plant_errors.append(error)
    center=place_prop(blaster,math.sin(cycle)*2.2)
    record={'grip':pixel(center),'muzzle':pixel(blaster.matrix_world@Vector(((.90-.23)*3.9,(.60-.38)*2.6,0))),
            'contacts':contacts,'plantErrors':plant_errors}
    scene.render.filepath=str(OUT/f'blaster-run-{index:02d}.png');bpy.ops.render.render(write_still=True)
    if index==0:
        hidden={obj.name:obj.hide_render for obj in objects if obj.type=='MESH'}
        for name in hidden:objects[name].hide_render=name not in FEET
        scene.render.filepath=str(OUT/'ground-reference-feet.png');bpy.ops.render.render(write_still=True)
        for name,value in hidden.items():objects[name].hide_render=value
    records.append(record)
manifest={'weaponHand':'right','sourceHandSocket':WEAPON_HAND,'frames':16,'fps':32,
          'cycleMs':500,'stride':2.6,'actions':{'blaster-run':records}}
(OUT.parent/'render-attachments.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/xgod-side-scroll-v1/blender/xgod-blaster-run-v3.blend'))
