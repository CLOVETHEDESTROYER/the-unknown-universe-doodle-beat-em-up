import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
// Browser runtime plugin is unavailable; use repository Playwright.
const engine=process.env.GAME_TEST_BROWSER||'chromium', origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4384';
const out=`output/phone-dpad-v1/${engine}`;await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});const errors=[],results=[];
function overlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
try{
 for(const [device,level,character] of [['iPhone 15 landscape',1,'xgod'],['iPhone SE landscape',1,'killer_kai'],['Pixel 7 landscape',5,'xgod'],['iPad Pro 11 landscape',1,'xgod']]){
  const context=await browser.newContext({...devices[device],deviceScaleFactor:1});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/?autostart=1&capture=1&level=${level}&character=${character}&unlockRoster=1`);
  await page.waitForFunction(()=>{try{return !!JSON.parse(window.render_game_to_text()).player;}catch{return false;}},null,{timeout:60000});
  await page.getByRole('status',{name:'Loading game',exact:true}).waitFor({state:'hidden'});
  if(level===5)await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).flight?.phase==='flight');
  const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));const controls=()=>page.evaluate(()=>window.__unknownUniverseTouchControls);
  const dpad=page.locator('[data-touch-dpad]'),rect=await dpad.boundingBox(),canvas=await page.locator('canvas').boundingBox();
  assert.equal(await page.locator('[data-touch-joystick]').count(),0);
  const mobilePhone=device!=='iPad Pro 11 landscape';
  if(mobilePhone){assert(!overlap(rect,canvas),'D-pad must stay outside playfield');for(const button of await page.locator('.touch-actions .touch-control').all()){const box=await button.boundingBox();assert(!overlap(box,canvas),'Action button must stay outside playfield');assert(box.width>=44&&box.height>=44);}}
  await page.screenshot({path:`${out}/${device.replaceAll(' ','-')}-start.png`});
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  await page.mouse.move(x+rect.width/3,y);await page.mouse.down();assert.equal((await controls()).axisX,1);
  const initial=await read();await page.waitForTimeout(320);const moved=await read();assert(moved.player.x>initial.player.x+10,'Right key moves the hero/ship');
  await page.mouse.move(x-rect.width/3,y);assert.equal((await controls()).axisX,-1);
  await page.mouse.move(x,y);assert.equal((await controls()).axisX,0,'Center is neutral');
  await page.mouse.move(x+rect.width/3,y-rect.height/3);assert((await controls()).up&&(await controls()).right,'Diagonal holds two directions');
  await page.mouse.up();assert.equal((await controls()).axisX,0);assert.equal((await controls()).axisY,0);assert.equal(await dpad.locator('[data-pressed]').count(),0);
  // Two independent thumbs, plus canceling only one of them.
  await page.evaluate(()=>{
   const pad=document.querySelector('[data-touch-dpad]'),r=pad.getBoundingClientRect(),fire=document.querySelector('.touch-actions [data-touch-control="attack"]');
   pad.dispatchEvent(new PointerEvent('pointerdown',{pointerId:21,pointerType:'touch',buttons:1,button:0,bubbles:true,clientX:r.right-10,clientY:r.y+r.height/2}));
   fire.dispatchEvent(new PointerEvent('pointerdown',{pointerId:22,pointerType:'touch',buttons:1,button:0,bubbles:true}));
  });assert((await controls()).right&&(await controls()).attack);
  await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:21,pointerType:'touch',bubbles:true})));assert.equal((await controls()).axisX,0);assert.equal((await controls()).attack,true);
  await page.keyboard.press('p');await page.getByRole('heading',{name:'Game Paused',exact:true}).waitFor();assert.equal((await controls()).attack,false);assert.equal(await dpad.locator('[data-pressed]').count(),0);
  await page.getByRole('button',{name:'Resume Playing',exact:true}).click();
  if(mobilePhone&&level!==5){
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).player.grounded);
   const before=(await read()).player.y;const jump=page.locator('.touch-actions [data-touch-control="jump"]');const box=await jump.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(150);assert((await read()).player.y<before-10,'Jump action works with D-pad layout');
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);assert.equal((await controls()).axisX,0);await page.setViewportSize(devices[device].viewport);await page.waitForTimeout(150);assert.equal((await read()).selectedCharacter.id,character);
  }
  assert.deepEqual((await read()).failedAssets,[]);results.push({device,level,character,canvas,rect,phoneControlsOutsideCanvas:mobilePhone,movement:true,diagonal:true,independentThumbs:true,pauseReset:true});await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,engine,devices:results.length,errors}));
}finally{await browser.close();}
