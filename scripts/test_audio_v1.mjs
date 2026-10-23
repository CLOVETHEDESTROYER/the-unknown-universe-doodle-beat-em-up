import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/audio-v1/playtest/',import.meta.url);await fs.mkdir(out,{recursive:true});
await build({entryPoints:['audio/soundBank.ts'],bundle:true,platform:'node',format:'esm',outdir:fileURLToPath(new URL('simulation/',out)),outExtension:{'.js':'.mjs'},logLevel:'silent'});
const {SOUND_BANK,soundPath}=await import(new URL('simulation/soundBank.mjs',out));
const manifest={files:Object.entries(SOUND_BANK).flatMap(([name,def])=>Array.from({length:def.variants},(_,variant)=>({file:soundPath(name,variant)})))};
assert.equal(manifest.files.length,Object.values(SOUND_BANK).reduce((n,d)=>n+d.variants,0));
let bytes=0;for(const item of manifest.files){
 const wav=await fs.readFile(new URL('../public'+item.file,import.meta.url));bytes+=wav.length;
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert([32000,44100].includes(wav.readUInt32LE(24)));assert.equal(wav.readUInt16LE(22),1);
 let peak=0,energy=0;for(let i=44;i<wav.length;i+=2){const sample=wav.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}
 assert(peak>.7&&peak<.81);assert(energy/((wav.length-44)/2)>.0001);assert.equal(wav.readInt16LE(wav.length-2),0);
}
const evidence={originalWavBank:{clips:manifest.files.length,events:Object.keys(SOUND_BANK).length,bytes}},errors=[];
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}});
await page.addInitScript(()=>{
 const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...args){
  const result=connect.call(this,destination,...args);
  if(destination instanceof AudioDestinationNode){
   const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);
   window.__sfxRms=()=>{const values=new Float32Array(2048);analyser.getFloatTimeDomainData(values);return Math.sqrt(values.reduce((n,v)=>n+v*v,0)/values.length);};
  }
  return result;
 };
 const NativeAudio=window.Audio;
 window.Audio=function(...args){const audio=new NativeAudio(...args);window.__musicAudio=audio;return audio;};
 window.Audio.prototype=NativeAudio.prototype;
});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const audio=()=>page.evaluate(()=>window.__unknownGameAudio.read());
const shot=n=>page.screenshot({path:fileURLToPath(new URL(n+'.png',out))});
const wait=async(fn,ms=7000)=>{await page.waitForFunction(()=>typeof window.render_game_to_text==='function',{},{timeout:60000});const until=Date.now()+ms;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(await fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout: '+fn.toString());};
const played=async name=>(await audio()).played[name]??0;
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const hurt=n=>page.evaluate(n=>window.__unknownPlatformerDamagePlayer(n),n);
const collect=kind=>page.evaluate(kind=>window.__unknownPlatformerCollectPickup(kind),kind);
async function boot(level=2,extra=''){
 for(const k of ['Space','KeyC','KeyX','KeyR','ArrowRight','ArrowLeft','KeyZ'])await page.keyboard.up(k);
 await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=${level}&capture=1${extra}`);
 await page.waitForFunction(()=>typeof window.render_game_to_text==='function',{},{timeout:60000});
 await wait(s=>s.player&&(s.engine==='flight'||s.player.grounded));
 assert.equal((await audio()).unlocked,false);assert.equal((await audio()).totalPlayed,0);
 await page.mouse.click(15,110);await page.waitForFunction(()=>window.__unknownGameAudio.read().loadedClips===window.__unknownGameAudio.read().expectedClips&&window.__unknownGameAudio.read().state==='running');
 assert.deepEqual((await audio()).failed,[]);
}
async function setVolume(label,value){
 await page.getByRole('slider',{name:label,exact:true}).evaluate((el,value)=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
 },value);
}
try{
 await boot();evidence.gestureUnlockAndAllClipsDecode=true;
 await page.evaluate(()=>window.__unknownGameAudio.preview('shipExplosion'));await page.waitForFunction(()=>window.__sfxRms?.()>.002);evidence.actualAudioGraphProducesSignal=true;
 await page.keyboard.down('Space');await wait(async()=>await played('blaster')>0);await page.keyboard.up('Space');
 let s=await read();assert(s.weapon.shotsFired>0);await shot('blaster-audio');evidence.realGunFiringSound=true;
 // Sword whiffs must not produce a hit cue; confirmed collisions do.
 await boot(2,'&sword=1');await page.keyboard.press('Space',{delay:65});await wait(async()=>await played('swordSwing')>0);assert.equal(await played('swordHit'),0);
 await page.waitForTimeout(450);s=await read();let enemy=s.enemies.find(e=>e.kind==='walker');await place(enemy.x-115,enemy.bodyBottom);
 await page.keyboard.press('Space',{delay:65});await wait(async()=>await played('swordHit')>0);assert((await read()).attack.hits>0);evidence.swordWhiffVersusConfirmedHit=true;
 // Three separate damage events remove the gun, then fists can connect audibly.
 await boot();await place(80,480);for(let i=0;i<3;i++){if(i)await page.waitForTimeout(920);await hurt(5);}assert.equal((await read()).equipment.active,'hands');
 await page.waitForTimeout(300);s=await read();enemy=s.enemies.find(e=>e.kind==='walker');await place(enemy.x-95,enemy.bodyBottom);await page.keyboard.press('Space',{delay:65});
 await wait(async()=>await played('punchHit')>0);assert(await played('punchSwing')>0);assert(await played('playerHit')>=3);await shot('punch-audio');evidence.punchAndPlayerDamageSounds=true;
 await place(80,480);await page.waitForTimeout(920);await hurt(100);await wait(async()=>await played('playerDeath')===1);await page.waitForTimeout(700);assert.equal(await played('playerDeath'),1);evidence.deathSoundOncePerLife=true;
 await boot(2,'&lives=1');await hurt(100);await wait(s=>s.heroDeath.active);assert.equal(await played('playerDeath'),1);assert.equal((await audio()).paused,false);evidence.lastLifeDeathTailNotCutOff=true;
 await boot(3);await collect('ember');assert(await played('powerup')>0);await page.keyboard.press('Space',{delay:60});await wait(async()=>await played('ember')>0);
 await boot(4);await collect('storm');await page.keyboard.press('Space',{delay:60});await wait(async()=>await played('storm')>0);
 await boot(2);await collect('frost');await page.keyboard.press('Space',{delay:80});await wait(async()=>await played('frost')>0);evidence.powerupAndElementalSounds=true;
 await boot(2,'&character=teleportation_c&unlockRoster=1');await place(80,480);await page.keyboard.press('KeyX',{delay:25});await wait(async()=>await played('teleport')===1);assert.equal((await read()).special.uses,1);evidence.actualTeleportSound=true;
 // Audio controls must change the mix without restarting the paused scene.
 await page.keyboard.press('KeyP');await page.getByRole('heading',{name:'Game Paused',exact:true}).waitFor();await page.waitForTimeout(100);
 assert.equal((await audio()).activeVoices,0);const position=(await read()).player.x;
 await setVolume('Music volume',18);await setVolume('Effects volume',37);
 await page.waitForFunction(()=>window.__unknownGameAudio.read().settings.music===.18&&window.__unknownGameAudio.read().settings.effects===.37);
 assert.equal(await page.evaluate(()=>window.__musicAudio.volume),.18);assert.equal((await read()).player.x,position);
 const before=await played('punchHit');await page.getByRole('button',{name:'Test effects',exact:true}).click();await wait(async()=>await played('punchHit')>before);await shot('sound-settings-desktop');
 await page.getByRole('button',{name:'Mute all audio',exact:true}).click();assert.equal((await audio()).settings.muted,true);assert(await page.evaluate(()=>window.__musicAudio.muted));assert(await page.getByRole('button',{name:'Test effects',exact:true}).isDisabled());
 const total=(await audio()).totalPlayed;await page.evaluate(()=>window.__unknownGameAudio.preview('shipExplosion'));assert.equal((await audio()).totalPlayed,total);assert.equal((await audio()).activeVoices,0);evidence.pausePreviewIndependentVolumesAndMute=true;
 await page.reload();await wait(s=>s.player);assert.deepEqual((await audio()).settings,{music:.18,effects:.37,muted:true});await page.mouse.click(15,110);await page.keyboard.press('KeyP');await page.getByRole('button',{name:'Unmute audio',exact:true}).click();
 await setVolume('Effects volume',0);const silent=(await audio()).totalPlayed;await page.evaluate(()=>window.__unknownGameAudio.preview('punchHit'));assert.equal((await audio()).totalPlayed,silent);await setVolume('Effects volume',65);evidence.persistenceAndEffectsOnlyZero=true;
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(1000);
 const phoneCard=page.getByRole('heading',{name:'Game Paused',exact:true}).locator('..');
 const bounds=await phoneCard.boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=844&&bounds.y+bounds.height<=391);
 const resumeBounds=await page.getByRole('button',{name:'Resume Playing',exact:true}).boundingBox();assert(resumeBounds.y>=0&&resumeBounds.y+resumeBounds.height<=390);
 await shot('sound-settings-phone');assert(await page.getByRole('slider',{name:'Effects volume',exact:true}).isVisible());
 await page.getByRole('button',{name:'Resume Playing',exact:true}).click();assert.equal((await read()).mode,'platforming');evidence.phoneControlsAndResume=true;
 // Flight shots and death effects originate from simulation events, not repeated rendering.
 await boot(5,'&shipDeathPreview=1');await page.evaluate(()=>window.advanceTime(0));await page.keyboard.down('Space');await page.evaluate(()=>window.advanceTime(20));await page.keyboard.up('Space');
 await wait(async()=>await played('shipExplosion')===1);assert.equal((await read()).player.lives,2);await page.evaluate(()=>window.advanceTime(700));assert.equal(await played('shipExplosion'),1);await shot('ship-explosion-audio');
 await page.evaluate(()=>window.advanceTime(600));assert.equal((await read()).ship.hull,100);evidence.actualShipDeathBoomAndRetry=true;
 await boot(5);await page.evaluate(()=>window.advanceTime(4800));await page.evaluate(()=>window.__unknownFlightDamageShip(20));await wait(async()=>await played('shipHit')===1);
 await page.keyboard.down('Space');await page.evaluate(()=>window.advanceTime(1000));await page.keyboard.up('Space');assert(await played('shipLaser')>0);evidence.flightCrashAndCannons=true;
 // A burst of preview requests cannot exceed the mixer voice budget.
 await page.evaluate(()=>{for(let i=0;i<100;i++)window.__unknownGameAudio.preview(i%2?'punchHit':'swordHit');});assert((await audio()).activeVoices<=12);assert((await audio()).suppressed>0);evidence.rateLimitsAndVoiceBudget=true;
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,audio:await audio(),errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),audio:await audio().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}finally{await browser.close();}
