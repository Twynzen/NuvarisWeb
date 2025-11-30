import * as THREE from 'three';

/**
 * NUVARIS Room-Based Visibility System
 *
 * This system manages:
 * - Room templates (reusable room definitions)
 * - Room instances (actual rooms in the world)
 * - Room detection (which room is the player in)
 * - Room connections (doors linking rooms)
 */

// ============================================
// ROOM TEMPLATE INTERFACES
// ============================================

/**
 * Types of rooms available in the game
 */
export type RoomType =
    | 'prison_small'
    | 'prison_medium'
    | 'prison_large'
    | 'lab_small'
    | 'lab_medium'
    | 'lab_large'
    | 'medical_small'
    | 'medical_large'
    | 'corridor_horizontal'
    | 'corridor_vertical'
    | 'corridor_l'
    | 'corridor_t'
    | 'corridor_cross'
    | 'hub_small'
    | 'hub_large'
    | 'custom';

/**
 * Biome/theme for visual styling
 */
export type RoomBiome = 'prison' | 'laboratory' | 'medical' | 'corridor' | 'hub' | 'garden';

/**
 * Door socket direction
 */
export type DoorDirection = 'N' | 'S' | 'E' | 'W';

/**
 * Door socket - defines where a door CAN be placed
 */
export interface DoorSocket {
    id: string;
    localPosition: { x: number; z: number };  // Relative to room origin
    direction: DoorDirection;
    width: number;
    socketType: 'small' | 'large' | 'garage';  // For matching compatible connections
    required: boolean;  // Must this socket have a door?
}

/**
 * Light source definition within a room
 */
export interface RoomLightSource {
    id: string;
    localPosition: { x: number; y: number; z: number };
    type: 'point' | 'spot';
    color: number;
    intensity: number;
    distance: number;
    decay?: number;
    castShadow?: boolean;
    // SpotLight specific
    angle?: number;
    penumbra?: number;
}

/**
 * Spawn point within a room
 */
export interface RoomSpawnPoint {
    id: string;
    localPosition: { x: number; z: number };
    type: 'enemy' | 'item' | 'prop' | 'portal';
    subtype?: string;  // e.g., 'spider', 'worm', 'health_pack'
}

/**
 * Wall segment definition
 */
export interface RoomWallSegment {
    id: string;
    localPosition: { x: number; z: number };
    width: number;
    depth: number;
    height?: number;  // Default: 8
    wallType: 'normal' | 'reinforced' | 'glass' | 'bars';
}

/**
 * Lighting preset for a room biome
 */
export interface LightingPreset {
    ambient: {
        color: number;
        intensity: number;
    };
    fog?: {
        color: number;
        near: number;
        far: number;
    };
}

/**
 * Room Template - Reusable room definition
 */
export interface RoomTemplate {
    id: string;
    name: string;
    type: RoomType;
    biome: RoomBiome;

    // Dimensions
    width: number;   // X axis
    depth: number;   // Z axis
    height: number;  // Y axis (default 8)

    // Structural elements
    walls: RoomWallSegment[];
    doorSockets: DoorSocket[];

    // Content
    lights: RoomLightSource[];
    spawnPoints: RoomSpawnPoint[];

    // Visual preset
    lightingPreset: LightingPreset;
    floorColor: number;
    wallColor: number;

    // Metadata
    difficulty: number;  // 1-5
    tags: string[];
    maxExits: number;
}

// ============================================
// ROOM INSTANCE INTERFACES
// ============================================

/**
 * Door instance - actual door in the world
 */
export interface RoomDoor {
    id: string;
    socketId: string;
    worldPosition: THREE.Vector3;
    rotation: number;
    width: number;
    type: 'small' | 'large' | 'garage';
    isOpen: boolean;
    isLocked: boolean;
    connectsTo?: {
        roomId: string;
        doorId: string;
    };
}

/**
 * Light instance in a room
 */
export interface RoomLightInstance {
    id: string;
    light: THREE.PointLight | THREE.SpotLight;
    baseIntensity: number;
    isActive: boolean;
}

/**
 * Room Instance - Actual room in the world
 */
export interface RoomInstance {
    id: string;
    templateId: string;
    template: RoomTemplate;

    // World positioning
    worldPosition: THREE.Vector3;
    rotation: number;  // Y-axis rotation in radians

    // Bounds for detection
    bounds: THREE.Box3;
    expandedBounds: THREE.Box3;  // For doorway detection

    // Three.js objects
    group: THREE.Group;
    floor: THREE.Mesh;
    walls: THREE.Mesh[];

    // Doors
    doors: RoomDoor[];

    // Lighting
    lights: RoomLightInstance[];

