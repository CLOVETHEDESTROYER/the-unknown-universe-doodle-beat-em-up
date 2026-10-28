import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// The Browser plugin skill is unavailable; use the repository's Playwright.
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1});
const out=new URL(`../output/killer-kai-v1/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const errors=[],evidence=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(/Texture.*not found|No animation|Missing.*frame|Error loading/.test(m.text()))errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
page.on('request',r=>requests.push(r.url()));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,ms=14000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(15);}throw Error('Timeout '+fn);}
const snap=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
const place=(x=1160,y=520)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),o);
const equip=k=>page.evaluate(k=>window.__unknownPlatformerCollectPickup(k),k);
async function boot(level=3,extra=''){
  await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=${level}&character=killer_kai${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player,{},{timeout:60000});
  assert.equal((await read()).selectedCharacter.id,'killer_kai');
  if(level!==5)await wait(s=>s.player.grounded);
  assert.deepEqual((await read()).failedAssets,[]);
}
async function arena(){await fixture({offsets:[]});await place();await wait(s=>s.player.grounded);}
async function faceLeft(){await page.keyboard.press('ArrowLeft',{delay:35});await page.waitForTimeout(160);}
try{
  // Use the actual title, scrollable roster, intro and initial loadout.
  await page.goto(origin+'/?capture=1&unlockRoster=1');
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  const card=page.locator('[data-character-id="killer_kai"]');await card.scrollIntoViewIfNeeded();
  await card.locator('img').evaluate(img=>img.decode());assert.equal(await card.isEnabled(),true);await snap('roster-phone');await card.click();
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player?.grounded;}catch{return false;}},{},{timeout:60000});
  let s=await read();assert.equal(s.selectedCharacter.id,'killer_kai');assert.equal(s.equipment.active,'blaster');evidence.push('title → roster → intro → Kai');
  for(const level of [1,2,3,4,5,6]){
    await boot(level);
    if(level===5){
      await page.evaluate(()=>window.advanceTime(4800));s=await read();assert.equal(s.engine,'flight');assert(s.ship.pilotVisible);await snap('flight-pilot');
      await page.keyboard.down('Space');await page.evaluate(()=>window.advanceTime(200));await page.keyboard.up('Space');assert((await read()).combat.shotsFired>0);
    }
    await snap('level-'+level);evidence.push('stage '+level+' boots without missing art');
  }
  await boot();await arena();
  await page.keyboard.down('ArrowRight');await wait(s=>s.player.texture==='kai_movement'&&Number(s.player.frame)>=4);await snap('run');await page.keyboard.up('ArrowRight');await place();await wait(s=>s.player.grounded);
  await fixture({offsets:[140],hp:12});await page.keyboard.down('Space');
  await wait(s=>s.weapon.shotsFired>0&&s.player.texture==='kai_combat');await snap('standing-fire');
  await wait(s=>s.enemies[0].hp<12);await page.keyboard.up('Space');evidence.push('standing cannon shot damages enemies');

  await arena();await fixture({offsets:[140,230,340,440],hp:30});
  await page.keyboard.press('KeyX',{delay:30});s=await wait(s=>s.special.active&&s.player.crouching);assert.equal(s.special.uses,1);assert.equal(s.special.impacted,false);
  await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');const paused=(await read()).special;await page.waitForTimeout(240);assert.deepEqual((await read()).special,paused);await page.keyboard.press('KeyP');
  await wait(s=>s.special.thunderfall.strikes>0);await snap('thunderfall-beams');
  s=await wait(s=>s.special.thunderfall.strikes===18);assert(s.enemies.every(e=>e.hp<30));assert.equal(s.special.thunderfall.waves,3);
  await page.keyboard.press('KeyX');assert.equal((await read()).special.uses,1);
  await wait(s=>!s.special.active&&!s.special.thunderfall.active);assert((await read()).player.visible);evidence.push('crouched charge → ground punch → three lightning waves; cooldown and pause');
  await boot();await arena();await faceLeft();await fixture({offsets:[-170],hp:30});
  await page.locator('[data-touch-control="dash"]').tap();await wait(s=>s.special.thunderfall.hits>0);assert.equal((await read()).player.facing,'left');await snap('thunderfall-left');evidence.push('touch special strikes enemies to the left');

  await boot();await arena();
  for(const weapon of ['sword','frost','ember','storm']){
    // Storm is level four; the other pickups are available in level three.
    if(weapon==='storm'){await boot(4);await arena();}
    await equip(weapon);await page.waitForTimeout(130);assert.equal((await read()).equipment.active,weapon);
    if(weapon==='sword'){
      await page.keyboard.down('ArrowRight');await wait(s=>s.player.texture==='kai_sword');await snap('sword-run');await page.keyboard.up('ArrowRight');await place();await wait(s=>s.player.grounded);
    }
    await fixture({offsets:[90],hp:30});const uses=(await read()).equipment.uses;
    await page.keyboard.down('Space');s=await wait(s=>weapon==='frost'?s.enemies[0]?.frozenRemainingMs>0:weapon==='sword'?s.weapon.fireBlades.fired>0:s.equipment.uses>uses);
    await snap('power-'+weapon);await page.keyboard.up('Space');
    if(weapon==='frost'||weapon==='sword'){
      await place();await wait(s=>s.player.grounded);await fixture({offsets:[90],hp:30});
      await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);await page.keyboard.down('Space');
      await wait(s=>s.enemies[0].hp<30);await snap('crouch-'+weapon);await page.keyboard.up('Space');await page.keyboard.up('ArrowDown');
    }
    await arena();evidence.push(weapon+' retains functioning attacks and Kai art');
  }
  await boot();await arena();
  for(let n=0;n<3;n++){
    if(n)await page.waitForTimeout(900);
    await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1));
    await wait(s=>s.player.texture==='kai_reactions');
  }
  assert.equal((await read()).equipment.active,'hands');await page.waitForTimeout(350);await fixture({offsets:[120],hp:8});
  const shots=(await read()).weapon.shotsFired;await page.keyboard.down('Space');await wait(s=>s.weapon.shotsFired>shots&&s.enemies[0].hp<8);await page.keyboard.up('Space');await snap('innate-cannon-after-break');evidence.push('powerup breaks after three hits; innate cannon still fires');
  await page.waitForTimeout(900);await fixture({offsets:[]});const lives=(await read()).player.lives;
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));
  await wait(s=>s.heroDeath.active&&s.heroDeath.frame===4);await snap('death-start');await wait(s=>s.heroDeath.frame===7);await snap('death-final');
  await wait(s=>!s.heroDeath.active&&s.player.grounded&&s.player.visible);assert.equal((await read()).player.lives,lives-1);evidence.push('four-frame death → visible, movable respawn');

  await boot(3);await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'tell',cooldown:true}));s=await read();let boss=s.enemies.find(e=>e.kind==='boss');
  await place(boss.x,boss.bodyTop-75);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:30});
  await wait(s=>s.enemies.find(e=>e.kind==='boss')?.buttBombHits===1);assert((await read()).enemies.find(e=>e.kind==='boss').hp<100);evidence.push('Jet Slam damages guarded boss');
  // Keep existing heroes on their original art paths after shared input changes.
  for(const hero of ['xgod','zgod','nico']){
    await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&character=${hero}`);
    await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});
    s=await read();assert.equal(s.selectedCharacter.id,hero);assert.deepEqual(s.failedAssets,[]);assert(!s.player.texture.startsWith('kai_'));
  }
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(e){await snap('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
