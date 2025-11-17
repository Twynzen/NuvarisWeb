import * as Phaser from 'phaser';

export class XPGem extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;

  private sprite: Phaser.GameObjects.Circle;
  public xpValue: number;
  public isActive = false;

  private magnetTarget?: Phaser.GameObjects.Container;
  private magnetSpeed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.xpValue = 10;

    // Create visual (glowing circle)
    this.sprite = scene.add.circle(0, 0, 6, 0x00ffff);
    this.add(this.sprite);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(12, 12);
    this.body.setCircle(6);

    // Add to scene
    scene.add.existing(this);

    // Start inactive
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * Spawn XP gem
   */
  spawn(x: number, y: number, xpValue: number): void {
    this.xpValue = xpValue;
    this.setPosition(x, y);

    // Color based on value
    if (xpValue >= 50) {
      this.sprite.setFillStyle(0xff00ff); // Purple for high value
      this.sprite.setRadius(8);
    } else if (xpValue >= 20) {
      this.sprite.setFillStyle(0x00ff00); // Green for medium value
      this.sprite.setRadius(7);
    } else {
      this.sprite.setFillStyle(0x00ffff); // Cyan for low value
      this.sprite.setRadius(6);
    }

    // Activate
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;

    // Reset
    this.magnetTarget = undefined;
    this.magnetSpeed = 0;
    this.body.setVelocity(0, 0);

    // Add pulsing animation
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Despawn gem (return to pool)
   */
  despawn(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.setVelocity(0, 0);

    // Stop animations
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(1);
  }

  /**
   * Start magnetic pull towards player
   */
  startMagnet(target: Phaser.GameObjects.Container): void {
    this.magnetTarget = target;
    this.magnetSpeed = 300;
  }

  /**
   * Update loop
   */
  update(time: number, delta: number): void {
    if (!this.isActive) return;

    // If magnetized, move towards target
    if (this.magnetTarget) {
      const angle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        this.magnetTarget.x,
        this.magnetTarget.y
      );

      const velocityX = Math.cos(angle) * this.magnetSpeed;
      const velocityY = Math.sin(angle) * this.magnetSpeed;

      this.body.setVelocity(velocityX, velocityY);

      // Accelerate
      this.magnetSpeed = Math.min(600, this.magnetSpeed * 1.05);
    }
  }

  /**
   * Collect gem
   */
  collect(): number {
    const value = this.xpValue;
    this.despawn();
    return value;
  }
}
