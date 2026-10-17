import Phaser from 'phaser';
import { playSfx } from '../audio/gameAudio';

type Enemy = Phaser.Physics.Arcade.Sprite;
type BombPhase = 'ready' | 'windup' | 'diving' | 'landing';
interface Hooks {
  player: Enemy;
  enemies: Phaser.Physics.Arcade.Group;
  facing: () => number;
  canUse: () => boolean;
  clearLine: (enemy: Enemy) => boolean;
  damage: (enemy: Enemy, amount: number) => boolean;
}

/** X God's airborne moves share the ordinary player collider and scene clock. */
export class XGodMobility {
  private actor: Phaser.GameObjects.Sprite;
  private ink: Phaser.GameObjects.Graphics;
  private available = true;
  private jumpAt = -9999;
  private phase: BombPhase = 'ready';
  private phaseAt = -9999;
  private impact: { x: number; y: number; at: number } | null = null;
  private targets = new Set<Enemy>();
  private hidden = false;
  private alive = true;
  private jumps = 0;
  private bombs = 0;
  private impacts = 0;
  private hits = 0;

  constructor(private scene: Phaser.Scene, private hooks: Hooks) {
    this.actor = scene.add.sprite(0, 0, 'xgod_double_jump', '0')
      .setOrigin(.5, 220/256).setScale(.78).setDepth(24).setVisible(false);
    this.ink = scene.add.graphics().setDepth(23);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }
  get busy() { return this.phase !== 'ready'; }
  get diving() { return this.phase === 'diving'; }
  private get body() { return this.hooks.player.body as Phaser.Physics.Arcade.Body; }

  doubleJump(speed: number) {
    if (!this.available || this.busy || !this.hooks.canUse()) return false;
    this.available = false;
    this.jumpAt = this.scene.time.now;
    this.jumps++;
    this.body.blocked.down = this.body.touching.down = false;
    this.body.setVelocityY(-speed);
    playSfx('jump', { pitch: 1.25 });
    return true;
  }

  startBomb() {
    if (this.busy || !this.hooks.canUse()) return false;
    this.phase = 'windup'; this.phaseAt = this.scene.time.now;
    this.jumpAt = -9999; this.targets.clear(); this.bombs++;
    this.body.setAllowGravity(false).setVelocity(0, 0);
    playSfx('swordSwing', { pitch: .8, volume: .35 });
    return true;
  }

  update(grounded: boolean) {
    const now = this.scene.time.now, body = this.body;
    if (grounded && body.velocity.y >= 0) {
      this.available = true; this.jumpAt = -9999;
      if (this.phase === 'diving') this.land();
    }
    if (this.phase === 'windup') {
      body.setVelocity(0, 0);
      if (now-this.phaseAt >= 150) {
        this.phase = 'diving'; this.phaseAt = now;
        body.setAllowGravity(true).setVelocityY(900);
      }
    } else if (this.phase === 'diving') body.setVelocity(0, 900);
    else if (this.phase === 'landing') {
      body.setVelocityX(0);
      if (now-this.phaseAt >= 300) this.phase = 'ready';
    }
    this.drawImpact(now);
  }

  /** A clean head hit keeps the dive going, with one hit per enemy per bomb. */
  contact(enemy: Enemy, fromAbove: boolean) {
    if (this.phase === 'landing' && this.targets.has(enemy)) return true;
    if (!this.diving || (!fromAbove && !this.targets.has(enemy))) return false;
    this.hit(enemy, 6);
    return true;
  }

  private hit(enemy: Enemy, amount: number) {
    if (this.targets.has(enemy)) return;
    this.targets.add(enemy);
    if (!this.hooks.damage(enemy, amount)) return;
    this.hits++;
    if (enemy.active && enemy.getData('kind') !== 'boss') {
      enemy.setData('specialStunUntil', this.scene.time.now+450);
      enemy.setVelocity(0, -280);
    }
  }

  private land() {
    const body = this.body, now = this.scene.time.now;
    this.phase = 'landing'; this.phaseAt = now; this.impacts++;
    this.impact = { x: body.center.x, y: body.bottom, at: now };
    const area = new Phaser.Geom.Rectangle(body.center.x-180, body.bottom-125, 360, 140);
    for (const enemy of [...this.hooks.enemies.getChildren()] as Enemy[]) {
      if (!enemy.active || !this.hooks.clearLine(enemy)) continue;
      const b = enemy.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Geom.Intersects.RectangleToRectangle(area, new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height))) this.hit(enemy, 4);
    }
    this.scene.cameras.main.shake(130, .0035);
    playSfx('stomp', { pitch: .7 });
  }

  present(obscured: boolean, hidePlayer: boolean) {
    if (!this.alive || !this.hooks.player.active) return;
    const now = this.scene.time.now, age = now-this.jumpAt;
    const spin = age < 420;
    const visible = !obscured && (this.busy || spin);
    this.actor.setVisible(visible);
    if (visible) {
      const frame = this.phase === 'windup' ? (now-this.phaseAt < 80 ? 0 : 1)
        : this.phase === 'diving' ? 2
        : this.phase === 'landing' ? 3+Math.min(2, Math.floor((now-this.phaseAt)/100))
        : Math.min(5, Math.floor(age/70));
      this.actor.setTexture(this.busy ? 'xgod_butt_bomb' : 'xgod_double_jump', String(frame))
        .setPosition(this.hooks.player.x, this.body.bottom).setFlipX(this.hooks.facing()<0);
      this.hooks.player.setVisible(false); this.hidden = true;
    } else if (this.hidden) {
      // An obscuring attack/death visual owns player visibility until it ends.
      if (!hidePlayer) this.hooks.player.setVisible(true);
      this.hidden = false;
    }
  }

  private drawImpact(now: number) {
    this.ink.clear();
    if (!this.impact) return;
    const p = (now-this.impact.at)/420;
    if (p >= 1) { this.impact = null; return; }
    const {x,y} = this.impact;
    this.ink.lineStyle(6, 0xffcb69, 1-p).strokeEllipse(x, y-3, 60+p*300, 15+p*35);
    for (let i=0; i<8; i++) {
      const dx = (i-3.5)*14*(1+p*2);
      this.ink.fillStyle(i%2 ? 0xd9bb91 : 0xf9dfa9, (1-p)*.8)
        .fillEllipse(x+dx, y-8-Math.sin(p*Math.PI)*(12+i%3*10), 14+p*18, 10+p*10);
    }
  }

  read() {
    return { doubleJumpAvailable: this.available, doubleJumps: this.jumps, bombPhase: this.phase,
      bombs: this.bombs, impacts: this.impacts, hits: this.hits,
      texture: this.actor.visible ? this.actor.texture.key : null,
      frame: this.actor.visible ? Number(this.actor.frame.name) : null };
  }

  cancel(refill = false) {
    this.phase = 'ready'; this.jumpAt = -9999; this.impact = null;
    if (refill) this.available = true;
    this.targets.clear(); this.actor.setVisible(false); this.ink.clear();
    if (this.hooks.player.active) {
      this.body.setAllowGravity(true);
      if (this.hidden) this.hooks.player.setVisible(true);
    }
    this.hidden = false;
  }
  destroy() {
    if (!this.alive) return;
    this.cancel(); this.alive = false; this.actor.destroy(); this.ink.destroy();
  }
}
