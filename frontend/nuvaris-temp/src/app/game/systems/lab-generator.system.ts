import * as Phaser from 'phaser';

export class LabGenerator {
    private scene: Phaser.Scene;
    private tileSize: number = 128;
    private width: number; // in tiles
    private height: number; // in tiles
    private mapData: number[][] = []; // 0 = floor, 1 = wall
    private walls!: Phaser.Physics.Arcade.StaticGroup;
    private floorGraphics!: Phaser.GameObjects.Graphics;
    private wallGraphics!: Phaser.GameObjects.Graphics;
    private detailGraphics!: Phaser.GameObjects.Graphics;
    private wallImages: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene, width: number, height: number) {
        this.scene = scene;
        this.width = Math.floor(width / this.tileSize);
        this.height = Math.floor(height / this.tileSize);
    }

    public generate(): void {
        // Initialize with FLOOR (0) everywhere - Open Arena
        for (let y = 0; y < this.height; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.mapData[y][x] = 0; // All floor
            }
        }

        // No rooms, no corridors - just open space

        // Create visual representation
        this.draw();
        this.createColliders();
    }

    private draw(): void {
        this.floorGraphics = this.scene.add.graphics();
        this.wallGraphics = this.scene.add.graphics();
        this.detailGraphics = this.scene.add.graphics();

        // Set depths
        this.floorGraphics.setDepth(-2);
        this.detailGraphics.setDepth(-1);
        this.wallGraphics.setDepth(10);

        // Draw Floor (Dark Concrete Vibe)
        this.floorGraphics.fillStyle(0x1a1a1a); // Dark grey concrete
        this.floorGraphics.lineStyle(1, 0x333333, 0.3); // Subtle grid lines

        // Clear previous images (just in case)
        this.wallImages.forEach(img => img.destroy());
        this.wallImages = [];

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const posX = x * this.tileSize;
                const posY = y * this.tileSize;

                // Always draw floor
                this.floorGraphics.fillRect(posX, posY, this.tileSize, this.tileSize);
                this.floorGraphics.strokeRect(posX, posY, this.tileSize, this.tileSize);

                // Random floor details - REMOVED
            }
        }
    }

    private createColliders(): void {
        this.walls = this.scene.physics.add.staticGroup();
        // No walls to add colliders to
    }

    public getWalls(): Phaser.Physics.Arcade.StaticGroup {
        return this.walls;
    }

    public getRandomFloorPosition(): { x: number, y: number } {
        // Anywhere is valid now
        const tileX = Phaser.Math.Between(1, this.width - 2);
        const tileY = Phaser.Math.Between(1, this.height - 2);

        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2
        };
    }

    public isValidPosition(x: number, y: number): boolean {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) return false;
        return true; // All positions are valid (floor)
    }
}
