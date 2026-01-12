import * as THREE from 'three';
import { CharacterAbilityThree } from './character-ability-three';
import { PlayerThree } from '../entities/player.three';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { ProyectoYSkills } from './skills/proyecto-y.skills';

/**
 * Yurany Ability - Three.js implementation
 * Passive: Chain Lightning
 * - CHARGE ATTACK: Hold to charge, release to chain attack multiple enemies
 * - Full charge (100%): 50 → 40 → 30 → 20 → 10... (decrements of 10)
 * - Partial charge: damage ÷ 2 per chain (40 → 20 → 10 → 5...)
 * - More charge = more enemies chained (up to 6)
 * - Can stun enemies (upgrade)
 * - Passive dodge chance (20% base)
 * - NEW: Critical hit chance
 * - NEW: Dash ability
 */
export class ProyectoYAbilityThree implements CharacterAbilityThree {
    name = 'Chain Lightning';
    description = 'Hold attack to charge, chain damage through multiple enemies.';

    private scene!: THREE.Scene;
    private player!: PlayerThree;

    // Chain properties (in Three.js units)
    public chainRange = 12; // Units to find next chain target
    public chainDamagePercent = 0.5; // 50% damage transmitted (for passive chain only)
    public maxBounces = 1; // How many times passive damage can chain

    // ========== CHARGE ATTACK SYSTEM ==========
    // Damage based on charge level
    public readonly MAX_CHAIN_DAMAGE = 50; // Full charge damage
    public readonly MIN_CHAIN_DAMAGE = 15; // Quick tap damage
    // Full charge: decrement by 10 each chain (50→40→30→20→10)
    // Partial charge: divide by 2 each chain (40→20→10→5)

    // Max enemies chained based on charge level
    public readonly MAX_CHAIN_ENEMIES_FULL = 6;
    public readonly MAX_CHAIN_ENEMIES_MID = 4;
    public readonly MAX_CHAIN_ENEMIES_MIN = 2;

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

    // Passive dodge (20% base for Yurany)
    public dodgeChance = 0.20;

    // NEW: Critical hit system
    public critChance = 0; // Chance for critical hit
    public critMultiplier = 1.5; // Crit damage multiplier (base 150%)

    // NEW: Dash system
    public canDash = false;
    public dashCooldown = 0;
    public dashMaxCooldown = 5; // 5 seconds cooldown
    public dashDistance = 8; // Units
    public dashInvulnerability = 0.3; // Seconds of invulnerability during dash

    // Callback para reproducir sonido de chain lightning
    public onChainLightningCallback: (() => void) | null = null;

    // GameState reference
    private gameState: any = null;

    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void {
        this.scene = scene;
        this.player = player;
        this.gameState = gameState;
        console.log('[PROJECT Y] Chain Lightning ability initialized');
    }

