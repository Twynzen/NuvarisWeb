import * as THREE from 'three';
import { RoomTemplate, RoomInstance, RoomBiome, DoorSocket } from './room-system';
import { RoomFactory, RoomTemplateLoader } from './room-factory';

/**
 * Configuration for procedural map generation using templates
 */
export interface TemplateMapConfig {
    seed?: string;
    startTemplate: string;  // Template ID for starting room (e.g., 'hub_large')
    minRooms: number;       // Minimum number of rooms
    maxRooms: number;       // Maximum number of rooms
    biomeWeights?: Partial<Record<RoomBiome, number>>;  // Probability weights for biomes
    difficultyProgression?: boolean;  // Increase difficulty as distance from start increases
    maxDifficulty?: number;  // Maximum difficulty level (1-5)
    branchingFactor?: number;  // How many exits to use per room (0-1, 1 = use all exits)
}

/**
 * Result of map generation
 */
export interface GeneratedTemplateMap {
    rooms: RoomInstance[];
    connections: Array<{
        roomAId: string;
        doorAId: string;
        roomBId: string;
        doorBId: string;
    }>;
    startRoomId: string;
    config: TemplateMapConfig;
}

/**
 * Door compatibility types
 */
const DOOR_COMPATIBILITY: Record<string, string[]> = {
    'small': ['small'],
    'large': ['large', 'garage'],
    'garage': ['large', 'garage']
};

/**
 * Opposite directions for door matching
 */
const OPPOSITE_DIRECTION: Record<string, string> = {
    'N': 'S',
    'S': 'N',
    'E': 'W',
    'W': 'E'
};

/**
 * Template-based procedural map generator
 *
 * Generates maps by connecting prefab room templates through their doors.
 * Ensures proper alignment and no overlapping rooms.
 */
export class TemplateMapGenerator {
    private templateLoader: RoomTemplateLoader;
    private roomFactory: RoomFactory;
    private scene: THREE.Scene;

    // Seeded random for reproducibility
    private seed: number = 0;

    // Track placed rooms for collision detection
    private placedRooms: RoomInstance[] = [];
    private pendingDoors: Array<{
        room: RoomInstance;
        door: DoorSocket;
        worldPosition: THREE.Vector3;
        direction: string;
    }> = [];

    constructor(
        scene: THREE.Scene,
        templateLoader: RoomTemplateLoader,
        roomFactory: RoomFactory
    ) {
        this.scene = scene;
        this.templateLoader = templateLoader;
        this.roomFactory = roomFactory;
    }

