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
        // Crust appearance
        crustColor: { value: new THREE.Color(0x1a1410) }, // Dark volcanic rock
        crackColor: { value: new THREE.Color(0x0a0602) }, // Darker cracks
        // Magma glow in cracks
        magmaGlowColor: { value: new THREE.Color(0xff4400) },
        magmaGlowIntensity: { value: 0.3 },
        // Crack pattern
        crackScale: { value: 8.0 },
        crackWidth: { value: 0.25 }, // 25% of surface = cracks (magma visible)
        crackSharpness: { value: 0.85 },
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
        uniform vec3 crackColor;
        uniform vec3 magmaGlowColor;
        uniform float magmaGlowIntensity;
        uniform float crackScale;
        uniform float crackWidth;
        uniform float crackSharpness;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        // Hash function for randomness
        vec3 hash3(vec3 p) {
          p = vec3(
            dot(p, vec3(127.1, 311.7, 74.7)),
            dot(p, vec3(269.5, 183.3, 246.1)),
            dot(p, vec3(113.5, 271.9, 124.6))
          );
          return fract(sin(p) * 43758.5453123);
        }

        // 3D Voronoi for crack pattern
        vec2 voronoi3D(vec3 p) {
          vec3 ip = floor(p);
          vec3 fp = fract(p);

          float d1 = 8.0;  // Distance to closest cell
          float d2 = 8.0;  // Distance to second closest

          for (int k = -1; k <= 1; k++) {
            for (int j = -1; j <= 1; j++) {
              for (int i = -1; i <= 1; i++) {
                vec3 b = vec3(float(i), float(j), float(k));
                vec3 r = hash3(ip + b);
                vec3 diff = b + r - fp;
                float dist = dot(diff, diff);

                if (dist < d1) {
                  d2 = d1;
                  d1 = dist;
                } else if (dist < d2) {
                  d2 = dist;
                }
              }
            }
          }

          return vec2(sqrt(d1), sqrt(d2));
        }

        // Simple 3D noise
        float hash(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yxz + 19.19);
          return fract((p.x + p.y) * p.z);
        }

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

        void main() {
          // Normalize position for spherical sampling
          vec3 spherePos = normalize(vWorldPosition) * crackScale;

          // Get Voronoi pattern for cracks
          vec2 vor = voronoi3D(spherePos);
          float cellDist = vor.x;
          float edgeDist = vor.y - vor.x;

          // Create cracks at Voronoi edges
          float crack = smoothstep(crackWidth * crackSharpness, crackWidth, edgeDist);

          // Add noise variation to crack edges
          float noiseVar = noise3D(spherePos * 2.0) * 0.15;
          crack = clamp(crack + noiseVar, 0.0, 1.0);

          // Base crust color
          vec3 finalColor = mix(crackColor, crustColor, crack);

          // Add subtle magma glow at crack edges
          float crackEdge = 1.0 - smoothstep(crackWidth, crackWidth + 0.1, edgeDist);
          vec3 magmaGlow = magmaGlowColor * crackEdge * magmaGlowIntensity;
          finalColor += magmaGlow;

          // Add very subtle pulsing to magma glow
          float pulse = 0.95 + sin(time * 0.8) * 0.05;
          finalColor += magmaGlow * pulse * 0.2;

          // Alpha: opaque on crust, transparent in cracks (to see magma below)
          float alpha = crack;

          // Fresnel darkening at edges (planet curvature)
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
