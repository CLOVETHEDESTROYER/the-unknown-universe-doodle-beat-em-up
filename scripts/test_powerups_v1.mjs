import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/ground-powerups-v1/playtest/',import.meta.url);await fs.mkdir(out,{recursive:true});
await build({entryPoints:['gameplay/powerups.ts','gameplay/flight.ts'],bundle:true,platform:'node',format:'esm',outdir:fileURLToPath(new URL('simulation/',out)),outExtension:{'.js':'.mjs'},logLevel:'silent'});
const {createLoadout,equipPowerup,hitPowerup,levelPowerupPool,restoreLoadout}=await import(new URL('simulation/powerups.mjs',out));
const {createFlight,damageShip,stepFlight}=await import(new URL('simulation/flight.mjs',out));
const evidence={},errors=[];
for(const [id,level] of [['blaster',1],['sword',1],['frost',2],['ember',3],['storm',4]]){
 let s=equipPowerup(createLoadout('hands'),id,level);assert.equal(s.active,id);assert.equal(s.hits,3);
 s=hitPowerup(s);assert.equal(s.hits,2);s=hitPowerup(s);assert.equal(s.hits,1);s=hitPowerup(s);assert.equal(s.active,'hands');assert.equal(s.hits,0);assert(s.unlocked.includes(id));
 s=equipPowerup(s,id,level);assert.equal(s.hits,3);assert.equal(hitPowerup(s,true).active,'hands');
 assert.equal(restoreLoadout(s,'hands').active,id);
 if(level>1)assert.equal(equipPowerup(createLoadout('hands'),id,level-1).active,'hands');
}
assert.deepEqual(levelPowerupPool(1),['blaster']);assert.equal(levelPowerupPool(6).length,5);evidence.threeHitLossRefillDeathAndStageGates=true;
{
 const s=createFlight(3,0,'EASY',20261016);s.phase='flight';s.combat.weapon='lance';s.weaponHits=3;s.checkpointWeapon='lance';
 for(let i=0;i<3;i++){s.clock=i*1800;assert(damageShip(s,5));assert.equal(s.weaponHits,2-i);assert.equal(damageShip(s,5),false);}
 assert.equal(s.combat.weapon,'twin');assert.equal(s.hull,85);s.clock+=1800;s.combat.weapon='spread';s.weaponHits=3;damageShip(s,100);stepFlight(s,1250,{x:0,y:0});
 assert.equal(s.combat.weapon,'twin');assert.equal(s.lives,2);evidence.flightUpgradeWearAndDeathLoss=true;
}
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const wait=async(fn,ms=6000)=>{const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout: '+fn.toString());};
async function boot(level,extra=''){
 for(const k of ['Space','KeyC','ArrowRight','ArrowLeft','ArrowDown'])await page.keyboard.up(k);
 await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=${level}&capture=1${extra}`);
 await wait(s=>s.engine==='platformer'&&s.player?.grounded);assert.deepEqual((await read()).failedAssets,[]);
}
const hurt=amount=>page.evaluate(n=>window.__unknownPlatformerDamagePlayer(n),amount);
const collect=kind=>page.evaluate(kind=>window.__unknownPlatformerCollectPickup(kind),kind);
async function face(direction=1){await page.keyboard.down(direction>0?'ArrowRight':'ArrowLeft');await page.waitForTimeout(35);await page.keyboard.up(direction>0?'ArrowRight':'ArrowLeft');}
try{
 const stations={};
 for(const [level,first] of [[1,'blaster'],[2,'frost'],[3,'ember'],[4,'storm'],[6,'storm']]){
  await boot(level,'&powerupPreview=1');let s=await read();stations[level]=s.powerStations;assert(s.powerStations.length>=3);assert.equal(s.powerStations[0].kind,first);
  assert(s.powerStations.every(p=>levelPowerupPool(level).includes(p.kind)));
  for(const p of s.powerStations){assert(s.terrain.platforms.some(r=>p.x>=r.x&&p.x<=r.x+r.w&&Math.abs(p.y+62-r.y)<1),'Pickup has support');}
  await shot(`level-${level}-pickup`);await page.keyboard.down('ArrowRight');s=await wait(s=>s.equipment.active===first&&s.powerStations[0].available===false);await page.keyboard.up('ArrowRight');
  assert.equal(s.equipment.hits,3);assert(s.equipment.unlocked.includes(first));await shot(`level-${level}-equipped`);
 }
 evidence.allGroundLevelsActualPickupAndSupportedSupplies=stations;
 // Three spaced unblocked hits, plus a duplicate hit inside invulnerability.
 await boot(1);await hurt(5);let s=await read();assert.equal(s.equipment.hits,2);await hurt(5);assert.equal((await read()).equipment.hits,2);
 await page.waitForTimeout(920);await hurt(5);assert.equal((await read()).equipment.hits,1);await page.waitForTimeout(920);await hurt(5);
 s=await wait(s=>s.equipment.active==='hands'&&s.xgodPose==='normal');assert(s.player.texture.startsWith('runner_')&&!s.player.texture.includes('blaster'));
 const fired=s.weapon.shotsFired;await page.keyboard.down('KeyC');await page.waitForTimeout(240);s=await read();assert(s.attack.visualActive);assert.equal(s.weapon.shotsFired,fired);assert.equal(s.player.texture,'runner_attack');await shot('unarmed-punch');await page.keyboard.up('KeyC');
 await page.waitForTimeout(500);let punchTarget=(await read()).enemies.find(e=>e.kind==='walker');await place(punchTarget.x-75,punchTarget.bodyBottom);await face();await page.keyboard.press('Space',{delay:65});
 await wait(s=>s.attack.hits>0);assert.equal((await read()).weapon.shotsFired,fired);evidence.unarmedPunchDealsRealDamage=true;
 await collect('blaster');s=await read();assert.equal(s.equipment.active,'blaster');assert.equal(s.equipment.hits,3);await shot('replacement-blaster');evidence.damageInvulnerabilityHandsAndRefill=true;
 await place(160,480);const supplyScore=(await read()).progress.score;await wait(s=>s.powerStations[0].available,14000);await collect('blaster');assert.equal((await read()).progress.score,supplyScore);evidence.supplyRechargesWithoutScoreFarming=true;
 await boot(2,'&sword=1&shield=1');await hurt(10);s=await read();assert.equal(s.equipment.hits,3);assert.equal(s.player.health,100);assert.equal(s.powerups.inkShieldReady,false);
 await page.waitForTimeout(920);await hurt(10);assert.equal((await read()).equipment.hits,2);await page.waitForTimeout(920);await hurt(100);await wait(s=>s.xgodPose==='normal'&&s.player.lives===2);
 assert.equal((await read()).equipment.active,'hands');await shot('death-keeps-equipment-lost');evidence.shieldProtectsAndCheckpointDoesNotResurrectPower=true;
 // Real ice projectile contact slows an ordinary enemy; it cannot freeze bosses.
 await boot(2);await collect('frost');s=await read();let e=s.enemies.find(e=>e.kind==='walker'&&e.hp>1.5&&!e.bounceLane);assert(e);
 await place(e.x-170,e.bodyBottom);await face();await page.keyboard.down('Space');s=await wait(s=>s.enemies.some(e=>e.frozenRemainingMs>200));await page.keyboard.up('Space');
 e=s.enemies.find(e=>e.frozenRemainingMs>200);assert.equal(e.velocityX,0);assert.equal(e.hp,e.maxHp-1.5);await shot('frost-real-hit');evidence.frostProjectileAndFreeze=true;
 await boot(3);await collect('ember');s=await read();e=s.enemies.find(e=>e.kind==='walker'&&!e.bounceLane);assert(e);
 await place(e.x-90,e.bodyBottom);await face();await page.keyboard.press('Space',{delay:65});s=await wait(s=>s.equipment.hitsLanded>0);assert(s.enemies.some(t=>t.kind===e.kind&&t.hp<e.hp)||s.progress.monstersDefeated>0);await shot('ember-dash-hit');
 assert(s.equipment.uses===1);evidence.emberDashDamagesRealEnemy=true;
 await boot(4);await collect('storm');s=await read();e=s.enemies.find(e=>e.kind==='walker'&&!e.bounceLane);assert(e);
 await place(e.x-95,e.bodyBottom);await page.keyboard.press('Space',{delay:65});s=await wait(s=>s.equipment.hitsLanded>0);await shot('storm-pulse-hit');assert.equal(s.equipment.uses,1);evidence.stormPulseRealDamage=true;
 await boot(6);await collect('storm');s=await read();e=s.enemies.find(e=>e.kind==='cosmic');assert(e);
 await place(e.x-170,e.bodyBottom);s=await wait(s=>s.projectiles.some(b=>b.enemyProjectile&&Math.hypot(b.x-s.player.x,b.y-(s.player.y-54))<140),9000);
 await page.keyboard.press('Space',{delay:45});s=await wait(s=>s.equipment.clearedBolts>0);await shot('storm-clears-hostile-bolt');evidence.stormClearsRealEnemyProjectile=true;
 // Every power must respect the existing boss guard; pulse cannot freeze or stun it.
 await boot(2,'&finishLevel=1');await collect('frost');s=await read();e=s.enemies.find(e=>e.bossId==='killinas_daughter');
 await place(e.x-180,e.bodyBottom);await face();await page.keyboard.down('Space');s=await wait(s=>s.enemies.find(e=>e.bossId==='killinas_daughter')?.guardedHits>0);await page.keyboard.up('Space');
 e=s.enemies.find(e=>e.bossId==='killinas_daughter');assert.equal(e.hp,e.maxHp);assert.equal(e.frozenRemainingMs,0);evidence.newPowerRespectsBossGuard=true;
 await page.setViewportSize({width:844,height:390});await boot(4,'&powerupPreview=1&character=barrett&unlockRoster=1');await page.keyboard.down('ArrowRight');await wait(s=>s.equipment.active==='storm');await page.keyboard.up('ArrowRight');
 const attack=page.locator('[data-touch-control="attack"]');await attack.dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',bubbles:true});await wait(s=>s.equipment.uses>0);await attack.dispatchEvent('pointercancel',{pointerId:8,pointerType:'touch',bubbles:true});s=await read();const uses=s.equipment.uses;
 await shot('phone-barrett-storm');await page.waitForTimeout(950);assert.equal((await read()).equipment.uses,uses);evidence.alternateHeroPhoneAttackAndCancel=true;
 await page.keyboard.press('KeyP');await page.waitForTimeout(90);s=await read();const recharge=s.powerStations.map(p=>p.rechargeMs);await page.waitForTimeout(500);assert.deepEqual((await read()).powerStations.map(p=>p.rechargeMs),recharge);await page.keyboard.press('KeyP');evidence.pauseFreezesSupplyTimers=true;
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence:Object.keys(evidence),errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
