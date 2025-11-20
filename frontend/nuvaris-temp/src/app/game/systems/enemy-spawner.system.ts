import * as Phaser from 'phaser';
import { Enemy, EnemyConfig } from '../entities/enemy.entity';

export interface WaveConfig {
  minTime: number; // seconds
  maxTime: number; // seconds
  enemies: Array<{
    type: string;
    count: number;
    config: EnemyConfig;
  }>;
  spawnRate: number; // milliseconds between spawns
}

export class EnemySpawner {
  private scene: Phaser.Scene;
  private target: Phaser.GameObjects.Container;
  private enemyPool: Phaser.GameObjects.Group;

  private waves: WaveConfig[] = [];
  private currentWaveIndex = 0;
  private lastSpawnTime = 0;
  private gameStartTime = 0;

  private maxEnemies = 300;
  private spawnDistance = 100; // Distance outside viewport

  private spawnValidator?: (x: number, y: number) => boolean;

  constructor(scene: Phaser.Scene, target: Phaser.GameObjects.Container, spawnValidator?: (x: number, y: number) => boolean) {
    this.scene = scene;
    this.target = target;
    this.spawnValidator = spawnValidator;
    this.gameStartTime = scene.time.now;

    // Create enemy pool
    this.enemyPool = scene.add.group({
      classType: Enemy,
      maxSize: this.maxEnemies,
      runChildUpdate: true
    });

    // Pre-spawn enemies for pooling
    for (let i = 0; i < 50; i++) {
      const enemy = new Enemy(scene, 0, 0);
      this.enemyPool.add(enemy);
    }

    // Store in scene for weapons to access
    scene.data.set('enemyGroup', this.enemyPool);

    // Setup waves
    this.setupWaves();
  }

  /**
   * Setup wave configurations
   */
  private setupWaves(): void {
    // Wave 1: 0-60 seconds
    this.waves.push({
      minTime: 0,
      maxTime: 60,
      enemies: [
        {
          type: 'zombie',
          count: 20,
          config: {
            type: 'zombie',
            maxHealth: 20,
            speed: 50,
            damage: 10,
            xpValue: 5,
            color: 0xff4444
          }
        }
      ],
      spawnRate: 2000 // Every 2 seconds
    });

    // Wave 2: 60-120 seconds
    this.waves.push({
      minTime: 60,
      maxTime: 120,
      enemies: [
        {
          type: 'zombie',
          count: 30,
          config: {
            type: 'zombie',
            maxHealth: 30,
            speed: 60,
            damage: 12,
            xpValue: 7,
            color: 0xff4444
          }
        },
        {
          type: 'runner',
          count: 10,
          config: {
            type: 'runner',
            maxHealth: 15,
            speed: 100,
            damage: 8,
            xpValue: 10,
            color: 0x44ff44
          }
        }
      ],
      spawnRate: 1500
    });

    // Wave 3: 120-180 seconds
    this.waves.push({
      minTime: 120,
      maxTime: 180,
      enemies: [
        {
          type: 'zombie',
          count: 40,
          config: {
            type: 'zombie',
            maxHealth: 40,
            speed: 70,
            damage: 15,
            xpValue: 10,
            color: 0xff4444
          }
        },
        {
          type: 'runner',
          count: 20,
          config: {
            type: 'runner',
            maxHealth: 20,
            speed: 120,
            damage: 10,
            xpValue: 12,
            color: 0x44ff44
          }
        },
        {
          type: 'tank',
          count: 5,
          config: {
            type: 'tank',
            maxHealth: 100,
            speed: 30,
            damage: 25,
            xpValue: 30,
            color: 0x4444ff
          }
        }
      ],
      spawnRate: 1000
    });

    // Wave 4: 180-240 seconds
    this.waves.push({
      minTime: 180,
      maxTime: 240,
      enemies: [
        {
          type: 'zombie',
          count: 50,
          config: {
            type: 'zombie',
            maxHealth: 50,
            speed: 80,
            damage: 18,
            xpValue: 12,
            color: 0xff4444
          }
        },
        {
          type: 'runner',
          count: 30,
          config: {
            type: 'runner',
            maxHealth: 25,
            speed: 140,
            damage: 12,
            xpValue: 15,
            color: 0x44ff44
          }
        },
        {
          type: 'tank',
          count: 10,
          config: {
            type: 'tank',
            maxHealth: 150,
            speed: 35,
            damage: 30,
            xpValue: 40,
            color: 0x4444ff
          }
        }
      ],
      spawnRate: 800
    });

    // Wave 5+: Infinite scaling
    this.waves.push({
      minTime: 240,
      maxTime: Infinity,
      enemies: [
        {
          type: 'zombie',
          count: 100,
          config: {
            type: 'zombie',
            maxHealth: 60,
            speed: 90,
            damage: 20,
            xpValue: 15,
            color: 0xff4444
          }
        },
        {
          type: 'runner',
          count: 40,
          config: {
            type: 'runner',
            maxHealth: 30,
            speed: 160,
            damage: 15,
            xpValue: 18,
            color: 0x44ff44
          }
        },
        {
          type: 'tank',
          count: 15,
          config: {
            type: 'tank',
            maxHealth: 200,
            speed: 40,
            damage: 35,
            xpValue: 50,
            color: 0x4444ff
          }
        }
      ],
      spawnRate: 600
    });
  }

