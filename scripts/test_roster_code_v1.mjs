import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Browser plugin skill is unavailable; use the project's installed Playwright.
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const out=new URL(`../output/roster-code-v1/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const code=['up','down','up','down','left','right','left'],key='unknownUniverse.xGodClear.v1';
const arrows={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
const errors=[],evidence=[];let page;
async function fresh(device='Desktop Chrome',size){
  const context=await browser.newContext({...devices[device],deviceScaleFactor:1,...size?{viewport:size}:{}});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  return context;
}
const start=()=>page.getByRole('button',{name:'Start game',exact:true}).click();
const stored=()=>page.evaluate(key=>localStorage.getItem(key),key);
const locked=()=>page.locator('[data-character-id]:disabled').count();
const press=async directions=>{for(const direction of directions)await page.keyboard.press(arrows[direction]);};
const tap=async directions=>{for(const direction of directions)await page.getByRole('button',{name:`Code direction: ${direction}`,exact:true}).tap();};
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
const allReady=async()=>{await page.getByRole('status').filter({hasText:'Secret code accepted!'}).waitFor();assert.equal(await locked(),0);assert.equal(await page.locator('[data-character-id]:enabled').count(),7);await page.waitForTimeout(250);};
try{
  let context=await fresh();await page.goto(origin+'/?capture=1');
  await press(code);assert.equal(await stored(),null,'Title inputs cannot unlock the roster');
  await start();assert.equal(await locked(),5);
  await press(['up','down','up','down']);await page.getByRole('button',{name:'Back',exact:true}).click();await start();
  await press(code.slice(4));assert.equal(await locked(),5,'Leaving selection resets a partial code');
  await press(['up','down','up','down','right','left','left']);assert.equal(await locked(),5,'Wrong order cannot unlock');
  await press(['up','down','up']);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await press(code.slice(3));assert.equal(await locked(),5,'Blur resets a partial code');
  await press(['up']);
  for(let n=0;n<8;n++)await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',repeat:true,bubbles:true,cancelable:true})));
  assert.equal(await locked(),5,'Holding a direction never supplies repeated code steps');
  await press(code.slice(1));await allReady();assert.equal(await stored(),'true');await shot('desktop-accepted');
  await page.reload();await start();assert.equal(await locked(),0);assert.equal(await page.locator('.roster-code-pad').count(),0);
  await page.locator('[data-character-id="killer_kai"]').click();
  await page.getByRole('button',{name:'Skip story',exact:true}).click();
  await page.waitForFunction(()=>{try{const s=JSON.parse(window.render_game_to_text());return s.mode==='platforming'&&s.player?.grounded;}catch{return false;}},null,{timeout:60000});
  let state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));assert.equal(state.selectedCharacter.id,'killer_kai');assert.deepEqual(state.failedAssets,[]);
  const startX=state.player.x;await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));assert(state.player.x>startX+10,'The code-unlocked hero can actually play after the intro');await shot('code-unlocked-kai-gameplay');
  await fs.writeFile(new URL('kai-state.json',out),JSON.stringify(state,null,2));
  evidence.push({desktop:true,wrongOrder:true,screenReset:true,blurReset:true,ignoreRepeat:true,persisted:true,actualKaiRun:true});await context.close();

  for(const [device,size] of [['iPhone 15 landscape'],['iPhone 15 landscape',{width:734,height:290}],['iPhone 15'],['iPad Pro 11 landscape']]){
    context=await fresh(device,size);await page.goto(origin+'/?capture=1');await start();assert.equal(await locked(),5);
    const name=device.replaceAll(' ','-')+(size?'-short':'');
    for(const direction of ['up','down','left','right']){
      const box=await page.getByRole('button',{name:`Code direction: ${direction}`,exact:true}).boundingBox(),viewport=page.viewportSize();
      assert(box.width>=44&&box.height>=44);assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height);
    }
    const card=await page.locator('[data-character-id="xgod"]').boundingBox();assert(card.y>=0&&card.y+card.height<=page.viewportSize().height,'The full character card still fits');
    await shot(name+'-locked');
    await tap(['up','down','up','down','right','left','left']);assert.equal(await locked(),5,'Wrong touch order stays locked');
    await page.keyboard.press('ArrowUp');await tap(code.slice(1));await allReady();assert.equal(await stored(),'true');
    const readyCard=await page.locator('[data-character-id="xgod"]').boundingBox();assert(readyCard.y>=0&&readyCard.y+readyCard.height<=page.viewportSize().height,'Confirmation leaves full cards visible');await shot(name+'-accepted');
    const roster=page.getByRole('group',{name:'Choose a character'});if(device.includes('iPhone')){
      await roster.evaluate(node=>node.scrollLeft=node.scrollWidth);await page.waitForTimeout(180);assert(await roster.evaluate(node=>node.scrollLeft>0));
    }
    await page.locator('[data-character-id="killer_kai"]').scrollIntoViewIfNeeded();assert(await page.locator('[data-character-id="killer_kai"]').isEnabled());await shot(name+'-kai-ready');
    await page.reload();await start();assert.equal(await locked(),0,'Touch unlock survives a reload');
    evidence.push({device,...size?{size}:{},touch:true,mixedKeyboardTouch:true,fullCards:true,thumbTargets:true,scrolling:true,persisted:true});await context.close();
  }

  context=await fresh();await context.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Storage unavailable','QuotaExceededError');};});
  await page.goto(origin);await start();await press(code);await allReady();assert.equal(await stored(),null);
  await page.getByRole('button',{name:'Back',exact:true}).click();await start();assert.equal(await locked(),0,'Storage failure still unlocks this session');
  evidence.push({storageDeniedSessionFallback:true});await context.close();

  context=await fresh();await page.goto(origin+'/?autostart=1&capture=1&level=1&character=xgod');
  await page.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).player?.grounded;}catch{return false;}},null,{timeout:60000});
  await press(code);assert.equal(await stored(),null,'Gameplay direction presses cannot unlock characters');
  evidence.push({gameplayExcluded:true});await context.close();
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
