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
    type: 'small' | 'large' | 'garage';
    isOpen: boolean;         // Initial state
    autoClose?: boolean;     // Auto close after player passes
    autoCloseDelay?: number; // Delay before auto close (ms)
    linkedTo?: string;       // ID of linked door (opens/closes together)
    color?: number;          // Door color
}

/**
 * Door sizes based on player size (radius 1.5, sprite 3x3)
 * Player needs at least 4 units to pass comfortably
 */
export const DOOR_PRESETS = {
    small: {
        width: 5,       // Single person door
        height: 8,
        depth: 2,
        color: 0x4a5568
    },
    large: {
        width: 8,       // Double door
        height: 8,
        depth: 2,
        color: 0x5a6578
    },
    garage: {
        width: 15,      // Vehicle/large equipment door
        height: 10,
        depth: 3,
        color: 0x3a4558
    }
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
    public isAnimating: boolean = false;

    // Animation state
    private targetY: number = 0;
    private currentY: number = 0;
    private openY: number;
    private closedY: number;
    private animationSpeed: number = 8; // Units per second

    // Collision box (only active when closed)
    public collisionBox: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
    };

    constructor(config: DoorConfig) {
        this.id = config.id;
        this.config = config;
        this.isOpen = config.isOpen;
        this.mesh = new THREE.Group();

        const preset = DOOR_PRESETS[config.type];
        const width = config.width || preset.width;
        const height = config.height || preset.height;
        const depth = config.depth || preset.depth;
        const color = config.color || preset.color;

        // Calculate Y positions
        this.closedY = height / 2;  // Door visible (center at half height)
        this.openY = -height / 2 - 0.5;  // Door hidden below ground
        this.currentY = this.isOpen ? this.openY : this.closedY;
        this.targetY = this.currentY;

        // Create door frame (static)
        this.createFrame(width, height, depth);

        // Create door panel (animated)
        this.doorPanel = this.createDoorPanel(width, height, depth, color);
        this.doorPanel.position.y = this.currentY;
        this.mesh.add(this.doorPanel);

        // Position the door group
        this.mesh.position.set(config.position.x, 0, config.position.z);
        if (config.rotation) {
            this.mesh.rotation.y = config.rotation;
        }

        // Calculate collision box
        this.collisionBox = this.calculateCollisionBox(width, depth, config.rotation || 0);

        // Set name for identification
        this.mesh.name = `door_${config.id}`;
        this.mesh.userData['type'] = 'door';
        this.mesh.userData['doorId'] = config.id;
    }

    private createFrame(width: number, height: number, depth: number): void {
        const frameThickness = 0.5;
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            roughness: 0.7,
            metalness: 0.3
        });

        // Left frame
        const leftGeo = new THREE.BoxGeometry(frameThickness, height + 1, depth + 0.5);
        const leftFrame = new THREE.Mesh(leftGeo, frameMat);
        leftFrame.position.set(-width / 2 - frameThickness / 2, height / 2, 0);
        leftFrame.castShadow = true;
        this.mesh.add(leftFrame);

        // Right frame
        const rightFrame = leftFrame.clone();
        rightFrame.position.set(width / 2 + frameThickness / 2, height / 2, 0);
        this.mesh.add(rightFrame);

        // Top frame
        const topGeo = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, depth + 0.5);
        const topFrame = new THREE.Mesh(topGeo, frameMat);
        topFrame.position.set(0, height + frameThickness / 2, 0);
        topFrame.castShadow = true;
        this.mesh.add(topFrame);

        // Floor track (visual indicator)
        const trackGeo = new THREE.BoxGeometry(width + 1, 0.1, depth + 1);
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
            const lineGeo = new THREE.BoxGeometry(width - 0.5, 0.1, depth + 0.1);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(0, -height / 2 + i * 2, 0);
            door.add(line);
        }

        return door;
    }

    private calculateCollisionBox(width: number, depth: number, rotation: number): typeof this.collisionBox {
        const pos = this.config.position;
        const halfWidth = width / 2;
        const halfDepth = depth / 2;

        // Simple AABB - for rotated doors, we use the larger dimension
        if (Math.abs(rotation % Math.PI) < 0.1) {
            // Door faces Z
            return {
                minX: pos.x - halfWidth,
                maxX: pos.x + halfWidth,
                minZ: pos.z - halfDepth,
                maxZ: pos.z + halfDepth
            };
        } else {
            // Door faces X (rotated 90 degrees)
            return {
                minX: pos.x - halfDepth,
                maxX: pos.x + halfDepth,
                minZ: pos.z - halfWidth,
                maxZ: pos.z + halfWidth
            };
        }
    }

    /**
     * Open the door (animate down)
     */
    public open(): void {
        if (this.isOpen && !this.isAnimating) return;
        this.targetY = this.openY;
        this.isAnimating = true;
        this.isOpen = true;
        console.log(`[Door] Opening door: ${this.id}`);
    }

    /**
     * Close the door (animate up)
     */
    public close(): void {
        if (!this.isOpen && !this.isAnimating) return;
        this.targetY = this.closedY;
        this.isAnimating = true;
        this.isOpen = false;
        console.log(`[Door] Closing door: ${this.id}`);
    }

    /**
     * Toggle door state
     */
    public toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Update door animation
     */
    public update(delta: number): void {
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
     * Check if a point collides with this door (when closed)
     */
    public checkCollision(x: number, z: number, radius: number): boolean {
        // If door is open or mostly open, no collision
        if (this.isOpen && this.currentY < this.closedY * 0.3) {
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

        console.log(`[DoorSystem] Added door: ${config.id} (${config.type})`);
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
    public toggleDoor(id: string): void {
        const door = this.doors.get(id);
        if (!door) return;

        door.toggle();

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
    }

    /**
     * Open a door and its linked doors
     */
    public openDoor(id: string): void {
        const door = this.doors.get(id);
        if (!door) return;

        door.open();

        const linked = this.linkedDoors.get(id);
        if (linked) {
            linked.forEach(linkedId => {
                this.doors.get(linkedId)?.open();
            });
        }
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
     * Open all doors
     */
    public openAll(): void {
        this.doors.forEach(door => door.open());
    }

    /**
     * Close all doors
     */
    public closeAll(): void {
        this.doors.forEach(door => door.close());
    }

    /**
     * Update all door animations
     */
    public update(delta: number): void {
        this.doors.forEach(door => door.update(delta));
    }

    /**
     * Check collision with any closed door
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
}
