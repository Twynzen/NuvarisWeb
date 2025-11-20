import * as Phaser from 'phaser';
import { VisualComponent } from '../components/visual.component';
import { GameConfig } from '../config/game.config';

export interface BossConfig {
  name: string;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  color: number;
  size: number;
  special: string; // Special ability
}

export class Boss extends Phaser.GameObjects.Container {
  public override body!: Phaser.Physics.Arcade.Body;

  private visual: VisualComponent;
  private healthBar?: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;

  public config: BossConfig;
  public health: number;
  public isActive = false;

  private target?: Phaser.GameObjects.Container;
  private specialAttackTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Default config
    this.config = {
      name: 'BOSS',
      maxHealth: 500,
      speed: 60,
      damage: 30,
      xpValue: 500,
      color: GameConfig.colors.enemy.boss,
      size: GameConfig.sizes.enemy.boss,
      special: 'dash'
    };

    this.health = this.config.maxHealth;

    // Create visual using VisualComponent
    this.visual = new VisualComponent(scene, {
      type: 'sprite',
      texture: 'boss-face-1',
      width: this.config.size * 4.5,
      height: this.config.size * 4.5
    });
    this.add(this.visual);

    // Boss name
    this.nameText = scene.add.text(0, -50, this.config.name, {
      fontSize: '20px',
      color: '#ff00ff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.nameText.setOrigin(0.5);
    this.add(this.nameText);

    // Set depth
    this.setDepth(GameConfig.depths.enemy + 1); // Boss above normal enemies

    // Add physics
    scene.physics.add.existing(this);
    this.body.setSize(this.config.size, this.config.size);

    // Add to scene
    scene.add.existing(this);

    // Start inactive
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * Spawn boss
   */
  spawn(x: number, y: number, config: BossConfig, target: Phaser.GameObjects.Container): void {
    this.config = config;
    this.health = config.maxHealth;
    this.target = target;

    // Update visuals
    this.visual.setConfig({
      type: 'sprite',
      width: config.size * 4.5,
      height: config.size * 4.5
    });
    this.visual.playAnimation('boss-move', 6);

    this.nameText.setText(config.name);
    this.body.setSize(config.size, config.size);

    // Position
    this.setPosition(x, y);

    // Activate
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;

    // Reset
    this.body.setVelocity(0, 0);
    this.specialAttackTimer = 0;

    // Entrance effect
    this.setScale(0.5);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Screen shake
    this.scene.cameras.main.shake(300, 0.01);

    // Announce boss
    this.scene.events.emit('boss-spawned', {
      name: config.name,
      health: config.maxHealth
    });

    console.log(`🐉 BOSS SPAWNED: ${config.name}!`);
  }

  /**
   * Despawn boss
   */
  despawn(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.setVelocity(0, 0);
    this.visual.stopAnimation();

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
    this.visual.flash(100);

    // Juice: Shake
    this.visual.squashAndStretch('x', 1.1, 50);

    // Update health bar
    this.updateHealthBar();

    // Check death
    if (this.health <= 0) {
      this.die();
      return true; // Boss died
    }

    return false; // Boss still alive
  }

  /**
   * Boss death
   */
  private die(): void {
    console.log(`💀 BOSS DEFEATED: ${this.config.name}!`);

    // Death animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        // Drop XP
        this.scene.events.emit('enemy-died', {
          x: this.x,
          y: this.y,
          xpValue: this.config.xpValue
        });

        // Emit boss defeated event
        this.scene.events.emit('boss-defeated', {
          name: this.config.name,
          boss: this
        });

        // Despawn
        this.despawn();
      }
    });

