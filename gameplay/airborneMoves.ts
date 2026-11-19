import Phaser from 'phaser';
import { playSfx } from '../audio/gameAudio';
import {SLAM_SOUNDS} from '../audio/soundBank';
import type {CharacterId} from '../types';
import {HERO_MOBILITY,hasNewMobilityArt} from './heroMobility';
import {sizeCharacter} from './characterSizing';
import {SHADOW_ART} from './shadowKid';
import {ELYTRON_ART} from './elytron';

type Enemy = Phaser.Physics.Arcade.Sprite;
type BombPhase = 'ready' | 'windup' | 'diving' | 'landing';
interface Hooks {
  player: Enemy;
  enemies: Phaser.Physics.Arcade.Group;
  projectiles: Phaser.Physics.Arcade.Group;
  facing: () => number;
  equipment?:()=>string;
  canUse: () => boolean;
  clearLine: (enemy: Enemy) => boolean;
  damage: (enemy: Enemy, amount: number, direct: boolean) => boolean;
  smashSources?: (enemy: Enemy) => Phaser.GameObjects.Sprite[];
  damageProps?: (area: Phaser.Geom.Rectangle, amount: number) => void;
  impact?: (x:number,y:number)=>void;
}

/** Airborne moves share the ordinary player collider, input edges and scene clock. */
export class AirborneMoves {
  private actor: Phaser.GameObjects.Sprite;
  private ink: Phaser.GameObjects.Graphics;
  private available = true;
  private jumpAt = -9999;
  private phase: BombPhase = 'ready';
  private phaseAt = -9999;
  private impact: { x: number; y: number; at: number; left: number; right: number } | null = null;
  private knockouts = new Set<Phaser.GameObjects.Sprite>();
  private targets = new Set<Enemy>();
  private diveBottom = 0;
  private smashes = new Map<Phaser.GameObjects.Sprite, Map<Phaser.GameObjects.Sprite, number>>();
  private hidden = false;
  private alive = true;
  private jumps = 0;
  private bombs = 0;
  private impacts = 0;
  private hits = 0;
  private clearedShots = 0;
  private screenClears = 0;

  constructor(private scene: Phaser.Scene, private hooks: Hooks, readonly hero: CharacterId) {
    this.actor = scene.add.sprite(0, 0, hero==='turkey_king'?'turkey_king_body':hasNewMobilityArt(hero)?'hero_mobility':`${hero}_double_jump`, '0')
      .setOrigin(.5, 220/256).setScale(hero === 'zgod' ? .56 : hero==='xgod'?.78:hero==='killer_kai'?.88:.72).setDepth(24).setVisible(false);
    this.ink = scene.add.graphics().setDepth(23);
    if(hero==='shadow_kid')this.actor.setOrigin(.5,352/384).setScale(SHADOW_ART.scale);
    if(hero==='elytron')this.actor.setOrigin(.5,ELYTRON_ART.baseline/ELYTRON_ART.height).setScale(ELYTRON_ART.scale);
    sizeCharacter(this.actor,hero,'mobility');
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }
  get busy() { return this.phase !== 'ready'; }
  get visibleSprite() { return this.actor.visible ? this.actor : undefined; }
  get diving() { return this.phase === 'diving'; }
  private get body() { return this.hooks.player.body as Phaser.Physics.Arcade.Body; }

  doubleJump(speed: number) {
    if (!this.available || this.busy || !this.hooks.canUse()) return false;
    this.available = false;
    this.jumpAt = this.scene.time.now;
    this.jumps++;
    this.body.blocked.down = this.body.touching.down = false;
    this.body.setVelocityY(-speed);
    playSfx('doubleJump');
    return true;
  }

  startBomb() {
    if (this.busy || !this.hooks.canUse()) return false;
    this.phase = 'windup'; this.phaseAt = this.scene.time.now;
    this.jumpAt = -9999; this.targets.clear(); this.bombs++;
    this.diveBottom = this.body.bottom;
    this.body.setAllowGravity(false).setVelocity(0, 0);
    playSfx('slamCharge');
    return true;
  }

  /** A fresh third jump press chains into the slam after the extra jump is spent. */
  bombAfterDoubleJump() {
    return !this.available && this.startBomb();
  }

