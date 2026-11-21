import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178';
const out='output/playwright/supply-crate-slams';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const hero of ['xgod','barrett','zgod']){
  const page=await browser.newPage({viewport:{width:852,height:350}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const box=s=>s.supplyCrates.find(c=>c.id==='l2-health');
  const move=s=>s.movement.heroMobility;
  async function wait(fn){const end=Date.now()+30000;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
  const warp=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
  try{
   await page.goto(`${origin}/?autostart=1&capture=1&quality=mobile&level=2&character=${hero}&unlockRoster=1`);
   await wait(s=>s.player?.grounded&&s.movement?.heroMobility);
   await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));
   let s=await read();const target=box(s);
   await warp(target.x,target.floor-210);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown');
   await wait(s=>move(s).impacts===1);s=await read();
   assert.equal(box(s).hp,3,'Air-delivered crates cannot break before landing');
   assert(!box(s).broken);await wait(s=>box(s).delivery==='landed'&&move(s).bombPhase==='ready');
   await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));
   await warp(target.x,target.floor);await wait(s=>s.player.grounded);
   await page.keyboard.press('z',{delay:60});await wait(s=>!s.player.grounded);
   await wait(s=>s.player.grounded);assert.equal(box(await read()).hp,3,'An ordinary jump does not break crates');
   // The impact is local: just outside the crate + hero wave's combined reach.
   await warp(target.x-340,target.floor-180);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown');
   await wait(s=>move(s).impacts===2);assert.equal(box(await read()).hp,3,'Distant slams leave crates alone');
   await wait(s=>move(s).bombPhase==='ready');
   await warp(target.x+65,target.floor-190);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown');
   await wait(s=>move(s).bombPhase==='windup');assert.equal(box(await read()).hp,3,'No damage during windup');
   s=await wait(s=>box(s).broken);assert.equal(move(s).impacts,3);assert.equal(box(s).hp,0);
   await wait(s=>move(s).bombPhase==='ready');
   await warp(target.x,target.floor);await wait(s=>box(s).collected);
   const health=(await read()).player.health;
   await warp(target.x+65,target.floor-190);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown');await wait(s=>move(s).impacts===4);
   s=await read();assert(box(s).collected&&!box(s).dropVisible);assert.equal(s.player.health,health,'Repeated slams never duplicate rewards');
   assert.deepEqual(s.failedAssets,[]);assert.deepEqual(errors,[]);
   await page.screenshot({path:`${out}/${hero}.png`});results.push({hero,passed:true});console.log(hero,'crate slams passed');
  }catch(e){await page.screenshot({path:`${out}/${hero}-failure.png`}).catch(()=>{});throw e;}
  finally{await page.close();}
 }
 await fs.writeFile(`${out}/report.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
