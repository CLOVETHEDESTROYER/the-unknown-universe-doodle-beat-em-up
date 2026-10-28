import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1024,height:700}});
const errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const out=new URL('../output/ground-obstacles-v1/springs/',import.meta.url);await fs.mkdir(out,{recursive:true});
async function wait(pred){const until=Date.now()+7000;while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(pred(s))return s;await page.waitForTimeout(15);}throw new Error(`Timeout ${pred}`);}
try{
  const heroes=process.argv.includes('--teleportation-c')?['teleportation_c']:['xgod','barrett','nico','ezra','teleportation_c'];
  for(const hero of heroes)for(const level of [3,4,6]){
    await page.keyboard.up('ArrowRight');
    await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=${level}&capture=1&obstacleCourse=1&character=${hero}&unlockRoster=1`);
    await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded);
    let s=await read();assert.deepEqual(s.failedAssets,[]);const start=s.terrain.obstacleStart;
    await page.keyboard.down('ArrowRight');
    await wait(s=>s.springPads.some(p=>p.x>=start&&p.launches>0));
    await wait(s=>s.player.velocityY< -100);
    s=await wait(s=>s.player.grounded);
    await page.keyboard.up('ArrowRight');
    assert(s.player.bodyBottom<=360,`${hero} must reach level ${level}'s elevated spring landing; got ${s.player.bodyBottom}`);
    assert.equal(s.player.lives,3);assert.equal(s.movement.airLaunchKind,null);
    const feet=s.player.bodyBottom;await page.keyboard.press('Space');await page.waitForTimeout(160);
    const attack=await read();assert(Math.abs(attack.player.bodyBottom-feet)<3,'Attacking preserves the landing collider');
    if(['nico','ezra'].includes(hero))assert(attack.projectiles.some(p=>!p.enemyProjectile&&p.y<feet-30&&p.y>feet-90));
    if(hero==='barrett'&&level===6)await page.screenshot({path:fileURLToPath(new URL('barrett-platform-attack.png',out))});
    evidence.push({hero,level,x:s.player.x,landing:s.player.bodyBottom});
  }
  await fs.writeFile(new URL('results.json',out),JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,landings:evidence.length,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read(),evidence,errors},null,2));throw error;}
finally{await browser.close();}
