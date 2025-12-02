import * as Phaser from 'phaser';
import { Player } from './player.entity';
import { Enemy } from './enemy.entity';
import { Projectile } from './projectile.entity';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export interface WeaponConfig {
  name: string;
  damage: number;
  cooldown: number; // milliseconds
  range: number;
  projectileSpeed: number;
  level: number;
  pierce?: number;
  count?: number;
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
      runChildUpdate: true // Changed to true so VisualComponent updates
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
    const count = this.config.count || 1;
    const spread = 0.2; // Radians spread

    // Trigger player shooting animation FIRST
    this.player.onShoot(target.x, target.y);

    // For all characters with directional animations, delay the projectile spawn to sync with animation
    const shootDelay = (this.player.characterId === 'yurany' || this.player.characterId === 'lars' || this.player.characterId === 'arcadio') ? 800 : 0;

    this.scene.time.delayedCall(shootDelay, () => {
      for (let i = 0; i < count; i++) {
        // Get projectile from pool
        const projectile = this.getProjectileFromPool();
        if (!projectile) return;

        // Calculate angle offset
        let angleOffset = 0;
        if (count > 1) {
          angleOffset = (i - (count - 1) / 2) * spread;
        }

        // Calculate spawn offset based on direction (so projectile starts from weapon/edge, not center)
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y) + angleOffset;
        const spawnOffset = 50; // Distance from center to edge of sprite
        const spawnX = this.player.x + Math.cos(angle) * spawnOffset;
        const spawnY = this.player.y + Math.sin(angle) * spawnOffset;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
        const targetX = this.player.x + Math.cos(angle) * dist;
        const targetY = this.player.y + Math.sin(angle) * dist;

        // Calculate damage with crit
        let damage = this.config.damage;
        if (Math.random() < this.player.critChance) {
          damage *= this.player.critMultiplier;
          // TODO: Show crit text
        }

        // Fire towards target
        projectile.fire(
          spawnX,
          spawnY,
          targetX,
          targetY,
          damage,
          this.config.projectileSpeed,
          this.config.pierce || 0,
          this.player.characterId
        );
      }
    });
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
      .filter(child => child instanceof Enemy && child.isActive && !child.isMindControlled) as Enemy[];
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
  private orbitals: VisualComponent[] = [];
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
      this.addOrbital();
    }
  }

  private addOrbital(): void {
    const orbital = new VisualComponent(this.scene, {
      type: 'shape',
      shape: 'circle',
      radius: 12,
      color: 0x00ffff
    });
    this.scene.physics.add.existing(orbital);
    this.orbitals.push(orbital);
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

      // Juice: Rotate orbital itself
      orbital.setRotation(currentAngle + Math.PI / 2);

      // Check collision with enemies
      this.checkEnemyCollision(orbital);
    });
  }

  private checkEnemyCollision(orbital: VisualComponent): void {
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
      this.addOrbital();
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

  protected override fire(target: any): void {
    // Don't fire projectiles, create explosion at target location

    // Explosion visual using VisualComponent
    const explosion = new VisualComponent(this.scene, {
      type: 'shape',
      shape: 'circle',
      radius: 10,
      color: 0xff6600
    });
    explosion.setPosition(target.x, target.y);
    explosion.setAlpha(0.8);

    // Animate explosion
    this.scene.tweens.add({
      targets: explosion,
      scaleX: this.config.range / 10, // Scale radius 10 to range
      scaleY: this.config.range / 10,
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
    this.beam = scene.add.line(0, 0, 0, 0, 0, 0, GameConfig.colors.projectile.player, 0);
    this.beam.setLineWidth(3);
    this.beam.setDepth(GameConfig.depths.projectile);
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
