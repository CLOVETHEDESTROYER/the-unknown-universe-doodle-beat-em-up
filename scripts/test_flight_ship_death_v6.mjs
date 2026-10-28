import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/starbreak-ship-death-v6/playtest/',import.meta.url);await fs.mkdir(out,{recursive:true});
await build({entryPoints:['gameplay/flight.ts'],bundle:true,platform:'node',format:'esm',outdir:fileURLToPath(new URL('simulation/',out)),outExtension:{'.js':'.mjs'},logLevel:'silent'});
const {createFlight,stepFlight,damageShip}=await import(new URL('simulation/flight.mjs',out));
const evidence={},errors=[];
for(const lives of [1,3]){
  const s=createFlight(lives,250,'EASY',20261016);s.phase='flight';s.x=480;s.y=250;s.bank=7;s.checkpoint=6000;s.distance=6150;
  s.checkpointWeapon='lance';s.combat.weapon='homing';
  assert(damageShip(s,100));assert.equal(s.lives,lives-1);assert.equal(s.death.x,480);assert.equal(s.death.bank,7);
  const id=s.death.id;assert.equal(damageShip(s,100),false);assert.equal(s.death.id,id);
  stepFlight(s,500,{x:1,y:1,fire:true});assert.equal(s.x,480);assert.equal(s.y,250);assert.equal(s.distance,6150);assert.equal(s.combat.bolts.length,0);
  assert.equal(s.phase,lives===1?'dying':'respawn');
  stepFlight(s,lives===1?610:710,{x:0,y:0});
  assert.equal(s.phase,lives===1?'gameover':'flight');assert.equal(s.lives,lives-1);
  if(lives>1){assert.equal(s.death,null);assert.equal(s.hull,100);assert.equal(s.combat.weapon,'twin');assert.equal(s.distance,6000);}
}
evidence.singleDeathFrozenControlsAndCheckpointRecovery=true;
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=async ms=>{await page.evaluate(ms=>window.advanceTime(ms),ms);assert.deepEqual(errors,[]);};
const shot=n=>page.screenshot({path:fileURLToPath(new URL(`${n}.png`,out))});
const hurt=amount=>page.evaluate(amount=>window.__unknownFlightDamageShip(amount),amount);
async function boot(extra=''){
  for(const k of ['Space','ArrowRight','ArrowUp'])await page.keyboard.up(k);
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=5&capture=1&flightSeed=20261016${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player);
  await advance(4800);assert.deepEqual((await read()).failedAssets,[]);
}
try{
  await boot();await hurt(20);let s=await read();assert.equal(s.ship.hull,80);assert.equal(s.shipDeath.active,false);assert(s.ship.visible);
  await advance(1700);await page.evaluate(()=>window.__unknownFlightSetShipPosition(480,300));await hurt(100);
  s=await read();assert.equal(s.flight.phase,'respawn');assert.equal(s.player.lives,2);assert.equal(s.shipDeath.stage,'flash');assert(s.ship.visible);assert(!s.ship.pilotVisible);
  const deathId=s.shipDeath.id,x=s.shipDeath.x,y=s.shipDeath.y;await shot('hull-flash');
  await page.keyboard.down('Space');await page.keyboard.down('ArrowRight');const fired=s.combat.shotsFired;
  await advance(190);s=await read();assert.equal(s.shipDeath.stage,'breakup');assert(!s.ship.visible);assert.equal(s.shipDeath.fragments,12);assert.equal(s.shipDeath.x,x);assert.equal(s.shipDeath.y,y);
  assert.equal(s.projectiles.length,0);assert.equal(s.combat.shotsFired,fired);await shot('hull-breakup');
  await hurt(100);assert.equal((await read()).shipDeath.id,deathId);assert.equal((await read()).player.lives,2);
  await page.keyboard.up('Space');await page.keyboard.up('ArrowRight');await advance(300);await shot('hull-fragments');
  s=await read();const held=s.shipDeath.elapsed;await page.keyboard.press('KeyP');await page.waitForTimeout(80);await advance(600);assert.equal((await read()).shipDeath.elapsed,held);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);await advance(300);s=await read();assert.equal(s.shipDeath.stage,'embers');await shot('hull-embers');
  await advance(450);s=await read();assert.equal(s.flight.phase,'flight');assert.equal(s.shipDeath.active,false);assert.equal(s.shipDeath.fragments,0);assert(s.ship.visible&&s.ship.pilotVisible);assert.equal(s.ship.hull,100);assert.equal(s.player.lives,2);
  evidence.nonFatalHitBreakupPauseAndRespawn=true;

  await boot('&lives=1');await hurt(100);s=await read();assert.equal(s.mode,'dying');assert.equal(s.player.lives,0);
  assert.equal(await page.getByRole('heading',{name:'Game Over',exact:true}).count(),0);
  await advance(450);s=await read();assert.equal(s.shipDeath.stage,'breakup');assert.equal(s.shipDeath.fragments,12);
  assert.equal(await page.getByRole('heading',{name:'Game Over',exact:true}).count(),0);await shot('last-ship-breakup');
  await advance(700);await page.getByRole('heading',{name:'Game Over',exact:true}).waitFor({state:'visible'});
  s=await read();assert.equal(s.mode,'gameover');assert.equal(s.shipDeath.stage,'finished');assert.equal(s.shipDeath.fragments,0);assert(!s.ship.visible);await shot('game-over-after-explosion');
  evidence.lastLifeAnimationBeforeGameOver=true;

  await page.setViewportSize({width:844,height:390});await boot('&character=barrett&unlockRoster=1');await hurt(100);await advance(330);await shot('phone-bear-ship-breakup');assert.equal((await read()).shipDeath.fragments,12);
  await advance(1000);assert.equal((await read()).flight.phase,'flight');await advance(2700);
  // A real collision, rather than a forced death flag, must trigger the same sequence.
  let obstacle=(await read()).obstacles.find(r=>r.x>120&&r.x<880);if(!obstacle){await advance(1800);obstacle=(await read()).obstacles.find(r=>r.x>120&&r.x<880);}
  assert(obstacle);await hurt(80);await advance(1700);
  obstacle=(await read()).obstacles.find(r=>r.x>100&&r.x<900);assert(obstacle);
  await page.evaluate(r=>window.__unknownFlightSetShipPosition(r.x,r.y),obstacle);await advance(25);
  s=await read();assert.equal(s.flight.phase,'respawn');assert(s.shipDeath.active);assert.equal(s.player.lives,1);evidence.realAsteroidFatalHitAndAlternatePilot=true;
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
