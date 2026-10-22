import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { addTerrainTiles } from '../gameplay/terrainTextures';
import { loadGameSheet, loadGameImage, mobileGameOptions, watchGameViewport, landscapeGameViewport } from '../gameplay/mobileRuntime';
import { CHARACTER_CONFIGS } from '../characters';
import { FINAL_LEVEL, FLIGHT_LEVEL } from '../campaign';
import type { CharacterId, DifficultyMode, GameStats } from '../types';
import { createFlight, damageShip, FLIGHT_BEACONS, FLIGHT_END, rockX, rockY, stepFlight } from '../gameplay/flight';
import { resetCombat, shipMuzzles } from '../gameplay/flightCombat';
import { PURSUER_CHECKPOINT, PURSUER_PHASE_NAMES, pursuerAttackHint, pursuerSweepPoint } from '../gameplay/flightPursuer';
import { FLIGHT_WEAPONS, FLIGHT_WEAPON_PICKUPS, weaponPickupY } from '../gameplay/flightWeapons';
import { FLIGHT_PARALLAX, flightSpeedStreaks } from '../gameplay/flightVisuals';
import { shipDeathPose } from '../gameplay/flightDeath';
import { BOSS_DEFEAT_DURATION, bossDeathPose, bossDeathTexture, pursuerCounterWindow } from '../gameplay/bossPresentation';
import { playSfx } from '../audio/gameAudio';
import { reportGameLoading, trackSceneLoading } from '../gameplay/loadingProgress';

