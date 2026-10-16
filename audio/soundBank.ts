export const SOUND_BANK = {
  punchSwing:{variants:3,volume:.5,gap:70,priority:1},
  punchHit:{variants:3,volume:.8,gap:55,priority:2},
  swordSwing:{variants:2,volume:.55,gap:90,priority:1},
  swordHit:{variants:2,volume:.75,gap:65,priority:2},
  enemyHit:{variants:3,volume:.5,gap:65,priority:1},
  playerHit:{variants:2,volume:.75,gap:150,priority:2},
  playerDeath:{variants:1,volume:.8,gap:500,priority:3},
  enemyDeath:{variants:2,volume:.55,gap:80,priority:1},
  bossDeath:{variants:1,volume:.85,gap:900,priority:3},
  blaster:{variants:2,volume:.32,gap:90,priority:0},
  shipHit:{variants:2,volume:.7,gap:150,priority:2},
  shipExplosion:{variants:1,volume:.85,gap:700,priority:3},
  explosion:{variants:2,volume:.55,gap:90,priority:1},
  pickup:{variants:1,volume:.4,gap:65,priority:1},
  powerup:{variants:1,volume:.65,gap:130,priority:2},
  frost:{variants:1,volume:.45,gap:130,priority:1},
  ember:{variants:1,volume:.55,gap:130,priority:1},
  storm:{variants:1,volume:.65,gap:200,priority:2},
  teleport:{variants:2,volume:.55,gap:100,priority:1},
  shield:{variants:1,volume:.6,gap:150,priority:2},
  jump:{variants:2,volume:.32,gap:100,priority:0},
  stomp:{variants:2,volume:.65,gap:80,priority:2},
  spring:{variants:1,volume:.5,gap:150,priority:1}
} as const;
export type SoundName=keyof typeof SOUND_BANK;
export const soundPath=(name:SoundName,variant:number)=>`/audio/sfx-v1/${name}-${variant+1}.wav`;
