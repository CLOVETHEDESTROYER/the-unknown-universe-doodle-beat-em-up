import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {preview} from 'vite';

const server=process.env.GAME_TEST_URL?null:await preview({preview:{host:'127.0.0.1',port:4393,strictPort:true},logLevel:'error'});
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4393';
const out='output/workshop-v1';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],loaded=new Set(),evidence={};
// Keep a restricted test host's external font DNS from delaying local gameplay.
await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);if(r.ok())loaded.add(new URL(r.url()).pathname);});
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const frame=()=>page.locator('.workshop-stage canvas').getAttribute('data-frame').then(Number);
async function sampleFrames(ms=850){
  return page.evaluate(ms=>new Promise(resolve=>{
    const found=new Set(),start=performance.now();
    function tick(){found.add(Number(document.querySelector('.workshop-stage canvas').dataset.frame));if(performance.now()-start>=ms)resolve([...found]);else requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
  }),ms);
}
async function boot(level=1,extra=''){
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});
}
async function wait(fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout '+fn);}

try{
  await page.goto(origin);await page.getByRole('button',{name:'Workshop',exact:true}).click();
  await page.locator('.workshop-stage canvas[data-ready=true]').waitFor();
  assert(await page.locator('dialog').evaluate(d=>d.matches(':modal')));
  const powerNames=['Ink Blaster','Flame Sword','Frost Gauntlet','Ember Boots','Storm Halo','Kai Blaster Arm','Ink Shield','Rapid Fire','Fan Shots','Heat Seekers','Gravity Core','Health Heart','Rush Star'];
  evidence.powerups=[];
  for(const name of powerNames){
    await page.getByRole('button',{name:`Preview ${name}`,exact:true}).click();
    await page.locator('.workshop-stage canvas[data-ready=true]').waitFor();
    const frames=await sampleFrames();assert(frames.length>=3,`${name} animates: ${frames}`);
    const pixels=await page.locator('.workshop-stage canvas').evaluate(c=>[...c.getContext('2d').getImageData(0,0,320,320).data].filter((v,i)=>i%4===3&&v>50).length);
    assert(pixels>500,`${name} has visible art`);evidence.powerups.push({name,frames,pixels});
  }
  await page.getByRole('button',{name:'Preview Frost Gauntlet',exact:true}).click();
  await page.locator('.workshop-stage canvas[data-ready=true]').waitFor();await shot('workshop-powerups-desktop');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const paused=await frame();await page.waitForTimeout(300);assert.equal(await frame(),paused);
  await page.getByRole('button',{name:'Next pose',exact:true}).click();await page.waitForTimeout(60);assert.equal(await frame(),(paused+1)%4);
  const before=await page.locator('.workshop-stage canvas').evaluate(c=>c.toDataURL());
  await page.getByRole('button',{name:'Face left',exact:true}).click();await page.waitForTimeout(60);
  assert.notEqual(await page.locator('.workshop-stage canvas').evaluate(c=>c.toDataURL()),before);
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await page.getByRole('button',{name:'Buddies · 3',exact:true}).click();evidence.buddies=[];
  for(const name of ['Dinio','Doghost','Teleportation C']){
    await page.getByRole('button',{name:`Preview ${name}`,exact:true}).click();
    const actions=page.locator('.workshop-actions button');
    for(let n=0;n<await actions.count();n++){
      await actions.nth(n).click();await page.locator('.workshop-stage canvas[data-ready=true]').waitFor();
      const frames=await sampleFrames(900);assert(frames.length>=3,`${name} action ${n}`);
      evidence.buddies.push({name,action:await actions.nth(n).innerText(),frames});
    }
    await shot(`workshop-${name.toLowerCase().replaceAll(' ','-')}`);
  }
  await page.getByRole('button',{name:'Move',exact:true}).click();await page.locator('.workshop-stage canvas[data-ready=true]').waitFor();await shot('workshop-buddies-desktop');
  await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  assert(await page.getByRole('button',{name:'Workshop',exact:true}).evaluate(b=>document.activeElement===b));
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Workshop',exact:true}).click();
  await page.locator('.workshop-stage canvas[data-ready=true]').waitFor();
  assert(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
  await shot('workshop-phone-portrait');await page.getByRole('button',{name:'Buddies · 3',exact:true}).click();
  await page.getByRole('button',{name:'Preview Doghost',exact:true}).click();await shot('workshop-phone-buddy');
  await page.setViewportSize({width:844,height:390});
  assert(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
  await page.locator('.workshop-stage').scrollIntoViewIfNeeded();await shot('workshop-phone-landscape');
  await page.getByRole('button',{name:'Close workshop',exact:true}).click();
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Workshop',exact:true}).click();
  await page.locator('.workshop-stage canvas[data-ready=true]').waitFor();
  assert(await page.getByRole('button',{name:'Play',exact:true}).isVisible());const reduced=await frame();await page.waitForTimeout(350);assert.equal(await frame(),reduced);
  evidence.pauseStepFacingKeyboardPhoneAndReducedMotion=true;
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:900});
  await boot(1,'&powerupPreview=1');let s=await read();assert(s.powerStations.every(p=>p.texture.startsWith('workshop_')));
  const first=s.powerStations[0],pickupFrames=new Set();
  for(let n=0;n<12;n++){pickupFrames.add((await read()).powerStations[0].frame);await page.waitForTimeout(55);}
  assert(pickupFrames.size>=3);await shot('campaign-animated-blaster');
  await page.keyboard.press('p');s=await wait(s=>s.mode==='paused');const pausedPickups=s.pickups.map(p=>p.frame);await page.waitForTimeout(400);assert.deepEqual((await read()).pickups.map(p=>p.frame),pausedPickups);await page.keyboard.press('p');await wait(s=>s.mode==='platforming');await page.waitForTimeout(200);
  await page.keyboard.down('ArrowRight');await wait(s=>!s.powerStations[0].available);await page.keyboard.up('ArrowRight');assert.equal((await read()).equipment.active,first.kind);
  await boot(1,'&dinio=1&doghost=1&teleportc=1');
  await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));
  await page.waitForTimeout(650);await shot('campaign-all-generated-buddies');
  const seen={dinio:new Set(),doghost:new Set(),teleportationC:new Set()};
  await page.keyboard.down('ArrowRight');for(let n=0;n<20;n++){s=await read();for(const key of Object.keys(seen))seen[key].add(Number(s[key].frame));await page.waitForTimeout(50);}await page.keyboard.up('ArrowRight');
  for(const key of Object.keys(seen))assert(seen[key].size>=3,`${key} moves`);
  // Use the established open firing lane; companions correctly refuse shots
  // through platforms, so a target behind the next ledge is not a damage fixture.
  await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(220,480));await page.waitForTimeout(900);
  await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[180],hp:100}));
  await wait(s=>s.dinio.shots>0&&s.doghost.shots>0&&s.teleportationC.strikes>0);
  await wait(s=>s.dinio.hits>0&&s.doghost.hits>0);await shot('campaign-generated-buddy-attacks');
  await page.keyboard.press('p');s=await wait(s=>s.mode==='paused');await page.waitForTimeout(400);for(const key of Object.keys(seen))assert.deepEqual((await read())[key],s[key]);
  for(const id of ['dinio','doghost','teleportation-c'])assert(loaded.has(`/workshop/v1/${id}.webp`));
  evidence.campaign={pickupFrames:[...pickupFrames],buddyFrames:Object.fromEntries(Object.entries(seen).map(([k,v])=>[k,[...v]])),realDamage:true,pause:true};
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,powerups:evidence.powerups.length,buddyActions:evidence.buddies.length,errors}));
}catch(e){await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),evidence,errors,state:await read().catch(()=>null)},null,2));await shot('failure').catch(()=>{});throw e;}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));}
