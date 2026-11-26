# Kai’s Workshop · Crates & Collection

The workshop now sells **randomized crates for earned Gold**. Its three rooms are **The crates**, **Your inventory**, and **Character gallery**. Access it from the title wallet or after a level’s results. The campaign flow remains results → workshop → chapter story → next stage, including Alley Rescue after the first chapter.

## Crates and rarity

| Crate | Gold | Common | Rare | Epic | Legendary |
|---|---:|---:|---:|---:|---:|
| Normal wooden crate | 125 | 60% | 28% | 10% | 2% |
| Gem-studded metal legendary crate | 400 | 0% | 0% | 75% | 25% |

Each opening grants **one reward** from the current 69-entry pool: 36 workshop items and 33 character illustrations. A rarity tier is selected first, then an eligible item is selected uniformly within that tier. Random rolls use the browser’s cryptographic random generator. Rarity follows the existing catalog price, now a reference value: Common ≤200, Rare 201–400, Epic 401–650, Legendary >650 Gold. Reference value is not a resale or refund amount.

Already-owned permanent items and artwork leave the pool. Supplies can repeat and accumulate up to 999 of each kind. If a tier has no eligible rewards its weight is omitted and the other eligible tiers are normalized. Legendary crates therefore continue to guarantee Epic or better even when all Legendary artwork is collected. If no eligible rewards remain, opening is blocked without spending Gold. The **What could be inside?** disclosure shows current rarity and individual reward odds, reference values, and collected items.

Opening uses generated closed, charged, opening, and open chest frames, with a growing rattle, recoil, expanding shockwave, colored fragments, rays, and a rising reward. Sounds use the existing effects channel and respect mute/volume. Animation can be skipped. Reduced motion displays the open chest and discovery without shake or bursts. Reloading during an opening restores the same reward immediately.

## Supplies, specials, buddies, and style

Supplies are stored in inventory and **used deliberately between levels**, without a second Gold charge. Winning a weapon never replaces an equipped one automatically. One use of each supply per visit retains the earlier workshop limit. A blocked supply stays in inventory for a later visit.

| Supply | Reference value | Benefit / eligibility |
|---|---:|---|
| Weapon tune-up | 75 | Restore current ground weapon to three hits; keep its variant and gun upgrade |
| Ink Shield | 100 | One shield; does not stack |
| Extra life | 150 | Restore one life up to the existing campaign maximum |
| Health Heart | 100 | Restore up to 30 health |
| Ink Blaster | 100 | Equip a fresh blaster |
| Flame Sword | 200 | Equip a fresh sword from level two |
| Frost Gauntlet | 125 | Equip a fresh gauntlet from level two |
| Ember Boots | 125 | Equip fresh boots from level three |
| Storm Halo | 500 | Equip a fresh halo from level four |
| Kai Blaster Arm | 500 | X God’s rescue gift; repair a held arm in level two, or equip from a later workshop visit |
| Rapid Fire / Fan Shots / Heat Seekers | 200 / 250 / 350 | Modify an equipped blaster; retain existing durability and variant |
| Dinio / Doghost | 300 / 350 | Recruit the existing companion for this campaign |
| Teleportation C | 450 | Recruit the existing companion from level three |
| Gravity Core | 450 | Add one charge, up to three |

Ground gear waits through Starbreak; health and lives remain usable. Full health, full lives, full weapon durability, existing shields/companions/upgrades, native-weapon characters, and Z-God’s invincibility are checked before consuming supplies. Kai’s arm cannot bypass the first Alley Rescue. The Rush Star stays a route challenge objective rather than random crate loot.

All earlier permanent workshop items remain in crates and retain their gameplay: Ink Fan, Chalk Ring, Rail Pulse, Static Net, Spark Moth, Patch Beetle, Arctic Ink, Neon Rose, Chalk Sparks, Starlight, Prism Burst, Rooftop Shades, Sunset Headband, and Blue Kicks. They are equipped from inventory for free; originals can be restored freely. Winning does not automatically change an existing loadout. Generated item/action previews and X God wardrobe try-ons remain available for owned items. Combat timing, damage, and collision bodies remain unchanged.

## Character gallery

