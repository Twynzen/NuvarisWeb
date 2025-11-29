import * as THREE from 'three';

/**
 * Door configuration interface
 */
export interface DoorConfig {
    id: string;
    position: { x: number; z: number };
    width: number;           // Width of the door opening
    depth: number;           // Thickness of the door (usually 2)
    height: number;          // Height of the door (usually 8)
    rotation?: number;       // Rotation in radians (0 = faces Z, PI/2 = faces X)
    type: 'small' | 'large' | 'garage' | 'custom';
    isOpen: boolean;         // Initial state
    locked?: boolean;        // If true, door won't auto-open
    autoClose?: boolean;     // Auto close after player passes (default: true)
    autoCloseDelay?: number; // Delay before auto close (seconds, default: 1.5)
    linkedTo?: string;       // ID of linked door (opens/closes together)
    color?: number;          // Door color
}

/**
 * Door sizes based on player size (radius 1.0, sprite 2x2)
 * Standardized sizes for the 200x200 map scale
 */
export const DOOR_PRESETS = {
    small: {
        width: 4,       // Cell doors (2x4 in JSON)
        height: 8,
        depth: 2,
        color: 0x5a5a6a  // Gray-blue for cell doors
    },
    large: {
        width: 6,       // Standard doors (6x2 or 6x3 in JSON)
        height: 8,
        depth: 2,
        color: 0x4a5568  // Darker blue-gray
    },
    garage: {
        width: 10,      // Large security doors
        height: 10,
        depth: 3,
        color: 0x3a4558  // Dark metallic
    },
    custom: {
        width: 6,       // Fallback
        height: 8,
        depth: 2,
        color: 0x4a5568
    }
};

// Proximity settings for auto-open/close
const DOOR_PROXIMITY = {
    openDistance: 5,    // Distance at which door starts opening
    closeDistance: 8,   // Distance at which door starts closing
    closeDelay: 1.5     // Seconds after leaving proximity before closing
};

/**
 * Individual door instance
 */
export class Door {
    public id: string;
    public config: DoorConfig;
    public mesh: THREE.Group;
    public doorPanel: THREE.Mesh;
    public isOpen: boolean;
    public isLocked: boolean;
    public isAnimating: boolean = false;

    // Animation state
    private targetY: number = 0;
    private currentY: number = 0;
    private openY: number;
    private closedY: number;
    private animationSpeed: number = 6; // Units per second (slower for realism)

    // Proximity auto-close timer
    private closeTimer: number = 0;
    private playerNearby: boolean = false;

