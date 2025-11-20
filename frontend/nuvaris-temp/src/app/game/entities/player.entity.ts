import * as Phaser from 'phaser';
import { Weapon } from './weapon.entity';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export class Player extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;

  private visual!: VisualComponent;
  private weapons: Weapon[] = [];

  // Stats
  public maxHealth = GameConfig.balance.player.maxHealth;
  public health = GameConfig.balance.player.maxHealth;
  public speed = GameConfig.balance.player.speed;
  public damage = 10;
  public pickupRadius = 100;
  public critChance = 0; // 0 to 1
  public critMultiplier = 2;
  public lifesteal = 0; // 0 to 1
  public isInvulnerable = false;

  // Movement
  private velocityX = 0;
  private velocityY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create visual using VisualComponent
    this.visual = new VisualComponent(scene, {
      type: 'shape',
      shape: 'rectangle',
      width: GameConfig.sizes.player,
      height: GameConfig.sizes.player,
      color: GameConfig.colors.player
    });
    this.add(this.visual);

    // Set depth
    this.setDepth(GameConfig.depths.player);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(GameConfig.sizes.player, GameConfig.sizes.player);

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
    const isMoving = x !== 0 || y !== 0;

    // Juice: Squash and stretch on movement start
    if (isMoving && this.velocityX === 0 && this.velocityY === 0) {
      this.visual.squashAndStretch('y', 0.9, 100);
    }

    this.velocityX = x;
    this.velocityY = y;
    this.body.setVelocity(x, y);
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    if (this.isInvulnerable) return;

    this.health = Math.max(0, this.health - amount);

    // Flash effect
    this.visual.flash();

    // Juice: Shake
    this.scene.tweens.add({
      targets: this.visual,
      x: { from: -2, to: 2 },
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.visual.setX(0)
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
    this.visual.setTint(0x00ff00);
    this.scene.time.delayedCall(200, () => this.visual.setTint(GameConfig.colors.player));
  }

  /**
   * Player death
   */
  private die(): void {
    console.log('Player died!');
    this.scene.events.emit('player-died');
  }

  /**
   * Update loop
   */
  override update(time: number, delta: number): void {
    // Update all weapons
    this.weapons.forEach(weapon => {
      weapon.update(time, delta);
    });
  }

  /**
   * Cleanup
   */
  override destroy(fromScene?: boolean): void {
    this.weapons.forEach(weapon => weapon.destroy());
    this.weapons = [];
    super.destroy(fromScene);
  }
}
