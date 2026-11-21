import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='output/playwright/supply-crates-v1';await fs.mkdir(out,{recursive:true});
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const crate=(s,id)=>s.supplyCrates?.find(c=>c.id===id);
async function wait(fn){const end=Date.now()+30000;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(40);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
const warp=(x,y=480)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const results={};
async function saveQuit(){await page.keyboard.press('p');await page.getByRole('button',{name:'Save & Quit',exact:true}).click();await page.getByRole('button',{name:'Continue Game',exact:true}).waitFor();}
async function load(){await page.reload();await page.getByRole('button',{name:'Continue Game',exact:true}).click();return wait(s=>s.mode==='platforming'&&s.player?.grounded);}
try{
  await page.goto(origin);await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.locator('[data-character-id="xgod"]').click();await page.getByRole('button',{name:'Skip story',exact:true}).click();
  let s=await wait(s=>s.mode==='platforming'&&s.player?.grounded);assert.equal(s.supplyCrates.length,3);
  assert.equal(crate(s,'l1-fan').delivery,'waiting');
  await warp(900);await page.keyboard.press('ArrowRight',{delay:20});
  s=await wait(s=>crate(s,'l1-rapid').delivery==='descending'&&crate(s,'l1-rapid').deliveryElapsedMs>2300);
  assert(crate(s,'l1-rapid').parachuteVisible);assert(crate(s,'l1-rapid').y<480);
  await page.screenshot({path:out+'/parachute-descent.png'});
  await page.keyboard.press('p');await wait(s=>s.mode==='paused');
  const pausedY=crate(await read(),'l1-rapid').y;await page.waitForTimeout(300);assert.equal(crate(await read(),'l1-rapid').y,pausedY);
  await page.keyboard.press('p');await wait(s=>crate(s,'l1-rapid').delivery==='landed');
  await saveQuit();s=await load();assert.equal(crate(s,'l1-rapid').delivery,'landed');
  await warp(1125);await page.keyboard.press('ArrowLeft',{delay:20});results.parachutePauseAndLandedSave=true;
  await page.screenshot({path:out+'/intact.png'});
  await page.keyboard.down('Space');await wait(s=>crate(s,'l1-rapid').broken);await page.keyboard.up('Space');
  s=await read();assert(crate(s,'l1-rapid').dropVisible);assert(!crate(s,'l1-rapid').collected);
  await saveQuit();s=await load();assert(crate(s,'l1-rapid').broken);assert(crate(s,'l1-rapid').dropVisible);
  await warp(1060);await wait(s=>crate(s,'l1-rapid').collected&&s.equipment.gunUpgrade==='rapid');
  await saveQuit();s=await load();assert(crate(s,'l1-rapid').collected);assert(!crate(s,'l1-rapid').dropVisible);results.shotsAndSavePersistence=true;
  // Isolate melee/health from arena setup with the existing enemy-test fixture.
  await page.goto(origin+'/?autostart=1&capture=1&level=1&character=barrett&unlockRoster=1');
  await wait(s=>s.mode==='platforming'&&s.player?.grounded);
  await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',1000));
  // Approach from the right, outside the existing spring-pad trigger.
  await warp(1125);await page.keyboard.press('ArrowLeft',{delay:20});
  await wait(s=>crate(s,'l1-rapid').delivery==='landed');
  assert.equal((await read()).equipment.active,'hands');
  for(let i=0;i<3&&!crate(await read(),'l1-rapid').broken;i++){
    await page.keyboard.press('Space',{delay:60});await page.waitForTimeout(450);
  }
  await wait(s=>crate(s,'l1-rapid').broken);
  await warp(1060);await wait(s=>crate(s,'l1-rapid').collected&&s.equipment.active==='blaster'&&s.equipment.gunUpgrade==='rapid');results.meleeAndHandsUpgrade=true;
  await page.setViewportSize({width:844,height:390});await warp(2200);await page.keyboard.press('ArrowRight',{delay:20});
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(45));
  await page.keyboard.down('Space');await wait(s=>crate(s,'l1-health').broken);await page.keyboard.up('Space');
  await page.screenshot({path:out+'/phone-drop.png'});
  const health=(await read()).player.health;
  await warp(2370);s=await wait(s=>crate(s,'l1-health').collected);assert.equal(s.player.health,Math.min(100,health+30));
  await warp(2330);await warp(2370);assert.equal((await read()).player.health,s.player.health);results.healthOnce=true;
  await page.evaluate(()=>window.__unknownPlatformerForceFall());
  await page.waitForTimeout(1600);
  await wait(s=>s.player?.grounded&&!s.heroDeath?.respawning);
  s=await read();assert(crate(s,'l1-health').collected);assert(crate(s,'l1-rapid').collected);results.retryNoDuplicates=true;
  await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));
  const fan=crate(await read(),'l1-fan');
  await warp(fan.x-160);await page.keyboard.press('ArrowRight',{delay:20});
  await page.keyboard.down('Space');await wait(s=>crate(s,'l1-fan').broken);await page.keyboard.up('Space');
  await warp(fan.x);s=await wait(s=>crate(s,'l1-fan').collected&&s.equipment.gunUpgrade==='fan');results.fanReward=true;
  assert.deepEqual(s.failedAssets,[]);assert.deepEqual(errors,[]);
  await fs.writeFile(out+'/report.json',JSON.stringify({results,errors},null,2));console.log(results);
}catch(e){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),state:await read()},null,2));throw e;}
finally{await browser.close();}
