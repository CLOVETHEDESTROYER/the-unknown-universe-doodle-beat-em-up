import {UNIQUE_ENEMIES,isUniqueEnemy} from './uniqueEnemies';
/** Original drawn enemies restored to the ground campaign. Distances are world pixels. */
export type RestoredEnemyKind = 'spider' | 'ghost' | 'terror' | 'cosmic';
export const RESTORED_ENEMIES = {
  spider: { name:'Bramble Spider', move:'pounce', hp:3, scale:0.42, walkFrames:8, attackFrames:4,
    fps:14, speed:72, notice:300, tellMs:500, attackMs:650, recoverMs:700, cooldownMs:1200 },
  ghost: { name:'Red Wisp', move:'dive', hp:3, scale:0.38, walkFrames:8, attackFrames:4,
    fps:8, speed:48, notice:370, tellMs:650, attackMs:700, recoverMs:1100, cooldownMs:1400 },
  terror: { name:'Moonlight Terror', move:'tongue_lash', hp:6, scale:0.40, walkFrames:8, attackFrames:4,
    fps:9, speed:52, notice:220, tellMs:750, attackMs:400, recoverMs:1000, cooldownMs:1600 },
  cosmic: { name:'Cosmic Sentry', move:'locked_volley', hp:4, scale:0.40, walkFrames:8, attackFrames:4,
    fps:11, speed:60, notice:560, tellMs:650, attackMs:440, recoverMs:950, cooldownMs:1700 },
} as const;
export const isRestoredEnemy = (kind:string):kind is RestoredEnemyKind => Object.hasOwn(RESTORED_ENEMIES,kind);

/** Replace existing placements rather than increasing simultaneous enemy density. */
export const ENEMY_REINTRODUCTIONS: Record<number, Array<[string, number, RestoredEnemyKind]>> = {
  1:[['walker',1,'spider'],['walker',2,'spider'],['giant',0,'terror']],
  2:[['walker',0,'ghost'],['walker',1,'spider'],['giant',0,'terror']],
  3:[['walker',0,'spider'],['walker',1,'ghost'],['alien',0,'cosmic'],['giant',0,'terror']],
  4:[['walker',0,'spider'],['walker',1,'ghost'],['dasher',0,'terror'],['alien',0,'cosmic']],
  6:[['walker',0,'cosmic'],['walker',1,'ghost'],['dasher',0,'spider'],['giant',0,'terror']],
};

/** Distinct local rosters; repeat silhouettes get level-specific attacks and palettes. */
export const LEVEL_ENEMY_ROSTERS:Record<number,readonly string[]>={
  1:['walker','spider','dasher','tagger'],
  2:['walker','ghost','terror','bellkeeper'],
  3:['walker','alien','giant','boiler'],
  4:['walker','spider','mantis'],
  6:['walker','cosmic','dasher','mimic'],
};
export const LEVEL_FOE_NAMES:Record<number,Partial<Record<string,string>>>={
  1:{spider:'Chalk Crawler',dasher:'Locker Rusher'},
  2:{ghost:'Red Wisp',terror:'Moonlight Terror'},
  3:{alien:'Furnace Spitter',giant:'Cinder Brute'},
  4:{spider:'Bramble Weaver',ghost:'Hex Wisp'},
  6:{cosmic:'Cosmic Sentry',dasher:'Rift Rusher'},
};
export function localEnemyKind(level:number,kind:string,index:number){
  if(kind==='boss'||kind==='walker')return kind;
  if(level===4&&kind==='ghost')return 'mantis';
  const roster=LEVEL_ENEMY_ROSTERS[level]??LEVEL_ENEMY_ROSTERS[1];
  // Adding a new kind must not redistribute every existing placement by a new modulo.
  const established=roster.filter(kind=>!isUniqueEnemy(kind));
  return roster.includes(kind)?kind:established[1+index%(established.length-1)];
}

export function enemyDisplayName(level:number,kind:string){
  return isUniqueEnemy(kind)?UNIQUE_ENEMIES[kind].name:LEVEL_FOE_NAMES[level]?.[kind]??kind;
}
