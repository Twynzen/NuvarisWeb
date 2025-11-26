import * as THREE from 'three';
import { SpriteAnimator } from '../engine/sprite-animator';
import { ProjectileThree } from './projectile.three';

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

    private characterId: string;

    // Debug mode - set to true to see flip/animation logs
    private DEBUG_FLIP = true;

    constructor(scene: THREE.Scene, characterId: string = 'arcadio') {
        this.characterId = characterId;
        this.mesh = new THREE.Group();

        // Configure Stats
        switch (characterId) {
            case 'arcadio':
                this.speed = 8; // Slow
                break;
            case 'lars':
                this.speed = 12; // Medium
                break;
            case 'yurany':
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
        if (this.characterId === 'yurany') {
            folder = 'proyecto-y';
            prefix = 'y-';
        }

        // Idle
        let idlePrefix = `${prefix}idle-`;
        if (this.characterId === 'yurany') {
            idlePrefix = 'y-idle-one-';
        } else if (this.characterId === 'lars') {
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
            name: 'run',
            texturePath: `assets/${folder}/right`,
            prefix: `${prefix}walk-right-`,
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

        // Apply flip via negative scale.x
        const scaleX = Math.abs(this.sprite.scale.x);
        const newScaleX = this.facingRight ? scaleX : -scaleX;
        this.sprite.scale.x = newScaleX;

        // Debug log when facing direction changes
        if (this.DEBUG_FLIP && prevFacingRight !== this.facingRight) {
            console.log(`[FLIP] Direction changed: facingRight=${this.facingRight}, scale.x=${newScaleX}`);
        }

        // Animation State Machine
        // Priority: Shooting > Horizontal Movement > Vertical Movement > Idle
        let animationPlayed = '';

        if (this.isShooting) {
            // Shooting animation is handled in shoot()
            animationPlayed = 'shooting';
        } else if (this.isMoving) {
            // FIXED: Prioritize horizontal movement for run animation
            // This ensures LEFT movement uses flipped 'run' animation
            if (moveX !== 0) {
                // Horizontal movement (including diagonals) - use run animation
                this.animator.play('run', true, 30);
                animationPlayed = 'run';
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
            console.log(`[ANIM] moveX=${moveX}, moveZ=${moveZ}, anim=${animationPlayed}, facingRight=${this.facingRight}, scale.x=${this.sprite.scale.x.toFixed(2)}`);
        }

        this.animator.update(delta);
    }

    shoot(scene: THREE.Scene): ProjectileThree | null {
        if (this.isShooting) return null;

        this.isShooting = true;

        // Determine shoot direction and animation
        let shootAnim = 'shoot-right';
        let direction = new THREE.Vector3(1, 0, 0);

        if (this.lastMoveDir.z < -0.5) {
            shootAnim = 'shoot-up';
            direction.set(0, 0, -1);
        } else if (this.lastMoveDir.z > 0.5) {
            shootAnim = 'shoot-down';
            direction.set(0, 0, 1);
        } else {
            shootAnim = 'shoot-right';
            direction.set(this.facingRight ? 1 : -1, 0, 0);
        }

        this.animator.play(shootAnim, false, 30);

        // Reset shooting state after animation (approx)
        setTimeout(() => {
            this.isShooting = false;
        }, 200);

        // Create Projectile
        return new ProjectileThree(scene, this.mesh.position.x, this.mesh.position.z, direction, this.characterId);
    }
}
