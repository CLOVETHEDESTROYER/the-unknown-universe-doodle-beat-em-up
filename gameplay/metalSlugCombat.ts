import Phaser from "phaser";
import { playSfx } from "../audio/gameAudio";
import type { DifficultyMode } from "../types";
import type { GunUpgradeId } from "./gunUpgrades";
import {
  battlefieldPropsForLevel,
  type BattlefieldDropKind,
  type BattlefieldPropKind,
  type BattlefieldPropPlan
} from "./battlefieldLayouts";

export interface AimVector {
  dx: number;
  dy: number;
  angle: number;
  mode: "forward" | "up" | "up-diag" | "down" | "down-diag";
}

/**
 * Resolves Metal Slug style directional aiming from facing + directional holds.
 * Up (W / Up in air) shoots straight up or 45° up-forward while running.
 * Down in air (while firing) shoots straight down or 45° down-forward.
 */
export function resolveAimVector(
  facing: number,
  moveAxis: number,
  aimUp: boolean,
  aimDownInAir: boolean
): AimVector {
  const dir = facing >= 0 ? 1 : -1;
  if (aimUp) {
    if (Math.abs(moveAxis) > 0.2) {
      const angle = dir > 0 ? -Math.PI / 4 : (-3 * Math.PI) / 4;
      return { dx: Math.cos(angle), dy: Math.sin(angle), angle, mode: "up-diag" };
    }
    return { dx: 0, dy: -1, angle: -Math.PI / 2, mode: "up" };
  }
  if (aimDownInAir) {
    if (Math.abs(moveAxis) > 0.2) {
      const angle = dir > 0 ? Math.PI / 4 : (3 * Math.PI) / 4;
      return { dx: Math.cos(angle), dy: Math.sin(angle), angle, mode: "down-diag" };
    }
    return { dx: 0, dy: 1, angle: Math.PI / 2, mode: "down" };
  }
  return { dx: dir, dy: 0, angle: dir > 0 ? 0 : Math.PI, mode: "forward" };
}

export interface DifficultyCombatTuning {
  hpScale: number;
  cadenceScale: number;
  projectileSpeedScale: number;
  noticeBonus: number;
  extraVolley: boolean;
}

export function difficultyCombatTuning(difficulty: DifficultyMode): DifficultyCombatTuning {
  if (difficulty === "X-GOD") {
    return {
      hpScale: 1.45,
      cadenceScale: 0.68,
      projectileSpeedScale: 1.24,
      noticeBonus: 130,
      extraVolley: true
    };
  }
  if (difficulty === "HARD") {
    return {
      hpScale: 1.2,
      cadenceScale: 0.82,
      projectileSpeedScale: 1.12,
      noticeBonus: 70,
      extraVolley: true
    };
  }
  return {
    hpScale: 1.0,
    cadenceScale: 0.92,
    projectileSpeedScale: 1.04,
    noticeBonus: 30,
    extraVolley: false
  };
}

export function loadMetalSlugAssets(loader: Phaser.Loader.LoaderPlugin) {
  loader.image("ms_barrel", "metal-slug-v1/barrel.webp");
  loader.image("ms_barricade", "metal-slug-v1/barricade.webp");
  loader.image("ms_ammo_crate", "metal-slug-v1/ammo-crate.webp");
  loader.image("ms_crush_crate", "metal-slug-v1/crush-crate.webp");
  loader.image("ms_grenade", "metal-slug-v1/grenade.webp");
  loader.image("ms_medkit", "metal-slug-v1/medkit.webp");
  loader.image("ms_bomb_pack", "metal-slug-v1/bomb-pack.webp");
  loader.image("ms_medal", "metal-slug-v1/medal.webp");
  loader.image("ms_winch_switch", "metal-slug-v1/winch-switch.webp");
  loader.image("ms_go_arrow", "metal-slug-v1/go-arrow.webp");
  loader.image("ms_popup_burst", "metal-slug-v1/popup-burst.webp");
  loader.image("ms_watchtower", "metal-slug-v1/watchtower.webp");
  loader.image("ms_watchtower_rubble", "metal-slug-v1/watchtower-rubble.webp");
  loader.image("ms_blast_gate", "metal-slug-v1/blast-gate.webp");
  loader.image("ms_blast_gate_broken", "metal-slug-v1/blast-gate-broken.webp");
  loader.image("ms_lock_gate", "metal-slug-v1/lock-gate.webp");
  loader.image("ms_bunker_facade", "metal-slug-v1/bunker-facade.webp");
  loader.image("ms_cantilever_bracket", "metal-slug-v1/cantilever-bracket.webp");
  loader.image("ms_truss_girder", "metal-slug-v1/truss-girder.webp");
  loader.image("ms_sandbags", "metal-slug-v1/sandbags.webp");
  loader.image("ms_drawbridge_deck", "metal-slug-v1/drawbridge-deck.webp");
  loader.image("ms_trestle_plank", "metal-slug-v1/trestle-plank.webp");
  loader.image("ms_lantern", "metal-slug-v1/lantern.webp");
  loader.image("ms_pennant", "metal-slug-v1/pennant.webp");
}

