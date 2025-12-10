import * as THREE from 'three';
import { createNoise2D, createNoise3D, NoiseFunction2D, NoiseFunction3D } from 'simplex-noise';
import { PlanetLayer, TartarusConfig } from './magma-core.system';
import {
  AtmosphericScatteringShader,
  AtmosphericHaloShader,
  VolcanicDustShader,
} from '../shaders/atmosphere.shader';

/**
 * TARTARUS PRIME - Advanced Atmosphere System
 *
 * Features:
 * - Rayleigh-Mie atmospheric scattering (volcanic orange/red)
 * - Volumetric dust/ash layers with FBM
 * - Fresnel halo effect at planet edges
 * - Steam/smoke particle systems
 * - Ember particles rising from core
 */

export class AtmosphereSystem implements PlanetLayer {
  name = 'atmosphere';
  mesh: THREE.Group;

  // Main atmosphere layers
  private scatteringMesh!: THREE.Mesh;
  private haloMesh!: THREE.Mesh;
  private dustLayers: THREE.Mesh[] = [];

  // Particle systems
  private steamLayers: THREE.Mesh[] = [];
  private ashParticles!: THREE.Points;
  private emberParticles!: THREE.Points;

  // Materials for updates
  private scatteringMaterial!: THREE.ShaderMaterial;
  private haloMaterial!: THREE.ShaderMaterial;
  private dustMaterials: THREE.ShaderMaterial[] = [];

  private noise2D: NoiseFunction2D;
  private noise3D: NoiseFunction3D;

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();

