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
    public static readonly COLLISION_RADIUS = 1.5;
    public static readonly SPRITE_WIDTH = 2;
    public static readonly SPRITE_HEIGHT = 2;

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
                texturePath: 'assets/Enemys/worm/walk',
                prefix: 'worm-walk-',
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

    update(delta: number, player: PlayerThree, mapBounds: number = 98, currentTime: number = 0) {
        if (this.isDead) return;

        const distToPlayer = this.mesh.position.distanceTo(player.mesh.position);
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
        if (this.health <= 0) {
            this.isDead = true;
            this.mesh.visible = false;
            return new XPOrb(scene, this.mesh.position.x, this.mesh.position.z, 20);
        } else {
            // Flash effect
            this.sprite.material.color.setHex(0xff0000);
            setTimeout(() => {
                if (!this.isDead) this.sprite.material.color.setHex(0xffaaaa);
            }, 100);
            return null;
        }
    }
}
