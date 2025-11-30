import * as THREE from 'three';
import { RoomInstance } from './room-system';

/**
 * Wall Collision System
 *
 * Handles collision detection and response for:
 * - Player vs walls
 * - Enemies vs walls
 * - Projectiles vs walls
 *
 * Uses Box3 (AABB) for fast collision detection
 */
export class WallCollisionSystem {
    private scene: THREE.Scene;

    // All wall collision boxes in the world
    private wallBoxes: THREE.Box3[] = [];
    private wallMeshes: THREE.Mesh[] = [];

    // Spatial partitioning for optimization
    private spatialGrid: Map<string, THREE.Box3[]> = new Map();
    private gridCellSize = 20;  // Units per cell

    // Debug visualization
    private debugHelpers: THREE.Box3Helper[] = [];
    private debugEnabled = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Register walls from a room
     */
    registerRoomWalls(room: RoomInstance): void {
        for (const wallMesh of room.walls) {
            if (!wallMesh.userData['isWall']) continue;

            // Calculate world-space bounding box
            wallMesh.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(wallMesh);

            this.wallBoxes.push(box);
            this.wallMeshes.push(wallMesh);

            // Add to spatial grid
            this.addToSpatialGrid(box);

            // Create debug helper if enabled
            if (this.debugEnabled) {
                const helper = new THREE.Box3Helper(box, new THREE.Color(0xff0000));
                this.scene.add(helper);
                this.debugHelpers.push(helper);
            }
        }
    }

    /**
     * Register walls from map data (legacy format)
     */
    registerWallMesh(mesh: THREE.Mesh): void {
        mesh.userData['isWall'] = true;
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);

