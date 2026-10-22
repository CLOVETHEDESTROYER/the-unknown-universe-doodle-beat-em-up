# Loading performance

The title loads independently of Phaser and the three game engines. Selecting the
roster warms only the requested engine; the hidden desktop workshop mounts only
in its supported desktop mode. Tailwind utilities are compiled by PostCSS during
the build, following the [Tailwind 3 installation guide](https://v3.tailwindcss.com/docs/installation/using-postcss).
There is no browser CSS compiler/CDN dependency.

The intro now follows real scene readiness, with a minimum 1.2-second display and
an 800ms exit. Cold loads retain the artwork and show actual loader progress;
warm loads no longer wait an unconditional four seconds. Direct level starts
show a progress overlay until scene creation finishes.

## Artwork delivery

`python scripts/optimize_loading_assets.py` requires Pillow with WebP support.
Run it after updating runtime artwork or running `scripts/pack_mobile_assets.py`.
Commit the delivery assets and `gameplay/performanceAssetManifest.json` together.

- Existing mobile atlas trimming, frame coordinates, image dimensions and alpha
  stay unchanged. Sprite pages use **lossless** WebP. Every converted sprite page
  was compared byte-for-byte as decoded RGBA against its source.
- Display-only backgrounds, cards, pickups and UI images use WebP quality 90 with
  exact alpha. The original PNG artwork remains available for editing.
- Names contain the hash of the output contents. Vercel gives only these hashed
  `/performance-v1/` resources a one-year immutable browser cache. An art update
  gets a new URL; unchanged art can survive code deployments in browser cache.
- Custom/unlisted images pass through unchanged. Desktop retains original image
  sizes; mobile still uses the established smaller display copies.

Levels load companions only when carried into the stage or available there.
Equipment art loads only for powers available at that level or already equipped.
Existing mobile loader concurrency stays at two to limit simultaneous image work.
WebP compression reduces transfer size; it does not reduce decoded texture memory.

Effects make no network requests on the untouched title screen. After the first
gesture, two workers fetch/decode the sound bank; an actual sound request can
prepare its own clip without waiting for the entire bank. Decoded clips release
their raw byte buffers. Character selection keeps the title music instead of
prematurely starting/downloading the level track.

## Measured comparison

Local production preview, cold cache, Chromium iPhone 13 landscape emulation,
20 Mbps download / 40ms network latency, title → roster → X God → level one:

| Measurement | Before | After |
| --- | ---: | ---: |
| Title response bytes | 6.34 MB | 0.44 MB |
| Title JavaScript response bytes | 617 KB | 95 KB |
| Completed response bytes through playable level | 51.32 MB | 23.61 MB |
| Title artwork ready, including 500ms observation pause | 5.82s | 1.02s |
| Navigation to playable level | 26.44s | 14.08s |

These are controlled local samples, not real iPhone timings. Completed response
bytes exclude unfinished/cancelled requests. Once loaded, both sampled runs were
near 60 FPS without frames over 50ms; this does not establish a combat FPS gain
on physical mobile hardware. The first-level transfer reduction is about 54%.

## Verification

Build with `npm run build`, serve `npm run preview -- --host 127.0.0.1 --port 4381`,
then run `npm run test:loading`. `GAME_TEST_URL` overrides the preview URL. The cold
loading regression checks the title under 1 MiB, level one under 32 MiB, deferred
engine/workshop/sound requests, scene readiness and failed assets. It reports
timings without asserting brittle wall-clock deadlines.

Also checked normal title/roster/intro/game flow; all six heroes and all six
stages; carried companions; phone/tablet/desktop screenshots in Chromium/WebKit;
WebKit joystick/jump/double-jump/slam/rotation checks; existing combat, sound,
volume persistence and flight audio checks; and the standard game smoke client.
The audio harness now waits for lazy engine installation and asserts the current
hero death/signature-special states rather than obsolete mechanics.

The full TypeScript check retains the established legacy engine duplicate-function
and Phaser typing errors; no new loading/delivery diagnostics were introduced.
The production build passes. Physical iPhone/iPad play is the next check for
browser memory pressure, mobile GPU limits and sustained combat frame rate.