    // Collision box (only active when closed)
    public collisionBox: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
    };

    // Actual dimensions (after applying config/preset)
    private actualWidth: number;
    private actualHeight: number;
    private actualDepth: number;

    constructor(config: DoorConfig) {
        this.id = config.id;
        this.config = config;
        this.isOpen = config.isOpen;
        this.isLocked = config.locked || false;
        this.mesh = new THREE.Group();

        const preset = DOOR_PRESETS[config.type] || DOOR_PRESETS.custom;
        this.actualWidth = config.width || preset.width;
        this.actualHeight = config.height || preset.height;
        this.actualDepth = config.depth || preset.depth;
        const color = config.color || preset.color;

        // Locked doors get a red tint
        const finalColor = this.isLocked ? 0x8b4a4a : color;

        // Calculate Y positions
        this.closedY = this.actualHeight / 2;  // Door visible (center at half height)
        this.openY = -this.actualHeight / 2 - 0.5;  // Door hidden below ground
        this.currentY = this.isOpen ? this.openY : this.closedY;
        this.targetY = this.currentY;

        // Create door frame (static)
        this.createFrame(this.actualWidth, this.actualHeight, this.actualDepth);

        // Create door panel (animated)
        this.doorPanel = this.createDoorPanel(this.actualWidth, this.actualHeight, this.actualDepth, finalColor);
        this.doorPanel.position.y = this.currentY;
        this.mesh.add(this.doorPanel);

        // Position the door group
        this.mesh.position.set(config.position.x, 0, config.position.z);
        if (config.rotation) {
            this.mesh.rotation.y = config.rotation;
        }

        // Calculate collision box
        this.collisionBox = this.calculateCollisionBox(this.actualWidth, this.actualDepth, config.rotation || 0);

        // Set name for identification
        this.mesh.name = `door_${config.id}`;
        this.mesh.userData['type'] = 'door';
        this.mesh.userData['doorId'] = config.id;
    }

    private createFrame(width: number, height: number, depth: number): void {
        const frameThickness = 0.4;
        const frameMat = new THREE.MeshStandardMaterial({
            color: this.isLocked ? 0x4a2a2a : 0x2a2a3a,
            roughness: 0.7,
            metalness: 0.3
        });

        // Left frame
        const leftGeo = new THREE.BoxGeometry(frameThickness, height + 0.5, depth + 0.3);
        const leftFrame = new THREE.Mesh(leftGeo, frameMat);
        leftFrame.position.set(-width / 2 - frameThickness / 2, height / 2, 0);
        leftFrame.castShadow = true;
        this.mesh.add(leftFrame);

        // Right frame
        const rightFrame = leftFrame.clone();
        rightFrame.position.set(width / 2 + frameThickness / 2, height / 2, 0);
        this.mesh.add(rightFrame);

        // Top frame
        const topGeo = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, depth + 0.3);
        const topFrame = new THREE.Mesh(topGeo, frameMat);
        topFrame.position.set(0, height + frameThickness / 2, 0);
        topFrame.castShadow = true;
        this.mesh.add(topFrame);

        // Floor track (visual indicator)
        const trackGeo = new THREE.BoxGeometry(width + 0.5, 0.1, depth + 0.5);
        const trackMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            roughness: 0.9
        });
        const track = new THREE.Mesh(trackGeo, trackMat);
        track.position.set(0, 0.05, 0);
        this.mesh.add(track);
    }

    private createDoorPanel(width: number, height: number, depth: number, color: number): THREE.Mesh {
        const doorGeo = new THREE.BoxGeometry(width, height, depth);
        const doorMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.4
        });

        const door = new THREE.Mesh(doorGeo, doorMat);
        door.castShadow = true;
        door.receiveShadow = true;
        door.name = 'door_panel';

        // Add horizontal lines for visual detail
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });
        const lineCount = Math.floor(height / 2);
        for (let i = 1; i < lineCount; i++) {
            const lineGeo = new THREE.BoxGeometry(width - 0.3, 0.08, depth + 0.05);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(0, -height / 2 + i * 2, 0);
            door.add(line);
        }

        // Add lock indicator for locked doors
        if (this.isLocked) {
            const lockGeo = new THREE.BoxGeometry(0.5, 0.5, depth + 0.2);
            const lockMat = new THREE.MeshStandardMaterial({
                color: 0xff3333,
                emissive: 0x330000,
                emissiveIntensity: 0.5
            });
            const lock = new THREE.Mesh(lockGeo, lockMat);
            lock.position.set(width / 2 - 0.5, 0, 0);
            door.add(lock);
        }

        return door;
    }

    private calculateCollisionBox(width: number, depth: number, rotation: number): typeof this.collisionBox {
        const pos = this.config.position;
        const halfWidth = width / 2;
        const halfDepth = depth / 2;

        // Check if door is rotated (facing X or Z)
        const isRotated = Math.abs(Math.sin(rotation)) > 0.5;

        if (!isRotated) {
            // Door faces Z (horizontal in top-down view)
            return {
                minX: pos.x - halfWidth,
                maxX: pos.x + halfWidth,
                minZ: pos.z - halfDepth,
                maxZ: pos.z + halfDepth
            };
        } else {
            // Door faces X (vertical in top-down view)
            return {
                minX: pos.x - halfDepth,
                maxX: pos.x + halfDepth,
                minZ: pos.z - halfWidth,
                maxZ: pos.z + halfWidth
            };
        }
    }

    /**
     * Open the door (animate down) - only if not locked
     */
    public open(): boolean {
        if (this.isLocked) {
            console.log(`[Door] Door ${this.id} is locked!`);
            return false;
        }
        if (this.isOpen && !this.isAnimating) return true;
        this.targetY = this.openY;
        this.isAnimating = true;
        this.isOpen = true;
        return true;
    }

    /**
     * Close the door (animate up)
     */
    public close(): void {
        if (!this.isOpen && !this.isAnimating) return;
        this.targetY = this.closedY;
        this.isAnimating = true;
        this.isOpen = false;
    }

    /**
     * Toggle door state
     */
    public toggle(): boolean {
        if (this.isOpen) {
            this.close();
            return true;
        } else {
            return this.open();
        }
    }

    /**
     * Update door animation and proximity detection
     */
    public update(delta: number, playerX?: number, playerZ?: number): void {
        // Handle proximity-based opening/closing
        if (playerX !== undefined && playerZ !== undefined && !this.isLocked) {
            const dist = this.getDistanceTo(playerX, playerZ);
            const wasNearby = this.playerNearby;
            this.playerNearby = dist < DOOR_PROXIMITY.openDistance;

            // Player approached - open door
            if (this.playerNearby && !wasNearby && !this.isOpen) {
                this.open();
                this.closeTimer = 0;
            }

            // Player left proximity - start close timer
            if (!this.playerNearby && wasNearby && this.isOpen) {
                const delay = this.config.autoCloseDelay ?? DOOR_PROXIMITY.closeDelay;
                this.closeTimer = delay;
            }

            // Update close timer
            if (this.closeTimer > 0 && !this.playerNearby) {
                this.closeTimer -= delta;
                if (this.closeTimer <= 0 && this.isOpen && (this.config.autoClose !== false)) {
                    this.close();
                }
            }
        }

        // Handle animation
        if (!this.isAnimating) return;

        const diff = this.targetY - this.currentY;
        const step = this.animationSpeed * delta;

        if (Math.abs(diff) < step) {
            // Animation complete
            this.currentY = this.targetY;
            this.isAnimating = false;
        } else {
            // Continue animation
            this.currentY += Math.sign(diff) * step;
        }

        this.doorPanel.position.y = this.currentY;
    }

    /**
     * Check if a point collides with this door (when closed or closing)
     */
    public checkCollision(x: number, z: number, radius: number): boolean {
        // Door is fully open - no collision
        if (this.isOpen && this.currentY <= this.openY + 0.5) {
            return false;
        }

        // Door is closing but mostly open - reduced collision
        if (this.currentY < this.closedY * 0.5) {
            return false;
        }

        const box = this.collisionBox;
        const expandedMinX = box.minX - radius;
        const expandedMaxX = box.maxX + radius;
        const expandedMinZ = box.minZ - radius;
        const expandedMaxZ = box.maxZ + radius;

        return x >= expandedMinX && x <= expandedMaxX &&
               z >= expandedMinZ && z <= expandedMaxZ;
    }

    /**
     * Get distance to door center
     */
    public getDistanceTo(x: number, z: number): number {
        const dx = x - this.config.position.x;
        const dz = z - this.config.position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * Unlock the door
     */
    public unlock(): void {
        this.isLocked = false;
        // Update door panel color
        if (this.doorPanel.material instanceof THREE.MeshStandardMaterial) {
            const preset = DOOR_PRESETS[this.config.type] || DOOR_PRESETS.custom;
            this.doorPanel.material.color.setHex(this.config.color || preset.color);
        }
        console.log(`[Door] Door ${this.id} unlocked`);
    }

    /**
     * Lock the door
     */
    public lock(): void {
        this.isLocked = true;
        if (!this.isOpen) {
            this.close();
        }
        // Update door panel color to locked
        if (this.doorPanel.material instanceof THREE.MeshStandardMaterial) {
            this.doorPanel.material.color.setHex(0x8b4a4a);
        }
        console.log(`[Door] Door ${this.id} locked`);
    }

    /**
     * Dispose of door resources
     */
    public dispose(): void {
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        });
    }
}