        this.wallBoxes.push(box);
        this.wallMeshes.push(mesh);
        this.addToSpatialGrid(box);
    }

    /**
     * Register multiple walls at once
     */
    registerWalls(meshes: THREE.Mesh[]): void {
        for (const mesh of meshes) {
            this.registerWallMesh(mesh);
        }
    }

    /**
     * Unregister walls from a room
     */
    unregisterRoomWalls(room: RoomInstance): void {
        for (const wallMesh of room.walls) {
            const index = this.wallMeshes.indexOf(wallMesh);
            if (index !== -1) {
                this.wallBoxes.splice(index, 1);
                this.wallMeshes.splice(index, 1);
            }
        }

        // Rebuild spatial grid
        this.rebuildSpatialGrid();
    }

    /**
     * Clear all registered walls
     */
    clear(): void {
        this.wallBoxes = [];
        this.wallMeshes = [];
        this.spatialGrid.clear();

        // Remove debug helpers
        for (const helper of this.debugHelpers) {
            this.scene.remove(helper);
        }
        this.debugHelpers = [];
    }

    /**
     * Add box to spatial grid
     */
    private addToSpatialGrid(box: THREE.Box3): void {
        const minCell = this.getCellKey(box.min.x, box.min.z);
        const maxCell = this.getCellKey(box.max.x, box.max.z);

        const minX = Math.floor(box.min.x / this.gridCellSize);
        const maxX = Math.floor(box.max.x / this.gridCellSize);
        const minZ = Math.floor(box.min.z / this.gridCellSize);
        const maxZ = Math.floor(box.max.z / this.gridCellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                const key = `${x},${z}`;
                if (!this.spatialGrid.has(key)) {
                    this.spatialGrid.set(key, []);
                }
                this.spatialGrid.get(key)!.push(box);
            }
        }
    }

    /**
     * Get cell key for a position
     */
    private getCellKey(x: number, z: number): string {
        const cellX = Math.floor(x / this.gridCellSize);
        const cellZ = Math.floor(z / this.gridCellSize);
        return `${cellX},${cellZ}`;
    }

    /**
     * Rebuild spatial grid
     */
    private rebuildSpatialGrid(): void {
        this.spatialGrid.clear();
        for (const box of this.wallBoxes) {
            this.addToSpatialGrid(box);
        }
    }

    /**
     * Get walls near a position (for optimization)
     */
    private getNearbyWalls(x: number, z: number, radius: number): THREE.Box3[] {
        const nearby: Set<THREE.Box3> = new Set();

        const minCellX = Math.floor((x - radius) / this.gridCellSize);
        const maxCellX = Math.floor((x + radius) / this.gridCellSize);
        const minCellZ = Math.floor((z - radius) / this.gridCellSize);
        const maxCellZ = Math.floor((z + radius) / this.gridCellSize);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cz = minCellZ; cz <= maxCellZ; cz++) {
                const key = `${cx},${cz}`;
                const cellWalls = this.spatialGrid.get(key);
                if (cellWalls) {
                    cellWalls.forEach(box => nearby.add(box));
                }
            }
        }

        return Array.from(nearby);
    }

    /**
     * Check collision and get push-out vector for a sphere
     * Used for player and enemies
     */
    checkSphereCollision(
        position: THREE.Vector3,
        radius: number
    ): { collides: boolean; pushVector: THREE.Vector3 } {
        const result = {
            collides: false,
            pushVector: new THREE.Vector3()
        };

        // Create sphere bounding box for broad phase
        const sphereBox = new THREE.Box3(
            new THREE.Vector3(position.x - radius, position.y - radius, position.z - radius),
            new THREE.Vector3(position.x + radius, position.y + radius, position.z + radius)
        );

        // Get nearby walls
        const nearbyWalls = this.getNearbyWalls(position.x, position.z, radius + this.gridCellSize);

        for (const wallBox of nearbyWalls) {
            // Broad phase: AABB check
            if (!sphereBox.intersectsBox(wallBox)) continue;

            // Narrow phase: sphere vs box
            const closestPoint = new THREE.Vector3();
            wallBox.clampPoint(position, closestPoint);

            const distance = position.distanceTo(closestPoint);

            if (distance < radius) {
                result.collides = true;

                // Calculate push direction
                const pushDir = new THREE.Vector3()
                    .subVectors(position, closestPoint)
                    .normalize();

                // If inside box (distance = 0), push to nearest edge
                if (distance < 0.01) {
                    const boxCenter = new THREE.Vector3();
                    wallBox.getCenter(boxCenter);
                    pushDir.subVectors(position, boxCenter).normalize();
                }

                // Calculate penetration depth
                const penetration = radius - distance;

                // Accumulate push vector
                result.pushVector.add(
                    pushDir.multiplyScalar(penetration + 0.1)  // Small buffer
                );
            }
        }

        return result;
    }

    /**
     * Check collision for a moving entity and return safe position
     */
    resolveCollision(
        currentPosition: THREE.Vector3,
        targetPosition: THREE.Vector3,
        radius: number
    ): THREE.Vector3 {
        // First check target position
        const collision = this.checkSphereCollision(targetPosition, radius);

        if (!collision.collides) {
            return targetPosition.clone();
        }

        // Apply push vector to get safe position
        const safePosition = targetPosition.clone().add(collision.pushVector);

        // Verify safe position is actually safe
        const verifyCollision = this.checkSphereCollision(safePosition, radius);
        if (verifyCollision.collides) {
            // Still colliding, revert to current position
            return currentPosition.clone();
        }

        return safePosition;
    }

    /**
     * Check if a ray intersects any wall (for projectiles, line of sight)
     */
    raycastWalls(
        origin: THREE.Vector3,
        direction: THREE.Vector3,
        maxDistance: number
    ): { hit: boolean; distance: number; point: THREE.Vector3 | null } {
        const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
        const intersects = raycaster.intersectObjects(this.wallMeshes, false);

        if (intersects.length > 0) {
            return {
                hit: true,
                distance: intersects[0].distance,
                point: intersects[0].point
            };
        }

        return { hit: false, distance: maxDistance, point: null };
    }

    /**
     * Check if there's line of sight between two points
     */
    hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
        const direction = new THREE.Vector3().subVectors(to, from);
        const distance = direction.length();
        direction.normalize();

        const result = this.raycastWalls(from, direction, distance);
        return !result.hit;
    }

    /**
     * Get all walls (for debug/visualization)
     */
    getWallCount(): number {
        return this.wallBoxes.length;
    }

    /**
     * Get all wall data for minimap rendering
     * Returns simplified wall data without Three.js dependencies
     */
    getWallsForMinimap(): Array<{
        x: number;
        z: number;
        width: number;
        depth: number;
        rotation: number;
    }> {
        return this.wallMeshes.map(mesh => ({
            x: mesh.position.x,
            z: mesh.position.z,
            width: mesh.userData['wallWidth'] || mesh.scale.x || 10,
            depth: mesh.userData['wallDepth'] || mesh.scale.z || 2,
            rotation: mesh.rotation.y
        }));
    }

    /**
     * Get all wall meshes (for external systems)
     */
    getWallMeshes(): THREE.Mesh[] {
        return [...this.wallMeshes];
    }

    /**
     * Toggle debug visualization
     */
    toggleDebug(): boolean {
        this.debugEnabled = !this.debugEnabled;

        if (this.debugEnabled) {
            // Create helpers for all walls
            for (const box of this.wallBoxes) {
                const helper = new THREE.Box3Helper(box, new THREE.Color(0xff0000));
                this.scene.add(helper);
                this.debugHelpers.push(helper);
            }
        } else {
            // Remove all helpers
            for (const helper of this.debugHelpers) {
                this.scene.remove(helper);
            }
            this.debugHelpers = [];
        }

        return this.debugEnabled;
    }

    /**
     * Update collision boxes (call if walls move)
     */
    updateWallBoxes(): void {
        for (let i = 0; i < this.wallMeshes.length; i++) {
            this.wallMeshes[i].updateMatrixWorld(true);
            this.wallBoxes[i].setFromObject(this.wallMeshes[i]);
        }

        this.rebuildSpatialGrid();

        // Update debug helpers
        if (this.debugEnabled) {
            for (let i = 0; i < this.debugHelpers.length; i++) {
                this.debugHelpers[i].box = this.wallBoxes[i];
            }
        }
    }

    /**
     * Dispose system
     */
    dispose(): void {
        this.clear();
    }
}

