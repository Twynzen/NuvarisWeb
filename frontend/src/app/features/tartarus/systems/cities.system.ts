import * as THREE from 'three';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

type BuildingType = 'tower' | 'factory' | 'dome' | 'chimney' | 'house';

interface BuildingConfig {
  type: BuildingType;
  position: THREE.Vector3;
  scale: number;
  rotation: number;
}

class SteampunkBuilding {
  private group: THREE.Group;
  private lights: THREE.PointLight[] = [];
  private smokeSystems: { particles: THREE.Points; material: THREE.ShaderMaterial }[] = [];
  private gears: THREE.Mesh[] = [];
  private config: BuildingConfig;

  constructor(config: BuildingConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.position.copy(config.position);
    this.group.rotation.y = config.rotation;
    this.group.scale.setScalar(config.scale);

    this.build();
  }

  private build(): void {
    switch (this.config.type) {
      case 'tower':
        this.buildTower();
        break;
      case 'factory':
        this.buildFactory();
        break;
      case 'dome':
        this.buildDome();
        break;
      case 'chimney':
        this.buildChimney();
        break;
      case 'house':
        this.buildHouse();
        break;
    }
  }

  private getMaterial(type: 'stone' | 'metal' | 'copper' | 'rust'): THREE.MeshStandardMaterial {
    const materials: Record<string, THREE.MeshStandardMaterialParameters> = {
      stone: { color: 0x3d3d4a, roughness: 0.9, metalness: 0.1 },
      metal: { color: 0x434343, roughness: 0.7, metalness: 0.4 },
      copper: { color: 0xb87333, roughness: 0.4, metalness: 0.7 },
      rust: { color: 0x8b4513, roughness: 0.85, metalness: 0.2 },
    };

    return new THREE.MeshStandardMaterial(materials[type]);
  }

  private buildTower(): void {
    const stoneMat = this.getMaterial('stone');
    const copperMat = this.getMaterial('copper');

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8);
    const base = new THREE.Mesh(baseGeometry, stoneMat);
    base.position.y = 0.6;
    this.group.add(base);

    // Tower sections
    for (let i = 0; i < 3; i++) {
      const radius = 0.3 - i * 0.04;
      const sectionGeometry = new THREE.CylinderGeometry(radius - 0.02, radius, 0.7, 8);
      const section = new THREE.Mesh(sectionGeometry, stoneMat.clone());
      section.position.y = 1.55 + i * 0.7;
      this.group.add(section);

      // Platform ring
      const platformGeometry = new THREE.TorusGeometry(radius + 0.05, 0.03, 6, 16);
      const platform = new THREE.Mesh(platformGeometry, copperMat.clone());
      platform.rotation.x = Math.PI / 2;
      platform.position.y = 1.2 + i * 0.7;
      this.group.add(platform);
    }

