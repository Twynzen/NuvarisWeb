import * as THREE from 'three';

/**
 * SpatialGrid - Optimizes collision detection from O(n×m) to O(n+m)
 *
 * Divides the game world into a grid of cells. Entities are assigned
 * to cells based on their position. When checking collisions, only
 * entities in nearby cells are considered.
 *
 * Performance: With 50 enemies and 10 projectiles:
 * - Before: 50 × 10 = 500 collision checks per frame
 * - After: ~50 checks per frame (only nearby entities)
 */
export class SpatialGrid<T extends { mesh: { position: THREE.Vector3 }; isDead?: boolean }> {
    private cellSize: number;
    private grid: Map<string, T[]> = new Map();
    private entityCount = 0;

    /**
     * @param cellSize Size of each grid cell (default 10 units)
     *                 Smaller = more precise but more overhead
     *                 Larger = less precise but faster updates
     */
    constructor(cellSize: number = 10) {
        this.cellSize = cellSize;
    }

    /**
     * Clear and rebuild the grid with new entity positions.
     * Call this once per frame before collision checks.
     */
    update(entities: T[]): void {
        this.grid.clear();
        this.entityCount = 0;

        for (const entity of entities) {
            // Skip dead entities
            if (entity.isDead) continue;

            const key = this.getKey(entity.mesh.position);

            if (!this.grid.has(key)) {
                this.grid.set(key, []);
            }
            this.grid.get(key)!.push(entity);
            this.entityCount++;
        }
    }

    /**
     * Get all entities within a radius of a position.
     * Only checks cells that could contain nearby entities.
     *
     * @param position Center position to search from
     * @param radius Search radius (entities within this distance are returned)
     * @returns Array of potentially nearby entities (may include some outside radius)
     */
    getNearby(position: THREE.Vector3, radius: number): T[] {
        const results: T[] = [];

        // Calculate how many cells the radius spans
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerX = Math.floor(position.x / this.cellSize);
        const centerZ = Math.floor(position.z / this.cellSize);

        // Check all cells within the radius
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const key = `${centerX + dx},${centerZ + dz}`;
                const cell = this.grid.get(key);
                if (cell) {
                    results.push(...cell);
                }
            }
        }

        return results;
    }

    /**
     * Get all entities in a specific cell
     */
    getCell(x: number, z: number): T[] {
        const key = `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
        return this.grid.get(key) || [];
    }

    /**
     * Get statistics for debugging
     */
    getStats(): { cellCount: number; entityCount: number; avgPerCell: number } {
        const cellCount = this.grid.size;
        return {
            cellCount,
            entityCount: this.entityCount,
            avgPerCell: cellCount > 0 ? this.entityCount / cellCount : 0
        };
    }

    /**
     * Convert world position to grid cell key
     */
    private getKey(pos: THREE.Vector3): string {
        const x = Math.floor(pos.x / this.cellSize);
        const z = Math.floor(pos.z / this.cellSize);
        return `${x},${z}`;
    }
}

/**
 * Specialized grid for projectile-enemy collision optimization
 */
export class ProjectileCollisionGrid {
    private enemyGrid: SpatialGrid<any>;
    private collisionRadius: number;

    /**
     * @param cellSize Grid cell size
     * @param collisionRadius Default collision check radius for projectiles
     */
    constructor(cellSize: number = 8, collisionRadius: number = 3) {
        this.enemyGrid = new SpatialGrid(cellSize);
        this.collisionRadius = collisionRadius;
    }

    /**
     * Update enemy positions in the grid
     */
    updateEnemies(enemies: any[]): void {
        this.enemyGrid.update(enemies);
    }

    /**
     * Get enemies potentially colliding with a projectile
     */
    getEnemiesNear(projectilePosition: THREE.Vector3, radius?: number): any[] {
        return this.enemyGrid.getNearby(projectilePosition, radius || this.collisionRadius);
    }

    /**
     * Get grid statistics
     */
    getStats() {
        return this.enemyGrid.getStats();
    }
}
