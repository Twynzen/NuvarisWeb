import * as THREE from 'three';
import { CharacterAbilityThree } from './character-ability-three';
import { PlayerThree } from '../entities/player.three';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { YuranySkills } from './skills/yurany.skills';

/**
 * Yurany Ability - Three.js implementation
 * Passive: Chain Lightning
 * - Projectiles chain to nearby enemies after hitting
 * - Each chain does reduced damage
 * - Can stun enemies (upgrade)
 * - Passive dodge chance (20%)
 */
export class YuranyAbilityThree implements CharacterAbilityThree {
    name = 'Chain Lightning';
    description = 'Attacks chain to nearby enemies.';

    private scene!: THREE.Scene;
    private player!: PlayerThree;

    // Chain properties (in Three.js units)
    public chainRange = 12; // Units to find next chain target
    public chainDamagePercent = 0.5; // 50% damage transmitted
    public maxBounces = 1; // How many times damage can chain

    // Chain tracking per projectile (prevent infinite loops)
    private projectileChains: Map<ProjectileThree, Set<EnemyThree>> = new Map();

    // Stun effect (upgrade)
    public stunChance = 0; // Chance to stun on chain hit
    public stunDuration = 0.5; // Seconds

    // Legendary abilities
    public hasThunderstorm = false;
    private thunderstormTimer = 0;
    private thunderstormInterval = 2; // Strike every 2 seconds
    private thunderstormDamage = 30;
    private thunderstormRadius = 8;

    // True damage (ignores armor - upgrade)
    public trueDamage = false;

    // Passive dodge (20% for Yurany)
    public dodgeChance = 0.20;

    // Callback para reproducir sonido de chain lightning
    public onChainLightningCallback: (() => void) | null = null;

    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void {
        this.scene = scene;
        this.player = player;
        console.log('[YURANY] Chain Lightning ability initialized');
    }

    update(delta: number, scene: THREE.Scene, player: PlayerThree, enemies: EnemyThree[]): void {
        // ========== THUNDERSTORM (Legendaria) ==========
        if (this.hasThunderstorm && enemies.length > 0) {
            this.thunderstormTimer -= delta;
            if (this.thunderstormTimer <= 0) {
                this.triggerThunderstormStrike(enemies, scene);
                this.thunderstormTimer = this.thunderstormInterval;
            }
        }

        // Clean up projectile chain tracking for dead projectiles
        const deadProjectiles: ProjectileThree[] = [];
        for (const [proj, _] of this.projectileChains.entries()) {
            if (proj.isDead) {
                deadProjectiles.push(proj);
            }
        }
        deadProjectiles.forEach(proj => this.projectileChains.delete(proj));
    }

    /**
     * Called when a projectile hits an enemy
     * Chain lightning to nearby enemies
     */
    onProjectileHit(
        projectile: ProjectileThree,
        enemy: EnemyThree,
        damage: number,
        scene: THREE.Scene,
        allEnemies: EnemyThree[]
    ): void {
        // Initialize chain tracking for this projectile if needed
        if (!this.projectileChains.has(projectile)) {
            this.projectileChains.set(projectile, new Set());
        }

        const chainedEnemies = this.projectileChains.get(projectile)!;

        // Add current enemy to chained set
        chainedEnemies.add(enemy);

        // Check if we can chain further
        if (chainedEnemies.size > this.maxBounces) {
            return; // Max bounces reached
        }

        // Find nearest unchained enemy within range
        const closestEnemy = this.findNearestChainTarget(enemy, allEnemies, chainedEnemies);

        if (!closestEnemy) return; // No valid target

        // Mark as chained
        chainedEnemies.add(closestEnemy);

        // Calculate chain damage
        const chainDamage = damage * this.chainDamagePercent;

        // Apply chain with visual effect
        this.triggerChainLightning(enemy, closestEnemy, chainDamage, scene);

        // Apply stun effect if unlocked
        if (this.stunChance > 0 && Math.random() < this.stunChance) {
            closestEnemy.applyStun(this.stunDuration);
            console.log('[YURANY] Chain stun applied!');
        }
    }

    /**
     * Called when an enemy hits the player
     * Yurany has 20% passive dodge chance
     */
    onEnemyHitPlayer(
        enemy: EnemyThree,
        player: PlayerThree,
        damageAmount: number,
        scene: THREE.Scene
    ): number {
        // Roll for dodge
        if (Math.random() < this.dodgeChance) {
            // Dodged! Visual feedback
            this.createDodgeEffect(player, scene);
            console.log('[YURANY] Dodge! Damage avoided');
            return 0; // No damage taken
        }

        return damageAmount;
    }

    getUpgrades(): any[] {
        return YuranySkills;
    }

    // ========== CHAIN LIGHTNING IMPLEMENTATION ==========