  update(grounded: boolean) {
    const now = this.scene.time.now, body = this.body;
    if (this.diving && this.isButtBomb) {
      for (const child of this.hooks.enemies.getChildren()) {
        const enemy = child as Enemy;
        if (this.crossesEnemyTop(enemy)) this.hit(enemy,HERO_MOBILITY[this.hero].direct,true);
      }
      this.diveBottom = body.bottom;
    }
    if (grounded && body.velocity.y >= 0) {
      this.available = true; this.jumpAt = -9999;
      if (this.phase === 'diving') this.land();
    }
    if (this.phase === 'windup') {
      body.setVelocity(0, 0);
      if (now-this.phaseAt >= 150) {
        this.phase = 'diving'; this.phaseAt = now;
        this.diveBottom = body.bottom;
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
    if (!this.diving) return false;
    if (this.targets.has(enemy)) return true;
    if (!fromAbove && !(this.isButtBomb && this.crossesEnemyTop(enemy))) return false;
    this.hit(enemy, HERO_MOBILITY[this.hero].direct,true);
    return true;
  }

  private get isButtBomb() { return this.hero === 'xgod' || this.hero === 'elytron'; }

  private crossesEnemyTop(enemy: Enemy) {
    if (!enemy.active || this.targets.has(enemy) || !this.hooks.clearLine(enemy)) return false;
    const player = this.body, target = enemy.body as Phaser.Physics.Arcade.Body;
    return target.enable && player.right > target.left+3 && player.left < target.right-3
      && this.diveBottom <= target.top+16 && player.bottom >= target.top
      && player.bottom >= this.diveBottom;
  }

  private hit(enemy: Enemy, amount: number, direct = false) {
    if (!enemy.active || this.targets.has(enemy)) return;
    this.targets.add(enemy);
    const star = this.hero === 'zgod';
    // Keep a brief airborne KO pose after the real enemy is defeated. Bosses use
    // their established collapse/reward sequence instead of a second death copy.
    const copy = star && enemy.getData('kind') !== 'boss' ? this.scene.add.sprite(enemy.x, enemy.y, enemy.texture.key, enemy.frame.name)
      .setOrigin(enemy.originX, enemy.originY).setScale(enemy.scaleX, enemy.scaleY)
      .setRotation(enemy.rotation).setFlip(enemy.flipX, enemy.flipY).setDepth(22) : null;
    const sources = this.isButtBomb ? this.hooks.smashSources?.(enemy) ?? [enemy] : [];
    const source = sources[0];
    const smash = source ? this.scene.add.sprite(source.x,source.y,source.texture.key,source.frame.name)
      .setOrigin(source.originX,source.originY).setFlip(source.flipX,source.flipY)
      .setScale(source.scaleX*1.17,source.scaleY*.47).setDepth(23) : null;
    if (!this.hooks.damage(enemy, star ? Number(enemy.getData('hp')) : amount,direct)) {
      copy?.destroy();smash?.destroy();return;
    }
    this.hits++;
    if (smash) this.presentSmash(sources,smash);
    if (copy) {
      this.knockouts.add(copy);
      const direction = copy.x < this.body.center.x ? -1 : 1;
      this.scene.tweens.add({ targets: copy, x: copy.x+direction*170, y: copy.y-150,
        angle: direction*55, alpha: 0, duration: 550, ease: 'Quad.out',
        onComplete: () => { this.knockouts.delete(copy); copy.destroy(); } });
    }
    if (enemy.active && enemy.getData('kind') !== 'boss') {
      const move=HERO_MOBILITY[this.hero];
      enemy.setData('specialStunUntil', this.scene.time.now+move.stun);
      if(this.hero==='teleportation_c')enemy.setData('slamPullX',this.body.center.x).setData('slamPullUntil',this.scene.time.now+move.stun);
      enemy.setVelocity(this.hero==='teleportation_c'?Math.sign(this.body.center.x-enemy.x)*180:0, -move.launch);
    }
  }

  private presentSmash(sources: Phaser.GameObjects.Sprite[], pose: Phaser.GameObjects.Sprite) {
    this.smashes.set(pose,new Map(sources.filter(source=>source.active).map(source=>[source,source.alpha])));
    this.refreshSmashVisibility();
    pose.setTint(0xffdda1);
    playSfx('enemyHit',{pitch:1.35,volume:.8});
    this.scene.tweens.add({
      targets:pose, scaleX:pose.scaleX*.94, scaleY:pose.scaleY*1.48,
      alpha:{value:0,delay:65,duration:125}, duration:190, ease:'quad.in',
      onComplete:()=>this.endSmash(pose),
    });
  }

  refreshSmashVisibility() {
    for (const sources of this.smashes.values()) {
      for (const source of sources.keys()) {
        if (!source.active || source.alpha === 0) continue;
        // A boss can swap to a separate attack sprite and refresh its opacity during update.
        sources.set(source,source.alpha);
        source.setAlpha(0);
      }
    }
  }

  private endSmash(pose: Phaser.GameObjects.Sprite) {
    for (const [source,alpha] of this.smashes.get(pose) ?? []) {
      if (source.active && source.alpha === 0) source.setAlpha(alpha);
    }
    this.smashes.delete(pose);
    pose.destroy();
  }

  private land() {
    const body = this.body, now = this.scene.time.now;
    this.phase = 'landing'; this.phaseAt = now; this.impacts++;
    const camera = this.scene.cameras.main;
    this.impact = { x: body.center.x, y: body.bottom, at: now, left: camera.scrollX, right: camera.scrollX+camera.width };
    this.hooks.impact?.(body.center.x,body.bottom);
    const move=HERO_MOBILITY[this.hero];
    const area = new Phaser.Geom.Rectangle(body.center.x-move.radius, body.bottom-move.height, move.radius*2, move.height+15);
    // Hit props once on impact, not once per dive or recovery frame.
    this.hooks.damageProps?.(area,move.wave);
    if (this.hero === 'zgod') {
      this.clearScreen();
      this.scene.cameras.main.shake(220, .005);
      playSfx(SLAM_SOUNDS[this.hero]);
      return;
    }
    for (const enemy of [...this.hooks.enemies.getChildren()] as Enemy[]) {
      if (!enemy.active || !this.hooks.clearLine(enemy)) continue;
      const b = enemy.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Geom.Intersects.RectangleToRectangle(area, new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height))) this.hit(enemy, move.wave);
    }
    if(this.hero==='nico')for(const shot of [...this.hooks.projectiles.getChildren()] as Enemy[]){
      if(shot.active&&shot.getData('enemyProjectile')&&Phaser.Math.Distance.Between(body.center.x,body.bottom-45,shot.x,shot.y)<=move.radius){shot.destroy();this.clearedShots++;}
    }
    this.scene.cameras.main.shake(130, .0035);
    playSfx(SLAM_SOUNDS[this.hero]);
  }

