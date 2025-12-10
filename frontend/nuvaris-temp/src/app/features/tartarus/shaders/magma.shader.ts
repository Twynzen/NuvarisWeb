import * as THREE from 'three';

/**
 * TARTARUS PRIME - Lava Core Shader
 *
 * Based on Concepto.png:
 * - CELLULAR/VORONOI pattern (lava bubbles with dark borders)
 * - Orange/red colors, NOT bright yellow
 * - Dark cracks/veins between cells
 * - Small dark spots (holes in the lava)
 * - NOT a bright sun - a volcanic lava core with texture
 */

export const MagmaShader = {
  uniforms: {
    time: { value: 0 },
    cellColor: { value: new THREE.Color(0xff6600) },      // Orange lava cells
    hotColor: { value: new THREE.Color(0xffaa22) },       // Hotter spots (not pure yellow)
    crackColor: { value: new THREE.Color(0x1a0500) },     // Dark cracks between cells
    cellScale: { value: 4.0 },                             // Size of lava cells
    flowSpeed: { value: 0.15 },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    uniform float time;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;

      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform vec3 cellColor;
    uniform vec3 hotColor;
    uniform vec3 crackColor;
    uniform float cellScale;
    uniform float flowSpeed;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
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

    // 3D Voronoi - returns distance to cell edge and cell center
    vec2 voronoi3D(vec3 p) {
      vec3 ip = floor(p);
      vec3 fp = fract(p);

      float d1 = 8.0;  // Distance to closest cell center
      float d2 = 8.0;  // Distance to second closest

      for (int k = -1; k <= 1; k++) {
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec3 b = vec3(float(i), float(j), float(k));
            vec3 r = hash3(ip + b);

            // Animate cell centers slowly
            r = 0.5 + 0.5 * sin(time * flowSpeed + 6.2831 * r);

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

    // Simple noise for variation
    float noise(vec3 p) {
      vec3 ip = floor(p);
      vec3 fp = fract(p);
      fp = fp * fp * (3.0 - 2.0 * fp);

      float n = dot(ip, vec3(1.0, 57.0, 113.0));

      return mix(
        mix(
          mix(fract(sin(n) * 43758.5453), fract(sin(n + 1.0) * 43758.5453), fp.x),
          mix(fract(sin(n + 57.0) * 43758.5453), fract(sin(n + 58.0) * 43758.5453), fp.x),
          fp.y
        ),
        mix(
          mix(fract(sin(n + 113.0) * 43758.5453), fract(sin(n + 114.0) * 43758.5453), fp.x),
          mix(fract(sin(n + 170.0) * 43758.5453), fract(sin(n + 171.0) * 43758.5453), fp.x),
          fp.y
        ),
        fp.z
      );
    }

    void main() {
      // 3D position for voronoi sampling
      vec3 pos = vPosition * cellScale;

      // Get voronoi distances
      vec2 vor = voronoi3D(pos);
      float cellDist = vor.x;       // Distance to cell center
      float edgeDist = vor.y - vor.x; // Distance to edge (difference between first and second)

      // Create sharp edges between cells (the dark cracks)
      float edge = smoothstep(0.0, 0.15, edgeDist);

      // Cell interior color - varies within each cell
      float cellNoise = noise(pos * 2.0 + time * 0.1);
      float hotness = cellNoise * 0.5 + 0.3;

      // Mix cell colors - orange base with hotter spots
      vec3 cellCol = mix(cellColor, hotColor, hotness * edge);

      // Apply dark cracks at edges
      vec3 finalColor = mix(crackColor, cellCol, edge);

      // Add some darker spots (like holes in lava) based on noise
      float darkSpots = noise(pos * 8.0);
      darkSpots = smoothstep(0.65, 0.75, darkSpots);
      finalColor = mix(finalColor, crackColor * 0.5, darkSpots * 0.8);

      // Subtle pulse animation
      float pulse = 0.92 + sin(time * 1.5 + cellDist * 5.0) * 0.08;
      finalColor *= pulse;

      // Very subtle fresnel - NOT bright, just slight rim
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 4.0);
      finalColor += cellColor * fresnel * 0.15;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

/**
 * Reduced glow shader - much more subtle than before
 */
export const GlowShader = {
  uniforms: {
    time: { value: 0 },
    glowColor: { value: new THREE.Color(0xff4400) },
    intensity: { value: 0.3 },  // MUCH lower intensity
    falloff: { value: 3.0 },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform vec3 glowColor;
    uniform float intensity;
    uniform float falloff;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), falloff);

      // Very subtle pulse
      float pulse = 0.95 + sin(time * 1.0) * 0.05;
      vec3 color = glowColor * fresnel * intensity * pulse;

      float alpha = fresnel * 0.25;  // Much lower alpha

      gl_FragColor = vec4(color, alpha);
    }
  `,
};
