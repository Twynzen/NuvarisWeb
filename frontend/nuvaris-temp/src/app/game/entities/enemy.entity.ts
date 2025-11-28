import * as Phaser from 'phaser';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export interface EnemyConfig {
  type: string;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  color: number;
  size?: number;
}

export class Enemy extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;

  private visual: VisualComponent;
  private healthBar?: Phaser.GameObjects.Graphics;

  public config: EnemyConfig;
  public health: number;
  public isActive = false;

  private target?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Default config (will be overridden on spawn)
    this.config = {
      type: 'zombie',
      maxHealth: 20,
      speed: 50,
      damage: 10,
      xpValue: 10,
      color: GameConfig.colors.enemy.zombie,
      size: GameConfig.sizes.enemy.zombie
    };

    this.health = this.config.maxHealth;

    // Create visual using VisualComponent
    // Default to worm asset for now
    this.visual = new VisualComponent(scene, {
      type: 'sprite',
      texture: 'worm-move-1',
      width: (this.config.size || 30) * 4.5,
      height: (this.config.size || 30) * 4.5,
      origin: { x: 0.5, y: 1 }
    });
    this.add(this.visual);

    if ((GameConfig as any).debugAssetSizes) {
      this.visual.setDebug(true);
    }

    // Set depth
    this.setDepth(GameConfig.depths.enemy);

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(this.config.size || 30, this.config.size || 30);

    // Add to scene
    scene.add.existing(this);

    // Start inactive
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * Spawn enemy with specific config
   */
  spawn(x: number, y: number, config: EnemyConfig, target: Phaser.GameObjects.Container): void {
    this.config = config;
    this.health = config.maxHealth;
    this.target = target;

    // Update visual based on type
    const size = config.size || GameConfig.sizes.enemy.zombie;

    // Determine asset key based on type
    // Mapping 'zombie' -> 'worm', 'runner' -> 'spider' for now as per user request
    let animKey = 'worm-move';
    if (config.type === 'runner' || config.type === 'spider') {
      animKey = 'spider-move';
    } else {
      animKey = 'worm-move';
    }

    this.visual.setConfig({
      type: 'sprite',
      width: size * 4.5,
      height: size * 4.5
    });

    // Start animation
    this.visual.playAnimation(animKey, 8);

    this.body.setSize(size, size);

    // Position
    this.setPosition(x, y);

    // Activate
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;

    // Reset body
    this.body.setVelocity(0, 0);

    // Juice: Pop in
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Despawn enemy (return to pool)
   */
  despawn(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.setVelocity(0, 0);
    this.visual.stopAnimation();
    this.visual.clearTint(); // Reset tint

    // Reset Mind Control state
    this.isMindControlled = false;
    if (this.mindControlTimer) {
      this.mindControlTimer.remove();
      this.mindControlTimer = undefined;
    }
    if (this.mindControlIcon) {
      this.mindControlIcon.destroy();
      this.mindControlIcon = undefined;
    }

    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = undefined;
    }
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): boolean {
    this.health -= amount;

    // Flash effect
    this.visual.flash(50);

    // Juice: Knockback/Shake
    this.visual.squashAndStretch('x', 1.2, 50);

    // Update health bar
    this.updateHealthBar();

    // Check death
    if (this.health <= 0) {
      this.die();
      return true; // Enemy died
    }

    return false; // Enemy still alive
  }

  /**
   * Enemy death
   */
  private die(): void {
    // Drop XP
    this.scene.events.emit('enemy-died', {
      x: this.x,
      y: this.y,
      xpValue: this.config.xpValue
    });

    // Despawn
    this.despawn();
  }

  /**
   * Update health bar
   */
  private updateHealthBar(): void {
    if (!this.healthBar) {
      this.healthBar = this.scene.add.graphics();
      this.add(this.healthBar);
    }

    this.healthBar.clear();

    const size = this.config.size || 30;
    const barWidth = size;
    const barHeight = 3;
    const healthPercent = this.health / this.config.maxHealth;

    // Background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(-barWidth / 2, -size / 1.5, barWidth, barHeight);

    // Health
    this.healthBar.fillStyle(0x00ff00);
    this.healthBar.fillRect(-barWidth / 2, -size / 1.5, barWidth * healthPercent, barHeight);
  }

  public isMindControlled = false;
  private mindControlTimer?: Phaser.Time.TimerEvent;
  private mindControlIcon?: Phaser.GameObjects.Text;

  // Knockback state
  private isKnockedBack = false;
  private knockbackTimer?: Phaser.Time.TimerEvent;

  /**
   * Mind Control this enemy
   */
  mindControl(): void {
    if (this.isMindControlled) return;

    this.isMindControlled = true;

    // Visual change
    this.visual.setTint(0x0000ff); // Blue tint for ally

    // Add overhead icon (Simple Text "!" to avoid missing assets)
    const iconText = this.scene.add.text(0, -50, '!', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    iconText.setOrigin(0.5);
    this.add(iconText); // Add to container so it moves with enemy
    this.mindControlIcon = iconText;

    // Float animation for icon
    this.scene.tweens.add({
      targets: iconText,
      y: -60,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // Heal to 50% of max health (Minions are weaker)
    this.health = this.config.maxHealth * 0.5;
    this.updateHealthBar();
  }

  /**
   * Trigger manual explosion
   */
  public manualExplode(): void {
    if (this.isMindControlled) {
      this.explode();
    }
  }

  /**
   * Flash effect for impacts (e.g. Chain Lightning)
   */
  flash(color: number = 0xffffff, duration: number = 100): void {
    if (!this.active) return;

    this.visual.setTintFill(color);
    this.scene.time.delayedCall(duration, () => {
      if (this.active) {
        this.visual.clearTint();
        if (this.isMindControlled) {
          this.visual.setTint(0x0000ff); // Restore mind control tint
        }
      }
    });
  }

  private explode(): void {
    if (!this.isActive) return;

    // Explosion visual
    const explosion = this.scene.add.circle(this.x, this.y, 100, 0x0000ff, 0.5);
    this.scene.tweens.add({
      targets: explosion,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy()
    });

    // Damage nearby enemies
    const enemies = this.getActiveEnemies();
    enemies.forEach(enemy => {
      if (enemy === this || enemy.isMindControlled) return;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < 150) {
        enemy.takeDamage(this.config.damage * 5); // Big damage
      }
    });

    this.die();
  }

  /**
   * Apply knockback force
   */
  public applyKnockback(velocityX: number, velocityY: number, duration: number = 200): void {
    if (!this.body) return;

    this.isKnockedBack = true;
    this.body.setVelocity(velocityX, velocityY);

    if (this.knockbackTimer) this.knockbackTimer.remove();
    this.knockbackTimer = this.scene.time.delayedCall(duration, () => {
      this.isKnockedBack = false;
    });
  }

  private getActiveEnemies(): Enemy[] {
    const enemyGroup = this.scene.data.get('enemyGroup') as Phaser.GameObjects.Group;
    if (!enemyGroup) return [];
    return enemyGroup.getChildren()
      .filter(child => child instanceof Enemy && child.isActive) as Enemy[];
  }

  // Dash state
  private dashCooldown = 0;
  private isDashing = false;
  private dashDuration = 0;

  /**
   * Start a dash towards target
   */
  private startDash(targetX: number, targetY: number): void {
    this.isDashing = true;
    this.dashCooldown = 2000; // 2 seconds cooldown
    this.dashDuration = 300; // 300ms dash

    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const dashSpeed = this.config.speed * 3;

    this.body.setVelocity(Math.cos(angle) * dashSpeed, Math.sin(angle) * dashSpeed);

    // Visual feedback
    this.visual.setTint(0xffffff); // Flash white
    this.scene.time.delayedCall(100, () => {
      if (this.isActive && !this.isMindControlled) {
        this.visual.clearTint();
      }
    });
  }

  /**
   * Update loop - move towards player OR enemies if controlled
   */
  override update(time: number, delta: number): void {
    if (!this.isActive) return;

    // If knocked back, let physics handle movement (don't override velocity)
    if (this.isKnockedBack) return;

    // Handle Dash State
    if (this.isDashing) {
      this.dashDuration -= delta;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
        // Resume normal behavior next frame
      } else {
        // While dashing, maintain velocity (don't update direction)
        return;
      }
    }

    // Cooldown tick
    if (this.dashCooldown > 0) {
      this.dashCooldown -= delta;
    }

    let targetX = 0;
    let targetY = 0;

    if (this.isMindControlled) {
      // Find nearest non-controlled enemy
      const enemies = this.getActiveEnemies();
      let closest: Enemy | null = null;
      let closestDist = Infinity;

      enemies.forEach(enemy => {
        if (enemy === this || enemy.isMindControlled) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist < closestDist) {
          closestDist = dist;
          closest = enemy;
        }
      });

      if (closest) {
        targetX = (closest as Enemy).x;
        targetY = (closest as Enemy).y;

        // Attack logic (simple collision damage handled in physics, but we can add visual attack)
      } else {
        // Follow player if no enemies
        if (this.target) {
          targetX = this.target.x;
          targetY = this.target.y;
        }
      }
    } else {
      // Normal behavior: Chase player OR Mind Controlled Minions
      let target = this.target; // Default to player

      // Check for nearby mind-controlled enemies to attack
      const enemies = this.getActiveEnemies();
      let closestMinion: Enemy | null = null;
      let closestMinionDist = 300; // Aggro range for minions

      for (const enemy of enemies) {
        if (enemy === this || !enemy.isMindControlled) continue;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist < closestMinionDist) {
          closestMinionDist = dist;
          closestMinion = enemy;
        }
      }

      if (closestMinion) {
        targetX = closestMinion.x;
        targetY = closestMinion.y;
      } else if (this.target) {
        targetX = this.target.x;
        targetY = this.target.y;
      }
    }

    // Calculate direction to target
    const distToTarget = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);

    // Check for Dash (Runners/Spiders only)
    if ((this.config.type === 'runner' || this.config.type === 'spider') && !this.isMindControlled) {
      if (this.dashCooldown <= 0 && distToTarget < 150 && distToTarget > 50) {
        this.startDash(targetX, targetY);
        return; // Start dashing immediately
      }
    }

    // Move towards target
    const velocityX = Math.cos(angle) * this.config.speed;
    const velocityY = Math.sin(angle) * this.config.speed;

    this.body.setVelocity(velocityX, velocityY);

    // Rotate visual
    this.visual.setRotation(angle - (Math.PI / 2));

    // Update health bar position
    if (this.healthBar) {
      this.healthBar.setRotation(-(angle - (Math.PI / 2)));
    }

    // Update icon position
    if (this.mindControlIcon) {
      this.mindControlIcon.setPosition(this.x, this.y - 40);
    }
  }

  /**
   * Cleanup
   */
  override destroy(fromScene?: boolean): void {
    if (this.mindControlTimer) this.mindControlTimer.remove();
    if (this.mindControlIcon) this.mindControlIcon.destroy();
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    super.destroy(fromScene);
  }
}
