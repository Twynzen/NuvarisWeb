import * as THREE from 'three';
import { SpriteAnimator } from '../engine/sprite-animator';
import { ProjectileThree } from './projectile.three';
import { EnemyThree } from './enemy.three';

// 8-directional movement/attack directions
export type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

export class PlayerThree {
    public mesh: THREE.Group;
    private sprite: THREE.Sprite;
    private animator: SpriteAnimator;
    private speed = 10;

    // State
    private isMoving = false;
    private isShooting = false;
    private isAttacking = false; // For Lars 3-frame attack animations
    private facingRight = true;
    private lastMoveDir = new THREE.Vector3(1, 0, 0);
    private lastDirection8: Direction8 = 'right'; // Track 8-directional facing
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

    // ========== LARS ATTACK SYSTEM ==========
    private larsAttackDuration = 200; // 3 frames @ 15fps = 200ms
    private lastAttackTime = 0;
    private attackCooldown = 0.3; // 300ms between attacks

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
        this.sprite.scale.set(4.5, 4.5, 1);
        this.mesh.add(this.sprite);

        scene.add(this.mesh);

        // Animator - animations loaded but NOT played until preload completes
        this.animator = new SpriteAnimator(material);
        this.loadAnimations();
        // Don't play idle here - wait for preloadTextures() to complete first
    }

    private loadAnimations() {
        const folder = this.characterId;
        const prefix = `${this.characterId}-`;

        // === IDLE ===
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
            frameRate: 10, // Slow idle for relaxed breathing (3s cycle)
            loop: true
        });

        // === CARDINAL MOVEMENT (all characters) ===
        this.animator.loadAnimation({
            name: 'run-right',
            texturePath: `assets/${folder}/right`,
            prefix: `${prefix}walk-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        this.animator.loadAnimation({
            name: 'run-left',
            texturePath: `assets/${folder}/left`,
            prefix: `${prefix}walk-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        this.animator.loadAnimation({
            name: 'up',
            texturePath: `assets/${folder}/up`,
            prefix: `${prefix}walk-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        this.animator.loadAnimation({
            name: 'down',
            texturePath: `assets/${folder}/down`,
            prefix: `${prefix}walk-down-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // === DEAD (all characters) ===
        this.animator.loadAnimation({
            name: 'dead',
            texturePath: `assets/${folder}/dead`,
            prefix: `${prefix}dead-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        // === LARS-SPECIFIC ANIMATIONS ===
        if (this.characterId === 'lars') {
            this.loadLarsAnimations();
        } else {
            // Other characters use shoot animations (30 frames)
            this.loadShootAnimations(folder, prefix);
        }
    }

    /**
     * Load Lars-specific animations:
     * - 4 diagonal movement animations (30 frames each)
     * - 8 attack animations (3 frames each)
     */
    private loadLarsAnimations() {
        const folder = 'lars';
        const prefix = 'lars-';

        // === DIAGONAL MOVEMENT (30 frames each) ===
        this.animator.loadAnimation({
            name: 'run-up-left',
            texturePath: `assets/${folder}/up-left`,
            prefix: `${prefix}walk-up-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        this.animator.loadAnimation({
            name: 'run-up-right',
            texturePath: `assets/${folder}/up-right`,
            prefix: `${prefix}walk-up-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        this.animator.loadAnimation({
            name: 'run-down-left',
            texturePath: `assets/${folder}/down-left`,
            prefix: `${prefix}walk-down-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        this.animator.loadAnimation({
            name: 'run-down-right',
            texturePath: `assets/${folder}/down-right`,
            prefix: `${prefix}walk-down-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // === ATTACK ANIMATIONS (3 frames each, 8 directions) ===
        const attackDirections: Direction8[] = [
            'up', 'down', 'left', 'right',
            'up-left', 'up-right', 'down-left', 'down-right'
        ];

        for (const dir of attackDirections) {
            this.animator.loadAnimation({
                name: `attack-${dir}`,
                texturePath: `assets/${folder}/attack/${dir}`,
                prefix: `${prefix}attack-${dir}-`,
                suffix: '.png',
                frameCount: 3,
                frameRate: 15, // 3 frames @ 15fps = 200ms (snappy attack)
                loop: false
            });
        }

        console.log('[LARS] Loaded 8-directional movement + 8-directional attack animations');
    }

    /**
     * Load shoot animations for non-Lars characters
     */
    private loadShootAnimations(folder: string, prefix: string) {
        this.animator.loadAnimation({
            name: 'shoot-right',
            texturePath: `assets/${folder}/shoot/right`,
            prefix: `${prefix}shoot-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        this.animator.loadAnimation({
            name: 'shoot-left',
            texturePath: `assets/${folder}/shoot/left`,
            prefix: `${prefix}shoot-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        this.animator.loadAnimation({
            name: 'shoot-up',
            texturePath: `assets/${folder}/shoot/up`,
            prefix: `${prefix}shoot-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        this.animator.loadAnimation({
            name: 'shoot-down',
            texturePath: `assets/${folder}/shoot/down`,
            prefix: `${prefix}shoot-down-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });
    }

    /**
     * Calculate 8-directional direction from movement input
     */
    private getDirection8FromMovement(moveX: number, moveZ: number): Direction8 {
        if (moveX > 0 && moveZ < 0) return 'up-right';
        if (moveX > 0 && moveZ > 0) return 'down-right';
        if (moveX < 0 && moveZ < 0) return 'up-left';
        if (moveX < 0 && moveZ > 0) return 'down-left';
        if (moveX > 0) return 'right';
        if (moveX < 0) return 'left';
        if (moveZ < 0) return 'up';
        if (moveZ > 0) return 'down';
        return this.lastDirection8; // Default to last direction
    }

    /**
     * Calculate 8-directional direction to a target position
     */
    private getDirection8ToTarget(targetPosition: THREE.Vector3): Direction8 {
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.mesh.position)
            .normalize();

        const absX = Math.abs(direction.x);
        const absZ = Math.abs(direction.z);

        // Use 22.5 degree threshold for diagonal detection
        // tan(22.5°) ≈ 0.414, so if ratio > 0.414 both components are significant
        const ratio = Math.min(absX, absZ) / Math.max(absX, absZ);
        const isDiagonal = ratio > 0.414;

        if (isDiagonal) {
            // Diagonal direction
            if (direction.x > 0 && direction.z < 0) return 'up-right';
            if (direction.x > 0 && direction.z > 0) return 'down-right';
            if (direction.x < 0 && direction.z < 0) return 'up-left';
            if (direction.x < 0 && direction.z > 0) return 'down-left';
        }

        // Cardinal direction (dominant axis)
        if (absZ > absX) {
            return direction.z < 0 ? 'up' : 'down';
        } else {
            return direction.x < 0 ? 'left' : 'right';
        }
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

            // Update 8-directional facing
            this.lastDirection8 = this.getDirection8FromMovement(moveX, moveZ);

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
        // Priority: Attack > Melee/Shooting > Movement > Idle
        let animationPlayed = '';

        if (this.isAttacking) {
            // Attack animation is handled in playAttackAnimation() - don't override
            animationPlayed = 'attacking';
        } else if (this.isMeleeAttacking) {
            // Melee animation is handled in meleeAttack() - don't override it
            animationPlayed = 'melee';
        } else if (this.isShooting) {
            // Shooting animation is handled in shoot()
            animationPlayed = 'shooting';
        } else if (this.isMoving) {
            // Movement animations - Lars uses 8-directional
            if (this.characterId === 'lars') {
                animationPlayed = this.playLarsMovementAnimation(moveX, moveZ);
            } else {
                animationPlayed = this.playCardinalMovementAnimation(moveX, moveZ);
            }
        } else {
            this.animator.play('idle'); // Uses 10fps from config
            animationPlayed = 'idle';
        }

        // Debug log for animation state (throttled - only when moving)
        if (this.DEBUG_FLIP && this.isMoving) {
            console.log(`[ANIM] moveX=${moveX}, moveZ=${moveZ}, anim=${animationPlayed}, dir8=${this.lastDirection8}`);
        }

        this.animator.update(delta);
    }

    /**
     * Play Lars 8-directional movement animation
     */
    private playLarsMovementAnimation(moveX: number, moveZ: number): string {
        const dir = this.getDirection8FromMovement(moveX, moveZ);
        let animName = '';

        switch (dir) {
            case 'up-right':
                animName = 'run-up-right';
                break;
            case 'up-left':
                animName = 'run-up-left';
                break;
            case 'down-right':
                animName = 'run-down-right';
                break;
            case 'down-left':
                animName = 'run-down-left';
                break;
            case 'right':
                animName = 'run-right';
                break;
            case 'left':
                animName = 'run-left';
                break;
            case 'up':
                animName = 'up';
                break;
            case 'down':
                animName = 'down';
                break;
        }

        this.animator.play(animName); // Uses frameRate from config (30fps)
        return animName;
    }

    /**
     * Play cardinal (4-directional) movement animation for other characters
     */
    private playCardinalMovementAnimation(moveX: number, moveZ: number): string {
        let animName = '';

        if (moveX > 0) {
            animName = 'run-right';
        } else if (moveX < 0) {
            animName = 'run-left';
        } else if (moveZ < 0) {
            animName = 'up';
        } else if (moveZ > 0) {
            animName = 'down';
        }

        this.animator.play(animName); // Uses frameRate from config (30fps)
        return animName;
    }

    // ========== LARS ATTACK ANIMATION (3 frames, 8 directions) ==========

    /**
     * Play Lars attack animation towards a target
     * Uses 3-frame attack animations in 8 directions
     * @param targetPosition Position to attack towards
     * @returns Promise that resolves when attack animation completes
     */
    public playAttackAnimation(targetPosition: THREE.Vector3): Promise<void> {
        return new Promise((resolve) => {
            if (this.characterId !== 'lars') {
                // Non-Lars characters don't have attack animations
                resolve();
                return;
            }

            // Check cooldown
            const now = Date.now();
            if (now - this.lastAttackTime < this.attackCooldown * 1000) {
                resolve();
                return;
            }

            this.isAttacking = true;
            this.lastAttackTime = now;

            // Get 8-directional direction to target
            const direction = this.getDirection8ToTarget(targetPosition);
            this.lastDirection8 = direction;

            // Update facing based on direction
            if (direction.includes('right')) {
                this.facingRight = true;
            } else if (direction.includes('left')) {
                this.facingRight = false;
            }

            // Update last move direction for consistency
            const dirVector = new THREE.Vector3()
                .subVectors(targetPosition, this.mesh.position)
                .normalize();
            this.lastMoveDir.copy(dirVector);

            // Play attack animation
            const attackAnim = `attack-${direction}`;
            this.animator.play(attackAnim); // Uses frameRate from config (15fps = 200ms)

            if (this.DEBUG_FLIP) {
                console.log(`[LARS ATTACK] direction=${direction}, anim=${attackAnim}`);
            }

            // Reset attacking state after animation completes (200ms for 3 frames @ 15fps)
            setTimeout(() => {
                this.isAttacking = false;
                resolve();
            }, this.larsAttackDuration);
        });
    }

    /**
     * Check if currently playing attack animation
     */
    public isPlayingAttack(): boolean {
        return this.isAttacking;
    }

    /**
     * Get the last 8-directional facing direction
     */
    public getLastDirection8(): Direction8 {
        return this.lastDirection8;
    }

    shoot(scene: THREE.Scene, targetPosition?: THREE.Vector3): ProjectileThree | null {
        if (this.isShooting) return null;

        // Lars doesn't use projectile shooting - uses mental attack instead
        if (this.characterId === 'lars') {
            console.warn('[PLAYER] Lars should use playAttackAnimation() instead of shoot()');
            return null;
        }

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

    // ========== FACE TARGET (for Lars mental attack - legacy support) ==========
    /**
     * Make player face a target and play attack animation
     * Used for Lars mental attack which has no projectile
     * @deprecated Use playAttackAnimation() instead for full 8-directional support
     */
    faceTarget(targetPosition: THREE.Vector3): void {
        // For Lars, trigger attack animation
        if (this.characterId === 'lars') {
            this.playAttackAnimation(targetPosition);
            return;
        }

        // Legacy behavior for other characters
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.mesh.position)
            .normalize();

        // Update facing direction
        const absX = Math.abs(direction.x);
        const absZ = Math.abs(direction.z);

        if (absX >= absZ) {
            // Horizontal dominant
            this.facingRight = direction.x >= 0;
        }

        // Update last move direction for consistency
        this.lastMoveDir.copy(direction);
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
        this.isAttacking = false;

        // Play death animation once
        this.animator.play('dead', false, 15); // Slower for dramatic effect
    }

    /**
     * Preload all player textures to avoid stuttering at game start
     * Starts idle animation after preload completes
     * @returns Promise that resolves when all textures are loaded
     */
    public async preloadTextures(): Promise<void> {
        await this.animator.preloadAll();
        // Now that textures are loaded, start idle animation
        this.animator.play('idle');
    }

    /**
     * Get texture loading progress (0-1)
     */
    public getLoadingProgress(): number {
        return this.animator.getLoadingProgress();
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
