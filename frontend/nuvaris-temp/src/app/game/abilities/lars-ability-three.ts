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
 * - Minions follow Lars when no enemies nearby
 * - Minions can explode for AOE damage (upgrade)
 *
 * IMPORTANTE: Lars NO ataca a sus propios minions
 */
export class LarsAbilityThree implements CharacterAbilityThree {
    name = 'Mind Control';
    description = 'Chance to convert enemies to fight for you.';

    private scene!: THREE.Scene;
    private player!: PlayerThree;
    private gameState: any;

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
    public canExplodeMinions = false; // Detonación Mental upgrade

    // NEW: Slow on hit
    public slowOnHit = false;
    public slowAmount = 0;
    public slowDuration = 2; // segundos

    // NEW: Fear on failed conversion
    public fearOnFailedConversion = false;
    public fearChance = 0;
    public fearDuration = 3;

    // NEW: Explode on failed conversion
    public explodeOnFailedConversion = false;
    public failedExplosionChance = 0;
    public failedExplosionDamage = 30;
    public failedExplosionRadius = 6;

    // NEW: Psychic Storm
    public hasPsychicStorm = false;
    public psychicStormInterval = 10; // segundos
    private psychicStormTimer = 0;
    public psychicStormRadius = 15;

    // Mind control duration base (10 seconds)
    private baseDuration = 10;

    // Callbacks para sonidos
    public onMindControlCallback: (() => void) | null = null;
    public onMinionExplodeCallback: (() => void) | null = null;

    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void {
        this.scene = scene;
        this.player = player;
        this.gameState = gameState;
        console.log('[LARS] Mind Control ability initialized');
    }

