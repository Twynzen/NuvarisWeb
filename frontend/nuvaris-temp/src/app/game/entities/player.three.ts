import * as THREE from 'three';
import { SpriteAnimator } from '../engine/sprite-animator';
import { AtlasSpriteAnimator } from '../engine/atlas-sprite-animator';
import { ProjectileThree } from './projectile.three';
import { EnemyThree } from './enemy.three';

// Set to true to use atlas sprite sheets instead of individual PNGs (all characters)
const USE_ATLAS = true;

// 8-directional movement/attack directions
export type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

export class PlayerThree {
    public mesh: THREE.Group;
    private sprite: THREE.Sprite;
    private animator: SpriteAnimator | AtlasSpriteAnimator;
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
    private larsAttackDuration = 100; // 3 frames @ 30fps = ~100ms
    private lastAttackTime = 0;
    private attackCooldown = 0.3; // 300ms between attacks

    // ========== LARS CHARGE ATTACK SYSTEM ==========
    private isCharging = false;
    private chargeStartTime = 0;
    private chargeLevel = 0; // 0-1 representing charge progress
    private maxChargeTime = 0.75; // Seconds to reach full charge (slightly longer than animation to ensure it completes)
    private chargeThresholds = {
        level1: 0.33,  // 0.5s - 35% mind control
        level2: 0.66,  // 1.0s - 70% mind control
        full: 1.0      // 1.5s - 100% guaranteed
    };

    // Hold loop state (loop final frames when charge is complete)
    private inHoldLoop = false;
    private readonly holdFrameStart = 24; // Frame 25 (0-indexed) - sphere fully visible
    private readonly holdFrameEnd = 29;   // Frame 30 (0-indexed) - max energy

    // ========== 360 ROTATION HOLD SYSTEM ==========
    private inRotationHold = false;           // True when using 360 rotation sprites
    private inDownHoldLoop = false;           // True when holding in "down" direction (uses charge-down hold loop)
    private currentRotationFrame = 0;         // Current frame being displayed (float for interpolation)
    private targetRotationFrame = 0;          // Target frame to interpolate to
    private lastChargeTarget: THREE.Vector3 | null = null; // Last mouse/touch position during charge
    private chargeFullyLoaded = false;        // True when charge animation completed and ready for rotation
    // Based on visual analysis: 360° rotation spans ~20 frames (frames 0-19)
    // Frame 0=DOWN(0°), Frame 5=RIGHT(90°), Frame 10=UP(180°), Frame 15=LEFT(270°)
    private readonly ROTATION_FRAME_COUNT = 20;  // Effective frames for 360° rotation
    private readonly DEGREES_PER_FRAME = 18;     // 360 / 20 = 18 degrees per frame
    private readonly ROTATION_LERP_SPEED = 12;   // Frames per second of interpolation (smoother)

    // Debug mode - set to true to see flip/animation logs
    private DEBUG_FLIP = false;

    // ========== PROYECTO-A CHARGE ATTACK SYSTEM ==========
    private proyectoACharging = false;
    private proyectoAChargeDirection: 'down' | 'left' | 'right' = 'down';
    private proyectoAChargeLevel = 0;
    private proyectoAChargeStartTime = 0;
    private proyectoAInHoldLoop = false;

    // Frame ranges per direction (0-indexed)
    // Based on visual analysis of attack animations
    private readonly PROYECTO_A_FRAMES = {
        down: {
            chargeEnd: 7,      // Frames 0-7: wind-up (brazos subiendo)
            holdStart: 8,      // Frames 8-11: hold loop (brazos arriba)
            holdEnd: 11,
            releaseStart: 12,  // Frames 12-29: release (golpe + recovery)
            impactFrame: 14    // Frame where damage applies
        },
        left: {
            chargeEnd: 2,      // Frames 0-2: wind-up
            holdStart: 3,      // Frames 3-5: hold loop
            holdEnd: 5,
            releaseStart: 6,   // Frames 6-29: release
            impactFrame: 8     // Frame where damage applies
        },
        right: {
            chargeEnd: 2,      // Frames 0-2: wind-up
            holdStart: 3,      // Frames 3-5: hold loop
            holdEnd: 5,
            releaseStart: 6,   // Frames 6-29: release
            impactFrame: 8     // Frame where damage applies
        }
    };
    private readonly PROYECTO_A_CHARGE_TIME = 0.3; // Seconds to reach 100% charge

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