Artwork ownership is separate from equipment and playable-character unlocks. Locked illustrations remain concealed. Collected illustrations can be filtered by character or series and opened in a full-size viewer. The title **Art Gallery** also contains the character collection alongside the existing power-up and buddy studies.

| Series | Count | Illustrations |
|---|---:|---|
| Harvest Party | 2 | Thanksgiving-suit X God; turkey-suit Killer Kai |
| Style Switch | 4 | Pixel-art Nico; watercolor Z-God; noir Barrett; ink-wash Ezra |
| Beyond the Page | 11 | 3D-rendered X God, Kai, Barrett, Nico, Ezra, Teleportation C, Z-God, Kaden, Shadow Kid, Turkey King, and Killer Klause |

Gallery art does not change playable outfits or grant abilities. All 35 generated image originals, exact prompts, identity references, and contact sheets are in `art/workshop-crates-v2`. Runtime WebPs and crate strips are in `public/workshop/crates-v2` (about 17.25 MB combined). Rebuild with `python scripts/pack_workshop_crates_v2.py`; the script uses the project’s local originals and requires Pillow.

## Playtime art expansion

Six additional X God illustrations and one for each other character add four series. **Off Duty** has surfing, a moonwalk, sandcastles, camping, a portal garden, kite flying, and a royal beach day (7). **Family Album** has X God/Z-God game night, pancake-making, Ezra’s cookout, and Klause making toys (4). **Hero Academy** features X God and Kaden in dynamic team-comic poses (2). **City Legends** has X God’s sunset car-show pose, Nico’s basketball scene, and Shadow Kid’s neon arcade (3). X God now has eight collectible illustrations. The gallery discovers series from the catalog automatically. Exact new prompts and references are in `art/workshop-crates-v2/playtime-generation.json`; new entries are also in the main packing manifest.

## Saving and recovery

The existing `unknownUniverse.wallet.v1` key and version remain compatible with old saves. Missing `inventory`, `cards`, `crateReveal`, and `cratesOpened` fields become empty collection state. Unknown optional collection entries are sanitized without resetting existing Gold, equipment, or campaign progress.

Opening writes its Gold debit, reward grant, opening count, and recovery receipt in **one localStorage operation**, before animation. The receipt stores the actual selected reward. A second opening is blocked until it is acknowledged. Acknowledgement clears only the receipt; it does not charge or grant again. A storage error leaves the original state unchanged and allows retry. Supply consumption similarly writes its inventory decrement and updated campaign snapshot atomically. Continue keeps the earlier campaign-write-before-results-acknowledgement flow. Developer preview runs retain the existing in-memory-only behavior.

## Validation

- `scripts/test_workshop_crates_v2.mjs` / the established `scripts/test_workshop.mjs` entry point: 10,000 normal and 2,000 legendary rolls, reachability, probabilities, duplicate protection, complete/capped inventories, migration and corruption handling; browser charge/receipt/supply storage failures, double click, reload before reveal, regular/legendary/reduced-motion opening, card filters and full artwork, all 33 image files, free equipment, supply application/carryover, insufficient funds, and portrait/landscape phone layouts.
- `scripts/test_kai_workshop_art.mjs`: the original 19 generated item loops, action previews and live ground/flight/Alley integrations, using the new inventory navigation.
- `scripts/test_workshop_v1.mjs`: existing power-up and companion studies, animation controls, campaign art, and phone/reduced-motion behavior.
- `scripts/test_level_results.mjs` / `scripts/test_campaign_story_v1.mjs`: existing reward banking, results recovery, campaign continuation, and finale flows.

Playtest evidence stays ignored under `output`. Physical-device Safari and cross-device/account syncing are outside these browser-local checks.

## New selectable buddies

Scribble Fox (Rare, 350 value), Puddle (Rare, 350), Chomp Chest (Rare, 400), Rumble Puff (Epic, 550), and Orbit (Epic, 600) are now permanent chest rewards. The workshop shows all seven buddies; owned buddies can be equipped there or in **Bring a buddy** before choosing a hero. Ownership and selection persist without another purchase. Each new buddy has 16 generated poses, including its own assist action. Damage, combat-only healing, earned durability repairs, and projectile deflection use normal combat/save rules. See `art/buddies-v2/README.md` for full behavior, cooldowns, sprite sheets, previews, prompts, and packing instructions. The original two buddies retain their behavior.
