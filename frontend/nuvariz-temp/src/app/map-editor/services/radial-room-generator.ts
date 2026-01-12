/**
 * Radial Room Generator (RRP)
 *
 * Generates maps following the same pattern as legacy.json:
 * 1. Hub central
 * 2. Cardinal rooms (N, S, E, W)
 * 3. Corner rooms (NW, NE, SW, SE)
 * 4. Straight corridors connecting adjacent rooms
 * 5. Walls with gaps for doors
 * 6. Doors at corridor-room intersections
 *
 * Based on mathematical analysis of legacy.json
 */

// ============================================
// INTERFACES
// ============================================

export interface RRPConfig {
    seed: string;
    hubSize: number;           // Default: 30
    cardinalSize: number;      // Default: 25
    cornerSize: number;        // Default: 20
    spacing: number;           // Distance between rooms (default: 20)
    corridorWidth: number;     // Default: 5
    wallThickness: number;     // Default: 2
    addCornerRooms: boolean;   // Default: true
    generateDoors: boolean;    // Default: true
}

export interface RRPRoom {
    id: string;
    x: number;          // Top-left corner X
    z: number;          // Top-left corner Z
    width: number;
    depth: number;
    centerX: number;
    centerZ: number;
    connected: boolean;
    type: 'hub' | 'cardinal' | 'corner';
    direction?: 'north' | 'south' | 'east' | 'west' | 'nw' | 'ne' | 'sw' | 'se';
}

export interface RRPCorridor {
    id: string;
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    width: number;
    horizontal: boolean;
    fromRoom: string;
    toRoom: string;
}

export interface RRPWall {
    id: string;
    x: number;          // Center X
    z: number;          // Center Z
    width: number;
    depth: number;
    isPerimeter: boolean;
}

export interface RRPDoor {
    id: string;
    x: number;
    z: number;
    width: number;
    height: number;
    depth: number;
    rotation: number;
    type: 'small' | 'large' | 'garage';
    isOpen: boolean;
}

export interface RRPGeneratedData {
    name: string;
    version: string;
    format: string;
    rooms: RRPRoom[];
    corridors: RRPCorridor[];
    walls: RRPWall[];
    doors: RRPDoor[];
    portals: any[];
    playerSpawn: { x: number; z: number };
    config: RRPConfig;
    mapBounds: { width: number; depth: number };
}

// ============================================
// SEEDED RANDOM (for reproducibility)
// ============================================

class SeededRandom {
    private seed: number;

    constructor(seed: string) {
        this.seed = this.hashString(seed);
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) || 1;
    }

    next(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min;
    }
}

// ============================================
// RADIAL ROOM GENERATOR
// ============================================

export class RadialRoomGenerator {
    private config: RRPConfig;
    private random: SeededRandom;
    private rooms: RRPRoom[] = [];
    private corridors: RRPCorridor[] = [];
    private walls: RRPWall[] = [];
    private doors: RRPDoor[] = [];

    private wallIdCounter = 0;
    private doorIdCounter = 0;
    private corridorIdCounter = 0;

    constructor(config?: Partial<RRPConfig>) {
        this.config = {
            seed: this.generateRandomSeed(),
            hubSize: 30,
            cardinalSize: 25,
            cornerSize: 20,
            spacing: 20,
            corridorWidth: 5,
            wallThickness: 2,
            addCornerRooms: true,
            generateDoors: true,
            ...config
        };
        this.random = new SeededRandom(this.config.seed);
    }

