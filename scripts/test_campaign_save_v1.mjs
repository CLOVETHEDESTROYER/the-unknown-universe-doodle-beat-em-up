import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
// Browser runtime plugin is unavailable; use the repository Playwright installation.
const out='output/campaign-save-v1';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const errors=[];
const context=await browser.newContext({viewport:{width:1365,height:768}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4383';const key='unknownUniverse.campaign.v1';
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
async function wait(fn){for(let i=0;i<1500;i++){const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(40);}throw Error('Timed out: '+fn+' '+JSON.stringify(await read()));}
async function load(){await page.goto(origin);await page.getByRole('button',{name:'Continue Game',exact:true}).click();return wait(s=>s.player&&s.mode!=='campaign-story');}
try{
 await page.goto(origin);assert.equal(await page.locator('#continue-game-button').count(),0);
 await page.getByRole('button',{name:'Start game',exact:true}).click();await page.getByRole('button',{name:'X God: Select character',exact:true}).click();
 await page.getByRole('button',{name:'Skip story',exact:true}).click();await wait(s=>s.mode==='platforming'&&s.player?.grounded);await page.waitForTimeout(2200);
 console.log('Started normal campaign');const original=await saved();assert(original);assert.equal(original.stats.level,1);
 await page.evaluate(()=>window.__unknownPlatformerCollectPickup('frost')); // no-op if unavailable in chapter
 let s=await read();const cp=s.terrain.checkpoints[0];await page.evaluate(p=>window.__unknownPlatformerSetPlayerPosition(p.x,p.y),cp);
 await wait(s=>s.checkpoint.index===0);await page.keyboard.down('ArrowRight');await page.waitForTimeout(160);await page.keyboard.up('ArrowRight');await page.keyboard.press('p');
 await page.getByRole('button',{name:'Save & Quit',exact:true}).click();await page.getByRole('button',{name:'Continue Game',exact:true}).waitFor();
 const checkpointSave=await saved();assert.equal(checkpointSave.stats.campaignCheckpoint.index,0);
 await page.screenshot({path:out+'/title.png'});
 await page.getByRole('button',{name:'Start game',exact:true}).click();await page.getByRole('button',{name:'Keep my save',exact:true}).click();assert.deepEqual(await saved(),checkpointSave);
 await page.reload();await page.locator('#continue-game-button').waitFor();await page.keyboard.press('Enter');s=await wait(s=>s.mode==='platforming'&&s.player?.grounded);
 assert.equal(s.checkpoint.index,0);assert(Math.abs(s.player.x-cp.x)<10);assert.equal(s.progress.score,checkpointSave.stats.score);
 await page.screenshot({path:out+'/restored-ground.png'});
 console.log('Ground checkpoint restored');
 // Reload with deliberately seeded late-game saves to exercise the real title/load/engine path.
 const fixture=structuredClone(checkpointSave);fixture.stats.level=5;fixture.stats.health=73;fixture.stats.selectedCharacterId='nico';fixture.difficulty='HARD';
 fixture.stats.flightSave={checkpoint:11500,weapon:'lance',hits:2,collectedWeapons:[0,1,2],collected:[0,1,2],seed:12345};
 await page.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify(fixture)),{key,fixture});
 s=await load();assert.equal(s.selectedCharacter.id,'nico');assert.equal(s.flight.checkpoint,11500);assert.equal(s.weapon.id,'lance');assert.equal(s.weapon.hits,2);assert.equal(s.ship.hull,73);assert.equal(s.flight.asteroidSeed,12345);
 await page.keyboard.press('p');await page.screenshot({path:out+'/restored-flight.png'});
 await page.getByRole('button',{name:'Save & Quit',exact:true}).click();assert.equal((await saved()).difficulty,'HARD');
 console.log('Flight restored');
 // Story transition saves resume the chapter and retain the next-level snapshot.
 fixture.stats.level=2;delete fixture.stats.flightSave;fixture.story='level1';fixture.stats.hasDinio=true;fixture.stats.dinioUnlocked=true;fixture.stats.equipment={active:'sword',hits:2,unlocked:['blaster','sword']};
 await page.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify(fixture)),{key,fixture});
 await page.goto(origin);await page.locator('#continue-game-button').click();await wait(s=>s.mode==='campaign-story'&&s.chapter==='level1');await page.getByRole('button',{name:'Skip story',exact:true}).click();s=await wait(s=>s.mode==='platforming'&&s.level===2);assert.equal(s.equipment.active,'sword');assert.equal(s.equipment.hits,2);assert(s.dinio.active);assert.equal(s.checkpoint.index,-1);
 console.log('Story restored');
 // Preview must leave the campaign slot untouched.
 await page.keyboard.press('p');await page.waitForTimeout(100);const beforePreview=await saved();await page.goto(origin+'/?autostart=1&level=3');await wait(s=>s.mode==='platforming');assert.deepEqual(await saved(),beforePreview);
 // Bad/future saves should never show Continue or crash.
 for(const bad of ['{oops',JSON.stringify({...fixture,version:99}),JSON.stringify({...fixture,stats:{...fixture.stats,lives:-1}})]){
  await page.evaluate(({key,bad})=>localStorage.setItem(key,bad),{key,bad});await page.goto(origin);assert.equal(await page.locator('#continue-game-button').count(),0);
 }
 // Storage denial reports failure and keeps the running scene available.
 await page.evaluate(k=>localStorage.removeItem(k),key);await page.reload();await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError');};});
 await page.locator('#start-game-button').click();await page.getByRole('button',{name:'X God: Select character',exact:true}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await wait(s=>s.mode==='platforming'&&s.player?.grounded);await page.waitForTimeout(2200);await page.keyboard.press('p');await page.getByRole('button',{name:'Save & Quit',exact:true}).click();assert(await page.getByText('Saving is unavailable in this browser.',{exact:false}).isVisible());assert.equal(await page.locator('canvas').count(),1);
 // Mobile Continue and pause controls stay within the landscape viewport.
 const mobile=await browser.newContext({...devices['iPhone 15 landscape'],deviceScaleFactor:1});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(origin);fixture.story=null;fixture.stats.level=2;
 await phone.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify(fixture)),{key,fixture});await phone.reload();const button=phone.locator('#continue-game-button');await button.waitFor();
 const box=await button.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=phone.viewportSize().width&&box.y+box.height<=phone.viewportSize().height);
 await phone.screenshot({path:out+'/mobile-title.png'});await button.click();await phone.waitForFunction(()=>{try{return JSON.parse(window.render_game_to_text()).mode==='platforming';}catch{return false;}});await phone.keyboard.press('p');await phone.getByRole('button',{name:'Save & Quit',exact:true}).waitFor();await phone.screenshot({path:out+'/mobile-pause.png'});await phone.getByRole('button',{name:'Save & Quit',exact:true}).click();await phone.locator('#continue-game-button').waitFor();await mobile.close();
 assert.deepEqual(errors,[]);console.log('PASS: normal autosave, quit, reload, checkpoint, resources, flight, story, preview isolation, invalid data, storage denial.');
 await fs.writeFile(out+'/results.json',JSON.stringify({passed:true,errors},null,2));
} catch(e){await page.screenshot({path:out+'/failure.png'});console.error(await read());throw e;}finally{await browser.close();}
