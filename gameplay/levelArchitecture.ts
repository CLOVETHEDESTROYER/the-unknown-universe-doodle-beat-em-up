import Phaser from "phaser";

export type PlatformSupport =
  | "none"
  | "scaffold"
  | "cantilever-left"
  | "cantilever-right"
  | "bunker"
  | "truss"
  | "pillar"
  | "cliff";

export interface ArchPlatformRect {
  x: number;
  y: number;
  w: number;
  h: number;
  support?: PlatformSupport;
  railing?: boolean;
  ladderSide?: "left" | "right";
}

interface ArchPalette {
  ink: number;
  steelDark: number;
  steelMid: number;
  steelLight: number;
  brickDark: number;
  brickMid: number;
  brickHighlight: number;
  woodDark: number;
  woodMid: number;
  windowGlow: number;
  windowDark: number;
  skylineFar: number;
  skylineMid: number;
  fgDark: number;
  searchlight: number;
  smoke: number;
}

const ARCH_PALETTES: Record<number, ArchPalette> = {
  1: {
    ink: 0x1d162b,
    steelDark: 0x3b354d,
    steelMid: 0x5c5573,
    steelLight: 0x8e86a8,
    brickDark: 0x4b3544,
    brickMid: 0x6e4b59,
    brickHighlight: 0x9b6f7b,
    woodDark: 0x513424,
    woodMid: 0x7d5137,
    windowGlow: 0xffd166,
    windowDark: 0x261d34,
    skylineFar: 0x2a2342,
    skylineMid: 0x231b35,
    fgDark: 0x151022,
    searchlight: 0xffe8a3,
    smoke: 0xd9d2ea
  },
  2: {
    ink: 0x121f26,
    steelDark: 0x273940,
    steelMid: 0x3e565e,
    steelLight: 0x6b8a92,
    brickDark: 0x24333a,
    brickMid: 0x3a4f57,
    brickHighlight: 0x617d85,
    woodDark: 0x3a2e28,
    woodMid: 0x5a463b,
    windowGlow: 0x7dd3fc,
    windowDark: 0x142029,
    skylineFar: 0x182a33,
    skylineMid: 0x13222b,
    fgDark: 0x0c161c,
    searchlight: 0x93c5fd,
    smoke: 0x9fb8c2
  },
  3: {
    ink: 0x231116,
    steelDark: 0x442529,
    steelMid: 0x693a3c,
    steelLight: 0x9a5d58,
    brickDark: 0x4f2321,
    brickMid: 0x783831,
    brickHighlight: 0xa85848,
    woodDark: 0x4c281c,
    woodMid: 0x733f2b,
    windowGlow: 0xff9f43,
    windowDark: 0x281214,
    skylineFar: 0x34191e,
    skylineMid: 0x281216,
    fgDark: 0x1a0b0e,
    searchlight: 0xffb366,
    smoke: 0xc2998e
  },
  4: {
    ink: 0x19241e,
    steelDark: 0x2d4035,
    steelMid: 0x476151,
    steelLight: 0x76947f,
    brickDark: 0x323b34,
    brickMid: 0x4c584e,
    brickHighlight: 0x788777,
    woodDark: 0x443225,
    woodMid: 0x684d39,
    windowGlow: 0xd8b4fe,
    windowDark: 0x1e2524,
    skylineFar: 0x23322b,
    skylineMid: 0x1b2622,
    fgDark: 0x101815,
    searchlight: 0xe9d5ff,
    smoke: 0xb8ccb9
  },
  6: {
    ink: 0x141029,
    steelDark: 0x2c244f,
    steelMid: 0x473b78,
    steelLight: 0x7667b0,
    brickDark: 0x271e46,
    brickMid: 0x3f316b,
    brickHighlight: 0x68559e,
    woodDark: 0x332445,
    woodMid: 0x4e3969,
    windowGlow: 0xc084fc,
    windowDark: 0x17112e,
    skylineFar: 0x1e163b,
    skylineMid: 0x16102d,
    fgDark: 0x0d091c,
    searchlight: 0xd8b4fe,
    smoke: 0xa799d4
  }
};

function paletteFor(level: number): ArchPalette {
  return ARCH_PALETTES[level] ?? ARCH_PALETTES[1];
}

