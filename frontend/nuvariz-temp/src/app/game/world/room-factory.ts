import * as THREE from 'three';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
    RoomTemplate,
    RoomInstance,
    RoomDoor,
    RoomLightInstance,
    RoomType,
    RoomBiome,
    ROOM_COLORS
} from './room-system';

/**
 * Room Template Loader Service
 *
 * Loads and caches room templates from JSON files
 */
@Injectable({
    providedIn: 'root'
})
export class RoomTemplateLoader {
    private templates: Map<string, RoomTemplate> = new Map();
    private loaded = false;

    // Available templates
    private readonly TEMPLATE_FILES: string[] = [
        'prison-small',
        'prison-medium',
        'lab-small',
        'lab-large',
        'corridor-horizontal',
        'corridor-vertical',
        'corridor-t',
        'corridor-cross',
        'hub-central'
    ];

    constructor(private http: HttpClient) { }

    /**
     * Load all room templates
     */
    async loadAllTemplates(): Promise<void> {
        if (this.loaded) return;

        const promises = this.TEMPLATE_FILES.map(async (name) => {
            try {
                const template = await this.loadTemplate(name);
                this.templates.set(template.id, template);
                this.templates.set(template.type, template);  // Also index by type
            } catch (error) {
                console.warn(`[RoomTemplateLoader] Failed to load template: ${name}`, error);
            }
        });

        await Promise.all(promises);
        this.loaded = true;
        console.log(`[RoomTemplateLoader] Loaded ${this.templates.size} templates`);
    }

    /**
     * Load a single template by name
     */
    private async loadTemplate(name: string): Promise<RoomTemplate> {
        const url = `assets/room-templates/${name}.json`;
        const data = await firstValueFrom(this.http.get<RoomTemplate>(url));
        return data;
    }

    /**
     * Get template by ID or type
     */
    getTemplate(idOrType: string): RoomTemplate | undefined {
        return this.templates.get(idOrType);
    }

    /**
     * Get all templates of a specific biome
     */
    getTemplatesByBiome(biome: RoomBiome): RoomTemplate[] {
        return Array.from(this.templates.values())
            .filter(t => t.biome === biome);
    }

    /**
     * Get all templates of a specific type category
     */
    getTemplatesByTypePrefix(prefix: string): RoomTemplate[] {
        return Array.from(this.templates.values())
            .filter(t => t.type.startsWith(prefix));
    }

    /**
     * Get random template matching criteria
     */
    getRandomTemplate(options?: {
        biome?: RoomBiome;
        minExits?: number;
        maxExits?: number;
        maxDifficulty?: number;
        tags?: string[];
    }): RoomTemplate | undefined {
        let candidates = Array.from(this.templates.values());

        if (options?.biome) {
            candidates = candidates.filter(t => t.biome === options.biome);
        }

        if (options?.minExits !== undefined) {
            candidates = candidates.filter(t => t.maxExits >= options.minExits!);
        }

        if (options?.maxExits !== undefined) {
            candidates = candidates.filter(t => t.maxExits <= options.maxExits!);
        }

        if (options?.maxDifficulty !== undefined) {
            candidates = candidates.filter(t => t.difficulty <= options.maxDifficulty!);
        }

        if (options?.tags?.length) {
            candidates = candidates.filter(t =>
                options.tags!.some(tag => t.tags.includes(tag))
            );
        }

        if (candidates.length === 0) return undefined;

        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * Get all loaded templates
     */
    getAllTemplates(): RoomTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Check if templates are loaded
     */
    isLoaded(): boolean {
        return this.loaded;
    }
}

/**
 * Room Factory
 *
 * Creates RoomInstance objects from templates
 */
export class RoomFactory {
    private scene: THREE.Scene;
    private roomIdCounter = 0;
    private layerCounter = 1;  // Start from layer 1 (0 is shared)

    // Texture cache
    private textureLoader = new THREE.TextureLoader();
    private wallTexture: THREE.Texture | null = null;
    private floorTexture: THREE.Texture | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.loadTextures();
    }

