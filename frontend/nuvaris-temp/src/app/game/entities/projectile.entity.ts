import * as Phaser from 'phaser';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export class Projectile extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;

  private visual: VisualComponent;

  public damage = 10;
  public speed = 300;
  public lifetime = 3000; // 3 seconds
  public isActive = false;

  private spawnTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create visual using VisualComponent
    this.visual = new VisualComponent(scene, {
      type: 'shape',
      shape: 'circle',
      radius: GameConfig.sizes.projectile / 2,
      color: GameConfig.colors.projectile.player
    });
    this.add(this.visual);

    // Set depth
    this.setDepth(GameConfig.depths.projectiles);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(GameConfig.sizes.projectile, GameConfig.sizes.projectile);

    // Add to scene
    scene.add.existing(this);

    // Start inactive
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * Fire projectile towards target
   */
  fire(x: number, y: number, targetX: number, targetY: number, damage: number, speed: number = 300): void {
    this.damage = damage;
    this.speed = speed;
    this.spawnTime = this.scene.time.now;

    // Position
    this.setPosition(x, y);

    // Calculate direction
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);

    // Set velocity
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    this.body.setVelocity(velocityX, velocityY);

    // Juice: Rotate visual to match direction (for future sprites)
    this.visual.setRotation(angle);

    // Juice: Stretch slightly in direction of movement
    this.visual.squashAndStretch('x', 1.3, 100);

    // Activate
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;
  }

  /**
   * Despawn projectile (return to pool)
   */
  despawn(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.setVelocity(0, 0);
  }

  /**
   * Update loop - check lifetime
   */
  override update(time: number, delta: number): void {
    if (!this.isActive) return;

    // Check lifetime
    if (time - this.spawnTime > this.lifetime) {
      this.despawn();
    }
  }

  /**
   * Handle collision
   */
  onHit(): void {
    // Juice: Small impact effect before despawn
    // (Could add particle burst here later)
    this.despawn();
  }
}