  private isSpawning = true;

  /**
   * Stop spawning
   */
  stop(): void {
    this.isSpawning = false;
  }

  /**
   * Update spawner - spawn enemies based on current wave
   */
  update(time: number, delta: number): void {
    if (!this.isSpawning) return;

    const gameTime = (time - this.gameStartTime) / 1000; // Convert to seconds

    // Find current wave
    const currentWave = this.getCurrentWave(gameTime);
    if (!currentWave) return;

    // Check if it's time to spawn
    if (time - this.lastSpawnTime < currentWave.spawnRate) {
      return;
    }

    // Check max enemies
    const activeEnemies = this.getActiveEnemies().length;
    if (activeEnemies >= this.maxEnemies) {
      return;
    }

    // Spawn enemy
    this.spawnRandomEnemy(currentWave);
    this.lastSpawnTime = time;
  }

  /**
   * Get current wave based on game time
   */
  private getCurrentWave(gameTime: number): WaveConfig | null {
    for (const wave of this.waves) {
      if (gameTime >= wave.minTime && gameTime < wave.maxTime) {
        return wave;
      }
    }
    return null;
  }

  /**
   * Spawn random enemy from current wave
   */
  private spawnRandomEnemy(wave: WaveConfig): void {
    // Pick random enemy type from wave
    const enemyType = Phaser.Utils.Array.GetRandom(wave.enemies);
    if (!enemyType) return;

    // Get enemy from pool
    const enemy = this.getEnemyFromPool();
    if (!enemy) return;

    // Calculate spawn position (outside viewport)
    const spawnPos = this.getRandomSpawnPosition();

    // Spawn enemy
    enemy.spawn(spawnPos.x, spawnPos.y, enemyType.config, this.target);
  }

  /**
   * Get random spawn position outside viewport
   */
  private getRandomSpawnPosition(): { x: number; y: number } {
    const camera = this.scene.cameras.main;
    const centerX = this.target.x;
    const centerY = this.target.y;

    let x = 0;
    let y = 0;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      // Random angle
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

      // Distance outside viewport
      const distance = Math.max(camera.width, camera.height) / 2 + this.spawnDistance;

      // Calculate position
      x = centerX + Math.cos(angle) * distance;
      y = centerY + Math.sin(angle) * distance;

      // Validate
      if (!this.spawnValidator || this.spawnValidator(x, y)) {
        return { x, y };
      }

      attempts++;
    }

    // Fallback: return the last calculated position even if invalid, 
    // or maybe closer to player? Let's just return it to avoid infinite loops.
    return { x, y };
  }

  /**
   * Get enemy from pool
   */
  private getEnemyFromPool(): Enemy | null {
    // Find inactive enemy
    const inactive = this.enemyPool.getChildren()
      .find(child => child instanceof Enemy && !child.isActive) as Enemy | undefined;

    if (inactive) {
      return inactive;
    }

    // Pool not full, create new enemy
    if (this.enemyPool.getLength() < this.enemyPool.maxSize!) {
      const enemy = new Enemy(this.scene, 0, 0);
      this.enemyPool.add(enemy);
      return enemy;
    }

    return null;
  }

  /**
   * Get all active enemies
   */
  getActiveEnemies(): Enemy[] {
    return this.enemyPool.getChildren()
      .filter(child => child instanceof Enemy && child.isActive) as Enemy[];
  }

  /**
   * Get enemy pool
   */
  getEnemyPool(): Phaser.GameObjects.Group {
    return this.enemyPool;
  }

  /**
   * Despawn enemies that are too far from player
   */
  despawnDistantEnemies(): void {
    const maxDistance = 1500; // Despawn if 1500px away from player

    this.getActiveEnemies().forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        this.target.x,
        this.target.y
      );

      if (distance > maxDistance) {
        enemy.despawn();
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.enemyPool.clear(true, true);
  }
}
