import * as Phaser from 'phaser';

export interface EnemyConfig {
  type: string;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  color: number;
}

export class Enemy extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;

  private sprite: Phaser.GameObjects.Rectangle;
  private healthBar?: Phaser.GameObjects.Graphics;

  public config: EnemyConfig;
  public health: number;
  public isActive = false;

  private target?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Default config (will be overridden on spawn)
    this.config = {
      type: 'zombie',
      maxHealth: 20,
      speed: 50,
      damage: 10,
      xpValue: 10,
      color: 0xff0000
    };

    this.health = this.config.maxHealth;

    // Create visual (placeholder)
    this.sprite = scene.add.rectangle(0, 0, 30, 30, this.config.color);
    this.add(this.sprite);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(30, 30);

    // Add to scene
    scene.add.existing(this);

    // Start inactive
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * Spawn enemy with specific config
   */
  spawn(x: number, y: number, config: EnemyConfig, target: Phaser.GameObjects.Container): void {
    this.config = config;
    this.health = config.maxHealth;
    this.target = target;

    // Update visual
    this.sprite.setFillStyle(config.color);

    // Position
    this.setPosition(x, y);

    // Activate
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;

    // Reset body
    this.body.setVelocity(0, 0);
  }

  /**
   * Despawn enemy (return to pool)
   */
  despawn(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.setVelocity(0, 0);

    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = undefined;
    }
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): boolean {
    this.health -= amount;

    // Flash effect
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      this.sprite.clearTint();
    });

    // Update health bar
    this.updateHealthBar();

    // Check death
    if (this.health <= 0) {
      this.die();
      return true; // Enemy died
    }

    return false; // Enemy still alive
  }

  /**
   * Enemy death
   */
  private die(): void {
    // Drop XP
    this.scene.events.emit('enemy-died', {
      x: this.x,
      y: this.y,
      xpValue: this.config.xpValue
    });

    // Despawn
    this.despawn();
  }

  /**
   * Update health bar
   */
  private updateHealthBar(): void {
    if (!this.healthBar) {
      this.healthBar = this.scene.add.graphics();
      this.add(this.healthBar);
    }

    this.healthBar.clear();

    const barWidth = 30;
    const barHeight = 3;
    const healthPercent = this.health / this.config.maxHealth;

    // Background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(-barWidth / 2, -20, barWidth, barHeight);

    // Health
    this.healthBar.fillStyle(0x00ff00);
    this.healthBar.fillRect(-barWidth / 2, -20, barWidth * healthPercent, barHeight);
  }

  /**
   * Update loop - move towards player
   */
  update(time: number, delta: number): void {
    if (!this.isActive || !this.target) return;

    // Calculate direction to target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);

    // Move towards target
    const velocityX = Math.cos(angle) * this.config.speed;
    const velocityY = Math.sin(angle) * this.config.speed;

    this.body.setVelocity(velocityX, velocityY);

    // Update health bar position
    if (this.healthBar) {
      this.healthBar.setPosition(0, 0);
    }
  }

  /**
   * Cleanup
   */
  destroy(fromScene?: boolean): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    super.destroy(fromScene);
  }
}
