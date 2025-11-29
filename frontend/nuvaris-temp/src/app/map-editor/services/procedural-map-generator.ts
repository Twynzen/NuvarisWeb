/**
 * Procedural Map Generator using BSP (Binary Space Partitioning)
 * Creates dungeon-like maps with rooms and corridors similar to classic roguelikes
 */

export interface Room {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    centerX: number;
    centerZ: number;
    connected: boolean;
}

export interface Corridor {
    id: string;
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    width: number;
    horizontal: boolean;
}

export interface BSPNode {
    x: number;
    z: number;
    width: number;
    depth: number;
    room?: Room;
    left?: BSPNode;
    right?: BSPNode;
}

export interface ProceduralMapConfig {
    seed: string;
    mapWidth: number;
    mapDepth: number;
    minRoomSize: number;
    maxRoomSize: number;
    roomPadding: number;
    corridorWidth: number;
    maxDepth: number;
    splitChance: number;
    portalCount: number;
    wallThickness: number;
    generateDoors: boolean;
    doorChance: number; // 0-1, chance to place door at corridor entrance
}

export interface GeneratedMapData {
    rooms: Room[];
    corridors: Corridor[];
    walls: WallData[];
    portals: PortalData[];
    doors: DoorData[];
    playerSpawn: { x: number; z: number };
    config: ProceduralMapConfig;
}

export interface WallData {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    isPerimeter: boolean;
}

export interface PortalData {
    id: string;
    x: number;
    z: number;
    type: 'spider' | 'worm';
    homeRange: number;
    detectionRange: number;
    maxEnemies: number;
    spawnRate: number;
}

export interface DoorData {
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

/**
 * Seeded random number generator for reproducible maps
 */
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

    shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}

/**
 * Main Procedural Map Generator class
 */
export class ProceduralMapGenerator {
    private config: ProceduralMapConfig;
    private random: SeededRandom;
    private rooms: Room[] = [];
    private corridors: Corridor[] = [];
    private walls: WallData[] = [];
    private doors: DoorData[] = [];
    private roomIdCounter = 0;
    private corridorIdCounter = 0;
    private wallIdCounter = 0;
    private doorIdCounter = 0;

    constructor(config?: Partial<ProceduralMapConfig>) {
        this.config = {
            seed: Date.now().toString(),
            mapWidth: 200,
            mapDepth: 200,
            minRoomSize: 15,
            maxRoomSize: 40,
            roomPadding: 3,
            corridorWidth: 6,
            maxDepth: 5,
            splitChance: 0.9,
            portalCount: 4,
            wallThickness: 2,
            generateDoors: true,
            doorChance: 0.6,
            ...config
        };
        this.random = new SeededRandom(this.config.seed);
    }

