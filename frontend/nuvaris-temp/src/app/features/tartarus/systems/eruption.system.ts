import * as THREE from 'three';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

/**
 * TARTARUS PRIME - Eruption System
 *
 * Features:
 * - GPU particle system with parabolic physics
 * - Volcanic bombs (large projectiles)
 * - Pyroclastic particles (ash/debris)
 * - Event-driven eruption sequences
 * - Screen shake integration
 */

interface EruptionEvent {
  type: 'start' | 'peak' | 'end';
  intensity: number;
  position: THREE.Vector3;
  time: number;
}

interface VolcanicBomb {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  trail: THREE.Points;
}

export class EruptionSystem implements PlanetLayer {
  name = 'eruptions';
  mesh: THREE.Group;

  // Eruption particles (GPU)
  private eruptionParticles!: THREE.Points;
  private particleMaterial!: THREE.ShaderMaterial;
  private particleCount = 2000;

  // Volcanic bombs (larger projectiles)
  private bombs: VolcanicBomb[] = [];
  private maxBombs = 20;

  // Pyroclastic flow particles
  private pyroclasticParticles!: THREE.Points;
  private pyroclasticMaterial!: THREE.ShaderMaterial;

  // Event system
  private events: EruptionEvent[] = [];
  private currentIntensity = 0.3;
  private targetIntensity = 0.3;

  // Materials
  private bombMaterial!: THREE.MeshStandardMaterial;
  private trailMaterial!: THREE.ShaderMaterial;

