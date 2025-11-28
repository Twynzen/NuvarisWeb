import * as THREE from 'three';

export interface PortalConfig {
    position: THREE.Vector3;
    type: 'spider' | 'worm';
    homeRange: number;
    detectionRange: number;
    returnThreshold: number;
    maxEnemies: number;
}

export class Portal {
    public mesh: THREE.Group;
    public position: THREE.Vector3;
    public type: 'spider' | 'worm';
    public homeRange: number;
    public detectionRange: number;
    public returnThreshold: number;
    public maxEnemies: number;
    public currentEnemyCount = 0;

    private rotationSpeed = 0.3; // Very slow rotation
    private pulsePhase = 0;
    private pulseSpeed = 1.0; // Subtle pulsing
    private floatPhase = 0;
    private floatAmount = 0.3; // Very subtle floating

    constructor(scene: THREE.Scene, config: PortalConfig) {
        this.position = config.position;
        this.type = config.type;
        this.homeRange = config.homeRange;
        this.detectionRange = config.detectionRange;
        this.returnThreshold = config.returnThreshold;
        this.maxEnemies = config.maxEnemies;

        this.mesh = new THREE.Group();
        this.mesh.position.copy(config.position);

        if (config.type === 'spider') {
            this.createSpiderPortal();
        } else {
            this.createWormPortal();
        }

        scene.add(this.mesh);
    }

    private createSpiderPortal() {
        // Spider Portal: Madriguera de araña con telaraña - BLANCO
        const spiderColor = 0xdddddd; // White/light gray spider
        const webColor = 0xeeeeee;   // Very light gray for web
        const centerColor = 0xffffff; // White center

        // Base: Estructura de telaraña (anillo central) - MÁS PEQUEÑO
        const baseGeom = new THREE.TorusGeometry(2.2, 0.15, 16, 64);
        const baseMat = new THREE.MeshStandardMaterial({
            color: webColor,
            roughness: 0.8,
            metalness: 0.0,
            transparent: true,
            opacity: 0.6
        });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.rotation.x = Math.PI / 2;
        this.mesh.add(base);

        // Telaraña radiante (líneas del portal)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const lineGeom = new THREE.BufferGeometry();
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(Math.cos(angle) * 2.5, 0, Math.sin(angle) * 2.5)
            ];
            lineGeom.setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({
                color: webColor,
                linewidth: 2,
                transparent: true,
                opacity: 0.5
            });
            const line = new THREE.Line(lineGeom, lineMat);
            this.mesh.add(line);
        }

        // Centro de la madriguera (oscuro, como un agujero)
        const holeGeom = new THREE.CircleGeometry(0.75, 32);
        const holeMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            transparent: true,
            opacity: 0.7
        });
        const hole = new THREE.Mesh(holeGeom, holeMat);
        hole.position.z = 0.01;
        this.mesh.add(hole);

        // Pequeños puntos de araña alrededor (estaticos)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const spiderDotGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const spiderDotMat = new THREE.MeshStandardMaterial({
                color: spiderColor,
                roughness: 0.6
            });
            const dot = new THREE.Mesh(spiderDotGeom, spiderDotMat);
            dot.position.x = Math.cos(angle) * 2.2;
            dot.position.z = Math.sin(angle) * 2.2;
            dot.position.y = 0.15;
            this.mesh.add(dot);
        }
    }

    private createWormPortal() {
        // Worm Portal: Agujero en la tierra - CAFÉ (BROWN)
        const burrColor = 0xA0754A; // Medium brown
        const dirtColor = 0x6B5240;  // Darker brown
        const edgeColor = 0x8B6F47;  // Warm brown

        // Borde elevado del agujero (tierra elevada) - MÁS PEQUEÑO
        const rimGeom = new THREE.TorusGeometry(2.5, 0.4, 16, 64);
        const rimMat = new THREE.MeshStandardMaterial({
            color: edgeColor,
            roughness: 0.9,
            metalness: 0.0
        });
        const rim = new THREE.Mesh(rimGeom, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.1;
        this.mesh.add(rim);

        // Agujero principal (oscuro, profundo)
        const holeGeom = new THREE.CircleGeometry(1.9, 32);
        const holeMat = new THREE.MeshStandardMaterial({
            color: 0x2a1810,
            roughness: 0.95,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
        });
        const hole = new THREE.Mesh(holeGeom, holeMat);
        hole.rotation.x = -Math.PI / 2;
        hole.position.y = -0.05;
        this.mesh.add(hole);

        // Paredes interiores del túnel (cilindro oscuro)
        const tunnelGeom = new THREE.CylinderGeometry(1.9, 1.9, 1.5, 32);
        const tunnelMat = new THREE.MeshStandardMaterial({
            color: dirtColor,
            roughness: 0.95,
            metalness: 0.0
        });
        const tunnel = new THREE.Mesh(tunnelGeom, tunnelMat);
        tunnel.position.y = -0.75;
        tunnel.castShadow = true;
        tunnel.receiveShadow = true;
        this.mesh.add(tunnel);

        // Rocas/tierra saliente alrededor del borde (estaticas)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const rockGeom = new THREE.TetrahedronGeometry(0.2);
            const rockMat = new THREE.MeshStandardMaterial({
                color: edgeColor,
                roughness: 0.8
            });
            const rock = new THREE.Mesh(rockGeom, rockMat);
            rock.position.x = Math.cos(angle) * 2.6;
            rock.position.z = Math.sin(angle) * 2.6;
            rock.position.y = 0.1;
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.mesh.add(rock);
        }
    }

    public update(delta: number) {
        // Muy poca rotación (casi inmóvil)
        this.mesh.rotation.y += this.rotationSpeed * delta;

        // Pulsación muy sutil (apenas perceptible)
        this.pulsePhase += delta * this.pulseSpeed;
        const pulse = Math.sin(this.pulsePhase) * 0.05 + 1.0; // Only 5% scale variation
        this.mesh.scale.set(pulse, 1, pulse);

        // Sin flotación - se quedan estaticos en Y
        // Solo aparecen a parpadear sutilmente
    }
}

