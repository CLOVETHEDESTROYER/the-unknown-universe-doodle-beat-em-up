import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const origin=process.env.GAME_TEST_URL || 'http://127.0.0.1:3000';
const companions=process.argv.includes('--companions');
const output=new URL(`../output/kilina-witch-v1/route-${companions?'companions':'solo'}/`,import.meta.url);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=name=>page.screenshot({path:fileURLToPath(new URL(`${name}.png`,output))});
async function wait(predicate,timeout=12000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    if(errors.length)throw new Error(errors.join('\n'));
    const s=await read();if(predicate(s))return s;
    await page.waitForTimeout(20);
  }
  throw new Error(`Timeout: ${predicate}`);
}
const evidence={};
try{
  await page.goto(`${origin}/?autostart=1&level=4&capture=1&sword=1&swordUnlocked=1${companions?'&dinio=1&doghost=1&teleportc=1&shield=1':''}`);
  await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
  let s=await read();
  assert.equal(s.level,4);assert.equal(s.chapter,'THE WITCHWOOD');assert.equal(s.progress.levelEndX,9700);
  assert.equal(s.enemies.find(e=>e.kind==='boss').bossId,'kilina');
  assert.equal(s.movingPlatforms.length,4);assert.equal(s.springPads.length,2);
  assert.deepEqual(s.failedAssets,[]);
  await shot('entrance');
  const jumps=[340,1580,2020,3150,3960,4770,5670,6515,6770,7315,7600];
  const finalFlag=s.terrain.checkpoints[s.terrain.checkpoints.length-1].x;
  const finalIndex=s.terrain.checkpoints.length-1;
  const ground=s.terrain.platforms.filter(p=>p.y===520&&p.h>=100).sort((a,b)=>a.x-b.x);
  const gaps=ground.slice(0,-1).filter((p,i)=>p.x+p.w<ground[i+1].x).map(p=>p.x+p.w);
  const used=new Set();
  const checkpoints=new Set();
  const frames=new Set();
  const samples=[];
  let jumpHeld=false,lastAttack=-10000;
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('KeyC');
  const deadline=Date.now()+100000;
  while(Date.now()<deadline){
    s=await read();
    if(errors.length)throw new Error(errors.join('\n'));
    assert.deepEqual(s.failedAssets,[]);
    assert.equal(s.player.lives,3,'The route can be traversed without losing a life');
    samples.push({x:s.player.x,y:s.player.y,grounded:s.player.grounded,health:s.player.health,checkpoint:s.checkpoint.index});
    checkpoints.add(s.checkpoint.index);frames.add(`${s.player.texture}:${s.player.frame}`);
    const target=jumps.find(x=>!used.has(x) && s.player.x>=x && s.player.x<x+110);
    const edge=[...s.terrain.platforms.filter(p=>p.h<=56),...s.crumblingPlatforms.filter(p=>p.solid),...s.movingPlatforms.map(p=>({...p,w:p.width}))]
      .some(p=>Math.abs(s.player.bodyBottom-p.y)<4&&s.player.x>=p.x+p.w-70&&s.player.x<=p.x+p.w+15);
    const gap=gaps.some(x=>s.player.bodyBottom>430&&s.player.x>=x-75&&s.player.x<x+15);
    if((target!==undefined||edge||gap) && s.player.grounded && !jumpHeld){
      used.add(target??s.player.x);await page.keyboard.down('KeyZ');jumpHeld=true;
    }else if(jumpHeld && s.player.velocityY>0){await page.keyboard.up('KeyZ');jumpHeld=false;}
    if(Date.now()-lastAttack>520){
      await page.keyboard.press('Space');lastAttack=Date.now();
    }
    if(s.player.x>=finalFlag-60)break;
    await page.waitForTimeout(25);
  }
  await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyC');await page.keyboard.up('KeyZ');
  await wait(s=>s.player.grounded);
  // Settle after any giant stomp, then walk onto the flag rather than jumping over it.
  for(let i=0;i<8;i++){
    s=await read();if(s.checkpoint.index>=finalIndex)break;
    const key=s.player.x<finalFlag?'ArrowRight':'ArrowLeft';
    await page.keyboard.down(key);
    await wait(s=>key==='ArrowRight'?s.player.x>=finalFlag:s.player.x<=finalFlag);
    await page.keyboard.up(key);
    await page.waitForTimeout(300);
  }
  s=await read();
  assert(Math.abs(s.player.x-finalFlag)<70,'Real keyboard movement reaches the sanctuary checkpoint');
  assert.equal(s.checkpoint.index,finalIndex);
  assert(used.size>=6);assert(frames.size>10);
  await shot('sanctuary-approach');
  evidence.route={player:s.player,checkpoint:s.checkpoint,jumps:[...used],checkpoints:[...checkpoints],frames:frames.size};
  await page.evaluate(()=>window.__unknownPlatformerForceFall());
  s=await wait(s=>s.player.grounded && Math.abs(s.player.x-finalFlag)<40 && s.player.health>0);
  assert.equal(s.checkpoint.index,finalIndex);
  assert.equal(s.bossArenaCamera.locked,false,'The checkpoint respawn is outside the encounter trigger');
  evidence.safeRespawn=s.player;
  await shot('checkpoint-respawn');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(1000);
  await shot('phone-sanctuary');
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',output),JSON.stringify({evidence,samples,errors},null,2));
  console.log(JSON.stringify({passed:true,checks:['newLevel','keyboardRoute','allGaps','checkpoint','safeRespawn','phone','assets'],player:s.player,errors}));
}catch(e){
  await fs.writeFile(new URL('failure.json',output),JSON.stringify({error:String(e),state:await read(),evidence,errors},null,2));
  await shot('failure');throw e;
}finally{await browser.close();}
