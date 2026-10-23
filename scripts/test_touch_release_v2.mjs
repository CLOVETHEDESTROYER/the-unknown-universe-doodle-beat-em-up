import {chromium,webkit,devices} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const engine=process.env.GAME_TEST_BROWSER||'webkit',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1}),errors=[];
page.on('pageerror',e=>errors.push(e.message));const state=()=>page.evaluate(()=>window.__unknownUniverseTouchControls);
const out=new URL(`../output/touch-release-v2/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
try{
 await page.goto(`${origin}/?autostart=1&capture=1&level=3&character=xgod`);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded,{},{timeout:60000});
 await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[]}));
 const stick=page.locator('[data-touch-joystick]'),r=await stick.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+55,y);assert((await state()).axisX>0);
 // Browser delivers release to the window while the joystick never receives its own pointerup.
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'mouse',buttons:0})));
 assert.equal((await state()).axisX,0);assert.equal(await stick.getAttribute('data-active'),null);await page.mouse.up();
 await page.evaluate(()=>{
  const joy=document.querySelector('[data-touch-joystick]'),button=document.querySelector('[data-touch-control="attack"]'),r=joy.getBoundingClientRect();
  joy.dispatchEvent(new PointerEvent('pointerdown',{pointerId:41,pointerType:'touch',button:0,buttons:1,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));
  joy.dispatchEvent(new PointerEvent('pointermove',{pointerId:41,pointerType:'touch',buttons:1,bubbles:true,clientX:r.x+r.width/2+55,clientY:r.y+r.height/2}));
  button.dispatchEvent(new PointerEvent('pointerdown',{pointerId:42,pointerType:'touch',button:0,buttons:1,bubbles:true}));
 });
 assert((await state()).right&&(await state()).attack);
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:41,pointerType:'touch',bubbles:true})));
 assert.equal((await state()).axisX,0);assert.equal((await state()).attack,true,'Canceling movement does not release the other thumb');
 // Native iOS end fallback, without pointerup or lostpointercapture.
 await page.evaluate(()=>{const e=new Event('touchend',{bubbles:true});Object.defineProperty(e,'touches',{value:[]});Object.defineProperty(e,'changedTouches',{value:[]});window.dispatchEvent(e);});
 assert.equal((await state()).attack,false);assert.equal(await page.locator('[data-touch-control="attack"]').getAttribute('data-pressed'),null);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-55,y);assert((await state()).left);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal((await state()).axisX,0);await page.mouse.up();
 const buttons=await page.locator('.touch-actions [data-touch-control]').evaluateAll(nodes=>nodes.map(n=>({control:n.dataset.touchControl,label:n.textContent,blur:getComputedStyle(n).backdropFilter,width:n.getBoundingClientRect().width})));
 assert(!buttons.some(b=>b.control==='shoot'));assert(buttons.every(b=>b.width>=88));assert(buttons.every(b=>b.blur==='none'||b.blur===''));
 await page.screenshot({path:new URL('iphone15.png',out).pathname.replace(/^\/([A-Z]:)/,'$1')});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,engine,missedPointerup:true,independentThumbs:true,nativeTouchEnd:true,pageHide:true,buttons,errors}));
}finally{await browser.close();}
