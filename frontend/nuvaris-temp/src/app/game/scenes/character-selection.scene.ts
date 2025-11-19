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
            name: 'LARS',
            title: 'The Survivor',
            description: 'Balanced stats. A veteran of the cosmic wars.',
            stats: { health: 4, speed: 3, damage: 3 },
            color: 0xcccccc
        },
        {
            id: 'arcadio',
            name: 'ARCADIO',
            title: 'The Mystic',
            description: 'High damage, low health. Wields forbidden arts.',
            stats: { health: 2, speed: 3, damage: 5 },
            color: 0x9945ff // Purple hint
        },
        {
            id: 'yurany',
            name: 'YURANY',
            title: 'The Phantom',
            description: 'Incredible speed. Strikes from the shadows.',
            stats: { health: 3, speed: 5, damage: 2 },
            color: 0x00ffff // Cyan hint
        }
    ];

    private selectedIndex = 1; // Start with middle character
    private characterContainers: Phaser.GameObjects.Container[] = [];
    private selector!: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: 'CharacterSelectionScene' });
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // Background
        this.cameras.main.setBackgroundColor('#050505');

        // Title
        const title = this.add.text(width / 2, 80, 'CHOOSE YOUR VESSEL', {
            fontFamily: '"Rubik Glitch", cursive',
            fontSize: '48px',
            color: '#ffffff',
            letterSpacing: 2
        });
        title.setOrigin(0.5);

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
        this.selectCharacter(1);
    }

    private createCharacterCard(x: number, y: number, width: number, char: CharacterData, index: number): void {
        const container = this.add.container(x, y);
        this.characterContainers[index] = container;

        // Card Background (Wireframe style)
        const bg = this.add.rectangle(0, 0, width, 400, 0x000000);
        bg.setStrokeStyle(2, 0x444444);
        container.add(bg);

        // Character Silhouette (Placeholder)
        // We'll use a simple shape for now, but style it "gothic"
        const silhouette = this.add.graphics();
        silhouette.fillStyle(0xffffff, 0.1);

        if (char.id === 'lars') {
            // Boxy, sturdy
            silhouette.fillRect(-40, -100, 80, 120);
        } else if (char.id === 'arcadio') {
            // Tall, thin
            silhouette.fillTriangle(0, -120, -40, 20, 40, 20);
        } else {
            // Small, agile
            silhouette.fillCircle(0, -40, 50);
        }
        container.add(silhouette);

        // Name
        const nameText = this.add.text(0, 40, char.name, {
            fontFamily: '"Rubik Glitch", cursive',
            fontSize: '32px',
            color: '#ffffff'
        });
        nameText.setOrigin(0.5);
        container.add(nameText);

        // Title
        const titleText = this.add.text(0, 75, char.title.toUpperCase(), {
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '10px',
            color: '#888888',
            letterSpacing: 1
        });
        titleText.setOrigin(0.5);
        container.add(titleText);

        // Stats Bars
        this.createStatBar(container, -width / 2 + 40, 130, 'VIT', char.stats.health);
        this.createStatBar(container, -width / 2 + 40, 160, 'SPD', char.stats.speed);
        this.createStatBar(container, -width / 2 + 40, 190, 'DMG', char.stats.damage);

        // Interactive
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
            if (this.selectedIndex === index) {
                this.confirmSelection();
            } else {
                this.selectCharacter(index);
            }
        });
    }

    private createStatBar(container: Phaser.GameObjects.Container, x: number, y: number, label: string, value: number): void {
        const labelText = this.add.text(x, y, label, {
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '10px',
            color: '#666'
        });
        labelText.setOrigin(0, 0.5);
        container.add(labelText);

        // Bar dots
        for (let i = 0; i < 5; i++) {
            const dot = this.add.rectangle(x + 40 + (i * 25), y, 20, 8, i < value ? 0xffffff : 0x222222);
            container.add(dot);
        }
    }

    private selectCharacter(index: number): void {
        if (index < 0 || index >= this.characters.length) return;

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
        });
    }

    private updateSelector(): void {
        // Visual update handled in selectCharacter for smoother tweening
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
