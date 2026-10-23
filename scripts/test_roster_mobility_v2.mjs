import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381',engine=process.env.GAME_TEST_BROWSER||'chromium';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1});
const out=new URL(`../output/roster-mobility-v2/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const errors=[],evidence=[];page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text())),move=s=>s.movement.heroMobility;
async function wait(fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(15);}throw Error('Timeout '+fn);}
const place=(x=1160,y=520)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),o);
const snap=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
async function boot(hero,level=3){await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=${level}&character=${hero}`);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});await fixture({offsets:[]});await place();await wait(s=>s.player.grounded);}
const tap=()=>page.locator('[data-touch-control="jump"]').tap();
try{
 for(const hero of (process.env.GAME_TEST_HERO?[process.env.GAME_TEST_HERO]:['barrett','nico','ezra','teleportation_c','xgod','zgod'])){
  await boot(hero);assert(move(await read()),hero+' has airborne moves');
  await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));
  // Let Arcade synchronize the newly equipped sprite's logical dimensions before measuring feet.
  await page.waitForTimeout(120);let s=await wait(s=>s.player.grounded);assert.equal(s.equipment.active,'blaster');
  const standing=s.player.bodyHeight,feet=s.player.bodyBottom;
  await page.keyboard.down('ArrowDown');s=await wait(s=>s.player.crouching);assert(s.player.bodyHeight<standing*.7);assert(Math.abs(s.player.bodyBottom-feet)<2);
  await fixture({offsets:[115],hp:4});const kills=s.progress.monstersDefeated;
  await page.keyboard.down('Space');await wait(s=>s.weapon.shotsFired>0);s=await read();
  assert(s.player.crouching);const lowShot=s.projectiles.find(p=>!p.enemyProjectile);if(lowShot)assert(lowShot.y>s.player.bodyBottom-65);
  await snap(hero+'-crouch-fire');await wait(s=>s.progress.monstersDefeated>kills);await page.keyboard.up('Space');
  await page.keyboard.up('ArrowDown');await wait(s=>!s.player.crouching);assert.equal((await read()).player.bodyHeight,standing);
  // Physical keyboard edges and the same jump button must share the one-extra-jump chain.
  await fixture({offsets:[]});await place();await wait(s=>s.player.grounded);
  await page.keyboard.press('KeyZ',{delay:35});await wait(s=>!s.player.grounded);await page.keyboard.press('KeyZ',{delay:35});
  s=await wait(s=>move(s).doubleJumps===1);assert(s.player.velocityY<0);await snap(hero+'-double-jump');
  await page.keyboard.press('KeyZ',{delay:35});await wait(s=>move(s).bombs===1);await wait(s=>move(s).impacts===1);await snap(hero+'-slam');await wait(s=>move(s).bombPhase==='ready');
  await tap();await wait(s=>!s.player.grounded);await tap();await wait(s=>move(s).doubleJumps===2);await tap();await wait(s=>move(s).impacts===2);await wait(s=>move(s).bombPhase==='ready');
  assert.equal(move(await read()).bombs,2);
  // Hold doesn't repeat or spend the extra jump; Down remains a direct airborne slam.
  await page.keyboard.down('KeyZ');await page.waitForTimeout(180);assert.equal(move(await read()).doubleJumps,2);await page.keyboard.up('KeyZ');
  await page.keyboard.press('ArrowDown',{delay:30});await wait(s=>move(s).bombs===3);await wait(s=>move(s).impacts===3);await wait(s=>move(s).bombPhase==='ready');
  // Two thumbs: joystick down and fire remain independent; cancel returns to standing.
  const stick=page.locator('[data-touch-joystick]'),r=await stick.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height*.9);
  await wait(s=>s.player.crouching);const shots=(await read()).weapon.shotsFired;
  const fire=page.locator('[data-touch-control="attack"]');await fire.dispatchEvent('pointerdown',{pointerId:42,pointerType:'touch',buttons:1,button:0,bubbles:true});await wait(s=>s.weapon.shotsFired>shots);
  await fire.dispatchEvent('pointercancel',{pointerId:42,pointerType:'touch',bubbles:true});assert((await read()).player.crouching);await page.mouse.up();await wait(s=>!s.player.crouching);
  // Landing slam state and animation stop advancing during pause.
  await page.keyboard.press('KeyZ',{delay:40});await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:30});await wait(s=>move(s).bombPhase==='windup');
  await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');const frozen=move(await read());await page.waitForTimeout(300);assert.deepEqual(move(await read()),frozen);
  await page.keyboard.press('KeyP');await wait(s=>move(s).bombPhase==='ready');assert.equal((await read()).player.visible,true);
  assert.deepEqual((await read()).failedAssets,[]);evidence.push({hero,name:move(await read()).name,crouchBody:true,crouchKill:true,doubleJump:true,thirdTap:true,mobileTwoThumb:true,pause:true});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(e){await snap('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
