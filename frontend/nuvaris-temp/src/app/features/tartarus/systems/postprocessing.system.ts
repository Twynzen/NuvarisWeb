import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Heat distortion shader
const HeatDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    distortionAmount: { value: 0.002 },
    enabled: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float distortionAmount;
    uniform float enabled;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      if (enabled > 0.5) {
        // Heat wave distortion
        float distortionX = sin(uv.y * 60.0 + time * 2.5) * distortionAmount;
        distortionX += sin(uv.y * 30.0 + time * 1.8) * distortionAmount * 0.5;

        float distortionY = cos(uv.x * 40.0 + time * 2.0) * distortionAmount * 0.5;

        // Reduce distortion at edges to avoid artifacts
        float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
        edgeFade *= smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);

        uv.x += distortionX * edgeFade;
        uv.y += distortionY * edgeFade;
      }

      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
};

// Vignette shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0.4 },
    smoothness: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float smoothness;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      vec2 center = vUv - 0.5;
      float dist = length(center);

      float vignette = smoothstep(0.5, 0.5 - smoothness, dist);
      vignette = mix(1.0, vignette, intensity);

      // Warm tint in vignette
      vec3 vignetteColor = vec3(0.1, 0.05, 0.02);
      color.rgb = mix(color.rgb * vignetteColor, color.rgb, vignette);

      gl_FragColor = color;
    }
  `,
};

// Color grading shader
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.1 },
    contrast: { value: 1.05 },
    brightness: { value: 0.0 },
    warmth: { value: 0.1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    uniform float warmth;
    varying vec2 vUv;

    vec3 adjustSaturation(vec3 color, float sat) {
      float grey = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(grey), color, sat);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Brightness
      color.rgb += brightness;

      // Contrast
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;

      // Saturation
      color.rgb = adjustSaturation(color.rgb, saturation);

      // Warmth (shift towards orange)
      color.r += warmth * 0.1;
      color.g += warmth * 0.05;
      color.b -= warmth * 0.05;

      // Clamp
      color.rgb = clamp(color.rgb, 0.0, 1.0);

      gl_FragColor = color;
    }
  `,
};

export interface PostProcessingOptions {
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  heatDistortionEnabled: boolean;
  heatDistortionAmount: number;
  vignetteEnabled: boolean;
  vignetteIntensity: number;
  colorGradingEnabled: boolean;
}

const DEFAULT_OPTIONS: PostProcessingOptions = {
  bloomEnabled: true,
  bloomStrength: 1.2,
  bloomRadius: 0.5,
  bloomThreshold: 0.7,
  heatDistortionEnabled: true,
  heatDistortionAmount: 0.0015,
  vignetteEnabled: true,
  vignetteIntensity: 0.35,
  colorGradingEnabled: true,
};

export class PostProcessingSystem {
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private heatPass!: ShaderPass;
  private vignettePass!: ShaderPass;
  private colorGradingPass!: ShaderPass;
  private options: PostProcessingOptions;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    options: Partial<PostProcessingOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.setupComposer();
  }

  private setupComposer(): void {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    this.composer = new EffectComposer(this.renderer);

    // Main render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      this.options.bloomStrength,
      this.options.bloomRadius,
      this.options.bloomThreshold
    );
    this.bloomPass.enabled = this.options.bloomEnabled;
    this.composer.addPass(this.bloomPass);

    // Heat distortion pass
    this.heatPass = new ShaderPass(HeatDistortionShader);
    this.heatPass.uniforms['distortionAmount'].value = this.options.heatDistortionAmount;
    this.heatPass.uniforms['enabled'].value = this.options.heatDistortionEnabled ? 1.0 : 0.0;
    this.composer.addPass(this.heatPass);

    // Color grading pass
    this.colorGradingPass = new ShaderPass(ColorGradingShader);
    this.colorGradingPass.enabled = this.options.colorGradingEnabled;
    this.composer.addPass(this.colorGradingPass);

    // Vignette pass
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['intensity'].value = this.options.vignetteIntensity;
    this.vignettePass.enabled = this.options.vignetteEnabled;
    this.composer.addPass(this.vignettePass);

    // Output pass for correct color space
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  render(): void {
    this.composer.render();
  }

  update(time: number): void {
    // Update heat distortion time
    this.heatPass.uniforms['time'].value = time;
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  setBloomEnabled(enabled: boolean): void {
    this.bloomPass.enabled = enabled;
    this.options.bloomEnabled = enabled;
  }

  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength;
    this.options.bloomStrength = strength;
  }

  setHeatDistortionEnabled(enabled: boolean): void {
    this.heatPass.uniforms['enabled'].value = enabled ? 1.0 : 0.0;
    this.options.heatDistortionEnabled = enabled;
  }

  setHeatDistortionAmount(amount: number): void {
    this.heatPass.uniforms['distortionAmount'].value = amount;
    this.options.heatDistortionAmount = amount;
  }

  setVignetteEnabled(enabled: boolean): void {
    this.vignettePass.enabled = enabled;
    this.options.vignetteEnabled = enabled;
  }

  setVignetteIntensity(intensity: number): void {
    this.vignettePass.uniforms['intensity'].value = intensity;
    this.options.vignetteIntensity = intensity;
  }

  getOptions(): PostProcessingOptions {
    return { ...this.options };
  }

  dispose(): void {
    this.composer.dispose();
  }
}