  // Screen shake callback
  private onScreenShake?: (intensity: number) => void;

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.initializeMaterials();
    this.createEruptionParticles();
    this.createPyroclasticParticles();
  }

  setScreenShakeCallback(callback: (intensity: number) => void): void {
    this.onScreenShake = callback;
  }

  private initializeMaterials(): void {
    // Volcanic bomb material
    this.bombMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0800,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0xff3300,
      emissiveIntensity: 0.8,
    });

    // Trail material for bombs
    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;

        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float glow = 1.0 - dist * 2.0;
          vec3 color = vec3(1.0, 0.5, 0.1) * glow;
          gl_FragColor = vec4(color, vAlpha * glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  private createEruptionParticles(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);
    const lifetimes = new Float32Array(this.particleCount);
    const sizes = new Float32Array(this.particleCount);
    const colors = new Float32Array(this.particleCount * 3);
    const origins = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, positions, velocities, lifetimes, sizes, colors, origins);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('origin', new THREE.BufferAttribute(origins, 3));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        gravity: { value: new THREE.Vector3(0, -9.8, 0) },
        intensity: { value: this.currentIntensity },
        coreRadius: { value: this.config.coreRadius },
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float lifetime;
        attribute float size;
        attribute vec3 color;
        attribute vec3 origin;

        uniform float time;
        uniform vec3 gravity;
        uniform float intensity;
        uniform float coreRadius;

        varying vec3 vColor;
        varying float vLifetime;

        void main() {
          vColor = color;

          // Particle age based on lifetime attribute
          float t = mod(time * 0.5 + lifetime * 5.0, 3.0);
          vLifetime = 1.0 - (t / 3.0);

          // Parabolic trajectory: p = p0 + v*t + 0.5*g*t^2
          vec3 pos = origin;
          vec3 vel = velocity * intensity;

          pos += vel * t;
          pos += 0.5 * gravity * t * t * 0.15; // Reduced gravity for dramatic effect

          // Reset when below core surface
          float distFromCenter = length(pos);
          if (distFromCenter < coreRadius * 0.9) {
            pos = origin;
            vLifetime = 1.0;
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * vLifetime * intensity * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float glow = pow(1.0 - dist * 2.0, 1.5);

          // Color shifts from yellow-white to red as particle ages
          vec3 hotColor = vec3(1.0, 0.9, 0.5);
          vec3 coolColor = vec3(0.8, 0.2, 0.0);
          vec3 color = mix(coolColor, hotColor, vLifetime) * vColor;

          float alpha = glow * vLifetime * 0.9;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.eruptionParticles = new THREE.Points(geometry, this.particleMaterial);
    this.mesh.add(this.eruptionParticles);
  }

  private resetParticle(
    index: number,
    positions: Float32Array,
    velocities: Float32Array,
    lifetimes: Float32Array,
    sizes: Float32Array,
    colors: Float32Array,
    origins: Float32Array
  ): void {
    const i3 = index * 3;

    // Random eruption point on core surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = this.config.coreRadius * 1.02;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    // Store origin for reset
    origins[i3] = x;
    origins[i3 + 1] = y;
    origins[i3 + 2] = z;

    // Initial position at origin
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    // Outward velocity with some randomness
    const normal = new THREE.Vector3(x, y, z).normalize();
    const speed = 15 + Math.random() * 25;

    // Add tangential component for spread
    const tangent = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).cross(normal).normalize().multiplyScalar(speed * 0.4);

    velocities[i3] = normal.x * speed + tangent.x;
    velocities[i3 + 1] = normal.y * speed + tangent.y;
    velocities[i3 + 2] = normal.z * speed + tangent.z;

    lifetimes[index] = Math.random();
    sizes[index] = 0.2 + Math.random() * 0.5;

    // Color gradient from white-yellow to orange-red
    const colorT = Math.random();
    if (colorT < 0.2) {
      // White/yellow (hottest)
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.95;
      colors[i3 + 2] = 0.7;
    } else if (colorT < 0.5) {
      // Yellow-orange
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.7;
      colors[i3 + 2] = 0.2;
    } else if (colorT < 0.8) {
      // Orange
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.4;
      colors[i3 + 2] = 0.0;
    } else {
      // Red
      colors[i3] = 0.9;
      colors[i3 + 1] = 0.15;
      colors[i3 + 2] = 0.0;
    }
  }

  private createPyroclasticParticles(): void {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.config.coreRadius * (1.5 + Math.random() * 2.0);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.1 + Math.random() * 0.25;
      lifetimes[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    this.pyroclasticMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0.3 },
      },
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        varying float vLifetime;
        uniform float time;
        uniform float intensity;

        void main() {
          vLifetime = lifetime;

          vec3 pos = position;

          // Turbulent motion
          float t = time * 0.3 + lifetime * 10.0;
          pos.x += sin(t * 1.3 + lifetime * 5.0) * 0.5 * intensity;
          pos.y += cos(t * 0.9 + lifetime * 7.0) * 0.3 * intensity;
          pos.z += sin(t * 1.1 + lifetime * 6.0) * 0.5 * intensity;

          // Slow rise
          pos.y += mod(time * 0.5 + lifetime * 3.0, 5.0) * intensity;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * intensity * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * 0.35;
          vec3 color = vec3(0.35, 0.3, 0.25); // Ash gray

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.pyroclasticParticles = new THREE.Points(geometry, this.pyroclasticMaterial);
    this.mesh.add(this.pyroclasticParticles);
  }

  /**
   * Trigger a dramatic eruption event
   */
  triggerEruption(position?: THREE.Vector3, intensity: number = 1.0): void {
    const eruptionPos = position || new THREE.Vector3(0, this.config.coreRadius, 0);

    // Schedule eruption sequence
    const now = performance.now();

    this.events.push(
      { type: 'start', intensity: intensity * 0.5, position: eruptionPos, time: now },
      { type: 'peak', intensity: intensity, position: eruptionPos, time: now + 2000 },
      { type: 'end', intensity: intensity * 0.2, position: eruptionPos, time: now + 8000 }
    );

    // Screen shake on start
    if (this.onScreenShake) {
      this.onScreenShake(intensity * 0.3);
    }

    // Spawn volcanic bombs
    this.spawnVolcanicBombs(eruptionPos, Math.ceil(intensity * 5));
  }

  private spawnVolcanicBombs(origin: THREE.Vector3, count: number): void {
    for (let i = 0; i < count && this.bombs.length < this.maxBombs; i++) {
      // Random direction outward
      const direction = origin.clone().normalize();
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      direction.add(spread).normalize();

      const speed = 8 + Math.random() * 12;
      const velocity = direction.multiplyScalar(speed);

      // Create bomb mesh
      const size = 0.3 + Math.random() * 0.5;
      const geometry = new THREE.IcosahedronGeometry(size, 1);

      // Deform for irregular shape
      const positions = geometry.attributes['position'].array as Float32Array;
      for (let j = 0; j < positions.length; j += 3) {
        const noise = (Math.random() - 0.5) * 0.3;
        positions[j] += noise;
        positions[j + 1] += noise;
        positions[j + 2] += noise;
      }
      geometry.computeVertexNormals();

      const mesh = new THREE.Mesh(geometry, this.bombMaterial.clone());
      mesh.position.copy(origin);

      // Create trail
      const trailCount = 20;
      const trailPositions = new Float32Array(trailCount * 3);
      const trailSizes = new Float32Array(trailCount);
      const trailAlphas = new Float32Array(trailCount);

      for (let t = 0; t < trailCount; t++) {
        trailPositions[t * 3] = origin.x;
        trailPositions[t * 3 + 1] = origin.y;
        trailPositions[t * 3 + 2] = origin.z;
        trailSizes[t] = size * (1 - t / trailCount) * 0.5;
        trailAlphas[t] = 1 - t / trailCount;
      }

      const trailGeometry = new THREE.BufferGeometry();
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
      trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));

      const trail = new THREE.Points(trailGeometry, this.trailMaterial.clone());

      this.mesh.add(mesh);
      this.mesh.add(trail);

      this.bombs.push({
        mesh,
        velocity,
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        lifetime: 0,
        maxLifetime: 4 + Math.random() * 3,
        trail,
      });
    }
  }

  private updateVolcanicBombs(delta: number): void {
    const gravity = new THREE.Vector3(0, -9.8 * 0.3, 0); // Reduced gravity

    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.lifetime += delta;

      // Apply gravity
      bomb.velocity.add(gravity.clone().multiplyScalar(delta));

      // Update position
      bomb.mesh.position.add(bomb.velocity.clone().multiplyScalar(delta));

      // Update rotation
      bomb.mesh.rotation.x += bomb.angularVelocity.x * delta;
      bomb.mesh.rotation.y += bomb.angularVelocity.y * delta;
      bomb.mesh.rotation.z += bomb.angularVelocity.z * delta;

      // Update trail
      const trailPositions = bomb.trail.geometry.attributes['position'].array as Float32Array;
      // Shift trail positions
      for (let t = trailPositions.length / 3 - 1; t > 0; t--) {
        trailPositions[t * 3] = trailPositions[(t - 1) * 3];
        trailPositions[t * 3 + 1] = trailPositions[(t - 1) * 3 + 1];
        trailPositions[t * 3 + 2] = trailPositions[(t - 1) * 3 + 2];
      }
      trailPositions[0] = bomb.mesh.position.x;
      trailPositions[1] = bomb.mesh.position.y;
      trailPositions[2] = bomb.mesh.position.z;
      bomb.trail.geometry.attributes['position'].needsUpdate = true;

      // Fade emission as it cools
      const mat = bomb.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = Math.max(0, 0.8 - bomb.lifetime * 0.15);

      // Remove if expired or below surface
      const distFromCenter = bomb.mesh.position.length();
      if (bomb.lifetime > bomb.maxLifetime || distFromCenter < this.config.coreRadius * 0.8) {
        this.mesh.remove(bomb.mesh);
        this.mesh.remove(bomb.trail);
        bomb.mesh.geometry.dispose();
        (bomb.mesh.material as THREE.Material).dispose();
        bomb.trail.geometry.dispose();
        (bomb.trail.material as THREE.Material).dispose();
        this.bombs.splice(i, 1);
      }
    }
  }

  private processEvents(time: number): void {
    const now = performance.now();

    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];

      if (now >= event.time) {
        switch (event.type) {
          case 'start':
            this.targetIntensity = event.intensity;
            break;
          case 'peak':
            this.targetIntensity = event.intensity;
            if (this.onScreenShake) {
              this.onScreenShake(event.intensity * 0.5);
            }
            break;
          case 'end':
            this.targetIntensity = 0.3; // Return to baseline
            break;
        }
        this.events.splice(i, 1);
      }
    }

    // Smooth intensity transition
    this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.02;
  }

  /**
   * Compute screen shake offset
   */
  computeShake(time: number, baseIntensity: number): THREE.Vector3 {
    const intensity = baseIntensity * this.currentIntensity;
    return new THREE.Vector3(
      Math.sin(time * 100) * Math.sin(time * 17) * intensity * 0.1,
      Math.sin(time * 150) * Math.cos(time * 13) * intensity * 0.05,
      Math.sin(time * 120) * Math.sin(time * 11) * intensity * 0.1
    );
  }

  update(time: number, delta: number): void {
    // Process events
    this.processEvents(time);

    // Update shader uniforms
    this.particleMaterial.uniforms['time'].value = time;
    this.particleMaterial.uniforms['intensity'].value = this.currentIntensity;

    this.pyroclasticMaterial.uniforms['time'].value = time;
    this.pyroclasticMaterial.uniforms['intensity'].value = this.currentIntensity;

    // Update volcanic bombs
    this.updateVolcanicBombs(delta);

    // Random micro-eruptions based on intensity
    if (Math.random() < this.currentIntensity * 0.01) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const pos = new THREE.Vector3(
        this.config.coreRadius * Math.sin(phi) * Math.cos(theta),
        this.config.coreRadius * Math.sin(phi) * Math.sin(theta),
        this.config.coreRadius * Math.cos(phi)
      );
      this.spawnVolcanicBombs(pos, 1);
    }
  }

  dispose(): void {
    this.eruptionParticles.geometry.dispose();
    this.particleMaterial.dispose();

    this.pyroclasticParticles.geometry.dispose();
    this.pyroclasticMaterial.dispose();

    this.bombs.forEach(bomb => {
      this.mesh.remove(bomb.mesh);
      this.mesh.remove(bomb.trail);
      bomb.mesh.geometry.dispose();
      (bomb.mesh.material as THREE.Material).dispose();
      bomb.trail.geometry.dispose();
      (bomb.trail.material as THREE.Material).dispose();
    });

    this.bombMaterial.dispose();
    this.trailMaterial.dispose();
  }
}
