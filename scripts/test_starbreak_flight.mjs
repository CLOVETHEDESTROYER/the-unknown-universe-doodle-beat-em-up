import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:3000';
const out=new URL('../output/starbreak-flight-v1/playtest/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];const evidence={};
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=async ms=>{await page.evaluate(ms=>window.advanceTime(ms),ms);if(errors.length)throw new Error(errors.join('\n'));};
const shot=name=>page.screenshot({path:fileURLToPath(new URL(`${name}.png`,out))});
async function boot(query=''){
  await page.goto(`${origin}/?autostart=1&level=5&capture=1&flightSeed=20261016&sword=1&swordUnlocked=1&dinio=1&doghost=1&teleportc=1${query}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player);
  assert.deepEqual((await read()).failedAssets,[]);
}
try{
  await boot();
  let s=await read();assert.equal(s.engine,'flight');assert.equal(s.level,5);
  await shot('boarding');await advance(4800);
  s=await read();assert.equal(s.mode,'flight');assert(s.ship.pilotVisible);
  assert.deepEqual(s.companionsOnboard,{dinio:true,doghost:true,teleportationC:true});
  await shot('lift-off');evidence.boarding=true;
  const y=s.player.y;
  await page.keyboard.down('ArrowUp');await advance(160);s=await read();
  assert(s.player.y<y-15);assert(s.player.velocityY < -250);
  await page.keyboard.up('ArrowUp');await advance(180);s=await read();assert.equal(s.player.velocityY,0);
  const bankBefore=s.ship.bank;
  await page.keyboard.down('ArrowDown');await advance(200);assert((await read()).player.velocityY>250);
  await page.keyboard.up('ArrowDown');await advance(200);
  await page.keyboard.down('KeyW');await page.keyboard.down('KeyD');await advance(200);s=await read();
  assert(Math.hypot(s.player.velocityX,s.player.velocityY)<=343,'Diagonal steering is normalized');
  await page.keyboard.up('KeyW');await page.keyboard.up('KeyD');await advance(200);
  await page.keyboard.down('ArrowLeft');await advance(2000);s=await read();assert.equal(s.player.x,100);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);
  const paused=await read();assert.equal(paused.mode,'paused');await advance(2000);
  assert.equal((await read()).flight.distance,paused.flight.distance);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);assert.equal((await read()).mode,'flight');
  evidence.steering={bankBefore,normalized:true,bounds:true,pause:true};

  // Fresh uninterrupted route. All ship positioning uses real arrow-key steering.
  await boot();await advance(4700);
  await page.keyboard.down('Space');
  let held='';const checkpoints=new Set();let count=0;
  while(count++<1800){
    s=await read();if(s.flight.phase!=='flight')break;
    assert.equal(s.player.lives,3,'The course remains traversable without losing a life');
    checkpoints.add(s.flight.checkpoint);
    const beacon=s.beacons.find(b=>b.x>=s.player.x-125);
    const boss=s.enemies.find(e=>e.kind==='pursuer');
    const target=boss?(boss.phase==='recover'?boss.y-45:boss.move==='barrage'&&['tell','attack'].includes(boss.phase)?boss.safeY:['tell','attack','charge'].includes(boss.phase)?boss.aimY<300?445:165:255):beacon?.y??295;
    const key=s.player.y>target+9?'ArrowUp':s.player.y<target-9?'ArrowDown':'';
    if(key!==held){if(held)await page.keyboard.up(held);if(key)await page.keyboard.down(key);held=key;}
    await advance(100);
    if(s.flight.checkpoint<15300&&(await read()).flight.checkpoint===15300){
      assert.equal((await read()).ship.hull,Math.min(100,s.ship.hull+25));evidence.finalCheckpointRepair=true;
    }
    if(s.flight.distance>7700&&!evidence.orbit){await shot('orbit');evidence.orbit=true;}
    if(s.flight.distance>13500&&!evidence.approach){await shot('void-approach');evidence.approach=true;}
  }
  if(held)await page.keyboard.up(held);
  await page.keyboard.up('Space');
  s=await read();assert.equal(s.flight.phase,'landing');assert.equal(s.player.lives,3);
  assert(checkpoints.has(6000)&&checkpoints.has(11500)&&checkpoints.has(15300));
  assert(s.flight.finaleDefeated,'Landing requires defeating the Pursuer');
  evidence.route={health:s.player.health,lives:s.player.lives,beacons:s.flight.beacons,impacts:s.ship.impacts,kills:s.combat.kills,shots:s.combat.shotsFired};
  assert(s.flight.beacons>=6);
  await page.locator('[data-touch-control="attack"]').dispatchEvent('pointerdown',{pointerId:90,pointerType:'touch',bubbles:true});
  await page.locator('[data-touch-control="up"]').dispatchEvent('pointerdown',{pointerId:91,pointerType:'touch',bubbles:true});
  await advance(2900);s=await read();assert.equal(s.flight.phase,'disembark');await shot('landing');
  await advance(2300);
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).level===6&&JSON.parse(window.render_game_to_text()).player?.grounded);
  s=await read();assert(s.enemies.some(e=>e.bossId==='void_regent'));assert(s.powerups.hasFlameSword);
  assert(!s.touchControls.up&&!s.touchControls.attack,'Landing clears held flight inputs before platforming');
  assert.equal(s.player.lives,3);assert(s.dinio.active&&s.doghost.active&&s.teleportationC.active);
  assert.deepEqual(s.failedAssets,[]);await shot('arrived');evidence.landingAndInventory=true;

  await boot();await advance(9000);s=await read();
  const first=s.obstacles.find(r=>r.id===0);
  assert(first&&first.x<910&&first.x>100);
  await page.evaluate(r=>window.__unknownFlightSetShipPosition(r.x,r.y),first);
  await advance(30);assert.equal((await read()).ship.hull,80,'Contact with a visible asteroid damages the hull');
  assert.equal((await read()).ship.impacts,1);evidence.actualAsteroidCollision=true;

  await boot();await advance(5000);
  // Debug hook deals normal configured collision damage; invulnerability must block repeated hits.
  await page.evaluate(()=>window.__unknownFlightDamageShip());s=await read();assert.equal(s.ship.hull,80);
  await page.evaluate(()=>window.__unknownFlightDamageShip());assert.equal((await read()).ship.hull,80);
  for(let i=0;i<4;i++){await advance(1700);await page.evaluate(()=>window.__unknownFlightDamageShip());}
  s=await read();assert.equal(s.flight.phase,'respawn');assert.equal(s.player.lives,2);
  await advance(1300);s=await read();assert.equal(s.flight.phase,'flight');assert.equal(s.flight.checkpoint,0);assert.equal(s.ship.hull,100);
  evidence.damageAndRespawn=true;

  await boot();await advance(32000);s=await read();
  assert.equal(s.flight.checkpoint,6000);
  while((await read()).flight.phase==='flight'){
    await page.evaluate(()=>window.__unknownFlightDamageShip());
    if((await read()).flight.phase==='flight')await advance(1700);
  }
  assert.equal((await read()).player.lives,2);await advance(1300);s=await read();
  assert.equal(s.flight.checkpoint,6000);assert(s.flight.distance>=6000&&s.flight.distance<6100);
  assert.equal(s.ship.hull,100);assert(s.ship.invulnerable);await shot('checkpoint-recovery');
  evidence.midflightCheckpoint=true;

  await boot('&lives=1');await advance(5000);
  for(let i=0;i<5;i++){
    await page.evaluate(()=>window.__unknownFlightDamageShip());
    if(i<4)await advance(1700);
  }
  assert.equal((await read()).mode,'dying');assert.equal((await read()).player.lives,0);
  await advance(1150);assert.equal((await read()).mode,'gameover');
  await page.getByRole('heading',{name:'Game Over',exact:true}).waitFor({state:'visible'});
  evidence.gameover=true;

  await page.setViewportSize({width:844,height:390});await boot('&character=barrett&unlockRoster=1');await advance(5000);
  assert.equal((await read()).selectedCharacter.id,'barrett');
  assert.equal(await page.locator('[data-touch-control="attack"]').count(),1);
  const down=page.locator('[data-touch-control="down"]');
  await down.dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',bubbles:true});await advance(200);
  assert((await read()).player.velocityY>200);
  await down.dispatchEvent('pointercancel',{pointerId:8,pointerType:'touch',bubbles:true});await advance(200);
  assert.equal((await read()).player.velocityY,0);await page.waitForTimeout(450);await shot('phone-flight');
  evidence.touchAndAlternateHero=true;
  for(const character of ['nico','ezra','teleportation_c']){
    await boot(`&character=${character}&unlockRoster=1`);await advance(5000);
    s=await read();assert.equal(s.selectedCharacter.id,character);assert(s.ship.pilotVisible);assert.deepEqual(s.failedAssets,[]);
  }
  evidence.allFiveHeroes=true;
  await page.setViewportSize({width:1280,height:800});
  await page.goto(`${origin}/?autostart=1&level=6&capture=1&devTools=1&lives=2&sword=1&swordUnlocked=1`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).level===6&&JSON.parse(window.render_game_to_text()).player?.grounded);
  for(let i=1;i<=6;i++)assert.equal(await page.getByRole('button',{name:`L${i}`,exact:true}).count(),1);
  assert.equal((await read()).player.lives,2,'The final platformer does not reset carried lives');
  assert((await read()).pickups.some(p=>p.kind==='gravity'));evidence.sixChapterNavigation=true;
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
