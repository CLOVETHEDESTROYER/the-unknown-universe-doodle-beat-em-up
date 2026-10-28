import {chromium,webkit,devices} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const engine=process.env.GAME_TEST_BROWSER||'chromium',origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4381';
const browser=await ({chromium,webkit})[engine].launch({headless:true,...process.env.GAME_TEST_EXECUTABLE?{executablePath:process.env.GAME_TEST_EXECUTABLE}:{}});
const page=await browser.newPage({...devices['iPhone 15 landscape'],deviceScaleFactor:1}),errors=[],evidence=[];
const out=new URL(`../output/audio-v2/${engine}/`,import.meta.url);await fs.mkdir(out,{recursive:true});
await page.addInitScript(()=>{
 localStorage.setItem('unknownUniverse.audio.v1',JSON.stringify({music:0,effects:.65,muted:false}));
 if(typeof AudioNode==='undefined')return;
 const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){
  const result=connect.call(this,destination,...args);
  if(destination instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);window.__sfxRms=()=>{const v=new Float32Array(2048);analyser.getFloatTimeDomainData(v);return Math.sqrt(v.reduce((n,x)=>n+x*x,0)/v.length);};}
  return result;
 };
});
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text())),audio=()=>page.evaluate(()=>window.__unknownGameAudio.read());
async function wait(fn,ms=14000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read(),a=await audio();if(fn(s,a))return {s,a};await page.waitForTimeout(15);}throw Error('Timeout '+fn);}
async function boot(query){await page.goto(`${origin}/?autostart=1&capture=1&unlockRoster=1&${query}`);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player,{},{timeout:60000});if((await read()).engine==='flight')await page.evaluate(()=>window.advanceTime(0));assert.equal((await audio()).unlocked,false);await page.mouse.click(15,110);await wait((s,a)=>a.loadedClips===a.expectedClips&&a.state==='running',30000);assert.deepEqual((await audio()).failed,[]);}
const shot=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
try{
 await page.goto(`${origin}/?autostart=1&capture=1&level=1`);await page.waitForFunction(()=>window.render_game_to_text&&window.__unknownGameAudio,{},{timeout:60000});
 const supportsAudio=await page.evaluate(()=>Boolean(window.AudioContext||window.webkitAudioContext));
 if(!supportsAudio){
  await page.keyboard.press('KeyZ',{delay:30});await wait(s=>!s.player.grounded);await page.keyboard.press('KeyZ',{delay:30});await page.keyboard.press('KeyZ',{delay:30});await wait(s=>s.movement.heroMobility.impacts>0);
  await page.keyboard.press('KeyP');await wait(s=>s.mode==='paused');await page.getByRole('combobox',{name:'Sound preview'}).selectOption('slamZgod');await page.getByRole('button',{name:'Test effects',exact:true}).click();
  const bounds=await page.getByRole('button',{name:'Resume Playing',exact:true}).boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=page.viewportSize().height);assert.equal((await audio()).activeVoices,0);assert((await audio()).suppressed>0);assert.deepEqual(errors,[]);await shot('no-web-audio-fallback');
  console.log(JSON.stringify({passed:true,engine,audioUnsupported:true,reason:'This browser build does not expose Web Audio',gameplayAndSettingsFallback:true,phoneResume:true,errors}));
 }else{
 for(const [hero,slam] of [['xgod','slamXgod'],['barrett','slamBarrett'],['nico','slamNico'],['ezra','slamEzra'],['teleportation_c','slamTeleport'],['zgod','slamZgod']]){
  await boot(`level=1&character=${hero}`);await page.evaluate(()=>{window.__unknownPlatformerSpecialTest({offsets:[120],hp:20});window.__unknownPlatformerSetPlayerPosition(220,480);});
  await page.keyboard.press('KeyZ',{delay:30});await wait(s=>!s.player.grounded);await page.keyboard.press('KeyZ',{delay:30});await wait((s,a)=>a.played.doubleJump===1);await page.keyboard.press('KeyZ',{delay:30});
  await wait((s,a)=>a.played[slam]===1);let a=await audio();assert.equal(a.played.jump,1);assert.equal(a.played.slamCharge,1);assert.equal(a.played.stomp??0,0,'One main slam sound, not another bass hit per enemy');
  await wait(s=>s.movement.heroMobility.bombPhase==='ready');await page.keyboard.press('KeyZ',{delay:30});await wait(s=>!s.player.grounded);await wait((s,a)=>(a.played.landing??0)>0);
  await page.keyboard.press('KeyP');await wait((s,a)=>s.mode==='paused'&&a.activeVoices===0);
  await page.getByRole('combobox',{name:'Sound preview'}).selectOption('shipLance');await page.getByRole('button',{name:'Test effects',exact:true}).click();await wait((s,a)=>a.played.shipLance>0);
  await page.waitForFunction(()=>window.__sfxRms?.()>.0005);const bounds=await page.getByRole('button',{name:'Resume Playing',exact:true}).boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=page.viewportSize().height,'Phone resume stays on screen');
  await shot(hero+'-sound-preview');evidence.push({hero,slam,jump:true,doubleJump:true,windup:true,landing:true,oneImpact:true,pausedPreviewSignal:true,phoneResume:true});
 }
 // Weapon pickups select separate flight firing families, not pitch-shifted ground blasters.
 for(const [weapon,cue] of [['twin','shipLaser'],['lance','shipLance'],['homing','shipMissile']]){
  await boot('level=5'+(weapon==='twin'?'':`&weaponPreview=${weapon}`));await page.evaluate(ms=>window.advanceTime(ms),weapon==='twin'?4800:0);
  if(weapon!=='twin'){const p=(await read()).weaponPickups.find(p=>p.weapon===weapon);assert(p);await page.evaluate(p=>window.__unknownFlightSetShipPosition(p.x,p.y),p);await page.evaluate(()=>window.advanceTime(30));}
  await page.keyboard.down('Space');await page.evaluate(()=>window.advanceTime(220));await wait((s,a)=>a.played[cue]>0);await page.keyboard.up('Space');assert.equal((await audio()).played.blaster??0,0);
  evidence.push({flightWeapon:weapon,cue,realFiring:true});
 }
 await boot('level=5&flightFinale=1');for(let i=0;i<70&&!((await audio()).played.enemyLaser>0);i++)await page.evaluate(()=>window.advanceTime(100));await wait((s,a)=>(a.played.enemyLaser??0)>0);evidence.push({actualBossLaser:true});
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,audio:await audio(),errors},null,2));console.log(JSON.stringify({passed:true,engine,evidence,errors}));
 }
}catch(e){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(e),state:await read().catch(()=>null),audio:await audio().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw e;}finally{await browser.close();}
