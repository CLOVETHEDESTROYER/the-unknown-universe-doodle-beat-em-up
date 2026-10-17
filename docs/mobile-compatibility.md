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
- The mobile playfield reserves space above for the HUD and below for touch
  controls. Browser toolbar height changes and orientation changes refresh the
  fitted viewport. iPhone safe area padding remains enabled.
- Portrait phones suspend gameplay behind the existing rotate prompt. Returning
  from another tab/app leaves the game paused. Pointer capture loss releases
  touch buttons. A lost WebGL context displays a reload control when the browser
  still permits the page to run; it cannot recover a terminated browser process.
- Blocked browser storage no longer prevents the start screen/roster from loading.

## Rebuild assets

Run `python scripts/pack_mobile_assets.py` after changing source artwork. This
uses Pillow for mechanical cropping/packing, not new image generation. Generated
atlases are in `public/mobile-v1`, with the lookup catalog at
`gameplay/mobileAssetManifest.json`.

## Device review

Production compilation passed. No browser automation or physical-device gameplay
test was performed in this pass. Desktop viewport emulation alone would not
confirm iOS browser memory behavior.

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
