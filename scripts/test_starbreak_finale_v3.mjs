import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/starbreak-finale-v3/playtest/',import.meta.url);
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
const boss=s=>s.enemies.find(e=>e.kind==='pursuer');
async function boot(extra=''){
  await page.keyboard.up('Space');
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=5&capture=1&flightFinale=1${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player);
  assert.deepEqual((await read()).failedAssets,[]);
}
async function wait(pred,limit=10000){
  for(let ms=0;ms<limit;ms+=50){let s=await read();if(pred(s))return s;await advance(50);}
  throw new Error(`Timeout: ${pred}`);
}
try{
  await boot();assert.equal((await read()).flight.checkpoint,15300);
  let s=await wait(s=>boss(s)?.phase==='tell'),e=boss(s);
  assert.equal(e.maxHp,28);assert.equal(e.visualFrame,1);
  const travel=s.flight.travel;
  await place(650,e.y-45);await page.keyboard.down('Space');await advance(350);
  s=await read();assert.equal(boss(s).hp,28);assert(s.combat.guardedHits>0);
  assert.equal(s.flight.distance,15400);assert(s.flight.travel>travel);
  await page.keyboard.up('Space');await place(240,445);await shot('guarded-fan');
  evidence.guardAndScrolling=true;

  await page.keyboard.press('KeyP');await page.waitForTimeout(80);
  const paused=await read();await advance(1500);s=await read();
  assert.equal(s.mode,'paused');assert.deepEqual(s.enemies,paused.enemies);assert.equal(s.flight.travel,paused.flight.travel);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);evidence.pause=true;

  const seen=new Set(),frames=new Set();let recovery='',hpAtStart=28,opening=null,oldPhase='';
  for(let i=0;i<750;i++){
    s=await read();e=boss(s);if(!e)break;
    assert.equal(s.player.lives,3);
    frames.add(e.visualFrame);
    const key=`${e.phaseNumber}:${e.move}`;
    if(e.phase==='tell'){
      seen.add(key);
      const mark={x:e.aimX,y:e.aimY};await place(240,e.aimY<300?445:165);
      await advance(60);const next=boss(await read());
      if(next?.phase==='tell'){assert.equal(next.aimX,mark.x);assert.equal(next.aimY,mark.y);}
      if(!evidence[`warning-${key}`]){await shot(`warning-${key.replace(':','-')}`);evidence[`warning-${key}`]=true;}
    }else if(e.phase==='recover'){
      if(oldPhase!=='recover'){
        recovery=`${e.phaseNumber}:${e.attacks}`;hpAtStart=e.hp;opening={phase:e.phaseNumber,first:e.phaseMs};
        await shot(`opening-${recovery.replace(':','-')}`);
      }
      assert.equal(e.visualFrame,0);assert(e.vulnerable);
      if(hpAtStart-e.hp<6&&e.phaseMs<1300){await place(675,255);await page.keyboard.down('Space');}
      else{await page.keyboard.up('Space');await place(240,165);}
      if(e.phaseNumber===1&&e.hp<=14){assert.equal(e.phase,'recover');evidence.fullHalfHealthOpening=true;}
    }else{
      await page.keyboard.up('Space');
      await place(240,e.aimY<300?445:165);
      if(e.phase==='transition'){
        assert(opening&&opening.phase===1);evidence.protectedPhaseChange=true;
      }
      if(e.phase==='dying'){
        assert.equal(e.visualFrame,2);assert.equal(s.projectiles.filter(p=>p.enemyProjectile).length,0);
        assert.equal(s.flight.finaleDefeated,false);await shot('defeat');
        const score=s.progress.score;await advance(1600);s=await read();
        assert(s.flight.finaleDefeated);assert(!boss(s));assert.equal(s.progress.score,score);
        evidence.defeatAnimationAndCleanup=true;break;
      }
    }
    oldPhase=e.phase;await advance(80);
  }
  assert.deepEqual([...seen].sort(),['1:fan','1:sweep','2:fan','2:sweep']);
  assert.deepEqual([...frames].sort(),[0,1,2]);assert(evidence.fullHalfHealthOpening&&evidence.protectedPhaseChange);
  s=await read();assert(s.flight.finaleDefeated);assert.equal(s.combat.kills,1);assert(s.combat.enemyShots>=13);
  evidence.patternsBothPhases=true;
  await advance(8000);s=await read();assert(['landing','disembark'].includes(s.flight.phase));await shot('cleared-approach');
  await advance(5000);await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).level===6&&JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.equal((await read()).player.lives,3);evidence.landing=true;

  await boot();await wait(s=>boss(s)?.phase==='tell');await place(240,165);
  for(let i=0;i<8&&(await read()).flight.phase==='flight';i++){
    await page.evaluate(()=>window.__unknownFlightDamageShip());if((await read()).flight.phase==='flight')await advance(1700);
  }
  s=await read();assert.equal(s.flight.phase,'respawn');assert.equal(s.enemies.length,0);assert.equal(s.projectiles.length,0);
  await advance(1300);s=await read();assert.equal(s.flight.checkpoint,15300);assert.equal(s.ship.hull,100);assert.equal(s.player.lives,2);
  s=await wait(s=>!!boss(s));assert.equal(boss(s).hp,28);evidence.finalCheckpointRetry=true;

  await page.setViewportSize({width:844,height:390});await boot();await wait(s=>boss(s)?.phase==='tell');
  await place(240,445);await page.waitForTimeout(450);await shot('phone-boss');
  const fire=page.locator('[data-touch-control="attack"]'),up=page.locator('[data-touch-control="up"]');
  await fire.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',bubbles:true});
  await up.dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',bubbles:true});
  const before=await read();await advance(180);s=await read();assert(s.player.y<before.player.y);assert(s.combat.shotsFired>before.combat.shotsFired);
  for(const [loc,id] of [[fire,1],[up,2]])await loc.dispatchEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true});
  evidence.phoneAndTouch=true;
  await page.setViewportSize({width:1280,height:800});
  for(const [difficulty,hp,damage] of [['HARD',36,14],['X-GOD',44,18]]){
    await boot(`&difficulty=${difficulty}`);
    s=await wait(s=>boss(s)?.phase==='tell');assert.equal(boss(s).maxHp,hp);
    await place(240,445);s=await wait(s=>s.projectiles.some(p=>p.enemyProjectile));
    const bolt=s.projectiles.find(p=>p.enemyProjectile);assert.equal(bolt.damage,damage);
    await place(bolt.x-70,bolt.y);const hull=(await read()).ship.hull;await advance(150);
    assert.equal((await read()).ship.hull,hull-damage);
  }
  evidence.difficultyScaling=true;
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
