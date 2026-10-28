import { chromium, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const engine=process.env.GAME_TEST_BROWSER||'chromium';
const device=process.env.GAME_TEST_DEVICE||'desktop';
const selected=process.env.GAME_TEST_LEVELS?.split(',').map(Number)||[1,2,3,4,6,5];
const out=new URL(`../output/boss-defeats-v1/${engine}-${device.replaceAll(' ','-')}/`,import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const results=[];
try { for(const level of selected) {
 const context=await browser.newContext({...device==='desktop'?{viewport:{width:1366,height:900}}:devices[device],deviceScaleFactor:1});
 const page=await context.newPage(), errors=[], requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 page.on('request',r=>{if(r.url().includes('/deaths-v1/'))requests.push(r.url());});
 const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const boss=s=>s.enemies.find(e=>e.kind===(level===5?'pursuer':'boss'));
 const place=(x,y)=>page.evaluate(({x,y,flight})=>flight?window.__unknownFlightSetShipPosition(x,y):window.__unknownPlatformerSetPlayerPosition(x,y),{x,y,flight:level===5});
 async function wait(fn,timeout=25000) {const until=Date.now()+timeout;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(fn(s,boss(s)))return s;if(level===5)await page.evaluate(()=>window.advanceTime(20));else await page.waitForTimeout(20);}throw Error(`Timeout: ${fn}`);}
 async function capture(name){await page.screenshot({path:fileURLToPath(new URL(`L${level}-${name}.png`,out))});}
 async function boot(hero='xgod') {
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=${hero}&finishLevel=1&flightFinale=1&unlockRoster=1`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player,null,{timeout:60000});
  await page.evaluate(()=>{
   window.__bossDefeatFrames={};window.__bossCounterSamples=[];
   const sample=()=>{
    const s=JSON.parse(window.render_game_to_text()), b=s.enemies.find(e=>e.kind==='pursuer'),d=s.bossDeath||b?.death;
    if(d?.visible||b?.phase==='dying'){
     const key=String(d.frame);if(!window.__bossDefeatFrames[key])window.__bossDefeatFrames[key]={state:d,png:document.querySelector('canvas').toDataURL('image/png')};
    }
    if(s.bossCues){const b=s.enemies.find(e=>e.kind==='boss');window.__bossCounterSamples.push({open:!!b?.vulnerable,cue:s.bossCues.vulnerability.attackPromptVisible});}
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
 }
 try {
  if(level!==5){
   await boot();let s=await wait((s,b)=>b?.attackState==='tell');
   const expectedId=boss(s).bossId;
   assert.equal(requests.filter(r=>r.endsWith('.json')).length,1);assert(requests.every(r=>r.includes(`/${expectedId}.`)));
   const openings=[],seen=new Set();let guarded=false,openingKey='',shotLane=null;
   const until=Date.now()+150000;
   while(Date.now()<until){
    s=await read();const b=boss(s);assert.deepEqual(errors,[]);if(!b)break;
    assert(s.player.lives>0,'Counter test survives');
    if(b.vulnerable){
     const key=`${b.phase}:${b.attacksCompleted}`;
     if(key!==openingKey){
      openingKey=key;seen.add(b.phase);openings.push({phase:b.phase,move:b.move,duration:b.recoveryDurationMs,remaining:b.recoveryRemainingMs});
      assert(b.recoveryDurationMs>=(b.phase===2?2200:2600));assert(b.recoveryDurationMs<=(b.phase===2?2400:2800));
      assert.equal(s.bossCues.vulnerability.attackPromptVisible,true);assert(Math.abs(s.bossCues.vulnerability.remainingMs-b.recoveryRemainingMs)<2);
      const choices=[b.x-250,b.x+250,b.x-300,b.x+300];
      shotLane=choices.find(x=>x>b.left-140&&x<b.right+140&&s.powerStations.every(p=>!p.available||Math.abs(p.x-x)>90));
      assert(shotLane!==undefined);
      await page.keyboard.up('Space');await place(shotLane,b.floorY);
      const direction=shotLane<b.x?'ArrowRight':'ArrowLeft';await page.keyboard.down(direction);
      await wait(s=>s.player.facing===(shotLane<b.x?'right':'left'));await page.keyboard.up(direction);
      if(s.equipment.active!=='blaster')await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));
     }
     await page.keyboard.down('Space');
    }else{
     await page.keyboard.up('Space');
     if(!guarded&&b.attackState==='tell'&&b.stateElapsedMs<220){
      const x=b.x-b.facing*260;await place(x,b.floorY);
      const direction=x<b.x?'ArrowRight':'ArrowLeft';await page.keyboard.down(direction);await page.waitForTimeout(25);await page.keyboard.up(direction);
      await page.keyboard.down('Space');await page.waitForTimeout(170);await page.keyboard.up('Space');
      const after=boss(await read());if(after?.guardedHits>0){assert.equal(after.hp,b.hp);guarded=true;}
     }
     const travels=['axe_dash','leap_slam','dragon_lunge','cinder_bound','shadow_dash','witch_step','blink_burst'].includes(b.move);
     const safe=travels?(b.targetX<(b.left+b.right)/2?b.right+100:b.left-100):b.x-b.facing*300;
     await place(Math.max(b.left-140,Math.min(b.right+140,safe)),b.floorY-170);
    }
    await page.waitForTimeout(35);
   }
   await page.keyboard.up('Space');assert(!boss(await read()),'Actual blaster counters defeat the boss');assert.deepEqual([...seen].sort(),[1,2]);
   s=await wait(s=>s.bossDeath.stage==='fallen');assert(!s.bossDefeated&&s.bossArenaCamera.locked);
   assert.equal(s.projectiles.some(p=>p.enemyProjectile),false);assert.equal(s.bossAttackVisualVisible,false);
   await page.keyboard.press('p');await wait(s=>s.mode==='paused');const paused=(await read()).bossDeath;
   await page.waitForTimeout(250);assert.deepEqual((await read()).bossDeath,paused,'Pause freezes the death sequence');
   await page.getByRole('button',{name:'Resume Playing'}).click();await capture('fallen');
   s=await wait(s=>s.bossDeath.stage==='finished');assert(s.bossDefeated&&!s.bossArenaCamera.locked);assert(!s.bossDeath.visible);
   const frames=await page.evaluate(()=>window.__bossDefeatFrames);assert.deepEqual(Object.keys(frames).sort(),['0','1','2','3']);
   for(const [frame,item] of Object.entries(frames))await fs.writeFile(new URL(`L${level}-death-${frame}.png`,out),Buffer.from(item.png.split(',')[1],'base64'));
   const samples=await page.evaluate(()=>window.__bossCounterSamples);assert(samples.every(x=>x.open===x.cue));
   const score=s.progress.score;await page.waitForTimeout(300);assert.equal((await read()).progress.score,score);
   if(level===1)assert.equal(s.pickups.filter(p=>p.kind==='power').length,1);
   await place(s.progress.levelEndX,boss(s)?.floorY||(level<=2?480:520));await wait(s=>s.mode==='transition'||s.mode==='victory'||s.level!==level);
   results.push({level,guarded,openings,deathFrames:Object.keys(frames),pause:true,exit:true,requests,errors});
  }else{
   // All three real combat phases before the wreck sequence; no debug damage.
   await boot();let s=await wait((s,b)=>b?.phase==='tell'),seen=new Set();
   let openingKey='',openingHp=72;const openings=[];const until=Date.now()+100000;
   while(Date.now()<until){
    s=await read();const b=boss(s);assert.deepEqual(errors,[]);if(!b||b.phase==='dying')break;
    if(b.phase==='recover'){
     seen.add(b.phaseNumber);const key=`${b.phaseNumber}:${b.attacks}`;
     if(key!==openingKey){openingKey=key;openingHp=b.hp;openings.push({phase:b.phaseNumber,duration:b.recoveryDurationMs});assert.equal(b.recoveryDurationMs,b.phaseNumber>=2?2600:3000);}
     if(openingHp-b.hp<6&&b.phaseMs<1800){await place(675,255);await page.keyboard.down('Space');}
     else{await page.keyboard.up('Space');await place(100,145);}
    }else{await page.keyboard.up('Space');await place(100,b.move==='barrage'&&['tell','attack'].includes(b.phase)?b.safeY:b.aimY<300?475:145);}
    await page.evaluate(()=>window.advanceTime(60));
   }
   await page.keyboard.up('Space');s=await wait((s,b)=>b?.phase==='dying');assert.deepEqual([...seen].sort(),[1,2,3]);assert(!s.flight.finaleDefeated);
   assert.equal(s.projectiles.filter(p=>p.enemyProjectile).length,0);const score=s.progress.score;
   await page.keyboard.press('p');await wait(s=>s.mode==='paused');const frozen=boss(await read());await page.waitForTimeout(250);assert.deepEqual(boss(await read()),frozen);
   await page.getByRole('button',{name:'Resume Playing'}).click();await capture('wreck');
   await wait(s=>s.flight.finaleDefeated);s=await read();assert.equal(s.progress.score,score);assert(!boss(s));
   const frames=await page.evaluate(()=>window.__bossDefeatFrames);assert.deepEqual(Object.keys(frames).sort(),['0','1','2','3']);
   for(const [frame,item] of Object.entries(frames))await fs.writeFile(new URL(`L5-death-${frame}.png`,out),Buffer.from(item.png.split(',')[1],'base64'));
   assert.equal(requests.filter(r=>r.endsWith('.json')).length,1);assert(requests.every(r=>r.includes('/pursuer.')));
   results.push({level,openings,deathFrames:Object.keys(frames),pause:true,requests,errors});
  }
  assert.deepEqual((await read()).failedAssets,[]);assert.deepEqual(errors,[]);
  await fs.writeFile(new URL(`L${level}-results.json`,out),JSON.stringify(results.at(-1),null,2));
  console.log(`${engine} ${device} L${level}: PASS — longer openings in both phases, four death frames, pause, cleanup and progression`);
 }catch(e){await capture('failure').catch(()=>{});await fs.writeFile(new URL(`L${level}-failure.json`,out),JSON.stringify({error:String(e),state:await read().catch(()=>null),errors},null,2));throw e;}
 finally{await context.close();}
 }}finally{await fs.writeFile(new URL('results.json',out),JSON.stringify(results,null,2));await browser.close();}
