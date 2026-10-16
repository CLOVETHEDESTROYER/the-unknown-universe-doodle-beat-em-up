import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/ground-obstacles-v1/playtest/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[],evidence={};
let currentSamples=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot=n=>page.screenshot({path:fileURLToPath(new URL(`${n}.png`,out))});
async function wait(pred,timeout=6500){
  const until=Date.now()+timeout;
  while(Date.now()<until){assert.deepEqual(errors,[]);let s=await read();if(pred(s))return s;await page.waitForTimeout(20);}
  throw new Error(`Timeout: ${pred}`);
}
async function boot(level,query=''){
  for(const key of ['ArrowRight','ArrowLeft','ArrowUp','KeyZ','Space','KeyC'])await page.keyboard.up(key);
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=${level}&capture=1&sword=1&swordUnlocked=1${query}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets,[]);
}
try{
  for(const [level,end] of [[1,10855],[2,10855],[3,9485],[4,9700],[6,9624]]){
    await boot(level);let s=await read();assert.equal(s.progress.levelEndX,end);
    const cps=s.terrain.checkpoints.map(p=>p.x);assert.deepEqual(cps,[...cps].sort((a,b)=>a-b));
    if([3,4,6].includes(level)){
      assert(s.crumblingPlatforms.length>=2);assert(s.movingPlatforms.some(p=>p.axis==='x'));
      assert(s.springPads.length);assert(s.enemies.find(e=>e.kind==='boss').x>s.terrain.obstacleStart+2200);
    }
  }
  evidence.lengthsAssetsAndCheckpoints=true;
  await boot(3);let s=await read(),ledge=s.crumblingPlatforms[0];
  await place(ledge.x+ledge.w/2,ledge.y);
  s=await wait(s=>s.crumblingPlatforms[0].phase==='shaking');await shot('crumble-warning');
  await page.keyboard.press('KeyP');await page.waitForTimeout(100);const paused=await read();await page.waitForTimeout(450);
  assert.equal((await read()).crumblingPlatforms[0].elapsed,paused.crumblingPlatforms[0].elapsed);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);
  s=await wait(s=>s.crumblingPlatforms[0].phase==='gone');assert(!s.crumblingPlatforms[0].solid);
  await shot('crumble-dropped');
  await wait(s=>s.crumblingPlatforms[0].phase==='ready');assert((await read()).crumblingPlatforms[0].solid);
  evidence.crumbleDropRestoreAndPause=true;

  s=await read();const shuttle=s.movingPlatforms.find(p=>p.axis==='x');
  await place(shuttle.x+shuttle.width/2,shuttle.y);
  await wait(s=>s.player.grounded&&Math.abs(s.player.bodyBottom-s.movingPlatforms.find(p=>p.axis==='x').y)<4);
  const ride=[];for(let i=0;i<22;i++){s=await read();ride.push({p:s.player,l:s.movingPlatforms.find(p=>p.axis==='x')});await page.waitForTimeout(50);}
  assert(Math.max(...ride.map(s=>s.p.x))-Math.min(...ride.map(s=>s.p.x))>35);
  assert(ride.every(s=>Math.abs(s.p.bodyBottom-s.l.y)<4));
  assert(ride.every(s=>s.l.x>=s.l.minX-2&&s.l.x<=s.l.maxX+2));
  await shot('horizontal-ride');evidence.horizontalRider=true;
  await page.keyboard.down('KeyZ');await page.waitForTimeout(100);assert((await read()).player.velocityY< -300);
  await page.keyboard.up('KeyZ');evidence.jumpOffShuttle=true;

  await boot(3);s=await read();const vent=s.timedVents[0];
  await place(vent.x-110,520);await wait(s=>s.timedVents[0].phase==='warning');await shot('vent-warning');
  s=await wait(s=>s.timedVents[0].active);assert.equal(s.player.health,100);await shot('vent-active');
  await place(vent.x+vent.w/2,520);s=await wait(s=>s.player.health===88);assert.equal(s.player.lives,3);
  const quiet=await wait(s=>s.timedVents[0].phase==='idle');await place(vent.x+vent.w/2,520);
  await page.waitForTimeout(450);assert.equal((await read()).player.health,quiet.player.health);
  evidence.ventWarningDamageAndSafeInterval=true;

  for(const [level,goal] of [[3,7800],[4,8540],[6,7860]]){
    await boot(level,'&obstacleCourse=1');s=await read();const start=s.player.x;
    const ground=s.terrain.platforms.filter(p=>p.y===520&&p.h>=100).sort((a,b)=>a.x-b.x);
    const merged=[];for(const p of ground){const last=merged.at(-1);if(last&&p.x<=last.right)last.right=Math.max(last.right,p.x+p.w);else merged.push({left:p.x,right:p.x+p.w});}
    const gaps=merged.slice(0,-1).filter((p,i)=>merged[i+1].left>p.right).map(p=>p.right);
    const walls=s.terrain.platforms.filter(p=>p.h>56&&p.y<520&&p.x>=start&&p.x<goal);
    const samples=currentSamples=[];let jumping=false,attackAt=0;const until=Date.now()+40000;
    await page.keyboard.down('ArrowRight');await page.keyboard.down('KeyC');
    while(Date.now()<until){
      s=await read();assert.deepEqual(errors,[]);assert.equal(s.player.lives,3,'The extension is traversable without losing a life');
      samples.push({x:s.player.x,y:s.player.y,health:s.player.health,checkpoint:s.checkpoint.x});
      if(s.player.x>=goal)break;
      const floor=s.player.bodyBottom;
      const leavingCrumble=s.crumblingPlatforms.some(p=>p.solid&&Math.abs(floor-p.y)<4&&s.player.x>=p.x+p.w-70&&s.player.x<=p.x+p.w+15);
      const leavingLedge=s.terrain.platforms.some(p=>p.h<=56&&Math.abs(floor-p.y)<4&&s.player.x>=p.x+p.w-70&&s.player.x<=p.x+p.w+15);
      const leavingShuttle=s.movingPlatforms.some(p=>Math.abs(floor-p.y)<4&&s.player.x>=p.x+p.width-70&&s.player.x<=p.x+p.width+15);
      const gap=gaps.some(x=>s.player.x>=x-75&&s.player.x<x+15&&floor>430);
      const wall=walls.some(p=>s.player.x>=p.x-(520-p.y>120?140:110)&&s.player.x<p.x&&floor>p.y+5);
      const plume=s.timedVents.some(p=>s.player.x>=p.x-120&&s.player.x<p.x&&floor>p.y-p.height+10);
      if(s.player.grounded&&!jumping&&(leavingCrumble||leavingLedge||leavingShuttle||gap||wall||plume)){
        await page.keyboard.down('KeyZ');jumping=true;
      }else if(jumping&&s.player.velocityY>0){await page.keyboard.up('KeyZ');jumping=false;}
      if(Date.now()-attackAt>520){await page.keyboard.press('Space');attackAt=Date.now();}
      await page.waitForTimeout(20);
    }
    await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyC');await page.keyboard.up('KeyZ');
    await wait(s=>s.player.grounded);s=await read();assert(s.player.x>=goal-30);
    assert(s.springPads.some(p=>p.x>=start&&p.launches>0));
    // A stomp or upper route can pass over the small flag. Settle, then walk onto it.
    for(let i=0;i<4&&(await read()).checkpoint.x<goal-80;i++){
      s=await read();const key=s.player.x>goal?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);
      await wait(s=>key==='ArrowLeft'?s.player.x<=goal:s.player.x>=goal,4000);
      await page.keyboard.up(key);await page.waitForTimeout(220);
    }
    s=await read();
    const reached=samples.map(s=>s.checkpoint);
    assert(samples.every((v,i)=>i===0||v.x>=samples[i-1].x-250),'The extension clears without falling back to a checkpoint');
    assert(reached.every((x,i)=>i===0||x>=reached[i-1]),'Crossed checkpoints activate in route order');
    assert(s.checkpoint.x>=goal-80,'The safe final flag activates before the boss');
    await shot(`level-${level}-approach`);evidence[`route-${level}`]={start,finish:s.player.x,health:s.player.health,lives:s.player.lives,checkpoint:s.checkpoint.x};
    const cp=s.checkpoint.x;await page.evaluate(()=>window.__unknownPlatformerForceFall());
    s=await wait(s=>s.xgodPose==='normal'&&s.player.grounded&&Math.abs(s.player.x-cp)<40);
    assert(!s.bossArenaCamera.locked,'Checkpoint remains outside the boss trigger');
    evidence[`respawn-${level}`]=true;
    await fs.writeFile(new URL(`route-${level}-samples.json`,out),JSON.stringify(samples));
  }
  await page.setViewportSize({width:844,height:390});await boot(6,'&obstacleCourse=1');
  await place(6520,520);await page.waitForTimeout(900);await shot('phone-obstacles');
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,currentSamples,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
