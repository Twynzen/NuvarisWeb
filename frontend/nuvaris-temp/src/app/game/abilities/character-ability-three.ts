import * as THREE from 'three';
import { PlayerThree } from '../entities/player.three';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';

/**
 * CharacterAbility interface adapted for Three.js
 * Defines hooks for character-specific passive abilities and skill effects
 */
export interface CharacterAbilityThree {
    name: string;
    description: string;

    /**
     * Called when the player spawns
     * Use this to initialize weapon properties or set initial state
     * @param gameState Optional game state reference for abilities that modify game stats (like lifesteal)
     */
    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void;

    /**
     * Called every frame during game update
     * Use this for continuous ability logic (e.g., Thunderstorm, Adrenaline cooldown)
     */
    update(delta: number, scene: THREE.Scene, player: PlayerThree, enemies: EnemyThree[]): void;

    /**
     * Called when a projectile collides with an enemy
     * Use this for on-hit abilities like Chain Lightning or Mind Control
     */
    onProjectileHit(
        projectile: ProjectileThree,
        enemy: EnemyThree,
        damage: number,
        scene: THREE.Scene,
        allEnemies: EnemyThree[]
    ): void;

    /**
     * Called when an enemy hits the player
     * Use this for defensive effects like Dodge or Thorns damage
     */
    onEnemyHitPlayer(
        enemy: EnemyThree,
        player: PlayerThree,
        damageAmount: number,
        scene: THREE.Scene
    ): number; // Return modified damage amount (or 0 to block damage)

    /**
     * Get upgrades available for this character
     */
    getUpgrades(): any[];
}
