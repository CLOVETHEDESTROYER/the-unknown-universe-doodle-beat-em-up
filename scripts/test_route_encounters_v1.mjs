import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
// Browser runtime plugin unavailable: use repository Playwright and its gameplay diagnostics.
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4385';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const out=`output/route-encounters-v1/${engine}`;await fs.mkdir(out,{recursive:true});let page;const errors=[],results=[];
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const event=s=>s?.routeEncounters?.[0];
async function wait(fn,ms=30000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
const warp=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function boot(level,hero='zgod',device='Desktop Chrome'){
 const ctx=await browser.newContext({...devices[device],deviceScaleFactor:1});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=${level}&character=${hero}`);await wait(s=>s.mode==='platforming'&&s.player?.grounded);return ctx;
}
async function strikeWave(){
 for(let i=0;i<35;i++){
  const s=await read(),target=s.enemies.find(e=>e.routeEncounter&&e.hp>0);if(!target)return;
  await warp(target.x-65,target.y);await page.keyboard.press('ArrowRight',{delay:15});await page.keyboard.press('Space',{delay:90});await page.waitForTimeout(260);
 }
 throw Error('Actual attacks did not defeat encounter enemies: '+JSON.stringify(await read()));
}
try{
 // A normal run must save the real earned completion and never pay twice after Continue.
 let ctx=await browser.newContext({viewport:{width:1365,height:768}});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('#start-game-button').click();await page.getByRole('button',{name:'X God: Select character',exact:true}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await wait(s=>s.mode==='platforming'&&s.player?.grounded);await page.waitForTimeout(2200);
 await warp(7100);await wait(s=>event(s)?.stage==='warning');await page.screenshot({path:out+'/roof-warning.png'});
 await page.keyboard.press('p');const frozen=event(await read());await page.waitForTimeout(450);assert.deepEqual(event(await read()),frozen,'Pause freezes warning');await page.keyboard.press('p');
 await wait(s=>event(s)?.stage==='active');await warp(7530,469);await wait(s=>s.crumblingPlatforms.some(p=>p.x===7520&&p.phase==='shaking'));
 await wait(s=>s.crumblingPlatforms.some(p=>p.x===7520&&!p.solid));await page.screenshot({path:out+'/roof-collapse.png'});
 await page.evaluate(()=>window.__unknownPlatformerForceFall());await wait(s=>s.mode==='platforming'&&s.player?.grounded&&s.player.x<7060,12000);
 assert.equal(event(await read()).stage,'waiting');assert((await read()).crumblingPlatforms.filter(p=>p.x>=7520&&p.x<8040).every(p=>p.solid&&p.phase==='ready'));
 await warp(7100);await wait(s=>event(s)?.stage==='active');await warp(8270);await wait(s=>event(s)?.stage==='complete');let s=await read();assert(s.completedEncounters.includes('rooftop_runout'));
 // Activate the adjacent checkpoint using its real overlap path.
 await warp(8210);await wait(s=>s.checkpoint.x===8210);await page.keyboard.press('p');await page.getByRole('button',{name:'Save & Quit',exact:true}).click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.campaign.v1')));assert(saved.stats.completedEncounters.includes('rooftop_runout'));
 await page.reload();await page.locator('#continue-game-button').click();await wait(s=>s.mode==='platforming'&&s.player?.grounded);s=await read();assert.equal(event(s).stage,'complete');assert(s.progress.score<saved.stats.score+300,'Completed event must not pay its 300-point bonus again');await page.screenshot({path:out+'/roof-save-restored.png'});results.push({encounter:'rooftop_runout',warning:true,collapse:true,retry:true,pause:true,saveResume:true,rewardOnce:true});await ctx.close();
 // Two real guards, an open cage, actual orb collection, companion following.
 ctx=await boot(2);await warp(1530);await wait(s=>event(s)?.stage==='warning');assert.equal((await read()).pickups.filter(p=>p.kind==='doghost').length,0);await page.screenshot({path:out+'/rescue-caged.png'});
 await wait(s=>event(s)?.stage==='active');assert.equal(event(await read()).enemiesLeft,2);
 await page.evaluate(()=>window.__unknownPlatformerForceFall());await wait(s=>event(s)?.stage==='waiting'&&s.player.x<1430);assert.equal((await read()).enemies.filter(e=>e.routeEncounter).length,0);
 await warp(1530);await wait(s=>event(s)?.stage==='active');assert.equal(event(await read()).enemiesLeft,2);await strikeWave();await wait(s=>event(s)?.stage==='orb_ready');assert.equal((await read()).pickups.filter(p=>p.kind==='doghost').length,1);
 await warp(1790,320);await wait(s=>s.doghost.active&&event(s)?.stage==='complete');const score=(await read()).progress.score;await warp(1400);await warp(1850);await page.waitForTimeout(150);assert.equal((await read()).progress.score,score);await page.screenshot({path:out+'/rescue-free.png'});results.push({encounter:'doghost_rescue',guards:true,realAttacks:true,orbCollection:true,companion:true,rewardOnce:true});await ctx.close();
 // The moving ferry is required, with a telegraphed second wave and safe runout.
 ctx=await boot(4);await warp(7040);await wait(s=>event(s)?.stage==='active');await page.screenshot({path:out+'/ferry-wave1.png'});
 await page.evaluate(()=>window.__unknownPlatformerForceFall());await wait(s=>event(s)?.stage==='waiting'&&s.player.x<7000);assert.equal((await read()).enemies.filter(e=>e.routeEncounter).length,0);
 await warp(7040);await wait(s=>event(s)?.stage==='active');assert.equal(event(await read()).wave,1);await strikeWave();await wait(s=>event(s)?.stage==='between_waves');await page.screenshot({path:out+'/ferry-warning2.png'});await wait(s=>event(s)?.wave===2);await strikeWave();await warp(7630);await page.waitForTimeout(150);assert.equal(event(await read()).stage,'active','Skipping the ferry does not complete the objective');
 let lift=(await read()).movingPlatforms.find(p=>p.minX===7145);assert(lift);await warp(lift.x+lift.width/2,lift.y-11);await wait(s=>event(s)?.riddenMs>=250);await page.screenshot({path:out+'/ferry-riding.png'});await warp(7640);await wait(s=>event(s)?.stage==='complete');s=await read();assert(s.powerups.inkShieldReady);results.push({encounter:'last_ferry',twoWaves:true,realAttacks:true,requiresRide:true,shieldReward:true});await ctx.close();
 // Phone HUD/scene proof plus bypassing all encounters without locking campaign travel.
 ctx=await boot(2,'killer_kai','iPhone 15 landscape');await warp(1500);await wait(s=>event(s)?.stage==='warning');await page.screenshot({path:out+'/phone-rescue.png'});await warp(3600);assert((await read()).player.x>3400);assert.deepEqual((await read()).failedAssets,[]);await ctx.close();
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/results.json',JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,engine,results,errors},null,2));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),state:await read(),errors},null,2));}throw e;}finally{await browser.close();}