export class PortalSystem {
    private scene: THREE.Scene;
    private portals: Portal[] = [];
    private spawningEnabled = true;

    // Portal distribution: 2 spider, 2 worm
    private spiderPortals: Portal[] = [];
    private wormPortals: Portal[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public initialize() {
        // Spider Portal 1
        const spiderPortal1 = new Portal(this.scene, {
            position: new THREE.Vector3(-40, 0, -40),
            type: 'spider',
            homeRange: 20,
            detectionRange: 30,
            returnThreshold: 40,
            maxEnemies: 10
        });
        this.spiderPortals.push(spiderPortal1);
        this.portals.push(spiderPortal1);

        // Spider Portal 2
        const spiderPortal2 = new Portal(this.scene, {
            position: new THREE.Vector3(40, 0, 40),
            type: 'spider',
            homeRange: 20,
            detectionRange: 30,
            returnThreshold: 40,
            maxEnemies: 10
        });
        this.spiderPortals.push(spiderPortal2);
        this.portals.push(spiderPortal2);

        // Worm Portal 1
        const wormPortal1 = new Portal(this.scene, {
            position: new THREE.Vector3(-40, 0, 40),
            type: 'worm',
            homeRange: 15,
            detectionRange: 25,
            returnThreshold: 35,
            maxEnemies: 10
        });
        this.wormPortals.push(wormPortal1);
        this.portals.push(wormPortal1);

        // Worm Portal 2
        const wormPortal2 = new Portal(this.scene, {
            position: new THREE.Vector3(40, 0, -40),
            type: 'worm',
            homeRange: 15,
            detectionRange: 25,
            returnThreshold: 35,
            maxEnemies: 10
        });
        this.wormPortals.push(wormPortal2);
        this.portals.push(wormPortal2);
    }

    public getSpawnPoint(type: 'spider' | 'worm'): THREE.Vector3 {
        const portalList = type === 'spider' ? this.spiderPortals : this.wormPortals;
        if (portalList.length === 0) return new THREE.Vector3(0, 0, 0);

        // Seleccionar portal aleatorio
        const portal = portalList[Math.floor(Math.random() * portalList.length)];

        // Spawn en radio aleatorio alrededor del portal
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 8; // 3-11 units desde portal
        const pos = portal.position.clone();
        pos.x += Math.cos(angle) * distance;
        pos.z += Math.sin(angle) * distance;
        return pos;
    }

    public getPortal(type: 'spider' | 'worm'): Portal | undefined {
        const portalList = type === 'spider' ? this.spiderPortals : this.wormPortals;
        if (portalList.length === 0) return undefined;
        // Retornar portal aleatorio para balancear carga
        return portalList[Math.floor(Math.random() * portalList.length)];
    }

    public toggleSpawning(enabled: boolean) {
        this.spawningEnabled = enabled;
    }

    public isSpawningEnabled(): boolean {
        return this.spawningEnabled;
    }

    public update(delta: number) {
        this.portals.forEach(portal => portal.update(delta));
    }

    public getPortals(): Portal[] {
        return this.portals;
    }
}
