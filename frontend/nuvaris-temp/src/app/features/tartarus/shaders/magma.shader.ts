import * as THREE from 'three';

/**
 * TARTARUS PRIME - Advanced Lava Core Shader
 *
 * Based on research guide - combines multiple techniques:
 * 1. Voronoi convection cells with animated centers
 * 2. Temperature-based color gradients (blackbody radiation)
 * 3. Subsurface Scattering approximation
 * 4. Organic pulsing/breathing effect
 * 5. Dark cooling cracks between cells
 */

export const MagmaShader = {
  uniforms: {
    time: { value: 0 },
    // Temperature range (0 = cool/black, 1 = hottest/white)
    uMinTemperature: { value: 0.2 },
    uMaxTemperature: { value: 0.75 },
    // Convection
    uCellScale: { value: 4.0 },
    uConvectionSpeed: { value: 0.15 },
    // SSS
    uSSSIntensity: { value: 0.3 },
    uSSSColor: { value: new THREE.Color(1.0, 0.3, 0.05) },
    // Pulse
    uPulseIntensity: { value: 0.15 },
    // Colors (based on blackbody radiation)
    uColorBlack: { value: new THREE.Color(0.05, 0.02, 0.01) },
    uColorDarkRed: { value: new THREE.Color(0.3, 0.05, 0.0) },
    uColorRed: { value: new THREE.Color(0.8, 0.1, 0.0) },
    uColorOrange: { value: new THREE.Color(1.0, 0.4, 0.0) },
    uColorYellow: { value: new THREE.Color(1.0, 0.8, 0.2) },
    uColorWhite: { value: new THREE.Color(1.0, 1.0, 0.9) },
    // Crack color
    uCrackColor: { value: new THREE.Color(0.08, 0.02, 0.0) },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vViewDir;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;

      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vViewDir = normalize(cameraPosition - worldPosition.xyz);

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,

  fragmentShader: `
    precision highp float;

    uniform float time;
    uniform float uMinTemperature;
    uniform float uMaxTemperature;
    uniform float uCellScale;
    uniform float uConvectionSpeed;
    uniform float uSSSIntensity;
    uniform vec3 uSSSColor;
    uniform float uPulseIntensity;

    uniform vec3 uColorBlack;
    uniform vec3 uColorDarkRed;
    uniform vec3 uColorRed;
    uniform vec3 uColorOrange;
    uniform vec3 uColorYellow;
    uniform vec3 uColorWhite;
    uniform vec3 uCrackColor;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vViewDir;

    // Hash functions for randomness
    vec3 hash3(vec3 p) {
      p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
      );
      return fract(sin(p) * 43758.5453123);
    }

    float hash(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yxz + 19.19);
      return fract((p.x + p.y) * p.z);
    }

    // Simple 3D noise
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

    // FBM for variation
    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      mat3 rot = mat3(0.877, 0.479, 0.0, -0.479, 0.877, 0.0, 0.0, 0.0, 1.0);

      for (int i = 0; i < 4; i++) {
        value += amplitude * noise3D(p);
        p = rot * p * 2.02;
        amplitude *= 0.5;
      }
      return value;
    }

    // 3D Voronoi with animated convection centers
    vec3 voronoi3D(vec3 p) {
      vec3 ip = floor(p);
      vec3 fp = fract(p);

      float d1 = 8.0;  // Distance to closest cell center
      float d2 = 8.0;  // Distance to second closest
      vec3 cellId = vec3(0.0);

      for (int k = -1; k <= 1; k++) {
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec3 b = vec3(float(i), float(j), float(k));
            vec3 r = hash3(ip + b);

            // Animate cell centers for convection effect
            r = 0.5 + 0.5 * sin(time * uConvectionSpeed + 6.2831 * r);

            vec3 diff = b + r - fp;
            float dist = dot(diff, diff);

            if (dist < d1) {
              d2 = d1;
              d1 = dist;
              cellId = ip + b;
            } else if (dist < d2) {
              d2 = dist;
            }
          }
        }
      }

      return vec3(sqrt(d1), sqrt(d2), hash(cellId));
    }

    // Temperature-based color ramp (blackbody radiation)
    vec3 temperatureToColor(float temperature) {
      temperature = clamp(temperature, 0.0, 1.0);

      if (temperature < 0.2) {
        return mix(uColorBlack, uColorDarkRed, temperature / 0.2);
      }
      if (temperature < 0.4) {
        return mix(uColorDarkRed, uColorRed, (temperature - 0.2) / 0.2);
      }
      if (temperature < 0.6) {
        return mix(uColorRed, uColorOrange, (temperature - 0.4) / 0.2);
      }
      if (temperature < 0.8) {
        return mix(uColorOrange, uColorYellow, (temperature - 0.6) / 0.2);
      }
      return mix(uColorYellow, uColorWhite, (temperature - 0.8) / 0.2);
    }

    // Subsurface Scattering approximation
    vec3 calculateSSS(vec3 lightDir, vec3 viewDir, vec3 normal, float thickness) {
      // Distorted light direction for translucency
      vec3 H = normalize(lightDir + normal * 0.3);
      float VdotH = pow(clamp(dot(viewDir, -H), 0.0, 1.0), 3.0);
      float translucency = VdotH * (1.0 - thickness) * uSSSIntensity;
      return uSSSColor * translucency;
    }

    // Multi-frequency pulse for organic breathing
    float calculatePulse(vec3 pos) {
      float pulse1 = sin(time * 1.0) * 0.5 + 0.5;
      float pulse2 = sin(time * 1.3 + 2.0) * 0.5 + 0.5;
      float spatialVar = fbm(pos * 0.5 + time * 0.05);
      return mix(1.0, (pulse1 + pulse2 * 0.5) / 1.5, uPulseIntensity * spatialVar);
    }

    void main() {
      // 3D position for voronoi sampling
      vec3 pos = vPosition * uCellScale;

      // Get voronoi distances
      vec3 vor = voronoi3D(pos);
      float cellDist = vor.x;       // Distance to cell center
      float edgeDist = vor.y - vor.x; // Distance to edge
      float cellRandom = vor.z;     // Random value per cell

      // Create sharp edges between cells (dark cooling cracks)
      float edge = smoothstep(0.0, 0.12, edgeDist);

      // Per-cell temperature variation
      float cellTemp = cellRandom * 0.4 + 0.3;

      // Add FBM variation within cells
      float noiseVar = fbm(pos * 2.0 + time * 0.08);
      float temperature = cellTemp + noiseVar * 0.35;

      // Rising convection - center of cells hotter
      float centerHeat = 1.0 - smoothstep(0.0, 0.5, cellDist);
      temperature += centerHeat * 0.25;

      // Clamp temperature range
      temperature = mix(uMinTemperature, uMaxTemperature, clamp(temperature, 0.0, 1.0));

      // Get base color from temperature
      vec3 cellColor = temperatureToColor(temperature * edge);

      // Apply dark cracks at edges
      vec3 finalColor = mix(uCrackColor, cellColor, edge);

      // Add darker spots (like holes/vents in lava)
      float darkSpots = noise3D(pos * 8.0 + time * 0.1);
      darkSpots = smoothstep(0.68, 0.78, darkSpots);
      finalColor = mix(finalColor, uCrackColor * 0.3, darkSpots * 0.7);

      // Calculate SSS contribution
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3)); // Simulated light from above
      float thickness = 1.0 - temperature; // Hot areas are more translucent
      vec3 sss = calculateSSS(lightDir, vViewDir, vNormal, thickness);
      finalColor += sss * edge;

      // Apply organic pulse
      float pulse = calculatePulse(pos);
      finalColor *= pulse;

      // Fresnel rim for subtle edge glow
      float fresnel = pow(1.0 - max(dot(normalize(vNormal), vViewDir), 0.0), 4.0);
      finalColor += temperatureToColor(0.7) * fresnel * 0.12;

      // Emission boost for bright areas
      float emission = smoothstep(0.5, 1.0, temperature) * edge;
      finalColor *= 1.0 + emission * 0.3;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

/**
 * Glow Shader - Subtle outer glow for the magma core
 */
export const GlowShader = {
  uniforms: {
    time: { value: 0 },
    glowColor: { value: new THREE.Color(0xff4400) },
    intensity: { value: 0.3 },
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

      // Subtle pulse
      float pulse = 0.95 + sin(time * 1.0) * 0.05;
      vec3 color = glowColor * fresnel * intensity * pulse;

      float alpha = fresnel * 0.25;

      gl_FragColor = vec4(color, alpha);
    }
  `,
};

/**
 * Lava Flow Shader - For rivers and pools using flow maps
 */
export const LavaFlowShader = {
  uniforms: {
    time: { value: 0 },
    uFlowSpeed: { value: 0.15 },
    uNoiseScale: { value: 3.0 },
    uColorHot: { value: new THREE.Color(1.0, 0.6, 0.1) },
    uColorMedium: { value: new THREE.Color(1.0, 0.25, 0.0) },
    uColorCool: { value: new THREE.Color(0.15, 0.02, 0.0) },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform float uFlowSpeed;
    uniform float uNoiseScale;
    uniform vec3 uColorHot;
    uniform vec3 uColorMedium;
    uniform vec3 uColorCool;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // Flow direction (can be replaced with flow map texture)
    vec2 flowDirection(vec2 uv) {
      return normalize(vec2(1.0, 0.3)); // Default flow direction
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 flow = flowDirection(vUv);

      // Two-phase sampling to prevent repetition (Portal 2 technique)
      float phase0 = fract(time * uFlowSpeed);
      float phase1 = fract(time * uFlowSpeed + 0.5);

      vec2 uv0 = vUv + flow * phase0;
      vec2 uv1 = vUv + flow * phase1;

      // Sample noise at both phases
      float lava0 = fbm(uv0 * uNoiseScale);
      float lava1 = fbm(uv1 * uNoiseScale);

      // Blend between phases
      float blend = abs(2.0 * phase0 - 1.0);
      float lavaValue = mix(lava0, lava1, blend);

      // Add variation
      lavaValue += fbm(vUv * uNoiseScale * 2.0 - time * 0.05) * 0.3;

      // Color based on temperature
      vec3 color;
      if (lavaValue < 0.4) {
        color = mix(uColorCool, uColorMedium, lavaValue / 0.4);
      } else if (lavaValue < 0.7) {
        color = mix(uColorMedium, uColorHot, (lavaValue - 0.4) / 0.3);
      } else {
        color = uColorHot * (1.0 + (lavaValue - 0.7) * 0.5);
      }

      // Bubbling effect
      float bubbles = noise(vUv * 20.0 + time * 2.0);
      bubbles = smoothstep(0.7, 0.9, bubbles);
      color += vec3(1.0, 0.8, 0.4) * bubbles * 0.3;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};
