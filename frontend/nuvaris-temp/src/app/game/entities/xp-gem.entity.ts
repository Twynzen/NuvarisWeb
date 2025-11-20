import * as Phaser from 'phaser';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export class XPGem extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;

  private visual: VisualComponent;
  public xpValue: number;
  public isActive = false;

  private magnetTarget?: Phaser.GameObjects.Container;
  private magnetSpeed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.xpValue = 10;

    // Create visual using VisualComponent
    this.visual = new VisualComponent(scene, {
      type: 'shape',
      shape: 'circle',
      radius: 6,
      color: GameConfig.colors.xp.low
    });
    this.add(this.visual);

    // Set depth
    this.setDepth(GameConfig.depths.item);

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
    let color = GameConfig.colors.xp.low;
    let radius = 6;

    if (xpValue >= 50) {
      color = GameConfig.colors.xp.high;
      radius = 8;
    } else if (xpValue >= 20) {
      color = GameConfig.colors.xp.medium;
      radius = 7;
    }

    this.visual.setConfig({
      radius: radius,
      color: color
    });
    this.body.setCircle(radius);

    // Activate
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;

    // Reset
    this.magnetTarget = undefined;
    this.magnetSpeed = 0;
    this.body.setVelocity(0, 0);

    // Add pulsing animation via Juice
    this.visual.squashAndStretch('x', 1.3, 500);
    // Note: VisualComponent squashAndStretch is yoyo by default but not repeating forever.
    // For continuous pulse, we might need to add a loop option to VisualComponent or just use tween here.
    // For now, let's use a custom tween on the visual component for the idle animation
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: 1.2,
      scaleY: 1.2,
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
    this.scene.tweens.killTweensOf(this.visual);
    this.visual.setScale(1);
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
  override update(time: number, delta: number): void {
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
