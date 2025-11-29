import * as Phaser from 'phaser';

export class LabGenerator {
    private scene: Phaser.Scene;
    private map!: Phaser.Tilemaps.Tilemap;
    private floorLayer!: Phaser.Tilemaps.TilemapLayer;
    private wallLayer!: Phaser.Tilemaps.TilemapLayer;
    private tileWidth: number = 64;
    private tileHeight: number = 32;
    private width: number; // in tiles
    private height: number; // in tiles
    private walls!: Phaser.Physics.Arcade.StaticGroup;

    constructor(scene: Phaser.Scene, width: number, height: number) {
        this.scene = scene;
        this.width = Math.floor(width / this.tileWidth);
        this.height = Math.floor(height / this.tileWidth);
    }

    public generate(): void {
        // Create Isometric Tilemap
        this.map = this.scene.make.tilemap({
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            width: this.width,
            height: this.height,
            orientation: Phaser.Tilemaps.Orientation.ISOMETRIC
        } as Phaser.Types.Tilemaps.TilemapConfig);

        // Add Tilesets
        const floorTileset = this.map.addTilesetImage('iso-floor', 'iso-floor', 64, 32);
        const wallTileset = this.map.addTilesetImage('iso-wall', 'iso-wall', 64, 64);

        if (!floorTileset || !wallTileset) {
            console.error('Failed to load tilesets');
            return;
        }

        // Create Layers
        this.floorLayer = this.map.createBlankLayer('Floor', floorTileset)!;
        this.wallLayer = this.map.createBlankLayer('Walls', wallTileset)!;

        // Fill Floor Layer (Always visible underneath)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.floorLayer.putTileAt(0, x, y);
            }
        }

        // Fill Wall Layer
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.wallLayer.putTileAt(0, x, y);
            }
        }

        // Generate Rooms
        const rooms: Phaser.Geom.Rectangle[] = [];
        const maxRooms = 20;
        const minSize = 4;
        const maxSize = 10;

        for (let i = 0; i < maxRooms; i++) {
            const w = Phaser.Math.Between(minSize, maxSize);
            const h = Phaser.Math.Between(minSize, maxSize);
            const x = Phaser.Math.Between(1, this.width - w - 1);
            const y = Phaser.Math.Between(1, this.height - h - 1);

            const newRoom = new Phaser.Geom.Rectangle(x, y, w, h);

            // Check overlap
            let overlap = false;
            for (const room of rooms) {
                // Add padding to avoid rooms touching directly without corridors
                if (Phaser.Geom.Intersects.RectangleToRectangle(
                    new Phaser.Geom.Rectangle(x - 1, y - 1, w + 2, h + 2),
                    room)) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                this.createRoom(newRoom);

                if (rooms.length > 0) {
                    // Connect to previous room
                    const prevRoom = rooms[rooms.length - 1];
                    this.createCorridor(prevRoom, newRoom);
                }

                rooms.push(newRoom);
            }
        }

        // Set Depth
        this.floorLayer.setDepth(-1000);
        this.wallLayer.setDepth(0);
    }

    private createRoom(room: Phaser.Geom.Rectangle): void {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                this.wallLayer.removeTileAt(x, y);
            }
        }
    }

    private createCorridor(roomA: Phaser.Geom.Rectangle, roomB: Phaser.Geom.Rectangle): void {
        const centerA = { x: Math.floor(roomA.centerX), y: Math.floor(roomA.centerY) };
        const centerB = { x: Math.floor(roomB.centerX), y: Math.floor(roomB.centerY) };

        // Horizontal then Vertical
        if (Math.random() < 0.5) {
            this.createHorizontalTunnel(centerA.x, centerB.x, centerA.y);
            this.createVerticalTunnel(centerA.y, centerB.y, centerB.x);
        } else {
            // Vertical then Horizontal
            this.createVerticalTunnel(centerA.y, centerB.y, centerA.x);
            this.createHorizontalTunnel(centerA.x, centerB.x, centerB.y);
        }
    }

    private createHorizontalTunnel(x1: number, x2: number, y: number): void {
        const start = Math.min(x1, x2);
        const end = Math.max(x1, x2);
        for (let x = start; x <= end; x++) {
            this.wallLayer.removeTileAt(x, y);
            this.wallLayer.removeTileAt(x, y + 1); // Wider corridors (2 tiles)
        }
    }

    private createVerticalTunnel(y1: number, y2: number, x: number): void {
        const start = Math.min(y1, y2);
        const end = Math.max(y1, y2);
        for (let y = start; y <= end; y++) {
            this.wallLayer.removeTileAt(x, y);
            this.wallLayer.removeTileAt(x + 1, y); // Wider corridors (2 tiles)
        }
    }

    public getWalls(): Phaser.Physics.Arcade.StaticGroup {
        if (!this.walls) {
            this.walls = this.scene.physics.add.staticGroup();
        }
        return this.walls;
    }

    public getRandomFloorPosition(): { x: number, y: number } {
        let x = 0, y = 0;
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            const tileX = Phaser.Math.Between(1, this.width - 2);
            const tileY = Phaser.Math.Between(1, this.height - 2);

            if (!this.wallLayer.hasTileAt(tileX, tileY)) {
                // Convert Tile to World
                const point = this.map.tileToWorldXY(tileX, tileY);
                if (point) {
                    x = point.x;
                    y = point.y;
                    valid = true;
                }
            }
            attempts++;
        }
        return { x, y };
    }

    public isValidPosition(x: number, y: number): boolean {
        // Convert World to Tile
        const tile = this.map.worldToTileXY(x, y);
        if (!tile) return false;

        if (tile.x < 0 || tile.x >= this.width || tile.y < 0 || tile.y >= this.height) return false;

        // Check for wall
        if (this.wallLayer.hasTileAt(tile.x, tile.y)) return false;

        return true;
    }

    public isValidArea(x: number, y: number, radius: number): boolean {
        // Check center
        if (!this.isValidPosition(x, y)) return false;

        // Check 4 points around the radius
        if (!this.isValidPosition(x + radius, y)) return false;
        if (!this.isValidPosition(x - radius, y)) return false;
        if (!this.isValidPosition(x, y + radius)) return false;
        if (!this.isValidPosition(x, y - radius)) return false;

        return true;
    }

    /**
     * IMPROVED: Validates if a physics body can be at a position
     * Checks multiple points around the perimeter for more accurate collision
     * @param x - Center X of the body
     * @param y - Center Y of the body
     * @param bodyRadius - Radius of the collision body
     * @param checkPoints - Number of points to check (4, 8, or 12 recommended)
     */
    public isValidPositionWithBody(
        x: number,
        y: number,
        bodyRadius: number,
        checkPoints: number = 8
    ): boolean {
        // First check center
        if (!this.isValidPosition(x, y)) return false;

        // Check points around the perimeter in a circle
        for (let i = 0; i < checkPoints; i++) {
            const angle = (Math.PI * 2 * i) / checkPoints;
            const checkX = x + Math.cos(angle) * bodyRadius;
            const checkY = y + Math.sin(angle) * bodyRadius;

            if (!this.isValidPosition(checkX, checkY)) {
                return false;
            }
        }

        return true;
    }

    public getTileAtWorldXY(x: number, y: number): Phaser.Tilemaps.Tile | null {
        return this.map.getTileAtWorldXY(x, y, true, this.scene.cameras.main, 'Walls');
    }
}
