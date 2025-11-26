import * as THREE from 'three';
import { SpriteAnimator } from '../engine/sprite-animator';

export class ProjectileThree {
    public mesh: THREE.Group;
    private sprite: THREE.Sprite;
    private animator: SpriteAnimator;
    private speed = 20;
    private direction: THREE.Vector3;
    public damage = 10;
    public isDead = false;
    private lifeTime = 2; // seconds

    constructor(scene: THREE.Scene, x: number, z: number, direction: THREE.Vector3, characterId: string) {
        this.direction = direction.normalize();
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 1, z); // Slightly higher

        // Sprite & Material
        const material = new THREE.SpriteMaterial({
            transparent: true,
            color: 0xffffff
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.center.set(0.5, 0.5);
        this.sprite.scale.set(2, 2, 1);
        this.mesh.add(this.sprite);

        scene.add(this.mesh);

        // Animator
        this.animator = new SpriteAnimator(material);
        this.loadAnimation(characterId);
        this.animator.play('shoot', true, 30);
    }

    private loadAnimation(characterId: string) {
        let folder = characterId;
        let prefix = `${characterId}-shoot-`;

        if (characterId === 'yurany') {
            folder = 'proyecto-y';
            prefix = 'y-shoot-';
        }

        // The user mentioned "shoot/shoot" folder.
        // Based on list_dir, arcadio has 'arcadio-shoot-001.png' in 'arcadio/shoot/shoot'
        // Yurany has 'y-shoot-001.png' in 'proyecto-y/shoot/shoot'

        this.animator.loadAnimation({
            name: 'shoot',
            texturePath: `assets/${folder}/shoot/shoot`,
            prefix: prefix,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });
    }

    update(delta: number) {
        this.lifeTime -= delta;
        if (this.lifeTime <= 0) {
            this.isDead = true;
            this.mesh.visible = false;
            return;
        }

        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * delta));

        // Rotate sprite to face direction (simple flip for now, or rotation if needed)
        // For sprites, we might want to rotate the sprite object itself if it's directional
        // But these seem to be "ball" type projectiles or effects.
        // If they are directional beams, we might need rotation.
        // Assuming they are effects that play in place while moving.

        this.animator.update(delta);
    }
}
