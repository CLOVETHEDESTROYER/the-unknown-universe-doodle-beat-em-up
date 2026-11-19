import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:5175';
const out='output/level-results';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{},args:['--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:720}});
let page=await context.newPage();const errors=[];const evidence=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
async function until(predicate,timeout=60000){
 const end=Date.now()+timeout;
 while(Date.now()<end){const s=await read();if(s&&predicate(s))return s;await page.waitForTimeout(35);}
 throw Error(`Timed out ${predicate}: ${JSON.stringify(await read())}`);
}
const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.wallet.v1')));
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.campaign.v1')));
async function defeatAndExit(level){
 let s=await until(s=>s.mode==='platforming'&&s.level===level&&s.player?.grounded);
 const boss=s.enemies.find(e=>e.kind==='boss');assert(boss);
 await page.evaluate(b=>window.__unknownPlatformerSetPlayerPosition(b.x-100,b.floorY),boss);
 await page.keyboard.press('ArrowRight',{delay:25});await page.keyboard.down('Space');await page.waitForTimeout(350);await page.keyboard.up('Space');
 await until(s=>s.bossDeath?.stage==='finished'&&s.bossDefeated);
 s=await read();await page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x:s.progress.levelEndX,y:level<=2?480:520});
 return until(s=>s.mode==='level-results');
}
async function inspectLayout(name,width,height){
 await page.setViewportSize({width,height});await page.waitForTimeout(100);
 const panel=page.locator('.level-results');
 assert(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'No horizontal overflow');
 const button=page.getByRole('button',{name:/Continue adventure|Visit Kai.s Workshop/});await button.scrollIntoViewIfNeeded();
 const b=await button.boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1);assert(b.height>=44);
 await page.screenshot({path:`${out}/${name}.png`});
}
try{
 await page.goto(origin);await page.getByRole('button',{name:'Start game',exact:true}).click();await page.locator('[data-character-id="zgod"]').click();
 await page.getByRole('button',{name:'Skip story',exact:true}).click();await until(s=>s.mode==='platforming'&&s.player?.grounded);
 for(let i=0;i<3;i++)await page.evaluate(()=>window.__unknownPlatformerCollectPickup('coin'));
 let s=await read();assert.equal(s.progress.souls,3);assert(await page.getByLabel('3 gems collected',{exact:true}).isVisible());
 const cp=s.terrain.checkpoints[0];await page.evaluate(p=>window.__unknownPlatformerSetPlayerPosition(p.x,p.y),cp);
 await until(s=>s.checkpoint.index===0);await page.keyboard.press('p');await page.getByRole('button',{name:'Save & Quit',exact:true}).click();
 const checkpoint=await save();assert.equal(checkpoint.stats.rewardProgress.startGems,0);assert.equal(checkpoint.stats.collectedGems.ids.length,3);
 await page.reload();await page.getByRole('button',{name:'Continue Game',exact:true}).click();await until(s=>s.mode==='platforming'&&s.player?.grounded);
 assert((await read()).pickups.every(p=>!checkpoint.stats.collectedGems.ids.includes(p.gemId)),'Collected gems stay gone after checkpoint reload');
 s=await defeatAndExit(1);assert.equal(s.result.gems,3);assert(s.result.points>=2700);assert.equal(s.result.pickupGold,15);assert.equal(s.result.clearGold,100);
 assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.touch-controls').count(),0);
 const banked=await wallet();assert.equal(banked.gold,s.result.earnedGold);assert.equal(banked.receipts.length,1);assert(banked.pending);
 await page.waitForTimeout(900);assert.equal((await read()).mode,'level-results','No automatic advance');
 await inspectLayout('desktop',1280,720);await inspectLayout('phone-landscape',852,393);await inspectLayout('phone-portrait',393,852);
 await page.setViewportSize({width:1280,height:720});await page.reload();s=await until(s=>s.mode==='level-results');assert.equal(s.wallet.gold,banked.gold);assert.deepEqual(s.result,banked.pending.result);
 // A repeated receipt cannot pay again, even if it is retried after reloading.
 const duplicate=await page.evaluate(async()=>{
   const m=await import('/gameplay/levelRewards.ts');const w=JSON.parse(localStorage.getItem(m.WALLET_KEY));
   return m.bankLevelResult(w,w.pending).gold;
 });assert.equal(duplicate,banked.gold);
 // Failed storage keeps the summary open. A later retry must still pay only once.
 await page.evaluate(()=>{window.__resultsSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
 await page.getByRole('button',{name:/Continue adventure|Visit Kai.s Workshop/}).click();assert(await page.getByRole('alert').isVisible());assert.equal((await read()).mode,'level-results');
 await page.evaluate(()=>{Storage.prototype.setItem=window.__resultsSetItem;});
 await page.getByRole('button',{name:'Retry saving',exact:false}).evaluate(b=>{b.click();b.click();});
 await until(s=>s.mode==='workshop');await page.getByRole('button',{name:'Continue story',exact:false}).click();
 s=await until(s=>s.mode==='campaign-story'&&s.chapter==='level1');assert.equal(s.resume.level,2);assert.equal(s.resume.score,banked.pending.campaign.stats.score);
 assert.equal((await wallet()).gold,banked.gold);assert.equal((await wallet()).pending,null);
 evidence.push({gems:3,checkpointTotalsPreserved:true,resultsReload:true,noDuplicateCredit:true,storageRetry:true,manualContinue:true,mobileFits:true});
 // Starting another campaign preserves the persistent wallet.
 await page.goto(origin);assert((await page.getByLabel('Shop wallet').innerText()).includes(`Wallet: ${banked.gold} Gold`));
 await page.getByRole('button',{name:'Start game',exact:true}).click();await page.getByRole('button',{name:'Choose a hero',exact:true}).click();await page.locator('[data-character-id="zgod"]').click();
 await page.getByRole('button',{name:'Skip story',exact:true}).click();await until(s=>s.mode==='platforming'&&s.player?.grounded);
 const newRun=await save();assert.notEqual(newRun.stats.rewardProgress.runId,checkpoint.stats.rewardProgress.runId);assert.equal((await wallet()).gold,banked.gold);
 // Final-stage rewards precede the finale, and survive a reload too.
 const finalSave={...newRun,story:null,stats:{...newRun.stats,level:6,score:0,souls:0,monstersDefeated:0,rewardProgress:{...newRun.stats.rewardProgress,startScore:0,startGems:0,startMonsters:0}}};
 await page.evaluate(s=>localStorage.setItem('unknownUniverse.campaign.v1',JSON.stringify(s)),finalSave);await page.goto(origin);
 await page.getByRole('button',{name:'Continue Game',exact:true}).click();s=await defeatAndExit(6);assert.equal(s.result.level,6);
 const finalGold=(await wallet()).gold;assert(finalGold>banked.gold);await page.reload();await until(s=>s.mode==='level-results'&&s.result.level===6);
 await page.keyboard.press('Enter');const finale=await until(s=>s.mode==='campaign-story'&&s.chapter==='level6');assert.equal(finale.index,0,'Continue key does not skip the first story image');
 await page.getByRole('button',{name:'Skip story',exact:true}).click();await until(s=>s.mode==='victory');assert.equal((await wallet()).gold,finalGold);
 evidence.push({newCampaignKeepsWallet:true,finaleResults:true,finaleReload:true});
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error(await read());throw e;}finally{await browser.close();}
