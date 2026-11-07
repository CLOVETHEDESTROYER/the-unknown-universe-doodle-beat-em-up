import Phaser from 'phaser';
import { playSfx } from '../audio/gameAudio';

type Enemy = Phaser.Physics.Arcade.Sprite;
interface Hooks {
  player: Enemy;
  enemies: Phaser.Physics.Arcade.Group;
  floorAt: (x: number) => number | null;
  damage: (enemy: Enemy, amount: number, projectile?: boolean) => boolean;
}
interface FallingTurkey {
  art: Phaser.GameObjects.Sprite;
  x: number; y: number; vy: number; floor: number | null; bounce: boolean; bounced: boolean;
}
interface Wing {
  art: Phaser.GameObjects.Sprite;
  vx: number; vy: number; age: number; targets: Set<Enemy>;
}

export const TURKEY_STORM = { cooldown: 12000, invoke: 640, cast: 1150, waves: [850, 1370, 1910], counts: [3, 3, 4] };

/** Rain uses the current camera and real supporting ground, including arena limits. */
export class TurkeyStorm {
  private clock = 0;
  private startedAt = -99999;
  private readyAt = 0;
  private wave = 0;
  private invoked = false;
  private interrupted = true;
  private birds: FallingTurkey[] = [];
  private wings: Wing[] = [];
  private bursts: { art: Phaser.GameObjects.Sprite; age: number }[] = [];
  private lightning: Phaser.GameObjects.Sprite;
  private ink: Phaser.GameObjects.Graphics;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  uses = 0;
  spawned = 0;
  bounces = 0;
  explosions = 0;
  hits = 0;

  constructor(private scene: Phaser.Scene, private hooks: Hooks) {
    this.lightning = scene.add.sprite(0, 0, 'turkey_storm_lightning', 0).setOrigin(.5, 1).setDepth(27).setVisible(false);
    this.ink = scene.add.graphics().setDepth(18);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }
  get age() { return this.clock - this.startedAt; }
  get casting() { return !this.interrupted && this.age < TURKEY_STORM.cast; }
  get active() { return this.casting || this.invoked && this.wave < 3 || this.birds.length > 0 || this.bursts.length > 0 || this.wings.length > 0; }
  get cooldown() { return Math.max(0, this.readyAt - this.clock); }

  start() {
    if (this.active || this.cooldown > 0) return false;
    this.startedAt = this.clock;
    this.readyAt = this.clock + TURKEY_STORM.cooldown;
    this.wave = 0;
    this.invoked = false;
    this.interrupted = false;
    this.uses++;
    playSfx('slamCharge', { pitch: .65 });
    return true;
  }

  update(ms: number, direction: number) {
    this.clock += ms;
    const dt = ms / 1000;
    const player = this.hooks.player;
    const feet = (player.body as Phaser.Physics.Arcade.Body).bottom;
    const age = this.age;
    this.ink.clear();
    if (this.casting) player.setVelocityX(0);
    if (!this.interrupted && age >= TURKEY_STORM.invoke && !this.invoked) {
      this.invoked = true;
      playSfx('storm', { pitch: .55, volume: .9 });
      if (!this.reducedMotion) this.scene.cameras.main.shake(850, .005);
    }
    const electric = !this.interrupted && age >= 330 && age < 1120;
    this.lightning.setVisible(electric);
    if (electric) {
      const flicker = Math.floor(age / 42);
      const handX = player.x + direction * 50;
      const handY = feet - 250;
      this.lightning.setPosition(handX, handY).setFrame(flicker % 4)
        .setDisplaySize(220, Math.max(170, handY - this.scene.cameras.main.worldView.top + 25))
        .setAlpha(this.reducedMotion ? .8 : flicker % 2 ? .35 : 1);
    }
    if (this.invoked && this.wave < 3 && age >= TURKEY_STORM.waves[this.wave]) this.rainWave();
    for (const bird of [...this.birds]) {
      bird.vy += 1250 * dt;
      bird.y += bird.vy * dt;
      bird.art.setPosition(bird.x, bird.y).setFrame(Math.floor(this.clock / 75) % 4)
        .setAngle(bird.bounced ? Math.sin(this.clock / 110) * 24 : Math.sin(bird.x + this.clock / 150) * 9);
      if (bird.floor !== null) {
        this.ink.lineStyle(2, 0xffdb85, .36).strokeEllipse(bird.x, bird.floor - 3, bird.bounce && !bird.bounced ? 60 : 95, 13);
        if (bird.y >= bird.floor - 20 && bird.vy > 0) {
          if (bird.bounce && !bird.bounced) {
            bird.y = bird.floor - 21;
            bird.vy = -410;
            bird.bounced = true;
            this.bounces++;
            if (!this.reducedMotion) this.scene.cameras.main.shake(80, .0025);
          } else {
            this.burst(bird.x, bird.floor - 18);
            bird.art.destroy();
            this.birds.splice(this.birds.indexOf(bird), 1);
          }
        }
      }
      if (bird.y > 850) {
        bird.art.destroy();
        this.birds.splice(this.birds.indexOf(bird), 1);
      }
    }
    for (const burst of [...this.bursts]) {
      burst.age += ms;
      burst.art.setFrame(Math.min(3, Math.floor(burst.age / 90))).setAlpha(Math.max(0, 1 - burst.age / 420));
      if (burst.age >= 420) { burst.art.destroy(); this.bursts.splice(this.bursts.indexOf(burst), 1); }
    }
    for (const wing of [...this.wings]) {
      wing.age += ms;
      wing.vy += 950 * dt;
      wing.art.x += wing.vx * dt;
      wing.art.y += wing.vy * dt;
      wing.art.setFrame(Math.floor(wing.age / 70) % 4).setAlpha(Math.max(0, 1 - wing.age / 720));
      for (const enemy of this.hooks.enemies.getChildren() as Enemy[]) {
        if (!enemy.active || wing.targets.has(enemy)) continue;
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        if (body.hitTest(wing.art.x, wing.art.y)) {
          wing.targets.add(enemy);
          if (this.hooks.damage(enemy, 1, true)) this.hits++;
        }
      }
      if (wing.age >= 720) { wing.art.destroy(); this.wings.splice(this.wings.indexOf(wing), 1); }
    }
  }

