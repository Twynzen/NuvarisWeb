import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { Subscription } from 'rxjs';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { PlayerThree } from '../entities/player.three';
import { SpatialGrid } from '../systems/spatial-grid';
import { CharacterAbilityThree } from '../abilities/character-ability-three';
import { ProyectoAAbilityThree } from '../abilities/proyecto-a-ability-three';
import {
    GameEventBus,
    GameEventType,
    KillEvent,
    DamageEvent,
    ProjectileHitEvent,
    HealEvent,
    gameEventBus
} from './game-events';

/**
 * Combat configuration
 */
export interface CombatConfig {
    projectileCollisionRadius: number;
    enemyAttackRange: number;
    playerDamageImmunityDuration: number;
    damageMultiplier: number;
}

/**
 * Result of a combat check
 */
export interface CombatResult {
    enemiesHit: number;
    damageDealt: number;
    enemiesKilled: number;
    xpGained: number;
    scoreGained: number;
}

/**
 * CombatSystem - Handles all combat-related logic
 *
 * Responsibilities:
 * - Projectile-enemy collision detection (using SpatialGrid)
 * - Enemy-player collision detection
 * - Damage calculation and application
 * - Kill tracking and rewards
 * - Combat event emission
 *
 * Uses GameEventBus for decoupled communication with other systems.
 */
@Injectable({ providedIn: 'root' })
export class CombatSystem {
    private spatialGrid = new SpatialGrid<EnemyThree>(8);
    private eventBus: GameEventBus;
    private subscriptions: Subscription[] = [];

    // Combat state
    private playerDamageImmunityTimer = 0;
    private lastCombatResult: CombatResult = {
        enemiesHit: 0,
        damageDealt: 0,
        enemiesKilled: 0,
        xpGained: 0,
        scoreGained: 0
    };

    // Configuration
    private config: CombatConfig = {
        projectileCollisionRadius: 1.5,
        enemyAttackRange: 5,
        playerDamageImmunityDuration: 0.1,
        damageMultiplier: 1
    };

    // Statistics
    private stats = {
        totalDamageDealt: 0,
        totalEnemiesKilled: 0,
        totalXPAwarded: 0,
        collisionChecksThisFrame: 0
    };

    constructor() {
        this.eventBus = gameEventBus;
    }

    /**
     * Initialize combat system
     */
    initialize(): void {
        console.log('[CombatSystem] Initialized');
    }

    /**
     * Update combat timers
     */
    update(delta: number): void {
        // Update damage immunity timer
        if (this.playerDamageImmunityTimer > 0) {
            this.playerDamageImmunityTimer -= delta;
        }

        // Reset per-frame stats
        this.stats.collisionChecksThisFrame = 0;
    }

    /**
     * Set damage multiplier (from dev commands or abilities)
     */
    setDamageMultiplier(multiplier: number): void {
        this.config.damageMultiplier = multiplier;
    }

    /**
     * Update spatial grid with current enemy positions
     * Call this once per frame before collision checks
     */
    updateSpatialGrid(enemies: EnemyThree[]): void {
        this.spatialGrid.update(enemies);
    }

    /**
     * Process projectile collisions with enemies
     * Returns combat result with stats
     */
    processProjectileCollisions(
        projectiles: ProjectileThree[],
        enemies: EnemyThree[],
        scene: THREE.Scene,
        characterAbility?: CharacterAbilityThree
    ): CombatResult {
        const result: CombatResult = {
            enemiesHit: 0,
            damageDealt: 0,
            enemiesKilled: 0,
            xpGained: 0,
            scoreGained: 0
        };

        // Process each projectile
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];

            if (proj.isDead) {
                projectiles.splice(i, 1);
                continue;
            }

            // Get nearby enemies using spatial grid (O(1) lookup)
            const nearbyEnemies = this.spatialGrid.getNearby(
                proj.mesh.position,
                this.config.projectileCollisionRadius * 2
            );

            this.stats.collisionChecksThisFrame += nearbyEnemies.length;