        // Animator - use atlas sprite sheets when enabled, legacy SpriteAnimator as fallback
        if (USE_ATLAS) {
            this.animator = new AtlasSpriteAnimator(material);
            if (this.characterId === 'proyecto-a') {
                this.loadAtlasAnimations();
            } else if (this.characterId === 'lars') {
                this.loadLarsAtlasAnimations();
            } else if (this.characterId === 'proyecto-y') {
                this.loadProyectoYAtlasAnimations();
            }
        } else {
            this.animator = new SpriteAnimator(material);
            this.loadAnimations();
        }
        this.animator.play('idle');
    }

    private loadAnimations() {
        const animator = this.animator as SpriteAnimator;
        const folder = this.characterId;
        const prefix = `${this.characterId}-`;

        // === IDLE ===
        let idlePrefix = `${prefix}idle-`;
        if (this.characterId === 'lars') {
            idlePrefix = 'lars-idle-one-';
        }

        animator.loadAnimation({
            name: 'idle',
            texturePath: `assets/${folder}/idle`,
            prefix: idlePrefix,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // === CARDINAL MOVEMENT (all characters) ===
        animator.loadAnimation({
            name: 'run-right',
            texturePath: `assets/${folder}/right`,
            prefix: `${prefix}walk-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-left',
            texturePath: `assets/${folder}/left`,
            prefix: `${prefix}walk-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'up',
            texturePath: `assets/${folder}/up`,
            prefix: `${prefix}walk-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'down',
            texturePath: `assets/${folder}/down`,
            prefix: `${prefix}walk-down-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // === DEAD (all characters) ===
        animator.loadAnimation({
            name: 'dead',
            texturePath: `assets/${folder}/dead`,
            prefix: `${prefix}dead-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        // === CHARACTER-SPECIFIC ANIMATIONS ===
        if (this.characterId === 'lars') {
            this.loadLarsAnimations();
        } else if (this.characterId === 'proyecto-y') {
            this.loadProyectoYAnimations();
        } else if (this.characterId === 'proyecto-a') {
            this.loadArcadioAnimations();
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
        const animator = this.animator as SpriteAnimator;
        const folder = 'lars';
        const prefix = 'lars-';

        // === DIAGONAL MOVEMENT (30 frames each) ===
        animator.loadAnimation({
            name: 'run-up-left',
            texturePath: `assets/${folder}/up-left`,
            prefix: `${prefix}walk-up-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-up-right',
            texturePath: `assets/${folder}/up-right`,
            prefix: `${prefix}walk-up-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-down-left',
            texturePath: `assets/${folder}/down-left`,
            prefix: `${prefix}walk-down-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
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
            animator.loadAnimation({
                name: `attack-${dir}`,
                texturePath: `assets/${folder}/attack/${dir}`,
                prefix: `${prefix}attack-${dir}-`,
                suffix: '.png',
                frameCount: 3,
                frameRate: 30, // 3 frames @ 30fps = 100ms
                loop: false
            });
        }

        // === CHARGE ANIMATIONS ===
        // Charge facing down (front view) - only animation used during 0-99% charge
        animator.loadAnimation({
            name: 'charge-down',
            texturePath: `assets/${folder}/charge-down`,
            prefix: `${prefix}charge-down-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 45, // ~0.67s to complete animation
            loop: false   // NO loop - plays once, stays on last frame until rotation activates
        });

        // Charge facing up (back view)
        animator.loadAnimation({
            name: 'charge-up',
            texturePath: `assets/${folder}/charge-up`,
            prefix: `${prefix}charge-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 38, // 25% faster than original 30fps
            loop: true
        });

        // Charge facing left (will use charge-down as fallback until assets provided)
        animator.loadAnimation({
            name: 'charge-left',
            texturePath: `assets/${folder}/charge-left`,
            prefix: `${prefix}charge-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 38,
            loop: true
        });

        // Charge facing right (will use charge-down as fallback until assets provided)
        animator.loadAnimation({
            name: 'charge-right',
            texturePath: `assets/${folder}/charge-right`,
            prefix: `${prefix}charge-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 38,
            loop: true
        });

        // === CHARGE ROTATION (360° rotation at 100% charge) ===
        animator.loadAnimation({
            name: 'charge-rotation',
            texturePath: `assets/${folder}/charge-rotation`,
            prefix: 'charge-rotation-',
            suffix: '.png',
            frameCount: 30,
            frameRate: 30, // Not used - we control frames manually
            loop: false
        });

        console.log('[LARS] Loaded 8-directional movement + 8-directional attack + 4-directional charge + 360° rotation animations');
    }

    /**
     * Load Proyecto-Y specific animations:
     * - 4 diagonal movement animations (30 frames each)
     * - Shoot animations
     */
    private loadProyectoYAnimations() {
        const animator = this.animator as SpriteAnimator;
        const folder = 'proyecto-y';
        const prefix = 'proyecto-y-';

        // === DIAGONAL MOVEMENT (30 frames each) ===
        animator.loadAnimation({
            name: 'run-up-left',
            texturePath: `assets/${folder}/up-left`,
            prefix: `${prefix}walk-up-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-up-right',
            texturePath: `assets/${folder}/up-right`,
            prefix: `${prefix}walk-up-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-down-left',
            texturePath: `assets/${folder}/down-left`,
            prefix: `${prefix}walk-down-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-down-right',
            texturePath: `assets/${folder}/down-right`,
            prefix: `${prefix}walk-down-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // === SHOOT ANIMATIONS ===
        this.loadShootAnimations(folder, prefix);

        // === CHARGE ANIMATIONS (for chain attack) ===
        animator.loadAnimation({
            name: 'charge-down',
            texturePath: `assets/${folder}/charge-down`,
            prefix: `${prefix}charge-down-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 45,
            loop: false
        });

        animator.loadAnimation({
            name: 'charge-up',
            texturePath: `assets/${folder}/charge-up`,
            prefix: `${prefix}charge-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 38,
            loop: true
        });

        animator.loadAnimation({
            name: 'charge-left',
            texturePath: `assets/${folder}/charge-left`,
            prefix: `${prefix}charge-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 38,
            loop: true
        });

        animator.loadAnimation({
            name: 'charge-right',
            texturePath: `assets/${folder}/charge-right`,
            prefix: `${prefix}charge-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 38,
            loop: true
        });

        animator.loadAnimation({
            name: 'charge-rotation',
            texturePath: `assets/${folder}/charge-rotation`,
            prefix: `${prefix}charge-rotation-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 40,  // 40fps for 0.75s charge time
            loop: false
        });

        // === DIAGONAL CHARGE ANIMATIONS ===
        animator.loadAnimation({
            name: 'charge-up-left',
            texturePath: `assets/${folder}/charge-up-left`,
            prefix: `${prefix}charge-up-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 15,
            loop: true
        });

        animator.loadAnimation({
            name: 'charge-up-right',
            texturePath: `assets/${folder}/charge-up-right`,
            prefix: `${prefix}charge-up-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 15,
            loop: true
        });

        animator.loadAnimation({
            name: 'charge-down-left',
            texturePath: `assets/${folder}/charge-down-left`,
            prefix: `${prefix}charge-down-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 15,
            loop: true
        });

        animator.loadAnimation({
            name: 'charge-down-right',
            texturePath: `assets/${folder}/charge-down-right`,
            prefix: `${prefix}charge-down-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 15,
            loop: true
        });

        console.log('[PROYECTO-Y] Loaded 8-directional movement + shoot + 9 charge animations');
    }

    /**
     * Load Arcadio (Proyecto-A) specific animations:
     * - 4 diagonal movement animations (30 frames each)
     * - 3 attack animations (30 frames each, 120° coverage each)
     * - Berserk idle animation
     */
    private loadArcadioAnimations(): void {
        const animator = this.animator as SpriteAnimator;
        const folder = 'proyecto-a';
        const prefix = 'proyecto-a-';

        // === DIAGONAL MOVEMENT (30 frames each) ===
        animator.loadAnimation({
            name: 'run-up-left',
            texturePath: `assets/${folder}/up-left`,
            prefix: `${prefix}walk-up-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-up-right',
            texturePath: `assets/${folder}/up-right`,
            prefix: `${prefix}walk-up-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-down-left',
            texturePath: `assets/${folder}/down-left`,
            prefix: `${prefix}walk-down-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        animator.loadAnimation({
            name: 'run-down-right',
            texturePath: `assets/${folder}/down-right`,
            prefix: `${prefix}walk-down-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        // === ATTACK ANIMATIONS (3 directions, 120° each = 360° coverage) ===
        // Each attack has 3 phases: wind-up (1-10), impact (11-20), recover (21-30)
        const attackDirections = ['down', 'left', 'right'];
        for (const dir of attackDirections) {
            animator.loadAnimation({
                name: `attack-${dir}`,
                texturePath: `assets/${folder}/attack/${dir}`,
                prefix: `${prefix}attack-${dir}-`,
                suffix: '.png',
                frameCount: 30,
                frameRate: 30,
                loop: false
            });
        }

        // === BERSERK IDLE (rage mode) ===
        animator.loadAnimation({
            name: 'berserk-idle',
            texturePath: `assets/${folder}/berserk/idle`,
            prefix: `${prefix}berserk-idle-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });

        console.log('[PROYECTO-A] Loaded 8-directional movement + 3-directional attack (120° each) + berserk');
    }

    /**
     * Load proyecto-a animations using atlas sprite sheets instead of individual PNGs.
     * Requires atlas files generated by: npm run generate-atlas -- --character proyecto-a
     */
    private loadAtlasAnimations(): void {
        const atlas = this.animator as AtlasSpriteAnimator;
        const base = 'assets/atlas/proyecto-a/proyecto-a';

        // Helper to load an atlas animation
        const load = (name: string, file: string, loop: boolean) => {
            atlas.loadAnimation({
                name,
                atlasPath: `${base}-${file}.png`,
                metadataPath: `${base}-${file}.json`,
                frameRate: 30,
                loop,
            });
        };

        // Idle
        load('idle', 'idle', true);

        // Cardinal movement
        load('run-right', 'right', true);
        load('run-left', 'left', true);
        load('up', 'up', true);
        load('down', 'down', true);

        // Diagonal movement
        load('run-up-left', 'up-left', true);
        load('run-up-right', 'up-right', true);
        load('run-down-left', 'down-left', true);
        load('run-down-right', 'down-right', true);

        // Dead
        load('dead', 'dead', false);

        // Attack (3 directions)
        load('attack-down', 'attack-down', false);
        load('attack-left', 'attack-left', false);
        load('attack-right', 'attack-right', false);

        // Shoot (4 directions)
        load('shoot-down', 'shoot-down', false);
        load('shoot-left', 'shoot-left', false);
        load('shoot-right', 'shoot-right', false);
        load('shoot-up', 'shoot-up', false);

        // Note: berserk-idle atlas not generated yet (uses legacy loader if needed)

        console.log('[PROYECTO-A] Loaded atlas sprite sheets (17 animations)');
    }

    /**
     * Load Lars animations using atlas sprite sheets.
     * Requires atlas files generated by: npm run generate-atlas -- --character lars
     */
    private loadLarsAtlasAnimations(): void {
        const atlas = this.animator as AtlasSpriteAnimator;
        const base = 'assets/atlas/lars/lars';

        const load = (name: string, file: string, loop: boolean, frameRate = 30) => {
            atlas.loadAnimation({
                name,
                atlasPath: `${base}-${file}.png`,
                metadataPath: `${base}-${file}.json`,
                frameRate,
                loop,
            });
        };

        // Idle
        load('idle', 'idle', true);

        // Cardinal movement
        load('run-right', 'right', true);
        load('run-left', 'left', true);
        load('up', 'up', true);
        load('down', 'down', true);

        // Diagonal movement
        load('run-up-left', 'up-left', true);
        load('run-up-right', 'up-right', true);
        load('run-down-left', 'down-left', true);
        load('run-down-right', 'down-right', true);

        // Dead
        load('dead', 'dead', false);

        // Attack (8 directions, 3 frames each)
        const attackDirs: Direction8[] = [
            'up', 'down', 'left', 'right',
            'up-left', 'up-right', 'down-left', 'down-right'
        ];
        for (const dir of attackDirs) {
            load(`attack-${dir}`, `attack-${dir}`, false);
        }

        // Charge (4 cardinal directions)
        load('charge-down', 'charge-down', false, 45);
        load('charge-up', 'charge-up', true, 38);
        load('charge-left', 'charge-left', true, 38);
        load('charge-right', 'charge-right', true, 38);

        // Charge rotation (360°)
        load('charge-rotation', 'charge-rotation', false);

        console.log('[LARS] Loaded atlas sprite sheets (23 animations)');
    }

    /**
     * Load Proyecto-Y (Yurany) animations using atlas sprite sheets.
     * Requires atlas files generated by: npm run generate-atlas -- --character proyecto-y
     */
    private loadProyectoYAtlasAnimations(): void {
        const atlas = this.animator as AtlasSpriteAnimator;
        const base = 'assets/atlas/proyecto-y/proyecto-y';

        const load = (name: string, file: string, loop: boolean, frameRate = 30) => {
            atlas.loadAnimation({
                name,
                atlasPath: `${base}-${file}.png`,
                metadataPath: `${base}-${file}.json`,
                frameRate,
                loop,
            });
        };

        // Idle
        load('idle', 'idle', true);

        // Cardinal movement
        load('run-right', 'right', true);
        load('run-left', 'left', true);
        load('up', 'up', true);
        load('down', 'down', true);

        // Diagonal movement
        load('run-up-left', 'up-left', true);
        load('run-up-right', 'up-right', true);
        load('run-down-left', 'down-left', true);
        load('run-down-right', 'down-right', true);

        // Dead
        load('dead', 'dead', false);

        // Shoot (4 directions)
        load('shoot-right', 'shoot-right', false);
        load('shoot-left', 'shoot-left', false);
        load('shoot-up', 'shoot-up', false);
        load('shoot-down', 'shoot-down', false);

        // Charge (4 cardinal directions)
        load('charge-down', 'charge-down', false, 45);
        load('charge-up', 'charge-up', true, 38);
        load('charge-left', 'charge-left', true, 38);
        load('charge-right', 'charge-right', true, 38);

        // Charge (4 diagonal directions)
        load('charge-up-left', 'charge-up-left', true, 15);
        load('charge-up-right', 'charge-up-right', true, 15);
        load('charge-down-left', 'charge-down-left', true, 15);
        load('charge-down-right', 'charge-down-right', true, 15);

        // Charge rotation (360°)
        load('charge-rotation', 'charge-rotation', false, 40);

        console.log('[PROYECTO-Y] Loaded atlas sprite sheets (23 animations)');
    }

    /**
     * Load shoot animations for non-Lars characters
     */
    private loadShootAnimations(folder: string, prefix: string) {
        const animator = this.animator as SpriteAnimator;
        animator.loadAnimation({
            name: 'shoot-right',
            texturePath: `assets/${folder}/shoot/right`,
            prefix: `${prefix}shoot-right-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        animator.loadAnimation({
            name: 'shoot-left',
            texturePath: `assets/${folder}/shoot/left`,
            prefix: `${prefix}shoot-left-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        animator.loadAnimation({
            name: 'shoot-up',
            texturePath: `assets/${folder}/shoot/up`,
            prefix: `${prefix}shoot-up-`,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: false
        });

        animator.loadAnimation({
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
        // Priority: Attack > Charging > ProyectoA Charging > Melee/Shooting > Movement > Idle
        let animationPlayed = '';

        if (this.isAttacking) {
            // Attack animation is handled in playAttackAnimation() - don't override
            animationPlayed = 'attacking';
        } else if (this.isCharging) {
            // Charge animation is handled in startCharge() - don't override
            // Update charge level each frame
            this.updateCharge();

            // Update 360° rotation interpolation if in rotation hold
            if (this.inRotationHold) {
                this.updateRotationInterpolation(delta);
            }

            animationPlayed = 'charging';
        } else if (this.proyectoACharging) {
            // Proyecto-A charge animation is handled in startProyectoACharge() - don't override
            animationPlayed = 'proyecto-a-charging';
        } else if (this.isMeleeAttacking) {
            // Melee animation is handled in meleeAttack() - don't override it
            animationPlayed = 'melee';
        } else if (this.isShooting) {
            // Shooting animation is handled in shoot()
            animationPlayed = 'shooting';
        } else if (this.isMoving) {
            // Movement animations - Lars, Proyecto-Y, and Arcadio use 8-directional
            if (this.characterId === 'lars' || this.characterId === 'proyecto-y' || this.characterId === 'proyecto-a') {
                animationPlayed = this.play8DirectionalMovement(moveX, moveZ);
            } else {
                animationPlayed = this.playCardinalMovementAnimation(moveX, moveZ);
            }
        } else {
            this.animator.play('idle', true, 30);
            animationPlayed = 'idle';
        }

        // Debug log for animation state (throttled - only when moving)
        if (this.DEBUG_FLIP && this.isMoving) {
            console.log(`[ANIM] moveX=${moveX}, moveZ=${moveZ}, anim=${animationPlayed}, dir8=${this.lastDirection8}`);
        }

        this.animator.update(delta);
    }

    /**
     * Play 8-directional movement animation (used by Lars and Proyecto-Y)
     */
    private play8DirectionalMovement(moveX: number, moveZ: number): string {
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

        this.animator.play(animName, true, 30);
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

        this.animator.play(animName, true, 30);
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
            this.animator.play(attackAnim, false, 30);

            if (this.DEBUG_FLIP) {
                console.log(`[LARS ATTACK] direction=${direction}, anim=${attackAnim}`);
            }

            // Reset attacking state after animation completes (100ms for 3 frames @ 30fps)
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

    // ========== LARS CHARGE ATTACK METHODS ==========

    /**
     * Start charging attack (called on mouse down / touch start)
     * Lars and Proyecto-Y use different charge systems
     */
    private currentChargeAnim: string = 'charge-down';
    private proyectoYChargeComplete = false;  // Track if Proyecto-Y reached 100%

    public startCharge(): boolean {
        // Only Lars and Proyecto-Y can use charge attacks
        if (this.characterId !== 'lars' && this.characterId !== 'proyecto-y') return false;
        if (this.isCharging || this.isAttacking || this.isDead) return false;

        this.isCharging = true;
        this.chargeStartTime = Date.now();
        this.chargeLevel = 0;

        if (this.characterId === 'proyecto-y') {
            // Proyecto-Y: Start with charge-down, will update direction based on mouse
            this.currentChargeAnim = 'charge-down';
            this.proyectoYChargeComplete = false;
            this.animator.play('charge-down', true, 30);  // Loop until direction changes
            console.log('[PROYECTO-Y] Charge started - charge-down');
        } else {
            // Lars: Use charge-down (existing behavior)
            this.currentChargeAnim = 'charge-down';
            this.animator.play('charge-down');
            console.log('[LARS] Charge started - charge-down');
        }

        return true;
    }

    /**
     * Update charge animation based on target direction
     * Call this while charging to update animation based on mouse/touch position
     */
    public updateChargeDirection(targetPosition: THREE.Vector3): void {
        if (!this.isCharging) return;

        // Store target position for rotation hold initialization
        this.lastChargeTarget = targetPosition.clone();

        // During charge (0-99%), always face down - no direction changes allowed
        if (!this.chargeFullyLoaded) return;

        // Charge is fully loaded - check direction to decide hold mode
        const direction = this.getDirection8ToTarget(targetPosition);
        const isPointingDown = direction === 'down' || direction === 'down-left' || direction === 'down-right';

        if (isPointingDown) {
            // Pointing down/front - use charge-down hold loop (energy stabilizing)
            if (!this.inDownHoldLoop) {
                this.inDownHoldLoop = true;
                this.inRotationHold = false;
                this.animator.playSubsetLoop(
                    'charge-down',
                    this.holdFrameStart,
                    this.holdFrameEnd,
                    15 // Slower oscillation for "stabilizing" effect
                );
                console.log('[LARS] Down hold loop - energy stabilizing');
            }
        } else {
            // Pointing other direction - use 360° rotation
            if (!this.inRotationHold) {
                this.inDownHoldLoop = false;
                this.inRotationHold = true;
                this.animator.stopSubsetLoop();

                // Initialize rotation frame
                const angle = this.getAngleToTarget(targetPosition);
                this.currentRotationFrame = this.angleToFrame(angle);
                this.targetRotationFrame = this.currentRotationFrame;
                this.animator.setStaticFrame('charge-rotation', Math.round(this.currentRotationFrame));
                console.log('[LARS] 360° rotation activated');
            } else {
                // Already in rotation mode - update target
                const angle = this.getAngleToTarget(targetPosition);
                this.targetRotationFrame = this.angleToFrame(angle);
            }
        }
    }

    /**
     * Update charge level (called every frame while charging)
     * Returns current charge level 0-1
     */
    public updateCharge(): number {
        if (!this.isCharging) return 0;

        const elapsed = (Date.now() - this.chargeStartTime) / 1000;
        this.chargeLevel = Math.min(elapsed / this.maxChargeTime, 1.0);

        // Activate hold mode when charge is complete (100%)
        if (this.chargeLevel >= 1.0 && !this.chargeFullyLoaded) {
            this.chargeFullyLoaded = true;

            // Default: start with down hold loop (energy stabilizing)
            this.inDownHoldLoop = true;
            this.animator.playSubsetLoop(
                'charge-down',
                this.holdFrameStart,
                this.holdFrameEnd,
                15
            );
            console.log('[LARS] Charge complete - energy stabilizing (down hold)');
        }

        return this.chargeLevel;
    }

    /**
     * Update Proyecto-Y charge system (different from Lars)
     * Phase 1 (0-99%): charge-rotation synced with charge level
     * Phase 2 (100%): hold loop of charge-[direction] pointing at mouse
     */
    public updateProyectoYCharge(delta: number, targetPosition: THREE.Vector3): void {
        if (!this.isCharging || this.characterId !== 'proyecto-y') return;

        // Update charge level
        const elapsed = (Date.now() - this.chargeStartTime) / 1000;
        this.chargeLevel = Math.min(elapsed / this.maxChargeTime, 1.0);

        // Get 8-directional direction to mouse
        const direction = this.getDirection8ToTarget(targetPosition);
        const animName = `charge-${direction}`;

        // Update facing based on direction
        if (direction.includes('right')) {
            this.facingRight = true;
        } else if (direction.includes('left')) {
            this.facingRight = false;
        }

        if (this.chargeLevel < 1.0) {
            // During charge: Play charge-[direction] animation, update if direction changes
            if (this.currentChargeAnim !== animName) {
                this.currentChargeAnim = animName;
                this.animator.play(animName, true, 30);  // Loop the charge animation
                console.log(`[PROYECTO-Y] Charging direction: ${direction}`);
            }
        } else {
            // Charge complete: Switch to hold loop (frames 20-29)
            if (!this.proyectoYChargeComplete) {
                this.proyectoYChargeComplete = true;
                this.currentChargeAnim = '';  // Force animation switch
                console.log('[PROYECTO-Y] Charge complete!');
            }

            // Play hold loop if direction changed or just completed
            if (this.currentChargeAnim !== animName) {
                this.currentChargeAnim = animName;
                this.animator.playSubsetLoop(animName, 20, 29, 15);
                console.log(`[PROYECTO-Y] Hold direction: ${direction}`);
            }
        }
    }

    /**
     * Release charge and execute attack (called on mouse up / touch end)
     * @param targetPosition Position to attack towards
     * @returns Object with charge level and direction for the engine to process
     */
    public releaseCharge(targetPosition: THREE.Vector3): { chargeLevel: number; direction: Direction8 } | null {
        if (!this.isCharging) return null;
        if (this.characterId !== 'lars' && this.characterId !== 'proyecto-y') return null;

        const finalChargeLevel = this.chargeLevel;
        this.isCharging = false;
        this.chargeLevel = 0;

        // Reset all hold states
        this.inRotationHold = false;
        this.inDownHoldLoop = false;
        this.chargeFullyLoaded = false;
        this.currentRotationFrame = 0;
        this.targetRotationFrame = 0;
        this.lastChargeTarget = null;

        // Reset legacy hold loop state
        this.inHoldLoop = false;
        this.animator.stopSubsetLoop();

        // Get direction to target
        const direction = this.getDirection8ToTarget(targetPosition);
        this.lastDirection8 = direction;

        // Update facing based on direction
        if (direction.includes('right')) {
            this.facingRight = true;
        } else if (direction.includes('left')) {
            this.facingRight = false;
        }

        // Play attack animation in the correct direction
        this.isAttacking = true;
        this.lastAttackTime = Date.now();

        // Lars uses attack animations, Proyecto-Y uses charge final frames
        if (this.characterId === 'lars') {
            const attackAnim = `attack-${direction}`;
            this.animator.play(attackAnim, false, 30);
        } else if (this.characterId === 'proyecto-y') {
            // Proyecto-Y: Use final frames of charge-[direction] as attack animation
            const chargeAnim = `charge-${direction}`;
            // Play frames 27-29 as "fire" animation (3 frames @ 30fps = ~100ms)
            this.animator.playSubsetLoop(chargeAnim, 27, 29, 30);

            // Stop the loop after one pass (simulate one-shot animation)
            setTimeout(() => {
                this.animator.stopSubsetLoop();
            }, 100);
        }

        // Reset Proyecto-Y specific state
        if (this.characterId === 'proyecto-y') {
            this.proyectoYChargeComplete = false;
        }

        console.log(`[${this.characterId.toUpperCase()}] Charge released! Level: ${(finalChargeLevel * 100).toFixed(0)}%, Direction: ${direction}`);

        // Reset attacking state after animation completes
        setTimeout(() => {
            this.isAttacking = false;
        }, this.larsAttackDuration);

        return {
            chargeLevel: finalChargeLevel,
            direction: direction
        };
    }

    /**
     * Cancel charge without attacking (e.g., if player gets hit)
     */
    public cancelCharge(): void {
        if (!this.isCharging) return;

        this.isCharging = false;
        this.chargeLevel = 0;

        // Reset all hold states
        this.inRotationHold = false;
        this.inDownHoldLoop = false;
        this.chargeFullyLoaded = false;
        this.currentRotationFrame = 0;
        this.targetRotationFrame = 0;
        this.lastChargeTarget = null;

        // Reset legacy hold loop state
        this.inHoldLoop = false;
        this.animator.stopSubsetLoop();

        // Return to idle
        this.animator.play('idle', true, 30);

        console.log('[LARS] Charge cancelled');
    }

    /**
     * Check if Lars is currently charging
     */
    public isChargingAttack(): boolean {
        return this.isCharging;
    }

    /**
     * Get current charge level (0-1)
     */
    public getChargeLevel(): number {
        return this.chargeLevel;
    }

    /**
     * Get charge thresholds for UI/effects
     */
    public getChargeThresholds(): { level1: number; level2: number; full: number } {
        return { ...this.chargeThresholds };
    }

    /**
     * Check if charge is at a specific threshold
     */
    public isChargeAtThreshold(threshold: 'level1' | 'level2' | 'full'): boolean {
        return this.chargeLevel >= this.chargeThresholds[threshold];
    }

    /**
     * Get the last 8-directional facing direction
     */
    public getLastDirection8(): Direction8 {
        return this.lastDirection8;
    }

    // ========== 360 ROTATION HOLD METHODS ==========

    /**
     * Activate 360° rotation hold mode when charge reaches 100%
     */
    private activateRotationHold(): void {
        this.inRotationHold = true;
        this.inHoldLoop = false; // Disable old hold system
        this.animator.stopSubsetLoop();

        // Initialize rotation frame based on current target direction
        const angle = this.lastChargeTarget
            ? this.getAngleToTarget(this.lastChargeTarget)
            : 0;
        this.currentRotationFrame = this.angleToFrame(angle);
        this.targetRotationFrame = this.currentRotationFrame;

        // Set initial frame
        this.animator.setStaticFrame('charge-rotation', Math.round(this.currentRotationFrame));

        console.log('[LARS] 360° rotation hold activated');
    }

    /**
     * Convert angle (degrees) to frame index (0-29)
     * Frame 0 = 0 degrees (front/down)
     * Rotation is clockwise
     */
    private angleToFrame(angleDegrees: number): number {
        // Normalize angle to 0-360
        let normalized = angleDegrees % 360;
        if (normalized < 0) normalized += 360;

        // Convert to frame (clockwise rotation)
        return normalized / this.DEGREES_PER_FRAME;
    }

    /**
     * Calculate angle from player to target in degrees (0-360, clockwise from down/front)
     */
    private getAngleToTarget(targetPosition: THREE.Vector3): number {
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.mesh.position);

        // Calculate angle using atan2
        // In game coordinates: +X = right, +Z = down (front)
        // atan2(x, z) gives angle from +Z axis, counter-clockwise
        const angleRad = Math.atan2(direction.x, direction.z);

        // Convert to degrees
        let angleDeg = angleRad * (180 / Math.PI);

        // Normalize to 0-360
        if (angleDeg < 0) angleDeg += 360;

        return angleDeg;
    }

    /**
     * Interpolate rotation frame smoothly with wrap-around handling
     * Called every frame during rotation hold
     */
    private updateRotationInterpolation(delta: number): void {
        if (!this.inRotationHold) return;

        // Calculate shortest path considering wrap-around
        let diff = this.targetRotationFrame - this.currentRotationFrame;

        // Handle wrap-around (take shortest path)
        // If diff > half the frames, going the other way is shorter
        const halfFrames = this.ROTATION_FRAME_COUNT / 2; // 10 frames
        if (diff > halfFrames) {
            diff -= this.ROTATION_FRAME_COUNT; // Go backwards
        } else if (diff < -halfFrames) {
            diff += this.ROTATION_FRAME_COUNT; // Go forwards
        }

        // Smooth interpolation
        const maxMove = this.ROTATION_LERP_SPEED * delta;
        const move = Math.sign(diff) * Math.min(Math.abs(diff), maxMove);

        this.currentRotationFrame += move;

        // Normalize to 0-19.999... range (20 frames for 360°)
        if (this.currentRotationFrame >= this.ROTATION_FRAME_COUNT) {
            this.currentRotationFrame -= this.ROTATION_FRAME_COUNT;
        } else if (this.currentRotationFrame < 0) {
            this.currentRotationFrame += this.ROTATION_FRAME_COUNT;
        }

        // Update sprite to nearest frame (clamped to valid range 0-19)
        const displayFrame = Math.round(this.currentRotationFrame) % this.ROTATION_FRAME_COUNT;
        this.animator.setStaticFrame('charge-rotation', displayFrame);
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


    // ========== ARCADIO ATTACK SYSTEM (3 directions, 120° each) ==========

    /**
     * Get attack direction for Arcadio based on angle to target
     * Divides 360° into 3 zones of 120° each: down, left, right
     */
    public getArcadioAttackDirection(targetPosition: THREE.Vector3): 'down' | 'left' | 'right' {
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.mesh.position);

        // Calculate angle using atan2 (returns -PI to PI)
        // In game: +X = right, +Z = down (toward camera)
        // atan2(x, z): 0° = toward camera, 90° = right, 180° = away from camera, 270° = left
        const angleRad = Math.atan2(direction.x, direction.z);
        let angleDeg = angleRad * (180 / Math.PI);

        // Normalize to 0-360
        if (angleDeg < 0) angleDeg += 360;

        // Zone mapping (120° each) - based on isometric view:
        // DOWN:  300°-360° and 0°-60° (toward camera, bottom of screen)
        // RIGHT: 60°-180° (upper-right of screen)
        // LEFT:  180°-300° (upper-left of screen)
        if (angleDeg >= 300 || angleDeg < 60) {
            return 'down';  // Toward camera (bottom of screen)
        } else if (angleDeg >= 60 && angleDeg < 180) {
            return 'right'; // Upper-right
        } else {
            return 'left';  // Upper-left (180°-300°)
        }
    }

    /**
     * Play Arcadio attack animation with 3-zone damage timing
     * @param targetPosition Position to attack towards
     * @param onZoneDamage Callback for each damage zone (called 3 times)
     */
    public playArcadioAttack(
        targetPosition: THREE.Vector3,
        onZoneDamage?: (zone: 'start' | 'center' | 'end', multiplier: number, direction: 'down' | 'left' | 'right') => void
    ): Promise<void> {
        return new Promise((resolve) => {
            if (this.characterId !== 'proyecto-a') {
                resolve();
                return;
            }

            // Check cooldown
            const now = Date.now();
            if (now - this.lastMeleeAttackTime < this.meleeAttackCooldown * 1000) {
                resolve();
                return;
            }

            if (this.isMeleeAttacking) {
                resolve();
                return;
            }

            this.isMeleeAttacking = true;
            this.lastMeleeAttackTime = now;

            // Get 3-directional attack direction
            const direction = this.getArcadioAttackDirection(targetPosition);

            // Update facing based on direction
            if (direction === 'right') {
                this.facingRight = true;
            } else if (direction === 'left') {
                this.facingRight = false;
            }

            // Play attack animation
            const attackAnim = `attack-${direction}`;
            this.animator.play(attackAnim, false, 30);

            console.log(`[ARCADIO] Attack direction: ${direction}`);

            // === DAMAGE TIMING (3 zones within the attack) ===
            // Wind-up: frames 1-10 @ 30fps (333ms)
            // Impact: frames 11-20 (damage at 12, 15, 18)
            // Recover: frames 21-30

            // Zone 1 (start of arc) - Frame 12 (~400ms)
            setTimeout(() => {
                if (onZoneDamage) {
                    onZoneDamage('start', 0.7, direction); // 70% damage
                }
            }, 400);

            // Zone 2 (center of arc) - Frame 15 (~500ms) - MAXIMUM DAMAGE
            setTimeout(() => {
                if (onZoneDamage) {
                    onZoneDamage('center', 1.0, direction); // 100% damage
                }
            }, 500);

            // Zone 3 (end of arc) - Frame 18 (~600ms)
            setTimeout(() => {
                if (onZoneDamage) {
                    onZoneDamage('end', 0.7, direction); // 70% damage
                }
            }, 600);

            // Reset attack state after full animation (~1 second)
            setTimeout(() => {
                this.isMeleeAttacking = false;
                resolve();
            }, 1000);
        });
    }

    // ========== PROYECTO-A CHARGE ATTACK METHODS ==========

    /**
     * Start charging attack for Proyecto-A (called on mouse down)
     * Plays wind-up animation and transitions to hold loop at 100%
     */
    public startProyectoACharge(targetPosition: THREE.Vector3): boolean {
        if (this.characterId !== 'proyecto-a') return false;
        if (this.proyectoACharging || this.isMeleeAttacking || this.isDead) return false;

        this.proyectoACharging = true;
        this.proyectoAChargeStartTime = Date.now();
        this.proyectoAChargeLevel = 0;
        this.proyectoAInHoldLoop = false;

        // Determine initial direction based on cursor
        this.proyectoAChargeDirection = this.getArcadioAttackDirection(targetPosition);

        // Update facing
        if (this.proyectoAChargeDirection === 'right') {
            this.facingRight = true;
        } else if (this.proyectoAChargeDirection === 'left') {
            this.facingRight = false;
        }

        // Start playing the attack animation (wind-up phase)
        const attackAnim = `attack-${this.proyectoAChargeDirection}`;
        const frames = this.PROYECTO_A_FRAMES[this.proyectoAChargeDirection];

        // Calculate FPS to make wind-up match charge time
        // chargeEnd+1 frames in PROYECTO_A_CHARGE_TIME seconds
        const windupFrames = frames.chargeEnd + 1;
        const windupFps = windupFrames / this.PROYECTO_A_CHARGE_TIME;

        this.animator.play(attackAnim, false, windupFps);

        console.log(`[PROYECTO-A] Charge started - direction: ${this.proyectoAChargeDirection}`);
        return true;
    }

    /**
     * Update Proyecto-A charge (called every frame while charging)
     * Handles direction changes and transitions to hold loop
     */
    public updateProyectoACharge(delta: number, targetPosition: THREE.Vector3): void {
        if (!this.proyectoACharging || this.characterId !== 'proyecto-a') return;

        // Calculate charge level
        const elapsed = (Date.now() - this.proyectoAChargeStartTime) / 1000;
        this.proyectoAChargeLevel = Math.min(elapsed / this.PROYECTO_A_CHARGE_TIME, 1.0);

        // Check if direction changed
        const newDirection = this.getArcadioAttackDirection(targetPosition);

        if (newDirection !== this.proyectoAChargeDirection && !this.proyectoAInHoldLoop) {
            // Direction changed during wind-up, restart with new direction
            this.proyectoAChargeDirection = newDirection;

            // Update facing
            if (newDirection === 'right') {
                this.facingRight = true;
            } else if (newDirection === 'left') {
                this.facingRight = false;
            }

            // Restart animation with new direction
            const attackAnim = `attack-${newDirection}`;
            const frames = this.PROYECTO_A_FRAMES[newDirection];
            const windupFrames = frames.chargeEnd + 1;
            const windupFps = windupFrames / this.PROYECTO_A_CHARGE_TIME;

            // Maintain charge progress
            const currentFrame = Math.floor(this.proyectoAChargeLevel * frames.chargeEnd);
            this.animator.play(attackAnim, false, windupFps);
        }

        // Transition to hold loop when charge reaches 100%
        if (this.proyectoAChargeLevel >= 1.0 && !this.proyectoAInHoldLoop) {
            this.proyectoAInHoldLoop = true;

            const frames = this.PROYECTO_A_FRAMES[this.proyectoAChargeDirection];
            const attackAnim = `attack-${this.proyectoAChargeDirection}`;

            // Start oscillating hold loop
            this.animator.playSubsetLoop(
                attackAnim,
                frames.holdStart,
                frames.holdEnd,
                12 // Slow oscillation for "power ready" effect
            );

            console.log(`[PROYECTO-A] Charge 100% - hold loop (frames ${frames.holdStart}-${frames.holdEnd})`);
        }

        // While in hold loop, allow direction changes
        if (this.proyectoAInHoldLoop && newDirection !== this.proyectoAChargeDirection) {
            this.proyectoAChargeDirection = newDirection;

            // Update facing
            if (newDirection === 'right') {
                this.facingRight = true;
            } else if (newDirection === 'left') {
                this.facingRight = false;
            }

            // Switch to new direction's hold loop
            const frames = this.PROYECTO_A_FRAMES[newDirection];
            const attackAnim = `attack-${newDirection}`;

            this.animator.playSubsetLoop(
                attackAnim,
                frames.holdStart,
                frames.holdEnd,
                12
            );

            console.log(`[PROYECTO-A] Hold direction changed to: ${newDirection}`);
        }
    }

    /**
     * Release Proyecto-A charge (called on mouse up)
     * Plays the release animation (impact + recovery) and triggers damage
     * @returns Object with direction and impact timing for engine to process
     */
    public releaseProyectoACharge(targetPosition: THREE.Vector3): {
        direction: 'down' | 'left' | 'right';
        impactDelay: number;
        chargeLevel: number;
    } | null {
        if (!this.proyectoACharging || this.characterId !== 'proyecto-a') return null;

        const finalChargeLevel = this.proyectoAChargeLevel;

        // Use the current charge direction (where the character is already facing)
        // NOT a new calculation - this ensures attack goes where player is visually aiming
        const direction = this.proyectoAChargeDirection;
        const frames = this.PROYECTO_A_FRAMES[direction];

        // Stop charging state
        this.proyectoACharging = false;
        this.proyectoAChargeLevel = 0;
        this.proyectoAInHoldLoop = false;
        this.animator.stopSubsetLoop();

        // Facing is already set from the charge update - no need to change

        // Set attacking state
        this.isMeleeAttacking = true;

        // Play release animation (from releaseStart to end)
        const attackAnim = `attack-${direction}`;

        // Calculate timing: frames from releaseStart to impactFrame
        const framesUntilImpact = frames.impactFrame - frames.holdEnd;
        const totalReleaseFrames = 30 - frames.releaseStart;

        // Play at 30fps for impactful feel
        const releaseFps = 30;
        const impactDelay = (framesUntilImpact / releaseFps) * 1000; // ms until impact

        // Play from release start frame
        this.animator.playSubsetLoop(attackAnim, frames.releaseStart, 29, releaseFps);

        // Stop the "loop" after one play (it's not really looping, just playing once)
        const totalDuration = (totalReleaseFrames / releaseFps) * 1000;
        setTimeout(() => {
            this.animator.stopSubsetLoop();
            this.isMeleeAttacking = false;
        }, totalDuration);

        console.log(`[PROYECTO-A] Released! Direction: ${direction}, Charge: ${(finalChargeLevel * 100).toFixed(0)}%, Impact in ${impactDelay.toFixed(0)}ms`);

        return {
            direction,
            impactDelay,
            chargeLevel: finalChargeLevel
        };
    }

    /**
     * Cancel Proyecto-A charge without attacking
     */
    public cancelProyectoACharge(): void {
        if (!this.proyectoACharging) return;

        this.proyectoACharging = false;
        this.proyectoAChargeLevel = 0;
        this.proyectoAInHoldLoop = false;
        this.animator.stopSubsetLoop();

        // Return to idle
        this.animator.play('idle', true, 30);

        console.log('[PROYECTO-A] Charge cancelled');
    }

    /**
     * Check if Proyecto-A is currently charging
     */
    public isProyectoACharging(): boolean {
        return this.proyectoACharging;
    }

    /**
     * Get Proyecto-A charge level (0-1)
     */
    public getProyectoAChargeLevel(): number {
        return this.proyectoAChargeLevel;
    }

    /**
     * Check if Proyecto-A charge is at 100% (in hold loop)
     */
    public isProyectoAFullyCharged(): boolean {
        return this.proyectoAInHoldLoop;
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
