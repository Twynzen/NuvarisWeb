import * as Phaser from 'phaser';

export interface CharacterData {
    id: string;
    name: string;
    title: string;
    description: string;
    stats: {
        health: number; // 1-5 scale
        speed: number;  // 1-5 scale
        damage: number; // 1-5 scale
    };
    color: number; // For visual flair
}

export class CharacterSelectionScene extends Phaser.Scene {
    private characters: CharacterData[] = [
        {
            id: 'lars',
            name: 'DR. LARS',
            title: 'El Doctor',
            description: 'Director del Sector Omega. Usa tecnología experimental para controlar mentes y doblegar realidades.',
            stats: { health: 4, speed: 3, damage: 3 },
            color: 0xcccccc
        },
        {
            id: 'arcadio',
            name: 'PROYECTO A',
            title: 'El Mutante',
            description: 'Mutante biológico de fuerza incalculable. Diseñado para resistir y aplastar cualquier amenaza dimensional.',
            stats: { health: 2, speed: 3, damage: 5 },
            color: 0x9945ff // Purple hint
        },
        {
            id: 'yurany',
            name: 'PROYECTO Y',
            title: 'El Experimento',
            description: 'Entidad de fusión espectral. Inestable y letal, libera tormentas de energía sobre sus enemigos.',
            stats: { health: 3, speed: 5, damage: 2 },
            color: 0x00ffff // Cyan hint
        }
    ];

    private selectedIndex = -1; // Start with no character selected
    private characterContainers: Phaser.GameObjects.Container[] = [];
    private characterSprites: Phaser.GameObjects.Sprite[] = []; // Store sprite references
    private selector!: Phaser.GameObjects.Graphics;
    private typewriterEvent?: Phaser.Time.TimerEvent;

    constructor() {
        super({ key: 'CharacterSelectionScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // Background
        this.cameras.main.setBackgroundColor('#050505');

        // Create concept animations
        this.createConceptAnimations();

        // Title
        // Title (Glitch Effect)
        const title = this.createGlitchText(width / 2, 80, 'QDT: SECTOR DE CONFINAMIENTO', {
            fontFamily: '"Rubik Glitch", cursive',
            fontSize: '48px',
            color: '#ffffff',
            letterSpacing: 2
        });
        // createGlitchText sets origin to 0.5 internally

        // Background Noise Effect
        const noise = this.add.graphics();
        noise.setDepth(100); // Overlay on top
        noise.setBlendMode(Phaser.BlendModes.OVERLAY);

        this.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
                noise.clear();
                noise.fillStyle(0xffffff, 0.05);
                for (let i = 0; i < 20; i++) {
                    const h = Phaser.Math.Between(2, 10);
                    noise.fillRect(0, Phaser.Math.Between(0, height), width, h);
                }
            }
        });

        // Create character cards
        const cardWidth = 250;
        const spacing = 40;
        const centerY = height / 2;

        this.characters.forEach((char, index) => {
            // Calculate position: Center + offset based on index (0=-1, 1=0, 2=1)
            const offset = (index - 1) * (cardWidth + spacing);
            const x = width / 2 + offset;

            this.createCharacterCard(x, centerY, cardWidth, char, index);
        });

        // Selector highlight
        this.selector = this.add.graphics();
        this.updateSelector();

