import * as Phaser from 'phaser';

export interface AbilityOption {
  id: string;
  name: string;
  description: string;
  rarity: 'basica' | 'epica' | 'legendaria';
  icon?: string;
  effect: () => void;
}

export class LevelUpScene extends Phaser.Scene {
  private selectedOption?: AbilityOption;
  private options: AbilityOption[] = [];

  constructor() {
    super({ key: 'LevelUpScene' });
  }

  private cardContainers: Phaser.GameObjects.Container[] = [];

  create(data: { level: number }): void {
    this.selectedOption = undefined;
    this.cardContainers = [];
    this.scene.bringToTop();

    const { width, height } = this.cameras.main;

    // Dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    // Title
    const title = this.add.text(width / 2, height / 4, `LEVEL ${data.level}!`, {
      fontSize: '64px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(1001);

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 4 + 70, 'FATE IS CHOOSING...', {
      fontSize: '24px',
      color: '#ffffff'
    });
    subtitle.setOrigin(0.5);
    subtitle.setScrollFactor(0);
    subtitle.setDepth(1001);

    // Generate 3 random options
    this.options = this.generateOptions();

    // Create option cards
    const cardWidth = 250;
    const cardHeight = 350;
    const spacing = 50;
    const startX = width / 2 - (cardWidth + spacing);

    this.options.forEach((option, index) => {
      const x = startX + index * (cardWidth + spacing);
      const y = height / 2;

      this.createCard(x, y, cardWidth, cardHeight, option, index);
    });

    // Start Roulette Animation
    this.startRoulette();
  }

  private startRoulette(): void {
    let currentIndex = 0;
    let loops = 0;
    const maxLoops = 3;
    let speed = 100;

    // Recursive function for roulette effect
    const spin = () => {
      // Highlight current card
      this.highlightCard(currentIndex);

      // Calculate next step
      currentIndex++;
      if (currentIndex >= this.options.length) {
        currentIndex = 0;
        loops++;
      }

      // Slow down logic
      if (loops >= maxLoops) {
        speed += 50; // Decelerate
      }

      // Stop condition (random stop after maxLoops)
      if (loops > maxLoops && Math.random() > 0.5 && speed > 300) {
        this.selectOption(this.options[currentIndex]);
        return;
      }

      // Continue spinning
      this.time.delayedCall(speed, spin);
    };

    // Start spinning
    this.time.delayedCall(500, spin);
  }

  private highlightCard(index: number): void {
    this.cardContainers.forEach((container, i) => {
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      if (i === index) {
        bg.setFillStyle(0x444444);
        container.setScale(1.1);
      } else {
        bg.setFillStyle(0x222222);
        container.setScale(1.0);
      }
    });
  }

  /**
   * Create option card
   */
  private createCard(
    x: number,
    y: number,
    width: number,
    height: number,
    option: AbilityOption,
    index: number
  ): void {
    const container = this.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(1001);
    this.cardContainers.push(container);

    // Rarity colors
    const rarityColors = {
      basica: 0xaaaaaa,
      epica: 0x9945ff,
      legendaria: 0xffa500
    };

    const color = rarityColors[option.rarity];

    // Card background
    const bg = this.add.rectangle(0, 0, width, height, 0x222222);
    bg.setStrokeStyle(4, color);
    container.add(bg);

    // Rarity text
    const rarityText = this.add.text(0, -height / 2 + 30, option.rarity.toUpperCase(), {
      fontSize: '16px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    });
    rarityText.setOrigin(0.5);
    container.add(rarityText);

    // Icon placeholder
    const icon = this.add.circle(0, -50, 40, color);
    container.add(icon);

    // Name
    const name = this.add.text(0, 20, option.name, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 20 }
    });
    name.setOrigin(0.5);
    container.add(name);

    // Description
    const desc = this.add.text(0, 80, option.description, {
      fontSize: '16px',
      color: '#cccccc',
      align: 'center',
      wordWrap: { width: width - 40 }
    });
    desc.setOrigin(0.5);
    container.add(desc);

    // Entrance animation
    container.setAlpha(0);
    container.setScale(0.5);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      delay: index * 100,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Generate 3 random ability options
   */
  private generateOptions(): AbilityOption[] {
    const allOptions = this.getAllPossibleOptions();
    const options: AbilityOption[] = [];

    // Roll rarities: 60% basic, 35% epic, 5% legendary
    for (let i = 0; i < 3; i++) {
      const roll = Math.random();
      let rarity: 'basica' | 'epica' | 'legendaria';

      if (roll < 0.6) {
        rarity = 'basica';
      } else if (roll < 0.95) {
        rarity = 'epica';
      } else {
        rarity = 'legendaria';
      }

      // Filter by rarity
      const filtered = allOptions.filter(o => o.rarity === rarity);
      if (filtered.length > 0) {
        const option = Phaser.Utils.Array.GetRandom(filtered);
        options.push(option);
      } else {
        // Fallback to basic if no options
        const basic = allOptions.filter(o => o.rarity === 'basica');
        options.push(Phaser.Utils.Array.GetRandom(basic));
      }
    }

    return options;
  }

  /**
   * Get all possible ability options
   */
  private getAllPossibleOptions(): AbilityOption[] {
    const gameScene = this.scene.get('GameScene') as any;

    return [
      // BASIC ABILITIES
      {
        id: 'health_boost',
        name: 'Health Boost',
        description: '+20 Max Health',
        rarity: 'basica',
        effect: () => {
          gameScene.player.maxHealth += 20;
          gameScene.player.health += 20;
        }
      },
      {
        id: 'speed_boost',
        name: 'Speed Boost',
        description: '+15% Movement Speed',
        rarity: 'basica',
        effect: () => {
          gameScene.player.speed *= 1.15;
        }
      },
      {
        id: 'damage_boost',
        name: 'Damage Boost',
        description: '+10% Damage',
        rarity: 'basica',
        effect: () => {
          gameScene.player.damage *= 1.1;
          // Update weapon damages
          gameScene.player.getWeapons().forEach((w: any) => {
            w.config.damage = Math.floor(w.config.damage * 1.1);
          });
        }
      },
      {
        id: 'cooldown_reduction',
        name: 'Cooldown Reduction',
        description: '-10% Cooldowns',
        rarity: 'basica',
        effect: () => {
          gameScene.player.getWeapons().forEach((w: any) => {
            w.config.cooldown = Math.floor(w.config.cooldown * 0.9);
          });
        }
      },
      {
        id: 'pickup_radius',
        name: 'Magnet',
        description: '+50 Pickup Radius',
        rarity: 'basica',
        effect: () => {
          gameScene.player.pickupRadius += 50;
          gameScene.xpManager.increaseMagnetRadius(50);
        }
      },

      // EPIC ABILITIES
      {
        id: 'projectile_pierce',
        name: 'Piercing Shots',
        description: 'Projectiles pierce 1 enemy',
        rarity: 'epica',
        effect: () => {
          gameScene.player.getWeapons().forEach((w: any) => {
            if (w.config) w.config.pierce = (w.config.pierce || 0) + 1;
          });
        }
      },
      {
        id: 'critical_chance',
        name: 'Critical Hits',
        description: '15% chance for 2x damage',
        rarity: 'epica',
        effect: () => {
          gameScene.player.critChance += 0.15;
        }
      },
      {
        id: 'lifesteal',
        name: 'Life Steal',
        description: 'Heal 5% of damage dealt',
        rarity: 'epica',
        effect: () => {
          gameScene.player.lifesteal += 0.05;
        }
      },
      {
        id: 'multishot',
        name: 'Multi Shot',
        description: 'Fire 1 additional projectile',
        rarity: 'epica',
        effect: () => {
          gameScene.player.getWeapons().forEach((w: any) => {
            if (w.config) w.config.count = (w.config.count || 1) + 1;
          });
        }
      },

      // LEGENDARY ABILITIES
      {
        id: 'time_slow',
        name: 'Time Warp',
        description: 'Enemies move 30% slower',
        rarity: 'legendaria',
        effect: () => {
          gameScene.enemySpawner.getActiveEnemies().forEach((e: any) => {
            e.config.speed *= 0.7;
          });
        }
      },
      {
        id: 'invulnerability',
        name: 'Shield',
        description: '5s invulnerability (1 use)',
        rarity: 'legendaria',
        effect: () => {
          gameScene.player.isInvulnerable = true;
          gameScene.time.delayedCall(5000, () => {
            gameScene.player.isInvulnerable = false;
          });
        }
      },
      {
        id: 'screen_clear',
        name: 'Nova',
        description: 'Kill all enemies on screen',
        rarity: 'legendaria',
        effect: () => {
          gameScene.enemySpawner.getActiveEnemies().forEach((e: any) => {
            e.takeDamage(9999);
          });
        }
      }
    ];
  }

  /**
   * Select an option
   */
  private selectOption(option: AbilityOption): void {
    if (this.selectedOption) return; // Already selected

    this.selectedOption = option;

    // Apply effect
    option.effect();

    console.log(`Selected: ${option.name} (${option.rarity})`);

    // Flash final selection
    const index = this.options.indexOf(option);
    if (index !== -1 && this.cardContainers[index]) {
      const container = this.cardContainers[index];
      this.tweens.add({
        targets: container,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        repeat: 2
      });
    }

    // Close scene after delay
    this.time.delayedCall(1500, () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });
  }
}
