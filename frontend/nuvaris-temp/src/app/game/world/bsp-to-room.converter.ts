import * as THREE from 'three';
import {
    RoomInstance,
    RoomTemplate,
    RoomBiome,
    RoomLightInstance,
    LIGHTING_PRESETS,
    ROOM_COLORS
} from './room-system';

/**
 * Interfaces from procedural-map-generator (duplicated to avoid circular imports)
 */
export interface BSPRoom {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    centerX: number;
    centerZ: number;
    connected: boolean;
}

export interface BSPCorridor {
    id: string;
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    width: number;
    horizontal: boolean;
}

export interface BSPWallData {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    isPerimeter: boolean;
}

export interface BSPPortalData {
    id: string;
    x: number;
    z: number;
    type: 'spider' | 'worm';
    homeRange: number;
    detectionRange: number;
    maxEnemies: number;
    spawnRate: number;
}

export interface BSPDoorData {
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

export interface BSPMapConfig {
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
    doorChance: number;
}

export interface GeneratedBSPMapData {
    rooms: BSPRoom[];
    corridors: BSPCorridor[];
    walls: BSPWallData[];
    portals: BSPPortalData[];
    doors: BSPDoorData[];
    playerSpawn: { x: number; z: number };
    config: BSPMapConfig;
}

/**
 * Unified map data - compatible with all game systems
 */
export interface UnifiedMapData {
    name: string;
    rooms: RoomInstance[];
    corridors: RoomInstance[];
    wallMeshes: THREE.Mesh[];
    doors: BSPDoorData[];
    portals: BSPPortalData[];
    playerSpawn: THREE.Vector3;
    bounds: THREE.Box3;
}

/**
 * Biome zone configuration for automatic assignment
 */
interface BiomeZone {
    biome: RoomBiome;
    center: THREE.Vector2;
    radius: number;
}

/**
 * BSPToRoomConverter
 *
 * Converts data from BSP generator (editor) to game's room system.
 * This allows procedurally generated maps to have:
 * - Room detection (which room is player in)
 * - Dynamic lighting per biome
 * - Fog of war per room
 * - Optimized collision detection
 */
export class BSPToRoomConverter {
    private scene: THREE.Scene;
    private roomIdCounter = 0;
    private biomeZones: BiomeZone[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Convert GeneratedBSPMapData to UnifiedMapData
     */
    convert(bspData: GeneratedBSPMapData, options?: {
        assignBiomesAutomatically?: boolean;
        defaultBiome?: RoomBiome;
    }): UnifiedMapData {
        const opts = {
            assignBiomesAutomatically: true,
            defaultBiome: 'laboratory' as RoomBiome,
            ...options
        };

        this.roomIdCounter = 0;

        // Calculate map bounds for biome distribution
        const mapBounds = this.calculateMapBounds(bspData);

        // Create biome zones if enabled
        if (opts.assignBiomesAutomatically) {
            this.createBiomeZones(mapBounds, bspData.rooms.length);
        }

        // Convert BSP rooms to RoomInstances
        const rooms: RoomInstance[] = bspData.rooms.map(room =>
            this.convertBSPRoom(room, opts.defaultBiome)
        );

        // Convert corridors to RoomInstances (corridor type)
        const corridors: RoomInstance[] = bspData.corridors.map(corridor =>
            this.convertCorridor(corridor)
        );

        // Create wall meshes
        const wallMeshes: THREE.Mesh[] = bspData.walls.map(wall =>
            this.createWallMesh(wall)
        );

        // Calculate connections between rooms
        this.calculateRoomConnections(rooms, corridors);

        console.log(`[BSPToRoomConverter] Converted: ${rooms.length} rooms, ${corridors.length} corridors, ${wallMeshes.length} walls`);

        return {
            name: `BSP_${bspData.config.seed}`,
            rooms,
            corridors,
            wallMeshes,
            doors: bspData.doors,
            portals: bspData.portals,
            playerSpawn: new THREE.Vector3(
                bspData.playerSpawn.x,
                0,
                bspData.playerSpawn.z
            ),
            bounds: mapBounds
        };
    }

    /**
     * Convert a BSP Room to RoomInstance
     */
    private convertBSPRoom(bspRoom: BSPRoom, defaultBiome: RoomBiome): RoomInstance {
        const biome = this.assignBiome(bspRoom);
        const colors = ROOM_COLORS[biome];
        const lighting = LIGHTING_PRESETS[biome];

        // Create bounds
        const bounds = new THREE.Box3(
            new THREE.Vector3(bspRoom.x, 0, bspRoom.z),
            new THREE.Vector3(
                bspRoom.x + bspRoom.width,
                8, // Standard height
                bspRoom.z + bspRoom.depth
            )
        );

        // Create visual group
        const group = new THREE.Group();
        group.name = `room_${bspRoom.id}`;
        group.position.set(bspRoom.centerX, 0, bspRoom.centerZ);

        // Create floor
        const floor = this.createFloorMesh(
            bspRoom.width,
            bspRoom.depth,
            colors.floor
        );
        floor.position.set(0, 0.01, 0);
        group.add(floor);

        // Create room lights
        const lights = this.createRoomLights(bspRoom, biome);
        lights.forEach(lightInstance => group.add(lightInstance.light));

        const roomInstance: RoomInstance = {
            id: bspRoom.id,
            templateId: 'bsp_generated',
            template: this.createMinimalTemplate(bspRoom, biome),
            worldPosition: new THREE.Vector3(bspRoom.centerX, 0, bspRoom.centerZ),
            rotation: 0,
            bounds,
            expandedBounds: bounds.clone().expandByScalar(3),
            group,
            floor,
            walls: [], // Will be filled when wall meshes are created
            doors: [],
            lights,
            layer: (this.roomIdCounter++ % 30) + 1,
            isVisible: true,
            isCurrentRoom: false,
            connectedRooms: new Map(),
            adjacentRoomIds: new Set()
        };

        this.scene.add(group);
        return roomInstance;
    }

    /**
     * Convert a Corridor to RoomInstance
     */
    private convertCorridor(corridor: BSPCorridor): RoomInstance {
        const biome: RoomBiome = 'corridor';
        const colors = ROOM_COLORS[biome];

        // Calculate corridor dimensions
        let width: number, depth: number, centerX: number, centerZ: number;

        if (corridor.horizontal) {
            width = corridor.endX - corridor.startX;
            depth = corridor.width;
            centerX = corridor.startX + width / 2;
            centerZ = corridor.startZ;
        } else {
            width = corridor.width;
            depth = corridor.endZ - corridor.startZ;
            centerX = corridor.startX;
            centerZ = corridor.startZ + depth / 2;
        }

        const bounds = new THREE.Box3(
            new THREE.Vector3(centerX - width / 2, 0, centerZ - depth / 2),
            new THREE.Vector3(centerX + width / 2, 8, centerZ + depth / 2)
        );

        const group = new THREE.Group();
        group.name = `corridor_${corridor.id}`;
        group.position.set(centerX, 0, centerZ);

        const floor = this.createFloorMesh(width, depth, colors.floor);
        floor.position.set(0, 0.005, 0);
        group.add(floor);

        const roomInstance: RoomInstance = {
            id: corridor.id,
            templateId: 'bsp_corridor',
            template: this.createCorridorTemplate(corridor, width, depth),
            worldPosition: new THREE.Vector3(centerX, 0, centerZ),
            rotation: 0,
            bounds,
            expandedBounds: bounds.clone().expandByScalar(2),
            group,
            floor,
            walls: [],
            doors: [],
            lights: [],
            layer: (this.roomIdCounter++ % 30) + 1,
            isVisible: true,
            isCurrentRoom: false,
            connectedRooms: new Map(),
            adjacentRoomIds: new Set()
        };

        this.scene.add(group);
        return roomInstance;
    }

    /**
     * Assign a biome based on room position
     */
    private assignBiome(room: BSPRoom): RoomBiome {
        if (this.biomeZones.length === 0) {
            return 'laboratory';
        }

        const roomCenter = new THREE.Vector2(room.centerX, room.centerZ);

        // Find closest biome zone
        let closestZone = this.biomeZones[0];
        let closestDist = roomCenter.distanceTo(closestZone.center);

        for (const zone of this.biomeZones) {
            const dist = roomCenter.distanceTo(zone.center);
            if (dist < closestDist) {
                closestDist = dist;
                closestZone = zone;
            }
        }

        return closestZone.biome;
    }

    /**
     * Create biome zones distributed across the map
     */
    private createBiomeZones(mapBounds: THREE.Box3, roomCount: number): void {
        const center = new THREE.Vector3();
        mapBounds.getCenter(center);

        const size = new THREE.Vector3();
        mapBounds.getSize(size);
        const radius = Math.max(size.x, size.z) / 4;

        this.biomeZones = [];

        // Center: hub
        this.biomeZones.push({
            biome: 'hub',
            center: new THREE.Vector2(center.x, center.z),
            radius: radius * 0.5
        });

        // 4 corners with different biomes
        const corners = [
            { x: mapBounds.min.x + size.x * 0.25, z: mapBounds.min.z + size.z * 0.25 },
            { x: mapBounds.max.x - size.x * 0.25, z: mapBounds.min.z + size.z * 0.25 },
            { x: mapBounds.min.x + size.x * 0.25, z: mapBounds.max.z - size.z * 0.25 },
            { x: mapBounds.max.x - size.x * 0.25, z: mapBounds.max.z - size.z * 0.25 }
        ];

        const cornerBiomes: RoomBiome[] = ['laboratory', 'prison', 'medical', 'garden'];
        corners.forEach((corner, i) => {
            this.biomeZones.push({
                biome: cornerBiomes[i],
                center: new THREE.Vector2(corner.x, corner.z),
                radius
            });
        });
    }

    /**
     * Create floor mesh for a room
     */
    private createFloorMesh(width: number, depth: number, color: number): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.9,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        mesh.name = 'floor';
        return mesh;
    }

