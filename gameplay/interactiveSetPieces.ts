import Phaser from "phaser";
import { playSfx } from "../audio/gameAudio";
import type { BattlefieldDropKind } from "./battlefieldLayouts";

export interface DrawbridgePlan {
  id: string;
  bridgeX: number;
  width: number;
  floor: number;
  switchX: number;
  switchY: number;
  anchorSide?: "left" | "right";
}

export interface HangingCratePlan {
  id: string;
  x: number;
  hangY: number;
  floor: number;
  drop?: BattlefieldDropKind;
}

export interface DestructibleTowerPlan {
  id: string;
  x: number;
  floor: number;
  height?: number;
  hp?: number;
  drop?: BattlefieldDropKind;
}

export interface BlastGatePlan {
  id: string;
  x: number;
  floor: number;
  height?: number;
  hp?: number;
  drop?: BattlefieldDropKind;
}

export interface CollapsingBridgePlan {
  id: string;
  startX: number;
  floor: number;
  segments: number;
  segmentWidth?: number;
  crumbleMs?: number;
}

export interface AmbientBannerPlan {
  x: number;
  y: number;
  kind: "lantern" | "pennant";
  color: number;
}

export interface LevelSetPieces {
  drawbridges: DrawbridgePlan[];
  hangingCrates: HangingCratePlan[];
  towers: DestructibleTowerPlan[];
  blastGates: BlastGatePlan[];
  collapsingBridges: CollapsingBridgePlan[];
  ambient: AmbientBannerPlan[];
}

