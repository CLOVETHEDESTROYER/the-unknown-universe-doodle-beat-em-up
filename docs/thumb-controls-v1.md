# Thumb controls and jump chain

The left joystick steers the hero. Push a little to walk, farther to run; slide
outside the base to keep steering through pointer capture. Its center dead zone
prevents small thumb movements from moving the hero. Pull down to crouch with
X God/Z God, or to trigger their existing slam while airborne. Upward stick
movement does not jump in the platformer; use JUMP. Flight supports diagonal steering.

The large circular JUMP and HIT/FIRE buttons sit together at the lower right.
SP is above HIT/FIRE; teleport recall appears above JUMP when available. The
attack button already fires an equipped blaster, so no duplicate shoot button
is shown. Phone targets are 88px across with a 164px joystick, including Safari
viewports only 343px high on modern phones. Compact landscape phones under
700px wide and 350px high retain 76px targets and a 144px joystick. Tablets with at least
768x600 CSS pixels use 104px targets and a 208px joystick. Landscape overlays the
controls at the edges; portrait tablets reserve space below the game. Safe-area
insets are respected. Opt-in auto-run retains its large downward touch button.

For drawn X God and Z God, press and release JUMP three times during one airtime:

1. Jump.
2. Double jump.
3. Butt bomb (X God) or screen-clearing ground punch (Z God).

Keyboard Z/Up follows the same chain. Holding a button does not automatically
advance it. Landing refills the extra jump. Down/S and joystick-down still allow
an earlier slam. X God's butt bomb bypasses boss armor; Z God retains her
invincibility and screen-clearing punch. Other heroes keep their normal jump.

Pause hides and disables the controls and releases all held input. Pointer up,
cancel/capture loss, blur, backgrounding, resize and scene/mode changes reset
the joystick. A window-level release clears analog axes even when the joystick
misses its own pointerup. Native touch end/cancel is an iOS fallback. Multiple
input pointers retain their own button ownership, so releasing one thumb does
not release the other. Pagehide also neutralizes controls. The joystick caches
its geometry during a gesture, uses a softer touch origin and a smaller dead
zone; deliberate downward movement avoids accidental slams. Button GPU blur
was removed and pressed-state feedback follows actual pointer ownership.

Implementation: components/TouchControls.tsx, index.css, types.ts, the platformer
and flight input adapters, and gameplay/airborneMoves.ts. No new artwork or
texture memory is needed.

Run scripts/test_thumb_controls_v1.mjs with GAME_TEST_URL, GAME_TEST_BROWSER,
GAME_TEST_DEVICE and optional GAME_TEST_EXECUTABLE. It checks controls, gameplay,
phone/tablet geometry and cleanup in Chromium/WebKit. Screenshots and results
are saved under output/thumb-controls-v1. Physical-device feel needs human play.