            // Check collision with nearby enemies
            for (const enemy of nearbyEnemies) {
                if (enemy.isMindControlled || enemy.isDead) continue;

                const distance = proj.mesh.position.distanceTo(enemy.mesh.position);

                if (distance < this.config.projectileCollisionRadius) {
                    // Calculate damage
                    let damage = proj.damage * this.config.damageMultiplier;

                    // Apply ability modifiers
                    if (characterAbility instanceof ProyectoAAbilityThree) {
                        if (characterAbility.isBerserkActive()) {
                            damage = 999999; // One-hit kill during berserk
                        }
                        damage *= characterAbility.getDamageMultiplier();
                    }

                    // Emit projectile hit event
                    this.eventBus.emit<ProjectileHitEvent>({
                        type: GameEventType.PROJECTILE_HIT,
                        projectileId: proj.mesh.uuid,
                        targetId: enemy.mesh.uuid,
                        damage: damage,
                        position: enemy.mesh.position.clone()
                    });

                    // Call ability hook (for chain lightning, mind control, etc.)
                    if (characterAbility) {
                        characterAbility.onProjectileHit(proj, enemy, damage, scene, enemies);
                    }

                    // Apply damage
                    const reward = enemy.takeDamage(damage, scene);

                    result.enemiesHit++;
                    result.damageDealt += damage;
                    this.stats.totalDamageDealt += damage;

                    if (reward) {
                        // Enemy killed
                        result.enemiesKilled++;
                        result.xpGained += reward.xp;
                        result.scoreGained += reward.score;
                        this.stats.totalEnemiesKilled++;
                        this.stats.totalXPAwarded += reward.xp;

                        // Emit kill event
                        this.eventBus.emit<KillEvent>({
                            type: GameEventType.ENEMY_KILLED,
                            enemyId: enemy.mesh.uuid,
                            enemyType: enemy.getType(),
                            position: enemy.mesh.position.clone(),
                            xpReward: reward.xp,
                            scoreReward: reward.score,
                            killedBy: 'player'
                        });
                    }

                    // Destroy projectile
                    proj.mesh.visible = false;
                    proj.isDead = true;
                    projectiles.splice(i, 1);
                    break; // Projectile destroyed, stop checking enemies
                }
            }
        }

        this.lastCombatResult = result;
        return result;
    }

    /**
     * Check if an enemy can damage the player
     */
    checkEnemyAttackOnPlayer(
        enemy: EnemyThree,
        player: PlayerThree,
        godMode: boolean,
        invisible: boolean
    ): { canDamage: boolean; damage: number } {
        // Skip if immune
        if (godMode || invisible || this.playerDamageImmunityTimer > 0) {
            return { canDamage: false, damage: 0 };
        }

        // Skip dead or mind-controlled enemies
        if (enemy.isDead || enemy.isMindControlled) {
            return { canDamage: false, damage: 0 };
        }

        // Check if enemy is attacking and in range
        if (!enemy.isCurrentlyAttacking()) {
            return { canDamage: false, damage: 0 };
        }

        // Check if already dealt damage this attack
        if (enemy.hasDealtDamage()) {
            return { canDamage: false, damage: 0 };
        }

        // Check distance
        const distance = enemy.mesh.position.distanceTo(player.mesh.position);
        const collisionThreshold = PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS;

        if (distance > collisionThreshold) {
            return { canDamage: false, damage: 0 };
        }

        return { canDamage: true, damage: enemy.getAttackDamage() };
    }

    /**
     * Apply damage to player and start immunity
     */
    applyDamageToPlayer(damage: number, playerPosition: THREE.Vector3): void {
        this.playerDamageImmunityTimer = this.config.playerDamageImmunityDuration;

        this.eventBus.emit<DamageEvent>({
            type: GameEventType.PLAYER_DAMAGED,
            targetId: 'player',
            damage: damage,
            source: 'melee',
            position: playerPosition.clone()
        });
    }

    /**
     * Apply healing to player
     */
    emitHealEvent(amount: number, source: 'lifesteal' | 'ability' | 'pickup', newHealth: number): void {
        this.eventBus.emit<HealEvent>({
            type: GameEventType.PLAYER_HEALED,
            amount: amount,
            source: source,
            newHealth: newHealth
        });
    }

    /**
     * Check if player has damage immunity
     */
    hasPlayerImmunity(): boolean {
        return this.playerDamageImmunityTimer > 0;
    }

    /**
     * Get combat statistics
     */
    getStats(): typeof this.stats & { spatialGridStats: ReturnType<SpatialGrid<any>['getStats']> } {
        return {
            ...this.stats,
            spatialGridStats: this.spatialGrid.getStats()
        };
    }

    /**
     * Get last combat result
     */
    getLastResult(): CombatResult {
        return { ...this.lastCombatResult };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalDamageDealt: 0,
            totalEnemiesKilled: 0,
            totalXPAwarded: 0,
            collisionChecksThisFrame: 0
        };
    }

    /**
     * Cleanup subscriptions
     */
    destroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];
    }
}
