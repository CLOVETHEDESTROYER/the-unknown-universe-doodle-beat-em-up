import {chromium, devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4387';
const out=process.env.GAME_TEST_OUTPUT||'output/turkey-king-v3/storm';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[], evidence=[];
let context,page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const storm=s=>s.turkeyKing?.storm;
async function wait(fn,ms=10000){
  const end=Date.now()+ms;
  while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(20);}
  throw Error('Timeout '+fn);
}
async function boot(options={}){
  await context?.close();
  context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,...options});
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(origin+'/?autostart=1&level=1&capture=1&character=turkey_king&code=allhailking');
  await wait(s=>s.player?.grounded&&storm(s),60000);
}
const shot=name=>page.screenshot({path:path.join(out,name+'.png')});
try{
  await boot();let s=await read();assert.equal(storm(s).uses,0);assert.equal(storm(s).spawned,0);
  assert.equal(s.selectedCharacter.standingHeight,208);
  await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',40));
  await page.keyboard.press('x',{delay:25});
  s=await wait(s=>storm(s).lightning);assert.equal(s.player.texture,'turkey_king_storm');await shot('staff-lightning');
  s=await wait(s=>storm(s).wave===1);assert.equal(storm(s).spawned,3);
  await page.keyboard.press('p');s=await wait(s=>s.mode==='paused');
  const paused=storm(s);await page.waitForTimeout(300);assert.deepEqual(storm(await read()),paused);
  await page.keyboard.press('p');await wait(s=>s.mode==='platforming');
  s=await wait(s=>storm(s).wave===2);assert.equal(storm(s).spawned,6);await shot('rain-wave');
  s=await wait(s=>storm(s).wave===3);assert.equal(storm(s).spawned,10);
  await wait(s=>storm(s).bursts>0);await shot('fried-wing-explosion');
  s=await wait(s=>!storm(s).active);
  assert(storm(s).bounces>=1);assert(storm(s).explosions>=7);assert(storm(s).hits>0,'Storm damages a real enemy');
  assert(s.enemies[0].hp<40);assert.equal(storm(s).lightning,false);assert.equal(storm(s).wings,0);
  await page.keyboard.press('x');assert.equal(storm(await read()).uses,1,'Cooldown blocks repeat');
  evidence.push({waves:[3,3,4],storm:storm(s),pauseFreezesAllEffects:true,realDamage:40-s.enemies[0].hp});
  await wait(s=>storm(s).cooldownRemainingMs===0,14000);
  await page.keyboard.down('x');await wait(s=>storm(s).uses===2);await page.waitForTimeout(400);
  await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(200));await page.keyboard.up('x');
  s=await wait(s=>s.player.lives<3);assert.equal(storm(s).active,false);assert.equal(storm(s).lightning,false);
  evidence.push({cooldownExpires:true,deathClearsStorm:true});

  await boot({...devices['iPhone 13'],viewport:{width:844,height:390},deviceScaleFactor:1,reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Throw a turkey',exact:true}).click();await wait(s=>s.turkeyKing.throws===1);
  await wait(s=>!s.turkeyKing.active);await page.getByRole('button',{name:'Special: Royal Turkey Storm',exact:true}).click();
  await wait(s=>storm(s).lightning);await shot('phone-storm');
  s=await wait(s=>storm(s).spawned===10);assert.equal(storm(s).uses,1);
  evidence.push({phoneToss:true,phoneStorm:true,reducedMotionLoads:true});
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),state:await read().catch(()=>null),errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
