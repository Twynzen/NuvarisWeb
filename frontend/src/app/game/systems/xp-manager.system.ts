import * as Phaser from 'phaser';
import { XPGem } from '../entities/xp-gem.entity';
import { Player } from '../entities/player.entity';

export class XPManager {
  private scene: Phaser.Scene;
  private player: Player;
  private gemPool: Phaser.GameObjects.Group;

  // XP tracking
  public currentXP = 0;
  public currentLevel = 1;
  public xpToNextLevel = 100;

  // Magnet radius
  private magnetRadius = 100;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    // Create gem pool
    this.gemPool = scene.add.group({
      classType: XPGem,
      maxSize: 500,
      runChildUpdate: true
    });

    // Pre-spawn gems
    for (let i = 0; i < 100; i++) {
      const gem = new XPGem(scene, 0, 0);
      this.gemPool.add(gem);
    }

    // Listen to enemy death events
    scene.events.on('enemy-died', this.onEnemyDied, this);
  }

  /**
   * Handle enemy death - spawn XP gem
   */
  private onEnemyDied(data: { x: number; y: number; xpValue: number }): void {
    this.spawnXPGem(data.x, data.y, data.xpValue);
  }

  /**
   * Spawn XP gem at position
   */
  spawnXPGem(x: number, y: number, xpValue: number): void {
    const gem = this.getGemFromPool();
    if (!gem) return;

    gem.spawn(x, y, xpValue);
  }

  /**
   * Get gem from pool
   */
  private getGemFromPool(): XPGem | null {
    // Find inactive gem
    const inactive = this.gemPool.getChildren()
      .find(child => child instanceof XPGem && !child.isActive) as XPGem | undefined;

    if (inactive) {
      return inactive;
    }

    // Create new if pool not full
    if (this.gemPool.getLength() < this.gemPool.maxSize!) {
      const gem = new XPGem(this.scene, 0, 0);
      this.gemPool.add(gem);
      return gem;
    }

    return null;
  }

  /**
   * Update - check magnet and collection
   */
  update(time: number, delta: number): void {
    this.getActiveGems().forEach(gem => {
      const distance = Phaser.Math.Distance.Between(
        gem.x,
        gem.y,
        this.player.x,
        this.player.y
      );

      // Check magnet radius
      if (distance <= this.magnetRadius) {
        gem.startMagnet(this.player);
      }

      // Check collection (close enough to player)
      if (distance <= this.player.pickupRadius) {
        const xpValue = gem.collect();
        this.addXP(xpValue);
      }
    });
  }

  /**
   * Add XP to player
   */
  addXP(amount: number): void {
    this.currentXP += amount;

    // Check level up
    while (this.currentXP >= this.xpToNextLevel) {
      this.levelUp();
    }

    // Emit XP gained event
    this.scene.events.emit('xp-gained', {
      amount,
      currentXP: this.currentXP,
      xpToNextLevel: this.xpToNextLevel,
      level: this.currentLevel
    });
  }

  /**
   * Level up!
   */
  private levelUp(): void {
    this.currentXP -= this.xpToNextLevel;
    this.currentLevel++;

    // Calculate next level XP requirement
    // Formula: baseXP * level^1.5 for polynomial growth
    this.xpToNextLevel = Math.floor(50 * Math.pow(this.currentLevel, 1.5));

    console.log(`LEVEL UP! Now level ${this.currentLevel}. Next level at ${this.xpToNextLevel} XP`);

    // Emit level up event
    this.scene.events.emit('level-up', {
      level: this.currentLevel,
      xpToNextLevel: this.xpToNextLevel
    });

    // Pause game for level-up screen (will be implemented later)
    // this.scene.scene.pause();
    // this.scene.scene.launch('LevelUpScene');
  }

  /**
   * Get active gems
   */
  getActiveGems(): XPGem[] {
    return this.gemPool.getChildren()
      .filter(child => child instanceof XPGem && child.isActive) as XPGem[];
  }

  /**
   * Get gem pool for collision detection
   */
  getGemPool(): Phaser.GameObjects.Group {
    return this.gemPool;
  }

  /**
   * Increase magnet radius
   */
  increaseMagnetRadius(amount: number): void {
    this.magnetRadius += amount;
  }

  /**
   * Get current stats
   */
  getStats(): { level: number; currentXP: number; xpToNextLevel: number } {
    return {
      level: this.currentLevel,
      currentXP: this.currentXP,
      xpToNextLevel: this.xpToNextLevel
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.scene.events.off('enemy-died', this.onEnemyDied, this);
    this.gemPool.clear(true, true);
  }
}
