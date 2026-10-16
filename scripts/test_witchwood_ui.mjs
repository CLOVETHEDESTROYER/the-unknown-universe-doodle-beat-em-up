import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output=new URL('../output/kilina-witch-v1/ui/',import.meta.url);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.enemies.find(e=>e.kind==='boss');
async function wait(predicate){
  const deadline=Date.now()+12000;
  while(Date.now()<deadline){
    if(errors.length)throw new Error(errors.join('\n'));
    const s=await read();if(predicate(s,boss(s)))return s;
    await page.waitForTimeout(15);
  }
  throw new Error(`Timeout: ${predicate}`);
}
try{
  await page.goto(`${process.env.GAME_TEST_URL || 'http://127.0.0.1:3000'}/?autostart=1&level=6&capture=1&devTools=1`);
  await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  let s=await read();assert.equal(s.level,6);assert.equal(boss(s).bossId,'void_regent');
  assert(s.pickups.some(p=>p.kind==='gravity'));assert.deepEqual(s.failedAssets,[]);
  for(let l=1;l<=6;l++)assert.equal(await page.getByRole('button',{name:`L${l}`,exact:true}).count(),1);
  await page.getByRole('button',{name:'L4',exact:true}).click();
  s=await wait((s,b)=>s.level===4 && b?.bossId==='kilina' && s.player?.grounded);
  assert.equal(s.chapter,'THE WITCHWOOD');assert.deepEqual(s.failedAssets,[]);
  await wait((s,b)=>b.visualFrame===0 && !s.bossAttackVisualVisible);
  await page.evaluate(x=>window.__unknownPlatformerSetPlayerPosition(x,520),boss(s).x-420);
  s=await wait((s,b)=>b.attackState==='patrol' && b.velocityX < -100 && b.visualFrame>0);
  assert([1,2,3].includes(boss(s).visualFrame));
  await page.evaluate(x=>window.__unknownPlatformerSetPlayerPosition(x,520),boss(s).x-280);
  await wait(s=>s.bossArenaCamera.locked && s.bossArenaCamera.left>6300);
  s=await wait((s,b)=>b.attackState==='patrol' && b.velocityX===0 && b.visualFrame===0);
  assert.equal(boss(s).bodyBottom,520);
  await page.locator('canvas').screenshot({path:fileURLToPath(new URL('kilina-idle.png',output))});
  await page.getByRole('button',{name:'L6',exact:true}).click();
  s=await wait((s,b)=>s.level===6 && b?.bossId==='void_regent' && s.player?.grounded);
  assert.deepEqual(s.failedAssets,[]);assert(s.pickups.some(p=>p.kind==='gravity'));
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',output),JSON.stringify({passed:true,checks:['queryLevelSix','sixLevelNavigation','distinctBosses','uprightIdle','walkFrames','gravityStaysFinal'],errors},null,2));
  console.log(JSON.stringify({passed:true,checks:['queryLevelSix','sixLevelNavigation','distinctBosses','uprightIdle','walkFrames','gravityStaysFinal'],errors}));
}catch(e){
  await fs.writeFile(new URL('failure.json',output),JSON.stringify({error:String(e),state:await read(),errors},null,2));
  await page.screenshot({path:fileURLToPath(new URL('failure.png',output))});throw e;
}finally{await browser.close();}
