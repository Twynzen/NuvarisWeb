import * as Phaser from 'phaser';
import { Player } from '../entities/player.entity';
import { Enemy } from '../entities/enemy.entity';
import { Boss } from '../entities/boss.entity';
import { Projectile } from '../entities/projectile.entity';
import {
  FireballWeapon,
  MagicMissileWeapon,
  LightningBoltWeapon,
  OrbitalWeapon,
  AoEWeapon,
  BeamWeapon
} from '../entities/weapon.entity';
import { EnemySpawner } from '../systems/enemy-spawner.system';
import { XPManager } from '../systems/xp-manager.system';
import { ParticleManager } from '../systems/particle-manager.system';
import { AudioManager } from '../systems/audio-manager.system';
import { VirtualJoystick } from '../components/virtual-joystick.component';

export class GameScene extends Phaser.Scene {
  // Core entities
  private player!: Player;
  private boss?: Boss;

  // Systems
  private enemySpawner!: EnemySpawner;
  private xpManager!: XPManager;
  private particleManager!: ParticleManager;
  private audioManager!: AudioManager;

  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private virtualJoystick?: VirtualJoystick;
  private isMobile = false;

  // Special weapons (non-standard update)
  private specialWeapons: Array<OrbitalWeapon | BeamWeapon> = [];

  // UI
  private gameTimeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private bossHealthBar?: Phaser.GameObjects.Graphics;
  private bossNameText?: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;

  // Game state
  private gameStartTime = 0;
  private isPaused = false;
  private lastBossSpawnTime = 0;
  private bossSpawnInterval = 300000; // 5 minutes in milliseconds

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Assets will be loaded here in the future
    this.audioManager = new AudioManager(this);
    this.audioManager.preloadAudio(this.load);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.gameStartTime = this.time.now;

    // Detect mobile
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;

    // Create player
    this.player = new Player(this, width / 2, height / 2);

    // Create systems
    this.particleManager = new ParticleManager(this);
    if (!this.audioManager) {
      this.audioManager = new AudioManager(this);
    }

    // Give player starting weapon
    const fireball = new FireballWeapon(this, this.player);
    this.player.addWeapon(fireball);

    // Add more weapons over time (for testing)
    this.time.delayedCall(5000, () => {
      const magicMissile = new MagicMissileWeapon(this, this.player);
      this.player.addWeapon(magicMissile);
      this.particleManager.createTextPopup(this.player.x, this.player.y - 50, 'Magic Missile!', '#00ffff');
    });

    this.time.delayedCall(10000, () => {
      const lightning = new LightningBoltWeapon(this, this.player);
      this.player.addWeapon(lightning);
      this.particleManager.createTextPopup(this.player.x, this.player.y - 50, 'Lightning Bolt!', '#ffff00');
    });

    // Setup systems
    this.enemySpawner = new EnemySpawner(this, this.player);
    this.xpManager = new XPManager(this, this.player);

    // Setup collisions
    this.setupCollisions();

    // Setup input
    this.setupInput();

    // Setup camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1);

    // Setup UI
    this.setupUI();

    // Setup world bounds (large area)
    this.physics.world.setBounds(-2000, -2000, 4000, 4000);

    // Listen to events
    this.events.on('level-up', this.onLevelUp, this);
    this.events.on('xp-gained', this.onXPGained, this);
    this.events.on('boss-spawned', this.onBossSpawned, this);
    this.events.on('boss-defeated', this.onBossDefeated, this);
    this.events.on('enemy-died', this.onEnemyDied, this);

    // Emit scene ready
    this.game.events.emit('scene-event', {
      type: 'scene-ready',
      scene: 'GameScene'
    });