function hash01(seed: number): number {
  return ((Math.imul(seed ^ (seed >>> 13), 1597334677) >>> 0) % 997) / 997;
}

/** Find the supporting ground/structure top beneath a given x coordinate. */
function findFloorBelow(x: number, y: number, platforms: ArchPlatformRect[]): number {
  let best = 600;
  for (const p of platforms) {
    if (p.y > y + 8 && x >= p.x - 10 && x <= p.x + p.w + 10) {
      if (p.y < best) best = p.y;
    }
  }
  return best;
}

/**
 * Automatically chooses grounded architectural supports for any raised platform
 * that didn't explicitly declare one, eliminating floating bricks across all levels.
 */
export function resolvePlatformSupport(
  rect: ArchPlatformRect,
  allPlatforms: ArchPlatformRect[]
): PlatformSupport {
  if (rect.support) return rect.support;
  // Ground blocks and thick blocks get cliff/retaining wall framing
  if (rect.h > 72) return "cliff";
  // Low step-blocks resting directly on ground already connect to the floor
  const floorMid = findFloorBelow(rect.x + rect.w / 2, rect.y + rect.h - 4, allPlatforms);
  if (floorMid - (rect.y + rect.h) <= 10) return "none";

  // Check if adjacent to a taller wall/block on left or right -> cantilevered jutting platform!
  const leftAnchor = allPlatforms.some(
    (p) =>
      p !== rect &&
      p.h >= 54 &&
      Math.abs(p.x + p.w - rect.x) <= 28 &&
      p.y <= rect.y + 40 &&
      p.y + p.h >= rect.y + rect.h
  );
  if (leftAnchor) return "cantilever-left";

  const rightAnchor = allPlatforms.some(
    (p) =>
      p !== rect &&
      p.h >= 54 &&
      Math.abs(p.x - (rect.x + rect.w)) <= 28 &&
      p.y <= rect.y + 40 &&
      p.y + p.h >= rect.y + rect.h
  );
  if (rightAnchor) return "cantilever-right";

  // Over a chasm -> steel truss catwalk anchored at the banks
  const hasGroundLeft = findFloorBelow(rect.x + 12, rect.y + rect.h, allPlatforms) < 570;
  const hasGroundRight = findFloorBelow(rect.x + rect.w - 12, rect.y + rect.h, allPlatforms) < 570;
  if (!hasGroundLeft || !hasGroundRight) return "truss";

  // Wide elevated decks become either steel truss catwalks or timber/steel scaffolds
  if (rect.w >= 260) return "truss";
  return hash01(rect.x * 7 + rect.y * 13) > 0.45 ? "scaffold" : "pillar";
}

function drawRailing(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, p: ArchPalette) {
  const railTop = y - 22;
  g.lineStyle(3, p.ink, 0.9);
  g.lineBetween(x + 6, railTop, x + w - 6, railTop);
  g.lineStyle(2, p.steelLight, 0.85);
  g.lineBetween(x + 6, railTop + 1, x + w - 6, railTop + 1);
  g.lineStyle(2, p.steelMid, 0.78);
  g.lineBetween(x + 6, y - 11, x + w - 6, y - 11);

  const posts = Math.max(2, Math.floor(w / 46));
  for (let i = 0; i <= posts; i++) {
    const px = x + 8 + ((w - 16) * i) / posts;
    g.lineStyle(3, p.ink, 0.92).lineBetween(px, railTop - 2, px, y);
    g.lineStyle(1.5, p.steelLight, 0.8).lineBetween(px - 1, railTop, px - 1, y - 2);
  }
}

function drawLadder(
  g: Phaser.GameObjects.Graphics,
  x: number,
  topY: number,
  bottomY: number,
  p: ArchPalette
) {
  const w = 22;
  g.lineStyle(4, p.ink, 0.92);
  g.lineBetween(x, topY, x, bottomY);
  g.lineBetween(x + w, topY, x + w, bottomY);
  g.lineStyle(2, p.woodMid, 0.95);
  g.lineBetween(x, topY, x, bottomY);
  g.lineBetween(x + w, topY, x + w, bottomY);
  for (let ry = topY + 14; ry < bottomY - 8; ry += 20) {
    g.lineStyle(4, p.ink, 0.9).lineBetween(x - 1, ry, x + w + 1, ry);
    g.lineStyle(2, p.steelLight, 0.9).lineBetween(x, ry - 1, x + w, ry - 1);
  }
}

