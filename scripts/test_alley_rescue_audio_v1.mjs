import {chromium} from 'playwright';
import {enterAlleyFromSave} from './alley_test_helpers.mjs';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=path.resolve('output/playwright/alley-rescue-audio-v1');await fs.mkdir(out,{recursive:true});
await build({entryPoints:['audio/alleyRescueAudio.ts'],bundle:true,platform:'node',format:'esm',outfile:out+'/cues.mjs'});
const {AlleyRescueAudio,RESCUE_CUES}=await import(pathToFileURL(out+'/cues.mjs'));
const fired=[];const timeline=new AlleyRescueAudio(c=>fired.push(c.id));
for(const phase of ['approach','transfer','rise','thanks'])for(let t=0;t<=3.5;t+=.01)timeline.update(phase,t);
assert.deepEqual(fired,RESCUE_CUES.map(c=>c.id));
timeline.update('approach',0);timeline.update('transfer',0);timeline.update('transfer',0);assert.equal(fired.length,9);
const browser=await chromium.launch({headless:true});const errors=[];
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4178';
try{
 for(const muted of [false,true]){
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.addInitScript(muted=>localStorage.setItem('unknownUniverse.audio.v1',JSON.stringify({music:0,effects:.65,muted})),muted);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  async function wait(fn){const end=Date.now()+30000;while(Date.now()<end){const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(35);}throw Error('Timed out '+fn);}
  async function right(x){await page.keyboard.down('ArrowRight');await wait(s=>s.player.x>=x);await page.keyboard.up('ArrowRight');}
  await enterAlleyFromSave(page,origin+'/?capture=1');
  await wait(s=>s.mode==='alley_rescue');await right(790);await page.keyboard.press('e');await wait(s=>s.room==='hall');
  await right(790);await page.keyboard.press('e');await wait(s=>s.room==='gunroom');await right(620);await page.keyboard.press('e');
  await wait(s=>s.phase==='thanks');const scene=await read();
  assert.deepEqual(scene.rescueAudio.triggered,RESCUE_CUES.map(c=>c.id));
  const audio=await page.evaluate(()=>window.__unknownGameAudio.read());assert.equal(audio.paused,false);
  if(muted)assert.equal(audio.totalPlayed,0);
  else for(const name of new Set(RESCUE_CUES.map(c=>c.sound)))assert(audio.played[name]>0,`${name} must actually play`);
  await page.screenshot({path:out+`/revived-${muted?'muted':'audible'}.png`});
  await page.getByRole('button',{name:'Save & Quit',exact:true}).click();
  const after=await page.evaluate(()=>window.__unknownGameAudio.read());assert(after.paused);assert.equal(after.activeVoices,0);
  await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({passed:true,cues:RESCUE_CUES.map(c=>c.id),audible:true,muteRespected:true,noDuplicateCues:true,exitCleanup:true,errors},null,2));
 console.log('Revival cues: actual audio, mute, timing, replay and exit cleanup passed');
}finally{await browser.close();}
