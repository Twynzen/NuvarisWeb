import * as THREE from 'three';
import { createNoise2D, createNoise3D, NoiseFunction2D, NoiseFunction3D } from 'simplex-noise';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

export class AtmosphereSystem implements PlanetLayer {
  name = 'atmosphere';
  mesh: THREE.Group;

  private steamLayers: THREE.Mesh[] = [];
  private ashParticles!: THREE.Points;
  private emberParticles!: THREE.Points;
  private noise2D: NoiseFunction2D;
  private noise3D: NoiseFunction3D;

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.createSteamLayers();
    this.createAshParticles();
    this.createEmberParticles();
  }

  private createSteamLayers(): void {
    const { coreRadius } = this.config;

    const layerConfigs = [
      { radius: coreRadius * 1.35, opacity: 0.12, color: 0x8b7355, rotationDir: 1 },
      { radius: coreRadius * 1.55, opacity: 0.08, color: 0x6b5344, rotationDir: -1 },
      { radius: coreRadius * 1.8, opacity: 0.06, color: 0x5a6b4f, rotationDir: 1 },
      { radius: coreRadius * 2.1, opacity: 0.04, color: 0x4a5a4a, rotationDir: -1 },
      { radius: coreRadius * 2.5, opacity: 0.03, color: 0x3a4a4a, rotationDir: 1 },
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
          coreGlow: { value: new THREE.Color(0xff4400) },
          coreRadius: { value: coreRadius },
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
          uniform vec3 coreGlow;
          uniform float coreRadius;

          varying vec2 vUv;
          varying vec3 vWorldPosition;
          varying vec3 vNormal;

          void main() {
            // Animated UV offset
            vec2 uv = vUv;
            uv.x += time * 0.01;
            uv.y += sin(time * 0.5 + vUv.x * 5.0) * 0.02;

            // Sample noise texture
            float noise = texture2D(map, uv).a;

            // Distance to core for glow effect
            float distToCore = length(vWorldPosition);
            float glowFactor = coreRadius / distToCore;
            glowFactor = pow(glowFactor, 2.0) * 0.3;

            // Mix base color with core glow
            vec3 finalColor = mix(color, coreGlow, glowFactor);

            // View-dependent opacity (thicker at edges)
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float viewAngle = abs(dot(vNormal, viewDir));
            float edgeFactor = 1.0 - pow(viewAngle, 0.5);

            float alpha = noise * opacity * (0.5 + edgeFactor * 0.8);

            // Add some variation
            alpha *= 0.8 + sin(time + vUv.y * 10.0) * 0.2;

            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });

      const steamMesh = new THREE.Mesh(geometry, material);

      steamMesh.userData = {
        rotationSpeed: 0.00015 * layerConfig.rotationDir * (1 + index * 0.2),
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
        value = Math.pow(value, 1.2); // Adjust contrast

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
    const particleCount = 4000;
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

          // Drifting motion
          pos.x += sin(time * 0.3 + phase * 10.0) * 0.2;
          pos.y += cos(time * 0.2 + phase * 8.0) * 0.15;
          pos.z += sin(time * 0.25 + phase * 12.0) * 0.2;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (250.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vPhase;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * 0.5;
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
    const r = coreRadius * 1.3 + Math.random() * (atmosphereRadius - coreRadius * 1.3) * 0.8;

    const i3 = index * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 6;
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[index] = 0.03 + Math.random() * 0.08;
    phases[index] = Math.random() * Math.PI * 2;

    // Slow orbital velocity
    const tangent = new THREE.Vector3(-positions[i3 + 2], 0, positions[i3]).normalize();
    const speed = 0.01 + Math.random() * 0.02;
    velocities[i3] = tangent.x * speed;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
    velocities[i3 + 2] = tangent.z * speed;
  }

  private createEmberParticles(): void {
    const particleCount = 1500;
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
          float rise = mod(time * 0.3 + phase * 5.0, 8.0);
          pos.y += rise;

          // Spiral outward
          float spiralAngle = time * 0.5 + phase * 10.0;
          float spiralRadius = rise * 0.1;
          pos.x += cos(spiralAngle) * spiralRadius;
          pos.z += sin(spiralAngle) * spiralRadius;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // Flicker size
          float flicker = sin(time * 10.0 + phase * 100.0) * 0.3 + 0.7;
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

          vec3 color = vColor * (1.0 + glow * 0.5);
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

    // Embers originate near the core
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = coreRadius * (1.05 + Math.random() * 0.3);

    const i3 = index * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[index] = 0.08 + Math.random() * 0.15;
    phases[index] = Math.random() * Math.PI * 2;

    // Orange to yellow colors
    const colorT = Math.random();
    if (colorT < 0.4) {
      // Yellow
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i3 + 2] = 0.2 + Math.random() * 0.3;
    } else if (colorT < 0.8) {
      // Orange
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.4 + Math.random() * 0.3;
      colors[i3 + 2] = 0.0;
    } else {
      // Red
      colors[i3] = 0.9 + Math.random() * 0.1;
      colors[i3 + 1] = 0.2 + Math.random() * 0.2;
      colors[i3 + 2] = 0.0;
    }
  }

  update(time: number, delta: number): void {
    // Rotate steam layers
    this.steamLayers.forEach(layer => {
      layer.rotation.y += layer.userData.rotationSpeed;
      layer.rotation.x += layer.userData.rotationSpeed * 0.3;

      const mat = layer.userData.material as THREE.ShaderMaterial;
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
