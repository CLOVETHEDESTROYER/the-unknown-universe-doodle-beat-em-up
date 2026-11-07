import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4387';
const out='output/platform-routes-v2';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],evidence=[],trace=[];let context,page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
async function wait(fn,ms=8000){const end=Date.now()+ms;while(Date.now()<end){assert.deepEqual(errors,[]);const s=await read().catch(()=>null);if(s&&fn(s))return s;await page.waitForTimeout(20);}throw Error('Timeout '+fn);}
async function fresh(options={}){
 await context?.close();context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,...options});page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
}
async function boot(level,hero='xgod'){
 for(const key of ['ArrowRight','ArrowLeft','z'])await page.keyboard.up(key);
 await page.goto(`${origin}/?autostart=1&capture=1&platformCourse=1&level=${level}&character=${hero}&unlockRoster=1${hero==='turkey_king'?'&code=allhailking':''}`);
 const s=await wait(s=>s.player?.grounded&&s.platformRoute,60000);assert.deepEqual(s.failedAssets,[]);return s;
}
let held='';
async function steer(key){if(held===key)return;if(held)await page.keyboard.up(held);held=key;if(held)await page.keyboard.down(held);}
function target(s,kind,index){
 const start=s.platformRoute.start;
 if(kind==='ferry')return s.movingPlatforms.find(p=>p.x>=start+1000&&p.x<start+1400);
 if(kind==='crumble')return s.crumblingPlatforms.filter(p=>p.x>=start)[index];
 const rect=s.terrain.platforms.find(p=>p.x===start+index&&p.h<60);
 return rect&&{...rect,width:rect.w};
}
async function jumpTo(kind,index){
 let s=await read();assert(s.player.grounded);
 // Use the available run-up instead of demanding a full-span jump from the
 // back edge of a moving platform. Carry and momentum remain real inputs.
 const runUpUntil=Date.now()+2000;
 while(Date.now()<runUpUntil){
  s=await read();
  const supports=[...s.terrain.platforms.filter(p=>p.h<60),...s.crumblingPlatforms.filter(p=>p.solid),...s.movingPlatforms.map(p=>({...p,w:p.width}))];
  const support=supports.find(p=>Math.abs(p.y-s.player.bodyBottom)<4&&s.player.x>=p.x-15&&s.player.x<=p.x+p.w+15);
  if(!support||s.player.x>=support.x+support.w-65)break;
  await steer('ArrowRight');await page.waitForTimeout(20);
 }
 await page.keyboard.down('z');let released=false;
 await wait(s=>!s.player.grounded);
 const end=Date.now()+4000;
 while(Date.now()<end){
  s=await read();const t=target(s,kind,index);assert(t);
  trace.push({kind,index,x:s.player.x,y:s.player.bodyBottom,hp:s.player.health,balls:s.platformRoute.pendulums});
  if(!released&&s.player.velocityY>=0){await page.keyboard.up('z');released=true;}
  const width=t.width??t.w,center=t.x+width/2;
  const desired=Math.max(-300,Math.min(300,(center-s.player.x)*6));
  await steer(s.player.velocityX<desired-35?'ArrowRight':s.player.velocityX>desired+35?'ArrowLeft':'');
  if(s.player.grounded){
   await page.keyboard.up('z');await steer('');assert(Math.abs(s.player.bodyBottom-t.y)<5,`Landed on target ${kind}/${index}: ${JSON.stringify({p:s.player,t})}`);return;
  }
  await page.waitForTimeout(20);
 }
 throw Error('Jump did not land '+kind+'/'+index);
}
try{
 await fresh();
 for(const level of (process.argv.includes('--routes-only')?[]:[1,2,3,4,6])){
  let s=await boot(level);held='';const r=s.platformRoute;
  assert.equal(s.progress.levelEndX,({1:12855,2:12855,3:11485,4:11700,6:11624})[level]);
  assert(s.enemies.find(e=>e.kind==='boss').x>r.end);
  const cps=s.terrain.checkpoints.map(p=>p.x);assert.deepEqual(cps,[...cps].sort((a,b)=>a-b));
  await place(r.conveyors[0].x+120,r.conveyors[0].y);await wait(s=>s.player.grounded);
  const before=await read();await page.waitForTimeout(300);s=await read();
  assert(s.player.x>before.player.x+15,'Conveyor carries an idle rider');assert.equal(s.player.bodyBottom,r.conveyors[0].y);
  await page.keyboard.press('p');const paused=await wait(s=>s.mode==='paused');await page.waitForTimeout(250);
  assert.deepEqual((await read()).platformRoute,paused.platformRoute);await page.keyboard.press('p');await wait(s=>s.mode==='platforming');
  await shot(`level-${level}-conveyor`);
  await place(r.start+80,level<=2?480:520);await page.waitForTimeout(180);assert.equal((await read()).player.health,100);
  const ball=(await read()).platformRoute.pendulums[0];await place(ball.x,ball.y+54);
  s=await wait(s=>s.player.health===88);await shot(`level-${level}-pendulum`);
  const high=s.terrain.platforms.find(p=>p.x===r.start+670);
  await place(high.x+80,high.y);await page.waitForTimeout(180);await page.keyboard.down('z');
  s=await wait(s=>s.player.velocityY<0&&s.player.velocityY>-110);
  assert(s.platformRoute.cameraTop<-80,'Camera follows the upper route');
  assert(s.player.bodyBottom-s.player.visibleHeight-s.platformRoute.cameraTop>=0,'High jump stays in frame');
  await shot(`level-${level}-high-jump`);await page.keyboard.up('z');
  assert.equal(s.player.lives,3);evidence.push({level,conveyorCarry:true,pause:true,realPendulumDamage:true,arenaShifted:true});
 }
 // Actual jump chains cover every new upper route; no flight, double jump, powers or teleporting between ledges.
 for(const [level,hero] of (process.argv.includes('--mechanisms-only')?[]:[[1,'xgod'],[2,'xgod'],[3,'xgod'],[4,'xgod'],[6,'xgod'],[1,'barrett'],[6,'turkey_king']])){
  let s=await boot(level,hero);held='';const r=s.platformRoute,start=r.start;
  trace.push({level,hero,stage:'start',hp:s.player.health,x:s.player.x});
  await steer('ArrowRight');await wait(s=>s.springPads.some(p=>p.x>start&&p.launches>0));
  await wait(s=>s.player.velocityY<0);s=await wait(s=>s.player.grounded);await steer('');
  assert.equal(s.player.bodyBottom,r.conveyors[0].y,'Spring reaches the upper conveyor');
  await jumpTo('static',670);await jumpTo('crumble',0);await jumpTo('ferry');
  await shot(`level-${level}-${hero}-upper-crossing`);
  await jumpTo('static',1420);await jumpTo('crumble',1);await jumpTo('static',1740);
  await steer('ArrowRight');s=await wait(s=>s.player.x>r.end-50&&s.player.grounded);await steer('');
  assert.equal(s.player.lives,3);assert.equal(s.player.health,100);assert(!s.bossArenaCamera.locked);
  await wait(s=>s.checkpoint.x>=r.end-60);
  await page.evaluate(()=>window.__unknownPlatformerForceFall());s=await wait(s=>s.player.grounded&&Math.abs(s.player.x-(r.end-60))<35);
  assert(!s.bossArenaCamera.locked);await shot(`level-${level}-${hero}-safe-exit`);
  evidence.push({level,hero,upperRouteKeyboardTraversal:true,spring:true,ferry:true,checkpointRespawn:true});
 }
 for(const [level,hero] of (process.argv.includes('--mechanisms-only')?[]:[[1,'xgod'],[6,'barrett']])){
  let s=await boot(level,hero);held='';const r=s.platformRoute,floor=level===1?480:520;
  // Isolate the lower challenge after the already-verified spring entry.
  await place(r.start+620,floor);await steer('ArrowRight');let jumping=false;
  const end=Date.now()+18000;
  while(Date.now()<end){
   s=await read();assert.equal(s.player.lives,3);assert(s.player.health>=64);
   if(s.player.x>=r.end-50&&s.player.grounded)break;
   const local=s.player.x-r.start;
   const supports=[...s.terrain.platforms.filter(p=>p.h<60),...s.crumblingPlatforms.filter(p=>p.solid),...s.movingPlatforms.map(p=>({...p,w:p.width}))];
   const edge=supports.some(p=>Math.abs(s.player.bodyBottom-p.y)<4&&s.player.x>=p.x+p.w-65&&s.player.x<=p.x+p.w+12);
   const hurdle=local>=620&&local<720&&s.player.bodyBottom>floor-65;
   const gap=local>=945&&local<1040&&s.player.bodyBottom>floor-20;
   const swing=local>=1320&&local<1430&&s.player.bodyBottom>floor-100;
   if(s.player.grounded&&!jumping&&(edge||hurdle||gap||swing)){await page.keyboard.down('z');jumping=true;}
   else if(jumping&&s.player.velocityY>=0){await page.keyboard.up('z');jumping=false;}
   await page.waitForTimeout(20);
  }
  await page.keyboard.up('z');await steer('');assert(s.player.x>=r.end-50,'Lower route reaches the exit');
  await shot(`level-${level}-${hero}-lower-route`);evidence.push({level,hero,lowerRouteKeyboardTraversal:true,health:s.player.health});
 }
 await fresh({...devices['iPhone 13'],viewport:{width:844,height:390},deviceScaleFactor:1});
 let s=await boot(1);const r=s.platformRoute;await place(r.conveyors[0].x+100,r.conveyors[0].y);
 await page.getByRole('button',{name:/Jump \/ double jump/}).click();await wait(s=>!s.player.grounded);await shot('phone-platforms');
 evidence.push({phoneJump:true});assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/results.json`,JSON.stringify({passed:true,evidence,errors},null,2));console.log(JSON.stringify({passed:true,evidence,errors}));
}catch(error){await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),state:await read().catch(()=>null),trace,evidence,errors},null,2));await shot('failure').catch(()=>{});throw error;}
finally{await browser.close();}
