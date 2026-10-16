import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/starbreak-weapons-v5/playtest/',import.meta.url);await fs.mkdir(out,{recursive:true});
await build({entryPoints:['gameplay/flight.ts','gameplay/flightCombat.ts'],bundle:true,platform:'node',format:'esm',outdir:fileURLToPath(new URL('simulation/',out)),outExtension:{'.js':'.mjs'},logLevel:'silent'});
const {createCombat,stepCombat}=await import(new URL('simulation/flightCombat.mjs',out));
const {createFlight,stepFlight,damageShip}=await import(new URL('simulation/flight.mjs',out));
const evidence={},errors=[];
const host=()=>({x:120,y:295,bank:0,clock:0,distance:0,checkpoint:0,hull:100,score:0,difficulty:'EASY',phase:'flight'});
const step=(s,c,ms,fire,rocks=[])=>{for(let n=0;n<ms;n+=1000/120){s.clock+=1000/120;stepCombat(s,c,1000/120,fire,()=>false,rocks);}};
const heavy=(id,x,y)=>({id,kind:'gunship',x,y,baseY:y,hp:12,maxHp:12,age:0,phase:'recover',phaseMs:0,aimX:100,aimY:y,startX:x,startY:y});
for(const [weapon,count] of [['twin',2],['spread',5],['lance',1],['homing',2]]){
  const s=host(),c=createCombat();c.weapon=weapon;step(s,c,8,true);assert.equal(c.bolts.length,count);
  assert(c.bolts.every(b=>b.weapon===weapon&&b.x>200));
  if(weapon==='spread')assert.equal(new Set(c.bolts.map(b=>Math.round(Math.atan2(b.vy,b.vx)*100))).size,5);
}
evidence.fourDistinctFiringPatterns=true;
{
  const s=host(),c=createCombat(),rocks=[{id:1,x:335,y:313,radius:33,hp:6}];c.weapon='lance';
  c.enemies=[heavy('one',470,313),heavy('two',610,313)];step(s,c,8,true,rocks);step(s,c,800,false,rocks);
  assert.equal(rocks[0].hp,3);assert(c.enemies.every(e=>e.hp===9));assert.equal(c.hits,2);evidence.lancePiercesWithoutRepeatDamage=true;
}
{
  const s=host(),c=createCombat();c.weapon='homing';c.enemies=[heavy('tracking',650,200)];step(s,c,8,true);step(s,c,150,false);
  assert(c.bolts.every(b=>b.targetId==='tracking'&&b.vy< -20));step(s,c,900,false);assert(c.hits>=2);evidence.homingSteersAndDamagesOffAxisTarget=true;
}
for(const weapon of ['spread','lance','homing']){
  const s=host(),c=createCombat();s.distance=15400;c.finaleStarted=true;c.spawnedWaves=[0,1,2,3,4];c.weapon=weapon;
  c.enemies=[{...heavy('void-pursuer',600,313),kind:'pursuer',hp:28,maxHp:28,phase:'tell',phaseNumber:1,move:'fan',volley:0,attacks:0}];
  step(s,c,900,true);assert.equal(c.enemies[0].hp,28);assert(c.guardedHits>0);
}
evidence.allUpgradesRespectBossGuard=true;
{
  const s=createFlight(3,0,'EASY',20261016);s.phase='flight';s.distance=5900;s.rocks=[];s.combat.spawnedWaves=[0,1,2,3,4];s.combat.weapon='spread';s.collectedWeapons=[0];
  stepFlight(s,500,{x:0,y:0});assert.equal(s.checkpointWeapon,'spread');
  s.combat.weapon='homing';s.collectedWeapons.push(2);damageShip(s,100);assert.equal(s.phase,'respawn');stepFlight(s,1300,{x:0,y:0});
  assert.equal(s.combat.weapon,'twin');assert.deepEqual(s.collectedWeapons,[0]);assert.equal(s.distance,6000);evidence.checkpointDropsUpgradeAndRestoresUncollectedPickup=true;
}
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=async ms=>{await page.evaluate(ms=>window.advanceTime(ms),ms);assert.deepEqual(errors,[]);};
const shot=n=>page.screenshot({path:fileURLToPath(new URL(`${n}.png`,out))});
async function release(){for(const k of ['Space','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])await page.keyboard.up(k);}
async function boot(weapon){
  await release();await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=5&capture=1&flightSeed=20261016&weaponPreview=${weapon}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).engine==='flight'&&JSON.parse(window.render_game_to_text()).player);
  await advance(0);assert.deepEqual((await read()).failedAssets,[]);assert.equal((await read()).weapon.id,'twin');
}
async function collect(weapon){
  let held=new Set();
  for(let i=0;i<100;i++){
    const s=await read();if(s.weapon.id===weapon){await release();await advance(180);return;}
    const pickup=s.weaponPickups.find(p=>p.weapon===weapon);assert(pickup);
    const next=new Set([...(pickup.x>s.player.x+10?['ArrowRight']:pickup.x<s.player.x-10?['ArrowLeft']:[]),...(pickup.y>s.player.y+7?['ArrowDown']:pickup.y<s.player.y-7?['ArrowUp']:[])]);
    for(const k of held)if(!next.has(k))await page.keyboard.up(k);for(const k of next)if(!held.has(k))await page.keyboard.down(k);
    held=next;await advance(40);
  }
  throw new Error(`Cannot fly into ${weapon} pickup`);
}
try{
  for(const [weapon,count] of [['spread',5],['lance',1],['homing',2]]){
    await boot(weapon);await shot(`${weapon}-pickup`);await collect(weapon);let s=await read();
    assert.equal(s.weapon.id,weapon);assert(s.weapon.collected.length===1);assert(!s.weaponPickups.some(p=>s.weapon.collected.includes(p.id)));
    await page.keyboard.down('Space');await advance(20);s=await read();assert.equal(s.projectiles.filter(b=>b.playerShot).length,count);
    assert(s.projectiles.filter(b=>b.playerShot).every(b=>b.weapon===weapon));await advance(180);await shot(`${weapon}-firing`);await page.keyboard.up('Space');
    evidence[`${weapon}RealPickupAndFire`]=true;
  }
  let s=await read(),before=s.visualMotion.cloudOffset,travel=s.flight.travel;await advance(1000);s=await read();
  assert(Math.abs(s.flight.travel-travel-230)<2);assert(Math.abs(s.visualMotion.cloudOffset-before-310.5)<2);assert.equal(s.visualMotion.streaks,34);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);const paused=await read();await advance(600);s=await read();
  assert.deepEqual(s.visualMotion,paused.visualMotion);assert.deepEqual(s.weaponPickups,paused.weaponPickups);assert.deepEqual(s.projectiles,paused.projectiles);
  await page.keyboard.press('KeyP');await page.waitForTimeout(80);evidence.fasterScenerySameRouteSpeedAndPause=true;
  await page.setViewportSize({width:844,height:390});await boot('homing');await collect('homing');
  const fire=page.getByRole('button',{name:'Hold to fire ship cannons',exact:true}),up=page.locator('[data-touch-control="up"]');
  await fire.dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',bubbles:true});await up.dispatchEvent('pointerdown',{pointerId:9,pointerType:'touch',bubbles:true});await advance(300);s=await read();
  assert(s.player.velocityY<0&&s.projectiles.some(b=>b.weapon==='homing'));await shot('phone-homing-and-steering');
  for(const [button,id] of [[fire,8],[up,9]])await button.dispatchEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true});
  const fired=(await read()).combat.shotsFired;await advance(400);assert.equal((await read()).combat.shotsFired,fired);evidence.phoneUpgradedWeaponAndCancel=true;
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
