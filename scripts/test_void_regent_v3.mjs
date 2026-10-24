import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// The Browser plugin skill is unavailable; use the repository's Playwright.
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1});
const out=new URL(`../output/void-regent-v3/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text())),boss=s=>s.enemies.find(e=>e.kind==='boss');
async function wait(fn,ms=14000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s,boss(s)))return s;await page.waitForTimeout(12);}throw Error('Timeout '+fn);}
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerBossRulesTest(o),o);
const snap=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
async function boot(hero='xgod',extra=''){
  await page.goto(`${origin}/?autostart=1&capture=1&level=6&finishLevel=1&character=${hero}${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});
  assert.deepEqual((await read()).failedAssets,[]);
}
try{
  await boot('zgod');let s=await read(),b=boss(s);assert.equal(b.maxHp,84);assert.equal(b.right-b.left,880);
  const moves=[];let previous=-1;
  while(moves.length<4){
    s=await wait((s,b)=>b.attackState==='tell'&&b.attacksCompleted>previous,40000);b=boss(s);previous=b.attacksCompleted;moves.push(b.move);
    await wait((s,b)=>b.vulnerable,12000);
  }
  assert.deepEqual(moves,['star_fan','blink_burst','shadow_dash','void_rain']);evidence.push({naturalRotation:moves,hp:84});
  for(const phase of [1,2]){
    await boot();await fixture({state:'tell',regentMove:'blink_burst',phase});s=await wait((s,b)=>b.attackState==='tell'&&b.stateElapsedMs>=50&&s.bossCues.warningVisible);b=boss(s);
    const from=b.x,to=b.targetX,center=(b.left+b.right)/2;
    assert((from<center)!==(to<center));assert(Math.abs(to-from)>400);assert(s.bossCues.warningVisible);
    await snap('phase-'+phase+'-portals');
    await place(to,b.floorY);await wait((s,b)=>b.attackState==='attack'&&b.stateElapsedMs>=50);
    assert.equal(boss(await read()).canDamage,false,'No invisible contact damage during departure');
    await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');const paused=boss(await read());await page.waitForTimeout(200);assert.deepEqual(boss(await read()),paused);await page.keyboard.press('KeyP');
    s=await wait((s,b)=>b.teleportsThisMove===1);b=boss(s);assert.equal(b.x,to);assert(b.lastTeleportElapsed<300);assert.equal(b.canDamage,false);assert.equal(s.player.health,100,'No teleport-arrival contact damage');assert.equal(b.bodyBottom,b.floorY);await snap('phase-'+phase+'-arrival');
    // Escape after checking the safe arrival, before the visible boss becomes solid.
    await place(center,b.floorY);
    if(phase===2){s=await wait((s,b)=>b.teleportsThisMove===2);b=boss(s);assert.equal(b.x,b.returnX);assert(Math.abs(b.x-to)>650);assert.equal(b.canDamage,false);await snap('phase-2-return');}
    s=await wait((s,b)=>b.vulnerable&&s.bossCues.vulnerability.attackPromptVisible);b=boss(s);assert.equal(b.shotsInBurst,phase===1?1:2);assert.equal(b.recoveryDurationMs,phase===1?3000:2600);
    assert(!s.projectiles.some(p=>p.sourceBoss==='void_regent'));assert(s.bossCues.vulnerability.attackPromptVisible);assert.equal(b.canDamage,false);
    const hp=b.hp;await place(b.x-110,b.floorY);await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('Space');await wait((s,b)=>b.hp<hp);await page.keyboard.up('Space');await snap('phase-'+phase+'-counter');
    evidence.push({phase,quickOppositeTeleport:true,doubleBlink:phase===2,safeArrival:true,pause:true,fullCounter:true});
  }
  for(const phase of [1,2])for(const move of ['star_fan','void_rain','shadow_dash']){
    await boot('zgod');await fixture({state:'tell',regentMove:move,phase});const seen=new Set();let maxBursts=0;
    const locked=boss(await read()).markedXs;
    await wait((s,b)=>b.attackState==='attack');
    const end=Date.now()+9000;
    while(Date.now()<end){
      s=await read();b=boss(s);assert.equal(b.bodyBottom,b.y);assert(b.x>=b.left&&b.x<=b.right);maxBursts=Math.max(maxBursts,b.shotsInBurst);
      s.projectiles.filter(p=>p.enemyProjectile).forEach(p=>seen.add(p.pattern));if(b.vulnerable)break;
      await page.waitForTimeout(15);
    }
    assert(b.vulnerable);assert.deepEqual(b.markedXs,locked);
    if(move==='star_fan')assert.equal(maxBursts,phase===1?2:3);
    if(move==='void_rain'){assert.equal(maxBursts,phase===1?3:5);assert(seen.has('falling_void'));}
    if(move==='shadow_dash'&&phase===2)assert(seen.has('shadow_wave'));
    await snap('phase-'+phase+'-'+move);evidence.push({phase,move,maxBursts,patterns:[...seen],counter:true});
  }
  // Teleport retreat clears portals and restores a fully opaque, ordinary pose.
  await boot();await fixture({state:'tell',regentMove:'blink_burst',phase:2});await wait((s,b)=>b.teleportsThisMove===1);
  b=boss(await read());await place(b.left-400,b.floorY);await wait((s,b)=>!b.engaged&&!s.bossArenaCamera.locked);assert.equal((await read()).regentRiftEffects,0);evidence.push({retreatCleanup:true});
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(e){await snap('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