/**
 * Helper class for entity collision resolution
 */
export class EntityCollisionHelper {
    private wallSystem: WallCollisionSystem;

    constructor(wallSystem: WallCollisionSystem) {
        this.wallSystem = wallSystem;
    }

    /**
     * Apply wall collision to player movement
     */
    resolvePlayerMovement(
        player: { position: THREE.Vector3 },
        velocityX: number,
        velocityZ: number,
        radius: number,
        delta: number
    ): { x: number; z: number } {
        const currentPos = player.position.clone();
        const targetPos = currentPos.clone();
        targetPos.x += velocityX * delta;
        targetPos.z += velocityZ * delta;

        // Try moving in both axes
        const resolvedPos = this.wallSystem.resolveCollision(currentPos, targetPos, radius);

        // If blocked in both, try each axis separately
        if (resolvedPos.equals(currentPos)) {
            // Try X only
            const targetX = currentPos.clone();
            targetX.x += velocityX * delta;
            const resolvedX = this.wallSystem.resolveCollision(currentPos, targetX, radius);

            // Try Z only
            const targetZ = currentPos.clone();
            targetZ.z += velocityZ * delta;
            const resolvedZ = this.wallSystem.resolveCollision(currentPos, targetZ, radius);

            return {
                x: resolvedX.x - currentPos.x,
                z: resolvedZ.z - currentPos.z
            };
        }

        return {
            x: resolvedPos.x - currentPos.x,
            z: resolvedPos.z - currentPos.z
        };
    }

    /**
     * Apply wall collision to enemy movement
     */
    resolveEnemyMovement(
        enemy: { position: THREE.Vector3 },
        targetPosition: THREE.Vector3,
        speed: number,
        radius: number,
        delta: number
    ): THREE.Vector3 {
        const currentPos = enemy.position.clone();
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, currentPos)
            .normalize();

        const moveDistance = speed * delta;
        const nextPos = currentPos.clone().add(direction.multiplyScalar(moveDistance));

        return this.wallSystem.resolveCollision(currentPos, nextPos, radius);
    }

    /**
     * Check if projectile hits wall
     */
    checkProjectileWallHit(
        projectile: { position: THREE.Vector3; velocity: THREE.Vector3 },
        delta: number
    ): boolean {
        const origin = projectile.position.clone();
        const direction = projectile.velocity.clone().normalize();
        const distance = projectile.velocity.length() * delta;

        const result = this.wallSystem.raycastWalls(origin, direction, distance);
        return result.hit;
    }
}
