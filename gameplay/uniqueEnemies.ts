/** One original silhouette and signature attack exclusive to each ground chapter. */
export const UNIQUE_ENEMIES = {
  tagger:{level:1,name:'Spray Skater',move:'paint_skip',hp:4,speed:115,notice:420,tell:650,attack:600,recover:1000,color:0xff4bbd},
  bellkeeper:{level:2,name:'Bone Bellkeeper',move:'grave_chime',hp:5,speed:42,notice:420,tell:900,attack:900,recover:1200,color:0x79f3cf},
  boiler:{level:3,name:'Boiler Crab',move:'coal_mortar',hp:6,speed:48,notice:480,tell:800,attack:550,recover:1250,color:0xffad46},
  mantis:{level:4,name:'Thorn Mantis',move:'returning_leaf',hp:5,speed:82,notice:430,tell:750,attack:550,recover:1200,color:0xb9f36b},
  mimic:{level:6,name:'Rift Maw',move:'rift_cross',hp:6,speed:52,notice:440,tell:850,attack:650,recover:1300,color:0xb990ff},
} as const;
export type UniqueEnemyKind=keyof typeof UNIQUE_ENEMIES;
export const isUniqueEnemy=(kind:string):kind is UniqueEnemyKind=>Object.hasOwn(UNIQUE_ENEMIES,kind);
export const UNIQUE_LEVEL_ENEMY:Record<number,UniqueEnemyKind>={1:'tagger',2:'bellkeeper',3:'boiler',4:'mantis',6:'mimic'};
export const UNIQUE_ENEMY_BODIES={
  tagger:{x:.29,y:.43,width:.42,height:.51,footAnchor:.94},
  bellkeeper:{x:.32,y:.34,width:.36,height:.60,footAnchor:.94},
  boiler:{x:.23,y:.56,width:.54,height:.38,footAnchor:.94},
  mantis:{x:.34,y:.30,width:.32,height:.64,footAnchor:.94},
  mimic:{x:.27,y:.45,width:.46,height:.49,footAnchor:.94},
};
