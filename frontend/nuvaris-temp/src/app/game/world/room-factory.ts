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

        // Create walls
        const walls: THREE.Mesh[] = [];
        for (const wallDef of template.walls) {
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
        mesh.userData.isWall = true;
        mesh.userData.wallType = wallDef.wallType;
        mesh.userData.collisionBox = new THREE.Box3().setFromObject(mesh);

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
            .filter(wall => wall.userData.isWall)
            .map(wall => {
                // Update collision box to world position
                const box = new THREE.Box3().setFromObject(wall);
                return box;
            });
    }
}
