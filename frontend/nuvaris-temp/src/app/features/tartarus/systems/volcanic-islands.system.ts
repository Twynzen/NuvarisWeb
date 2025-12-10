import * as THREE from 'three';
import { createNoise3D, NoiseFunction3D } from 'simplex-noise';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

/**
 * TARTARUS PRIME - Volcanic Islands System v3
 *
 * A living volcanic world with interconnected mountain cities.
 * Created with love and passion.
 *
 * Features:
 * - Massive geological formations with dramatic silhouettes
 * - Interconnected mountains with bridges and walkways
 * - Coherent cities with districts: industrial, residential, towers
 * - Life details: chimneys with smoke, cranes, platforms, lights
 */

interface MassiveFormationConfig {
  id: string;
  theta: number;
  phi: number;
  baseRadius: number;
  peakHeight: number;
  peakCount: number;
  hasCity: boolean;
  isMassive: boolean;
  cityType?: 'industrial' | 'residential' | 'capital' | 'outpost';
  connectedTo?: string[];  // IDs of formations to connect with bridges
}

interface CityDistrict {
  type: 'tower' | 'residential' | 'industrial' | 'platform' | 'beacon';
  heightFactor: number;
  angle: number;
  scale: number;
}

export class VolcanicIslandsSystem implements PlanetLayer {
  name = 'islands';
  mesh: THREE.Group;

  private formations: THREE.Group[] = [];
  private formationPositions: Map<string, THREE.Vector3> = new Map();
  private noise3D: NoiseFunction3D;
  private coreRadius: number;
  private smokeMaterials: THREE.ShaderMaterial[] = [];

  // Materials cache for performance
  private materials = {
    rock: null as THREE.MeshStandardMaterial | null,
    darkRock: null as THREE.MeshStandardMaterial | null,
    metal: null as THREE.MeshStandardMaterial | null,
    rust: null as THREE.MeshStandardMaterial | null,
    glass: null as THREE.MeshBasicMaterial | null,
    warmGlass: null as THREE.MeshBasicMaterial | null,
    lava: null as THREE.MeshBasicMaterial | null,
    bridge: null as THREE.MeshStandardMaterial | null,
  };

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.noise3D = createNoise3D();
    this.coreRadius = config.coreRadius;

