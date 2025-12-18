import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { PlayerThree } from '../entities/player.three';
import {
    GameEventBus,
    GameEventType,
    SpawnEvent,
    gameEventBus
} from './game-events';

/**
 * Entity statistics
 */
export interface EntityStats {
    totalEnemies: number;
    aliveEnemies: number;
    mindControlledEnemies: number;
    totalProjectiles: number;
    activeProjectiles: number;
    totalSpawned: number;
    totalKilled: number;
}

/**
 * EntityManager - Centralized management of all game entities
 *
 * Responsibilities:
 * - Enemy spawning and removal
 * - Projectile management
 * - Entity lifecycle management
 * - Entity queries (find nearest, get by type, etc.)
 *
 * Benefits:
 * - Single source of truth for entities
 * - Clean API for entity operations
 * - Automatic cleanup of dead entities
 */
@Injectable({ providedIn: 'root' })
export class EntityManager {
    private scene!: THREE.Scene;
    private eventBus: GameEventBus;

    // Entity collections
    private enemies: EnemyThree[] = [];
    private projectiles: ProjectileThree[] = [];
    private player: PlayerThree | null = null;

    // Statistics
    private stats: EntityStats = {
        totalEnemies: 0,
        aliveEnemies: 0,
        mindControlledEnemies: 0,
        totalProjectiles: 0,
        activeProjectiles: 0,
        totalSpawned: 0,
        totalKilled: 0
    };

    // Configuration
    private maxEnemies = 200;
    private maxProjectiles = 100;

    constructor() {
        this.eventBus = gameEventBus;
    }

    /**
     * Initialize with scene reference
     */
    initialize(scene: THREE.Scene): void {
        this.scene = scene;
        console.log('[EntityManager] Initialized');
    }

    /**
     * Set player reference
     */
    setPlayer(player: PlayerThree): void {
        this.player = player;
    }

    /**
     * Get player reference
     */
    getPlayer(): PlayerThree | null {
        return this.player;
    }

    // ==================== ENEMY MANAGEMENT ====================

    /**
     * Spawn a new enemy
     */
    spawnEnemy(type: 'spider' | 'worm', x: number, z: number, portal?: any): EnemyThree | null {
        if (this.enemies.length >= this.maxEnemies) {
            console.warn('[EntityManager] Max enemies reached');
            return null;
        }

        const enemy = new EnemyThree(this.scene, x, z, type);

        if (portal) {
            enemy.homePortal = portal;
            enemy.isPatrolling = true;
            enemy.setPatrolArea(
                new THREE.Vector3(portal.position.x, 0, portal.position.z),
                portal.patrolRadius || 8
            );
        }

        this.enemies.push(enemy);
        this.stats.totalSpawned++;
        this.updateEnemyStats();

        // Emit spawn event
        this.eventBus.emit<SpawnEvent>({
            type: GameEventType.ENEMY_SPAWNED,
            enemyId: enemy.mesh.uuid,
            enemyType: type,
            position: new THREE.Vector3(x, 0, z)
        });

        return enemy;
    }

    /**
     * Get all enemies
     */
    getEnemies(): EnemyThree[] {
        return this.enemies;
    }

    /**
     * Get alive enemies only
     */
    getAliveEnemies(): EnemyThree[] {
        return this.enemies.filter(e => !e.isDead);
    }

    /**
     * Get mind-controlled enemies (minions)
     */
    getMinions(): EnemyThree[] {
        return this.enemies.filter(e => e.isMindControlled && !e.isDead);
    }

