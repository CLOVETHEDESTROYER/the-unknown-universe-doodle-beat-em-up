export type BattlefieldPropKind = "barrel" | "barricade" | "ammo_crate";
export type BattlefieldDropKind = "medal" | "grenades" | "medkit" | "rapid" | "fan" | "homing";

export interface BattlefieldPropPlan {
  id: string;
  kind: BattlefieldPropKind;
  x: number;
  floor: number;
  drop?: BattlefieldDropKind;
}

/**
 * Hand-crafted Metal Slug battlefield props (explosive ink barrels, destructible
 * barricades, and heavy-weapon caches) anchored to known level floors and
 * end-relative boss approaches.
 */
export function battlefieldPropsForLevel(level: number, endX: number): BattlefieldPropPlan[] {
  if (level === 1) {
    return [
      // Zone 1: Roomy opening approach — ammo crate + barrel spaced cleanly ahead of outpost bunker
      { id: "l1-crate-open", kind: "ammo_crate", x: 640, floor: 480, drop: "rapid" },
      { id: "l1-barrel-open", kind: "barrel", x: 790, floor: 480 },

      // Zone 2: Spacious Ink Rush plaza (1680..2420)
      { id: "l1-barricade-rush", kind: "barricade", x: 1910, floor: 480, drop: "grenades" },
      { id: "l1-barrel-rush-1", kind: "barrel", x: 2080, floor: 480 },
      { id: "l1-barrel-rush-2", kind: "barrel", x: 2240, floor: 480 },

      // Zone 3: Wide Rooftop Strongpoint courtyard (2740..3540)
      { id: "l1-barricade-cross", kind: "barricade", x: 2940, floor: 480, drop: "fan" },
      { id: "l1-barrel-cross-1", kind: "barrel", x: 3110, floor: 480 },
      { id: "l1-barrel-cross-2", kind: "barrel", x: 3320, floor: 480 },
      { id: "l1-crate-cross", kind: "ammo_crate", x: 3620, floor: 480, drop: "medkit" },

      // Zone 4–6: Spacious bastion terrace (y=436), fortified ridge (y=432), sunken trench (y=502) & Scrap Bunker
      { id: "l1-barrel-mid-1", kind: "barrel", x: 4470, floor: 436 },
      { id: "l1-barricade-mid-1", kind: "barricade", x: 6960, floor: 432, drop: "grenades" },
      { id: "l1-barrel-mid-2", kind: "barrel", x: 7210, floor: 432 },
      { id: "l1-barrel-trench", kind: "barrel", x: 7480, floor: 502 },
      { id: "l1-barrel-mid-3", kind: "barrel", x: 8220, floor: 480 },
      { id: "l1-barricade-mid-2", kind: "barricade", x: 8420, floor: 480, drop: "homing" },
      { id: "l1-barrel-mid-4", kind: "barrel", x: 8920, floor: 480 },
      { id: "l1-crate-mid", kind: "ammo_crate", x: 9430, floor: 480, drop: "rapid" },
      { id: "l1-barrel-mid-5", kind: "barrel", x: 9740, floor: 480 },

      // Zone 7: Pre-boss fortress strongpoint (endX-1420 .. endX-980)
      { id: "l1-barricade-boss", kind: "barricade", x: endX - 1310, floor: 480, drop: "fan" },
      { id: "l1-barrel-boss-1", kind: "barrel", x: endX - 1215, floor: 480 },
      { id: "l1-barrel-boss-2", kind: "barrel", x: endX - 1140, floor: 480 },
      { id: "l1-crate-boss", kind: "ammo_crate", x: endX - 1015, floor: 480, drop: "grenades" }
    ];
  }

  if (level === 2) {
    return [
      { id: "l2-crate-open", kind: "ammo_crate", x: 680, floor: 480, drop: "rapid" },
      { id: "l2-barrel-open", kind: "barrel", x: 850, floor: 480 },
      { id: "l2-barrel-pow-1", kind: "barrel", x: 2160, floor: 480 },
      { id: "l2-barricade-pow", kind: "barricade", x: 2680, floor: 480, drop: "grenades" },
      { id: "l2-barrel-pow-2", kind: "barrel", x: 2870, floor: 480 },
      { id: "l2-barricade-terrace", kind: "barricade", x: 3860, floor: 436, drop: "fan" },
      { id: "l2-barrel-terrace-1", kind: "barrel", x: 4020, floor: 436 },
      { id: "l2-barrel-terrace-2", kind: "barrel", x: 4240, floor: 436 },
      { id: "l2-barrel-ridge", kind: "barrel", x: 6340, floor: 436 },
      { id: "l2-barrel-trench", kind: "barrel", x: 6760, floor: 504 },
      { id: "l2-barricade-cross", kind: "barricade", x: 7860, floor: 480, drop: "homing" },
      { id: "l2-barrel-cross-1", kind: "barrel", x: 8080, floor: 480 },
      { id: "l2-barrel-cross-2", kind: "barrel", x: 8340, floor: 480 },
      { id: "l2-crate-mid", kind: "ammo_crate", x: 9140, floor: 480, drop: "medkit" },
      { id: "l2-barricade-boss", kind: "barricade", x: endX - 1340, floor: 480, drop: "homing" },
      { id: "l2-barrel-boss-1", kind: "barrel", x: endX - 1245, floor: 480 },
      { id: "l2-barrel-boss-2", kind: "barrel", x: endX - 1170, floor: 480 }
    ];
  }

  if (level === 3) {
    return [
      { id: "l3-crate-open", kind: "ammo_crate", x: 620, floor: 520, drop: "rapid" },
      { id: "l3-barrel-1", kind: "barrel", x: 780, floor: 520 },
      { id: "l3-barricade-smelter", kind: "barricade", x: 2060, floor: 472, drop: "grenades" },
      { id: "l3-barrel-smelter-1", kind: "barrel", x: 2210, floor: 472 },
      { id: "l3-barrel-smelter-2", kind: "barrel", x: 2480, floor: 472 },
      { id: "l3-barrel-foundry", kind: "barrel", x: 4160, floor: 520 },
      { id: "l3-barricade-slag", kind: "barricade", x: 5640, floor: 520, drop: "fan" },
      { id: "l3-barrel-slag-1", kind: "barrel", x: 5810, floor: 520 },
      { id: "l3-barrel-slag-2", kind: "barrel", x: 6040, floor: 520 },
      { id: "l3-crate-mid", kind: "ammo_crate", x: 7040, floor: 520, drop: "medkit" },
      { id: "l3-barricade-boss", kind: "barricade", x: endX - 1350, floor: 520, drop: "homing" },
      { id: "l3-barrel-boss-1", kind: "barrel", x: endX - 1235, floor: 520 },
      { id: "l3-barrel-boss-2", kind: "barrel", x: endX - 1160, floor: 520 }
    ];
  }

  if (level === 4) {
    return [
      { id: "l4-crate-open", kind: "ammo_crate", x: 640, floor: 520, drop: "rapid" },
      { id: "l4-barrel-1", kind: "barrel", x: 840, floor: 520 },
      { id: "l4-barricade-ruins", kind: "barricade", x: 3780, floor: 472, drop: "grenades" },
      { id: "l4-barrel-ruins-1", kind: "barrel", x: 3950, floor: 472 },
      { id: "l4-barrel-ruins-2", kind: "barrel", x: 4180, floor: 472 },
      { id: "l4-barrel-hollow", kind: "barrel", x: 5860, floor: 542 },
      { id: "l4-barricade-moon", kind: "barricade", x: 7080, floor: 520, drop: "fan" },
      { id: "l4-barrel-moon-1", kind: "barrel", x: 7280, floor: 520 },
      { id: "l4-barrel-moon-2", kind: "barrel", x: 7520, floor: 520 },
      { id: "l4-crate-mid", kind: "ammo_crate", x: 8240, floor: 520, drop: "medkit" },
      { id: "l4-barricade-boss", kind: "barricade", x: endX - 1360, floor: 520, drop: "homing" },
      { id: "l4-barrel-boss-1", kind: "barrel", x: endX - 1255, floor: 520 },
      { id: "l4-barrel-boss-2", kind: "barrel", x: endX - 1180, floor: 520 }
    ];
  }

  if (level === 6) {
    return [
      { id: "l6-crate-open", kind: "ammo_crate", x: 620, floor: 520, drop: "rapid" },
      { id: "l6-barrel-1", kind: "barrel", x: 780, floor: 520 },
      { id: "l6-barricade-outer", kind: "barricade", x: 2060, floor: 468, drop: "grenades" },
      { id: "l6-barrel-outer-1", kind: "barrel", x: 2210, floor: 468 },
      { id: "l6-barrel-outer-2", kind: "barrel", x: 2480, floor: 468 },
      { id: "l6-barrel-spire", kind: "barrel", x: 4160, floor: 520 },
      { id: "l6-barricade-armory", kind: "barricade", x: 5720, floor: 520, drop: "fan" },
      { id: "l6-barrel-armory-1", kind: "barrel", x: 5900, floor: 520 },
      { id: "l6-barrel-armory-2", kind: "barrel", x: 6140, floor: 520 },
      { id: "l6-crate-mid", kind: "ammo_crate", x: 7160, floor: 520, drop: "medkit" },
      { id: "l6-barricade-boss", kind: "barricade", x: endX - 1360, floor: 520, drop: "homing" },
      { id: "l6-barrel-boss-1", kind: "barrel", x: endX - 1245, floor: 520 },
      { id: "l6-barrel-boss-2", kind: "barrel", x: endX - 1165, floor: 520 }
    ];
  }

  return [];
}
