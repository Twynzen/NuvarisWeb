import * as Phaser from 'phaser';

export class Projectile extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;

  private sprite: Phaser.GameObjects.Rectangle;

  public damage = 10;
  public speed = 300;
  public lifetime = 3000; // 3 seconds
  public isActive = false;

  private spawnTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create visual (placeholder - small circle)
    this.sprite = scene.add.rectangle(0, 0, 8, 8, 0xffff00);
    this.add(this.sprite);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(8, 8);

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
  update(time: number, delta: number): void {
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
    this.despawn();
  }
}
