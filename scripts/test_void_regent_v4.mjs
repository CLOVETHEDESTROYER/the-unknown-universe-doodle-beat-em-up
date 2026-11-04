import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Browser plugin skill is absent; use the project's local Playwright runtime.
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:54821';
const out=process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'unknown-universe-regent-v4');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],evidence=[];let context,page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.enemies?.find(e=>e.kind==='boss');
const fixture=options=>page.evaluate(options=>window.__unknownPlatformerBossRulesTest(options),options);
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot=n=>page.screenshot({path:path.join(out,n+'.png')});
async function wait(fn,ms=18000){
  const end=Date.now()+ms;
  while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s,boss(s)))return s;await page.waitForTimeout(20);}
  throw Error('Timed out: '+fn);
}
async function fresh(options={}){
  if(context)await context.close();context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,...options});page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
}
async function boot(extra=''){
  await page.goto(`${origin}/?autostart=1&level=6&finishLevel=1&capture=1${extra}`);
  const s=await wait((s,b)=>s.mode==='platforming'&&s.player?.grounded&&b&&s.bossArenaCamera?.locked&&s.bossArenaCamera.left>b.x-s.viewport.width+100,60000);
  assert.equal(await page.title(),'The Unknown Universe');assert.equal(await page.locator('vite-error-overlay').count(),0);assert.deepEqual(s.failedAssets,[]);
  return s;
}
async function aimCounter(s){
  const b=boss(s),bad=s.pickups.filter(p=>['power','blaster','sword','frost','ember','storm'].includes(p.kind));
  const sides=b.x>(b.left+b.right)/2?[-1,1]:[1,-1];
  const candidates=sides.flatMap(d=>[145,185,215].map(distance=>b.x+d*distance));
  const x=candidates.find(x=>x>b.left-100&&x<b.right+100&&bad.every(p=>Math.abs(p.x-x)>70))??candidates[0];
  await place(x,b.floorY);await page.keyboard.press(x<b.x?'ArrowRight':'ArrowLeft',{delay:30});
}
async function awaitOpening(phase){
  const end=Date.now()+20000;
  while(Date.now()<end){
    const s=await read(),b=boss(s);
    if(b.phase===phase&&b.vulnerable)return s;
    // Position setup isolates phase/clear rules; actual jump dodges are checked above.
    await place(b.left-220,b.floorY-320);await page.waitForTimeout(35);
  }
  throw Error('No natural counter window in phase '+phase);
}
async function resupply(){
  if((await read()).equipment.active==='hands'){
    await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));
    assert.equal((await read()).equipment.active,'blaster');
  }
}
const moves=['star_fan','void_crash','blink_burst','crown_nova','shadow_dash','void_rain'];
const baseWindow=()=>3000;
try{
  await fresh();let s=await boot();assert.equal(boss(s).bossId,'void_regent');assert.equal(boss(s).maxHp,120);assert.equal(boss(s).phaseCount,3);
  assert.equal(boss(s).right-boss(s).left,880);evidence.push({campaignHealth:120,phases:3,arenaWidth:880});
  if(process.env.REGENT_TEST_SECTION!=='flow'){
  for(const phase of [1,2,3])for(const move of moves){
    await boot('&character=zgod');await fixture({state:'tell',regentMove:move,phase,hp:120});
    s=await wait((s,b)=>b.attackState==='tell'&&b.stateElapsedMs>90&&s.bossCues.warningVisible);
    const locked={target:boss(s).targetX,marked:[...boss(s).markedXs],bodyWidth:boss(s).bodyWidth};
    await shot(`phase${phase}-${move}-warning`);
    s=await wait((s,b)=>b.attackState==='attack'&&b.stateElapsedMs>140);
    const seen=new Set();let maxBursts=0,maxTeleports=0,minY=boss(s).y,captured=false;
    const deadline=Date.now()+10000;
    while(Date.now()<deadline){
      s=await read();const b=boss(s);assert.equal(b.targetX,locked.target);assert.deepEqual(b.markedXs,locked.marked);
      assert.equal(b.bodyWidth,locked.bodyWidth);assert.equal(b.bodyBottom,b.y);assert(b.x>=b.left&&b.x<=b.right);
      maxBursts=Math.max(maxBursts,b.shotsInBurst??0);maxTeleports=Math.max(maxTeleports,b.teleportsThisMove);minY=Math.min(minY,b.y);
      s.projectiles.filter(p=>p.sourceBoss==='void_regent').forEach(p=>seen.add(p.pattern));
      if(!captured&&b.attackState==='attack'&&(move==='void_crash'?b.stateElapsedMs>440:move==='shadow_dash'?b.stateElapsedMs>250:b.shotsInBurst>0)){
        await shot(`phase${phase}-${move}-attack`);captured=true;
      }
      if(b.vulnerable&&b.visualFrame===10)break;
      await page.waitForTimeout(20);
    }
    const b=boss(s);assert(b.vulnerable);assert.equal(b.recoveryDurationMs,baseWindow(move));
    assert(b.recoveryRemainingMs>1200);assert(s.bossCues.vulnerability.attackPromptVisible);assert.equal(b.canDamage,false);
    assert(!s.projectiles.some(p=>p.sourceBoss==='void_regent'));
    if(move==='crown_nova'){assert.equal(maxBursts,phase+1);assert(seen.has('regent_nova'));}
    if(move==='void_crash'){assert.equal(maxBursts,phase);assert(minY<b.floorY-130);assert(seen.has('regent_crash_wave'));assert(Math.abs(b.x-locked.target)<5);}
    if(move==='blink_burst')assert.equal(maxTeleports,phase);
    if(move==='star_fan')assert.equal(maxBursts,phase+1);
    if(move==='void_rain')assert.equal(maxBursts,phase===3?14:phase===2?5:3);
    evidence.push({phase,move,maxBursts,maxTeleports,patterns:[...seen],safeFullCounter:true,fixedCollider:true});
  }

  // All-direction fire makes simply camping behind the boss unsafe.
  await boot();await fixture({state:'attack',regentMove:'crown_nova'});s=await read();await place(boss(s).x+230,boss(s).floorY);
  s=await wait(s=>s.player.health<100);assert.equal(s.player.health,89);await shot('nova-hits-behind');evidence.push({novaDamagesRearCamper:true,damage:11});
  await boot();await fixture({state:'attack',regentMove:'crown_nova'});s=await read();await place(boss(s).x+230,boss(s).floorY);
  await wait((s,b)=>b.stateElapsedMs>=300);await page.keyboard.down('z');await wait(s=>s.player.velocityY< -400);await page.waitForTimeout(450);
  s=await read();assert.equal(s.player.health,100,'A real jump clears the first outward star pulse');await shot('jump-over-nova');await page.keyboard.up('z');
  evidence.push({realJumpDodgesNova:true});

  await boot();await fixture({state:'attack',regentMove:'void_crash'});s=await read();
  await wait((s,b)=>b.stateElapsedMs>=480);
  await place(boss(s).targetX+220,boss(s).floorY);
  await wait((s,b)=>b.stateElapsedMs>=900);await page.keyboard.down('z');await wait(s=>s.player.velocityY< -400);
  await page.waitForTimeout(350);s=await read();assert.equal(s.player.health,100);await shot('jump-over-crash-wave');await page.keyboard.up('z');
  evidence.push({realJumpDodgesCrashWave:true});

  await boot();await fixture({state:'tell',regentMove:'blink_burst',phase:3});s=await read();const target=boss(s).targetX;
  await place(target,boss(s).floorY);s=await wait((s,b)=>b.teleportsThisMove===1);assert.equal(boss(s).canDamage,false);assert.equal(s.player.health,100);
  await place((boss(s).left+boss(s).right)/2,boss(s).floorY);
  s=await wait((s,b)=>b.stateElapsedMs>1090&&b.stateElapsedMs<1200);assert.equal(boss(s).canDamage,false);
  const star=s.projectiles.find(p=>p.sourceBoss==='void_regent'&&p.pattern==='void_star'&&p.y<boss(s).floorY-50);
  assert(star,'Visible stars survive a subsequent departure');const before=s.player.health;
  await place(star.x,star.y+54);s=await wait(s=>s.player.health<before,1500);assert.equal(before-s.player.health,10);
  evidence.push({teleportBodySafe:true,starsPersistThroughRifts:true,visibleStarStillDamages:true});

  await boot();await fixture({state:'tell',regentMove:'void_crash',phase:3});await wait((s,b)=>b.attackState==='tell'&&b.stateElapsedMs>100);
  await page.keyboard.press('p');s=await wait(s=>s.mode==='paused');const elapsed=boss(s).stateElapsedMs;
  await page.waitForTimeout(400);assert.equal(boss(await read()).stateElapsedMs,elapsed);await page.keyboard.press('p');
  s=await wait(s=>s.mode==='platforming');assert.equal(boss(s).attackState,'tell');assert(boss(s).stateElapsedMs<elapsed+150);
  evidence.push({pausePreservesFinalPhaseWarning:true});

  for(const phase of [1,2,3]){
    await boot();await fixture({state:'recover',regentMove:'crown_nova',phase,contact:true,shot:'boss'});await page.waitForTimeout(200);
    s=await read();assert.equal(s.player.health,100);assert.equal(s.player.velocityX,0);
    await aimCounter(s);const hp=boss(s).hp;await page.keyboard.down('Space');s=await wait((s,b)=>b.hp<hp);await page.keyboard.up('Space');
    evidence.push({phase,realOpeningDamage:true,harmlessRecovery:true});
  }

  }
  // Lower-HP setup isolates real health-driven phase transitions and victory.
  await boot();await fixture({state:'recover',regentMove:'star_fan',hp:27});
  for(const [phase,threshold,nextPhase] of [[1,18,2],[2,9,3]]){
    s=await awaitOpening(phase);await resupply();await aimCounter(s);await page.keyboard.down('Space');
    s=await wait((s,b)=>b.hp<=threshold);await page.keyboard.up('Space');assert.equal(boss(s).phase,phase);assert(boss(s).vulnerable);
    const hp=boss(s).hp;s=await wait((s,b)=>b.phase===nextPhase&&b.attackState==='phase');
    await aimCounter(s);await page.keyboard.down('Space');await page.waitForTimeout(200);await page.keyboard.up('Space');assert.equal(boss(await read()).hp,hp);
    await shot(`natural-phase${nextPhase}-ascension`);
  }
  s=await awaitOpening(3);await resupply();await aimCounter(s);
  await page.keyboard.down('Space');
  s=await wait(s=>s.bossDeath?.visible);await page.keyboard.up('Space');assert.equal(s.bossDeath.bossId,'void_regent');
  s=await wait(s=>s.bossDefeated);assert(!s.projectiles.some(p=>p.enemyProjectile));await shot('regent-defeated');
  await wait(s=>s.bossDeath.stage==='finished');await place(s.progress.levelEndX,520);await wait(s=>s.mode==='transition');
  await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.getByRole('heading',{name:'Universe Saved',exact:true}).waitFor({state:'visible',timeout:60000});
  evidence.push({realHealthTransitions:true,fullOpeningBeforeAscension:true,protectedTransitions:true,realBlasterClear:true,finalVictory:true});

  for(const viewport of [{width:844,height:390},{width:734,height:290}]){
    await fresh({...devices['iPhone 13'],viewport,deviceScaleFactor:1});await boot('&character=zgod');
    for(const move of ['crown_nova','void_crash','blink_burst']){
      await fixture({state:'tell',regentMove:move,phase:3,hp:120});await wait((s,b)=>b.attackState==='tell'&&b.stateElapsedMs>80);await shot(`phone-${viewport.width}-${move}-warning`);
      await wait((s,b)=>b.attackState==='attack'&&b.stateElapsedMs>(move==='void_crash'?450:750));await shot(`phone-${viewport.width}-${move}-attack`);
      await wait((s,b)=>b.vulnerable);s=await read();assert.deepEqual(s.failedAssets,[]);
    }
    evidence.push({viewport,finalPhaseReadable:true,threeMovesShown:true});
  }
  await fresh();await boot();await fixture({state:'attack',regentMove:'blink_burst',phase:3});s=await wait((s,b)=>b.teleportsThisMove===1);
  await place(boss(s).left-400,boss(s).floorY);s=await wait((s,b)=>!b.engaged&&!s.bossArenaCamera.locked);
  assert.equal(s.regentRiftEffects,0);assert(!s.projectiles.some(p=>p.sourceBoss==='void_regent'));evidence.push({retreatClearsRiftsAndStars:true});
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,out,evidence,errors}));
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
