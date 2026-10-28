import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createAsteroidField} from '../gameplay/flightAsteroids.ts';
const out=new URL('../output/starbreak-destruction-v4/playtest/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=async ms=>{await page.evaluate(ms=>window.advanceTime(ms),ms);assert.deepEqual(errors,[]);};
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownFlightSetShipPosition(x,y),{x,y});
const shot=n=>page.screenshot({path:fileURLToPath(new URL(`${n}.png`,out))});
async function boot(seed=20261016,extra=''){
  for(const k of ['Space','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])await page.keyboard.up(k);
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=5&capture=1${seed===null?'':`&flightSeed=${seed}`}${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player);
  assert.deepEqual((await read()).failedAssets,[]);await advance(4800);
}
async function wait(pred,limit=10000){for(let ms=0;ms<limit;ms+=25){const s=await read();if(pred(s))return s;await advance(25);}throw new Error(`Timeout ${pred}`);}
try{
  for(let seed=0;seed<200;seed++){
    const field=createAsteroidField(seed);
    assert(field.length>=17&&field.length<=36);assert.deepEqual(field,createAsteroidField(seed));
    for(const r of field){assert(r.y>=150&&r.y<=480);assert(r.radius>=29&&r.radius<=56);assert(r.distance>=1650&&r.distance<15100);assert(r.maxHp>=3&&r.maxHp<=6);}
  }
  assert.notDeepEqual(createAsteroidField(1),createAsteroidField(2));evidence.seededFieldSafetyAndVariation=true;
  await boot(null);const seedA=(await read()).flight.asteroidSeed;await boot(null);assert.notEqual((await read()).flight.asteroidSeed,seedA);evidence.freshFlightsRandomize=true;
  await boot();await advance(4200);let s=await read(),r=s.obstacles.find(r=>r.id===0);assert(r);
  await place(r.x-220,r.y-18);const score=s.progress.score;
  await page.keyboard.down('Space');s=await wait(s=>s.obstacles.find(r=>r.id===0)?.hp<r.maxHp,1200);
  assert(s.combat.asteroidHits>=1);await shot('asteroid-damaged');
  s=await wait(s=>s.flight.destroyedAsteroidIds.includes(0),1500);await page.keyboard.up('Space');
  assert(!s.obstacles.some(r=>r.id===0));assert.equal(s.combat.asteroidsDestroyed,1);assert.equal(s.progress.score-score,50);
  assert(s.effects.some(f=>f.kind==='destroy'&&f.source==='asteroid'));assert(s.combat.visibleDebris>=7);
  await shot('asteroid-explosion');await advance(220);s=await read();assert(s.effects.some(f=>f.kind==='destroy'&&f.progress>.2));await shot('asteroid-fragments');
  await place(r.x-100,r.y);const hull=s.ship.hull;await advance(120);assert.equal((await read()).ship.hull,hull,'Destroyed rock has no collision');
  await advance(900);s=await read();assert(!s.effects.some(f=>f.kind==='destroy'&&f.source==='asteroid'));assert.equal(s.combat.asteroidsDestroyed,1);
  evidence.asteroidDamageExplosionScoreAndRemoval=true;

  // Destruction survives retry and does not award the same asteroid twice.
  const seed=s.flight.asteroidSeed;
  while((await read()).flight.phase==='flight'){
    await page.evaluate(()=>window.__unknownFlightDamageShip());if((await read()).flight.phase==='flight')await advance(1700);
  }
  await advance(1300);s=await read();assert.equal(s.flight.asteroidSeed,seed);assert(s.flight.destroyedAsteroidIds.includes(0));assert.equal(s.combat.asteroidsDestroyed,1);
  assert.equal(s.effects.length,0);assert.equal(s.combat.visibleDebris,0);evidence.retryKeepsFieldAndDestroyedRocks=true;
  await boot();const intact=(await read()).flight.totalAsteroids;assert(intact>=17);await advance(4200);s=await read();r=s.obstacles.find(r=>r.id===0);
  await place(r.x,r.y);await advance(20);assert.equal((await read()).ship.hull,80);evidence.intactRockStillDamagesHull=true;

  for(const kind of ['scout','interceptor','gunship']){
    await boot();if(kind==='interceptor')await advance(15000);if(kind==='gunship')await advance(29500);
    s=await wait(s=>s.enemies.some(e=>e.kind===kind&&e.x<950));let target=s.enemies.find(e=>e.kind===kind),id=target.id;
    assert(target.vulnerable,'All regular ships take shots in every phase');
    await place(Math.min(700,target.x-150),Math.max(145,Math.min(475,target.y-18)));await page.keyboard.down('Space');
    let damageOutsideRecovery=false;
    for(let i=0;i<100;i++){
      s=await read();target=s.enemies.find(e=>e.id===id);if(!target)break;
      if(target.hp<target.maxHp&&target.phase!=='recover')damageOutsideRecovery=true;
      await place(Math.max(100,Math.min(700,target.x-150)),Math.max(145,Math.min(475,target.y-18)));await advance(25);
    }
    await page.keyboard.up('Space');s=await read();assert(!s.enemies.some(e=>e.id===id));assert(s.combat.kills>=1);
    assert(s.effects.some(f=>f.kind==='destroy'&&f.source===kind));assert(s.combat.visibleDebris>=7);
    if(kind==='gunship'){assert(damageOutsideRecovery);assert(s.repairs.length>0);}
    await shot(`${kind}-explosion`);evidence[`${kind}Destruction`]=true;
  }
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);const paused=await read();await advance(600);s=await read();assert.deepEqual(s.effects,paused.effects);assert.deepEqual(s.obstacles,paused.obstacles);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);evidence.pauseFreezesFloatingAndExplosions=true;
  await page.setViewportSize({width:844,height:390});await boot();await advance(4200);s=await read();r=s.obstacles.find(r=>r.id===0);await place(r.x-200,r.y-18);
  const fire=page.getByRole('button',{name:'Hold to fire ship cannons',exact:true});await fire.dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',bubbles:true});
  await wait(s=>s.combat.asteroidsDestroyed>=1,1700);await shot('phone-rock-explosion');await fire.dispatchEvent('pointercancel',{pointerId:7,pointerType:'touch',bubbles:true});
  evidence.touchAsteroidDestruction=true;
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
