# Campaign cutscenes

Start [the local game](http://127.0.0.1:4380/) without `autostart=1` to play
the normal title → character selection → six-screen opening → Level 1 flow.
The existing Level 1 loading screen follows the story and waits for game assets.

After the real boss death sequence and exit overlap, each ground level from
1 through 4 shows its four-screen ending before the next destination. Level 5
shows its four-screen ending after the Pursuer wreck, landing and disembark.
All 32 planned core panels are illustrated and integrated. The six-screen
finale plays after the final defeat, celebration and exit; Continue/Skip opens
the completed run summary without remounting the final level.

| Ending | Story progress | Continue destination |
| --- | --- | --- |
| The Scratch | Sword, meteor mark, Barrett reunion | Graveyard |
| Graveyard | Harvested worlds, Earthior record, Nico's voice | Furnace |
| Furnace | Ezra/Kai reunion, Void Regent authorization, next target | Witchwood |
| Witchwood | Broken protection promise, route, Z-God reunion | Starbreak Run |
| Starbreak Run | Stolen resources, next launch warning, arrival | Dread Planet |
| Dread Planet | Defeated Regent, evacuation, weapon shutdown, dawn | Victory summary |
| Dread Planet | Defeated Regent, evacuation, weapon shutdown, dawn | Victory summary |

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

[App.tsx](../../App.tsx) intercepts the modern campaign's Level 1→2 through
5→6 completion reports. It preserves that final stats snapshot, including the
clear reward, lives, health, score, souls, equipment/durability, unlock flags
and collected helpers. The old renderer is unmounted during the story; the
next renderer mounts after Continue/Skip. Late old-scene reports are ignored
during that handoff. The platformer now accepts initial health as well as
initial lives, so its mount actually restores the snapshot's health.

[campaignStory.ts](../../story/campaignStory.ts) maps the shared editable
manifests to runtime chapters. Small caption data is bundled; illustrations
load one at a time. The 32 delivery images total 15,190,948 bytes, approximately
87% below the 92,389,871 active PNG bytes. The twelve new screens add about
5.7 MB of delivery assets. Original generation outputs and archived project PNGs
remain intact. The legacy brawler and explicit `autostart=1` debug entry keep
their existing start behavior; autostart does not disable later boss endings.

Story playback adds no gameplay companions, shield, roster unlock or alternate
power. Shared paper charts and radio clues work when optional companions were
missed. C is one schoolmate throughout, not a duplicated playable/helper
character. Seeing his story role does not grant his companion ability. The
existing small Starbreak craft has two seats; other classmates help via radio
while the art focuses on X/Z. Z-God remains safe and invincible. Music follows
the completed chapter's existing level track, including the flight ending.
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

`node scripts/test_campaign_story_chapters_v2.mjs` checks all twelve new
screens on the same profiles in Chromium and installed WebKit. It uses real
Z-God attacks, complete Cinder Colossus/Kilina death sequences, actual gate
collisions, real Pursuer wreck/landing/disembark, all three story chapters,
Back/Next, named destination controls and entry into the next real renderer.
It compares score, souls, kills, lives, health, equipment/durability, helpers,
shield and Gravity Core state after the handoffs, checks labels/captions/
44px controls and ensures no unvisited chapter art loads. The script's
existing `flightFinale=1` fixture only starts the flight test near the Pursuer;
the boss damage, death and landing remain real. Saved evidence is ignored
under `output/campaign-story-chapters-v2`.

One visual phone check caught the target marker behind the map's caption
panel. A separate built-in ImageGen edit now holds a smaller chart higher;
the original and edit provenance stay preserved. Reviewed rendered phone,
tablet/desktop, portrait warning, sibling reunion and resumed-level captures.
The new review previews are available with `?chapter=level3`, `level4` or
`level5` on the existing static player route. The standard game smoke client
also reads the new Witchwood ending into its final sibling-embrace screen.

The standard game client uses `tests/game-campaign-story.actions.json` from
title/selection through the opening into a moving X God in Level 1. Production
build and diff checks accompany browser validation. Full TypeScript checking
still encounters the previously documented legacy GameEngine, Phaser body/
graphics and mobileRuntime errors; there are no new story-module diagnostics.

Physical iPhone/iPad performance, the optional pre-Regent confrontation
and a chapter replay menu remain for follow-up.
The prior integration was published as 8bd9741; these three new chapter
endings are a subsequent local pass, with no push/deployment requested yet.


## Final victory integration

The six-panel `level6` chapter is triggered by the modern final level's real
`isVictory` report after boss defeat, celebration, gate overlap and clear delay.
The already completed stats are retained; the existing X God roster unlock still
applies. Neither story reading nor skipping modifies equipment, helpers or score.
Continue/Skip opens the victory summary. The completed Phaser renderer stays
released instead of remounting a new final level behind the result screen.
The summary now scrolls on small screens so Play Again remains reachable.

`scripts/test_campaign_finale_v1.mjs` passes Chromium and installed WebKit:
real final boss attacks/death/celebration/exit, six panels, Back/Next, portrait
rotation, landscape phone and iPad, Skip, alternate X/Kai/Z gameplay, exact saved
victory snapshot, X roster unlock and Play Again. No page/asset errors. Portrait
story testing rotates after the fight, respecting the game's landscape play rule.
Evidence: `output/campaign-finale-v1`. Standard game client also reads the six
screens at `/cutscenes/prologue-v1/preview.html?chapter=level6`.

All six finale sources, built-in generation prompts and provenance are preserved
in `art/cutscenes/level6-v1`. Editable captions/review PNGs/WebPs are in
`public/cutscenes/level6-v1`; the WebPs total 3,020,298 bytes (86% below PNGs),
and only the current illustration loads. This remains local, uncommitted work.