interface Props {
  isPaused: boolean; selectedCharacterId: CharacterId; difficulty: DifficultyMode;
  initialStats: GameStats; onStatsUpdate: (stats: Partial<GameStats>) => void; onTogglePause: () => void;
}
declare global {
  interface Window {
    __unknownFlightDamageShip?: (amount?:number) => void;
    __unknownFlightSetShipPosition?: (x:number,y:number) => void;
    __unknownFlightEnemyTest?: (kind:'scout'|'interceptor'|'gunship',hp?:number)=>void;
  }
}
const FlightGameEngine: React.FC<Props> = ({isPaused,selectedCharacterId,difficulty,initialStats,onStatsUpdate,onTogglePause}) => {
  const host=useRef<HTMLDivElement>(null);
  const paused=useRef(isPaused);
  const callbacks=useRef({onStatsUpdate,onTogglePause});
  useEffect(()=>{callbacks.current={onStatsUpdate,onTogglePause};},[onStatsUpdate,onTogglePause]);
  useEffect(()=>{paused.current=isPaused;},[isPaused]);
  useEffect(()=>{
    if(!host.current)return;
    let viewport=landscapeGameViewport(host.current);
    const params=new URLSearchParams(window.location.search);
    const seedText=params.get('flightSeed');
    const seed=seedText!==null&&/^\d+$/.test(seedText)?Number(seedText)>>>0:undefined;
    const state=createFlight(initialStats.lives,initialStats.score,difficulty,seed);
    state.invincible=selectedCharacterId==='zgod';
    if(params.get('flightFinale')==='1'){
      state.phase='flight';state.distance=state.travel=state.checkpoint=PURSUER_CHECKPOINT;
      state.x=240;state.y=295;state.invulnerableUntil=2500;resetCombat(state.combat,state.checkpoint);
    }else if(params.get('weaponPreview')){
      const pickup=FLIGHT_WEAPON_PICKUPS.find(p=>p.weapon===params.get('weaponPreview'));
      if(pickup){
        state.phase='flight';state.distance=state.travel=Math.max(0,pickup.distance-900);
        state.checkpoint=state.distance>=6000?6000:0;state.x=240;state.y=295;state.invulnerableUntil=2500;
        resetCombat(state.combat,state.distance);
      }
    }else if(params.get('shipDeathPreview')==='1'){
      state.phase='flight';state.distance=state.travel=450;state.x=420;state.y=300;
    }
    const failedAssets:string[]=[];
    const hero=CHARACTER_CONFIGS[selectedCharacterId];
    const xgod=selectedCharacterId==='xgod';
    const drawnXgod=xgod&&params.get('xgodArt')!=='model';
    const zgod=selectedCharacterId==='zgod';
    let scene:Phaser.Scene;
    let keys:Record<string,Phaser.Input.Keyboard.Key>;
    let ready=false,disposed=false,advanced=false,manualStepping=false,lastSync='',lastImpact=0,lastCheckpoint=0,checkpointNotice=0,impactUntil=0;
    let audioShots=0,audioImpacts=0,audioDeathId:number|null=null,audioPickups=0,audioBeacons=0;
    const heardEffects=new Set<number>();
    let ship:Phaser.GameObjects.Container,exhaust:Phaser.GameObjects.Graphics;
    let walker:Phaser.GameObjects.Sprite,pilot:Phaser.GameObjects.Sprite;
    let title:Phaser.GameObjects.Text,hint:Phaser.GameObjects.Text,banner:Phaser.GameObjects.Text,steeringLabel:Phaser.GameObjects.Text,bossLabel:Phaser.GameObjects.Text;
    let weaponLabel:Phaser.GameObjects.Text,weaponIcon:Phaser.GameObjects.Image,weaponHud:Phaser.GameObjects.Graphics,speedLines:Phaser.GameObjects.Graphics;
    let route:Phaser.GameObjects.Graphics,effects:Phaser.GameObjects.Graphics,combatArt:Phaser.GameObjects.Graphics,bossBar:Phaser.GameObjects.Graphics;
    let impact:Phaser.GameObjects.Image;
    let shipHull:Phaser.GameObjects.Image,deathArt:Phaser.GameObjects.Graphics;
    let deathArtId:number|null=null,deathBurst:Phaser.GameObjects.Image|null=null;
    const deathChunks:Phaser.GameObjects.Image[]=[],deathPops:Phaser.GameObjects.Image[]=[];
    let witch:Phaser.GameObjects.Image[]=[],ascent:Phaser.GameObjects.Image[]=[],clouds:Phaser.GameObjects.Image[]=[],orbit:Phaser.GameObjects.Image[]=[],planet:Phaser.GameObjects.Image[]=[];
    let pads:Phaser.GameObjects.TileSprite[]=[];
    const rocks=new Map<number,Phaser.GameObjects.Image>();
    const beacons=new Map<number,Phaser.GameObjects.Graphics>();
    const enemyViews=new Map<string,Phaser.GameObjects.Image>();
    const enemyLabels=new Map<string,Phaser.GameObjects.Text>();
    const explosions=new Map<number,Phaser.GameObjects.Image>();
    const debris=new Map<number,Phaser.GameObjects.Image[]>();
    const weaponViews=new Map<number,{icon:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text;halo:Phaser.GameObjects.Graphics}>();
    const lerp=Phaser.Math.Linear;
    let deathPreviewTriggered=false;
    const input=()=>{
      const touch=window.__unknownUniverseTouchControls ?? {};
      return {x:(Number(Boolean(keys?.right.isDown||keys?.d.isDown))-Number(Boolean(keys?.left.isDown||keys?.a.isDown))) || touch.axisX || Number(Boolean(touch.right))-Number(Boolean(touch.left)),
        y:(Number(Boolean(keys?.down.isDown||keys?.s.isDown))-Number(Boolean(keys?.up.isDown||keys?.w.isDown))) || touch.axisY || Number(Boolean(touch.down))-Number(Boolean(touch.up)),
        fire:Boolean(keys?.fire.isDown||keys?.alternate.isDown||touch.attack||touch.shoot)};
    };
    function sync(){
      const signature=`${state.hull}/${state.lives}/${state.score}/${state.phase}`;
      if(signature===lastSync)return;
      lastSync=signature;
      callbacks.current.onStatsUpdate({health:state.hull,lives:state.lives,score:state.score,
        monstersDefeated:initialStats.monstersDefeated+state.combat.defeated.length,isGameOver:state.phase==='gameover'});
    }
    function tick(ms:number){
      if(!ready || disposed || paused.current)return;
      stepFlight(state,ms,input());
      if(params.get('shipDeathPreview')==='1'&&!deathPreviewTriggered&&input().fire&&state.phase==='flight'){
        deathPreviewTriggered=damageShip(state,100);
      }
      if(state.impacts!==lastImpact){
        lastImpact=state.impacts;
        impactUntil=state.clock+400;
        impact.setPosition(state.x,state.y).setAlpha(1).setVisible(true);
        scene.cameras.main.shake(110,0.003);
      }
      if(state.checkpoint!==lastCheckpoint){lastCheckpoint=state.checkpoint;checkpointNotice=state.clock+2200;}
      syncFlightSounds();
      sync();
      if(state.phase==='complete' && !advanced){
        advanced=true;
        callbacks.current.onStatsUpdate({level:FINAL_LEVEL,score:state.score,lives:state.lives,health:100,isVictory:false,isGameOver:false});
      }
    }
    function syncFlightSounds(){
      if(state.combat.shotsFired!==audioShots){
        audioShots=state.combat.shotsFired;playSfx('blaster',{pitch:state.combat.weapon==='lance'?1.2:state.combat.weapon==='homing'?.78:1,volume:.85});
      }
      if(state.impacts!==audioImpacts){audioImpacts=state.impacts;if(state.hull>0)playSfx('shipHit');}
      if(state.death&&state.death.id!==audioDeathId){audioDeathId=state.death.id;playSfx('shipExplosion');}
      if(state.collectedWeapons.length>audioPickups)playSfx('powerup');
      audioPickups=state.collectedWeapons.length;
      if(state.collected.length>audioBeacons)playSfx('pickup');
      audioBeacons=state.collected.length;
      for(const fx of state.combat.effects){
        if(heardEffects.has(fx.id))continue;heardEffects.add(fx.id);
        if(fx.kind==='destroy')playSfx(fx.source==='pursuer'?'bossDeath':'explosion');
        else if(fx.kind==='hit')playSfx('enemyHit',{volume:.65});
      }
      // Keep only live effect IDs; simulation IDs are never reused on checkpoint retries.
      const live=new Set(state.combat.effects.map(fx=>fx.id));for(const id of heardEffects)if(!live.has(id))heardEffects.delete(id);
    }
    function draw(){
      if(!ready || disposed)return;
      const flying=state.phase==='flight';
      const ending=['landing','disembark','complete'].includes(state.phase);
      const departure=state.phase==='boarding'?0:state.phase==='launch'?state.phaseMs/1900*.3:Math.min(1,.3+state.distance/1800);
      const cosmic=ending?1:Phaser.Math.Clamp((state.distance-3500)/3000,0,1);
      const approach=ending?1:state.combat.finaleDefeated?Phaser.Math.Clamp((state.distance-16500)/500,0,1):0;
      const offset=state.travel;
      const gutter=(viewport.width-1024)/2;
      scene.cameras.main.setScroll(-gutter,0);
      witch.forEach((image,i)=>image.setX((i-1)*1728-(offset*FLIGHT_PARALLAX.witch)%1728).setAlpha(1-departure));
      ascent.forEach((image,i)=>image.setX((i-1)*1728-(offset*FLIGHT_PARALLAX.ascent)%1728).setAlpha(departure*(1-cosmic)));
      clouds.forEach((image,i)=>image.setX((i-1)*1728-(offset*FLIGHT_PARALLAX.clouds)%1728).setAlpha(departure*(1-cosmic)*.45));
      // Drift within one wide panorama so the destination planet never repeats at a tile seam.
      orbit.forEach(image=>image.setX(-gutter-Math.max(0,1728-viewport.width)/2*(1-Math.cos(offset/FLIGHT_PARALLAX.orbitPeriod))).setAlpha(departure*cosmic*(1-approach)));
      planet.forEach((image,i)=>image.setX((i-1)*1728-(offset*FLIGHT_PARALLAX.planet)%1728).setAlpha(cosmic*approach));
      speedLines.clear();
      const speedStrength=flying?1:state.phase==='launch'?Math.min(1,state.phaseMs/1900):state.phase==='landing'?Math.max(0,1-state.phaseMs/2200):0;
      for(const streak of flightSpeedStreaks(offset,state.clock,speedStrength)){
        speedLines.lineStyle(streak.width,cosmic>.5?0xc9eaf5:0xfff1d8,streak.alpha)
          .lineBetween(streak.x,streak.y,streak.x+streak.length,streak.y);
      }
      const padAlpha=state.phase==='boarding'||state.phase==='disembark'||state.phase==='complete'?1
        :state.phase==='launch'?1-state.phaseMs/1900:state.phase==='landing'?Phaser.Math.Clamp(state.phaseMs/700,0,1):0;
      pads.forEach(p=>p.setAlpha(padAlpha));
      const bank=flying?state.bank:0;
      const death=shipDeathPose(state.death,state.clock);
      ship.setPosition(state.x,state.y).setAngle(bank);
      ship.setVisible(death?death.stage==='flash':!['respawn','dying','gameover'].includes(state.phase));
      ship.setAlpha(death?1:state.clock<state.invulnerableUntil && Math.floor(state.clock/90)%2===0?.5:1);
      shipHull.setTint(death?0xffe5af:0xffffff);
      if(death)ship.setPosition(death.x,death.y).setAngle(death.bank+Math.sin(death.elapsed/18)*4);
      pilot.setVisible(!death&&!['boarding','disembark','complete'].includes(state.phase));
      exhaust.clear();
      if(['launch','flight','landing'].includes(state.phase)){
        const flame=(flying?43:25)+Math.sin(state.clock/38)*6;
        exhaust.fillStyle(0xea6c32,.8).fillTriangle(-86,-9,-86,9,-112-flame,0);
        exhaust.fillStyle(0xffe39a,.95).fillTriangle(-87,-5,-87,5,-105-flame*.6,0);
      }
      walker.setVisible(state.phase==='boarding'||state.phase==='disembark');
      if(state.phase==='boarding'){
        const t=Phaser.Math.Clamp(state.phaseMs/2000,0,1);
        walker.setPosition(120+280*t,492-Math.max(0,t-.8)*160).setAlpha(t>.85?(1-t)/.15:1).setFlipX(false);
      }else if(state.phase==='disembark'){
        const t=Phaser.Math.Clamp(state.phaseMs/1800,0,1);
        walker.setPosition(650+210*t,lerp(456,492,Math.min(1,t*4))).setAlpha(Math.min(1,t*6)).setFlipX(false);
      }
      const boss=state.combat.enemies.find(e=>e.kind==='pursuer');
      title.setText(boss?'VOID PURSUER':'STARBREAK RUN');
      bossBar.clear();bossLabel.setVisible(Boolean(boss));
      if(boss){
        const open=boss.phase==='recover';
        bossBar.fillStyle(0x19182e,.9).fillRoundedRect(312,76,386,22,5);
        bossBar.fillStyle(open?0xffd673:0x9f7acc,1).fillRoundedRect(315,79,380*Math.max(0,boss.hp/boss.maxHp),16,3);
        bossLabel.setText(`${Math.max(0,Math.ceil(boss.hp))} / ${boss.maxHp}  •  PHASE ${boss.phaseNumber??1} / 3`);
      }
      steeringLabel.setText(`${state.lives} SHIPS  •  SPACE / C: FIRE`);
      const weapon=FLIGHT_WEAPONS[state.combat.weapon];
      weaponHud.clear().fillStyle(0x19182e,.84).fillRoundedRect(755,126,237,39,8)
        .lineStyle(2,weapon.color,.9).strokeRoundedRect(755,126,237,39,8);
      weaponIcon.setTexture(state.combat.weapon==='twin'?'flight_ship':`flight_power_${state.combat.weapon}`)
        .setDisplaySize(state.combat.weapon==='twin'?44:34,state.combat.weapon==='twin'?18:34);
      weaponLabel.setText(weapon.name.toUpperCase()).setColor(`#${weapon.color.toString(16).padStart(6,'0')}`);
      if(state.combat.weapon!=='twin')weaponLabel.setText(`${weapon.name.toUpperCase()}\n${'●'.repeat(state.weaponHits)}${'○'.repeat(3-state.weaponHits)} HITS`).setFontSize(15).setY(130);
      else weaponLabel.setFontSize(18).setY(135);
      hint.setText(death?.visible?'SHIP LOST'
        :boss?boss.phase==='dying'?'PURSUER DEFEATED — APPROACH CLEAR'
        :boss.phase==='transition'?`${PURSUER_PHASE_NAMES[(boss.phaseNumber??1)-1]} — GUARD UP!`
        :boss.phase==='recover'?`ATTACK! — ${Math.max(0,(pursuerCounterWindow(boss.phaseNumber??1)-boss.phaseMs)/1000).toFixed(1)}s`
        :boss.phase==='enter'?'PURSUER BLOCKING THE LANDING CORRIDOR'
        :pursuerAttackHint(boss)
        :flying&&state.clock-state.weaponChangedAt<1900?`${weapon.name.toUpperCase()}  •  ${weapon.description}`
        :state.phase==='boarding'?`${hero.name} — boarding for the Dread Planet`
        :state.phase==='launch'?'LIFT OFF!  Arrow keys / WASD: steer'
        :state.phase==='disembark'?`FLIGHT CLEAR — ${state.collected.length}/10 BEACONS • ${state.combat.defeated.length} SHIPS`
        :ending?'DREAD PLANET — landing approach'
        :state.clock<checkpointNotice?state.checkpoint===PURSUER_CHECKPOINT?'FINAL CHECKPOINT — HULL +25':'CHECKPOINT — flight route saved'
        :state.clock<state.combat.waveNoticeUntil?state.combat.waveName
        :state.distance<1800?'WEAPON CORES  •  Fly into a colored core to equip it'
        :state.distance<5000?'CANOPY CLIMB  •  Follow the gold beacons'
        :state.distance<11500?'HIGH ORBIT  •  Find the gaps between rocks'
        :'VOID APPROACH  •  Dread Planet ahead');
      route.clear().fillStyle(0x17203b,.8).fillRoundedRect(744,77,248,13,6);
      route.fillStyle(0xf7ce76,1).fillRoundedRect(747,80,Math.max(5,242*Math.min(1,state.distance/FLIGHT_END)),7,3);
      for(const cp of [6000,11500,PURSUER_CHECKPOINT])route.lineStyle(2,0xf6f0c4,1).lineBetween(747+242*cp/FLIGHT_END,75,747+242*cp/FLIGHT_END,93);
      effects.clear();
      if(cosmic>.1){
        effects.fillStyle(0xfaf1ca,cosmic*.8);
        for(let i=0;i<55;i++){
          const x=((i*173.7-offset*(.10+(i%3)*.04))%1100+1100)%1100;
          effects.fillCircle(x,130+(i*79)%390,i%4===0?1.7:1);
        }
      }
      for(const rock of state.rocks){
        const x=rockX(rock,state.clock,state.distance),y=rockY(rock,state.clock);
        const visible=flying && rock.hp>0 && x>-150 && x<1200;
        let sprite=rocks.get(rock.id);
        if(visible && !sprite){
          sprite=scene.add.image(x,y,'flight_rock').setDisplaySize(rock.radius*2/.82,rock.radius*2/.82).setDepth(5);
          rocks.set(rock.id,sprite);
        }
        sprite?.setVisible(visible).setPosition(x,y).setAngle(state.clock/90*(rock.id%2?1:-1)+rock.phase*30)
          .setTint(rock.hp<rock.maxHp?0xe9bd9a:0xffffff);
        if(flying && rock.hp>0 && x>1024 && x<1350){
          effects.lineStyle(3,0xffd990,.85).beginPath().moveTo(989,y-9).lineTo(1000,y).lineTo(989,y+9).strokePath();
        }
      }
      for(const [id,b] of FLIGHT_BEACONS.entries()){
        const x=b.distance-state.distance;
        const visible=flying&&!state.collected.includes(id)&&x>-35&&x<1060;
        let art=beacons.get(id);
        if(visible && !art){
          art=scene.add.graphics().setDepth(4);
          art.lineStyle(4,0xffd878,1).strokeCircle(0,0,14).lineStyle(1,0xfff1be,.8).strokeCircle(0,0,20);
          beacons.set(id,art);
        }
        art?.setPosition(x,b.y).setVisible(visible).setAlpha(.75+Math.sin(state.clock/140+id)*.2);
      }
      for(const p of FLIGHT_WEAPON_PICKUPS){
        const x=p.distance-state.distance,y=weaponPickupY(p,state.clock),def=FLIGHT_WEAPONS[p.weapon];
        const visible=flying&&!state.collectedWeapons.includes(p.id)&&x>-90&&x<1150;
        let view=weaponViews.get(p.id);
        if(visible&&!view){
          view={icon:scene.add.image(x,y,`flight_power_${p.weapon}`).setDisplaySize(62,62).setDepth(10),
            label:scene.add.text(x,y+40,def.short,{fontFamily:'Gochi Hand, sans-serif',fontSize:'15px',color:'#fff1cd',stroke:'#19182e',strokeThickness:4}).setOrigin(.5).setDepth(10),
            halo:scene.add.graphics().setDepth(9)};
          weaponViews.set(p.id,view);
        }
        if(view){
          view.icon.setVisible(visible).setPosition(x,y).setAngle(Math.sin(state.clock/600+p.id)*6);
          view.label.setVisible(visible).setPosition(x,y+40);
          view.halo.clear().setVisible(visible);
          if(visible)view.halo.fillStyle(0x181a32,.38).fillCircle(x,y,34)
            .lineStyle(2,def.color,.8).strokeCircle(x,y,34+Math.sin(state.clock/150)*2);
        }
      }
      impact.setAlpha(Phaser.Math.Clamp((impactUntil-state.clock)/400,0,1));
      drawCombat();
      drawShipDeath();
      banner.setVisible(state.phase==='respawn'&&state.phaseMs>=900).setText(state.checkpoint?'RETURNING TO FLIGHT CHECKPOINT':'RETURNING TO LAUNCH');
    }
    function clearShipDeathArt(){
      deathChunks.splice(0).forEach(image=>image.destroy());
      deathPops.splice(0).forEach(image=>image.destroy());
      deathBurst?.destroy();deathBurst=null;deathArtId=null;deathArt.clear();
    }
    function drawShipDeath(){
      const pose=shipDeathPose(state.death,state.clock);
      if(!pose?.visible){if(deathArtId!==null)clearShipDeathArt();return;}
      if(deathArtId!==pose.id){
        clearShipDeathArt();deathArtId=pose.id;
        deathBurst=scene.add.image(pose.x,pose.y,'flight_impact').setTint(0xffc879).setDepth(28);
        for(let i=0;i<12;i++){
          const chunk=scene.add.image(pose.x,pose.y,'flight_ship').setDepth(26);
          const w=chunk.width,h=chunk.height;
          chunk.setCrop((i%4)*w/4,Math.floor(i/4)*h/3,w/4,h/3).setScale(184/w,74/h);
          deathChunks.push(chunk);
        }
        for(let i=0;i<3;i++)deathPops.push(scene.add.image(pose.x,pose.y,'flight_impact').setTint(0xffd991).setDepth(27).setVisible(false));
        scene.cameras.main.shake(180,.004,true);
      }
      const age=pose.elapsed,spread=Phaser.Math.Clamp((age-70)/900,0,1);
      const alpha=1-Phaser.Math.Clamp((age-650)/450,0,1);
      const burstT=Phaser.Math.Clamp(age/650,0,1),burstSize=60+Math.sqrt(burstT)*185;
      deathBurst!.setPosition(pose.x-spread*20,pose.y).setDisplaySize(burstSize,burstSize)
        .setAngle(burstT*65).setAlpha(Math.max(0,1-burstT));
      deathArt.clear();
      // Smoke follows the wreckage while the first bright core becomes an expanding ring.
      for(let i=0;i<5;i++){
        const smokeT=Phaser.Math.Clamp((age-110-i*55)/850,0,1);
        if(smokeT>0)deathArt.fillStyle(i%2?0x62566b:0x9b827f,(1-smokeT)*.22)
          .fillCircle(pose.x-20-spread*(35+i*13),pose.y-12-smokeT*(28+i*9),12+smokeT*(30+i*4));
      }
      if(age<160)deathArt.fillStyle(0xfff2cc,(1-age/160)*.95).fillEllipse(pose.x,pose.y,140+age*.3,80+age*.3);
      deathArt.lineStyle(4,0xffd68e,Math.max(0,1-age/800)).strokeEllipse(pose.x-spread*20,pose.y,50+age*.26,35+age*.21);
      deathChunks.forEach((chunk,i)=>{
        const angle=i/12*Math.PI*2+pose.id*.73,distance=spread*(85+i%4*25);
        chunk.setVisible(age>=65).setPosition(pose.x+Math.cos(angle)*distance-spread*45,pose.y+Math.sin(angle)*distance*.7+spread*spread*115)
          .setAngle(pose.bank+spread*(i%2?1:-1)*(70+i%3*45)).setAlpha(alpha)
          .setTint(age<180?0xffd9a6:0xffffff);
        if(age>90&&alpha>0){
          const x=pose.x+Math.cos(angle)*distance-spread*45,y=pose.y+Math.sin(angle)*distance*.7+spread*spread*115;
          deathArt.fillStyle(i%2?0xffba62:0xffe7a2,alpha*.9).fillCircle(x+Math.cos(angle)*12,y+Math.sin(angle)*10,2+i%2);
        }
      });
      deathPops.forEach((image,i)=>{
        const t=(age-140-i*125)/300;
        image.setVisible(t>=0&&t<1).setPosition(pose.x+(i%2?1:-1)*(38+i*12)-spread*25,pose.y+(i-1)*18)
          .setDisplaySize(30+Math.max(0,t)*70,30+Math.max(0,t)*70).setAlpha(Math.max(0,1-t));
      });
    }
    function drawCombat(){
      const c=state.combat;
      combatArt.clear();
      const activeIds=new Set(c.enemies.map(e=>e.id));
      for(const [id,view] of enemyViews){if(!activeIds.has(id)){view.destroy();enemyViews.delete(id);enemyLabels.get(id)?.destroy();enemyLabels.delete(id);}}
      for(const e of c.enemies){
        let art=enemyViews.get(e.id);
        if(!art){
          art=scene.add.image(e.x,e.y,`flight_${e.kind}`,0).setDepth(13);
          if(e.kind==='pursuer')art.setDisplaySize(260,162.5);
          else art.setScale((e.kind==='scout'?85:e.kind==='interceptor'?140:172)/scene.textures.get(`flight_${e.kind}`).get('0').cutWidth);
          enemyViews.set(e.id,art);
          if(e.kind==='gunship')enemyLabels.set(e.id,scene.add.text(0,0,'',{fontFamily:'Gochi Hand, sans-serif',fontSize:'15px',color:'#fff1bd',stroke:'#241b39',strokeThickness:3}).setOrigin(.5).setDepth(17));
        }
        const open=(e.kind==='gunship'||e.kind==='pursuer')&&e.phase==='recover';
        const angle=e.kind==='pursuer'?e.phase==='dying'?e.phaseMs/BOSS_DEFEAT_DURATION*24:e.phase==='charge'?Math.sin(e.phaseMs/350)*-14:e.phase==='attack'&&e.move==='strafe'?Math.sin(e.phaseMs/600)*10:Math.sin(e.age/700)*3
          :e.kind==='scout'?Math.cos(e.age/420)*7:e.kind==='interceptor'&&e.phase==='charge'
          ?-Phaser.Math.RadToDeg(Math.atan2(e.aimY-e.startY,e.startX-e.aimX+170)):0;
        art.setPosition(e.x,e.y).setAngle(angle).setTint(state.clock<(e.hitUntil??0)?0xffc2a1:open?0xffe2a0:0xffffff);
        if(e.kind==='pursuer') {
          const death = bossDeathPose(e.phaseMs);
          art.setTexture(e.phase==='dying'?bossDeathTexture('pursuer'):'flight_pursuer',
            e.phase==='dying'?String(death.frame):['tell','attack','charge'].includes(e.phase)?1:0)
            .setAlpha(e.phase==='dying'?death.alpha:1);
        }else{
          const frame=e.phase==='tell'?8+Math.min(1,Math.floor(e.phaseMs/350))
            :e.phase==='attack'||e.phase==='charge'?10+Math.min(1,Math.floor(e.phaseMs/250))
            :e.phase==='recover'&&e.phaseMs<350?11:Math.floor(e.age/100)%8;
          art.setFrame(String(frame));
        }
        const width=e.kind==='gunship'?90:45;
        if(e.kind!=='pursuer'){
          combatArt.fillStyle(0x15172d,.9).fillRoundedRect(e.x-width/2,e.y-58,width,7,3);
          combatArt.fillStyle(open?0xffd56e:e.kind==='gunship'?0xb596ef:0xe2749b,1).fillRect(e.x-width/2+2,e.y-56,(width-4)*e.hp/e.maxHp,3);
        }
        enemyLabels.get(e.id)?.setPosition(e.x,e.y+55).setText(open?'RELOADING':'HEAVY GUNSHIP');
        if(open)combatArt.lineStyle(3,0xffd579,.8).strokeEllipse(e.x-(e.kind==='pursuer'?42:0),e.y+(e.kind==='pursuer'?0:26),45,e.kind==='pursuer'?35:18);
        if(e.kind==='pursuer'&&e.move==='barrage'&&(e.phase==='tell'||e.phase==='attack')){
          const safeY=e.safeY??300;
          combatArt.fillStyle(0x73f1bf,.09).fillRect(100,safeY-50,520,100)
            .lineStyle(3,0x73f1bf,.85).strokeRect(100,safeY-50,520,100);
          for(const y of [150,210,270,330,390,450])if(Math.abs(y-safeY)>75)
            combatArt.lineStyle(2,0xf386b2,.38).lineBetween(115,y,745,y);
        }
        if(e.phase==='tell'){
          const muzzle=e.x-(e.kind==='pursuer'?102:e.kind==='gunship'?78:55);
          if(e.kind==='pursuer'&&e.move==='sweep'){
            const points=Array.from({length:25},(_,i)=>pursuerSweepPoint(e,i/24));
            const end=pursuerSweepPoint(e,.5);
            combatArt.lineStyle(4,0xffd478,.7).strokePoints(points,false).strokeCircle(end.x,end.y,38);
          }else if(e.move!=='barrage')combatArt.lineStyle(3,e.kind==='interceptor'?0xffd478:0xf386b2,.8)
            .lineBetween(muzzle,e.y,e.aimX,e.aimY).strokeCircle(e.aimX,e.aimY,24);
          combatArt.lineStyle(2,0xffdeb0,.8).strokeCircle(muzzle,e.y,12+Math.sin(state.clock/75)*3);
        }
        if(e.x>1030)combatArt.lineStyle(3,0xe7a4cb,.8).beginPath().moveTo(990,e.y-8).lineTo(1001,e.y).lineTo(990,e.y+8).strokePath();
      }
      for(const b of c.bolts){
        const a=Math.atan2(b.vy,b.vx),length=b.weapon==='lance'?90:b.weapon==='homing'?27:b.owner==='player'?20:12;
        const color=b.owner==='player'?FLIGHT_WEAPONS[b.weapon??'twin'].color:0xf76b9f;
        combatArt.lineStyle(b.weapon==='lance'?10:b.owner==='player'?5:8,color,b.weapon==='lance'?.45:.9)
          .lineBetween(b.x-Math.cos(a)*length,b.y-Math.sin(a)*length,b.x,b.y);
        if(b.weapon==='lance')combatArt.lineStyle(3,0xfff1ff,1).lineBetween(b.x-Math.cos(a)*length,b.y-Math.sin(a)*length,b.x,b.y);
        if(b.weapon==='homing'){
          combatArt.lineStyle(5,0xffa85d,.75).lineBetween(b.x-Math.cos(a)*39,b.y-Math.sin(a)*39,b.x-Math.cos(a)*22,b.y-Math.sin(a)*22);
          const point=(u:number,v:number)=>({x:b.x+Math.cos(a)*u-Math.sin(a)*v,y:b.y+Math.sin(a)*u+Math.cos(a)*v});
          const nose=point(5,0),upper=point(-6,-4),lower=point(-6,4),finTop=point(-22,-7),finBottom=point(-22,7),finRoot=point(-14,0);
          combatArt.fillStyle(0xfff5db,1).fillTriangle(nose.x,nose.y,upper.x,upper.y,lower.x,lower.y)
            .fillStyle(0x78e7ff,1).fillTriangle(finRoot.x,finRoot.y,finTop.x,finTop.y,finBottom.x,finBottom.y);
          if(b.targetId){
            const target=c.enemies.find(e=>e.id===b.targetId);
            if(target)combatArt.lineStyle(1,0x78e7ff,.5).strokeCircle(target.x,target.y,32);
          }
        }
        combatArt.fillStyle(0xfff9de,1).fillCircle(b.x,b.y,b.owner==='player'?2:3);
      }
      for(const r of c.repairs){
        combatArt.lineStyle(2,0x9af4b6,1).strokeCircle(r.x,r.y,17).fillStyle(0xb9ffca,1)
          .fillRect(r.x-10,r.y-3,20,6).fillRect(r.x-3,r.y-10,6,20);
      }
      const ids=new Set(c.effects.map(f=>f.id));
      for(const [id,image] of explosions){if(!ids.has(id)){image.destroy();explosions.delete(id);}}
      for(const [id,shards] of debris){if(!ids.has(id)){shards.forEach(shard=>shard.destroy());debris.delete(id);}}
      for(const fx of c.effects){
        if(fx.kind==='muzzle'){
          combatArt.fillStyle(0xd1ffbd,.9).fillCircle(fx.x,fx.y,5);continue;
        }
        if(fx.kind==='repair'){
          combatArt.lineStyle(3,0xafffd0,.8).strokeCircle(fx.x,fx.y,25);continue;
        }
        let image=explosions.get(fx.id);
        if(!image){
          image=scene.add.image(fx.x,fx.y,'flight_impact').setDepth(24)
            .setDisplaySize(fx.kind==='destroy'?fx.size:45,fx.kind==='destroy'?fx.size:45)
            .setTint(fx.kind==='blocked'?0xbfa6f0:0xffedbd);explosions.set(fx.id,image);
        }
        const t=Phaser.Math.Clamp((state.clock-fx.born)/fx.duration,0,1);
        if(fx.kind==='destroy'&&['scout','interceptor','gunship'].includes(fx.source??'')){
          const source=fx.source as 'scout'|'interceptor'|'gunship',key=`flight_${source}`;
          image.setTexture(key,String(12+Math.min(3,Math.floor(t*4)))).clearTint()
            .setScale((source==='scout'?85:source==='interceptor'?140:172)/scene.textures.get(key).get('0').cutWidth)
            .setPosition(fx.x-50*t,fx.y+12*t*t).setAlpha(t<.75?1:Math.max(0,1-(t-.75)*4));
          continue;
        }
        if(fx.kind==='destroy'){
          const drift=fx.source==='asteroid'?230:65;
          const x=fx.x-drift*(state.clock-fx.born)/1000;
          image.setPosition(x,fx.y).setDisplaySize(fx.size*(.35+Math.sqrt(t)*1.1),fx.size*(.35+Math.sqrt(t)*1.1))
            .setAngle(t*75).setAlpha(Math.max(0,1-t*1.35));
          combatArt.lineStyle(4,0xffd579,(1-t)*.8).strokeCircle(x,fx.y,fx.size*(.18+t*.7));
          if(t<.18)combatArt.fillStyle(0xfff6cd,1-t/.18).fillCircle(x,fx.y,fx.size*.23);
          let shards=debris.get(fx.id);
          if(!shards){
            const texture=fx.source==='asteroid'?'flight_rock':`flight_${fx.source??'scout'}`;
            shards=Array.from({length:7},(_,i)=>{
              const shard=scene.add.image(x,fx.y,texture,0).setDepth(23);
              const w=shard.width,h=shard.height;
              return shard.setCrop(w*(.24+i%3*.16),h*(.25+Math.floor(i/3)*.15),w*.18,h*.18).setScale(fx.size/w*1.2);
            });
            debris.set(fx.id,shards);
          }
          shards.forEach((shard,i)=>{
            const a=i/7*Math.PI*2+fx.id*1.3,r=fx.size*t*(.5+i%3*.22);
            shard.setPosition(x+Math.cos(a)*r,fx.y+Math.sin(a)*r+t*t*55).setAngle(i*43+t*(i%2?220:-220)).setAlpha((1-t)*.95);
          });
        }else image.setAlpha(1-t);
      }
      for(const rock of state.rocks){
        if(rock.hp<=0||rock.hp===rock.maxHp)continue;
        const x=rockX(rock,state.clock,state.distance),y=rockY(rock,state.clock);
        if(x< -100||x>1150)continue;
        combatArt.lineStyle(2,0xffd1a8,.9).beginPath().moveTo(x-rock.radius*.5,y-rock.radius*.5)
          .lineTo(x+5,y-4).lineTo(x-rock.radius*.2,y+rock.radius*.45).strokePath();
        if(rock.hp<=rock.maxHp/2)combatArt.beginPath().moveTo(x+5,y-4).lineTo(x+rock.radius*.55,y+rock.radius*.18).strokePath();
      }
    }
    const game=new Phaser.Game({...mobileGameOptions(),type:params.get('renderer')==='canvas'?Phaser.CANVAS:Phaser.AUTO,
      audio:{noAudio:true},
      parent:host.current,width:viewport.width,height:576,backgroundColor:'#211f41',
      render:{preserveDrawingBuffer:params.get('capture')==='1'},
      scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:viewport.width,height:576,expandParent:false},
      scene:{key:'FlightScene',preload(this:Phaser.Scene){
        trackSceneLoading(this.load);
        this.load.on('loaderror',(file:{key:string})=>failedAssets.push(file.key));
        loadGameImage(this.load, 'flight_ship','flight/starbreak-ship-armed-v2.png');
        for(const weapon of ['spread','lance','homing'])loadGameImage(this.load, `flight_power_${weapon}`,`flight/weapons-v5/${weapon}.png`);
        for(const kind of ['scout','interceptor','gunship'])this.load.multiatlas(`flight_${kind}`,`/enemies/motion-v2/${kind}.json`,'/enemies/motion-v2/');
        loadGameImage(this.load, 'flight_rock','flight/starbreak-asteroid-v1.png');
        loadGameSheet(this.load, 'flight_pursuer','flight/void-pursuer-v3.png',{frameWidth:640,frameHeight:400,endFrame:2});
        this.load.multiatlas(bossDeathTexture('pursuer'), '/bosses/deaths-v1/pursuer.json', '/bosses/deaths-v1/');
        loadGameImage(this.load, 'flight_witch','platformer/witchwood-panorama-generated.png');
        loadGameImage(this.load, 'flight_ascent','flight/ascent-panorama-v3.png');
        loadGameImage(this.load, 'flight_clouds','flight/cloud-parallax-v3.png');
        loadGameImage(this.load, 'flight_orbit','flight/orbit-panorama-v3.png');
        loadGameImage(this.load, 'flight_planet','platformer/void-regent-pencil-panorama-generated.png');
        loadGameImage(this.load, 'flight_pad','platformer/graveyard-moss-block.png');
        loadGameImage(this.load, 'flight_impact','doodles/impact-vfx-generated.png');
        loadGameSheet(this.load, 'flight_hero',zgod?'characters/z-god-v1/hands-run.png':drawnXgod?`characters/xgod/drawn-v1/${initialStats.hasFlameSword?'sword':'blaster'}-run.png`:xgod?initialStats.hasFlameSword?'xgod_side_scroll_fire_sword_run_v1.png':'characters/xgod/motion-v2/blaster-run.png':`characters/${selectedCharacterId}/walk.png`,
          {frameWidth:zgod||drawnXgod?768:xgod?512:256,frameHeight:zgod||xgod?512:360});
        loadGameSheet(this.load, 'flight_head',zgod?'characters/z-god-v1/hands-idle.png':drawnXgod?'characters/xgod/drawn-v1/idle.png':xgod?'characters/xgod/motion-v2/blaster-idle.png':`characters/${selectedCharacterId}/walk.png`,
          {frameWidth:zgod||drawnXgod?768:xgod?512:256,frameHeight:zgod||xgod?512:360});
      },create(this:Phaser.Scene){
        scene=this;
        witch=[-1,0,1].map(i=>this.add.image(i*1728,0,'flight_witch').setOrigin(0).setDisplaySize(1728,576).setFlipX(i!==0).setDepth(-40));
        ascent=[-1,0,1].map(i=>this.add.image(i*1728,0,'flight_ascent').setOrigin(0).setDisplaySize(1728,576).setFlipX(i!==0).setDepth(-39.5));
        clouds=[-1,0,1].map(i=>this.add.image(i*1728,0,'flight_clouds').setOrigin(0).setDisplaySize(1728,576).setFlipX(i!==0).setDepth(-26));
        orbit=[this.add.image(0,0,'flight_orbit').setOrigin(0).setDisplaySize(Math.max(1728,viewport.width),Math.max(1728,viewport.width)/3).setDepth(-39)];
        planet=[-1,0,1].map(i=>this.add.image(i*1728,0,'flight_planet').setOrigin(0).setDisplaySize(1728,576).setFlipX(i!==0).setDepth(-38));
        pads=[addTerrainTiles(this,-(viewport.width-1024)/2,492,viewport.width,84,'flight_pad',undefined,.24,.24).setOrigin(0).setDepth(5)];
        exhaust=this.add.graphics();
        shipHull=this.add.image(0,0,'flight_ship').setDisplaySize(184,74);
        pilot=this.add.sprite(12,5,'flight_head',0).setOrigin(.5).setScale(xgod?.12:.13);
        pilot.setCrop(xgod?175:35,xgod?70:0,xgod?185:190,xgod?190:170);
        if(zgod)pilot.setCrop(280,210,220,190).setPosition(12,-18);
        if(drawnXgod)pilot.setCrop(270,135,245,220).setPosition(12,-6);
        const glass=this.add.ellipse(15,-11,54,23,0x92d4ef,.15);
        ship=this.add.container(state.x,state.y,[exhaust,shipHull,pilot,glass]).setDepth(15);
        walker=this.add.sprite(120,492,'flight_hero',0).setOrigin(.5,(zgod||xgod)?0.9375:1).setScale(xgod?.34:.39).setDepth(16);
        this.anims.create({key:'flight_board_walk',frames:this.anims.generateFrameNumbers('flight_hero'),frameRate:12,repeat:-1});
        walker.play('flight_board_walk');
        const textStyle={fontFamily:'Gochi Hand, sans-serif',fontSize:'28px',color:'#fff1cd',stroke:'#19182e',strokeThickness:5};
        title=this.add.text(24,72,'STARBREAK RUN',textStyle).setDepth(30);
        hint=this.add.text(24,107,'',{...textStyle,fontSize:'19px',strokeThickness:4}).setDepth(30);
        steeringLabel=this.add.text(992,100,'',{...textStyle,fontSize:'15px',strokeThickness:3}).setOrigin(1,0).setDepth(30);
        weaponHud=this.add.graphics().setDepth(30);
        weaponIcon=this.add.image(781,145,'flight_ship').setDepth(31);
        weaponLabel=this.add.text(810,135,'',{...textStyle,fontSize:'18px',strokeThickness:3}).setDepth(31);
        speedLines=this.add.graphics().setDepth(-4);
        bossBar=this.add.graphics().setDepth(30);
        bossLabel=this.add.text(505,87,'',{...textStyle,fontSize:'14px',strokeThickness:3}).setOrigin(.5).setDepth(31);
        banner=this.add.text(512,270,'',{...textStyle,fontSize:'31px',align:'center'}).setOrigin(.5).setDepth(30);
        route=this.add.graphics().setDepth(30);effects=this.add.graphics().setDepth(3);combatArt=this.add.graphics().setDepth(18);
        impact=this.add.image(240,295,'flight_impact').setDisplaySize(150,150).setDepth(25).setAlpha(0);
        deathArt=this.add.graphics().setDepth(27);
        keys=this.input.keyboard!.addKeys('up,down,left,right,W,A,S,D') as typeof keys;
        // addKeys preserves the exact supplied names for letters.
        keys.w=keys.W;keys.a=keys.A;keys.s=keys.S;keys.d=keys.D;
        keys.fire=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        keys.alternate=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        ready=true;sync();draw();reportGameLoading(1);
      },update(_time:number,delta:number){
        let remaining=manualStepping?0:Math.min(delta,100);
        while(remaining>0){const step=Math.min(remaining,1000/120);tick(step);remaining-=step;}
        draw();
      }} });
    const toggle=(event:KeyboardEvent)=>{
      if(!event.repeat && ['Escape','p','P'].includes(event.key)){event.preventDefault();callbacks.current.onTogglePause();}
    };
    window.addEventListener('keydown',toggle);
    const read=()=>JSON.stringify({coordinateSystem:'screen origin top-left; x right, y down; course scrolls left',engine:'flight',viewport:{...viewport,combatWidth:1024},
      mode:state.phase==='gameover'?'gameover':paused.current?'paused':state.phase,level:FLIGHT_LEVEL,chapter:'STARBREAK RUN',
      section:state.distance<5000?'Canopy Climb':state.distance<11500?'High Orbit':'Void Approach',failedAssets,
      selectedCharacter:{id:selectedCharacterId,name:hero.name},
      player:ready?{x:Math.round(state.x),y:Math.round(state.y),velocityX:Math.round(state.vx),velocityY:Math.round(state.vy),health:state.hull,lives:state.lives,texture:'flight_ship',frame:0}:null,
      ship:{hull:state.hull,bank:ship?.angle??0,collisionHalfWidth:46,collisionHalfHeight:16,impacts:state.impacts,pilotVisible:pilot?.visible??false,invulnerable:state.clock<state.invulnerableUntil,visible:ship?.visible??false},
      shipDeath:{...shipDeathPose(state.death,state.clock),active:Boolean(shipDeathPose(state.death,state.clock)?.visible),fragments:deathChunks.filter(image=>image.visible&&image.alpha>0).length},
      weapon:{id:state.combat.weapon,hits:state.weaponHits,maxHits:3,name:FLIGHT_WEAPONS[state.combat.weapon].name,description:FLIGHT_WEAPONS[state.combat.weapon].description,
        collected:state.collectedWeapons,checkpoint:state.checkpointWeapon,changedAt:state.weaponChangedAt},
      weaponPickups:FLIGHT_WEAPON_PICKUPS.filter(p=>!state.collectedWeapons.includes(p.id)).map(p=>({...p,x:p.distance-state.distance,y:weaponPickupY(p,state.clock)})).filter(p=>p.x>-100&&p.x<1400),
      visualMotion:{parallax:FLIGHT_PARALLAX,streaks:state.phase==='flight'?34:0,cloudOffset:state.travel*FLIGHT_PARALLAX.clouds,starTravel:state.travel+state.clock*.08},
      flight:{phase:state.phase,phaseMs:Math.round(state.phaseMs),distance:Math.round(state.distance),travel:Math.round(state.travel),endDistance:FLIGHT_END,checkpoint:state.checkpoint,beacons:state.collected.length,
        finaleStarted:state.combat.finaleStarted,finaleDefeated:state.combat.finaleDefeated,asteroidSeed:state.asteroidSeed,totalAsteroids:state.rocks.length,destroyedAsteroidIds:state.rocks.filter(r=>r.hp<=0).map(r=>r.id)},
      checkpoint:{x:state.checkpoint,index:state.checkpoint===PURSUER_CHECKPOINT?3:state.checkpoint===11500?2:state.checkpoint===6000?1:0},progress:{score:state.score,levelEndX:FLIGHT_END},
      obstacles:state.rocks.filter(r=>r.hp>0&&rockX(r,state.clock,state.distance)>-150&&rockX(r,state.clock,state.distance)<1350).map(r=>({id:r.id,x:Math.round(rockX(r,state.clock,state.distance)),y:Math.round(rockY(r,state.clock)),radius:r.radius,hp:r.hp,maxHp:r.maxHp})),
      beacons:FLIGHT_BEACONS.map((b,id)=>({...b,id,x:b.distance-state.distance,collected:state.collected.includes(id)})),
      powerups:{swordUnlocked:initialStats.swordUnlocked,hasFlameSword:initialStats.hasFlameSword,swordDurability:initialStats.swordDurability,gravityCoreUnlocked:initialStats.gravityCoreUnlocked},
      companionsOnboard:{dinio:initialStats.hasDinio,doghost:initialStats.hasDoghost,teleportationC:initialStats.hasTeleportationC},touchControls:window.__unknownUniverseTouchControls??{},
      combat:{shotsFired:state.combat.shotsFired,hits:state.combat.hits,guardedHits:state.combat.guardedHits,rockBlocks:state.combat.rockBlocks,kills:state.combat.defeated.length,
        asteroidHits:state.combat.rockHits,asteroidsDestroyed:state.combat.rocksDestroyed,visibleDebris:[...debris.values()].reduce((n,shards)=>n+shards.length,0),
        enemyShots:state.combat.enemyShots,repairsCollected:state.combat.repairsCollected,muzzles:shipMuzzles(state),wave:state.combat.waveName},
      enemies:state.combat.enemies.map(e=>({...e,vulnerable:e.kind!=='pursuer'||e.phase==='recover',
        visualFrame:Number(enemyViews.get(e.id)?.frame.name??0),
        recoveryDurationMs:e.kind==='pursuer'?pursuerCounterWindow(e.phaseNumber??1):null,
        death:e.kind==='pursuer'&&e.phase==='dying'?{...bossDeathPose(e.phaseMs),texture:bossDeathTexture('pursuer'),elapsedMs:e.phaseMs}:null})),
      effects:state.combat.effects.map(fx=>({...fx,progress:Math.min(1,(state.clock-fx.born)/fx.duration),visualFrame:explosions.get(fx.id)?.frame.name??null})),
      projectiles:state.combat.bolts.map(b=>({...b,playerShot:b.owner==='player',enemyProjectile:b.owner==='enemy'})),repairs:state.combat.repairs});
    const unwatchViewport=watchGameViewport(game,host.current,next=>{
      viewport=next;
      if(!ready)return;
      scene.cameras.main.setSize(next.width,next.height);
      pads.forEach(p=>p.setPosition(-(next.width-1024)/2,492).setSize(next.width,84));
      const span=Math.max(1728,next.width);
      orbit.forEach(image=>image.setDisplaySize(span,span/3));
      draw();
    });
    window.render_game_to_text=read;
    window.advanceTime=async(ms:number)=>{
      // Once automation takes the clock, rendering and tool latency must not advance combat again.
      manualStepping=true;
      let remaining=Math.max(0,Math.min(ms,120000));
      while(remaining>0&&!disposed){const step=Math.min(remaining,1000/120);tick(step);remaining-=step;}
      draw();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    };
    if(params.get('capture')==='1'||params.get('devTools')==='1'){
      window.__unknownFlightDamageShip=(amount)=>{damageShip(state,amount);syncFlightSounds();sync();draw();};
      window.__unknownFlightSetShipPosition=(x,y)=>{state.x=Phaser.Math.Clamp(x,100,910);state.y=Phaser.Math.Clamp(y,145,475);state.vx=state.vy=0;};
      window.__unknownFlightEnemyTest=(kind,hp=8)=>{
        if(!['scout','interceptor','gunship'].includes(kind))return;
        state.phase='flight';state.phaseMs=0;state.distance=1000;state.x=230;state.y=300;state.vx=state.vy=0;state.rocks=[];
        state.combat.enemies=[{id:'motion-test',kind,x:720,y:300,baseY:300,hp,maxHp:hp,age:0,phase:'enter',phaseMs:0,aimX:230,aimY:300,startX:720,startY:300}];
        state.combat.bolts=[];state.combat.effects=[];state.combat.spawnedWaves=[0,1,2,3,4];state.combat.finaleStarted=false;
        draw();
      };
    }
    return ()=>{
      unwatchViewport();
      disposed=true;ready=false;
      window.removeEventListener('keydown',toggle);
      window.__unknownFlightDamageShip=undefined;window.__unknownFlightSetShipPosition=undefined;
      window.__unknownFlightEnemyTest=undefined;
      if(window.render_game_to_text===read)window.render_game_to_text=()=>JSON.stringify({engine:'flight',mode:'remounting',level:FLIGHT_LEVEL,player:null});
      game.destroy(true);
    };
  },[selectedCharacterId,difficulty]);
  return <div ref={host} className="unknown-universe-game h-full w-full" />;
};
export default FlightGameEngine;
