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

/**
 * Orbital Weapon - Rotates around player, damages on contact
 */
export class OrbitalWeapon {
  private scene: Phaser.Scene;
  private player: Player;
  private orbitals: Phaser.GameObjects.Arc[] = [];
  private config: WeaponConfig;
  private angle = 0;
  private orbitRadius = 80;
  private numOrbitals = 3;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    this.config = {
      name: 'Orbital Blades',
      damage: 20,
      cooldown: 100, // Damage tick rate
      range: 100,
      projectileSpeed: 0,
      level: 1
    };

    // Create orbitals
    for (let i = 0; i < this.numOrbitals; i++) {
      const orbital = scene.add.circle(0, 0, 12, 0x00ffff);
      scene.physics.add.existing(orbital);
      this.orbitals.push(orbital);
    }
  }

  update(time: number, delta: number): void {
    // Rotate orbitals
    this.angle += (delta / 1000) * 2; // 2 radians per second

    this.orbitals.forEach((orbital, index) => {
      const angleOffset = (Math.PI * 2 / this.numOrbitals) * index;
      const currentAngle = this.angle + angleOffset;

      const x = this.player.x + Math.cos(currentAngle) * this.orbitRadius;
      const y = this.player.y + Math.sin(currentAngle) * this.orbitRadius;

      orbital.setPosition(x, y);

      // Check collision with enemies
      this.checkEnemyCollision(orbital);
    });
  }

  private checkEnemyCollision(orbital: Phaser.GameObjects.Arc): void {
    const enemies = this.getActiveEnemies();

    enemies.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        orbital.x,
        orbital.y,
        enemy.x,
        enemy.y
      );

      if (distance < 30) {
        enemy.takeDamage(this.config.damage);

        // Flash effect
        orbital.setAlpha(0.5);
        this.scene.time.delayedCall(50, () => {
          orbital.setAlpha(1);
        });
      }
    });
  }

  private getActiveEnemies(): any[] {
    const enemyGroup = this.scene.data.get('enemyGroup') as Phaser.GameObjects.Group;
    if (!enemyGroup) return [];

    return enemyGroup.getChildren()
      .filter((child: any) => child.isActive);
  }

  levelUp(): void {
    this.config.level++;
    this.config.damage = Math.floor(this.config.damage * 1.2);
    this.orbitRadius = Math.min(150, this.orbitRadius + 10);

    // Add more orbitals at higher levels
    if (this.config.level % 3 === 0 && this.numOrbitals < 8) {
      this.numOrbitals++;
      const orbital = this.scene.add.circle(0, 0, 12, 0x00ffff);
      this.scene.physics.add.existing(orbital);
      this.orbitals.push(orbital);
    }
  }

  destroy(): void {
    this.orbitals.forEach(o => o.destroy());
    this.orbitals = [];
  }
}

/**
 * Area of Effect Weapon - Explodes in an area
 */
export class AoEWeapon extends Weapon {
  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, {
      name: 'Explosion',
      damage: 40,
      cooldown: 3000, // 3 seconds
      range: 250,
      projectileSpeed: 0,
      level: 1
    });
  }

  protected fire(target: any): void {
    // Don't fire projectiles, create explosion at target location

    // Explosion visual
    const explosion = this.scene.add.circle(target.x, target.y, 10, 0xff6600, 0.8);

    // Animate explosion
    this.scene.tweens.add({
      targets: explosion,
      radius: this.config.range,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        explosion.destroy();
      }
    });

    // Damage all enemies in range
    const enemies = this.getActiveEnemies();
    enemies.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        target.x,
        target.y,
        enemy.x,
        enemy.y
      );

      if (distance <= this.config.range) {
        enemy.takeDamage(this.config.damage);
      }
    });
  }
}

/**
 * Beam Weapon - Continuous laser beam
 */
export class BeamWeapon {
  private scene: Phaser.Scene;
  private player: Player;
  private config: WeaponConfig;
  private beam?: Phaser.GameObjects.Line;
  private lastDamageTime = 0;
  private currentTarget?: any;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    this.config = {
      name: 'Laser Beam',
      damage: 5, // Per tick
      cooldown: 100, // Damage tick rate
      range: 400,
      projectileSpeed: 0,
      level: 1
    };

    // Create beam line
    this.beam = scene.add.line(0, 0, 0, 0, 0, 0, 0xff0000, 0);
    this.beam.setLineWidth(3);
    this.beam.setDepth(10);
  }

  update(time: number, delta: number): void {
    // Find closest enemy
    const target = this.findClosestEnemy();

    if (target) {
      this.currentTarget = target;

      // Check range
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y
      );

      if (distance <= this.config.range) {
        // Show beam
        this.beam?.setAlpha(0.8);
        this.beam?.setTo(this.player.x, this.player.y, target.x, target.y);

        // Apply damage
        if (time - this.lastDamageTime >= this.config.cooldown) {
          target.takeDamage(this.config.damage);
          this.lastDamageTime = time;

          // Beam flash effect
          this.beam?.setAlpha(1);
        }
      } else {
        this.beam?.setAlpha(0);
      }
    } else {
      this.beam?.setAlpha(0);
    }
  }

  private findClosestEnemy(): any | null {
    const enemies = this.getActiveEnemies();
    if (enemies.length === 0) return null;

    let closest: any | null = null;
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

  private getActiveEnemies(): any[] {
    const enemyGroup = this.scene.data.get('enemyGroup') as Phaser.GameObjects.Group;
    if (!enemyGroup) return [];

    return enemyGroup.getChildren()
      .filter((child: any) => child.isActive);
  }

  levelUp(): void {
    this.config.level++;
    this.config.damage = Math.floor(this.config.damage * 1.3);
    this.config.range = Math.min(600, this.config.range + 50);
  }

  destroy(): void {
    this.beam?.destroy();
  }
}
