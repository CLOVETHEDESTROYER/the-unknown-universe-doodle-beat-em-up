import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:5175',out='output/results-motion';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{},args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.url());});
await page.addInitScript(()=>{if(!localStorage.getItem('unknownUniverse.wallet.v1'))localStorage.setItem('unknownUniverse.wallet.v1',JSON.stringify({version:1,gold:375,receipts:[],pending:null}));});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
async function until(fn){const end=Date.now()+60000;while(Date.now()<end){const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
async function boot(query=''){
 await page.goto(origin+'/?autostart=1&capture=1'+query);
 return until(s=>s.mode==='platforming'&&s.player?.grounded);
}
async function finishFixture(){
 for(let i=0;i<3;i++)await page.evaluate(()=>window.__unknownPlatformerCollectPickup('coin'));
 await page.evaluate(()=>{window.__unknownPlatformerPrepareGateTest();window.__unknownPlatformerSetPlayerPosition(JSON.parse(window.render_game_to_text()).progress.levelEndX,480);});
 return until(s=>s.mode==='level-results');
}
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.wallet.v1')));
try{
 await boot();let s=await finishFixture();assert(!s.tally.complete);const values=[s.tally.points];
 while(!s.tally.complete){await page.waitForTimeout(55);s=await read();values.push(s.tally.points);}
 assert(new Set(values).size>=5,'The tally visibly counts through intermediate values');
 assert(values.every((n,i)=>n>=0&&!Object.is(n,-0)&&(i===0||n>=values[i-1])));assert.equal(s.tally.points,s.result.points);assert.equal(s.tally.gems,3);assert.equal(s.tally.gold,s.wallet.gold);
 assert.equal(await page.getByTestId('result-points').innerText(),s.result.points.toLocaleString());
 assert.equal(await page.getByTestId('result-points').evaluate(e=>getComputedStyle(e).animationName),'tally-throb');
 await page.waitForTimeout(190);await page.screenshot({path:`${out}/clear-pulse.png`});
 await page.getByRole('button',{name:'Continue adventure',exact:false}).click();await until(s=>s.mode==='campaign-story');
 // The last life has a real collapse animation before the new drawn stats card opens.
 await boot('&lives=1&score=12345&souls=17');
 for(let i=0;i<3;i++)await page.evaluate(()=>window.__unknownPlatformerCollectPickup('coin'));
 await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1000));s=await until(s=>s.mode==='game-over');
 assert.equal(s.player.lives,0);assert.equal(s.outcome,'defeat');assert.equal(s.result.earnedGold,0);assert.equal(s.wallet.gold,375);
 s=await until(s=>s.mode==='game-over'&&s.tally.complete);assert.equal(s.result.points,300);assert.equal(s.result.gems,3);assert.equal(s.result.totalPoints,12645);
 assert.equal((await saved()).gold,375);assert.equal((await saved()).receipts.length,0);
 await page.screenshot({path:`${out}/game-over.png`});
 for(const [name,width,height] of [['death-phone-landscape',852,393],['death-phone-portrait',393,852]]){
  await page.setViewportSize({width,height});const panel=page.locator('.level-results');assert(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.getByRole('button',{name:'Draw again',exact:false}).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}.png`});
 }
 await page.getByRole('button',{name:'Draw again',exact:false}).click();await until(s=>s.mode==='platforming'&&s.player?.grounded);assert.equal((await saved()).gold,375);
 // Flight also reaches the shared stats card after its explosion has finished.
 await page.setViewportSize({width:1280,height:720});await page.goto(origin+'/?autostart=1&level=5&capture=1&lives=1');
 await until(s=>s.engine==='flight'&&s.player);await page.evaluate(()=>window.advanceTime(4800));await until(s=>s.flight?.phase==='flight');
 await page.evaluate(()=>window.__unknownFlightDamageShip(100));await page.evaluate(()=>window.advanceTime(1300));s=await until(s=>s.mode==='game-over');assert.equal(s.flight.phase,'gameover');assert.equal(s.result.earnedGold,0);
 await until(s=>s.mode==='game-over'&&s.tally.complete);assert.equal(await page.getByTestId('result-points').innerText(),'0');
 await page.screenshot({path:`${out}/flight-game-over.png`});
 // Reduced motion shows settled numbers immediately and removes the glow/pulse animation.
 await page.emulateMedia({reducedMotion:'reduce'});await boot();s=await finishFixture();assert(s.tally.complete);assert.equal(s.tally.points,s.result.points);
 assert.equal(await page.getByTestId('result-points').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.screenshot({path:`${out}/reduced-motion.png`});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,intermediateTallies:new Set(values).size,groundDeath:true,flightDeath:true,walletUnchangedOnDeath:true,reducedMotion:true,errors}));
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await fs.writeFile(`${out}/failure-state.json`,JSON.stringify(await read(),null,2));throw e;}finally{await browser.close();}
