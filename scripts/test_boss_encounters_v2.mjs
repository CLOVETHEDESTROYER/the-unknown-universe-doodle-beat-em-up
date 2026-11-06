import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Local Playwright drives localhost and positioning hooks; every damaging hit uses keyboard input.
const origin = process.env.GAME_TEST_URL || 'http://127.0.0.1:3000';
const selected = Number(process.argv[2] || 0);
const output = new URL(process.env.BOSS_TEST_OUTPUT || '../output/boss-encounters-v2/playtest/', import.meta.url);
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1280,height:800}});
const errors = [];
page.on('pageerror',e => errors.push(e.message));
page.on('console',m => {if(m.type()==='error') errors.push(m.text());});
const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const boss = s => s.enemies.find(e => e.kind==='boss');
const place = (x,y) => page.evaluate(({x,y}) => window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot = name => page.screenshot({path:fileURLToPath(new URL(`${name}.png`,output))});
async function wait(predicate, timeout=18000) {
  const deadline = Date.now()+timeout;
  while(Date.now()<deadline) {
    if(errors.length) throw new Error(errors.join('\n'));
    const s = await read();
    if(predicate(s,boss(s))) return s;
    await page.waitForTimeout(20);
  }
  throw new Error(`Timeout: ${predicate}`);
}
async function slash(b) {
  await place(b.x-b.facing*135,b.floorY);
  const key = b.facing>0 ? 'ArrowRight':'ArrowLeft';
  await page.keyboard.down(key);
  await page.waitForTimeout(30);
  await page.keyboard.up(key);
  await page.keyboard.down('Space');
  await wait(s=>s.attack.visualActive && s.attack.visualElapsed<160);
  await page.keyboard.up('Space');
  await wait(s=>s.attack.active && s.attack.visualElapsed>=210);
}
async function evade(b) {
  // Setup only: keep the player out of the committed landing and projectile lanes.
  const x = ['void_crash','witch_dash','cinder_bound','dragon_lunge','shadow_dash','witch_step'].includes(b.move)
    ? b.targetX < (b.left+b.right)/2 ? b.right+80 : b.left-80
    : b.x-b.facing*280;
  await place(Math.max(b.left-175,Math.min(b.right+175,x)),b.floorY-160);
}
async function counterUntil(done) {
  const deadline = Date.now()+110000;
  while(Date.now()<deadline) {
    const s = await read();
    const b = boss(s);
    if(done(s,b)) return s;
    if(errors.length) throw new Error(errors.join('\n'));
    if(b.vulnerable && b.recoveryRemainingMs>440) {
      await slash(b);
      const hit = await read();
      if(done(hit,boss(hit))) return hit;
      await wait(s=>s.attack.visualElapsed>=460);
    } else { await evade(b); await page.waitForTimeout(65); }
  }
  throw new Error('Counter-only clear timed out');
}
async function observeMove(level,phase) {
  const tell = await wait((s,b) => b?.attackState==='tell' && b.phase===phase && b.stateElapsedMs>=80);
  let b = boss(tell);
  assert(tell.bossCues.warningVisible,'The committed attack has a visible warning');
  assert(tell.bossCues.statusVisible,'The guarded status has a visible cue');
  const locked = {move:b.move,facing:b.facing,targetX:b.targetX,markedXs:b.markedXs};
  await shot(`level${level}-phase${phase}-${b.move}-warning`);
  await evade(b);
  const active = await wait((s,b) => b?.attackState==='attack');
  assert.equal(boss(active).facing,locked.facing);
  assert.equal(boss(active).targetX,locked.targetX);
  // Sample in-page while screenshots are captured, so short-lived waves and
  // leap peaks cannot disappear between host-side reads on a busy machine.
  await page.evaluate(()=>{
    window.__encounterSamples={patterns:[],positions:[]};
    window.__encounterSampler=setInterval(()=>{
      const s=JSON.parse(window.render_game_to_text()),b=s.enemies.find(e=>e.kind==='boss');
      if(!b||b.attackState!=='attack')return;
      window.__encounterSamples.positions.push([b.x,b.y]);
      for(const p of s.projectiles.filter(p=>p.enemyProjectile)){
        if(!window.__encounterSamples.patterns.includes(p.pattern))window.__encounterSamples.patterns.push(p.pattern);
      }
    },16);
  });
  const positions = [];
  const patterns = new Set();
  let maxShots = 0;
  let captured = false;
  const deadline = Date.now()+9000;
  while(Date.now()<deadline) {
    const s = await read(); b = boss(s);
    assert.equal(b.bodyBottom,b.y,'The collider follows the animated root immediately');
    assert(b.x>=b.left && b.x<=b.right,'Boss stays on the arena floor bounds');
    assert.equal(b.bodyWidth,boss(active).bodyWidth,'Pose deformation never changes the collider');
    positions.push([b.x,b.y]);
    for(const p of s.projectiles.filter(p=>p.enemyProjectile)) patterns.add(p.pattern);
    maxShots = Math.max(maxShots,b.shotsInBurst || 0);
    if(!captured && (b.y<b.floorY-(b.move==='cinder_bound'?145:b.move==='witch_step'?115:78) || b.teleported || maxShots>0 || b.move==='shadow_dash' && Math.abs(b.x-boss(active).x)>80)) {
      await shot(`level${level}-phase${phase}-${b.move}-attack`); captured = true;
    }
    if(b.vulnerable) {
      assert.equal(b.recoveryDurationMs,3000,'The entire counter window is granted');
      assert(b.recoveryRemainingMs>0 && b.recoveryRemainingMs<=b.recoveryDurationMs);
      assert.equal(b.y,b.floorY);
      assert(s.bossCues.statusVisible,'The counter window has a visible cue');
      break;
    }
    await evade(b);
    await page.waitForTimeout(25);
  }
  const samples=await page.evaluate(()=>{clearInterval(window.__encounterSampler);return window.__encounterSamples;});
  samples.patterns.forEach(p=>patterns.add(p));positions.push(...samples.positions);
  assert(b.vulnerable,`${locked.move} must finish and expose a recovery window`);
  const moved = Math.max(...positions.map(p=>p[0]))-Math.min(...positions.map(p=>p[0]));
  const raised = Math.min(...positions.map(p=>p[1]));
  if(['void_crash','witch_dash','dragon_lunge','cinder_bound','shadow_dash','blink_burst','witch_step'].includes(b.move)) {
    // A player near the boss can commit a short destination. Verify that
    // destination, rather than requiring an unrelated minimum travel distance.
    const destination=b.move==='blink_burst'&&phase===2?b.returnX:locked.targetX;
    assert(Math.abs(b.x-destination)<10,'Movement attack reaches its committed destination');
  }
  if(b.move==='cinder_bound') assert(raised<b.floorY-140);
  if(b.move==='dragon_lunge') assert(raised<b.floorY-70);
  if(b.move==='fire_volley' || b.move==='low_breath') assert.equal(maxShots,phase===2?4:3);
  if(b.move==='furnace_quake') { assert.equal(maxShots,phase===2?2:1); assert(patterns.has('quake')); }
  if(b.move==='ember_rain') {assert.equal(maxShots,phase===2?5:3);assert(patterns.has('falling_ember'));assert.deepEqual(b.markedXs,locked.markedXs);}
  if(b.move==='star_fan')assert.equal(maxShots,phase+1);
  if(b.move==='blink_burst')assert.equal(maxShots,phase);
  if(b.move==='shadow_dash' && phase>=2) assert(patterns.has('shadow_wave'));
  if(b.move==='crown_nova'){assert.equal(maxShots,phase+1);assert(patterns.has('regent_nova'));}
  if(b.move==='void_crash'){assert.equal(maxShots,phase);assert(raised<b.floorY-130);assert(patterns.has('regent_crash_wave'));}
  if(b.move==='witch_hex') { assert.equal(maxShots,phase===2?5:3); assert(patterns.has('curved_hex')); }
  if(b.move==='rune_bloom') { assert.equal(maxShots,phase===2?2:1); assert(patterns.has('rune_pillar')); assert.deepEqual(b.markedXs,locked.markedXs); }
  if(b.move==='witch_step') { assert(raised<b.floorY-110); assert(patterns.has('witch_wisp')); }
  if(b.move==='frost_hex'){assert.equal(maxShots,phase===2?2:1);assert(patterns.has('frost_hex'));}
  if(b.move==='ice_storm'){assert.equal(maxShots,phase===2?2:1);assert(patterns.has('falling_ice'));assert(raised<b.floorY-85);}
  if(b.move==='witch_dash'){assert.equal(maxShots,phase===2?2:1);assert(patterns.has('witch_crescent'));}
  const hp = b.hp;
  // Keep the boss alive through the full rotation before delivering finishing counters.
  if(phase===3||level===1&&phase===2)return {move:locked.move,locked,maxShots,patterns:[...patterns],moved,raised,counterDeferred:true};
  await slash(b);
  const counter = boss(await read());
  assert(counter.hp<hp,'An actual sword counter damages the exposed boss');
  await shot(`level${level}-phase${phase}-${b.move}-open`);
  return {move:locked.move,locked,maxShots,patterns:[...patterns],moved,raised,counterDamage:hp-counter.hp};
}
const evidence = {};
try {
  for(const level of [1,3,4,6].filter(l=>!selected || l===selected)) {
    await page.goto(`${origin}/?autostart=1&level=${level}&capture=1&sword=1&swordUnlocked=1`);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
    let s = await read(); let b = boss(s);
    assert.deepEqual(s.failedAssets,[]);
    assert.equal(b.bodyBottom,b.floorY);
    await place(b.x-b.left<300 ? b.x+420 : b.x-420,b.floorY);
    await page.waitForTimeout(160);
    assert(Math.abs(boss(await read()).velocityX)>40,'Boss approaches using its own movement');
    s = await wait((s,b)=>b.attackState==='tell'); b=boss(s);
    const hp = b.hp;
    await slash(b);
    const guarded = boss(await read());
    assert.equal(guarded.hp,hp,'Rear sword hits cannot bypass the guard');
    assert(guarded.guardedHits>0);
    assert.notEqual(guarded.attackState,'patrol','Guarded hits do not cancel an attack');
    if(level===3||level===4){
      // These bosses now have less campaign health than the original test.
      // Give the phase-one observation sequence enough HP for three real counters.
      await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:100}));
      await page.evaluate(()=>window.__unknownPlatformerCollectPickup('sword'));
      await wait(s=>s.equipment.active==='sword');
      b=boss(await read());
    }
    // Verify the arena stays active at the entrance before observing the rotation.
    await place(b.left-400,b.floorY);
    await page.waitForTimeout(80);
    s=await read();assert(s.bossArenaCamera.locked&&s.player.x>=s.bossArenaCamera.minX);
    await place(Math.max(b.left-150,b.x-350),b.floorY);
    const phaseOne = [];
    const moveCount=level===4||level===6?6:3;
    for(let i=0;i<moveCount;i++) phaseOne.push(await observeMove(level,1));
    assert.equal(new Set(phaseOne.map(m=>m.move)).size,moveCount);
    s=await counterUntil((s,b)=>b.hp<=b.maxHp*(level===6?2/3:1/2));
    assert(boss(s).vulnerable,'Health threshold crossing preserves the current opening');
    assert.equal(boss(s).phase,1);
    s=await wait((s,b)=>b.phase===2 && b.attackState==='phase'); b=boss(s);
    const phaseHp=b.hp;
    await slash(b);
    assert.equal(boss(await read()).hp,phaseHp,'The second-wind transition is protected');
    const phaseTwo=[];
    for(let i=0;i<(level===1?4:moveCount);i++) phaseTwo.push(await observeMove(level,2));
    assert.equal(new Set(phaseTwo.map(m=>m.move)).size,moveCount);
    if(level===1)assert.equal(phaseTwo.filter(m=>m.move==='dragon_lunge').length,2);
    const phaseThree=[];
    if(level===6){
      s=await counterUntil((s,b)=>b.hp<=b.maxHp/3);assert(boss(s).vulnerable);assert.equal(boss(s).phase,2);
      s=await wait((s,b)=>b.phase===3&&b.attackState==='phase');const hp=boss(s).hp;
      await slash(boss(s));assert.equal(boss(await read()).hp,hp,'Final ascension remains guarded');
      for(let i=0;i<moveCount;i++)phaseThree.push(await observeMove(level,3));
      assert.equal(new Set(phaseThree.map(m=>m.move)).size,moveCount);
    }
    await page.setViewportSize({width:844,height:390});
    await page.waitForTimeout(1000);
    await shot(`level${level}-phone-opening`);
    await page.setViewportSize({width:1280,height:800});
    await counterUntil((s,b)=>!b);
    const defeated=await read();
    assert.equal(defeated.bossAttackVisualVisible,false);
    assert.equal(defeated.bossArenaCamera.locked,true,'Keep the defeat sequence in the arena view');
    assert.equal(defeated.projectiles.some(p=>p.enemyProjectile),false);
    if(level===1) {
      s=await wait(s=>s.bossDeath.stage==='fallen');
      assert.equal(s.bossDeath.texture,'boss_death_dark_dragon');
      assert.equal(s.bossDefeated,false,'The complete death sequence precedes gate/reward release');
      await shot('level1-dragon-fallen');
    }
    s=await wait(s=>s.bossDefeated);
    assert.equal(s.bossArenaCamera.locked,false);
    if(level===1) assert(s.pickups.some(p=>p.kind==='power'));
    await shot(`level${level}-victory`);
    await wait(s=>s.bossDeath.stage==='finished');
    await place(s.progress.levelEndX,level===1?480:520);
    await wait(s=>s.mode==='transition');
    if(level===4) {
      await page.getByRole('button',{name:'Skip story',exact:true}).click();
      await wait(s=>s.level===5 && s.engine==='flight' && s.player);
      assert.equal(await page.getByRole('heading',{name:'Universe Saved',exact:true}).count(),0,'Kilina is not the campaign finale');
    }
    if(level===6) {
      await page.getByRole('button',{name:'Skip story',exact:true}).click();
      await page.getByRole('heading',{name:'Universe Saved',exact:true}).waitFor({state:'visible'});
    }
    evidence[level]={guarded,phaseOne,phaseTwo,phaseThree,defeat:true,exit:true};
    await fs.writeFile(new URL(`level${level}-results.json`,output),JSON.stringify({evidence:evidence[level],errors},null,2));
    console.log(JSON.stringify({level,passed:true,checks:['guard','movement',level===4||level===6?'sixMoves':'threeMoves','phaseOneCounters','phaseTransition','phaseTwoPatterns',...(level===6?['phaseThree']:[]),'phone','defeat','exit']}));
  }
  assert.deepEqual(errors,[]);
} catch(e) {
  await fs.writeFile(new URL(`failure-${selected}.json`,output),JSON.stringify({error:String(e),state:await read(),evidence,errors},null,2));
  await shot(`failure-${selected}`);
  throw e;
} finally {await browser.close();}
