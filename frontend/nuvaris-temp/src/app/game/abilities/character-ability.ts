import * as Phaser from 'phaser';
import { Player } from '../entities/player.entity';
import { Enemy } from '../entities/enemy.entity';
import { Projectile } from '../entities/projectile.entity';

export interface CharacterAbility {
    name: string;
    description: string;

    /**
     * Called when the ability is initialized (e.g. when player spawns)
     */
    initialize(scene: Phaser.Scene, player: Player): void;

    /**
     * Called every frame
     */
    update(time: number, delta: number): void;

    /**
     * Called when a projectile hits an enemy
     */
    onProjectileHit(projectile: Projectile, enemy: Enemy, damage: number): void;

    /**
     * Called when an enemy hits the player
     */
    onEnemyHitPlayer(enemy: Enemy, player: Player): void;

    /**
     * Get character-specific upgrades
     */
    getUpgrades(): any[];
}
