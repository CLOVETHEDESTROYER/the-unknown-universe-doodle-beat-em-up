# Killer Klause — Christmas asset pack v1

Artwork is available for review in `art/seasonal/christmas-v1/`; prepared exports are in `public/seasonal/christmas-v1/`. As of November 21, the playable preview is integrated behind the exact-case main-screen code `SantaKisComing`. See `preview.md` for controls, verification, and release behavior. Deployment remains pending.

## Creator-established story

Killer Klause was an adult Navy SEAL medic on Earthior before the asteroid catastrophe. He fell into a void, emerged over the North Pole, and crashed through Santa's workshop. Badly bruised and bleeding, he discovered that most of the workshop's residents, including Santa, had not survived.

He put on Santa's hat. A surge of power transformed him into the new Santa Claus and gave him the powers of the mantle. Hearing movement beneath the wreckage, he found surviving elves and used his medic training to help them. He now seeks the truth about the destruction of his home and fights the evils of the Unknown Universe and the Void. He meets X-God and the crew and joins their fight.

The new adult origin is an explicit addition to the cast; the older story bible's schoolmate description does not apply to Killer Klause. Earthior is the home world's name, and the asteroid is the event that destroyed it. No explanation of who originally made the hat, no resurrection of the original Santa, and no new answers about X-God's parents are established here.

## Visual direction

Very muscular adult Santa commando, white beard, red Santa hat, sleeveless red fur-trim vest, olive combat shirt, red tactical trousers, black boots, dog tags, medic pouch, and fingerless gloves. Present rocket launcher: forest-green tube, red ribbon, gold details, wrapped gifts as ammunition. Bold black doodle contours and colored-pencil shading match the game. His medic identity remains visible alongside his strength.

Story injury is conveyed with bruises, torn clothing, and small dried blood marks. Workshop losses are conveyed by empty stations, a fallen hat, and a covered still figure; no graphic injury. Playable sprites show his healed Santa form.

Proposed helper designs: an elf field medic with a cream satchel, and an elf engineer with brass goggles and a gift/tool pack. These roles and their optional dialogue are production proposals; no names or extra family histories are canonized.

## Asset coverage

- Killer Klause master/portrait; idle, locomotion, crouch, jump rise/fall/land, dash, air slam, launcher fire/reload, launcher melee, hurt, defeat, victory, and magic/helper-call poses.
- Medic and engineer elf helpers: idle, run, assist, and celebrate.
- Gift flight, muzzle burst, gift explosion, healing sparkle, and hat transformation effects.
- Separate gift launcher, presents, rescue/medic supplies, workshop debris, and Christmas dressing.
- Three broad backgrounds: ruined North Pole workshop exterior, workshop rescue interior, and a Christmas version of the existing Earthior-survivor city route.
- Twelve storyboard panels and a caption/timing manifest covering the creator's complete origin and alliance.
- Prepared PNG sheets, animation metadata, GIF review loops, background WebP exports, and a standalone local review gallery.

## Integration contract

Base facing is right. Flip in the renderer for left-facing movement; do not generate a second mirrored identity. Hero sheets use 640-square frames and a consistent foot origin at (320, 600). Helpers use 320-square frames and origin (160, 300). Effects and props use centered anchors unless metadata overrides them. Killer Klause's standing visible-height target is 240 world pixels (1.5× the regular 160-pixel child heroes); calculate runtime scale from the exported idle body's actual visible height. The launcher muzzle and healing sockets are presentation sockets, not hitbox definitions.

The initial playable preview now uses the existing collision and boss-guard paths, a present launcher and bash, medic/engineer support, and a native weapon loadout. Timing and balance are documented in `preview.md` and remain open to playtesting. No replacement Christmas boss or separate new level geometry is introduced.

## Seasonal release requirement

Target start: **Thursday, November 26, 2026 at 00:00 America/Denver** (Thanksgiving).

Target end: **Saturday, December 26, 2026 at 00:00 America/Denver**, exclusive; the event remains active throughout Christmas Day.

UTC interval: `[2026-11-26T07:00:00.000Z, 2026-12-26T07:00:00.000Z)`.

These dates are recorded in `release-window.json` and implemented by `gameplay/christmasEvent.ts`. New runs use Christmas during the public interval, ahead of the stored Thanksgiving preference. Existing runs and saves retain their captured theme/character. The static game uses the browser's date; it is not server-enforced scheduling. The testing code grants access outside that interval and can be turned off separately.

Roster/code entry, launcher combat, elf support, story playback, every campaign stage, saves after expiry, event boundaries, pause, and mobile menu layout have browser verification. Before the public release, deploy the updated build and verify the deployed site; physical-device checks and further balance review remain useful. No scheduled deployment has been installed.
