export interface WorkshopAction { name:string; start:number; count:number; fps:number }
export interface WorkshopAsset { id:string; name:string; group:'powerups'|'buddies'; description:string; size:number; columns:number; frames:number; actions:WorkshopAction[] }
const pulse:WorkshopAction[]=[{name:'Energy loop',start:0,count:4,fps:7}];
const buddyActions:WorkshopAction[]=[{name:'Idle',start:0,count:4,fps:5},{name:'Move',start:4,count:8,fps:12},{name:'Attack',start:12,count:4,fps:10}];
const power=(id:string,name:string,description:string):WorkshopAsset=>({id,name,description,group:'powerups',size:192,columns:4,frames:4,actions:pulse});
const buddy=(id:string,name:string,description:string):WorkshopAsset=>({id,name,description,group:'buddies',size:320,columns:4,frames:16,actions:buddyActions});
export const WORKSHOP_ASSETS:WorkshopAsset[]=[
  power('blaster','Ink Blaster','A marker-powered blaster. Hold fire to charge, then release for a stronger shot.'),
  power('sword','Flame Sword','A fire blade for close-range attacks. Earn it by defeating the first boss.'),
  power('frost','Frost Gauntlet','Launch ice shots that briefly freeze ordinary enemies. Found from the Graveyard onward.'),
  power('ember','Ember Boots','Burst forward in a fiery dash. Available in the Furnace.'),
  power('storm','Storm Halo','Release a shock pulse that damages nearby enemies and clears hostile shots.'),
  power('kai-arm','Kai Blaster Arm','Kai’s gift after the Alley Rescue. A cyan arm cannon with rapid and charged shots.'),
  power('shield','Ink Shield','A galaxy-filled ink shield that absorbs one hit before it breaks.'),
  power('rapid','Rapid Fire','A blaster upgrade that sends a quick stream of shots.'),
  power('fan','Fan Shots','A blaster upgrade that fires five shots in a wide fan.'),
  power('homing','Heat Seekers','A blaster upgrade whose shots steer toward nearby enemies.'),
  power('gravity','Gravity Core','A purple gravity core wrapped in glowing orbital rings.'),
  power('heart','Health Heart','Recover up to 30 health when you collect this beating heart.'),
  power('rush-star','Rush Star','Collect the rooftop challenge stars before time runs out.'),
  buddy('dinio','Dinio','A crowned pink dinosaur who runs beside you and spits energy shots at nearby enemies.'),
  buddy('doghost','Doghost','A stitched ghost dog who glides behind you and howls piercing sound waves.'),
  {...buddy('teleportation-c','Teleportation C','A shadow companion who runs, jumps, strikes enemies and intercepts hostile shots.'),frames:24,
    actions:[...buddyActions.slice(0,2),{name:'Jump / land',start:12,count:4,fps:8},{name:'Strike',start:16,count:4,fps:10},{name:'Intercept',start:20,count:4,fps:10}]},
];
export const workshopSheet=(id:string)=>`/workshop/v1/${id}.webp`;
export const workshopPoster=(id:string)=>`/workshop/v1/${id}-poster.webp`;
