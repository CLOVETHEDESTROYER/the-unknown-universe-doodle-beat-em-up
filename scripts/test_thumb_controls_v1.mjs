import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const engine=process.env.GAME_TEST_BROWSER||'chromium',device=process.env.GAME_TEST_DEVICE||'iPhone 13 landscape';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const out=new URL(`../output/thumb-controls-v1/${engine}-${device.replaceAll(' ','-')}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const context=await browser.newContext({...devices[device],deviceScaleFactor:1});const page=await context.newPage();
const errors=[],evidence=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const touch=()=>page.evaluate(()=>window.__unknownUniverseTouchControls);
const stick=()=>page.locator('[data-touch-joystick]');const button=k=>page.locator(`[data-touch-control="${k}"]`);
const move=s=>s.movement.xgodMobility??s.movement.zgodMobility;
const place=(x=1160,y=520)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const empty=()=>page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));
async function wait(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(15);}throw Error(`Timeout ${fn}`);}
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
async function boot(level=3,hero='xgod',extra=''){
 await page.mouse.up();await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=${hero}&unlockRoster=1&sword=1${extra}`);
 await page.waitForFunction(l=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player&&(l===5||JSON.parse(window.render_game_to_text()).player.grounded),level,{timeout:60000});assert.deepEqual((await read()).failedAssets,[]);
}
async function drag(x,y){const r=await stick().boundingBox();const cx=r.x+r.width/2,cy=r.y+r.height/2;await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+x*r.width*.29,cy+y*r.height*.29);return {cx,cy,r};}
async function layout(label){
 await page.waitForFunction(()=>Math.abs(document.querySelector('.game-app-shell').getBoundingClientRect().height-innerHeight)<2);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const v=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,radius:getComputedStyle(e).borderRadius};};return {width:innerWidth,height:innerHeight,stick:rect(document.querySelector('[data-touch-joystick]')),buttons:[...document.querySelectorAll('.touch-actions [data-touch-control]')].map(e=>({key:e.dataset.touchControl,...rect(e)}))};});
 assert(v.stick.w>=140&&v.stick.w===v.stick.h);for(const b of v.buttons){assert(b.w>=76&&b.w===b.h,`${label} ${b.key} ${b.w}x${b.h}`);assert.equal(b.radius,'50%');assert(b.x>=0&&b.y>=36&&b.x+b.w<=v.width+1&&b.y+b.h<=v.height+1);assert(b.x>=v.stick.x+v.stick.w+24,'Thumb clusters are separate');}
 for(let i=0;i<v.buttons.length;i++)for(let j=i+1;j<v.buttons.length;j++){const a=v.buttons[i],b=v.buttons[j];assert(a.x+a.w+9<=b.x||b.x+b.w+9<=a.x||a.y+a.h+9<=b.y||b.y+b.h+9<=a.y,'Separate hit targets');}
 evidence.push({layout:label,...v});await shot(label);
}
try{
 await boot();await empty();await place();await layout('phone-idle');
 await drag(.1,0);await page.waitForTimeout(60);assert.equal((await touch()).axisX,0,'Dead zone');await page.mouse.up();
 await drag(.55,0);let s=await wait(s=>s.player.velocityX>100&&s.player.velocityX<230);const slow=s.player.velocityX;await page.mouse.up();await wait(s=>s.player.velocityX===0);
 await drag(1,0);s=await wait(s=>s.player.velocityX>=340);assert(s.player.velocityX>slow);const x=s.player.x;await button('attack').tap();await wait(s=>s.weapon.fireBlades.fired>0);assert((await touch()).right,'Other thumb does not release the stick');await button('jump').tap();await wait(s=>!s.player.grounded);await shot('two-thumb-jump');await page.mouse.up();s=await wait(s=>s.player.grounded);assert(s.player.x>x);evidence.push({analogWalkAndRun:true,steerAttackAndJump:true});
 await place();const r=await drag(-1,0);await wait(s=>s.player.velocityX<0);await page.mouse.move(r.cx-r.r.width, r.cy);assert((await touch()).left,'Captured outside base');await page.mouse.up();await wait(s=>s.player.velocityX===0);assert.equal((await touch()).axisX,0);assert.equal(await stick().getAttribute('data-active'),null);evidence.push({reverseCaptureAndRelease:true});
 await drag(0,1);await wait(s=>s.player.crouching);await page.mouse.up();await wait(s=>!s.player.crouching);evidence.push({joystickCrouch:true});
 for(const hero of ['xgod','zgod']){
  await boot(3,hero);await empty();await place();
  const p=await button('jump').boundingBox();await page.mouse.move(p.x+p.width/2,p.y+p.height/2);await page.mouse.down();await wait(s=>!s.player.grounded);await wait(s=>s.player.grounded);assert.equal(move(await read()).doubleJumps,0,'Holding J does not auto-combo');await page.mouse.up();
  await button('jump').tap();await wait(s=>!s.player.grounded);await button('jump').tap();await wait(s=>move(s).doubleJumps===1);await button('jump').tap();await wait(s=>move(s).bombs===1);await shot(hero+'-third-tap-slam');
  await wait(s=>move(s).impacts===1&&move(s).bombPhase==='ready');assert(move(await read()).doubleJumpAvailable);await button('jump').tap();await wait(s=>!s.player.grounded);assert.equal(move(await read()).doubleJumps,1,'Landing resets the chain');
  await drag(0,1);await wait(s=>move(s).bombs===2);await page.mouse.up();await wait(s=>move(s).impacts===2);evidence.push({hero,holdDoesNotChain:true,jumpDoubleSlam:true,landingResets:true,manualSlam:true});
 }
 await boot();await empty();await place();await drag(1,0);await page.keyboard.press('p');await wait(s=>s.mode==='paused');assert.equal((await touch()).axisX,0);assert.equal(await stick().getAttribute('data-active'),null);assert.equal(await button('jump').isVisible(),false);await page.mouse.up();await page.getByRole('button',{name:'Resume Playing'}).click();await wait(s=>s.mode==='platforming');await wait(s=>s.player.velocityX===0);evidence.push({pauseReleases:true});
 await drag(1,0);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await touch()).axisX,0);assert.equal(await stick().getAttribute('data-active'),null);await page.mouse.up();
 await drag(1,0);const old=page.viewportSize();await page.setViewportSize({width:old.width-10,height:old.height});await page.waitForTimeout(100);assert.equal((await touch()).axisX,0);await page.mouse.up();await page.setViewportSize(old);evidence.push({blurResizeRelease:true});
 // Extra secondary buttons, tablet space and small phones use the same round targets.
 await boot(3,'teleportation_c');await layout('recall-layout');await boot(3,'nico');await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));await button('attack').waitFor();assert.equal(await button('shoot').count(),0,'One clear FIRE button replaces duplicate shoot buttons');assert.equal((await button('attack').innerText()).trim(),'FIRE');await layout('shoot-layout');
 await page.setViewportSize({width:1194,height:834});await boot();await layout('ipad-landscape');assert((await button('jump').boundingBox()).width>=104);
 await page.setViewportSize({width:834,height:1194});await layout('ipad-portrait');const canvas=await page.locator('canvas').boundingBox();const j=await stick().boundingBox();assert(canvas.y+canvas.height<=j.y,'Portrait tablet leaves room below game');
 await page.setViewportSize({width:568,height:320});await layout('small-phone');
 await page.setViewportSize({width:844,height:390});await boot(5);await layout('flight');await page.evaluate(()=>window.advanceTime(5000));s=await wait(s=>s.flight.phase==='flight');const y=s.player.y;
 await drag(.7,-.7);await page.evaluate(()=>window.advanceTime(180));s=await read();assert(s.touchControls.right&&s.touchControls.up);assert(s.player.y<y);await page.mouse.up();evidence.push({flightDiagonal:true});
 await boot(3,'xgod','&autoRun=1');assert.equal(await stick().count(),0);assert((await button('down').boundingBox()).width>=76);await shot('auto-run');evidence.push({autoRunRetained:true});
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(`${engine} ${device}: PASS joystick, two-thumb actions, jump/double/slam, phone/tablet layouts, cleanup and flight.`);
}catch(e){await shot('failure').catch(()=>{});await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),touch:await touch().catch(()=>null),evidence,errors},null,2));throw e;}finally{await browser.close();}
