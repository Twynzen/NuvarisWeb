import * as THREE from 'three';
import { createNoise3D, NoiseFunction3D } from 'simplex-noise';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

interface IslandConfig {
  position: THREE.Vector3;
  radius: number;
  height: number;
  hasVolcano: boolean;
  rotationSpeed: number;
  orbitSpeed: number;
  orbitRadius: number;
  orbitAngle: number;
}

class VolcanicIsland {
  private group: THREE.Group;
  private baseMesh!: THREE.Mesh;
  private volcanoMesh?: THREE.Mesh;
  private lavaMaterial?: THREE.ShaderMaterial;
  private lavaCracks: THREE.Mesh[] = [];
  private config: IslandConfig;
  private noise3D: NoiseFunction3D;

  constructor(config: IslandConfig) {
    this.config = config;
    this.noise3D = createNoise3D();
    this.group = new THREE.Group();
    this.group.position.copy(config.position);

    this.createBase();
    this.addLavaCracks();

    if (config.hasVolcano) {
      this.createVolcano();
    }
  }

  private createBase(): void {
    const segments = 32;
    const geometry = new THREE.CylinderGeometry(
      this.config.radius * 0.7,
      this.config.radius * 1.3,
      this.config.height,
      segments,
      12,
      false
    );

    // Deform vertices for natural look
    const positions = geometry.attributes['position'].array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Use noise for deformation
      const noiseVal = this.noise3D(x * 0.5, y * 0.5, z * 0.5);
      const deform = noiseVal * 0.4;

      positions[i] *= 1 + deform;
      positions[i + 2] *= 1 + deform;

      // Bottom part more irregular (rock roots)
      if (y < 0) {
        const rootNoise = this.noise3D(x * 2, y * 3, z * 2);
        positions[i + 1] += rootNoise * 0.8;

        // Add stalactite-like formations
        const stalactite = Math.pow(Math.max(rootNoise, 0), 2) * 1.5;
        positions[i + 1] -= stalactite;
      }

      // Top surface variation
      if (y > this.config.height * 0.4) {
        const topNoise = this.noise3D(x * 0.8, y * 0.3, z * 0.8);
        positions[i + 1] += topNoise * 0.3;
      }
    }

    geometry.computeVertexNormals();

    // Volcanic rock material with subtle glow
    const material = new THREE.MeshStandardMaterial({
      color: 0x2d2d3a,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
      emissive: 0x1a0800,
      emissiveIntensity: 0.15,
    });

