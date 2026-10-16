import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/enemy-variety-v1/playtest/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot=async n=>{
  const path=fileURLToPath(new URL(`${n}.png`,out));
  if(n==='phone-ghost')return page.screenshot({path});
  const data=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'));
  await fs.writeFile(path,Buffer.from(data.split(',')[1],'base64'));
};
const foe=(s,kind)=>s.enemies.find(e=>e.kind===kind);
async function wait(pred,timeout=7000){
  const until=Date.now()+timeout;
  while(Date.now()<until){assert.deepEqual(errors,[]);const s=await read();if(pred(s))return s;await page.waitForTimeout(15);}
  throw new Error(`Timeout ${pred}`);
}
async function boot(level,query=''){
  for(const k of ['ArrowRight','ArrowLeft','ArrowUp','KeyZ','Space','KeyC'])await page.keyboard.up(k);
  await page.goto(`${process.env.GAME_TEST_URL||'http://127.0.0.1:3000'}/?autostart=1&level=${level}&capture=1${query}`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).player?.grounded);
  assert.deepEqual((await read()).failedAssets,[]);
}
function approach(s,e,dist){
  const floor=e.kind==='ghost'?e.floorY:e.supportY;
  const candidates=e.kind==='ghost'?[e.x,(e.left+e.right)/2]:[e.x-dist,e.x+dist,e.left-70,e.right+70,e.left+30,e.right-30];
  const x=candidates.find(x=>s.terrain.platforms.some(p=>p.y===floor&&x>=p.x+22&&x<=p.x+p.w-22)
    &&!s.terrain.hazards.some(h=>x>=h.x-24&&x<=h.x+h.w+24&&Math.abs(h.y-floor)<50));
  assert(x!==undefined,`Safe approach for ${e.kind}`);return {x,y:floor};
}
try{
  const roster={};
  for(const level of [1,2,3,4,6]){
    await boot(level);await page.waitForTimeout(900);const s=await read();
    roster[level]=[...new Set(s.enemies.map(e=>e.kind))];
    assert(s.enemies.some(e=>e.kind==='boss'));
    for(const e of s.enemies.filter(e=>['spider','terror','cosmic'].includes(e.kind))){
      assert.notEqual(e.supportY,null,`${level} ${e.kind} has platform support`);
      assert(Math.abs(e.bodyBottom-e.supportY)<3,`${level} ${e.kind} feet on assigned surface`);
      assert(e.x>=e.left-3&&e.x<=e.right+3);
    }
    assert(s.enemies.filter(e=>e.bounceLane).every(e=>e.kind==='walker'));
  }
  evidence.stageRostersAndGroundSupport=roster;
  for(const [kind,level,dist] of [['spider',1,220],['ghost',2,0],['terror',2,165],['cosmic',3,360]]){
    await boot(level);let s=await read(),e=foe(s,kind);assert(e,kind);
    const pos=approach(s,e,dist);await place(pos.x,pos.y);
    s=await wait(s=>foe(s,kind)?.attackState==='tell');e=foe(s,kind);
    assert(e.warningVisible);assert.equal(e.velocityX,0);
    await page.keyboard.press('KeyP');await page.waitForTimeout(100);e=foe(await read(),kind);
    assert.equal(e.attackState,'tell');const paused=e.stateElapsedMs;
    await shot(`${kind}-warning`);await page.waitForTimeout(100);
    assert.equal(foe(await read(),kind).stateElapsedMs,paused);
    const lock={x:e.targetX,y:e.targetY,direction:e.attackDirection};
    await page.keyboard.press('KeyP');
    // Dodge after the tell. All attacks retain the original target/direction.
    const dodgeX=kind==='ghost'?e.right+145:pos.x;
    if(kind==='ghost')await place(dodgeX,pos.y);
    s=await wait(s=>foe(s,kind)?.attackState==='attack');
    e=foe(s,kind);assert.equal(e.warningVisible,false);assert.equal(e.targetX,lock.x);assert.equal(e.attackDirection,lock.direction);
    const startY=e.y;const frames=new Set(),samples=[];let captured=false;
    while(foe(s,kind)?.attackState==='attack'){
      e=foe(s,kind);samples.push(e);frames.add(e.visualFrame);
      assert.equal(e.targetX,lock.x);assert.equal(e.targetY,lock.y);
      if(kind==='ghost')assert(Math.abs(e.bodyBottom-e.y)<2,'Ghost collider follows the animated body');
      if(!captured&&e.stateElapsedMs>=140){
        await page.keyboard.press('KeyP');await page.waitForTimeout(80);
        await shot(`${kind}-attack`);await page.keyboard.press('KeyP');captured=true;
      }
      s=await read();await page.waitForTimeout(15);
    }
    assert.equal(foe(s,kind).attackState,'recover');await shot(`${kind}-recovery`);
    if(kind==='spider')assert(Math.min(...samples.map(e=>e.y))<startY-15,'Spider performs a real jump');
    if(kind==='ghost')assert(Math.max(...samples.map(e=>e.y))>startY+25,'Ghost dives toward the marked position');
    if(kind==='terror')assert(frames.size>=3,'Tongue-lash uses the original drawn attack sequence');
    if(kind==='cosmic')assert.equal(foe(s,kind).shotsInBurst,2,'Sentry fires two committed shots');
    const completed=foe(s,kind).attacksCompleted;assert(completed>=1);
    s=await wait(s=>foe(s,kind)?.attackState==='patrol');
    assert(foe(s,kind).texture.endsWith('_walk'));
    assert.equal(s.player.lives,3);
    await fs.writeFile(new URL(`${kind}-samples.json`,out),JSON.stringify(samples,null,2));
    evidence[kind]={warning:true,committed:true,recovery:true,frames:[...frames],completed};
  }
  // A real descending stomp defeats each restored normal enemy and awards one kill.
  for(const [kind,level] of [['spider',1],['ghost',2],['terror',2],['cosmic',3]]){
    await boot(level);let s=await read();await page.waitForTimeout(300);s=await read();const e=foe(s,kind),kills=s.progress.monstersDefeated;
    await place(e.x,e.bodyTop-24);
    s=await wait(s=>s.progress.monstersDefeated>kills,3000);
    assert.equal(s.progress.monstersDefeated,kills+1);assert(s.movement.stompCount>=1);assert.equal(s.player.lives,3);
  }
  evidence.allFourStompDefeats=true;
  // Ground enemies can also be defeated by real player gunfire.
  for(const [kind,level] of [['spider',1],['terror',2],['cosmic',3]]){
    await boot(level);let s=await read(),e=foe(s,kind);const pos=approach(s,e,kind==='cosmic'?120:170);
    await place(pos.x,pos.y);const face=pos.x<e.x?'ArrowRight':'ArrowLeft';
    await page.keyboard.down(face);await page.waitForTimeout(30);await page.keyboard.up(face);
    const kills=s.progress.monstersDefeated;await page.keyboard.down('KeyC');
    s=await wait(s=>s.progress.monstersDefeated>kills,6500);await page.keyboard.up('KeyC');
    assert(s.weapon.shotsFired>0);assert.equal(s.player.lives,3);
  }
  evidence.groundEnemiesDefeatedByGun=true;
  // A sentry's actual projectile damages the hero; checkpoint recovery clears its old volley.
  await boot(6);let s=await read(),e=foe(s,'cosmic'),pos=approach(s,e,330);await place(pos.x,pos.y);
  s=await wait(s=>foe(s,'cosmic')?.attackState==='tell');assert.equal(s.player.health,100);
  s=await wait(s=>s.projectiles.some(p=>p.enemyProjectile));
  s=await wait(s=>s.player.health===90);assert.equal(s.player.lives,3);evidence.sentryActualDamage=true;
  await page.evaluate(()=>window.__unknownPlatformerForceFall());
  await wait(s=>s.player.grounded&&s.player.x<200&&s.player.y<600);
  s=await read();
  assert(s.enemies.filter(e=>['spider','ghost','terror','cosmic'].includes(e.kind)).every(e=>!e.warningVisible));
  assert(!s.projectiles.some(p=>p.enemyProjectile),'Checkpoint retry clears the old hostile volley');
  evidence.retryWarningCleanup=true;
  await page.setViewportSize({width:844,height:390});await boot(2,'&enemyPreview=ghost');await page.waitForTimeout(700);await shot('phone-ghost');
  assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',out),JSON.stringify({evidence,errors},null,2));
  console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(new URL('failure.json',out),JSON.stringify({error:String(error),state:await read().catch(()=>null),evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