    /**
     * Generate a complete map following the legacy pattern
     */
    generate(): RRPGeneratedData {
        this.reset();

        // PASO 1: Create hub central
        const hub = this.createHub();
        this.rooms.push(hub);

        // PASO 2: Create cardinal rooms
        const cardinals = this.createCardinalRooms(hub);
        this.rooms.push(...cardinals);

        // PASO 3: Create corner rooms (if enabled)
        if (this.config.addCornerRooms) {
            const corners = this.createCornerRooms(cardinals);
            this.rooms.push(...corners);
        }

        // PASO 4: Create corridors between adjacent rooms
        this.createCorridors();

        // PASO 5: Create walls with gaps for doors
        this.createWallsWithGaps();

        // PASO 6: Create perimeter walls
        this.createPerimeterWalls();

        // PASO 7: Create doors at intersections
        if (this.config.generateDoors) {
            this.createDoors();
        }

        // Calculate map bounds
        const mapBounds = this.calculateMapBounds();

        console.log(`[RadialRoomGenerator] Generated: ${this.rooms.length} rooms, ${this.corridors.length} corridors, ${this.walls.length} walls, ${this.doors.length} doors`);

        return {
            name: `Radial Map - ${this.config.seed}`,
            version: '1.0',
            format: 'bsp',
            rooms: this.rooms,
            corridors: this.corridors,
            walls: this.walls,
            doors: this.doors,
            portals: [],
            playerSpawn: { x: 0, z: 0 },
            config: this.config,
            mapBounds
        };
    }

    /**
     * Reset generator state
     */
    private reset(): void {
        this.rooms = [];
        this.corridors = [];
        this.walls = [];
        this.doors = [];
        this.wallIdCounter = 0;
        this.doorIdCounter = 0;
        this.corridorIdCounter = 0;
        this.random = new SeededRandom(this.config.seed);
    }

    // ============================================
    // ROOM CREATION
    // ============================================

    /**
     * Create the central hub room
     * Based on legacy: hub at (0,0), size 30x30
     */
    private createHub(): RRPRoom {
        const size = this.config.hubSize;
        return {
            id: 'hub',
            x: -size / 2,
            z: -size / 2,
            width: size,
            depth: size,
            centerX: 0,
            centerZ: 0,
            connected: true,
            type: 'hub'
        };
    }

    /**
     * Create the 4 cardinal rooms (N, S, E, W)
     *
     * Mathematical formula from legacy:
     * cardinal_distance = hubSize/2 + spacing + cardinalSize/2
     *
     * WEST:  centerX = -cardinal_distance, centerZ = 0
     * EAST:  centerX = +cardinal_distance, centerZ = 0
     * NORTH: centerX = 0, centerZ = +cardinal_distance
     * SOUTH: centerX = 0, centerZ = -cardinal_distance
     */
    private createCardinalRooms(hub: RRPRoom): RRPRoom[] {
        const size = this.config.cardinalSize;
        const distance = this.config.hubSize / 2 + this.config.spacing + size / 2;

        const cardinals: RRPRoom[] = [
            {
                id: 'west',
                x: -distance - size / 2,
                z: -size / 2,
                width: size,
                depth: size,
                centerX: -distance,
                centerZ: 0,
                connected: true,
                type: 'cardinal',
                direction: 'west'
            },
            {
                id: 'east',
                x: distance - size / 2,
                z: -size / 2,
                width: size,
                depth: size,
                centerX: distance,
                centerZ: 0,
                connected: true,
                type: 'cardinal',
                direction: 'east'
            },
            {
                id: 'north',
                x: -size / 2,
                z: distance - size / 2,
                width: size,
                depth: size,
                centerX: 0,
                centerZ: distance,
                connected: true,
                type: 'cardinal',
                direction: 'north'
            },
            {
                id: 'south',
                x: -size / 2,
                z: -distance - size / 2,
                width: size,
                depth: size,
                centerX: 0,
                centerZ: -distance,
                connected: true,
                type: 'cardinal',
                direction: 'south'
            }
        ];

        return cardinals;
    }

