import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Browser plugin skill unavailable; use local Playwright. Only the fixture HP
// changes: attacks, deaths, pickups, gate collisions and story handoffs are real.
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4380';
const out=new URL(`../output/hero-celebrations-v1/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const errors=[],evidence=[];let page;
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
async function wait(fn,timeout=30000){
  const end=Date.now()+timeout;
  while(Date.now()<end){const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(12);}
  throw Error('State timeout '+fn+'; actual '+JSON.stringify(await read()));
}
async function fresh(hero,extra='',device='Desktop Chrome'){
  const context=await browser.newContext({...devices[device],deviceScaleFactor:1});page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&character=${hero}${extra}`);
  if(!extra.includes('level=5'))await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);
  else await wait(s=>s.engine==='flight'&&s.player,60000);
  assert.deepEqual((await read()).failedAssets,[]);
  const otherHero=requests.filter(url=>/celebrations-v1\/.*\.webp/.test(url)&&!url.endsWith(`/${hero}.webp`)&&!(hero==='xgod'&&url.endsWith('/xgod-sword.webp')));
  assert.deepEqual(otherHero,[],'Only selected hero presentation sheets load');
  return context;
}
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function defeat(){
  await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:1}));
  const b=(await read()).enemies.find(e=>e.kind==='boss');await place(b.x-95,b.floorY);
  await page.keyboard.down('Space');await page.waitForTimeout(300);await page.keyboard.up('Space');
  await wait(s=>s.bossDefeated&&s.bossDeath.stage==='finished'&&s.celebration?.active);
}
async function watch(kind,label,pause=false){
  let s=await wait(s=>s.celebration?.active&&s.celebration.kind===kind);
  const frames=new Set(),saved={score:s.progress.score,health:s.player.health,equipment:structuredClone(s.equipment),x:s.player.x};
  let paused=false,peak=false,guard=false;
  while(s.celebration.active){
    const c=s.celebration;frames.add(c.frame);
    assert.equal(s.player.visible,false,'Hide base sprite while authored pose renders');assert(c.visible&&c.inputLocked);
    assert.equal(s.player.health,saved.health);assert.equal(s.equipment.hits,saved.equipment.hits);
    assert.equal(s.progress.score,saved.score,'Cosmetic animation adds no score');
    assert(Math.abs(c.feet-s.player.bodyBottom)<=1,'Pose follows the physics foot anchor');
    if(!guard){
      guard=true;await page.evaluate(()=>{window.__unknownPlatformerDamagePlayer(25);window.dispatchEvent(new Event('unknown-universe:jump'));window.dispatchEvent(new Event('unknown-universe:special'));});
      await page.keyboard.down('ArrowRight');await page.waitForTimeout(45);await page.keyboard.up('ArrowRight');
      assert(Math.abs((await read()).player.x-saved.x)<2,'Movement is held during presentation');
    }
    if(c.frame===(kind==='sword'?3:2)&&!peak){peak=true;await shot(label+'-peak');}
    if(pause&&c.frame===2&&!paused){
      paused=true;await page.keyboard.press('p');const before=await read();assert.equal(before.mode,'paused');
      await page.waitForTimeout(350);assert.equal((await read()).celebration.elapsedMs,before.celebration.elapsedMs,'Pause freezes animation time');
      await page.keyboard.press('p');
    }
    await page.waitForTimeout(12);s=await read();
  }
  assert.deepEqual([...frames].sort(),kind==='sword'?[0,1,2,3,4,5]:[0,1,2,3]);
  assert.equal(s.celebration.completed[kind],1);assert.equal(s.player.visible,true);
  assert.equal(s.celebration.inputLocked,false);assert.equal(s.special.uses,0,'Inputs during the pose do not trigger a special');
  await shot(label+'-finished');return s;
}
try{
  const heroes=['xgod','barrett','nico','ezra','teleportation_c','zgod','killer_kai'];
  for(const hero of process.env.HERO_TEST_ONLY?[process.env.HERO_TEST_ONLY]:heroes){
    const context=await fresh(hero);await defeat();let s=await watch('victory',hero+'-victory',hero==='nico');
    const x=s.player.x;await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);await page.keyboard.up('ArrowRight');
    assert((await read()).player.x>x+3,'Movement resumes after celebration');
    if(hero==='barrett'){
      await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(25));assert.equal((await read()).player.health,75,'Normal vulnerability returns after victory');
    }
    if(hero==='xgod'){
      await page.evaluate(()=>window.__unknownPlatformerCollectPickup('power'));
      s=await watch('sword','xgod-sword');assert.equal(s.equipment.active,'sword');assert.equal(s.equipment.hits,3);
      assert(s.powerups.swordUnlocked&&s.powerups.hasFlameSword);
      await page.evaluate(()=>window.__unknownPlatformerCollectPickup('power'));
      assert.equal((await read()).celebration.played.sword,1,'Claiming the same reward does not repeat the movie');
    }
    evidence.push({hero,fourVictoryFrames:true,anchored:true,inputLockAndRecovery:true,protected:true,...hero==='xgod'?{sixSwordFrames:true,oneClaim:true}:{},...hero==='nico'?{pause:true}:{}});
    await context.close();
  }
  if(!process.env.HERO_TEST_ONLY){
    // Reach the exit without picking up the post-boss sword: the fallback must
    // show the reward movie before awarding clear points and opening story.
    let context=await fresh('xgod','','iPhone 15 landscape');await defeat();
    await wait(s=>s.celebration.completed.victory===1);let s=await read();const score=s.progress.score;
    await place(s.progress.levelEndX,480);
    s=await wait(s=>s.celebration?.kind==='sword'&&s.celebration.active);
    assert.equal(s.mode,'platforming');assert.equal(s.progress.score,score,'No early or duplicate clear bonus');
    await watch('sword','phone-gate-sword');
    s=await wait(s=>s.mode==='campaign-story');assert.equal(s.chapter,'level1');
    assert.equal(s.resume.score,score+900);assert.equal(s.resume.equipment.active,'sword');assert.equal(s.resume.equipment.hits,3);
    await page.getByRole('button',{name:'Skip story',exact:true}).click();
    s=await wait(s=>s.mode==='platforming'&&s.level===2&&s.player?.grounded);assert(s.powerups.swordUnlocked&&s.powerups.hasFlameSword);
    assert.equal(s.celebration.played.sword,0,'Already-owned sword does not replay on level mount');
    await page.evaluate(()=>window.__unknownPlatformerCollectPickup('power'));await page.waitForTimeout(80);
    assert.equal((await read()).celebration.played.sword,0,'Later refill does not replay the first-claim sequence');
    await context.close();evidence.push({phoneLandscapeSword:true,gateFallback:true,oneClearBonus:true,storyAndNextLevel:true,refillNoReplay:true});

    // Real flight boss, wreck and landing; celebrate on solid ground during the
    // existing disembark window, preserving the original 2100 ms phase duration.
    context=await fresh('zgod','&level=5&flightFinale=1','iPhone 15 landscape');
    const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
    await advance(0);let boss;
    for(let t=0;t<9000;t+=80){s=await read();boss=s.enemies.find(e=>e.kind==='pursuer');if(boss)break;await advance(80);}assert(boss);
    await page.evaluate(({x,y})=>window.__unknownFlightSetShipPosition(x,y),{x:650,y:boss.y-20});
    await page.keyboard.down('Space');
    for(let t=0;t<6000;t+=80){s=await read();if(s.enemies.some(e=>e.kind==='pursuer'&&e.phase==='dying'))break;await advance(80);}
    await page.keyboard.up('Space');assert(s.enemies.some(e=>e.kind==='pursuer'&&e.phase==='dying'));
    const seen=new Set();let captured=false;
    for(let t=0;t<18000;t+=40){
      s=await read();if(s.mode==='campaign-story')break;
      if(s.celebration?.active){assert.equal(s.flight.phase,'disembark');assert(s.flight.finaleDefeated);seen.add(s.celebration.frame);
        if(s.celebration.frame===2&&!captured){captured=true;await shot('flight-zgod-victory');}}
      await advance(40);
    }
    assert.deepEqual([...seen].sort(),[0,1,2,3]);assert.equal((await read()).chapter,'level5');
    await context.close();evidence.push({realFlightDefeat:true,groundedDisembarkVictory:true,flightFourFrames:true,flightStory:true});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(error){await shot('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));throw error;}
finally{await browser.close();}
