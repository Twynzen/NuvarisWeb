import * as THREE from 'three';
import { CharacterAbilityThree } from './character-ability-three';
import { PlayerThree } from '../entities/player.three';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { LarsSkills } from './skills/lars.skills';

/**
 * Lars Ability - Three.js implementation
 * Passive: Mind Control
 * - Chance to convert enemies into allies on projectile hit
 * - Controlled enemies attack other enemies (blue color)
 * - Minions can explode for AOE damage (upgrade)
 */
export class LarsAbilityThree implements CharacterAbilityThree {
    name = 'Mind Control';
    description = 'Chance to convert enemies to fight for you.';

    private scene!: THREE.Scene;
    private player!: PlayerThree;

    // Base conversion chance (10%)
    public controlChance = 0.10;

    // Ability modifiers (upgraded via skills)
    public minionHealthMult = 1;
    public minionDamageMult = 1;
    public areaControl = false; // Mass Hysteria upgrade
    public areaControlRadius = 8; // Units for area control
    public minionDurationMult = 1;
    public healOnExplode = false;
    public healAmount = 5;
    public minionsConvert = false; // Hive Mind upgrade
    public canConvertElites = false;
    public canExplodeMinions = false;

    // Mind control duration base (10 seconds)
    private baseDuration = 10;

    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void {
        this.scene = scene;
        this.player = player;
        console.log('[LARS] Mind Control ability initialized');
    }

    update(delta: number, scene: THREE.Scene, player: PlayerThree, enemies: EnemyThree[]): void {
        // Nothing to update per frame - mind control is handled in onProjectileHit
        // and duration is handled by enemy itself
    }

    /**
     * Called when a projectile hits an enemy
     * Chance to convert the enemy to an ally
     */
    onProjectileHit(
        projectile: ProjectileThree,
        enemy: EnemyThree,
        damage: number,
        scene: THREE.Scene,
        allEnemies: EnemyThree[]
    ): void {
        // Don't try to convert already controlled enemies
        if (enemy.isMindControlled || enemy.isDead) return;

        // Roll for mind control
        if (Math.random() < this.controlChance) {
            // Calculate duration with multiplier
            const duration = this.baseDuration * this.minionDurationMult;

            if (this.areaControl) {
                // Mass Hysteria: Control all enemies in area
                console.log('[LARS] Mass Hysteria triggered!');

                for (const otherEnemy of allEnemies) {
                    if (otherEnemy.isDead || otherEnemy.isMindControlled) continue;

                    const dist = enemy.mesh.position.distanceTo(otherEnemy.mesh.position);
                    if (dist <= this.areaControlRadius) {
                        otherEnemy.mindControl(duration, this.minionHealthMult, this.minionDamageMult);
                    }
                }
            } else {
                // Single target mind control
                enemy.mindControl(duration, this.minionHealthMult, this.minionDamageMult);
            }
        }
    }

    /**
     * Called when an enemy hits the player
     * Lars doesn't have defensive abilities by default
     */
    onEnemyHitPlayer(
        enemy: EnemyThree,
        player: PlayerThree,
        damageAmount: number,
        scene: THREE.Scene
    ): number {
        // No damage modification
        return damageAmount;
    }

    getUpgrades(): any[] {
        return LarsSkills;
    }

    // ========== MIND CONTROL UTILITIES ==========

    /**
     * Trigger explosion of all mind-controlled minions
     * Deals AOE damage and optionally heals the player
     */
    public triggerExplosion(allEnemies: EnemyThree[], scene: THREE.Scene, gameState: any): void {
        if (!this.canExplodeMinions) {
            console.log('[LARS] Cannot explode minions - upgrade not unlocked');
            return;
        }

        const explosionRadius = 10;
        const explosionDamage = 50;
        let totalHealing = 0;

        // Find all mind-controlled enemies
        const controlledEnemies = allEnemies.filter(e => e.isMindControlled && !e.isDead);

        console.log(`[LARS] Exploding ${controlledEnemies.length} minions!`);

        for (const minion of controlledEnemies) {
            // Create visual explosion
            this.createExplosionEffect(minion.mesh.position, scene);

            // Deal AOE damage to nearby NON-controlled enemies
            for (const target of allEnemies) {
                if (target === minion || target.isDead || target.isMindControlled) continue;

                const dist = minion.mesh.position.distanceTo(target.mesh.position);
                if (dist <= explosionRadius) {
                    target.takeDamage(explosionDamage, scene);
                }
            }

            // Kill the minion
            minion.health = 0;
            minion.isDead = true;
            minion.mesh.visible = false;

            // Heal player if upgrade unlocked
            if (this.healOnExplode) {
                totalHealing += this.healAmount;
            }
        }

        // Apply healing
        if (totalHealing > 0 && gameState) {
            gameState.health = Math.min(gameState.health + totalHealing, gameState.maxHealth);
            console.log(`[LARS] Healed ${totalHealing} HP from explosions`);
        }
    }

    /**
     * Get count of currently controlled enemies
     */
    public getControlledCount(allEnemies: EnemyThree[]): number {
        return allEnemies.filter(e => e.isMindControlled && !e.isDead).length;
    }

    // ========== VISUAL EFFECTS ==========

    private createExplosionEffect(position: THREE.Vector3, scene: THREE.Scene): void {
        // Create expanding ring effect
        const ringGeometry = new THREE.RingGeometry(0.5, 1.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x0066ff, // Blue for Lars
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(position);
        ring.position.y = 0.5;
        scene.add(ring);

        // Animate expansion
        let scale = 1;
        let opacity = 0.8;
        const animInterval = setInterval(() => {
            scale += 0.5;
            opacity -= 0.1;

            ring.scale.set(scale, scale, 1);
            ringMaterial.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                scene.remove(ring);
                ringGeometry.dispose();
                ringMaterial.dispose();
                clearInterval(animInterval);
            }
        }, 30);
    }
}