    this.baseMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.baseMesh);

    // Add surface details
    this.addSurfaceDetails();
  }

  private addSurfaceDetails(): void {
    // Add some rock formations on top
    const rockCount = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = this.config.radius * (0.3 + Math.random() * 0.4);

      const rockGeom = new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.25, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true,
      });

      const rock = new THREE.Mesh(rockGeom, rockMat);
      rock.position.set(
        Math.cos(angle) * dist,
        this.config.height * 0.5 + Math.random() * 0.2,
        Math.sin(angle) * dist
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.scale.setScalar(0.8 + Math.random() * 0.4);

      this.group.add(rock);
    }
  }

  private addLavaCracks(): void {
    const crackCount = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < crackCount; i++) {
      const startAngle = Math.random() * Math.PI * 2;
      const endAngle = startAngle + (Math.random() - 0.5) * 1.5;

      const points: THREE.Vector3[] = [];
      const segments = 4 + Math.floor(Math.random() * 3);

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle = startAngle + (endAngle - startAngle) * t;
        const r = this.config.radius * (0.4 + Math.random() * 0.4);
        const h = -this.config.height * (0.1 + Math.random() * 0.3);

        points.push(new THREE.Vector3(
          Math.cos(angle) * r + (Math.random() - 0.5) * 0.2,
          h + (Math.random() - 0.5) * 0.1,
          Math.sin(angle) * r + (Math.random() - 0.5) * 0.2
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, 12, 0.04 + Math.random() * 0.03, 6, false);

      const tubeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.85,
      });

      const crack = new THREE.Mesh(tubeGeometry, tubeMaterial);
      this.lavaCracks.push(crack);
      this.group.add(crack);
    }
  }

  private createVolcano(): void {
    const volcanoHeight = this.config.height * 1.8;
    const volcanoGeometry = new THREE.ConeGeometry(
      this.config.radius * 0.65,
      volcanoHeight,
      24,
      12,
      true
    );

    // Create crater by opening the tip
    const positions = volcanoGeometry.attributes['position'].array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const x = positions[i];
      const z = positions[i + 2];

      // Add noise to surface
      const noise = this.noise3D(x * 2, y * 2, z * 2) * 0.15;
      positions[i] *= 1 + noise;
      positions[i + 2] *= 1 + noise;

      if (y > volcanoHeight * 0.35) {
        // Create crater opening
        const craterFactor = 0.25 + ((y / volcanoHeight) - 0.35) * 0.8;
        positions[i] *= craterFactor;
        positions[i + 2] *= craterFactor;
      }
    }

    volcanoGeometry.computeVertexNormals();

    const volcanoMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.95,
      metalness: 0.05,
      emissive: 0x220800,
      emissiveIntensity: 0.25,
      flatShading: true,
    });

    this.volcanoMesh = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
    this.volcanoMesh.position.y = this.config.height * 0.4;
    this.group.add(this.volcanoMesh);

    // Add lava in crater
    this.addCraterLava();

    // Add smoke particles
    this.addVolcanoSmoke();
  }

  private addCraterLava(): void {
    const lavaGeometry = new THREE.CircleGeometry(this.config.radius * 0.2, 24);

    this.lavaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0xff4400) },
        color2: { value: new THREE.Color(0xffff00) },
        color3: { value: new THREE.Color(0xff2200) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;

        // Simple noise function
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);

          // Animated lava pattern
          float n1 = noise(vUv * 8.0 + time * 0.5);
          float n2 = noise(vUv * 16.0 - time * 0.3);
          float pattern = n1 * 0.6 + n2 * 0.4;

          // Bubbling effect
          float bubble = sin(time * 4.0 + dist * 15.0 + pattern * 10.0) * 0.5 + 0.5;

          // Color mixing
          vec3 color = mix(color1, color2, pattern);
          color = mix(color, color3, bubble * 0.3);

          // Brighter center
          float centerGlow = 1.0 - smoothstep(0.0, 0.4, dist);
          color = mix(color, color2, centerGlow * 0.5);

          // Edge fade
          float alpha = 1.0 - smoothstep(0.35, 0.5, dist);

          // Pulsing
          alpha *= 0.85 + sin(time * 2.0) * 0.15;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const lavaMesh = new THREE.Mesh(lavaGeometry, this.lavaMaterial);
    lavaMesh.rotation.x = -Math.PI / 2;
    lavaMesh.position.y = this.config.height * 1.35;
    this.group.add(lavaMesh);
  }

  private addVolcanoSmoke(): void {
    const smokeCount = 50;
    const positions = new Float32Array(smokeCount * 3);
    const sizes = new Float32Array(smokeCount);
    const lifetimes = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this.config.radius * 0.15;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = this.config.height * 1.4 + Math.random() * 2;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      sizes[i] = 0.2 + Math.random() * 0.3;
      lifetimes[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

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
          // Rising motion
          pos.y += mod(time * 0.5 + lifetime * 5.0, 3.0);
          // Drift
          pos.x += sin(time + lifetime * 10.0) * 0.3;
          pos.z += cos(time * 0.7 + lifetime * 8.0) * 0.3;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * 0.4;
          vec3 color = vec3(0.3, 0.3, 0.35);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const smoke = new THREE.Points(geometry, material);
    smoke.userData = { material };
    this.group.add(smoke);
  }

  update(time: number, delta: number): void {
    // Orbit around core
    this.config.orbitAngle += this.config.orbitSpeed * delta;
    this.group.position.x = Math.cos(this.config.orbitAngle) * this.config.orbitRadius;
    this.group.position.z = Math.sin(this.config.orbitAngle) * this.config.orbitRadius;

    // Slow rotation
    this.group.rotation.y += this.config.rotationSpeed * delta;

    // Floating motion
    this.group.position.y = this.config.position.y + Math.sin(time + this.config.orbitAngle) * 0.15;

    // Update crater lava
    if (this.lavaMaterial) {
      this.lavaMaterial.uniforms['time'].value = time;
    }

    // Update smoke
    this.group.children.forEach(child => {
      if (child instanceof THREE.Points && child.userData.material) {
        child.userData.material.uniforms['time'].value = time;
      }
    });

    // Pulse lava cracks
    const pulse = 0.7 + Math.sin(time * 3) * 0.3;
    this.lavaCracks.forEach(crack => {
      (crack.material as THREE.MeshBasicMaterial).opacity = pulse * 0.85;
    });
  }

  getObject(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.baseMesh.geometry.dispose();
    (this.baseMesh.material as THREE.Material).dispose();

    if (this.volcanoMesh) {
      this.volcanoMesh.geometry.dispose();
      (this.volcanoMesh.material as THREE.Material).dispose();
    }

    this.lavaCracks.forEach(crack => {
      crack.geometry.dispose();
      (crack.material as THREE.Material).dispose();
    });

    this.lavaMaterial?.dispose();
  }
}

export class VolcanicIslandsSystem implements PlanetLayer {
  name = 'islands';
  mesh: THREE.Group;

  private islands: VolcanicIsland[] = [];

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.generateIslands();
  }

  private generateIslands(): void {
    const { islandCount, coreRadius, atmosphereRadius } = this.config;

    // Create multiple orbital rings of islands
    const rings = [
      { count: Math.floor(islandCount * 0.4), minRadius: coreRadius * 1.6, maxRadius: coreRadius * 2.2 },
      { count: Math.floor(islandCount * 0.35), minRadius: coreRadius * 2.4, maxRadius: coreRadius * 3.0 },
      { count: Math.floor(islandCount * 0.25), minRadius: coreRadius * 3.2, maxRadius: atmosphereRadius * 0.7 },
    ];

    rings.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + Math.random() * 0.4;
        const orbitRadius = ring.minRadius + Math.random() * (ring.maxRadius - ring.minRadius);
        const verticalOffset = (Math.random() - 0.5) * 4;

        const islandConfig: IslandConfig = {
          position: new THREE.Vector3(
            Math.cos(angle) * orbitRadius,
            verticalOffset,
            Math.sin(angle) * orbitRadius
          ),
          radius: 0.8 + Math.random() * 2.5,
          height: 0.4 + Math.random() * 1.8,
          hasVolcano: Math.random() > 0.55,
          rotationSpeed: (0.05 + Math.random() * 0.1) * (Math.random() > 0.5 ? 1 : -1),
          orbitSpeed: (0.02 + Math.random() * 0.04) * (ringIndex % 2 === 0 ? 1 : -1),
          orbitRadius,
          orbitAngle: angle,
        };

        const island = new VolcanicIsland(islandConfig);
        this.islands.push(island);
        this.mesh.add(island.getObject());
      }
    });
  }

  update(time: number, delta: number): void {
    this.islands.forEach(island => island.update(time, delta));
  }

  dispose(): void {
    this.islands.forEach(island => island.dispose());
  }
}
