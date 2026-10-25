import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// Browser plugin skill not available; use repository Playwright.
// Flow: real final boss hit -> full defeat/celebration -> gate -> six panels -> saved victory.
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4382';
const out=new URL(`../output/campaign-finale-v1/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const errors=[],evidence=[];let page;
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
async function wait(fn,ms=60000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn+' actual '+JSON.stringify(await read()));}
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
async function boot(hero,device){
 const ctx=await browser.newContext({...devices[device==='iPhone 15'?'iPhone 15 landscape':device],deviceScaleFactor:1});page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
 await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=6&character=${hero}`);
 await wait(s=>s.mode==='platforming'&&s.player?.grounded);return ctx;
}
async function win(){
 await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:1}));
 const b=(await read()).enemies.find(e=>e.kind==='boss');assert(b);await page.evaluate(b=>window.__unknownPlatformerSetPlayerPosition(b.x-75,b.floorY),b);
 await page.keyboard.press('ArrowRight',{delay:30});await page.keyboard.down('Space');
 await wait(s=>s.bossDefeated&&s.bossDeath.stage==='finished');await page.keyboard.up('Space');
 await wait(s=>!s.celebration.active);let s=await read();assert.equal(s.bossDeath.bossId,'void_regent');
 assert.equal(await page.locator('.campaign-story').count(),0,'No finale before exit');
 await page.evaluate(x=>window.__unknownPlatformerSetPlayerPosition(x,520),s.progress.levelEndX);
 return wait(s=>s.mode==='campaign-story'&&s.chapter==='level6'&&!s.busy);
}
async function bounds(){
 const size=page.viewportSize();for(const el of await page.locator('.campaign-story button,.campaign-story-caption').all()){
 const b=await el.boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1);
 assert(await el.evaluate(n=>n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1));
 }
}
try{
 for(const [hero,device,skip] of [['zgod','Desktop Chrome',false],['zgod','iPhone 15 landscape',false],['xgod','iPhone 15',true],['killer_kai','iPad Pro 11 landscape',true]]){
  const ctx=await boot(hero,device);const initial=await win(),saved=initial.resume;
  if(device==='iPhone 15'){await page.setViewportSize(devices[device].viewport);await page.waitForTimeout(150);}assert(saved.isVictory&&saved.level===6);assert.equal(saved.selectedCharacterId,hero);assert.equal(initial.total,6);
  assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.getByRole('heading',{name:'Universe Saved',exact:true}).count(),0);
  for(let i=0;i<6;i++){
   if(i)await page.getByRole('button',{name:'Next story image',exact:true}).click();
   let s=await wait(s=>s.mode==='campaign-story'&&s.index===i&&!s.busy);assert(s.image.loaded&&!s.image.error);assert.deepEqual(s.resume,saved);await bounds();await shot(`${hero}-${device.replaceAll(' ','-')}-scene${i+1}`);
   if(i===1){await page.keyboard.press('ArrowLeft');await wait(s=>s.index===0&&!s.busy);await page.keyboard.press('ArrowRight');await wait(s=>s.index===1&&!s.busy);}
   if(skip)break;
  }
  if(skip)await page.getByRole('button',{name:'Skip story',exact:true}).click();else await page.getByRole('button',{name:'View victory',exact:true}).click();
  await page.getByRole('heading',{name:'Universe Saved',exact:true}).waitFor();const v=await wait(s=>s.mode==='victory');assert.deepEqual(v.stats,saved);assert.equal(await page.locator('canvas').count(),0);
  await shot(`${hero}-${device.replaceAll(' ','-')}-victory`);
  if(hero==='xgod')assert.equal(await page.evaluate(()=>localStorage.getItem('unknownUniverse.xGodClear.v1')),'true');
  await page.getByRole('button',{name:'Play Again',exact:true}).click();await wait(s=>s.mode!=='victory'&&s.mode!=='campaign-story');
  evidence.push({hero,device,skip,bossDefeat:true,gate:true,finale:true,snapshotPreserved:true,restart:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,evidence,errors},null,2));
 await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,evidence,errors},null,2));
}catch(e){await shot('failure');await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read(),errors},null,2));throw e;}finally{await browser.close();}