    /**
     * Load shared textures
     */
    private loadTextures(): void {
        this.wallTexture = this.textureLoader.load('assets/environment/wall_1.png');
        this.wallTexture.wrapS = THREE.RepeatWrapping;
        this.wallTexture.wrapT = THREE.RepeatWrapping;

        // Floor texture (if exists) or use procedural
        try {
            this.floorTexture = this.textureLoader.load('assets/environment/floor_1.png');
            this.floorTexture.wrapS = THREE.RepeatWrapping;
            this.floorTexture.wrapT = THREE.RepeatWrapping;
        } catch {
            this.floorTexture = null;
        }
    }

    /**
     * Create a room instance from a template
     */
    createRoom(
        template: RoomTemplate,
        worldPosition: THREE.Vector3,
        rotation: number = 0
    ): RoomInstance {
        const roomId = `room_${this.roomIdCounter++}`;
        const layer = this.getNextLayer();

        // Create group for all room objects
        const group = new THREE.Group();
        group.name = roomId;
        group.position.copy(worldPosition);
        group.rotation.y = rotation;

        // Create floor
        const floor = this.createFloor(template, layer);
        group.add(floor);

        // Create walls with automatic door cuts
        const walls: THREE.Mesh[] = [];
        const processedWalls = this.cutWallsForDoors(template.walls, template.doorSockets);
        for (const wallDef of processedWalls) {
            const wall = this.createWall(wallDef, template.height, layer);
            walls.push(wall);
            group.add(wall);
        }

        // Calculate bounds
        const bounds = this.calculateBounds(template, worldPosition, rotation);
        const expandedBounds = bounds.clone().expandByScalar(2);

        // Create doors (initially closed)
        const doors: RoomDoor[] = template.doorSockets.map(socket => ({
            id: `${roomId}_${socket.id}`,
            socketId: socket.id,
            worldPosition: this.calculateDoorWorldPosition(socket, worldPosition, rotation),
            rotation: this.calculateDoorRotation(socket.direction, rotation),
            width: socket.width,
            type: socket.socketType,
            isOpen: false,
            isLocked: false,
            connectsTo: undefined
        }));

        // Placeholder for lights (actual lights created by RoomLightingSystem)
        const lights: RoomLightInstance[] = [];

        // Add group to scene
        this.scene.add(group);

        const instance: RoomInstance = {
            id: roomId,
            templateId: template.id,
            template,
            worldPosition: worldPosition.clone(),
            rotation,
            bounds,
            expandedBounds,
            group,
            floor,
            walls,
            doors,
            lights,
            layer,
            isVisible: false,
            isCurrentRoom: false,
            connectedRooms: new Map(),
            adjacentRoomIds: new Set()
        };

        return instance;
    }

    /**
     * Cut walls where doors are positioned
     * This automatically creates gaps in walls for doorways
     */
    private cutWallsForDoors(
        walls: Array<{ id: string; localPosition: { x: number; z: number }; width: number; depth: number; height?: number; wallType: string }>,
        doorSockets: Array<{ id: string; localPosition: { x: number; z: number }; direction: string; width: number; socketType: string }>
    ): Array<{ id: string; localPosition: { x: number; z: number }; width: number; depth: number; height?: number; wallType: string }> {
        const result: Array<{ id: string; localPosition: { x: number; z: number }; width: number; depth: number; height?: number; wallType: string }> = [];

        for (const wall of walls) {
            // Find doors that intersect this wall
            const intersectingDoors: Array<{ door: typeof doorSockets[0]; overlap: { start: number; end: number } }> = [];

            for (const door of doorSockets) {
                const overlap = this.getDoorWallOverlap(wall, door);
                if (overlap) {
                    intersectingDoors.push({ door, overlap });
                }
            }

            if (intersectingDoors.length === 0) {
                // No doors intersect this wall, keep it as is
                result.push(wall);
            } else {
                // Cut wall into segments around the doors
                const segments = this.cutWallIntoSegments(wall, intersectingDoors.map(d => d.overlap));
                result.push(...segments);
            }
        }

        return result;
    }