    this.initializeMaterials();
    this.createMassiveFormations();
    this.createBridgeConnections();
  }

  private initializeMaterials(): void {
    // Volcanic rock - warm tones that catch light
    this.materials.rock = new THREE.MeshStandardMaterial({
      color: 0x2a1a15,
      roughness: 0.75,
      metalness: 0.1,
      flatShading: true,
      emissive: 0x331100,
      emissiveIntensity: 0.15,
    });

    // Darker rock for cliffs
    this.materials.darkRock = new THREE.MeshStandardMaterial({
      color: 0x1f1210,
      roughness: 0.8,
      metalness: 0.08,
      flatShading: true,
      emissive: 0x0a0400,
      emissiveIntensity: 0.1,
    });

    // Industrial metal
    this.materials.metal = new THREE.MeshStandardMaterial({
      color: 0x3a3a40,
      roughness: 0.4,
      metalness: 0.8,
      flatShading: true,
    });

    // Rusty metal for old structures
    this.materials.rust = new THREE.MeshStandardMaterial({
      color: 0x5a3020,
      roughness: 0.9,
      metalness: 0.3,
      flatShading: true,
      emissive: 0x1a0800,
      emissiveIntensity: 0.1,
    });

    // Window glass - bright warm light
    this.materials.glass = new THREE.MeshBasicMaterial({
      color: 0xffee88,
      transparent: true,
      opacity: 0.95,
    });

    // Warmer glass for industrial
    this.materials.warmGlass = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.9,
    });

    // Lava material
    this.materials.lava = new THREE.MeshBasicMaterial({
      color: 0xff5511,
      transparent: true,
      opacity: 0.9,
    });

    // Bridge material - sturdy metal
    this.materials.bridge = new THREE.MeshStandardMaterial({
      color: 0x2a2a30,
      roughness: 0.6,
      metalness: 0.7,
      flatShading: true,
    });
  }

  private createMassiveFormations(): void {
    const formations: MassiveFormationConfig[] = [];

    // === THE CITADEL === Main capital city
    formations.push({
      id: 'citadel',
      theta: 0,
      phi: Math.PI / 2,
      baseRadius: 5.0,
      peakHeight: this.coreRadius * 4,
      peakCount: 5,
      hasCity: true,
      isMassive: true,
      cityType: 'capital',
      connectedTo: ['forge', 'watchtower'],
    });

    // === THE FORGE === Industrial district
    formations.push({
      id: 'forge',
      theta: Math.PI * 0.25,
      phi: Math.PI / 2 + 0.15,
      baseRadius: 4.0,
      peakHeight: this.coreRadius * 3,
      peakCount: 4,
      hasCity: true,
      isMassive: true,
      cityType: 'industrial',
      connectedTo: ['citadel'],
    });

    // === THE WATCHTOWER === Beacon/lighthouse
    formations.push({
      id: 'watchtower',
      theta: Math.PI * -0.2,
      phi: Math.PI / 2 - 0.1,
      baseRadius: 3.0,
      peakHeight: this.coreRadius * 3.5,
      peakCount: 2,
      hasCity: true,
      isMassive: true,
      cityType: 'outpost',
      connectedTo: ['citadel'],
    });

    // === THE SPINE === Residential area
    formations.push({
      id: 'spine',
      theta: Math.PI * 0.7,
      phi: Math.PI / 2 + 0.2,
      baseRadius: 3.5,
      peakHeight: this.coreRadius * 2.5,
      peakCount: 4,
      hasCity: true,
      isMassive: true,
      cityType: 'residential',
      connectedTo: ['haven'],
    });

    // === HAVEN === Twin peaks residential
    formations.push({
      id: 'haven',
      theta: Math.PI * 0.9,
      phi: Math.PI / 2 + 0.1,
      baseRadius: 2.8,
      peakHeight: this.coreRadius * 2.2,
      peakCount: 3,
      hasCity: true,
      isMassive: true,
      cityType: 'residential',
      connectedTo: ['spine'],
    });

    // === THE FANGS === Dramatic uninhabited peaks
    formations.push({
      id: 'fangs',
      theta: Math.PI * 1.4,
      phi: Math.PI / 2 - 0.15,
      baseRadius: 3.0,
      peakHeight: this.coreRadius * 2,
      peakCount: 3,
      hasCity: false,
      isMassive: true,
    });

    // Large volcanic islands with outposts
    const largeIslands = [
      { theta: Math.PI * 0.5, phi: Math.PI / 2 + 0.3, city: true, type: 'outpost' as const },
      { theta: Math.PI * 1.1, phi: Math.PI / 2 - 0.25, city: true, type: 'outpost' as const },
      { theta: Math.PI * 1.7, phi: Math.PI / 2 + 0.2, city: false, type: undefined },
      { theta: Math.PI * -0.4, phi: Math.PI / 2 + 0.35, city: true, type: 'industrial' as const },
    ];

    largeIslands.forEach((island, i) => {
      formations.push({
        id: `large_${i}`,
        theta: island.theta,
        phi: island.phi,
        baseRadius: 1.8 + Math.random() * 0.8,
        peakHeight: this.coreRadius * (1.0 + Math.random() * 0.5),
        peakCount: 2 + Math.floor(Math.random() * 2),
        hasCity: island.city,
        isMassive: false,
        cityType: island.type,
      });
    });

    // Medium formations
    for (let i = 0; i < 6; i++) {
      const theta = Math.random() * Math.PI * 2;
      formations.push({
        id: `medium_${i}`,
        theta,
        phi: Math.PI / 2 + (Math.random() - 0.5) * 0.8,
        baseRadius: 0.8 + Math.random() * 0.7,
        peakHeight: this.coreRadius * (0.4 + Math.random() * 0.4),
        peakCount: 1 + Math.floor(Math.random() * 2),
        hasCity: false,
        isMassive: false,
      });
    }

    // Small rocky outcrops
    for (let i = 0; i < 10; i++) {
      const theta = Math.random() * Math.PI * 2;
      formations.push({
        id: `small_${i}`,
        theta,
        phi: Math.PI / 2 + (Math.random() - 0.5) * 1.0,
        baseRadius: 0.4 + Math.random() * 0.4,
        peakHeight: this.coreRadius * (0.2 + Math.random() * 0.25),
        peakCount: 1,
        hasCity: false,
        isMassive: false,
      });
    }

    // Create all formations and store their world positions
    formations.forEach(cfg => {
      const formation = this.createFormation(cfg);
      this.formations.push(formation);
      this.mesh.add(formation);

      // Store world position for bridge connections
      const worldPos = new THREE.Vector3();
      formation.getWorldPosition(worldPos);
      this.formationPositions.set(cfg.id, formation.position.clone());
    });
  }

  private createFormation(config: MassiveFormationConfig): THREE.Group {
    const group = new THREE.Group();

    // Position on sphere surface
    const x = this.coreRadius * Math.sin(config.phi) * Math.cos(config.theta);
    const y = this.coreRadius * Math.cos(config.phi);
    const z = this.coreRadius * Math.sin(config.phi) * Math.sin(config.theta);

    group.position.set(x, y, z);
    group.lookAt(0, 0, 0);
    group.rotateX(Math.PI / 2);
    group.userData = { config };

    // Create mountain structure
    if (config.isMassive) {
      this.createMassiveMountainRange(group, config);
    } else {
      this.createMountainPeaks(group, config);
    }

    // Add volcanic features
    this.addVolcanicGlow(group, config);

    // Add city based on type
    if (config.hasCity && config.cityType) {
      this.createCity(group, config);
    }

    return group;
  }

  /**
   * Creates bridges between connected formations
   */
  private createBridgeConnections(): void {
    const processedConnections = new Set<string>();

    this.formations.forEach(formation => {
      const config = formation.userData['config'] as MassiveFormationConfig;
      if (!config.connectedTo) return;

      config.connectedTo.forEach(targetId => {
        const connectionKey = [config.id, targetId].sort().join('-');
        if (processedConnections.has(connectionKey)) return;
        processedConnections.add(connectionKey);

        const targetFormation = this.formations.find(f =>
          (f.userData['config'] as MassiveFormationConfig).id === targetId
        );
        if (!targetFormation) return;

        this.createBridge(formation, targetFormation, config, targetFormation.userData['config']);
      });
    });
  }

  /**
   * Creates a suspension bridge between two formations
   */
  private createBridge(
    fromFormation: THREE.Group,
    toFormation: THREE.Group,
    fromConfig: MassiveFormationConfig,
    toConfig: MassiveFormationConfig
  ): void {
    const bridgeGroup = new THREE.Group();

    // Calculate bridge endpoints in world space
    const fromPos = fromFormation.position.clone();
    const toPos = toFormation.position.clone();

    // Bridge starts at ~40% height of each formation
    const fromHeight = fromConfig.peakHeight * 0.4;
    const toHeight = toConfig.peakHeight * 0.4;

    // Get outward direction for each formation
    const fromDir = fromPos.clone().normalize();
    const toDir = toPos.clone().normalize();

    // Calculate actual bridge start/end points
    const bridgeStart = fromPos.clone().add(fromDir.clone().multiplyScalar(fromHeight));
    const bridgeEnd = toPos.clone().add(toDir.clone().multiplyScalar(toHeight));

    // Create curved bridge path
    const midPoint = bridgeStart.clone().add(bridgeEnd).multiplyScalar(0.5);
    const sagAmount = bridgeStart.distanceTo(bridgeEnd) * 0.15;
    midPoint.normalize().multiplyScalar(midPoint.length() - sagAmount);

    const curve = new THREE.QuadraticBezierCurve3(bridgeStart, midPoint, bridgeEnd);

    // Bridge deck
    const deckGeometry = new THREE.TubeGeometry(curve, 32, 0.15, 8, false);
    const deck = new THREE.Mesh(deckGeometry, this.materials.bridge!);
    bridgeGroup.add(deck);

    // Support cables
    const cableCount = 12;
    for (let i = 0; i <= cableCount; i++) {
      const t = i / cableCount;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      // Vertical supports
      const supportHeight = 0.3 + Math.sin(t * Math.PI) * 0.2;
      const supportGeom = new THREE.CylinderGeometry(0.02, 0.02, supportHeight, 6);
      const support = new THREE.Mesh(supportGeom, this.materials.metal!);

      // Position support
      const up = point.clone().normalize();
      support.position.copy(point).add(up.clone().multiplyScalar(supportHeight / 2));
      support.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

      bridgeGroup.add(support);

      // Add lights along the bridge
      if (i % 3 === 0) {
        const light = new THREE.PointLight(0xffaa44, 0.3, 3);
        light.position.copy(point).add(up.clone().multiplyScalar(0.3));
        bridgeGroup.add(light);

        // Light fixture
        const fixtureGeom = new THREE.SphereGeometry(0.05, 8, 8);
        const fixture = new THREE.Mesh(fixtureGeom, this.materials.warmGlass!);
        fixture.position.copy(light.position);
        bridgeGroup.add(fixture);
      }
    }

    this.mesh.add(bridgeGroup);
  }

  /**
   * Creates a coherent city based on type
   */
  private createCity(parent: THREE.Group, config: MassiveFormationConfig): void {
    switch (config.cityType) {
      case 'capital':
        this.createCapitalCity(parent, config);
        break;
      case 'industrial':
        this.createIndustrialCity(parent, config);
        break;
      case 'residential':
        this.createResidentialCity(parent, config);
        break;
      case 'outpost':
        this.createOutpost(parent, config);
        break;
    }
  }

  /**
   * THE CAPITAL - Grand central tower with surrounding districts
   */
  private createCapitalCity(parent: THREE.Group, config: MassiveFormationConfig): void {
    const scale = config.isMassive ? 1.5 : 1.0;

    // === CENTRAL GRAND TOWER ===
    this.createGrandTower(parent, config, scale);

    // === SURROUNDING DISTRICTS ===
    const districts: CityDistrict[] = [
      // Government/Administrative buildings
      { type: 'tower', heightFactor: 0.5, angle: 0, scale: 0.7 },
      { type: 'tower', heightFactor: 0.45, angle: Math.PI / 3, scale: 0.6 },
      // Residential areas
      { type: 'residential', heightFactor: 0.35, angle: Math.PI * 0.6, scale: 0.8 },
      { type: 'residential', heightFactor: 0.3, angle: Math.PI * 0.8, scale: 0.7 },
      // Industrial zone
      { type: 'industrial', heightFactor: 0.25, angle: Math.PI * 1.2, scale: 0.6 },
      // Landing platforms
      { type: 'platform', heightFactor: 0.4, angle: Math.PI * 1.5, scale: 1.0 },
      // Beacon tower
      { type: 'beacon', heightFactor: 0.6, angle: Math.PI * 1.8, scale: 0.5 },
    ];

    districts.forEach(district => {
      this.createDistrict(parent, config, district, scale);
    });

    // Add connecting walkways between districts
    this.addCityWalkways(parent, config, scale);
  }

  /**
   * Creates the grand central tower of the capital
   */
  private createGrandTower(parent: THREE.Group, config: MassiveFormationConfig, scale: number): void {
    const towerHeight = 2.5 * scale;
    const towerBase = 0.4 * scale;
    const heightOnMountain = config.peakHeight * 0.55;

    // Main tower body - tapered
    const towerGeom = new THREE.CylinderGeometry(towerBase * 0.6, towerBase, towerHeight, 8);
    const tower = new THREE.Mesh(towerGeom, this.materials.metal!);
    tower.position.y = heightOnMountain + towerHeight / 2;
    parent.add(tower);

    // Tower crown - observation deck
    const crownGeom = new THREE.CylinderGeometry(towerBase * 0.8, towerBase * 0.6, 0.3 * scale, 8);
    const crown = new THREE.Mesh(crownGeom, this.materials.metal!);
    crown.position.y = heightOnMountain + towerHeight + 0.15 * scale;
    parent.add(crown);

    // Spire
    const spireGeom = new THREE.ConeGeometry(0.1 * scale, 0.8 * scale, 6);
    const spire = new THREE.Mesh(spireGeom, this.materials.metal!);
    spire.position.y = heightOnMountain + towerHeight + 0.3 * scale + 0.4 * scale;
    parent.add(spire);

    // Beacon light at top
    const beaconLight = new THREE.PointLight(0xff6644, 2.0, 15);
    beaconLight.position.y = heightOnMountain + towerHeight + 1.0 * scale;
    parent.add(beaconLight);

    // Windows spiraling up the tower
    const windowRows = 8;
    for (let row = 0; row < windowRows; row++) {
      const rowHeight = heightOnMountain + 0.3 + (row / windowRows) * towerHeight * 0.85;
      const rowRadius = towerBase * (1 - row / windowRows * 0.3);
      const windowsInRow = 6;

      for (let w = 0; w < windowsInRow; w++) {
        const angle = (w / windowsInRow) * Math.PI * 2 + row * 0.3;
        const windowGeom = new THREE.PlaneGeometry(0.08 * scale, 0.12 * scale);
        const windowMesh = new THREE.Mesh(windowGeom, this.materials.glass!);

        windowMesh.position.set(
          Math.cos(angle) * (rowRadius + 0.01),
          rowHeight,
          Math.sin(angle) * (rowRadius + 0.01)
        );
        windowMesh.lookAt(
          Math.cos(angle) * 10,
          rowHeight,
          Math.sin(angle) * 10
        );
        parent.add(windowMesh);
      }
    }

    // Tower base platform
    const platformGeom = new THREE.CylinderGeometry(towerBase * 1.5, towerBase * 1.8, 0.2 * scale, 12);
    const platform = new THREE.Mesh(platformGeom, this.materials.darkRock!);
    platform.position.y = heightOnMountain;
    parent.add(platform);
  }

  /**
   * Creates a city district
   */
  private createDistrict(
    parent: THREE.Group,
    config: MassiveFormationConfig,
    district: CityDistrict,
    scale: number
  ): void {
    const heightOnMountain = config.peakHeight * district.heightFactor;
    const taperFactor = 1 - Math.pow(district.heightFactor, 0.6);
    const radiusAtHeight = config.baseRadius * taperFactor * 0.6;
    const districtScale = district.scale * scale;

    switch (district.type) {
      case 'tower':
        this.createTowerBuilding(parent, heightOnMountain, district.angle, radiusAtHeight, districtScale);
        break;
      case 'residential':
        this.createResidentialBlock(parent, heightOnMountain, district.angle, radiusAtHeight, districtScale);
        break;
      case 'industrial':
        this.createIndustrialBlock(parent, heightOnMountain, district.angle, radiusAtHeight, districtScale);
        break;
      case 'platform':
        this.createLandingPlatform(parent, heightOnMountain, district.angle, radiusAtHeight, districtScale);
        break;
      case 'beacon':
        this.createBeaconTower(parent, heightOnMountain, district.angle, radiusAtHeight, districtScale);
        break;
    }
  }

  /**
   * Creates a secondary tower building
   */
  private createTowerBuilding(
    parent: THREE.Group,
    height: number,
    angle: number,
    radius: number,
    scale: number
  ): void {
    const towerHeight = 0.8 * scale;
    const towerWidth = 0.15 * scale;

    const geom = new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth);
    const tower = new THREE.Mesh(geom, this.materials.metal!);
    tower.position.set(
      Math.cos(angle) * radius,
      height + towerHeight / 2,
      Math.sin(angle) * radius
    );
    parent.add(tower);

    // Windows
    this.addWindowsToBuilding(parent, tower.position, towerWidth, towerHeight, angle, 3);

    // Roof antenna
    const antennaGeom = new THREE.CylinderGeometry(0.01 * scale, 0.01 * scale, 0.2 * scale, 4);
    const antenna = new THREE.Mesh(antennaGeom, this.materials.metal!);
    antenna.position.copy(tower.position);
    antenna.position.y += towerHeight / 2 + 0.1 * scale;
    parent.add(antenna);
  }

  /**
   * Creates a residential block with multiple buildings
   */
  private createResidentialBlock(
    parent: THREE.Group,
    height: number,
    angle: number,
    radius: number,
    scale: number
  ): void {
    const buildingCount = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < buildingCount; i++) {
      const offsetAngle = angle + (i - buildingCount / 2) * 0.15;
      const offsetRadius = radius * (0.9 + Math.random() * 0.2);
      const buildingHeight = (0.2 + Math.random() * 0.3) * scale;
      const buildingWidth = (0.08 + Math.random() * 0.06) * scale;

      const geom = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingWidth);
      const building = new THREE.Mesh(geom, this.materials.metal!);
      building.position.set(
        Math.cos(offsetAngle) * offsetRadius,
        height + buildingHeight / 2,
        Math.sin(offsetAngle) * offsetRadius
      );
      parent.add(building);

      // Windows with warm light
      this.addWindowsToBuilding(parent, building.position, buildingWidth, buildingHeight, offsetAngle, 2);

      // Some buildings have rooftop elements
      if (Math.random() > 0.5) {
        const roofGeom = new THREE.BoxGeometry(buildingWidth * 0.4, 0.05 * scale, buildingWidth * 0.4);
        const roof = new THREE.Mesh(roofGeom, this.materials.rust!);
        roof.position.copy(building.position);
        roof.position.y += buildingHeight / 2 + 0.025 * scale;
        parent.add(roof);
      }
    }
  }

  /**
   * Creates an industrial block with chimneys and smoke
   */
  private createIndustrialBlock(
    parent: THREE.Group,
    height: number,
    angle: number,
    radius: number,
    scale: number
  ): void {
    // Main factory building
    const factoryWidth = 0.3 * scale;
    const factoryHeight = 0.25 * scale;

    const factoryGeom = new THREE.BoxGeometry(factoryWidth, factoryHeight, factoryWidth * 0.8);
    const factory = new THREE.Mesh(factoryGeom, this.materials.rust!);
    factory.position.set(
      Math.cos(angle) * radius,
      height + factoryHeight / 2,
      Math.sin(angle) * radius
    );
    parent.add(factory);

    // Industrial windows (orange glow)
    const windowGeom = new THREE.PlaneGeometry(factoryWidth * 0.3, factoryHeight * 0.4);
    const windowMesh = new THREE.Mesh(windowGeom, this.materials.warmGlass!);
    windowMesh.position.copy(factory.position);
    windowMesh.position.x += Math.cos(angle) * (factoryWidth / 2 + 0.01);
    windowMesh.position.z += Math.sin(angle) * (factoryWidth / 2 + 0.01);
    windowMesh.lookAt(
      windowMesh.position.x + Math.cos(angle),
      windowMesh.position.y,
      windowMesh.position.z + Math.sin(angle)
    );
    parent.add(windowMesh);

    // Chimneys with smoke
    const chimneyCount = 2;
    for (let c = 0; c < chimneyCount; c++) {
      const chimneyOffset = (c - 0.5) * factoryWidth * 0.5;
      const chimneyHeight = 0.4 * scale;

      const chimneyGeom = new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, chimneyHeight, 8);
      const chimney = new THREE.Mesh(chimneyGeom, this.materials.rust!);
      chimney.position.copy(factory.position);
      chimney.position.x += chimneyOffset * Math.cos(angle + Math.PI / 2);
      chimney.position.z += chimneyOffset * Math.sin(angle + Math.PI / 2);
      chimney.position.y += factoryHeight / 2 + chimneyHeight / 2;
      parent.add(chimney);

      // Add smoke particles
      this.addChimneySmoke(parent, chimney.position.clone(), scale);
    }

    // Crane
    this.addCrane(parent, factory.position.clone(), angle, scale);
  }

  /**
   * Adds a crane to industrial areas
   */
  private addCrane(parent: THREE.Group, basePos: THREE.Vector3, angle: number, scale: number): void {
    const craneHeight = 0.6 * scale;
    const craneArmLength = 0.4 * scale;

    // Vertical mast
    const mastGeom = new THREE.BoxGeometry(0.03 * scale, craneHeight, 0.03 * scale);
    const mast = new THREE.Mesh(mastGeom, this.materials.metal!);
    mast.position.copy(basePos);
    mast.position.x += Math.cos(angle + Math.PI / 4) * 0.2 * scale;
    mast.position.z += Math.sin(angle + Math.PI / 4) * 0.2 * scale;
    mast.position.y += craneHeight / 2;
    parent.add(mast);

    // Horizontal arm
    const armGeom = new THREE.BoxGeometry(craneArmLength, 0.02 * scale, 0.02 * scale);
    const arm = new THREE.Mesh(armGeom, this.materials.metal!);
    arm.position.copy(mast.position);
    arm.position.y += craneHeight / 2;
    arm.position.x += Math.cos(angle) * craneArmLength / 2;
    arm.position.z += Math.sin(angle) * craneArmLength / 2;
    arm.rotation.y = -angle;
    parent.add(arm);

    // Cable
    const cableGeom = new THREE.CylinderGeometry(0.005 * scale, 0.005 * scale, 0.3 * scale, 4);
    const cable = new THREE.Mesh(cableGeom, this.materials.metal!);
    cable.position.copy(arm.position);
    cable.position.y -= 0.15 * scale;
    parent.add(cable);
  }

  /**
   * Creates a landing platform
   */
  private createLandingPlatform(
    parent: THREE.Group,
    height: number,
    angle: number,
    radius: number,
    scale: number
  ): void {
    const platformRadius = 0.35 * scale;

    // Platform base
    const platformGeom = new THREE.CylinderGeometry(platformRadius, platformRadius * 1.1, 0.08 * scale, 12);
    const platform = new THREE.Mesh(platformGeom, this.materials.metal!);
    platform.position.set(
      Math.cos(angle) * radius,
      height + 0.04 * scale,
      Math.sin(angle) * radius
    );
    parent.add(platform);

    // Landing lights around the edge
    const lightCount = 6;
    for (let l = 0; l < lightCount; l++) {
      const lightAngle = (l / lightCount) * Math.PI * 2;
      const lightGeom = new THREE.SphereGeometry(0.02 * scale, 6, 6);
      const lightMesh = new THREE.Mesh(lightGeom, this.materials.warmGlass!);
      lightMesh.position.copy(platform.position);
      lightMesh.position.x += Math.cos(lightAngle) * platformRadius * 0.85;
      lightMesh.position.z += Math.sin(lightAngle) * platformRadius * 0.85;
      lightMesh.position.y += 0.05 * scale;
      parent.add(lightMesh);

      // Actual lights (every other one)
      if (l % 2 === 0) {
        const light = new THREE.PointLight(0xff6644, 0.2, 2);
        light.position.copy(lightMesh.position);
        parent.add(light);
      }
    }

    // Control tower
    const towerGeom = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.2 * scale, 6);
    const tower = new THREE.Mesh(towerGeom, this.materials.metal!);
    tower.position.copy(platform.position);
    tower.position.x += Math.cos(angle + Math.PI) * platformRadius * 0.6;
    tower.position.z += Math.sin(angle + Math.PI) * platformRadius * 0.6;
    tower.position.y += 0.1 * scale;
    parent.add(tower);
  }

  /**
   * Creates a beacon/lighthouse tower
   */
  private createBeaconTower(
    parent: THREE.Group,
    height: number,
    angle: number,
    radius: number,
    scale: number
  ): void {
    const towerHeight = 1.0 * scale;

    // Tower body
    const towerGeom = new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, towerHeight, 8);
    const tower = new THREE.Mesh(towerGeom, this.materials.darkRock!);
    tower.position.set(
      Math.cos(angle) * radius,
      height + towerHeight / 2,
      Math.sin(angle) * radius
    );
    parent.add(tower);

    // Beacon housing
    const beaconGeom = new THREE.SphereGeometry(0.12 * scale, 12, 12);
    const beacon = new THREE.Mesh(beaconGeom, this.materials.glass!);
    beacon.position.copy(tower.position);
    beacon.position.y += towerHeight / 2 + 0.08 * scale;
    parent.add(beacon);

    // Beacon light
    const light = new THREE.PointLight(0xffaa44, 1.5, 20);
    light.position.copy(beacon.position);
    parent.add(light);

    // Roof cap
    const roofGeom = new THREE.ConeGeometry(0.1 * scale, 0.1 * scale, 8);
    const roof = new THREE.Mesh(roofGeom, this.materials.metal!);
    roof.position.copy(beacon.position);
    roof.position.y += 0.12 * scale;
    parent.add(roof);
  }

  /**
   * Adds windows to a building
   */
  private addWindowsToBuilding(
    parent: THREE.Group,
    buildingPos: THREE.Vector3,
    width: number,
    height: number,
    angle: number,
    rows: number
  ): void {
    for (let row = 0; row < rows; row++) {
      const rowY = buildingPos.y - height / 2 + (row + 0.5) * (height / rows) * 0.8;
      const windowGeom = new THREE.PlaneGeometry(width * 0.5, height / rows * 0.5);
      const windowMesh = new THREE.Mesh(windowGeom, this.materials.glass!);

      windowMesh.position.set(
        buildingPos.x + Math.cos(angle) * (width / 2 + 0.005),
        rowY,
        buildingPos.z + Math.sin(angle) * (width / 2 + 0.005)
      );
      windowMesh.lookAt(
        windowMesh.position.x + Math.cos(angle),
        windowMesh.position.y,
        windowMesh.position.z + Math.sin(angle)
      );
      parent.add(windowMesh);
    }
  }

  /**
   * Adds chimney smoke particles
   */
  private addChimneySmoke(parent: THREE.Group, position: THREE.Vector3, scale: number): void {
    const smokeCount = 20;
    const positions = new Float32Array(smokeCount * 3);
    const sizes = new Float32Array(smokeCount);
    const lifetimes = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.02;
      positions[i * 3 + 1] = position.y + Math.random() * 0.3 * scale;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.02;

      sizes[i] = (0.02 + Math.random() * 0.03) * scale;
      lifetimes[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        varying float vLifetime;
        uniform float time;

        void main() {
          vLifetime = lifetime;
          vec3 pos = position;
          pos.y += mod(time * 0.2 + lifetime * 2.0, 1.5);
          pos.x += sin(time * 2.0 + lifetime * 5.0) * 0.03;
          pos.z += cos(time * 1.5 + lifetime * 4.0) * 0.03;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * 0.4;
          vec3 color = vec3(0.3, 0.28, 0.25);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const smoke = new THREE.Points(geometry, material);
    this.smokeMaterials.push(material);
    parent.add(smoke);
  }

  /**
   * Adds walkways connecting different areas of a city
   */
  private addCityWalkways(parent: THREE.Group, config: MassiveFormationConfig, scale: number): void {
    // Simple connecting walkways at different heights
    const walkwayCount = 3;
    for (let w = 0; w < walkwayCount; w++) {
      const startAngle = (w / walkwayCount) * Math.PI * 2;
      const endAngle = startAngle + Math.PI * 0.3;
      const heightFactor = 0.3 + w * 0.1;
      const height = config.peakHeight * heightFactor;
      const radius = config.baseRadius * (1 - Math.pow(heightFactor, 0.6)) * 0.65;

      const points = [];
      const segments = 8;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const angle = startAngle + t * (endAngle - startAngle);
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          height + Math.sin(t * Math.PI) * 0.1 * scale,
          Math.sin(angle) * radius
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const walkwayGeom = new THREE.TubeGeometry(curve, 12, 0.03 * scale, 6, false);
      const walkway = new THREE.Mesh(walkwayGeom, this.materials.metal!);
      parent.add(walkway);
    }
  }

  /**
   * INDUSTRIAL CITY - Focused on factories and production
   */
  private createIndustrialCity(parent: THREE.Group, config: MassiveFormationConfig): void {
    const scale = config.isMassive ? 1.3 : 1.0;

    // Multiple factory blocks
    const factoryAngles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
    factoryAngles.forEach((angle, i) => {
      const heightFactor = 0.25 + (i % 2) * 0.1;
      const radius = config.baseRadius * (1 - Math.pow(heightFactor, 0.6)) * 0.6;
      this.createIndustrialBlock(parent, config.peakHeight * heightFactor, angle, radius, scale);
    });

    // Storage tanks
    this.addStorageTanks(parent, config, scale);
  }

  /**
   * Adds storage tanks to industrial areas
   */
  private addStorageTanks(parent: THREE.Group, config: MassiveFormationConfig, scale: number): void {
    const tankCount = 3;
    const baseAngle = Math.PI * 1.4;

    for (let t = 0; t < tankCount; t++) {
      const angle = baseAngle + t * 0.25;
      const heightFactor = 0.2;
      const radius = config.baseRadius * 0.5;
      const tankRadius = 0.08 * scale;
      const tankHeight = 0.15 * scale;

      const tankGeom = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 12);
      const tank = new THREE.Mesh(tankGeom, this.materials.rust!);
      tank.position.set(
        Math.cos(angle) * radius,
        config.peakHeight * heightFactor + tankHeight / 2,
        Math.sin(angle) * radius
      );
      parent.add(tank);
    }
  }

  /**
   * RESIDENTIAL CITY - Cozy living areas
   */
  private createResidentialCity(parent: THREE.Group, config: MassiveFormationConfig): void {
    const scale = config.isMassive ? 1.2 : 1.0;

    // Multiple residential blocks at different heights
    const blockCount = 5;
    for (let b = 0; b < blockCount; b++) {
      const angle = (b / blockCount) * Math.PI * 2;
      const heightFactor = 0.2 + Math.random() * 0.3;
      const radius = config.baseRadius * (1 - Math.pow(heightFactor, 0.6)) * 0.6;
      this.createResidentialBlock(parent, config.peakHeight * heightFactor, angle, radius, scale);
    }

    // Central plaza with light
    const plazaHeight = config.peakHeight * 0.35;
    const plazaLight = new THREE.PointLight(0xffcc88, 0.5, 5);
    plazaLight.position.y = plazaHeight + 0.2;
    parent.add(plazaLight);
  }

  /**
   * OUTPOST - Small military/research station
   */
  private createOutpost(parent: THREE.Group, config: MassiveFormationConfig): void {
    const scale = config.isMassive ? 1.0 : 0.8;
    const height = config.peakHeight * 0.4;
    const radius = config.baseRadius * 0.4;

    // Main outpost building
    const buildingGeom = new THREE.BoxGeometry(0.2 * scale, 0.15 * scale, 0.15 * scale);
    const building = new THREE.Mesh(buildingGeom, this.materials.metal!);
    building.position.set(0, height + 0.075 * scale, 0);
    parent.add(building);

    // Antenna
    const antennaGeom = new THREE.CylinderGeometry(0.01 * scale, 0.01 * scale, 0.3 * scale, 4);
    const antenna = new THREE.Mesh(antennaGeom, this.materials.metal!);
    antenna.position.set(0.05 * scale, height + 0.15 * scale + 0.15 * scale, 0);
    parent.add(antenna);

    // Dish
    const dishGeom = new THREE.SphereGeometry(0.04 * scale, 8, 4, 0, Math.PI);
    const dish = new THREE.Mesh(dishGeom, this.materials.metal!);
    dish.position.copy(antenna.position);
    dish.position.y += 0.15 * scale;
    dish.rotation.x = Math.PI / 4;
    parent.add(dish);

    // Landing pad
    this.createLandingPlatform(parent, height - 0.1, Math.PI, radius, scale * 0.7);

    // Beacon
    this.createBeaconTower(parent, height, Math.PI / 2, radius * 0.8, scale * 0.6);
  }

  // ==================== MOUNTAIN CREATION ====================

  private createMassiveMountainRange(parent: THREE.Group, config: MassiveFormationConfig): void {
    // Main central peak
    const mainPeak = this.createJaggedPeak(
      config.baseRadius * 1.2,
      config.peakHeight,
      config.baseRadius * 0.3
    );
    mainPeak.position.y = config.peakHeight * 0.1;
    parent.add(mainPeak);

    // Surrounding peaks
    const peakOffsets = [
      { x: config.baseRadius * 0.7, z: 0, scale: 0.7 },
      { x: -config.baseRadius * 0.8, z: 0.2, scale: 0.65 },
      { x: config.baseRadius * 0.3, z: config.baseRadius * 0.6, scale: 0.55 },
      { x: -config.baseRadius * 0.4, z: -config.baseRadius * 0.5, scale: 0.5 },
      { x: config.baseRadius * 0.9, z: -config.baseRadius * 0.4, scale: 0.45 },
    ];

    peakOffsets.slice(0, config.peakCount - 1).forEach((offset) => {
      const peak = this.createJaggedPeak(
        config.baseRadius * 0.8 * offset.scale,
        config.peakHeight * offset.scale,
        config.baseRadius * 0.2 * offset.scale
      );
      peak.position.set(offset.x, config.peakHeight * 0.05, offset.z);
      peak.rotation.y = Math.random() * Math.PI;
      parent.add(peak);
    });

    this.addRidgeLines(parent, config);
    this.addCliffFaces(parent, config);
    this.addMassiveSmoke(parent, config);
  }

  private createJaggedPeak(baseRadius: number, height: number, topRadius: number): THREE.Mesh {
    const segments = 16;
    const heightSegments = 12;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let h = 0; h <= heightSegments; h++) {
      const t = h / heightSegments;
      const taperCurve = 1 - Math.pow(t, 0.6);
      const layerRadius = baseRadius * taperCurve + topRadius * (1 - taperCurve);

      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const noiseVal = this.noise3D(Math.cos(angle) * 2 + h * 0.5, Math.sin(angle) * 2, h * 0.3);
        const noise2 = this.noise3D(Math.cos(angle) * 5, Math.sin(angle) * 5, h * 0.8) * 0.3;
        const jaggedFactor = 0.15 + t * 0.25;
        const radiusVariation = 1 + (noiseVal + noise2) * jaggedFactor;

        vertices.push(
          Math.cos(angle) * layerRadius * radiusVariation,
          h * (height / heightSegments),
          Math.sin(angle) * layerRadius * radiusVariation
        );
      }
    }

    const peakOffset = this.noise3D(height, 0, 0) * topRadius * 0.5;
    vertices.push(peakOffset, height, peakOffset * 0.5);
    const peakIndex = (heightSegments + 1) * segments;

    for (let h = 0; h < heightSegments; h++) {
      for (let s = 0; s < segments; s++) {
        const current = h * segments + s;
        const next = h * segments + ((s + 1) % segments);
        const above = (h + 1) * segments + s;
        const aboveNext = (h + 1) * segments + ((s + 1) % segments);
        indices.push(current, next, above, next, aboveNext, above);
      }
    }

    for (let s = 0; s < segments; s++) {
      indices.push(
        heightSegments * segments + s,
        heightSegments * segments + ((s + 1) % segments),
        peakIndex
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, this.materials.rock!);
  }

  private createMountainPeaks(parent: THREE.Group, config: MassiveFormationConfig): void {
    for (let i = 0; i < config.peakCount; i++) {
      const offset = i === 0 ? 0 : config.baseRadius * 0.4;
      const angle = (i / config.peakCount) * Math.PI * 2;
      const peakHeight = config.peakHeight * (i === 0 ? 1 : 0.6 + Math.random() * 0.3);
      const peakRadius = config.baseRadius * (i === 0 ? 1 : 0.5 + Math.random() * 0.3);

      const peak = this.createJaggedPeak(peakRadius, peakHeight, peakRadius * 0.15);
      peak.position.set(Math.cos(angle) * offset, 0, Math.sin(angle) * offset);
      parent.add(peak);
    }

    this.addVolcanoSmoke(parent, config);
  }

  private addRidgeLines(parent: THREE.Group, config: MassiveFormationConfig): void {
    const ridgeCount = 3;
    for (let i = 0; i < ridgeCount; i++) {
      const angle = (i / ridgeCount) * Math.PI * 2;
      const length = config.baseRadius * (0.8 + Math.random() * 0.4);
      const ridgeHeight = config.peakHeight * (0.3 + Math.random() * 0.2);

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(length * 0.1, ridgeHeight * 0.4);
      shape.lineTo(length * 0.3, ridgeHeight * 0.8);
      shape.lineTo(length * 0.5, ridgeHeight);
      shape.lineTo(length * 0.7, ridgeHeight * 0.7);
      shape.lineTo(length * 0.9, ridgeHeight * 0.3);
      shape.lineTo(length, 0);
      shape.lineTo(0, 0);

      const geometry = new THREE.ExtrudeGeometry(shape, { depth: config.baseRadius * 0.15, bevelEnabled: false });
      const ridge = new THREE.Mesh(geometry, this.materials.darkRock!);
      ridge.rotation.y = angle;
      ridge.rotation.x = -0.1;

      const positions = ridge.geometry.attributes['position'].array as Float32Array;
      for (let j = 0; j < positions.length; j += 3) {
        const noise = this.noise3D(positions[j] * 2, positions[j + 1] * 2, positions[j + 2] * 2);
        positions[j] += noise * 0.15;
        positions[j + 2] += noise * 0.1;
      }
      ridge.geometry.computeVertexNormals();

      parent.add(ridge);
    }
  }

  private addCliffFaces(parent: THREE.Group, config: MassiveFormationConfig): void {
    const cliffCount = 6;
    for (let i = 0; i < cliffCount; i++) {
      const angle = (i / cliffCount) * Math.PI * 2 + Math.random() * 0.3;
      const dist = config.baseRadius * (0.6 + Math.random() * 0.3);
      const cliffHeight = config.peakHeight * (0.4 + Math.random() * 0.3);
      const cliffWidth = config.baseRadius * (0.3 + Math.random() * 0.2);

      const shape = new THREE.Shape();
      const points = 8;
      for (let p = 0; p <= points; p++) {
        const t = p / points;
        const h = cliffHeight * Math.sin(t * Math.PI);
        const w = cliffWidth * (0.3 + 0.7 * (1 - Math.abs(t - 0.5) * 2));
        const noise = this.noise3D(t * 10, i, 0) * cliffWidth * 0.2;
        if (p === 0) shape.moveTo(0, 0);
        else shape.lineTo(w + noise, h);
      }
      shape.lineTo(0, 0);

      const geometry = new THREE.ExtrudeGeometry(shape, { depth: config.baseRadius * 0.08, bevelEnabled: false });
      const cliff = new THREE.Mesh(geometry, this.materials.darkRock!);
      cliff.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      cliff.rotation.y = angle + Math.PI / 2;
      parent.add(cliff);
    }
  }

  // ==================== VOLCANIC EFFECTS ====================

  private addVolcanicGlow(parent: THREE.Group, config: MassiveFormationConfig): void {
    const poolRadius = config.baseRadius * 0.5;
    const poolGeometry = new THREE.CircleGeometry(poolRadius, 24);
    const pool = new THREE.Mesh(poolGeometry, this.materials.lava!);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.08;
    parent.add(pool);

    const intensity = config.isMassive ? 3.0 : 1.5;
    const distance = config.isMassive ? config.peakHeight * 0.8 : config.baseRadius * 8;

    const glowLight = new THREE.PointLight(0xff4400, intensity, distance);
    glowLight.position.y = config.peakHeight * 0.15;
    parent.add(glowLight);

    const upLight = new THREE.PointLight(0xff5522, intensity * 0.5, distance * 0.7);
    upLight.position.y = config.peakHeight * 0.3;
    parent.add(upLight);

    this.addLavaVeins(parent, config);
  }

  private addLavaVeins(parent: THREE.Group, config: MassiveFormationConfig): void {
    const veinCount = config.isMassive ? 8 : 3;

    for (let i = 0; i < veinCount; i++) {
      const points: THREE.Vector3[] = [];
      const angle = (i / veinCount) * Math.PI * 2;
      const segments = 6 + Math.floor(Math.random() * 4);

      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const h = t * config.peakHeight * 0.6;
        const r = config.baseRadius * (1 - t * 0.7) * 0.5;
        const wobble = this.noise3D(t * 5, i, 0) * 0.3;
        points.push(new THREE.Vector3(Math.cos(angle + wobble) * r, h, Math.sin(angle + wobble) * r));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, segments * 2, 0.02 + Math.random() * 0.03, 6, false);
      const veinMaterial = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.95 });
      const vein = new THREE.Mesh(tubeGeometry, veinMaterial);
      parent.add(vein);

      if (i % 2 === 0 && points.length > 2) {
        const midPoint = Math.floor(segments / 2);
        const veinLight = new THREE.PointLight(0xff4400, 0.4, config.baseRadius * 2);
        veinLight.position.copy(points[midPoint]);
        parent.add(veinLight);
      }
    }
  }

  private addMassiveSmoke(parent: THREE.Group, config: MassiveFormationConfig): void {
    const smokeCount = 150;
    const positions = new Float32Array(smokeCount * 3);
    const sizes = new Float32Array(smokeCount);
    const lifetimes = new Float32Array(smokeCount);
    const velocities = new Float32Array(smokeCount * 3);

    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * config.baseRadius * 0.3;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = config.peakHeight * 0.7 + Math.random() * config.peakHeight * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      sizes[i] = 0.3 + Math.random() * 0.5;
      lifetimes[i] = Math.random();
      velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 1] = 0.2 + Math.random() * 0.3;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseHeight: { value: config.peakHeight * 0.7 },
        maxHeight: { value: config.peakHeight * 2.5 },
      },
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        attribute vec3 velocity;
        varying float vLifetime;
        varying float vHeight;
        uniform float time;
        uniform float baseHeight;
        uniform float maxHeight;

        void main() {
          vLifetime = lifetime;
          vec3 pos = position;
          float age = mod(time * 0.15 + lifetime * 5.0, 5.0);
          pos += velocity * age;
          pos.y = baseHeight + age * (maxHeight - baseHeight) / 5.0;
          float spread = age * 0.3;
          pos.x += sin(time + lifetime * 10.0) * spread;
          pos.z += cos(time * 0.7 + lifetime * 8.0) * spread;
          vHeight = (pos.y - baseHeight) / (maxHeight - baseHeight);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + vHeight);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLifetime;
        varying float vHeight;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * 0.4 * (1.0 - vHeight * 0.7);
          vec3 color = mix(vec3(0.4, 0.38, 0.35), vec3(0.7, 0.68, 0.65), vHeight);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const smoke = new THREE.Points(geometry, material);
    this.smokeMaterials.push(material);
    parent.add(smoke);
  }

  private addVolcanoSmoke(parent: THREE.Group, config: MassiveFormationConfig): void {
    const smokeCount = 40;
    const positions = new Float32Array(smokeCount * 3);
    const sizes = new Float32Array(smokeCount);
    const lifetimes = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * config.baseRadius * 0.15;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = config.peakHeight * 0.8 + Math.random() * 1.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      sizes[i] = 0.1 + Math.random() * 0.2;
      lifetimes[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        varying float vLifetime;
        uniform float time;

        void main() {
          vLifetime = lifetime;
          vec3 pos = position;
          pos.y += mod(time * 0.3 + lifetime * 3.0, 2.5);
          pos.x += sin(time + lifetime * 6.0) * 0.15;
          pos.z += cos(time * 0.7 + lifetime * 5.0) * 0.15;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * 0.35;
          vec3 color = vec3(0.65, 0.63, 0.6);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const smoke = new THREE.Points(geometry, material);
    this.smokeMaterials.push(material);
    parent.add(smoke);
  }

  // ==================== UPDATE & DISPOSE ====================

  update(time: number, _delta: number): void {
    this.smokeMaterials.forEach(mat => {
      mat.uniforms['time'].value = time;
    });

    this.formations.forEach(formation => {
      formation.traverse(child => {
        if (child instanceof THREE.Points) {
          const mat = child.material as THREE.ShaderMaterial;
          if (mat.uniforms && mat.uniforms['time']) {
            mat.uniforms['time'].value = time;
          }
        }
      });
    });
  }

  dispose(): void {
    // Dispose materials
    Object.values(this.materials).forEach(mat => mat?.dispose());

    this.formations.forEach(formation => {
      formation.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    });
    this.smokeMaterials = [];
  }
}
