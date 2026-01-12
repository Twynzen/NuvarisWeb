import * as THREE from 'three';

/**
 * TARTARUS PRIME - Rayleigh-Mie Atmospheric Scattering
 *
 * Based on research guide - inverted coefficients for volcanic orange/red sky
 * instead of Earth's blue atmosphere.
 *
 * Key differences from Earth atmosphere:
 * - Higher red wavelength scattering (Rayleigh inverted)
 * - Much higher Mie coefficient for dusty/smoky appearance
 * - Thicker lower atmosphere (volcanic ash)
 */

export const AtmosphericScatteringShader = {
  uniforms: {
    uSunPosition: { value: new THREE.Vector3(100, 50, -80) },
    uSunIntensity: { value: 8.0 },
    uPlanetRadius: { value: 10.0 },
    uAtmosphereRadius: { value: 10.25 },
    // Volcanic atmosphere - inverted from Earth (more red/orange scattering)
    uRayleighCoefficient: { value: new THREE.Vector3(19.5e-6, 11.0e-6, 4.5e-6) },
    uMieCoefficient: { value: 45e-6 },
    uMieDirectionalG: { value: 0.85 },
    uRayleighScaleHeight: { value: 8e3 },
    uMieScaleHeight: { value: 2.5e3 }, // Thicker lower atmosphere
    time: { value: 0 },
  },

  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vSunDirection;
    varying vec3 vNormal;

    uniform vec3 uSunPosition;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(normalMatrix * normal);
      vSunDirection = normalize(uSunPosition);

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,

  fragmentShader: `
    #define PI 3.14159265359
    #define PRIMARY_STEPS 16
    #define LIGHT_STEPS 8

    uniform vec3 uSunPosition;
    uniform float uSunIntensity;
    uniform float uPlanetRadius;
    uniform float uAtmosphereRadius;
    uniform vec3 uRayleighCoefficient;
    uniform float uMieCoefficient;
    uniform float uMieDirectionalG;
    uniform float uRayleighScaleHeight;
    uniform float uMieScaleHeight;
    uniform float time;

    varying vec3 vWorldPosition;
    varying vec3 vSunDirection;
    varying vec3 vNormal;

    // Rayleigh phase function
    float rayleighPhase(float cosTheta) {
      return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
    }

    // Mie phase function (Henyey-Greenstein)
    float miePhase(float cosTheta, float g) {
      float g2 = g * g;
      float denom = 1.0 + g2 - 2.0 * g * cosTheta;
      return (3.0 / (8.0 * PI)) * ((1.0 - g2) * (1.0 + cosTheta * cosTheta)) /
             ((2.0 + g2) * pow(denom, 1.5));
    }

    // Calculate atmospheric density at given height
    vec2 densityAtHeight(float height) {
      float rayleighDensity = exp(-height / uRayleighScaleHeight);
      float mieDensity = exp(-height / uMieScaleHeight);
      return vec2(rayleighDensity, mieDensity);
    }

    // Ray-sphere intersection
    vec2 raySphereIntersect(vec3 rayOrigin, vec3 rayDir, float radius) {
      float a = dot(rayDir, rayDir);
      float b = 2.0 * dot(rayOrigin, rayDir);
      float c = dot(rayOrigin, rayOrigin) - radius * radius;
      float discriminant = b * b - 4.0 * a * c;

      if (discriminant < 0.0) return vec2(-1.0);

      float sqrtDisc = sqrt(discriminant);
      return vec2(
        (-b - sqrtDisc) / (2.0 * a),
        (-b + sqrtDisc) / (2.0 * a)
      );
    }

    // Calculate optical depth along a ray
    float opticalDepth(vec3 rayOrigin, vec3 rayDir, float rayLength, float scaleHeight) {
      float stepSize = rayLength / float(LIGHT_STEPS);
      float optDepth = 0.0;

      for (int i = 0; i < LIGHT_STEPS; i++) {
        vec3 samplePoint = rayOrigin + rayDir * (float(i) + 0.5) * stepSize;
        float height = length(samplePoint) - uPlanetRadius;
        optDepth += exp(-height / scaleHeight) * stepSize;
      }

      return optDepth;
    }

    void main() {
      vec3 rayOrigin = cameraPosition;
      vec3 rayDir = normalize(vWorldPosition - cameraPosition);
      vec3 sunDir = normalize(uSunPosition);

      // Calculate atmosphere intersection
      vec2 atmosphereIntersect = raySphereIntersect(rayOrigin, rayDir, uAtmosphereRadius);

      if (atmosphereIntersect.x < 0.0) {
        discard;
      }

      // Calculate ray start and end in atmosphere
      float rayStart = max(atmosphereIntersect.x, 0.0);
      float rayEnd = atmosphereIntersect.y;

      // Check for planet intersection
      vec2 planetIntersect = raySphereIntersect(rayOrigin, rayDir, uPlanetRadius);
      if (planetIntersect.x > 0.0) {
        rayEnd = min(rayEnd, planetIntersect.x);
      }

      float rayLength = rayEnd - rayStart;
      float stepSize = rayLength / float(PRIMARY_STEPS);

      // Accumulate scattering
      vec3 totalRayleigh = vec3(0.0);
      vec3 totalMie = vec3(0.0);
      float opticalDepthRayleigh = 0.0;
      float opticalDepthMie = 0.0;

      for (int i = 0; i < PRIMARY_STEPS; i++) {
        vec3 samplePoint = rayOrigin + rayDir * (rayStart + (float(i) + 0.5) * stepSize);
        float height = length(samplePoint) - uPlanetRadius;

        // Calculate density at sample point
        vec2 density = densityAtHeight(height);
        float sampleDensityRayleigh = density.x * stepSize;
        float sampleDensityMie = density.y * stepSize;

        opticalDepthRayleigh += sampleDensityRayleigh;
        opticalDepthMie += sampleDensityMie;

        // Calculate light optical depth (sun to sample point)
        vec2 lightRayAtmosphere = raySphereIntersect(samplePoint, sunDir, uAtmosphereRadius);
        float lightRayLength = lightRayAtmosphere.y;

        float lightOptDepthRayleigh = opticalDepth(samplePoint, sunDir, lightRayLength, uRayleighScaleHeight);
        float lightOptDepthMie = opticalDepth(samplePoint, sunDir, lightRayLength, uMieScaleHeight);

        // Calculate attenuation
        vec3 tau = uRayleighCoefficient * (opticalDepthRayleigh + lightOptDepthRayleigh) +
                   uMieCoefficient * 1.1 * (opticalDepthMie + lightOptDepthMie);
        vec3 attenuation = exp(-tau);

        totalRayleigh += sampleDensityRayleigh * attenuation;
        totalMie += sampleDensityMie * attenuation;
      }

      // Calculate phase functions
      float cosTheta = dot(rayDir, sunDir);
      float rayleighP = rayleighPhase(cosTheta);
      float mieP = miePhase(cosTheta, uMieDirectionalG);

      // Final color
      vec3 rayleighScatter = totalRayleigh * uRayleighCoefficient * rayleighP;
      vec3 mieScatter = totalMie * uMieCoefficient * mieP;

      vec3 color = (rayleighScatter + mieScatter) * uSunIntensity;

      // Add subtle pulsing from volcanic activity
      float pulse = 1.0 + sin(time * 0.5) * 0.05;
      color *= pulse;

      // Fresnel-based edge glow (volcanic haze at horizon)
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
      color += vec3(1.0, 0.3, 0.05) * fresnel * 0.15;

      float alpha = clamp(length(color) * 2.0, 0.0, 0.85);

      gl_FragColor = vec4(color, alpha);
    }
  `,
};

