import * as Phaser from 'phaser';
import { Player } from '../entities/player.entity';
import { Enemy } from '../entities/enemy.entity';
import { GameConfig } from '../config/game.config';
import { Boss } from '../entities/boss.entity';
import { Projectile } from '../entities/projectile.entity';
import {
  FireballWeapon,
  MagicMissileWeapon,
  LightningBoltWeapon,
  OrbitalWeapon,
  AoEWeapon,
  BeamWeapon
} from '../entities/weapon.entity';
import { EnemySpawner } from '../systems/enemy-spawner.system';
import { XPManager } from '../systems/xp-manager.system';
import { ParticleManager } from '../systems/particle-manager.system';
import { AudioManager } from '../systems/audio-manager.system';
import { VirtualJoystick } from '../components/virtual-joystick.component';
import { LabGenerator } from '../systems/lab-generator.system';
import { CharacterAbility } from '../abilities/character-ability';
import { ArcadioAbility } from '../abilities/arcadio.ability';
import { YuranyAbility } from '../abilities/yurany.ability';
import { LarsAbility } from '../abilities/lars.ability';

export class GameScene extends Phaser.Scene {
  // Core entities
  public player!: Player;
  private bosses: Boss[] = [];
  private labGenerator!: LabGenerator;

  // Systems
  private enemySpawner!: EnemySpawner;
  private xpManager!: XPManager;
  private particleManager!: ParticleManager;
  private audioManager!: AudioManager;

  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private virtualJoystick?: VirtualJoystick;
  private isMobile = false;

  // Special weapons (non-standard update)
  private specialWeapons: Array<OrbitalWeapon | BeamWeapon> = [];

  // UI
  private gameTimeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private bossHealthBar?: Phaser.GameObjects.Graphics;
  private bossNameText?: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private controlsText!: Phaser.GameObjects.Text;

  // Debug UI
  private debugButton!: Phaser.GameObjects.Text;
  private debugPanel!: Phaser.GameObjects.Container;
  private debugSelectedVisual?: any;
  private debugInfoText!: Phaser.GameObjects.Text;