    /**
     * Generate a map using templates
     */
    async generate(config: TemplateMapConfig): Promise<GeneratedTemplateMap> {
        // Initialize
        this.placedRooms = [];
        this.pendingDoors = [];
        this.seed = this.hashString(config.seed || Date.now().toString());

        const connections: GeneratedTemplateMap['connections'] = [];

        // Ensure templates are loaded
        if (!this.templateLoader.isLoaded()) {
            await this.templateLoader.loadAllTemplates();
        }

        // 1. Place starting room at origin
        const startTemplate = this.templateLoader.getTemplate(config.startTemplate);
        if (!startTemplate) {
            throw new Error(`Start template not found: ${config.startTemplate}`);
        }

        const startRoom = this.roomFactory.createRoom(
            startTemplate,
            new THREE.Vector3(0, 0, 0),
            0
        );
        this.placedRooms.push(startRoom);

        // Add all doors from start room to pending
        this.addRoomDoorsToPending(startRoom, startTemplate);

        // 2. Iteratively connect rooms until we reach the target count
        const targetRooms = this.randomInt(config.minRooms, config.maxRooms);
        let attempts = 0;
        const maxAttempts = targetRooms * 10;  // Prevent infinite loops

        while (this.placedRooms.length < targetRooms && this.pendingDoors.length > 0 && attempts < maxAttempts) {
            attempts++;

            // Pick a random pending door (weighted towards newer rooms for interesting shapes)
            const doorIndex = this.selectPendingDoor();
            const pendingDoor = this.pendingDoors[doorIndex];

            // Find compatible templates
            const compatibleTemplates = this.findCompatibleTemplates(
                pendingDoor,
                config
            );

            if (compatibleTemplates.length === 0) {
                // No compatible templates, remove this door
                this.pendingDoors.splice(doorIndex, 1);
                continue;
            }

            // Try each compatible template until one fits
            let placed = false;
            for (const { template, socket, rotation } of compatibleTemplates) {
                const newRoomPosition = this.calculateRoomPosition(
                    pendingDoor,
                    template,
                    socket,
                    rotation
                );

                // Check if room fits (no overlap)
                if (this.checkRoomFits(template, newRoomPosition, rotation)) {
                    // Place the room
                    const newRoom = this.roomFactory.createRoom(
                        template,
                        newRoomPosition,
                        rotation
                    );
                    this.placedRooms.push(newRoom);

                    // Connect the rooms
                    this.roomFactory.connectRooms(
                        pendingDoor.room,
                        pendingDoor.door.id,
                        newRoom,
                        socket.id
                    );

                    connections.push({
                        roomAId: pendingDoor.room.id,
                        doorAId: pendingDoor.door.id,
                        roomBId: newRoom.id,
                        doorBId: socket.id
                    });

                    // Add new room's doors to pending (except the one we just connected)
                    this.addRoomDoorsToPending(newRoom, template, socket.id);

                    // Remove the used pending door
                    this.pendingDoors.splice(doorIndex, 1);

                    placed = true;
                    break;
                }
            }

            if (!placed) {
                // Couldn't place any template, remove this door
                this.pendingDoors.splice(doorIndex, 1);
            }

            // Apply branching factor - randomly remove some pending doors
            if (config.branchingFactor !== undefined && config.branchingFactor < 1) {
                this.applyBranchingFactor(config.branchingFactor);
            }
        }

        console.log(`[TemplateMapGenerator] Generated ${this.placedRooms.length} rooms with ${connections.length} connections`);

        return {
            rooms: this.placedRooms,
            connections,
            startRoomId: startRoom.id,
            config
        };
    }

    /**
     * Add a room's doors to the pending list
     */
    private addRoomDoorsToPending(room: RoomInstance, template: RoomTemplate, excludeDoorId?: string): void {
        for (const socket of template.doorSockets) {
            if (socket.id === excludeDoorId) continue;

            // Calculate world position of door
            const localPos = new THREE.Vector3(socket.localPosition.x, 0, socket.localPosition.z);
            if (room.rotation !== 0) {
                localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), room.rotation);
            }
            const worldPos = localPos.add(room.worldPosition);

            // Adjust direction for room rotation
            const adjustedDirection = this.rotateDirection(socket.direction, room.rotation);