    /**
     * Generate a complete procedural map
     */
    generate(): GeneratedMapData {
        this.reset();

        // Create BSP tree
        const root: BSPNode = {
            x: -this.config.mapWidth / 2 + this.config.roomPadding,
            z: -this.config.mapDepth / 2 + this.config.roomPadding,
            width: this.config.mapWidth - this.config.roomPadding * 2,
            depth: this.config.mapDepth - this.config.roomPadding * 2
        };

        // Split the space recursively
        this.splitNode(root, 0);

        // Create rooms in leaf nodes
        this.createRoomsInLeaves(root);

        // Connect all rooms with corridors
        this.connectRooms(root);

        // Generate walls from rooms and corridors
        this.generateWalls();

        // Create perimeter walls
        this.createPerimeterWalls();

        // Place portals in large rooms
        const portals = this.placePortals();

        // Place doors at corridor entrances
        if (this.config.generateDoors) {
            this.placeDoors();
        }

        // Determine player spawn (center of first room)
        const playerSpawn = this.rooms.length > 0
            ? { x: this.rooms[0].centerX, z: this.rooms[0].centerZ }
            : { x: 0, z: 0 };

        console.log(`[ProceduralMapGenerator] Generated map with ${this.rooms.length} rooms, ${this.corridors.length} corridors, ${this.walls.length} walls, ${this.doors.length} doors`);

        return {
            rooms: this.rooms,
            corridors: this.corridors,
            walls: this.walls,
            portals,
            doors: this.doors,
            playerSpawn,
            config: this.config
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
        this.roomIdCounter = 0;
        this.corridorIdCounter = 0;
        this.wallIdCounter = 0;
        this.doorIdCounter = 0;
        this.random = new SeededRandom(this.config.seed);
    }

    /**
     * Recursively split a BSP node
     */
    private splitNode(node: BSPNode, depth: number): void {
        // Stop if max depth reached or node is too small
        if (depth >= this.config.maxDepth) return;
        if (node.width < this.config.minRoomSize * 2 && node.depth < this.config.minRoomSize * 2) return;

        // Random chance to stop splitting
        if (depth > 2 && this.random.next() > this.config.splitChance) return;

        // Decide split direction based on aspect ratio
        const splitHorizontal = node.width < node.depth
            ? true
            : node.width > node.depth
                ? false
                : this.random.next() > 0.5;

        // Calculate split position
        const minSplit = this.config.minRoomSize;
        let maxSplit: number;

        if (splitHorizontal) {
            maxSplit = node.depth - this.config.minRoomSize;
            if (maxSplit <= minSplit) return;

            const split = this.random.nextInt(minSplit, maxSplit);

            node.left = {
                x: node.x,
                z: node.z,
                width: node.width,
                depth: split
            };

            node.right = {
                x: node.x,
                z: node.z + split,
                width: node.width,
                depth: node.depth - split
            };
        } else {
            maxSplit = node.width - this.config.minRoomSize;
            if (maxSplit <= minSplit) return;

            const split = this.random.nextInt(minSplit, maxSplit);

            node.left = {
                x: node.x,
                z: node.z,
                width: split,
                depth: node.depth
            };

            node.right = {
                x: node.x + split,
                z: node.z,
                width: node.width - split,
                depth: node.depth
            };
        }

        // Recursively split children
        this.splitNode(node.left, depth + 1);
        this.splitNode(node.right, depth + 1);
    }

    /**
     * Create rooms in leaf nodes
     */
    private createRoomsInLeaves(node: BSPNode): void {
        if (node.left || node.right) {
            // Not a leaf, recurse
            if (node.left) this.createRoomsInLeaves(node.left);
            if (node.right) this.createRoomsInLeaves(node.right);
            return;
        }

        // This is a leaf node - create a room
        const padding = this.config.roomPadding;
        const maxWidth = Math.min(node.width - padding * 2, this.config.maxRoomSize);
        const maxDepth = Math.min(node.depth - padding * 2, this.config.maxRoomSize);

        if (maxWidth < this.config.minRoomSize || maxDepth < this.config.minRoomSize) {
            return;
        }

        const roomWidth = this.random.nextInt(this.config.minRoomSize, maxWidth);
        const roomDepth = this.random.nextInt(this.config.minRoomSize, maxDepth);

        const roomX = node.x + this.random.nextInt(padding, node.width - roomWidth - padding);
        const roomZ = node.z + this.random.nextInt(padding, node.depth - roomDepth - padding);

        const room: Room = {
            id: `room_${this.roomIdCounter++}`,
            x: roomX,
            z: roomZ,
            width: roomWidth,
            depth: roomDepth,
            centerX: roomX + roomWidth / 2,
            centerZ: roomZ + roomDepth / 2,
            connected: false
        };

        node.room = room;
        this.rooms.push(room);
    }

    /**
     * Get a room from a BSP node (traverse to find one)
     */
    private getRoom(node: BSPNode): Room | null {
        if (node.room) return node.room;
        if (node.left) {
            const leftRoom = this.getRoom(node.left);
            if (leftRoom) return leftRoom;
        }
        if (node.right) {
            const rightRoom = this.getRoom(node.right);
            if (rightRoom) return rightRoom;
        }
        return null;
    }

    /**
     * Connect rooms with corridors
     */
    private connectRooms(node: BSPNode): void {
        if (!node.left || !node.right) return;

        // Recurse first
        this.connectRooms(node.left);
        this.connectRooms(node.right);

        // Get rooms from each side
        const leftRoom = this.getRoom(node.left);
        const rightRoom = this.getRoom(node.right);

        if (leftRoom && rightRoom) {
            this.createCorridor(leftRoom, rightRoom);
        }
    }

    /**
     * Create a corridor between two rooms
     */
    private createCorridor(room1: Room, room2: Room): void {
        const x1 = room1.centerX;
        const z1 = room1.centerZ;
        const x2 = room2.centerX;
        const z2 = room2.centerZ;

        const corridorWidth = this.config.corridorWidth;

        // Create L-shaped corridor (horizontal then vertical, or vice versa)
        if (this.random.next() > 0.5) {
            // Horizontal first
            this.corridors.push({
                id: `corridor_${this.corridorIdCounter++}`,
                startX: Math.min(x1, x2),
                startZ: z1,
                endX: Math.max(x1, x2),
                endZ: z1,
                width: corridorWidth,
                horizontal: true
            });

            // Then vertical
            this.corridors.push({
                id: `corridor_${this.corridorIdCounter++}`,
                startX: x2,
                startZ: Math.min(z1, z2),
                endX: x2,
                endZ: Math.max(z1, z2),
                width: corridorWidth,
                horizontal: false
            });
        } else {
            // Vertical first
            this.corridors.push({
                id: `corridor_${this.corridorIdCounter++}`,
                startX: x1,
                startZ: Math.min(z1, z2),
                endX: x1,
                endZ: Math.max(z1, z2),
                width: corridorWidth,
                horizontal: false
            });

            // Then horizontal
            this.corridors.push({
                id: `corridor_${this.corridorIdCounter++}`,
                startX: Math.min(x1, x2),
                startZ: z2,
                endX: Math.max(x1, x2),
                endZ: z2,
                width: corridorWidth,
                horizontal: true
            });
        }

        room1.connected = true;
        room2.connected = true;
    }

    /**
     * Generate walls from rooms and corridors
     */
    private generateWalls(): void {
        const thickness = this.config.wallThickness;

        // Create walls for each room (outline walls)
        for (const room of this.rooms) {
            // North wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: room.x + room.width / 2,
                z: room.z + room.depth,
                width: room.width + thickness * 2,
                depth: thickness,
                isPerimeter: false
            });

            // South wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: room.x + room.width / 2,
                z: room.z,
                width: room.width + thickness * 2,
                depth: thickness,
                isPerimeter: false
            });

            // East wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: room.x + room.width,
                z: room.z + room.depth / 2,
                width: thickness,
                depth: room.depth,
                isPerimeter: false
            });

            // West wall
            this.walls.push({
                id: `wall_${this.wallIdCounter++}`,
                x: room.x,
                z: room.z + room.depth / 2,
                width: thickness,
                depth: room.depth,
                isPerimeter: false
            });
        }

        // Create walls for corridors
        for (const corridor of this.corridors) {
            if (corridor.horizontal) {
                const length = corridor.endX - corridor.startX;
                // Top wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: corridor.startX + length / 2,
                    z: corridor.startZ + corridor.width / 2,
                    width: length,
                    depth: thickness,
                    isPerimeter: false
                });
                // Bottom wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: corridor.startX + length / 2,
                    z: corridor.startZ - corridor.width / 2,
                    width: length,
                    depth: thickness,
                    isPerimeter: false
                });
            } else {
                const length = corridor.endZ - corridor.startZ;
                // Left wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: corridor.startX - corridor.width / 2,
                    z: corridor.startZ + length / 2,
                    width: thickness,
                    depth: length,
                    isPerimeter: false
                });
                // Right wall
                this.walls.push({
                    id: `wall_${this.wallIdCounter++}`,
                    x: corridor.startX + corridor.width / 2,
                    z: corridor.startZ + length / 2,
                    width: thickness,
                    depth: length,
                    isPerimeter: false
                });
            }
        }
    }

    /**
     * Create perimeter walls around the map
     */
    private createPerimeterWalls(): void {
        const halfWidth = this.config.mapWidth / 2;
        const halfDepth = this.config.mapDepth / 2;
        const thickness = this.config.wallThickness * 2;

        // North wall
        this.walls.push({
            id: `wall_perimeter_north`,
            x: 0,
            z: halfDepth,
            width: this.config.mapWidth,
            depth: thickness,
            isPerimeter: true
        });

        // South wall
        this.walls.push({
            id: `wall_perimeter_south`,
            x: 0,
            z: -halfDepth,
            width: this.config.mapWidth,
            depth: thickness,
            isPerimeter: true
        });

        // East wall
        this.walls.push({
            id: `wall_perimeter_east`,
            x: halfWidth,
            z: 0,
            width: thickness,
            depth: this.config.mapDepth,
            isPerimeter: true
        });

        // West wall
        this.walls.push({
            id: `wall_perimeter_west`,
            x: -halfWidth,
            z: 0,
            width: thickness,
            depth: this.config.mapDepth,
            isPerimeter: true
        });
    }

    /**
     * Place portals in rooms
     */
    private placePortals(): PortalData[] {
        const portals: PortalData[] = [];

        // Sort rooms by size (largest first)
        const sortedRooms = [...this.rooms].sort((a, b) =>
            (b.width * b.depth) - (a.width * a.depth)
        );

        // Place portals in the largest rooms
        const portalTypes: ('spider' | 'worm')[] = ['spider', 'worm', 'spider', 'worm'];
        const numPortals = Math.min(this.config.portalCount, sortedRooms.length);

        for (let i = 0; i < numPortals; i++) {
            const room = sortedRooms[i];
            const portalType = portalTypes[i % portalTypes.length];

            portals.push({
                id: `portal_${portalType}_${i}`,
                x: room.centerX,
                z: room.centerZ,
                type: portalType,
                homeRange: 15,
                detectionRange: 30,
                maxEnemies: 10,
                spawnRate: 2
            });
        }

        return portals;
    }

    /**
     * Update config and regenerate
     */
    updateConfig(newConfig: Partial<ProceduralMapConfig>): GeneratedMapData {
        this.config = { ...this.config, ...newConfig };
        return this.generate();
    }

    /**
     * Get current config
     */
    getConfig(): ProceduralMapConfig {
        return { ...this.config };
    }

    /**
     * Place doors at corridor-room intersections
     */
    private placeDoors(): void {
        const doorHeight = 8;
        const doorDepth = 2;

        // For each corridor, check if we should place a door
        for (const corridor of this.corridors) {
            // Random chance to place door
            if (this.random.next() > this.config.doorChance) continue;

            // Determine door type based on corridor width
            let doorType: 'small' | 'large' | 'garage';
            let doorWidth: number;

            if (corridor.width >= 12) {
                doorType = 'garage';
                doorWidth = 15;
            } else if (corridor.width >= 7) {
                doorType = 'large';
                doorWidth = 8;
            } else {
                doorType = 'small';
                doorWidth = 5;
            }

            // Ensure door fits in corridor
            doorWidth = Math.min(doorWidth, corridor.width - 1);

            // Place door at start of corridor (entrance)
            if (corridor.horizontal) {
                // Horizontal corridor - door faces Z axis
                this.doors.push({
                    id: `door_${this.doorIdCounter++}`,
                    x: corridor.startX,
                    z: corridor.startZ,
                    width: doorWidth,
                    height: doorHeight,
                    depth: doorDepth,
                    rotation: 0,
                    type: doorType,
                    isOpen: false
                });
            } else {
                // Vertical corridor - door faces X axis
                this.doors.push({
                    id: `door_${this.doorIdCounter++}`,
                    x: corridor.startX,
                    z: corridor.startZ,
                    width: doorWidth,
                    height: doorHeight,
                    depth: doorDepth,
                    rotation: Math.PI / 2,
                    type: doorType,
                    isOpen: false
                });
            }

            // Sometimes add door at end too (for larger corridors)
            if (corridor.width >= 8 && this.random.next() > 0.5) {
                if (corridor.horizontal) {
                    this.doors.push({
                        id: `door_${this.doorIdCounter++}`,
                        x: corridor.endX,
                        z: corridor.endZ,
                        width: doorWidth,
                        height: doorHeight,
                        depth: doorDepth,
                        rotation: 0,
                        type: doorType,
                        isOpen: false
                    });
                } else {
                    this.doors.push({
                        id: `door_${this.doorIdCounter++}`,
                        x: corridor.endX,
                        z: corridor.endZ,
                        width: doorWidth,
                        height: doorHeight,
                        depth: doorDepth,
                        rotation: Math.PI / 2,
                        type: doorType,
                        isOpen: false
                    });
                }
            }
        }
    }

    /**
     * Generate a random seed
     */
    static generateRandomSeed(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
}
