import * as THREE from 'three';
import { PlayerThree } from './player.three';
import { SpriteAnimator } from '../engine/sprite-animator';
import { XPOrb } from './xp-orb.three';

export class EnemyThree {
    public mesh: THREE.Group;
    private sprite: THREE.Sprite;
    private animator: SpriteAnimator;
    private speed = 5;
    public health = 50;
    public isDead = false;
    private enemyType: 'spider' | 'worm' = 'spider'; // Enemy type

    // Collision and sprite dimensions (for debug visualization)
    // Enemies are slightly smaller than player to navigate corridors
    public static readonly COLLISION_RADIUS = 0.8;
    public static readonly SPRITE_WIDTH = 1.5;
    public static readonly SPRITE_HEIGHT = 1.5;

    // Debug visualization group
    public debugGroup: THREE.Group | null = null;

    // Attack system
    private lastAttackTime = 0;
    private attackCooldown = 1.0; // 1 segundo entre ataques
    private attackRange = 5; // Rango para iniciar ataque
    private attackDamage = 20; // Daño del ataque
    private isAttacking = false;
    private attackDuration = 0.3; // Duración visual del ataque
    private attackStartTime = 0;
    private hasDealtDamageThisAttack = false; // Prevent multiple damage hits per attack
    private originalColor = 0xffaaaa;

    // Dash attack system
    private isDashing = false;
    private dashCooldown = 0; // Current cooldown timer
    private dashMaxCooldown = 2.0; // 2 seconds between dashes
    private dashDuration = 0; // Current dash timer
    private dashMaxDuration = 0.5; // 500ms dash (increased from 300ms for longer distance)
    private dashSpeed = this.speed * 4; // 4x normal speed (increased from 3x for longer distance)
    private hasDealtDamageThisDash = false; // Prevent multiple damage hits per dash

    // Telegraph (preparation phase)
    private isTelegraphing = false;
    private telegraphDuration = 0;
    private telegraphMaxDuration = 0.25; // 250ms preparation
    private telegraphFlashInterval = 0.05; // Flash every 50ms
    private telegraphFlashTimer = 0;

    // Dash trigger range (in Three.js units)
    // Triggers when player is at medium distance: closer than dashTriggerMax but farther than normal attack
    private dashTriggerMin = 5.5; // Just beyond normal attack range (5 units)
    private dashTriggerMax = 12; // Medium distance - not too far

    // Dash direction (stored when dash starts)
    private dashDirection = new THREE.Vector3();

    // Home portal system
    public homePortal: any = null;
    public isReturningToHome: boolean = false;
    public isPatrolling: boolean = true;
    private patrolCenter: THREE.Vector3 = new THREE.Vector3();
    private patrolRadius: number = 0;
    private patrolTimer: number = 0;
    private patrolUpdateInterval: number = 1.0; // Update patrol direction every second

    // ========== MIND CONTROL SYSTEM (Lars Ability) ==========
    public isMindControlled: boolean = false;
    private mindControlDuration: number = 0;
    private mindControlMaxDuration: number = 10; // 10 seconds default
    private mindControlColor: number = 0x0066ff; // Blue color for mind controlled
    public targetAllies: boolean = false; // When true, attacks other enemies instead of player

    // ========== STUN SYSTEM (Yurany Ability) ==========
    public isStunned: boolean = false;
    private stunDuration: number = 0;

    // ========== SLOW SYSTEM (Lars Ability) ==========
    public isSlowed: boolean = false;
    private slowDuration: number = 0;
    private slowAmount: number = 0;
    private originalSpeed: number = 5;

    // ========== FEAR SYSTEM (Lars Ability) ==========
    public isFleeing: boolean = false;
    private fleeDuration: number = 0;
    private fleeDirection: THREE.Vector3 = new THREE.Vector3();
    private fearColor: number = 0xff00ff; // Purple for fear

    constructor(scene: THREE.Scene, x: number, z: number, type: 'spider' | 'worm' = 'spider') {
        this.enemyType = type;
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);