    // Layer for visibility
    layer: number;

    // State
    isVisible: boolean;
    isCurrentRoom: boolean;

    // Connections
    connectedRooms: Map<string, string>;  // doorId -> roomId
    adjacentRoomIds: Set<string>;
}

// ============================================
// ROOM DETECTION SYSTEM
// ============================================

export class RoomDetectionSystem {
    private rooms: Map<string, RoomInstance> = new Map();
    private currentRoomId: string | null = null;
    private previousRoomId: string | null = null;
    private adjacencyMap: Map<string, Set<string>> = new Map();

    // Callbacks
    public onRoomEnter?: (room: RoomInstance, previousRoom: RoomInstance | null) => void;
    public onRoomExit?: (room: RoomInstance, newRoom: RoomInstance | null) => void;
    public onDoorwayEnter?: (door: RoomDoor, roomA: RoomInstance, roomB: RoomInstance) => void;

    /**
     * Register a room in the detection system
     */
    public registerRoom(room: RoomInstance): void {
        this.rooms.set(room.id, room);
        this.updateAdjacency();
    }

    /**
     * Remove a room from the detection system
     */
    public unregisterRoom(roomId: string): void {
        this.rooms.delete(roomId);
        this.adjacencyMap.delete(roomId);
        this.updateAdjacency();
    }

    /**
     * Get the current room the player is in
     */
    public getCurrentRoom(): RoomInstance | null {
        return this.currentRoomId ? this.rooms.get(this.currentRoomId) || null : null;
    }

    /**
     * Get all rooms adjacent to current room
     */
    public getAdjacentRooms(): RoomInstance[] {
        if (!this.currentRoomId) return [];

        const adjacentIds = this.adjacencyMap.get(this.currentRoomId);
        if (!adjacentIds) return [];

        return Array.from(adjacentIds)
            .map(id => this.rooms.get(id))
            .filter((room): room is RoomInstance => room !== undefined);
    }

    /**
     * Get rooms that should be visible (current + adjacent through open doors)
     */
    public getVisibleRooms(): RoomInstance[] {
        const current = this.getCurrentRoom();
        if (!current) return [];

        const visible: RoomInstance[] = [current];

        // Add adjacent rooms that are connected through open doors
        for (const door of current.doors) {
            if (door.isOpen && door.connectsTo) {
                const connectedRoom = this.rooms.get(door.connectsTo.roomId);
                if (connectedRoom && !visible.includes(connectedRoom)) {
                    visible.push(connectedRoom);
                }
            }
        }

        return visible;
    }

    /**
     * Detect which room the player is in
     * Optimized: checks current room first, then adjacent, then all
     */
    public detectRoom(playerPosition: THREE.Vector3): RoomInstance | null {
        // 1. Check current room first (most likely)
        if (this.currentRoomId) {
            const currentRoom = this.rooms.get(this.currentRoomId);
            if (currentRoom && currentRoom.bounds.containsPoint(playerPosition)) {
                return currentRoom;
            }
        }

        // 2. Check adjacent rooms (second most likely)
        if (this.currentRoomId) {
            const adjacentIds = this.adjacencyMap.get(this.currentRoomId);
            if (adjacentIds) {
                for (const adjId of adjacentIds) {
                    const adjRoom = this.rooms.get(adjId);
                    if (adjRoom && adjRoom.bounds.containsPoint(playerPosition)) {
                        return adjRoom;
                    }
                }
            }
        }

        // 3. Full search (fallback)
        for (const [, room] of this.rooms) {
            if (room.bounds.containsPoint(playerPosition)) {
                return room;
            }
        }

        return null;
    }

    /**
     * Check if player is in a doorway between two rooms
     */
    public checkDoorway(playerPosition: THREE.Vector3): {
        door: RoomDoor;
        roomA: RoomInstance;
        roomB: RoomInstance;
    } | null {
        const currentRoom = this.getCurrentRoom();
        if (!currentRoom) return null;

        for (const door of currentRoom.doors) {
            if (!door.isOpen || !door.connectsTo) continue;

            const connectedRoom = this.rooms.get(door.connectsTo.roomId);
            if (!connectedRoom) continue;

            // Check if player is near the door
            const doorPos = door.worldPosition;
            const distanceToPlayer = new THREE.Vector2(
                playerPosition.x - doorPos.x,
                playerPosition.z - doorPos.z
            ).length();

            if (distanceToPlayer < door.width) {
                return {
                    door,
                    roomA: currentRoom,
                    roomB: connectedRoom
                };
            }
        }

        return null;
    }