            this.pendingDoors.push({
                room,
                door: socket,
                worldPosition: worldPos,
                direction: adjustedDirection
            });
        }
    }

    /**
     * Find templates that can connect to a pending door
     */
    private findCompatibleTemplates(
        pendingDoor: typeof this.pendingDoors[0],
        config: TemplateMapConfig
    ): Array<{ template: RoomTemplate; socket: DoorSocket; rotation: number }> {
        const results: Array<{ template: RoomTemplate; socket: DoorSocket; rotation: number }> = [];
        const requiredDirection = OPPOSITE_DIRECTION[pendingDoor.direction];
        const compatibleTypes = DOOR_COMPATIBILITY[pendingDoor.door.socketType] || [pendingDoor.door.socketType];

        // Get distance from start for difficulty progression
        const distanceFromStart = pendingDoor.worldPosition.length() / 50;  // Normalize
        const maxAllowedDifficulty = config.difficultyProgression
            ? Math.min(config.maxDifficulty || 5, Math.ceil(distanceFromStart) + 1)
            : config.maxDifficulty || 5;

        for (const template of this.templateLoader.getAllTemplates()) {
            // Skip if too difficult
            if (template.difficulty > maxAllowedDifficulty) continue;

            // Apply biome weights
            if (config.biomeWeights) {
                const weight = config.biomeWeights[template.biome] ?? 1;
                if (weight <= 0) continue;
                if (this.random() > weight) continue;
            }

            for (const socket of template.doorSockets) {
                // Check socket type compatibility
                if (!compatibleTypes.includes(socket.socketType)) continue;

                // Check if we can rotate the template to match directions
                const rotation = this.getRequiredRotation(socket.direction, requiredDirection);
                if (rotation !== null) {
                    results.push({ template, socket, rotation });
                }
            }
        }

        // Shuffle results for variety
        this.shuffleArray(results);

        return results;
    }

    /**
     * Calculate the world position for a new room based on door alignment
     */
    private calculateRoomPosition(
        pendingDoor: typeof this.pendingDoors[0],
        newTemplate: RoomTemplate,
        newSocket: DoorSocket,
        rotation: number
    ): THREE.Vector3 {
        // Get the new socket's local position, rotated
        const socketLocal = new THREE.Vector3(newSocket.localPosition.x, 0, newSocket.localPosition.z);
        if (rotation !== 0) {
            socketLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
        }

        // New room position = pending door position - rotated socket position
        return new THREE.Vector3(
            pendingDoor.worldPosition.x - socketLocal.x,
            0,
            pendingDoor.worldPosition.z - socketLocal.z
        );
    }

    /**
     * Check if a room fits without overlapping existing rooms
     */
    private checkRoomFits(template: RoomTemplate, position: THREE.Vector3, rotation: number): boolean {
        // Calculate bounds for the new room
        const halfWidth = template.width / 2;
        const halfDepth = template.depth / 2;

        // For rotated rooms, use larger bounds (simplified check)
        const effectiveHalf = rotation !== 0
            ? Math.max(halfWidth, halfDepth)
            : Math.max(halfWidth, halfDepth);

        const newBounds = new THREE.Box3(
            new THREE.Vector3(position.x - effectiveHalf - 1, 0, position.z - effectiveHalf - 1),
            new THREE.Vector3(position.x + effectiveHalf + 1, template.height, position.z + effectiveHalf + 1)
        );

        // Check against all placed rooms
        for (const room of this.placedRooms) {
            // Expand existing room bounds slightly to prevent touching
            const expandedBounds = room.bounds.clone().expandByScalar(0.5);

            if (newBounds.intersectsBox(expandedBounds)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get the rotation needed to align a socket direction with the required direction
     */
    private getRequiredRotation(socketDirection: string, requiredDirection: string): number | null {
        const directions = ['N', 'E', 'S', 'W'];
        const socketIndex = directions.indexOf(socketDirection);
        const requiredIndex = directions.indexOf(requiredDirection);

        if (socketIndex === -1 || requiredIndex === -1) return null;

        const steps = (requiredIndex - socketIndex + 4) % 4;
        return steps * (Math.PI / 2);
    }

    /**
     * Rotate a direction by a given angle
     */
    private rotateDirection(direction: string, rotation: number): string {
        const directions = ['N', 'E', 'S', 'W'];
        const index = directions.indexOf(direction);
        if (index === -1) return direction;

        const steps = Math.round(rotation / (Math.PI / 2)) % 4;
        return directions[(index + steps + 4) % 4];
    }

    /**
     * Select a pending door (weighted towards recent additions)
     */
    private selectPendingDoor(): number {
        // 70% chance to pick from recent doors, 30% random
        if (this.random() < 0.7 && this.pendingDoors.length > 3) {
            return this.randomInt(
                Math.floor(this.pendingDoors.length * 0.5),
                this.pendingDoors.length - 1
            );
        }
        return this.randomInt(0, this.pendingDoors.length - 1);
    }

    /**
     * Apply branching factor by removing some pending doors
     */
    private applyBranchingFactor(factor: number): void {
        const toRemove = Math.floor(this.pendingDoors.length * (1 - factor) * 0.3);
        for (let i = 0; i < toRemove && this.pendingDoors.length > 1; i++) {
            const index = this.randomInt(0, this.pendingDoors.length - 1);
            this.pendingDoors.splice(index, 1);
        }
    }

    // --- Seeded Random Utilities ---

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    private random(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Dispose all generated rooms
     */
    dispose(): void {
        for (const room of this.placedRooms) {
            this.roomFactory.disposeRoom(room);
        }
        this.placedRooms = [];
        this.pendingDoors = [];
    }
}
