# Level 1 rooftop playground

This milestone changes the opening 3,200 world units into a compact platforming course. Its brick roofs, pencil panorama, character sprites, and generated hazard art retain the game's existing visual style.

## Play it

Open `http://127.0.0.1:3000/?autostart=1&level=1` for a fresh Level 1 run. Move with Left/Right and jump with Up or Z. Space fires the equipped blaster or swings the equipped sword; C is an alternate shot button. Tap jump for a short hop; hold it for the wider roof gap.

1. Clear the low brick hurdle and use the first raised roof to jump past or stomp the walker.
2. Touch the checkpoint and run onto the green spring. It launches automatically; horizontal steering still works in the air.
3. Follow the optional pink stars over the upper roofs. The first star starts a 14-second timer. Collect all six for 1,200 points, an ink shield, and up to 15 health. Individual stars award no points, so resetting the challenge cannot farm score.
4. A missed jump drops to solid ground. A timeout restores all six stars without damaging the player. Falling out of the level or dying also resets an active challenge.
5. Both routes reunite at Dinio's orb and a second checkpoint. A moving platform, small gap, and second spring repeat the traversal ideas before the later level sections.

## Implementation

`components/PlatformerGameEngine.tsx` contains the opening layout, optional spring/rush level data, spring launch and squash feedback, challenge state, reward, and retry behavior. Other levels have no spring pads or rush challenge in this milestone.

`tests/game-rooftop-playground.actions.json` walks the opening with the established game client. `scripts/test_rooftop_playground.mjs` exercises the upper route with actual keyboard movement, then verifies the reward, second spring, timeout, fall/fatal recovery, and Level 2 isolation. Debug position hooks are used only to set up the isolated recovery cases.

For screenshot capture, `capture=1` preserves the WebGL drawing buffer. An optional `renderer=canvas` query is also available for diagnosing rendering issues; normal play retains the default renderer.

## Generated asset

Built-in image generation produced `public/platformer/rooftop-spring-pad-generated.png`. The original transparent image is preserved; a Phaser frame selects the visible pad within its transparent margins.

Final prompt: “Create ONE isolated 2D side-view platformer springboard game sprite, transparent background, no text. Entire object a wide low rectangular skateboard-sized roof bounce pad, drawn in hand-made black ink outlines with visible colored pencil hatching and rough paper texture, muted terracotta brick base with two chunky visible coiled metal springs, lime green padded top with cream chevron pointing UP painted on its side. Original imaginative school rooftop doodle world, charming slightly scruffy illustration. Perfect horizontal side profile, flat gameplay view, no perspective view of the top, no scenery, no ground, no glow, no shadow beyond object. Clear broad flat top for landing, simple readable silhouette. Object occupies centered 85 percent width, 35 percent height of transparent canvas, very wide and squat 3:1 object proportions, fully visible with generous transparent margin. Fits a hand drawn game character with green spiky hair, gray T shirt and orange cargo trousers. Render the asset only.”

## Next decision after user playtest

Tune spring control and star-route pacing from player feedback before expanding these mechanics across the rest of Level 1. The next design pass can give later sections their own obstacle combinations.

## Verification

The production build passed. The focused browser playtest passed seven checks: first spring; a complete six-star route with real keyboard movement and full health; second spring; timeout reset; fall recovery; fatal-hit recovery; and Level 2 isolation. The established gameplay client also traversed the opening without failed assets or console errors. Actual gameplay captures were visually inspected. Evidence is in `output/rooftop-playground-check/` and `output/rooftop-playground/`.

The full TypeScript check still reports errors in existing code, including duplicate functions in the legacy engine and prior sprite-key/body typing issues. None of its diagnostics target the new spring or challenge code.
