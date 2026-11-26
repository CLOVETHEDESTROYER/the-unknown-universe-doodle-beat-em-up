export const NEW_BUDDY_IDS=['scribble-fox','puddle','rumble-puff','chomp-chest','orbit'] as const;
export type NewBuddyId=typeof NEW_BUDDY_IDS[number];
export const isNewBuddy=(id:string):id is NewBuddyId=>(NEW_BUDDY_IDS as readonly string[]).includes(id);
export interface BuddyTarget {x:number;y:number;hp:number;boss:boolean;hit:(amount:number)=>boolean;slow:()=>void}
export interface BuddyShot {x:number;y:number;vx:number;vy:number;deflect:()=>void}
export interface BuddyWorld {x:number;y:number;targets:BuddyTarget[];shots:BuddyShot[];kills:number;heal:(amount:number)=>number;repair:()=>boolean;magnet:()=>void}
export const newBuddyState=()=>({nextAt:0,assistAt:-9999,assists:0,healed:0,repaired:0,deflected:0,scrap:0,seenKills:0});
export type BuddyState=ReturnType<typeof newBuddyState>;
/** Simulation-clock only: callers omit updates during pause, hit-stop and transitions. */
export function updateBuddyHelp(s:BuddyState,id:NewBuddyId,now:number,w:BuddyWorld){
  if(id==='chomp-chest')s.scrap=Math.min(3,s.scrap+Math.max(0,w.kills-s.seenKills));
  s.seenKills=w.kills;
  if(id==='orbit')w.magnet();
  if(now<s.nextAt)return false;
  const near=w.targets.filter(t=>t.hp>0&&Math.hypot(t.x-w.x,t.y-w.y)<330);
  let used=false,cooldown=0;
  if(id==='scribble-fox'&&near.length){const target=near[0],accepted=target.hit(4);used=true;cooldown=accepted&&target.hp<=4?1800:3200;}
  if(id==='puddle'&&near.length){const healed=w.heal(8);s.healed+=healed;used=healed>0;cooldown=10000;}
  if(id==='rumble-puff'){
    for(const target of near.filter(t=>Math.hypot(t.x-w.x,t.y-w.y)<185)){used=true;if(target.hit(3)&&!target.boss)target.slow();}
    cooldown=6500;
  }
  if(id==='chomp-chest'&&s.scrap>=3&&w.repair()){s.scrap=0;s.repaired++;used=true;cooldown=1000;}
  if(id==='orbit'){
    const incoming=w.shots.filter(p=>Math.hypot(p.x-w.x,p.y-w.y)<175&&(w.x-p.x)*p.vx+(w.y-p.y)*p.vy>0);
    for(const shot of incoming)shot.deflect();
    s.deflected+=incoming.length;used=incoming.length>0;cooldown=6000;
  }
  if(used){s.nextAt=now+cooldown;s.assistAt=now;s.assists++;}
  return used;
}
