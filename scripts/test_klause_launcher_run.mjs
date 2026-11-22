import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4191';
const out=process.env.GAME_TEST_OUTPUT||'output/klause-launcher-run';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.GAME_TEST_BROWSER?{executablePath:process.env.GAME_TEST_BROWSER}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],passed=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(predicate,timeout=12000){
  const end=Date.now()+timeout;
  while(Date.now()<end){const s=await read();if(predicate(s))return s;await page.waitForTimeout(16)}
  throw Error('Timed out: '+predicate+'\n'+JSON.stringify(await read()));
}
async function boot(level=1){
  await page.goto(origin+`/?autostart=1&capture=1&code=SantaKisComing&level=${level}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).killerKlause);
  await wait(s=>s.player.grounded);
  await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));
}
async function shotCapture(name){
  // Copy the actual rendered canvas before the fast-moving shot leaves view.
  const data=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'));
  await fs.writeFile(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
}
function record(name){passed.push(name);console.log('PASS '+name)}
try{
  await boot();
  // A released single press must still resolve after the firing windup.
  await page.keyboard.press('c');
  let s=await wait(s=>s.killerKlause.shots===1&&s.projectiles.some(p=>p.pattern==='present_rocket'));
  const first=s.projectiles.find(p=>p.pattern==='present_rocket');
  assert.equal(first.texture,'klause_fx');assert(first.width>=140);assert(first.velocityX>0);
  await shotCapture('present-right');
  // The old implementation silently discarded this tap during reload.
  await page.keyboard.press('c');await wait(s=>s.killerKlause.fireQueued);
  await page.keyboard.press('p');await wait(s=>s.mode==='paused');
  const frozen=(await read()).killerKlause.cooldownRemainingMs;
  await page.waitForTimeout(250);assert.equal((await read()).killerKlause.cooldownRemainingMs,frozen);
  await page.keyboard.press('p');
  await wait(s=>s.killerKlause.shots===2);
  await page.waitForTimeout(1150);assert.equal((await read()).killerKlause.shots,2);
  record('single C press renders a present; reload tap queues exactly one shot and survives pause');

  await boot();
  await page.locator('[data-touch-control="shoot"]').click();
  await wait(s=>s.killerKlause.shots===1&&s.projectiles.some(p=>p.pattern==='present_rocket'));
  await shotCapture('present-fire-button');
  await page.locator('[data-touch-control="shoot"]').click();
  await wait(s=>s.killerKlause.shots===2);
  record('quick on-screen FIRE clicks launch presents and queue through reload');

  await boot();await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(360,480));
  await page.keyboard.down('ArrowLeft');await wait(s=>s.player.facing==='left');
  await page.keyboard.up('ArrowLeft');await page.keyboard.press('c');
  s=await wait(s=>s.projectiles.some(p=>p.pattern==='present_rocket'));
  assert(s.projectiles.find(p=>p.pattern==='present_rocket').velocityX<0);
  await shotCapture('present-left');record('left-facing launcher visibly fires to the left');

  await boot();await page.keyboard.down('c');await wait(s=>s.killerKlause.shots===2);
  await page.keyboard.up('c');await page.waitForTimeout(1300);
  assert.equal((await read()).killerKlause.shots,2);record('held FIRE repeats and release stops without an unwanted extra shot');

  await boot();await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',5));
  await page.keyboard.press('c');await wait(s=>s.enemyDeaths.length>0);
  record('visible present still hits and defeats an actual enemy');

  await boot();await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(90,480));
  // Sample every rendered frame in the clear opening lane, including the live
  // run art, instead of only asserting a movement distance or shot counter.
  const sample=page.evaluate(()=>new Promise(resolve=>{
    const start=performance.now(),seen=new Map(),frames=[];
    const sampleFrame=()=>{
      const s=JSON.parse(window.render_game_to_text()),p=s.player;
      if(p.texture==='klause_run'){
        frames.push({x:p.x,bottom:p.bodyBottom,frame:p.frame,vx:p.velocityX,scale:p.visualScale});
        if(!seen.has(p.frame)){
          const canvas=document.querySelector('canvas'),tile=document.createElement('canvas');tile.width=230;tile.height=225;
          tile.getContext('2d').drawImage(canvas,p.x-110,p.bodyBottom-210,230,225,0,0,230,225);
          seen.set(p.frame,tile.toDataURL());
        }
      }
      if(performance.now()-start<850)requestAnimationFrame(sampleFrame);
      else resolve({frames,images:[...seen.entries()]});
    };requestAnimationFrame(sampleFrame);
  }));
  await page.keyboard.down('ArrowRight');
  const running=await sample;await page.keyboard.up('ArrowRight');
  assert.equal(running.images.length,8,'all eight run poses appear during actual movement');
  assert(running.frames.at(-1).x-running.frames[0].x>150);
  assert.equal(new Set(running.frames.map(p=>p.bottom)).size,1,'fixed collider and floor through all poses');
  assert.equal(new Set(running.frames.map(p=>p.scale)).size,1,'shared scale through all poses');
  for(const [frame,data] of running.images)await fs.writeFile(path.join(out,`run-${frame}.png`),Buffer.from(data.split(',')[1],'base64'));
  await wait(s=>Math.abs(s.player.velocityX)<1&&s.player.texture==='klause_body');
  record('eight distance-driven run frames, steady floor/scale and clean return to idle');

  await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(100,480));
  await page.keyboard.down('ArrowRight');await page.keyboard.down('c');
  await wait(s=>s.killerKlause.active&&s.player.texture==='klause_run');
  await wait(s=>s.projectiles.some(p=>p.pattern==='present_rocket')&&s.player.texture==='klause_run');
  await shotCapture('running-fire');await page.keyboard.up('c');await page.keyboard.up('ArrowRight');
  await page.keyboard.press('z');await wait(s=>!s.player.grounded&&s.player.texture==='klause_body');
  await wait(s=>s.player.grounded);record('running fire keeps leg animation; jump and landing retain their own poses');

  await page.setViewportSize({width:844,height:390});await boot();
  await page.locator('[data-touch-control="shoot"]').click();await wait(s=>s.projectiles.some(p=>p.pattern==='present_rocket'));
  await page.screenshot({path:path.join(out,'phone-fire.png')});record('phone landscape FIRE launches a visible present');
  await page.goto(origin+'/?autostart=1&capture=1&code=SantaKisComing&level=5');
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight');
  record('Starbreak boarding loads the new run sheet');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed,errors,run:running.frames},null,2));
}finally{await browser.close()}