    /**
     * Find nearest enemy to a position
     */
    findNearestEnemy(position: THREE.Vector3, maxRange?: number): EnemyThree | null {
        let nearest: EnemyThree | null = null;
        let nearestDist = maxRange || Infinity;

        for (const enemy of this.enemies) {
            if (enemy.isDead || enemy.isMindControlled) continue;

            const dist = position.distanceTo(enemy.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    /**
     * Find enemies within range
     */
    findEnemiesInRange(position: THREE.Vector3, range: number): EnemyThree[] {
        return this.enemies.filter(e => {
            if (e.isDead) return false;
            return position.distanceTo(e.mesh.position) <= range;
        });
    }

    /**
     * Remove dead enemies from scene and array
     */
    cleanupDeadEnemies(): number {
        let removed = 0;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.isDead) {
                this.scene.remove(enemy.mesh);
                if (enemy.debugGroup) {
                    this.scene.remove(enemy.debugGroup);
                }
                this.enemies.splice(i, 1);
                removed++;
                this.stats.totalKilled++;
            }
        }

        if (removed > 0) {
            this.updateEnemyStats();
        }

        return removed;
    }

    /**
     * Kill all enemies
     */
    killAllEnemies(): number {
        const count = this.enemies.length;

        for (const enemy of this.enemies) {
            enemy.health = 0;
            enemy.isDead = true;
            this.scene.remove(enemy.mesh);
            if (enemy.debugGroup) {
                this.scene.remove(enemy.debugGroup);
            }
        }

        this.enemies = [];
        this.stats.totalKilled += count;
        this.updateEnemyStats();

        return count;
    }

    // ==================== PROJECTILE MANAGEMENT ====================

    /**
     * Add a projectile
     */
    addProjectile(projectile: ProjectileThree): void {
        if (this.projectiles.length >= this.maxProjectiles) {
            // Remove oldest projectile
            const oldest = this.projectiles.shift();
            if (oldest) {
                this.scene.remove(oldest.mesh);
            }
        }

        this.projectiles.push(projectile);
        this.stats.totalProjectiles++;
        this.updateProjectileStats();
    }

    /**
     * Get all projectiles
     */
    getProjectiles(): ProjectileThree[] {
        return this.projectiles;
    }

    /**
     * Remove dead projectiles
     */
    cleanupDeadProjectiles(): number {
        let removed = 0;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (proj.isDead) {
                this.scene.remove(proj.mesh);
                this.projectiles.splice(i, 1);
                removed++;
            }
        }

        if (removed > 0) {
            this.updateProjectileStats();
        }

        return removed;
    }

    /**
     * Clear all projectiles
     */
    clearAllProjectiles(): void {
        for (const proj of this.projectiles) {
            this.scene.remove(proj.mesh);
        }
        this.projectiles = [];
        this.updateProjectileStats();
    }

    // ==================== UPDATE & STATS ====================

    /**
     * Update all entities
     */
    updateEntities(
        delta: number,
        currentTime: number,
        mapBounds: number,
        isPlayerInvisible: boolean
    ): void {
        // Update enemies
        for (const enemy of this.enemies) {
            if (!enemy.isDead && this.player) {
                enemy.update(delta, this.player, mapBounds, currentTime, isPlayerInvisible, this.enemies);
            }
        }

        // Update projectiles
        for (const proj of this.projectiles) {
            proj.update(delta);
        }
    }

    /**
     * Get entity statistics
     */
    getStats(): EntityStats {
        return { ...this.stats };
    }

    /**
     * Update enemy statistics
     */
    private updateEnemyStats(): void {
        this.stats.totalEnemies = this.enemies.length;
        this.stats.aliveEnemies = this.enemies.filter(e => !e.isDead).length;
        this.stats.mindControlledEnemies = this.enemies.filter(e => e.isMindControlled && !e.isDead).length;
    }

    /**
     * Update projectile statistics
     */
    private updateProjectileStats(): void {
        this.stats.activeProjectiles = this.projectiles.filter(p => !p.isDead).length;
    }

    /**
     * Clear all entities (for game reset)
     */
    clearAll(): void {
        // Clear enemies
        for (const enemy of this.enemies) {
            this.scene.remove(enemy.mesh);
            if (enemy.debugGroup) {
                this.scene.remove(enemy.debugGroup);
            }
        }
        this.enemies = [];

        // Clear projectiles
        for (const proj of this.projectiles) {
            this.scene.remove(proj.mesh);
        }
        this.projectiles = [];

        // Reset stats
        this.stats = {
            totalEnemies: 0,
            aliveEnemies: 0,
            mindControlledEnemies: 0,
            totalProjectiles: 0,
            activeProjectiles: 0,
            totalSpawned: 0,
            totalKilled: 0
        };

        console.log('[EntityManager] All entities cleared');
    }
}
