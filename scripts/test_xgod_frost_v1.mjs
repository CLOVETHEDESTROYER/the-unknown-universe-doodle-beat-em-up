import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4393';
const engine=process.env.GAME_TEST_BROWSER||'chromium';
const mobile=process.env.FROST_MOBILE==='1';
const out=`output/xgod-frost-v1/${engine}-${mobile?'phone':'desktop'}`;await fs.mkdir(out,{recursive:true});
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage(mobile?{...devices['iPhone 15 landscape'],deviceScaleFactor:1}:{viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
page.on('console',m=>{if(/Texture.*not found|No animation|Missing.*frame/.test(m.text()))errors.push(m.text())});
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text())}catch{return null}});
async function wait(fn,timeout=20000){const until=Date.now()+timeout;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(20)}throw Error('Timeout '+fn+' '+JSON.stringify(await read()))}
const snap=name=>page.screenshot({path:`${out}/${name}.png`});
const fixture=o=>page.evaluate(o=>window.__unknownPlatformerSpecialTest(o),o);
async function arena(){await fixture({offsets:[]});const level=(await read()).level;await page.evaluate(level=>window.__unknownPlatformerSetPlayerPosition(level>=3?1160:320,level>=3?520:480),level);await wait(s=>s.player.grounded)}
async function boot(level=3,hero='xgod'){
 await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&level=${level}&character=${hero}`);
 await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);
 if(hero==='xgod'&&level>=2){await arena();await page.evaluate(()=>window.__unknownPlatformerCollectPickup('frost'));await wait(s=>s.equipment.active==='frost'&&s.player.texture==='hero_frost_idle')}
}
try{
 await boot();let s=await read();assert(Math.abs(s.player.visibleHeight-160)<12);assert.equal(s.player.bodyHeight,108);await snap('idle');
 await page.keyboard.down('ArrowRight');await wait(s=>s.player.texture==='hero_frost_run');await snap('run');await page.keyboard.up('ArrowRight');await arena();
 await page.keyboard.down('ArrowDown');await wait(s=>s.player.texture==='hero_frost_crouch'&&s.player.crouching);await snap('crouch');
 await page.keyboard.down('Space');await wait(s=>s.weapon.shotsFired>0&&s.player.frame==='2');await snap('crouch-cast');await page.keyboard.up('Space');await page.keyboard.up('ArrowDown');
 await arena();await page.keyboard.down('ArrowUp');await wait(s=>s.player.texture==='hero_frost_jump');await snap('jump');await page.keyboard.up('ArrowUp');await page.waitForTimeout(50);
 await page.keyboard.press('KeyZ',{delay:55});await wait(s=>s.movement.heroMobility.texture==='hero_frost_jump');await snap('double-jump');
 await page.keyboard.press('ArrowDown',{delay:60});await wait(s=>s.movement.heroMobility.impacts>0);await wait(s=>s.movement.heroMobility.bombPhase==='ready');
 assert.equal((await read()).equipment.active,'frost');checks.push('idle/run/crouch/crouched cast/jump/double-jump/slam all retain ice gauntlets at roster scale');
 await boot();await arena();await fixture({offsets:[200],hp:30});await page.keyboard.down('Space');
 s=await wait(s=>s.player.texture==='hero_frost_attack'&&s.projectiles.some(p=>p.frostShot));await snap('cast');
 await wait(s=>s.enemies.some(e=>e.hp<30&&e.frozenRemainingMs>0));await snap('freeze-hit');await page.keyboard.up('Space');
 checks.push('standing cast emits traveling ice and freezes a damaged enemy');
 await boot();await arena();await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await wait(s=>s.player.velocityX>150&&s.player.texture==='hero_frost_attack');await snap('running-cast');await page.keyboard.up('Space');await page.keyboard.up('ArrowRight');
 checks.push('moving casts preserve motion and equipped art');
 await boot();await arena();await page.keyboard.press('ArrowLeft',{delay:80});await page.waitForTimeout(200);await fixture({offsets:[-150],hp:30});
 await page.locator('[data-touch-control="attack"]').dispatchEvent('pointerdown',{pointerId:71,pointerType:'touch',button:0,buttons:1,bubbles:true});
 await wait(s=>s.enemies.some(e=>e.hp<30&&e.frozenRemainingMs>0));await snap('left-touch-cast');
 await page.locator('[data-touch-control="attack"]').dispatchEvent('pointercancel',{pointerId:71,pointerType:'touch',button:0,buttons:0,bubbles:true});
 assert.equal((await read()).player.facing,'left');checks.push('left-facing touch cast and freeze');
 await boot();await arena();await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(10));await wait(s=>s.xgodPose==='damage');assert.equal((await read()).xgodDamageTexture,'hero_frost_hurt');assert.equal((await read()).equipment.hits,2);await snap('hurt');
 for(let i=0;i<2;i++){await page.waitForTimeout(1100);await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(10))}
 await wait(s=>s.equipment.active==='hands'&&s.player.visible&&!s.player.texture.startsWith('hero_frost_'));await snap('broken-return-to-hands');
 checks.push('hurt retains surviving gauntlets; third equipment hit returns to unarmed art');
 await boot();await arena();await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));await wait(s=>s.player.texture==='runner_blaster-idle');await snap('blaster');
 await page.evaluate(()=>window.__unknownPlatformerCollectPickup('sword'));await wait(s=>!s.celebration?.active&&s.player.texture==='runner_sword-idle');await snap('sword');checks.push('switching to blaster/sword restores their own art');
 await boot(1);assert.equal((await read()).equipment.active,'blaster');assert(!(await read()).failedAssets.length);checks.push('level one does not request unavailable ice assets');
 await boot(2);assert.equal((await read()).player.texture,'hero_frost_idle');checks.push('first ice level loads gauntlet atlases');
 await boot(3,'zgod');await page.evaluate(()=>window.__unknownPlatformerCollectPickup('frost'));await wait(s=>s.player.texture==='hero_frost_idle');assert((await read()).player.visibleHeight<120);checks.push('Z-God ice art remains shorter and independent');
 // Restore an equipped campaign at flight entry through the real Continue flow.
 const save={version:1,savedAt:Date.now(),difficulty:'EASY',story:null,stats:{
  isDying:false,activeBossId:null,score:0,souls:0,monstersDefeated:0,health:100,maxHealth:100,lives:3,maxLives:3,level:5,
  isGameOver:false,isVictory:false,swordUnlocked:false,hasFlameSword:false,swordDurability:0,maxSwordDurability:3,
  shieldUnlocked:false,inkShieldReady:false,dinioUnlocked:false,hasDinio:false,doghostUnlocked:false,hasDoghost:false,
  teleportationCUnlocked:false,hasTeleportationC:false,gravityCoreUnlocked:false,gravityCoreCharges:0,selectedCharacterId:'xgod',
  characterPowerUnlocked:true,equipment:{active:'frost',hits:3,unlocked:['blaster','frost']}}};
 await page.evaluate(save=>localStorage.setItem('unknownUniverse.campaign.v1',JSON.stringify(save)),save);
 await page.goto(origin+'/?capture=1');await page.locator('#continue-game-button').click();
 s=await wait(s=>s.engine==='flight'&&s.ship?.visible,60000);assert(s.boardingVisual.iceGauntlets);assert(s.boardingVisual.visible);await snap('frost-flight-boarding');
 await page.evaluate(()=>window.advanceTime(4800));assert((await read()).ship.pilotVisible);assert.deepEqual((await read()).failedAssets,[]);
 checks.push('Continue preserves ice equipment into flight boarding and pilot assets');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/verification.json`,JSON.stringify({status:'passed',checks,errors},null,2));console.log(checks);
}catch(e){await snap('failure');await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),state:await read(),checks,errors},null,2));throw e}finally{await browser.close()}