/** Generate crisp doodle-styled battlefield prop & drop textures once per scene if not preloaded. */
export function ensureBattlefieldTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("ms_barrel")) return;
  const g = scene.add.graphics();

  // 1. Explosive Ink Barrel (64x78)
  g.fillStyle(0x1f1928)
    .fillRoundedRect(6, 4, 52, 70, 9)
    .fillStyle(0xd9383a)
    .fillRoundedRect(10, 8, 44, 62, 7)
    .fillStyle(0xffcb47)
    .fillRect(10, 27, 44, 22)
    .fillStyle(0x21192c);
  // Hazard chevrons
  for (let x = 14; x <= 44; x += 14) {
    g.fillTriangle(x, 49, x + 7, 27, x + 12, 27);
    g.fillTriangle(x, 49, x + 12, 27, x + 5, 49);
  }
  g.lineStyle(3, 0x1a1423)
    .strokeRoundedRect(8, 6, 48, 66, 8)
    .lineBetween(10, 21, 54, 21)
    .lineBetween(10, 56, 54, 56)
    .fillStyle(0xfff1c1)
    .fillRect(14, 11, 6, 46);
  g.generateTexture("ms_barrel", 64, 78);
  g.clear();

  // 2. Destructible Barricade (88x92)
  g.fillStyle(0x221b2b)
    .fillRoundedRect(4, 10, 80, 78, 8)
    .fillStyle(0x9b6b43)
    .fillRoundedRect(8, 14, 72, 70, 6);
  for (let y = 26; y <= 72; y += 16) {
    g.fillStyle(y % 32 === 26 ? 0xb47e4f : 0x875935).fillRect(10, y - 8, 68, 13);
    g.lineStyle(3, 0x221b2b).lineBetween(8, y + 5, 80, y + 5);
  }
  // Cross brace & sandbags at base
  g.lineStyle(6, 0x624024)
    .lineBetween(16, 18, 72, 76)
    .lineBetween(72, 18, 16, 76)
    .lineStyle(3, 0x221b2b)
    .strokeRoundedRect(6, 12, 76, 74, 7);
  g.fillStyle(0xc9b489)
    .fillEllipse(24, 80, 32, 18)
    .fillEllipse(52, 81, 34, 18)
    .fillEllipse(70, 80, 24, 16)
    .lineStyle(2, 0x221b2b)
    .strokeEllipse(24, 80, 32, 18)
    .strokeEllipse(52, 81, 34, 18);
  g.generateTexture("ms_barricade", 88, 92);
  g.clear();

  // 3. Heavy Ammo / Weapon Cache Crate (64x64)
  g.fillStyle(0x1f222e)
    .fillRoundedRect(4, 6, 56, 54, 8)
    .fillStyle(0x4b6e4e)
    .fillRoundedRect(8, 10, 48, 46, 6)
    .lineStyle(3, 0x1f222e)
    .strokeRoundedRect(6, 8, 52, 50, 7)
    .fillStyle(0xffd75e)
    .fillRoundedRect(16, 22, 32, 22, 4)
    .lineStyle(2, 0x1f222e)
    .strokeRoundedRect(16, 22, 32, 22, 4)
    .fillStyle(0x1f222e)
    .fillRect(28, 25, 8, 16)
    .fillRect(21, 30, 22, 6);
  g.generateTexture("ms_ammo_crate", 64, 64);
  g.clear();

  // 4. Ink Grenade (32x32)
  g.fillStyle(0x1b1a26)
    .fillCircle(16, 18, 11)
    .fillStyle(0x3b8a5a)
    .fillCircle(16, 18, 8.5)
    .fillStyle(0xffd452)
    .fillRect(11, 15, 10, 5)
    .fillStyle(0x9fb2c2)
    .fillRect(13, 4, 6, 6)
    .lineStyle(2.5, 0xff6b4a)
    .lineBetween(19, 6, 26, 10);
  g.generateTexture("ms_grenade", 32, 32);
  g.clear();

  // 5. Score Medal Drop (36x36)
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 14 : 6.5;
    return { x: 18 + Math.cos(a) * r, y: 18 + Math.sin(a) * r };
  });
  g.fillStyle(0xffc93c)
    .fillPoints(star, true)
    .lineStyle(2.5, 0x261d10)
    .strokePoints(star, true)
    .fillStyle(0xfff7cc)
    .fillCircle(16, 15, 3);
  g.generateTexture("ms_medal", 36, 36);
  g.clear();

  // 6. Grenade Pack Drop (40x36)
  g.fillStyle(0x1e222e)
    .fillRoundedRect(3, 5, 34, 26, 6)
    .fillStyle(0x3a7d56)
    .fillRoundedRect(6, 8, 28, 20, 4)
    .fillStyle(0xffd75e)
    .fillCircle(14, 18, 4.5)
    .fillCircle(26, 18, 4.5)
    .lineStyle(2, 0x1e222e)
    .strokeRoundedRect(4, 6, 32, 24, 5);
  g.generateTexture("ms_bomb_pack", 40, 36);
  g.clear();

  // 7. Field Medkit Drop (40x36)
  g.fillStyle(0x1f222e)
    .fillRoundedRect(3, 5, 34, 26, 6)
    .fillStyle(0xf8fafc)
    .fillRoundedRect(6, 8, 28, 20, 4)
    .fillStyle(0xef4444)
    .fillRect(17, 11, 6, 14)
    .fillRect(13, 15, 14, 6);
  g.generateTexture("ms_medkit", 40, 36);
  g.clear();

  g.destroy();
}

