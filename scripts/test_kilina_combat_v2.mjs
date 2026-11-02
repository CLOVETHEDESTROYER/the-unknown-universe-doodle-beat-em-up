import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Browser plugin skill is absent; validate with the project's Playwright runtime.
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:54821';
const out=process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'unknown-universe-kilina-v2');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],evidence=[];
let context,page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.enemies?.find(e=>e.kind==='boss');
const fixture=options=>page.evaluate(options=>window.__unknownPlatformerBossRulesTest(options),options);
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot=n=>page.screenshot({path:path.join(out,n+'.png')});
async function wait(fn,ms=16000){
  const end=Date.now()+ms;
  while(Date.now()<end){
    assert.deepEqual(errors,[]);const s=await read().catch(()=>null);
    if(s&&fn(s,boss(s)))return s;
    await page.waitForTimeout(20);
  }
  throw Error('Timed out: '+fn);
}
async function fresh(options={}){
  if(context)await context.close();
  context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,...options});page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
}
async function boot(extra=''){
  await page.goto(`${origin}/?autostart=1&level=4&capture=1&finishLevel=1${extra}`);
  const s=await wait((s,b)=>s.mode==='platforming'&&s.player?.grounded&&b&&s.bossArenaCamera.left>8000,60000);
  assert.equal(await page.title(),'The Unknown Universe');assert.equal(await page.locator('vite-error-overlay').count(),0);
  assert.deepEqual(s.failedAssets,[]);return s;
}
const moves=['frost_hex','ice_storm','witch_dash','witch_hex','rune_bloom','witch_step'];
try{
  await fresh();let s=await boot();assert.equal(boss(s).bossId,'kilina');assert.equal(boss(s).maxHp,72);
  for(const phase of [1,2])for(const move of moves){
    await boot();await fixture({state:'tell',stageMove:move,phase,hp:100});
    s=await wait((s,b)=>b.attackState==='tell'&&b.stateElapsedMs>80);
    const marked=[...boss(s).markedXs],target=boss(s).targetX,bodyWidth=boss(s).bodyWidth;
    await shot(`phase${phase}-${move}-warning`);
    // Evade to the opposite side; the already warned attack must not retarget.
    await place(boss(s).x+180,boss(s).floorY-210);
    s=await wait((s,b)=>b.attackState==='attack'&&b.stateElapsedMs>160);
    if(move==='witch_dash')await shot(`phase${phase}-witch_dash-travel`);
    assert.equal(boss(s).targetX,target);assert.deepEqual(boss(s).markedXs,marked);
    const patterns=new Set();let maxShots=0,travel=0,minY=boss(s).floorY,captured=false;
    const start=boss(s).startX;
    s=await wait((s,b)=>{
      maxShots=Math.max(maxShots,b.shotsInBurst||0);travel=Math.max(travel,Math.abs(b.x-start));minY=Math.min(minY,b.y);
      assert.equal(b.bodyWidth,bodyWidth);assert.equal(b.bodyBottom,b.y);
      s.projectiles.filter(p=>p.sourceBoss==='kilina').forEach(p=>patterns.add(p.pattern));
      return b.attackState==='recover'||(!captured&&b.stateElapsedMs>=320&&b.shotsInBurst>0);
    });
    if(boss(s).attackState==='attack'){await shot(`phase${phase}-${move}-attack`);captured=true;}
    s=await wait((s,b)=>{
      maxShots=Math.max(maxShots,b.shotsInBurst||0);travel=Math.max(travel,Math.abs(b.x-start));minY=Math.min(minY,b.y);
      s.projectiles.filter(p=>p.sourceBoss==='kilina').forEach(p=>patterns.add(p.pattern));
      return b.vulnerable&&b.visualFrame===10;
    });
    assert(boss(s).recoveryRemainingMs>1800);assert.equal(boss(s).y,boss(s).floorY);
    if(move==='frost_hex'){assert.equal(maxShots,phase===2?2:1);assert(patterns.has('frost_hex'));}
    if(move==='ice_storm'){assert.equal(maxShots,phase===2?2:1);assert(patterns.has('falling_ice'));assert(minY<boss(s).floorY-85);}
    if(move==='witch_dash'){assert(travel>150);assert.equal(maxShots,phase===2?2:1);assert(patterns.has('witch_crescent'));assert(Math.abs(boss(s).x-target)<5);}
    assert(!s.projectiles.some(p=>p.sourceBoss==='kilina'),'Every recovery clears this boss attacks');
    const hp=boss(s).hp;
    await place(boss(s).x+140,boss(s).floorY);await page.keyboard.press('ArrowLeft',{delay:20});await page.keyboard.down('Space');
    s=await wait((s,b)=>b.hp<hp);await page.keyboard.up('Space');assert(boss(s).openingHits>0);
    evidence.push({phase,move,patterns:[...patterns],maxShots,travel,realCounter:true});
  }

  await boot();await fixture({state:'tell',stageMove:'frost_hex'});
  s=await read();const guardedHp=boss(s).hp;
  await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('Space');
  s=await wait((s,b)=>b.guardedHits>0);await page.keyboard.up('Space');assert.equal(boss(s).hp,guardedHp);
  evidence.push({guardRespected:true});

  await boot();await fixture({state:'attack',stageMove:'frost_hex',phase:2,shot:'freeze'});
  s=await wait(s=>s.playerFreeze?.active);assert.equal(s.player.health,92);assert(s.playerFreeze.remainingMs<=900);
  const x=s.player.x,shots=s.weapon.shotsFired;
  await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await page.waitForTimeout(120);
  s=await read();assert(Math.abs(s.player.x-x)<5);assert.equal(s.weapon.shotsFired,shots,'Frozen fire does not shoot');
  await page.keyboard.up('ArrowRight');await page.keyboard.up('Space');await shot('frozen-hero');
  await page.keyboard.press('p');s=await wait(s=>s.mode==='paused');const frozen=s.playerFreeze.remainingMs;
  await page.waitForTimeout(500);assert.equal((await read()).playerFreeze.remainingMs,frozen);
  await page.keyboard.press('p');await wait(s=>s.mode==='platforming');
  s=await wait(s=>!s.playerFreeze.active);assert(s.playerFreeze.thawGraceMs>400);
  await page.waitForTimeout(450);s=await read();assert.equal(s.playerFreeze.hits,1);assert.equal(s.player.health,92,'Freeze and thaw grace prevent chained hits');
  evidence.push({freezeFromActualProjectile:true,damage:8,controlsLocked:true,pauseSafe:true,automaticThaw:true,noFreezeChain:true});

  await boot();await fixture({state:'attack',stageMove:'frost_hex',shot:'freeze'});
  await wait(s=>s.playerFreeze.active);await page.waitForTimeout(120);
  for(let i=0;i<3;i++){await page.keyboard.press('z',{delay:35});await page.waitForTimeout(90);}
  s=await read();assert(s.playerFreeze.escapeTaps>0);assert(s.playerFreeze.remainingMs<400);
  await wait(s=>!s.playerFreeze.active);await page.keyboard.down('ArrowRight');await page.waitForTimeout(120);await page.keyboard.up('ArrowRight');
  s=await read();assert(s.player.velocityX>0);evidence.push({escapeTapsShortenFreeze:true,controlsRestore:true});

  await boot();await fixture({state:'attack',stageMove:'frost_hex',shot:'freeze'});await wait(s=>s.playerFreeze.active);
  await page.evaluate(()=>window.__unknownPlatformerForceFall());s=await wait(s=>!s.playerFreeze.active&&s.player.grounded);
  evidence.push({respawnClearsFreeze:true});
  await boot();await fixture({state:'recover',stageMove:'frost_hex',shot:'freeze'});await page.waitForTimeout(150);
  s=await read();assert.equal(s.player.health,100);assert.equal(s.playerFreeze.active,false);evidence.push({safeRecovery:true});
  for(const extra of ['&shield=1&shieldReady=1','&character=zgod']){
    await boot(extra);await fixture({state:'attack',stageMove:'frost_hex',shot:'freeze'});await page.waitForTimeout(150);
    s=await read();assert.equal(s.player.health,100);assert.equal(s.playerFreeze.active,false);
    evidence.push({protection:extra,freezeBlocked:true});
  }

  // A visible blue lane is genuinely dangerous, but its committed gap stays safe.
  await boot();await fixture({state:'attack',stageMove:'ice_storm'});s=await read();
  const lane=boss(s).markedXs[1];await place(lane,boss(s).floorY);
  s=await wait(s=>s.player.health<100);assert.equal(s.player.health,87);assert.equal(s.playerFreeze.active,false);
  await shot('ice-storm-lane-hit');evidence.push({actualIceStormDamage:13,shardsDoNotFreeze:true});
  await boot();await fixture({state:'tell',stageMove:'frost_hex'});s=await read();
  await place(boss(s).x-290,boss(s).floorY);await page.keyboard.down('ArrowDown');
  await wait((s,b)=>b.vulnerable);s=await read();await page.keyboard.up('ArrowDown');
  assert.equal(s.player.health,100);assert.equal(s.playerFreeze.hits,0);evidence.push({realDuckDodgesFreeze:true});

  for(const viewport of [{width:844,height:390},{width:734,height:290}]){
    await fresh({...devices['iPhone 13'],viewport,deviceScaleFactor:1});await boot();
    await fixture({state:'attack',stageMove:'frost_hex',shot:'freeze'});await wait(s=>s.playerFreeze.active);
    await shot(`phone-${viewport.width}-frozen`);await page.waitForTimeout(110);
    await page.locator('[data-touch-control="jump"]').tap();await page.waitForTimeout(50);
    await page.locator('[data-touch-control="jump"]').tap();
    s=await read();assert(s.playerFreeze.escapeTaps>0);await wait(s=>!s.playerFreeze.active);
    await fixture({state:'attack',stageMove:'ice_storm'});await wait((s,b)=>b.shotsInBurst>0);await shot(`phone-${viewport.width}-ice-storm`);
    evidence.push({viewport,phoneFreezeVisible:true,touchEscape:true,stormVisible:true});
  }

  await fresh();await boot();await fixture({state:'recover',hp:1});s=await read();
  await place(boss(s).x-160,boss(s).floorY);await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('Space');
  s=await wait(s=>s.bossDeath?.visible);await page.keyboard.up('Space');assert.equal(s.bossDeath.bossId,'kilina');
  s=await wait(s=>s.bossDefeated);assert(!s.playerFreeze.active);assert(!s.projectiles.some(p=>p.enemyProjectile));
  await shot('kilina-defeated');await wait(s=>s.bossDeath.stage==='finished');await place(s.progress.levelEndX,520);
  await wait(s=>s.mode==='transition');await page.getByRole('button',{name:'Skip story',exact:true}).click();
  await wait(s=>s.engine==='flight'&&s.player,60000);evidence.push({realDefeat:true,clearsSpells:true,advancesToFlight:true});
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,out,evidence,errors}));
}catch(error){
  await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));
  await shot('failure').catch(()=>{});throw error;
}finally{await browser.close();}