export function setPiecesForLevel(level: number, endX: number): LevelSetPieces {
  if (level === 1) {
    return {
      drawbridges: [
        {
          id: "l1-bridge-1",
          bridgeX: 3855,
          width: 190,
          floor: 480,
          switchX: 3945,
          switchY: 280,
          anchorSide: "left"
        },
        {
          id: "l1-bridge-2",
          bridgeX: 7835,
          width: 200,
          floor: 480,
          switchX: 7930,
          switchY: 275,
          anchorSide: "left"
        },
        {
          id: "l1-bridge-3",
          bridgeX: 9075,
          width: 220,
          floor: 480,
          switchX: 9180,
          switchY: 275,
          anchorSide: "left"
        }
      ],
      hangingCrates: [
        { id: "l1-hang-rush", x: 2135, hangY: 230, floor: 480, drop: "grenades" },
        { id: "l1-hang-cross", x: 3200, hangY: 225, floor: 480, drop: "rapid" },
        { id: "l1-hang-bunker", x: 8580, hangY: 205, floor: 480, drop: "medkit" },
        { id: "l1-hang-boss", x: endX - 1185, hangY: 225, floor: 480, drop: "fan" }
      ],
      towers: [
        { id: "l1-tower-crossfire", x: 3400, floor: 480, height: 158, hp: 5, drop: "medal" },
        { id: "l1-tower-terrace", x: 4750, floor: 436, height: 152, hp: 5, drop: "grenades" },
        { id: "l1-tower-bunker", x: 8780, floor: 480, height: 158, hp: 6, drop: "fan" }
      ],
      blastGates: [
        { id: "l1-gate-crossfire", x: 2560, floor: 480, height: 132, hp: 5, drop: "medal" },
        { id: "l1-gate-ridge", x: 7120, floor: 432, height: 128, hp: 5, drop: "grenades" }
      ],
      collapsingBridges: [
        { id: "l1-trestle-gorge", startX: 4940, floor: 438, segments: 6, segmentWidth: 54, crumbleMs: 360 }
      ],
      ambient: [
        { x: 640, y: 255, kind: "lantern", color: 0xffd166 },
        { x: 1790, y: 480, kind: "pennant", color: 0xe63946 },
        { x: 2820, y: 480, kind: "pennant", color: 0xff9f1c },
        { x: 4340, y: 265, kind: "lantern", color: 0xffd166 },
        { x: 4870, y: 436, kind: "pennant", color: 0xe63946 },
        { x: 7100, y: 230, kind: "lantern", color: 0xffd166 },
        { x: 8170, y: 480, kind: "pennant", color: 0xe63946 },
        { x: endX - 1380, y: 480, kind: "pennant", color: 0xff9f1c },
        { x: endX - 1020, y: 265, kind: "lantern", color: 0xffd166 }
      ]
    };
  }

  if (level === 2) {
    return {
      drawbridges: [
        { id: "l2-bridge-1", bridgeX: 7318, width: 200, floor: 480, switchX: 7415, switchY: 280 },
        { id: "l2-bridge-2", bridgeX: 8688, width: 210, floor: 480, switchX: 8790, switchY: 280 }
      ],
      hangingCrates: [
        { id: "l2-hang-1", x: 2580, hangY: 225, floor: 480, drop: "grenades" },
        { id: "l2-hang-2", x: 6920, hangY: 215, floor: 504, drop: "fan" },
        { id: "l2-hang-boss", x: endX - 1200, hangY: 225, floor: 480, drop: "medkit" }
      ],
      towers: [
        { id: "l2-tower-pow", x: 2960, floor: 480, height: 154, hp: 5, drop: "medal" },
        { id: "l2-tower-terrace", x: 4320, floor: 436, height: 150, hp: 5, drop: "grenades" },
        { id: "l2-tower-cross", x: 8410, floor: 480, height: 156, hp: 6, drop: "fan" }
      ],
      blastGates: [
        { id: "l2-gate-entry", x: 1720, floor: 480, height: 132, hp: 5, drop: "medal" },
        { id: "l2-gate-ridge", x: 6460, floor: 436, height: 128, hp: 5, drop: "grenades" }
      ],
      collapsingBridges: [
        { id: "l2-trestle-fog", startX: 4700, floor: 438, segments: 6, segmentWidth: 54, crumbleMs: 360 }
      ],
      ambient: [
        { x: 740, y: 265, kind: "lantern", color: 0x7dd3fc },
        { x: 2060, y: 480, kind: "pennant", color: 0xa78bfa },
        { x: 3740, y: 436, kind: "pennant", color: 0x818cf8 },
        { x: 6420, y: 240, kind: "lantern", color: 0x7dd3fc },
        { x: 7740, y: 480, kind: "pennant", color: 0xa78bfa },
        { x: endX - 1350, y: 480, kind: "pennant", color: 0xa78bfa }
      ]
    };
  }

  if (level === 3) {
    return {
      drawbridges: [
        { id: "l3-bridge-1", bridgeX: 1235, width: 220, floor: 520, switchX: 1345, switchY: 300 },
        { id: "l3-bridge-2", bridgeX: 3255, width: 250, floor: 520, switchX: 3380, switchY: 295 },
        { id: "l3-bridge-3", bridgeX: 6368, width: 250, floor: 520, switchX: 6495, switchY: 295 }
      ],
      hangingCrates: [
        { id: "l3-hang-1", x: 2320, hangY: 215, floor: 472, drop: "grenades" },
        { id: "l3-hang-2", x: 5920, hangY: 215, floor: 520, drop: "rapid" },
        { id: "l3-hang-boss", x: endX - 1200, hangY: 225, floor: 520, drop: "medkit" }
      ],
      towers: [
        { id: "l3-tower-smelter", x: 2590, floor: 472, height: 152, hp: 6, drop: "medal" },
        { id: "l3-tower-foundry", x: 4560, floor: 520, height: 156, hp: 6, drop: "grenades" },
        { id: "l3-tower-slag", x: 6120, floor: 520, height: 156, hp: 6, drop: "fan" }
      ],
      blastGates: [
        { id: "l3-gate-smelter", x: 3010, floor: 520, height: 132, hp: 6, drop: "medal" },
        { id: "l3-gate-rampart", x: 6880, floor: 520, height: 132, hp: 6, drop: "grenades" }
      ],
      collapsingBridges: [
        { id: "l3-trestle-lava", startX: 4930, floor: 478, segments: 6, segmentWidth: 54, crumbleMs: 360 }
      ],
      ambient: [
        { x: 680, y: 280, kind: "lantern", color: 0xff8c42 },
        { x: 1940, y: 472, kind: "pennant", color: 0xf97316 },
        { x: 3920, y: 260, kind: "lantern", color: 0xff8c42 },
        { x: 5540, y: 520, kind: "pennant", color: 0xef4444 },
        { x: endX - 1350, y: 520, kind: "pennant", color: 0xef4444 }
      ]
    };
  }

  if (level === 4) {
    return {
      drawbridges: [
        { id: "l4-bridge-1", bridgeX: 2255, width: 210, floor: 520, switchX: 2360, switchY: 300 },
        { id: "l4-bridge-2", bridgeX: 6498, width: 210, floor: 520, switchX: 6605, switchY: 300 }
      ],
      hangingCrates: [
        { id: "l4-hang-1", x: 4060, hangY: 220, floor: 472, drop: "grenades" },
        { id: "l4-hang-2", x: 7400, hangY: 225, floor: 520, drop: "fan" },
        { id: "l4-hang-boss", x: endX - 1200, hangY: 225, floor: 520, drop: "medkit" }
      ],
      towers: [
        { id: "l4-tower-ruins", x: 4280, floor: 472, height: 152, hp: 6, drop: "medal" },
        { id: "l4-tower-hollow", x: 6120, floor: 542, height: 156, hp: 6, drop: "grenades" },
        { id: "l4-tower-moonthorn", x: 7600, floor: 520, height: 156, hp: 6, drop: "fan" }
      ],
      blastGates: [
        { id: "l4-gate-entry", x: 2010, floor: 520, height: 132, hp: 6, drop: "medal" },
        { id: "l4-gate-sanctuary", x: 7810, floor: 520, height: 132, hp: 6, drop: "grenades" }
      ],
      collapsingBridges: [
        { id: "l4-trestle-ravine", startX: 4480, floor: 474, segments: 6, segmentWidth: 54, crumbleMs: 360 }
      ],
      ambient: [
        { x: 720, y: 270, kind: "lantern", color: 0xc084fc },
        { x: 2660, y: 520, kind: "pennant", color: 0xec4899 },
        { x: 3720, y: 472, kind: "pennant", color: 0xc084fc },
        { x: 5860, y: 275, kind: "lantern", color: 0xc084fc },
        { x: 6960, y: 520, kind: "pennant", color: 0xec4899 },
        { x: endX - 1350, y: 520, kind: "pennant", color: 0xc084fc }
      ]
    };
  }

  if (level === 6) {
    return {
      drawbridges: [
        { id: "l6-bridge-1", bridgeX: 1235, width: 220, floor: 520, switchX: 1345, switchY: 295 },
        { id: "l6-bridge-2", bridgeX: 3275, width: 250, floor: 520, switchX: 3400, switchY: 295 }
      ],
      hangingCrates: [
        { id: "l6-hang-1", x: 2320, hangY: 215, floor: 468, drop: "grenades" },
        { id: "l6-hang-2", x: 6020, hangY: 220, floor: 520, drop: "homing" },
        { id: "l6-hang-boss", x: endX - 1200, hangY: 225, floor: 520, drop: "medkit" }
      ],
      towers: [
        { id: "l6-tower-outer", x: 2590, floor: 468, height: 152, hp: 6, drop: "medal" },
        { id: "l6-tower-spire", x: 4620, floor: 520, height: 158, hp: 6, drop: "grenades" },
        { id: "l6-tower-armory", x: 6240, floor: 520, height: 158, hp: 6, drop: "fan" }
      ],
      blastGates: [
        { id: "l6-gate-outer", x: 3030, floor: 520, height: 132, hp: 6, drop: "medal" },
        { id: "l6-gate-citadel", x: 6960, floor: 520, height: 132, hp: 6, drop: "grenades" }
      ],
      collapsingBridges: [
        { id: "l6-trestle-abyss", startX: 4996, floor: 474, segments: 6, segmentWidth: 54, crumbleMs: 360 }
      ],
      ambient: [
        { x: 680, y: 275, kind: "lantern", color: 0xa855f7 },
        { x: 1940, y: 468, kind: "pennant", color: 0x8b5cf6 },
        { x: 3960, y: 260, kind: "lantern", color: 0xa855f7 },
        { x: 5620, y: 520, kind: "pennant", color: 0xc084fc },
        { x: endX - 1350, y: 520, kind: "pennant", color: 0xc084fc }
      ]
    };
  }

  return {
    drawbridges: [],
    hangingCrates: [],
    towers: [],
    blastGates: [],
    collapsingBridges: [],
    ambient: []
  };
}

interface DrawbridgeState {
  plan: DrawbridgePlan;
  switchSprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  chain: Phaser.GameObjects.Graphics;
  deck: Phaser.GameObjects.Rectangle;
  deckSprite: Phaser.GameObjects.Image | null;
  deckArt: Phaser.GameObjects.Graphics;
  prompt: Phaser.GameObjects.Text;
  released: boolean;
  settled: boolean;
  angle: number;
}

interface HangingCrateState {
  plan: HangingCratePlan;
  switchSprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  crate: Phaser.GameObjects.Image;
  chain: Phaser.GameObjects.Graphics;
  prompt: Phaser.GameObjects.Text;
  state: "hanging" | "falling" | "smashed";
  vy: number;
  swayPhase: number;
}

interface TowerState {
  plan: DestructibleTowerPlan;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  flashUntil: number;
  hitTarget: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  roofDeck: Phaser.GameObjects.Rectangle;
  sprite: Phaser.GameObjects.Image | null;
  hpBar: Phaser.GameObjects.Graphics;
}

