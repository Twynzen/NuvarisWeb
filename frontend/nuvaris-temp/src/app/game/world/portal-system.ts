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

    private rotationSpeed = 2.0;
    private pulsePhase = 0;
    private floatPhase = 0;
    private floatAmount = 1.0;

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
        // Spider Portal: Vórtex energético 3D con anillos rotatorios
        const color = 0xff4444; // Red

        // Anillo exterior rotativo
        const torusGeom1 = new THREE.TorusGeometry(5, 0.6, 16, 100);
        const torusMat1 = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8
        });
        const torus1 = new THREE.Mesh(torusGeom1, torusMat1);
        torus1.rotation.x = Math.PI / 3;
        this.mesh.add(torus1);

        // Anillo intermedio
        const torusGeom2 = new THREE.TorusGeometry(4, 0.5, 16, 100);
        const torusMat2 = new THREE.MeshBasicMaterial({
            color: 0xff8888,
            transparent: true,
            opacity: 0.6
        });
        const torus2 = new THREE.Mesh(torusGeom2, torusMat2);
        torus2.rotation.x = -Math.PI / 4;
        this.mesh.add(torus2);

        // Anillo interior
        const torusGeom3 = new THREE.TorusGeometry(3, 0.4, 16, 100);
        const torusMat3 = new THREE.MeshBasicMaterial({
            color: 0xffaaaa,
            transparent: true,
            opacity: 0.7
        });
        const torus3 = new THREE.Mesh(torusGeom3, torusMat3);
        torus3.rotation.x = Math.PI / 5;
        this.mesh.add(torus3);

        // Esfera central brillante
        const sphereGeom = new THREE.SphereGeometry(1.2, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xffff99,
            transparent: true,
            opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        this.mesh.add(sphere);

        // Pirámides puntiagudas alrededor (10 puntos)
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const coneGeom = new THREE.ConeGeometry(0.4, 1.5, 8);
            const coneMat = new THREE.MeshBasicMaterial({
                color: 0xff6666,
                transparent: true,
                opacity: 0.7
            });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.x = Math.cos(angle) * 6;
            cone.position.z = Math.sin(angle) * 6;
            cone.lookAt(this.mesh.position);
            this.mesh.add(cone);
        }
    }

    private createWormPortal() {
        // Worm Portal: Agujero/túnel terroso con efecto de vórtice
        const color = 0x8B6914; // Dark brown

        // Cilindro exterior (borde terroso)
        const cylGeom1 = new THREE.CylinderGeometry(4.5, 4.5, 2, 16);
        const cylMat1 = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8
        });
        const cyl1 = new THREE.Mesh(cylGeom1, cylMat1);
        this.mesh.add(cyl1);

        // Cilindro interior (túnel oscuro)
        const cylGeom2 = new THREE.CylinderGeometry(3, 3, 2.5, 16);
        const cylMat2 = new THREE.MeshBasicMaterial({
            color: 0x5a4a0a,
            transparent: true,
            opacity: 0.7
        });
        const cyl2 = new THREE.Mesh(cylGeom2, cylMat2);
        cyl2.position.y = 0.1;
        this.mesh.add(cyl2);

        // Espiral de tierra girando (para efecto dinámico)
        const spiralGeom = new THREE.TorusGeometry(3.5, 0.6, 12, 50);
        const spiralMat = new THREE.MeshBasicMaterial({
            color: 0xaa7744,
            transparent: true,
            opacity: 0.6
        });
        const spiral = new THREE.Mesh(spiralGeom, spiralMat);
        this.mesh.add(spiral);

        // Rocas/Partículas estáticas alrededor
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const rockGeom = new THREE.TetrahedronGeometry(0.5);
            const rockMat = new THREE.MeshBasicMaterial({
                color: 0x6b5d3f,
                transparent: true,
                opacity: 0.8
            });
            const rock = new THREE.Mesh(rockGeom, rockMat);
            rock.position.x = Math.cos(angle) * 5.5;
            rock.position.z = Math.sin(angle) * 5.5;
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.mesh.add(rock);
        }
    }

    public update(delta: number) {
        // Rotación
        this.mesh.rotation.y += this.rotationSpeed * delta;

        // Pulsación
        this.pulsePhase += delta * 3;
        const pulse = Math.sin(this.pulsePhase) * 0.15 + 1.0;
        this.mesh.scale.set(pulse, 1, pulse);

        // Flotación (movimiento vertical suave)
        this.floatPhase += delta * 1.5;
        const floatOffset = Math.sin(this.floatPhase) * this.floatAmount;
        this.mesh.position.y = floatOffset;
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
