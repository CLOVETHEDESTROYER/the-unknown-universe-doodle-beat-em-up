import {chromium,webkit,devices} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const out=new URL(`../output/boss-fairness/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 13 landscape'],deviceScaleFactor:1}),errors=[];
page.on('pageerror',e=>errors.push(e.message));const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const step=ms=>page.evaluate(ms=>window.advanceTime(ms),ms),boss=s=>s.enemies.find(e=>e.kind==='pursuer');
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownFlightSetShipPosition(x,y),{x,y});
try{
 await page.goto(`${origin}/?autostart=1&capture=1&level=5&flightFinale=1&character=xgod`);
 await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player;}catch{return false;}},{},{timeout:60000});await step(0);
 let sawShots=false,s=await read();
 for(let n=0;n<400;n++){
  s=await read();const b=boss(s);sawShots||=s.projectiles.some(p=>p.sourceId==='void-pursuer');
  if(b?.phase==='recover')break;
  if(b?.phase==='tell')await place(230,b.aimY>300?145:475);
  await step(30);
 }
 s=await read();let b=boss(s);assert.equal(b?.phase,'recover');assert(sawShots,'Test observes actual boss lasers');
 assert(!s.projectiles.some(p=>p.sourceId==='void-pursuer'),'Boss lasers clear at recovery');
 const before=s.player.health;await place(b.x,b.y);await step(150);s=await read();assert.equal(s.player.health,before,'Recovering boss body does not damage the ship');
 await page.screenshot({path:fileURLToPath(new URL('flight-safe-contact.png',out))});
 await place(230,475);
 for(let n=0;n<150&&boss(await read()).phase==='recover';n++)await step(30);
 s=await read();b=boss(s);assert.notEqual(b.phase,'recover');const guardedHealth=s.player.health;
 await place(b.x,b.y);await step(30);s=await read();assert(s.player.health<guardedHealth,'Boss body remains dangerous outside recovery');
 assert.deepEqual(errors,[]);const result={passed:true,engine,realBossLasers:true,clearedOnRecovery:true,safeRecoveryContact:true,guardedContactDamage:guardedHealth-s.player.health,errors};
 await fs.writeFile(new URL('flight-results.json',out),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){await fs.writeFile(new URL('flight-failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),errors},null,2));throw e;}finally{await browser.close();}
