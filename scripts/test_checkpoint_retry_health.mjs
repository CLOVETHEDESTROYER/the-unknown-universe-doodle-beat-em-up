import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178';
const out='output/playwright/checkpoint-retry-health';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const test of [
  {name:'final-low-health-fall',level:6,hero:'xgod',health:40,fall:true,lost:0},
  {name:'final-fatal-fall',level:6,hero:'xgod',health:5,fall:true,lost:1},
  {name:'final-lethal-hit',level:6,hero:'xgod',health:40,fall:false,lost:1},
  {name:'barrett-low-health-fall',level:6,hero:'barrett',health:40,fall:true,lost:0},
  {name:'level-one-low-health-fall',level:1,hero:'xgod',health:40,fall:true,lost:0}
 ]){
  const page=await browser.newPage({viewport:{width:852,height:350}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  async function wait(fn){const end=Date.now()+60000;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
  try{
   await page.goto(`${origin}/?autostart=1&capture=1&quality=mobile&level=${test.level}&character=${test.hero}&health=${test.health}&lives=3`);
   await wait(s=>s.player?.grounded);let before=await read();assert.equal(before.player.health,test.health);
   if(test.fall)await page.evaluate(()=>window.__unknownPlatformerForceFall());
   else await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));
   await wait(s=>s.heroDeath?.respawning&&s.player.health===0);
   const after=await wait(s=>!s.heroDeath?.respawning&&s.player?.grounded&&s.player.health>0);
   assert.equal(after.player.health,100,'Every checkpoint retry restores full health');
   assert.equal(after.player.lives,3-test.lost,'Life-loss rules stay unchanged');
   assert(Math.abs(after.player.x-after.checkpoint.x)<10);
   await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(11));
   assert.equal((await read()).player.health,100,'Respawn invulnerability covers immediate hits');
   await page.waitForTimeout(900);await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(11));
   let hit=await read();assert.equal(hit.player.health,89,'A normal hit after grace is survivable, not instantly fatal');
   await page.waitForTimeout(150);assert.equal((await read()).player.health,89,'Ordinary damage is not auto-healed');
   if(test.name==='final-low-health-fall'){
    // Retry again, then re-enter the real Void Regent fight without using the
    // boss fixture (which itself sets health to 100 and would mask this bug).
    await page.waitForTimeout(750);await page.evaluate(()=>window.__unknownPlatformerForceFall());
    await wait(s=>s.heroDeath?.respawning);
    await wait(s=>!s.heroDeath?.respawning&&s.player?.grounded);
    hit=await read();assert.equal(hit.player.health,100);
    const boss=hit.enemies.find(e=>e.bossId==='void_regent');assert(boss);
    await page.evaluate(b=>window.__unknownPlatformerSetPlayerPosition(b.x-100,b.floorY),boss);
    hit=await wait(s=>s.player.health<100&&!s.heroDeath?.respawning);
    assert(hit.player.health>0,'The first real Void Regent hit is no longer fatal');
    assert.equal(hit.player.lives,3);
   }
   await page.screenshot({path:`${out}/${test.name}.png`});assert.deepEqual(hit.failedAssets,[]);
   results.push({...test,passed:true});console.log(test.name,'passed');
  }catch(e){await page.screenshot({path:`${out}/${test.name}-failure.png`}).catch(()=>{});throw e;}
  finally{await page.close();}
 }
 await fs.writeFile(`${out}/report.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