export function spawnShellCasing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return;
  const shell = scene.add.rectangle(x, y, 7, 3.5, 0xffe07a).setStrokeStyle(1, 0x2b2012).setDepth(21);
  const vx = -facing * Phaser.Math.Between(65, 130);
  const startY = y;
  const dropY = y + Phaser.Math.Between(36, 62);
  scene.tweens.add({
    targets: shell,
    x: x + vx * 0.42,
    angle: -facing * Phaser.Math.Between(240, 520),
    duration: 360,
    ease: "quad.out"
  });
  scene.tweens.add({
    targets: shell,
    y: startY - Phaser.Math.Between(16, 32),
    duration: 130,
    ease: "quad.out",
    onComplete: () => {
      if (!shell.active) return;
      scene.tweens.add({
        targets: shell,
        y: dropY,
        alpha: 0,
        duration: 240,
        ease: "quad.in",
        onComplete: () => shell.destroy()
      });
    }
  });
}

export function playCloseSlashVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: number
) {
  const slash = scene.add.graphics({ x, y }).setDepth(26);
  slash.lineStyle(8, 0xfff7cc, 0.95);
  slash.beginPath();
  slash.arc(
    0,
    0,
    68,
    facing > 0 ? -Math.PI * 0.42 : Math.PI * 0.58,
    facing > 0 ? Math.PI * 0.42 : Math.PI * 1.42,
    false
  );
  slash.strokePath();
  slash.lineStyle(4, 0x67e8f9, 0.9);
  slash.beginPath();
  slash.arc(
    facing * 8,
    0,
    56,
    facing > 0 ? -Math.PI * 0.36 : Math.PI * 0.64,
    facing > 0 ? Math.PI * 0.36 : Math.PI * 1.36,
    false
  );
  slash.strokePath();
  scene.tweens.add({
    targets: slash,
    scaleX: 1.28,
    scaleY: 1.15,
    alpha: 0,
    duration: 140,
    ease: "quad.out",
    onComplete: () => slash.destroy()
  });
}

interface BattlefieldHost {
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  platforms: Phaser.Physics.Arcade.StaticGroup;
  enemies: Phaser.Physics.Arcade.Group;
  cameraMotion: () => boolean;
  onDamageEnemy: (enemy: Phaser.Physics.Arcade.Sprite, damage: number, isBlast: boolean) => boolean;
  onHealPlayer: (amount: number) => void;
  onGrantScore: (points: number) => void;
  onGrantWeapon: (upgrade: GunUpgradeId) => void;
  onTriggerHitStop: (ms: number) => void;
  canReceiveWeaponUpgrade: () => boolean;
  onExplosion?: (x: number, y: number, radius: number, damage: number) => void;
}