    /**
     * Check if a door intersects a wall and return the overlap range
     */
    private getDoorWallOverlap(
        wall: { localPosition: { x: number; z: number }; width: number; depth: number },
        door: { localPosition: { x: number; z: number }; direction: string; width: number }
    ): { start: number; end: number } | null {
        const tolerance = 0.5; // Allow small misalignment
        const halfDoorWidth = door.width / 2;

        // Determine if wall is horizontal (along X) or vertical (along Z)
        const isHorizontalWall = wall.width > wall.depth;

        if (isHorizontalWall) {
            // Wall runs along X axis
            // Door must have N or S direction and be at same Z position
            if (door.direction !== 'N' && door.direction !== 'S') return null;
            if (Math.abs(door.localPosition.z - wall.localPosition.z) > tolerance) return null;

            // Calculate wall X range
            const wallStart = wall.localPosition.x - wall.width / 2;
            const wallEnd = wall.localPosition.x + wall.width / 2;

            // Calculate door X range
            const doorStart = door.localPosition.x - halfDoorWidth;
            const doorEnd = door.localPosition.x + halfDoorWidth;

            // Check if door is within wall range
            if (doorEnd < wallStart || doorStart > wallEnd) return null;

            // Return overlap in wall-local coordinates (0 = wall start, width = wall end)
            return {
                start: Math.max(0, doorStart - wallStart),
                end: Math.min(wall.width, doorEnd - wallStart)
            };
        } else {
            // Wall runs along Z axis
            // Door must have E or W direction and be at same X position
            if (door.direction !== 'E' && door.direction !== 'W') return null;
            if (Math.abs(door.localPosition.x - wall.localPosition.x) > tolerance) return null;

            // Calculate wall Z range
            const wallStart = wall.localPosition.z - wall.depth / 2;
            const wallEnd = wall.localPosition.z + wall.depth / 2;

            // Calculate door Z range
            const doorStart = door.localPosition.z - halfDoorWidth;
            const doorEnd = door.localPosition.z + halfDoorWidth;

            // Check if door is within wall range
            if (doorEnd < wallStart || doorStart > wallEnd) return null;

            // Return overlap in wall-local coordinates
            return {
                start: Math.max(0, doorStart - wallStart),
                end: Math.min(wall.depth, doorEnd - wallStart)
            };
        }
    }

    /**
     * Cut a wall into segments, removing the door areas
     */
    private cutWallIntoSegments(
        wall: { id: string; localPosition: { x: number; z: number }; width: number; depth: number; height?: number; wallType: string },
        doorOverlaps: Array<{ start: number; end: number }>
    ): Array<{ id: string; localPosition: { x: number; z: number }; width: number; depth: number; height?: number; wallType: string }> {
        const result: typeof wall[] = [];
        const isHorizontalWall = wall.width > wall.depth;
        const wallLength = isHorizontalWall ? wall.width : wall.depth;

        // Sort overlaps by start position
        const sortedOverlaps = [...doorOverlaps].sort((a, b) => a.start - b.start);

        // Merge overlapping door regions
        const mergedOverlaps: Array<{ start: number; end: number }> = [];
        for (const overlap of sortedOverlaps) {
            if (mergedOverlaps.length === 0 || mergedOverlaps[mergedOverlaps.length - 1].end < overlap.start) {
                mergedOverlaps.push({ ...overlap });
            } else {
                mergedOverlaps[mergedOverlaps.length - 1].end = Math.max(mergedOverlaps[mergedOverlaps.length - 1].end, overlap.end);
            }
        }

        // Create wall segments between door openings
        let currentPos = 0;
        let segmentIndex = 0;

        for (const overlap of mergedOverlaps) {
            // Add segment before this door (if there's space)
            if (overlap.start > currentPos + 0.1) {
                const segmentLength = overlap.start - currentPos;
                const segmentCenter = currentPos + segmentLength / 2;

                if (isHorizontalWall) {
                    const wallStartX = wall.localPosition.x - wall.width / 2;
                    result.push({
                        id: `${wall.id}_seg${segmentIndex}`,
                        localPosition: {
                            x: wallStartX + segmentCenter,
                            z: wall.localPosition.z
                        },
                        width: segmentLength,
                        depth: wall.depth,
                        height: wall.height,
                        wallType: wall.wallType
                    });
                } else {
                    const wallStartZ = wall.localPosition.z - wall.depth / 2;
                    result.push({
                        id: `${wall.id}_seg${segmentIndex}`,
                        localPosition: {
                            x: wall.localPosition.x,
                            z: wallStartZ + segmentCenter
                        },
                        width: wall.width,
                        depth: segmentLength,
                        height: wall.height,
                        wallType: wall.wallType
                    });
                }
                segmentIndex++;
            }
            currentPos = overlap.end;
        }

        // Add final segment after last door (if there's space)
        if (wallLength > currentPos + 0.1) {
            const segmentLength = wallLength - currentPos;
            const segmentCenter = currentPos + segmentLength / 2;

            if (isHorizontalWall) {
                const wallStartX = wall.localPosition.x - wall.width / 2;
                result.push({
                    id: `${wall.id}_seg${segmentIndex}`,
                    localPosition: {
                        x: wallStartX + segmentCenter,
                        z: wall.localPosition.z
                    },
                    width: segmentLength,
                    depth: wall.depth,
                    height: wall.height,
                    wallType: wall.wallType
                });
            } else {
                const wallStartZ = wall.localPosition.z - wall.depth / 2;
                result.push({
                    id: `${wall.id}_seg${segmentIndex}`,
                    localPosition: {
                        x: wall.localPosition.x,
                        z: wallStartZ + segmentCenter
                    },
                    width: wall.width,
                    depth: segmentLength,
                    height: wall.height,
                    wallType: wall.wallType
                });
            }
        }

        return result;
    }