    console.log('🎮 Núvaris started! Survive as long as you can!');
    console.log(`📱 Platform: ${this.isMobile ? 'Mobile' : 'Desktop'}`);
  }

  /**
   * Setup collision detection
   */
  private setupCollisions(): void {
    // Enemy collision with player (damage player)
    this.physics.add.overlap(
      this.player,
      this.enemySpawner.getEnemyPool(),
      this.onEnemyHitPlayer as any,
      undefined,
      this
    );
  }

  /**
   * Handle projectile hitting enemy
   */
  private onProjectileHitEnemy(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.isActive || !enemy.isActive) return;

    // Apply damage
    const died = enemy.takeDamage(projectile.damage);

    // Hit effect
    this.particleManager.createHitEffect(enemy.x, enemy.y, 0xffff00);

    if (died) {
      this.particleManager.createBloodSplatter(enemy.x, enemy.y);
    }

    // Despawn projectile
    projectile.onHit();
  }

  /**
   * Handle projectile hitting boss
   */
  private onProjectileHitBoss(projectile: Projectile, boss: Boss): void {
    if (!projectile.isActive || !boss.isActive) return;

    // Apply damage
    const died = boss.takeDamage(projectile.damage);

    // Hit effect
    this.particleManager.createHitEffect(boss.x, boss.y, 0xff00ff);

    // Despawn projectile
    projectile.onHit();
  }

  /**
   * Handle enemy hitting player
   */
  private onEnemyHitPlayer(player: Player, enemy: Enemy | Boss): void {
    if (!enemy.isActive) return;

    // Damage player
    player.takeDamage(enemy.config.damage);

    // Hit effect
    this.particleManager.createHitEffect(player.x, player.y, 0xff0000);

    // Knockback enemy
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    const knockback = 100;
    enemy.body.setVelocity(
      Math.cos(angle + Math.PI) * knockback,
      Math.sin(angle + Math.PI) * knockback
    );

    // Update health bar
    this.updateHealthBar();
  }

  /**
   * Handle enemy died
   */
  private onEnemyDied(data: { x: number; y: number; xpValue: number }): void {
    // Already handled by enemy entity, XP gem spawned by XPManager
  }

  /**
   * Setup input controls
   */
  private setupInput(): void {
    // Keyboard
    this.cursors = this.input.keyboard?.createCursorKeys();

    if (this.input.keyboard) {
      this.wasd = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Virtual joystick for mobile
    if (this.isMobile) {
      const { width, height } = this.cameras.main;
      this.virtualJoystick = new VirtualJoystick(this, 100, height - 100);
    }
  }

  /**
   * Setup UI elements
   */
  private setupUI(): void {
    const { width, height } = this.cameras.main;

    // Title
    const titleText = this.add.text(width / 2, 30, 'NÚVARIS', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    titleText.setOrigin(0.5);
    titleText.setScrollFactor(0);
    titleText.setDepth(100);

    // Game time
    this.gameTimeText = this.add.text(20, 70, 'Time: 0:00', {
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.gameTimeText.setScrollFactor(0);
    this.gameTimeText.setDepth(100);

    // Level
    this.levelText = this.add.text(20, 95, 'Level: 1', {
      fontSize: '18px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(100);

    // XP
    this.xpText = this.add.text(20, 120, 'XP: 0 / 100', {
      fontSize: '16px',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.xpText.setScrollFactor(0);
    this.xpText.setDepth(100);

    // Enemy count
    this.enemyCountText = this.add.text(20, 145, 'Enemies: 0', {
      fontSize: '16px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.enemyCountText.setScrollFactor(0);
    this.enemyCountText.setDepth(100);

    // Health bar
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);
    this.updateHealthBar();

    // XP bar
    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);
    this.updateXPBar();

    // Controls info
    const controls = this.add.text(
      width / 2,
      height - 30,
      this.isMobile ? 'Use joystick to move' : 'Controls: WASD or Arrow Keys',
      {
        fontSize: '14px',
        color: '#cccccc',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    controls.setOrigin(0.5);
    controls.setScrollFactor(0);
    controls.setDepth(100);
  }

  /**
   * Update health bar
   */
  private updateHealthBar(): void {
    this.healthBar.clear();

    const barWidth = 200;
    const barHeight = 20;
    const x = 20;
    const y = this.cameras.main.height - 60;
    const healthPercent = this.player.health / this.player.maxHealth;

    // Background
    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health (green to red gradient)
    const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(x + 2, y + 2, (barWidth - 4) * healthPercent, barHeight - 4);

    // Border
    this.healthBar.lineStyle(2, 0xffffff);
    this.healthBar.strokeRect(x, y, barWidth, barHeight);
  }

  /**
   * Update XP bar
   */
  private updateXPBar(): void {
    this.xpBar.clear();

    const barWidth = 200;
    const barHeight = 15;
    const x = 20;
    const y = this.cameras.main.height - 35;
    const stats = this.xpManager.getStats();
    const xpPercent = stats.currentXP / stats.xpToNextLevel;

    // Background
    this.xpBar.fillStyle(0x000000, 0.7);
    this.xpBar.fillRect(x, y, barWidth, barHeight);

    // XP (cyan)
    this.xpBar.fillStyle(0x00ffff);
    this.xpBar.fillRect(x + 2, y + 2, (barWidth - 4) * xpPercent, barHeight - 4);

    // Border
    this.xpBar.lineStyle(2, 0xffffff);
    this.xpBar.strokeRect(x, y, barWidth, barHeight);
  }

  /**
   * Update boss health bar
   */
  private updateBossHealthBar(): void {
    if (!this.boss || !this.boss.isActive) {
      if (this.bossHealthBar) {
        this.bossHealthBar.clear();
        this.bossHealthBar.setVisible(false);
      }
      if (this.bossNameText) {
        this.bossNameText.setVisible(false);
      }
      return;
    }

    if (!this.bossHealthBar) {
      this.bossHealthBar = this.add.graphics();
      this.bossHealthBar.setScrollFactor(0);
      this.bossHealthBar.setDepth(100);
    }

    if (!this.bossNameText) {
      this.bossNameText = this.add.text(
        this.cameras.main.width / 2,
        100,
        '',
        {
          fontSize: '24px',
          color: '#ff00ff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        }
      );
      this.bossNameText.setOrigin(0.5);
      this.bossNameText.setScrollFactor(0);
      this.bossNameText.setDepth(100);
    }

    this.bossHealthBar.setVisible(true);
    this.bossNameText.setVisible(true);

    this.bossHealthBar.clear();

    const barWidth = 400;
    const barHeight = 20;
    const x = (this.cameras.main.width - barWidth) / 2;
    const y = 130;
    const healthPercent = this.boss.health / this.boss.config.maxHealth;

    // Update name
    this.bossNameText.setText(`👹 ${this.boss.config.name} 👹`);

    // Background
    this.bossHealthBar.fillStyle(0x000000, 0.8);
    this.bossHealthBar.fillRect(x, y, barWidth, barHeight);

    // Health
    const color = healthPercent > 0.5 ? 0xff00ff : healthPercent > 0.25 ? 0xff6600 : 0xff0000;
    this.bossHealthBar.fillStyle(color);
    this.bossHealthBar.fillRect(x + 2, y + 2, (barWidth - 4) * healthPercent, barHeight - 4);

    // Border
    this.bossHealthBar.lineStyle(3, 0xffffff);
    this.bossHealthBar.strokeRect(x, y, barWidth, barHeight);
  }

  /**
   * Handle level up
   */
  private onLevelUp(data: { level: number }): void {
    console.log(`🎉 LEVEL UP! Now level ${data.level}`);

    // Flash effect
    this.cameras.main.flash(500, 255, 255, 0);

    // Heal player fully
    this.player.heal(this.player.maxHealth);
    this.updateHealthBar();

    // Level up effect
    this.particleManager.createLevelUpEffect(this.player.x, this.player.y);

    // Pause game and show level-up screen
    this.scene.pause();
    this.scene.launch('LevelUpScene', { level: data.level });
  }

  /**
   * Handle XP gained
   */
  private onXPGained(data: any): void {
    this.updateXPBar();
  }

  /**
   * Handle boss spawned
   */
  private onBossSpawned(data: { name: string }): void {
    this.particleManager.createTextPopup(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `⚠️ ${data.name} APPROACHES! ⚠️`,
      '#ff00ff'
    );
  }

  /**
   * Handle boss defeated
   */
  private onBossDefeated(data: { name: string }): void {
    this.particleManager.createTextPopup(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `💀 ${data.name} DEFEATED! 💀`,
      '#00ff00'
    );

    this.boss = undefined;
  }

  /**
   * Spawn boss
   */
  private spawnBoss(): void {
    // Calculate spawn position (far from player)
    const angle = Math.random() * Math.PI * 2;
    const distance = 800;
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

    // Create boss if doesn't exist
    if (!this.boss) {
      this.boss = new Boss(this, x, y);
    }

    // Boss config based on time
    const gameTimeMinutes = (this.time.now - this.gameStartTime) / 60000;
    const bossLevel = Math.floor(gameTimeMinutes / 5) + 1;

    const bossConfig = {
      name: `BOSS LV${bossLevel}`,
      maxHealth: 500 + (bossLevel * 200),
      speed: 60 + (bossLevel * 5),
      damage: 30 + (bossLevel * 10),
      xpValue: 500 + (bossLevel * 100),
      color: 0xff00ff,
      size: 60,
      special: bossLevel % 3 === 0 ? 'spawn_minions' : bossLevel % 2 === 0 ? 'area_damage' : 'dash'
    };

    this.boss.spawn(x, y, bossConfig, this.player);
    this.particleManager.createBossEntranceEffect(x, y);

    this.lastBossSpawnTime = this.time.now;
  }

  /**
   * Update loop
   */
  update(time: number, delta: number): void {
    if (this.isPaused) return;

    // Update player movement
    this.updatePlayerMovement();

    // Update player
    this.player.update(time, delta);

    // Update special weapons
    this.specialWeapons.forEach(weapon => {
      weapon.update(time, delta);
    });

    // Update spawner
    this.enemySpawner.update(time, delta);

    // Despawn distant enemies (optimization)
    if (time % 1000 < delta) {
      this.enemySpawner.despawnDistantEnemies();
    }

    // Update XP manager
    this.xpManager.update(time, delta);

    // Update projectile collisions with enemies
    this.updateProjectileCollisions();

    // Update boss
    if (this.boss && this.boss.isActive) {
      this.boss.update(time, delta);
      this.updateBossHealthBar();

      // Check boss projectile collisions
      this.updateBossProjectileCollisions();
    }

    // Spawn boss every 5 minutes
    if (time - this.lastBossSpawnTime >= this.bossSpawnInterval) {
      if (!this.boss || !this.boss.isActive) {
        this.spawnBoss();
      }
    }

    // Update UI
    this.updateUI(time);
  }

  /**
   * Update player movement
   */
  private updatePlayerMovement(): void {
    const speed = this.player.speed;
    let velocityX = 0;
    let velocityY = 0;

    // Keyboard input
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd?.a.isDown) {
        velocityX = -speed;
      } else if (this.cursors.right.isDown || this.wasd?.d.isDown) {
        velocityX = speed;
      }

      if (this.cursors.up.isDown || this.wasd?.w.isDown) {
        velocityY = -speed;
      } else if (this.cursors.down.isDown || this.wasd?.s.isDown) {
        velocityY = speed;
      }
    }

    // Virtual joystick input (mobile)
    if (this.virtualJoystick && this.virtualJoystick.isActive()) {
      const dir = this.virtualJoystick.getDirection();
      velocityX = dir.x * speed;
      velocityY = dir.y * speed;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    this.player.setVelocity(velocityX, velocityY);
  }

  /**
   * Update projectile collisions (manual check for object pooling)
   */
  private updateProjectileCollisions(): void {
    const enemies = this.enemySpawner.getActiveEnemies();

    this.player.getWeapons().forEach(weapon => {
      const projectiles = weapon.getActiveProjectiles();

      projectiles.forEach(projectile => {
        enemies.forEach(enemy => {
          if (!projectile.isActive || !enemy.isActive) return;

          const distance = Phaser.Math.Distance.Between(
            projectile.x,
            projectile.y,
            enemy.x,
            enemy.y
          );

          if (distance < 20) {
            this.onProjectileHitEnemy(projectile, enemy);
          }
        });
      });
    });
  }

  /**
   * Update boss projectile collisions
   */
  private updateBossProjectileCollisions(): void {
    if (!this.boss || !this.boss.isActive) return;

    this.player.getWeapons().forEach(weapon => {
      const projectiles = weapon.getActiveProjectiles();

      projectiles.forEach(projectile => {
        if (!projectile.isActive) return;

        const distance = Phaser.Math.Distance.Between(
          projectile.x,
          projectile.y,
          this.boss!.x,
          this.boss!.y
        );

        if (distance < this.boss!.config.size / 2 + 10) {
          this.onProjectileHitBoss(projectile, this.boss!);
        }
      });
    });
  }

  /**
   * Update UI elements
   */
  private updateUI(time: number): void {
    // Game time
    const gameTime = Math.floor((time - this.gameStartTime) / 1000);
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    this.gameTimeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);

    // Level
    const stats = this.xpManager.getStats();
    this.levelText.setText(`Level: ${stats.level}`);

    // XP
    this.xpText.setText(`XP: ${stats.currentXP} / ${stats.xpToNextLevel}`);

    // Enemy count
    const enemyCount = this.enemySpawner.getActiveEnemies().length + (this.boss?.isActive ? 1 : 0);
    this.enemyCountText.setText(`Enemies: ${enemyCount}`);
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    this.events.off('level-up', this.onLevelUp, this);
    this.events.off('xp-gained', this.onXPGained, this);
    this.events.off('boss-spawned', this.onBossSpawned, this);
    this.events.off('boss-defeated', this.onBossDefeated, this);
    this.events.off('enemy-died', this.onEnemyDied, this);
  }
}
