# Landscape phone game viewport

## Edge-to-edge mobile layout (November 14, 2026)

Removed the 146px left/right control rails and the 36px reserved top strip on landscape phones. The game host now spans the full available web viewport. The existing responsive Phaser camera reveals more level geometry instead of stretching sprites or cropping the scene.

Movement and action controls float over the lower corners with translucent backgrounds. Platformer movement is a low left/crouch/right row with 52px phone targets (64px on landscape tablets), avoiding the hero at spawn; jumping uses the dedicated JUMP action. Flight retains its four-way D-pad with targets at least 44px. Phone actions are 56–72px, tablet landscape actions 80px. Device safe-area insets protect controls and HUD from the notch/home indicator. The compact top HUD no longer stretches the health bar across the entire screen; pause is a 44px target. Portrait-phone rotation/pause behavior is unchanged, as is desktop layout.

The pause menu includes Screen settings: a capability-checked Fullscreen API button where supported and Safari Home Screen instructions otherwise. `manifest.webmanifest` and Apple web-app meta tags enable an online standalone Home Screen launch. No offline cache or service worker is added. Safari's browser chrome cannot be removed with CSS; the edge-to-edge layout fills the available browser viewport, while a Home Screen launch provides an app-like view without browser toolbars. See [Apple's web-app guidance](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

The 1024px minimum logical world width is retained for boss arenas. A 4:3 tablet may still have vertical letterboxing to preserve the full arena; wide iPhones fill the viewport without that compromise.

Verification: `npm run build` and `npm run test:mobile` passed. The latter covers Chromium and WebKit across landscape iPhone, short phone, iPad, flight, and desktop (10 cases), with canvas/target measurements, sliding directional input, simultaneous movement/fire, portrait/landscape rotation, toolbar-height changes, and pause-menu screen guidance. Captures and the measured report are written to `output/playwright/mobile-edge-to-edge/`. The Fullscreen API enter/exit button was also checked interactively in Chromium. Real iPhone safe-area/chrome behavior and thumb reach still need physical-device testing.

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
