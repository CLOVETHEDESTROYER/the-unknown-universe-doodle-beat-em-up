
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameStats } from '../types';

interface GameEngineProps {
  isPaused: boolean;
  currentLevel: number;
  playerSprite: string | null;
  onStatsUpdate: (stats: Partial<GameStats>) => void;
  onTogglePause: () => void;
}

type MonsterType = 'CHASER' | 'DASHER' | 'FLOATER' | 'GIANT' | 'DEVIL' | 'BOSS';
type DestructibleType = 'TRASH' | 'BOX' | 'BOOKS' | 'VENDING';

const GameEngine: React.FC<GameEngineProps> = ({ isPaused, currentLevel, playerSprite, onStatsUpdate, onTogglePause }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Perspective Constants
  const SCREEN_WIDTH = 1024;
  const SCREEN_HEIGHT = 576;
  const HORIZON_Y = SCREEN_HEIGHT * 0.6;
  const FLOOR_BOTTOM = SCREEN_HEIGHT - 20;

  // --- TUNING CONSTANTS ---
  const PLAYER_SCALE = 0.5;
  const FRAME_WIDTH = 200; // 1606 / 8 ≈ 200
  const FRAME_HEIGHT = 327;
  const FALLBACK_FRAME_SIZE = 180;
  // ------------------------

  const getAudioContext = () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();

        // Resume audio context on first user interaction
        const resumeAudio = () => {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              window.removeEventListener('click', resumeAudio);
              window.removeEventListener('keydown', resumeAudio);
            });
          }
        };

        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
      }
      return audioContextRef.current;
    } catch (e) {
      return null;
    }
  };

  const playSound = (config: {
    type?: OscillatorType;
    freq?: number;
    endFreq?: number;
    volume?: number;
    duration?: number;
    noise?: boolean;
  }) => {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'closed') return;

      const duration = config.duration || 0.1;
      const volume = config.volume || 0.1;

      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      if (config.noise) {
        const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        source.start();
        source.stop(ctx.currentTime + duration);
      } else {
        const osc = ctx.createOscillator();
        osc.type = config.type || 'sine';
        osc.frequency.setValueAtTime(config.freq || 440, ctx.currentTime);
        if (config.endFreq) {
          osc.frequency.exponentialRampToValueAtTime(config.endFreq, ctx.currentTime + duration);
        }
        osc.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch (e) {
      console.warn("Sound generation failed:", e);
    }
  };

  const sounds = {
    soul: () => playSound({ freq: 880, endFreq: 1200, volume: 0.1, duration: 0.15, type: 'sine' }),
    attack: () => playSound({ freq: 300, endFreq: 100, volume: 0.05, duration: 0.1, type: 'sawtooth' }),
    slam: () => playSound({ freq: 150, endFreq: 50, volume: 0.2, duration: 0.2, type: 'square' }),
    hit: () => playSound({ noise: true, volume: 0.08, duration: 0.05 }),
    hurt: () => playSound({ freq: 150, endFreq: 50, volume: 0.2, duration: 0.3, type: 'square' }),
    health: () => {
      playSound({ freq: 440, volume: 0.1, duration: 0.1 });
      setTimeout(() => playSound({ freq: 554, volume: 0.1, duration: 0.1 }), 50);
      setTimeout(() => playSound({ freq: 659, volume: 0.1, duration: 0.1 }), 100);
    },
    trash: () => playSound({ noise: true, volume: 0.1, duration: 0.2 }),
    growl: () => playSound({ freq: 120, endFreq: 40, volume: 0.2, duration: 0.6, type: 'sawtooth' }),
    bossShoot: () => playSound({ freq: 400, endFreq: 800, volume: 0.15, duration: 0.2, type: 'triangle' }),
    dash: () => playSound({ noise: true, volume: 0.08, duration: 0.15 }),
    jump: () => playSound({ freq: 200, endFreq: 600, volume: 0.1, duration: 0.2, type: 'sine' }),
    fanfare: () => {
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        setTimeout(() => playSound({ freq: f, volume: 0.1, duration: 0.4, type: 'triangle' }), i * 150);
      });
    }
  };

  useEffect(() => {
    if (!gameRef.current) return;
    const activeScenes = gameRef.current.scene.getScenes(true);
    activeScenes.forEach(scene => {
      if (isPaused) scene.scene.pause();
      else scene.scene.resume();
    });
  }, [isPaused]);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      parent: gameContainerRef.current,
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
      },
      scene: { preload, create, update }
    };

    let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let playerShadow: Phaser.GameObjects.Graphics;
    let attackHitbox: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    let attackVisual: Phaser.GameObjects.Graphics;
    let backgroundGraphics: Phaser.GameObjects.Graphics;
    let backgroundSprite: Phaser.GameObjects.TileSprite;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let attackKey: Phaser.Input.Keyboard.Key;
    let jumpKey: Phaser.Input.Keyboard.Key;
    let dashKey: Phaser.Input.Keyboard.Key;
    let pauseKey: Phaser.Input.Keyboard.Key;
    let keepMovingPrompt: Phaser.GameObjects.Container;
    let transitionOverlay: Phaser.GameObjects.Container;

    let souls: Phaser.Physics.Arcade.Group;
    let monsters: Phaser.Physics.Arcade.Group;
    let projectiles: Phaser.Physics.Arcade.Group;
    let destructibles: Phaser.Physics.Arcade.Group;
    let healthUpgrades: Phaser.Physics.Arcade.Group;
    let healthGraphics: Phaser.GameObjects.Graphics;

    let currentSouls = 0;
    let currentKills = 0;
    let playerHealth = 100;
    let playerLives = 3;
    let isAttacking = false;
    let isSlamming = false;
    let playerInvulnerable = false;
    let facingDirection = 1;
    let lastDestructibleSpawnX = 0;
    let isLevelTransitioning = false;
    let isDazed = false;

    // Jump & Dash State
    let isJumping = false;
    let jumpZ = 0;
    let jumpVelocity = 0;
    const jumpGravity = -0.7;
    let isDashing = false;
    let dashCooldown = 0;

    let currentSectionIndex = 0;
    let isFightingWave = false;
    let lastMovementTime = 0;
    const fightSections = [800, 1600, 2400, 3200];

    function preload(this: Phaser.Scene) {
      if (playerSprite) {
        this.load.spritesheet('player_walk', playerSprite, {
          frameWidth: FALLBACK_FRAME_SIZE,
          frameHeight: FALLBACK_FRAME_SIZE
        });
      } else {
        this.load.spritesheet('player_walk_internal', 'player_walk.png', {
          frameWidth: FRAME_WIDTH,
          frameHeight: FRAME_HEIGHT
        });
      }
      this.load.image('player_jump', 'player_jump.png');
      this.load.image('player_buttbomb', 'player_buttbomb.png');
      this.load.image('player_attack', 'player_attack.png');
      this.load.image('player_dazed', 'player_dazed.png');
      this.load.image('player_dead', 'player_dead.png');
      this.load.image('ghost_float', 'ghost_float.png');
      this.load.image('background_alley', 'background_alley.png');
      this.load.spritesheet('player_dash', 'player_dash.png', {
        frameWidth: 221, // 887 / 4
        frameHeight: 266
      });
      this.load.spritesheet('grunt_walking', 'grunt_walking.png', {
        frameWidth: 335,
        frameHeight: 420
      });
      this.load.spritesheet('grunt_dead', 'grunt_dead.png', {
        frameWidth: 335,
        frameHeight: 419 // Actual height from file
      });
      this.load.image('grunt_pile', 'grunt_pile.png');
    }

    function create(this: Phaser.Scene) {
      const scene = this;

      // Add scrolling background
      backgroundSprite = scene.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'background_alley')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-20);

      // Keep some floor graphics for depth perception
      backgroundGraphics = scene.add.graphics().setDepth(-10);
      backgroundGraphics.fillStyle(0x94a3b8, 0.3).fillRect(0, HORIZON_Y, 4096, SCREEN_HEIGHT - HORIZON_Y);

      scene.physics.world.setBounds(0, HORIZON_Y, 4096, FLOOR_BOTTOM - HORIZON_Y);
      scene.cameras.main.setBounds(0, 0, 4096, SCREEN_HEIGHT);

      const animKey = playerSprite ? 'player_walk' : (scene.textures.exists('player_walk_internal') ? 'player_walk_internal' : null);

      if (animKey) {
        const texture = scene.textures.get(animKey);
        const frameCount = texture.frameTotal;

        // Only create animations if we actually have frames to work with
        if (frameCount > 1) {
          scene.anims.create({
            key: 'walk',
            frames: scene.anims.generateFrameNumbers(animKey, { start: 0, end: frameCount - 2 }),
            frameRate: 10,
            repeat: -1
          });
          scene.anims.create({
            key: 'idle',
            frames: [{ key: animKey, frame: 0 }],
            frameRate: 1
          });
          scene.anims.create({
            key: 'jump_pose',
            frames: [{ key: animKey, frame: Math.min(1, frameCount - 1) }],
            frameRate: 1
          });
          scene.anims.create({
            key: 'dash',
            frames: scene.anims.generateFrameNumbers('player_dash', { start: 0, end: 3 }),
            frameRate: 15,
            repeat: -1
          });
        }
      }

      if (scene.textures.exists('grunt_walking')) {
        scene.anims.create({
          key: 'grunt_walk',
          frames: scene.anims.generateFrameNumbers('grunt_walking', { start: 0, end: 3 }),
          frameRate: 12,
          repeat: -1
        });
      }
      if (scene.textures.exists('grunt_dead')) {
        scene.anims.create({
          key: 'grunt_die',
          frames: scene.anims.generateFrameNumbers('grunt_dead', { start: 0, end: 1 }),
          frameRate: 12,
          repeat: 0
        });
      }

      const emojis = [
        { key: 'p_happy', char: '😄' }, { key: 'm_devil', char: '😈' },
        { key: 'm_ghost', char: '👻' }, { key: 'm_alien', char: '👽' }, { key: 'm_boss', char: '👹' },
        { key: 'h_heart', char: '💖' }, { key: 'o_trash', char: '🗑️' }, { key: 'o_box', char: '📦' },
        { key: 'o_books', char: '📚' }, { key: 'o_vending', char: '🥤' }, { key: 'ink_splat', char: '⚫' },
        { key: 'impact_vfx', char: '💥' }, { key: 'scrap', char: '📄' }
      ];

      emojis.forEach(e => {
        if (!scene.textures.exists(e.key)) {
          const txt = scene.make.text({
            x: 0, y: 0,
            text: e.char,
            style: { fontSize: '64px', color: '#ffffff', fontFamily: 'Arial' }
          });
          scene.textures.addCanvas(e.key, txt.canvas);
        }
      });

      if (!scene.textures.exists('soulTexture')) {
        scene.make.graphics({ x: 0, y: 0 }, false).fillStyle(0xfacc15).fillCircle(10, 10, 10).generateTexture('soulTexture', 20, 20);
      }

      souls = scene.physics.add.group();
      monsters = scene.physics.add.group();
      projectiles = scene.physics.add.group();
      destructibles = scene.physics.add.group();
      healthUpgrades = scene.physics.add.group();
      healthGraphics = scene.add.graphics().setDepth(10000);
      attackVisual = scene.add.graphics().setDepth(5000);
      playerShadow = scene.add.graphics().setDepth(HORIZON_Y - 5);

      const arrowTxt = scene.add.text(0, 0, 'KEEP MOVING! ➡️', {
        fontFamily: 'Gochi Hand', fontSize: '56px', color: '#ff4444', stroke: '#ffffff', strokeThickness: 8
      }).setOrigin(0.5);
      keepMovingPrompt = scene.add.container(200, HORIZON_Y + 50, [arrowTxt]);
      keepMovingPrompt.setScrollFactor(0).setVisible(false).setDepth(10001);

      const transitionBg = scene.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, 200, 0x1e293b, 0.9).setOrigin(0.5);
      const transitionTitle = scene.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, `LEVEL ${currentLevel} STARTING...`, {
        fontFamily: 'Gochi Hand', fontSize: '80px', color: '#ffffff', stroke: '#000000', strokeThickness: 10
      }).setOrigin(0.5);
      transitionOverlay = scene.add.container(0, 0, [transitionBg, transitionTitle]).setScrollFactor(0).setDepth(20000).setAlpha(0);

      const activeTexture = animKey || 'p_happy';

      // CRITICAL FIX: Pass '0' as the 4th argument to specify we want the first slice of the spritesheet
      player = scene.physics.add.sprite(200, (HORIZON_Y + FLOOR_BOTTOM) / 2, activeTexture, 0);

      player.setCollideWorldBounds(true);
      player.setOrigin(0.5, 0.9);
      player.setScale(PLAYER_SCALE);
      player.setSize(80, 120);
      player.setOffset(50, 40);

      attackHitbox = scene.physics.add.image(0, 0, '').setVisible(false).setSize(120, 80);

      scene.cameras.main.startFollow(player, true, 0.1, 0.1);
      for (let i = 0; i < 5; i++) spawnSoul(scene, Phaser.Math.Between(100, 600));
      spawnDestructible(scene, 400);
      spawnDestructible(scene, 650);

      // Overlaps
      scene.physics.add.overlap(player, souls, (p, s) => { if (jumpZ < 40) { (s as Phaser.Physics.Arcade.Sprite).destroy(); sounds.soul(); currentSouls++; onStatsUpdate({ souls: currentSouls }); if (currentSouls % 5 === 0) spawnHealth(scene, player.x, player.y - 100); } });
      scene.physics.add.overlap(player, healthUpgrades, (p, h) => { if (jumpZ < 40) { (h as Phaser.Physics.Arcade.Sprite).destroy(); sounds.health(); playerHealth = Math.min(100, playerHealth + 50); onStatsUpdate({ health: playerHealth }); } });
      scene.physics.add.overlap(attackHitbox, monsters, (hb, m) => { if (isAttacking) { const monster = m as Phaser.Physics.Arcade.Sprite; if (monster.getData('iframe')) return; sounds.hit(); takeMonsterDamage(scene, monster, 1); } });
      scene.physics.add.overlap(player, projectiles, (p, pr) => { if (!playerInvulnerable && jumpZ < 30) { (pr as Phaser.Physics.Arcade.Sprite).destroy(); takePlayerDamage(scene, 15); } });
      scene.physics.add.overlap(attackHitbox, destructibles, (hb, d) => { if (isAttacking) damageDestructible(scene, d as Phaser.Physics.Arcade.Sprite, 1); });
      scene.physics.add.overlap(monsters, destructibles, (m, d) => { const monster = m as Phaser.Physics.Arcade.Sprite; const type = monster.getData('type'); if (type === 'GIANT' || type === 'BOSS' || monster.getData('state') === 'DASHING') damageDestructible(scene, d as Phaser.Physics.Arcade.Sprite, 1); });
      scene.physics.add.overlap(player, monsters, (p, m) => { if (!playerInvulnerable && !isAttacking && !isSlamming && jumpZ < 30) { const monster = m as Phaser.Physics.Arcade.Sprite; const damage = monster.getData('type') === 'BOSS' ? 15 : (monster.getData('type') === 'DEVIL' ? 20 : 10); takePlayerDamage(scene, damage); } });

      cursors = scene.input.keyboard!.createCursorKeys();
      attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
      dashKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
      pauseKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      lastMovementTime = scene.time.now;
      showLevelTransition(scene, `LEVEL ${currentLevel} START!`, 1500);
    }

    function showLevelTransition(scene: Phaser.Scene, message: string, duration: number, onComplete?: () => void) {
      isLevelTransitioning = true;
      const title = transitionOverlay.getAt(1) as Phaser.GameObjects.Text;
      title.setText(message);
      scene.tweens.add({
        targets: transitionOverlay, alpha: 1, duration: 300, ease: 'Power2',
        onComplete: () => {
          scene.time.delayedCall(duration, () => {
            scene.tweens.add({
              targets: transitionOverlay, alpha: 0, duration: 300,
              onComplete: () => {
                isLevelTransitioning = false;
                if (onComplete) onComplete();
              }
            });
          });
        }
      });
    }

    function drawBackground(g: Phaser.GameObjects.Graphics, level: number) {
      g.clear();
      g.fillStyle(0xe2e8f0, 1).fillRect(0, 0, 4096, HORIZON_Y);
      g.lineStyle(1, 0xcbd5e1, 0.5);
      for (let i = 0; i < 4096; i += 100) g.lineBetween(i, 0, i, HORIZON_Y);
      g.fillStyle(0xf8fafc, 1).fillRect(0, HORIZON_Y, 4096, SCREEN_HEIGHT - HORIZON_Y);
      g.fillStyle(0x94a3b8, 0.2).fillRect(0, HORIZON_Y, 4096, 20);
      g.lineStyle(4, 0x475569, 0.8);
      g.lineBetween(0, HORIZON_Y, 4096, HORIZON_Y);
      if (level === 1) {
        g.lineStyle(1, 0xadd8e6, 0.5);
        for (let i = HORIZON_Y; i < SCREEN_HEIGHT; i += 40) g.lineBetween(0, i, 4096, i);
      } else {
        g.lineStyle(1, 0xadd8e6, 0.3);
        for (let i = 0; i < 4096; i += 60) g.lineBetween(i, HORIZON_Y, i, SCREEN_HEIGHT);
        for (let i = HORIZON_Y; i < SCREEN_HEIGHT; i += 60) g.lineBetween(0, i, 4096, i);
      }
    }

    function takePlayerDamage(scene: Phaser.Scene, amount: number) {
      if (isDazed) return;

      sounds.hurt();
      playerHealth = Math.max(0, playerHealth - amount);
      onStatsUpdate({ health: playerHealth });

      if (playerHealth <= 0) {
        playerLives--;
        if (playerLives > 0) {
          onStatsUpdate({ lives: playerLives });
          isDazed = true;
          player.setVelocity(0, 0);
          player.anims.stop();
          player.setTexture('player_dazed');

          scene.tweens.add({
            targets: player,
            alpha: 0,
            duration: 100,
            yoyo: true,
            repeat: 14, // ~3 seconds
            onComplete: () => {
              if (player && player.active) {
                isDazed = false;
                playerHealth = 100;
                onStatsUpdate({ health: 100 });
                player.alpha = 1;
                player.setPosition(player.x - 200, (HORIZON_Y + FLOOR_BOTTOM) / 2);
                playerInvulnerable = false; // Ensure not invulnerable after respawn
              }
            }
          });
          return; // Skip normal hit reaction
        } else {
          // GAME OVER SEQUENCE
          // Don't update stats yet to prevent App from pausing the game
          isDazed = true; // Block input
          player.setVelocity(0, 0);
          player.anims.stop();
          player.setTexture('player_dead');

          scene.tweens.add({
            targets: player,
            alpha: 0,
            duration: 200,
            yoyo: true,
            repeat: 12, // 5 seconds
            onComplete: () => {
              scene.scene.restart();
              // Trigger Game Over in parent ONLY after restart/animation
              onStatsUpdate({ lives: 0, health: 100, level: 1, souls: 0, monstersDefeated: 0 });
            }
          });
          return;
        }
      }

      playerInvulnerable = true;
      scene.cameras.main.shake(150, 0.01);
      scene.tweens.add({
        targets: player, alpha: 0.3, duration: 80, yoyo: true, repeat: 4,
        onComplete: () => { playerInvulnerable = false; if (player && player.active) player.alpha = 1; }
      });
    }

    function takeMonsterDamage(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite, amount: number) {
      if (!monster || !monster.active) return;
      const type = monster.getData('type');
      const currentHp = monster.getData('hp') - amount;
      monster.setData('hp', currentHp);
      monster.setTint(0xff0000);
      const kb = type === 'BOSS' ? 10 : 30;
      monster.x += facingDirection * kb;
      const impact = scene.add.sprite(monster.x, monster.y - 30, 'impact_vfx').setScale(0.5);
      scene.tweens.add({ targets: impact, alpha: 0, scale: 1.2, duration: 200, onComplete: () => impact.destroy() });
      if (type === 'BOSS') {
        monster.setData('iframe', true);
        scene.time.delayedCall(150, () => { if (monster && monster.active) { monster.setData('iframe', false); monster.clearTint(); } });
      } else {
        scene.time.delayedCall(100, () => { if (monster && monster.active) monster.clearTint(); });
      }
      if (currentHp <= 0) {
        if (type === 'BOSS') {
          handleBossDefeat(scene);
          monster.destroy();
        } else if (monster.texture.key === 'grunt_walking' || type === 'DEVIL' || type === 'CHASER') {
          // Grunt death sequence
          monster.body.enable = false;
          monster.setVelocity(0, 0);
          // If we have a death animation, play it, otherwise just sit there
          if (scene.anims.exists('grunt_die')) {
            monster.play('grunt_die');
            monster.once('animationcomplete', () => {
              monster.setTexture('grunt_pile');
            });
          }
          else if (scene.textures.exists('grunt_dead')) monster.setTexture('grunt_dead');

          currentKills++;
          onStatsUpdate({ monstersDefeated: currentKills });

          scene.time.delayedCall(2000, () => {
            scene.tweens.add({
              targets: monster,
              alpha: 0,
              duration: 500,
              onComplete: () => { if (monster && monster.active) monster.destroy(); }
            });
          });
        } else {
          monster.destroy();
          currentKills++;
          onStatsUpdate({ monstersDefeated: currentKills });
        }
      }
    }

    function damageDestructible(scene: Phaser.Scene, d: Phaser.Physics.Arcade.Sprite, amount: number) {
      if (!d || !d.active) return;
      const hp = (d.getData('hp') || 1) - amount;
      d.setData('hp', hp);
      d.setTint(0xcccccc);
      scene.time.delayedCall(50, () => { if (d && d.active) d.clearTint(); });
      scene.tweens.add({ targets: d, x: d.x + (Math.random() * 4 - 2), duration: 50, yoyo: true });
      if (hp <= 0) breakDestructible(scene, d);
    }

    function breakDestructible(scene: Phaser.Scene, d: Phaser.Physics.Arcade.Sprite) {
      sounds.trash();
      const x = d.x; const y = d.y; const type = d.getData('type') as DestructibleType;
      for (let i = 0; i < 5; i++) {
        const scrap = scene.add.sprite(x, y - 20, 'scrap').setScale(Phaser.Math.FloatBetween(0.3, 0.6));
        scene.physics.add.existing(scrap);
        const body = scrap.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-200, -50));
          body.setGravityY(400);
        }
        scene.tweens.add({ targets: scrap, alpha: 0, angle: 360, duration: 800, onComplete: () => scrap.destroy() });
      }
      d.destroy();
      const roll = Math.random();
      if (type === 'BOOKS') { if (roll < 0.6) spawnSoul(scene, x); else if (roll < 0.8) spawnSoul(scene, x - 20); }
      else if (type === 'VENDING') { spawnHealth(scene, x, y); if (roll < 0.5) spawnSoul(scene, x + 20); }
      else if (type === 'BOX') { if (roll < 0.4) spawnSoul(scene, x); else if (roll < 0.55) spawnHealth(scene, x, y); }
      else { if (roll < 0.3) spawnSoul(scene, x); else if (roll < 0.4) spawnHealth(scene, x, y); }
    }

    function handleBossDefeat(scene: Phaser.Scene) {
      sounds.fanfare();
      scene.cameras.main.flash(500, 255, 255, 255);
      showLevelTransition(scene, `LEVEL ${currentLevel} COMPLETE!`, 2000, () => { onStatsUpdate({ level: currentLevel + 1, monstersDefeated: 0 }); });
    }

    function spawnSoul(scene: Phaser.Scene, x: number) {
      const y = Phaser.Math.Between(HORIZON_Y + 20, FLOOR_BOTTOM - 20);
      const s = souls.create(x, y, 'soulTexture');
      if (s) scene.tweens.add({ targets: s, y: y - 10, duration: 800, yoyo: true, repeat: -1 });
    }

    function spawnHealth(scene: Phaser.Scene, x: number, y: number) {
      const h = healthUpgrades.create(x, Phaser.Math.Clamp(y, HORIZON_Y + 20, FLOOR_BOTTOM - 20), 'h_heart');
      if (h) scene.tweens.add({ targets: h, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
    }

    function spawnDestructible(scene: Phaser.Scene, x: number) {
      const y = Phaser.Math.Between(HORIZON_Y + 40, FLOOR_BOTTOM - 10);
      const rolls = ['TRASH', 'BOX', 'BOOKS', 'VENDING'];
      const type = rolls[Math.floor(Math.random() * rolls.length)] as DestructibleType;
      let texture = 'o_trash'; let hp = 1; let scale = 1;
      if (type === 'BOX') texture = 'o_box';
      else if (type === 'BOOKS') texture = 'o_books';
      else if (type === 'VENDING') { texture = 'o_vending'; hp = 3; scale = 1.2; }
      else { texture = 'o_trash'; hp = 2; }
      const t = destructibles.create(x, y, texture);
      if (t) {
        t.setData({ type, hp }).setScale(scale);
        t.setImmovable(true).setOrigin(0.5, 0.9);
        if (type === 'VENDING') t.setSize(60, 80); else if (type === 'BOOKS') t.setSize(40, 30); else t.setSize(50, 40);
      }
    }

    function triggerSectionWave(scene: Phaser.Scene) {
      isFightingWave = true;
      const camX = scene.cameras.main.scrollX;
      scene.physics.world.setBounds(camX, HORIZON_Y, SCREEN_WIDTH, FLOOR_BOTTOM - HORIZON_Y);
      if (currentSectionIndex === fightSections.length - 1) spawnBoss(scene);
      else { const count = 3 + currentSectionIndex + (currentLevel * 2); for (let i = 0; i < count; i++) spawnWaveMonster(scene, camX + SCREEN_WIDTH); }
    }

    function spawnWaveMonster(scene: Phaser.Scene, spawnX: number) {
      const y = Phaser.Math.Between(HORIZON_Y + 20, FLOOR_BOTTOM - 20);
      const roll = Math.random();
      let type: MonsterType = 'CHASER'; let texture = 'grunt_walking';
      let useAnim = true;

      // Prioritize new grunt for testing
      if (roll < 0.6) { type = 'DEVIL'; texture = 'grunt_walking'; }
      else if (roll < 0.7) { type = 'GIANT'; texture = 'm_devil'; useAnim = false; }
      else if (roll < 0.85) { type = 'DASHER'; texture = 'm_alien'; useAnim = false; }
      else { type = 'FLOATER'; texture = 'ghost_float'; useAnim = false; }

      let hp = 5; if (type === 'GIANT') hp = 15; if (type === 'DEVIL') hp = 10; if (type === 'DASHER') hp = 4;
      if (currentLevel > 1) hp = Math.floor(hp * 1.5);

      const m = monsters.create(spawnX - 50, y, texture);
      if (m) {
        m.setData({ type, hp, maxHp: hp, timer: 0 }).setCollideWorldBounds(true);
        if (type === 'GIANT') m.setScale(1.8);
        else if (type === 'FLOATER') m.setScale(0.3); // Scale down the large ghost sprite
        else if (useAnim) {
          m.setScale(0.4); // Scale down the large grunt sprite
          m.setFlipX(true); // Grunt faces left
          m.play('grunt_walk');
        }
      }
    }

    function spawnBoss(scene: Phaser.Scene) {
      sounds.growl();
      const camX = scene.cameras.main.scrollX;
      const boss = monsters.create(camX + 800, (HORIZON_Y + FLOOR_BOTTOM) / 2, 'm_boss');
      if (boss) {
        boss.setScale(3.5).setData({ type: 'BOSS', hp: 40, maxHp: 40, timer: 0, phase: 1, iframe: false });
        boss.setCollideWorldBounds(true).setTint(0xcccccc);
      }
      // Spawn health pickups and souls in the boss arena so the player can recover
      for (let i = 0; i < 2; i++) spawnHealth(scene, camX + 200 + i * 300, Phaser.Math.Between(HORIZON_Y + 30, FLOOR_BOTTOM - 30));
      for (let i = 0; i < 4; i++) spawnSoul(scene, camX + 150 + i * 200);
    }

    function performSlamImpact(scene: Phaser.Scene) {
      sounds.slam();
      scene.cameras.main.shake(300, 0.015);
      const ring = scene.add.graphics().setDepth(player.y);
      ring.lineStyle(8, 0x000000, 0.8);
      ring.strokeCircle(player.x, player.y, 0);
      scene.tweens.add({
        targets: ring, alpha: 0, duration: 400,
        onUpdate: (tween) => {
          const radius = tween.getValue() * 180;
          ring.clear().lineStyle(8, 0x000000, 0.8 - tween.getValue()).strokeCircle(player.x, player.y, radius);
        },
        onComplete: () => ring.destroy()
      });
      const slamRadius = 150;
      monsters.getChildren().forEach(m => { const monster = m as Phaser.Physics.Arcade.Sprite; if (monster && monster.active && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < slamRadius) takeMonsterDamage(scene, monster, 3); });
      destructibles.getChildren().forEach(d => { const item = d as Phaser.Physics.Arcade.Sprite; if (item && item.active && Phaser.Math.Distance.Between(player.x, player.y, item.x, item.y) < slamRadius) damageDestructible(scene, item, 2); });
    }

    function update(this: Phaser.Scene) {
      if (Phaser.Input.Keyboard.JustDown(pauseKey)) onTogglePause();
      if (isPaused || isLevelTransitioning || isDazed) { if (player && player.active) player.setVelocity(0); return; }

      const scene = this;
      const speed = 250;
      const currentTime = scene.time.now;

      if (!player || !player.active) return;

      player.setVelocity(0);
      const mR = cursors.right.isDown; const mL = cursors.left.isDown; const mU = cursors.up.isDown; const mD = cursors.down.isDown;
      let curSpeed = isDashing ? speed * 3 : speed;
      if (mL) { player.setVelocityX(-curSpeed); facingDirection = -1; }
      else if (mR) { player.setVelocityX(curSpeed); facingDirection = 1; }
      if (mU) player.setVelocityY(-curSpeed * 0.7); else if (mD) player.setVelocityY(curSpeed * 0.7);
      if (mR || mL || mU || mD) lastMovementTime = currentTime;

      const hasAnims = scene.anims.exists('walk');
      if (hasAnims && player.anims) {
        player.setFlipX(facingDirection === -1);
        if (isJumping) {
          if (isSlamming) {
            player.anims.stop();
            player.setTexture('player_buttbomb');
          } else {
            player.setTexture('player_jump');
          }
        } else if (isDashing) {
          player.setTexture('player_dash');
          player.anims.play('dash', true);
        } else if (isAttacking) {
          player.anims.stop();
          player.setTexture('player_attack');
        } else if (Math.abs(player.body.velocity.x) > 0 || Math.abs(player.body.velocity.y) > 0) {
          if (player.texture.key !== (playerSprite ? 'player_walk' : 'player_walk_internal')) {
            player.setTexture(playerSprite ? 'player_walk' : 'player_walk_internal');
          }
          player.anims.play('walk', true);
          player.anims.timeScale = isDashing ? 2.5 : 1.0;
        } else {
          if (player.texture.key !== (playerSprite ? 'player_walk' : 'player_walk_internal')) {
            player.setTexture(playerSprite ? 'player_walk' : 'player_walk_internal');
          }
          player.anims.play('idle', true);
        }
      }

      if (Phaser.Input.Keyboard.JustDown(jumpKey) && !isJumping) {
        isJumping = true; jumpVelocity = 18; sounds.jump();
        scene.tweens.add({ targets: player, scaleX: PLAYER_SCALE * 1.2, scaleY: PLAYER_SCALE * 0.8, duration: 100, yoyo: true });
      }
      if (isJumping && !isSlamming && Phaser.Input.Keyboard.JustDown(attackKey)) {
        isSlamming = true; jumpVelocity = -35;
      }
      if (isJumping) {
        jumpZ += jumpVelocity; jumpVelocity += jumpGravity;
        if (jumpZ <= 0) {
          const wasSlamming = isSlamming; jumpZ = 0; isJumping = false; isSlamming = false; jumpVelocity = 0;
          if (wasSlamming) {
            performSlamImpact(scene);
            scene.tweens.add({ targets: player, scaleY: PLAYER_SCALE * 0.5, scaleX: PLAYER_SCALE * 1.4, duration: 150, yoyo: true });
          } else {
            scene.tweens.add({ targets: player, scaleY: PLAYER_SCALE * 0.6, scaleX: PLAYER_SCALE * 1.2, duration: 100, yoyo: true });
          }
        }
      }

      if (Phaser.Input.Keyboard.JustDown(dashKey) && !isDashing && currentTime > dashCooldown) {
        isDashing = true; playerInvulnerable = true; sounds.dash(); dashCooldown = currentTime + 800;
        scene.time.delayedCall(200, () => { if (player && player.active) { isDashing = false; playerInvulnerable = false; } });
        for (let i = 1; i <= 3; i++) {
          scene.time.delayedCall(i * 40, () => {
            if (!player || !player.active) return;
            const ghost = scene.add.sprite(player.x, player.y - jumpZ, player.texture.key, player.frame.name)
              .setAlpha(0.3).setTint(0x00ffff).setFlipX(player.flipX).setDepth(player.depth - 1);
            ghost.setScale(PLAYER_SCALE);
            scene.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() });
          });
        }
      }

      if (Phaser.Input.Keyboard.JustDown(attackKey) && !isAttacking && !isJumping) {
        isAttacking = true; sounds.attack();
        scene.tweens.add({
          targets: player, scaleX: PLAYER_SCALE * 1.3, scaleY: PLAYER_SCALE * 1.3, duration: 100, yoyo: true,
          onComplete: () => { isAttacking = false; }
        });
      }

      playerShadow.clear().fillStyle(0x000000, 0.2);
      const sScale = Math.max(0.3, 1 - (jumpZ / 400));
      playerShadow.fillEllipse(player.x, player.y, (70 * PLAYER_SCALE / 0.6) * sScale, (24 * PLAYER_SCALE / 0.6) * sScale);
      const displayY = player.y - jumpZ;

      if (!isFightingWave && currentSectionIndex < fightSections.length && player.x >= fightSections[currentSectionIndex]) triggerSectionWave(scene);
      if (isFightingWave && monsters.countActive() === 0) { isFightingWave = false; currentSectionIndex++; scene.physics.world.setBounds(0, HORIZON_Y, 4096, FLOOR_BOTTOM - HORIZON_Y); lastMovementTime = currentTime; }
      keepMovingPrompt.setVisible(!isFightingWave && currentSectionIndex < fightSections.length && currentTime - lastMovementTime > 5000);

      player.setDepth(player.y).setY(displayY);

      monsters.getChildren().forEach((m) => {
        const monster = m as Phaser.Physics.Arcade.Sprite;
        if (!monster || !monster.active) return;
        const type = monster.getData('type') as MonsterType;
        const hp = monster.getData('hp'); const maxHp = monster.getData('maxHp');
        const timer = (monster.getData('timer') || 0) + 1; monster.setData('timer', timer);
        if (type === 'BOSS') {
          const phase = hp <= maxHp / 2 ? 2 : 1; const cycle = timer % (phase === 2 ? 280 : 400);
          if (cycle < 150) scene.physics.moveToObject(monster, player, phase === 2 ? 130 : 80);
          else if (cycle === 150) {
            monster.setVelocity(0); sounds.growl();
            if (phase === 2) {
              scene.cameras.main.shake(400, 0.01); const ring = scene.add.graphics();
              scene.tweens.add({ targets: ring, alpha: 0, duration: 600, onUpdate: (tween) => { const radius = tween.getValue() * 300; ring.clear().lineStyle(10, 0x000000, 0.6 - tween.getValue()).strokeCircle(monster.x, monster.y, radius); if (player && player.active && Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y) < radius + 10 && jumpZ === 0 && !playerInvulnerable) takePlayerDamage(scene, 12); }, onComplete: () => ring.destroy() });
            } else {
              for (let i = 0; i < 4; i++) scene.time.delayedCall(i * 200, () => {
                if (monster && monster.active && player && player.active) {
                  const projectile = projectiles.create(monster.x, monster.y - 60, 'ink_splat');
                  if (projectile) {
                    projectile.setScale(0.6);
                    scene.physics.moveToObject(projectile, player, 250);
                  }
                }
              });
            }
          }
          drawBar(healthGraphics, monster.x - 60, monster.y - 140, 120, hp / maxHp, true);
        } else {
          if (type === 'FLOATER') {
            // Oscillating wave movement
            const wave = Math.sin(scene.time.now * 0.003 + monster.x * 0.01) * 150;
            scene.physics.moveTo(monster, player.x, player.y + wave, 110);
          } else {
            scene.physics.moveToObject(monster, player, type === 'DASHER' ? 200 : 120);
          }
          drawBar(healthGraphics, monster.x - 20, monster.y - 45, 40, hp / maxHp);
        }
        monster.setDepth(monster.y);
      });

      if (isAttacking) {
        const arcSize = 100 * (PLAYER_SCALE / 0.6);
        attackVisual.clear().lineStyle(4, 0x000000, 0.4).arc(player.x, player.y, arcSize, Phaser.Math.DegToRad(facingDirection === 1 ? -60 : 120), Phaser.Math.DegToRad(facingDirection === 1 ? 60 : 240), false).strokePath();
        attackHitbox.setPosition(player.x + (facingDirection * 60 * (PLAYER_SCALE / 0.6)), player.y);
      }
      else { attackVisual.clear(); attackHitbox.setPosition(-1000, -1000); }

      if (player.x > lastDestructibleSpawnX + 600) { lastDestructibleSpawnX = player.x; spawnDestructible(scene, player.x + 800); }
      healthGraphics.clear(); drawBar(healthGraphics, player.x - 20, player.y - (45 * (PLAYER_SCALE / 0.6)), 40, playerHealth / 100);

      destructibles.getChildren().forEach((d) => {
        const item = d as Phaser.Physics.Arcade.Sprite;
        if (item && item.active) item.setDepth(item.y);
      });

      // Parallax background scrolling
      if (backgroundSprite) {
        backgroundSprite.tilePositionX = scene.cameras.main.scrollX * 0.8;
      }

      scene.events.once('postrender', () => { if (player && player.active) player.setY(player.y + jumpZ); });
    }

    function drawBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, p: number, isBoss: boolean = false) {
      const h = isBoss ? 12 : 6; g.fillStyle(0x000000, 0.3).fillRect(x, y, w, h);
      const color = isBoss ? 0x9333ea : (p > 0.5 ? 0x22c55e : (p > 0.25 ? 0xfacc15 : 0xef4444));
      g.fillStyle(color, 1).fillRect(x + 1, y + 1, (w - 2) * p, h - 2);
    }

    try {
      gameRef.current = new Phaser.Game(config);
    } catch (e) {
      console.error("Phaser failed to initialize:", e);
    }

    return () => {
      gameRef.current?.destroy(true);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, [currentLevel, playerSprite]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-800">
      <div ref={gameContainerRef} className="rounded-lg overflow-hidden shadow-2xl border-8 border-slate-700" />
    </div>
  );
};

export default GameEngine;