  private rainWave() {
    const camera = this.scene.cameras.main;
    const count = TURKEY_STORM.counts[this.wave];
    for (let i = 0; i < count; i++) {
      const lane = (i + .5 + (this.wave % 2 ? .14 : -.14)) / count;
      const x = camera.worldView.left + 40 + lane * (camera.width - 80);
      const y = camera.worldView.top - 45 - i * 48;
      const art = this.scene.add.sprite(x, y, 'turkey_storm_rain', i % 4).setDisplaySize(82, 82).setDepth(22);
      this.birds.push({ art, x, y, vy: 240, floor: this.hooks.floorAt(x), bounce: (i + this.wave) % 3 === 0, bounced: false });
      this.spawned++;
    }
    this.wave++;
    if (!this.reducedMotion) this.scene.cameras.main.shake(170, .003);
  }

  private burst(x: number, y: number) {
    this.explosions++;
    this.bursts.push({ art: this.scene.add.sprite(x, y, 'turkey_storm_burst', 0).setDisplaySize(150, 150).setDepth(24), age: 0 });
    playSfx('explosion', { pitch: 1.15, volume: .2 });
    if (!this.reducedMotion) this.scene.cameras.main.shake(95, .0035);
    for (const enemy of this.hooks.enemies.getChildren() as Enemy[]) {
      if (!enemy.active) continue;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(x, y, 88), new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height))
        && this.hooks.damage(enemy, 4, true)) this.hits++;
    }
    for (let i = 0; i < 4; i++) this.wings.push({
      art: this.scene.add.sprite(x, y, 'turkey_storm_wings', i).setDisplaySize(39, 39).setDepth(25),
      vx: (i - 1.5) * 120, vy: -240 - i % 2 * 90, age: 0, targets: new Set(),
    });
  }

  interrupt(clear = false) {
    this.interrupted = true;
    this.lightning.setVisible(false);
    if (!this.invoked) this.wave = 3;
    if (clear) {
      this.wave = 3;
      for (const object of [...this.birds, ...this.bursts, ...this.wings]) object.art.destroy();
      this.birds = []; this.bursts = []; this.wings = [];
      this.ink.clear();
    }
  }
  read() {
    return { uses: this.uses, active: this.active, casting: this.casting, wave: this.wave, spawned: this.spawned,
      bounces: this.bounces, explosions: this.explosions, hits: this.hits, birds: this.birds.map(bird => ({ x: Math.round(bird.x), y: Math.round(bird.y), bounced: bird.bounced })),
      bursts: this.bursts.length, wings: this.wings.length, lightning: this.lightning.visible, cooldownRemainingMs: this.cooldown };
  }
  destroy() { this.interrupt(true); this.lightning.destroy(); this.ink.destroy(); }
}