  // Game state
  private gameStartTime = 0;
  private isPaused = false;
  private isGameOver = false;
  private pauseText?: Phaser.GameObjects.Text;
  private killCount = 0;
  private killCountText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Assets will be loaded here in the future
    this.audioManager = new AudioManager(this);
    this.audioManager.preloadAudio(this.load);
  }

  create(data: { character?: any }): void {
    const { width, height } = this.cameras.main;
    this.gameStartTime = this.time.now;

    // Ensure physics is active
    this.physics.resume();

    // Reset game over state
    this.isGameOver = false;
    this.isPaused = false;
    this.killCount = 0;
    // Note: killCountText is created later in setupUI(), so we don't reset it here

    // Detect mobile
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;

    // Generate World
    const mapWidth = 4000;
    const mapHeight = 4000;
    this.labGenerator = new LabGenerator(this, mapWidth, mapHeight);
    this.labGenerator.generate();

    // Create player at valid position
    const startPos = this.labGenerator.getRandomFloorPosition();
    const characterId = (data && data.character && data.character.id) ? data.character.id : 'arcadio';
    this.player = new Player(this, startPos.x, startPos.y, characterId);

    // Create systems
    this.particleManager = new ParticleManager(this);
    if (!this.audioManager) {
      this.audioManager = new AudioManager(this);
    }

    // Give player starting weapon (Default)
    const fireball = new FireballWeapon(this, this.player);
    this.player.addWeapon(fireball);

    // Apply character stats and ability
    if (data && data.character) {
      const char = data.character;
      console.log(`🎮 Playing as: ${char.name} (${char.id})`);

      // Apply stats multipliers (keeping health at 100 for all)
      // this.player.maxHealth *= (char.stats.health / 3); // REMOVED - all chars have 100 HP
      this.player.health = this.player.maxHealth;
      this.player.speed *= (char.stats.speed / 3);
      this.player.damage *= (char.stats.damage / 3);

      // Initialize Ability (This may remove the default weapon)
      let ability: CharacterAbility | undefined;
      switch (char.id) {
        case 'arcadio':
          ability = new ArcadioAbility();
          break;
        case 'yurany':
          ability = new YuranyAbility();
          break;
        case 'lars':
          ability = new LarsAbility();
          break;
      }

      if (ability) {
        this.player.setAbility(ability);
        console.log(`✨ Ability initialized: ${ability.name}`);
      }
    }

    // Setup systems
    this.enemySpawner = new EnemySpawner(
      this,
      this.player,
      (x, y) => this.labGenerator.isValidPosition(x, y)
    );
    this.xpManager = new XPManager(this, this.player);

    // Setup collisions
    this.setupCollisions();

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // Ability Key (B)
    this.input.keyboard!.on('keydown-B', () => {
      if (this.player.ability && (this.player.ability as any).triggerExplosion) {
        (this.player.ability as any).triggerExplosion();
      }
    });

    // Setup camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    // Setup UI
    this.setupUI();
    this.setupDebugUI();

    // Setup world bounds
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    // Listen to events
    this.events.on('level-up', this.onLevelUp, this);
    this.events.on('xp-gained', this.onXPGained, this);
    this.events.on('boss-spawned', this.onBossSpawned, this);
    this.events.on('boss-defeated', this.onBossDefeated, this);
    this.events.on('enemy-died', this.onEnemyDied, this);
    this.events.on('player-died', this.onPlayerDied, this);

    // Emit scene ready
    this.game.events.emit('scene-event', {
      type: 'scene-ready',
      scene: 'GameScene'
    });

    console.log('🎮 Núvaris started! Survive as long as you can!');
    console.log(`📱 Platform: ${this.isMobile ? 'Mobile' : 'Desktop'}`);

    // Handle resize
    this.scale.on('resize', this.resize, this);
  }

  private setupCollisions(): void {
    // Enemy collision with player (damage player)
    this.physics.add.overlap(
      this.player,
      this.enemySpawner.getEnemyPool(),
      this.onEnemyHitPlayer as any,
      undefined,
      this
    );

    // Enemy vs Enemy (for mind control)
    this.physics.add.overlap(
      this.enemySpawner.getEnemyPool(),
      this.enemySpawner.getEnemyPool(),
      this.onEnemyHitEnemy as any,
      undefined,
      this
    );

    // Wall collisions
    this.physics.add.collider(this.player, this.labGenerator.getWalls());
    this.physics.add.collider(this.enemySpawner.getEnemyPool(), this.labGenerator.getWalls());
  }

  /**
   * Handle enemy hitting enemy (Mind Control)
   */
  private onEnemyHitEnemy(enemy1: Enemy, enemy2: Enemy): void {
    if (!enemy1.isActive || !enemy2.isActive) return;
    if (enemy1 === enemy2) return;

    // If one is mind controlled and the other is not
    if (enemy1.isMindControlled && !enemy2.isMindControlled) {
      enemy2.takeDamage(enemy1.config.damage);
      // Push back
      const angle = Phaser.Math.Angle.Between(enemy1.x, enemy1.y, enemy2.x, enemy2.y);
      if (enemy2.applyKnockback) {
        enemy2.applyKnockback(Math.cos(angle) * 100, Math.sin(angle) * 100, 100);
      }
    } else if (enemy2.isMindControlled && !enemy1.isMindControlled) {
      enemy1.takeDamage(enemy2.config.damage);
      // Push back
      const angle = Phaser.Math.Angle.Between(enemy2.x, enemy2.y, enemy1.x, enemy1.y);
      if (enemy1.applyKnockback) {
        enemy1.applyKnockback(Math.cos(angle) * 100, Math.sin(angle) * 100, 100);
      }
    }
  }

  /**
   * Handle projectile hitting enemy
   */
  private onProjectileHitEnemy(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.isActive || !enemy.isActive) return;
    if (!projectile.canHit(enemy)) return;

    // Apply damage
    const died = enemy.takeDamage(projectile.damage);

    // Trigger Ability
    if (this.player.ability) {
      this.player.ability.onProjectileHit(projectile, enemy, projectile.damage);
    }

    // Hit effect - use character-specific color
    this.particleManager.createHitEffect(enemy.x, enemy.y, projectile.particleColor);

    if (died) {
      this.particleManager.createBloodSplatter(enemy.x, enemy.y);
    }

    // Handle projectile hit
    projectile.onHit(enemy);

    // Lifesteal
    if (this.player.lifesteal > 0) {
      const healAmount = projectile.damage * this.player.lifesteal;
      this.player.heal(healAmount);
      this.updateHealthBar();
    }
  }

  /**
   * Handle projectile hitting boss
   */
  private onProjectileHitBoss(projectile: Projectile, boss: Boss): void {
    if (!projectile.isActive || !boss.isActive) return;
    if (!projectile.canHit(boss)) return;

    // Apply damage
    const died = boss.takeDamage(projectile.damage);

    // Hit effect
    this.particleManager.createHitEffect(boss.x, boss.y, 0xff00ff);

    // Handle projectile hit
    projectile.onHit(boss);

    // Lifesteal
    if (this.player.lifesteal > 0) {
      const healAmount = projectile.damage * this.player.lifesteal;
      this.player.heal(healAmount);
      this.updateHealthBar();
    }
  }

  /**
   * Handle enemy hitting player
   */
  private onEnemyHitPlayer(player: Player, enemy: Enemy | Boss): void {
    if (!enemy.isActive) return;

    // Friendly fire check (Mind Control)
    if (enemy instanceof Enemy && enemy.isMindControlled) return;

    // Damage player
    player.takeDamage(enemy.config.damage);

    // Hit effect
    this.particleManager.createHitEffect(player.x, player.y, 0xff0000);

    // Knockback enemy
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    const knockback = 100;
    enemy.body.setVelocity(
      Math.cos(angle + Math.PI) * knockback,
      Math.sin(angle + Math.PI) * knockback
    );

    // Update health bar
    this.updateHealthBar();
  }

  /**
   * Handle enemy died
   */
  private onEnemyDied(data: { x: number; y: number; xpValue: number }): void {
    // Increment kill count
    this.killCount++;
    if (this.killCountText) {
      this.killCountText.setText(`AMENAZAS NEUTRALIZADAS: ${this.killCount}`);
    }
  }

  /**
   * Spawn bosses
   */
  private spawnBosses(count: number): void {
    for (let i = 0; i < count; i++) {
      // Calculate spawn position (far from player)
      const angle = Math.random() * Math.PI * 2;
      const distance = 800;
      let x = this.player.x + Math.cos(angle) * distance;
      let y = this.player.y + Math.sin(angle) * distance;

      // Find nearest valid position
      if (!this.labGenerator.isValidPosition(x, y)) {
        const validPos = this.labGenerator.getRandomFloorPosition();
        x = validPos.x;
        y = validPos.y;
      }

      // Boss config based on level
      const bossLevel = Math.floor(this.xpManager.getStats().level / 5);

      const bossConfig = {
        name: `BOSS LV${bossLevel}`,
        maxHealth: 500 + (bossLevel * 200),
        speed: 60 + (bossLevel * 5),
        damage: 30 + (bossLevel * 10),
        xpValue: 500 + (bossLevel * 100),
        color: 0xff00ff,
        size: 60,
        special: bossLevel % 3 === 0 ? 'spawn_minions' : bossLevel % 2 === 0 ? 'area_damage' : 'dash'
      };

      const boss = new Boss(this, x, y);
      boss.spawn(x, y, bossConfig, this.player);

      this.bosses.push(boss);

      this.particleManager.createBossEntranceEffect(x, y);

      // Add boss collision with walls
      this.physics.add.collider(boss, this.labGenerator.getWalls());
    }
  }

  /**
   * Update loop
   */
  override update(time: number, delta: number): void {
    if (this.isPaused || this.isGameOver) return;

    // Update player movement
    this.updatePlayerMovement();

    // Update player
    this.player.update(time, delta);

    // Update special weapons
    this.specialWeapons.forEach(weapon => {
      weapon.update(time, delta);
    });

    // Update spawner
    this.enemySpawner.update(time, delta);

    // Despawn distant enemies (optimization)
    if (time % 1000 < delta) {
      this.enemySpawner.despawnDistantEnemies();
    }

    // Update XP manager
    this.xpManager.update(time, delta);

    // Update projectile collisions with enemies
    this.updateProjectileCollisions();

    // Update bosses
    this.bosses.forEach(boss => {
      if (boss.isActive) {
        boss.update(time, delta);
      }
    });
    this.updateBossHealthBar();
    this.updateBossProjectileCollisions();

    // Update UI
    this.updateUI(time);
  }

  /**
   * Update player movement
   */
  private updatePlayerMovement(): void {
    const speed = this.player.speed;
    let velocityX = 0;
    let velocityY = 0;

    // Keyboard input
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd?.a.isDown) {
        velocityX = -speed;
      } else if (this.cursors.right.isDown || this.wasd?.d.isDown) {
        velocityX = speed;
      }

      if (this.cursors.up.isDown || this.wasd?.w.isDown) {
        velocityY = -speed;
      } else if (this.cursors.down.isDown || this.wasd?.s.isDown) {
        velocityY = speed;
      }
    }

    // Virtual joystick input (mobile)
    if (this.virtualJoystick && this.virtualJoystick.isActive()) {
      const dir = this.virtualJoystick.getDirection();
      velocityX = dir.x * speed;
      velocityY = dir.y * speed;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    this.player.setVelocity(velocityX, velocityY);
  }

  /**
   * Update projectile collisions (manual check for object pooling)
   */
  private updateProjectileCollisions(): void {
    const enemies = this.enemySpawner.getActiveEnemies();

    this.player.getWeapons().forEach(weapon => {
      const projectiles = weapon.getActiveProjectiles();

      projectiles.forEach(projectile => {
        enemies.forEach(enemy => {
          if (!projectile.isActive || !enemy.isActive) return;

          const distance = Phaser.Math.Distance.Between(
            projectile.x,
            projectile.y,
            enemy.x,
            enemy.y
          );

          if (distance < 60) { // Increased from 20 to account for larger sprites
            this.onProjectileHitEnemy(projectile, enemy);
          }
        });
      });
    });
  }

  /**
   * Update boss projectile collisions
   */
  private updateBossProjectileCollisions(): void {
    this.bosses.forEach(boss => {
      if (!boss.isActive) return;

      this.player.getWeapons().forEach(weapon => {
        const projectiles = weapon.getActiveProjectiles();

        projectiles.forEach(projectile => {
          if (!projectile.isActive) return;

          const distance = Phaser.Math.Distance.Between(
            projectile.x,
            projectile.y,
            boss.x,
            boss.y
          );

          if (distance < boss.config.size / 2 + 10) {
            this.onProjectileHitBoss(projectile, boss);
          }
        });
      });
    });
  }

  /**
   * Setup input controls
   */
  private setupInput(): void {
    // Keyboard
    this.cursors = this.input.keyboard?.createCursorKeys();

    if (this.input.keyboard) {
      this.wasd = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Virtual joystick for mobile
    if (this.isMobile) {
      const { width, height } = this.cameras.main;
      this.virtualJoystick = new VirtualJoystick(this, 100, height - 100);
    }
  }

  /**
   * Setup UI elements
   */
  private setupUI(): void {
    const { width, height } = this.cameras.main;

    // Game time
    this.gameTimeText = this.add.text(20, 70, 'Time: 0:00', {
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.gameTimeText.setScrollFactor(0);
    this.gameTimeText.setDepth(100);

    // Level
    this.levelText = this.add.text(20, 95, 'Level: 1', {
      fontSize: '18px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(100);

    // XP
    this.xpText = this.add.text(20, 120, 'XP: 0 / 100', {
      fontSize: '16px',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.xpText.setScrollFactor(0);
    this.xpText.setDepth(100);

    // Enemy count
    // Enemy count
    this.enemyCountText = this.add.text(20, 145, 'Enemies: 0', {
      fontSize: '16px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.enemyCountText.setScrollFactor(0);
    this.enemyCountText.setDepth(100);

    // Kill Count (Top Right)
    this.killCountText = this.add.text(width - 20, 20, 'AMENAZAS NEUTRALIZADAS: 0', {
      fontFamily: '"Rubik Glitch", cursive',
      fontSize: '20px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'right'
    });
    this.killCountText.setOrigin(1, 0);
    this.killCountText.setScrollFactor(0);
    this.killCountText.setDepth(100);
    this.enemyCountText.setScrollFactor(0);
    this.enemyCountText.setDepth(100);

    // Health bar
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);

    // Health text
    this.healthText = this.add.text(20, this.cameras.main.height - 60, '', {
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.healthText.setScrollFactor(0);
    this.healthText.setDepth(101);

    this.updateHealthBar();

    // XP bar
    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);
    this.updateXPBar();

    // Controls info
    this.controlsText = this.add.text(
      width / 2,
      height - 30,
      this.isMobile ? 'Use joystick to move' : 'Controls: WASD or Arrow Keys',
      {
        fontSize: '14px',
        color: '#cccccc',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.controlsText.setOrigin(0.5);
    this.controlsText.setScrollFactor(0);
    this.controlsText.setDepth(100);
  }

  /**
   * Setup Debug UI
   */
  private setupDebugUI(): void {
    const { width, height } = this.cameras.main;

    // Toggle Button
    this.debugButton = this.add.text(width - 80, height - 30, 'DEBUG', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 5, y: 5 }
    })
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleDebug());

    // Debug Panel (Hidden by default)
    this.debugPanel = this.add.container(width - 220, 50);
    this.debugPanel.setScrollFactor(0);
    this.debugPanel.setDepth(2000);
    this.debugPanel.setVisible(false);

    // Panel Background
    const bg = this.add.rectangle(0, 0, 200, 150, 0x000000, 0.8);
    bg.setOrigin(0);
    this.debugPanel.add(bg);

    // Title
    const title = this.add.text(10, 10, 'Asset Editor', { fontSize: '16px', color: '#ffff00' });
    this.debugPanel.add(title);

    // Info Text
    this.debugInfoText = this.add.text(10, 35, 'Select an asset...', { fontSize: '12px', color: '#ffffff' });
    this.debugPanel.add(this.debugInfoText);

    // Controls
    const createBtn = (x: number, y: number, label: string, callback: () => void) => {
      const btnContainer = this.add.container(x, y);

      const btnBg = this.add.rectangle(0, 0, 35, 20, 0x444444);
      btnBg.setOrigin(0);
      btnBg.setInteractive({ useHandCursor: true });

      const btnText = this.add.text(5, 2, label, { fontSize: '12px', color: '#ffffff' });

      btnContainer.add([btnBg, btnText]);

      btnBg.on('pointerdown', () => {
        btnBg.setFillStyle(0x666666);
        console.log(`[DebugUI] Clicked ${label}`);
        callback();
      });

      btnBg.on('pointerup', () => {
        btnBg.setFillStyle(0x444444);
      });

      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x444444);
      });

      this.debugPanel.add(btnContainer);
      return btnContainer;
    };

    createBtn(10, 60, 'W -', () => this.resizeSelected(-1, 0));
    createBtn(50, 60, 'W +', () => this.resizeSelected(1, 0));
    createBtn(10, 90, 'H -', () => this.resizeSelected(0, -1));
    createBtn(50, 90, 'H +', () => this.resizeSelected(0, 1));

    // Listen for selection
    this.events.on('visual-selected', (visual: any) => {
      this.debugSelectedVisual = visual;
      this.debugPanel.setVisible(true);
      this.updateDebugPanelInfo();
    });

    // Keyboard Shortcuts
    if (this.input.keyboard) {
      // Width
      this.input.keyboard.on('keydown-U', () => {
        const step = this.input.keyboard!.checkDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT), 0) ? -10 : -1;
        this.resizeSelected(step, 0);
      });
      this.input.keyboard.on('keydown-I', () => {
        const step = this.input.keyboard!.checkDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT), 0) ? 10 : 1;
        this.resizeSelected(step, 0);
      });

      // Height
      this.input.keyboard.on('keydown-J', () => {
        const step = this.input.keyboard!.checkDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT), 0) ? -10 : -1;
        this.resizeSelected(0, step);
      });
      this.input.keyboard.on('keydown-K', () => {
        const step = this.input.keyboard!.checkDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT), 0) ? 10 : 1;
        this.resizeSelected(0, step);
      });

      // Pause
      this.input.keyboard.on('keydown-P', () => {
        this.togglePause();
      });
    }
  }

  private toggleDebug(): void {
    const config = (GameConfig as any);
    config.debugAssetSizes = !config.debugAssetSizes;

    this.debugButton.setColor(config.debugAssetSizes ? '#00ff00' : '#ffffff');
    this.events.emit('debug-toggle', config.debugAssetSizes);

    if (!config.debugAssetSizes) {
      this.debugPanel.setVisible(false);
      this.debugSelectedVisual = undefined;
    }
  }

  private togglePause(): void {
    if (this.isGameOver) return; // Don't pause if game is over

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      // Pause physics
      this.physics.pause();

      // Pause tweens
      this.tweens.pauseAll();

      // Pause animations
      this.anims.pauseAll();

      // Stop enemy spawner
      this.enemySpawner.stop();

      // Show PAUSED text
      if (!this.pauseText) {
        const { width, height } = this.cameras.main;
        this.pauseText = this.add.text(width / 2, height / 2, 'PAUSED', {
          fontSize: '72px',
          color: '#ffff00',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 10
        });
        this.pauseText.setOrigin(0.5);
        this.pauseText.setScrollFactor(0);
        this.pauseText.setDepth(3000);
      }
      this.pauseText.setVisible(true);
    } else {
      // Resume physics
      this.physics.resume();

      // Resume tweens
      this.tweens.resumeAll();

      // Resume animations
      this.anims.resumeAll();

      // Restart enemy spawner
      (this.enemySpawner as any).isSpawning = true;

      // Hide PAUSED text
      if (this.pauseText) {
        this.pauseText.setVisible(false);
      }
    }
  }

  private resizeSelected(dw: number, dh: number): void {
    console.log(`[DebugUI] Resizing by ${dw}, ${dh}`);
    if (!this.debugSelectedVisual) {
      console.warn('[DebugUI] No visual selected');
      return;
    }

    // Ensure we have the resize method
    if (typeof this.debugSelectedVisual.resize !== 'function') {
      console.error('[DebugUI] VisualComponent missing resize method!', this.debugSelectedVisual);
      return;
    }

    const visual = this.debugSelectedVisual.mainVisual;
    if (!visual) return;

    const newW = visual.displayWidth + dw;
    const newH = visual.displayHeight + dh;

    console.log(`[DebugUI] New size: ${newW}x${newH}`);

    if (newW > 0 && newH > 0) {
      this.debugSelectedVisual.resize(newW, newH);
      this.updateDebugPanelInfo();
    }
  }

  private updateDebugPanelInfo(): void {
    if (!this.debugSelectedVisual || !this.debugSelectedVisual.mainVisual) return;
    const v = this.debugSelectedVisual.mainVisual;
    this.debugInfoText.setText(`Size: ${Math.round(v.displayWidth)} x ${Math.round(v.displayHeight)}`);
  }

  /**
   * Handle window resize
   */
  private resize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.main.setViewport(0, 0, width, height);

    // Update UI positions
    if (this.controlsText) {
      this.controlsText.setX(width / 2);
      this.controlsText.setY(height - 30);
    }

    // Update joystick position if mobile
    if (this.isMobile && this.virtualJoystick) {
      // Re-create joystick or update position logic would go here
      // For now, simple update
    }
  }

  /**
   * Update health bar
   */
  private updateHealthBar(): void {
    this.healthBar.clear();

    const barWidth = 200;
    const barHeight = 20;
    const x = 20;
    const y = this.cameras.main.height - 60;
    const healthPercent = this.player.health / this.player.maxHealth;

    // Background
    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health (always RED)
    this.healthBar.fillStyle(0xff0000);
    this.healthBar.fillRect(x + 2, y + 2, (barWidth - 4) * healthPercent, barHeight - 4);

    // Border
    this.healthBar.lineStyle(2, 0xffffff);
    this.healthBar.strokeRect(x, y, barWidth, barHeight);

    // Update health text with numbers
    this.healthText.setText(`${Math.ceil(this.player.health)} / ${this.player.maxHealth}`);
    this.healthText.setPosition(x + barWidth / 2 - this.healthText.width / 2, y + 2);
  }

  /**
   * Update XP bar
   */
  private updateXPBar(): void {
    this.xpBar.clear();

    const barWidth = 200;
    const barHeight = 15;
    const x = 20;
    const y = this.cameras.main.height - 35;
    const stats = this.xpManager.getStats();
    const xpPercent = stats.currentXP / stats.xpToNextLevel;

    // Background
    this.xpBar.fillStyle(0x000000, 0.7);
    this.xpBar.fillRect(x, y, barWidth, barHeight);

    // XP (cyan)
    this.xpBar.fillStyle(0x00ffff);
    this.xpBar.fillRect(x + 2, y + 2, (barWidth - 4) * xpPercent, barHeight - 4);

    // Border
    this.xpBar.lineStyle(2, 0xffffff);
    this.xpBar.strokeRect(x, y, barWidth, barHeight);
  }

  /**
   * Update boss health bar
   */
  private updateBossHealthBar(): void {
    // Show health bar for the first active boss
    const activeBoss = this.bosses.find(b => b.isActive);

    if (!activeBoss) {
      if (this.bossHealthBar) {
        this.bossHealthBar.clear();
        this.bossHealthBar.setVisible(false);
      }
      if (this.bossNameText) {
        this.bossNameText.setVisible(false);
      }
      return;
    }

    if (!this.bossHealthBar) {
      this.bossHealthBar = this.add.graphics();
      this.bossHealthBar.setScrollFactor(0);
      this.bossHealthBar.setDepth(100);
    }

    if (!this.bossNameText) {
      this.bossNameText = this.add.text(
        this.cameras.main.width / 2,
        100,
        '',
        {
          fontSize: '24px',
          color: '#ff00ff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        }
      );
      this.bossNameText.setOrigin(0.5);
      this.bossNameText.setScrollFactor(0);
      this.bossNameText.setDepth(100);
    }

    this.bossHealthBar.setVisible(true);
    this.bossNameText.setVisible(true);

    this.bossHealthBar.clear();

    const barWidth = 400;
    const barHeight = 20;
    const x = (this.cameras.main.width - barWidth) / 2;
    const y = 130;
    const healthPercent = activeBoss.health / activeBoss.config.maxHealth;

    // Update name
    this.bossNameText.setText(`👹 ${activeBoss.config.name} 👹`);

    // Background
    this.bossHealthBar.fillStyle(0x000000, 0.8);
    this.bossHealthBar.fillRect(x, y, barWidth, barHeight);

    // Health
    const color = healthPercent > 0.5 ? 0xff00ff : healthPercent > 0.25 ? 0xff6600 : 0xff0000;
    this.bossHealthBar.fillStyle(color);
    this.bossHealthBar.fillRect(x + 2, y + 2, (barWidth - 4) * healthPercent, barHeight - 4);

    // Border
    this.bossHealthBar.lineStyle(3, 0xffffff);
    this.bossHealthBar.strokeRect(x, y, barWidth, barHeight);
  }

  /**
   * Handle level up
   */
  private onLevelUp(data: { level: number }): void {
    console.log(`🎉 LEVEL UP! Now level ${data.level}`);

    // Flash effect
    this.cameras.main.flash(500, 255, 255, 0);

    // Heal player fully
    this.player.heal(this.player.maxHealth);
    this.updateHealthBar();

    // Level up effect
    this.particleManager.createLevelUpEffect(this.player.x, this.player.y);

    // Check for boss spawn (every 5 levels)
    if (data.level % 5 === 0) {
      const bossCount = data.level / 5;
      this.spawnBosses(bossCount);
    }

    // Pause game and show level-up screen
    this.scene.pause();
    this.scene.launch('LevelUpScene', { level: data.level });
  }

  /**
   * Handle XP gained
   */
  private onXPGained(data: any): void {
    this.updateXPBar();
  }

  /**
   * Handle boss spawned
   */
  private onBossSpawned(data: { name: string }): void {
    this.particleManager.createTextPopup(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `⚠️ ${data.name} APPROACHES! ⚠️`,
      '#ff00ff'
    );
  }

  /**
   * Handle boss defeated
   */
  private onBossDefeated(data: { name: string; boss: Boss }): void {
    this.particleManager.createTextPopup(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `💀 ${data.name} DEFEATED! 💀`,
      '#00ff00'
    );

    // Remove from list
    if (this.bosses) {
      const index = this.bosses.indexOf(data.boss);
      if (index > -1) {
        this.bosses.splice(index, 1);
      }
    }
  }

  /**
   * Handle player death
   */
  private onPlayerDied(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.log('💀 Player died!');

    // Play death animation
    if (this.player && this.player.visual) {
      this.player.visual.playAnimation(`${this.player.characterId}-dead`, 15, false, false);
    }

    // Stop physics
    this.physics.pause();

    // Show Game Over screen
    const { width, height } = this.cameras.main;

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    bg.setScrollFactor(0);
    bg.setDepth(1000);

    const text = this.add.text(width / 2, height / 2 - 50, 'SUJETO ELIMINADO', {
      fontFamily: '"Rubik Glitch", cursive',
      fontSize: '64px',
      color: '#ff0000'
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(1001);

    // Show Score
    const scoreText = this.add.text(width / 2, height / 2 + 30, `AMENAZAS NEUTRALIZADAS: ${this.killCount}`, {
      fontFamily: '"Roboto", sans-serif',
      fontSize: '32px',
      color: '#ffffff'
    });
    scoreText.setOrigin(0.5);
    scoreText.setScrollFactor(0);
    scoreText.setDepth(1001);

    // Show High Score
    const charId = this.player.characterId;
    const highScore = localStorage.getItem(`qdt_highscore_${charId}`) || '0';
    const highText = this.add.text(width / 2, height / 2 + 80, `RÉCORD PERSONAL: ${highScore}`, {
      fontFamily: '"Roboto", sans-serif',
      fontSize: '24px',
      color: '#ffff00'
    });
    highText.setOrigin(0.5);
    highText.setScrollFactor(0);
    highText.setDepth(1001);

    const restartText = this.add.text(width / 2, height / 2 + 150, 'Click to Restart', {
      fontSize: '24px',
      color: '#ffffff'
    });
    restartText.setOrigin(0.5);
    restartText.setScrollFactor(0);
    restartText.setDepth(1001);

    // Restart on click
    this.input.once('pointerdown', () => {
      this.scene.start('CharacterSelectionScene');
    });
  }

  /**
   * Update UI elements
   */
  private updateUI(time: number): void {
    // Game time
    const gameTime = Math.floor((time - this.gameStartTime) / 1000);
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    this.gameTimeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);

    // Level
    const stats = this.xpManager.getStats();
    this.levelText.setText(`Level: ${stats.level}`);

    // XP
    this.xpText.setText(`XP: ${stats.currentXP} / ${stats.xpToNextLevel}`);

    // Enemy count
    const enemyCount = this.enemySpawner.getActiveEnemies().length + this.bosses.length;
    this.enemyCountText.setText(`Enemies: ${enemyCount}`);
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    this.events.off('level-up', this.onLevelUp, this);
    this.events.off('xp-gained', this.onXPGained, this);
    this.events.off('boss-spawned', this.onBossSpawned, this);
    this.events.off('boss-defeated', this.onBossDefeated, this);
    this.events.off('enemy-died', this.onEnemyDied, this);
    this.events.off('player-died', this.onPlayerDied, this);
  }
}
