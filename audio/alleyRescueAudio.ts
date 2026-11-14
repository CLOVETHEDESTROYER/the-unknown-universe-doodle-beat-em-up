import type {SoundName} from './soundBank';

export interface RescueCue {id:string;phase:string;at:number;sound:SoundName;volume:number;pitch:number}
/** Animation-time cues, not timers: no duplicate pulses at high FPS and no
 * queued sound bursts when a hidden tab becomes visible again. */
export const RESCUE_CUES:readonly RescueCue[]=[
  {id:'sword-channel',phase:'transfer',at:0,sound:'swordSwing',volume:.65,pitch:.85},
  {id:'fire-link',phase:'transfer',at:.22,sound:'ember',volume:.4,pitch:.75},
  {id:'charge-low',phase:'transfer',at:.8,sound:'slamCharge',volume:.5,pitch:.8},
  {id:'charge-mid',phase:'transfer',at:1.6,sound:'slamCharge',volume:.55,pitch:1},
  {id:'charge-high',phase:'transfer',at:2.5,sound:'slamCharge',volume:.6,pitch:1.25},
  {id:'energy-release',phase:'transfer',at:3.1,sound:'frost',volume:.35,pitch:1.1},
  {id:'revival-spark',phase:'rise',at:0,sound:'shield',volume:.6,pitch:.9},
  {id:'kai-restored',phase:'rise',at:1.5,sound:'powerup',volume:.7,pitch:1.1}
];

export class AlleyRescueAudio {
  private phase='';
  private fired=new Set<string>();
  private triggered:string[]=[];
  constructor(private play:(cue:RescueCue)=>void){}
  update(phase:string,time:number){
    if(phase!==this.phase){this.phase=phase;this.fired.clear();if(phase==='approach')this.triggered=[];}
    for(const cue of RESCUE_CUES){
      if(cue.phase!==phase||cue.at>time||this.fired.has(cue.id))continue;
      this.fired.add(cue.id);this.triggered.push(cue.id);this.play(cue);
    }
  }
  read(){return {phase:this.phase,triggered:[...this.triggered]};}
}