    /**
     * Create the 4 corner rooms (NW, NE, SW, SE)
     *
     * Mathematical formula from legacy:
     * Corners align with the outer edges of adjacent cardinals
     *
     * NW: x_min = WEST.x_min,  z_min = NORTH.z_min
     * NE: x_max = EAST.x_max,  z_min = NORTH.z_min
     * SW: x_min = WEST.x_min,  z_max = SOUTH.z_max
     * SE: x_max = EAST.x_max,  z_max = SOUTH.z_max
     */
    private createCornerRooms(cardinals: RRPRoom[]): RRPRoom[] {
        const size = this.config.cornerSize;

        const west = cardinals.find(r => r.direction === 'west')!;
        const east = cardinals.find(r => r.direction === 'east')!;
        const north = cardinals.find(r => r.direction === 'north')!;
        const south = cardinals.find(r => r.direction === 'south')!;

        const corners: RRPRoom[] = [
            {
                id: 'nw',
                x: west.x,                          // Align with WEST left edge
                z: north.z,                         // Align with NORTH bottom edge
                width: size,
                depth: size,
                centerX: west.x + size / 2,
                centerZ: north.z + size / 2,
                connected: true,
                type: 'corner',
                direction: 'nw'
            },
            {
                id: 'ne',
                x: east.x + east.width - size,      // Align with EAST right edge
                z: north.z,                         // Align with NORTH bottom edge
                width: size,
                depth: size,
                centerX: east.x + east.width - size / 2,
                centerZ: north.z + size / 2,
                connected: true,
                type: 'corner',
                direction: 'ne'
            },
            {
                id: 'sw',
                x: west.x,                          // Align with WEST left edge
                z: south.z + south.depth - size,    // Align with SOUTH top edge
                width: size,
                depth: size,
                centerX: west.x + size / 2,
                centerZ: south.z + south.depth - size / 2,
                connected: true,
                type: 'corner',
                direction: 'sw'
            },
            {
                id: 'se',
                x: east.x + east.width - size,      // Align with EAST right edge
                z: south.z + south.depth - size,    // Align with SOUTH top edge
                width: size,
                depth: size,
                centerX: east.x + east.width - size / 2,
                centerZ: south.z + south.depth - size / 2,
                connected: true,
                type: 'corner',
                direction: 'se'
            }
        ];

        return corners;
    }

    // ============================================
    // CORRIDOR CREATION
    // ============================================

    /**
     * Create corridors between adjacent rooms
     *
     * Connections:
     * - Hub ↔ Each cardinal (4 corridors)
     * - WEST ↔ NW, WEST ↔ SW
     * - EAST ↔ NE, EAST ↔ SE
     */
    private createCorridors(): void {
        const hub = this.rooms.find(r => r.id === 'hub')!;
        const west = this.rooms.find(r => r.id === 'west');
        const east = this.rooms.find(r => r.id === 'east');
        const north = this.rooms.find(r => r.id === 'north');
        const south = this.rooms.find(r => r.id === 'south');
        const nw = this.rooms.find(r => r.id === 'nw');
        const ne = this.rooms.find(r => r.id === 'ne');
        const sw = this.rooms.find(r => r.id === 'sw');
        const se = this.rooms.find(r => r.id === 'se');

        // Hub ↔ Cardinals
        if (west) this.createHorizontalCorridor(hub, west, 'c_hub_w');
        if (east) this.createHorizontalCorridor(hub, east, 'c_hub_e');
        if (north) this.createVerticalCorridor(hub, north, 'c_hub_n');
        if (south) this.createVerticalCorridor(south, hub, 'c_hub_s');

        // Cardinals ↔ Corners
        if (west && nw) this.createVerticalCorridorBetweenRooms(west, nw, 'c_w_nw');
        if (west && sw) this.createVerticalCorridorBetweenRooms(sw, west, 'c_w_sw');
        if (east && ne) this.createVerticalCorridorBetweenRooms(east, ne, 'c_e_ne');
        if (east && se) this.createVerticalCorridorBetweenRooms(se, east, 'c_e_se');
    }

