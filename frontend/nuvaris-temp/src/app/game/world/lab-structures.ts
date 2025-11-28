import * as THREE from 'three';

/**
 * NUVARIS Laboratory Complex - Narrative-Driven Environment
 *
 * This system generates a cohesive underground laboratory with three distinct wings,
 * each tied to character lore and spawn narratives. The environment tells a story
 * through architecture, color, degradation, and detail placement.
 *
 * Architecture Blueprint: See LABORATORY_ARCHITECTURE.md for precise coordinates
 */

export interface CollisionMesh {
    id: string;
    position: THREE.Vector3;
    size: THREE.Vector3 | number; // Vector3 for boxes, number for cylinder radius
    type: 'box' | 'cylinder';
    active: boolean;
}

export interface RoomConfig {
    name: string;
    position: THREE.Vector3;
    size: { width: number; depth: number; height: number };
    wing: 'northeast' | 'northwest' | 'south' | 'corridor' | 'central';
    spawnPoint?: THREE.Vector3;
    enemyTypes?: string[];
    narrative?: string;
}

export class LabStructures {
    private scene: THREE.Scene;
    private structures: THREE.Group[] = [];
    private collisionMeshes: CollisionMesh[] = [];
    private spawnPoints: Map<string, THREE.Vector3> = new Map();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Generate the complete laboratory structure
     * Three wings + corridors + central hub
     */
    public generateProcedural() {
        console.log('[LAB] Generating laboratory complex...');

        // Create the three major wings
        this.createNorthEastWing();  // LARS - Laboratory
        this.createNorthWestWing(); // ARCADIO - Prisons
        this.createSouthWing();     // YURANY - Medical/Psychiatric

        // Create connector system
        this.createCorridorSystem();

        // Central hub already exists (portals are there)
        this.createCentralHub();

        console.log(`[LAB] Laboratory generated with ${this.structures.length} major structures`);
        console.log(`[LAB] Collision meshes: ${this.collisionMeshes.length}`);
        console.log(`[LAB] Spawn points: ${this.spawnPoints.size}`);
    }

