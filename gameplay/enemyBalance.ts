/** A small durability increase shared by regular enemies across game modes. */
export const REGULAR_ENEMY_HEALTH_MULTIPLIER = 1.15;

export function regularEnemyHealth(baseHealth:number):number {
  // Keep fractional HP: rounding a weak enemy up by a full point can double it.
  return Math.round(baseHealth*REGULAR_ENEMY_HEALTH_MULTIPLIER*100)/100;
}