    /**
     * Create floor mesh for a room
     */
    private createFloor(template: RoomTemplate, layer: number): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(template.width, template.depth);

        const material = new THREE.MeshStandardMaterial({
            color: template.floorColor || ROOM_COLORS[template.biome].floor,
            roughness: 0.8,
            metalness: 0.1
        });

        if (this.floorTexture) {
            material.map = this.floorTexture.clone();
            material.map.repeat.set(template.width / 10, template.depth / 10);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.01;
        mesh.receiveShadow = true;
        mesh.layers.set(layer);
        mesh.name = 'floor';

        return mesh;
    }

    /**
     * Create wall mesh
     */
    private createWall(
        wallDef: { id: string; localPosition: { x: number; z: number }; width: number; depth: number; height?: number; wallType: string },
        defaultHeight: number,
        layer: number
    ): THREE.Mesh {
        const height = wallDef.height || defaultHeight;

        const geometry = new THREE.BoxGeometry(wallDef.width, height, wallDef.depth);

        // Color based on wall type
        let color: number;
        let opacity = 1;
        let transparent = false;

        switch (wallDef.wallType) {
            case 'reinforced':
                color = 0x4a4a5a;
                break;
            case 'glass':
                color = 0x88ccff;
                opacity = 0.3;
                transparent = true;
                break;
            case 'bars':
                color = 0x3a3a3a;
                break;
            default:
                color = 0x3a3a3a;
        }

        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.3,
            transparent,
            opacity
        });

        if (this.wallTexture && !transparent) {
            material.map = this.wallTexture.clone();
            material.map.repeat.set(wallDef.width / 10, 1);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            wallDef.localPosition.x,
            height / 2,
            wallDef.localPosition.z
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.layers.set(layer);
        mesh.name = wallDef.id;

        // Store collision data for WallCollisionSystem
        mesh.userData['isWall'] = true;
        mesh.userData['wallType'] = wallDef.wallType;
        mesh.userData['collisionBox'] = new THREE.Box3().setFromObject(mesh);

        return mesh;
    }

    /**
     * Calculate room bounds in world space
     */
    private calculateBounds(
        template: RoomTemplate,
        worldPosition: THREE.Vector3,
        rotation: number
    ): THREE.Box3 {
        const halfWidth = template.width / 2;
        const halfDepth = template.depth / 2;

        // For non-rotated rooms
        if (rotation === 0) {
            return new THREE.Box3(
                new THREE.Vector3(
                    worldPosition.x - halfWidth,
                    0,
                    worldPosition.z - halfDepth
                ),
                new THREE.Vector3(
                    worldPosition.x + halfWidth,
                    template.height,
                    worldPosition.z + halfDepth
                )
            );
        }

        // For rotated rooms, calculate rotated corners
        const corners = [
            new THREE.Vector3(-halfWidth, 0, -halfDepth),
            new THREE.Vector3(halfWidth, 0, -halfDepth),
            new THREE.Vector3(-halfWidth, 0, halfDepth),
            new THREE.Vector3(halfWidth, 0, halfDepth)
        ];

        const rotationMatrix = new THREE.Matrix4().makeRotationY(rotation);

        corners.forEach(corner => {
            corner.applyMatrix4(rotationMatrix);
            corner.add(worldPosition);
        });

        const bounds = new THREE.Box3();
        corners.forEach(corner => bounds.expandByPoint(corner));
        bounds.max.y = template.height;

        return bounds;
    }

    /**
     * Calculate door world position
     */
    private calculateDoorWorldPosition(
        socket: { localPosition: { x: number; z: number } },
        roomPosition: THREE.Vector3,
        roomRotation: number
    ): THREE.Vector3 {
        const localPos = new THREE.Vector3(socket.localPosition.x, 0, socket.localPosition.z);

        if (roomRotation !== 0) {
            localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), roomRotation);
        }

        return localPos.add(roomPosition);
    }

    /**
     * Calculate door rotation based on direction and room rotation
     */
    private calculateDoorRotation(direction: string, roomRotation: number): number {
        let baseRotation = 0;

        switch (direction) {
            case 'N': baseRotation = 0; break;
            case 'S': baseRotation = Math.PI; break;
            case 'E': baseRotation = Math.PI / 2; break;
            case 'W': baseRotation = -Math.PI / 2; break;
        }

        return baseRotation + roomRotation;
    }

    /**
     * Get next available layer (max 31)
     */
    private getNextLayer(): number {
        const layer = this.layerCounter;
        this.layerCounter = (this.layerCounter % 30) + 1;  // Cycle 1-30, keep 0 for shared
        return layer;
    }

    /**
     * Connect two rooms via doors
     */
    connectRooms(
        roomA: RoomInstance,
        doorIdA: string,
        roomB: RoomInstance,
        doorIdB: string
    ): void {
        const doorA = roomA.doors.find(d => d.id === doorIdA || d.socketId === doorIdA);
        const doorB = roomB.doors.find(d => d.id === doorIdB || d.socketId === doorIdB);

        if (!doorA || !doorB) {
            console.warn('[RoomFactory] Could not find doors to connect');
            return;
        }

        doorA.connectsTo = { roomId: roomB.id, doorId: doorB.id };
        doorB.connectsTo = { roomId: roomA.id, doorId: doorA.id };

        roomA.connectedRooms.set(doorA.id, roomB.id);
        roomB.connectedRooms.set(doorB.id, roomA.id);

        roomA.adjacentRoomIds.add(roomB.id);
        roomB.adjacentRoomIds.add(roomA.id);
    }

    /**
     * Dispose a room and its resources
     */
    disposeRoom(room: RoomInstance): void {
        // Remove from scene
        this.scene.remove(room.group);

        // Dispose geometries and materials
        room.group.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Clear references
        room.walls = [];
        room.doors = [];
        room.lights = [];
        room.connectedRooms.clear();
        room.adjacentRoomIds.clear();
    }

    /**
     * Get all wall meshes from a room (for collision detection)
     */
    getWallMeshes(room: RoomInstance): THREE.Mesh[] {
        return room.walls;
    }

    /**
     * Get all wall boxes from a room (for fast collision detection)
     */
    getWallBoxes(room: RoomInstance): THREE.Box3[] {
        return room.walls
            .filter(wall => wall.userData['isWall'])
            .map(wall => {
                // Update collision box to world position
                const box = new THREE.Box3().setFromObject(wall);
                return box;
            });
    }
}