    // Explosion effect
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 / 20) * i;
      const particle = this.scene.add.circle(
        this.x,
        this.y,
        8,
        Phaser.Utils.Array.GetRandom([0xff0000, 0x00ff00, 0x0000ff, 0xffff00])
      );

      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 100,
        y: this.y + Math.sin(angle) * 100,
        alpha: 0,
        duration: 1000,
        onComplete: () => particle.destroy()
      });
    }

    // Screen shake
    this.scene.cameras.main.shake(500, 0.02);
  }

  /**
   * Update health bar
   */
  private updateHealthBar(): void {
    if (!this.healthBar) {
      this.healthBar = this.scene.add.graphics();
      this.healthBar.setScrollFactor(1); // Follow boss
    }

    this.healthBar.clear();

    const barWidth = this.config.size * 1.5;
    const barHeight = 8;
    const healthPercent = this.health / this.config.maxHealth;

    // Background
    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(
      this.x - barWidth / 2,
      this.y - this.config.size / 2 - 15,
      barWidth,
      barHeight
    );

    // Health (color changes based on health)
    const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(
      this.x - barWidth / 2 + 2,
      this.y - this.config.size / 2 - 13,
      (barWidth - 4) * healthPercent,
      barHeight - 4
    );

    // Border
    this.healthBar.lineStyle(2, 0xffffff);
    this.healthBar.strokeRect(
      this.x - barWidth / 2,
      this.y - this.config.size / 2 - 15,
      barWidth,
      barHeight
    );
  }

  /**
   * Update loop - AI behavior
   */
  override update(time: number, delta: number): void {
    if (!this.isActive || !this.target) return;

    // Update health bar position
    if (this.healthBar) {
      this.updateHealthBar();
    }

    // Special attack timer
    this.specialAttackTimer += delta;

    // Use special attack every 5 seconds
    if (this.specialAttackTimer >= 5000) {
      this.useSpecialAttack();
      this.specialAttackTimer = 0;
    }

    // Move towards target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const velocityX = Math.cos(angle) * this.config.speed;
    const velocityY = Math.sin(angle) * this.config.speed;

    this.body.setVelocity(velocityX, velocityY);

    // Rotate visual to face player
    this.visual.setRotation(angle - (Math.PI / 2));
  }

  /**
   * Use special attack
   */
  private useSpecialAttack(): void {
    if (!this.target) return;

    switch (this.config.special) {
      case 'dash':
        this.dashAttack();
        break;
      case 'spawn_minions':
        this.spawnMinions();
        break;
      case 'area_damage':
        this.areaDamage();
        break;
    }
  }

  /**
   * Dash attack - Quick lunge towards player
   */
  private dashAttack(): void {
    if (!this.target) return;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const dashSpeed = this.config.speed * 5;

    // Visual warning
    this.visual.setTint(0xff0000);
    this.scene.time.delayedCall(300, () => {
      this.visual.setTint(this.config.color);

      // Dash!
      const velocityX = Math.cos(angle) * dashSpeed;
      const velocityY = Math.sin(angle) * dashSpeed;
      this.body.setVelocity(velocityX, velocityY);

      // Juice: Stretch in dash direction
      this.visual.squashAndStretch('x', 1.5, 500);

      // Return to normal speed after 500ms
      this.scene.time.delayedCall(500, () => {
        const normalAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target!.x, this.target!.y);
        const normalVelocityX = Math.cos(normalAngle) * this.config.speed;
        const normalVelocityY = Math.sin(normalAngle) * this.config.speed;
        this.body.setVelocity(normalVelocityX, normalVelocityY);
      });
    });
  }

  /**
   * Spawn minions
   */
  private spawnMinions(): void {
    // Emit event to spawn 5 enemies around boss
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i;
      const distance = 100;
      const x = this.x + Math.cos(angle) * distance;
      const y = this.y + Math.sin(angle) * distance;

      this.scene.events.emit('boss-spawn-minion', { x, y });
    }

    // Juice: Pulse effect
    this.visual.squashAndStretch('x', 1.2, 200);
  }

  /**
   * Area damage
   */
  private areaDamage(): void {
    // Create expanding circle of damage
    const circle = this.scene.add.circle(this.x, this.y, 10, 0xff00ff, 0.5);

    this.scene.tweens.add({
      targets: circle,
      radius: 200,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        circle.destroy();

        // Damage player if in range
        if (this.target) {
          const distance = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            this.target.x,
            this.target.y
          );

          if (distance <= 200) {
            this.scene.events.emit('player-hit', {
              damage: this.config.damage * 2
            });
          }
        }
      }
    });

    // Juice: Shake boss
    this.scene.tweens.add({
      targets: this.visual,
      x: { from: -5, to: 5 },
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.visual.setX(0)
    });
  }

  /**
   * Cleanup
   */
  override destroy(fromScene?: boolean): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    super.destroy(fromScene);
  }
}
