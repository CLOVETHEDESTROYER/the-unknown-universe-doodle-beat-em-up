/** Scenery speed only: obstacle travel and encounter timing remain in the flight simulation. */
export const FLIGHT_PARALLAX={witch:.30,ascent:.34,clouds:1.35,orbitPeriod:9000,planet:.13} as const;
export function flightSpeedStreaks(travel:number,clock:number,strength:number){
  return Array.from({length:34},(_,i)=>({
    x:((i*137.7-(travel+clock*.08)*(1.5+i%4*.7))%1240+1240)%1240-100,
    y:136+i*73%365,length:(16+i%5*13)*strength,alpha:(.08+i%3*.045)*strength,width:i%4===0?2:1
  }));
}
