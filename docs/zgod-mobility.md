# Z God airborne powers

- **Double jump:** tap Z / Up or touch J, release, then press again in midair.
  One extra jump per airtime; landing, spring launches and checkpoint recovery
  replenish it. Holding jump does not automatically double jump.
- **Starfall Ground Punch:** press jump a third time after the double jump, or
  press Down / S or pull the touch joystick down while airborne. Z God
  winds up, dives fist-first, then punches the ground. Pink/gold shockwaves and
  stars shoot out in both directions, with a brief planted-fist recovery.

The landing defeats every enemy whose collision body intersects the current
camera view, including flyers, enemies across platforms and guarded bosses.
Visible hostile projectiles are cleared as well. Offscreen enemies remain for
the next part of the level. Boss defeats still use their normal death animation,
rewards and projectile cleanup. Normal enemies fly outward in a short KO pose.
Damage resolves once at impact; the visible wave is its follow-through.

Z God remains invincible with one-hit attacks. The ground punch has no cooldown
or equipment cost, and works with every equipped weapon. Grounded Down still
crouches; pressing Down before jumping does not automatically trigger the move.
Jump/attack/SP inputs cannot interrupt a committed punch. Star Comet retains
its separate X / SP input and cooldown. Auto-run includes a v button for the
punch. Flight keeps ship controls.

`gameplay/airborneMoves.ts` shares jump/input/landing/animation state with X God,
whose smaller local butt-bomb shockwave keeps its established damage and armor
rules. Both use their normal physics bodies beneath an anchored animation.
Debug state is under `movement.zgodMobility` and `movement.xgodMobility`.

New assets were generated with built-in ImageGen from the approved Z God seed:
`art/signature-specials-v1/zgod-reference.png`. Exact prompts, original sheets,
metadata and preview are in `art/zgod-mobility-v1`. Repack with:

```powershell
python scripts/pack_zgod_mobility.py
```

Requires Pillow, NumPy and SciPy. The shared packer removes generated halos,
preserves alpha, uses one scale per animation and packs six logical 256px cells
per 780x520 atlas. The two atlases add about 3.1 MiB decoded RGBA data and load
only when Z God is selected. X God's art remains separate.
