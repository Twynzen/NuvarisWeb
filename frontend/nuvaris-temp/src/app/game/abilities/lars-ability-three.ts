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
 * - Minions can explode for AOE damage (Q key)
 * - New mechanics: slow, fear, explode on conversion fail
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

    // NEW: Slow on hit (projectiles slow enemies)
    public slowChance = 0; // Chance to slow
    public slowAmount = 0; // % slow (0.1 = 10%)
    public slowDuration = 3; // seconds

    // NEW: Explode on conversion fail
    public explodeOnFailChance = 0; // Epic: 25%, Legendary: 50%
    public explodeOnFailRadius = 8;
    public explodeOnFailDamage = 40;

    // NEW: Fear on fail (makes enemy flee)
    public fearChance = 0; // 10% chance to fear if doesn't convert
    public fearDuration = 3; // seconds

    // Mind control duration base (10 seconds)
    private baseDuration = 10;

    // Callback para reproducir sonido de control mental
    public onMindControlCallback: (() => void) | null = null;

    // Callback para reproducir sonido de explosión de minions
    public onMinionExplodeCallback: (() => void) | null = null;

    // GameState reference for healing
    private gameState: any = null;

    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void {
        this.gameState = gameState;
        this.scene = scene;
        this.player = player;
        console.log('[LARS] Mind Control ability initialized');
    }

    update(delta: number, scene: THREE.Scene, player: PlayerThree, enemies: EnemyThree[]): void {
        // NOTE: Slow effect is now handled by EnemyThree.update() with typed properties
        // Only need to update fear timers here
        for (const enemy of enemies) {
            if (enemy.isDead) continue;

            // Update fear effect (still using dynamic property for now)
            if ((enemy as any).fearTimer > 0) {
                (enemy as any).fearTimer -= delta;
                if ((enemy as any).fearTimer <= 0) {
                    (enemy as any).isFleeing = false;
                }
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
        if (this.slowChance > 0 && Math.random() < this.slowChance) {
            this.applySlowEffect(enemy);
        }

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
            // Conversion FAILED - check for fail effects

            // Check for explosion on fail
            if (this.explodeOnFailChance > 0 && Math.random() < this.explodeOnFailChance) {
                this.triggerFailExplosion(enemy, allEnemies, scene);
            }
            // Check for fear on fail
            else if (this.fearChance > 0 && Math.random() < this.fearChance) {
                this.applyFearEffect(enemy);
            }
        }
    }

    /**
     * Apply slow effect to enemy (using typed method)
     */
    private applySlowEffect(enemy: EnemyThree): void {
        // Use the new typed method on EnemyThree
        enemy.applySlow(this.slowDuration, this.slowAmount);
        console.log(`[LARS] Enemy slowed by ${this.slowAmount * 100}%!`);
    }

    /**
     * Apply fear effect to enemy (makes them flee)
     */
    private applyFearEffect(enemy: EnemyThree): void {
        (enemy as any).fearTimer = this.fearDuration;
        (enemy as any).isFleeing = true;

        // Visual: Yellow flash
        const sprite = enemy.mesh.children[0] as THREE.Sprite;
        if (sprite && sprite.material) {
            (sprite.material as THREE.SpriteMaterial).color.setHex(0xffff00);

            setTimeout(() => {
                if (!enemy.isDead) {
                    (sprite.material as THREE.SpriteMaterial).color.setHex(0xffaaaa);
                }
            }, 200);
        }

        console.log('[LARS] Enemy feared!');
    }

    /**
     * Trigger explosion when conversion fails
     */
    private triggerFailExplosion(
        enemy: EnemyThree,
        allEnemies: EnemyThree[],
        scene: THREE.Scene
    ): void {
        console.log('[LARS] Conversion failed - EXPLOSION!');

        // Create explosion visual
        this.createExplosionEffect(enemy.mesh.position, scene, 0xff4400); // Orange for fail explosion

        // Play explosion sound
        if (this.onMinionExplodeCallback) {
            this.onMinionExplodeCallback();
        }

        // Deal AOE damage
        for (const target of allEnemies) {
            if (target.isDead || target.isMindControlled) continue;

            const dist = enemy.mesh.position.distanceTo(target.mesh.position);
            if (dist <= this.explodeOnFailRadius) {
                target.takeDamage(this.explodeOnFailDamage, scene);
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
     * This is always available - press Q to detonate minions!
     */
    public triggerExplosion(allEnemies: EnemyThree[], scene?: THREE.Scene): void {
        const sceneToUse = scene || this.scene;

        const explosionRadius = 10;
        const explosionDamage = 50;
        let totalHealing = 0;

        // Find all mind-controlled enemies
        const controlledEnemies = allEnemies.filter(e => e.isMindControlled && !e.isDead);

        if (controlledEnemies.length === 0) {
            console.log('[LARS] No minions to explode!');
            return;
        }

        console.log(`[LARS] Exploding ${controlledEnemies.length} minions!`);

        // Play explosion sound ONCE for all explosions
        if (this.onMinionExplodeCallback) {
            this.onMinionExplodeCallback();
        }

        for (const minion of controlledEnemies) {
            // Create visual explosion
            this.createExplosionEffect(minion.mesh.position, sceneToUse);

            // Deal AOE damage to nearby NON-controlled enemies
            for (const target of allEnemies) {
                if (target === minion || target.isDead || target.isMindControlled) continue;

                const dist = minion.mesh.position.distanceTo(target.mesh.position);
                if (dist <= explosionRadius) {
                    target.takeDamage(explosionDamage, sceneToUse);
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
        if (totalHealing > 0 && this.gameState) {
            this.gameState.health = Math.min(this.gameState.health + totalHealing, this.gameState.maxHealth);
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

    // ========== MENTAL ATTACK EFFECT (sin proyectil) ==========
    /**
     * Crea efecto visual de ataque mental SIMPLIFICADO
     * - Linea de "mirada" desde Lars al enemigo
     * - Particulas de energia orbitando al enemigo (no barril)
     */
    public createMentalAttackEffect(
        playerPos: THREE.Vector3,
        enemy: EnemyThree,
        scene: THREE.Scene
    ): void {
        const enemyPos = enemy.mesh.position.clone();

        // 1. Linea de conexion mental (purpura, ondulante)
        const points: THREE.Vector3[] = [];
        const segments = 8;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(playerPos, enemyPos, t);
            point.y += 1.5; // A altura de ojos

            // Ondulacion sutil en puntos medios
            if (i > 0 && i < segments) {
                point.x += (Math.random() - 0.5) * 0.3;
                point.z += (Math.random() - 0.5) * 0.3;
            }
            points.push(point);
        }

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x9900ff, // Purpura mental
            transparent: true,
            opacity: 0.8
        });

        const mentalLine = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(mentalLine);

        // 2. PARTICULAS DE ENERGIA orbitando al enemigo (mas organico)
        const particles: THREE.Mesh[] = [];
        const particleMaterials: THREE.MeshBasicMaterial[] = [];
        const particleCount = 6;
        const orbitRadius = 1.0;

        const particleGeometry = new THREE.SphereGeometry(0.15, 8, 8);

        for (let i = 0; i < particleCount; i++) {
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x9900ff : 0xff00ff, // Alternar purpura/magenta
                transparent: true,
                opacity: 0.9
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Posicion inicial distribuida en circulo
            const startAngle = (i / particleCount) * Math.PI * 2;
            const startHeight = 0.5 + (i % 3) * 0.7; // Alturas variadas

            (particle as any).orbitAngle = startAngle;
            (particle as any).orbitHeight = startHeight;
            (particle as any).orbitSpeed = 0.15 + Math.random() * 0.1;

            particle.position.set(
                enemyPos.x + Math.cos(startAngle) * orbitRadius,
                startHeight,
                enemyPos.z + Math.sin(startAngle) * orbitRadius
            );

            scene.add(particle);
            particles.push(particle);
            particleMaterials.push(particleMaterial);
        }

        // Animacion (solo linea + esferas, sin glow)
        let opacity = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;

            // Seguir al enemigo
            const currentEnemyPos = enemy.mesh.position;

            // Orbitar particulas alrededor del enemigo
            for (const particle of particles) {
                const angle = (particle as any).orbitAngle;
                const height = (particle as any).orbitHeight;
                const speed = (particle as any).orbitSpeed;

                (particle as any).orbitAngle += speed;

                particle.position.x = currentEnemyPos.x + Math.cos(angle) * orbitRadius;
                particle.position.z = currentEnemyPos.z + Math.sin(angle) * orbitRadius;
                particle.position.y = currentEnemyPos.y + height;
            }

            // Fade
            lineMaterial.opacity = Math.max(0, opacity * 0.8);
            for (const mat of particleMaterials) {
                mat.opacity = Math.max(0, opacity * 0.9);
            }

            if (opacity <= 0) {
                scene.remove(mentalLine);

                lineGeometry.dispose();
                lineMaterial.dispose();

                for (const particle of particles) {
                    scene.remove(particle);
                }
                for (const mat of particleMaterials) {
                    mat.dispose();
                }
                particleGeometry.dispose();

                clearInterval(fadeInterval);
            }
        }, 35); // ~28fps
    }

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
}