    /**
     * Create horizontal corridor between two rooms
     * The corridor goes from the right edge of leftRoom to the left edge of rightRoom
     */
    private createHorizontalCorridor(leftRoom: RRPRoom, rightRoom: RRPRoom, id: string): void {
        // Determine which is left and which is right
        const [left, right] = leftRoom.centerX < rightRoom.centerX
            ? [leftRoom, rightRoom]
            : [rightRoom, leftRoom];

        const corridor: RRPCorridor = {
            id,
            startX: left.x + left.width,    // Right edge of left room
            startZ: 0,                       // Centered at z=0 (both rooms are at centerZ=0)
            endX: right.x,                   // Left edge of right room
            endZ: 0,
            width: this.config.corridorWidth,
            horizontal: true,
            fromRoom: left.id,
            toRoom: right.id
        };

        this.corridors.push(corridor);
    }

    /**
     * Create vertical corridor between two rooms (hub ↔ north/south)
     */
    private createVerticalCorridor(bottomRoom: RRPRoom, topRoom: RRPRoom, id: string): void {
        // Determine which is bottom and which is top
        const [bottom, top] = bottomRoom.centerZ < topRoom.centerZ
            ? [bottomRoom, topRoom]
            : [topRoom, bottomRoom];

        const corridor: RRPCorridor = {
            id,
            startX: 0,                       // Centered at x=0
            startZ: bottom.z + bottom.depth, // Top edge of bottom room
            endX: 0,
            endZ: top.z,                     // Bottom edge of top room
            width: this.config.corridorWidth,
            horizontal: false,
            fromRoom: bottom.id,
            toRoom: top.id
        };

        this.corridors.push(corridor);
    }

    /**
     * Create vertical corridor between cardinal and corner rooms
     * The X position is the center of the overlap between the two rooms
     */
    private createVerticalCorridorBetweenRooms(bottomRoom: RRPRoom, topRoom: RRPRoom, id: string): void {
        // Determine which is bottom and which is top
        const [bottom, top] = bottomRoom.centerZ < topRoom.centerZ
            ? [bottomRoom, topRoom]
            : [topRoom, bottomRoom];

        // Calculate X overlap
        const overlapLeft = Math.max(bottom.x, top.x);
        const overlapRight = Math.min(bottom.x + bottom.width, top.x + top.width);
        const corridorX = (overlapLeft + overlapRight) / 2;

        const corridor: RRPCorridor = {
            id,
            startX: corridorX,
            startZ: bottom.z + bottom.depth, // Top edge of bottom room
            endX: corridorX,
            endZ: top.z,                     // Bottom edge of top room
            width: this.config.corridorWidth,
            horizontal: false,
            fromRoom: bottom.id,
            toRoom: top.id
        };

        this.corridors.push(corridor);
    }

    // ============================================
    // WALL CREATION
    // ============================================

    /**
     * Create walls for all rooms with gaps for corridors
     */
    private createWallsWithGaps(): void {
        for (const room of this.rooms) {
            this.createRoomWalls(room);
        }

        // Create corridor walls
        for (const corridor of this.corridors) {
            this.createCorridorWalls(corridor);
        }
    }

    /**
     * Create walls for a single room with gaps where corridors connect
     */
    private createRoomWalls(room: RRPRoom): void {
        const t = this.config.wallThickness;
        const cw = this.config.corridorWidth;

        // Find corridors connected to each side
        const northCorridors = this.corridors.filter(c =>
            this.corridorConnectsToSide(c, room, 'north'));
        const southCorridors = this.corridors.filter(c =>
            this.corridorConnectsToSide(c, room, 'south'));
        const eastCorridors = this.corridors.filter(c =>
            this.corridorConnectsToSide(c, room, 'east'));
        const westCorridors = this.corridors.filter(c =>
            this.corridorConnectsToSide(c, room, 'west'));

        // North wall (z = room.z + room.depth)
        this.createWallWithGap(room, 'north', northCorridors);

        // South wall (z = room.z)
        this.createWallWithGap(room, 'south', southCorridors);

        // East wall (x = room.x + room.width)
        this.createWallWithGap(room, 'east', eastCorridors);

        // West wall (x = room.x)
        this.createWallWithGap(room, 'west', westCorridors);
    }

