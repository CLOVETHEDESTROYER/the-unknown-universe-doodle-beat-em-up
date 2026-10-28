import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/xgod-blaster-run-v3/playtest/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=n=>page.screenshot({path:fileURLToPath(new URL(`${n}.png`,out))});
async function wait(pred,timeout=4500){const until=Date.now()+timeout;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(pred(s))return s;await page.waitForTimeout(10);}throw new Error(`Timeout ${pred}`);}
async function boot(extra=''){
  for(const k of ['ArrowRight','ArrowLeft','ArrowUp','KeyC','Space'])await page.keyboard.up(k);
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=2&capture=1${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets,[]);
}
try{
  const meta=JSON.parse(await fs.readFile(new URL('../public/characters/xgod/blaster-run-v3/metadata.json',import.meta.url),'utf8'));
  assert.equal(meta.actions['blaster-run'].frames,16);assert.equal(meta.weaponHand,'right');assert(meta.maxPlantError<.001);
  for(const facing of ['right','left']){
    await boot();await page.evaluate(x=>window.__unknownPlatformerSetPlayerPosition(x,480),facing==='right'?160:900);
    const key=facing==='right'?'ArrowRight':'ArrowLeft';await page.keyboard.down(key);await wait(s=>Math.abs(s.player.velocityX)>=345);
    const frames=new Set(),samples=[];const until=Date.now()+1100;
    while(Date.now()<until){const s=await read();
      assert.equal(s.player.texture,'runner_blaster-run');assert.equal(s.player.facing,facing);assert.equal(s.player.bodyHeight,108);assert.equal(s.player.bodyBottom,480);
      assert.equal(Math.abs(s.player.velocityX),350);frames.add(Number(s.player.frame));samples.push(s.player);await page.waitForTimeout(10);
    }
    assert(frames.size>=14,'The complete sixteen-pose cycle plays smoothly');assert([...frames].some(f=>f>7));
    await shot(`${facing}-stride`);
    const before=(await read()).weapon.shotsFired;await page.keyboard.down('KeyC');
    let s=await wait(s=>s.weapon.shotsFired>before);await page.keyboard.up('KeyC');
    const bolt=s.projectiles.find(p=>p.playerShot);assert(bolt);assert.equal(s.player.texture,'runner_blaster-run');
    const muzzle=meta.actions['blaster-run'].attachments[Number(s.player.frame)].muzzle;
    assert(Math.abs(bolt.y-(s.player.y+(muzzle[1]-480)*.4))<6,'Running fire follows the animated gun barrel');
    assert(facing==='right'?bolt.x>s.player.x+50:bolt.x<s.player.x-50);
    await page.keyboard.up(key);await page.waitForTimeout(250);assert.equal((await read()).player.texture,'runner_blaster-idle');
    evidence[facing]={frames:[...frames].sort((a,b)=>a-b),muzzle:true};await fs.writeFile(new URL(`${facing}-samples.json`,out),JSON.stringify(samples));
  }
  await boot();await page.keyboard.down('ArrowRight');await page.waitForTimeout(230);await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');
  await wait(s=>s.movement.turnSkidActive);await wait(s=>s.player.velocityX< -300);assert.equal((await read()).player.texture,'runner_blaster-run');
  await page.keyboard.up('ArrowLeft');await page.waitForTimeout(200);evidence.skidAndReverse=true;
  await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowUp');await wait(s=>s.player.texture==='runner_blaster-jump');
  await page.keyboard.up('ArrowUp');await wait(s=>s.player.grounded);await page.waitForTimeout(180);
  assert.equal((await read()).player.texture,'runner_blaster-run');await page.keyboard.up('ArrowRight');evidence.jumpReturnsToRun=true;

  await boot('&sword=1&swordUnlocked=1');await page.keyboard.down('ArrowRight');
  await wait(s=>s.player.texture==='xgod_side_scroll_fire_sword_run_v1');await page.keyboard.up('ArrowRight');evidence.swordRunPreserved=true;

  await page.setViewportSize({width:844,height:390});await boot();await page.waitForTimeout(450);
  const right=page.locator('[data-touch-control="right"]'),fire=page.locator('[data-touch-control="attack"]');
  await right.dispatchEvent('pointerdown',{pointerId:5,pointerType:'touch',bubbles:true});await wait(s=>s.player.velocityX>340);
  await fire.dispatchEvent('pointerdown',{pointerId:6,pointerType:'touch',bubbles:true});await wait(s=>s.weapon.shotsFired>0);
  assert.equal((await read()).player.texture,'runner_blaster-run');await shot('phone-running-fire');
  for(const [loc,id] of [[right,5],[fire,6]])await loc.dispatchEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true});
  await page.waitForTimeout(300);assert.equal((await read()).player.texture,'runner_blaster-idle');evidence.touchRunFireCancel=true;
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
