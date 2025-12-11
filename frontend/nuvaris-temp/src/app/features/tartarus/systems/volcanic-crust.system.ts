import * as THREE from 'three';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

/**
 * TARTARUS PRIME - Volcanic Crust System
 *
 * Creates a fractured volcanic crust layer over the magma core.
 * The crust covers ~70% of the surface with cooled rock,
 * allowing magma to be visible only through cracks/fissures.
 *
 * This solves the visual problem of too much exposed magma.
 */

export class VolcanicCrustSystem implements PlanetLayer {
  name = 'volcanic-crust';
  mesh: THREE.Group;

  private crustMesh!: THREE.Mesh;
  private crustMaterial!: THREE.ShaderMaterial;

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.createVolcanicCrust();
  }

  private createVolcanicCrust(): void {
    const crustRadius = this.config.coreRadius * 1.02; // Just above magma core

    const geometry = new THREE.SphereGeometry(crustRadius, 64, 64);

    this.crustMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        coreRadius: { value: this.config.coreRadius },
        // Continental crust appearance
        crustColor: { value: new THREE.Color(0x1a1410) }, // Dark volcanic rock
        coastlineColor: { value: new THREE.Color(0x0f0a08) }, // Darker coastline
        // Magma ocean glow
        magmaGlowColor: { value: new THREE.Color(0xff4400) },
        magmaGlowIntensity: { value: 0.4 },
        // Continental parameters
        continentScale: { value: 1.8 }, // Size of continents (lower = bigger)
        continentCoverage: { value: 0.6 }, // 60% land, 40% magma ocean
        coastlineWidth: { value: 0.08 }, // Coastline transition width
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float time;
        uniform float coreRadius;
        uniform vec3 crustColor;
        uniform vec3 coastlineColor;
        uniform vec3 magmaGlowColor;
        uniform float magmaGlowIntensity;
        uniform float continentScale;
        uniform float continentCoverage;
        uniform float coastlineWidth;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        // Hash function for noise
        float hash(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yxz + 19.19);
          return fract((p.x + p.y) * p.z);
        }

        // 3D Perlin-like noise
        float noise3D(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          return mix(
            mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
          );
        }

        // Fractal Brownian Motion for continental shapes
        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          mat3 rot = mat3(0.877, 0.479, 0.0, -0.479, 0.877, 0.0, 0.0, 0.0, 1.0);

          // 5 octaves for detailed continents
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise3D(p * frequency);
            p = rot * p * 2.02; // Rotate for better variation
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          return value;
        }

        void main() {
          // Normalize position for spherical sampling
          vec3 spherePos = normalize(vWorldPosition) * continentScale;

          // Generate continental pattern with FBM
          float continentNoise = fbm(spherePos);

          // Add larger-scale variation for continent distribution
          float largeScale = fbm(spherePos * 0.5) * 0.3;
          continentNoise += largeScale;

          // Map to continent/ocean (0 = ocean, 1 = continent)
          float landMask = smoothstep(continentCoverage - 0.1, continentCoverage + 0.1, continentNoise);

          // Create coastline transition zone
          float coastline = smoothstep(continentCoverage - coastlineWidth,
                                       continentCoverage + coastlineWidth,
                                       continentNoise);

          // Base color: blend between ocean (transparent) and continent (opaque)
          vec3 finalColor = mix(coastlineColor, crustColor, coastline);

          // Add detail variation to continents
          float detail = noise3D(spherePos * 4.0) * 0.1;
          finalColor *= 1.0 - detail;

          // Magma glow at coastlines (where land meets ocean)
          float coastGlow = (1.0 - abs(landMask - 0.5) * 2.0) * 0.5;
          vec3 magmaGlow = magmaGlowColor * coastGlow * magmaGlowIntensity;
          finalColor += magmaGlow;

          // Subtle pulsing in magma ocean
          float pulse = 0.95 + sin(time * 0.5) * 0.05;
          finalColor += magmaGlow * pulse * 0.15;

          // Alpha: opaque on continents, transparent in magma ocean
          float alpha = landMask;

          // Fresnel darkening at planet edges
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = dot(vNormal, viewDir);
          finalColor *= 0.7 + fresnel * 0.3;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: true,
    });

    this.crustMesh = new THREE.Mesh(geometry, this.crustMaterial);
    this.mesh.add(this.crustMesh);
  }

  update(time: number, delta: number): void {
    this.crustMaterial.uniforms['time'].value = time;
  }

  dispose(): void {
    this.crustMaterial.dispose();
    this.crustMesh.geometry.dispose();
  }
}
