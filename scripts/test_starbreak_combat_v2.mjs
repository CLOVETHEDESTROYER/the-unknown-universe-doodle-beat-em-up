import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/starbreak-combat-v2/playtest/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=async ms=>{await page.evaluate(ms=>window.advanceTime(ms),ms);assert.deepEqual(errors,[]);};
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownFlightSetShipPosition(x,y),{x,y});
const shot=n=>page.screenshot({path:fileURLToPath(new URL(`${n}.png`,out))});
async function boot(extra=''){
  await page.keyboard.up('Space');await page.keyboard.up('KeyC');
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=5&capture=1&flightSeed=20261016${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player);
  assert.deepEqual((await read()).failedAssets,[]);await advance(4800);
}
async function wait(pred,limit=10000){
  for(let ms=0;ms<limit;ms+=50){const s=await read();if(pred(s))return s;await advance(50);}
  throw new Error(`Timeout: ${pred}`);
}
try{
  await boot();await place(240,295);
  await page.keyboard.down('Space');await advance(30);
  let s=await read();assert.equal(s.combat.shotsFired,2);
  const bolts=s.projectiles.filter(b=>b.playerShot);assert.equal(bolts.length,2);
  for(let i=0;i<2;i++){
    assert(Math.abs(bolts[i].y-s.combat.muzzles[i].y)<1);
    assert(bolts[i].x>s.combat.muzzles[i].x&&bolts[i].x<s.combat.muzzles[i].x+100);
  }
  await advance(950);s=await read();assert(s.combat.shotsFired>=10&&s.combat.shotsFired<=14);
  await page.keyboard.up('Space');const count=s.combat.shotsFired;await advance(300);assert.equal((await read()).combat.shotsFired,count);
  await page.keyboard.down('KeyC');await advance(220);assert((await read()).combat.shotsFired>count);await page.keyboard.up('KeyC');
  evidence.muzzlesAndCadence=true;await shot('player-cannons');

  s=await wait(s=>s.enemies.some(e=>e.kind==='scout'&&e.x<950));
  const target=s.enemies.find(e=>e.kind==='scout');
  await page.keyboard.down('Space');
  for(let i=0;i<20;i++){
    s=await read();const e=s.enemies.find(e=>e.id===target.id);if(!e)break;
    await place(e.x-220,e.y-18);await advance(100);
  }
  await page.keyboard.up('Space');s=await read();assert(s.combat.kills>=1);assert(s.progress.score>=100);
  evidence.scoutKill=true;await shot('scout-destroyed');

  await boot();await advance(4200);s=await read();const rock=s.obstacles.find(r=>r.id===0);
  await place(rock.x-185,rock.y-18);await page.keyboard.down('Space');await advance(450);await page.keyboard.up('Space');
  assert((await read()).combat.asteroidHits>=2);evidence.asteroidTakesFire=true;await shot('rock-damage');

  await boot();await advance(15500);
  s=await wait(s=>s.enemies.some(e=>e.kind==='interceptor'&&e.phase==='tell'));
  const locked=s.enemies.find(e=>e.kind==='interceptor'&&e.phase==='tell');
  await shot('charge-warning');await place(100,450);await advance(180);
  let e=(await read()).enemies.find(e=>e.id===locked.id);
  assert.equal(e.aimX,locked.aimX);assert.equal(e.aimY,locked.aimY);
  s=await wait(s=>s.enemies.some(e=>e.id===locked.id&&e.phase==='charge'&&e.phaseMs>250));
  e=s.enemies.find(e=>e.id===locked.id);assert(e.x<locked.startX-100);assert.equal(e.aimY,locked.aimY);
  evidence.committedCharge=true;await shot('charge-dodge');

  await boot();await advance(30000);
  s=await wait(s=>s.enemies.some(e=>e.kind==='gunship'));
  let heavy=s.enemies.find(e=>e.kind==='gunship');
  await place(heavy.x-210,heavy.y-18);await page.keyboard.down('Space');
  s=await wait(s=>s.enemies.some(e=>e.kind==='gunship'&&e.hp<e.maxHp));
  heavy=s.enemies.find(e=>e.kind==='gunship');assert(heavy.hp<heavy.maxHp);assert(heavy.vulnerable);assert.equal(s.combat.guardedHits,0);
  await page.keyboard.up('Space');await shot('gunship-damaged');
  await place(550,445);
  s=await wait(s=>s.enemies.some(e=>e.kind==='gunship'&&e.phase==='recover'));
  heavy=s.enemies.find(e=>e.kind==='gunship');assert(s.combat.enemyShots>=3);
  await shot('gunship-open');
  s=await read();const hostile=s.projectiles.find(b=>b.enemyProjectile);
  assert(hostile);const beforeBolt=s.ship.hull;
  await place(hostile.x-90,hostile.y);await advance(250);s=await read();
  assert.equal(beforeBolt-s.ship.hull,12,'A real gunship bolt applies its configured damage; the fan shares hit protection');
  evidence.enemyBoltDamageAndProtection=true;
  await place(heavy.x-140,heavy.y-42);
  await page.keyboard.down('Space');
  s=await wait(s=>!s.enemies.some(e=>e.id===heavy.id),2000);await page.keyboard.up('Space');
  assert(s.repairs.length>=1);const repair=s.repairs[0];
  const hull=s.ship.hull;await place(repair.x,repair.y);await advance(30);s=await read();
  assert.equal(s.combat.repairsCollected,1);assert.equal(s.ship.hull,Math.min(100,hull+15));
  evidence.gunshipDamageVolleyAndRepair=true;await shot('gunship-defeated');

  await page.keyboard.down('Space');await page.keyboard.press('KeyP');await page.waitForTimeout(80);
  const paused=await read();await advance(1000);s=await read();
  assert.equal(s.combat.shotsFired,paused.combat.shotsFired);assert.equal(s.flight.distance,paused.flight.distance);
  assert.deepEqual(s.projectiles,paused.projectiles);await page.keyboard.up('Space');await page.keyboard.press('KeyP');await page.waitForTimeout(80);
  evidence.pauseFreezesCombat=true;
  // Destroy the hull using the normal damage hook and check all hostile state clears.
  while((await read()).flight.phase==='flight'){
    await page.evaluate(()=>window.__unknownFlightDamageShip());
    if((await read()).flight.phase==='flight')await advance(1700);
  }
  s=await read();assert.equal(s.enemies.length,0);assert.equal(s.projectiles.length,0);await advance(1300);
  s=await read();assert.equal(s.flight.checkpoint,6000);assert.equal(s.combat.kills,1);
  await advance(3000);assert.equal((await read()).enemies.some(e=>e.id===heavy.id),false,'Defeated enemies cannot be farmed after checkpoint retry');
  evidence.retryCleanupAndNoFarming=true;

  await page.setViewportSize({width:844,height:390});await boot('&character=nico&unlockRoster=1');await page.waitForTimeout(300);
  const fire=page.getByRole('button',{name:'Hold to fire ship cannons',exact:true});
  const up=page.locator('[data-touch-control="up"]');
  await fire.dispatchEvent('pointerdown',{pointerId:11,pointerType:'touch',bubbles:true});
  await up.dispatchEvent('pointerdown',{pointerId:12,pointerType:'touch',bubbles:true});await advance(250);s=await read();
  assert(s.player.velocityY<0&&s.combat.shotsFired>=2);await shot('phone-steer-and-fire');
  await fire.dispatchEvent('pointercancel',{pointerId:11,pointerType:'touch',bubbles:true});
  await up.dispatchEvent('pointercancel',{pointerId:12,pointerType:'touch',bubbles:true});
  const stopped=(await read()).combat.shotsFired;await advance(350);s=await read();assert.equal(s.combat.shotsFired,stopped);assert.equal(s.player.velocityY,0);
  evidence.touchSimultaneousAndCancel=true;
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure');throw error;}
finally{await browser.close();}