    /**
     * Create wall mesh from wall data
     */
    private createWallMesh(wall: BSPWallData): THREE.Mesh {
        const height = 8;
        const geometry = new THREE.BoxGeometry(wall.width, height, wall.depth);
        const material = new THREE.MeshStandardMaterial({
            color: wall.isPerimeter ? 0x1a1a2e : 0x2a2a4a,
            roughness: 0.7,
            metalness: 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(wall.x, height / 2, wall.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = wall.id;

        // Metadata for collisions and minimap
        mesh.userData['isWall'] = true;
        mesh.userData['wallWidth'] = wall.width;
        mesh.userData['wallDepth'] = wall.depth;
        mesh.userData['isPerimeter'] = wall.isPerimeter;

        this.scene.add(mesh);
        return mesh;
    }

    /**
     * Create lights for a room based on biome
     */
    private createRoomLights(room: BSPRoom, biome: RoomBiome): RoomLightInstance[] {
        const preset = LIGHTING_PRESETS[biome];
        const lights: RoomLightInstance[] = [];

        // Main central light
        const mainLight = new THREE.PointLight(
            preset.ambient.color,
            preset.ambient.intensity * 2,
            Math.max(room.width, room.depth) * 1.5,
            2
        );
        mainLight.position.set(0, 7, 0);
        mainLight.castShadow = false;

        lights.push({
            id: `${room.id}_main_light`,
            light: mainLight,
            baseIntensity: preset.ambient.intensity * 2,
            isActive: true
        });

        return lights;
    }

    /**
     * Calculate connections between rooms based on corridors
     */
    private calculateRoomConnections(
        rooms: RoomInstance[],
        corridors: RoomInstance[]
    ): void {
        // For each corridor, find which rooms it connects
        for (const corridor of corridors) {
            const connectedRooms = rooms.filter(room =>
                room.expandedBounds.intersectsBox(corridor.expandedBounds)
            );

            // Mark rooms as adjacent to each other
            for (let i = 0; i < connectedRooms.length; i++) {
                for (let j = i + 1; j < connectedRooms.length; j++) {
                    connectedRooms[i].adjacentRoomIds.add(connectedRooms[j].id);
                    connectedRooms[j].adjacentRoomIds.add(connectedRooms[i].id);
                }
                // Also mark corridor as adjacent
                connectedRooms[i].adjacentRoomIds.add(corridor.id);
                corridor.adjacentRoomIds.add(connectedRooms[i].id);
            }
        }
    }

    /**
     * Create minimal template for a BSP room
     */
    private createMinimalTemplate(room: BSPRoom, biome: RoomBiome): RoomTemplate {
        const colors = ROOM_COLORS[biome];
        const lighting = LIGHTING_PRESETS[biome];

        return {
            id: `bsp_${room.id}`,
            name: `BSP Room ${room.id}`,
            type: 'custom',
            biome,
            width: room.width,
            depth: room.depth,
            height: 8,
            walls: [],
            doorSockets: [],
            lights: [{
                id: 'main',
                localPosition: { x: 0, y: 7, z: 0 },
                type: 'point',
                color: lighting.ambient.color,
                intensity: lighting.ambient.intensity,
                distance: Math.max(room.width, room.depth) * 1.5,
                decay: 2
            }],
            spawnPoints: [],
            lightingPreset: lighting,
            floorColor: colors.floor,
            wallColor: colors.wall,
            difficulty: 1,
            tags: ['bsp_generated'],
            maxExits: 4
        };
    }

    /**
     * Create template for corridor
     */
    private createCorridorTemplate(corridor: BSPCorridor, width: number, depth: number): RoomTemplate {
        const biome: RoomBiome = 'corridor';
        const colors = ROOM_COLORS[biome];
        const lighting = LIGHTING_PRESETS[biome];

        return {
            id: `corridor_${corridor.id}`,
            name: `Corridor ${corridor.id}`,
            type: corridor.horizontal ? 'corridor_horizontal' : 'corridor_vertical',
            biome,
            width,
            depth,
            height: 8,
            walls: [],
            doorSockets: [],
            lights: [],
            spawnPoints: [],
            lightingPreset: lighting,
            floorColor: colors.floor,
            wallColor: colors.wall,
            difficulty: 1,
            tags: ['corridor', 'bsp_generated'],
            maxExits: 2
        };
    }

    /**
     * Calculate total map bounds
     */
    private calculateMapBounds(bspData: GeneratedBSPMapData): THREE.Box3 {
        const bounds = new THREE.Box3();

        for (const room of bspData.rooms) {
            bounds.expandByPoint(new THREE.Vector3(room.x, 0, room.z));
            bounds.expandByPoint(new THREE.Vector3(
                room.x + room.width,
                8,
                room.z + room.depth
            ));
        }

        // Also consider walls for full bounds
        for (const wall of bspData.walls) {
            bounds.expandByPoint(new THREE.Vector3(
                wall.x - wall.width / 2,
                0,
                wall.z - wall.depth / 2
            ));
            bounds.expandByPoint(new THREE.Vector3(
                wall.x + wall.width / 2,
                8,
                wall.z + wall.depth / 2
            ));
        }

        return bounds;
    }

    /**
     * Dispose converter resources
     */
    dispose(): void {
        this.biomeZones = [];
        this.roomIdCounter = 0;
    }
}
