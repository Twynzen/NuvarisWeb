import * as THREE from 'three';
import { SpriteAnimator } from '../engine/sprite-animator';
import { ProjectileThree } from './projectile.three';
import { EnemyThree } from './enemy.three';

export class PlayerThree {
    public mesh: THREE.Group;
    private sprite: THREE.Sprite;
    private animator: SpriteAnimator;
    private speed = 10;

    // State
    private isMoving = false;
    private isShooting = false;
    private facingRight = true;
    private lastMoveDir = new THREE.Vector3(1, 0, 0);
    public isDead = false;

    private characterId: string;

    // ========== MELEE ATTACK SYSTEM (Project A) ==========
    private isMeleeAttacking = false;
    private meleeAttackRange = 5; // Units
    private meleeAttackDamage = 40; // Base damage
    private meleeKnockbackForce = 3; // Knockback strength
    private meleeAttackCooldown = 1.0; // Seconds between attacks (matches animation duration)
    private lastMeleeAttackTime = 0;
    private meleeAnimationDuration = 0.5; // Damage applies at 500ms into animation
    private pendingMeleeCallback: (() => void) | null = null;

    // Debug mode - set to true to see flip/animation logs
    private DEBUG_FLIP = false;

    // Map bounds for wall collision
    private mapBounds = 98;

    // Collision and sprite dimensions (for debug visualization)
    // Player is ~2x2 units to fit through small doors (4 units wide)
    public static readonly COLLISION_RADIUS = 1.0;
    public static readonly SPRITE_WIDTH = 2;
    public static readonly SPRITE_HEIGHT = 2;

    // Debug visualization group
    public debugGroup: THREE.Group | null = null;

