import * as Phaser from 'phaser';

export class LabGenerator {
    private scene: Phaser.Scene;
    private tileSize: number = 64;
    private width: number; // in tiles
    private height: number; // in tiles
    private mapData: number[][] = []; // 0 = floor, 1 = wall
    private walls!: Phaser.Physics.Arcade.StaticGroup;
    private floorGraphics!: Phaser.GameObjects.Graphics;
    private wallGraphics!: Phaser.GameObjects.Graphics;
    private detailGraphics!: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, width: number, height: number) {
        this.scene = scene;
        this.width = Math.floor(width / this.tileSize);
        this.height = Math.floor(height / this.tileSize);
    }

    public generate(): void {
        // Initialize with walls
        for (let y = 0; y < this.height; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.mapData[y][x] = 1;
            }
        }

        // Create rooms
        const rooms: Phaser.Geom.Rectangle[] = [];
        const maxRooms = 20;
        const minRoomSize = 5;
        const maxRoomSize = 12;

        for (let i = 0; i < maxRooms; i++) {
            const w = Phaser.Math.Between(minRoomSize, maxRoomSize);
            const h = Phaser.Math.Between(minRoomSize, maxRoomSize);
            const x = Phaser.Math.Between(2, this.width - w - 2);
            const y = Phaser.Math.Between(2, this.height - h - 2);

            const newRoom = new Phaser.Geom.Rectangle(x, y, w, h);

            // Check overlap
            let failed = false;
            for (const otherRoom of rooms) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(newRoom, otherRoom)) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.createRoom(newRoom);

                if (rooms.length > 0) {
                    const prevRoom = rooms[rooms.length - 1];
                    this.createCorridor(prevRoom.centerX, prevRoom.centerY, newRoom.centerX, newRoom.centerY);
                }

                rooms.push(newRoom);
            }
        }

        // Create visual representation
        this.draw();
        this.createColliders();
    }

    private createRoom(room: Phaser.Geom.Rectangle): void {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                this.mapData[y][x] = 0;
            }
        }
    }

    private createCorridor(x1: number, y1: number, x2: number, y2: number): void {
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);
        x2 = Math.floor(x2);
        y2 = Math.floor(y2);

        // Horizontal then Vertical
        if (Math.random() < 0.5) {
            this.createHorizontalTunnel(x1, x2, y1);
            this.createVerticalTunnel(y1, y2, x2);
        } else {
            // Vertical then Horizontal
            this.createVerticalTunnel(y1, y2, x1);
            this.createHorizontalTunnel(x1, x2, y2);
        }
    }

    private createHorizontalTunnel(x1: number, x2: number, y: number): void {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            this.mapData[y][x] = 0;
            this.mapData[y + 1][x] = 0; // Wider corridors
        }
    }

    private createVerticalTunnel(y1: number, y2: number, x: number): void {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            this.mapData[y][x] = 0;
            this.mapData[y][x + 1] = 0; // Wider corridors
        }
    }

    private draw(): void {
        this.floorGraphics = this.scene.add.graphics();
        this.wallGraphics = this.scene.add.graphics();
        this.detailGraphics = this.scene.add.graphics();

        // Set depths
        this.floorGraphics.setDepth(-2);
        this.detailGraphics.setDepth(-1);
        this.wallGraphics.setDepth(10); // Walls above floor

        // Draw Floor
        this.floorGraphics.fillStyle(0x111111); // Very dark grey

        // Draw Walls
        this.wallGraphics.fillStyle(0x000000);
        this.wallGraphics.lineStyle(2, 0x444444); // High contrast outline

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const posX = x * this.tileSize;
                const posY = y * this.tileSize;

                if (this.mapData[y][x] === 1) {
                    // Wall
                    this.wallGraphics.fillRect(posX, posY, this.tileSize, this.tileSize);
                    this.wallGraphics.strokeRect(posX, posY, this.tileSize, this.tileSize);
                } else {
                    // Floor
                    this.floorGraphics.fillRect(posX, posY, this.tileSize, this.tileSize);

                    // Random details (Cosmic Horror Vibe)
                    if (Math.random() > 0.95) {
                        this.drawCosmicDetail(posX, posY);
                    }
                }
            }
        }
    }

    private drawCosmicDetail(x: number, y: number): void {
        const type = Phaser.Math.Between(0, 2);

        if (type === 0) {
            // Strange rune
            this.detailGraphics.lineStyle(2, 0x330000, 0.5);
            this.detailGraphics.strokeCircle(x + this.tileSize / 2, y + this.tileSize / 2, 10);
        } else if (type === 1) {
            // Blood stain / Dark matter
            this.detailGraphics.fillStyle(0x050005, 0.8);
            this.detailGraphics.fillCircle(x + Phaser.Math.Between(10, 50), y + Phaser.Math.Between(10, 50), Phaser.Math.Between(5, 15));
        } else {
            // Cracks
            this.detailGraphics.lineStyle(1, 0x222222);
            this.detailGraphics.beginPath();
            this.detailGraphics.moveTo(x + 10, y + 10);
            this.detailGraphics.lineTo(x + 30, y + 30);
            this.detailGraphics.lineTo(x + 50, y + 20);
            this.detailGraphics.strokePath();
        }
    }

    private createColliders(): void {
        this.walls = this.scene.physics.add.staticGroup();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.mapData[y][x] === 1) {
                    // Create an invisible physics body for the wall
                    // We center it because Arcade Physics bodies are centered by default when created this way? 
                    // Actually create(x, y) places top-left usually for static groups if using sprites, 
                    // but for pure bodies we might need to be careful.
                    // Let's use a transparent rectangle sprite for simplicity and reliability
                    const wall = this.scene.add.rectangle(
                        x * this.tileSize + this.tileSize / 2,
                        y * this.tileSize + this.tileSize / 2,
                        this.tileSize,
                        this.tileSize
                    );
                    this.walls.add(wall);
                }
            }
        }
    }

    public getWalls(): Phaser.Physics.Arcade.StaticGroup {
        return this.walls;
    }

    public getRandomFloorPosition(): { x: number, y: number } {
        let x = 0;
        let y = 0;
        let attempts = 0;

        while (attempts < 100) {
            const tileX = Phaser.Math.Between(1, this.width - 2);
            const tileY = Phaser.Math.Between(1, this.height - 2);

            if (this.mapData[tileY][tileX] === 0) {
                x = tileX * this.tileSize + this.tileSize / 2;
                y = tileY * this.tileSize + this.tileSize / 2;
                return { x, y };
            }
            attempts++;
        }

        // Fallback
        return { x: this.width / 2 * this.tileSize, y: this.height / 2 * this.tileSize };
    }

    public isValidPosition(x: number, y: number): boolean {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) return false;
        return this.mapData[tileY][tileX] === 0;
    }
}
