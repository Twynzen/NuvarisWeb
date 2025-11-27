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
    private originalColor = 0xffaaaa;

    constructor(scene: THREE.Scene, x: number, z: number) {
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);

        // Material
        const material = new THREE.SpriteMaterial({
            transparent: true,
            color: 0xffaaaa
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

    update(delta: number, player: PlayerThree, mapBounds: number = 98, currentTime: number = 0) {
        if (this.isDead) return;

        const distToPlayer = this.mesh.position.distanceTo(player.mesh.position);
        const direction = new THREE.Vector3()
            .subVectors(player.mesh.position, this.mesh.position)
            .normalize();

        // Check if should attack
        if (distToPlayer < this.attackRange && (currentTime - this.lastAttackTime) > this.attackCooldown) {
            this.startAttack(currentTime);
        }

        // Update attack visual
        if (this.isAttacking) {
            const attackElapsed = currentTime - this.attackStartTime;
            if (attackElapsed > this.attackDuration) {
                this.isAttacking = false;
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

        // Visual feedback: Flash rojo intenso
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xff0000);

        return true;
    }

    /**
     * Retorna true si el enemigo está atacando en este momento
     */
    public isCurrentlyAttacking(): boolean {
        return this.isAttacking;
    }

    /**
     * Retorna el daño del ataque
     */
    public getAttackDamage(): number {
        return this.attackDamage;
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
