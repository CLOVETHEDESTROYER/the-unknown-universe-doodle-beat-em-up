import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='output/lockwing-volley';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{},args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.url());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const lock=s=>s.enemies?.find(e=>e.kind==='lockwing');const gate=s=>s.routeEncounters?.find(e=>e.id==='lockwing_gate');
const bolts=s=>s.projectiles.filter(e=>e.sourceKind==='lockwing');
async function until(fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){const s=await read();if(fn(s))return s;await page.waitForTimeout(15);}throw Error('Timeout '+fn);}
const place=(x,y=480)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function boot(hero='zgod'){
 await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:5175'}/?autostart=1&capture=1&character=${hero}`);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,null,{timeout:60000});
 return read();
}
try{
 let s=await boot();assert(lock(s),'Lockwing exists before any attack or kill');assert.equal(s.progress.monstersDefeated,0);
 assert.equal(gate(s).stage,'waiting');assert(lock(s).y<=235);assert.equal(lock(s).bodyWidth,99);assert(lock(s).x<s.viewport.width);
 const high=lock(s).y;await page.screenshot({path:`${out}/first-render.png`});
 s=await until(s=>lock(s).y>high+50);assert(gate(s).elapsedMs<1500,'First movement is downward');
 await place(620);s=await until(s=>lock(s).warningVisible);assert.equal(lock(s).attackState,'tell');
 await page.screenshot({path:`${out}/two-port-warning.png`});
 s=await until(s=>bolts(s).length>=2);const volley=bolts(s).slice(-2);
 assert.deepEqual(volley.map(p=>p.pattern).sort(),['lockwing_lower','lockwing_upper']);
 assert(volley.every(p=>p.width===72&&p.height===44&&p.velocityX===-240));assert(Math.abs(volley[0].y-volley[1].y)>=60);
 await page.screenshot({path:`${out}/large-upper-lower-volley.png`});
 await page.keyboard.press('p');const paused=await read();await page.waitForTimeout(350);s=await read();
 assert.equal(gate(s).elapsedMs,gate(paused).elapsedMs);assert.equal(lock(s).y,lock(paused).y);assert.deepEqual(bolts(s),bolts(paused));await page.keyboard.press('p');
 await page.evaluate(()=>window.__unknownPlatformerForceFall());s=await until(s=>gate(s).elapsedMs<350);
 assert(lock(s).y<=235);assert.equal(s.enemies.filter(e=>e.kind==='lockwing').length,1);assert.equal(bolts(s).length,0);
 // Re-enter the attack lane, defeat the real guard, and check shots/gate cleanup.
 await place(620);await until(s=>bolts(s).length>=2);s=await until(s=>gate(s).elapsedMs%3200>1450&&gate(s).elapsedMs%3200<1900);
 await place(780);await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('Space');
 s=await until(s=>gate(s).stage==='complete');await page.keyboard.up('Space');
 assert.equal(gate(s).gateClosed,false);assert.equal(bolts(s).length,0);assert(!lock(s));assert(s.completedEncounters.includes('lockwing_gate'));
 await page.screenshot({path:`${out}/gate-open.png`});
 // A real bolt damages X God through the normal enemy-projectile path.
 s=await boot('xgod');await place(620);s=await until(s=>bolts(s).length>=2);
 let hit=false;
 for(let i=0;i<3&&!hit;i++){
  s=await until(s=>bolts(s).some(p=>p.x>200&&p.x<760));const shot=bolts(s).find(p=>p.x>200&&p.x<760);
  const health=s.player.health;await place(shot.x,shot.y+54);await page.waitForTimeout(60);const after=await read();hit=after.player.health<health;
  if(!hit)await page.waitForTimeout(1000);
 }
 assert(hit,'The new volley damages the player');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,visibleAtStart:true,startsHighAndDescends:true,twoLargeBolts:true,pause:true,retry:true,defeatOpensGate:true,shotsClear:true,damagesPlayer:true,errors}));
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await fs.writeFile(`${out}/failure-state.json`,JSON.stringify(await read().catch(()=>null),null,2));throw e;}finally{await browser.close();}
