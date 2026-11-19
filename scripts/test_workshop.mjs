import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {completeAlleyRescue} from './alley_test_helpers.mjs';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:5175',out='output/workshop';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{},args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.url());});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.wallet.v1')));
async function until(fn){const end=Date.now()+60000;while(Date.now()<end){const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout '+fn);}
async function select(name){await page.getByRole('button',{name:`Preview ${name}`,exact:true}).click();}
async function buy(name,price){await select(name);const before=(await wallet()).gold;await page.getByRole('button',{name:`Buy for ${price} Gold`,exact:true}).click();assert.equal((await wallet()).gold,before);await page.getByRole('button',{name:'Confirm purchase',exact:true}).click();assert.equal((await wallet()).gold,before-price);}
try{
 await page.goto(origin);await page.getByRole('button',{name:'Start game',exact:true}).click();await page.locator('[data-character-id="xgod"]').click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await until(s=>s.mode==='platforming'&&s.player?.grounded);
 await page.evaluate(()=>{
  const campaign=JSON.parse(localStorage.getItem('unknownUniverse.campaign.v1'));campaign.story='level1';campaign.stats={...campaign.stats,level:2,score:900,lives:2,hasFlameSword:false,
    equipment:{active:'blaster',hits:1,unlocked:['blaster'],gunUpgrade:'rapid',blasterVariant:'kai_arm'},rewardProgress:{runId:'shop-test',startScore:900,startGems:0,startMonsters:0}};
  const result={receiptId:'shop-test:1',level:1,points:900,totalPoints:900,gems:0,monsters:0,pickupGold:0,clearGold:100,performanceGold:0,earnedGold:100};
  localStorage.setItem('unknownUniverse.wallet.v1',JSON.stringify({version:1,gold:2000,receipts:['shop-test:1'],owned:[],equipped:{ink:'classic',trail:'classic',burst:'classic'},pending:{result,campaign,stage:'shop'}}));
 });
 await page.reload();let s=await until(s=>s.mode==='workshop');assert(s.betweenLevels);assert.equal(await page.locator('canvas').count(),0);
 await select('Weapon tune-up');await page.getByRole('button',{name:'Buy for 75 Gold',exact:true}).click();await page.getByRole('button',{name:'Confirm purchase',exact:true}).evaluate(b=>{b.click();b.click();});
 let w=await wallet();assert.equal(w.gold,1925);assert.equal(w.pending.campaign.stats.equipment.hits,3);assert.equal(w.pending.campaign.stats.equipment.blasterVariant,'kai_arm');assert.equal(w.pending.campaign.stats.equipment.gunUpgrade,'rapid');
 await buy('Ink Shield',100);await buy('Extra life',150);assert.equal((await wallet()).pending.campaign.stats.lives,3);
 await page.getByRole('button',{name:'Ink & trails',exact:true}).click();await buy('Arctic Ink',250);await buy('Chalk Sparks',400);
 await select('Neon Rose');await page.getByRole('button',{name:'Buy for 250 Gold',exact:true}).click();const before=(await wallet()).gold;
 await page.evaluate(()=>{window.__shopSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage is full');};});
 await page.getByRole('button',{name:'Confirm purchase',exact:true}).click();assert(await page.getByRole('alert').isVisible());assert.equal((await wallet()).gold,before);assert(!(await wallet()).owned.includes('rose'));
 await page.evaluate(()=>{Storage.prototype.setItem=window.__shopSetItem;});await page.getByRole('button',{name:'Confirm purchase',exact:true}).click();
 await buy('Prism Burst',600);await select('Starlight');assert(await page.getByRole('button',{name:'Buy for 650 Gold',exact:true}).isDisabled());assert.equal((await wallet()).gold,175);
 await page.getByRole('button',{name:'Collection',exact:true}).click();await select('Arctic Ink');await page.getByRole('button',{name:'Equip this look',exact:true}).click();
 w=await wallet();assert.deepEqual(w.equipped,{ink:'arctic',trail:'chalk',burst:'prism',face:'classic',head:'classic',outfit:'classic',xgodSpecial:'classic',kaiSpecial:'classic',buddy:'classic'});assert.equal(w.owned.length,4);
 await page.screenshot({path:`${out}/desktop-collection.png`});
 for(const [name,width,height] of [['phone-landscape',852,393],['phone-portrait',393,852]]){
  await page.setViewportSize({width,height});assert(await page.locator('.workshop').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  const button=page.getByRole('button',{name:'Continue story',exact:false});await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert(box.height>=44);assert(box.x>=0&&box.x+box.width<=width+1);await page.screenshot({path:`${out}/${name}.png`});
 }
 await page.setViewportSize({width:1280,height:800});await page.reload();s=await until(s=>s.mode==='workshop');assert.equal(s.wallet.gold,175);assert.deepEqual(s.wallet.equipped,w.equipped);assert(s.resume.inkShieldReady);assert.equal(s.resume.equipment.hits,3);
 await page.evaluate(()=>{window.__shopSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage is full');};});
 await page.getByRole('button',{name:'Continue story',exact:false}).click();assert(await page.getByRole('alert').isVisible());assert.equal((await read()).mode,'workshop');assert.equal((await wallet()).gold,175);
 await page.evaluate(()=>{Storage.prototype.setItem=window.__shopSetItem;});
 await page.getByRole('button',{name:'Continue story',exact:false}).evaluate(b=>{b.click();b.click();});s=await until(s=>s.mode==='campaign-story'&&s.chapter==='level1');assert.equal(s.resume.lives,3);assert(s.resume.inkShieldReady);assert.equal((await wallet()).pending,null);
 await page.getByRole('button',{name:'Skip story',exact:true}).click();await completeAlleyRescue(page);s=await until(s=>s.mode==='platforming'&&s.level===2&&s.player?.grounded);assert(s.powerups.inkShieldReady);assert.equal(s.equipment.blasterVariant,'kai_arm');assert.equal(s.equipment.hits,3);
 await page.goto(origin);await page.getByLabel('Shop wallet',{exact:true}).click();s=await until(s=>s.mode==='workshop');assert(!s.betweenLevels);assert.equal(s.wallet.gold,175);assert.equal(s.wallet.owned.length,4);
 await page.getByRole('button',{name:'Supplies',exact:true}).click();await select('Ink Shield');assert(await page.getByRole('button',{name:'Buy for 100 Gold',exact:true}).isDisabled());
 await page.getByRole('button',{name:'Collection',exact:true}).click();await page.getByRole('button',{name:'Original ink',exact:true}).click();assert.equal((await wallet()).equipped.ink,'classic');assert.equal((await wallet()).gold,175);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,confirmation:true,noDoubleCharge:true,supplies:true,permanentCosmetics:true,storageRetry:true,reload:true,nextLevel:true,mobile:true,errors}));
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await fs.writeFile(`${out}/failure-state.json`,JSON.stringify(await read(),null,2));throw e;}finally{await browser.close();}
