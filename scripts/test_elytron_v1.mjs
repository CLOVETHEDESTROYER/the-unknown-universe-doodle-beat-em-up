import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4389';
const engine=process.env.GAME_TEST_BROWSER||'chromium';
// Browser plugin skill unavailable; follow the repository's Playwright workflow.
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1});
const out=`output/elytron-integration/${engine}`;await fs.mkdir(out,{recursive:true});
const errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(/Texture.*not found|No animation|Missing.*frame|Error loading/.test(m.text()))errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text())}catch{return null}});
async function wait(fn,timeout=20000){const until=Date.now()+timeout;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(20)}throw Error('Timed out: '+fn+'; '+JSON.stringify(await read()))}
const snap=name=>page.screenshot({path:`${out}/${name}.png`});
const fixture=options=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),options);
const place=(x=1160,y=520)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function boot(level=3,hero='elytron',extra=''){
  await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=${level}&character=${hero}${extra}`);
  const s=await wait(s=>level===5?s.engine==='flight'&&s.player:s.mode==='platforming'&&s.player?.grounded,60000);
  assert.equal(s.selectedCharacter.id,hero);assert.deepEqual(s.failedAssets,[]);return s;
}
async function arena(){await fixture({offsets:[]});await place();await wait(s=>s.player.grounded)}
try{
  await page.goto(origin+'/?capture=1&unlockRoster=1');
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  const card=page.locator('[data-character-id="elytron"]');await card.scrollIntoViewIfNeeded();
  await card.locator('img').evaluate(img=>img.decode());assert.equal(await card.isEnabled(),true);
  assert.match(await card.innerText(),/Pulse Storm/);await snap('roster');await card.click();
  const skip=page.getByRole('button',{name:'Skip story'});
  await page.waitForTimeout(150);if(await skip.isVisible())await skip.click();
  await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);
  assert.equal((await read()).selectedCharacter.id,'elytron');evidence.push('real roster card selects playable Elytron');
  for(const level of [1,2,3,4,5,6]){
    let s=await boot(level);if(level===5){await page.evaluate(()=>window.advanceTime(4800));s=await read();assert(s.ship.pilotVisible);await snap('flight-pilot')}
    else assert.match(s.player.texture,/^elytron_/);
    await snap('level-'+level);
  }
  evidence.push('all six campaign stages load Elytron without missing assets');
  await boot();await arena();
  await page.keyboard.down('ArrowRight');await wait(s=>s.player.texture==='elytron_locomotion');await snap('run');await page.keyboard.up('ArrowRight');await place();await wait(s=>s.player.grounded);
  await fixture({offsets:[65],hp:20});await page.keyboard.press('Space',{delay:40});await wait(s=>s.enemies[0]?.hp<20);await snap('punch');
  await arena();await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching&&s.player.texture==='elytron_combat');await snap('crouch');
  await page.waitForTimeout(450);await fixture({offsets:[65],hp:20});await page.keyboard.press('Space',{delay:40});await wait(s=>s.enemies[0]?.hp<20);await page.keyboard.up('ArrowDown');
  evidence.push('running, charged melee and crouched melee use Elytron frames and deal damage');
  await arena();await page.keyboard.press('ArrowUp',{delay:35});await wait(s=>!s.player.grounded);
  await page.keyboard.press('ArrowUp',{delay:35});await wait(s=>s.movement?.heroMobility?.doubleJumps>0);await snap('double-jump');
  await page.keyboard.press('ArrowUp',{delay:35});await wait(s=>s.movement?.heroMobility?.bombs>0);await wait(s=>s.movement?.heroMobility?.impacts>0);await snap('slam');
  evidence.push('double jump and butt bomb produce real airborne movement and ground impact');
  await boot();await arena();await fixture({offsets:[170,260,350],hp:30});
  await page.keyboard.press('KeyX',{delay:30});await wait(s=>s.special?.active&&s.special.name==='Pulse Storm');
  await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');const paused=(await read()).special;
  await page.waitForTimeout(220);assert.deepEqual((await read()).special,paused);await page.keyboard.press('KeyP');
  await wait(s=>s.special.pulseStorm.fired>=3);await snap('pulse-storm');
  let s=await wait(s=>s.special.pulseStorm.fired===6);await page.keyboard.press('KeyX');assert.equal((await read()).special.uses,1);
  s=await wait(s=>s.special.hits>0&&!s.special.active);assert(s.enemies.some(e=>e.hp<30));assert(s.player.visible);
  evidence.push('six traveling pulses damage enemies; pause freezes volley; cooldown blocks reuse; player restores');
  await boot();await arena();await page.keyboard.press('ArrowLeft',{delay:50});await page.waitForTimeout(180);await fixture({offsets:[-160,-250],hp:30});
  await page.locator('[data-touch-control="dash"]').tap();await wait(s=>s.special?.hits>0);assert.equal((await read()).player.facing,'left');await snap('pulse-left');
  evidence.push('touch special fires and hits to the left');
  await boot();await arena();
  for(const power of ['sword','frost','ember']){
    await page.evaluate(k=>window.__unknownPlatformerCollectPickup(k),power);await page.waitForTimeout(350);
    assert.equal((await read()).equipment.active,power);await fixture({offsets:[75],hp:30});
    await page.keyboard.press('Space',{delay:80});await page.waitForTimeout(480);await snap('power-'+power);
    assert.match((await read()).player.texture,/^elytron_/);await arena();
  }
  evidence.push('powerups preserve Elytron identity');
  await boot();await arena();await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(10));await wait(s=>s.player.texture==='elytron_reactions');await snap('hurt');
  await page.waitForTimeout(1000);const lives=(await read()).player.lives;
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));await wait(s=>s.heroDeath?.active);await snap('death');
  s=await wait(s=>!s.heroDeath?.active&&s.player.visible&&s.player.grounded);assert.equal(s.player.lives,lives-1);
  evidence.push('hurt, complete collapse and controllable respawn');
  await boot(1);await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:1}));
  let boss=(await read()).enemies.find(e=>e.kind==='boss');await place(boss.x-95,boss.floorY);
  await page.keyboard.down('Space');await page.waitForTimeout(350);await page.keyboard.up('Space');
  await wait(s=>s.celebration?.active,30000);assert.equal((await read()).celebration.texture,'hero_victory');await snap('victory');
  evidence.push('real boss defeat plays Elytron victory pose');
  await boot(1,'elytron','&engine=brawler');assert.equal((await read()).mode,'platforming');
  for(const hero of ['xgod','zgod','killer_kai','nico']){await boot(1,hero);await page.keyboard.press('ArrowRight',{delay:80});}
  evidence.push('legacy request routes Elytron to modern engine; existing heroes still boot');
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/verification.json`,JSON.stringify({status:'passed',evidence,errors},null,2));console.log(JSON.stringify({evidence,errors},null,2));
}catch(error){await snap('failure');const state=await read();await fs.writeFile(`${out}/failure.json`,JSON.stringify({errors,state},null,2));console.error(JSON.stringify({errors,player:state?.player,enemies:state?.enemies,special:state?.special}));throw error}finally{await browser.close()}