  private clearScreen() {
    this.screenClears++;
    const camera = this.scene.cameras.main;
    const view = new Phaser.Geom.Rectangle(camera.scrollX, camera.scrollY, camera.width, camera.height);
    const visible = (sprite: Enemy) => {
      const b = sprite.body as Phaser.Physics.Arcade.Body;
      return b?.enable && Phaser.Geom.Intersects.RectangleToRectangle(view,
        new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height));
    };
    // Screen-wide power deliberately crosses platforms and defeats guarded bosses.
    for (const shot of [...this.hooks.projectiles.getChildren()] as Enemy[]) {
      if (shot.active && shot.getData('enemyProjectile') && visible(shot)) {
        shot.destroy(); this.clearedShots++;
      }
    }
    for (const enemy of [...this.hooks.enemies.getChildren()] as Enemy[]) {
      if (enemy.active && visible(enemy)) this.hit(enemy, Number(enemy.getData('hp')));
    }
  }

  present(obscured: boolean, hidePlayer: boolean, crouch?:{equipment:string;firing:boolean}) {
    if (!this.alive || !this.hooks.player.active) return;
    const now = this.scene.time.now, age = now-this.jumpAt;
    const spin = age < 420;
    const duck=Boolean(crouch)&&hasNewMobilityArt(this.hero)&&this.hero!=='elytron'&&!this.busy;
    const visible = !obscured && (this.busy || spin || duck);
    this.actor.setVisible(visible);
    if (visible) {
      const frame = this.phase === 'windup' ? (now-this.phaseAt < 80 ? 0 : 1)
        : this.phase === 'diving' ? 2
        : this.phase === 'landing' ? 3+Math.min(2, Math.floor((now-this.phaseAt)/100))
        : Math.min(5, Math.floor(age/70));
      const newFrame=duck?(crouch!.equipment==='blaster'?10:crouch!.equipment==='frost'?14:crouch!.equipment==='sword'?12:8)+(crouch!.firing?1:0)
        :this.phase==='windup'?4:this.phase==='diving'?5:this.phase==='landing'?(now-this.phaseAt<180?6:7):Math.min(3,Math.floor(age/105));
      this.actor.setTexture(this.hero==='turkey_king'?'turkey_king_body':hasNewMobilityArt(this.hero)?'hero_mobility':this.busy ? this.hero === 'zgod' ? 'zgod_ground_punch' : 'xgod_butt_bomb' : `${this.hero}_double_jump`, String(this.hero==='turkey_king'?5:hasNewMobilityArt(this.hero)?newFrame:frame))
        .setPosition(this.hooks.player.x, this.body.bottom).setFlipX(this.hooks.facing()<0);
      if(this.hero==='elytron')this.actor.setFrame(String(this.phase==='windup'?4:this.phase==='diving'?5:this.phase==='landing'?(now-this.phaseAt<180?6:7):Math.min(3,Math.floor(age/105))));
      if(this.hero==='turkey_king')this.actor.setTexture('turkey_king_body',this.phase==='landing'?11:this.phase==='windup'?8:this.phase==='diving'||this.body.velocity.y>0?10:9).setOrigin(.5,600/640);
      if(this.hero==='xgod'){
        if(this.hooks.equipment?.()==='frost'){
          const crouched=this.phase==='windup'||this.phase==='landing';
          this.actor.setTexture(crouched?'hero_frost_crouch':'hero_frost_jump',String(crouched?1:this.phase==='diving'?3:Math.min(2,1+Math.floor(age/200))))
            .setOrigin(.5,480/512);
          sizeCharacter(this.actor,this.hero);
        }else{
          this.actor.setOrigin(.5,220/256);sizeCharacter(this.actor,this.hero,'mobility');
        }
      }
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
    const star = this.hero === 'zgod';
    const p = (now-this.impact.at)/(star ? 700 : 420);
    if (p >= 1) { this.impact = null; return; }
    const {x,y} = this.impact;
    if (star) {
      const reach = Math.max(x-this.impact.left, this.impact.right-x)+80;
      const radius = 30+p*reach;
      this.ink.lineStyle(9, 0xff8fe0, (1-p)*.8).strokeEllipse(x, y-5, radius*2, 32+p*110);
      this.ink.lineStyle(4, 0xffed9d, 1-p).strokeEllipse(x, y-5, radius*2+14, 45+p*110);
      // Two bright shock fronts race toward opposite edges of the visible screen.
      for (const direction of [-1, 1]) {
        const front = x+direction*radius;
        this.ink.lineStyle(8, 0xffb2ed, 1-p).lineBetween(front-direction*30, y-7, front, y-85)
          .lineBetween(front, y-85, front+direction*18, y-12);
        for (let i=0; i<4; i++) {
          const sx = front-direction*i*28, sy = y-24-Math.sin(p*Math.PI)*(30+i*16), r = 7+i%2*4;
          const points = Array.from({ length: 10 }, (_, n) => {
            const angle = -Math.PI/2+n*Math.PI/5+p*2, radius = n%2 ? r*.45 : r;
            return { x: sx+Math.cos(angle)*radius, y: sy+Math.sin(angle)*radius };
          });
          this.ink.fillStyle(i%2 ? 0xffed9d : 0xff9bde, 1-p).fillPoints(points, true);
        }
      }
      return;
    }
    const move=HERO_MOBILITY[this.hero];
    this.ink.lineStyle(6, move.color, 1-p).strokeEllipse(x, y-3, 60+p*move.radius*1.7, 15+p*35);
    if(this.hero==='ezra')for(let i=0;i<7;i++){
      const fx=x+(i-3)*42;
      this.ink.lineStyle(7,move.color,1-p).lineBetween(fx-13,y-5,fx,y-35-Math.sin(p*Math.PI)*110).lineBetween(fx,y-35-Math.sin(p*Math.PI)*110,fx+13,y-5);
    }
    if(this.hero==='teleportation_c')this.ink.lineStyle(3,0xf2e5ff,1-p).strokeEllipse(x,y-6,move.radius*2*(1-p),35);
    if(this.hero==='nico')this.ink.lineStyle(4,0xffdf8c,1-p).strokeCircle(x,y-45,20+p*move.radius);
    for (let i=0; i<8; i++) {
      const dx = (i-3.5)*14*(1+p*2);
      this.ink.fillStyle(i%2 ? 0xd9bb91 : 0xf9dfa9, (1-p)*.8)
        .fillEllipse(x+dx, y-8-Math.sin(p*Math.PI)*(12+i%3*10), 14+p*18, 10+p*10);
    }
  }

  read() {
    return { doubleJumpAvailable: this.available, doubleJumps: this.jumps, bombPhase: this.phase,
      bombs: this.bombs, impacts: this.impacts, hits: this.hits,
      name: HERO_MOBILITY[this.hero].name, screenClears: this.screenClears,
      clearedShots: this.clearedShots, shockwaveActive: Boolean(this.impact), knockoutPoses: this.knockouts.size,
      smashPoses: this.smashes.size,
      texture: this.actor.visible ? this.actor.texture.key : null,
      frame: this.actor.visible ? Number(this.actor.frame.name) : null };
  }

  cancel(refill = false) {
    this.phase = 'ready'; this.jumpAt = -9999; this.impact = null;
    if (refill) this.available = true;
    this.targets.clear(); this.actor.setVisible(false); this.ink.clear();
    for (const copy of this.knockouts) { this.scene.tweens.killTweensOf(copy); copy.destroy(); }
    this.knockouts.clear();
    for (const pose of this.smashes.keys()) {
      this.scene.tweens.killTweensOf(pose);
      this.endSmash(pose);
    }
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
