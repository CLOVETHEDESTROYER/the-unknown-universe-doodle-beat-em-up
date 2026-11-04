import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:54821';
const out=process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'unknown-turkey-king-v1');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});let context,page;const errors=[],evidence=[];
async function fresh(options={}){
 if(context)await context.close();context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,...options});page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
}
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.enemies?.find(e=>e.kind==='boss');
async function wait(fn,ms=60000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s,boss(s)))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
const shot=name=>page.screenshot({path:path.join(out,name+'.png')});
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const fixture=opts=>page.evaluate(opts=>window.__unknownPlatformerBossRulesTest(opts),opts);
async function boot(extra=''){
 await page.keyboard.up('Space');await page.keyboard.up('c');await page.keyboard.up('x');
 await page.goto(`${origin}/?autostart=1&level=1&capture=1&character=turkey_king${extra}`);
 const s=await wait(s=>s.mode==='platforming'&&s.player?.grounded);assert.equal(s.selectedCharacter.id,'turkey_king');assert.deepEqual(s.failedAssets,[]);return s;
}
async function enter(code){await page.getByLabel('Secret code',{exact:true}).fill(code);await page.getByRole('button',{name:'Apply code',exact:true}).click();}
try{
 await fresh();await page.goto(`${origin}/?autostart=1&character=turkey_king&capture=1`);let s=await wait(s=>s.player?.grounded);assert.equal(s.selectedCharacter.id,'xgod');
 await page.goto(origin);await page.getByRole('button',{name:'Start game',exact:true}).click();
 const card=page.locator('[data-character-id="turkey_king"]');assert(await card.isDisabled());
 await enter('wrongking');assert(await card.isDisabled());assert.match(await page.locator('#secret-code-feedback').innerText(),/not recognized/);
 await enter('  AllHailKing  ');assert(!(await card.isDisabled()));assert.match(await page.locator('#secret-code-feedback').innerText(),/Turkey King/);
 assert(await page.locator('[data-character-id="elytron"]').isDisabled());
 await shot('unlocked-card');await card.click();await page.getByRole('button',{name:'Skip story',exact:true}).click();
 s=await wait(s=>s.mode==='platforming'&&s.player?.grounded);assert.equal(s.selectedCharacter.id,'turkey_king');assert.equal(s.seasonalTheme,'thanksgiving');assert.equal(boss(s).bossId,'turkey');
 assert(s.selectedCharacter.standingHeight>=240,'Turkey King is at least 1.5x the 160px kids');assert.equal(s.weapon.primary,'royal_staff');assert.equal(s.equipment.active,'hands');assert(!s.powerStations.length);assert(s.pickups.every(p=>['coin','heart','rush_star'].includes(p.kind)));await shot('level1-king');
 await page.keyboard.press('p');await wait(s=>s.mode==='paused');await page.getByRole('button',{name:'Save & Quit',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Continue Game',exact:true}).click();s=await wait(s=>s.mode==='platforming'&&s.player?.grounded);assert.equal(s.selectedCharacter.id,'turkey_king');assert.equal(s.equipment.active,'hands');
 evidence.push({codeUnlock:true,otherHeroesStayLocked:true,realSelection:true,thanksgiving:true,saveContinue:true});
 s=await boot();const start=s.player.x;await page.keyboard.press('ArrowRight',{delay:220});s=await read();assert(s.player.x>start+25);assert.equal(s.player.facing,'right');
 await page.keyboard.press('z',{delay:35});await wait(s=>!s.player.grounded);await page.keyboard.press('z',{delay:35});await wait(s=>s.movement.heroMobility.doubleJumps>=1);await shot('double-jump');
 evidence.push({restartKeepsKing:true,movement:true,doubleJump:true});
 await boot();await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',20));await page.waitForTimeout(150);
 let enemy=(await read()).enemies[0];await place(enemy.x-90,480);await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('Space');
 s=await wait(s=>s.turkeyKing.staffHits>=1,3000);await page.keyboard.up('Space');assert(s.enemies[0].hp<=16);await shot('staff-strike');
 evidence.push({realStaffDamage:20-s.enemies[0].hp});
 for(const direction of [1,-1]){
  await boot();await page.evaluate(()=>window.__unknownPlatformerEnemyTest('walker',20));await page.waitForTimeout(150);enemy=(await read()).enemies[0];
  await place(enemy.x-direction*260,480);await page.keyboard.press(direction>0?'ArrowRight':'ArrowLeft',{delay:20});await page.keyboard.down('c');
  s=await wait(s=>s.projectiles.some(p=>p.pattern==='royal_turkey'),2500);await page.keyboard.up('c');const bird=s.projectiles.find(p=>p.pattern==='royal_turkey');assert.equal(Math.sign(bird.velocityX),direction);assert.equal(bird.texture,'turkey_king_bird');
  await shot(direction>0?'throw-right':'throw-left');s=await wait(s=>s.enemies[0]?.hp<20,3000);assert(s.enemies[0].hp<=16);evidence.push({turkeyDirection:direction,realProjectileDamage:20-s.enemies[0].hp});
 }
 await boot('&sword=1&shield=1&dinio=1&doghost=1&teleportc=1&gravityCore=1');s=await read();assert.equal(s.equipment.active,'hands');assert.equal(s.powerups.inkShieldReady,false);
 await page.evaluate(()=>window.__unknownPlatformerCollectPickup('sword'));assert.equal((await read()).equipment.active,'hands');
 const hp=s.player.health;await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(8));s=await wait(s=>s.player.health<hp);assert.equal(s.equipment.active,'hands');assert(s.turkeyKing);
 evidence.push({noStartingPowerups:true,noPickupSwap:true,weaponsSurviveDamage:true});
 await boot('&finishLevel=1');await fixture({state:'recover',stageMove:'wing_gust',hp:100});s=await read();await place(boss(s).x-200,boss(s).floorY);await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.down('x');
 s=await wait((s,b)=>b.hp<100,3000);await page.keyboard.up('x');assert(boss(s).counterStunned);assert.equal(s.equipment.active,'hands');evidence.push({realBossCounterStun:true,damage:100-boss(s).hp});await shot('boss-stunned-by-turkey');
 await boot();await page.keyboard.down('x');await wait(s=>s.turkeyKing.throws>=1);await page.keyboard.up('x');await page.keyboard.press('p');s=await wait(s=>s.mode==='paused');const cooldown=s.turkeyKing.cooldownRemainingMs;
 await page.waitForTimeout(350);assert.equal((await read()).turkeyKing.cooldownRemainingMs,cooldown);await page.keyboard.press('p');s=await wait(s=>s.mode==='platforming');assert(s.turkeyKing.cooldownRemainingMs>cooldown-150);evidence.push({pausePreservesThrowClock:true});
 await boot();const lives=(await read()).player.lives;await page.evaluate(()=>window.__unknownPlatformerDamagePlayer(200));s=await wait(s=>s.player?.grounded&&s.player.lives<lives&&s.player.health>0);assert.equal(s.selectedCharacter.id,'turkey_king');assert.equal(s.equipment.active,'hands');evidence.push({deathRespawnKeepsNativeWeapons:true});
 await page.goto(`${origin}/?autostart=1&level=5&character=turkey_king&capture=1&flightFinale=1`);s=await wait(s=>s.engine==='flight'&&s.player);assert.deepEqual(s.failedAssets,[]);assert.equal(s.weaponPickups.length,0);await shot('flight-king');evidence.push({flightLoads:true,flightPowerupsDisabled:true});
 await fresh({...devices['iPhone 13'],viewport:{width:844,height:390},deviceScaleFactor:1});
 await page.goto(`${origin}/?autostart=1&level=1&character=turkey_king&code=allhailking&capture=1`);await wait(s=>s.player?.grounded&&s.turkeyKing);
 await page.getByRole('button',{name:'Special: Royal Turkey Toss',exact:true}).click();await wait(s=>s.turkeyKing.throws>=1,2500);await page.getByRole('button',{name:'Use equipped attack',exact:true}).click();await wait(s=>s.turkeyKing.staffSwings>=1,2500);await shot('phone-native-attacks');
 evidence.push({phoneTouchThrow:true,phoneTouchStaff:true,directCodePlayLink:true});
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(e){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(e),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw e;}
finally{await browser.close();}
