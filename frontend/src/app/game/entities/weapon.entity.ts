import * as Phaser from 'phaser';
import { Player } from './player.entity';
import { Enemy } from './enemy.entity';
import { Projectile } from './projectile.entity';

export interface WeaponConfig {
  name: string;
  damage: number;
  cooldown: number; // milliseconds
  range: number;
  projectileSpeed: number;
  level: number;
}

export class Weapon {
  protected scene: Phaser.Scene;
  protected player: Player;
  protected config: WeaponConfig;

  protected projectilePool: Phaser.GameObjects.Group;
  protected lastFireTime = 0;

  constructor(scene: Phaser.Scene, player: Player, config: WeaponConfig) {
    this.scene = scene;
    this.player = player;
    this.config = config;

    // Create projectile pool
    this.projectilePool = scene.add.group({
      classType: Projectile,
      maxSize: 50,
      runChildUpdate: false
    });

    // Pre-spawn some projectiles
    for (let i = 0; i < 20; i++) {
      const projectile = new Projectile(scene, 0, 0);
      this.projectilePool.add(projectile);
    }
  }

  /**
   * Update weapon - check cooldown and fire
   */
  update(time: number, delta: number): void {
    // Check cooldown
    if (time - this.lastFireTime < this.config.cooldown) {
      return;
    }

    // Find closest enemy
    const target = this.findClosestEnemy();
    if (!target) return;

    // Check range
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      target.x,
      target.y
    );

    if (distance > this.config.range) return;

    // Fire!
    this.fire(target);
    this.lastFireTime = time;
  }

  /**
   * Fire projectile at target
   */
  protected fire(target: Enemy): void {
    // Get projectile from pool
    const projectile = this.getProjectileFromPool();
    if (!projectile) return;

    // Fire towards target
    projectile.fire(
      this.player.x,
      this.player.y,
      target.x,
      target.y,
      this.config.damage,
      this.config.projectileSpeed
    );
  }

  /**
   * Find closest enemy
   */
  protected findClosestEnemy(): Enemy | null {
    const enemies = this.getActiveEnemies();
    if (enemies.length === 0) return null;

    let closest: Enemy | null = null;
    let closestDistance = Infinity;

    enemies.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closest = enemy;
      }
    });

    return closest;
  }

  /**
   * Get active enemies from scene
   */
  protected getActiveEnemies(): Enemy[] {
    const enemyGroup = this.scene.data.get('enemyGroup') as Phaser.GameObjects.Group;
    if (!enemyGroup) return [];

    return enemyGroup.getChildren()
      .filter(child => child instanceof Enemy && child.isActive) as Enemy[];
  }

  /**
   * Get projectile from pool
   */
  protected getProjectileFromPool(): Projectile | null {
    // Try to find inactive projectile
    const inactive = this.projectilePool.getChildren()
      .find(child => child instanceof Projectile && !child.isActive) as Projectile | undefined;

    if (inactive) {
      return inactive;
    }

    // Pool full, create new one if possible
    if (this.projectilePool.getLength() < this.projectilePool.maxSize!) {
      const projectile = new Projectile(this.scene, 0, 0);
      this.projectilePool.add(projectile);
      return projectile;
    }

    return null;
  }

  /**
   * Get all active projectiles
   */
  getActiveProjectiles(): Projectile[] {
    return this.projectilePool.getChildren()
      .filter(child => child instanceof Projectile && child.isActive) as Projectile[];
  }

  /**
   * Level up weapon
   */
  levelUp(): void {
    this.config.level++;

    // Increase stats based on level
    this.config.damage = Math.floor(this.config.damage * 1.2);
    this.config.cooldown = Math.max(100, this.config.cooldown * 0.95);
    this.config.range = Math.min(600, this.config.range * 1.1);

    console.log(`${this.config.name} leveled up to ${this.config.level}!`, this.config);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.projectilePool.clear(true, true);
  }
}

/**
 * Fireball Weapon - Basic projectile weapon
 */
export class FireballWeapon extends Weapon {
  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, {
      name: 'Fireball',
      damage: 15,
      cooldown: 1000, // 1 second
      range: 400,
      projectileSpeed: 300,
      level: 1
    });
  }
}

/**
 * Magic Missile - Faster, weaker projectiles
 */
export class MagicMissileWeapon extends Weapon {
  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, {
      name: 'Magic Missile',
      damage: 8,
      cooldown: 500, // 0.5 seconds
      range: 350,
      projectileSpeed: 400,
      level: 1
    });
  }
}

/**
 * Lightning Bolt - Slow, powerful
 */
export class LightningBoltWeapon extends Weapon {
  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, {
      name: 'Lightning Bolt',
      damage: 35,
      cooldown: 2000, // 2 seconds
      range: 500,
      projectileSpeed: 500,
      level: 1
    });
  }
}
