import * as Phaser from 'phaser';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export class Projectile extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;

  private visual!: VisualComponent;

  public damage = 10;
  public speed = 300;
  public lifetime = 3000; // 3 seconds
  public isActive = false;
  private spawnTime = 0;
  public pierce = 0;
  private hitEnemies: any[] = [];
  private characterId: string = 'arcadio'; // Store character ID for particle effects
  private lastTrailTime = 0; // Timer for particle trail
  public particleColor: number = 0xff0000; // Color for hit particles

  /**
   * Fire projectile towards target
   */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create visual using VisualComponent - will be updated when fired
    this.visual = new VisualComponent(scene, {
      type: 'sprite',
      texture: 'arcadio-hit', // Default, will be updated
      width: 20,
      height: 20
    });
    this.add(this.visual);

    // Set depth
    this.setDepth(GameConfig.depths.projectile);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(20, 20);

    // Add to scene
    scene.add.existing(this);

    // Start inactive
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * Fire projectile towards target
   */
  fire(x: number, y: number, targetX: number, targetY: number, damage: number, speed: number = 300, pierce: number = 0, characterId: string = 'arcadio'): void {
    this.damage = damage;
    this.speed = speed;
    this.pierce = pierce;
    this.spawnTime = this.scene.time.now;
    this.hitEnemies = [];
    this.characterId = characterId; // Store for particle effects
    this.lastTrailTime = this.scene.time.now;

    // Set particle color based on character
    switch (characterId) {
      case 'arcadio':
        this.particleColor = 0xff0000; // Red
        break;
      case 'lars':
        this.particleColor = 0x1a237e; // Dark blue
        break;
      case 'yurany':
        this.particleColor = 0xffffff; // White
        break;
      default:
        this.particleColor = 0xffff00; // Default yellow
    }

    // Update visual to use character's hit sprite
    this.visual.setConfig({
      type: 'sprite',
      texture: `${characterId}-hit`,
      width: 30,
      height: 30
    });

    // Ensure body exists
    if (!this.body) {
      this.scene.physics.add.existing(this);
      (this.body as Phaser.Physics.Arcade.Body).setSize(20, 20);
    }

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
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
  }

  /**
   * Update loop - check lifetime and create particle trail
   */
  override update(time: number, delta: number): void {
    if (!this.isActive) return;

    // Create particle trail effect every 50ms
    if (time - this.lastTrailTime > 50) {
      const particleManager = this.scene.data.get('particleManager');
      if (particleManager) {
        particleManager.createProjectileTrail(this.x, this.y, this.characterId);
      }
      this.lastTrailTime = time;
    }

    // Check lifetime
    if (time - this.spawnTime > this.lifetime) {
      this.despawn();
    }
  }

  /**
   * Check if can hit target
   */
  canHit(target: any): boolean {
    return !this.hitEnemies.includes(target);
  }

  /**
   * Handle collision
   */
  onHit(target: any): void {
    this.hitEnemies.push(target);

    if (this.pierce > 0) {
      this.pierce--;
    } else {
      this.despawn();
    }
  }
}
