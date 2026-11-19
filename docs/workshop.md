# Kai's Workshop

The flow is **level results → workshop → existing chapter story → next level**. The first chapter still leads through Alley Rescue. The finale goes straight to its story; the collection remains accessible from the title wallet button afterward.

Supplies take effect in the upcoming campaign snapshot. Cosmetic purchases are permanent in the browser's wallet and automatically equip on purchase. Owned styles can be previewed and equipped again for free, or reset to the original look. The shop never increases weapon damage.

| Item | Gold | Effect |
|---|---:|---|
| Weapon tune-up | 75 | Restore current ground weapon to three hits; keep its variant and upgrades |
| Ink Shield | 100 | One shield, with no stacking |
| Extra life | 150 | Restore one lost life, up to the campaign's existing maximum |
| Arctic Ink | 250 | Permanent cyan ink color |
| Neon Rose | 250 | Permanent pink ink color |
| Chalk Sparks | 400 | Permanent dotted shot trail |
| Prism Burst | 600 | Permanent colorful charge-hit and slam rings |
| Starlight | 650 | Permanent star shot trail |

Supplies can be bought once per visit. Full, incompatible, or unnecessary supplies show a reason rather than taking Gold. Ground supplies are unavailable immediately before the flight stage. Z-God's invincibility does not need consumables. Existing normal weapon, shield, and life rules still apply.

## Price calibration

The guaranteed 100 Gold clear reward covers a shield or a tune-up. A first cosmetic costs 250 Gold. Larger effects take more saving, while buying supplies remains a choice.

`scripts/analyze_shop_economy.mjs` inspects the current live routes. These are **illustrative budgets**, using 60% of visible route gems and 70% of initially present regular enemies plus the boss. Optional encounters and challenge bonuses are excluded; this is not observed player performance.

| Level | Route gems | Illustrative Gold per clear | All route gems and initial foes |
|---|---:|---:|---:|
| 1 | 66 | 315 | 460 |
| 2 | 56 | 285 | 410 |
| 3 | 36 | 225 | 310 |
| 4 | 46 | 255 | 350 |
| 6 | 36 | 225 | 300 |

Flight still has a guaranteed 100 Gold clear reward; its dynamic combat rewards are not modeled in this table. The current estimates put a color within roughly one or two clears and a larger cosmetic within several clears if the player saves. Real playtest results should decide the next price changes.

## Saving and recovery

The wallet's existing version remains backward compatible. Missing `owned` and `equipped` fields become an empty collection and classic styles. Pending results now record whether the player is at results or in the shop. A purchase writes its Gold deduction, ownership/equipment, and updated next-level supplies in one wallet operation. Reloading in the shop restores that visit and its purchases. Continue writes the campaign snapshot before acknowledging the pending result.

Developer preview runs keep their purchases in memory and never modify a real wallet. The title workshop supports permanent cosmetics; supplies require a between-level visit.

## Combat presentation

Blaster shots gain a short glow and trail, charge colors follow equipped ink, accepted hits briefly flash the actual enemy pose, and slam landings add rings and fragments. Prism Burst adds colored ring outlines that stay readable over bright backgrounds. Effects have bounded pools and short lifetimes. Reduced motion removes orbiting/growing accents while keeping attack information visible. Damage, timing, and collision bodies are unchanged.

## Checks

- `scripts/test_workshop.mjs`: confirmation, supplies, ownership, free equipment changes, no double charge, insufficient funds, storage failures, reload, mobile layout, Alley Rescue and next-level carryover.
- `scripts/test_combat_cosmetics.mjs`: equipped colors/trails, unchanged normal and charged damage, hit flashes, slam effects, reduced motion.
- `scripts/test_level_results.mjs` and `scripts/test_campaign_story_v1.mjs`: reward, story, finale, and campaign regression checks through the shop.
- `scripts/analyze_shop_economy.mjs`: repeatable route/price budget report.

See `holiday-playtest.md` for the friends' playtest guide and notes sheet.
