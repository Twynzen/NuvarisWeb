import * as Phaser from 'phaser';
import { Weapon } from './weapon.entity';

export class Player extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;

  private sprite: Phaser.GameObjects.Rectangle;
  private weapons: Weapon[] = [];

  // Stats
  public maxHealth = 100;
  public health = 100;
  public speed = 200;
  public damage = 10;
  public pickupRadius = 100;

  // Movement
  private velocityX = 0;
  private velocityY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create visual (placeholder - will be replaced with sprite)
    this.sprite = scene.add.rectangle(0, 0, 40, 40, 0x00ff00);
    this.add(this.sprite);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(40, 40);

    // Add to scene
    scene.add.existing(this);
  }

  /**
   * Add a weapon to the player
   */
  addWeapon(weapon: Weapon): void {
    this.weapons.push(weapon);
  }

  /**
   * Remove a weapon from the player
   */
  removeWeapon(weapon: Weapon): void {
    const index = this.weapons.indexOf(weapon);
    if (index > -1) {
      this.weapons.splice(index, 1);
    }
  }

  /**
   * Get all active weapons
   */
  getWeapons(): Weapon[] {
    return this.weapons;
  }

  /**
   * Update player movement
   */
  setVelocity(x: number, y: number): void {
    this.velocityX = x;
    this.velocityY = y;
    this.body.setVelocity(x, y);
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);

    // Flash effect
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });

    // Check death
    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Heal player
   */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Player death
   */
  private die(): void {
    console.log('Player died!');
    this.scene.scene.pause();
    // TODO: Emit death event to Angular
  }

  /**
   * Update loop
   */
  update(time: number, delta: number): void {
    // Update all weapons
    this.weapons.forEach(weapon => {
      weapon.update(time, delta);
    });
  }

  /**
   * Cleanup
   */
  destroy(fromScene?: boolean): void {
    this.weapons.forEach(weapon => weapon.destroy());
    this.weapons = [];
    super.destroy(fromScene);
  }
}
