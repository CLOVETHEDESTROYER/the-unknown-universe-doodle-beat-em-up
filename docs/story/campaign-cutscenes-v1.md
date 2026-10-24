# Campaign cutscenes, first integration

Start [the local game](http://127.0.0.1:4380/) without `autostart=1` to play
the normal title → character selection → six-screen opening → Level 1 flow.
The existing Level 1 loading screen follows the story and waits for game assets.

After the real boss death sequence and exit overlap, Level 1 shows its four
ending screens before the Graveyard. Level 2 shows the four new registry/Nico
screens before the Furnace. Later levels retain their current transitions
while their story artwork is still in production. Fourteen of the 32 planned
core panels are illustrated and integrated.

## Controls and presentation

- Next/Back buttons and Left/Right arrows read at the player's pace.
- Enter/Space advance unless a focused button handles that key itself.
- Skip story or Escape goes straight to the same gameplay destination.
- The last screen names the next destination, rather than looping to the opening.
- Held keys do not skip multiple images. A repeated final activation cannot
  advance the campaign twice.
- Loading or missing artwork leaves captions and navigation available; Retry
  can recover the image without resetting story progress.
- Landscape uses the illustration's reserved bottom area for the caption
  overlay. Portrait displays the whole wide image above the caption/navigation.
  Controls have 44px minimum targets and respect safe areas.

The header labels the illustrated scenes **X GOD'S STORY**. Other playable
schoolmates retain their selected identity and abilities in gameplay; this
pass presents X's account instead of generating seven different origins or
duplicating the chosen hero. A future Story menu can offer chapter replay;
Back already permits rereading within a chapter. Deaths do not replay a scene.

## State and delivery

[App.tsx](../../App.tsx) intercepts only the modern campaign's Level 1→2 and
2→3 completion reports. It preserves that final stats snapshot, including the
clear reward, lives, health, score, souls, equipment/durability, unlock flags
and collected helpers. The old renderer is unmounted during the story; the
next renderer mounts after Continue/Skip. Late old-scene reports are ignored
during that handoff. The platformer now accepts initial health as well as
initial lives, so its mount actually restores the snapshot's health.

[campaignStory.ts](../../story/campaignStory.ts) maps the shared editable
manifests to runtime chapters. Small caption data is bundled; illustrations
load one at a time. The 14 delivery images total about 6.5 MB, 87% below the
original PNG bytes. Original generation outputs and archived project PNGs
remain intact. The legacy brawler and explicit `autostart=1` debug entry keep
their existing start behavior; autostart does not disable later boss endings.

Story playback adds no gameplay companions, shield, roster unlock or alternate
power. The clean Graveyard clue works when optional companions were missed.
All family-fate rules remain in [creator canon](creator-canon.md).

## Verification

Browser plugin skill unavailable; used the repository's installed Playwright
against `http://127.0.0.1:4380`. Run:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/analo/AppData/Local/ms-playwright'
node scripts/test_campaign_story_v1.mjs

$env:GAME_TEST_BROWSER='webkit'
$env:GAME_TEST_EXECUTABLE='C:/Users/analo/AppData/Local/ms-playwright/webkit-2272/Playwright.exe'
node scripts/test_campaign_story_v1.mjs
```

The suite checks desktop, iPhone 15 portrait/landscape and iPad landscape;
opening navigation into actual gameplay; alternate Kai selection; missing
image/retry/skip; real Z-God attacks, full boss death sequences and exit
collisions; both endings; exact run snapshots on next-level entry; collected
and absent helpers; shield; orientation changes; no eager artwork download;
no canvas/touch controls behind story; repeated final activation; direct debug
entry and restored non-default health. It records page/asset errors and saves
ignored screenshots/results under `output/campaign-story-v1`.

The standard game client uses `tests/game-campaign-story.actions.json` from
title/selection through the opening into a moving X God in Level 1. Production
build and diff checks accompany browser validation. Full TypeScript checking
still encounters the previously documented legacy GameEngine, Phaser body/
graphics and mobileRuntime errors; there are no new story-module diagnostics.

Physical iPhone/iPad performance and later, unfinished story chapters remain
for follow-up. No Git push or live deployment is part of this integration pass.
