import * as THREE from 'three';
import { createNoise2D, createNoise3D, NoiseFunction2D, NoiseFunction3D } from 'simplex-noise';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

/**
 * TARTARUS PRIME - Atmosphere System
 *
 * Based on Concepto.png:
 * - SUBTLE dark red/crimson background glow (NOT bright pink)
 * - Whitish-gray smoke wisps (like thin volcanic ash/steam)
 * - Ember particles rising from the volcanic ring
 * - NO bright pink/magenta halos
 */

export class AtmosphereSystem implements PlanetLayer {
  name = 'atmosphere';
  mesh: THREE.Group;

  private steamLayers: THREE.Mesh[] = [];
  private ashParticles!: THREE.Points;
  private emberParticles!: THREE.Points;
  private backgroundGlow!: THREE.Mesh;
  private noise2D: NoiseFunction2D;
  private noise3D: NoiseFunction3D;

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.createBackgroundGlow();  // Subtle dark red, NOT bright pink
    this.createSteamLayers();     // Whitish-gray smoke
    this.createAshParticles();
    this.createEmberParticles();
  }

  /**
   * Creates a subtle dark crimson/red background glow
   * This is NOT the bright pink from before - much more subtle
   */
  private createBackgroundGlow(): void {
    const { coreRadius } = this.config;

    // Single subtle background glow - dark crimson, very faint
    const glowGeometry = new THREE.SphereGeometry(coreRadius * 4.0, 48, 48);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color(0x4a1515) },  // Dark crimson/maroon
        coreRadius: { value: coreRadius },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 glowColor;
        uniform float coreRadius;

        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

          // Very subtle pulse
          float pulse = 0.95 + sin(time * 0.5) * 0.05;

          // Fade based on distance
          float dist = length(vWorldPosition);
          float fade = 1.0 - smoothstep(coreRadius * 2.5, coreRadius * 4.0, dist);

          float alpha = fresnel * pulse * 0.2 * fade;

          gl_FragColor = vec4(glowColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.backgroundGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.backgroundGlow);
  }

  /**
   * Creates whitish-gray smoke/steam layers
   * Like ultra-thin white smoke, not pink or warm-toned
   */
  private createSteamLayers(): void {
    const { coreRadius } = this.config;

    // WHITISH-GRAY smoke layers - matching concept art
    const layerConfigs = [
      { radius: coreRadius * 1.4, opacity: 0.15, color: 0x888888, rotationDir: 1 },   // Gray
      { radius: coreRadius * 1.6, opacity: 0.12, color: 0x999999, rotationDir: -1 },  // Lighter gray
      { radius: coreRadius * 1.9, opacity: 0.08, color: 0xaaaaaa, rotationDir: 1 },   // Even lighter
      { radius: coreRadius * 2.3, opacity: 0.05, color: 0xbbbbbb, rotationDir: -1 },  // Almost white
      { radius: coreRadius * 2.8, opacity: 0.03, color: 0xcccccc, rotationDir: 1 },   // Whispy white
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
            // Animated UV offset for drifting smoke
            vec2 uv = vUv;
            uv.x += time * 0.008;
            uv.y += sin(time * 0.4 + vUv.x * 4.0) * 0.015;

            // Sample noise texture
            float noise = texture2D(map, uv).a;

            // View-dependent opacity (thicker at edges like real smoke)
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float viewAngle = abs(dot(vNormal, viewDir));
            float edgeFactor = 1.0 - pow(viewAngle, 0.6);

            float alpha = noise * opacity * (0.4 + edgeFactor * 0.6);

            // Slight variation
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
        rotationSpeed: 0.0001 * layerConfig.rotationDir * (1 + index * 0.15),
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
        value = Math.pow(value, 1.3); // More contrast for wispy look

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
    const particleCount = 3000;
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

    // Gray ash particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x666666) },  // Gray ash
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying float vPhase;
        uniform float time;

        void main() {
          vPhase = phase;
          vec3 pos = position;

          // Drifting motion
          pos.x += sin(time * 0.25 + phase * 8.0) * 0.15;
          pos.y += cos(time * 0.15 + phase * 6.0) * 0.1;
          pos.z += sin(time * 0.2 + phase * 10.0) * 0.15;

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

          float alpha = (1.0 - dist * 2.0) * 0.4;
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
    const r = coreRadius * 1.5 + Math.random() * (atmosphereRadius - coreRadius * 1.5) * 0.7;

    const i3 = index * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 4;
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[index] = 0.02 + Math.random() * 0.06;
    phases[index] = Math.random() * Math.PI * 2;

    // Slow orbital velocity
    const tangent = new THREE.Vector3(-positions[i3 + 2], 0, positions[i3]).normalize();
    const speed = 0.008 + Math.random() * 0.015;
    velocities[i3] = tangent.x * speed;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 2] = tangent.z * speed;
  }

  private createEmberParticles(): void {
    const particleCount = 1200;
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

          // Rising motion with spiral
          float rise = mod(time * 0.25 + phase * 4.0, 6.0);
          pos.y += rise;

          // Spiral outward
          float spiralAngle = time * 0.4 + phase * 8.0;
          float spiralRadius = rise * 0.08;
          pos.x += cos(spiralAngle) * spiralRadius;
          pos.z += sin(spiralAngle) * spiralRadius;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // Flicker size
          float flicker = sin(time * 8.0 + phase * 80.0) * 0.25 + 0.75;
          gl_PointSize = size * flicker * (180.0 / -mvPosition.z);

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

          vec3 color = vColor * (1.0 + glow * 0.4);
          float alpha = glow * 0.85;

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

    // Embers originate near the core/ring area
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = coreRadius * (1.1 + Math.random() * 0.4);

    const i3 = index * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[index] = 0.06 + Math.random() * 0.12;
    phases[index] = Math.random() * Math.PI * 2;

    // Orange to yellow colors for embers
    const colorT = Math.random();
    if (colorT < 0.35) {
      // Yellow (hottest)
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i3 + 2] = 0.25 + Math.random() * 0.25;
    } else if (colorT < 0.75) {
      // Orange
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.45 + Math.random() * 0.25;
      colors[i3 + 2] = 0.0;
    } else {
      // Red
      colors[i3] = 0.9 + Math.random() * 0.1;
      colors[i3 + 1] = 0.15 + Math.random() * 0.2;
      colors[i3 + 2] = 0.0;
    }
  }

  update(time: number, delta: number): void {
    // Update background glow
    if (this.backgroundGlow) {
      const mat = this.backgroundGlow.material as THREE.ShaderMaterial;
      mat.uniforms['time'].value = time;
    }

    // Rotate steam layers
    this.steamLayers.forEach(layer => {
      layer.rotation.y += layer.userData['rotationSpeed'];
      layer.rotation.x += layer.userData['rotationSpeed'] * 0.25;

      const mat = layer.userData['material'] as THREE.ShaderMaterial;
      mat.uniforms['time'].value = time;
    });

    // Update ash particles
    const ashMat = this.ashParticles.material as THREE.ShaderMaterial;
    ashMat.uniforms['time'].value = time;

    // Slowly move ash particles
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
    // Dispose background glow
    if (this.backgroundGlow) {
      this.backgroundGlow.geometry.dispose();
      (this.backgroundGlow.material as THREE.Material).dispose();
    }

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
