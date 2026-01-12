import * as THREE from 'three';

export interface Biome {
    color: number;
    name: string;
    enemyMod: number;
    accent?: number;
}

export const BIOMES: { [key: string]: Biome } = {
    VOID: { color: 0x0a0a1a, name: 'Vacío Eterno', enemyMod: 1 },
    CRYSTAL: { color: 0x1a0a2e, name: 'Cavernas Cristal', enemyMod: 1.2, accent: 0x00f5ff },
    INFERNO: { color: 0x2a0a0a, name: 'Tierras Ígneas', enemyMod: 1.5, accent: 0xff4400 },
    TOXIC: { color: 0x0a2a0a, name: 'Pantano Tóxico', enemyMod: 1.3, accent: 0x00ff44 },
    STORM: { color: 0x0a1a2a, name: 'Zona Tormentosa', enemyMod: 1.4, accent: 0x4488ff }
};

export class MapGenerator {
    private scene: THREE.Scene;
    private mapSize = 200;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    generate() {
        // Only create boundary walls - clean minimal environment
        this.createLabWalls();
    }


    private createLabWalls() {
        const textureLoader = new THREE.TextureLoader();
        const wallTexture = textureLoader.load('assets/environment/wall_1.png');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(2, 1);

        const wallMat = new THREE.MeshStandardMaterial({
            map: wallTexture,
            roughness: 0.5,
            metalness: 0.3
        });

        const wallHeight = 8;
        const thickness = 2;
        const size = this.mapSize;

        // Boundary Walls
        const walls = [
            { pos: [0, size / 2], dim: [size, thickness], rot: 0 },
            { pos: [0, -size / 2], dim: [size, thickness], rot: 0 },
            { pos: [size / 2, 0], dim: [thickness, size], rot: 0 },
            { pos: [-size / 2, 0], dim: [thickness, size], rot: 0 }
        ];

        walls.forEach(w => {
            const geo = new THREE.BoxGeometry(w.dim[0], wallHeight, w.dim[1]);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(w.pos[0], wallHeight / 2, w.pos[1]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        });
    }
}
