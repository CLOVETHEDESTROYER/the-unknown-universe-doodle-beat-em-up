import type { CrumblingPlatformPlan, TimedVentPlan } from './groundObstacles';

export interface RouteRect {x:number;y:number;w:number;h:number}
export interface ConveyorPlan extends RouteRect {speed:number}
export interface PendulumPlan {x:number;y:number;length:number;radius:number;arc:number;period:number;phase:number}
export interface PlatformRoute {
  title:string;start:number;length:number;floor:number;groundHeight:number;
  ground:RouteRect[];platforms:RouteRect[];crumblingPlatforms:CrumblingPlatformPlan[];
  movingPlatforms:(RouteRect & {travel:number;period:number;axis:'x'|'y';phase:number})[];
  springPads:{x:number;y:number;width:number;launchSpeed:number}[];
  timedVents:TimedVentPlan[];conveyors:ConveyorPlan[];pendulums:PendulumPlan[];
  hazards:RouteRect[];checkpoints:{x:number;y:number}[];coins:{x:number;y:number}[];
}

function course(start:number,floor:number,groundHeight:number,title:string,variant:number):PlatformRoute {
  const rect=(x:number,rise:number,w:number,h=34)=>({x:start+x,y:floor-rise,w,h});
  const high=variant===1?225:245;
  const conveyors:ConveyorPlan[]=[
    {...rect(270,145,300),speed:85},
    {...rect(1290,0,270,28),speed:variant%2===0?85:-75},
  ];
  const platforms=[rect(110,70,110),rect(670,high,160),rect(1420,high-20,180),
    rect(1740,120,120),rect(720,68,86,68),rect(960,70,125),...conveyors];
  const crumblingPlatforms=[{...rect(910,high,145),crumbleMs:900},
    {...rect(1600,180,120),crumbleMs:850}];
  const pendulums=[{x:start+810,y:floor-275,length:200,radius:23,arc:1.0,period:3400,phase:.18}];
  if(variant>0)pendulums.push({x:start+1530,y:floor-265,length:190,radius:23,arc:.9,period:variant===4?2900:3800,phase:.65});
  const coins=[...[350,440,530].map(x=>({x:start+x,y:floor-205})),
    ...[710,780,950,1010,1190,1460,1540,1640,1780,1860].map(x=>({x:start+x,y:floor-(x<1560?high+55:x<1720?235:180)}))];
  return {
    title,start,length:2000,floor,groundHeight,
    ground:[rect(0,0,1040,groundHeight),rect(1180,0,820,groundHeight)],platforms,crumblingPlatforms,
    movingPlatforms:[{...rect(1150,high-30,155),travel:65,period:variant===1?4400:3900,axis:variant===1?'y':'x',phase:.25}],
    springPads:[{x:start+310,y:floor,width:88,launchSpeed:710}],
    timedVents:variant===2||variant===4?[{x:start+1420,y:floor,w:64,height:115,phase:.3}]:[],
    conveyors,pendulums,coins,
    hazards:[{x:start+1040,y:552,w:140,h:34}],
    checkpoints:[{x:start+40,y:floor-65},{x:start+1240,y:floor-65},{x:start+1960,y:floor-65}],
  };
}

/** Inserted after the existing encounters, before each intact boss yard. */
export const PLATFORM_ROUTES:Record<number,PlatformRoute>={
  1:course(9385,480,240,'SKYLINE EXPRESS',0),
  2:course(9645,480,240,'BELL TOWER CROSSING',1),
  3:course(7995,520,120,'CINDER CONVEYOR WORKS',2),
  4:course(8120,520,200,'MOONTHORN CANOPY',3),
  6:course(8024,520,120,'ORBITAL CAUSEWAY',4),
};