interface PropEntry {
  plan: BattlefieldPropPlan;
  sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

interface GrenadeEntry {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  bounced: boolean;
  detonateAt: number;
  bornAt: number;
}

export class MetalSlugBattlefield {
  private props: PropEntry[] = [];
  private propGroup: Phaser.Physics.Arcade.StaticGroup;
  private grenadeGroup: Phaser.Physics.Arcade.Group;
  private dropGroup: Phaser.Physics.Arcade.Group;
  private grenades: GrenadeEntry[] = [];
  private bombCount: number;
  private readonly maxBombs = 10;
  private lastThrowAt = -9999;
  private comboCount = 0;
  private comboUntil = 0;
  private bombHud: Phaser.GameObjects.Text;
  private bombIcon: Phaser.GameObjects.Image | null = null;
  private comboBg: Phaser.GameObjects.Image | null = null;
  private comboHud: Phaser.GameObjects.Text;
  private goArrowImage: Phaser.GameObjects.Image | null = null;
  private goArrowHud: Phaser.GameObjects.Text;
  private goArrowUntil = 0;
  private reducedMotion: MediaQueryList;
  private barrelsExploded = 0;
  private barricadesDestroyed = 0;
  private grenadesThrown = 0;
  private maxCombo = 0;

  constructor(
    private scene: Phaser.Scene,
    level: number,
    endX: number,
    private host: BattlefieldHost,
    viewportWidth: number,
    startingBombs = 6
  ) {
    ensureBattlefieldTextures(scene);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.bombCount = startingBombs;
    this.propGroup = scene.physics.add.staticGroup();
    this.grenadeGroup = scene.physics.add.group();
    this.dropGroup = scene.physics.add.group();

    const plans = battlefieldPropsForLevel(level, endX);
    for (const plan of plans) {
      this.spawnProp(plan);
    }

    // Barricades provide solid tactical cover for enemies; player can shoot/bomb/jump over them.
    scene.physics.add.collider(host.enemies, this.propGroup);
    scene.physics.add.collider(this.dropGroup, host.platforms);
    scene.physics.add.collider(this.grenadeGroup, host.platforms, (obj) => {
      const sprite = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const entry = this.grenades.find((g) => g.sprite === sprite);
      if (!entry) return;
      if (!entry.bounced) {
        entry.bounced = true;
        entry.detonateAt = Math.min(entry.detonateAt, scene.time.now + 560);
        playSfx("enemyHit", { volume: 0.35, pitch: 1.4 });
      }
    });
    scene.physics.add.overlap(this.grenadeGroup, host.enemies, (grenadeObj, enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active || Number(enemy.getData("hp")) <= 0) return;
      const sprite = grenadeObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      this.detonateGrenadeSprite(sprite);
    });
    scene.physics.add.overlap(this.grenadeGroup, this.propGroup, (grenadeObj) => {
      const sprite = grenadeObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      this.detonateGrenadeSprite(sprite);
    });
    scene.physics.add.overlap(host.player, this.dropGroup, (_player, dropObj) => {
      this.collectDrop(dropObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);
    });

    if (scene.textures.exists("ms_grenade")) {
      this.bombIcon = scene.add
        .image(34, 146, "ms_grenade")
        .setDisplaySize(28, 28)
        .setScrollFactor(0)
        .setDepth(85);
    }

    this.bombHud = scene.add
      .text(this.bombIcon ? 52 : 22, 134, "", {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "20px",
        color: "#ffe49e",
        stroke: "#181426",
        strokeThickness: 5
      })
      .setScrollFactor(0)
      .setDepth(85);

    if (scene.textures.exists("ms_popup_burst")) {
      this.comboBg = scene.add
        .image(viewportWidth - 110, 108, "ms_popup_burst")
        .setDisplaySize(220, 118)
        .setScrollFactor(0)
        .setDepth(87)
        .setVisible(false);
    }

