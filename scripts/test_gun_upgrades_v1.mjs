import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const out=process.env.GAME_TEST_OUTPUT||'C:/Users/analo/.codex/visualizations/2026/11/02/01a19a50-8c95-7342-8cf0-378bc7df86bb/gun-upgrades';
await fs.mkdir(out,{recursive:true});
await build({entryPoints:['gameplay/powerups.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(out,'powerups.mjs'),logLevel:'silent'});
const p=await import(pathToFileURL(path.join(out,'powerups.mjs')));
for(const mode of ['rapid','fan','homing']){
 let s=p.upgradeGun(p.createLoadout(),mode);assert.equal(s.gunUpgrade,mode);
 assert.equal(p.restoreLoadout(s,'hands').gunUpgrade,mode);
 s=p.hitPowerup(s);assert.equal(s.gunUpgrade,mode);assert.equal(p.upgradeGun(s,mode).hits,2);
 assert.equal(p.equipPowerup(s,'blaster',1).gunUpgrade,mode);
 assert.equal(p.equipPowerup(s,'sword',1).gunUpgrade,undefined);
 assert.equal(p.hitPowerup(s,true).gunUpgrade,undefined);
 assert.equal(p.hitPowerup(p.hitPowerup(s)).gunUpgrade,undefined);
 assert.equal(p.upgradeGun(p.createLoadout('hands'),mode).gunUpgrade,undefined);
}
assert.equal(p.restoreLoadout({...p.createLoadout(),gunUpgrade:'invalid'},'hands').gunUpgrade,undefined);
const errors=[],evidence={loadoutRules:true};
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,ms=15000){let end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout '+fn);}
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:54821';
async function boot(level=1,extra=''){await page.keyboard.up('Space');await page.goto(`${origin}/?autostart=1&capture=1&level=${level}${extra}`);return wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);}
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function gun(){await page.evaluate(()=>window.__unknownPlatformerCollectPickup('blaster'));await wait(s=>s.equipment.active==='blaster');}
async function upgrade(mode){let s=await read();const station=s.gunUpgradeStations.find(p=>p.mode===mode);await place(station.x,station.y+62);return wait(s=>s.equipment.gunUpgrade===mode);}
try{
 for(const level of [1,2,3,4,6]){
  const s=await boot(level);console.log('route',level);assert.equal(s.powerStations.filter(p=>p.kind!=='blaster').length,1);assert.equal(s.powerStations.filter(p=>p.kind==='blaster').length,2);assert.equal(s.gunUpgradeStations.length,3);
  for(const station of [...s.powerStations,...s.gunUpgradeStations])assert(s.terrain.platforms.some(r=>station.x>=r.x&&station.x<=r.x+r.w&&Math.abs(station.y+62-r.y)<1));
  assert.deepEqual(s.failedAssets,[]);
 }
 evidence.allGroundLevelRoutes=true;
 console.log('routes passed');
 await boot(1,'&character=barrett&unlockRoster=1');assert.equal((await read()).equipment.active,'hands');assert((await read()).gunUpgradeStations.every(p=>!p.available));
 await gun();await wait(s=>s.gunUpgradeStations.every(p=>p.available));await upgrade('rapid');
 await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',1000));await place(100,480);await page.keyboard.press('ArrowRight',{delay:20});
 let start=(await read()).weapon.shotsFired;await page.keyboard.down('Space');await page.waitForTimeout(540);await page.keyboard.up('Space');let s=await read();assert(s.weapon.shotsFired-start>=4);evidence.rapidPulls=s.weapon.shotsFired-start;
 await upgrade('fan');await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',1000));await place(100,480);await page.keyboard.press('ArrowRight',{delay:20});await page.waitForTimeout(1000);
 await page.keyboard.press('Space',{delay:40});s=await read();const fan=s.projectiles.filter(p=>p.gunUpgrade==='fan');assert.equal(fan.length,5);assert(new Set(fan.map(p=>p.velocityY)).size>1);await page.screenshot({path:path.join(out,'fan.png')});evidence.fanPellets=fan;
 await upgrade('homing');await place(100,480);await page.keyboard.press('ArrowRight',{delay:20});await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[450],hp:1000,lift:80}));await page.waitForTimeout(1000);
 await page.keyboard.press('Space',{delay:40});await page.waitForTimeout(180);s=await read();assert(s.projectiles.some(p=>p.gunUpgrade==='homing'&&p.velocityY<0));await page.screenshot({path:path.join(out,'homing.png')});await wait(s=>s.enemies.some(e=>e.hp<1000));evidence.homingCurvesAndHits=true;
 await page.goto(origin);await page.getByRole('button',{name:'Start game',exact:true}).click();await page.locator('[data-character-id="xgod"]').click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await wait(s=>s.mode==='platforming'&&s.player?.grounded,60000);await gun();await upgrade('homing');
 await page.keyboard.press('p');await wait(s=>s.mode==='paused');await page.getByRole('button',{name:'Save & Quit',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Game',exact:true}).click();await wait(s=>s.mode==='platforming'&&s.equipment.gunUpgrade==='homing');evidence.saveContinue=true;
 await gun();assert.equal((await read()).equipment.gunUpgrade,'homing');await page.evaluate(()=>window.__unknownPlatformerCollectPickup('sword'));await wait(s=>s.equipment.active==='sword');assert.equal((await read()).equipment.gunUpgrade,undefined);await wait(s=>s.gunUpgradeStations.every(p=>!p.available));evidence.weaponSwapClears=true;
 await gun();await upgrade('rapid');for(let i=0;i<3;i++){await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(1));await page.waitForTimeout(930);}s=await read();assert.equal(s.equipment.active,'hands');assert.equal(s.equipment.gunUpgrade,undefined);assert(s.gunUpgradeStations.every(p=>!p.available));evidence.gunLossClears=true;
 await boot(1,'&character=turkey_king&code=allhailking');s=await read();assert.equal(s.selectedCharacter.id,'turkey_king');assert.equal(s.gunUpgradeStations.length,0);assert.equal(s.powerStations.length,0);evidence.kingRestriction=true;
 await page.setViewportSize({width:844,height:390});await boot(1,'&character=barrett&unlockRoster=1');await gun();await upgrade('fan');await page.screenshot({path:path.join(out,'phone-fan.png')});const touch=page.locator('[data-touch-control="attack"]');start=(await read()).weapon.shotsFired;await touch.dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',bubbles:true});await wait(s=>s.weapon.shotsFired>start);await touch.dispatchEvent('pointercancel',{pointerId:8,pointerType:'touch',bubbles:true});evidence.touchFire=true;
 await page.setViewportSize({width:1280,height:800});await boot(1,'&finishLevel=1&character=barrett&unlockRoster=1');
 await page.evaluate(()=>window.__unknownPlatformerBossRulesTest({state:'recover',hp:2,stageMove:JSON.parse(window.render_game_to_text()).enemies.find(e=>e.kind==='boss').bossId==='turkey'?'wing_gust':'fire_volley'}));await upgrade('rapid');
 s=await read();let boss=s.enemies.find(e=>e.kind==='boss');await place(boss.x-220,boss.floorY);await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('Space');await wait(s=>s.bossDefeated);await page.keyboard.up('Space');
 await wait(s=>s.bossDeath.stage==='finished'&&!s.celebration.active);s=await read();await place(s.progress.levelEndX,480);
 s=await wait(s=>s.mode==='campaign-story'&&s.chapter==='level1');assert.equal(s.resume.equipment.active,'blaster');assert.equal(s.resume.equipment.gunUpgrade,'rapid');
 await page.getByRole('button',{name:'Skip story',exact:true}).click();await wait(s=>s.level===2&&s.player?.grounded&&s.equipment.gunUpgrade==='rapid',60000);evidence.actualBossVictoryCarriesGun=true;
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();}
