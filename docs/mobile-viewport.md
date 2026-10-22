# Landscape phone game viewport

Wide landscape phones use a wider logical render viewport while retaining the
576px world height. Width is round(576 × host width / host height), with a1024px
minimum. For example750x342 uses1263x576, filling the available web viewport
with uniform scale. Ground cameras show additional existing level geometry.
Player physics, sprite proportions and jump height remain unchanged.

gameplay/mobileRuntime.ts computes size and safe-area insets, then changes the
Phaser FIT game size through setGameSize. ResizeObserver, window and visualViewport
changes update the current scene rather than restarting it. Ground HUD anchors
and locked boss-camera centers reflow, including while a defeated boss's sequence
continues. Rotation preserves health, lives, inventory and position.

The world renders behind device safe areas. DOM HUD/controls and in-canvas HUD
labels retain safe padding. The hidden modern-mode workshop no longer consumes
a4px border. Classic tablet/desktop framing remains available; portrait phones
still pause behind the rotation prompt.

Flight retains its established1024px simulation/balance field and centers it in
the wider rendered view. Existing background tiles and boarding pads fill both
sides. The orbital panorama's travel range contracts to the new viewport so the
single destination image covers the edges without being stretched or repeated.
Additional image instances reuse the already-loaded textures.

Validation: Chromium and WebKit phone viewport/rotation/input checks, all five
ground boss arenas through rotation and defeat, flight phases/rotation, and
classic iPad/desktop. Temporary scripts and captures are under the workspace's
Codex visualizations directory, named test-fullscreen-phone.mjs,
test-viewport-boss.mjs and full-*. Browser profiles do not replace physical-device
notch, browser-toolbar and thumb testing. Full screen here means the available
browser viewport; Safari's own toolbar and the phone's OS chrome are external.
