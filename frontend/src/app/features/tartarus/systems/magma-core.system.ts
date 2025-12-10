import * as THREE from 'three';
import { MagmaShader, GlowShader } from '../shaders/magma.shader';

export interface TartarusConfig {
  coreRadius: number;
  atmosphereRadius: number;
  islandCount: number;
  volcanoCount: number;
  creatureCount: number;
  cityDensity: number;
}

export interface PlanetLayer {
  name: string;
  mesh: THREE.Object3D;
  update: (time: number, delta: number) => void;
  dispose: () => void;
}

export class MagmaCoreSystem implements PlanetLayer {
  name = 'magmaCore';
  mesh: THREE.Group;

  private coreMesh!: THREE.Mesh;
  private glowMeshes: THREE.Mesh[] = [];
  private material!: THREE.ShaderMaterial;
  private eruptionParticles!: THREE.Points;
  private eruptionMaterial!: THREE.ShaderMaterial;

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.createCore();
    this.createGlowLayers();
    this.createEruptionSystem();
  }

  private createCore(): void {
    const geometry = new THREE.IcosahedronGeometry(this.config.coreRadius, 64);

    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MagmaShader.uniforms),
      vertexShader: MagmaShader.vertexShader,
      fragmentShader: MagmaShader.fragmentShader,
    });

    this.coreMesh = new THREE.Mesh(geometry, this.material);
    this.mesh.add(this.coreMesh);
  }

  private createGlowLayers(): void {
    const glowConfigs = [
      { radius: this.config.coreRadius * 1.05, color: 0xff6600, opacity: 0.4, falloff: 2.5 },
      { radius: this.config.coreRadius * 1.15, color: 0xff4400, opacity: 0.25, falloff: 2.0 },
      { radius: this.config.coreRadius * 1.3, color: 0xff2200, opacity: 0.15, falloff: 1.5 },
      { radius: this.config.coreRadius * 1.5, color: 0x880000, opacity: 0.08, falloff: 1.2 },
    ];

    glowConfigs.forEach(config => {
      const geometry = new THREE.SphereGeometry(config.radius, 48, 48);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(GlowShader.uniforms),
          glowColor: { value: new THREE.Color(config.color) },
          intensity: { value: config.opacity * 3 },
          falloff: { value: config.falloff },
        },
        vertexShader: GlowShader.vertexShader,
        fragmentShader: GlowShader.fragmentShader,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const glowMesh = new THREE.Mesh(geometry, material);
      this.glowMeshes.push(glowMesh);
      this.mesh.add(glowMesh);
    });
  }

  private createEruptionSystem(): void {
    const particleCount = 3000;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      this.resetParticle(i, positions, velocities, lifetimes, sizes, colors);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.eruptionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float lifetime;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vLifetime;

        void main() {
          vColor = color;
          vLifetime = lifetime;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z) * lifetime;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * vLifetime * 0.9;
          vec3 color = vColor * (1.0 + (1.0 - vLifetime) * 0.5);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.eruptionParticles = new THREE.Points(geometry, this.eruptionMaterial);
    this.mesh.add(this.eruptionParticles);
  }

  private resetParticle(
    index: number,
    positions: Float32Array,
    velocities: Float32Array,
    lifetimes: Float32Array,
    sizes: Float32Array,
    colors: Float32Array
  ): void {
    const i3 = index * 3;

    // Starting position on core surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = this.config.coreRadius * (1.0 + Math.random() * 0.1);

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    // Outward velocity with some variation
    const speed = 0.3 + Math.random() * 1.2;
    const normal = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]).normalize();

    // Add some tangential velocity
    const tangent = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).cross(normal).normalize().multiplyScalar(0.3);

    velocities[i3] = normal.x * speed + tangent.x;
    velocities[i3 + 1] = normal.y * speed + tangent.y;
    velocities[i3 + 2] = normal.z * speed + tangent.z;

    lifetimes[index] = Math.random();
    sizes[index] = 0.1 + Math.random() * 0.4;

    // Color gradient from yellow to red to dark
    const colorT = Math.random();
    if (colorT < 0.3) {
      // Yellow/white (hottest)
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.9 + Math.random() * 0.1;
      colors[i3 + 2] = 0.3 + Math.random() * 0.4;
    } else if (colorT < 0.7) {
      // Orange
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.4 + Math.random() * 0.3;
      colors[i3 + 2] = 0.0;
    } else {
      // Red
      colors[i3] = 0.8 + Math.random() * 0.2;
      colors[i3 + 1] = 0.1 + Math.random() * 0.2;
      colors[i3 + 2] = 0.0;
    }
  }

  update(time: number, delta: number): void {
    // Update core shader
    this.material.uniforms['time'].value = time;

    // Pulse glow layers
    const pulse = 1 + Math.sin(time * 2) * 0.05;
    this.glowMeshes.forEach((glow, i) => {
      const mat = glow.material as THREE.ShaderMaterial;
      mat.uniforms['time'].value = time;
      glow.scale.setScalar(pulse * (1 + i * 0.01));
    });

    // Update eruption particles
    this.updateEruptionParticles(time, delta);
  }

  private updateEruptionParticles(time: number, delta: number): void {
    const positions = this.eruptionParticles.geometry.attributes['position'].array as Float32Array;
    const velocities = this.eruptionParticles.geometry.attributes['velocity'].array as Float32Array;
    const lifetimes = this.eruptionParticles.geometry.attributes['lifetime'].array as Float32Array;
    const sizes = this.eruptionParticles.geometry.attributes['size'].array as Float32Array;
    const colors = this.eruptionParticles.geometry.attributes['color'].array as Float32Array;

    for (let i = 0; i < lifetimes.length; i++) {
      lifetimes[i] -= delta * 0.4;

      if (lifetimes[i] <= 0) {
        this.resetParticle(i, positions, velocities, lifetimes, sizes, colors);
      } else {
        const i3 = i * 3;

        // Update position
        positions[i3] += velocities[i3] * delta;
        positions[i3 + 1] += velocities[i3 + 1] * delta;
        positions[i3 + 2] += velocities[i3 + 2] * delta;

        // Gravity towards core
        const dist = Math.sqrt(
          positions[i3] ** 2 +
          positions[i3 + 1] ** 2 +
          positions[i3 + 2] ** 2
        );

        const gravity = 0.08;
        velocities[i3] -= (positions[i3] / dist) * gravity * delta;
        velocities[i3 + 1] -= (positions[i3 + 1] / dist) * gravity * delta;
        velocities[i3 + 2] -= (positions[i3 + 2] / dist) * gravity * delta;

        // Slow down over time
        velocities[i3] *= 0.998;
        velocities[i3 + 1] *= 0.998;
        velocities[i3 + 2] *= 0.998;

        // Color fades to darker as lifetime decreases
        const fade = lifetimes[i];
        colors[i3] *= 0.999;
        colors[i3 + 1] *= 0.995;
      }
    }

    this.eruptionParticles.geometry.attributes['position'].needsUpdate = true;
    this.eruptionParticles.geometry.attributes['lifetime'].needsUpdate = true;
    this.eruptionParticles.geometry.attributes['color'].needsUpdate = true;

    this.eruptionMaterial.uniforms['time'].value = time;
  }

  dispose(): void {
    this.coreMesh.geometry.dispose();
    (this.coreMesh.material as THREE.Material).dispose();

    this.glowMeshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });

    this.eruptionParticles.geometry.dispose();
    this.eruptionMaterial.dispose();
  }
}
