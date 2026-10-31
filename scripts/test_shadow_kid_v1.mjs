import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4390';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1});
const out='output/shadow-kid';await fs.mkdir(out,{recursive:true});
const errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
page.on('console',m=>{if(/Texture.*not found|No animation|Missing.*frame|Error loading/.test(m.text()))errors.push(m.text())});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text())}catch{return null}});
async function wait(fn,timeout=25000){const until=Date.now()+timeout;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(25)}throw Error('Timeout '+fn+' '+JSON.stringify(await read()))}
const snap=name=>page.screenshot({path:`${out}/${name}.png`});
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),o);
const place=()=>page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(1160,520));
async function boot(level=3,hero='shadow_kid',extra=''){
 await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=${level}&character=${hero}${extra}`);
 const s=await wait(s=>level===5?s.engine==='flight'&&s.player:s.mode==='platforming'&&s.player?.grounded,60000);
 assert.equal(s.selectedCharacter.id,hero);assert.deepEqual(s.failedAssets,[]);return s;
}
async function arena(){await fixture({offsets:[]});await place();await wait(s=>s.player.grounded)}
try{
 await page.goto(origin+'/?capture=1&unlockRoster=1');
 await page.getByRole('button',{name:'Start game',exact:true}).click();
 const card=page.locator('[data-character-id="shadow_kid"]');await card.scrollIntoViewIfNeeded();
 await card.locator('img').evaluate(img=>img.decode());await snap('roster');await card.click();
 await page.waitForTimeout(150);const skip=page.getByRole('button',{name:'Skip story'});if(await skip.isVisible())await skip.click();
 await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);assert.equal((await read()).selectedCharacter.id,'shadow_kid');
 evidence.push('real roster selection');
 for(const level of [1,2,3,4,5,6]){const s=await boot(level);if(level!==5)assert.match(s.player.texture,/^shadow_/);else {await page.evaluate(()=>window.advanceTime(4800));assert((await read()).ship.pilotVisible)}await snap('level-'+level)}
 evidence.push('six campaign stages including flight pilot load');
 await boot();await arena();
 await page.keyboard.down('ArrowRight');await wait(s=>s.player.texture==='shadow_run');await snap('run-right');await page.keyboard.up('ArrowRight');
 await page.keyboard.down('ArrowLeft');await wait(s=>s.player.facing==='left'&&s.player.texture==='shadow_run');await snap('run-left');await page.keyboard.up('ArrowLeft');
 await arena();await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);await snap('crouch');await page.keyboard.up('ArrowDown');
 await page.keyboard.press('ArrowUp',{delay:30});await wait(s=>!s.player.grounded);await snap('jump');await page.keyboard.press('ArrowUp',{delay:30});await wait(s=>s.movement.heroMobility.doubleJumps>0);
 await page.keyboard.press('ArrowUp',{delay:30});await wait(s=>s.movement.heroMobility.impacts>0);
 evidence.push('left/right run, crouch, jump, double jump, void drop');
 await boot();await arena();await fixture({offsets:[180],hp:30});
 await page.keyboard.press('Space',{delay:30});await page.waitForTimeout(400);await snap('throw-windup');
 await wait(s=>s.enemies[0]?.hp<30);await snap('throw-hit');
 evidence.push('regular throw travels and damages enemy');
 await boot();await arena();await fixture({offsets:[230],hp:30});await page.keyboard.press('KeyX',{delay:30});
 await wait(s=>s.special.active);await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');
 const paused=(await read()).special;await page.waitForTimeout(200);assert.deepEqual((await read()).special,paused);await page.keyboard.press('KeyP');
 await wait(s=>s.special.hits>0);await snap('special');await page.keyboard.press('KeyX');assert.equal((await read()).special.uses,1);
 evidence.push('large special projectile damages, pause and cooldown work');
 await boot();await arena();await page.keyboard.press('ArrowLeft',{delay:70});await page.waitForTimeout(200);await fixture({offsets:[-180],hp:30});
 await page.locator('[data-touch-control="attack"]').tap();await wait(s=>s.enemies[0]?.hp<30);await snap('touch-throw-left');
 evidence.push('touch throws left and hits');
 for(const power of ['blaster','sword','frost','ember','storm']){
  await boot(power==='storm'?4:3);await arena();await page.evaluate(k=>window.__unknownPlatformerCollectPickup(k),power);await page.waitForTimeout(350);
  assert.equal((await read()).equipment.active,power);await page.keyboard.press('Space',{delay:100});await page.waitForTimeout(300);assert.match((await read()).player.texture,/^shadow_/);
 }
 evidence.push('all five equipment pickups preserve character identity');
 await boot();await arena();await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(10));await wait(s=>s.player.texture==='shadow_hurt');await snap('hurt');
 await page.waitForTimeout(1100);const lives=(await read()).player.lives;await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));await wait(s=>s.heroDeath?.active);await snap('defeat');
 await wait(s=>!s.heroDeath?.active&&s.player.visible&&s.player.grounded);assert.equal((await read()).player.lives,lives-1);
 evidence.push('hurt, defeat and controllable respawn');
 await boot(1);await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:1}));
 const boss=(await read()).enemies.find(e=>e.kind==='boss');await page.evaluate(b=>window.__unknownPlatformerSetPlayerPosition(b.x-140,b.floorY),boss);
 await page.keyboard.press('Space',{delay:40});await wait(s=>s.celebration?.active,30000);await snap('victory');
 evidence.push('boss defeat and own victory animation');
 await boot(1,'shadow_kid','&engine=brawler');
 for(const hero of ['xgod','zgod','killer_kai','elytron'])await boot(1,hero);
 evidence.push('legacy request routes to modern engine, existing heroes boot');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/verification.json`,JSON.stringify({status:'passed',evidence,errors},null,2));console.log(evidence);
}catch(e){await snap('failure');await fs.writeFile(`${out}/failure.json`,JSON.stringify({errors,state:await read()},null,2));throw e}finally{await browser.close()}