/**
 * Draws hand-inked architectural supports (jutting cantilevers, bunker facades,
 * steel truss catwalks, scaffold towers, stone piers, railings, and ladders)
 * behind platforms so every ledge is physically grounded in the world.
 */
function resolveArchTexture(scene: Phaser.Scene, baseKey: string, level: number): string | null {
  const themed = `${baseKey}_l${level}`;
  if (scene.textures.exists(themed)) return themed;
  if (scene.textures.exists(baseKey)) return baseKey;
  return null;
}

export function drawPlatformArchitecture(
  scene: Phaser.Scene,
  backGfx: Phaser.GameObjects.Graphics,
  railGfx: Phaser.GameObjects.Graphics,
  rect: ArchPlatformRect,
  allPlatforms: ArchPlatformRect[],
  level: number
) {
  const p = paletteFor(level);
  const support = resolvePlatformSupport(rect, allPlatforms);
  if (support === "none") return;

  const { x, y, w, h } = rect;
  const bottom = y + h;
  const themeTint = level === 2 ? 0xbdd4dc : level === 3 ? 0xf5c4b0 : level === 4 ? 0xc8dac8 : level === 6 ? 0xc4b5e8 : 0xffffff;
  const bunkerKey = resolveArchTexture(scene, "ms_bunker_facade", level);
  const sandbagsKey = resolveArchTexture(scene, "ms_sandbags", level);
  const cantiKey = resolveArchTexture(scene, "ms_cantilever_bracket", level);
  const trussKey = resolveArchTexture(scene, "ms_truss_girder", level);
  const trestleKey = resolveArchTexture(scene, "ms_trestle_plank", level);

  if (support === "cliff") {
    // Subtle dark grounding bevel along bottom of ground slabs
    backGfx.fillStyle(p.ink, 0.2).fillRect(x, y + h - 16, w, 16);
    return;
  }

  const leftFloor = findFloorBelow(x + 16, bottom, allPlatforms);
  const rightFloor = findFloorBelow(x + w - 16, bottom, allPlatforms);
  const floorY = Math.min(Math.max(leftFloor, rightFloor), 580);

  // Subtle underside cast shadow beneath raised decks
  backGfx.fillStyle(0x090710, 0.24).fillRect(x + 4, bottom, w - 8, 9);

  if (support === "bunker") {
    const facadeH = Math.max(40, floorY - bottom);
    const fx = x + 6;
    const fw = Math.max(60, w - 12);

    if (bunkerKey) {
      scene.add
        .image(fx + fw / 2, floorY, bunkerKey)
        .setOrigin(0.5, 1)
        .setDisplaySize(fw, facadeH + 10)
        .setTint(bunkerKey === "ms_bunker_facade" ? themeTint : 0xffffff)
        .setDepth(0);
    } else {
      backGfx.fillStyle(p.brickDark, 0.94).fillRect(fx, bottom - 2, fw, facadeH + 4);
      backGfx.lineStyle(4, p.ink, 0.96).strokeRect(fx, bottom - 2, fw, facadeH + 4);
    }

    // Hand-drawn burlap sandbag parapet along rooftop edge
    if (rect.railing !== false) {
      if (sandbagsKey) {
        const bagW = 86;
        const count = Math.max(1, Math.floor((w - 12) / (bagW - 10)));
        const step = (w - 16) / count;
        for (let i = 0; i < count; i++) {
          scene.add
            .image(x + 8 + step * (i + 0.5), y + 4, sandbagsKey)
            .setOrigin(0.5, 1)
            .setDisplaySize(Math.min(bagW, step + 10), 28)
            .setTint(sandbagsKey === "ms_sandbags" ? themeTint : 0xffffff)
            .setDepth(0.6);
        }
      } else {
        for (let sx = x + 12; sx < x + w - 26; sx += 26) {
          railGfx.fillStyle(0xb99d73, 0.92).fillRoundedRect(sx, y - 13, 24, 13, 6);
          railGfx.lineStyle(2.5, p.ink, 0.9).strokeRoundedRect(sx, y - 13, 24, 13, 6);
        }
      }
    }
    if (rect.ladderSide) {
      const lx = rect.ladderSide === "left" ? fx + 10 : fx + fw - 32;
      drawLadder(backGfx, lx, y + 2, floorY, p);
    }
    return;
  }

  if (support === "cantilever-left" || support === "cantilever-right") {
    const anchorLeft = support === "cantilever-left";
    const bracketW = Math.min(w, 168);
    const wallFloor = findFloorBelow(anchorLeft ? x + 4 : x + w - 4, bottom, allPlatforms);
    const bracketH = Math.min(138, Math.max(66, wallFloor - bottom));

    if (cantiKey) {
      const bx = anchorLeft ? x - 6 : x + w + 6;
      scene.add
        .image(bx, bottom - 6, cantiKey)
        .setOrigin(anchorLeft ? 0 : 1, 0)
        .setFlipX(!anchorLeft)
        .setDisplaySize(bracketW, bracketH)
        .setTint(cantiKey === "ms_cantilever_bracket" ? themeTint : 0xffffff)
        .setDepth(0);
      // Extend an extra steel support column down if the cantilever sits high above the ground
      if (wallFloor - (bottom + bracketH) > 12) {
        const colX = anchorLeft ? x - 8 : x + w - 12;
        backGfx.fillStyle(p.steelDark, 0.95).fillRect(colX, bottom + bracketH - 10, 18, wallFloor - (bottom + bracketH) + 12);
        backGfx.lineStyle(3, p.ink, 0.95).strokeRect(colX, bottom + bracketH - 10, 18, wallFloor - (bottom + bracketH) + 12);
      }
      // If deck is wider than the cantilever bracket, run a hand-drawn steel truss beam along the rest
      if (w > bracketW + 24 && trussKey) {
        const remW = w - bracketW + 10;
        const rx = anchorLeft ? x + bracketW - 10 : x;
        scene.add
          .image(rx + remW / 2, bottom - 2, trussKey)
          .setOrigin(0.5, 0)
          .setDisplaySize(remW, 34)
          .setTint(trussKey === "ms_truss_girder" ? themeTint : 0xffffff)
          .setDepth(0);
      }
    } else {
      const wallX = anchorLeft ? x - 18 : x + w - 10;
      backGfx.fillStyle(p.brickDark, 0.95).fillRect(wallX, y - 34, 28, Math.max(40, wallFloor - (y - 34)));
      backGfx.lineStyle(3.5, p.ink, 0.95).strokeRect(wallX, y - 34, 28, Math.max(40, wallFloor - (y - 34)));
    }

    if (rect.railing !== false) drawRailing(railGfx, x, y, w, p);
    if (rect.ladderSide) {
      const lx = rect.ladderSide === "left" ? x + 10 : x + w - 32;
      drawLadder(backGfx, lx, y + 2, findFloorBelow(lx + 11, bottom, allPlatforms), p);
    }
    return;
  }

  if (support === "truss") {
    const trussH = 42;
    if (trussKey) {
      const segs = Math.max(1, Math.round(w / 145));
      const segW = w / segs;
      for (let i = 0; i < segs; i++) {
        scene.add
          .image(x + segW * (i + 0.5), bottom - 4, trussKey)
          .setOrigin(0.5, 0)
          .setDisplaySize(segW + 4, trussH)
          .setTint(trussKey === "ms_truss_girder" ? themeTint : 0xffffff)
          .setDepth(0);
      }
    } else {
      backGfx.fillStyle(p.steelDark, 0.94).fillRect(x + 2, bottom - 2, w - 4, 28);
      backGfx.lineStyle(3, p.ink, 0.95).strokeRect(x + 2, bottom - 2, w - 4, 28);
    }

    // Anchored steel legs or cantilever brackets at the ends descending to floor
    const legs = w >= 290 ? [x + 14, x + w / 2 - 7, x + w - 28] : [x + 14, x + w - 28];
    for (const lx of legs) {
      const legFloor = findFloorBelow(lx + 7, bottom + trussH - 6, allPlatforms);
      const legH = Math.max(24, Math.min(legFloor, 600) - (bottom + trussH - 8));
      if (trestleKey && legH > 40) {
        scene.add
          .image(lx + 7, bottom + trussH - 12, trestleKey)
          .setOrigin(0.5, 0)
          .setDisplaySize(44, legH + 14)
          .setTint(trestleKey === "ms_trestle_plank" ? (level === 1 ? 0xc2c8dc : themeTint) : 0xffffff)
          .setDepth(-0.2);
      } else {
        backGfx.fillStyle(p.steelDark, 0.92).fillRect(lx, bottom + trussH - 6, 14, legH);
        backGfx.lineStyle(2.5, p.ink, 0.95).strokeRect(lx, bottom + trussH - 6, 14, legH);
      }
    }

    if (rect.railing !== false) drawRailing(railGfx, x, y, w, p);
    if (rect.ladderSide) {
      const lx = rect.ladderSide === "left" ? x + 28 : x + w - 50;
      drawLadder(backGfx, lx, y + 2, findFloorBelow(lx + 11, bottom, allPlatforms), p);
    }
    return;
  }

  if (support === "scaffold") {
    const legFloor = Math.min(
      findFloorBelow(x + 18, bottom, allPlatforms),
      findFloorBelow(x + w - 18, bottom, allPlatforms),
      590
    );
    const legH = Math.max(36, legFloor - bottom);
    if (trestleKey) {
      const bays = Math.max(1, Math.round(w / 95));
      const bayW = (w - 8) / bays;
      for (let i = 0; i < bays; i++) {
        scene.add
          .image(x + 4 + bayW * (i + 0.5), bottom - 8, trestleKey)
          .setOrigin(0.5, 0)
          .setDisplaySize(bayW, legH + 10)
          .setTint(trestleKey === "ms_trestle_plank" ? themeTint : 0xffffff)
          .setDepth(0);
      }
    } else {
      backGfx.fillStyle(p.woodDark, 0.95).fillRect(x + 4, bottom - 2, w - 8, 12);
    }
    if (rect.railing) drawRailing(railGfx, x, y, w, p);
    if (rect.ladderSide) {
      const lx = rect.ladderSide === "left" ? x + 16 : x + w - 38;
      drawLadder(backGfx, lx, y + 2, legFloor, p);
    }
    return;
  }

  // Default "pillar": hand-drawn truss underside + wooden/stone trestle piers
  if (trussKey) {
    scene.add
      .image(x + w / 2, bottom - 3, trussKey)
      .setOrigin(0.5, 0)
      .setDisplaySize(w - 6, 30)
      .setTint(trussKey === "ms_truss_girder" ? themeTint : 0xffffff)
      .setDepth(0);
  }
  const piers = w >= 200 ? [x + 32, x + w - 32] : [x + w / 2];
  for (const px of piers) {
    const pFloor = findFloorBelow(px, bottom + 20, allPlatforms);
    const pH = Math.max(24, Math.min(pFloor, 595) - (bottom + 18));
    if (trestleKey) {
      scene.add
        .image(px, bottom + 14, trestleKey)
        .setOrigin(0.5, 0)
        .setDisplaySize(52, pH + 8)
        .setTint(trestleKey === "ms_trestle_plank" ? (level === 1 ? 0xcfd4e3 : themeTint) : 0xffffff)
        .setDepth(-0.2);
    } else {
      backGfx.fillStyle(p.brickDark, 0.94).fillRect(px - 12, bottom - 2, 24, pH + 22);
      backGfx.lineStyle(3, p.ink, 0.95).strokeRect(px - 12, bottom - 2, 24, pH + 22);
    }
  }
  if (rect.railing) drawRailing(railGfx, x, y, w, p);
}

