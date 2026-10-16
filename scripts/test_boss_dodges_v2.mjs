import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const origin=process.env.GAME_TEST_URL || 'http://127.0.0.1:3000';
const selected=Number(process.argv[2] || 0);
const output=new URL('../output/boss-encounters-v2/dodges/',import.meta.url);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.enemies.find(e=>e.kind==='boss');
const place=(x,y)=>page.evaluate(({x,y})=>window.__unknownPlatformerSetPlayerPosition(x,y),{x,y});
async function wait(predicate,timeout=18000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    if(errors.length)throw new Error(errors.join('\n'));
    const s=await read();
    if(predicate(s,boss(s)))return s;
    await page.waitForTimeout(15);
  }
  throw new Error(`Timeout: ${predicate}`);
}
async function face(direction){
  const key=direction>0?'ArrowRight':'ArrowLeft';
  await page.keyboard.down(key);
  await wait(s=>s.player.facing===(direction>0?'right':'left'));
  await page.keyboard.up(key);
}
const evidence={};
try{
  for(const level of [1,3,4,6].filter(l=>!selected || l===selected)){
    await page.goto(`${origin}/?autostart=1&level=${level}&capture=1`);
    await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).player?.grounded);
    let s=await read(),b=boss(s);
    assert.deepEqual(s.failedAssets,[]);
    await place(b.x+300,b.floorY);
    await face(-1);
    await page.keyboard.down('Space');
    s=await wait((s,b)=>b.guardedHits>=2);
    await page.keyboard.up('Space');
    assert.equal(boss(s).hp,boss(s).maxHp,'Blaster shots cannot chip a guarded boss');
    const guarded=boss(s);
    s=await wait((s,b)=>b.vulnerable && b.recoveryRemainingMs>800);b=boss(s);
    await place(b.x+150,b.floorY);
    await face(-1);
    const hp=b.hp;
    await page.keyboard.down('Space');
    s=await wait((s,b)=>b.openingHits>=2);
    await page.keyboard.up('Space');
    assert(hp-boss(s).hp>= (level===3?8:6),'Two real shots receive the counter bonus');
    evidence[level]={guardedHp:guarded.hp,counterDamage:hp-boss(s).hp};

    if(level===1 || level===3){
      const move=level===1?'low_breath':'furnace_quake';
      const deadline=Date.now()+30000;
      // Only set up the starting lane. The dodge itself is a real held keyboard jump.
      while(Date.now()<deadline){
        s=await read();b=boss(s);
        if(b.move===move && b.attackState==='tell')break;
        await place(b.x<(b.left+b.right)/2 ? b.x+350:b.x-350,b.floorY-160);
        await page.waitForTimeout(35);
      }
      assert.equal(b.move,move);
      assert.equal(b.attackState,'tell');
      await place(b.x+b.facing*350,b.floorY);
      await wait(s=>s.player.grounded);
      const before=(await read()).player.health;
      await wait((s,b)=>b.attackState==='attack' && b.stateElapsedMs>=600);
      await page.keyboard.down('KeyZ');
      s=await wait(s=>s.player.velocityY < -400);
      assert.equal(s.player.health,before);
      await page.waitForTimeout(120);
      await page.screenshot({path:fileURLToPath(new URL(`level${level}-jump.png`,output))});
      await wait((s,b)=>b.vulnerable);
      await wait(s=>s.player.grounded);
      await page.keyboard.up('KeyZ');
      s=await read();
      assert.equal(s.player.health,before,'A correctly timed jump clears the low attack');
      evidence[level].jumpClearsLowAttack=true;
      evidence[level].jumpHealth=before;
    }else if(level===4){
      s=await wait((s,b)=>b.move==='rune_bloom' && b.attackState==='tell' && b.stateElapsedMs>=80);
      b=boss(s);
      const marked=[...b.markedXs];
      await place(marked[1],b.floorY);
      const beforeRune=(await read()).player.health;
      s=await wait(s=>s.player.health<beforeRune);
      assert.equal(beforeRune-s.player.health,12,'Standing in a warned rune is harmful');
      assert.deepEqual(boss(s).markedXs,marked,'The rune marks do not chase the player');
      await place(marked[0]-90,b.floorY);
      await wait((s,b)=>b.vulnerable);
      s=await wait((s,b)=>b.move==='witch_step' && b.attackState==='tell');
      b=boss(s);
      await place(b.targetX+b.facing*220,b.floorY);
      await wait(s=>s.player.grounded);
      const beforeWisp=(await read()).player.health;
      await wait((s,b)=>b.attackState==='attack' && b.move==='witch_step' && b.stateElapsedMs>=700);
      await page.keyboard.down('KeyZ');
      await wait(s=>s.player.velocityY < -400);
      await wait((s,b)=>b.vulnerable && s.projectiles.some(p=>p.pattern==='witch_wisp'));
      await page.screenshot({path:fileURLToPath(new URL('level4-wisp-jump.png',output))});
      s=await wait(s=>s.player.grounded);
      await page.keyboard.up('KeyZ');
      assert.equal(s.player.health,beforeWisp,'A real jump clears the witch-step landing wisp');
      evidence[level].runeDamage=12;evidence[level].jumpClearsWisp=true;
    }else{
      // The long fight test checks both phases; isolate the marked blink's fixed destination here.
      await place(boss(s).left+220,boss(s).floorY);
      s=await wait((s,b)=>b.move==='blink_burst' && b.attackState==='tell' && b.stateElapsedMs>=80);
      const target=boss(s).targetX;
      await place(target<(boss(s).left+boss(s).right)/2 ? boss(s).right+60:boss(s).left-60,boss(s).floorY);
      s=await wait((s,b)=>b.teleported && b.attackState==='attack');
      assert.equal(boss(s).x,target,'Teleport arrives only at the already marked destination');
      evidence[level].markedBlink=true;
      await page.screenshot({path:fileURLToPath(new URL('level6-marked-blink.png',output))});
    }
    console.log(JSON.stringify({level,passed:true,evidence:evidence[level]}));
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('results.json',output),JSON.stringify({evidence,errors},null,2));
}catch(e){
  await fs.writeFile(new URL('failure.json',output),JSON.stringify({error:String(e),state:await read(),evidence,errors},null,2));
  await page.screenshot({path:fileURLToPath(new URL('failure.png',output))});
  throw e;
}finally{await browser.close();}