    /**
     * Update player position and trigger room change events
     */
    public update(playerPosition: THREE.Vector3): void {
        const detectedRoom = this.detectRoom(playerPosition);

        if (!detectedRoom) {
            // Player is outside all rooms
            if (this.currentRoomId) {
                const previousRoom = this.rooms.get(this.currentRoomId);
                if (previousRoom && this.onRoomExit) {
                    this.onRoomExit(previousRoom, null);
                }
                this.previousRoomId = this.currentRoomId;
                this.currentRoomId = null;
            }
            return;
        }

        // Check for room change
        if (detectedRoom.id !== this.currentRoomId) {
            const previousRoom = this.currentRoomId
                ? this.rooms.get(this.currentRoomId)
                : null;

            // Fire exit event
            if (previousRoom && this.onRoomExit) {
                this.onRoomExit(previousRoom, detectedRoom);
            }

            // Update state
            this.previousRoomId = this.currentRoomId;
            this.currentRoomId = detectedRoom.id;

            // Fire enter event
            if (this.onRoomEnter) {
                this.onRoomEnter(detectedRoom, previousRoom || null);
            }
        }

        // Check for doorway
        const doorwayInfo = this.checkDoorway(playerPosition);
        if (doorwayInfo && this.onDoorwayEnter) {
            this.onDoorwayEnter(doorwayInfo.door, doorwayInfo.roomA, doorwayInfo.roomB);
        }
    }

    /**
     * Compute room adjacency based on door connections
     */
    private updateAdjacency(): void {
        this.adjacencyMap.clear();

        for (const [roomId, room] of this.rooms) {
            const adjacent = new Set<string>();

            for (const door of room.doors) {
                if (door.connectsTo) {
                    adjacent.add(door.connectsTo.roomId);
                }
            }

            // Also check expanded bounds intersection
            for (const [otherId, otherRoom] of this.rooms) {
                if (otherId !== roomId &&
                    room.expandedBounds.intersectsBox(otherRoom.expandedBounds)) {
                    adjacent.add(otherId);
                }
            }

            this.adjacencyMap.set(roomId, adjacent);
            room.adjacentRoomIds = adjacent;
        }
    }

    /**
     * Get all registered rooms
     */
    public getAllRooms(): RoomInstance[] {
        return Array.from(this.rooms.values());
    }

    /**
     * Get room by ID
     */
    public getRoom(id: string): RoomInstance | undefined {
        return this.rooms.get(id);
    }

    /**
     * Clear all rooms
     */
    public clear(): void {
        this.rooms.clear();
        this.adjacencyMap.clear();
        this.currentRoomId = null;
        this.previousRoomId = null;
    }

    /**
     * Get count of registered rooms
     */
    public get roomCount(): number {
        return this.rooms.size;
    }
}

// ============================================
// LIGHTING PRESETS
// ============================================

export const LIGHTING_PRESETS: Record<RoomBiome, LightingPreset> = {
    prison: {
        ambient: { color: 0x1a1a2e, intensity: 0.2 },
        // Fog starts OUTSIDE the room (near > room diagonal ~18 for 25x25)
        fog: { color: 0x0a0a15, near: 25, far: 55 }
    },
    laboratory: {
        ambient: { color: 0x2a3a4a, intensity: 0.4 },
        fog: { color: 0x1a2a3a, near: 28, far: 60 }
    },
    medical: {
        ambient: { color: 0x3a3a4a, intensity: 0.5 },
        fog: { color: 0x2a2a3a, near: 25, far: 55 }
    },
    corridor: {
        ambient: { color: 0x1a1a1a, intensity: 0.15 },
        // Corridors are narrow, but we still want clear view inside
        fog: { color: 0x0a0a0a, near: 15, far: 40 }
    },
    hub: {
        ambient: { color: 0x2a2a3a, intensity: 0.35 },
        // Hub is largest (30x30), diagonal ~21, so near > 25
        fog: { color: 0x1a1a2a, near: 30, far: 70 }
    },
    garden: {
        ambient: { color: 0x1a2a1a, intensity: 0.3 },
        fog: { color: 0x0a1a0a, near: 35, far: 80 }
    }
};

// ============================================
// DEFAULT ROOM COLORS
// ============================================

export const ROOM_COLORS: Record<RoomBiome, { floor: number; wall: number }> = {
    prison: { floor: 0x1a1a1a, wall: 0x2a2a2a },
    laboratory: { floor: 0x2a2a3a, wall: 0x3a3a4a },
    medical: { floor: 0x3a3a3a, wall: 0x4a4a4a },
    corridor: { floor: 0x1a1a1a, wall: 0x2a2a2a },
    hub: { floor: 0x2a2a2a, wall: 0x3a3a3a },
    garden: { floor: 0x1a2a1a, wall: 0x2a3a2a }
};
