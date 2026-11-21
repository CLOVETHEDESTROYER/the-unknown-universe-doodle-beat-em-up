import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='output/playwright/campaign-supply-crates-v1';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178';
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn){const end=Date.now()+45000;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(40);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
try{
 for(const level of [1,2,3,4,6]){
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=zgod&unlockRoster=1`);
  let s=await wait(s=>s.mode==='platforming'&&s.player?.grounded);assert.equal(s.supplyCrates.length,3,`level ${level} needs three crates`);
  for(const crate of s.supplyCrates){assert(s.terrain.platforms.some(p=>crate.x-48>=p.x&&crate.x+48<=p.x+p.w&&Math.abs(crate.floor-p.y)<1));}
  const c=s.supplyCrates[0];await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));
  await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',1000));
  await page.evaluate(c=>window.__unknownPlatformerSetPlayerPosition(c.x+65,c.floor),c);
  await page.keyboard.press('ArrowLeft',{delay:15});
  await wait(s=>s.supplyCrates[0].delivery==='landed');
  await page.keyboard.down('Space');await wait(s=>s.supplyCrates[0].broken);await page.keyboard.up('Space');
  await page.evaluate(c=>window.__unknownPlatformerSetPlayerPosition(c.x,c.floor),c);
  s=await wait(s=>s.supplyCrates[0].collected);assert.equal(s.equipment.gunUpgrade,'rapid');assert.deepEqual(s.failedAssets,[]);
  await page.screenshot({path:`${out}/level-${level}.png`});results.push({level,threeSafeCrates:true,deliveryAndGunReward:true});
 }
 await page.goto(`${origin}/?autostart=1&capture=1&level=5&character=zgod&unlockRoster=1&flightSeed=42`);
 await wait(s=>s.engine==='flight'&&s.player);assert.equal((await read()).supplyCrates.length,3);
 const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
 await advance(0);await page.keyboard.down('Space');
 let opened;
 for(let i=0;i<160;i++){await advance(100);const s=await read();if(s.supplyCrates[0].delivery==='broken'){opened=s.supplyCrates[0];break;}}
 await page.keyboard.up('Space');assert(opened,'Ship fire should open the first flight crate');
 await page.evaluate(c=>window.__unknownFlightSetShipPosition(c.x,c.y),opened);await advance(16);
 const flight=await read();assert(flight.supplyCrates[0].collected);assert.equal(flight.weapon.id,'spread');assert.deepEqual(flight.failedAssets,[]);
 await page.screenshot({path:out+'/level-5.png'});results.push({level:5,shipFireAndWeaponReward:true});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({results,errors},null,2));console.log(results);
}catch(e){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),state:await read()},null,2));throw e;}
finally{await browser.close();}
