export interface Rock {
  id:number;distance:number;y:number;radius:number;bob:number;sway:number;phase:number;hp:number;maxHp:number;
}
/** A new field per flight, reproducible from its seed and stable through checkpoint retries. */
export function createAsteroidField(seed:number):Rock[]{
  let value=seed>>>0;
  const random=()=>{value=(value+0x6d2b79f5)>>>0;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};
  const rocks:Rock[]=[];
  const add=(distance:number,y:number)=>{
    const radius=Math.round(29+random()*27),maxHp=radius<38?3:radius<48?4:6;
    rocks.push({id:rocks.length,distance:Math.round(distance),y:Math.round(y),radius,
      bob:8+random()*14,sway:5+random()*13,phase:random()*Math.PI*2,hp:maxHp,maxHp});
  };
  // The first approach has ample launch/steering time; no rocks enter the finale arena.
  for(let distance=1650;distance<14800;distance+=650+random()*180){
    const y=160+random()*315;
    add(distance,y);
    if(distance>3200&&random()<.46){
      // Separated staggered pairs leave a wide passage, rather than a solid vertical wall.
      const otherY=y<310?425+random()*55:150+random()*65;
      add(distance+170+random()*130,otherY);
    }
  }
  return rocks;
}
export const rockY=(rock:Rock,clock:number)=>rock.y+Math.sin(clock/(1400+rock.id%3*260)+rock.phase)*rock.bob;
export const rockX=(rock:Rock,clock:number,distance:number)=>rock.distance-distance+Math.sin(clock/2300+rock.phase)*rock.sway;
