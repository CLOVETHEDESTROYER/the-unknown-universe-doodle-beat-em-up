# Chest buddies · animated sprites

All five approved buddy concepts were animated with built-in ImageGen as complete 4×4 sheets. Exact prompts, generation sources and the prepared reference canvases are retained here. Each source PNG has native transparency. `python scripts/pack_buddies_v2.py` creates shared-scale, bottom-centered 256×256 frames and removes only tiny disconnected neighbor fragments touching a grid boundary. Pillow, NumPy and SciPy are required. Runtime assets are in `public/buddies/v2`; only the equipped buddy sheet loads into a game scene.

| Buddy | Sprite sheet | Animation preview | Reference value / rarity | Help |
|---|---|---|---|---|
| Scribble Fox | [Sheet](scribble-fox-sheet.png) | [GIF](scribble-fox-preview.gif) | 350 / Rare | Pounce for 4 damage; 3.2s cooldown, 1.8s when finishing a target |
| Puddle | [Sheet](puddle-sheet.png) | [GIF](puddle-preview.gif) | 350 / Rare | Heal 8 HP with a nearby enemy; 10s cooldown; no idle/full-health healing |
| Rumble Puff | [Sheet](rumble-puff-sheet.png) | [GIF](rumble-puff-preview.gif) | 550 / Epic | Nearby 3-damage clap; regular enemies stall 650ms; 6.5s cooldown |
| Chomp Chest | [Sheet](chomp-chest-sheet.png) | [GIF](chomp-chest-preview.gif) | 400 / Rare | Three defeats earn +1 weapon durability; keeps a ready repair until needed |
| Orbit | [Sheet](orbit-sheet.png) | [GIF](orbit-preview.gif) | 600 / Epic | Deflect approaching shots every 6s; attract nearby gold (repair orbs in flight) |

Frames 0–3 idle, 4–11 movement, 12–15 assist. The same 16 poses are used for workshop previews, ground, flight and the peaceful Alley interlude. Fox and Chest follow at ground height. All buddies are permanent chest unlocks, leave reward pools once owned, and can be selected for free from the workshop or before choosing a hero. One buddy at a time; no stat stacking. Repair does not replace weapons, restore broken/lost gear, or modify native unbreakable weapons. Boss guards and normal damage handling remain authoritative; crowd control never freezes bosses. Assistance and animation pause with simulation; reduced motion uses steady frames and suppresses the fox lunge tween. Cooldowns and scrap reset with a scene; ownership/equipment persist in the existing wallet.

New shared rules: `gameplay/buddyAbilities.ts`. Ground integration: `gameplay/workshopCombat.ts`; flight uses the same rules against its normal projectile/collision system. The Alley has no enemies or health; buddies follow visually there.

Validation: `scripts/test_buddies_v2.mjs`, `npm run test:workshop`, `scripts/test_kai_workshop_art.mjs`, build/typecheck, and the shared develop-web-game smoke client. Browser captures remain ignored under `output/buddies-v2`.
