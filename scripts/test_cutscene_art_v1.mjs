import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Browser plugin skill is unavailable; use the project's installed Playwright.
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4380';
const levelOne=process.env.GAME_TEST_STORY_CHAPTER==='level1',expanded=!levelOne&&process.env.GAME_TEST_STORY_EDITION==='expanded';
const out=new URL(`../output/${levelOne?'cutscene-level1-v1':`cutscene-art-${expanded?'v2':'v1'}`}/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const errors=[],evidence=[];
const ids=levelOne?['l1-01-flame-sword','l1-02-the-mark','l1-03-schoolmate','l1-04-graveyard-road']:['01-earthior','02-impact',...(expanded?['03-through-the-rift','04-alone-in-the-alley']:[]),'03-alley-fire','04-transformation'];
const route='/cutscenes/prologue-v1/preview.html'+(levelOne?'?chapter=level1':expanded?'?edition=expanded':'');
try{
  for(const device of ['Desktop Chrome','iPhone 15 landscape','iPhone 15','iPad Pro 11 landscape']){
    const context=await browser.newContext({...devices[device],deviceScaleFactor:1});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
    const requested=[];page.on('request',r=>{if(/\.png(?:\?|$)/.test(r.url()))requested.push(r.url());});
    const ready=async id=>{
      await page.waitForFunction(id=>document.querySelector('main')?.dataset.scene===id&&document.querySelector('main')?.getAttribute('aria-busy')==='false',id);
      assert(await page.locator('.art').evaluate(img=>img.complete&&img.naturalWidth>1000&&img.naturalHeight>500));
      if(device==='iPhone 15')assert(await page.locator('.art').evaluate(img=>Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.02),'Portrait shows the complete illustration instead of a center crop');
      assert.equal(await page.locator('.caption span').count(),2);
      assert.equal(await page.locator('.speaker').innerText(),levelOne&&id==='l1-03-schoolmate'?'BARRETT':'X GOD');
      const bounds=await page.locator('.dialogue').boundingBox(),size=page.viewportSize();
      assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=size.width+1&&bounds.y+bounds.height<=size.height+1);
      for(const button of await page.locator('button').all()){
        const b=await button.boundingBox();assert(b.width>=44&&b.height>=44);
        assert(b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1);
      }
      assert(await page.locator('.dialogue').evaluate(node=>node.scrollWidth<=node.clientWidth&&node.scrollHeight<=node.clientHeight));
    };
    const shot=name=>page.screenshot({path:fileURLToPath(new URL(device.replaceAll(' ','-')+'-'+name+'.png',out))});
    await page.goto(origin+route);await ready(ids[0]);
    assert.equal(requested.length,1,'Only the current artwork loads at startup');assert(await page.locator('#previous').isDisabled());
    await shot(ids[0]);
    for(let i=1;i<ids.length;i++){
      if(device==='Desktop Chrome')await page.keyboard.press(i===1?'ArrowRight':i===2?'Enter':'Space');
      else await page.getByRole('button',{name:'Next story image',exact:true}).tap();
      await ready(ids[i]);await shot(ids[i]);
    }
    await page.getByRole('button',{name:'Replay story',exact:true}).click();await ready(ids[0]);
    await page.keyboard.press('ArrowRight');await ready(ids[1]);await page.locator('#previous').click();await ready(ids[0]);
    // Rapid next/previous cannot leave a caption paired with a different image.
    await page.evaluate(()=>{document.querySelector('#next').click();document.querySelector('#next').click();document.querySelector('#previous').click();});
    await ready(ids[1]);assert((await page.locator('.caption').innerText()).includes('meteor'));
    assert((await page.locator('.art').getAttribute('src')).endsWith(ids[1]+'.png'));
    await page.goto(origin+route+(route.includes('?')?'&':'?')+'frame='+(ids.length-1));await ready(ids.at(-1));
    const state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));assert.equal(state.scene,ids.at(-1));assert.equal(state.busy,false);assert.equal(state.image.loaded,true);
    evidence.push({device,scenes:ids.length,readableCaptions:true,thumbTargets:true,keyboardAndTouch:true,replay:true,noEagerArtworkLoad:true,rapidNavigation:true});
    await context.close();
  }
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,engine,evidence,errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),evidence,errors},null,2));throw error;}finally{await browser.close();}
