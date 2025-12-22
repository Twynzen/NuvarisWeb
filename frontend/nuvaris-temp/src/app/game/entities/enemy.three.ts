import * as THREE from 'three';
import { PlayerThree } from './player.three';
import { SpriteAnimator } from '../engine/sprite-animator';

// Return type when enemy dies - XP and score to award
export interface EnemyDeathReward {
    xp: number;
    score: number;
}

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

    // Virtual home for testing (worms without portal)
    private spawnPosition: THREE.Vector3 = new THREE.Vector3();
    private readonly VIRTUAL_HOME_RADIUS = 10;        // Patrol radius around spawn
    private readonly VIRTUAL_DETECTION_RANGE = 20;    // Detection range
    private readonly VIRTUAL_RETURN_THRESHOLD = 25;   // Return if farther than this

    // ========== MIND CONTROL SYSTEM (Lars Ability) ==========
    public isMindControlled: boolean = false;
    private mindControlDuration: number = 0;
    private mindControlMaxDuration: number = 10; // 10 seconds default
    private mindControlColor: number = 0x0066ff; // Blue color for mind controlled
    public targetAllies: boolean = false; // When true, attacks other enemies instead of player

    // ========== STUN SYSTEM (Project Y Ability) ==========
    public isStunned: boolean = false;
    private stunDuration: number = 0;

    // ========== SLOW EFFECT SYSTEM (Lars Ability) ==========
    public slowTimer: number = 0;
    public speedMultiplier: number = 1.0;

    // ========== BURROW ATTACK SYSTEM (Worm Only) ==========
    private isBurrowing: boolean = false;
    private burrowPhase: 'none' | 'bury1' | 'bury2' | 'pre_underground' | 'underground' | 'pre_emerge' | 'emerge' |
                         'rebury_emerge' | 'rebury_spawn' |
                         'retreat_underground' | 'retreat_spawn' | 'retreat_bury2_rev' | 'retreat_bury1_rev' = 'none';
    private burrowTimer: number = 0;
    private burrowCooldown: number = 0;
    private burrowTargetPosition: THREE.Vector3 = new THREE.Vector3();
    private hasDealtDamageThisBurrow: boolean = false;
    private burrowStartPosition: THREE.Vector3 = new THREE.Vector3();
    private burrowJumpTarget: THREE.Vector3 = new THREE.Vector3();
    private retreatPosition: THREE.Vector3 = new THREE.Vector3();
    private readonly RETREAT_DISTANCE = 8;  // Distance to retreat after attack

    // ========== SPAWN SYSTEM (Worm Only) ==========
    private isSpawning: boolean = false;
    private spawnPhase: 'spawn' | 'emerge' | 'ready' = 'ready';

    // ========== JUMP ATTACK SYSTEM (Worm Only) ==========
    private isJumpAttacking: boolean = false;
    private jumpAttackHit: boolean = false;
    private jumpAttackCooldown: number = 0;
    private readonly JUMP_ATTACK_COOLDOWN = 2.5;    // 2.5s between jump attacks
    private readonly JUMP_ATTACK_RANGE = 2.0;        // Close range trigger (must be < collision distance 1.8)
    private readonly JUMP_ATTACK_DAMAGE = 20;        // Damage if connects
    private readonly JUMP_STUNNED_DURATION = 0.5;    // Time stunned if hit

    // Burrow constants - 5 phase system
    private readonly BURROW_COOLDOWN = 2.5;        // 2.5s between burrows (reduced for frequent movement)
    private readonly BURROW_TRIGGER_RANGE = 15;    // 15 units - burrow is primary movement
    private readonly FLEE_BURROW_DISTANCE = 6;     // How far to flee when damaged
    private isFleeing: boolean = false;            // Currently in flee burrow
    private readonly BURY1_DURATION = 0.67;        // 30f @ 45fps
    private readonly BURY2_DURATION = 0.67;        // 30f @ 45fps
    private readonly UNDERGROUND_DURATION = 0.8;   // 800ms travel time
    private readonly EMERGE_DURATION = 0.75;       // 30f @ 40fps
    private readonly SPAWN_DURATION = 1.2;         // 30f @ 25fps - dramatic appearance/disappearance
    private readonly BURROW_DAMAGE = 25;           // Daño del emerge

    constructor(scene: THREE.Scene, x: number, z: number, type: 'spider' | 'worm' = 'spider') {
        this.enemyType = type;
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);

        // Store spawn position as virtual home (for testing without portal)
        this.spawnPosition.set(x, 0, z);

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

        // Material
        const material = new THREE.SpriteMaterial({
            transparent: true,
            color: this.originalColor
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.center.set(0.5, 0);
        // Worms are large threatening creatures, spiders are smaller
        if (type === 'worm') {
            this.sprite.scale.set(5, 5, 1);  // Large worm - visible and threatening
        } else {
            this.sprite.scale.set(2, 2, 1);  // Spider default size
        }
        this.mesh.add(this.sprite);

        scene.add(this.mesh);

        // Animator
        this.animator = new SpriteAnimator(material);
        this.loadAnimations();

        // Initialize animation based on enemy type
        if (this.enemyType === 'worm') {
            this.initializeSpawn(); // Cinematic spawn: spawn -> emerge -> idle
        } else {
            this.animator.play('walk');
        }
    }

    private loadAnimations() {
        if (this.enemyType === 'worm') {
            this.loadWormAnimations();
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

    /**
     * Load all worm animations including burrow attack animations
     * Total: 7 animations, 210 frames
     */
    private loadWormAnimations(): void {
        // SPAWN - Dramatic entrance from nothing (30 frames)
        this.animator.loadAnimation({
            name: 'spawn',
            texturePath: 'assets/Enemys/intestine-worm/spawn',
            prefix: 'worm-spawn-',
            suffix: '.png',
            frameCount: 30,
            frameRate: 25,
            loop: false
        });

        // IDLE - Base state, breathing animation (30 frames)
        this.animator.loadAnimation({
            name: 'idle',
            texturePath: 'assets/Enemys/intestine-worm/idle',
            prefix: 'worm-idle-',
            suffix: '.png',
            frameCount: 30,
            frameRate: 18,
            loop: true
        });

        // NOTE: Walk animation removed - worm moves by burrowing or using bury1 subset loop

        // BURY1 - First phase of burrowing (30 frames) - upright to diving
        this.animator.loadAnimation({
            name: 'bury1',
            texturePath: 'assets/Enemys/intestine-worm/bury',
            prefix: 'worm-terra-1-',
            suffix: '.png',
            frameCount: 30,
            frameRate: 45,
            loop: false
        });

        // BURY2 - Second phase of burrowing (30 frames) - tail disappearing
        this.animator.loadAnimation({
            name: 'bury2',
            texturePath: 'assets/Enemys/intestine-worm/bury',
            prefix: 'worm-terra-2-',
            suffix: '.png',
            frameCount: 30,
            frameRate: 45,
            loop: false
        });

        // EMERGE - Rising from ground (30 frames)
        this.animator.loadAnimation({
            name: 'emerge',
            texturePath: 'assets/Enemys/intestine-worm/emerge',
            prefix: 'worm-emerge-',
            suffix: '.png',
            frameCount: 30,
            frameRate: 40,
            loop: false
        });

        // JUMP - Attack animation, coiling then stunned (30 frames)
        this.animator.loadAnimation({
            name: 'jump',
            texturePath: 'assets/Enemys/intestine-worm/jump',
            prefix: 'jump-hit-',
            suffix: '.png',
            frameCount: 30,
            frameRate: 45,
            loop: false
        });
    }

    /**
     * Initialize cinematic spawn sequence for worms
     * Sequence: spawn (30f) -> emerge (30f) -> idle
     */
    private initializeSpawn(): void {
        this.isSpawning = true;
        this.spawnPhase = 'spawn';
        this.mesh.visible = true;

        // Start spawn animation with callback chain
        this.animator.play('spawn', false, 25);
        this.animator.setOnComplete(() => {
            this.spawnPhase = 'emerge';
            this.animator.play('emerge', false, 40);
            this.animator.setOnComplete(() => {
                this.spawnPhase = 'ready';
                this.isSpawning = false;
                this.animator.play('idle', true, 18);
                console.log('[WORM] Spawn complete - ready to fight');
            });
        });

        console.log('[WORM] Starting cinematic spawn sequence');
    }

    public setHomePortal(portal: any): void {
        this.homePortal = portal;
        this.patrolCenter = portal.position.clone();
        this.patrolRadius = portal.homeRange;
    }

    /**
     * Set patrol area for enemy (used by EntityManager)
     */
    public setPatrolArea(center: THREE.Vector3, radius: number): void {
        this.patrolCenter = center.clone();
        this.patrolRadius = radius;
    }

    update(delta: number, player: PlayerThree, mapBounds: number = 98, currentTime: number = 0, isPlayerInvisible: boolean = false, allEnemies: EnemyThree[] = []) {
        if (this.isDead) return;

        // ========== SPAWN CHECK (Worm Only) ==========
        if (this.isSpawning) {
            // Only animate during spawn sequence, no movement
            this.animator.update(delta);
            return;
        }

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

        // ========== SLOW EFFECT CHECK ==========
        if (this.slowTimer > 0) {
            this.slowTimer -= delta;
            if (this.slowTimer <= 0) {
                this.speedMultiplier = 1.0;
                // Restore original color (unless mind controlled)
                if (!this.isMindControlled) {
                    (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
                } else {
                    (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.mindControlColor);
                }
            }
        }

        // ========== WORM ATTACK SYSTEMS ==========
        if (this.enemyType === 'worm') {
            // Decrement cooldowns
            if (this.burrowCooldown > 0) {
                this.burrowCooldown -= delta;
            }
            if (this.jumpAttackCooldown > 0) {
                this.jumpAttackCooldown -= delta;
            }

            // If currently burrowing, update the burrow attack state machine
            if (this.isBurrowing) {
                // Get the scene from the mesh parent
                const scene = this.mesh.parent as THREE.Scene;
                this.updateBurrowAttack(delta, scene, player.mesh.position, allEnemies);
                return; // Don't do normal movement while burrowing
            }

            // If currently jump attacking, just update animation
            if (this.isJumpAttacking) {
                this.animator.update(delta);
                return; // Don't do normal movement while jump attacking
            }
        }

        // ========== MIND CONTROL (PERMANENT) ==========
        // Mind control is now PERMANENT - minions stay controlled forever
        // No timer - once controlled, always controlled

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

        // ========== WORM: TERRITORIAL AMBUSH PREDATOR ==========
        // Worms NEVER move on surface - they only burrow to relocate
        // Behavior: REST near portal -> HUNT when player detected -> RETURN if too far
        if (this.enemyType === 'worm') {
            // If spawning, burrowing, or attacking - don't change state
            if (this.isSpawning || this.isBurrowing || this.isJumpAttacking) {
                this.animator.update(delta);
                return;
            }

            // Player invisible - rest in IDLE near portal
            if (isPlayerInvisible) {
                if (distToHome > this.homePortal.returnThreshold && !this.isBurrowing && this.burrowCooldown <= 0) {
                    // Too far from home - burrow back
                    this.startReturnBurrow();
                } else {
                    // Rest near portal
                    this.animator.play('idle', true, 18);
                }
                this.animator.update(delta);
                return;
            }

            // HUNT: Player within detection range
            if (distToPlayer < this.homePortal.detectionRange) {
                // PRIORITY 1: Jump attack at melee range
                if (!this.isBurrowing && !this.isJumpAttacking &&
                    this.jumpAttackCooldown <= 0 && distToPlayer <= this.JUMP_ATTACK_RANGE) {
                    this.startJumpAttack();
                    return;
                }

                // PRIORITY 2: Burrow to approach player
                if (!this.isBurrowing && this.burrowCooldown <= 0 && distToPlayer > this.JUMP_ATTACK_RANGE) {
                    this.startBurrowAttack(player.mesh.position);
                    return;
                }

                // Waiting for cooldown - stay in IDLE (breathing loop)
                this.animator.play('idle', true, 18);
                this.animator.update(delta);
                return;
            }

            // RETURN: Too far from home portal
            if (distToHome > this.homePortal.returnThreshold) {
                if (!this.isBurrowing && this.burrowCooldown <= 0) {
                    this.startReturnBurrow();
                } else {
                    // Waiting for cooldown - stay in IDLE
                    this.animator.play('idle', true, 18);
                }
                this.animator.update(delta);
                return;
            }

            // REST: Near home, no threats - stay in IDLE (breathing animation)
            this.animator.play('idle', true, 18);
            this.animator.update(delta);
            return;
        }

        // ========== SPIDER: Standard chase/patrol/return behavior ==========
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

    /**
     * Core chase logic shared by both portal-based and legacy enemies.
     * Handles dash, telegraph, attack, and movement systems.
     * Worms use burrow attack instead of dash.
     */
    private updateChaseCore(delta: number, player: PlayerThree, distToPlayer: number, mapBounds: number, currentTime: number): void {
        const direction = new THREE.Vector3()
            .subVectors(player.mesh.position, this.mesh.position)
            .normalize();

        // ========== WORM BEHAVIOR: AMBUSH PREDATOR ==========
        // The worm NEVER moves on surface. It either:
        // - Sits in IDLE (breathing loop)
        // - Burrows to relocate (attack or flee)
        // - Jump attacks at melee range
        if (this.enemyType === 'worm') {
            // PRIORITY 1: Jump attack when very close (melee range)
            if (!this.isJumpAttacking &&
                !this.isBurrowing &&
                this.jumpAttackCooldown <= 0 &&
                distToPlayer <= this.JUMP_ATTACK_RANGE) {

                this.startJumpAttack();
                return;
            }

            // PRIORITY 2: Burrow attack - PRIMARY MOVEMENT METHOD
            // Worm repositions by burrowing toward player
            if (!this.isBurrowing &&
                !this.isJumpAttacking &&
                this.burrowCooldown <= 0 &&
                distToPlayer > this.JUMP_ATTACK_RANGE) {

                this.startBurrowAttack(player.mesh.position);
                return;
            }

            // DEFAULT: Stay in IDLE (breathing animation - perfect loop)
            // Worm waits for cooldowns, does NOT move on surface
            this.animator.play('idle', true, 18);
            this.animator.update(delta);
            return;
        }

        // ========== SPIDER DASH SYSTEM (below) ==========
        // Dash system
        if (this.isDashing) {
            this.mesh.position.add(this.dashDirection.clone().multiplyScalar(this.dashSpeed * delta));
            this.dashDuration -= delta;
            if (this.dashDuration <= 0) {
                this.isDashing = false;
                this.hasDealtDamageThisDash = false;
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            }
            this.animator.update(delta);
            this.clampToMapBounds(mapBounds);
            return;
        }

        // Telegraph system
        if (this.isTelegraphing) {
            this.telegraphDuration -= delta;
            this.telegraphFlashTimer += delta;
            if (this.telegraphFlashTimer >= this.telegraphFlashInterval) {
                this.telegraphFlashTimer = 0;
                const currentColor = (this.sprite.material as THREE.SpriteMaterial).color.getHex();
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(
                    currentColor === 0xffffff ? this.originalColor : 0xffffff
                );
            }
            if (this.telegraphDuration <= 0) {
                this.isTelegraphing = false;
                this.startDash(player.mesh.position);
            }
            const moveSpeed = this.speed * 0.2 * this.speedMultiplier;
            this.mesh.position.add(direction.multiplyScalar(moveSpeed * delta));
            this.animator.update(delta);
            this.clampToMapBounds(mapBounds);
            return;
        }

        // Dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= delta;
        }

        // Dash trigger check
        if (this.dashCooldown <= 0 && !this.isAttacking && distToPlayer >= this.dashTriggerMin && distToPlayer <= this.dashTriggerMax) {
            this.startTelegraph(player.mesh.position);
            this.animator.update(delta);
            this.clampToMapBounds(mapBounds);
            return;
        }

        // Attack check
        if (distToPlayer < this.attackRange && (currentTime - this.lastAttackTime) > this.attackCooldown) {
            this.startAttack(currentTime);
        }

        // Update attack visual
        if (this.isAttacking) {
            const attackElapsed = currentTime - this.attackStartTime;
            if (attackElapsed > this.attackDuration) {
                this.isAttacking = false;
                this.hasDealtDamageThisAttack = false;
                (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
            }
        }

        // Movement - slower during attack, affected by slow effect
        const moveSpeed = (this.isAttacking ? this.speed * 0.3 : this.speed) * this.speedMultiplier;
        this.mesh.position.add(direction.multiplyScalar(moveSpeed * delta));
        this.clampToMapBounds(mapBounds);
        this.animator.update(delta);
    }

    /**
     * Clamp enemy position to map bounds
     */
    private clampToMapBounds(mapBounds: number): void {
        this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));
    }

    private updateChaseBehavior(delta: number, player: PlayerThree, distToPlayer: number, mapBounds: number, currentTime: number) {
        this.updateChaseCore(delta, player, distToPlayer, mapBounds, currentTime);
    }

    private updateReturnBehavior(delta: number, mapBounds: number) {
        const directionToHome = new THREE.Vector3()
            .subVectors(this.patrolCenter, this.mesh.position)
            .normalize();

        const moveSpeed = this.speed * 0.8 * this.speedMultiplier;
        this.mesh.position.add(directionToHome.multiplyScalar(moveSpeed * delta));
        this.clampToMapBounds(mapBounds);
        this.animator.update(delta);
    }

    private updatePatrolBehavior(delta: number, mapBounds: number) {
        this.patrolTimer += delta;

        if (this.patrolTimer >= this.patrolUpdateInterval) {
            this.patrolTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const moveDistance = this.speed * delta;
            const newX = this.mesh.position.x + Math.cos(angle) * moveDistance;
            const newZ = this.mesh.position.z + Math.sin(angle) * moveDistance;
            const newPos = new THREE.Vector3(newX, 0, newZ);

            if (newPos.distanceTo(this.patrolCenter) < this.patrolRadius) {
                this.mesh.position.x = newX;
                this.mesh.position.z = newZ;
            }
        }

        this.clampToMapBounds(mapBounds);
        this.animator.update(delta);
    }

    private updateLegacyBehavior(delta: number, player: PlayerThree, distToPlayer: number, mapBounds: number, currentTime: number, isPlayerInvisible: boolean) {
        // ========== WORM: Use virtual home when no portal ==========
        if (this.enemyType === 'worm') {
            const distToHome = this.mesh.position.distanceTo(this.spawnPosition);

            // If spawning, burrowing, or attacking - don't change state
            if (this.isSpawning || this.isBurrowing || this.isJumpAttacking) {
                this.animator.update(delta);
                return;
            }

            // Player invisible - rest at virtual home
            if (isPlayerInvisible) {
                if (distToHome > this.VIRTUAL_RETURN_THRESHOLD && this.burrowCooldown <= 0) {
                    this.startReturnBurrowToPosition(this.spawnPosition);
                } else {
                    this.animator.play('idle', true, 18);
                }
                this.animator.update(delta);
                return;
            }

            // HUNT: Player within virtual detection range
            if (distToPlayer < this.VIRTUAL_DETECTION_RANGE) {
                // Jump attack at melee range
                if (this.jumpAttackCooldown <= 0 && distToPlayer <= this.JUMP_ATTACK_RANGE) {
                    this.startJumpAttack();
                    return;
                }

                // Burrow to approach player
                if (this.burrowCooldown <= 0 && distToPlayer > this.JUMP_ATTACK_RANGE) {
                    this.startBurrowAttack(player.mesh.position);
                    return;
                }

                // Waiting for cooldown - stay in IDLE
                this.animator.play('idle', true, 18);
                this.animator.update(delta);
                return;
            }

            // RETURN: Too far from virtual home
            if (distToHome > this.VIRTUAL_RETURN_THRESHOLD) {
                if (this.burrowCooldown <= 0) {
                    this.startReturnBurrowToPosition(this.spawnPosition);
                } else {
                    this.animator.play('idle', true, 18);
                }
                this.animator.update(delta);
                return;
            }

            // REST: Near virtual home, no threats
            this.animator.play('idle', true, 18);
            this.animator.update(delta);
            return;
        }

        // ========== SPIDER: Simple chase behavior ==========
        // If player is invisible, just idle
        if (isPlayerInvisible) {
            this.animator.update(delta);
            return;
        }
        // Delegate to shared chase logic
        this.updateChaseCore(delta, player, distToPlayer, mapBounds, currentTime);
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
     * Retorna true si el enemigo está atacando en este momento (incluyendo dash, burrow emerge, jump)
     */
    public isCurrentlyAttacking(): boolean {
        // Spider dash counts as attack
        if (this.isDashing) return true;

        // Normal attack
        if (this.isAttacking) return true;

        // Worm burrow emerge phase counts as attack
        if (this.enemyType === 'worm' && this.burrowPhase === 'emerge') return true;

        // Worm jump attack counts as attack
        if (this.enemyType === 'worm' && this.isJumpAttacking) return true;

        return false;
    }

    /**
     * Retorna el daño del ataque (contextual based on attack type)
     */
    public getAttackDamage(): number {
        // Worm jump attack damage
        if (this.enemyType === 'worm' && this.isJumpAttacking) {
            return this.JUMP_ATTACK_DAMAGE;
        }
        // Worm burrow emerge damage
        if (this.enemyType === 'worm' && this.burrowPhase === 'emerge') {
            return this.BURROW_DAMAGE;
        }
        return this.attackDamage;
    }

    /**
     * Marca que el daño ya fue aplicado en este ataque
     * Also marks jump attack as hit for contextual recovery
     */
    public markDamageDealt(): void {
        this.hasDealtDamageThisAttack = true;

        // If this was a worm jump attack, mark it as hit for stunned recovery
        if (this.enemyType === 'worm' && this.isJumpAttacking) {
            this.jumpAttackHit = true;
        }
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

    takeDamage(amount: number, scene: THREE.Scene, damageSourcePos?: THREE.Vector3): EnemyDeathReward | null {
        // Check invulnerability (worm underground)
        if (this.isInvulnerable()) {
            console.log('[WORM] Underground - immune to damage!');
            return null;
        }

        this.health -= amount;

        // Mostrar número de daño flotante en BLANCO encima del enemigo
        this.showDamageNumber(amount, scene);

        if (this.health <= 0) {
            this.isDead = true;
            this.mesh.visible = false;
            // Return XP and score based on enemy type
            const xpValue = this.enemyType === 'worm' ? 10 : 15;
            const scoreValue = 1; // +1 por cada enemigo eliminado
            return { xp: xpValue, score: scoreValue };
        } else {
            // Flash effect - use mind control color if controlled, otherwise red
            const flashColor = this.isMindControlled ? 0x00ffff : 0xff0000;
            const restoreColor = this.isMindControlled ? this.mindControlColor : this.originalColor;
            this.sprite.material.color.setHex(flashColor);
            setTimeout(() => {
                if (!this.isDead) this.sprite.material.color.setHex(restoreColor);
            }, 100);

            // WORM FLEE BURROW: When damaged, flee away from damage source
            if (this.enemyType === 'worm' && damageSourcePos && !this.isBurrowing && !this.isJumpAttacking && !this.isSpawning) {
                this.startFleeBurrow(damageSourcePos);
            }

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

        // ========== WORM MINION BURROW ATTACK ==========
        if (this.enemyType === 'worm') {
            // Check if should start burrow attack on enemy
            if (!this.isBurrowing &&
                this.burrowCooldown <= 0 &&
                nearestDist <= this.BURROW_TRIGGER_RANGE &&
                nearestDist > 2) {

                this.startBurrowAttack(nearestEnemy.mesh.position);
                return;
            }

            // Worm minion: Ambush predator behavior - stay in IDLE, only move via burrow
            // Worm doesn't walk on surface, it burrows toward enemies
            this.animator.play('idle', true, 18);
            this.animator.update(delta);
            return;
        }

        // ========== SPIDER MINION ATTACK (original behavior) ==========
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

        // Movement - chase enemy, affected by slow effect
        const moveSpeed = (this.isAttacking ? this.speed * 0.3 : this.speed) * this.speedMultiplier;
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

    // ========== STUN METHODS (Project Y Ability) ==========

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

    // ========== SLOW EFFECT METHOD (Lars Ability) ==========

    /**
     * Apply slow effect to this enemy
     * @param duration How long the slow lasts
     * @param slowAmount Percentage of speed reduction (0.5 = 50% slower)
     */
    public applySlow(duration: number, slowAmount: number): void {
        this.slowTimer = duration;
        this.speedMultiplier = 1 - slowAmount;

        // Visual: Purple tint
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0x8800ff);
        // Color will be restored when slowTimer expires in update()
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

    // ========== BURROW ATTACK METHODS (Worm Only) ==========

    /**
     * Initiates the burrow attack sequence for worms
     * Uses callback-based animation chaining: bury1 -> bury2 -> underground -> emerge
     * @param targetPos Position to emerge at (player or enemy position)
     */
    private startBurrowAttack(targetPos: THREE.Vector3): void {
        if (this.isBurrowing || this.burrowCooldown > 0) return;

        this.isBurrowing = true;
        this.isFleeing = false;
        this.burrowPhase = 'bury1';
        this.burrowTimer = this.BURY1_DURATION;
        this.burrowTargetPosition.copy(targetPos);
        this.burrowStartPosition.copy(this.mesh.position);
        this.hasDealtDamageThisBurrow = false;

        // Start bury1 animation with callback to bury2
        this.animator.play('bury1', false, 45);
        this.animator.setOnComplete(() => {
            // Transition to bury2 phase
            // bury1-030 ≈ bury2-001 → skip 1 frame para fluidez
            this.burrowPhase = 'bury2';
            this.burrowTimer = this.BURY2_DURATION;
            this.animator.play('bury2', false, 45, 1); // skipFrames=1
            this.animator.setOnComplete(() => {
                // Transition to pre_underground phase (spawn reverse - tail disappears)
                // bury2-030 ≈ spawn-030 → skip 1 frame para fluidez
                this.burrowPhase = 'pre_underground';
                this.burrowTimer = this.SPAWN_DURATION;
                this.animator.playReverse('spawn', 25, 1); // skipFrames=1
                console.log('[WORM] Pre-underground - tail disappearing');
            });
        });

        console.log('[WORM] Starting burrow attack');
    }

    /**
     * Initiates a FLEE burrow - worm escapes AWAY from damage source
     * Similar to attack burrow but moves away instead of toward
     * @param damageSourcePos Position to flee FROM
     */
    private startFleeBurrow(damageSourcePos: THREE.Vector3): void {
        if (this.isBurrowing) return; // Can't interrupt ongoing burrow

        // Calculate flee direction (AWAY from damage source)
        const fleeDirection = new THREE.Vector3()
            .subVectors(this.mesh.position, damageSourcePos)
            .normalize();

        // Calculate flee target position
        const fleeTarget = new THREE.Vector3()
            .copy(this.mesh.position)
            .add(fleeDirection.multiplyScalar(this.FLEE_BURROW_DISTANCE));

        this.isBurrowing = true;
        this.isFleeing = true;
        this.burrowPhase = 'bury1';
        this.burrowTimer = this.BURY1_DURATION;
        this.burrowTargetPosition.copy(fleeTarget);
        this.burrowStartPosition.copy(this.mesh.position);
        this.hasDealtDamageThisBurrow = false;
        this.burrowCooldown = 0; // Reset cooldown - flee is emergency action

        // Start bury1 animation with callback chain
        this.animator.play('bury1', false, 50); // Slightly faster when fleeing
        this.animator.setOnComplete(() => {
            // bury1-030 ≈ bury2-001 → skip 1 frame para fluidez
            this.burrowPhase = 'bury2';
            this.burrowTimer = this.BURY2_DURATION;
            this.animator.play('bury2', false, 50, 1); // skipFrames=1
            this.animator.setOnComplete(() => {
                // Transition to pre_underground phase (spawn reverse - tail disappears)
                // bury2-030 ≈ spawn-030 → skip 1 frame para fluidez
                this.burrowPhase = 'pre_underground';
                this.burrowTimer = this.SPAWN_DURATION * 0.6; // Faster when fleeing
                this.animator.playReverse('spawn', 40, 1); // Faster fps when fleeing
                console.log('[WORM] FLEE - tail disappearing');
            });
        });

        console.log('[WORM] Starting FLEE burrow');
    }

    /**
     * Initiates a RETURN burrow - worm returns to home portal area
     * Non-aggressive burrow - emerges near patrol center without tracking player
     */
    private startReturnBurrow(): void {
        if (this.isBurrowing) return;

        // Calculate return target - random position within patrol radius
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.patrolRadius * 0.7; // Stay within 70% of patrol radius
        const returnTarget = new THREE.Vector3(
            this.patrolCenter.x + Math.cos(angle) * dist,
            0,
            this.patrolCenter.z + Math.sin(angle) * dist
        );

        this.isBurrowing = true;
        this.isFleeing = false; // Not fleeing, returning home
        this.burrowPhase = 'bury1';
        this.burrowTimer = this.BURY1_DURATION;
        this.burrowTargetPosition.copy(returnTarget);
        this.burrowStartPosition.copy(this.mesh.position);
        this.hasDealtDamageThisBurrow = false; // Return burrow doesn't deal damage

        // Start bury1 animation with callback chain
        this.animator.play('bury1', false, 45);
        this.animator.setOnComplete(() => {
            // bury1-030 ≈ bury2-001 → skip 1 frame para fluidez
            this.burrowPhase = 'bury2';
            this.burrowTimer = this.BURY2_DURATION;
            this.animator.play('bury2', false, 45, 1); // skipFrames=1
            this.animator.setOnComplete(() => {
                // Transition to pre_underground phase (spawn reverse - tail disappears)
                // bury2-030 ≈ spawn-030 → skip 1 frame para fluidez
                this.burrowPhase = 'pre_underground';
                this.burrowTimer = this.SPAWN_DURATION;
                this.animator.playReverse('spawn', 25, 1); // skipFrames=1
                console.log('[WORM] Pre-underground - tail disappearing (return)');
            });
        });

        console.log('[WORM] Starting RETURN burrow');
    }

    /**
     * Initiates a RETURN burrow to a specific position (for virtual home)
     * @param targetCenter The center position to return to
     */
    private startReturnBurrowToPosition(targetCenter: THREE.Vector3): void {
        if (this.isBurrowing) return;

        // Calculate return target - random position near target center
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.VIRTUAL_HOME_RADIUS * 0.7;
        const returnTarget = new THREE.Vector3(
            targetCenter.x + Math.cos(angle) * dist,
            0,
            targetCenter.z + Math.sin(angle) * dist
        );

        this.isBurrowing = true;
        this.isFleeing = false;
        this.burrowPhase = 'bury1';
        this.burrowTimer = this.BURY1_DURATION;
        this.burrowTargetPosition.copy(returnTarget);
        this.burrowStartPosition.copy(this.mesh.position);
        this.hasDealtDamageThisBurrow = false;

        // Start bury1 animation with callback chain
        this.animator.play('bury1', false, 45);
        this.animator.setOnComplete(() => {
            // bury1-030 ≈ bury2-001 → skip 1 frame para fluidez
            this.burrowPhase = 'bury2';
            this.burrowTimer = this.BURY2_DURATION;
            this.animator.play('bury2', false, 45, 1); // skipFrames=1
            this.animator.setOnComplete(() => {
                // Transition to pre_underground phase (spawn reverse - tail disappears)
                // bury2-030 ≈ spawn-030 → skip 1 frame para fluidez
                this.burrowPhase = 'pre_underground';
                this.burrowTimer = this.SPAWN_DURATION;
                this.animator.playReverse('spawn', 25, 1); // skipFrames=1
                console.log('[WORM] Pre-underground - tail disappearing (virtual home)');
            });
        });

        console.log('[WORM] Starting RETURN burrow to virtual home');
    }

    /**
     * Updates the burrow attack state machine
     * Called every frame when worm is burrowing
     */
    private updateBurrowAttack(delta: number, scene: THREE.Scene, playerPos: THREE.Vector3, allEnemies: EnemyThree[]): void {
        if (!this.isBurrowing) return;

        this.burrowTimer -= delta;

        // Determine target position (player or nearest enemy if mind controlled)
        let targetPos = playerPos;
        if (this.isMindControlled) {
            const nearestEnemy = this.findNearestNonControlledEnemy(allEnemies);
            if (nearestEnemy) {
                targetPos = nearestEnemy.mesh.position;
            } else {
                // No enemies to attack, cancel burrow
                this.endBurrowAttack();
                return;
            }
        }

        switch (this.burrowPhase) {
            case 'bury1':
                this.updateBury1Phase(delta);
                break;

            case 'bury2':
                this.updateBury2Phase(delta);
                break;

            case 'pre_underground':
                this.updatePreUndergroundPhase(delta);
                break;

            case 'underground':
                this.updateUndergroundPhase(delta, scene, targetPos);
                break;

            case 'pre_emerge':
                this.updatePreEmergePhase(delta);
                break;

            case 'emerge':
                this.updateEmergePhase(delta);
                break;

            // REBURY phases (seamless sinking)
            case 'rebury_emerge':
                this.updateReburyEmergePhase(delta);
                break;

            case 'rebury_spawn':
                this.updateReburySpawnPhase(delta);
                break;

            // RETREAT phases (seamless emergence: spawn → bury reverse → idle)
            case 'retreat_underground':
                this.updateRetreatUndergroundPhase(delta, scene);
                break;

            case 'retreat_spawn':
                this.updateRetreatSpawnPhase(delta);
                break;

            case 'retreat_bury2_rev':
                this.updateRetreatBury2RevPhase(delta);
                break;

            case 'retreat_bury1_rev':
                this.updateRetreatBury1RevPhase(delta);
                break;
        }

        // Update animation
        this.animator.update(delta);
    }

    /**
     * Phase 1: Bury1 - Start burrowing (30f @ 45fps = 0.67s)
     * Visual: Worm diving head-first into ground
     */
    private updateBury1Phase(delta: number): void {
        // NO position.y changes - el asset ya muestra al worm entrando al suelo
        // NO opacity changes - el asset ya maneja la transparencia
    }

    /**
     * Phase 2: Bury2 - Complete burrowing (30f @ 45fps = 0.67s)
     * Visual: Only tail visible, then disappears
     */
    private updateBury2Phase(delta: number): void {
        // NO position.y changes - el asset ya muestra al worm desapareciendo
    }

    /**
     * Phase 2b: Pre-Underground - Tail disappears using reverse SPAWN
     * Visual: spawn-030 (tail tip) -> spawn-001 (nothing visible)
     * bury2-030 ≈ spawn-030 (seamless transition)
     * After this, worm goes invisible and travels underground
     */
    private updatePreUndergroundPhase(delta: number): void {
        // Animation plays: spawn reverse (030→001) - tail disappearing

        if (this.burrowTimer <= 0) {
            // spawn-001 reached (nothing visible)
            // Now go invisible and travel underground
            this.burrowPhase = 'underground';
            this.burrowTimer = this.isFleeing ? this.UNDERGROUND_DURATION * 0.6 : this.UNDERGROUND_DURATION;
            this.mesh.visible = false;

            // Store underground start position for interpolation
            this.burrowStartPosition.copy(this.mesh.position);

            console.log('[WORM] Underground - traveling to target');
        }
    }

    /**
     * Phase 3: Moving underground toward target (800ms)
     * Interpolates position and spawns particles along the path to show underground travel
     */
    private updateUndergroundPhase(delta: number, scene: THREE.Scene, targetPos: THREE.Vector3): void {
        // Only track target if NOT fleeing (flee target is fixed)
        if (!this.isFleeing) {
            this.burrowTargetPosition.copy(targetPos);
        }

        // Calculate travel progress (0 = start, 1 = arrived)
        const totalDuration = this.isFleeing ? this.UNDERGROUND_DURATION * 0.6 : this.UNDERGROUND_DURATION;
        const progress = 1 - (this.burrowTimer / totalDuration);

        // Interpolate position along the path (even though invisible)
        const currentX = this.burrowStartPosition.x + (this.burrowTargetPosition.x - this.burrowStartPosition.x) * progress;
        const currentZ = this.burrowStartPosition.z + (this.burrowTargetPosition.z - this.burrowStartPosition.z) * progress;

        // Update mesh position to current interpolated position
        this.mesh.position.x = currentX;
        this.mesh.position.z = currentZ;

        // Spawn particles at current position (shows underground travel path)
        const currentPos = new THREE.Vector3(currentX, 0, currentZ);
        this.spawnUndergroundParticles(scene, currentPos);

        if (this.burrowTimer <= 0) {
            // Ensure final position is exactly at target
            this.mesh.position.x = this.burrowTargetPosition.x;
            this.mesh.position.z = this.burrowTargetPosition.z;

            // Transition to PRE-EMERGE phase (spawn as warning)
            this.burrowPhase = 'pre_emerge';
            this.burrowTimer = this.SPAWN_DURATION;
            this.mesh.visible = true;

            // Play SPAWN animation: 001→030 (cola aparece como warning)
            // forceReset=true porque la animación anterior era 'spawn' (pre_underground reverse)
            this.animator.play('spawn', false, 25, 0, true);

            console.log('[WORM] Pre-emerge - tail appearing');
        }
    }

    /**
     * Phase 4: Pre-Emerge - Tail appears as warning before attack
     * Visual: spawn 001→030 (tail tip appears)
     * spawn-030 ≈ emerge-001 (seamless transition to attack)
     */
    private updatePreEmergePhase(delta: number): void {
        // NO position.y changes - el asset ya muestra la cola apareciendo

        if (this.burrowTimer <= 0) {
            // spawn-030 reached (tail visible)
            // spawn-030 ≈ emerge-001 → skip 1 frame para fluidez

            this.burrowPhase = 'emerge';
            this.burrowTimer = this.EMERGE_DURATION;

            // Play EMERGE animation: 001→030 (ataque agresivo)
            this.animator.play('emerge', false, 40, 1); // skipFrames=1

            console.log('[WORM] Emerging attack!');
        }
    }

    /**
     * Phase 5: Emerging and attacking (30f @ 40fps = 0.75s)
     * Visual: Worm bursts from ground aggressively
     * Damage is dealt at ~40% through animation
     *
     * FLUJO COMPLETO:
     * bury1 → bury2 → underground → pre_emerge (warning) → emerge (¡DAÑO!) → rebury → retreat → idle
     */
    private updateEmergePhase(delta: number): void {
        // NO position.y changes - el asset ya muestra al worm emergiendo
        // Damage is applied at 40% through emerge animation (handled by collision system)

        if (this.burrowTimer <= 0) {
            // Emerge complete - now sink back into ground (ALWAYS, no exceptions)

            // Calculate retreat position
            // For flee: go further in the flee direction
            // For attack: retreat back toward where we came from
            let retreatDirection: THREE.Vector3;

            if (this.isFleeing) {
                // Flee: continue in same direction (away from damage)
                retreatDirection = new THREE.Vector3()
                    .subVectors(this.mesh.position, this.burrowStartPosition)
                    .normalize();
            } else {
                // Attack: retreat back toward where we came from
                retreatDirection = new THREE.Vector3()
                    .subVectors(this.burrowStartPosition, this.mesh.position)
                    .normalize();
            }

            // If direction is zero, pick random direction
            if (retreatDirection.length() < 0.1) {
                const angle = Math.random() * Math.PI * 2;
                retreatDirection.set(Math.cos(angle), 0, Math.sin(angle));
            }

            this.retreatPosition.copy(this.mesh.position)
                .add(retreatDirection.multiplyScalar(this.RETREAT_DISTANCE));

            // FASE REBURY_EMERGE: playReverse('emerge') - worm sinks back (seamless)
            // emerge-030 (full worm) -> emerge-001 (tail tip visible)
            // La animación de emerge COMIENZA con la cola asomándose (frame 001)
            // Así que el reverse termina en ese mismo frame (cola visible)
            this.burrowPhase = 'rebury_emerge';
            this.burrowTimer = this.EMERGE_DURATION; // Same duration as emerge (0.75s)

            // Play EMERGE animation in REVERSE at SAME SPEED as forward
            this.animator.playReverse('emerge', 40); // 40fps - velocidad normal

            console.log('[WORM] Emerge complete - sinking back');
        }
    }

    /**
     * Phase 5a: Rebury Emerge - Sinking after attack using reverse EMERGE
     * Visual: Worm sinks from emerge-030 (full) to emerge-001 (tail tip)
     * emerge-001 ≈ spawn-030 (seamless transition)
     */
    private updateReburyEmergePhase(delta: number): void {
        // NO position.y changes - el asset ya muestra al worm hundiéndose

        if (this.burrowTimer <= 0) {
            // emerge-001 reached (tail tip visible)
            // emerge-001 ≈ spawn-030 → skip 1 frame para fluidez

            this.burrowPhase = 'rebury_spawn';
            this.burrowTimer = this.SPAWN_DURATION; // 1.2s

            // Play SPAWN in reverse: spawn-030 -> spawn-001 (tail disappears)
            this.animator.playReverse('spawn', 25, 1); // skipFrames=1

            console.log('[WORM] Rebury emerge complete - rebury_spawn (playReverse spawn)');
        }
    }

    /**
     * Phase 5b: Rebury Spawn - Tail disappears using reverse SPAWN
     * Visual: spawn-030 (tail tip) -> spawn-001 (nothing visible)
     * After this, worm is completely underground (asset is transparent)
     */
    private updateReburySpawnPhase(delta: number): void {
        // NO position.y changes - el asset ya muestra la cola desapareciendo

        if (this.burrowTimer <= 0) {
            // Worm at spawn-001 (transparent/nothing visible)
            // Store current position as start for retreat interpolation
            this.burrowStartPosition.copy(this.mesh.position);

            // Transition to retreat underground
            this.burrowPhase = 'retreat_underground';
            this.burrowTimer = this.UNDERGROUND_DURATION;
            this.mesh.visible = false;

            console.log('[WORM] Rebury spawn complete - traveling underground to retreat position');
        }
    }

    /**
     * Phase 6: Retreat Underground - Traveling away from attack position
     * Interpolates position and spawns particles along the path to show underground travel
     */
    private updateRetreatUndergroundPhase(delta: number, scene: THREE.Scene): void {
        // Calculate travel progress (0 = start, 1 = arrived)
        const progress = 1 - (this.burrowTimer / this.UNDERGROUND_DURATION);

        // Interpolate position along the path (even though invisible)
        const currentX = this.burrowStartPosition.x + (this.retreatPosition.x - this.burrowStartPosition.x) * progress;
        const currentZ = this.burrowStartPosition.z + (this.retreatPosition.z - this.burrowStartPosition.z) * progress;

        // Update mesh position to current interpolated position
        this.mesh.position.x = currentX;
        this.mesh.position.z = currentZ;

        // Spawn particles at current position (shows underground travel path)
        const currentPos = new THREE.Vector3(currentX, 0, currentZ);
        this.spawnUndergroundParticles(scene, currentPos);

        if (this.burrowTimer <= 0) {
            // Ensure final position is exactly at retreat position
            this.mesh.position.x = this.retreatPosition.x;
            this.mesh.position.z = this.retreatPosition.z;

            // Usar spawn normal para que la cola aparezca gradualmente
            // spawn-001 (vacío) → spawn-030 (cola visible)
            this.burrowPhase = 'retreat_spawn';
            this.burrowTimer = this.SPAWN_DURATION;
            this.mesh.visible = true;

            // Play SPAWN animation: 001→030 (cola aparece)
            // forceReset=true porque la animación anterior era 'spawn' (rebury_spawn)
            this.animator.play('spawn', false, 25, 0, true);

            console.log('[WORM] Retreat underground complete - tail appearing at safe distance');
        }
    }

    /**
     * Phase 7a: Retreat Spawn - Tail appears using SPAWN animation
     * Visual: spawn-001 (nothing) -> spawn-030 (tail tip visible)
     * spawn-030 ≈ bury2-030 (seamless transition to bury2 reverse)
     */
    private updateRetreatSpawnPhase(delta: number): void {
        // NO position.y changes - el asset ya muestra la cola apareciendo
        // NO opacity changes - el asset maneja la transparencia

        if (this.burrowTimer <= 0) {
            // spawn-030 reached (tail tip visible)
            // spawn-030 ≈ bury2-030 → skip 1 frame para fluidez

            this.burrowPhase = 'retreat_bury2_rev';
            this.burrowTimer = this.BURY2_DURATION;

            // Play REVERSE de bury2: 030→001 (cuerpo aparece)
            this.animator.playReverse('bury2', 45, 1); // skipFrames=1

            console.log('[WORM] Retreat spawn complete - retreat_bury2_rev (playReverse bury2)');
        }
    }

    /**
     * Phase 7b: Retreat Bury2 Reverse - Body appears using REVERSE bury2
     * Visual: bury2-030 (tail tip) -> bury2-001 (body appearing)
     * bury2-001 ≈ bury1-030 (seamless transition)
     */
    private updateRetreatBury2RevPhase(delta: number): void {
        // NO position.y changes - el asset ya muestra al cuerpo apareciendo
        // NO opacity changes - el asset ya maneja la transparencia

        if (this.burrowTimer <= 0) {
            // bury2-001 reached (body appearing)
            // bury2-001 ≈ bury1-030 → skip 1 frame para fluidez

            this.burrowPhase = 'retreat_bury1_rev';
            this.burrowTimer = this.BURY1_DURATION;

            // Play REVERSE de bury1: 030→001
            // bury1-030 ≈ bury2-001 (zambulléndose) - inicio
            // bury1-001 ≈ idle-001 (enroscado) - fin PERFECTO
            this.animator.playReverse('bury1', 45, 1); // skipFrames=1

            console.log('[WORM] Retreat bury2 reverse complete - retreat_bury1_rev');
        }
    }

    /**
     * Phase 7c: Retreat Bury1 Reverse - Full worm appears using REVERSE bury1
     * Visual: bury1-030 (diving) -> bury1-001 (coiled worm)
     * bury1-001 ≈ idle-001 (PERFECT seamless transition to idle!)
     */
    private updateRetreatBury1RevPhase(delta: number): void {
        // NO position.y changes - el asset ya muestra al worm apareciendo completo
        // NO opacity changes - el asset ya maneja la transparencia

        if (this.burrowTimer <= 0) {
            // bury1-001 reached = idle-001 (CONEXIÓN PERFECTA!)
            this.endBurrowAttack(); // Transición seamless a idle
            console.log('[WORM] Retreat bury1 reverse complete - now in idle (seamless!)');
        }
    }

    /**
     * Spawns grey dust particles at target position during underground phase
     */
    private spawnUndergroundParticles(scene: THREE.Scene, position: THREE.Vector3): void {
        // Only spawn particles ~10% of frames to avoid too many
        if (Math.random() > 0.15) return;

        // Create 2-4 dust particles
        const particleCount = 2 + Math.floor(Math.random() * 3);

        for (let i = 0; i < particleCount; i++) {
            // Create small grey sphere
            const geometry = new THREE.SphereGeometry(0.12, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: 0x888888, // Grey
                transparent: true,
                opacity: 0.7
            });

            const particle = new THREE.Mesh(geometry, material);

            // Random offset around target position
            const offsetX = (Math.random() - 0.5) * 2.5;
            const offsetZ = (Math.random() - 0.5) * 2.5;

            particle.position.set(
                position.x + offsetX,
                0.1, // Just above ground
                position.z + offsetZ
            );

            scene.add(particle);

            // Animate particle: rise and fade
            const startY = particle.position.y;
            const startTime = Date.now();
            const duration = 400 + Math.random() * 300; // 400-700ms

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Rise up
                particle.position.y = startY + progress * 1.2;

                // Expand slightly
                const scale = 1 + progress * 0.4;
                particle.scale.setScalar(scale);

                // Fade out
                material.opacity = 0.7 * (1 - progress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Cleanup
                    scene.remove(particle);
                    geometry.dispose();
                    material.dispose();
                }
            };

            animate();
        }
    }

    /**
     * Ends the burrow attack and resets state
     */
    private endBurrowAttack(): void {
        this.isBurrowing = false;
        this.isFleeing = false;
        this.burrowPhase = 'none';
        this.burrowTimer = 0;
        this.burrowCooldown = this.BURROW_COOLDOWN;
        this.hasDealtDamageThisBurrow = false;

        // Ensure worm is fully visible and on ground
        this.mesh.visible = true;
        this.mesh.position.y = 0;

        // Reset color to original (no opacity changes needed)
        const material = this.sprite.material as THREE.SpriteMaterial;
        material.color.setHex(this.isMindControlled ? this.mindControlColor : this.originalColor);

        // Return to idle animation - bury1-001 ≈ idle-001 → skip 1 frame para fluidez
        this.animator.play('idle', true, 18, 1); // skipFrames=1

        console.log('[WORM] Burrow attack complete, cooldown started');
    }

    /**
     * Finds the nearest non-mind-controlled enemy (for minion targeting)
     */
    private findNearestNonControlledEnemy(allEnemies: EnemyThree[]): EnemyThree | null {
        let nearest: EnemyThree | null = null;
        let nearestDist = Infinity;

        for (const enemy of allEnemies) {
            if (enemy === this || enemy.isDead || enemy.isMindControlled) continue;

            const dist = this.mesh.position.distanceTo(enemy.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    // ========== BURROW PUBLIC METHODS (for collision detection) ==========

    /**
     * Returns true if worm is in emerge phase (damage phase)
     */
    public isInEmergePhase(): boolean {
        return this.burrowPhase === 'emerge';
    }

    /**
     * Returns true if burrow damage has been dealt
     */
    public hasDealtBurrowDamage(): boolean {
        return this.hasDealtDamageThisBurrow;
    }

    /**
     * Marks burrow damage as dealt
     */
    public markBurrowDamageDealt(): void {
        this.hasDealtDamageThisBurrow = true;
    }

    /**
     * Gets the burrow attack damage
     */
    public getBurrowDamage(): number {
        return this.BURROW_DAMAGE;
    }

    /**
     * Returns true if worm is invulnerable (underground phases)
     */
    public isInvulnerable(): boolean {
        return this.burrowPhase === 'underground' ||
               this.burrowPhase === 'rebury_spawn' ||  // Tail disappearing underground
               this.burrowPhase === 'retreat_underground';
    }

    /**
     * Returns true if worm is currently burrowing
     */
    public isCurrentlyBurrowing(): boolean {
        return this.isBurrowing;
    }

    // ========== JUMP ATTACK METHODS (Worm Only) ==========

    /**
     * Starts the jump attack animation
     * After animation completes, calls handleJumpAttackEnd()
     */
    private startJumpAttack(): void {
        if (this.isJumpAttacking || this.jumpAttackCooldown > 0) return;

        this.isJumpAttacking = true;
        this.jumpAttackHit = false; // Reset hit flag
        this.jumpAttackCooldown = this.JUMP_ATTACK_COOLDOWN;

        // Visual: Flash red at start
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xff0000);

        // Play jump animation (30f @ 45fps)
        this.animator.play('jump', false, 45);
        this.animator.setOnComplete(() => {
            // Animation complete - handle recovery
            this.handleJumpAttackEnd();
        });

        console.log('[WORM] Jump attack started!');
    }

    /**
     * Handles the end of jump attack based on whether it connected
     * - If hit: Stay stunned on frame 30 for 0.5s, then idle
     * - If missed: Play reverse animation (aggressive recovery), then idle
     */
    private handleJumpAttackEnd(): void {
        if (this.jumpAttackHit) {
            // Attack CONNECTED -> stay stunned (frame 30) for 0.5s
            console.log('[WORM] Jump attack HIT - stunned recovery');
            this.isStunned = true;
            this.stunDuration = this.JUMP_STUNNED_DURATION;

            // Keep showing hurt/stunned frame (last frame of jump)
            this.animator.setStaticFrame('jump', 29); // Frame 30 (0-indexed = 29)

            // After stun duration, return to idle
            setTimeout(() => {
                this.isJumpAttacking = false;
                this.animator.play('idle', true, 18);
                // Restore color
                const material = this.sprite.material as THREE.SpriteMaterial;
                material.color.setHex(this.isMindControlled ? this.mindControlColor : this.originalColor);
            }, this.JUMP_STUNNED_DURATION * 1000);
        } else {
            // Attack MISSED -> aggressive recovery with reverse animation
            console.log('[WORM] Jump attack MISSED - aggressive reverse recovery');

            // Play jump animation in REVERSE (30 -> 1)
            this.animator.playReverse('jump', 30);
            this.animator.setOnComplete(() => {
                // Reverse complete - back to idle with aggressive posture
                this.isJumpAttacking = false;
                this.animator.play('idle', true, 18);

                // Restore color
                const material = this.sprite.material as THREE.SpriteMaterial;
                material.color.setHex(this.isMindControlled ? this.mindControlColor : this.originalColor);

                console.log('[WORM] Aggressive recovery complete');
            });
        }
    }

    /**
     * Marks that the jump attack connected with the target
     * Called by collision system when damage is dealt
     */
    public markJumpAttackHit(): void {
        this.jumpAttackHit = true;
    }

    /**
     * Returns true if worm is currently jump attacking (for collision detection)
     */
    public isCurrentlyJumpAttacking(): boolean {
        return this.isJumpAttacking;
    }

    /**
     * Gets the jump attack damage
     */
    public getJumpAttackDamage(): number {
        return this.JUMP_ATTACK_DAMAGE;
    }
}

