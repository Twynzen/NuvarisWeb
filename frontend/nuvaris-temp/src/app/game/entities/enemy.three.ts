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

    update(delta: number, player: PlayerThree, mapBounds: number = 98) {
        if (this.isDead) return;

        const direction = new THREE.Vector3()
            .subVectors(player.mesh.position, this.mesh.position)
            .normalize();

        this.mesh.position.add(direction.multiplyScalar(this.speed * delta));

        // Clamp position to map bounds (wall collision)
        this.mesh.position.x = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-mapBounds, Math.min(mapBounds, this.mesh.position.z));

        this.animator.update(delta);
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