/**
 * Door System - Manages all doors in the game
 */
export class DoorSystem {
    private scene: THREE.Scene;
    private doors: Map<string, Door> = new Map();
    private linkedDoors: Map<string, string[]> = new Map();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Add a door to the system
     */
    public addDoor(config: DoorConfig): Door {
        const door = new Door(config);
        this.doors.set(config.id, door);
        this.scene.add(door.mesh);

        // Handle linked doors
        if (config.linkedTo) {
            const links = this.linkedDoors.get(config.linkedTo) || [];
            links.push(config.id);
            this.linkedDoors.set(config.linkedTo, links);

            const reverseLinks = this.linkedDoors.get(config.id) || [];
            reverseLinks.push(config.linkedTo);
            this.linkedDoors.set(config.id, reverseLinks);
        }

        return door;
    }

    /**
     * Remove a door from the system
     */
    public removeDoor(id: string): void {
        const door = this.doors.get(id);
        if (door) {
            this.scene.remove(door.mesh);
            door.dispose();
            this.doors.delete(id);
        }
    }

    /**
     * Get a door by ID
     */
    public getDoor(id: string): Door | undefined {
        return this.doors.get(id);
    }

    /**
     * Get all doors
     */
    public getAllDoors(): Door[] {
        return Array.from(this.doors.values());
    }

