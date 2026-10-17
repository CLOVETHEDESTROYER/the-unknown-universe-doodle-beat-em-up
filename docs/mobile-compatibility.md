# Mobile compatibility pass

## Reported failure

Chrome on the user's phone shows a white screen and a browser crash page; a newer
phone reaches gameplay before crashing. This suggests browser resource pressure,
but the actual device crash cause has not been confirmed.

## Changes

- Phones and tablets automatically load compact animation atlases. Transparent
  margins are removed from storage; original frame dimensions, trim offsets,
  numeric frame names, and animation order remain in Phaser atlas metadata.
  Collision geometry and character movement still use the original coordinates.
- Atlas pages are at most 2048 pixels per side. Original desktop assets remain.
- The generated catalog contains 167 animation atlases: decoded pixel storage
  falls from 862.0 MiB to 253.1 MiB (70.6% reduction). These totals cover the
  entire catalog, not one level or measured browser memory. Only queued assets
  for the current hero and stage load.
- 17 large backgrounds/menu images have smaller mobile copies. Display-only
  panoramas keep their existing display size. Tiled platform artwork is unchanged.
- Two downloads at a time and direct image-element loading limit simultaneous
  image processing. Rendering stays at the fixed logical game resolution.
- Restored enemy art loads only for enemy types present in the current stage.
- Portrait tablet layouts reserve space above for the HUD and below for touch
  controls. Landscape layouts use the full available height with overlaid controls
  and a compact phone HUD. Browser toolbar height changes and orientation changes
  refresh the fitted viewport. iPhone safe area padding remains enabled.
- Portrait phones suspend gameplay behind the existing rotate prompt. Returning
  from another tab/app leaves the game paused. Pointer capture loss releases
  touch buttons. A lost WebGL context displays a reload control when the browser
  still permits the page to run; it cannot recover a terminated browser process.
- Blocked browser storage no longer prevents the start screen/roster from loading.

## Terrain allocation fix (2026-10-16)

The reported iPad Pro / iPhone 13 / iPhone 15 failure happens after the title,
character selection and intro, as gameplay begins. A browser audit found another
large allocation outside the mobile asset catalog: Phaser TileSprite creates a
private power-of-two pattern canvas and GPU texture for **each** platform. The
2172x724 terrain artwork produced repeated 4096x1024 brick patterns and
4096x256 cap patterns when the scene was created. Smaller hero atlases alone
did not address this allocation.

`gameplay/terrainTextures.ts` now prepares and caches terrain patterns at their
displayed scale, capped at 512 pixels per side, before constructing TileSprites.
It compensates tile scale to retain the original repeat distance. Platforms,
moving/crumbling ledges, tiled hazards and the flight launch pad use this path;
collision geometry is unchanged. Thin platforms no longer create an empty or
negative-height brick layer.

With the same local artwork and iPhone 13 landscape profile, a controlled
before/after browser audit estimated live RGBA texture storage at 869.3 MiB
before and 180.5 MiB after (79.2% reduction). The public deployment separately
measured 892.0 MiB before this fix. These estimates track texture dimensions and
deletion through WebGL calls; they are not physical-device process-memory
measurements and exclude CPU image storage, canvas buffers and driver overhead.

Production-build startup, touch movement/jump/attack, orientation changes and
all six stage boots are checked with Playwright in Chromium and WebKit using
phone/tablet profiles, plus desktop startup. Screenshots and allocation traces
are stored outside the repository. The build passes; the full TypeScript check
still reports pre-existing errors in the legacy engine, platformer and mobile
configuration. Real iPad/iPhone confirmation remains necessary after publishing.

## Landscape layout follow-up

The landscape follow-up removes the 52px top / 88px bottom phone gutters, which
previously left just 202px of a 342px-high viewport for gameplay. The same iPhone
13 browser profile now displays a 608x342 playfield instead of 359x202. The full
16:9 scene remains visible without cropping, and the canvas stays at 1024x576.
Chromium and WebKit checks cover iPhone 13/15 landscape, a shorter viewport with
browser bars, portrait-to-landscape rotation, iPad orientations and desktop.
Touch movement, jump, landing and attack remain functional; controls stay inside
the viewport. Actual-device browser chrome behavior still needs user confirmation.

## Rebuild mobile atlases

Run `python scripts/pack_mobile_assets.py` after changing source artwork. This
uses Pillow for mechanical cropping/packing, not new image generation. Generated
atlases are in `public/mobile-v1`, with the lookup catalog at
`gameplay/mobileAssetManifest.json`.

## Device review

The original atlas pass verified production compilation without browser automation
or physical-device gameplay. The terrain follow-up above adds browser automation;
desktop viewport emulation alone cannot confirm iOS browser memory behavior.

After the updated build is hosted, review:

1. iPhone: start the game in landscape; move, jump and attack together.
2. Rotate upright and back; verify that movement stops behind the rotate prompt.
3. Switch apps and return; resume manually from pause.
4. Finish a level and enter the next one; review character/background alignment.
5. Review Nico/Barrett with equipment, boss animations, and the flight stage.
6. iPad: repeat in landscape and portrait with the touch controls.

`?quality=mobile` forces compact assets on desktop for inspection;
`?quality=desktop` restores original assets. Existing `renderer=canvas` can help
isolate a WebGL-specific device failure. These are diagnostic options, not
required mobile settings.

The current pass is local until included in a published build. The existing
hosted game will not gain these changes from a browser refresh alone.

## Implementation references

- Phaser loader configuration: https://docs.phaser.io/phaser/concepts/loader
- Phaser atlas metadata behavior was checked against the installed Phaser 3.90
  JSON array parser, Texture implementation, and SceneManager preload order.
- WebKit canvas debugging: https://webkit.org/blog/8452/canvas-debugging/