    /**
     * Check if a corridor connects to a specific side of a room
     */
    private corridorConnectsToSide(corridor: RRPCorridor, room: RRPRoom, side: 'north' | 'south' | 'east' | 'west'): boolean {
        const tolerance = 1;

        if (corridor.horizontal) {
            // Horizontal corridors connect to east/west sides
            if (side === 'east') {
                return Math.abs(corridor.startX - (room.x + room.width)) < tolerance ||
                       Math.abs(corridor.endX - (room.x + room.width)) < tolerance;
            }
            if (side === 'west') {
                return Math.abs(corridor.startX - room.x) < tolerance ||
                       Math.abs(corridor.endX - room.x) < tolerance;
            }
        } else {
            // Vertical corridors connect to north/south sides
            if (side === 'north') {
                return Math.abs(corridor.startZ - (room.z + room.depth)) < tolerance ||
                       Math.abs(corridor.endZ - (room.z + room.depth)) < tolerance;
            }
            if (side === 'south') {
                return Math.abs(corridor.startZ - room.z) < tolerance ||
                       Math.abs(corridor.endZ - room.z) < tolerance;
            }
        }

        return false;
    }

    /**
     * Create a wall with optional gap for corridor
     */
    private createWallWithGap(room: RRPRoom, side: 'north' | 'south' | 'east' | 'west', corridors: RRPCorridor[]): void {
        const t = this.config.wallThickness;
        const cw = this.config.corridorWidth;

        if (side === 'north' || side === 'south') {
            const wallZ = side === 'north' ? room.z + room.depth : room.z;

            if (corridors.length > 0) {
                // Wall with gap
                const gapCenterX = corridors[0].startX; // Corridor X position
                const sideWidth = (room.width - cw) / 2;

                // Left part of wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: room.x + sideWidth / 2,
                    z: wallZ,
                    width: sideWidth,
                    depth: t,
                    isPerimeter: false
                });

                // Right part of wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: room.x + room.width - sideWidth / 2,
                    z: wallZ,
                    width: sideWidth,
                    depth: t,
                    isPerimeter: false
                });
            } else {
                // Complete wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: room.centerX,
                    z: wallZ,
                    width: room.width,
                    depth: t,
                    isPerimeter: false
                });
            }
        } else {
            // East or West wall
            const wallX = side === 'east' ? room.x + room.width : room.x;

            if (corridors.length > 0) {
                // Wall with gap
                const gapCenterZ = corridors[0].startZ; // Corridor Z position
                const sideDepth = (room.depth - cw) / 2;

                // Top part of wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: wallX,
                    z: room.z + room.depth - sideDepth / 2,
                    width: t,
                    depth: sideDepth,
                    isPerimeter: false
                });

                // Bottom part of wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: wallX,
                    z: room.z + sideDepth / 2,
                    width: t,
                    depth: sideDepth,
                    isPerimeter: false
                });
            } else {
                // Complete wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: wallX,
                    z: room.centerZ,
                    width: t,
                    depth: room.depth,
                    isPerimeter: false
                });
            }
        }
    }

    /**
     * Create walls for a corridor
     */
    private createCorridorWalls(corridor: RRPCorridor): void {
        const t = this.config.wallThickness;
        const halfWidth = corridor.width / 2;

        if (corridor.horizontal) {
            const length = Math.abs(corridor.endX - corridor.startX);
            const centerX = (corridor.startX + corridor.endX) / 2;

            // Top wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: centerX,
                z: corridor.startZ + halfWidth,
                width: length,
                depth: t,
                isPerimeter: false
            });

            // Bottom wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: centerX,
                z: corridor.startZ - halfWidth,
                width: length,
                depth: t,
                isPerimeter: false
            });
        } else {
            const length = Math.abs(corridor.endZ - corridor.startZ);
            const centerZ = (corridor.startZ + corridor.endZ) / 2;

            // Left wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: corridor.startX - halfWidth,
                z: centerZ,
                width: t,
                depth: length,
                isPerimeter: false
            });

            // Right wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: corridor.startX + halfWidth,
                z: centerZ,
                width: t,
                depth: length,
                isPerimeter: false
            });
        }
    }

    /**
     * Create perimeter walls around the entire map
     */
    private createPerimeterWalls(): void {
        const bounds = this.calculateMapBounds();
        const halfW = bounds.width / 2 + 10;  // Add margin
        const halfD = bounds.depth / 2 + 10;
        const t = this.config.wallThickness * 2;

        // North
        this.walls.push({
            id: 'per_n',
            x: 0,
            z: halfD,
            width: bounds.width + 20,
            depth: t,
            isPerimeter: true
        });

        // South
        this.walls.push({
            id: 'per_s',
            x: 0,
            z: -halfD,
            width: bounds.width + 20,
            depth: t,
            isPerimeter: true
        });

        // East
        this.walls.push({
            id: 'per_e',
            x: halfW,
            z: 0,
            width: t,
            depth: bounds.depth + 20,
            isPerimeter: true
        });

        // West
        this.walls.push({
            id: 'per_w',
            x: -halfW,
            z: 0,
            width: t,
            depth: bounds.depth + 20,
            isPerimeter: true
        });
    }

    // ============================================
    // DOOR CREATION
    // ============================================

    /**
     * Create doors at corridor-room intersections
     */
    private createDoors(): void {
        for (const corridor of this.corridors) {
            // Get the two rooms this corridor connects
            const fromRoom = this.rooms.find(r => r.id === corridor.fromRoom)!;
            const toRoom = this.rooms.find(r => r.id === corridor.toRoom)!;

            // Create door at the fromRoom end
            this.createDoorAtIntersection(corridor, fromRoom);

            // For cardinal↔corner connections, also add door at toRoom end
            if (fromRoom.type === 'corner' || toRoom.type === 'corner') {
                // Only one door for corner connections (at the cardinal side)
            }
        }
    }

    /**
     * Create a door at the intersection of a corridor and room
     */
    private createDoorAtIntersection(corridor: RRPCorridor, room: RRPRoom): void {
        const cw = this.config.corridorWidth;

        let doorX: number, doorZ: number, rotation: number;

        if (corridor.horizontal) {
            // Door on east or west side of room
            if (corridor.startX < room.centerX) {
                // Corridor comes from the west
                doorX = room.x;
            } else {
                // Corridor comes from the east
                doorX = room.x + room.width;
            }
            doorZ = corridor.startZ;
            rotation = Math.PI / 2;
        } else {
            // Door on north or south side of room
            doorX = corridor.startX;
            if (corridor.startZ < room.centerZ) {
                // Corridor comes from the south
                doorZ = room.z;
            } else {
                // Corridor comes from the north
                doorZ = room.z + room.depth;
            }
            rotation = 0;
        }

        this.doors.push({
            id: `door_${this.doorIdCounter++}`,
            x: doorX,
            z: doorZ,
            width: cw,
            height: 8,
            depth: 2,
            rotation,
            type: cw >= 8 ? 'large' : 'small',
            isOpen: false
        });
    }

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Calculate the bounds of the entire map
     */
    private calculateMapBounds(): { width: number; depth: number } {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const room of this.rooms) {
            minX = Math.min(minX, room.x);
            maxX = Math.max(maxX, room.x + room.width);
            minZ = Math.min(minZ, room.z);
            maxZ = Math.max(maxZ, room.z + room.depth);
        }

        return {
            width: maxX - minX,
            depth: maxZ - minZ
        };
    }

    /**
     * Generate a random seed
     */
    private generateRandomSeed(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    /**
     * Static method to generate random seed
     */
    static generateRandomSeed(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    /**
     * Get current config
     */
    getConfig(): RRPConfig {
        return { ...this.config };
    }

    /**
     * Update config
     */
    updateConfig(newConfig: Partial<RRPConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}
