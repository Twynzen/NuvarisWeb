import * as THREE from 'three';
import { PlayerThree } from './player.three';

export class XPOrb {
    public mesh: THREE.Mesh;
    public value = 10;
    public isCollected = false;
    private speed = 15;
    private magnetRadius = 5;

    constructor(scene: THREE.Scene, x: number, z: number, value: number = 10) {
        this.value = value;

        const geometry = new THREE.SphereGeometry(0.3, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 0.5, z);

        scene.add(this.mesh);
    }

    update(delta: number, player: PlayerThree) {
        if (this.isCollected) return;

        const dist = this.mesh.position.distanceTo(player.mesh.position);

        if (dist < 1) {
            this.isCollected = true;
            this.mesh.visible = false;
            return true; // Collected
        }

        if (dist < this.magnetRadius) {
            const direction = new THREE.Vector3()
                .subVectors(player.mesh.position, this.mesh.position)
                .normalize();

            this.mesh.position.add(direction.multiplyScalar(this.speed * delta));
        }

        return false;
    }
}
