import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1});
const out=new URL(`../output/kai-thunderfall-v1/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(/Texture.*not found|No animation|Missing.*frame/.test(m.text()))errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(12);}throw Error('Timeout '+fn);}
const snap=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),o);
async function boot(){await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=3&character=killer_kai`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});}
async function arena(){await fixture({offsets:[]});await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(1160,520));await wait(s=>s.player.grounded);}
const tap=()=>page.locator('[data-touch-control="dash"]').tap();
try{
  await boot();await arena();const standing=(await read()).player.bodyHeight,feet=(await read()).player.bodyBottom;
  await fixture({offsets:[95,100,140,-170],hp:50,projectile:true});
  await page.keyboard.down('ArrowDown');await wait(s=>s.player.crouching);await tap();
  await wait(s=>s.special.active&&s.special.frame===1);let s=await read();assert(s.player.bodyHeight<standing*.7);assert(Math.abs(s.player.bodyBottom-feet)<2);await snap('charge');
  await page.keyboard.up('ArrowDown');await wait(s=>s.special.frame===2);await snap('ground-punch');
  await wait(s=>s.special.thunderfall.strikes>0);await snap('lightning');
  await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');const frozen=(await read()).special;
  await page.waitForTimeout(250);assert.deepEqual((await read()).special,frozen);await page.keyboard.press('KeyP');
  s=await wait(s=>s.special.thunderfall.strikes===18);assert.equal(s.special.thunderfall.waves,3);assert(s.special.thunderfall.clearedShots>0);
  assert(s.enemies.every(e=>e.hp>=38&&e.hp<50),'Overlapping beams cannot hit one enemy twice in a wave');
  await wait(s=>!s.special.active&&!s.special.thunderfall.active&&!s.player.crouching);assert.equal((await read()).player.bodyHeight,standing);
  await page.keyboard.down('ArrowRight');await wait(s=>s.player.velocityX>100);await page.keyboard.up('ArrowRight');
  evidence.push('manual crouch SP; smaller collider; grounded fist; 18 sky strikes; one hit per wave; shot clear; mid-storm pause; controls restore');

  await boot();await arena();await page.keyboard.press('KeyZ',{delay:30});await wait(s=>!s.player.grounded);await tap();
  assert.equal((await read()).special.uses,0);assert.equal((await read()).special.cooldownRemainingMs,0);
  await wait(s=>s.player.grounded);await tap();await wait(s=>s.special.active);await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1));
  s=await wait(s=>!s.special.active);assert.equal(s.special.thunderfall.strikes,0);await page.waitForTimeout(1000);assert.equal((await read()).special.thunderfall.strikes,0);
  evidence.push('airborne rejection costs no cooldown; interrupt during charge prevents storm');

  await boot();await arena();await fixture({offsets:[200],hp:50});await tap();await wait(s=>s.special.thunderfall.strikes>0);
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1));s=await wait(s=>!s.special.active&&!s.special.thunderfall.active);const strikes=s.special.thunderfall.strikes;
  await page.waitForTimeout(1300);assert.equal((await read()).special.thunderfall.strikes,strikes);assert.equal((await read()).player.visible,true);
  evidence.push('damage cancels remaining lightning and restores player visibility');
  await boot();await arena();await tap();await wait(s=>s.special.thunderfall.strikes>0);await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));
  await wait(s=>s.heroDeath.active);assert.equal((await read()).special.thunderfall.active,false);await wait(s=>!s.heroDeath.active&&s.player.grounded&&s.player.visible);
  await page.keyboard.press('KeyZ',{delay:35});await wait(s=>!s.player.grounded);evidence.push('death cancels storm; respawn movement works');

  for(const state of ['tell','recover']){
    await boot();await page.evaluate(state=>window.__unknownPlatformerBossRulesTest({state}),state);await tap();
    await wait(s=>s.special.thunderfall.strikes===18);s=await read();const boss=s.enemies.find(e=>e.kind==='boss');
    if(state==='tell')assert.equal(boss.hp,100);else assert(boss.hp<100);
    evidence.push(state==='tell'?'boss armor still guards Thunderfall':'lightning damages vulnerable boss');
  }
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(e){await snap('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