        // Spotlight effect (follows mouse)
        const spotlight = this.add.image(0, 0, 'spotlight');
        if (!this.textures.exists('spotlight')) {
            // Create spotlight texture if missing
            const texture = this.textures.createCanvas('spotlight', 400, 400);
            if (texture) {
                const ctx = texture.getContext();
                const grd = ctx.createRadialGradient(200, 200, 0, 200, 200, 200);
                grd.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, 400, 400);
                texture.refresh();
                spotlight.setTexture('spotlight');
            }
        } else {
            spotlight.setTexture('spotlight');
        }
        spotlight.setBlendMode(Phaser.BlendModes.ADD);
        spotlight.setDepth(50);

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            spotlight.setPosition(pointer.x, pointer.y);
        });

        // Input
        this.input.keyboard?.on('keydown-LEFT', () => this.selectCharacter(this.selectedIndex - 1));
        this.input.keyboard?.on('keydown-RIGHT', () => this.selectCharacter(this.selectedIndex + 1));
        this.input.keyboard?.on('keydown-ENTER', () => this.confirmSelection());
        this.input.keyboard?.on('keydown-SPACE', () => this.confirmSelection());

        // Initial selection visual update
        this.selectCharacter(-1);
    }

    private createConceptAnimations(): void {
        // Create animations for each character's concept art
        this.characters.forEach(char => {
            const animKey = `${char.id}-concept`;

            // Create animation manually from frames
            const frames: Phaser.Types.Animations.AnimationFrame[] = [];
            for (let i = 1; i <= 30; i++) {
                frames.push({ key: `${char.id}-concept-${i}`, frame: 0 });
            }

            this.anims.create({
                key: animKey,
                frames: frames,
                frameRate: 15, // Smooth animation
                repeat: -1 // Loop infinitely
            });
        });
    }

    private createGlitchText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        // Glitch layers (Red and Cyan)
        const rText = this.add.text(2, 0, text, { ...style, color: '#ff0000' }).setAlpha(0.7);
        const cText = this.add.text(-2, 0, text, { ...style, color: '#00ffff' }).setAlpha(0.7);
        const mainText = this.add.text(0, 0, text, style);

        // Blending
        rText.setBlendMode(Phaser.BlendModes.ADD);
        cText.setBlendMode(Phaser.BlendModes.ADD);

        // Center origin for all
        rText.setOrigin(0.5);
        cText.setOrigin(0.5);
        mainText.setOrigin(0.5);

        container.add([rText, cText, mainText]);

        // Jitter Tween
        this.tweens.add({
            targets: [rText, cText],
            x: '+=2',
            y: '+=1',
            duration: 50,
            yoyo: true,
            repeat: -1,
            onRepeat: () => {
                rText.setPosition(Phaser.Math.Between(-2, 2), Phaser.Math.Between(-1, 1));
                cText.setPosition(Phaser.Math.Between(-2, 2), Phaser.Math.Between(-1, 1));
                rText.setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
                cText.setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
            }
        });

        return container;
    }

    private createCharacterCard(x: number, y: number, width: number, char: CharacterData, index: number): void {
        const container = this.add.container(x, y);
        this.characterContainers[index] = container;

        // Card Background (Unstable Border)
        const bg = this.add.rectangle(0, 0, width, 400, 0x000000);
        bg.setStrokeStyle(2, 0x444444);

        // Unstable border effect
        this.tweens.add({
            targets: bg,
            alpha: 0.8,
            duration: 100,
            yoyo: true,
            repeat: -1,
            onRepeat: () => {
                bg.setStrokeStyle(Phaser.Math.Between(1, 3), 0x444444, Phaser.Math.FloatBetween(0.5, 1));
            }
        });

        container.add(bg);

        // Character Concept Art (Animated Sprite)
        const animKey = `${char.id}-concept`;
        const sprite = this.add.sprite(0, -50, `${char.id}-concept-1`);

        // Scale to fit width, maintaining aspect ratio
        const scale = (width - 20) / sprite.width;
        sprite.setScale(scale);

        // Limit height to avoid overlapping text
        if (sprite.displayHeight > 200) {
            sprite.setDisplaySize(sprite.displayWidth * (200 / sprite.displayHeight), 200);
        }

        // Store sprite reference
        this.characterSprites[index] = sprite;
        container.add(sprite);

        // Name (Glitch Effect)
        const nameContainer = this.createGlitchText(0, 80, char.name, {
            fontFamily: '"Rubik Glitch", cursive',
            fontSize: '32px',
            color: '#ffffff'
        });
        container.add(nameContainer);

        // Title (Normal Text - No Glitch)
        const titleText = this.add.text(0, 115, char.title.toUpperCase(), {
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '10px',
            color: '#888888',
            letterSpacing: 1
        });
        titleText.setOrigin(0.5);
        container.add(titleText);

        // Description
        // Description (Start empty for typewriter effect)
        const descText = this.add.text(0, 150, '', {
            fontFamily: '"Roboto", sans-serif',
            fontSize: '14px',
            color: '#aaaaaa',
            align: 'center',
            wordWrap: { width: width - 40 }
        });
        descText.setOrigin(0.5);
        descText.setName('description'); // Name it to find it later
        container.add(descText);

        // Interactive with hover animations
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
            if (this.selectedIndex === index) {
                this.confirmSelection();
            } else {
                this.selectCharacter(index);
            }
        });

        bg.on('pointerover', () => {
            // Play animation on hover
            this.playConceptAnimation(index);
        });

        bg.on('pointerout', () => {
            // Stop animation on hover out only if not selected
            if (this.selectedIndex !== index) {
                this.stopConceptAnimation(index);
            }
        });
    }

    private selectCharacter(index: number): void {
        if (index < -1 || index >= this.characters.length) return;

        this.selectedIndex = index;

        // Animate selection
        this.characterContainers.forEach((container, i) => {
            const isSelected = i === index;

            this.tweens.add({
                targets: container,
                scaleX: isSelected ? 1.1 : 0.9,
                scaleY: isSelected ? 1.1 : 0.9,
                alpha: isSelected ? 1 : 0.5,
                y: isSelected ? this.cameras.main.height / 2 - 20 : this.cameras.main.height / 2,
                duration: 300,
                ease: 'Back.easeOut'
            });

            // Highlight border
            const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
            bg.setStrokeStyle(isSelected ? 4 : 2, isSelected ? 0xffffff : 0x444444);

            // Animation and Text control
            if (isSelected) {
                // Play animation for selected character
                this.playConceptAnimation(i);
                // Start typewriter effect
                this.typewriteText(container, this.characters[i].description);
            } else {
                // Stop animation for deselected characters
                this.stopConceptAnimation(i);
                // Clear text
                const descText = container.getByName('description') as Phaser.GameObjects.Text;
                if (descText) descText.setText('');
            }
        });
    }

    private updateSelector(): void {
        // Visual update handled in selectCharacter for smoother tweening
    }

    private typewriteText(container: Phaser.GameObjects.Container, fullText: string): void {
        const label = container.getByName('description') as Phaser.GameObjects.Text;
        if (!label) return;

        // Reset
        label.setText('');
        if (this.typewriterEvent) {
            this.typewriterEvent.remove(false);
        }

        let i = 0;
        this.typewriterEvent = this.time.addEvent({
            delay: 30, // 30ms per character
            callback: () => {
                label.text += fullText[i];
                i++;
            },
            repeat: fullText.length - 1
        });
    }

    private playConceptAnimation(index: number): void {
        const sprite = this.characterSprites[index];
        const char = this.characters[index];
        if (sprite) {
            sprite.play(`${char.id}-concept`);
        }
    }

    private stopConceptAnimation(index: number): void {
        const sprite = this.characterSprites[index];
        if (sprite) {
            sprite.stop();
            sprite.setFrame(0); // Back to first frame
        }
    }

    private confirmSelection(): void {
        const selectedChar = this.characters[this.selectedIndex];

        // Flash effect
        this.cameras.main.flash(500, 255, 255, 255);

        // Sound effect (if available)
        // this.sound.play('select');

        this.time.delayedCall(500, () => {
            this.scene.start('GameScene', { character: selectedChar });
        });
    }
}
