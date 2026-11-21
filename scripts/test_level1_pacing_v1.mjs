import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='output/level1-pacing-v1';await fs.mkdir(out,{recursive:true});
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const beat=(s,id)=>s.routeEncounters.find(e=>e.id===id);
async function wait(fn){const end=Date.now()+30000;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(30);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
const warp=(x,y=480)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function clearWave(id){
  for(let i=0;i<50;i++){
    const s=await read(),enemy=s.enemies.find(e=>e.routeEncounter===id&&e.hp>0);
    if(!enemy)return;
    await warp(enemy.x-55,enemy.y);
    await page.keyboard.press('ArrowRight',{delay:15});
    await page.keyboard.press('Space',{delay:100});
    await page.waitForTimeout(250);
  }
  throw Error('Enemies not defeated by actual attacks');
}
const results={};
try{
  await page.goto(origin+'/?autostart=1&capture=1&level=1&character=zgod&unlockRoster=1');
  let s=await wait(s=>s.mode==='platforming'&&s.player?.grounded);
  assert.equal(s.routeEncounters.filter(e=>e.kind==='combat').length,3);
  assert.equal(s.gunUpgradeStations.find(e=>e.mode==='rapid').x,880);
  await warp(1120);await wait(s=>beat(s,'rapid_demo').stage==='active');
  s=await read();assert(!beat(s,'rapid_demo').locked);
  assert(s.enemies.filter(e=>e.routeEncounter==='rapid_demo').every(e=>Math.abs(e.y-480)<5));
  await clearWave('rapid_demo');await wait(s=>beat(s,'rapid_demo').stage==='complete');results.advancingDemo=true;
  await warp(1800);await wait(s=>beat(s,'rooftop_crossfire').stage==='active');
  await page.screenshot({path:out+'/desktop-hold.png'});
  await warp(2400);await page.waitForTimeout(100);s=await read();assert(s.player.x<2320);assert(beat(s,'rooftop_crossfire').locked);
  await clearWave('rooftop_crossfire');await wait(s=>beat(s,'rooftop_crossfire').stage==='between_waves');
  await wait(s=>beat(s,'rooftop_crossfire').wave===2);await clearWave('rooftop_crossfire');
  s=await wait(s=>beat(s,'rooftop_crossfire').stage==='complete');assert(!beat(s,'rooftop_crossfire').locked);
  const score=s.progress.score;await warp(2400);await page.waitForTimeout(100);assert((await read()).player.x>2320);
  await warp(1800);await page.waitForTimeout(100);assert.equal((await read()).progress.score,score);results.twoWavesReleaseAndRewardOnce=true;
  s=await read();const approach=beat(s,'dragon_approach');
  await warp(approach.entry+30);await wait(s=>beat(s,'dragon_approach').stage==='active');
  assert.equal((await read()).bossArenaCamera.locked,false);
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:out+'/phone-approach.png'});
  await page.evaluate(()=>window.__unknownPlatformerForceFall());
  s=await wait(s=>beat(s,'dragon_approach').stage==='waiting');assert(!beat(s,'dragon_approach').locked);
  await warp(approach.entry+30);await wait(s=>beat(s,'dragon_approach').stage==='active');await clearWave('dragon_approach');
  s=await wait(s=>beat(s,'dragon_approach').stage==='complete');assert(!beat(s,'dragon_approach').locked);
  results.approachRetryAndRelease=true;
  await warp(s.progress.levelEndX-800);
  await wait(s=>s.bossArenaCamera.locked);
  results.cleanBossEntry=true;
  assert.deepEqual(s.failedAssets,[]);assert.deepEqual(errors,[]);
  await fs.writeFile(out+'/report.json',JSON.stringify({results,errors},null,2));console.log(results);
}catch(e){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),state:await read()},null,2));throw e;}
finally{await browser.close();}