    this.createAtmosphericScattering();
    this.createAtmosphericHalo();
    this.createVolcanicDustLayers();
    this.createSteamLayers();
    this.createAshParticles();
    this.createEmberParticles();
  }

  /**
   * Creates the main atmospheric scattering sphere
   * Uses Rayleigh-Mie model with volcanic color inversion
   */
  private createAtmosphericScattering(): void {
    const { coreRadius } = this.config;
    const atmosphereRadius = coreRadius * 1.08;

    const geometry = new THREE.SphereGeometry(atmosphereRadius, 64, 64);

    this.scatteringMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(AtmosphericScatteringShader.uniforms),
        uPlanetRadius: { value: coreRadius },
        uAtmosphereRadius: { value: atmosphereRadius },
      },
      vertexShader: AtmosphericScatteringShader.vertexShader,
      fragmentShader: AtmosphericScatteringShader.fragmentShader,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.scatteringMesh = new THREE.Mesh(geometry, this.scatteringMaterial);
    this.mesh.add(this.scatteringMesh);
  }

  /**
   * Creates the outer atmospheric halo (Fresnel glow)
   */
  private createAtmosphericHalo(): void {
    const { coreRadius } = this.config;
    const haloRadius = coreRadius * 1.15;

    const geometry = new THREE.SphereGeometry(haloRadius, 48, 48);

    this.haloMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AtmosphericHaloShader.uniforms),
      vertexShader: AtmosphericHaloShader.vertexShader,
      fragmentShader: AtmosphericHaloShader.fragmentShader,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.haloMesh = new THREE.Mesh(geometry, this.haloMaterial);
    this.mesh.add(this.haloMesh);
  }

  /**
   * Creates volumetric dust layers with FBM noise
   */
  private createVolcanicDustLayers(): void {
    const { coreRadius } = this.config;

    const layerConfigs = [
      { radius: coreRadius * 1.25, density: 0.25 },
      { radius: coreRadius * 1.45, density: 0.18 },
      { radius: coreRadius * 1.7, density: 0.12 },
    ];

    layerConfigs.forEach((cfg) => {
      const geometry = new THREE.SphereGeometry(cfg.radius, 48, 48);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(VolcanicDustShader.uniforms),
          uDensity: { value: cfg.density },
          uCoreRadius: { value: coreRadius },
        },
        vertexShader: VolcanicDustShader.vertexShader,
        fragmentShader: VolcanicDustShader.fragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });

      const mesh = new THREE.Mesh(geometry, material);
      this.dustLayers.push(mesh);
      this.dustMaterials.push(material);
      this.mesh.add(mesh);
    });
  }

  /**
   * Creates whitish-gray smoke/steam layers
   */
  private createSteamLayers(): void {
    const { coreRadius } = this.config;

    const layerConfigs = [
      { radius: coreRadius * 1.35, opacity: 0.12, color: 0x888888, rotationDir: 1 },
      { radius: coreRadius * 1.55, opacity: 0.09, color: 0x999999, rotationDir: -1 },
      { radius: coreRadius * 1.85, opacity: 0.06, color: 0xaaaaaa, rotationDir: 1 },
      { radius: coreRadius * 2.2, opacity: 0.04, color: 0xbbbbbb, rotationDir: -1 },
    ];

    layerConfigs.forEach((layerConfig, index) => {
      const texture = this.createNoiseTexture(512, index);

      const geometry = new THREE.SphereGeometry(layerConfig.radius, 64, 64);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          map: { value: texture },
          color: { value: new THREE.Color(layerConfig.color) },
          opacity: { value: layerConfig.opacity },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPosition;
          varying vec3 vNormal;

          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform sampler2D map;
          uniform vec3 color;
          uniform float opacity;

          varying vec2 vUv;
          varying vec3 vWorldPosition;
          varying vec3 vNormal;

          void main() {
            vec2 uv = vUv;
            uv.x += time * 0.006;
            uv.y += sin(time * 0.35 + vUv.x * 4.0) * 0.012;

            float noise = texture2D(map, uv).a;

            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float viewAngle = abs(dot(vNormal, viewDir));
            float edgeFactor = 1.0 - pow(viewAngle, 0.6);

            float alpha = noise * opacity * (0.4 + edgeFactor * 0.6);
            alpha *= 0.85 + sin(time * 0.5 + vUv.y * 8.0) * 0.15;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });

      const steamMesh = new THREE.Mesh(geometry, material);
      steamMesh.userData = {
        rotationSpeed: 0.00008 * layerConfig.rotationDir * (1 + index * 0.12),
        material,
      };

      this.steamLayers.push(steamMesh);
      this.mesh.add(steamMesh);
    });
  }

  private createNoiseTexture(size: number, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        const ny = y / size;

        let value = 0;
        value += this.noise2D(nx * 4 + seed, ny * 4) * 0.5;
        value += this.noise2D(nx * 8 + seed, ny * 8) * 0.25;
        value += this.noise2D(nx * 16 + seed, ny * 16) * 0.125;
        value += this.noise2D(nx * 32 + seed, ny * 32) * 0.0625;

        value = (value + 1) / 2;
        value = Math.pow(value, 1.3);

        const i = (y * size + x) * 4;
        imageData.data[i] = 255;
        imageData.data[i + 1] = 255;
        imageData.data[i + 2] = 255;
        imageData.data[i + 3] = value * 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
  }

  private createAshParticles(): void {
    const particleCount = 1500;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      this.resetAshParticle(i, positions, sizes, velocities, phases);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x555555) },
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying float vPhase;
        uniform float time;

        void main() {
          vPhase = phase;
          vec3 pos = position;

          pos.x += sin(time * 0.2 + phase * 8.0) * 0.12;
          pos.y += cos(time * 0.12 + phase * 6.0) * 0.08;
          pos.z += sin(time * 0.15 + phase * 10.0) * 0.12;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vPhase;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * 0.35;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.ashParticles = new THREE.Points(geometry, material);
    this.mesh.add(this.ashParticles);
  }

  private resetAshParticle(
    index: number,
    positions: Float32Array,
    sizes: Float32Array,
    velocities: Float32Array,
    phases: Float32Array
  ): void {
    const { coreRadius, atmosphereRadius } = this.config;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = coreRadius * 1.4 + Math.random() * (atmosphereRadius - coreRadius * 1.4) * 0.6;

    const i3 = index * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 4;
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[index] = 0.02 + Math.random() * 0.05;
    phases[index] = Math.random() * Math.PI * 2;

    const tangent = new THREE.Vector3(-positions[i3 + 2], 0, positions[i3]).normalize();
    const speed = 0.006 + Math.random() * 0.012;
    velocities[i3] = tangent.x * speed;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
    velocities[i3 + 2] = tangent.z * speed;
  }

  private createEmberParticles(): void {
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      this.resetEmberParticle(i, positions, sizes, colors, phases);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float phase;
        varying vec3 vColor;
        varying float vPhase;
        uniform float time;

        void main() {
          vColor = color;
          vPhase = phase;

          vec3 pos = position;

          float rise = mod(time * 0.2 + phase * 4.0, 5.0);
          pos.y += rise;

          float spiralAngle = time * 0.35 + phase * 8.0;
          float spiralRadius = rise * 0.06;
          pos.x += cos(spiralAngle) * spiralRadius;
          pos.z += sin(spiralAngle) * spiralRadius;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          float flicker = sin(time * 10.0 + phase * 100.0) * 0.2 + 0.8;
          gl_PointSize = size * flicker * (200.0 / -mvPosition.z);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vPhase;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float glow = 1.0 - dist * 2.0;
          glow = pow(glow, 1.5);

          vec3 color = vColor * (1.0 + glow * 0.3);
          float alpha = glow * 0.9;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.emberParticles = new THREE.Points(geometry, material);
    this.mesh.add(this.emberParticles);
  }

  private resetEmberParticle(
    index: number,
    positions: Float32Array,
    sizes: Float32Array,
    colors: Float32Array,
    phases: Float32Array
  ): void {
    const { coreRadius } = this.config;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = coreRadius * (1.08 + Math.random() * 0.35);

    const i3 = index * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[index] = 0.05 + Math.random() * 0.1;
    phases[index] = Math.random() * Math.PI * 2;

    const colorT = Math.random();
    if (colorT < 0.3) {
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.9 + Math.random() * 0.1;
      colors[i3 + 2] = 0.3 + Math.random() * 0.2;
    } else if (colorT < 0.7) {
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.5 + Math.random() * 0.2;
      colors[i3 + 2] = 0.05;
    } else {
      colors[i3] = 0.9 + Math.random() * 0.1;
      colors[i3 + 1] = 0.2 + Math.random() * 0.15;
      colors[i3 + 2] = 0.0;
    }
  }

  update(time: number, delta: number): void {
    // Update scattering shader
    this.scatteringMaterial.uniforms['time'].value = time;

    // Update halo shader
    this.haloMaterial.uniforms['time'].value = time;

    // Update dust layers
    this.dustMaterials.forEach((mat, i) => {
      mat.uniforms['time'].value = time;
      this.dustLayers[i].rotation.y += 0.0001 * (i % 2 === 0 ? 1 : -1);
    });

    // Rotate steam layers
    this.steamLayers.forEach(layer => {
      layer.rotation.y += layer.userData['rotationSpeed'];
      layer.rotation.x += layer.userData['rotationSpeed'] * 0.2;

      const mat = layer.userData['material'] as THREE.ShaderMaterial;
      mat.uniforms['time'].value = time;
    });

    // Update ash particles
    const ashMat = this.ashParticles.material as THREE.ShaderMaterial;
    ashMat.uniforms['time'].value = time;

    const ashPos = this.ashParticles.geometry.attributes['position'].array as Float32Array;
    const ashVel = this.ashParticles.geometry.attributes['velocity'].array as Float32Array;

    for (let i = 0; i < ashPos.length / 3; i++) {
      const i3 = i * 3;
      ashPos[i3] += ashVel[i3] * delta;
      ashPos[i3 + 1] += ashVel[i3 + 1] * delta;
      ashPos[i3 + 2] += ashVel[i3 + 2] * delta;
    }
    this.ashParticles.geometry.attributes['position'].needsUpdate = true;

    // Update ember particles
    const emberMat = this.emberParticles.material as THREE.ShaderMaterial;
    emberMat.uniforms['time'].value = time;
  }

  dispose(): void {
    this.scatteringMesh.geometry.dispose();
    this.scatteringMaterial.dispose();

    this.haloMesh.geometry.dispose();
    this.haloMaterial.dispose();

    this.dustLayers.forEach((mesh, i) => {
      mesh.geometry.dispose();
      this.dustMaterials[i].dispose();
    });

    this.steamLayers.forEach(layer => {
      layer.geometry.dispose();
      (layer.material as THREE.Material).dispose();
    });

    this.ashParticles.geometry.dispose();
    (this.ashParticles.material as THREE.Material).dispose();

    this.emberParticles.geometry.dispose();
    (this.emberParticles.material as THREE.Material).dispose();
  }
}
