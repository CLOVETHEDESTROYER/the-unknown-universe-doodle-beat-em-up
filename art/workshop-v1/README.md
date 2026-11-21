# Generated workshop art — v1

Created with the built-in ImageGen tool, using the shipped pickup and buddy designs as references. Exact generation prompts are in [prompts.json](prompts.json), with original tool output provenance in [sources.json](sources.json). All 16 generated originals are saved beside this file. No API credentials are needed by the game.

## Artwork

- 13 pickups, four distinct generated frames each: Ink Blaster, Flame Sword, Frost Gauntlet, Ember Boots, Storm Halo, Kai Blaster Arm, Ink Shield, Rapid Fire, Fan Shots, Heat Seekers, Gravity Core, Health Heart and Rush Star.
- Dinio and Doghost: four idle, eight movement and four attack frames each.
- Teleportation C: four idle, eight run, four airborne/landing, four strike and four intercept/arrival frames.
- 108 generated frames total. The buddy seed images preserve existing character identities; playable Teleportation C artwork remains independent.

## Rebuild

Run `python scripts/pack_workshop_v1.py` from the project root. Requires Pillow, NumPy and SciPy. The packer only isolates painted components, crops, scales and packs existing generated pixels. It preserves native alpha and uses one scale across each animation family. Complete buddy components are isolated before cropping so adjacent crown tips and howl effects cannot leak between frames.

Runtime sheets and posters are in `public/workshop/v1/`, with dimensions and source scaling in `metadata.json`. Pickup frames are 192 × 192, arranged horizontally; buddy frames are 320 × 320, arranged in four columns. Maximum texture dimension is 1920, suitable for the existing mobile renderer. Runtime sheets use lossless WebP. Original assets in previous art folders are retained.

`*-preview.jpg` sheets and buddy action GIFs are review copies; the game uses the transparent WebP sheets. `powerups-contact.jpg` is the full pickup overview.

## Integration

- Open **Workshop** on the title screen, or use the existing legacy workshop sidebar.
- Preview all items and buddy actions; pause, step poses and flip facing. Reduced-motion users start with paused previews.
- Generated pickup loops replace station and collectible artwork in the modern ground campaign. Buddy idle, movement and attack poses follow the existing behavior. Teleportation C retains his established jump, strike and interception frame mapping.
- Previewing items does not change equipment, saves, unlocks or combat rules. Original handheld/equipped hero art is retained; this pass supplies animated item art and companion bodies.

## Verification

Run `npm run build`, then `node scripts/test_workshop_v1.mjs` to check every pickup preview and buddy action, pause/step/facing, keyboard dismissal and focus restoration, phone layouts, reduced motion, real pickup collection, companion movement/damage and pause. The script starts its own local production preview unless `GAME_TEST_URL` is supplied, avoiding development reloads during a test. Browser artifacts are in ignored `output/workshop-v1/`. Set `GAME_TEST_EXECUTABLE` if a specific installed Chromium/Chrome executable is required.

Also run the existing companion-assist regression and the standard develop-web-game smoke client. See `progress.md` for actual results and any remaining limitations.