    constructor(scene: THREE.Scene, characterId: string = 'proyecto-a') {
        this.characterId = characterId;
        this.mesh = new THREE.Group();

        // Configure Stats
        switch (characterId) {
            case 'proyecto-a':
                this.speed = 8; // Slow
                break;
            case 'lars':
                this.speed = 12; // Medium
                break;
            case 'proyecto-y':
                this.speed = 18; // Fast
                break;
        }

        // Sprite & Material
        const material = new THREE.SpriteMaterial({
            transparent: true,
            color: 0xffffff,
            side: THREE.DoubleSide
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.center.set(0.5, 0);
        this.sprite.scale.set(3, 3, 1);
        this.mesh.add(this.sprite);

        // Shadow
        const shadowGeo = new THREE.CircleGeometry(0.8, 32);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.05;
        this.mesh.add(shadow);

        scene.add(this.mesh);

        // Animator
        this.animator = new SpriteAnimator(material);
        this.loadAnimations();
        this.animator.play('idle');
    }

    private loadAnimations() {
        let folder = this.characterId;
        let prefix = `${this.characterId}-`;

        // Handle folder naming inconsistencies if any
        if (this.characterId === 'proyecto-y') {
            // Already correct
        }

        // Idle
        let idlePrefix = `${prefix}idle-`;
        if (this.characterId === 'lars') {
            idlePrefix = 'lars-idle-one-';
        }

        this.animator.loadAnimation({
            name: 'idle',
            texturePath: `assets/${folder}/idle`,
            prefix: idlePrefix,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // Run (Right)
        this.animator.loadAnimation({
            name: 'run-right',
            texturePath: `assets/${folder}/right`,
            prefix: `${prefix}walk-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // Run (Left) - Pre-flipped frames
        this.animator.loadAnimation({
            name: 'run-left',
            texturePath: `assets/${folder}/left`,
            prefix: `${prefix}walk-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // Shoot (Right)
        this.animator.loadAnimation({
            name: 'shoot-right',
            texturePath: `assets/${folder}/shoot/right`,
            prefix: `${prefix}shoot-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        // Shoot (Left) - Pre-flipped frames
        this.animator.loadAnimation({
            name: 'shoot-left',
            texturePath: `assets/${folder}/shoot/left`,
            prefix: `${prefix}shoot-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        // Shoot (Up)
        this.animator.loadAnimation({
            name: 'shoot-up',
            texturePath: `assets/${folder}/shoot/up`,
            prefix: `${prefix}shoot-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        // Shoot (Down)
        this.animator.loadAnimation({
            name: 'shoot-down',
            texturePath: `assets/${folder}/shoot/down`,
            prefix: `${prefix}shoot-down-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        // Walk Up
        this.animator.loadAnimation({
            name: 'up',
            texturePath: `assets/${folder}/up`,
            prefix: `${prefix}walk-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // Walk Down
        this.animator.loadAnimation({
            name: 'down',
            texturePath: `assets/${folder}/down`,
            prefix: `${prefix}walk-down-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // Dead
        this.animator.loadAnimation({
            name: 'dead',
            texturePath: `assets/${folder}/dead`,
            prefix: `${prefix}dead-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });
    }

    update(delta: number, keys: { [key: string]: boolean }) {
        // Don't update if dead
        if (this.isDead) {
            this.animator.update(delta);
            return;
        }

        const moveX = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
        const moveZ = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);

        this.isMoving = moveX !== 0 || moveZ !== 0;

        // Track previous state for logging
        const prevFacingRight = this.facingRight;

        if (this.isMoving) {
            const moveDir = new THREE.Vector3(moveX, 0, moveZ).normalize();
            this.mesh.position.add(moveDir.multiplyScalar(this.speed * delta));
            this.lastMoveDir.copy(moveDir);

            // Face direction - only update on horizontal movement
            if (moveX > 0) this.facingRight = true;
            else if (moveX < 0) this.facingRight = false;
        }

        // Clamp position to map bounds (wall collision)
        this.mesh.position.x = Math.max(-this.mapBounds, Math.min(this.mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-this.mapBounds, Math.min(this.mapBounds, this.mesh.position.z));

        // Debug log when facing direction changes
        if (this.DEBUG_FLIP && prevFacingRight !== this.facingRight) {
            console.log(`[DIRECTION] Changed: facingRight=${this.facingRight}`);
        }

        // Animation State Machine
        // Priority: Melee/Shooting > Horizontal Movement > Vertical Movement > Idle
        // Uses separate left/right animations instead of scale flip
        let animationPlayed = '';

        if (this.isMeleeAttacking) {
            // Melee animation is handled in meleeAttack() - don't override it
            animationPlayed = 'melee';
        } else if (this.isShooting) {
            // Shooting animation is handled in shoot()
            animationPlayed = 'shooting';
        } else if (this.isMoving) {
            // Prioritize horizontal movement for run animation
            if (moveX > 0) {
                // Moving right
                this.animator.play('run-right', true, 30);
                animationPlayed = 'run-right';
            } else if (moveX < 0) {
                // Moving left - use pre-flipped left animation
                this.animator.play('run-left', true, 30);
                animationPlayed = 'run-left';
            } else if (moveZ < 0) {
                // Pure vertical up movement
                this.animator.play('up', true, 30);
                animationPlayed = 'up';
            } else if (moveZ > 0) {
                // Pure vertical down movement
                this.animator.play('down', true, 30);
                animationPlayed = 'down';
            }
        } else {
            this.animator.play('idle', true, 30);
            animationPlayed = 'idle';
        }

        // Debug log for animation state (throttled - only when moving)
        if (this.DEBUG_FLIP && this.isMoving) {
            console.log(`[ANIM] moveX=${moveX}, moveZ=${moveZ}, anim=${animationPlayed}, facingRight=${this.facingRight}`);
        }

        this.animator.update(delta);
    }

    shoot(scene: THREE.Scene, targetPosition?: THREE.Vector3): ProjectileThree | null {
        if (this.isShooting) return null;

        this.isShooting = true;

        // Determine shoot direction and animation
        let shootAnim = 'shoot-right';
        let direction = new THREE.Vector3(1, 0, 0);

        if (targetPosition) {
            // Auto-aim: Calculate direction to target
            direction = new THREE.Vector3()
                .subVectors(targetPosition, this.mesh.position)
                .normalize();

            // Determine animation based on direction to target
            const absX = Math.abs(direction.x);
            const absZ = Math.abs(direction.z);

            if (absZ > absX) {
                // Vertical direction is dominant
                if (direction.z < 0) {
                    shootAnim = 'shoot-up';
                } else {
                    shootAnim = 'shoot-down';
                }
            } else {
                // Horizontal direction is dominant
                if (direction.x < 0) {
                    shootAnim = 'shoot-left';
                    this.facingRight = false;
                } else {
                    shootAnim = 'shoot-right';
                    this.facingRight = true;
                }
            }
        } else {
            // Manual aim: Use last move direction
            if (this.lastMoveDir.z < -0.5) {
                shootAnim = 'shoot-up';
                direction.set(0, 0, -1);
            } else if (this.lastMoveDir.z > 0.5) {
                shootAnim = 'shoot-down';
                direction.set(0, 0, 1);
            } else {
                shootAnim = this.facingRight ? 'shoot-right' : 'shoot-left';
                direction.set(this.facingRight ? 1 : -1, 0, 0);
            }
        }

        if (this.DEBUG_FLIP) {
            console.log(`[SHOOT] anim=${shootAnim}, direction=(${direction.x.toFixed(2)}, ${direction.z.toFixed(2)}), facingRight=${this.facingRight}`);
        }

        this.animator.play(shootAnim, false, 30);

        // Reset shooting state after animation completes
        // 30 frames @ 30 FPS = 1000ms
        setTimeout(() => {
            this.isShooting = false;
        }, 1000);

        // Create Projectile
        return new ProjectileThree(scene, this.mesh.position.x, this.mesh.position.z, direction, this.characterId);
    }

    // ========== MELEE ATTACK (Project A) ==========

    /**
     * Perform a melee attack that damages all enemies in range
     * DAÑO SE APLICA AL FINAL DE LA ANIMACIÓN (no instantáneo)
     * @param scene Three.js scene for visual effects
     * @param enemies Array of all enemies to check
     * @param currentTime Current game time for cooldown
     * @param damageMultiplier Optional damage multiplier from abilities
     * @param knockbackMultiplier Optional knockback multiplier from abilities
     * @param onDamageDealt Callback when damage is dealt (for lifesteal)
     * @returns Empty result immediately - damage happens after animation
     */
    meleeAttack(
        scene: THREE.Scene,
        enemies: EnemyThree[],
        currentTime: number,
        damageMultiplier: number = 1,
        knockbackMultiplier: number = 1,
        onDamageDealt?: (totalDamage: number, enemiesHit: number, orbs: any[]) => void
    ): { orbs: any[], enemiesHit: EnemyThree[] } {
        const result = { orbs: [] as any[], enemiesHit: [] as EnemyThree[] };

        // Check cooldown
        if (currentTime - this.lastMeleeAttackTime < this.meleeAttackCooldown) {
            return result;
        }

        if (this.isMeleeAttacking) {
            return result;
        }

        this.isMeleeAttacking = true;
        this.lastMeleeAttackTime = currentTime;

        // Find nearest enemy to determine attack direction
        let nearestEnemy: EnemyThree | null = null;
        let nearestDist = this.meleeAttackRange * 2; // Look a bit further to aim

        for (const enemy of enemies) {
            if (enemy.isDead || enemy.isMindControlled) continue;
            const dist = this.mesh.position.distanceTo(enemy.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        // Determine attack direction based on nearest enemy
        // PROJECT A uses directional shoot animations (shoot-right, shoot-left, shoot-up, shoot-down)
        let attackAnim = this.facingRight ? 'shoot-right' : 'shoot-left';

        if (nearestEnemy) {
            const dirToEnemy = new THREE.Vector3()
                .subVectors(nearestEnemy.mesh.position, this.mesh.position)
                .normalize();

            const absX = Math.abs(dirToEnemy.x);
            const absZ = Math.abs(dirToEnemy.z);

            if (absZ > absX) {
                // Vertical direction is dominant
                attackAnim = dirToEnemy.z < 0 ? 'shoot-up' : 'shoot-down';
            } else {
                // Horizontal direction is dominant
                if (dirToEnemy.x < 0) {
                    attackAnim = 'shoot-left';
                    this.facingRight = false;
                } else {
                    attackAnim = 'shoot-right';
                    this.facingRight = true;
                }
            }
        }

        // Play attack animation (30 frames at 30 FPS = 1 second)
        this.animator.play(attackAnim, false, 30);

        // Calculate damage with multiplier
        const finalDamage = this.meleeAttackDamage * damageMultiplier;
        const finalKnockback = this.meleeKnockbackForce * knockbackMultiplier;

        // DAÑO DIFERIDO: Se aplica al terminar la animación (500ms)
        setTimeout(() => {
            const delayedResult = { orbs: [] as any[], enemiesHit: [] as EnemyThree[], totalDamage: 0 };

            // Find and damage all enemies in range AT THE MOMENT OF IMPACT
            for (const enemy of enemies) {
                if (enemy.isDead || enemy.isMindControlled) continue;

                const dist = this.mesh.position.distanceTo(enemy.mesh.position);
                if (dist <= this.meleeAttackRange) {
                    // Apply knockback first
                    enemy.applyKnockback(this.mesh.position, finalKnockback);

                    // Apply damage
                    const orb = enemy.takeDamage(finalDamage, scene);
                    if (orb) {
                        delayedResult.orbs.push(orb);
                    }

                    delayedResult.enemiesHit.push(enemy);
                    delayedResult.totalDamage += finalDamage;
                }
            }

            if (delayedResult.enemiesHit.length > 0) {
                console.log(`[MELEE] Hit ${delayedResult.enemiesHit.length} enemies for ${finalDamage} damage each`);
            }

            // Callback for lifesteal and other effects
            if (onDamageDealt) {
                onDamageDealt(delayedResult.totalDamage, delayedResult.enemiesHit.length, delayedResult.orbs);
            }
        }, this.meleeAnimationDuration * 1000); // 500ms delay

        // Reset melee attacking state after full animation
        setTimeout(() => {
            this.isMeleeAttacking = false;
        }, this.meleeAttackCooldown * 1000);

        // Return empty - damage happens later
        return result;
    }


    /**
     * Check if this character uses melee attacks
     * NOTE: Project A now uses curved projectile (hoz), not melee
     */
    public isMeleeCharacter(): boolean {
        return false; // Todos usan proyectiles ahora
    }

    /**
     * Check if this character uses curved projectile (Project A's hoz)
     */
    public usesCurvedProjectile(): boolean {
        return this.characterId === 'proyecto-a';
    }

    /**
     * Get character ID
     */
    public getCharacterId(): string {
        return this.characterId;
    }

    // Called when player dies
    die(): void {
        if (this.isDead) return;

        this.isDead = true;
        this.isMoving = false;
        this.isShooting = false;

        // Play death animation once
        this.animator.play('dead', false, 15); // Slower for dramatic effect
    }

    /**
     * Fade out the player sprite over duration (in seconds)
     * Returns a promise that resolves when fade out is complete
     */
    public fadeOut(duration: number = 1.0): Promise<void> {
        return new Promise((resolve) => {
            const startOpacity = 1.0;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = (Date.now() - startTime) / 1000; // Convert to seconds
                const progress = Math.min(elapsed / duration, 1.0);
                const opacity = startOpacity * (1.0 - progress);

                // Get the sprite material and set opacity
                const material = this.sprite.material as THREE.SpriteMaterial;
                material.opacity = opacity;

                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    // Fade out complete
                    material.opacity = 0;
                    resolve();
                }
            };

            animate();
        });
    }
}
