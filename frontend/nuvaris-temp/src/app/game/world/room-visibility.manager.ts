import * as THREE from 'three';
import { Injectable } from '@angular/core';
import {
    RoomDetectionSystem,
    RoomInstance,
    RoomTemplate
} from './room-system';
import { RoomLightingSystem } from './room-lighting.system';
import { RoomFactory, RoomTemplateLoader } from './room-factory';
import { WallCollisionSystem, EntityCollisionHelper } from './wall-collision.system';

/**
 * Room Visibility Manager
 *
 * Master controller that integrates:
 * - Room detection (which room is player in)
 * - Room lighting (dynamic lights per room)
 * - Wall collisions (prevent walking through walls)
 * - Room templates (predefined room types)
 *
 * This is the main interface for the room-based visibility system.
 */
@Injectable({
    providedIn: 'root'
})
export class RoomVisibilityManager {
    private scene!: THREE.Scene;
    private camera!: THREE.Camera;
    private initialized = false;

    // Sub-systems
    private detectionSystem!: RoomDetectionSystem;
    private lightingSystem!: RoomLightingSystem;
    private wallCollisionSystem!: WallCollisionSystem;
    private roomFactory!: RoomFactory;
    private collisionHelper!: EntityCollisionHelper;

    // Current state
    private currentRoom: RoomInstance | null = null;
    private visibleRooms: RoomInstance[] = [];

    // Callbacks for game events
    public onRoomChange?: (newRoom: RoomInstance, oldRoom: RoomInstance | null) => void;
    public onDoorwayEnter?: (roomA: RoomInstance, roomB: RoomInstance) => void;

    constructor(private templateLoader: RoomTemplateLoader) { }

    /**
     * Initialize the room visibility system
     */
    async initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
        if (this.initialized) {
            console.warn('[RoomVisibilityManager] Already initialized');
            return;
        }

        this.scene = scene;
        this.camera = camera;

        // Load room templates
        await this.templateLoader.loadAllTemplates();

        // Initialize sub-systems
        this.detectionSystem = new RoomDetectionSystem();
        this.lightingSystem = new RoomLightingSystem(scene, camera);
        this.wallCollisionSystem = new WallCollisionSystem(scene);
        this.roomFactory = new RoomFactory(scene);
        this.collisionHelper = new EntityCollisionHelper(this.wallCollisionSystem);

        // Set up detection callbacks
        this.detectionSystem.onRoomEnter = (room, previousRoom) => {
            this.handleRoomEnter(room, previousRoom);
        };

        this.detectionSystem.onRoomExit = (room, newRoom) => {
            this.handleRoomExit(room, newRoom);
        };

        this.detectionSystem.onDoorwayEnter = (door, roomA, roomB) => {
            this.handleDoorwayEnter(roomA, roomB);
        };

        // Initialize fog
        this.lightingSystem.initializeFog('laboratory');

