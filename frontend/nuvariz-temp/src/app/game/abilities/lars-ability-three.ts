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

    // ========== COSMIC SPIRAL EFFECT (Espiral Cósmica Psíquica) ==========
    /**
     * Crea efecto visual de ESPIRAL CÓSMICA
     * - Partículas de polvo estelar en espiral helicoidal
     * - Como cable de cobre enrollado / tornado cósmico
     * - Anillos que giran en espiral hacia el enemigo
     */
    public createMentalAttackEffect(
        playerPos: THREE.Vector3,
        enemy: EnemyThree,
        scene: THREE.Scene
    ): void {
        const enemyPos = enemy.mesh.position.clone();

        // Calcular dirección y distancia
        const direction = new THREE.Vector3().subVectors(enemyPos, playerPos);
        const distance = direction.length();
        direction.normalize();

        // Altura base del efecto
        const effectHeight = 1.2;

        // ====== 1. PARTÍCULAS DE POLVO CÓSMICO EN ESPIRAL ======
        const particles: THREE.Mesh[] = [];
        const particleMaterials: THREE.MeshBasicMaterial[] = [];
        const particleCount = 24; // Más partículas para efecto de polvo
        const spiralTurns = 3; // Vueltas de la espiral
        const maxRadius = 0.8; // Radio máximo de la espiral

        const particleGeometry = new THREE.SphereGeometry(0.08, 6, 6); // Pequeñas

        // Colores: púrpura y blanco
        const cosmicColors = [0x9933ff, 0xffffff, 0xaa55ff, 0xeeeeff, 0x7722dd];

        for (let i = 0; i < particleCount; i++) {
            const t = i / particleCount; // 0 a 1 a lo largo de la espiral
            const angle = t * Math.PI * 2 * spiralTurns; // Ángulo en espiral
            const radius = maxRadius * (0.3 + t * 0.7); // Radio crece hacia el enemigo

            const particleMaterial = new THREE.MeshBasicMaterial({
                color: cosmicColors[i % cosmicColors.length],
                transparent: true,
                opacity: 0.7 + Math.random() * 0.3
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Guardar datos para animación
            (particle as any).baseT = t;
            (particle as any).spiralAngle = angle;
            (particle as any).spiralRadius = radius;
            (particle as any).randomOffset = Math.random() * 0.2; // Variación orgánica

            scene.add(particle);
            particles.push(particle);
            particleMaterials.push(particleMaterial);
        }

        // ====== 2. ANILLOS ESPIRALES (como aros de tornado) ======
        const spiralRings: THREE.Mesh[] = [];
        const ringMaterials: THREE.MeshBasicMaterial[] = [];
        const ringCount = 5;

        for (let i = 0; i < ringCount; i++) {
            const ringGeometry = new THREE.TorusGeometry(
                0.3 + i * 0.1,  // Radio del torus (crece)
                0.03,           // Grosor del tubo (delgado)
                8,              // Segmentos radiales
                24              // Segmentos tubulares
            );

            const ringMaterial = new THREE.MeshBasicMaterial({
                color: cosmicColors[i % cosmicColors.length],
                transparent: true,
                opacity: 0.5
            });

            const ring = new THREE.Mesh(ringGeometry, ringMaterial);

            // Guardar datos
            (ring as any).baseT = (i + 1) / (ringCount + 1);
            (ring as any).rotationSpeed = 0.15 + i * 0.05;
            (ring as any).tiltAngle = Math.PI / 6 + (i * 0.1); // Inclinación variable

            scene.add(ring);
            spiralRings.push(ring);
            ringMaterials.push(ringMaterial);
        }

        // ====== 3. ANIMACIÓN ======
        let frame = 0;
        const maxFrames = 30; // ~1 segundo

        const animInterval = setInterval(() => {
            frame++;
            const progress = frame / maxFrames;
            const time = frame * 0.1; // Para rotaciones continuas

            // Animar partículas en espiral helicoidal
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                const mat = particleMaterials[i];

                const baseT = (particle as any).baseT;
                const spiralAngle = (particle as any).spiralAngle;
                const spiralRadius = (particle as any).spiralRadius;
                const randomOffset = (particle as any).randomOffset;

                // Avanzar la partícula hacia el enemigo + rotación espiral
                const currentT = Math.min(1, baseT + progress * 0.5);
                const currentAngle = spiralAngle + time * 2; // Rotación continua

                // Posición base interpolada entre player y enemy
                const basePos = new THREE.Vector3().lerpVectors(playerPos, enemyPos, currentT);
                basePos.y += effectHeight;

                // Añadir offset espiral (perpendicular a la dirección)
                const perpX = -direction.z; // Perpendicular en XZ
                const perpZ = direction.x;

                const offsetX = Math.cos(currentAngle) * spiralRadius * (1 - progress * 0.3);
                const offsetZ = Math.sin(currentAngle) * spiralRadius * (1 - progress * 0.3);
                const offsetY = Math.sin(currentAngle * 0.5) * 0.2 + randomOffset;

                particle.position.set(
                    basePos.x + perpX * offsetX + direction.x * offsetZ * 0.3,
                    basePos.y + offsetY,
                    basePos.z + perpZ * offsetX + direction.z * offsetZ * 0.3
                );

                // Escala pulsante
                const pulse = 1 + Math.sin(time * 3 + i) * 0.3;
                particle.scale.setScalar(pulse);

                // Fade out gradual
                mat.opacity = (0.7 + Math.random() * 0.3) * (1 - progress * 0.8);
            }

            // Animar anillos espirales
            for (let i = 0; i < spiralRings.length; i++) {
                const ring = spiralRings[i];
                const ringMat = ringMaterials[i];

                const baseT = (ring as any).baseT;
                const rotSpeed = (ring as any).rotationSpeed;
                const tilt = (ring as any).tiltAngle;

                // Avanzar hacia el enemigo
                const currentT = Math.min(1, baseT + progress * 0.6);
                const ringPos = new THREE.Vector3().lerpVectors(playerPos, enemyPos, currentT);
                ringPos.y += effectHeight;

                ring.position.copy(ringPos);

                // Rotación en espiral (como tornado)
                ring.rotation.x = tilt + time * rotSpeed;
                ring.rotation.y = time * rotSpeed * 2;
                ring.rotation.z = Math.sin(time + i) * 0.3;

                // Escala que se contrae hacia el final
                const ringScale = (1 - progress * 0.5) * (1 + Math.sin(time * 2) * 0.1);
                ring.scale.setScalar(ringScale);

                // Fade out
                ringMat.opacity = 0.5 * (1 - progress);
            }

            // Cleanup al final
            if (frame >= maxFrames) {
                for (const particle of particles) {
                    scene.remove(particle);
                }
                for (const mat of particleMaterials) {
                    mat.dispose();
                }
                particleGeometry.dispose();

                for (const ring of spiralRings) {
                    scene.remove(ring);
                    ring.geometry.dispose();
                }
                for (const mat of ringMaterials) {
                    mat.dispose();
                }

                clearInterval(animInterval);
            }
        }, 33); // ~30fps
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
