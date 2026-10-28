import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/xgod-jump-v3/playtest/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=n=>page.screenshot({path:fileURLToPath(new URL(`${n}.png`,out))});
async function wait(pred,timeout=5000){const until=Date.now()+timeout;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(pred(s))return s;await page.waitForTimeout(10);}throw new Error(`Timeout ${pred}`);}
async function boot(sword=true,extra=''){
  for(const k of ['ArrowRight','ArrowLeft','KeyZ','Space','KeyC'])await page.keyboard.up(k);
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=1&capture=1${sword?'&sword=1&swordUnlocked=1':''}${extra}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets,[]);
}
try{
  const meta=JSON.parse(await fs.readFile(new URL('../public/characters/xgod/jump-v3/metadata.json',import.meta.url),'utf8'));
  assert.equal(meta.weaponHand,'right');assert.equal(meta.swordAsset,'characters/xgod/flame-sword-upright-v1.png');assert.deepEqual(meta.swordSize,[2.8,5.1]);
  for(const sword of [true,false])for(const facing of ['right','left']){
    await boot(sword);const weapon=sword?'sword':'blaster';
    if(facing==='left'){await page.keyboard.down('ArrowLeft');await page.waitForTimeout(90);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(180);}
    const samples=[],poses=new Set();await page.keyboard.down('KeyZ');const until=Date.now()+1350;
    while(Date.now()<until){
      const s=await read();samples.push(s.player);if(s.movement.jumpPose)poses.add(s.movement.jumpPose);
      assert.equal(s.player.bodyHeight,108);assert.equal(s.player.facing,facing);assert.equal(s.player.lives,3);
      if(s.movement.jumpPose)assert.equal(s.player.texture,`runner_${weapon}-jump`);
      await page.waitForTimeout(10);
    }
    await page.keyboard.up('KeyZ');let s=await read();assert(s.player.grounded);assert.equal(s.player.bodyBottom,480);
    for(const p of meta.poses)assert(poses.has(p),`${weapon}/${facing} shows ${p}`);
    assert(Math.min(...samples.map(p=>p.y))<320);assert.equal(s.player.health,100);
    evidence[`${weapon}-${facing}`]=[...poses];
    await fs.writeFile(new URL(`${weapon}-${facing}-samples.json`,out),JSON.stringify(samples));
  }
  await boot();await page.keyboard.down('KeyZ');await wait(s=>s.movement.jumpPose==='tuck');await shot('sword-tucked');await page.keyboard.up('KeyZ');
  await wait(s=>s.player.grounded);await page.waitForTimeout(160);
  await page.keyboard.down('KeyZ');await wait(s=>s.movement.jumpPose==='reach');await shot('sword-descending');await page.keyboard.up('KeyZ');
  await wait(s=>s.player.grounded);await page.waitForTimeout(180);
  // A new jump interrupts the grounded landing pose immediately.
  await page.keyboard.down('KeyZ');await page.waitForTimeout(120);await page.keyboard.up('KeyZ');
  await wait(s=>s.movement.jumpPose==='land');await page.keyboard.down('KeyZ');
  let s=await wait(s=>!s.player.grounded&&s.player.velocityY< -300);assert.equal(s.player.texture,'runner_sword-jump');
  await page.keyboard.up('KeyZ');evidence.responsiveLanding=true;
  await wait(s=>s.player.grounded);await page.waitForTimeout(180);
  await page.keyboard.down('KeyZ');await wait(s=>s.movement.jumpPose==='tuck');await page.keyboard.down('Space');await page.waitForTimeout(60);await page.keyboard.up('Space');
  s=await wait(s=>s.player.texture==='xgod_side_scroll_fire_sword_attack_v1');assert(!s.player.grounded);await page.keyboard.up('KeyZ');evidence.airSlashInterrupt=true;

  await boot(false);await page.keyboard.down('KeyZ');s=await wait(s=>s.movement.jumpPose==='apex');
  await page.keyboard.down('KeyC');await page.waitForTimeout(25);await page.keyboard.up('KeyC');s=await read();
  const bolt=s.projectiles.find(p=>p.playerShot);assert(bolt);
  const attach=meta.actions['blaster-jump'].attachments[Number(s.player.frame)].muzzle;
  assert(Math.abs(bolt.y-(s.player.y+(attach[1]-480)*.4))<7);await page.keyboard.up('KeyZ');evidence.airMuzzle=true;await shot('blaster-air-shot');

  await page.setViewportSize({width:844,height:390});await boot();await page.waitForTimeout(450);
  const jump=page.locator('[data-touch-control="jump"]');await jump.dispatchEvent('pointerdown',{pointerId:3,pointerType:'touch',bubbles:true});
  await wait(s=>s.movement.jumpPose==='tuck');await shot('phone-sword-jump');
  await jump.dispatchEvent('pointercancel',{pointerId:3,pointerType:'touch',bubbles:true});
  await wait(s=>s.player.grounded);await page.waitForTimeout(180);assert.equal((await read()).player.texture,'runner_sword-idle');evidence.touchCancel=true;
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
