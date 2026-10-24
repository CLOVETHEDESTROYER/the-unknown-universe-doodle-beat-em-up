import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const engine=process.env.GAME_TEST_BROWSER||'chromium';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const device=process.env.GAME_TEST_DEVICE||'iPhone 15 landscape';
const out=new URL(`../output/flight-pressure-v3/${engine}-${device.replaceAll(' ','-')}/`,import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices[device],deviceScaleFactor:1});
const errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const step=async ms=>{await page.evaluate(ms=>window.advanceTime(ms),ms);assert.deepEqual(errors,[]);};
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
async function boot(hero='zgod'){
  await page.goto(`${origin}/?autostart=1&level=5&capture=1&character=${hero}&flightSeed=20261016`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player,null,{timeout:60000});
  await step(4800);assert.deepEqual((await read()).failedAssets,[]);
}
try{
  await boot();const seen=new Map(),captured=new Set();let maxActive=0;
  for(let n=0;n<360;n++){
    const s=await read();maxActive=Math.max(maxActive,s.enemies.length);
    for(const e of s.enemies)if(e.kind!=='pursuer')seen.set(e.id,{kind:e.kind,entry:e.entry});
    const warning=s.combat.entryWarnings[0];
    if(warning&&!captured.has(warning.edge)){
      const foe=s.enemies.find(e=>e.id===warning.id);assert.equal(foe.phase,'incoming');
      const position={x:foe.x,y:foe.y},count=s.combat.enemyShots;
      await shot(warning.edge+'-entry-warning');
      await page.keyboard.press('KeyP');await page.waitForTimeout(60);const paused=await read();
      assert.equal(paused.mode,'paused');await step(700);
      assert.deepEqual((await read()).enemies,paused.enemies);assert.equal((await read()).combat.enemyShots,count);
      await page.keyboard.press('KeyP');await page.waitForTimeout(60);
      await step(100);const incoming=(await read()).enemies.find(e=>e.id===warning.id);
      assert.deepEqual({x:incoming.x,y:incoming.y},position,'Warning holds enemy outside the playfield');
      await step(1350);const arriving=(await read()).enemies.find(e=>e.id===warning.id);
      assert.equal(arriving.phase,'enter');assert(Math.abs(arriving.y-position.y)>40);
      await shot(warning.edge+'-entry-movement');captured.add(warning.edge);
    }
    if(s.enemies.some(e=>e.kind==='interceptor'&&e.phase==='tell')&&!captured.has('charge')){
      const e=s.enemies.find(e=>e.kind==='interceptor'&&e.phase==='tell'),aim=[e.aimX,e.aimY,e.chargeX,e.chargeY];
      await shot('diagonal-charge-warning');await page.evaluate(()=>window.__unknownFlightSetShipPosition(230,475));await step(250);
      const next=(await read()).enemies.find(x=>x.id===e.id);assert.deepEqual([next.aimX,next.aimY,next.chargeX,next.chargeY],aim);captured.add('charge');
    }
    if(s.enemies.some(e=>e.kind==='prism'&&e.phase==='attack')&&!captured.has('prism')){await shot('mixed-prism-wave');captured.add('prism');}
    if(s.flight.finaleStarted){
      assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].kind,'pursuer');assert.equal(s.combat.wavesStarted,13);break;
    }
    await step(200);
  }
  assert.equal(seen.size,28);assert(captured.has('above')&&captured.has('below')&&captured.has('charge'));
  assert((await read()).flight.finaleStarted);assert(maxActive<=9);
  evidence.campaign={ships:seen.size,waves:13,maxActive,entries:[...new Set([...seen.values()].map(e=>e.entry))],warningsPause:true,committedCharge:true,finale:true};

  // Native controls still support simultaneous steering and firing, then release cleanly.
  await boot('xgod');await step(3200);
  const fire=page.getByRole('button',{name:'Hold to fire ship cannons',exact:true}),joystick=page.locator('[data-touch-joystick]');
  const box=await joystick.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await joystick.dispatchEvent('pointerdown',{pointerId:31,pointerType:'touch',button:0,buttons:1,clientX:x,clientY:y});
  await joystick.dispatchEvent('pointermove',{pointerId:31,pointerType:'touch',buttons:1,clientX:x+box.width*.25,clientY:y-box.height*.25});
  await fire.dispatchEvent('pointerdown',{pointerId:32,pointerType:'touch',button:0,buttons:1});await step(200);
  let s=await read();assert(s.player.velocityX>0&&s.player.velocityY<0);assert(s.combat.shotsFired>=2);await shot('thumb-steering-and-firing');
  await joystick.dispatchEvent('pointercancel',{pointerId:31,pointerType:'touch'});await fire.dispatchEvent('pointercancel',{pointerId:32,pointerType:'touch'});
  const shots=s.combat.shotsFired;await step(350);s=await read();assert.equal(s.player.velocityX,0);assert.equal(s.player.velocityY,0);assert.equal(s.combat.shotsFired,shots);
  evidence.touch={simultaneous:true,cancel:true};

  // Enemy plasma actually hurts a normal pilot; killing a heavy still yields its repair.
  await page.evaluate(()=>window.__unknownFlightEnemyTest('gunship',12));await step(50);
  const before=(await read()).player.health;
  for(let n=0;n<80&&(await read()).player.health===before;n++)await step(50);
  assert((await read()).player.health<before);evidence.enemyDamage=true;
  await page.evaluate(()=>window.__unknownFlightEnemyTest('gunship',1));await page.keyboard.down('Space');
  for(let n=0;n<80&&!(await read()).repairs.length;n++)await step(25);
  await page.keyboard.up('Space');s=await read();assert(s.repairs.length);
  assert(s.effects.some(fx=>fx.kind==='destroy'&&fx.source==='gunship'));await shot('moving-heavy-destroyed');
  const repair=s.repairs[0],hull=s.player.health;await page.evaluate(r=>window.__unknownFlightSetShipPosition(r.x,r.y),repair);await step(20);
  assert.equal((await read()).player.health,Math.min(100,hull+15));evidence.heavyKillRepair=true;
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,device,evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,device,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
