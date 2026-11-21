import type {BuddyId} from './shopCatalog';
import {paintGeneratedBuddy} from './kaiWorkshopArt';

/** Shared generated flight cycle for the canvas Workshop and Alley. */
export function paintBuddy(ctx:CanvasRenderingContext2D,id:BuddyId,facing=1,_flap=0,clock=performance.now(),reduced=false){
  return paintGeneratedBuddy(ctx,id,facing,clock,reduced);
}