/**
 * Fresnel Glow Shader for atmospheric halo effect
 */
export const AtmosphericHaloShader = {
  uniforms: {
    uGlowColor: { value: new THREE.Color(1.0, 0.3, 0.05) },
    uIntensity: { value: 0.25 },
    uPower: { value: 4.0 },
    time: { value: 0 },
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
    uniform vec3 uGlowColor;
    uniform float uIntensity;
    uniform float uPower;
    uniform float time;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), uPower);

      // Subtle pulse
      float pulse = 0.95 + sin(time * 0.7) * 0.05;

      vec3 glow = uGlowColor * fresnel * uIntensity * pulse;
      float alpha = fresnel * 0.6;

      gl_FragColor = vec4(glow, alpha);
    }
  `,
};

/**
 * Volumetric dust/ash shader for thick volcanic atmosphere
 */
export const VolcanicDustShader = {
  uniforms: {
    time: { value: 0 },
    uDensity: { value: 0.3 },
    uColor: { value: new THREE.Color(0.4, 0.25, 0.15) },
    uLightColor: { value: new THREE.Color(1.0, 0.5, 0.2) },
    uLightPosition: { value: new THREE.Vector3(0, 0, 0) },
    uCoreRadius: { value: 10.0 },
  },

  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;

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
    uniform float uDensity;
    uniform vec3 uColor;
    uniform vec3 uLightColor;
    uniform vec3 uLightPosition;
    uniform float uCoreRadius;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;

    // FBM noise for volumetric density
    float hash(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yxz + 19.19);
      return fract((p.x + p.y) * p.z);
    }

    float noise(vec3 p) {
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

    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      mat3 rot = mat3(0.877, 0.479, 0.0, -0.479, 0.877, 0.0, 0.0, 0.0, 1.0);

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = rot * p * 2.02;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      // Animated UV for drifting dust
      vec3 animatedPos = vWorldPosition + vec3(time * 0.05, time * 0.02, time * 0.03);

      // Sample FBM noise for dust density
      float dustDensity = fbm(animatedPos * 0.15);
      dustDensity = pow(dustDensity, 1.3);

      // Distance from core affects density
      float distFromCore = length(vWorldPosition);
      float heightFactor = smoothstep(uCoreRadius * 1.2, uCoreRadius * 2.5, distFromCore);

      // View-dependent opacity (thicker at edges)
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float edgeFactor = 1.0 - abs(dot(vNormal, viewDir));
      edgeFactor = pow(edgeFactor, 1.5);

      // Light scattering from core
      vec3 toLight = normalize(uLightPosition - vWorldPosition);
      float lightScatter = max(dot(vNormal, toLight), 0.0) * 0.5 + 0.5;

      // Final color with light interaction
      vec3 color = mix(uColor, uLightColor, lightScatter * 0.4);

      float alpha = dustDensity * uDensity * heightFactor * (0.5 + edgeFactor * 0.5);
      alpha = clamp(alpha, 0.0, 0.4);

      gl_FragColor = vec4(color, alpha);
    }
  `,
};