interface SearchlightNode {
  x: number;
  y: number;
  baseAngle: number;
  sweep: number;
  speed: number;
  phase: number;
  length: number;
}

interface ChimneyNode {
  x: number;
  y: number;
  phase: number;
}

/**
 * 3-layer living parallax backdrop (far silhouette skyline with animated
 * searchlights & chimney smoke, near-midground street architecture, and
 * occasional foreground framing girders) so stages feel deeply dimensional.
 */
export class LivingParallaxBackdrop {
  private farGfx: Phaser.GameObjects.Graphics;
  private farAnimGfx: Phaser.GameObjects.Graphics;
  private midGfx: Phaser.GameObjects.Graphics;
  private fgGfx: Phaser.GameObjects.Graphics;
  private searchlights: SearchlightNode[] = [];
  private chimneys: ChimneyNode[] = [];
  private palette: ArchPalette;
  private reducedMotion: MediaQueryList;

  constructor(private scene: Phaser.Scene, level: number, worldWidth: number) {
    this.palette = paletteFor(level);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.farGfx = scene.add.graphics().setScrollFactor(0.42, 0).setDepth(-19);
    this.farAnimGfx = scene.add.graphics().setScrollFactor(0.42, 0).setDepth(-18);
    this.midGfx = scene.add.graphics().setScrollFactor(0.72, 0).setDepth(-9);
    this.fgGfx = scene.add.graphics().setScrollFactor(1.22, 0).setDepth(38);

    const farSpan = Math.ceil(worldWidth * 0.42) + 1400;
    const midSpan = Math.ceil(worldWidth * 0.72) + 1500;
    const fgSpan = Math.ceil(worldWidth * 1.22) + 1200;

    this.buildFarSkyline(farSpan, level);
    this.buildNearMidground(midSpan, level);
    this.buildForegroundFrames(fgSpan, level);
  }