    update(delta: number, scene: THREE.Scene, player: PlayerThree, enemies: EnemyThree[]): void {
        // ========== DASH COOLDOWN ==========
        if (this.dashCooldown > 0) {
            this.dashCooldown -= delta;
        }

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
     * Chain lightning to nearby enemies + critical hit system
     */
    onProjectileHit(
        projectile: ProjectileThree,
        enemy: EnemyThree,
        damage: number,
        scene: THREE.Scene,
        allEnemies: EnemyThree[]
    ): void {
        // Check for critical hit
        let finalDamage = damage;
        let isCrit = false;

        if (this.critChance > 0 && Math.random() < this.critChance) {
            finalDamage = damage * this.critMultiplier;
            isCrit = true;
            this.createCritEffect(enemy.mesh.position, scene);
            console.log(`[PROJECT Y] CRITICAL HIT! ${finalDamage.toFixed(1)} damage`);
        }

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

        // Calculate chain damage (use final damage if crit)
        const chainDamage = finalDamage * this.chainDamagePercent;

        // Apply chain with visual effect
        this.triggerChainLightning(enemy, closestEnemy, chainDamage, scene);

        // Apply stun effect if unlocked
        if (this.stunChance > 0 && Math.random() < this.stunChance) {
            closestEnemy.applyStun(this.stunDuration);
            console.log('[PROJECT Y] Chain stun applied!');
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
            console.log('[PROJECT Y] Dodge! Damage avoided');
            return 0; // No damage taken
        }

        return damageAmount;
    }

    getUpgrades(): any[] {
        return ProyectoYSkills;
    }

    // ========== CHARGE CHAIN ATTACK ==========

    /**
     * Execute chain attack based on charge level
     * Called when player releases charge attack
     *
     * @param chargeLevel 0-1 representing charge progress
     * @param targetPosition Where the attack is aimed
     * @param allEnemies All enemies in the game
     * @param scene THREE.Scene for visual effects
     * @param playerPos Player position for finding nearest enemy
     * @returns Array of { enemy, damage, orb } for each enemy hit
     */
    public executeChargeChainAttack(
        chargeLevel: number,
        targetPosition: THREE.Vector3,
        allEnemies: EnemyThree[],
        scene: THREE.Scene,
        playerPos: THREE.Vector3
    ): { enemy: EnemyThree; damage: number; orb: any }[] {
        const results: { enemy: EnemyThree; damage: number; orb: any }[] = [];

        // Calculate base damage based on charge level
        const baseDamage = this.calculateChargeDamage(chargeLevel);

        // Calculate max enemies to chain based on charge level
        const maxChainEnemies = this.calculateMaxChainEnemies(chargeLevel);

        // Is this a full charge? (100%)
        const isFullCharge = chargeLevel >= 1.0;

        console.log(`[PROJECT Y] Chain Attack! Charge: ${Math.floor(chargeLevel * 100)}%, Base Damage: ${baseDamage}, Max Chains: ${maxChainEnemies}`);

        // Find first enemy (nearest to target position or player)
        let currentEnemy = this.findNearestEnemyToPosition(targetPosition, allEnemies, 10);
        if (!currentEnemy) {
            currentEnemy = this.findNearestEnemyToPosition(playerPos, allEnemies, 20);
        }

        if (!currentEnemy) {
            console.log('[PROJECT Y] No valid target for chain attack');
            return results;
        }

        // Track chained enemies to prevent hitting same enemy twice
        const chainedEnemies = new Set<EnemyThree>();
        let currentDamage = baseDamage;
        let chainIndex = 0;

        // Chain through enemies
        while (currentEnemy && chainIndex < maxChainEnemies && currentDamage >= 1) {
            chainedEnemies.add(currentEnemy);

            // Apply damage (integer only)
            const damageToApply = Math.floor(currentDamage);
            const orb = currentEnemy.takeDamage(damageToApply, scene);

            results.push({
                enemy: currentEnemy,
                damage: damageToApply,
                orb: orb
            });

            // Create visual effect from previous enemy (or player) to current
            if (chainIndex === 0) {
                // First chain: from player to first enemy
                this.createChainEffect(playerPos, currentEnemy.mesh.position, scene, true);
            }

            // Apply stun if unlocked
            if (this.stunChance > 0 && Math.random() < this.stunChance) {
                currentEnemy.applyStun(this.stunDuration);
            }

            console.log(`[PROJECT Y] Chain ${chainIndex + 1}: ${damageToApply} damage to enemy`);

            // Find next enemy in chain
            const previousEnemy = currentEnemy;
            currentEnemy = this.findNextChainTarget(currentEnemy, allEnemies, chainedEnemies);

            if (currentEnemy) {
                // Create chain effect to next enemy
                this.createChainEffect(previousEnemy.mesh.position, currentEnemy.mesh.position, scene, false);
            }

            // Calculate next damage based on charge type
            if (isFullCharge) {
                // Full charge: decrement by 10 (50→40→30→20→10)
                currentDamage = currentDamage - 10;
            } else {
                // Partial charge: divide by 2 (40→20→10→5...)
                currentDamage = Math.floor(currentDamage / 2);
            }

            chainIndex++;
        }

        // Play chain lightning sound
        if (this.onChainLightningCallback && results.length > 0) {
            this.onChainLightningCallback();
        }

        return results;
    }

    /**
     * Calculate base damage based on charge level
     * Quick tap: 15, Full charge: 50
     */
    private calculateChargeDamage(chargeLevel: number): number {
        // Linear interpolation between MIN and MAX damage
        const damage = this.MIN_CHAIN_DAMAGE +
            (this.MAX_CHAIN_DAMAGE - this.MIN_CHAIN_DAMAGE) * chargeLevel;
        return Math.floor(damage);
    }

    /**
     * Calculate max enemies that can be chained based on charge level
     */
    private calculateMaxChainEnemies(chargeLevel: number): number {
        if (chargeLevel >= 1.0) {
            return this.MAX_CHAIN_ENEMIES_FULL; // 6 enemies
        } else if (chargeLevel >= 0.5) {
            return this.MAX_CHAIN_ENEMIES_MID; // 4 enemies
        } else {
            return this.MAX_CHAIN_ENEMIES_MIN; // 2 enemies
        }
    }

    /**
     * Find nearest enemy to a position
     */
    private findNearestEnemyToPosition(
        position: THREE.Vector3,
        allEnemies: EnemyThree[],
        maxDistance: number
    ): EnemyThree | null {
        let nearest: EnemyThree | null = null;
        let minDist = maxDistance;

        for (const enemy of allEnemies) {
            if (enemy.isDead || enemy.isMindControlled) continue;

            const dist = position.distanceTo(enemy.mesh.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    /**
     * Find next enemy in the chain (nearest to current that hasn't been hit)
     */
    private findNextChainTarget(
        fromEnemy: EnemyThree,
        allEnemies: EnemyThree[],
        alreadyChained: Set<EnemyThree>
    ): EnemyThree | null {
        let closest: EnemyThree | null = null;
        let minDistance = this.chainRange;

        for (const enemy of allEnemies) {
            if (enemy === fromEnemy || enemy.isDead ||
                alreadyChained.has(enemy) || enemy.isMindControlled) {
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

    /**
     * Create chain lightning effect between two points
     */
    private createChainEffect(
        from: THREE.Vector3,
        to: THREE.Vector3,
        scene: THREE.Scene,
        isFirst: boolean
    ): void {
        // Create jagged lightning line
        const points: THREE.Vector3[] = [];
        const segments = isFirst ? 8 : 5;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(from, to, t);

            // Add randomness to middle points
            if (i > 0 && i < segments) {
                point.x += (Math.random() - 0.5) * 1.2;
                point.y += 0.5 + Math.random() * 0.8;
                point.z += (Math.random() - 0.5) * 1.2;
            } else {
                point.y += 1;
            }

            points.push(point);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: isFirst ? 0xffffff : 0x00ffff, // White for first, cyan for chains
            linewidth: isFirst ? 3 : 2,
            transparent: true,
            opacity: 1
        });

        const line = new THREE.Line(geometry, material);
        scene.add(line);

        // Fade out and remove
        let opacity = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.12;
            material.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                scene.remove(line);
                geometry.dispose();
                material.dispose();
                clearInterval(fadeInterval);
            }
        }, 25);
    }

    // ========== DASH ABILITY ==========

    /**
     * Execute dash ability (called from engine on Q press)
     */
    public executeDash(player: PlayerThree, direction: THREE.Vector3, scene: THREE.Scene): boolean {
        if (!this.canDash) {
            console.log('[PROJECT Y] Dash not unlocked');
            return false;
        }

        if (this.dashCooldown > 0) {
            console.log('[PROJECT Y] Dash on cooldown');
            return false;
        }

        // Normalize direction
        if (direction.length() > 0) {
            direction.normalize();
        } else {
            // Default to forward if no direction
            direction.set(0, 0, -1);
        }

        // Calculate new position
        const startPos = player.mesh.position.clone();
        const endPos = startPos.clone().add(direction.multiplyScalar(this.dashDistance));

        // Create dash trail effect
        this.createDashEffect(startPos, endPos, scene);

        // Move player instantly
        player.mesh.position.copy(endPos);

        // Set cooldown
        this.dashCooldown = this.dashMaxCooldown;

        console.log('[PROJECT Y] Dash executed!');
        return true;
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

        console.log(`[PROJECT Y] Chain lightning dealt ${damage.toFixed(1)} damage`);
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

        console.log('[PROJECT Y] Thunderstorm strike!');
    }

    // ========== VISUAL EFFECTS ==========

    // ========== ELECTRIC ATTACK EFFECT (ataque principal sin proyectil) ==========
    /**
     * Crea efecto visual de ataque electrico instantaneo
     * Estilo "Darkside" - rayo BLANCO con cambios de direccion bruscos
     * - Rayo zigzag agresivo con quiebres repentinos
     * - Color BLANCO brillante
     * - Impacto explosivo en el enemigo
     */
    public createElectricAttackEffect(
        playerPos: THREE.Vector3,
        enemy: EnemyThree,
        scene: THREE.Scene
    ): void {
        const enemyPos = enemy.mesh.position.clone();

        // 1. RAYO PRINCIPAL - zigzag agresivo estilo darkside
        const createZigzagBolt = (): THREE.Vector3[] => {
            const points: THREE.Vector3[] = [];
            const segments = 12;
            let currentPos = playerPos.clone();
            currentPos.y += 1.2;

            const endPos = enemyPos.clone();
            endPos.y += 1.2;

            points.push(currentPos.clone());

            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const basePoint = new THREE.Vector3().lerpVectors(
                    new THREE.Vector3(playerPos.x, 1.2, playerPos.z),
                    new THREE.Vector3(enemyPos.x, 1.2, enemyPos.z),
                    t
                );

                // CAMBIOS DE DIRECCION BRUSCOS (no suaves)
                // Alternar entre desviaciones grandes izquierda/derecha
                const deviation = (i % 2 === 0 ? 1 : -1) * (0.8 + Math.random() * 0.6);

                // Perpendicular a la direccion del rayo
                const dir = new THREE.Vector3().subVectors(enemyPos, playerPos).normalize();
                const perpX = -dir.z;
                const perpZ = dir.x;

                basePoint.x += perpX * deviation;
                basePoint.z += perpZ * deviation;
                basePoint.y += (Math.random() - 0.5) * 0.5;

                points.push(basePoint);
            }

            points.push(endPos);
            return points;
        };

        // Crear 3 rayos ligeramente diferentes para efecto de "electricidad viva"
        const bolts: THREE.Line[] = [];
        const boltMaterials: THREE.LineBasicMaterial[] = [];

        for (let b = 0; b < 3; b++) {
            const boltPoints = createZigzagBolt();
            const boltGeometry = new THREE.BufferGeometry().setFromPoints(boltPoints);
            const boltMaterial = new THREE.LineBasicMaterial({
                color: b === 0 ? 0xffffff : 0xccccff, // Blanco principal, ligeramente azul los secundarios
                transparent: true,
                opacity: b === 0 ? 1 : 0.5,
                linewidth: b === 0 ? 3 : 1
            });

            const bolt = new THREE.Line(boltGeometry, boltMaterial);
            scene.add(bolt);
            bolts.push(bolt);
            boltMaterials.push(boltMaterial);
        }

        // 2. FLASH DE ORIGEN (en el jugador)
        const originFlashGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const originFlashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const originFlash = new THREE.Mesh(originFlashGeometry, originFlashMaterial);
        originFlash.position.copy(playerPos);
        originFlash.position.y = 1.2;
        scene.add(originFlash);

        // 3. IMPACTO EN ENEMIGO - explosion electrica
        const impactGeometry = new THREE.SphereGeometry(0.8, 12, 12);
        const impactMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        const impact = new THREE.Mesh(impactGeometry, impactMaterial);
        impact.position.copy(enemyPos);
        impact.position.y = 1;
        scene.add(impact);

        // 4. Rayos secundarios que salen del impacto (como descarga)
        const discharges: THREE.Line[] = [];
        const dischargeMaterials: THREE.LineBasicMaterial[] = [];

        for (let d = 0; d < 4; d++) {
            const angle = (d / 4) * Math.PI * 2 + Math.random() * 0.5;
            const length = 1 + Math.random();

            const dischargePoints = [
                new THREE.Vector3(enemyPos.x, 1, enemyPos.z),
                new THREE.Vector3(
                    enemyPos.x + Math.cos(angle) * length * 0.5,
                    1 + (Math.random() - 0.5) * 0.5,
                    enemyPos.z + Math.sin(angle) * length * 0.5
                ),
                new THREE.Vector3(
                    enemyPos.x + Math.cos(angle) * length,
                    1 + (Math.random() - 0.5) * 0.3,
                    enemyPos.z + Math.sin(angle) * length
                )
            ];

            const dischargeGeometry = new THREE.BufferGeometry().setFromPoints(dischargePoints);
            const dischargeMaterial = new THREE.LineBasicMaterial({
                color: 0xaaaaff,
                transparent: true,
                opacity: 0.8
            });

            const discharge = new THREE.Line(dischargeGeometry, dischargeMaterial);
            scene.add(discharge);
            discharges.push(discharge);
            dischargeMaterials.push(dischargeMaterial);
        }

        // Animacion rapida de fade out
        let frame = 0;
        const maxFrames = 12;
        const fadeInterval = setInterval(() => {
            frame++;
            const progress = frame / maxFrames;

            // Fade de rayos principales
            for (let i = 0; i < boltMaterials.length; i++) {
                boltMaterials[i].opacity = Math.max(0, (i === 0 ? 1 : 0.5) * (1 - progress));
            }

            // Fade y expansion de impacto
            impactMaterial.opacity = Math.max(0, 1 - progress * 1.5);
            const impactScale = 1 + progress * 2;
            impact.scale.set(impactScale, impactScale, impactScale);

            // Flash de origen desaparece rapido
            originFlashMaterial.opacity = Math.max(0, 0.9 - progress * 2);

            // Descargas secundarias
            for (const dm of dischargeMaterials) {
                dm.opacity = Math.max(0, 0.8 - progress);
            }

            if (frame >= maxFrames) {
                // Limpiar todo
                for (const bolt of bolts) {
                    scene.remove(bolt);
                    bolt.geometry.dispose();
                }
                for (const mat of boltMaterials) {
                    mat.dispose();
                }

                scene.remove(originFlash);
                originFlashGeometry.dispose();
                originFlashMaterial.dispose();

                scene.remove(impact);
                impactGeometry.dispose();
                impactMaterial.dispose();

                for (const discharge of discharges) {
                    scene.remove(discharge);
                    discharge.geometry.dispose();
                }
                for (const dm of dischargeMaterials) {
                    dm.dispose();
                }

                clearInterval(fadeInterval);
            }
        }, 20); // ~50fps para efecto muy rapido
    }

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

    private createCritEffect(position: THREE.Vector3, scene: THREE.Scene): void {
        // Create critical hit visual - yellow star burst
        const starGeometry = new THREE.CircleGeometry(1, 6);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00, // Yellow for crit
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.rotation.x = -Math.PI / 2;
        star.position.copy(position);
        star.position.y = 2;
        scene.add(star);

        // Expand and fade
        let scale = 1;
        let opacity = 1;
        const animInterval = setInterval(() => {
            scale += 0.3;
            opacity -= 0.15;

            star.scale.set(scale, scale, 1);
            starMaterial.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                scene.remove(star);
                starGeometry.dispose();
                starMaterial.dispose();
                clearInterval(animInterval);
            }
        }, 30);
    }

    private createDashEffect(from: THREE.Vector3, to: THREE.Vector3, scene: THREE.Scene): void {
        // Create dash trail
        const points: THREE.Vector3[] = [];
        const trailLength = 10;

        for (let i = 0; i <= trailLength; i++) {
            const t = i / trailLength;
            const point = new THREE.Vector3().lerpVectors(from, to, t);
            point.y += 0.5;
            points.push(point);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff, // Cyan dash trail
            linewidth: 5,
            transparent: true,
            opacity: 0.8
        });

        const trail = new THREE.Line(geometry, material);
        scene.add(trail);

        // Fade out
        let opacity = 0.8;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;
            material.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                scene.remove(trail);
                geometry.dispose();
                material.dispose();
                clearInterval(fadeInterval);
            }
        }, 30);
    }
}
