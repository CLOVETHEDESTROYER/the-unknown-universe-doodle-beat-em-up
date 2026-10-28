import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const out=new URL(`../output/boss-fairness/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 13 landscape'],deviceScaleFactor:1}),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text())),boss=s=>s.enemies.find(e=>e.kind==='boss');
async function wait(fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s,boss(s)))return s;await page.waitForTimeout(15);}throw Error('Timeout '+fn);}
const fixture=options=>page.evaluate(options=>window.__unknownPlatformerBossRulesTest(options),options);
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot=async n=>{const png=await page.evaluate(()=>document.querySelector('canvas').toDataURL());await fs.writeFile(new URL(n+'.png',out),Buffer.from(png.split(',')[1],'base64'));};
try{
 for(const level of [1,2,3,4,6]){
  if(process.env.GAME_TEST_LEVEL&&Number(process.env.GAME_TEST_LEVEL)!==level)continue;
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&finishLevel=1&character=xgod`);
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player.grounded;}catch{return false;}},{},{timeout:60000});
  const cases=[];
  for(const state of ['tell','attack','recover']){
   await fixture({state,cooldown:true});let s=await wait((s,b)=>b?.attackState===state),b=boss(s);
   // Position a real airborne player, then use the real Down input to execute the bomb.
   await place(b.x,b.bodyTop-75);await wait(s=>!s.player.grounded);await page.keyboard.press('ArrowDown',{delay:40});
   s=await wait((s,b)=>b.buttBombHits===1);const expected=state==='recover'?(level===3?[8,12]:[6,9]):[4,6];
   assert(expected.includes(100-boss(s).hp),`${level}/${state}: real slam damage bypasses guard/recent-hit cooldown`);
   assert.equal(s.movement.xgodMobility.bombs, cases.length+1);
   const damage=100-boss(s).hp;await shot(`level${level}-${state}-bomb`);
   await wait(s=>s.movement.xgodMobility.bombPhase==='ready');assert.equal((await read()).enemies[0].buttBombHits,1,'One hit per bomb');
   cases.push({state,damage});
  }
  await fixture({state:'recover',contact:true,shot:'boss'});let s=await wait((s,b)=>b.vulnerable);
  await page.waitForTimeout(420);s=await read();assert.equal(s.player.health,100,'Vulnerable boss body and bullets are harmless');
  assert.equal(s.player.velocityX,0,'No recovery contact knockback');assert(!s.projectiles.some(p=>p.sourceBoss),'Old boss attacks clear during recovery');
  await shot(`level${level}-safe-contact`);
  await fixture({state:'recover',shot:'enemy'});s=await wait(s=>s.player.health<100);assert.equal(s.player.health,89,'Unrelated enemy shots still damage the player');
  await fixture({state:'attack',shot:'boss'});s=await wait(s=>s.player.health<100);assert.equal(s.player.health,89,'Guarded boss shots still hurt');
  await fixture({state:'tell'});await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('Space');
  s=await wait((s,b)=>b.guardedHits>0);await page.keyboard.up('Space');assert.equal(boss(s).hp,100,'Ordinary attacks still respect the guard');
  evidence.push({level,boss:boss(s).bossId,cases,safeRecoveryContact:true,safeRecoveryProjectiles:true,ordinaryDamagePreserved:true});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(e){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw e;}finally{await browser.close();}
