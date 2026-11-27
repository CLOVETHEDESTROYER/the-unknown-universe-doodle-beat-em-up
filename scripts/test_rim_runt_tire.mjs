import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:4191';
const out='output/rim-runt-tire';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(20)}throw Error('Timed out '+fn)}
try{
 for(const [level,x] of [[1,5410],[2,5590],[4,5400]]){
  await page.goto(`${base}/?autostart=1&capture=1&level=${level}&character=xgod`);
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player.grounded}catch{return false}},{},{timeout:60000});
  await page.evaluate(({x,level})=>window.__unknownPlatformerSetPlayerPosition(x-180,level<=2?480:520),{x,level});
  const s=await wait(s=>s.enemies.some(e=>e.kind==='bumper'&&Math.abs(e.x-x)<150));
  assert.deepEqual(s.failedAssets,[]);console.log(`PASS level ${level} Rim Runt at ${x}`);
 }
 await page.goto(`${base}/?autostart=1&capture=1&level=1&character=xgod`);
 await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player.grounded}catch{return false}},{},{timeout:60000});
 await page.evaluate(()=>{window.__unknownPlatformerSetPlayerPosition(80,480);window.__unknownPlatformerEnemyTest('bumper',12)});
 let s=await wait(s=>s.projectiles.some(p=>p.pattern==='rebound_wheel'));
 const wheel=s.projectiles.find(p=>p.pattern==='rebound_wheel');
 assert.equal(wheel.texture,'offroad_tire_v1');assert.equal(wheel.width,72);assert.equal(wheel.damage,10);
 const png=await page.evaluate(()=>document.querySelector('canvas').toDataURL());
 await fs.writeFile(`${out}/wheel.png`,Buffer.from(png.split(',')[1],'base64'));
 s=await wait(s=>s.player.health<100);assert.equal(s.player.health,90);
 assert.deepEqual(errors,[]);console.log('PASS visible tire travels and damages the player');
}finally{await browser.close()}