interface BlastGateState {
  plan: BlastGatePlan;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  flashUntil: number;
  hitTarget: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  blocker: Phaser.GameObjects.Rectangle;
  sprite: Phaser.GameObjects.Image | null;
  hpBar: Phaser.GameObjects.Graphics;
  prompt: Phaser.GameObjects.Text;
}

interface CollapsingSegmentState {
  x: number;
  y: number;
  w: number;
  h: number;
  crumbleMs: number;
  state: "intact" | "shaking" | "falling" | "gone";
  timer: number;
  fallY: number;
  vy: number;
  rot: number;
  collider: Phaser.GameObjects.Rectangle;
  sprite: Phaser.GameObjects.Image | null;
  gfx: Phaser.GameObjects.Graphics | null;
}

interface AmbientState {
  plan: AmbientBannerPlan;
  sprite: Phaser.GameObjects.Image | null;
  chainGfx: Phaser.GameObjects.Graphics | null;
  phase: number;
}

interface SetPieceHost {
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  enemies: Phaser.Physics.Arcade.Group;
  cameraMotion: () => boolean;
  onDamageEnemy: (enemy: Phaser.Physics.Arcade.Sprite, damage: number, isBlast: boolean) => boolean;
  onGrantScore: (points: number) => void;
  onSpawnDrop: (x: number, y: number, kind: BattlefieldDropKind) => void;
  onPopupCallout: (x: number, y: number, text: string, color: string) => void;
  onTriggerHitStop: (ms: number) => void;
}

function ensureFallbackSetPieceTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists("ms_winch_switch")) {
    const g = scene.add.graphics();
    g.fillStyle(0x262133).fillCircle(28, 28, 24).fillStyle(0xe63946).fillCircle(28, 28, 19);
    g.generateTexture("ms_winch_switch", 56, 56);
    g.destroy();
  }
  if (!scene.textures.exists("ms_crush_crate")) {
    const g = scene.add.graphics();
    g.fillStyle(0x6d5846).fillRoundedRect(4, 10, 80, 74, 8);
    g.generateTexture("ms_crush_crate", 88, 88);
    g.destroy();
  }
  if (!scene.textures.exists("ms_hit_proxy")) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.001).fillRect(0, 0, 16, 16);
    g.generateTexture("ms_hit_proxy", 16, 16);
    g.destroy();
  }
}

export class InteractiveSetPiecesRuntime {
  private switchGroup: Phaser.Physics.Arcade.StaticGroup;
  private bridgeColliders: Phaser.Physics.Arcade.StaticGroup;
  private oneWayColliders: Phaser.Physics.Arcade.StaticGroup;
  private solidWallColliders: Phaser.Physics.Arcade.StaticGroup;
  private drawbridges: DrawbridgeState[] = [];
  private hangingCrates: HangingCrateState[] = [];
  private towers: TowerState[] = [];
  private blastGates: BlastGateState[] = [];
  private collapsingSegments: CollapsingSegmentState[] = [];
  private ambient: AmbientState[] = [];
  private reducedMotion: MediaQueryList;
  private bridgesDropped = 0;
  private cratesDropped = 0;
  private towersDestroyed = 0;
  private gatesBreached = 0;
  private planksCollapsed = 0;
  private level: number;
  private themeTint: number;

