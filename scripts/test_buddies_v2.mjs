import {chromium} from 'playwright';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='output/buddies-v2';await fs.mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:Number(process.env.GAME_TEST_PORT||4421),strictPort:true},logLevel:'error'});await server.listen();
const origin=server.resolvedUrls.local[0];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],evidence={};
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.url());});
const ids=['scribble-fox','puddle','rumble-puff','chomp-chest','orbit'];
const read=()=>page.evaluate(()=>{try{return JSON.parse(window.render_game_to_text());}catch{return null;}});
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
async function until(fn,ms=60000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read();if(s&&fn(s))return s;await page.waitForTimeout(25);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('unknownUniverse.wallet.v1')));
async function seed(buddy='classic',owned=ids){await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000});await page.evaluate(async({buddy,owned})=>{const m=await import('/gameplay/levelRewards.ts');localStorage.clear();localStorage.setItem(m.WALLET_KEY,JSON.stringify({...m.emptyWallet(),gold:5000,owned,equipped:{...m.emptyWallet().equipped,buddy}}));},{buddy,owned});}
async function boot(id,query=''){await seed(id);await page.goto(`${origin}?autostart=1&capture=1&health=65&${query}`,{waitUntil:'domcontentloaded',timeout:60000});await until(s=>s.mode==='platforming'&&s.player?.grounded||s.engine==='flight'&&s.player);}
try{
 await seed('classic',[]);await page.reload();
 evidence.rules=await page.evaluate(async()=>{
  const {newBuddyState,updateBuddyHelp}=await import('/gameplay/buddyAbilities.ts');
  const check=(yes,msg)=>{if(!yes)throw Error(msg);};let hp=50,health=50,hits=2,pulls=0,deflections=0,slows=0;
  const target={x:100,y:0,hp:50,boss:false,hit:n=>{hp-=n;return true;},slow:()=>slows++};
  const w={x:0,y:0,targets:[target],shots:[{x:100,y:0,vx:-100,vy:0,deflect:()=>deflections++}],kills:0,heal:n=>{const amount=Math.min(n,100-health);health+=amount;return amount;},repair:()=>{if(hits>=3)return false;hits++;return true;},magnet:()=>pulls++};
  let s=newBuddyState();updateBuddyHelp(s,'scribble-fox',0,w);check(hp===46,'Fox real damage');updateBuddyHelp(s,'scribble-fox',100,w);check(hp===46,'Fox cooldown');
  s=newBuddyState();updateBuddyHelp(s,'puddle',0,w);check(health===58&&s.healed===8,'Puddle healing');updateBuddyHelp(s,'puddle',9999,w);check(health===58,'Healing cooldown');updateBuddyHelp(s,'puddle',10000,{...w,targets:[]});check(health===58,'No idle healing');
  health=100;s=newBuddyState();updateBuddyHelp(s,'puddle',0,w);check(s.assists===0,'No wasted full-health heal');
  s=newBuddyState();updateBuddyHelp(s,'rumble-puff',0,w);check(slows===1&&hp===43,'Cloud damage and slow');
  s=newBuddyState();hits=3;updateBuddyHelp(s,'chomp-chest',0,{...w,kills:3});check(s.scrap===3&&s.repaired===0,'Hold ready repair at full durability');hits=1;updateBuddyHelp(s,'chomp-chest',1,{...w,kills:3});check(hits===2&&s.repaired===1&&s.scrap===0,'Repair earned by defeats');
  s=newBuddyState();updateBuddyHelp(s,'orbit',0,w);check(deflections===1&&pulls===1,'Gravity deflect and magnet');updateBuddyHelp(s,'orbit',100,w);check(deflections===1&&pulls===2,'Field cooldown; magnet remains active');
  for(const id of ['scribble-fox','rumble-puff']){let attempts=0;const guarded={...target,boss:true,hit:()=>{attempts++;return false;},slow:()=>{throw Error('Cannot freeze a boss');}};s=newBuddyState();updateBuddyHelp(s,id,0,{...w,targets:[guarded]});updateBuddyHelp(s,id,100,{...w,targets:[guarded]});check(attempts===1,'Guarded attacks still consume cooldown');}
  return {damage:true,healing:true,noIdleHeal:true,cooldowns:true,bankedRepair:true,deflection:true,magnet:true,bossGuards:true};
 });
 await page.getByLabel('Shop wallet',{exact:true}).click();await until(s=>s.mode==='workshop');
 for(const id of ids){assert(await page.getByRole('button',{name:`Choose ${id==='scribble-fox'?'Scribble Fox':id==='puddle'?'Puddle':id==='rumble-puff'?'Rumble Puff':id==='chomp-chest'?'Chomp Chest':'Orbit'}`,exact:true}).isDisabled());
  await page.evaluate(async id=>{const m=await import('/gameplay/workshopCrates.ts');const w=JSON.parse(localStorage.getItem('unknownUniverse.wallet.v1')),pool=m.lootPool(w,'normal'),reward=pool.find(r=>r.id===id),odds=m.lootOdds(w,'normal'),tier=odds.find(t=>t.rarity===reward.rarity),same=pool.filter(r=>r.rarity===reward.rarity);let roll=0;for(const t of odds){if(t===tier)break;roll+=t.chance;}const values=[roll+tier.chance*.5,(same.indexOf(reward)+.5)/same.length];const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=function(a){if(values.length){a[0]=Math.floor(values.shift()*2**32);return a;}return original(a);};},id);
  const before=(await wallet()).gold;await page.getByRole('button',{name:'Open Normal Crate for 125 Gold',exact:true}).click();await page.getByRole('button',{name:'Skip animation',exact:true}).click();await until(s=>s.cratePhase==='revealed');assert((await wallet()).owned.includes(id));assert.equal((await wallet()).gold,before-125);await page.getByRole('button',{name:'Back to crates',exact:true}).click();await until(s=>!s.crateReveal);
 }
 await shot('shop-buddies');await page.getByRole('button',{name:'Back to title',exact:false}).click();await page.getByRole('button',{name:'Start game',exact:true}).click();await page.getByRole('button',{name:'Choose Puddle',exact:true}).click();assert.equal((await wallet()).equipped.buddy,'puddle');await shot('pre-game-selection');
 await page.locator('[data-character-id="xgod"]').click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await until(s=>s.mode==='platforming'&&s.workshopCombat?.buddy==='puddle');
 for(const id of ids){
  await boot(id);await page.evaluate(()=>window.__unknownPlatformerSetPlayerPosition(220,480));
  if(id==='chomp-chest'){
   await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[],projectile:true,incoming:true}));await until(s=>s.equipment.hits===2);
   await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[100,170,240],hp:1}));await page.keyboard.down('c');await until(s=>s.workshopCombat.buddyHelp.repaired>0);await page.keyboard.up('c');assert.equal((await read()).equipment.hits,3);
  }else if(id==='orbit'){
   await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[],projectile:true,incoming:true}));await until(s=>s.workshopCombat.buddyHelp.deflected>0);
  }else{
   await page.evaluate(()=>window.__unknownPlatformerSpecialTest({offsets:[100,180],hp:50}));await until(s=>s.workshopCombat.assists>0);
   const state=await read();if(id==='puddle')assert(state.workshopCombat.buddyHelp.healed>=8);else assert(state.enemies.some(e=>e.hp<50));
  }
  assert.equal((await read()).workshopCombat.buddyTexture,`kai_shop_${id}`);await shot(`ground-${id}`);
  await page.keyboard.press('p');const frozen=(await read()).workshopCombat;await page.waitForTimeout(350);assert.deepEqual((await read()).workshopCombat,frozen);await page.keyboard.press('p');
  await page.goto(origin);await page.getByLabel('Shop wallet',{exact:true}).click();await page.getByRole('button',{name:/^Your inventory/}).click();await page.getByRole('button',{name:'Buddies',exact:true}).click();
  const name=id==='scribble-fox'?'Scribble Fox':id==='puddle'?'Puddle':id==='rumble-puff'?'Rumble Puff':id==='chomp-chest'?'Chomp Chest':'Orbit';await page.getByRole('button',{name:`Preview ${name}`,exact:true}).click();await page.locator('.kai-item-sprite[data-ready=true]').waitFor();
  await page.getByRole('button',{name:'Move',exact:true}).click();const frames=new Set();for(let i=0;i<9;i++){frames.add(await page.locator('.kai-item-sprite').getAttribute('data-frame'));await page.waitForTimeout(85);}assert(frames.size>=4);
  await page.getByRole('button',{name:'Assist',exact:true}).click();await shot(`preview-${id}`);
  await boot(id,'level=5&weaponPreview=spread');await until(s=>s.engine==='flight'&&s.workshopBuddy?.id===id);if(['scribble-fox','puddle','rumble-puff'].includes(id)){
    await page.evaluate(async()=>{await window.advanceTime(3000);window.__unknownFlightEnemyTest('scout',50);window.__unknownFlightSetShipPosition(600,300);});
    if(id==='puddle')await page.evaluate(()=>window.__unknownFlightDamageShip(20));
    await page.evaluate(async()=>window.advanceTime(100));
    const flight=await read();assert(flight.workshopBuddy.assists>0);if(id==='puddle')assert(flight.workshopBuddy.healed>0);else assert(flight.enemies.some(enemy=>enemy.hp<50));
  }
  await shot(`flight-${id}`);
 }
 await seed('puddle');await page.reload();await page.setViewportSize({width:393,height:852});await page.getByRole('button',{name:'Start game',exact:true}).click();assert(await page.locator('.character-select').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await shot('phone-selection');
 await page.emulateMedia({reducedMotion:'reduce'});await boot('orbit');const f=(await read()).workshopCombat.buddyFrame;await page.waitForTimeout(300);assert.equal((await read()).workshopCombat.buddyFrame,f);await shot('reduced-motion-orbit');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,buddies:5,frames:80,chestUnlocks:true,selection:true,liveAbilities:true,previewLoops:true,pause:true,flight:true,mobile:true,reducedMotion:true,errors}));
}catch(error){await shot('failure').catch(()=>{});await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),state:await read(),errors},null,2));throw error;}
finally{await browser.close();await server.close();}
