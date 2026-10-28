import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381',out=new URL('../output/level-enemies-v3/damage/',import.meta.url);
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true});
const page=await browser.newPage({...devices['iPhone 13 landscape'],deviceScaleFactor:1}),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const wait=async(fn,ms=12000)=>{const end=Date.now()+ms;while(Date.now()<end){const s=await read();if(fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);};
const place=(x,level)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y:level<=2?480:520});
const shot=async name=>{const png=await page.evaluate(()=>document.querySelector('canvas').toDataURL());await fs.writeFile(new URL(name+'.png',out),Buffer.from(png.split(',')[1],'base64'));};
try{
 for(const [level,foe] of [[1,'tagger'],[2,'bellkeeper'],[3,'boiler'],[4,'mantis'],[6,'mimic']]){
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=xgod`);
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player.grounded;}catch{return false;}},{},{timeout:60000});
  await place(80,level);await page.evaluate(foe=>window.__unknownPlatformerEnemyTest(foe,12),foe);
  const tell=await wait(s=>s.enemies[0]?.attackState==='tell');assert(tell.enemies[0].warningVisible);
  assert.equal(tell.player.health,100,'No contact hit while setting up the ranged attack');
  if(foe==='bellkeeper')await place(tell.enemies[0].targetX+62,level);
  const patterns=new Set(),trace=[];
  const hit=await wait(s=>{
    for(const p of s.projectiles.filter(p=>p.sourceKind===foe)){patterns.add(p.pattern);if(foe==='boiler')trace.push({x:p.x,y:p.y,pattern:p.pattern});}
    return s.player.health<100;
  });
  assert.equal(100-hit.player.health,{tagger:9,bellkeeper:12,boiler:13,mantis:11,mimic:11}[foe]);
  assert(Math.abs(hit.enemies[0].x-hit.player.x)>130,'Damage comes from the move, not contact');
  if(foe==='boiler'){
    assert(new Set(trace.map(p=>p.x)).size>=5,'Coal follows an actual arc');
    assert(Math.min(...trace.map(p=>p.y))<400,'Coal rises above the crab');
    assert(trace.some(p=>Math.abs(p.x-tell.enemies[0].targetX)<35),'Coal reaches its committed landing point');
  }
  await shot(foe+'-hit');
  // A fresh warning commits to the old location; moving away prevents the next hit.
  await place(80,level);await page.evaluate(foe=>window.__unknownPlatformerEnemyTest(foe,12),foe);
  await wait(s=>s.enemies[0]?.attackState==='tell');await place(700,level);const health=(await read()).player.health;
  await wait(s=>s.enemies[0]?.attackState==='recover');await page.waitForTimeout(1000);
  assert.equal((await read()).player.health,health,'Leaving the warning avoids the attack');
  evidence.push({level,foe,damage:100-hit.player.health,dodge:true,patterns:[...patterns],...(foe==='boiler'?{trace}: {})});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(e){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure');throw e;}finally{await browser.close();}