    /**
     * Toggle a door and its linked doors
     */
    public toggleDoor(id: string): boolean {
        const door = this.doors.get(id);
        if (!door) return false;

        const success = door.toggle();
        if (!success) return false;

        // Toggle linked doors
        const linked = this.linkedDoors.get(id);
        if (linked) {
            linked.forEach(linkedId => {
                const linkedDoor = this.doors.get(linkedId);
                if (linkedDoor && linkedDoor.isOpen !== door.isOpen) {
                    linkedDoor.toggle();
                }
            });
        }
        return true;
    }

    /**
     * Open a door and its linked doors
     */
    public openDoor(id: string): boolean {
        const door = this.doors.get(id);
        if (!door) return false;

        const success = door.open();
        if (!success) return false;

        const linked = this.linkedDoors.get(id);
        if (linked) {
            linked.forEach(linkedId => {
                this.doors.get(linkedId)?.open();
            });
        }
        return true;
    }

    /**
     * Close a door and its linked doors
     */
    public closeDoor(id: string): void {
        const door = this.doors.get(id);
        if (!door) return;

        door.close();

        const linked = this.linkedDoors.get(id);
        if (linked) {
            linked.forEach(linkedId => {
                this.doors.get(linkedId)?.close();
            });
        }
    }

    /**
     * Unlock a door
     */
    public unlockDoor(id: string): void {
        const door = this.doors.get(id);
        if (door) {
            door.unlock();
        }
    }

    /**
     * Lock a door
     */
    public lockDoor(id: string): void {
        const door = this.doors.get(id);
        if (door) {
            door.lock();
        }
    }

    /**
     * Open all unlocked doors
     */
    public openAll(): void {
        this.doors.forEach(door => {
            if (!door.isLocked) door.open();
        });
    }

    /**
     * Close all doors
     */
    public closeAll(): void {
        this.doors.forEach(door => door.close());
    }

    /**
     * Update all door animations and proximity detection
     * Pass player position to enable auto-open/close
     */
    public update(delta: number, playerX?: number, playerZ?: number): void {
        this.doors.forEach(door => door.update(delta, playerX, playerZ));
    }

    /**
     * Check collision with any closed door
     * Returns the door if collision detected, null otherwise
     */
    public checkCollision(x: number, z: number, radius: number): Door | null {
        for (const door of this.doors.values()) {
            if (door.checkCollision(x, z, radius)) {
                return door;
            }
        }
        return null;
    }

    /**
     * Check collision for multiple entities (for enemies)
     * Returns array of colliding entities' indices
     */
    public checkMultipleCollisions(entities: Array<{x: number, z: number, radius: number}>): boolean[] {
        return entities.map(entity => this.checkCollision(entity.x, entity.z, entity.radius) !== null);
    }

    /**
     * Get nearest door to a position
     */
    public getNearestDoor(x: number, z: number, maxDistance: number = 10): Door | null {
        let nearest: Door | null = null;
        let nearestDist = maxDistance;

        this.doors.forEach(door => {
            const dist = door.getDistanceTo(x, z);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = door;
            }
        });

        return nearest;
    }

    /**
     * Initialize doors from map data
     */
    public initializeFromConfig(doorsConfig: DoorConfig[]): void {
        doorsConfig.forEach(config => this.addDoor(config));
        console.log(`[DoorSystem] Initialized ${doorsConfig.length} doors`);
    }

    /**
     * Clear all doors
     */
    public clear(): void {
        this.doors.forEach(door => {
            this.scene.remove(door.mesh);
            door.dispose();
        });
        this.doors.clear();
        this.linkedDoors.clear();
    }

    /**
     * Get door count
     */
    public get count(): number {
        return this.doors.size;
    }

    /**
     * Get locked door count
     */
    public get lockedCount(): number {
        let count = 0;
        this.doors.forEach(door => {
            if (door.isLocked) count++;
        });
        return count;
    }

    /**
     * Get doors data for minimap
     */
    public getDoorsForMinimap(): Array<{ x: number; z: number; width: number; rotation: number; isOpen: boolean }> {
        const result: Array<{ x: number; z: number; width: number; rotation: number; isOpen: boolean }> = [];
        this.doors.forEach(door => {
            result.push({
                x: door.config.position.x,
                z: door.config.position.z,
                width: door.config.width,
                rotation: door.config.rotation || 0,
                isOpen: door.isOpen
            });
        });
        return result;
    }
}
