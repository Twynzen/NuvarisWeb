import * as Phaser from 'phaser';
import { Player } from '../entities/player.entity';
import { Enemy } from '../entities/enemy.entity';
import { Projectile } from '../entities/projectile.entity';
import { FireballWeapon, MagicMissileWeapon, LightningBoltWeapon } from '../entities/weapon.entity';
import { EnemySpawner } from '../systems/enemy-spawner.system';
import { XPManager } from '../systems/xp-manager.system';

export class GameScene extends Phaser.Scene {
  // Core entities
  private player!: Player;

  // Systems
  private enemySpawner!: EnemySpawner;
  private xpManager!: XPManager;

  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  // UI
  private gameTimeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;

  // Game state
  private gameStartTime = 0;
  private isPaused = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Assets will be loaded here in the future
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.gameStartTime = this.time.now;

    // Create player
    this.player = new Player(this, width / 2, height / 2);

    // Give player starting weapons
    const fireball = new FireballWeapon(this, this.player);
    this.player.addWeapon(fireball);

    // After 5 seconds, add magic missile
    this.time.delayedCall(5000, () => {
      const magicMissile = new MagicMissileWeapon(this, this.player);
      this.player.addWeapon(magicMissile);
      console.log('Magic Missile added!');
    });

    // After 10 seconds, add lightning bolt
    this.time.delayedCall(10000, () => {
      const lightning = new LightningBoltWeapon(this, this.player);
      this.player.addWeapon(lightning);
      console.log('Lightning Bolt added!');
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

    // Emit scene ready
    this.game.events.emit('scene-event', {
      type: 'scene-ready',
      scene: 'GameScene'
    });

    console.log('🎮 Game started! Survive as long as you can!');
  }

  /**
   * Setup collision detection
   */
  private setupCollisions(): void {
    // Player weapons shoot projectiles, we need to check collisions
    // This will be done in update loop since we're using object pooling

    // Setup enemy collision with player (damage player)
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

    // Despawn projectile
    projectile.onHit();
  }

  /**
   * Handle enemy hitting player
   */
  private onEnemyHitPlayer(player: Player, enemy: Enemy): void {
    if (!enemy.isActive) return;

    // Damage player
    player.takeDamage(enemy.config.damage);

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
   * Setup input controls
   */
  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();

    if (this.input.keyboard) {
      this.wasd = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }
  }

  /**
   * Setup UI elements
   */
  private setupUI(): void {
    const { width, height } = this.cameras.main;

    // Title
    const titleText = this.add.text(width / 2, 30, 'NÚVARIS - Auto Combat Demo', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5);
    titleText.setScrollFactor(0);
    titleText.setDepth(100);

    // Game time
    this.gameTimeText = this.add.text(20, 70, 'Time: 0:00', {
      fontSize: '18px',
      color: '#ffffff'
    });
    this.gameTimeText.setScrollFactor(0);
    this.gameTimeText.setDepth(100);

    // Level
    this.levelText = this.add.text(20, 95, 'Level: 1', {
      fontSize: '18px',
      color: '#ffff00'
    });
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(100);

    // XP
    this.xpText = this.add.text(20, 120, 'XP: 0 / 100', {
      fontSize: '16px',
      color: '#00ffff'
    });
    this.xpText.setScrollFactor(0);
    this.xpText.setDepth(100);

    // Enemy count
    this.enemyCountText = this.add.text(20, 145, 'Enemies: 0', {
      fontSize: '16px',
      color: '#ff4444'
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
    const controls = this.add.text(width / 2, height - 30, 'Controls: WASD or Arrow Keys to move', {
      fontSize: '14px',
      color: '#cccccc'
    });
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
    const y = height - 60;
    const healthPercent = this.player.health / this.player.maxHealth;

    // Background
    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health (green to red gradient based on health)
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
    const y = height - 35;
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
   * Handle level up
   */
  private onLevelUp(data: { level: number }): void {
    console.log(`🎉 LEVEL UP! Now level ${data.level}`);

    // Flash effect
    this.cameras.main.flash(500, 255, 255, 0);

    // Heal player fully
    this.player.heal(this.player.maxHealth);
    this.updateHealthBar();

    // TODO: Show level-up screen with ability choices
  }

  /**
   * Handle XP gained
   */
  private onXPGained(data: any): void {
    this.updateXPBar();
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

    // Update spawner
    this.enemySpawner.update(time, delta);

    // Despawn distant enemies (optimization)
    if (time % 1000 < delta) { // Every ~1 second
      this.enemySpawner.despawnDistantEnemies();
    }

    // Update XP manager
    this.xpManager.update(time, delta);

    // Update projectile collisions with enemies
    this.updateProjectileCollisions();

    // Update UI
    this.updateUI(time);
  }

  /**
   * Update player movement
   */
  private updatePlayerMovement(): void {
    if (!this.cursors) return;

    const speed = this.player.speed;
    let velocityX = 0;
    let velocityY = 0;

    // Check input
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

          // Check collision
          const distance = Phaser.Math.Distance.Between(
            projectile.x,
            projectile.y,
            enemy.x,
            enemy.y
          );

          if (distance < 20) { // Collision threshold
            this.onProjectileHitEnemy(projectile, enemy);
          }
        });
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
    const enemyCount = this.enemySpawner.getActiveEnemies().length;
    this.enemyCountText.setText(`Enemies: ${enemyCount}`);
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    this.events.off('level-up', this.onLevelUp, this);
    this.events.off('xp-gained', this.onXPGained, this);
  }
}

// Define height for healthbar positioning
const { height } = { height: 600 }; // Default, will be overridden by camera
