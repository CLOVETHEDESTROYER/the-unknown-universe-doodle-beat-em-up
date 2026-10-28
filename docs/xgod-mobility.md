# X God airborne moves

The current drawn X God has both moves on every on-foot stage. They are always
available, independent of weapons and the X Breaker signature cooldown.

- **Double jump:** tap Z / Up (keyboard) or JUMP (touch), release, then press again
  while airborne. One extra jump per airtime; a fresh third press starts the butt bomb.
  Landing, checkpoint retries and spring-pad launches replenish the extra jump.
  Walking off a ledge also permits the airborne jump.
- **Butt bomb:** press jump a third time after the double jump, or press Down / S
  (keyboard) or pull the touch joystick down while airborne. X God tucks for 150ms, dives bottom-first, and lands with
  a 180px-radius shockwave and a 300ms seated recovery. Direct head hits do 6
  damage; nearby foes take 4 damage and briefly launch/stun. Each enemy can only
  take one hit per bomb. Boss armor and recent ordinary-hit cooldowns cannot
  block a bomb; opening damage multipliers still apply. Direction, jump and attacks cannot interrupt a committed bomb; hazards
  and side contact can still hurt X God. Holding Down before jumping does not
  automatically start a bomb. Grounded Down still crouches.

Flight and the optional legacy/model X God art retain their existing movement.
Other current heroes share these controls with their own moves; see
[full-roster mobility](roster-mobility-v2.md). The original physics body stays in use during both moves;
the new animation renders in a separate anchored sprite.

Generated source art and exact prompts are preserved in `art/xgod-mobility-v1`.
Built-in ImageGen produced one six-pose sheet per move from the approved drawn
X God reference. Rebuild runtime atlases with:

```powershell
python scripts/pack_xgod_mobility.py
```

Requires Pillow, NumPy and SciPy. Each trimmed atlas is 780x520 with six logical
256px frames, transparent gutters and a common scale. Only drawn X God loads
the two atlases: approximately 3.1 MiB of additional decoded RGBA texture data.
The somersault uses a body-center anchor, and the butt bomb uses a foot baseline.
`render_game_to_text().movement.xgodMobility` reports charge availability, move
counts, bomb phase, hit counts and the visible animation frame for playtesting.