    update(delta: number, scene: THREE.Scene, player: PlayerThree, enemies: EnemyThree[]): void {
        // Psychic Storm: Intenta convertir enemigos cercanos cada X segundos
        if (this.hasPsychicStorm) {
            this.psychicStormTimer += delta;
            if (this.psychicStormTimer >= this.psychicStormInterval) {
                this.psychicStormTimer = 0;
                this.triggerPsychicStorm(enemies, scene);
            }
        }
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

        // Apply slow effect if unlocked
        if (this.slowOnHit && this.slowAmount > 0) {
            enemy.applySlow(this.slowAmount, this.slowDuration);
        }

        // Roll for mind control
        const conversionRoll = Math.random();
        if (conversionRoll < this.controlChance) {
            // SUCCESS: Convert enemy
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
                // Play mind control sound once for area effect
                if (this.onMindControlCallback) {
                    this.onMindControlCallback();
                }
            } else {
                // Single target mind control
                enemy.mindControl(duration, this.minionHealthMult, this.minionDamageMult);
                // Play mind control sound
                if (this.onMindControlCallback) {
                    this.onMindControlCallback();
                }
            }
        } else {
            // FAILED: Conversion failed - check for secondary effects

            // Terror: Chance to fear enemy
            if (this.fearOnFailedConversion && Math.random() < this.fearChance) {
                enemy.applyFear(this.fearDuration, this.player.mesh.position);
                console.log('[LARS] Terror triggered - enemy is fleeing!');
            }

            // Explosion on failed conversion
            if (this.explodeOnFailedConversion && Math.random() < this.failedExplosionChance) {
                this.createFailedExplosion(enemy.mesh.position, scene, allEnemies);
                console.log('[LARS] Failed conversion explosion triggered!');
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
     * Check if an enemy is a minion (mind controlled)
     * Used by collision system to prevent Lars from attacking his own minions
     */
    public isMinion(enemy: EnemyThree): boolean {
        return enemy.isMindControlled;
    }

    /**
     * Get all current minions
     */
    public getMinions(allEnemies: EnemyThree[]): EnemyThree[] {
        return allEnemies.filter(e => e.isMindControlled && !e.isDead);
    }

    /**
     * Trigger explosion of all mind-controlled minions
     * Deals AOE damage and optionally heals the player
     */
    public triggerExplosion(allEnemies: EnemyThree[], scene: THREE.Scene, gameState: any): void {
        if (!this.canExplodeMinions) {
            console.log('[LARS] Cannot explode minions - upgrade not unlocked (need "Detonación Mental")');
            return;
        }

        const explosionRadius = 10;
        const explosionDamage = 50;
        let totalHealing = 0;

        // Find all mind-controlled enemies
        const controlledEnemies = allEnemies.filter(e => e.isMindControlled && !e.isDead);

        if (controlledEnemies.length === 0) {
            console.log('[LARS] No minions to explode');
            return;
        }

        console.log(`[LARS] Exploding ${controlledEnemies.length} minions!`);

        // Play explosion sound
        if (this.onMinionExplodeCallback) {
            this.onMinionExplodeCallback();
        }

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

    // ========== NEW ABILITIES ==========

    /**
     * Psychic Storm - Attempt to convert all nearby enemies
     */
    private triggerPsychicStorm(allEnemies: EnemyThree[], scene: THREE.Scene): void {
        console.log('[LARS] Psychic Storm activated!');

        const playerPos = this.player.mesh.position;
        let converted = 0;

        for (const enemy of allEnemies) {
            if (enemy.isDead || enemy.isMindControlled) continue;

            const dist = playerPos.distanceTo(enemy.mesh.position);
            if (dist <= this.psychicStormRadius) {
                // Attempt conversion with normal chance
                if (Math.random() < this.controlChance) {
                    const duration = this.baseDuration * this.minionDurationMult;
                    enemy.mindControl(duration, this.minionHealthMult, this.minionDamageMult);
                    converted++;
                }
            }
        }

        if (converted > 0) {
            console.log(`[LARS] Psychic Storm converted ${converted} enemies!`);
            // Create visual effect at player position
            this.createPsychicStormEffect(playerPos, scene);
            if (this.onMindControlCallback) {
                this.onMindControlCallback();
            }
        }
    }

    /**
     * Create explosion when conversion fails
     */
    private createFailedExplosion(position: THREE.Vector3, scene: THREE.Scene, allEnemies: EnemyThree[]): void {
        // Play explosion sound
        if (this.onMinionExplodeCallback) {
            this.onMinionExplodeCallback();
        }

        // Create visual
        this.createExplosionEffect(position, scene, 0xff6600); // Orange for failed explosion

        // Deal damage to nearby enemies
        for (const target of allEnemies) {
            if (target.isDead || target.isMindControlled) continue;

            const dist = position.distanceTo(target.mesh.position);
            if (dist <= this.failedExplosionRadius) {
                target.takeDamage(this.failedExplosionDamage, scene);
            }
        }
    }

    // ========== VISUAL EFFECTS ==========

    private createExplosionEffect(position: THREE.Vector3, scene: THREE.Scene, color: number = 0x0066ff): void {
        // Create expanding ring effect
        const ringGeometry = new THREE.RingGeometry(0.5, 1.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
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

    private createPsychicStormEffect(position: THREE.Vector3, scene: THREE.Scene): void {
        // Create multiple expanding rings for storm effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ringGeometry = new THREE.RingGeometry(0.5, 2, 32);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: 0x9900ff, // Purple for psychic storm
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                });

                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = -Math.PI / 2;
                ring.position.copy(position);
                ring.position.y = 0.5;
                scene.add(ring);

                let scale = 1;
                let opacity = 0.6;
                const animInterval = setInterval(() => {
                    scale += 0.8;
                    opacity -= 0.08;

                    ring.scale.set(scale, scale, 1);
                    ringMaterial.opacity = Math.max(0, opacity);

                    if (opacity <= 0) {
                        scene.remove(ring);
                        ringGeometry.dispose();
                        ringMaterial.dispose();
                        clearInterval(animInterval);
                    }
                }, 30);
            }, i * 150);
        }
    }
}
