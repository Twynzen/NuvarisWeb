import * as Phaser from 'phaser';
import { GameConfig } from '../config/game.config';
import { VisualComponent } from '../components/visual.component';
import { Weapon } from './weapon.entity';
import { CharacterAbility } from '../abilities/character-ability';

export class Player extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;
  public visual: VisualComponent;

  // Stats
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number = 1;
  public critChance: number = 0;
  public critMultiplier: number = 1.5;
  public lifesteal: number = 0;
  public pickupRadius: number = 100;
  public isInvulnerable: boolean = false;

  // State
  private weapons: Weapon[] = [];
  public characterId: string;
  private lastDirection: string = 'down';
  private isShooting: boolean = false;
  private shootTimer?: Phaser.Time.TimerEvent;

  // Movement tracking for juice
  private velocityX = 0;
  private velocityY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, characterId: string = 'arcadio') {
    super(scene, x, y);
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);

    this.characterId = characterId;

    // Initialize stats from config
    this.maxHealth = GameConfig.balance.player.maxHealth;
    this.health = this.maxHealth;
    this.speed = GameConfig.balance.player.speed;

    // Setup Body
    this.body.setCircle(GameConfig.sizes.player / 2);
    this.body.setOffset(-GameConfig.sizes.player / 2, -GameConfig.sizes.player / 2);
    this.body.setCollideWorldBounds(true);

    // Setup Visuals
    // Initial texture based on character
    this.visual = new VisualComponent(scene, {
      type: 'sprite',
      texture: `${this.characterId}-static-1`,
      width: 200,
      height: 275
    });
    this.add(this.visual);

    // Debug
    if ((GameConfig as any).debugAssetSizes) {
      this.visual.setDebug(true);
    }

    // Start idle animation
    const idleRate = (this.characterId === 'yurany') ? 8 : (this.characterId === 'lars' ? 15 : 1);
    this.visual.playAnimation(`${this.characterId}-idle`, idleRate);

    // Depth
    this.setDepth(GameConfig.depths.player);
  }

  // Ability
  public ability?: CharacterAbility;

  setAbility(ability: CharacterAbility): void {
    this.ability = ability;
    this.ability.initialize(this.scene, this);
  }

  override update(time: number, delta: number): void {
    // Handle movement animations
    if (this.body.velocity.length() > 10) {
      this.updateMoveAnimation();
    } else {
      if (!this.isShooting) {
        const idleRate = (this.characterId === 'yurany') ? 8 : (this.characterId === 'lars' ? 15 : (this.characterId === 'arcadio' ? 15 : 1));
        this.visual.playAnimation(`${this.characterId}-idle`, idleRate);
        this.visual.setRotation(0); // Reset rotation when idle

        // Reset flip for all characters when idle
        if (this.characterId === 'lars' || this.characterId === 'yurany' || this.characterId === 'arcadio') {
          this.visual.setFlip(false, false);
        }
      }
    }

    // Update weapons
    this.weapons.forEach(w => w.update(time, delta));

    // Update ability
    if (this.ability) {
      this.ability.update(time, delta);
    }
  }

  /**
   * Set velocity (called by GameScene)
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

  private updateMoveAnimation(): void {
    if (this.isShooting) return; // Don't override shooting animation

    const velocity = this.body.velocity;
    let direction = '';

    // Determine dominant direction to avoid diagonals
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      if (velocity.x < -10) direction = 'left';
      if (velocity.x > 10) direction = 'right';
    } else {
      if (velocity.y < -10) direction = 'up';
      if (velocity.y > 10) direction = 'down';
    }

    // Handle flipping for characters using right animation for left
    if (this.characterId === 'lars' || this.characterId === 'yurany' || this.characterId === 'arcadio') {
      if (velocity.x < -10) {
        // Moving left - flip the sprite
        this.visual.setFlip(true, false);
      } else if (velocity.x > 10) {
        // Moving right - no flip
        this.visual.setFlip(false, false);
      } else if (direction === 'up' || direction === 'down') {
        // Moving vertically - reset flip to avoid issues
        this.visual.setFlip(false, false);
      }
    }

    if (direction !== '') {
      this.lastDirection = direction;
      // Check if animation exists in config before playing, fallback to simple direction if needed
      // But for now we assume all 8 directions exist for all chars
      const animKey = `${this.characterId}-walk-${direction}`;

      // Adjust frame rate for walk animations
      let frameRate = 15; // Default
      if (this.characterId === 'lars' && (direction.includes('left') || direction.includes('right') || direction.includes('down') || direction.includes('up'))) {
        frameRate = 15; // All directions at same speed
      } else if (this.characterId === 'yurany' && (direction.includes('left') || direction.includes('right') || direction.includes('up') || direction.includes('down'))) {
        frameRate = 15;
      } else if (this.characterId === 'arcadio' && (direction.includes('left') || direction.includes('right') || direction.includes('up') || direction.includes('down'))) {
        frameRate = 15;
      }

      this.visual.playAnimation(animKey, frameRate);
      this.visual.setRotation(0); // Ensure upright
    }
  }

  public onShoot(targetX: number, targetY: number): void {
    // Trigger shooting visual
    this.isShooting = true;

    // Calculate angle to target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const deg = Phaser.Math.RadToDeg(angle);

    if (this.characterId === 'yurany' || this.characterId === 'lars' || this.characterId === 'arcadio') {
      let animKey = '';
      let flipX = false;

      if (deg >= -45 && deg <= 45) {
        animKey = 'right';
      } else if (deg > 45 && deg < 135) {
        animKey = 'down';
      } else if (deg >= 135 || deg <= -135) {
        animKey = 'right'; // Use right for left
        flipX = true;
      } else {
        animKey = 'up';
      }

      this.visual.playAnimation(`${this.characterId}-shoot-${animKey}`, 30);
      this.visual.setFlip(flipX, false);
      this.visual.setRotation(0); // Don't rotate sprite, animation has direction
    } else {
      // Fallback for other characters
      this.visual.stopAnimation();
      this.visual.setSprite(`${this.characterId}-shoot`);
      // Phaser 0 is Right, 90 is Down.
      // Sprites usually point DOWN or RIGHT.
      // Assuming shoot sprite points DOWN (based on typical RPG assets).
      // If sprite points DOWN (90 deg), rotation = angle - 90 deg.
      this.visual.setRotation(angle - (Math.PI / 2));
    }

    // Reset after animation completes (30 frames at 30 fps = 1 second)
    if (this.shootTimer) this.shootTimer.remove();
    this.shootTimer = this.scene.time.delayedCall(1000, () => {
      this.isShooting = false;
      this.visual.setRotation(0);
      // Animation will resume in update()
    });
  }

  addWeapon(weapon: Weapon): void {
    this.weapons.push(weapon);
  }

  getWeapons(): Weapon[] {
    return this.weapons;
  }

  takeDamage(amount: number): boolean {
    if (this.isInvulnerable) return false;

    this.health = Math.max(0, this.health - amount);

    // Visual feedback
    this.visual.flash();
    this.visual.squashAndStretch('y', 0.8, 100);

    // Check if player died
    const died = this.health <= 0;
    if (died) {
      this.die();
    }

    return died;
  }

  onEnemyHit(enemy: any): void {
    if (this.ability) {
      this.ability.onEnemyHitPlayer(enemy, this);
    }
  }


  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.visual.setTint(0x00ff00);
    this.scene.time.delayedCall(200, () => this.visual.setTint(0xffffff));
  }

  private die(): void {
    console.log('Player died!');
    this.scene.events.emit('player-died');
  }

  override destroy(fromScene?: boolean): void {
    this.weapons.forEach(weapon => weapon.destroy());
    this.weapons = [];
    super.destroy(fromScene);
  }
}