        // Configure stats based on enemy type
        if (type === 'worm') {
            this.speed = 3; // Worms are slower
            this.health = 30; // Worms have less health
            this.attackDamage = 15; // Worms do less damage
            this.originalColor = 0xaa6633; // Brown color for worms
        } else {
            this.speed = 5; // Spider speed
            this.health = 50; // Spider health
            this.attackDamage = 20; // Spider damage
            this.originalColor = 0xffaaaa; // Pink/red for spiders
        }

        // Store original speed for slow effect
        this.originalSpeed = this.speed;

        // Material
        const material = new THREE.SpriteMaterial({
            transparent: true,
            color: this.originalColor
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.center.set(0.5, 0);
        this.sprite.scale.set(2, 2, 1);
        this.mesh.add(this.sprite);

        scene.add(this.mesh);

        // Animator
        this.animator = new SpriteAnimator(material);
        this.loadAnimations();
        this.animator.play('walk');
    }

    private loadAnimations() {
        if (this.enemyType === 'worm') {
            this.animator.loadAnimation({
                name: 'walk',
                texturePath: 'assets/Enemys/intestine-worm/walk',
                prefix: 'intestine-worm-walk-',
                suffix: '.png',
                frameCount: 30,
                frameRate: 30,
                loop: true
            });
        } else {
            this.animator.loadAnimation({
                name: 'walk',
                texturePath: 'assets/Enemys/spider/walk',
                prefix: 'spider-walk-',
                suffix: '.png',
                frameCount: 30,
                frameRate: 30,
                loop: true
            });
        }
    }

    public setHomePortal(portal: any): void {
        this.homePortal = portal;
        this.patrolCenter = portal.position.clone();
        this.patrolRadius = portal.homeRange;
    }

    update(delta: number, player: PlayerThree, mapBounds: number = 98, currentTime: number = 0, isPlayerInvisible: boolean = false, allEnemies: EnemyThree[] = []) {
        if (this.isDead) return;

        // ========== STUN CHECK ==========
        if (this.isStunned) {
            this.stunDuration -= delta;
            if (this.stunDuration <= 0) {
                this.isStunned = false;
            }
            // Don't move or attack while stunned, just animate
            this.animator.update(delta);
            return;
        }

        // ========== SLOW TIMER ==========
        if (this.isSlowed) {
            this.slowDuration -= delta;
            if (this.slowDuration <= 0) {
                this.removeSlow();
            }
        }

        // ========== FEAR/FLEE CHECK ==========
        if (this.isFleeing) {
            this.fleeDuration -= delta;
            if (this.fleeDuration <= 0) {
                this.removeFear();
            } else {
                // Flee behavior - run away from player at 1.5x speed
                const fleeSpeed = this.speed * 1.5;
                this.mesh.position.add(this.fleeDirection.clone().multiplyScalar(fleeSpeed * delta));

                // Clamp to map bounds
                this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
                this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));

                this.animator.update(delta);
                return; // Skip normal behavior while fleeing
            }
        }

        // ========== MIND CONTROL TIMER ==========
        if (this.isMindControlled) {
            this.mindControlDuration -= delta;
            if (this.mindControlDuration <= 0) {
                this.revertMindControl();
            }
        }

        const distToPlayer = this.mesh.position.distanceTo(player.mesh.position);

        // ========== MIND CONTROLLED BEHAVIOR ==========
        if (this.isMindControlled && this.targetAllies && allEnemies.length > 0) {
            this.updateMindControlledBehavior(delta, player, allEnemies, mapBounds, currentTime);
            return;
        }

