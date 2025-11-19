import * as Phaser from 'phaser';

export class VirtualJoystick extends Phaser.GameObjects.Container {
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private isDragging = false;
  private radius = 60;

  // Output values (override Container properties)
  public override x = 0;
  public override y = 0;
  public force = 0;
  public override angle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Base circle (outer)
    this.base = scene.add.circle(0, 0, this.radius, 0x888888, 0.3);
    this.base.setStrokeStyle(2, 0xffffff, 0.5);
    this.add(this.base);

    // Thumb circle (inner)
    this.thumb = scene.add.circle(0, 0, this.radius / 2, 0xffffff, 0.6);
    this.thumb.setStrokeStyle(2, 0xffffff, 0.8);
    this.add(this.thumb);

    // Make interactive
    this.base.setInteractive();

    // Set up input events
    this.base.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);

    // Add to scene
    scene.add.existing(this);

    // Fixed to camera
    this.setScrollFactor(0);
    this.setDepth(1000);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    // Calculate offset from base
    const dx = pointer.x - (this.x + this.base.x);
    const dy = pointer.y - (this.y + this.base.y);

    // Calculate distance and angle
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.angle = Math.atan2(dy, dx);

    // Limit thumb to base radius
    const clampedDistance = Math.min(distance, this.radius);

    // Update thumb position
    this.thumb.x = Math.cos(this.angle) * clampedDistance;
    this.thumb.y = Math.sin(this.angle) * clampedDistance;

    // Calculate normalized values
    this.x = this.thumb.x / this.radius;
    this.y = this.thumb.y / this.radius;
    this.force = clampedDistance / this.radius;
  }

  private onPointerUp(): void {
    if (!this.isDragging) return;

    this.isDragging = false;

    // Reset thumb position
    this.scene.tweens.add({
      targets: this.thumb,
      x: 0,
      y: 0,
      duration: 100,
      ease: 'Cubic.easeOut'
    });

    // Reset values
    this.x = 0;
    this.y = 0;
    this.force = 0;
  }

  /**
   * Get normalized direction vector
   */
  getDirection(): { x: number; y: number } {
    return {
      x: this.x,
      y: this.y
    };
  }

  /**
   * Check if joystick is being used
   */
  isActive(): boolean {
    return this.isDragging;
  }

  /**
   * Show joystick
   */
  show(): void {
    this.setVisible(true);
    this.setAlpha(1);
  }

  /**
   * Hide joystick
   */
  hide(): void {
    this.setVisible(false);
  }

  /**
   * Cleanup
   */
  override destroy(fromScene?: boolean): void {
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    super.destroy(fromScene);
  }
}