    private findNearestChainTarget(
        fromEnemy: EnemyThree,
        allEnemies: EnemyThree[],
        alreadyChained: Set<EnemyThree>
    ): EnemyThree | null {
        let closest: EnemyThree | null = null;
        let minDistance = this.chainRange;

        for (const enemy of allEnemies) {
            // Skip self, dead, already chained, and mind controlled enemies
            if (enemy === fromEnemy || enemy.isDead || alreadyChained.has(enemy) || enemy.isMindControlled) {
                continue;
            }

            const distance = fromEnemy.mesh.position.distanceTo(enemy.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = enemy;
            }
        }

        return closest;
    }

    private triggerChainLightning(
        source: EnemyThree,
        target: EnemyThree,
        damage: number,
        scene: THREE.Scene
    ): void {
        // Create visual lightning effect
        this.createLightningEffect(source.mesh.position, target.mesh.position, scene);

        // Play chain lightning sound
        if (this.onChainLightningCallback) {
            this.onChainLightningCallback();
        }

        // Apply damage to target
        target.takeDamage(damage, scene);

        console.log(`[YURANY] Chain lightning dealt ${damage.toFixed(1)} damage`);
    }

    // ========== THUNDERSTORM (Legendaria) ==========

    private triggerThunderstormStrike(allEnemies: EnemyThree[], scene: THREE.Scene): void {
        // Filter valid targets (not dead, not controlled)
        const validTargets = allEnemies.filter(e => !e.isDead && !e.isMindControlled);
        if (validTargets.length === 0) return;

        // Pick random enemy
        const randomEnemy = validTargets[Math.floor(Math.random() * validTargets.length)];

        // Create lightning strike visual
        this.createThunderstormEffect(randomEnemy.mesh.position, scene);

        // Deal AOE damage to all enemies near the strike
        for (const enemy of allEnemies) {
            if (enemy.isDead || enemy.isMindControlled) continue;

            const distance = randomEnemy.mesh.position.distanceTo(enemy.mesh.position);
            if (distance <= this.thunderstormRadius) {
                enemy.takeDamage(this.thunderstormDamage, scene);

                // Chance to stun
                if (this.stunChance > 0 && Math.random() < this.stunChance) {
                    enemy.applyStun(this.stunDuration);
                }
            }
        }

        console.log('[YURANY] Thunderstorm strike!');
    }

    // ========== VISUAL EFFECTS ==========

    private createLightningEffect(from: THREE.Vector3, to: THREE.Vector3, scene: THREE.Scene): void {
        // Create jagged lightning line
        const points: THREE.Vector3[] = [];
        const segments = 5;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(from, to, t);

            // Add randomness to middle points (not start/end)
            if (i > 0 && i < segments) {
                point.x += (Math.random() - 0.5) * 1;
                point.y += 0.5 + Math.random() * 0.5;
                point.z += (Math.random() - 0.5) * 1;
            } else {
                point.y += 1; // Lift slightly above ground
            }

            points.push(point);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff, // Cyan for Yurany
            linewidth: 3,
            transparent: true,
            opacity: 1
        });

        const line = new THREE.Line(geometry, material);
        scene.add(line);

        // Fade out and remove
        let opacity = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.15;
            material.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                scene.remove(line);
                geometry.dispose();
                material.dispose();
                clearInterval(fadeInterval);
            }
        }, 30);
    }

    private createThunderstormEffect(position: THREE.Vector3, scene: THREE.Scene): void {
        // Create vertical lightning from sky
        const skyHeight = 30;
        const groundPos = position.clone();
        groundPos.y = 0.5;

        const skyPos = position.clone();
        skyPos.y = skyHeight;

        // Main bolt
        this.createLightningEffect(skyPos, groundPos, scene);

        // Impact circle
        const circleGeometry = new THREE.CircleGeometry(this.thunderstormRadius, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00, // Yellow impact
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        circle.rotation.x = -Math.PI / 2;
        circle.position.copy(position);
        circle.position.y = 0.1;
        scene.add(circle);

        // Fade out circle
        let opacity = 0.4;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;
            circleMaterial.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                scene.remove(circle);
                circleGeometry.dispose();
                circleMaterial.dispose();
                clearInterval(fadeInterval);
            }
        }, 30);
    }

    private createDodgeEffect(player: PlayerThree, scene: THREE.Scene): void {
        // Create quick flash around player to indicate dodge
        const flashGeometry = new THREE.RingGeometry(1, 2, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00, // Green for dodge
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.rotation.x = -Math.PI / 2;
        flash.position.copy(player.mesh.position);
        flash.position.y = 0.5;
        scene.add(flash);

        // Quick fade
        let opacity = 0.6;
        const fadeInterval = setInterval(() => {
            opacity -= 0.15;
            flashMaterial.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                scene.remove(flash);
                flashGeometry.dispose();
                flashMaterial.dispose();
                clearInterval(fadeInterval);
            }
        }, 30);
    }
}