  private buildFarSkyline(span: number, level: number) {
    const g = this.farGfx;
    const p = this.palette;
    const baseY = 540;
    let x = -80;
    let idx = 0;

    while (x < span) {
      const r = hash01(idx * 37 + level * 101);
      const kind = idx % 5;
      const w = 105 + Math.floor(r * 95);
      const h = 72 + Math.floor(hash01(idx * 53 + level) * 78);
      const topY = baseY - h;

      g.fillStyle(p.skylineFar, 0.28).fillRect(x, topY, w, h + 40);
      g.lineStyle(2, p.ink, 0.25).strokeRect(x, topY, w, h + 40);

      if (kind === 0) {
        // Peaked watchtower turret with sweeping searchlight
        g.fillStyle(p.skylineFar, 0.34).fillTriangle(x - 8, topY, x + w / 2, topY - 34, x + w + 8, topY);
        this.searchlights.push({
          x: x + w / 2,
          y: topY - 10,
          baseAngle: -Math.PI * 0.5 + (r - 0.5) * 0.4,
          sweep: 0.45 + r * 0.25,
          speed: 0.0007 + r * 0.0005,
          phase: idx * 1.7,
          length: 290 + r * 110
        });
      } else if (kind === 2) {
        // Industrial smokestack with animated rising smoke puffs
        const cx = x + w * 0.72;
        const ch = 54 + r * 36;
        g.fillStyle(p.skylineFar, 0.38).fillRect(cx - 10, topY - ch, 20, ch + 6);
        this.chimneys.push({ x: cx, y: topY - ch - 4, phase: idx * 2.1 });
      } else if (kind === 4) {
        // Distant steel crane boom silhouette
        g.lineStyle(3, p.skylineFar, 0.36).lineBetween(x + w * 0.4, topY, x + w * 0.4, topY - 64);
        g.lineStyle(3, p.skylineFar, 0.36).lineBetween(x + w * 0.4 - 38, topY - 56, x + w * 0.4 + 78, topY - 68);
      }

      // Subtle glowing distant windows along lower skyline
      for (let wy = topY + 22; wy < baseY - 40; wy += 32) {
        for (let wx = x + 18; wx < x + w - 22; wx += 28) {
          if (hash01(wx * 3 + wy * 7 + level) > 0.66) {
            g.fillStyle(p.windowGlow, 0.24).fillRect(wx, wy, 9, 12);
          }
        }
      }

      x += w + 48 + Math.floor(r * 72);
      idx += 1;
    }
  }

