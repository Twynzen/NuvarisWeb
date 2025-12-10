import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as THREE from 'three';

import { MediaPipeService, GestureType } from '../../core/services/mediapipe.service';
import { MagmaCoreSystem, TartarusConfig } from './systems/magma-core.system';
import { VolcanicIslandsSystem } from './systems/volcanic-islands.system';
import { AtmosphereSystem } from './systems/atmosphere.system';
import { CreaturesSystem } from './systems/creatures.system';
import { CitiesSystem } from './systems/cities.system';
import { NavigationSystem } from './systems/navigation.system';
import { PostProcessingSystem } from './systems/postprocessing.system';

interface PlanetLayer {
  name: string;
  mesh: THREE.Object3D;
  update: (time: number, delta: number) => void;
  dispose: () => void;
}

@Component({
  selector: 'app-tartarus',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="tartarus-container" #container>
      <!-- Three.js Canvas -->
      <canvas #canvas class="render-canvas"></canvas>

      <!-- Video for hand tracking (hidden) -->
      <video #video class="video-feed" [class.visible]="showVideo()" autoplay playsinline></video>

      <!-- UI Overlay -->
      <div class="ui-overlay">
        <!-- Back button -->
        <a routerLink="/home" class="back-button">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </a>

        <!-- Title -->
        <h1 class="title">TARTARUS PRIME</h1>

        <!-- Hand tracking indicator -->
        <div class="tracking-status" [class.active]="isHandDetected()">
          <div class="hand-icon" [class.detected]="isHandDetected()">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <span>{{ isHandDetected() ? getGestureLabel() : 'No hand detected' }}</span>
        </div>

        <!-- Controls help -->
        <div class="controls-help" [class.visible]="showControls()">
          <h3>Controls</h3>
          <div class="control-item">
            <span class="key">Open Hand</span>
            <span class="action">Rotate view</span>
          </div>
          <div class="control-item">
            <span class="key">Pinch</span>
            <span class="action">Zoom in/out</span>
          </div>
          <div class="control-item">
            <span class="key">Mouse Drag</span>
            <span class="action">Rotate view</span>
          </div>
          <div class="control-item">
            <span class="key">Scroll</span>
            <span class="action">Zoom</span>
          </div>
          <div class="control-item">
            <span class="key">WASD / Arrows</span>
            <span class="action">Rotate</span>
          </div>
          <div class="control-item">
            <span class="key">Q / E</span>
            <span class="action">Zoom</span>
          </div>
        </div>

        <!-- Toggle buttons -->
        <div class="toggle-buttons">
          <button
            class="toggle-btn"
            [class.active]="showVideo()"
            (click)="toggleVideo()"
            title="Toggle camera view"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
          <button
            class="toggle-btn"
            [class.active]="showControls()"
            (click)="toggleControls()"
            title="Toggle controls help"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
          </button>
          <button
            class="toggle-btn"
            [class.active]="handTrackingEnabled()"
            (click)="toggleHandTracking()"
            title="Toggle hand tracking"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 11V6.83l-3.59-3.59L13 4.66V3a1 1 0 0 0-2 0v1.66L9.59 3.24 6 6.83V11H4v9h16v-9h-2zm-8 0V7.41l2-2 2 2V11h-4z"/>
            </svg>
          </button>
        </div>

        <!-- Loading indicator -->
        <div class="loading" *ngIf="isLoading()">
          <div class="loading-spinner"></div>
          <p>Loading Tartarus Prime...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tartarus-container {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: #0a0a0f;
    }

    .render-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .video-feed {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      border-radius: 12px;
      border: 2px solid rgba(255, 68, 0, 0.5);
      object-fit: cover;
      opacity: 0;
      transform: scale(0.8);
      transition: opacity 0.3s, transform 0.3s;
      z-index: 10;
    }

    .video-feed.visible {
      opacity: 1;
      transform: scale(1);
    }

    .ui-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    }

    .ui-overlay > * {
      pointer-events: auto;
    }

    .back-button {
      position: absolute;
      top: 20px;
      left: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: rgba(255, 68, 0, 0.3);
      border-color: rgba(255, 68, 0, 0.5);
    }

    .back-button svg {
      width: 20px;
      height: 20px;
    }

    .title {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 1.5rem;
      font-weight: 300;
      letter-spacing: 0.5rem;
      color: rgba(255, 255, 255, 0.8);
      text-shadow: 0 0 20px rgba(255, 68, 0, 0.5);
      margin: 0;
    }

    .tracking-status {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      transition: all 0.3s;
    }

    .tracking-status.active {
      border-color: rgba(255, 68, 0, 0.5);
      color: rgba(255, 255, 255, 0.9);
    }

    .hand-icon {
      width: 24px;
      height: 24px;
      opacity: 0.5;
      transition: all 0.3s;
    }

    .hand-icon.detected {
      opacity: 1;
      color: #ff4400;
    }

    .controls-help {
      position: absolute;
      bottom: 20px;
      left: 20px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s;
      pointer-events: none;
    }

    .controls-help.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .controls-help h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }

    .control-item {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 8px;
      font-size: 12px;
    }

    .control-item:last-child {
      margin-bottom: 0;
    }

    .control-item .key {
      color: #ff6633;
      font-weight: 500;
    }

    .control-item .action {
      color: rgba(255, 255, 255, 0.6);
    }

    .toggle-buttons {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
    }

    .toggle-btn {
      width: 44px;
      height: 44px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: all 0.2s;
    }

    .toggle-btn:hover {
      background: rgba(255, 68, 0, 0.2);
      border-color: rgba(255, 68, 0, 0.4);
      color: white;
    }

    .toggle-btn.active {
      background: rgba(255, 68, 0, 0.3);
      border-color: #ff4400;
      color: #ff4400;
    }

    .toggle-btn svg {
      width: 100%;
      height: 100%;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 3px solid rgba(255, 68, 0, 0.2);
      border-top-color: #ff4400;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .title {
        font-size: 1rem;
        letter-spacing: 0.3rem;
      }

      .controls-help {
        display: none;
      }

      .video-feed {
        width: 150px;
        height: 112px;
        bottom: 80px;
      }
    }
  `]
})
export class TartarusComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;

  private ngZone = inject(NgZone);
  private mediaPipe = inject(MediaPipeService);

  // UI State
  isLoading = signal(true);
  showVideo = signal(false);
  showControls = signal(false);
  handTrackingEnabled = signal(false);

  // Computed from MediaPipe
  isHandDetected = this.mediaPipe.isHandDetected;

  // Three.js objects
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  // Systems
  private layers: PlanetLayer[] = [];
  private navigation!: NavigationSystem;
  private postProcessing!: PostProcessingSystem;

  // Input state
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private keysPressed = new Set<string>();

  // Animation frame
  private animationFrameId: number | null = null;

  // Planet config
  private config: TartarusConfig = {
    coreRadius: 10,
    atmosphereRadius: 25,
    islandCount: 14,
    volcanoCount: 8,
    creatureCount: 12,
    cityDensity: 0.6,
  };

  constructor() {
    // React to hand tracking changes
    effect(() => {
      const position = this.mediaPipe.handPosition();
      const gesture = this.mediaPipe.gesture();
      const delta = this.mediaPipe.getDelta();

      if (!position || !this.navigation) return;

      switch (gesture) {
        case 'open':
          this.navigation.handleOpenHand(delta.deltaX, delta.deltaY);
          break;
        case 'pinch':
          this.navigation.handlePinch(delta.deltaY);
          break;
        case 'point':
          this.navigation.handlePoint(delta.deltaX, delta.deltaY);
          break;
        case 'fist':
          this.navigation.handleFist();
          break;
      }
    });
  }

  ngOnInit(): void {
    // Initialize keyboard listeners
    this.setupKeyboardListeners();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initializeScene();
      this.initializePlanet();
      this.setupMouseListeners();
      this.startRenderLoop();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 30, 50);

    // Navigation system
    this.navigation = new NavigationSystem(this.camera);

    // Lighting
    this.setupLighting();

    // Starfield background
    this.createStarfield();

    // Post-processing
    this.postProcessing = new PostProcessingSystem(
      this.renderer,
      this.scene,
      this.camera
    );

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLighting(): void {
    // Core light (magma glow)
    const coreLight = new THREE.PointLight(0xff4400, 3, this.config.coreRadius * 5);
    coreLight.position.set(0, 0, 0);
    this.scene.add(coreLight);

    // Secondary warm light
    const warmLight = new THREE.PointLight(0xffaa00, 1.5, this.config.coreRadius * 4);
    warmLight.position.set(0, 2, 0);
    this.scene.add(warmLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x4a2c2a, 0.5);
    this.scene.add(ambientLight);

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0x8b4513, 0x1a0a00, 0.35);
    this.scene.add(hemiLight);

    // Fill lights
    const fillPositions = [
      new THREE.Vector3(this.config.coreRadius * 2, 5, 0),
      new THREE.Vector3(-this.config.coreRadius * 2, -3, this.config.coreRadius),
      new THREE.Vector3(0, -5, -this.config.coreRadius * 2),
    ];

    fillPositions.forEach((pos, i) => {
      const light = new THREE.PointLight(
        i === 0 ? 0xff6633 : 0x664422,
        0.4,
        this.config.coreRadius * 3
      );
      light.position.copy(pos);
      this.scene.add(light);
    });
  }

  private createStarfield(): void {
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribute stars in a sphere around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 100;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 1.5;

      // Slight color variation
      const colorVar = 0.8 + Math.random() * 0.2;
      colors[i * 3] = colorVar;
      colors[i * 3 + 1] = colorVar;
      colors[i * 3 + 2] = colorVar + Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;

        void main() {
          vColor = color;

          // Twinkle effect
          float twinkle = sin(time * 2.0 + position.x * 0.1 + position.y * 0.1) * 0.3 + 0.7;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * twinkle * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - dist * 2.0;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const stars = new THREE.Points(geometry, material);
    stars.userData = { material };
    this.scene.add(stars);
  }

  private initializePlanet(): void {
    // Create planet group
    const planetGroup = new THREE.Group();

    // Initialize all systems
    const magmaCore = new MagmaCoreSystem(this.config);
    const islands = new VolcanicIslandsSystem(this.config);
    const atmosphere = new AtmosphereSystem(this.config);
    const creatures = new CreaturesSystem(this.config);
    const cities = new CitiesSystem(this.config);

    // Add to layers for updates
    this.layers = [magmaCore, islands, atmosphere, creatures, cities];

    // Add meshes to planet group
    this.layers.forEach(layer => {
      planetGroup.add(layer.mesh);
    });

    this.scene.add(planetGroup);

    // Done loading
    this.ngZone.run(() => {
      this.isLoading.set(false);
    });
  }

  private setupMouseListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.navigation.handleMouseDrag(deltaX, deltaY);

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.navigation.handleWheel(e.deltaY);
    }, { passive: false });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.navigation.handleMouseDrag(deltaX, deltaY);

      this.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      // Handle keyboard input
      this.keysPressed.forEach(key => {
        this.navigation.handleKeyboard(key, delta);
      });

      // Update navigation
      this.navigation.update(delta);

      // Update all planet systems
      this.layers.forEach(layer => {
        layer.update(time, delta);
      });

      // Update starfield
      this.scene.children.forEach(child => {
        if (child instanceof THREE.Points && child.userData.material) {
          child.userData.material.uniforms.time.value = time;
        }
      });

      // Update post-processing
      this.postProcessing.update(time);

      // Render
      this.postProcessing.render();
    };

    animate();
  }

  private onWindowResize(): void {
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.postProcessing.resize(width, height);
  }

  // Public methods for UI
  getGestureLabel(): string {
    const gesture = this.mediaPipe.gesture();
    const labels: Record<GestureType, string> = {
      none: 'No gesture',
      open: 'Rotating',
      pinch: 'Zooming',
      fist: 'Hold',
      point: 'Pointing',
    };
    return labels[gesture];
  }

  toggleVideo(): void {
    this.showVideo.update(v => !v);
  }

  toggleControls(): void {
    this.showControls.update(v => !v);
  }

  async toggleHandTracking(): Promise<void> {
    if (this.handTrackingEnabled()) {
      this.mediaPipe.stopTracking();
      this.handTrackingEnabled.set(false);
      this.showVideo.set(false);
    } else {
      const video = this.videoRef.nativeElement;
      const initialized = await this.mediaPipe.initialize(video);

      if (initialized) {
        const started = await this.mediaPipe.startCamera();
        if (started) {
          this.handTrackingEnabled.set(true);
          this.showVideo.set(true);
        }
      }
    }
  }

  private cleanup(): void {
    // Stop animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Dispose MediaPipe
    this.mediaPipe.dispose();

    // Dispose layers
    this.layers.forEach(layer => layer.dispose());

    // Dispose post-processing
    this.postProcessing?.dispose();

    // Dispose renderer
    this.renderer?.dispose();

    // Remove event listeners
    window.removeEventListener('resize', () => this.onWindowResize());
  }
}
