# Ground gun upgrades and level pickups

Each on-foot stage has two Ink Blaster supply stations, early and before the boss. Later stages also have a special equipment station.

| Level | Special |
| --- | --- |
| 1 | Flame Sword reward after the boss |
| 2 | Frost Gauntlet |
| 3 | Ember Boots |
| 4 | Storm Halo |
| 6 | Storm Halo |

The flight stage retains its ship weapon system. The Flame Sword appears after the Scratch boss defeat sequence. If the player reaches the exit before collecting their first sword, the game grants it before the story chapter. X God plays his sword celebration on first claim.

Three upgrade pickups sit along each ground route, on supported platforms away from hazards. They appear only while carrying the Ink Blaster. The currently equipped upgrade is hidden. Only one mode is equipped at once:

| Upgrade | Behavior |
| --- | --- |
| Rapid Fire | One round every 95 ms; 2 damage per hit |
| Fan Shots | Five rounds across a fan every 320 ms; 1.5 damage per pellet |
| Heat Seekers | One round every 400 ms; 3 damage; turns toward nearby living enemies ahead of the initial firing direction |

All rounds use normal wall collisions, expiry, enemy hits and boss guard/stun rules. Heat seekers can reacquire a target if their current target dies. All modes have projectile limits. Holding the existing fire control works on keyboard and touch.

Gun supplies refill the normal three-hit durability and preserve an equipped gun upgrade. Upgrade pickups themselves do not repair the gun. Switching to a special weapon, losing the gun after three unblocked hits, or dying removes its upgrade. Save/Continue and stage transitions preserve an upgraded gun that is still equipped. Old saves remain valid. Stations recharge after 12 seconds, require moving away before respawning, and award points only on their first collection per stage instance.

Turkey King continues using his native weapons and receives no equipment or gun upgrade stations.

Validation: `npm run build`, `scripts/test_powerups_v1.mjs`, and `scripts/test_gun_upgrades_v1.mjs`. The new browser test covers every ground route, conditional pickups, firing modes, real seeker damage, Save/Continue, equipment loss/refill/swap, King exclusion, touch firing, and a real reduced-health first-boss defeat followed by level two. Test fixtures arrange encounters; attacks and pickups use ordinary game mechanics. Visual evidence is outside the repository in the session visualization directory under gun-upgrades.
