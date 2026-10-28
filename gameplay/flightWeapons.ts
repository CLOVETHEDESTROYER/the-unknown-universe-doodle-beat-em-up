export type FlightWeaponId='twin'|'spread'|'lance'|'homing';
export type FlightUpgradeId=Exclude<FlightWeaponId,'twin'>;
export const FLIGHT_WEAPONS={
  twin:{name:'Twin Cannons',short:'TWIN',letter:'',color:0x9bf3df,interval:190,speed:920,damage:1,description:'Twin forward cannons'},
  spread:{name:'Spread Shot',short:'SPREAD',letter:'S',color:0xffbc64,interval:230,speed:850,damage:1,description:'Five-way fan — clear a wider lane'},
  lance:{name:'Plasma Lance',short:'LANCE',letter:'L',color:0xf0a4ff,interval:280,speed:1480,damage:3,description:'Pierces four targets in a line'},
  homing:{name:'Homing Missiles',short:'HOMING',letter:'H',color:0x78e7ff,interval:340,speed:650,damage:1.75,description:'Twin tracking rockets — steer while they chase'},
} as const;
export const FLIGHT_WEAPON_PICKUPS:Array<{id:number;weapon:FlightUpgradeId;distance:number;y:number}>=[
  {id:0,weapon:'spread',distance:1350,y:300},
  {id:1,weapon:'lance',distance:4050,y:190},
  {id:2,weapon:'homing',distance:7000,y:410},
  {id:3,weapon:'spread',distance:9700,y:205},
  {id:4,weapon:'lance',distance:12450,y:360},
  {id:5,weapon:'homing',distance:15000,y:270},
];
export const weaponPickupY=(p:{id:number;y:number},clock:number)=>p.y+Math.sin(clock/450+p.id*1.7)*10;
