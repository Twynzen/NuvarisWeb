import * as Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload(): void {
        this.createLoadingBar();

        // Environment
        // Load wall textures
        this.load.path = 'assets/environment/';
        this.load.image('wall_1', 'wall_1.png');
        this.load.image('wall_2', 'wall_2.png');
        this.load.image('wall_3', 'wall_3.png');
        this.load.image('wall_4', 'wall_4.png');
        this.load.path = ''; // Reset path

        // --- Arcadio Assets ---
        this.load.path = 'assets/arcadio/';
        this.load.image('arcadio-shoot', 'arcadio-shoot.png');
        this.load.image('arcadio-dead', 'arcadio-dead.png');
        this.load.image('arcadio-hit', 'hit-arcadio.png');

        // Concept Animation (30 frames)
        this.load.path = 'assets/arcadio/concept/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-concept-${i}`, `arcadio-concept-${num}.png`);
        }
        this.load.path = 'assets/arcadio/';

        // Static (for backwards compatibility)
        this.load.image('arcadio-static-1', 'arcadio-static-1.png');
        this.load.image('arcadio-static-2', 'arcadio-static-2.png');
        this.load.image('arcadio-static-3', 'arcadio-static-3.png');

        // Idle Animation (30 frames)
        this.load.path = 'assets/arcadio/idle/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-idle-${i}`, `arcadio-idle-${num}.png`);
        }

        // Walk Right (30 frames)
        this.load.path = 'assets/arcadio/right/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-walk-right-${i}`, `arcadio-walk-right-${num}.png`);
        }

        // Walk Down (30 frames)
        this.load.path = 'assets/arcadio/down/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-walk-down-${i}`, `arcadio-walk-down-${num}.png`);
        }

        // Walk Up (30 frames)
        this.load.path = 'assets/arcadio/up/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-walk-up-${i}`, `arcadio-walk-up-${num}.png`);
        }

        // Shoot Animations
        // Right
        this.load.path = 'assets/arcadio/shoot/right/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-shoot-right-${i}`, `arcadio-shoot-right-${num}.png`);
        }
        // Down
        this.load.path = 'assets/arcadio/shoot/down/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-shoot-down-${i}`, `arcadio-shoot-down-${num}.png`);
        }
        // Up
        this.load.path = 'assets/arcadio/shoot/up/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-shoot-up-${i}`, `arcadio-shoot-up-${num}.png`);
        }
        // Projectile (shoot/shoot folder)
        this.load.path = 'assets/arcadio/shoot/shoot/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-projectile-${i}`, `arcadio-shoot-${num}.png`);
        }

        // Dead Animation (30 frames)
        this.load.path = 'assets/arcadio/dead/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`arcadio-dead-${i}`, `arcadio-dead-${num}.png`);
        }

        this.load.path = 'assets/arcadio/';

        // --- Lars Assets ---
        this.load.path = 'assets/lars/';
        this.load.image('lars-shoot', 'lars-shoot.png');
        this.load.image('lars-dead', 'lars-dead.png');
        this.load.image('lars-hit', 'hit-lars.png');
        this.load.image('lars-grab', 'lars-grab.png');

        // Concept Animation (30 frames)
        this.load.path = 'assets/lars/concept/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-concept-${i}`, `lars-concept-${num}.png`);
        }
        this.load.path = 'assets/lars/';

        // Static
        this.load.image('lars-static-0', 'lars-static-0.png');
        this.load.image('lars-static-1', 'lars-static-1.png');

        // Idle Animation
        this.load.path = 'assets/lars/idle/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-idle-${i}`, `lars-idle-one-${num}.png`);
        }
        this.load.path = 'assets/lars/';

        // Walk Right (Sequence)
        this.load.path = 'assets/lars/right/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-walk-right-${i}`, `lars-walk-right-${num}.png`);
        }

        // Walk Down (Sequence)
        this.load.path = 'assets/lars/down/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-walk-down-${i}`, `lars-walk-down-${num}.png`);
        }

        // Walk Up (Sequence)
        this.load.path = 'assets/lars/up/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-walk-up-${i}`, `lars-walk-up-${num}.png`);
        }

        // Shoot Animations
        // Right
        this.load.path = 'assets/lars/shoot/right/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-shoot-right-${i}`, `lars-shoot-right-${num}.png`);
        }
        // Down
        this.load.path = 'assets/lars/shoot/down/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-shoot-down-${i}`, `lars-shoot-down-${num}.png`);
        }
        // Up
        this.load.path = 'assets/lars/shoot/up/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-shoot-up-${i}`, `lars-shoot-up-${num}.png`);
        }
        // Projectile (shoot/shoot folder)
        this.load.path = 'assets/lars/shoot/shoot/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-projectile-${i}`, `lars-shoot-${num}.png`);
        }

        // Dead Animation (30 frames)
        this.load.path = 'assets/lars/dead/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`lars-dead-${i}`, `lars-dead-${num}.png`);
        }

        this.load.path = 'assets/lars/';


        // --- Yurany (Proyecto Y) Assets ---
        this.load.path = 'assets/proyecto-y/';
        this.load.image('yurany-dead', 'yurany-dead.png');
        this.load.image('yurany-hit', 'hit-yurany.png');

        // Concept Animation (30 frames)
        this.load.path = 'assets/proyecto-y/concept/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-concept-${i}`, `y-concept-${num}.png`);
        }
        this.load.path = 'assets/proyecto-y/';

        // Shoot Animations
        // Right
        this.load.path = 'assets/proyecto-y/shoot/right/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-shoot-right-${i}`, `y-shoot-right-${num}.png`);
        }
        // Down
        this.load.path = 'assets/proyecto-y/shoot/down/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-shoot-down-${i}`, `y-shoot-down-${num}.png`); // Assuming filename format
        }
        // Up
        this.load.path = 'assets/proyecto-y/shoot/up/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-shoot-up-${i}`, `y-shoot-up-${num}.png`);
        }

        // Projectile
        this.load.path = 'assets/proyecto-y/shoot/shoot/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-projectile-${i}`, `y-shoot-${num}.png`);
        }

        // Dead Animation (30 frames)
        this.load.path = 'assets/proyecto-y/dead/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-dead-${i}`, `y-dead-${num}.png`);
        }

        this.load.path = 'assets/proyecto-y/';

        // Static (Idle)
        this.load.path = 'assets/proyecto-y/idle/';
        // Stage 1 (1-30)
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-idle-${i}`, `y-idle-one-${num}.png`);
        }
        this.load.path = 'assets/proyecto-y/';

        // Walk
        this.load.path = 'assets/proyecto-y/';
        this.load.image('yurany-walk-left-1', 'yurany-walk-left-1.png');
        this.load.image('yurany-walk-left-2', 'yurany-walk-left-2.png');

        // Walk Right (Sequence)
        this.load.path = 'assets/proyecto-y/right/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-walk-right-${i}`, `y-walk-right-${num}.png`);
        }

        // Walk Down (Sequence)
        this.load.path = 'assets/proyecto-y/down/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-walk-down-${i}`, `y-walk-down-${num}.png`);
        }

        // Walk Up (Sequence)
        this.load.path = 'assets/proyecto-y/up/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`yurany-walk-up-${i}`, `y-walk-up-${num}.png`);
        }

        this.load.path = 'assets/proyecto-y/';

        // Diagonals
        this.load.image('yurany-walk-down-left-2', 'yurany-walk-down-left-2.png');
        this.load.image('yurany-walk-down-right-1', 'yurany-walk-down-right-1.png');
        this.load.image('yurany-walk-down-right-2', 'yurany-walk-down-right-2.png');
        this.load.image('yurany-walk-up-left-1', 'yurany-walk-up-left-1.png');
        this.load.image('yurany-walk-up-left-2', 'yurany-walk-up-left-2.png');
        this.load.image('yurany-walk-up-right-1', 'yurany-walk-up-right-1.png');
        this.load.image('yurany-walk-up-right-2', 'yurany-walk-up-right-2.png');


        // --- Enemies ---

        // Intestine Worm
        this.load.path = 'assets/Enemys/intestine-worm/walk/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`worm-move-${i}`, `intestine-worm-walk-${num}.png`);
        }

        this.load.path = 'assets/Enemys/intestine-worm/idle/';
        this.load.image('worm-dead', 'intestine-worm-dead.png');

        // Spider
        this.load.path = 'assets/Enemys/spider/walk/';
        for (let i = 1; i <= 30; i++) {
            const num = i.toString().padStart(3, '0');
            this.load.image(`spider-move-${i}`, `spider-walk-${num}.png`);
        }

        this.load.path = 'assets/Enemys/spider/';
        // Note: spider-shoot.png exists but not loaded since spiders don't shoot
        this.load.image('spider-hit', 'hit-spider.png');

        // Spider Boss
        this.load.path = 'assets/Enemys/spider-boss/';
        this.load.image('boss-face-1', 'spider-boss-fase-1.png');
        this.load.image('boss-face-2', 'spider-boss-face-2.png');
        this.load.image('boss-hit', 'hit-spider-boss.png');
        this.load.image('boss-walk-1', 'spider-boss-face-1-walk-1.png');
        this.load.image('boss-walk-2', 'spider-boss-face-1-walk-2.png');
        this.load.image('boss-walk-3', 'spider-boss-face-1-walk-3.png');
        this.load.image('boss-walk-4', 'spider-boss-face-1-walk-4.png');
    }

    create(): void {
        this.generateIsometricAssets();
        this.scene.start('MenuScene');
    }

    private generateIsometricAssets(): void {
        // Create a graphics object
        const graphics = this.make.graphics({ x: 0, y: 0 });

        // --- Floor Tile (Diamond) ---
        // 64x32 isometric tile
        // Top: (32, 0), Right: (64, 16), Bottom: (32, 32), Left: (0, 16)

        // IMPROVED: Dark gray instead of pure black for better contrast
        graphics.fillStyle(0x1a1a1a); // Very dark gray
        graphics.beginPath();
        graphics.moveTo(32, 0);
        graphics.lineTo(64, 16);
        graphics.lineTo(32, 32);
        graphics.lineTo(0, 16);
        graphics.closePath();
        graphics.fillPath();

        // Add subtle border for tile definition
        graphics.lineStyle(1, 0x2a2a2a, 0.6);
        graphics.strokePath();

        graphics.generateTexture('iso-floor', 64, 32);
        graphics.clear();

        // --- Wall Tile (Tall Cube) ---
        // 64x96 (Base 64x32, Height 64)

        // Top Face (Diamond at y=0) - IMPROVED: Lighter for better visibility
        graphics.fillStyle(0xaaaaaa); // Light grey top
        graphics.beginPath();
        graphics.moveTo(32, 0);
        graphics.lineTo(64, 16);
        graphics.lineTo(32, 32);
        graphics.lineTo(0, 16);
        graphics.closePath();
        graphics.fillPath();

        // Left Face - IMPROVED: Medium grey
        graphics.fillStyle(0x777777); // Medium grey left
        graphics.beginPath();
        graphics.moveTo(0, 16);
        graphics.lineTo(32, 32);
        graphics.lineTo(32, 96); // Extended down
        graphics.lineTo(0, 80);  // Extended down
        graphics.closePath();
        graphics.fillPath();

        // Right Face - IMPROVED: Darker for depth
        graphics.fillStyle(0x666666); // Darker grey right
        graphics.beginPath();
        graphics.moveTo(32, 32);
        graphics.lineTo(64, 16);
        graphics.lineTo(64, 80); // Extended down
        graphics.lineTo(32, 96); // Extended down
        graphics.closePath();
        graphics.fillPath();

        // IMPROVED: Highlight edges for better definition
        graphics.lineStyle(2, 0x999999, 0.8);
        graphics.beginPath();
        // Top edges
        graphics.moveTo(0, 16);
        graphics.lineTo(32, 0);
        graphics.lineTo(64, 16);
        graphics.strokePath();

        // Vertical corner
        graphics.lineStyle(1, 0x555555, 0.6);
        graphics.beginPath();
        graphics.moveTo(32, 32);
        graphics.lineTo(32, 96);
        graphics.strokePath();

        graphics.generateTexture('iso-wall', 64, 96);
        graphics.destroy();

        console.log('✨ Isometric assets generated: iso-floor (improved), iso-wall (improved)');
    }

    private createLoadingBar(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading Assets...',
            style: {
                font: '20px monospace',
                color: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
    }
}
