export const SOUND_BANK = {
  bossWarning:{variants:1,volume:.55,gap:350,priority:2},
  shipLaunch:{variants:1,volume:.35,gap:1200,priority:1},
  pursuerArrival:{variants:1,volume:.32,gap:1200,priority:1},
  pursuerLockOn:{variants:1,volume:.32,gap:350,priority:2},
  regentPhase:{variants:1,volume:.55,gap:900,priority:2},
  ventWarning:{variants:1,volume:.38,gap:400,priority:1},
  punchSwing:{variants:3,volume:.5,gap:70,priority:1},
  punchHit:{variants:3,volume:.8,gap:55,priority:2},
  swordSwing:{variants:2,volume:.55,gap:90,priority:1},
  swordHit:{variants:2,volume:.75,gap:65,priority:2},
  enemyHit:{variants:3,volume:.5,gap:65,priority:1},
  playerHit:{variants:2,volume:.75,gap:150,priority:2},
  playerDeath:{variants:1,volume:.8,gap:500,priority:3},
  enemyDeath:{variants:2,volume:.55,gap:80,priority:1},
  bossDeath:{variants:1,volume:.85,gap:900,priority:3},
  blaster:{variants:3,volume:.38,gap:90,priority:0},
  shipHit:{variants:2,volume:.7,gap:150,priority:2},
  shipExplosion:{variants:2,volume:.8,gap:700,priority:3},
  explosion:{variants:3,volume:.55,gap:90,priority:1},
  pickup:{variants:1,volume:.4,gap:65,priority:1},
  powerup:{variants:1,volume:.65,gap:130,priority:2},
  frost:{variants:2,volume:.42,gap:130,priority:1},
  ember:{variants:2,volume:.5,gap:130,priority:1},
  storm:{variants:2,volume:.6,gap:200,priority:2},
  teleport:{variants:3,volume:.5,gap:100,priority:1},
  shield:{variants:1,volume:.6,gap:150,priority:2},
  jump:{variants:3,volume:.3,gap:100,priority:0},
  doubleJump:{variants:3,volume:.37,gap:100,priority:1},
  landing:{variants:2,volume:.22,gap:130,priority:0},
  stomp:{variants:3,volume:.6,gap:80,priority:2},
  spring:{variants:2,volume:.45,gap:150,priority:1},
  shipLaser:{variants:3,volume:.3,gap:95,priority:0},
  shipLance:{variants:2,volume:.34,gap:100,priority:0},
  shipMissile:{variants:2,volume:.42,gap:130,priority:1},
  enemyLaser:{variants:2,volume:.18,gap:140,priority:0},
  slamCharge:{variants:2,volume:.27,gap:130,priority:1},
  slamXgod:{variants:2,volume:.65,gap:220,priority:2},
  slamBarrett:{variants:2,volume:.7,gap:220,priority:2},
  slamNico:{variants:2,volume:.64,gap:220,priority:2},
  slamEzra:{variants:2,volume:.6,gap:220,priority:2},
  slamTeleport:{variants:2,volume:.6,gap:220,priority:2},
  slamZgod:{variants:2,volume:.72,gap:300,priority:2}
} as const;
export type SoundName=keyof typeof SOUND_BANK;
const enhanced=new Set<string>(['blaster','shipLaser','shipLance','shipMissile','enemyLaser','jump','doubleJump','landing','slamCharge','slamXgod','slamBarrett','slamNico','slamEzra','slamTeleport','slamZgod','punchSwing','punchHit','swordSwing','swordHit','enemyHit','explosion','shipHit','shipExplosion','frost','ember','storm','teleport','stomp','spring']);
const kenney=new Set<SoundName>(['shipLaunch','pursuerArrival','pursuerLockOn','regentPhase','ventWarning']);
export function soundPath(name:SoundName,variant:number){
  if(name==='bossWarning')return '/audio/boss-attack-warning.mp3';
  const bank=kenney.has(name)?'kenney':enhanced.has(name)?'v2':'v1';
  return `/audio/sfx-${bank}/${name}-${variant+1}.wav`;
}
export const SLAM_SOUNDS = {turkey_king:'slamBarrett',elytron:'slamTeleport',killer_kai:'slamNico',xgod:'slamXgod',zgod:'slamZgod',barrett:'slamBarrett',nico:'slamNico',ezra:'slamEzra',teleportation_c:'slamTeleport'} as const;
