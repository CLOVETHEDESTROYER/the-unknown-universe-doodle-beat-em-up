import {chromium} from 'playwright';
import {enterAlleyFromSave} from './alley_test_helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178',out='output/playwright/alley-dance-v1';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 const NativeAudio=window.Audio;window.__testMusic=[];
 window.Audio=class extends NativeAudio{constructor(src){super(src);window.__testMusic.push({src,element:this});}};
});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,timeout=45000){const end=Date.now()+timeout;while(Date.now()<end){const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(35);}throw Error('Timeout '+fn+' '+JSON.stringify(await read()));}
async function walkTo(x){await page.keyboard.down('ArrowRight');await wait(s=>s.player.x>=x);await page.keyboard.up('ArrowRight');}
try{
 await enterAlleyFromSave(page,origin);
 await wait(s=>s.mode==='alley_rescue'&&s.backgroundReady);
 const intro=await page.evaluate(()=>window.__testMusic.some(t=>t.src==='/audio/music/unknown-universe-intro-new.mp3'));
 assert(intro,'The new intro replaces title-screen music');
 await page.keyboard.press('ArrowRight');await wait(s=>s.music.alleyPlaying);
 let alley=await read();assert.equal(alley.music.track,'uneasy-pursuit');assert(alley.music.alleyLoop);const alleyAt=alley.music.alleyTime;
 await walkTo(790);await page.keyboard.press('e');await wait(s=>s.room==='hall');
 alley=await read();assert(alley.music.alleyPlaying);assert(alley.music.alleyTime>alleyAt,'Alley music continues through doors');
 await walkTo(790);await page.keyboard.press('e');await wait(s=>s.room==='gunroom');
 await walkTo(620);await page.keyboard.press('e');await wait(s=>s.phase==='gift');
 assert((await read()).music.alleyPlaying,'Uneasy Pursuit plays through the arm gift');
 await wait(s=>s.phase==='dance');let s=await read();assert(s.armUnlocked&&s.armEquipped&&s.dance.spritesReady);assert(!s.dance.done);
 assert.equal(s.music.track,'dance');assert.equal(s.music.alleyPlaying,false,'Alley track stops before dance playback');
 const x=s.player.x,start=Date.now(),pose=s.pose;
 await page.keyboard.down('ArrowRight');await page.keyboard.press('c');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');
 s=await read();assert.equal(s.player.x,x);assert.equal(s.shots,0);assert(s.dance.remaining>13);assert(s.dance.musicPlaying||s.dance.musicBlocked);
 await page.screenshot({path:out+'/desktop-dance.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(100);s=await read();assert(s.dance.reducedMotion);assert.equal(s.phase,'dance');
 await page.screenshot({path:out+'/phone-reduced-motion.png'});
 await wait(s=>s.dance.done&&s.phase==='idle',25000);assert(Date.now()-start>=13000);
 s=await read();assert(s.dance.musicPlaying);assert(s.dance.musicLoop);const musicAt=s.dance.musicTime;
 await page.keyboard.down('ArrowLeft');await wait(s=>s.player.x<130);await page.keyboard.up('ArrowLeft');
 await page.keyboard.press('e');await wait(s=>s.room==='hall');s=await read();assert(s.dance.musicPlaying);assert(s.dance.musicTime>musicAt);
 await walkTo(790);await page.keyboard.press('e');await wait(s=>s.room==='gunroom');assert((await read()).dance.musicPlaying);
 await page.keyboard.down('ArrowRight');await wait(s=>s.mode==='platforming'&&s.level===2,60000);await page.keyboard.up('ArrowRight');
 assert(await page.evaluate(()=>window.__testMusic.filter(t=>t.src==='/audio/music/uneasy-pursuit-alleyway.mp3'||t.src==='/audio/music/alley-blaster-party.mp3').every(t=>t.element.paused&&!t.element.getAttribute('src'))),'Both Alley tracks are released on exit');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({passed:true,danceSeconds:15,armThenDance:true,movementLocked:true,musicContinuesAfterDance:true,musicContinuesAcrossRooms:true,rightExit:true,reducedMotion:true,errors},null,2));
 console.log('Alley dance, local audio, input lock, reduced motion and right exit passed');
}catch(e){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),state:await read()},null,2));throw e;}
finally{await browser.close();}