  private buildNearMidground(span: number, level: number) {
    const g = this.midGfx;
    const p = this.palette;
    const groundY = 505;

    // Continuous low retaining wall / aqueduct parapet behind the combat lane
    for (let x = 0; x < span; x += 260) {
      const r = hash01(x + level * 71);
      const wallH = 68 + Math.floor(r * 46);
      const topY = groundY - wallH;

      if (r > 0.32) {
        // Arched stone/brick viaduct bay
        g.fillStyle(p.skylineMid, 0.48).fillRect(x, topY, 210, wallH + 60);
        g.lineStyle(2.5, p.ink, 0.45).strokeRect(x, topY, 210, wallH + 60);
        // Parapet coping strip
        g.fillStyle(p.steelDark, 0.55).fillRect(x - 4, topY - 8, 218, 10);
        // Dark archway cutout inside the viaduct
        g.fillStyle(p.ink, 0.32).fillRoundedRect(x + 42, topY + 22, 126, wallH - 10, { tl: 44, tr: 44, bl: 0, br: 0 });
        g.lineStyle(2, p.steelLight, 0.28).strokeRoundedRect(x + 42, topY + 22, 126, wallH - 10, { tl: 44, tr: 44, bl: 0, br: 0 });
      } else {
        // Industrial iron fence + telegraph pole
        g.lineStyle(3, p.ink, 0.44).lineBetween(x + 12, groundY - 56, x + 235, groundY - 56);
        for (let px = x + 16; px <= x + 230; px += 20) {
          g.lineStyle(2.5, p.ink, 0.42).lineBetween(px, groundY - 62, px, groundY + 12);
        }
        // Tall wooden utility pole with crossbars
        g.fillStyle(p.woodDark, 0.6).fillRect(x + 115, groundY - 210, 10, 220);
        g.fillStyle(p.woodDark, 0.6).fillRect(x + 90, groundY - 190, 60, 6);
        g.fillStyle(p.woodDark, 0.6).fillRect(x + 96, groundY - 172, 48, 5);
      }
    }
  }

