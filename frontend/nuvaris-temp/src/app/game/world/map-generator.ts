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
        this.createLabWalls();

        const biomeKeys = Object.keys(BIOMES);
        const numZones = 8;

        for (let i = 0; i < numZones; i++) {
            const angle = (i / numZones) * Math.PI * 2;
            const distance = 30 + Math.random() * 40;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const biomeKey = biomeKeys[Math.floor(Math.random() * biomeKeys.length)];

            this.createBiomeZone(x, z, biomeKey);
        }

        // Random obstacles
        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * this.mapSize * 0.8;
            const z = (Math.random() - 0.5) * this.mapSize * 0.8;

            if (Math.sqrt(x * x + z * z) > 10) {
                this.createEnvironmentObject(x, z);
            }
        }
    }

    private createBiomeZone(x: number, z: number, biomeType: string) {
        const biome = BIOMES[biomeType];
        const radius = 15 + Math.random() * 10;

        const zoneGeo = new THREE.CircleGeometry(radius, 32);
        const zoneMat = new THREE.MeshStandardMaterial({
            color: biome.color,
            roughness: 0.8,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const zone = new THREE.Mesh(zoneGeo, zoneMat);
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(x, 0.02, z);
        this.scene.add(zone);

        if (biome.accent) {
            const numAccents = 5 + Math.floor(Math.random() * 5);
            for (let i = 0; i < numAccents; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * radius * 0.8;
                const ax = x + Math.cos(angle) * dist;
                const az = z + Math.sin(angle) * dist;
                this.createBiomeAccent(ax, az, biome.accent, biomeType);
            }
        }
    }

    private createBiomeAccent(x: number, z: number, color: number, biomeType: string) {
        let geometry: THREE.BufferGeometry;
        let height: number;

        switch (biomeType) {
            case 'CRYSTAL':
                geometry = new THREE.ConeGeometry(0.5, 3 + Math.random() * 2, 6);
                height = 1.5;
                break;
            case 'INFERNO':
                geometry = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 8, 8);
                height = 0.5;
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1 + Math.random() * 2, 1);
                height = 1;
        }

        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, height, z);
        mesh.castShadow = true;
        this.scene.add(mesh);
    }

    private createEnvironmentObject(x: number, z: number) {
        const height = 2 + Math.random() * 4;
        const geometry = new THREE.CylinderGeometry(0.5, 0.7, height, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            roughness: 0.7
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, height / 2, z);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        mesh.castShadow = true;
        this.scene.add(mesh);
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

        // Internal Pillars
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * size * 0.8;
            const z = (Math.random() - 0.5) * size * 0.8;

            const geo = new THREE.BoxGeometry(4, wallHeight, 4);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(x, wallHeight / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        }
    }
}
