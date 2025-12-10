import * as THREE from 'three';
import { createNoise3D, NoiseFunction3D } from 'simplex-noise';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

/**
 * TARTARUS PRIME - Volcanic Islands System
 *
 * CONCEPT:
 * - A planet with LAVA OCEANS (the magma core)
 * - Volcanic islands EMERGE from the lava surface
 * - Islands are mountains/volcanoes rising from the sea of magma
 * - NO floating rings or orbiting objects
 * - Islands are positioned ON the surface of the magma sphere
 */

interface SurfaceIslandConfig {
  theta: number;          // Spherical coordinate - horizontal angle
  phi: number;            // Spherical coordinate - vertical angle
  size: number;           // Size of the island
  height: number;         // How high it rises from the surface
  hasVolcano: boolean;    // Does it have an active volcano crater?
  hasCity: boolean;       // Does it have a city?
}

export class VolcanicIslandsSystem implements PlanetLayer {
  name = 'islands';
  mesh: THREE.Group;

  private islands: THREE.Group[] = [];
  private noise3D: NoiseFunction3D;
  private coreRadius: number;

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.noise3D = createNoise3D();
    this.coreRadius = config.coreRadius;

    this.createSurfaceIslands();
  }

  /**
   * Creates volcanic islands that sit ON the surface of the magma sphere
   */
  private createSurfaceIslands(): void {
    const islandConfigs: SurfaceIslandConfig[] = [];

    // Create several large islands at strategic positions
    const majorIslandCount = 6;
    for (let i = 0; i < majorIslandCount; i++) {
      const theta = (i / majorIslandCount) * Math.PI * 2 + Math.random() * 0.3;
      // Distribute around the equator with some variation
      const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.8;

      islandConfigs.push({
        theta,
        phi,
        size: 1.5 + Math.random() * 1.0,
        height: 1.2 + Math.random() * 1.5,
        hasVolcano: Math.random() > 0.3,
        hasCity: Math.random() > 0.5,
      });
    }

    // Add smaller islands
    const minorIslandCount = 10;
    for (let i = 0; i < minorIslandCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.PI / 2 + (Math.random() - 0.5) * 1.2;

      islandConfigs.push({
        theta,
        phi,
        size: 0.5 + Math.random() * 0.8,
        height: 0.5 + Math.random() * 0.8,
        hasVolcano: Math.random() > 0.6,
        hasCity: false,
      });
    }

    // Create each island
    islandConfigs.forEach(config => {
      const island = this.createIsland(config);
      this.islands.push(island);
      this.mesh.add(island);
    });
  }

  /**
   * Creates a single volcanic island on the surface
   */
  private createIsland(config: SurfaceIslandConfig): THREE.Group {
    const group = new THREE.Group();

    // Calculate position on the sphere surface
    const x = this.coreRadius * Math.sin(config.phi) * Math.cos(config.theta);
    const y = this.coreRadius * Math.cos(config.phi);
    const z = this.coreRadius * Math.sin(config.phi) * Math.sin(config.theta);

    group.position.set(x, y, z);

    // Orient the island to point outward from the center
    group.lookAt(0, 0, 0);
    group.rotateX(Math.PI / 2);

    // Create the rocky island base
    const islandMesh = this.createIslandMesh(config);
    group.add(islandMesh);

    // Add lava cracks on the island
    this.addLavaCracks(group, config);

    // Add volcano crater if configured
    if (config.hasVolcano) {
      this.addVolcano(group, config);
    }

    // Add city if configured
    if (config.hasCity) {
      this.addCity(group, config);
    }

    return group;
  }

  /**
   * Creates the rocky mesh for an island
   */
  private createIslandMesh(config: SurfaceIslandConfig): THREE.Mesh {
    // Use a cone-like shape that tapers into the lava
    const geometry = new THREE.ConeGeometry(
      config.size,
      config.height,
      16,
      8,
      false
    );

    // Deform for natural rocky look
    const positions = geometry.attributes['position'].array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const px = positions[i];
      const py = positions[i + 1];
      const pz = positions[i + 2];

      // Add noise deformation
      const noise = this.noise3D(px * 1.5, py * 1.5, pz * 1.5);
      const noise2 = this.noise3D(px * 3, py * 3, pz * 3) * 0.3;

      // More deformation at the base
      const baseDeform = (config.height / 2 - py) / config.height;
      const deformAmount = (noise + noise2) * 0.3 * (1 + baseDeform * 0.5);

      positions[i] *= 1 + deformAmount;
      positions[i + 2] *= 1 + deformAmount;

      // Flatten the top slightly for a more plateau-like appearance
      if (py > config.height * 0.35) {
        const flattenFactor = (py - config.height * 0.35) / (config.height * 0.65);
        positions[i + 1] -= flattenFactor * 0.15 * config.height;
      }
    }

    geometry.computeVertexNormals();

    // Very dark volcanic rock
    const material = new THREE.MeshStandardMaterial({
      color: 0x0c0808,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
      emissive: 0x1a0800,
      emissiveIntensity: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Position so base is at origin (sitting on the sphere surface)
    mesh.position.y = config.height * 0.3;

    return mesh;
  }

  /**
   * Adds glowing lava cracks to the island
   */
  private addLavaCracks(parent: THREE.Group, config: SurfaceIslandConfig): void {
    const crackCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < crackCount; i++) {
      const points: THREE.Vector3[] = [];
      const startAngle = Math.random() * Math.PI * 2;
      const segments = 4 + Math.floor(Math.random() * 3);

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle = startAngle + t * Math.PI * 0.5;
        const r = config.size * (0.3 + t * 0.5);
        const h = config.height * (0.1 + t * 0.4);

        points.push(new THREE.Vector3(
          Math.cos(angle) * r + (Math.random() - 0.5) * 0.2,
          h + (Math.random() - 0.5) * 0.1,
          Math.sin(angle) * r + (Math.random() - 0.5) * 0.2
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, 10, 0.03 + Math.random() * 0.02, 6, false);

      const lavaMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.85,
      });

      const crack = new THREE.Mesh(tubeGeometry, lavaMaterial);
      parent.add(crack);
    }

    // Add a subtle glow light
    const glowLight = new THREE.PointLight(0xff3300, 0.3, config.size * 3);
    glowLight.position.set(0, config.height * 0.3, 0);
    parent.add(glowLight);
  }

  /**
   * Adds a volcano crater to the top of the island
   */
  private addVolcano(parent: THREE.Group, config: SurfaceIslandConfig): void {
    // Volcano cone on top
    const volcanoHeight = config.height * 0.5;
    const volcanoGeometry = new THREE.ConeGeometry(
      config.size * 0.4,
      volcanoHeight,
      12,
      6,
      true
    );

    // Deform for natural look
    const positions = volcanoGeometry.attributes['position'].array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const noise = this.noise3D(positions[i] * 3, positions[i + 1] * 3, positions[i + 2] * 3);
      positions[i] *= 1 + noise * 0.15;
      positions[i + 2] *= 1 + noise * 0.15;
    }
    volcanoGeometry.computeVertexNormals();

    const volcanoMaterial = new THREE.MeshStandardMaterial({
      color: 0x100808,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
      emissive: 0x220800,
      emissiveIntensity: 0.15,
    });

    const volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
    volcano.position.y = config.height * 0.5 + volcanoHeight * 0.3;
    parent.add(volcano);

    // Crater glow (lava inside)
    const craterGeometry = new THREE.CircleGeometry(config.size * 0.15, 12);
    const craterMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.9,
    });

    const crater = new THREE.Mesh(craterGeometry, craterMaterial);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = config.height * 0.5 + volcanoHeight * 0.7;
    parent.add(crater);

    // Crater light
    const craterLight = new THREE.PointLight(0xff4400, 0.6, config.size * 4);
    craterLight.position.y = config.height * 0.5 + volcanoHeight * 0.5;
    parent.add(craterLight);

    // Add smoke
    this.addVolcanoSmoke(parent, config, volcanoHeight);
  }

  /**
   * Adds smoke particles to a volcano
   */
  private addVolcanoSmoke(parent: THREE.Group, config: SurfaceIslandConfig, volcanoHeight: number): void {
    const smokeCount = 35;
    const positions = new Float32Array(smokeCount * 3);
    const sizes = new Float32Array(smokeCount);
    const lifetimes = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * config.size * 0.1;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = config.height * 0.5 + volcanoHeight * 0.8 + Math.random() * 1.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      sizes[i] = 0.1 + Math.random() * 0.2;
      lifetimes[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    // Whitish-gray smoke
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
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

          float alpha = (1.0 - dist * 2.0) * 0.3;
          vec3 color = vec3(0.7, 0.68, 0.65);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const smoke = new THREE.Points(geometry, material);
    smoke.userData['smokeMaterial'] = material;
    parent.add(smoke);
  }

  /**
   * Adds simple city buildings to an island
   */
  private addCity(parent: THREE.Group, config: SurfaceIslandConfig): void {
    const buildingCount = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2 + Math.random() * 0.4;
      const dist = config.size * (0.25 + Math.random() * 0.25);

      const buildingHeight = 0.15 + Math.random() * 0.25;
      const buildingWidth = 0.06 + Math.random() * 0.06;

      // Building
      const buildingGeom = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingWidth);
      const buildingMat = new THREE.MeshStandardMaterial({
        color: 0x252530,
        roughness: 0.8,
        metalness: 0.2,
      });

      const building = new THREE.Mesh(buildingGeom, buildingMat);
      building.position.set(
        Math.cos(angle) * dist,
        config.height * 0.45 + buildingHeight / 2,
        Math.sin(angle) * dist
      );
      parent.add(building);

      // Window (bright)
      const windowGeom = new THREE.PlaneGeometry(buildingWidth * 0.5, buildingHeight * 0.25);
      const windowMat = new THREE.MeshBasicMaterial({
        color: 0xffee88,
        transparent: true,
        opacity: 1.0,
      });

      const windowMesh = new THREE.Mesh(windowGeom, windowMat);
      windowMesh.position.copy(building.position);
      windowMesh.position.z += buildingWidth / 2 + 0.001;
      parent.add(windowMesh);

      // Window light
      if (i % 2 === 0) {
        const windowLight = new THREE.PointLight(0xffcc66, 0.2, 0.8);
        windowLight.position.copy(building.position);
        parent.add(windowLight);
      }
    }
  }

  update(time: number, delta: number): void {
    // Update smoke particles
    this.islands.forEach(island => {
      island.traverse(child => {
        if (child instanceof THREE.Points && child.userData['smokeMaterial']) {
          child.userData['smokeMaterial'].uniforms['time'].value = time;
        }
      });
    });
  }

  dispose(): void {
    this.islands.forEach(island => {
      island.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    });
  }
}