        this.initialized = true;
        console.log('[RoomVisibilityManager] Initialized');
    }

    /**
     * Create a room from a template
     */
    createRoom(
        templateIdOrType: string,
        position: THREE.Vector3,
        rotation: number = 0
    ): RoomInstance | null {
        const template = this.templateLoader.getTemplate(templateIdOrType);
        if (!template) {
            console.warn(`[RoomVisibilityManager] Template not found: ${templateIdOrType}`);
            return null;
        }

        const room = this.roomFactory.createRoom(template, position, rotation);

        // Register with sub-systems
        this.detectionSystem.registerRoom(room);
        this.lightingSystem.registerRoomLights(room);
        this.wallCollisionSystem.registerRoomWalls(room);

        console.log(`[RoomVisibilityManager] Created room: ${room.id} (${template.type})`);
        return room;
    }

    /**
     * Create a room directly from template object
     */
    createRoomFromTemplate(
        template: RoomTemplate,
        position: THREE.Vector3,
        rotation: number = 0
    ): RoomInstance {
        const room = this.roomFactory.createRoom(template, position, rotation);

        this.detectionSystem.registerRoom(room);
        this.lightingSystem.registerRoomLights(room);
        this.wallCollisionSystem.registerRoomWalls(room);

        return room;
    }

    /**
     * Connect two rooms via their doors
     */
    connectRooms(
        roomA: RoomInstance,
        doorSocketIdA: string,
        roomB: RoomInstance,
        doorSocketIdB: string
    ): void {
        this.roomFactory.connectRooms(roomA, doorSocketIdA, roomB, doorSocketIdB);
    }

    /**
     * Remove a room from the system
     */
    removeRoom(room: RoomInstance): void {
        this.detectionSystem.unregisterRoom(room.id);
        this.lightingSystem.unregisterRoomLights(room.id);
        this.wallCollisionSystem.unregisterRoomWalls(room);
        this.roomFactory.disposeRoom(room);
    }

    /**
     * Update player position - call each frame
     */
    update(playerPosition: THREE.Vector3, delta: number): void {
        if (!this.initialized) return;

        // Update room detection
        this.detectionSystem.update(playerPosition);

        // Update player light position
        this.lightingSystem.updatePlayerLight(playerPosition);
    }

    /**
     * Handle player entering a new room
     */
    private handleRoomEnter(room: RoomInstance, previousRoom: RoomInstance | null): void {
        this.currentRoom = room;
        room.isCurrentRoom = true;

        if (previousRoom) {
            previousRoom.isCurrentRoom = false;
        }

        // Get visible rooms (current + connected through open doors)
        this.visibleRooms = this.detectionSystem.getVisibleRooms();

        // Update lighting
        this.lightingSystem.onRoomEnter(room, this.visibleRooms);

        // Update visibility flags
        for (const r of this.detectionSystem.getAllRooms()) {
            r.isVisible = this.visibleRooms.includes(r);
        }

        // Trigger callback
        if (this.onRoomChange) {
            this.onRoomChange(room, previousRoom);
        }

        console.log(`[RoomVisibilityManager] Entered room: ${room.id} (${room.template.name})`);
    }

    /**
     * Handle player exiting a room
     */
    private handleRoomExit(room: RoomInstance, newRoom: RoomInstance | null): void {
        // This is called before onRoomEnter for the new room
    }

    /**
     * Handle player in doorway between rooms
     */
    private handleDoorwayEnter(roomA: RoomInstance, roomB: RoomInstance): void {
        // Both rooms should be visible when in doorway
        if (!this.visibleRooms.includes(roomB)) {
            this.visibleRooms.push(roomB);
            roomB.isVisible = true;
            this.lightingSystem.onRoomEnter(this.currentRoom!, this.visibleRooms);
        }

        if (this.onDoorwayEnter) {
            this.onDoorwayEnter(roomA, roomB);
        }
    }

    /**
     * Open a door in a room
     */
    openDoor(room: RoomInstance, doorId: string): void {
        const door = room.doors.find(d => d.id === doorId || d.socketId === doorId);
        if (!door) return;

        door.isOpen = true;

        // Update visibility if this connects to another room
        if (door.connectsTo && this.currentRoom === room) {
            const connectedRoom = this.detectionSystem.getRoom(door.connectsTo.roomId);
            if (connectedRoom && !this.visibleRooms.includes(connectedRoom)) {
                this.visibleRooms.push(connectedRoom);
                connectedRoom.isVisible = true;
                this.lightingSystem.onRoomEnter(this.currentRoom, this.visibleRooms);
            }
        }
    }

    /**
     * Close a door in a room
     */
    closeDoor(room: RoomInstance, doorId: string): void {
        const door = room.doors.find(d => d.id === doorId || d.socketId === doorId);
        if (!door) return;

        door.isOpen = false;

        // Update visibility
        if (door.connectsTo && this.currentRoom === room) {
            this.visibleRooms = this.detectionSystem.getVisibleRooms();
            this.lightingSystem.onRoomEnter(this.currentRoom, this.visibleRooms);

            // Update visibility flags
            for (const r of this.detectionSystem.getAllRooms()) {
                r.isVisible = this.visibleRooms.includes(r);
            }
        }
    }

    /**
     * Resolve player collision with walls
     */
    resolvePlayerCollision(
        playerPosition: THREE.Vector3,
        velocityX: number,
        velocityZ: number,
        radius: number,
        delta: number
    ): { x: number; z: number } {
        return this.collisionHelper.resolvePlayerMovement(
            { position: playerPosition },
            velocityX,
            velocityZ,
            radius,
            delta
        );
    }

    /**
     * Resolve enemy collision with walls
     */
    resolveEnemyCollision(
        enemyPosition: THREE.Vector3,
        targetPosition: THREE.Vector3,
        speed: number,
        radius: number,
        delta: number
    ): THREE.Vector3 {
        return this.collisionHelper.resolveEnemyMovement(
            { position: enemyPosition },
            targetPosition,
            speed,
            radius,
            delta
        );
    }

    /**
     * Check if there's line of sight between two points
     */
    hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
        return this.wallCollisionSystem.hasLineOfSight(from, to);
    }

    /**
     * Check if projectile hits a wall
     */
    checkProjectileWallHit(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        delta: number
    ): boolean {
        return this.collisionHelper.checkProjectileWallHit(
            { position, velocity },
            delta
        );
    }

    /**
     * Get current room
     */
    getCurrentRoom(): RoomInstance | null {
        return this.currentRoom;
    }

    /**
     * Get visible rooms
     */
    getVisibleRooms(): RoomInstance[] {
        return this.visibleRooms;
    }

    /**
     * Get all rooms
     */
    getAllRooms(): RoomInstance[] {
        return this.detectionSystem.getAllRooms();
    }

    /**
     * Get room by ID
     */
    getRoom(id: string): RoomInstance | undefined {
        return this.detectionSystem.getRoom(id);
    }

    /**
     * Get template by ID or type
     */
    getTemplate(idOrType: string): RoomTemplate | undefined {
        return this.templateLoader.getTemplate(idOrType);
    }

    /**
     * Get all available templates
     */
    getAllTemplates(): RoomTemplate[] {
        return this.templateLoader.getAllTemplates();
    }

    /**
     * Set alarm mode for a room
     */
    setRoomAlarm(roomId: string, enabled: boolean): void {
        this.lightingSystem.setAlarmMode(roomId, enabled);
    }

    /**
     * Flash lights in a room
     */
    flashRoomLights(roomId: string, color: number, duration: number = 0.1): void {
        this.lightingSystem.flashRoomLights(roomId, color, duration);
    }

    /**
     * Toggle debug visualization
     */
    toggleDebug(): boolean {
        return this.wallCollisionSystem.toggleDebug();
    }

    /**
     * Get statistics for debugging
     */
    getStats(): {
        roomCount: number;
        wallCount: number;
        visibleRoomCount: number;
        currentRoomId: string | null;
    } {
        return {
            roomCount: this.detectionSystem.roomCount,
            wallCount: this.wallCollisionSystem.getWallCount(),
            visibleRoomCount: this.visibleRooms.length,
            currentRoomId: this.currentRoom?.id || null
        };
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        if (!this.initialized) return;

        // Dispose all rooms
        for (const room of this.detectionSystem.getAllRooms()) {
            this.removeRoom(room);
        }

        // Dispose sub-systems
        this.lightingSystem.dispose();
        this.wallCollisionSystem.dispose();
        this.detectionSystem.clear();

        this.initialized = false;
        console.log('[RoomVisibilityManager] Disposed');
    }
}
