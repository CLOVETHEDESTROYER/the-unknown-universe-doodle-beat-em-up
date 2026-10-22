import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const kind=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const out=new URL(`../output/enemy-motion-v2/flight-${kind}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[kind].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 13 landscape'],deviceScaleFactor:1});const errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));const step=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const shot=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
try{
 await page.goto(`${origin}/?autostart=1&capture=1&level=5&character=zgod`);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player,{},{timeout:60000});await step(0);
 for(const foe of ['scout','interceptor','gunship']){
  await page.evaluate(foe=>window.__unknownFlightEnemyTest(foe),foe);
  const frames=new Set();for(let n=0;n<7;n++){await step(100);frames.add(String((await read()).enemies[0].visualFrame));}assert(frames.size>=2);
  for(let n=0;n<80&&(await read()).enemies[0]?.phase!=='tell';n++)await step(40);
  let s=await read(),e=s.enemies[0];assert.equal(e.phase,'tell');assert(['8','9'].includes(String(e.visualFrame)));const aim={x:e.aimX,y:e.aimY};
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);const clock=(await read()).flight.phaseMs;await step(300);assert.equal((await read()).flight.phaseMs,clock);await page.keyboard.press('KeyP');await page.waitForTimeout(80);
  await page.evaluate(()=>window.__unknownFlightSetShipPosition(230,440));
  for(let n=0;n<60&&['tell'].includes((await read()).enemies[0]?.phase);n++)await step(30);
  s=await read();assert.equal(s.enemies[0].aimX,aim.x);assert.equal(s.enemies[0].aimY,aim.y);assert(['10','11'].includes(String(s.enemies[0].visualFrame)));await shot(foe+'-attack');
  // Actual ship cannons remove a one-hit target; its destroy effect plays four art poses.
  await page.evaluate(foe=>window.__unknownFlightEnemyTest(foe,1),foe);await step(0);await page.keyboard.down('Space');
  for(let n=0;n<100&&!(await read()).effects.some(e=>e.kind==='destroy'&&e.source===foe);n++)await step(20);
  await page.keyboard.up('Space');s=await read();assert(s.effects.some(e=>e.kind==='destroy'&&e.source===foe));assert.equal(s.enemies.length,0);
  const deathFrames=new Set();for(let n=0;n<4;n++){s=await read();const fx=s.effects.find(e=>e.kind==='destroy'&&e.source===foe);assert(fx);deathFrames.add(String(fx.visualFrame));await shot(foe+'-death-'+n);await step(220);}
  assert.equal(deathFrames.size,4);await step(300);assert(!(await read()).effects.some(e=>e.kind==='destroy'&&e.source===foe));
  evidence.push({foe,cruiseFrames:frames.size,lockedAttack:true,pause:true,deathFrames:[...deathFrames]});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,browser:kind,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