  constructor(
    private scene: Phaser.Scene,
    level: number,
    endX: number,
    private host: SetPieceHost
  ) {
    ensureFallbackSetPieceTextures(scene);
    this.level = level;
    this.themeTint =
      level === 2 ? 0xc2d8e4 : level === 3 ? 0xf7c5a8 : level === 4 ? 0xc8e0cc : level === 6 ? 0xc9b8f2 : 0xffffff;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.switchGroup = scene.physics.add.staticGroup();
    this.bridgeColliders = scene.physics.add.staticGroup();
    this.oneWayColliders = scene.physics.add.staticGroup();
    this.solidWallColliders = scene.physics.add.staticGroup();

    const plans = setPiecesForLevel(level, endX);
    for (const plan of plans.drawbridges) this.addDrawbridge(plan);
    for (const plan of plans.hangingCrates) this.addHangingCrate(plan);
    for (const plan of plans.towers) this.addTower(plan);
    for (const plan of plans.blastGates) this.addBlastGate(plan);
    for (const plan of plans.collapsingBridges) this.addCollapsingBridge(plan);
    for (const [i, plan] of plans.ambient.entries()) this.addAmbient(plan, i * 1.3);

    scene.physics.add.collider(host.player, this.bridgeColliders);
    scene.physics.add.collider(host.enemies, this.bridgeColliders);

    const oneWayCheck: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (actor, deck) => {
      const rider = (actor as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body | undefined;
      const surface = (deck as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody | undefined;
      if (!rider || !surface || !surface.enable) return false;
      return rider.velocity.y >= -20 && rider.prev.y + rider.height <= surface.top + 10;
    };
    scene.physics.add.collider(host.player, this.oneWayColliders, undefined, oneWayCheck);
    scene.physics.add.collider(host.enemies, this.oneWayColliders, undefined, oneWayCheck);

    scene.physics.add.collider(host.player, this.solidWallColliders);
    scene.physics.add.collider(host.enemies, this.solidWallColliders);
  }

  get targetSwitchGroup() {
    return this.switchGroup;
  }

  private resolveTexture(baseKey: string): { key: string; themed: boolean } | null {
    const themedKey = `${baseKey}_l${this.level}`;
    if (this.scene.textures.exists(themedKey)) return { key: themedKey, themed: true };
    if (this.scene.textures.exists(baseKey)) return { key: baseKey, themed: false };
    return null;
  }

  private applyBiomeTint(sprite: Phaser.GameObjects.Image, themed: boolean) {
    if (!themed && this.themeTint !== 0xffffff) sprite.setTint(this.themeTint);
    else sprite.clearTint();
  }

  isStandingOnSetPiece(body: Phaser.Physics.Arcade.Body): boolean {
    if (body.velocity.y < -20) return false;
    for (const b of this.drawbridges) {
      if (!b.settled) continue;
      const s = b.deck.body as Phaser.Physics.Arcade.StaticBody;
      if (s.enable && body.right > s.left + 2 && body.left < s.right - 2 && Math.abs(body.bottom - s.top) <= 4) {
        return true;
      }
    }
    for (const t of this.towers) {
      if (t.destroyed) continue;
      const s = t.roofDeck.body as Phaser.Physics.Arcade.StaticBody;
      if (s.enable && body.right > s.left + 2 && body.left < s.right - 2 && Math.abs(body.bottom - s.top) <= 4) {
        return true;
      }
    }
    for (const seg of this.collapsingSegments) {
      const s = seg.collider.body as Phaser.Physics.Arcade.StaticBody;
      if (s.enable && body.right > s.left + 2 && body.left < s.right - 2 && Math.abs(body.bottom - s.top) <= 4) {
        return true;
      }
    }
    return false;
  }

  private addDrawbridge(plan: DrawbridgePlan) {
    const switchSprite = this.switchGroup.create(
      plan.switchX,
      plan.switchY,
      "ms_winch_switch"
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    switchSprite.setDisplaySize(54, 54).setDepth(16).setData("setPieceKind", "drawbridge").setData("setPieceId", plan.id);
    (switchSprite.body as Phaser.Physics.Arcade.StaticBody).setSize(60, 60, true);
    switchSprite.refreshBody();

    const chain = this.scene.add.graphics().setDepth(10);
    const deckArt = this.scene.add.graphics().setDepth(12);
    const deckSprite = this.scene.textures.exists("ms_drawbridge_deck")
      ? this.scene.add
          .image(plan.bridgeX, plan.floor + 8, "ms_drawbridge_deck")
          .setOrigin(0.06, 0.36)
          .setDisplaySize(plan.width + 16, 36)
          .setDepth(12)
      : null;

    const deck = this.scene.add.rectangle(plan.bridgeX + plan.width / 2, plan.floor + 14, plan.width, 28, 0x000000, 0);
    this.scene.physics.add.existing(deck, true);
    (deck.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.bridgeColliders.add(deck);

    const prompt = this.scene.add
      .text(plan.switchX, plan.switchY - 40, "SHOOT!", {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "19px",
        color: "#ffe46b",
        stroke: "#181326",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(18)
      .setVisible(false);

    const entry: DrawbridgeState = {
      plan,
      switchSprite,
      chain,
      deck,
      deckSprite,
      deckArt,
      prompt,
      released: false,
      settled: false,
      angle: -Math.PI * 0.44
    };
    this.drawbridges.push(entry);
    this.renderDrawbridge(entry);
  }

  private addHangingCrate(plan: HangingCratePlan) {
    const switchSprite = this.switchGroup.create(
      plan.x,
      plan.hangY - 56,
      "ms_winch_switch"
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    switchSprite.setDisplaySize(48, 48).setDepth(16).setData("setPieceKind", "hanging_crate").setData("setPieceId", plan.id);
    switchSprite.refreshBody();
    const sBody = switchSprite.body as Phaser.Physics.Arcade.StaticBody;
    sBody.setSize(76, 112, true);
    sBody.updateFromGameObject();
    sBody.setSize(76, 112, true);
    sBody.position.set(plan.x - 38, plan.hangY - 82);
    sBody.updateCenter();

    const crate = this.scene.add.image(plan.x, plan.hangY, "ms_crush_crate").setDisplaySize(86, 86).setDepth(15);
    const chain = this.scene.add.graphics().setDepth(11);
    const prompt = this.scene.add
      .text(plan.x, plan.hangY - 94, "AIM UP [W]!", {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "18px",
        color: "#a7f3d0",
        stroke: "#181326",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(18)
      .setVisible(false);

    this.hangingCrates.push({
      plan,
      switchSprite,
      crate,
      chain,
      prompt,
      state: "hanging",
      vy: 0,
      swayPhase: Math.random() * Math.PI * 2
    });
  }

  private addTower(plan: DestructibleTowerPlan) {
    const width = 122;
    const height = plan.height ?? 156;
    const maxHp = plan.hp ?? 5;
    const hitTarget = this.switchGroup.create(
      plan.x,
      plan.floor - height * 0.46,
      "ms_hit_proxy"
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    hitTarget
      .setDisplaySize(width - 16, height - 14)
      .setAlpha(0)
      .setData("setPieceKind", "tower")
      .setData("setPieceId", plan.id);
    hitTarget.refreshBody();
    const tBody = hitTarget.body as Phaser.Physics.Arcade.StaticBody;
    tBody.setSize(width - 16, height - 14, false);
    tBody.position.set(plan.x - (width - 16) / 2, plan.floor - height + 10);
    tBody.updateCenter();

    // Solid walkable upper watchtower platform aligned with the drawn wooden roof deck
    const roofY = plan.floor - height;
    const roofDeck = this.scene.add.rectangle(plan.x, roofY + 14, width + 10, 22, 0x000000, 0);
    this.scene.physics.add.existing(roofDeck, true);
    this.oneWayColliders.add(roofDeck);

    const towerTex = this.resolveTexture("ms_watchtower");
    const sprite = towerTex
      ? this.scene.add
          .image(plan.x, plan.floor + 2, towerTex.key)
          .setOrigin(0.5, 1)
          .setDisplaySize(width + 18, height + 26)
          .setDepth(7)
      : null;
    if (sprite && towerTex) this.applyBiomeTint(sprite, towerTex.themed);
    const hpBar = this.scene.add.graphics().setDepth(14);
    const state: TowerState = {
      plan,
      width,
      height,
      hp: maxHp,
      maxHp,
      destroyed: false,
      flashUntil: 0,
      hitTarget,
      roofDeck,
      sprite,
      hpBar
    };
    this.towers.push(state);
    this.renderTower(state, 0);
  }

  private addBlastGate(plan: BlastGatePlan) {
    const width = 52;
    const height = plan.height ?? 130;
    const maxHp = plan.hp ?? 5;

    const hitTarget = this.switchGroup.create(
      plan.x,
      plan.floor - height / 2,
      "ms_hit_proxy"
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    hitTarget
      .setDisplaySize(width + 20, height)
      .setAlpha(0)
      .setData("setPieceKind", "blast_gate")
      .setData("setPieceId", plan.id);
    hitTarget.refreshBody();
    const gBody = hitTarget.body as Phaser.Physics.Arcade.StaticBody;
    gBody.setSize(width + 20, height, false);
    gBody.position.set(plan.x - (width + 20) / 2, plan.floor - height);
    gBody.updateCenter();

    const blocker = this.scene.add.rectangle(plan.x, plan.floor - height / 2, width, height, 0x000000, 0);
    this.scene.physics.add.existing(blocker, true);
    this.solidWallColliders.add(blocker);

    const gateTex = this.resolveTexture("ms_blast_gate");
    const sprite = gateTex
      ? this.scene.add
          .image(plan.x, plan.floor + 2, gateTex.key)
          .setOrigin(0.5, 1)
          .setDisplaySize(width + 26, height + 24)
          .setDepth(13)
      : null;
    if (sprite && gateTex) this.applyBiomeTint(sprite, gateTex.themed);
    const hpBar = this.scene.add.graphics().setDepth(15);
    const prompt = this.scene.add
      .text(plan.x, plan.floor - height - 30, "BLAST GATE!", {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "18px",
        color: "#fca5a5",
        stroke: "#181326",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(18)
      .setVisible(false);

    const state: BlastGateState = {
      plan,
      width,
      height,
      hp: maxHp,
      maxHp,
      destroyed: false,
      flashUntil: 0,
      hitTarget,
      blocker,
      sprite,
      hpBar,
      prompt
    };
    this.blastGates.push(state);
    this.renderBlastGate(state, 0);
  }

  private addCollapsingBridge(plan: CollapsingBridgePlan) {
    const segW = plan.segmentWidth ?? 54;
    const crumbleMs = plan.crumbleMs ?? 360;
    const trestleTex = this.resolveTexture("ms_trestle_plank");
    for (let i = 0; i < plan.segments; i++) {
      const sx = plan.startX + i * segW;
      const collider = this.scene.add.rectangle(sx + segW / 2, plan.floor + 12, segW - 2, 24, 0x000000, 0);
      this.scene.physics.add.existing(collider, true);
      this.oneWayColliders.add(collider);

      const sprite = trestleTex
        ? this.scene.add
            .image(sx + segW / 2, plan.floor - 2, trestleTex.key)
            .setOrigin(0.5, 0)
            .setDisplaySize(segW + 4, 152)
            .setDepth(11)
        : null;
      if (sprite && trestleTex) this.applyBiomeTint(sprite, trestleTex.themed);
      const gfx = trestleTex ? null : this.scene.add.graphics().setDepth(11);

      const seg: CollapsingSegmentState = {
        x: sx,
        y: plan.floor,
        w: segW,
        h: 24,
        crumbleMs,
        state: "intact",
        timer: 0,
        fallY: 0,
        vy: 0,
        rot: 0,
        collider,
        sprite,
        gfx
      };
      this.collapsingSegments.push(seg);
      this.renderCollapsingSegment(seg, 0);
    }
  }

  private addAmbient(plan: AmbientBannerPlan, phase: number) {
    if (plan.kind === "lantern" && this.scene.textures.exists("ms_lantern")) {
      const chainGfx = this.scene.add.graphics().setDepth(5.8);
      const sprite = this.scene.add
        .image(plan.x, plan.y, "ms_lantern")
        .setOrigin(0.5, 0.14)
        .setDisplaySize(46, 58)
        .setDepth(6);
      this.ambient.push({ plan, sprite, chainGfx, phase });
    } else if (plan.kind === "pennant" && this.scene.textures.exists("ms_pennant")) {
      const sprite = this.scene.add
        .image(plan.x, plan.y + 2, "ms_pennant")
        .setOrigin(0.14, 1)
        .setDisplaySize(90, 118)
        .setDepth(9);
      if (plan.color !== 0xe63946) sprite.setTint(plan.color);
      this.ambient.push({ plan, sprite, chainGfx: null, phase });
    } else {
      const chainGfx = this.scene.add.graphics().setDepth(plan.kind === "lantern" ? 6 : 9);
      this.ambient.push({ plan, sprite: null, chainGfx, phase });
    }
  }

  hitSwitch(target: Phaser.GameObjects.GameObject, damage = 1): boolean {
    const kind = target.getData("setPieceKind") as string | undefined;
    const id = target.getData("setPieceId") as string | undefined;
    if (!kind || !id) return false;
    if (kind === "drawbridge") {
      const entry = this.drawbridges.find((b) => b.plan.id === id && !b.released);
      if (!entry) return false;
      this.releaseDrawbridge(entry);
      return true;
    }
    if (kind === "hanging_crate") {
      const entry = this.hangingCrates.find((c) => c.plan.id === id && c.state === "hanging");
      if (!entry) return false;
      this.releaseHangingCrate(entry);
      return true;
    }
    if (kind === "tower") {
      const entry = this.towers.find((t) => t.plan.id === id && !t.destroyed);
      if (!entry) return false;
      this.damageTower(entry, damage);
      return true;
    }
    if (kind === "blast_gate") {
      const entry = this.blastGates.find((g) => g.plan.id === id && !g.destroyed);
      if (!entry) return false;
      this.damageBlastGate(entry, damage);
      return true;
    }
    return false;
  }

  hitSwitchesInRect(rect: Phaser.Geom.Rectangle, damage = 2): boolean {
    let hit = false;
    for (const child of [...this.switchGroup.getChildren()]) {
      const sprite = child as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      if (!sprite.active) continue;
      const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
      if (Phaser.Geom.Rectangle.Overlaps(rect, new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height))) {
        if (this.hitSwitch(sprite, damage)) hit = true;
      }
    }
    return hit;
  }

  damageStructuresInRadius(cx: number, cy: number, radius: number, damage: number) {
    for (const t of this.towers) {
      if (t.destroyed) continue;
      if (Math.hypot(t.plan.x - cx, t.plan.floor - t.height / 2 - cy) <= radius + 54) {
        this.damageTower(t, damage);
      }
    }
    for (const g of this.blastGates) {
      if (g.destroyed) continue;
      if (Math.hypot(g.plan.x - cx, g.plan.floor - g.height / 2 - cy) <= radius + 42) {
        this.damageBlastGate(g, damage);
      }
    }
  }

  resetOnRespawn() {
    for (const seg of this.collapsingSegments) {
      seg.state = "intact";
      seg.timer = 0;
      seg.fallY = 0;
      seg.vy = 0;
      seg.rot = 0;
      (seg.collider.body as Phaser.Physics.Arcade.StaticBody).enable = true;
      seg.sprite?.setVisible(true).setAlpha(1).setAngle(0).clearTint();
      this.renderCollapsingSegment(seg, 0);
    }
  }

  private damageTower(entry: TowerState, damage: number) {
    entry.hp = Math.max(0, entry.hp - damage);
    entry.flashUntil = this.scene.time.now + 115;
    this.spawnSparks(entry.plan.x, entry.plan.floor - entry.height * 0.45, 0xd4a373, 6);
    playSfx("swordHit", { volume: 0.55, pitch: 0.85 });

    if (entry.sprite && !entry.destroyed) {
      this.scene.tweens.add({
        targets: entry.sprite,
        x: entry.plan.x + 5,
        duration: 40,
        yoyo: true,
        repeat: 1,
        onComplete: () => entry.sprite?.setX(entry.plan.x)
      });
    }

    if (entry.hp <= 0) {
      entry.destroyed = true;
      this.towersDestroyed += 1;
      entry.hitTarget.destroy();
      (entry.roofDeck.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      if (entry.sprite) {
        if (this.scene.textures.exists("ms_watchtower_rubble")) {
          entry.sprite
            .setTexture("ms_watchtower_rubble")
            .clearTint()
            .setOrigin(0.5, 1)
            .setPosition(entry.plan.x, entry.plan.floor + 4)
            .setDisplaySize(166, 74);
        } else {
          entry.sprite.setVisible(false);
        }
      }
      this.renderTower(entry, this.scene.time.now);

      const cx = entry.plan.x;
      const cy = entry.plan.floor - entry.height * 0.5;
      playSfx("explosion", { volume: 0.85, pitch: 0.68 });
      this.host.onTriggerHitStop(60);
      if (this.host.cameraMotion() && !this.reducedMotion.matches) {
        this.scene.cameras.main.shake(210, 0.0095);
      }
      this.spawnDebrisPlanks(cx, cy, 0x8b5a34, 12);
      this.spawnSparks(cx, cy, 0xffb703, 14);

      const blast = this.scene.add
        .circle(cx, entry.plan.floor - 48, 36, 0xff9f1c, 0.72)
        .setStrokeStyle(5, 0xfff3b0, 0.95)
        .setDepth(25);
      this.scene.tweens.add({
        targets: blast,
        scale: 3.1,
        alpha: 0,
        duration: 300,
        ease: "quad.out",
        onComplete: () => blast.destroy()
      });

      for (const child of [...this.host.enemies.getChildren()]) {
        const enemy = child as Phaser.Physics.Arcade.Sprite;
        if (!enemy.active || Number(enemy.getData("hp")) <= 0) continue;
        const eBody = enemy.body as Phaser.Physics.Arcade.Body;
        if (Math.abs(eBody.center.x - cx) < 155 && eBody.bottom <= entry.plan.floor + 24 && eBody.bottom >= entry.plan.floor - entry.height - 90) {
          this.host.onDamageEnemy(enemy, 10, true);
        }
      }

      this.host.onGrantScore(350);
      this.host.onPopupCallout(cx, entry.plan.floor - entry.height - 10, "TOWER DOWN! +350", "#ff9f1c");
      this.host.onSpawnDrop(cx, entry.plan.floor - 32, entry.plan.drop ?? "medal");
    } else {
      this.renderTower(entry, this.scene.time.now);
    }
  }

  private damageBlastGate(entry: BlastGateState, damage: number) {
    entry.hp = Math.max(0, entry.hp - damage);
    entry.flashUntil = this.scene.time.now + 115;
    this.spawnSparks(entry.plan.x, entry.plan.floor - entry.height * 0.5, 0xffd166, 7);
    playSfx("swordHit", { volume: 0.6, pitch: 1.15 });

    if (entry.sprite && !entry.destroyed) {
      this.scene.tweens.add({
        targets: entry.sprite,
        x: entry.plan.x + 4,
        duration: 35,
        yoyo: true,
        repeat: 1,
        onComplete: () => entry.sprite?.setX(entry.plan.x)
      });
    }

    if (entry.hp <= 0) {
      entry.destroyed = true;
      this.gatesBreached += 1;
      entry.hitTarget.destroy();
      entry.prompt.destroy();
      (entry.blocker.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      if (entry.sprite) {
        if (this.scene.textures.exists("ms_blast_gate_broken")) {
          entry.sprite
            .setTexture("ms_blast_gate_broken")
            .clearTint()
            .setOrigin(0.5, 1)
            .setPosition(entry.plan.x, entry.plan.floor + 3)
            .setDisplaySize(108, 44);
        } else {
          entry.sprite.setVisible(false);
        }
      }
      this.renderBlastGate(entry, this.scene.time.now);

      const cx = entry.plan.x;
      const cy = entry.plan.floor - entry.height * 0.5;
      playSfx("explosion", { volume: 0.82, pitch: 0.82 });
      this.host.onTriggerHitStop(50);
      if (this.host.cameraMotion() && !this.reducedMotion.matches) {
        this.scene.cameras.main.shake(170, 0.008);
      }
      this.spawnDebrisPlanks(cx, cy, 0x64748b, 10);
      this.spawnSparks(cx, cy, 0xffe066, 12);
      this.host.onGrantScore(250);
      this.host.onPopupCallout(cx, entry.plan.floor - entry.height - 8, "BREACHED! +250", "#ffe066");
      if (entry.plan.drop) {
        this.host.onSpawnDrop(cx, entry.plan.floor - 28, entry.plan.drop);
      }
    } else {
      this.renderBlastGate(entry, this.scene.time.now);
    }
  }

  private releaseDrawbridge(entry: DrawbridgeState) {
    entry.released = true;
    this.bridgesDropped += 1;
    const sx = entry.switchSprite.x;
    const sy = entry.switchSprite.y;
    entry.switchSprite.destroy();
    entry.prompt.destroy();
    this.spawnSparks(sx, sy, 0xffe066, 9);
    playSfx("explosion", { volume: 0.52, pitch: 1.35 });
    this.host.onGrantScore(200);
    this.host.onPopupCallout(sx, sy - 10, "BRIDGE RELEASED! +200", "#ffe066");

    this.scene.tweens.add({
      targets: entry,
      angle: 0,
      duration: 420,
      ease: "bounce.out",
      onUpdate: () => this.renderDrawbridge(entry),
      onComplete: () => {
        entry.settled = true;
        (entry.deck.body as Phaser.Physics.Arcade.StaticBody).enable = true;
        this.renderDrawbridge(entry);
        playSfx("landing", { volume: 0.75, pitch: 0.65 });
        this.spawnSparks(entry.plan.bridgeX + entry.plan.width - 10, entry.plan.floor, 0xe2e8f0, 8);
        if (this.host.cameraMotion() && !this.reducedMotion.matches) {
          this.scene.cameras.main.shake(120, 0.005);
        }
      }
    });
  }

  private releaseHangingCrate(entry: HangingCrateState) {
    entry.state = "falling";
    entry.vy = 180;
    this.cratesDropped += 1;
    const sx = entry.switchSprite.x;
    const sy = entry.switchSprite.y;
    entry.switchSprite.destroy();
    entry.prompt.destroy();
    entry.chain.clear();
    this.spawnSparks(sx, sy, 0xffd166, 8);
    playSfx("swordHit", { volume: 0.6, pitch: 1.4 });
  }

  private renderTower(entry: TowerState, now: number) {
    const g = entry.hpBar;
    g.clear();
    if (entry.destroyed) return;
    if (entry.sprite) {
      if (now < entry.flashUntil) entry.sprite.setTint(0xfff3b0);
      else entry.sprite.clearTint();
    }
    if (entry.hp < entry.maxHp) {
      const ratio = entry.hp / entry.maxHp;
      const roofY = entry.plan.floor - entry.height;
      g.fillStyle(0x181326, 0.9).fillRoundedRect(entry.plan.x - 32, roofY - 28, 64, 9, 4);
      g.fillStyle(ratio > 0.4 ? 0xffb703 : 0xef4444).fillRoundedRect(entry.plan.x - 30, roofY - 26, 60 * ratio, 5, 3);
    }
  }

  private renderBlastGate(entry: BlastGateState, now: number) {
    const g = entry.hpBar;
    g.clear();
    if (entry.destroyed) return;
    if (entry.sprite) {
      if (now < entry.flashUntil) entry.sprite.setTint(0xfff3b0);
      else entry.sprite.clearTint();
    }
    const top = entry.plan.floor - entry.height;
    // Soft pulsing red beacon halo over the drawn siren dome
    const pulse = 0.25 + (Math.sin(now / 180) * 0.5 + 0.5) * 0.4;
    g.fillStyle(0xff4d4f, pulse).fillCircle(entry.plan.x, top - 8, 16);
    if (entry.hp < entry.maxHp) {
      const ratio = entry.hp / entry.maxHp;
      g.fillStyle(0x181326, 0.9).fillRoundedRect(entry.plan.x - 26, top - 28, 52, 8, 4);
      g.fillStyle(0xef4444).fillRoundedRect(entry.plan.x - 24, top - 26, 48 * ratio, 4, 2);
    }
  }

  private renderCollapsingSegment(seg: CollapsingSegmentState, now: number) {
    if (seg.sprite) {
      if (seg.state === "gone") {
        seg.sprite.setVisible(false);
        return;
      }
      const shakeX = seg.state === "shaking" ? Math.sin(now * 0.09) * 3.5 : 0;
      const alpha = seg.state === "falling" ? Math.max(0, 1 - seg.fallY / 210) : 1;
      seg.sprite
        .setVisible(true)
        .setPosition(seg.x + seg.w / 2 + shakeX, seg.y - 2 + seg.fallY)
        .setAlpha(alpha)
        .setAngle(seg.rot);
      if (seg.state === "shaking") seg.sprite.setTint(0xffcf6e);
      else seg.sprite.clearTint();
      return;
    }
    const g = seg.gfx;
    if (!g) return;
    g.clear();
    if (seg.state === "gone") return;
    const shakeX = seg.state === "shaking" ? Math.sin(now * 0.09) * 3.5 : 0;
    const sx = seg.x + shakeX;
    const sy = seg.y + seg.fallY;
    const alpha = seg.state === "falling" ? Math.max(0, 1 - seg.fallY / 210) : 1;
    g.fillStyle(seg.state === "shaking" ? 0xf59e0b : 0x945c36, alpha).fillRoundedRect(sx + 1, sy, seg.w - 2, seg.h, 4);
    g.lineStyle(3, 0x1c1628, alpha).strokeRoundedRect(sx + 1, sy, seg.w - 2, seg.h, 4);
  }

  private renderDrawbridge(entry: DrawbridgeState) {
    const { bridgeX, width, floor } = entry.plan;
    const cos = Math.cos(entry.angle);
    const sin = Math.sin(entry.angle);
    const tipX = bridgeX + cos * width;
    const tipY = floor + sin * width;

    if (entry.deckSprite) {
      entry.deckSprite.setPosition(bridgeX, floor + 8).setRotation(entry.angle);
      entry.deckArt.clear();
    } else {
      const g = entry.deckArt;
      g.clear();
      const thick = 24;
      const p0 = { x: bridgeX, y: floor };
      const p1 = { x: tipX, y: tipY };
      const p2 = { x: p1.x - sin * thick, y: p1.y + cos * thick };
      const p3 = { x: p0.x - sin * thick, y: p0.y + cos * thick };
      g.fillStyle(0x8c5a34).fillPoints([p0, p1, p2, p3], true);
      g.lineStyle(4, 0x1e1828).strokePoints([p0, p1, p2, p3], true);
    }

    entry.chain.clear();
    if (!entry.released) {
      entry.chain.lineStyle(4, 0x262133, 0.95);
      entry.chain.lineBetween(entry.plan.switchX, entry.plan.switchY + 18, tipX, tipY);
      entry.chain.lineStyle(2, 0xcbd5e1, 0.75);
      entry.chain.lineBetween(entry.plan.switchX, 0, entry.plan.switchX, entry.plan.switchY - 18);
    }
  }

  private spawnSparks(x: number, y: number, color: number, count: number) {
    if (this.reducedMotion.matches) return;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = Phaser.Math.Between(24, 78);
      const spark = this.scene.add.rectangle(x, y, 9, 4, color).setRotation(a).setDepth(26);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: 0,
        duration: 240,
        ease: "quad.out",
        onComplete: () => spark.destroy()
      });
    }
  }

  private spawnDebrisPlanks(x: number, y: number, color: number, count: number) {
    if (this.reducedMotion.matches) return;
    for (let i = 0; i < count; i++) {
      const dx = Phaser.Math.Between(-130, 130);
      const dy = Phaser.Math.Between(-145, -35);
      const plank = this.scene.add
        .rectangle(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-28, 28), Phaser.Math.Between(16, 30), 8, color)
        .setStrokeStyle(2, 0x181326)
        .setDepth(25);
      this.scene.tweens.add({
        targets: plank,
        x: plank.x + dx,
        y: plank.y + dy + 170,
        angle: Phaser.Math.Between(-320, 320),
        alpha: 0,
        duration: Phaser.Math.Between(420, 620),
        ease: "quad.in",
        onComplete: () => plank.destroy()
      });
    }
  }

  update(delta: number, now: number) {
    const dt = delta / 1000;
    const px = this.host.player.x;
    const pBody = this.host.player.body as Phaser.Physics.Arcade.Body;

    for (const entry of this.drawbridges) {
      if (entry.released) continue;
      const near = Math.abs(px - entry.plan.switchX) < 440;
      entry.prompt.setVisible(near);
      if (near) entry.prompt.setY(entry.plan.switchY - 40 + Math.sin(now / 180) * 4);
    }

    for (const t of this.towers) {
      if (!t.destroyed && t.flashUntil > 0 && now >= t.flashUntil) {
        t.flashUntil = 0;
        this.renderTower(t, now);
      }
    }

    for (const g of this.blastGates) {
      if (g.destroyed) continue;
      const near = Math.abs(px - g.plan.x) < 440;
      g.prompt.setVisible(near);
      if (near) g.prompt.setY(g.plan.floor - g.height - 30 + Math.sin(now / 190) * 3);
      if (Math.abs(px - g.plan.x) < 820) this.renderBlastGate(g, now);
    }

    for (const seg of this.collapsingSegments) {
      if (seg.state === "intact") {
        const standing =
          pBody.velocity.y >= -20 &&
          pBody.right > seg.x + 4 &&
          pBody.left < seg.x + seg.w - 4 &&
          Math.abs(pBody.bottom - seg.y) <= 6;
        if (standing) {
          seg.state = "shaking";
          seg.timer = 0;
          playSfx("landing", { volume: 0.45, pitch: 1.25 });
        }
      } else if (seg.state === "shaking") {
        seg.timer += delta;
        this.renderCollapsingSegment(seg, now);
        if (seg.timer >= seg.crumbleMs) {
          seg.state = "falling";
          seg.vy = 110;
          this.planksCollapsed += 1;
          (seg.collider.body as Phaser.Physics.Arcade.StaticBody).enable = false;
          this.spawnSparks(seg.x + seg.w / 2, seg.y + 10, 0xb97b4c, 5);
        }
      } else if (seg.state === "falling") {
        seg.vy = Math.min(920, seg.vy + 1450 * dt);
        seg.fallY += seg.vy * dt;
        seg.rot += 42 * dt;
        this.renderCollapsingSegment(seg, now);
        if (seg.fallY > 220) {
          seg.state = "gone";
          seg.sprite?.setVisible(false);
          seg.gfx?.clear();
        }
      }
    }

    for (const entry of this.hangingCrates) {
      if (entry.state === "hanging") {
        const sway = this.reducedMotion.matches ? 0 : Math.sin(now / 420 + entry.swayPhase) * 6;
        entry.crate.setPosition(entry.plan.x + sway, entry.plan.hangY).setAngle(sway * 0.55);
        entry.chain.clear();
        entry.chain.lineStyle(4, 0x262133, 0.95);
        entry.chain.lineBetween(entry.plan.x, 0, entry.plan.x, entry.plan.hangY - 56);
        entry.chain.lineBetween(entry.plan.x, entry.plan.hangY - 40, entry.crate.x, entry.crate.y - 38);
        const near = Math.abs(px - entry.plan.x) < 440;
        entry.prompt.setVisible(near);
        if (near) entry.prompt.setY(entry.plan.hangY - 94 + Math.sin(now / 180) * 4);
      } else if (entry.state === "falling") {
        entry.vy = Math.min(1150, entry.vy + 1650 * dt);
        entry.crate.y += entry.vy * dt;
        entry.crate.setAngle(entry.crate.angle + 1.4);

        const crateRect = new Phaser.Geom.Rectangle(entry.crate.x - 46, entry.crate.y - 44, 92, 88);
        let crushed = 0;
        for (const child of [...this.host.enemies.getChildren()]) {
          const enemy = child as Phaser.Physics.Arcade.Sprite;
          if (!enemy.active || Number(enemy.getData("hp")) <= 0) continue;
          const eBody = enemy.body as Phaser.Physics.Arcade.Body;
          if (Phaser.Geom.Rectangle.Overlaps(crateRect, new Phaser.Geom.Rectangle(eBody.x, eBody.y, eBody.width, eBody.height))) {
            if (this.host.onDamageEnemy(enemy, 12, true)) crushed += 1;
          }
        }
        if (crushed > 0) {
          this.host.onGrantScore(crushed * 250);
          this.host.onPopupCallout(entry.crate.x, entry.crate.y - 26, `CRUSHED x${crushed}!`, "#ff9f1c");
        }

        if (entry.crate.y + 42 >= entry.plan.floor) {
          entry.state = "smashed";
          const impactX = entry.crate.x;
          const impactY = entry.plan.floor - 16;
          entry.crate.destroy();
          playSfx("explosion", { volume: 0.78, pitch: 0.72 });
          this.host.onTriggerHitStop(50);
          if (this.host.cameraMotion() && !this.reducedMotion.matches) {
            this.scene.cameras.main.shake(175, 0.0085);
          }
          const ring = this.scene.add
            .ellipse(impactX, entry.plan.floor - 8, 90, 26, 0xffd166, 0.7)
            .setStrokeStyle(4, 0xffffff, 0.9)
            .setDepth(24);
          this.scene.tweens.add({
            targets: ring,
            scaleX: 2.8,
            scaleY: 1.8,
            alpha: 0,
            duration: 280,
            ease: "quad.out",
            onComplete: () => ring.destroy()
          });
          this.spawnSparks(impactX, impactY, 0xc9a36a, 12);
          for (const child of [...this.host.enemies.getChildren()]) {
            const enemy = child as Phaser.Physics.Arcade.Sprite;
            if (!enemy.active || Number(enemy.getData("hp")) <= 0) continue;
            const eBody = enemy.body as Phaser.Physics.Arcade.Body;
            if (Math.abs(eBody.center.x - impactX) < 135 && Math.abs(eBody.bottom - entry.plan.floor) < 85) {
              this.host.onDamageEnemy(enemy, 8, true);
            }
          }
          this.host.onSpawnDrop(impactX, impactY - 14, entry.plan.drop ?? "grenades");
        }
      }
    }

    // Animate hand-drawn swaying lanterns & fluttering pennants near camera
    const camLeft = this.scene.cameras.main.scrollX - 180;
    const camRight = camLeft + this.scene.cameras.main.width + 360;
    for (const item of this.ambient) {
      const visible = item.plan.x >= camLeft && item.plan.x <= camRight;
      if (!visible) {
        item.sprite?.setVisible(false);
        item.chainGfx?.setVisible(false);
        continue;
      }
      const sway = this.reducedMotion.matches ? 0 : Math.sin(now / 520 + item.phase);
      if (item.sprite) {
        item.sprite.setVisible(true);
        if (item.plan.kind === "lantern") {
          const lx = item.plan.x + sway * 6;
          item.sprite.setPosition(lx, item.plan.y - 12).setAngle(-sway * 7);
          item.chainGfx?.setVisible(true).clear().lineStyle(3, 0x1e293b, 0.85).lineBetween(item.plan.x, 0, lx, item.plan.y - 6);
        } else {
          // Subtle wind flutter on hand-drawn pennant
          item.sprite.setScale(0.5 + sway * 0.03, 0.49);
        }
      }
    }
  }

  read() {
    return {
      bridgesTotal: this.drawbridges.length,
      bridgesDropped: this.bridgesDropped,
      hangingCratesTotal: this.hangingCrates.length,
      cratesDropped: this.cratesDropped,
      towersTotal: this.towers.length,
      towersDestroyed: this.towersDestroyed,
      blastGatesTotal: this.blastGates.length,
      gatesBreached: this.gatesBreached,
      collapsingPlanksTotal: this.collapsingSegments.length,
      planksCollapsed: this.planksCollapsed
    };
  }

  destroy() {
    for (const b of this.drawbridges) {
      b.chain.destroy();
      b.deckArt.destroy();
      b.deckSprite?.destroy();
      b.prompt.destroy();
    }
    for (const c of this.hangingCrates) {
      c.chain.destroy();
      c.crate.destroy();
      c.prompt.destroy();
    }
    for (const t of this.towers) {
      t.sprite?.destroy();
      t.hpBar.destroy();
    }
    for (const g of this.blastGates) {
      g.sprite?.destroy();
      g.hpBar.destroy();
      g.prompt.destroy();
    }
    for (const seg of this.collapsingSegments) {
      seg.sprite?.destroy();
      seg.gfx?.destroy();
    }
    for (const a of this.ambient) {
      a.sprite?.destroy();
      a.chainGfx?.destroy();
    }
    this.switchGroup.clear(true, true);
    this.bridgeColliders.clear(true, true);
    this.oneWayColliders.clear(true, true);
    this.solidWallColliders.clear(true, true);
    this.drawbridges = [];
    this.hangingCrates = [];
    this.towers = [];
    this.blastGates = [];
    this.collapsingSegments = [];
    this.ambient = [];
  }
}