    // Dome top
    const domeGeometry = new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeometry, copperMat);
    dome.position.y = 3.65;
    this.group.add(dome);

    // Spire
    const spireGeometry = new THREE.ConeGeometry(0.04, 0.4, 6);
    const spire = new THREE.Mesh(spireGeometry, copperMat.clone());
    spire.position.y = 4.0;
    this.group.add(spire);

    // Windows
    this.addWindows(0.36, 0.6, 6);
    this.addWindows(0.28, 1.8, 5);
    this.addWindows(0.24, 2.5, 4);

    // Top light
    this.addLight(new THREE.Vector3(0, 3.7, 0), 0xffcc66, 0.6, 3);
  }

  private buildFactory(): void {
    const stoneMat = this.getMaterial('stone');
    const metalMat = this.getMaterial('metal');
    const rustMat = this.getMaterial('rust');

    // Main building
    const mainGeometry = new THREE.BoxGeometry(1.2, 0.9, 0.7);
    const main = new THREE.Mesh(mainGeometry, stoneMat);
    main.position.y = 0.45;
    this.group.add(main);

    // Roof
    const roofGeometry = new THREE.BoxGeometry(1.3, 0.1, 0.8);
    const roof = new THREE.Mesh(roofGeometry, metalMat);
    roof.position.y = 0.95;
    this.group.add(roof);

    // Peaked roof section
    const peakGeometry = new THREE.CylinderGeometry(0, 0.5, 0.35, 4);
    peakGeometry.rotateY(Math.PI / 4);
    const peak = new THREE.Mesh(peakGeometry, rustMat);
    peak.scale.set(1.3, 1, 0.6);
    peak.position.y = 1.17;
    this.group.add(peak);

    // Chimneys
    for (let i = 0; i < 3; i++) {
      const chimney = this.createChimney(0.08 + Math.random() * 0.04, 0.6 + Math.random() * 0.4);
      chimney.position.set(-0.35 + i * 0.35, 1.0, -0.2);
      this.group.add(chimney);
    }

    // Windows
    this.addFactoryWindows();

    // Gears
    this.addGear(new THREE.Vector3(0.65, 0.4, 0), 0.15);
    this.addGear(new THREE.Vector3(0.65, 0.6, 0), 0.1);

    // Pipes
    this.addPipes();
  }

  private buildDome(): void {
    const stoneMat = this.getMaterial('stone');
    const copperMat = this.getMaterial('copper');

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.55, 0.6, 0.35, 16);
    const base = new THREE.Mesh(baseGeometry, stoneMat);
    base.position.y = 0.175;
    this.group.add(base);

    // Glass dome
    const domeGeometry = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaccff,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.6,
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.35;
    this.group.add(dome);

    // Dome frame ribs
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ribGeometry = new THREE.TorusGeometry(0.5, 0.015, 6, 16, Math.PI);
      const rib = new THREE.Mesh(ribGeometry, copperMat.clone());
      rib.rotation.y = angle;
      rib.rotation.x = Math.PI / 2;
      rib.position.y = 0.35;
      this.group.add(rib);
    }

    // Base ring
    const ringGeometry = new THREE.TorusGeometry(0.52, 0.025, 8, 32);
    const ring = new THREE.Mesh(ringGeometry, copperMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;
    this.group.add(ring);

    // Interior light
    this.addLight(new THREE.Vector3(0, 0.5, 0), 0xffcc66, 1.0, 2.5);
  }

  private buildChimney(): void {
    const chimney = this.createChimney(0.18, 1.8);
    this.group.add(chimney);
  }

  private buildHouse(): void {
    const stoneMat = this.getMaterial('stone');
    const rustMat = this.getMaterial('rust');

    // Main structure
    const mainGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.5);
    const main = new THREE.Mesh(mainGeometry, stoneMat);
    main.position.y = 0.25;
    this.group.add(main);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(0.5, 0.35, 4);
    roofGeometry.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeometry, rustMat);
    roof.position.y = 0.67;
    this.group.add(roof);

    // Chimney
    const chimney = this.createChimney(0.06, 0.4);
    chimney.position.set(0.15, 0.6, 0.1);
    this.group.add(chimney);

    // Door
    const doorGeometry = new THREE.BoxGeometry(0.12, 0.2, 0.02);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.1, 0.26);
    this.group.add(door);

    // Windows
    this.addSmallWindow(new THREE.Vector3(-0.15, 0.3, 0.26));
    this.addSmallWindow(new THREE.Vector3(0.15, 0.3, 0.26));
  }

  private createChimney(radius: number, height: number): THREE.Group {
    const chimneyGroup = new THREE.Group();
    const metalMat = this.getMaterial('metal');

    // Main tube
    const tubeGeometry = new THREE.CylinderGeometry(radius * 0.85, radius, height, 8);
    const tube = new THREE.Mesh(tubeGeometry, metalMat);
    tube.position.y = height / 2;
    chimneyGroup.add(tube);

    // Rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(radius, radius * 0.15, 6, 12);
      const ring = new THREE.Mesh(ringGeometry, metalMat.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.y = height * 0.2 + i * (height * 0.35);
      chimneyGroup.add(ring);
    }

    // Crown
    const crownGeometry = new THREE.CylinderGeometry(radius * 1.1, radius * 0.9, height * 0.08, 8);
    const crown = new THREE.Mesh(crownGeometry, metalMat.clone());
    crown.position.y = height + height * 0.04;
    chimneyGroup.add(crown);

    // Smoke system
    this.addSmokeToChimney(chimneyGroup, radius, height);

    return chimneyGroup;
  }

  private addSmokeToChimney(parent: THREE.Group, radius: number, height: number): void {
    const particleCount = 60;
    const positions = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.5;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = height + Math.random() * 1.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      lifetimes[i] = Math.random();
      sizes[i] = 0.08 + Math.random() * 0.12;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseY: { value: height },
      },
      vertexShader: `
        attribute float lifetime;
        attribute float size;
        varying float vLifetime;
        uniform float time;
        uniform float baseY;

        void main() {
          vLifetime = lifetime;

          vec3 pos = position;
          float t = mod(time * 0.4 + lifetime * 3.0, 2.5);
          pos.y = baseY + t;
          pos.x += sin(time + lifetime * 10.0) * t * 0.15;
          pos.z += cos(time * 0.7 + lifetime * 8.0) * t * 0.15;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float fadeIn = smoothstep(0.0, 0.3, t);
          float fadeOut = 1.0 - smoothstep(1.5, 2.5, t);
          gl_PointSize = size * fadeIn * fadeOut * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * 0.35;
          vec3 color = vec3(0.35, 0.35, 0.38);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const smoke = new THREE.Points(geometry, material);
    this.smokeSystems.push({ particles: smoke, material });
    parent.add(smoke);
  }

  private addWindows(radius: number, yPos: number, count: number): void {
    const windowGeometry = new THREE.PlaneGeometry(0.06, 0.1);
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const window = new THREE.Mesh(windowGeometry, windowMaterial.clone());

      window.position.set(
        Math.cos(angle) * (radius + 0.01),
        yPos,
        Math.sin(angle) * (radius + 0.01)
      );
      window.lookAt(0, yPos, 0);
      window.rotateY(Math.PI);

      this.group.add(window);
    }
  }

  private addFactoryWindows(): void {
    const windowGeometry = new THREE.PlaneGeometry(0.15, 0.12);
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.85,
    });

    // Front windows
    for (let i = 0; i < 4; i++) {
      const window = new THREE.Mesh(windowGeometry, windowMaterial.clone());
      window.position.set(-0.4 + i * 0.27, 0.5, 0.36);
      this.group.add(window);
    }

    // Side windows
    for (let i = 0; i < 2; i++) {
      const window = new THREE.Mesh(windowGeometry, windowMaterial.clone());
      window.position.set(0.61, 0.5, -0.15 + i * 0.3);
      window.rotation.y = Math.PI / 2;
      this.group.add(window);
    }
  }

  private addSmallWindow(position: THREE.Vector3): void {
    const windowGeometry = new THREE.PlaneGeometry(0.08, 0.08);
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.9,
    });
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.copy(position);
    this.group.add(window);
  }

  private addGear(position: THREE.Vector3, radius: number): void {
    const copperMat = this.getMaterial('copper');

    // Gear body
    const gearGeometry = new THREE.CylinderGeometry(radius, radius, 0.02, 12);
    const gear = new THREE.Mesh(gearGeometry, copperMat);
    gear.rotation.x = Math.PI / 2;
    gear.position.copy(position);

    // Teeth (simplified as small boxes)
    const toothCount = 8;
    for (let i = 0; i < toothCount; i++) {
      const angle = (i / toothCount) * Math.PI * 2;
      const toothGeometry = new THREE.BoxGeometry(0.02, radius * 0.3, 0.02);
      const tooth = new THREE.Mesh(toothGeometry, copperMat.clone());
      tooth.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
      tooth.rotation.z = angle;
      gear.add(tooth);
    }

    this.gears.push(gear);
    this.group.add(gear);
  }

  private addPipes(): void {
    const metalMat = this.getMaterial('metal');

    // Horizontal pipe
    const pipeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
    pipeGeometry.rotateZ(Math.PI / 2);
    const pipe = new THREE.Mesh(pipeGeometry, metalMat);
    pipe.position.set(0, 0.2, -0.4);
    this.group.add(pipe);

    // Pipe joints
    const jointGeometry = new THREE.SphereGeometry(0.045, 8, 8);
    [-0.4, 0.4].forEach(x => {
      const joint = new THREE.Mesh(jointGeometry, metalMat.clone());
      joint.position.set(x, 0.2, -0.4);
      this.group.add(joint);
    });

    // Vertical pipe segment
    const vPipeGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8);
    const vPipe = new THREE.Mesh(vPipeGeometry, metalMat.clone());
    vPipe.position.set(-0.4, 0.35, -0.4);
    this.group.add(vPipe);
  }

  private addLight(position: THREE.Vector3, color: number, intensity: number, distance: number): void {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.copy(position);
    this.lights.push(light);
    this.group.add(light);
  }

  update(time: number, delta: number): void {
    // Flicker lights
    this.lights.forEach((light, i) => {
      const flicker = 0.8 + Math.sin(time * 8 + i * 2) * 0.1 + Math.random() * 0.1;
      light.intensity = light.userData.baseIntensity !== undefined
        ? light.userData.baseIntensity * flicker
        : 0.6 * flicker;
    });

    // Update smoke
    this.smokeSystems.forEach(smoke => {
      smoke.material.uniforms['time'].value = time;
    });

    // Rotate gears
    this.gears.forEach((gear, i) => {
      gear.rotation.z += delta * (i % 2 === 0 ? 1 : -1) * 0.8;
    });
  }

  getObject(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.lights.forEach(light => light.dispose());
    this.smokeSystems.forEach(smoke => smoke.material.dispose());
  }
}

export class CitiesSystem implements PlanetLayer {
  name = 'cities';
  mesh: THREE.Group;

  private buildings: SteampunkBuilding[] = [];

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.createCities();
  }

  private createCities(): void {
    const { coreRadius, cityDensity } = this.config;
    const buildingTypes: BuildingType[] = ['tower', 'factory', 'dome', 'chimney', 'house'];

    // Create building clusters at various positions around the planet
    const clusterCount = Math.floor(8 * cityDensity);

    for (let c = 0; c < clusterCount; c++) {
      const clusterAngle = (c / clusterCount) * Math.PI * 2 + Math.random() * 0.3;
      const clusterRadius = coreRadius * (1.8 + Math.random() * 1.2);
      const clusterY = (Math.random() - 0.5) * 5;

      const clusterCenter = new THREE.Vector3(
        Math.cos(clusterAngle) * clusterRadius,
        clusterY,
        Math.sin(clusterAngle) * clusterRadius
      );

      // Buildings in this cluster
      const buildingCount = 3 + Math.floor(Math.random() * 5 * cityDensity);

      for (let i = 0; i < buildingCount; i++) {
        const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 2
        );

        const config: BuildingConfig = {
          type,
          position: clusterCenter.clone().add(offset),
          scale: 0.3 + Math.random() * 0.4,
          rotation: Math.random() * Math.PI * 2,
        };

        const building = new SteampunkBuilding(config);
        this.buildings.push(building);
        this.mesh.add(building.getObject());
      }
    }
  }

  update(time: number, delta: number): void {
    this.buildings.forEach(building => building.update(time, delta));
  }

  dispose(): void {
    this.buildings.forEach(building => building.dispose());
  }
}
