import { CharacterId } from "./types";

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  subtitle: string;
  cardImage: string;
  hudColor: string;
  rewardName: string;
  rewardSubtitle: string;
  stats: {
    strength: number;
    speed: number;
    defense: number;
    spirit: number;
  };
}

export const ROSTER_UNLOCK_STORAGE_KEY = "unknownUniverse.xGodClear.v1";

export const CHARACTER_CONFIGS: Record<CharacterId, CharacterConfig> = {
  zgod: {
    id: "zgod",
    name: "Z-God",
    subtitle: "X God's Little Sister",
    cardImage: "/cards/z-god-card.png",
    hudColor: "pink",
    rewardName: "Star Power",
    rewardSubtitle: "Invincible. Every hit defeats an enemy—even a boss.",
    stats: { strength: 100, speed: 90, defense: 100, spirit: 100 }
  },
  xgod: {
    id: "xgod",
    name: "X God",
    subtitle: "Main Character",
    cardImage: "/cards/xgod-current-v2.webp",
    hudColor: "amber",
    rewardName: "Fire Sword",
    rewardSubtitle: "Claim the blade and let its fire answer you.",
    stats: { strength: 82, speed: 82, defense: 76, spirit: 90 }
  },
  barrett: {
    id: "barrett",
    name: "Barrett",
    subtitle: "The Bear",
    cardImage: "/cards/barrett-card.png",
    hudColor: "orange",
    rewardName: "Bear Claw Gauntlets",
    rewardSubtitle: "Swipe through the laws of physics.",
    stats: { strength: 88, speed: 76, defense: 80, spirit: 74 }
  },
  nico: {
    id: "nico",
    name: "Nico",
    subtitle: "Lane Clearer",
    cardImage: "/cards/nico-card.png",
    hudColor: "lime",
    rewardName: "Rocket Launcher",
    rewardSubtitle: "Big lanes. Bigger problems solved.",
    stats: { strength: 85, speed: 80, defense: 72, spirit: 78 }
  },
  ezra: {
    id: "ezra",
    name: "Ezra",
    subtitle: "Hellfire Warrior",
    cardImage: "/cards/ezra-card.png",
    hudColor: "red",
    rewardName: "Hellfire Core",
    rewardSubtitle: "Burn it all. Leave nothing cold.",
    stats: { strength: 86, speed: 74, defense: 62, spirit: 88 }
  },
  teleportation_c: {
    id: "teleportation_c",
    name: "Teleportation C",
    subtitle: "Shadow Ally",
    cardImage: "/cards/teleportation-c-card.png",
    hudColor: "violet",
    rewardName: "Portal Core",
    rewardSubtitle: "Gone in a blink. Back in a strike.",
    stats: { strength: 70, speed: 92, defense: 64, spirit: 88 }
  },
  killer_kai: {
    id: "killer_kai",
    name: "Killer Kai",
    subtitle: "Cyborg Cannoneer",
    cardImage: "/cards/killer-kai-card-v2.webp",
    hudColor: "cyan",
    rewardName: "Thunder Core",
    rewardSubtitle: "Punch the ground. Bring down an electrical storm.",
    stats: { strength: 86, speed: 84, defense: 82, spirit: 88 }
  }
};

export const CHARACTER_IDS = Object.keys(CHARACTER_CONFIGS) as CharacterId[];

export const isCharacterId = (value: string | null | undefined): value is CharacterId =>
  value === "killer_kai" ||
  value === "zgod" ||
  value === "xgod" ||
  value === "barrett" ||
  value === "nico" ||
  value === "ezra" ||
  value === "teleportation_c";