        // Determine behavior based on home portal state
        if (this.homePortal) {
            this.updateWithHomePortal(delta, player, distToPlayer, mapBounds, currentTime, isPlayerInvisible);
        } else {
            // Legacy behavior: simple chase
            this.updateLegacyBehavior(delta, player, distToPlayer, mapBounds, currentTime, isPlayerInvisible);
        }
    }

    private updateWithHomePortal(delta: number, player: PlayerThree, distToPlayer: number, mapBounds: number, currentTime: number, isPlayerInvisible: boolean) {
        const distToHome = this.mesh.position.distanceTo(this.patrolCenter);

        // Determine state - if player is invisible, never chase
        if (isPlayerInvisible) {
            // Player is invisible - always patrol/return home
            if (distToHome > this.homePortal.returnThreshold) {
                this.isReturningToHome = true;
                this.isPatrolling = false;
                this.updateReturnBehavior(delta, mapBounds);
            } else {
                this.isReturningToHome = false;
                this.isPatrolling = true;
                this.updatePatrolBehavior(delta, mapBounds);
            }
        } else if (distToPlayer < this.homePortal.detectionRange) {
            // CHASE STATE: Player within detection range
            this.isReturningToHome = false;
            this.isPatrolling = false;
            this.updateChaseBehavior(delta, player, distToPlayer, mapBounds, currentTime);
        } else if (distToHome > this.homePortal.returnThreshold) {
            // RETURN STATE: Too far from home
            this.isReturningToHome = true;
            this.isPatrolling = false;
            this.updateReturnBehavior(delta, mapBounds);
        } else {
            // PATROL STATE: Near home, no player threat
            this.isReturningToHome = false;
            this.isPatrolling = true;
            this.updatePatrolBehavior(delta, mapBounds);
        }
    }

    private updateChaseBehavior(delta: number, player: PlayerThree, distToPlayer: number, mapBounds: number, currentTime: number) {
        const direction = new THREE.Vector3()
            .subVectors(player.mesh.position, this.mesh.position)
            .normalize();

        // Dash system
        if (this.isDashing) {
            // Dashing: Move at high speed in stored direction
            this.mesh.position.add(this.dashDirection.clone().multiplyScalar(this.dashSpeed * delta));

            this.dashDuration -= delta;
            if (this.dashDuration <= 0) {
                this.isDashing = false;
                this.hasDealtDamageThisDash = false; // Reset dash damage flag when dash ends
                // Restore color after dash
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            }

            // Skip normal movement and attack logic
            this.animator.update(delta);
            // Clamp position to map bounds even during dash
            this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
            this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));
            return;
        }

        // Telegraph system
        if (this.isTelegraphing) {
            this.telegraphDuration -= delta;

            // Flash effect during telegraph
            this.telegraphFlashTimer += delta;
            if (this.telegraphFlashTimer >= this.telegraphFlashInterval) {
                this.telegraphFlashTimer = 0;
                // Toggle between white and original color
                const currentColor = (this.sprite.material as THREE.SpriteMaterial).color.getHex();
                if (currentColor === 0xffffff) {
                    (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
                } else {
                    (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xffffff);
                }
            }

            if (this.telegraphDuration <= 0) {
                this.isTelegraphing = false;
                this.startDash(player.mesh.position);
            }

            // Slow movement during telegraph
            const moveSpeed = this.speed * 0.2;
            this.mesh.position.add(direction.multiplyScalar(moveSpeed * delta));
            this.animator.update(delta);
            // Clamp position to map bounds
            this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
            this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));
            return;
        }

        // Dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= delta;
        }

        // Dash trigger check (before normal attack check)
        if (this.dashCooldown <= 0 && !this.isAttacking && distToPlayer >= this.dashTriggerMin && distToPlayer <= this.dashTriggerMax) {
            this.startTelegraph(player.mesh.position);
            this.animator.update(delta);
            // Clamp position to map bounds
            this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
            this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));
            return;
        }

        // Check if should attack
        if (distToPlayer < this.attackRange && (currentTime - this.lastAttackTime) > this.attackCooldown) {
            this.startAttack(currentTime);
        }

        // Update attack visual
        if (this.isAttacking) {
            const attackElapsed = currentTime - this.attackStartTime;
            if (attackElapsed > this.attackDuration) {
                this.isAttacking = false;
                this.hasDealtDamageThisAttack = false; // Reset for next attack
                // Restore original color
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            }
        }

        // Movement - slower during attack
        const moveSpeed = this.isAttacking ? this.speed * 0.3 : this.speed;
        this.mesh.position.add(direction.multiplyScalar(moveSpeed * delta));

        // Clamp position to map bounds (wall collision)
        this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));

        this.animator.update(delta);
    }

    private updateReturnBehavior(delta: number, mapBounds: number) {
        // Move back towards home portal
        const directionToHome = new THREE.Vector3()
            .subVectors(this.patrolCenter, this.mesh.position)
            .normalize();

        const moveSpeed = this.speed * 0.8; // 80% speed while returning
        this.mesh.position.add(directionToHome.multiplyScalar(moveSpeed * delta));

        // Clamp to map bounds
        this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));

        this.animator.update(delta);
    }

    private updatePatrolBehavior(delta: number, mapBounds: number) {
        // Random walk around patrol center
        this.patrolTimer += delta;

        if (this.patrolTimer >= this.patrolUpdateInterval) {
            this.patrolTimer = 0;
            // Change direction randomly
            const angle = Math.random() * Math.PI * 2;
            const moveDistance = this.speed * delta;
            const newX = this.mesh.position.x + Math.cos(angle) * moveDistance;
            const newZ = this.mesh.position.z + Math.sin(angle) * moveDistance;
            const newPos = new THREE.Vector3(newX, 0, newZ);
            const distFromCenter = newPos.distanceTo(this.patrolCenter);

            // Only move if within patrol radius
            if (distFromCenter < this.patrolRadius) {
                this.mesh.position.x = newX;
                this.mesh.position.z = newZ;
            }
        }

        // Clamp to map bounds
        this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));

        this.animator.update(delta);
    }

    private updateLegacyBehavior(delta: number, player: PlayerThree, distToPlayer: number, mapBounds: number, currentTime: number, isPlayerInvisible: boolean) {
        // Original simple chase behavior (for enemies without portals)
        // If player is invisible, just wander aimlessly
        if (isPlayerInvisible) {
            // Random idle behavior when player is invisible
            this.animator.update(delta);
            return;
        }

        const direction = new THREE.Vector3()
            .subVectors(player.mesh.position, this.mesh.position)
            .normalize();

        // Dash system
        if (this.isDashing) {
            // Dashing: Move at high speed in stored direction
            this.mesh.position.add(this.dashDirection.clone().multiplyScalar(this.dashSpeed * delta));

            this.dashDuration -= delta;
            if (this.dashDuration <= 0) {
                this.isDashing = false;
                this.hasDealtDamageThisDash = false; // Reset dash damage flag when dash ends
                // Restore color after dash
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            }

            // Skip normal movement and attack logic
            this.animator.update(delta);
            // Clamp position to map bounds even during dash
            this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
            this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));
            return;
        }

        // Telegraph system
        if (this.isTelegraphing) {
            this.telegraphDuration -= delta;

            // Flash effect during telegraph
            this.telegraphFlashTimer += delta;
            if (this.telegraphFlashTimer >= this.telegraphFlashInterval) {
                this.telegraphFlashTimer = 0;
                // Toggle between white and original color
                const currentColor = (this.sprite.material as THREE.SpriteMaterial).color.getHex();
                if (currentColor === 0xffffff) {
                    (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
                } else {
                    (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xffffff);
                }
            }

            if (this.telegraphDuration <= 0) {
                this.isTelegraphing = false;
                this.startDash(player.mesh.position);
            }

            // Slow movement during telegraph
            const moveSpeed = this.speed * 0.2;
            this.mesh.position.add(direction.multiplyScalar(moveSpeed * delta));
            this.animator.update(delta);
            // Clamp position to map bounds
            this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
            this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));
            return;
        }

        // Dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= delta;
        }

        // Dash trigger check (before normal attack check)
        if (this.dashCooldown <= 0 && !this.isAttacking && distToPlayer >= this.dashTriggerMin && distToPlayer <= this.dashTriggerMax) {
            this.startTelegraph(player.mesh.position);
            this.animator.update(delta);
            // Clamp position to map bounds
            this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
            this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));
            return;
        }

        // Check if should attack
        if (distToPlayer < this.attackRange && (currentTime - this.lastAttackTime) > this.attackCooldown) {
            this.startAttack(currentTime);
        }

        // Update attack visual
        if (this.isAttacking) {
            const attackElapsed = currentTime - this.attackStartTime;
            if (attackElapsed > this.attackDuration) {
                this.isAttacking = false;
                this.hasDealtDamageThisAttack = false; // Reset for next attack
                // Restore original color
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            }
        }

        // Movement - slower during attack
        const moveSpeed = this.isAttacking ? this.speed * 0.3 : this.speed;
        this.mesh.position.add(direction.multiplyScalar(moveSpeed * delta));

        // Clamp position to map bounds (wall collision)
        this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));

        this.animator.update(delta);
    }

    /**
     * Inicia un ataque del enemigo
     * Retorna true si se inició el ataque (para aplicar daño)
     */
    private startAttack(currentTime: number): boolean {
        this.isAttacking = true;
        this.lastAttackTime = currentTime;
        this.attackStartTime = currentTime;
        this.hasDealtDamageThisAttack = false; // Reset damage flag for new attack

        // Visual feedback: Flash rojo intenso
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xff0000);

        return true;
    }

    /**
     * Retorna true si el enemigo está atacando en este momento (incluyendo dash)
     */
    public isCurrentlyAttacking(): boolean {
        return this.isAttacking || this.isDashing; // Dash cuenta como ataque
    }

    /**
     * Retorna el daño del ataque
     */
    public getAttackDamage(): number {
        return this.attackDamage;
    }

    /**
     * Marca que el daño ya fue aplicado en este ataque
     */
    public markDamageDealt(): void {
        this.hasDealtDamageThisAttack = true;
    }

    /**
     * Retorna si el daño ya fue aplicado en este ataque
     */
    public hasDealtDamage(): boolean {
        return this.hasDealtDamageThisAttack;
    }

    /**
     * Inicia la fase de telegraph (preparación del dash)
     */
    private startTelegraph(targetPosition: THREE.Vector3): void {
        this.isTelegraphing = true;
        this.telegraphDuration = this.telegraphMaxDuration;
        this.telegraphFlashTimer = 0;

        // Store direction for upcoming dash
        this.dashDirection.subVectors(targetPosition, this.mesh.position).normalize();

        // Start with white flash
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xffffff);
    }

    /**
     * Inicia el dash después del telegraph
     */
    private startDash(targetPosition: THREE.Vector3): void {
        this.isDashing = true;
        this.dashDuration = this.dashMaxDuration;
        this.dashCooldown = this.dashMaxCooldown;
        this.hasDealtDamageThisDash = false; // Reset dash damage flag at start of new dash

        // Direction already stored in dashDirection during telegraph
        // Keep white color during dash
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xffffff);
    }

    /**
     * Retorna true si enemigo está haciendo dash (para colisiones)
     */
    public isCurrentlyDashing(): boolean {
        return this.isDashing;
    }

    /**
     * Retorna si el daño del dash ya fue aplicado
     */
    public hasDealtDashDamage(): boolean {
        return this.hasDealtDamageThisDash;
    }

    /**
     * Marca que el daño del dash ya fue aplicado
     */
    public markDashDamageDealt(): void {
        this.hasDealtDamageThisDash = true;
    }

    takeDamage(amount: number, scene: THREE.Scene): XPOrb | null {
        this.health -= amount;

        // Mostrar número de daño flotante en BLANCO encima del enemigo
        this.showDamageNumber(amount, scene);

        if (this.health <= 0) {
            this.isDead = true;
            this.mesh.visible = false;
            return new XPOrb(scene, this.mesh.position.x, this.mesh.position.z, 20);
        } else {
            // Flash effect - use mind control color if controlled, otherwise red
            const flashColor = this.isMindControlled ? 0x00ffff : 0xff0000;
            const restoreColor = this.isMindControlled ? this.mindControlColor : this.originalColor;
            this.sprite.material.color.setHex(flashColor);
            setTimeout(() => {
                if (!this.isDead) this.sprite.material.color.setHex(restoreColor);
            }, 100);
            return null;
        }
    }

    /**
     * Muestra un número de daño flotante encima del enemigo
     */
    private showDamageNumber(damage: number, scene: THREE.Scene): void {
        // Crear canvas para el texto
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const context = canvas.getContext('2d')!;

        // Dibujar texto de daño en BLANCO
        context.fillStyle = '#ffffff';
        context.strokeStyle = '#000000';
        context.lineWidth = 3;
        context.font = 'bold 42px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        const text = Math.round(damage).toString();
        context.strokeText(text, 64, 32); // Borde negro
        context.fillText(text, 64, 32);   // Texto blanco

        // Crear sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        const damageSprite = new THREE.Sprite(material);
        damageSprite.scale.set(2, 1, 1);

        // Posición encima del enemigo con pequeño offset aleatorio
        const offsetX = (Math.random() - 0.5) * 1;
        damageSprite.position.set(
            this.mesh.position.x + offsetX,
            this.mesh.position.y + 3,
            this.mesh.position.z
        );

        scene.add(damageSprite);

        // Animación: subir y desvanecerse
        const startY = damageSprite.position.y;
        const startTime = Date.now();
        const duration = 800; // 800ms

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Subir
            damageSprite.position.y = startY + progress * 2;

            // Desvanecer
            material.opacity = 1 - progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Limpiar
                scene.remove(damageSprite);
                texture.dispose();
                material.dispose();
            }
        };

        animate();
    }

    // ========== MIND CONTROL METHODS (Lars Ability) ==========

    /**
     * Apply mind control to this enemy - turns it into an ally
     * @param duration How long the mind control lasts (default 10s)
     * @param healthMult Multiplier for health (from upgrades)
     * @param damageMult Multiplier for damage (from upgrades)
     */
    public mindControl(duration: number = 10, healthMult: number = 1, damageMult: number = 1): void {
        if (this.isMindControlled) return; // Already controlled

        this.isMindControlled = true;
        this.targetAllies = true;
        this.mindControlDuration = duration;

        // Apply multipliers
        this.health *= healthMult;
        this.attackDamage *= damageMult;

        // Visual: Change to blue color
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.mindControlColor);

        console.log(`[MIND CONTROL] Enemy converted! Duration: ${duration}s`);
    }

    /**
     * Revert mind control - enemy returns to hostile
     */
    public revertMindControl(): void {
        if (!this.isMindControlled) return;

        this.isMindControlled = false;
        this.targetAllies = false;
        this.mindControlDuration = 0;

        // Restore original color
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);

        console.log(`[MIND CONTROL] Enemy reverted to hostile`);
    }

    /**
     * Mind controlled behavior - attack other enemies instead of player
     */
    private updateMindControlledBehavior(delta: number, player: PlayerThree, allEnemies: EnemyThree[], mapBounds: number, currentTime: number): void {
        // Find nearest NON-controlled enemy to attack
        let nearestEnemy: EnemyThree | null = null;
        let nearestDist = Infinity;

        for (const enemy of allEnemies) {
            if (enemy === this || enemy.isDead || enemy.isMindControlled) continue;

            const dist = this.mesh.position.distanceTo(enemy.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        if (!nearestEnemy) {
            // No enemies to attack, follow player as ally
            const dirToPlayer = new THREE.Vector3()
                .subVectors(player.mesh.position, this.mesh.position)
                .normalize();

            // Stay at a distance from player (ally behavior)
            const distToPlayer = this.mesh.position.distanceTo(player.mesh.position);
            if (distToPlayer > 5) {
                this.mesh.position.add(dirToPlayer.multiplyScalar(this.speed * delta));
            }

            this.animator.update(delta);
            return;
        }

        // Chase and attack the nearest enemy
        const direction = new THREE.Vector3()
            .subVectors(nearestEnemy.mesh.position, this.mesh.position)
            .normalize();

        // Check if should attack
        if (nearestDist < this.attackRange && (currentTime - this.lastAttackTime) > this.attackCooldown) {
            this.lastAttackTime = currentTime;
            this.isAttacking = true;
            this.attackStartTime = currentTime;

            // Visual feedback: Cyan flash for ally attack
            (this.sprite.material as THREE.SpriteMaterial).color.setHex(0x00ffff);

            // Deal damage to enemy target!
            nearestEnemy.takeDamageFromAlly(this.attackDamage);
        }

        // Update attack visual
        if (this.isAttacking) {
            const attackElapsed = currentTime - this.attackStartTime;
            if (attackElapsed > this.attackDuration) {
                this.isAttacking = false;
                // Restore mind control color
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.mindControlColor);
            }
        }

        // Movement - chase enemy
        const moveSpeed = this.isAttacking ? this.speed * 0.3 : this.speed;
        this.mesh.position.add(direction.multiplyScalar(moveSpeed * delta));

        // Clamp to map bounds
        this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));

        this.animator.update(delta);
    }

    /**
     * Take damage from a mind-controlled ally
     */
    public takeDamageFromAlly(amount: number): void {
        this.health -= amount;

        // Flash effect
        this.sprite.material.color.setHex(0x00ffff); // Cyan flash
        setTimeout(() => {
            if (!this.isDead && !this.isMindControlled) {
                this.sprite.material.color.setHex(this.originalColor);
            }
        }, 100);

        if (this.health <= 0) {
            this.isDead = true;
            this.mesh.visible = false;
        }
    }

    // ========== STUN METHODS (Yurany Ability) ==========

    /**
     * Apply stun to this enemy
     * @param duration How long the stun lasts
     */
    public applyStun(duration: number = 0.5): void {
        this.isStunned = true;
        this.stunDuration = duration;

        // Visual: Yellow flash
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xffff00);
        setTimeout(() => {
            if (!this.isDead && !this.isMindControlled) {
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            } else if (this.isMindControlled) {
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.mindControlColor);
            }
        }, 200);
    }

    // ========== KNOCKBACK METHOD (Arcadio Ability) ==========

    /**
     * Apply knockback force to this enemy
     * @param fromPosition Position to knock back FROM
     * @param force Knockback force strength
     */
    public applyKnockback(fromPosition: THREE.Vector3, force: number): void {
        const direction = new THREE.Vector3()
            .subVectors(this.mesh.position, fromPosition)
            .normalize();

        this.mesh.position.add(direction.multiplyScalar(force));

        // Visual feedback: white flash
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xffffff);
        setTimeout(() => {
            if (!this.isDead && !this.isMindControlled) {
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            } else if (this.isMindControlled) {
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.mindControlColor);
            }
        }, 100);
    }

    /**
     * Get enemy type for ability logic
     */
    public getType(): 'spider' | 'worm' {
        return this.enemyType;
    }

    // ========== SLOW METHODS (Lars Ability) ==========

    /**
     * Apply slow effect to this enemy
     * @param amount Slow percentage (0.1 = 10% slower)
     * @param duration How long the slow lasts
     */
    public applySlow(amount: number, duration: number): void {
        if (this.isMindControlled) return; // Don't slow allies

        this.isSlowed = true;
        this.slowDuration = duration;
        this.slowAmount = amount;

        // Apply slow to speed
        this.speed = this.originalSpeed * (1 - amount);

        // Visual: Cyan tint for slowed
        const slowColor = 0x00aaff;
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(slowColor);
    }

    /**
     * Remove slow effect
     */
    private removeSlow(): void {
        this.isSlowed = false;
        this.slowDuration = 0;
        this.slowAmount = 0;

        // Restore original speed
        this.speed = this.originalSpeed;

        // Restore color (if not mind controlled or other effect)
        if (!this.isMindControlled && !this.isFleeing) {
            (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
        }
    }

    // ========== FEAR METHODS (Lars Ability) ==========

    /**
     * Apply fear effect - enemy flees from source
     * @param duration How long the fear lasts
     * @param sourcePosition Position to flee FROM
     */
    public applyFear(duration: number, sourcePosition: THREE.Vector3): void {
        if (this.isMindControlled) return; // Don't fear allies

        this.isFleeing = true;
        this.fleeDuration = duration;

        // Calculate flee direction (away from source)
        this.fleeDirection.subVectors(this.mesh.position, sourcePosition).normalize();

        // Visual: Purple for fear
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.fearColor);

        console.log(`[ENEMY] Fear applied! Fleeing for ${duration}s`);
    }

    /**
     * Remove fear effect
     */
    private removeFear(): void {
        this.isFleeing = false;
        this.fleeDuration = 0;

        // Restore color (if not slowed or mind controlled)
        if (!this.isMindControlled && !this.isSlowed) {
            (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
        } else if (this.isMindControlled) {
            (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.mindControlColor);
        }

        console.log(`[ENEMY] Fear removed`);
    }

    /**
     * Check if this enemy can be targeted by the player
     * Mind controlled enemies should NOT be targeted
     */
    public canBeTargeted(): boolean {
        return !this.isMindControlled && !this.isDead;
    }
}
