import * as Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    private startKey!: Phaser.Input.Keyboard.Key;
    private titleText!: Phaser.GameObjects.Text;
    private subtitleText!: Phaser.GameObjects.Text;
    private noiseSprite!: Phaser.GameObjects.TileSprite;

    constructor() {
        super({ key: 'MenuScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // 1. Background: Deep Cosmic Void
        this.cameras.main.setBackgroundColor('#000000');

        // Add some procedural "stars" or "dust" that moves slowly
        // this.createCosmicDust(width, height); // Removed as requested

        // 2. Title: NÚVARIS (Gothic/Horror style)
        this.titleText = this.add.text(width / 2, height / 3, 'NÚVARIS', {
            fontFamily: '"Rubik Glitch", cursive',
            fontSize: '120px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        this.titleText.setOrigin(0.5);
        this.titleText.setAlpha(0);

        // Title Glitch Effect
        this.tweens.add({
            targets: this.titleText,
            alpha: 1,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.startTitleGlitch();
            }
        });

        // 3. Subtitle / Start Prompt
        this.subtitleText = this.add.text(width / 2, height * 0.7, 'PRESS SPACE TO ENTER', {
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '24px',
            color: '#888888',
            align: 'center'
        });
        this.subtitleText.setOrigin(0.5);
        this.subtitleText.setAlpha(0);

        // Pulse animation for subtitle
        this.tweens.add({
            targets: this.subtitleText,
            alpha: { from: 0.3, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 4. Input
        if (this.input.keyboard) {
            this.startKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }

        this.input.on('pointerdown', () => {
            this.startGame();
        });

        // 5. Vignette effect (using a gradient texture)
        const texture = this.textures.createCanvas('vignette', width, height);
        if (texture) {
            const ctx = texture.getContext();
            const grd = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.8);
            grd.addColorStop(0, 'rgba(0,0,0,0)');
            grd.addColorStop(1, 'rgba(0,0,0,0.8)');

            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);

            texture.refresh();
            const vSprite = this.add.image(width / 2, height / 2, 'vignette');
            vSprite.setScrollFactor(0);
            vSprite.setDepth(100);
        }

        // 6. Fog / Mist Effect
        this.createFog(width, height);
    }

    override update(time: number, delta: number): void {
        if (this.startKey && Phaser.Input.Keyboard.JustDown(this.startKey)) {
            this.startGame();
        }
    }

    private startGame(): void {
        // Prevent multiple calls
        if (this.titleText.alpha === 0 && this.subtitleText.alpha === 0) return;

        // Fade out UI first
        this.tweens.add({
            targets: [this.titleText, this.subtitleText],
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // Then fade out camera and switch scene
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                    this.scene.start('CharacterSelectionScene');
                });
            }
        });
    }

    private createFog(width: number, height: number): void {
        // Generate a better smoke texture (soft cloud)
        if (!this.textures.exists('fog_cloud')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0x111111, 0.5); // Dark grey, semi-transparent
            graphics.fillCircle(128, 128, 128);
            // Add some noise/irregularity if possible, or just use a soft circle for now
            graphics.generateTexture('fog_cloud', 256, 256);
        }

        // Layer 1: Background Fog (Slow, large)
        this.add.particles(0, 0, 'fog_cloud', {
            x: { min: -200, max: width + 200 },
            y: { min: 0, max: height },
            lifespan: 10000,
            speedX: { min: -10, max: 10 },
            speedY: { min: -5, max: 5 },
            scale: { start: 4, end: 6 },
            alpha: { start: 0.1, end: 0 },
            blendMode: 'NORMAL', // Normal blend for "thick" fog look
            quantity: 1,
            frequency: 500
        });

        // Layer 2: Foreground Mist (Faster, smaller, brighter)
        this.add.particles(0, 0, 'fog_cloud', {
            x: { min: 0, max: width },
            y: { min: height - 300, max: height + 100 },
            lifespan: 7000,
            speedX: { min: -30, max: 30 },
            speedY: { min: -10, max: -20 }, // Rising slightly
            scale: { start: 2, end: 3 },
            alpha: { start: 0.15, end: 0 },
            blendMode: 'ADD', // Additive for "glowing" mist
            quantity: 1,
            frequency: 200
        });
    }

    // Removed createCosmicDust as requested

    private startTitleGlitch(): void {
        this.time.addEvent({
            delay: 200, // Randomize this in a real implementation
            callback: () => {
                // Randomly offset position slightly
                if (Math.random() > 0.9) {
                    const offsetX = (Math.random() - 0.5) * 10;
                    const offsetY = (Math.random() - 0.5) * 5;
                    this.titleText.setPosition(this.cameras.main.width / 2 + offsetX, this.cameras.main.height / 3 + offsetY);
                    this.titleText.setAlpha(0.8);

                    // Restore quickly
                    this.time.delayedCall(50, () => {
                        this.titleText.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 3);
                        this.titleText.setAlpha(1);
                    });
                }
            },
            loop: true
        });
    }
}