  private buildForegroundFrames(span: number, level: number) {
    const g = this.fgGfx;
    const p = this.palette;

    // Edge-hugging foreground steel trusses & low sandbag silhouettes passing in front of camera
    // Never cuts vertically across the center combat lane!
    for (let x = 980; x < span; x += 1280) {
      const variant = Math.floor(hash01(x + level * 13) * 2);
      if (variant === 0) {
        // Overhead steel gantry corner truss at top edge
        g.fillStyle(p.fgDark, 0.58).fillRect(x, 0, 22, 86);
        g.fillStyle(p.fgDark, 0.52).fillTriangle(x + 22, 0, x + 132, 0, x + 22, 72);
        g.lineStyle(2.5, p.steelMid, 0.28).lineBetween(x + 22, 72, x + 132, 0);
      } else {
        // Low foreground sandbag & timber barrier along bottom screen edge
        g.fillStyle(p.fgDark, 0.6).fillRect(x, 540, 20, 100);
        g.fillStyle(p.fgDark, 0.55).fillRoundedRect(x - 32, 558, 92, 34, 10);
      }
    }
  }

  update(now: number) {
    const g = this.farAnimGfx;
    g.clear();
    const camLeft = this.scene.cameras.main.scrollX * 0.42 - 220;
    const camRight = camLeft + this.scene.cameras.main.width + 440;
    const t = this.reducedMotion.matches ? 0 : now;

    // Sweeping watchtower searchlight cones
    for (const s of this.searchlights) {
      if (s.x < camLeft - 240 || s.x > camRight + 240) continue;
      const angle = s.baseAngle + Math.sin(t * s.speed + s.phase) * s.sweep;
      const spread = 0.14;
      const x1 = s.x + Math.cos(angle - spread) * s.length;
      const y1 = s.y + Math.sin(angle - spread) * s.length;
      const x2 = s.x + Math.cos(angle + spread) * s.length;
      const y2 = s.y + Math.sin(angle + spread) * s.length;
      g.fillStyle(this.palette.searchlight, 0.085).fillTriangle(s.x, s.y, x1, y1, x2, y2);
      g.fillStyle(this.palette.searchlight, 0.45).fillCircle(s.x, s.y, 4.5);
    }

    // Gently rising chimney smoke puffs
    for (const c of this.chimneys) {
      if (c.x < camLeft || c.x > camRight) continue;
      for (let i = 0; i < 4; i++) {
        const life = ((t * 0.00028 + c.phase + i * 0.25) % 1);
        const px = c.x + Math.sin(life * 5 + c.phase) * 14 + life * 26;
        const py = c.y - life * 78;
        const r = 7 + life * 16;
        const alpha = (1 - life) * 0.22;
        g.fillStyle(this.palette.smoke, alpha).fillCircle(px, py, r);
      }
    }
  }

  destroy() {
    this.farGfx.destroy();
    this.farAnimGfx.destroy();
    this.midGfx.destroy();
    this.fgGfx.destroy();
  }
}
