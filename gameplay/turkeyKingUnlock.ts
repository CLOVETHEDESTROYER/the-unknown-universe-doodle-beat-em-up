const KEY='unknownUniverse.turkeyKing.v1';
const ACTIVE='unknownUniverse.turkeyKingSelected.v1';
let sessionUnlocked=false,sessionActive=false;
export const acceptsTurkeyKingCode=(code:string)=>code.trim().toLowerCase()==='allhailking';
export function readTurkeyKingUnlocked(){try{return sessionUnlocked||localStorage.getItem(KEY)==='true';}catch{return sessionUnlocked;}}
export function readTurkeyKingSelected(){try{return readTurkeyKingUnlocked()&&(sessionActive||localStorage.getItem(ACTIVE)==='true');}catch{return sessionActive&&sessionUnlocked;}}
export function selectTurkeyKing(selected:boolean){sessionActive=selected;try{localStorage.setItem(ACTIVE,String(selected));}catch{/* Session selection still works. */}}
export function unlockTurkeyKing(){sessionUnlocked=true;try{localStorage.setItem(KEY,'true');}catch{/* Session unlock still works. */}selectTurkeyKing(true);}
