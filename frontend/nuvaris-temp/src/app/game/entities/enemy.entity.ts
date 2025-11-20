import * as Phaser from 'phaser';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export interface EnemyConfig {
  type: string;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  color: number;
  size?: number;
}

export class Enemy extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;

  private visual: VisualComponent;
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
      color: GameConfig.colors.enemy.zombie,
      size: GameConfig.sizes.enemy.zombie
    };

    this.health = this.config.maxHealth;

    // Create visual using VisualComponent
    // Default to worm asset for now
    this.visual = new VisualComponent(scene, {
      type: 'sprite',
      texture: 'worm-move-1',
      width: (this.config.size || 30) * 4.5,
      height: (this.config.size || 30) * 4.5
    });
    this.add(this.visual);

    // Set depth
    this.setDepth(GameConfig.depths.enemy);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(this.config.size || 30, this.config.size || 30);

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

    // Update visual based on type
    const size = config.size || GameConfig.sizes.enemy.zombie;

    // Determine asset key based on type
    // Mapping 'zombie' -> 'worm', 'runner' -> 'spider' for now as per user request
    let animKey = 'worm-move';
    if (config.type === 'runner' || config.type === 'spider') {
      animKey = 'spider-move';
    } else {
      animKey = 'worm-move';
    }

    this.visual.setConfig({
      type: 'sprite',
      width: size * 4.5,
      height: size * 4.5
    });

    // Start animation
    this.visual.playAnimation(animKey, 8);

    this.body.setSize(size, size);

    // Position
    this.setPosition(x, y);

    // Activate
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;

    // Reset body
    this.body.setVelocity(0, 0);

    // Juice: Pop in
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Despawn enemy (return to pool)
   */
  despawn(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.setVelocity(0, 0);
    this.visual.stopAnimation();

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
    this.visual.flash(50);

    // Juice: Knockback/Shake
    this.visual.squashAndStretch('x', 1.2, 50);

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

    const size = this.config.size || 30;
    const barWidth = size;
    const barHeight = 3;
    const healthPercent = this.health / this.config.maxHealth;

    // Background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(-barWidth / 2, -size / 1.5, barWidth, barHeight);

    // Health
    this.healthBar.fillStyle(0x00ff00);
    this.healthBar.fillRect(-barWidth / 2, -size / 1.5, barWidth * healthPercent, barHeight);
  }

  /**
   * Update loop - move towards player
   */
  override update(time: number, delta: number): void {
    if (!this.isActive || !this.target) return;

    // Calculate direction to target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);

    // Move towards target
    const velocityX = Math.cos(angle) * this.config.speed;
    const velocityY = Math.sin(angle) * this.config.speed;

    this.body.setVelocity(velocityX, velocityY);

    // Rotate visual to face player
    // Assuming assets face RIGHT (0 rad) or DOWN (PI/2). 
    // Worm/Spider assets usually face DOWN or RIGHT. 
    // If they face DOWN by default, we subtract 90 deg (PI/2).
    // Let's assume they face DOWN based on typical top-down assets.
    this.visual.setRotation(angle - (Math.PI / 2));

    // Update health bar position (keep it horizontal)
    if (this.healthBar) {
      this.healthBar.setRotation(-(angle - (Math.PI / 2))); // Counter-rotate
    }
  }

  /**
   * Cleanup
   */
  override destroy(fromScene?: boolean): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    super.destroy(fromScene);
  }
}