    /**
     * ALA NORTE-ESTE (LARS - LABORATORY)
     * Position: (-45, 0, -45) | Size: 25x25
     *
     * Narrative: Laboratory where specimen experiments occurred.
     * Tanks are broken, creatures escaped. Lars must close the portals.
     */
    private createNorthEastWing() {
        const wingGroup = new THREE.Group();
        const wingPos = new THREE.Vector3(-45, 0, -45);
        wingGroup.position.copy(wingPos);

        const wallThickness = 0.5;
        const wallHeight = 6;
        const wingWidth = 25;
        const wingDepth = 25;

        // ===== OUTER WALLS =====
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.6,
            metalness: 0.7
        });

        // Front wall (with broken entrance section)
        const frontWallGeo = new THREE.BoxGeometry(wingWidth, wallHeight, wallThickness);
        const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
        frontWall.position.z = wingDepth / 2;
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        wingGroup.add(frontWall);
        this.addCollisionMesh('ne_front_wall', frontWall.position, new THREE.Vector3(wingWidth, wallHeight, wallThickness), 'box');

        // Back wall
        const backWall = frontWall.clone();
        backWall.position.z = -wingDepth / 2;
        wingGroup.add(backWall);
        this.addCollisionMesh('ne_back_wall', backWall.position, new THREE.Vector3(wingWidth, wallHeight, wallThickness), 'box');

        // Left wall
        const leftWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, wingDepth);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.position.x = -wingWidth / 2;
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        wingGroup.add(leftWall);
        this.addCollisionMesh('ne_left_wall', leftWall.position, new THREE.Vector3(wallThickness, wallHeight, wingDepth), 'box');

        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.x = wingWidth / 2;
        wingGroup.add(rightWall);
        this.addCollisionMesh('ne_right_wall', rightWall.position, new THREE.Vector3(wallThickness, wallHeight, wingDepth), 'box');

        // ===== SPECIMEN TANKS (8 total) =====
        const tankMat = new THREE.MeshStandardMaterial({
            color: 0x1a3a4a,
            emissive: 0x00ffff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8,
            metalness: 0.3
        });

        const tankRadius = 1.5;
        const tankHeight = 4;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 6;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;

            const tankGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 16);
            const tank = new THREE.Mesh(tankGeo, tankMat);
            tank.position.set(x, tankHeight / 2, z);
            tank.castShadow = true;
            tank.receiveShadow = true;
            wingGroup.add(tank);

            // Collision for tanks
            this.addCollisionMesh(`ne_tank_${i}`, tank.position, tankRadius, 'cylinder');

            // Some tanks are broken (visual indicator)
            if (i % 3 === 0) {
                // Add broken effect - darker, no glow
                tank.material = new THREE.MeshStandardMaterial({
                    color: 0x0a1a1a,
                    roughness: 0.8,
                    metalness: 0.2
                });
            }
        }

        // ===== CONTROL CONSOLE =====
        const consoleMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            emissive: 0x00ff00,
            emissiveIntensity: 0.2
        });

        const consoleGeo = new THREE.BoxGeometry(4, 1, 2);
        const console = new THREE.Mesh(consoleGeo, consoleMat);
        console.position.set(0, 0.5, 0);
        console.castShadow = true;
        wingGroup.add(console);
        this.addCollisionMesh('ne_console', console.position, new THREE.Vector3(4, 1, 2), 'box');

        // ===== GENERATOR (Large cylindrical element) =====
        const generatorMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            emissive: 0xffaa00,
            emissiveIntensity: 0.15,
            roughness: 0.7,
            metalness: 0.6
        });

        const genRadius = 2;
        const genHeight = 6;
        const generatorGeo = new THREE.CylinderGeometry(genRadius, genRadius, genHeight, 16);
        const generator = new THREE.Mesh(generatorGeo, generatorMat);
        generator.position.set(-8, genHeight / 2, 8);
        generator.castShadow = true;
        generator.receiveShadow = true;
        wingGroup.add(generator);
        this.addCollisionMesh('ne_generator', generator.position, genRadius, 'cylinder');

        // ===== SPAWN POINT =====
        const larsSpawnPoint = new THREE.Vector3(-45, 0.5, -48);
        this.spawnPoints.set('lars', larsSpawnPoint);

        // ===== FLOOR =====
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0.2
        });
        const floorGeo = new THREE.PlaneGeometry(wingWidth - 1, wingDepth - 1);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        floor.receiveShadow = true;
        wingGroup.add(floor);

        this.scene.add(wingGroup);
        this.structures.push(wingGroup);
    }

    /**
     * ALA NORTE-OESTE (ARCADIO - PRISONS)
     * Position: (45, 0, -45) | Size: 30x30
     *
     * Narrative: Prison block where Arcadio just escaped.
     * Broken bars, guard corpse, cells. Portal chambers inside.
     */
    private createNorthWestWing() {
        const wingGroup = new THREE.Group();
        const wingPos = new THREE.Vector3(45, 0, -45);
        wingGroup.position.copy(wingPos);

        const wallThickness = 0.5;
        const wallHeight = 5;
        const wingWidth = 30;
        const wingDepth = 30;

        // ===== OUTER WALLS =====
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.6,
            metalness: 0.8
        });

        // Front wall (BROKEN SECTION - escape point)
        const frontWallGeo = new THREE.BoxGeometry(wingWidth, wallHeight, wallThickness);
        const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
        frontWall.position.z = wingDepth / 2;
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        wingGroup.add(frontWall);

        // Broken section doesn't collide (escaped through here)
        this.addCollisionMesh('nw_front_left', new THREE.Vector3(frontWall.position.x - 10, frontWall.position.y, frontWall.position.z),
                             new THREE.Vector3(10, wallHeight, wallThickness), 'box');
        this.addCollisionMesh('nw_front_right', new THREE.Vector3(frontWall.position.x + 10, frontWall.position.y, frontWall.position.z),
                             new THREE.Vector3(10, wallHeight, wallThickness), 'box');

        // Back wall
        const backWall = frontWall.clone();
        backWall.position.z = -wingDepth / 2;
        wingGroup.add(backWall);
        this.addCollisionMesh('nw_back_wall', backWall.position, new THREE.Vector3(wingWidth, wallHeight, wallThickness), 'box');

        // Left wall
        const leftWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, wingDepth);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.position.x = -wingWidth / 2;
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        wingGroup.add(leftWall);
        this.addCollisionMesh('nw_left_wall', leftWall.position, new THREE.Vector3(wallThickness, wallHeight, wingDepth), 'box');

        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.x = wingWidth / 2;
        wingGroup.add(rightWall);
        this.addCollisionMesh('nw_right_wall', rightWall.position, new THREE.Vector3(wallThickness, wallHeight, wingDepth), 'box');

        // ===== PRISON CELLS (6 cells in a row) =====
        const cellMat = new THREE.MeshStandardMaterial({
            color: 0x0f0f0f,
            roughness: 0.8,
            metalness: 0.3
        });

        const barMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.9
        });

        const cellWidth = 4;
        const cellDepth = 5;
        const cellStartX = -12;

        for (let i = 0; i < 6; i++) {
            const cellX = cellStartX + (i * cellWidth);
            const cellZ = -10;

            // Cell floor
            const cellFloorGeo = new THREE.BoxGeometry(cellWidth - 0.2, 0.3, cellDepth - 0.2);
            const cellFloor = new THREE.Mesh(cellFloorGeo, cellMat);
            cellFloor.position.set(cellX, 0.15, cellZ);
            cellFloor.receiveShadow = true;
            wingGroup.add(cellFloor);

            // Bars on front
            for (let b = 0; b < 5; b++) {
                const barGeo = new THREE.CylinderGeometry(0.08, 0.08, wallHeight, 8);
                const bar = new THREE.Mesh(barGeo, barMat);
                bar.position.set(cellX - cellWidth / 2 + (b * (cellWidth / 4)), wallHeight / 2, cellZ + cellDepth / 2);
                bar.castShadow = true;
                wingGroup.add(bar);
                this.addCollisionMesh(`nw_bar_${i}_${b}`, bar.position, 0.08, 'cylinder');
            }

            // Red alarm light in each cell
            const lightMat = new THREE.MeshStandardMaterial({
                color: 0xff3333,
                emissive: 0xff3333,
                emissiveIntensity: 0.6
            });
            const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(cellX, wallHeight - 0.5, cellZ);
            wingGroup.add(light);
        }

        // ===== PORTAL CHAMBERS (Now INSIDE the wing!) =====

        // Portal Chamber #1 (Spider) - Left side
        this.createPortalChamber(wingGroup, new THREE.Vector3(-12, 0, 8), 'spider', 'nw');

        // Portal Chamber #2 (Worm) - Right side
        this.createPortalChamber(wingGroup, new THREE.Vector3(12, 0, 8), 'worm', 'nw');

        // ===== GUARD STATION =====
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.6
        });

        const deskGeo = new THREE.BoxGeometry(4, 1, 2.5);
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 0.5, -20);
        desk.castShadow = true;
        wingGroup.add(desk);
        this.addCollisionMesh('nw_desk', desk.position, new THREE.Vector3(4, 1, 2.5), 'box');

        // ===== SPAWN POINT (Just outside broken entrance) =====
        const arcadioSpawnPoint = new THREE.Vector3(45, 0.5, -58.5);
        this.spawnPoints.set('arcadio', arcadioSpawnPoint);

        // ===== FLOOR =====
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0.2
        });
        const floorGeo = new THREE.PlaneGeometry(wingWidth - 1, wingDepth - 1);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        floor.receiveShadow = true;
        wingGroup.add(floor);

        this.scene.add(wingGroup);
        this.structures.push(wingGroup);
    }

    /**
     * ALA SUR (YURANY - MEDICAL/PSYCHIATRIC)
     * Position: (0, 0, 50) | Size: 25x25
     *
     * Narrative: Surgical/psychiatric research facility.
     * Operating table, medical equipment, robotic parts storage.
     * Dead doctor present. Yurany awakens on the operating table.
     */
    private createSouthWing() {
        const wingGroup = new THREE.Group();
        const wingPos = new THREE.Vector3(0, 0, 50);
        wingGroup.position.copy(wingPos);

        const wallThickness = 0.5;
        const wallHeight = 5;
        const wingWidth = 25;
        const wingDepth = 25;

        // ===== OUTER WALLS =====
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x3a2a3a,
            roughness: 0.7,
            metalness: 0.4
        });

        // Front wall (broken emergency doors)
        const frontWallGeo = new THREE.BoxGeometry(wingWidth, wallHeight, wallThickness);
        const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
        frontWall.position.z = wingDepth / 2;
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        wingGroup.add(frontWall);
        this.addCollisionMesh('s_front_wall', frontWall.position, new THREE.Vector3(wingWidth, wallHeight, wallThickness), 'box');

        // Back wall
        const backWall = frontWall.clone();
        backWall.position.z = -wingDepth / 2;
        wingGroup.add(backWall);
        this.addCollisionMesh('s_back_wall', backWall.position, new THREE.Vector3(wingWidth, wallHeight, wallThickness), 'box');

        // Left wall
        const leftWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, wingDepth);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.position.x = -wingWidth / 2;
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        wingGroup.add(leftWall);
        this.addCollisionMesh('s_left_wall', leftWall.position, new THREE.Vector3(wallThickness, wallHeight, wingDepth), 'box');

        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.x = wingWidth / 2;
        wingGroup.add(rightWall);
        this.addCollisionMesh('s_right_wall', rightWall.position, new THREE.Vector3(wallThickness, wallHeight, wingDepth), 'box');

        // ===== OPERATING TABLE (Central element) =====
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.7
        });

        const tableGeo = new THREE.BoxGeometry(3, 1, 1.5);
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.5, 0);
        table.castShadow = true;
        wingGroup.add(table);
        this.addCollisionMesh('s_operating_table', table.position, new THREE.Vector3(3, 1, 1.5), 'box');

        // Overhead surgical lights (aesthetic)
        const lightHeadMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.4
        });

        for (let i = 0; i < 3; i++) {
            const lightGeo = new THREE.SphereGeometry(0.4, 8, 8);
            const light = new THREE.Mesh(lightGeo, lightHeadMat);
            light.position.set(-1 + (i * 1), 4.5, 0);
            wingGroup.add(light);
        }

        // ===== SENSORY DEPRIVATION CAPSULE =====
        const capsuleMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            emissive: 0x4488ff,
            emissiveIntensity: 0.2,
            metalness: 0.6
        });

        const capsuleRadius = 1;
        const capsuleHeight = 3;
        const capsuleGeo = new THREE.CylinderGeometry(capsuleRadius, capsuleRadius, capsuleHeight, 16);
        const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
        capsule.position.set(10, capsuleHeight / 2, 0);
        capsule.castShadow = true;
        wingGroup.add(capsule);
        this.addCollisionMesh('s_capsule', capsule.position, capsuleRadius, 'cylinder');

        // ===== ROBOTIC PARTS STORAGE =====
        const storageMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.6
        });

        // Storage shelves
        const shelfGeo = new THREE.BoxGeometry(5, 2, 1.5);
        const shelf = new THREE.Mesh(shelfGeo, storageMat);
        shelf.position.set(-10, 1, 0);
        shelf.castShadow = true;
        wingGroup.add(shelf);
        this.addCollisionMesh('s_storage_shelf', shelf.position, new THREE.Vector3(5, 2, 1.5), 'box');

        // Central battery (bright element)
        const batteryMat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.3
        });

        const batteryGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
        const battery = new THREE.Mesh(batteryGeo, batteryMat);
        battery.position.set(-10, 1, -8);
        battery.castShadow = true;
        wingGroup.add(battery);
        this.addCollisionMesh('s_battery', battery.position, new THREE.Vector3(1.5, 2, 1.5), 'box');

        // ===== SPAWN POINT (On the operating table!) =====
        const yuranySpawnPoint = new THREE.Vector3(0, 1.5, 0);
        this.spawnPoints.set('yurany', yuranySpawnPoint);

        // ===== FLOOR =====
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.7,
            metalness: 0.2
        });
        const floorGeo = new THREE.PlaneGeometry(wingWidth - 1, wingDepth - 1);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        floor.receiveShadow = true;
        wingGroup.add(floor);

        this.scene.add(wingGroup);
        this.structures.push(wingGroup);
    }

    /**
     * Helper: Create a portal chamber inside a wing
     */
    private createPortalChamber(parentGroup: THREE.Group, position: THREE.Vector3, type: 'spider' | 'worm', wingId: string) {
        const chamberGroup = new THREE.Group();
        chamberGroup.position.copy(position);

        const chamberRadius = 6;
        const wallHeight = 5;

        // Circular floor (invocation circle)
        const floorMat = new THREE.MeshStandardMaterial({
            color: type === 'spider' ? 0xffffff : 0x8B6914,
            emissive: type === 'spider' ? 0xffffff : 0x8B6914,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.7
        });

        const floorGeo = new THREE.CircleGeometry(chamberRadius, 32);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.05;
        floor.receiveShadow = true;
        chamberGroup.add(floor);

        // Circular wall (columns around perimeter)
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.6,
            metalness: 0.3
        });

        const numColumns = 12;
        for (let i = 0; i < numColumns; i++) {
            const angle = (i / numColumns) * Math.PI * 2;
            const x = Math.cos(angle) * chamberRadius;
            const z = Math.sin(angle) * chamberRadius;

            const colGeo = new THREE.CylinderGeometry(0.3, 0.3, wallHeight, 8);
            const col = new THREE.Mesh(colGeo, wallMat);
            col.position.set(x, wallHeight / 2, z);
            col.castShadow = true;
            col.receiveShadow = true;
            chamberGroup.add(col);
            this.addCollisionMesh(`${wingId}_chamber_col_${i}`, col.position, 0.3, 'cylinder');
        }

        parentGroup.add(chamberGroup);
    }

    /**
     * Create corridor system connecting all wings
     */
    private createCorridorSystem() {
        const corridorGroup = new THREE.Group();
        const corridorWidth = 3;
        const corridorHeight = 5;
        const wallThickness = 0.3;

        const corridorMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.6,
            metalness: 0.4
        });

        // Corridor segments (simplified - 4 main connections)
        // NE Lab → Central
        this.createCorridorSegment(corridorGroup, new THREE.Vector3(-22.5, 0, -45), 22.5, corridorWidth, corridorHeight, 'z', corridorMat);

        // NW Prisons → Central
        this.createCorridorSegment(corridorGroup, new THREE.Vector3(22.5, 0, -45), 22.5, corridorWidth, corridorHeight, 'z', corridorMat);

        // S Medical → Central
        this.createCorridorSegment(corridorGroup, new THREE.Vector3(0, 0, 25), 25, corridorWidth, corridorHeight, 'z', corridorMat);

        this.scene.add(corridorGroup);
        this.structures.push(corridorGroup);
    }

    /**
     * Helper: Create a corridor segment
     */
    private createCorridorSegment(group: THREE.Group, position: THREE.Vector3, length: number, width: number, height: number, axis: 'x' | 'z', material: THREE.Material) {
        const geo = axis === 'x'
            ? new THREE.BoxGeometry(length, height, width)
            : new THREE.BoxGeometry(width, height, length);

        const floor = new THREE.Mesh(geo, material);
        floor.position.copy(position);
        floor.receiveShadow = true;
        group.add(floor);

        // Add collision for corridor floor
        const collisionSize = axis === 'x'
            ? new THREE.Vector3(length, height, width)
            : new THREE.Vector3(width, height, length);
        this.addCollisionMesh(`corridor_${position.x}_${position.z}`, position, collisionSize, 'box');
    }

    /**
     * Create central hub (where portals are)
     */
    private createCentralHub() {
        const hubGroup = new THREE.Group();
        const hubSize = 20;
        const hubHeight = 6;

        // Central hub floor (reflective)
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x1a2a3a,
            emissive: 0x0044ff,
            emissiveIntensity: 0.1,
            roughness: 0.6,
            metalness: 0.3
        });

        const floorGeo = new THREE.PlaneGeometry(hubSize - 1, hubSize - 1);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.02;
        floor.receiveShadow = true;
        hubGroup.add(floor);

        // 8 Control station pillars
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a,
            emissive: 0x00ffff,
            emissiveIntensity: 0.1,
            roughness: 0.5,
            metalness: 0.6
        });

        const pillarRadius = 0.5;
        const pillarHeight = hubHeight;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 8;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;

            const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 8);
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(x, pillarHeight / 2, z);
            pillar.castShadow = true;
            hubGroup.add(pillar);
            this.addCollisionMesh(`central_pillar_${i}`, pillar.position, pillarRadius, 'cylinder');
        }

        // Central alarm light (pulsing red)
        const alarmMat = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            emissive: 0xff3333,
            emissiveIntensity: 0.5
        });

        const alarmGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const alarm = new THREE.Mesh(alarmGeo, alarmMat);
        alarm.position.y = hubHeight - 0.5;
        hubGroup.add(alarm);

        this.scene.add(hubGroup);
        this.structures.push(hubGroup);
    }

    /**
     * Helper: Register collision mesh
     */
    private addCollisionMesh(id: string, position: THREE.Vector3, size: THREE.Vector3 | number, type: 'box' | 'cylinder') {
        this.collisionMeshes.push({
            id,
            position: position.clone(),
            size,
            type,
            active: true
        });
    }

    // ===== PUBLIC ACCESSORS =====

    public getCollisionMeshes(): CollisionMesh[] {
        return this.collisionMeshes;
    }

    public getSpawnPoint(character: 'lars' | 'arcadio' | 'yurany'): THREE.Vector3 | undefined {
        return this.spawnPoints.get(character);
    }

    public getAllSpawnPoints(): Map<string, THREE.Vector3> {
        return this.spawnPoints;
    }

    public getStructures(): THREE.Group[] {
        return this.structures;
    }
}