    this.comboHud = scene.add
      .text(viewportWidth - 110, 108, "", {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "24px",
        color: "#1e162b",
        stroke: "#fffbeb",
        strokeThickness: 5,
        align: "center"
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(88)
      .setVisible(false);

    if (scene.textures.exists("ms_go_arrow")) {
      this.goArrowImage = scene.add
        .image(viewportWidth - 108, 212, "ms_go_arrow")
        .setDisplaySize(176, 108)
        .setScrollFactor(0)
        .setDepth(92)
        .setVisible(false);
    }

    this.goArrowHud = scene.add
      .text(viewportWidth - 36, 200, "GO!! ➔", {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "44px",
        color: "#ffe14d",
        stroke: "#991b1b",
        strokeThickness: 8
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(92)
      .setVisible(false);

    this.refreshBombHud();
  }

  private spawnProp(plan: BattlefieldPropPlan) {
    const texture =
      plan.kind === "barrel"
        ? "ms_barrel"
        : plan.kind === "barricade"
          ? "ms_barricade"
          : "ms_ammo_crate";
    const sprite = this.propGroup.create(
      plan.x,
      plan.floor,
      texture
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    sprite.setOrigin(0.5, 1).setDepth(11);
    if (plan.kind === "barrel") sprite.setDisplaySize(70, 86);
    else if (plan.kind === "barricade") sprite.setDisplaySize(106, 96);
    else sprite.setDisplaySize(76, 68);
    const maxHp = plan.kind === "barricade" ? 6 : 2;
    sprite.setData("battlefieldPropId", plan.id).setData("propKind", plan.kind);
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.updateFromGameObject();
    this.props.push({ plan, sprite, hp: maxHp, maxHp, destroyed: false });
  }

  get propStaticGroup() {
    return this.propGroup;
  }

  get bombs() {
    return this.bombCount;
  }

  resize(width: number) {
    this.comboBg?.setX(width - 110);
    this.comboHud.setX(width - 110);
    this.goArrowImage?.setX(width - 108);
    this.goArrowHud.setX(width - 36);
  }

  refillBombs(minAmount = 6) {
    this.bombCount = Math.max(this.bombCount, minAmount);
    this.refreshBombHud();
  }

  private refreshBombHud() {
    this.bombHud.setText(`x${this.bombCount} [G]`);
    this.bombHud.setColor(this.bombCount > 0 ? "#ffe49e" : "#94a3b8");
  }

  showGoArrow(now: number, durationMs = 2600) {
    this.goArrowUntil = Math.max(this.goArrowUntil, now + durationMs);
    if (this.goArrowImage) this.goArrowImage.setVisible(true);
    else this.goArrowHud.setVisible(true);
    playSfx("powerup", { volume: 0.45, pitch: 1.2 });
  }

  popupCallout(x: number, y: number, callout: string, color = "#1e162b") {
    const hasBurst = this.scene.textures.exists("ms_popup_burst");
    const container = this.scene.add.container(x, y).setDepth(36).setScale(0.35);
    if (hasBurst) {
      const burst = this.scene.add
        .image(0, 0, "ms_popup_burst")
        .setDisplaySize(Math.max(150, callout.length * 12 + 48), 76);
      container.add(burst);
    }
    const label = this.scene.add
      .text(0, 0, callout, {
        fontFamily: "Gochi Hand, sans-serif",
        fontSize: "21px",
        color: hasBurst ? "#1e162b" : color,
        stroke: hasBurst ? "#fffdf0" : "#181426",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    container.add(label);

    this.scene.tweens.add({
      targets: container,
      scaleX: 1.04,
      scaleY: 1.04,
      y: y - 22,
      duration: 180,
      ease: "back.out",
      onComplete: () => {
        if (!container.active) return;
        this.scene.tweens.add({
          targets: container,
          y: y - 62,
          alpha: 0,
          delay: 320,
          duration: 380,
          ease: "quad.out",
          onComplete: () => container.destroy()
        });
      }
    });
  }

  spawnDropPublic(x: number, y: number, kind: BattlefieldDropKind) {
    this.spawnDrop(x, y, kind);
  }

  registerKill(x: number, y: number, kind: string, now: number, playerHealthRatio: number) {
    if (now <= this.comboUntil) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.comboUntil = now + 3200;
    if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;

    if (this.comboCount >= 2) {
      const bonus = Math.min(500, (this.comboCount - 1) * 50);
      this.host.onGrantScore(bonus);
      const label =
        this.comboCount >= 10
          ? `${this.comboCount}x X-GOD UNSTOPPABLE!`
          : this.comboCount >= 6
            ? `${this.comboCount}x METAL RAMPAGE!`
            : this.comboCount >= 4
              ? `${this.comboCount}x STREAK!`
              : `${this.comboCount}x CHAIN!`;
      this.comboBg?.setVisible(true).setScale(1.18);
      this.comboHud
        .setText(`${label}\n+${bonus}`)
        .setColor(this.comboCount >= 6 ? "#b91c1c" : "#1e162b")
        .setVisible(true)
        .setScale(1.18);
      this.scene.tweens.add({
        targets: this.comboBg ? [this.comboBg, this.comboHud] : this.comboHud,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: "back.out"
      });
    }

    // Battlefield enemy drops: giants, unique enemies, and combo kills reward aggressive play!
    const heavy = kind === "giant" || kind === "bumper" || kind === "boiler" || kind === "bellkeeper" || kind === "mantis" || kind === "mimic" || kind === "tagger";
    if (heavy) {
      const drop: BattlefieldDropKind =
        playerHealthRatio < 0.6
          ? "medkit"
          : this.bombCount <= 3
            ? "grenades"
            : this.comboCount >= 4 && this.host.canReceiveWeaponUpgrade()
              ? (["rapid", "fan", "homing"] as const)[this.comboCount % 3]
              : "medal";
      this.spawnDrop(x, y - 24, drop);
    } else if (this.comboCount >= 3 && this.comboCount % 3 === 0) {
      this.spawnDrop(x, y - 20, this.bombCount < 4 ? "grenades" : "medal");
    } else if (playerHealthRatio < 0.45 && Math.random() < 0.35) {
      this.spawnDrop(x, y - 20, "medkit");
    }

    if (this.host.cameraMotion() && !this.reducedMotion.matches) {
      this.scene.cameras.main.shake(75, 0.003);
    }
  }

  throwGrenade(facing: number, now: number, runningSpeed: number): boolean {
    if (this.bombCount <= 0 || now - this.lastThrowAt < 340) return false;
    this.bombCount -= 1;
    this.lastThrowAt = now;
    this.grenadesThrown += 1;
    this.refreshBombHud();

    const body = this.host.player.body as Phaser.Physics.Arcade.Body;
    const startX = body.center.x + facing * 26;
    const startY = body.top + body.height * 0.32;
    const sprite = this.grenadeGroup.create(
      startX,
      startY,
      "ms_grenade"
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    sprite.setDepth(24).setDisplaySize(38, 38);
    const gBody = sprite.body as Phaser.Physics.Arcade.Body;
    gBody
      .setAllowGravity(true)
      .setGravityY(1150)
      .setBounce(0.55, 0.48)
      .setSize(sprite.width * 0.65, sprite.height * 0.65, true);
    const throwVx = facing * (430 + Math.min(180, Math.abs(runningSpeed) * 0.45));
    sprite.setVelocity(throwVx, -460).setAngularVelocity(facing * 520);
    this.grenades.push({
      sprite,
      bounced: false,
      bornAt: now,
      detonateAt: now + 1350
    });
    playSfx("punchSwing", { volume: 0.55, pitch: 1.25 });
    return true;
  }

  damageProp(propSprite: Phaser.GameObjects.GameObject, damage: number): boolean {
    const entry = this.props.find((p) => !p.destroyed && p.sprite === propSprite);
    if (!entry) return false;
    entry.hp -= damage;
    entry.sprite.setTint(0xfff1a8);
    this.scene.time.delayedCall(75, () => {
      if (entry.sprite.active) {
        entry.sprite.setTint(entry.hp <= entry.maxHp / 2 && entry.plan.kind === "barricade" ? 0xc8a484 : 0xffffff);
      }
    });
    this.spawnDebris(entry.sprite.x, entry.sprite.y - 36, entry.plan.kind, 4);
    playSfx("enemyHit", { volume: 0.45, pitch: entry.plan.kind === "barrel" ? 1.3 : 0.85 });

    if (entry.hp <= 0) {
      this.destroyProp(entry);
    }
    return true;
  }

  damagePropsInRect(rect: Phaser.Geom.Rectangle, damage: number): boolean {
    let hit = false;
    for (const entry of this.props) {
      if (entry.destroyed || !entry.sprite.active) continue;
      const body = entry.sprite.body as Phaser.Physics.Arcade.StaticBody;
      if (
        Phaser.Geom.Rectangle.Overlaps(
          rect,
          new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height)
        )
      ) {
        if (this.damageProp(entry.sprite, damage)) hit = true;
      }
    }
    return hit;
  }

  private destroyProp(entry: PropEntry) {
    if (entry.destroyed) return;
    entry.destroyed = true;
    const x = entry.sprite.x;
    const y = entry.sprite.y - 36;
    const kind = entry.plan.kind;
    entry.sprite.destroy();

    if (kind === "barrel") {
      this.barrelsExploded += 1;
      this.triggerExplosion(x, y, 185, 8, 0xff6b2b);
    } else if (kind === "barricade") {
      this.barricadesDestroyed += 1;
      this.spawnDebris(x, y, "barricade", 10);
      playSfx("enemyDeath", { volume: 0.55, pitch: 0.72 });
      this.host.onGrantScore(150);
      if (entry.plan.drop) this.spawnDrop(x, y, entry.plan.drop);
    } else {
      this.spawnDebris(x, y, "ammo_crate", 8);
      playSfx("powerup", { volume: 0.45, pitch: 0.9 });
      this.spawnDrop(x, y, entry.plan.drop ?? "grenades");
    }
  }

  private detonateGrenadeSprite(sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    const idx = this.grenades.findIndex((g) => g.sprite === sprite);
    if (idx < 0) return;
    const [entry] = this.grenades.splice(idx, 1);
    const x = entry.sprite.x;
    const y = entry.sprite.y;
    if (entry.sprite.active) entry.sprite.destroy();
    this.triggerExplosion(x, y, 170, 7, 0xff9f2e);
  }

  private triggerExplosion(x: number, y: number, radius: number, damage: number, coreColor: number) {
    playSfx("explosion", { volume: 0.8 });
    if (this.host.cameraMotion() && !this.reducedMotion.matches) {
      this.scene.cameras.main.shake(170, 0.0085);
    }
    this.host.onTriggerHitStop(45);

    // Multi-ring comic explosion visual
    const outer = this.scene.add
      .circle(x, y, radius * 0.25, coreColor, 0.85)
      .setStrokeStyle(5, 0xfff5c0, 0.95)
      .setDepth(27);
    const inner = this.scene.add.circle(x, y, radius * 0.16, 0xfff8d6, 0.95).setDepth(28);
    this.scene.tweens.add({
      targets: outer,
      scaleX: 4.2,
      scaleY: 4.2,
      alpha: 0,
      duration: 280,
      ease: "quad.out",
      onComplete: () => outer.destroy()
    });
    this.scene.tweens.add({
      targets: inner,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 190,
      ease: "quad.out",
      onComplete: () => inner.destroy()
    });
    this.spawnDebris(x, y, "barrel", 10);

    // Blast all enemies within radius
    for (const child of [...this.host.enemies.getChildren()]) {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active || Number(enemy.getData("hp")) <= 0) continue;
      const eBody = enemy.body as Phaser.Physics.Arcade.Body;
      const dist = Phaser.Math.Distance.Between(x, y, eBody.center.x, eBody.center.y);
      if (dist <= radius + Math.max(eBody.width, eBody.height) * 0.35) {
        this.host.onDamageEnemy(enemy, damage, true);
      }
    }

    // Chain-react nearby barrels & shatter nearby barricades with classic Metal Slug stagger!
    for (const entry of this.props) {
      if (entry.destroyed || !entry.sprite.active) continue;
      const dist = Phaser.Math.Distance.Between(x, y, entry.sprite.x, entry.sprite.y - 30);
      if (dist <= radius + 36) {
        if (entry.plan.kind === "barrel") {
          this.scene.time.delayedCall(110, () => {
            if (!entry.destroyed && entry.sprite.active) this.destroyProp(entry);
          });
        } else {
          this.damageProp(entry.sprite, damage);
        }
      }
    }
    this.host.onExplosion?.(x, y, radius, damage);
  }

  private spawnDebris(x: number, y: number, kind: BattlefieldPropKind, count: number) {
    if (this.reducedMotion.matches) return;
    const palette =
      kind === "barrel"
        ? [0xff6b2b, 0xffd15c, 0x262133]
        : kind === "barricade"
          ? [0xb47e4f, 0x7c502c, 0xd4be94]
          : [0x5d875f, 0xffd75e, 0x242936];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const dist = Phaser.Math.Between(35, 110);
      const shard = this.scene.add
        .rectangle(x, y, Phaser.Math.Between(7, 14), Phaser.Math.Between(5, 10), palette[i % palette.length])
        .setStrokeStyle(1.5, 0x1a1423)
        .setDepth(26);
      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 22,
        angle: Phaser.Math.Between(-300, 300),
        alpha: 0,
        duration: Phaser.Math.Between(240, 420),
        ease: "quad.out",
        onComplete: () => shard.destroy()
      });
    }
  }

  private spawnDrop(x: number, y: number, kind: BattlefieldDropKind) {
    const isWeapon = kind === "rapid" || kind === "fan" || kind === "homing";
    const texture =
      kind === "medal"
        ? "ms_medal"
        : kind === "grenades"
          ? "ms_bomb_pack"
          : kind === "medkit"
            ? "ms_medkit"
            : this.scene.textures.exists(`gun_upgrade_${kind}`)
              ? `gun_upgrade_${kind}`
              : "ms_ammo_crate";
    const drop = this.dropGroup.create(
      x,
      y,
      texture
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    drop.setDepth(16).setData("dropKind", kind).setData("bornAt", this.scene.time.now);
    if (isWeapon) drop.setDisplaySize(46, 46);
    else drop.setDisplaySize(48, 48);
    const dBody = drop.body as Phaser.Physics.Arcade.Body;
    dBody.setAllowGravity(true).setGravityY(950).setBounce(0.35, 0.45).setDragX(180).setSize(drop.width * 0.7, drop.height * 0.7, true);
    drop.setVelocity(Phaser.Math.Between(-90, 90), -300);
  }

  private collectDrop(drop: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    if (!drop.active) return;
    const kind = drop.getData("dropKind") as BattlefieldDropKind;
    const x = drop.x;
    const y = drop.y - 18;
    drop.destroy();

    let callout: string;
    let color = "#ffe066";
    if (kind === "medal") {
      this.host.onGrantScore(250);
      playSfx("pickup");
      callout = "MEDAL +250";
    } else if (kind === "grenades") {
      this.bombCount = Math.min(this.maxBombs, this.bombCount + 3);
      this.refreshBombHud();
      playSfx("powerup", { volume: 0.55, pitch: 1.15 });
      callout = "+3 BOMBS!";
      color = "#86efac";
    } else if (kind === "medkit") {
      this.host.onHealPlayer(22);
      playSfx("pickup", { pitch: 1.25 });
      callout = "MEDKIT +22";
      color = "#fda4af";
    } else {
      if (this.host.canReceiveWeaponUpgrade()) {
        this.host.onGrantWeapon(kind);
        callout =
          kind === "rapid"
            ? "HEAVY RAPID!"
            : kind === "fan"
              ? "SHOTGUN FAN!"
              : "HEAT SEEKERS!";
        color = "#7dd3fc";
      } else {
        this.host.onGrantScore(300);
        playSfx("pickup");
        callout = "+300";
      }
    }

    this.popupCallout(x, y, callout, color);
  }

  update(now: number) {
    // Check grenade fuses
    for (const entry of [...this.grenades]) {
      if (!entry.sprite.active) {
        this.grenades = this.grenades.filter((g) => g !== entry);
        continue;
      }
      if (now >= entry.detonateAt) {
        this.detonateGrenadeSprite(entry.sprite);
      }
    }

    // Expire combo banner cleanly
    if (this.comboCount > 0 && now > this.comboUntil) {
      this.comboCount = 0;
      this.comboHud.setVisible(false);
      this.comboBg?.setVisible(false);
    }

    // Flash arcade "GO!!" arrow after clearing a strongpoint
    if (now < this.goArrowUntil) {
      const blink = Math.floor(now / 190) % 2 === 0;
      if (this.goArrowImage) {
        this.goArrowImage.setVisible(blink).setScale(blink ? 1.05 : 0.96);
        this.goArrowHud.setVisible(false);
      } else {
        this.goArrowHud.setVisible(blink).setScale(blink ? 1.06 : 1);
      }
    } else if (this.goArrowHud.visible || this.goArrowImage?.visible) {
      this.goArrowHud.setVisible(false);
      this.goArrowImage?.setVisible(false);
    }
  }

  read() {
    return {
      bombs: this.bombCount,
      grenadesThrown: this.grenadesThrown,
      barrelsLeft: this.props.filter((p) => !p.destroyed && p.plan.kind === "barrel").length,
      barrelsExploded: this.barrelsExploded,
      barricadesLeft: this.props.filter((p) => !p.destroyed && p.plan.kind === "barricade").length,
      barricadesDestroyed: this.barricadesDestroyed,
      combo: this.comboCount,
      maxCombo: this.maxCombo,
      goArrowVisible: Boolean(this.goArrowImage?.visible || this.goArrowHud.visible)
    };
  }

  destroy() {
    this.bombIcon?.destroy();
    this.bombHud.destroy();
    this.comboBg?.destroy();
    this.comboHud.destroy();
    this.goArrowImage?.destroy();
    this.goArrowHud.destroy();
    this.propGroup.clear(true, true);
    this.grenadeGroup.clear(true, true);
    this.dropGroup.clear(true, true);
    this.props = [];
    this.grenades = [];
  }
}
