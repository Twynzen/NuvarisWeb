import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapConfig, DEFAULT_MAP_CONFIG } from '../interfaces/map-config.interface';

@Injectable({ providedIn: 'root' })
export class EditorSceneService implements OnDestroy {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;

  private animationFrameId: number = 0;
  private canvas!: HTMLCanvasElement;
  private isInitialized = false;

  // Map bounds for pan limits (based on mathematical analysis)
  private readonly minPan = new THREE.Vector3(-100, 0, -100);
  private readonly maxPan = new THREE.Vector3(100, 0, 100);

  // Selectables for raycasting
  private selectableObjects: THREE.Object3D[] = [];
  private groundPlane!: THREE.Mesh;

  // Current map config
  private currentConfig: MapConfig = DEFAULT_MAP_CONFIG;

  // Render callback for external updates
  private renderCallbacks: (() => void)[] = [];

  constructor(private ngZone: NgZone) {}

  get isReady(): boolean {
    return this.isInitialized;
  }

  get selectables(): THREE.Object3D[] {
    return this.selectableObjects;
  }

  get ground(): THREE.Mesh {
    return this.groundPlane;
  }

  initialize(canvas: HTMLCanvasElement): void {
    if (this.isInitialized) {
      console.warn('[EditorScene] Already initialized');
      return;
    }

    this.canvas = canvas;

    // Run Three.js OUTSIDE Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupControls();
      this.setupLighting();
      this.createGround();
      this.loadDefaultMap();
      this.setupResizeHandler();
      this.animate();
    });

    this.isInitialized = true;
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.currentConfig.ground.color);

    if (this.currentConfig.fog.enabled) {
      this.scene.fog = new THREE.Fog(
        this.currentConfig.fog.color,
        this.currentConfig.fog.near,
        this.currentConfig.fog.far
      );
    }
  }

  private setupCamera(): void {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    // Isometric-style position
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Damping for smooth movement
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Pan configuration
    this.controls.screenSpacePanning = true;
    this.controls.enablePan = true;

    // Zoom limits
    this.controls.minDistance = 20;
    this.controls.maxDistance = 300;

    // Angle limits (keep view between 30-60 degrees)
    this.controls.minPolarAngle = Math.PI / 6;  // 30 degrees
    this.controls.maxPolarAngle = Math.PI / 3;  // 60 degrees

    // Mouse button configuration for editor
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,      // Pan with left click
      MIDDLE: THREE.MOUSE.DOLLY,  // Zoom with scroll
      RIGHT: THREE.MOUSE.ROTATE   // Rotate with right click
    };

    // Touch configuration
    this.controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
  }

  private setupLighting(): void {
    const config = this.currentConfig.lighting;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(config.directionalColor, config.directionalIntensity);
    directionalLight.position.set(
      config.directionalPosition.x,
      config.directionalPosition.y,
      config.directionalPosition.z
    );
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  private createGround(): void {
    const size = this.currentConfig.size.width;

    // Visible ground plane
    const groundGeo = new THREE.PlaneGeometry(size, size, 50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      color: this.currentConfig.ground.color,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground_visible';
    this.scene.add(ground);

    // Invisible raycast plane (slightly larger for edge detection)
    const raycastGeo = new THREE.PlaneGeometry(size + 50, size + 50);
    const raycastMat = new THREE.MeshBasicMaterial({ visible: false });
    this.groundPlane = new THREE.Mesh(raycastGeo, raycastMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0.01;
    this.groundPlane.name = 'ground_raycast';
    this.scene.add(this.groundPlane);

    // Grid helper
    if (this.currentConfig.ground.gridVisible) {
      const gridHelper = new THREE.GridHelper(
        size,
        this.currentConfig.ground.gridDivisions,
        this.currentConfig.ground.gridColor1,
        this.currentConfig.ground.gridColor2
      );
      gridHelper.position.y = 0.02;
      (gridHelper.material as THREE.Material).opacity = 0.3;
      (gridHelper.material as THREE.Material).transparent = true;
      gridHelper.name = 'grid';
      this.scene.add(gridHelper);
    }
  }

  private loadDefaultMap(): void {
    // Create walls
    this.createWalls();

    // Create portals (visual representation)
    this.createPortals();

    // Create spawn point indicator
    this.createSpawnPoints();
  }

  private createWalls(): void {
    const textureLoader = new THREE.TextureLoader();

    this.currentConfig.walls.forEach(wallConfig => {
      const geometry = new THREE.BoxGeometry(
        wallConfig.dimensions.x,
        wallConfig.dimensions.y,
        wallConfig.dimensions.z
      );

      const material = new THREE.MeshStandardMaterial({
        color: 0x444466,
        roughness: 0.5,
        metalness: 0.3
      });

      const wall = new THREE.Mesh(geometry, material);
      wall.position.set(wallConfig.position.x, wallConfig.position.y, wallConfig.position.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.name = wallConfig.id;
      wall.userData['type'] = 'wall';
      wall.userData['config'] = wallConfig;

      this.scene.add(wall);

      // Only internal walls are selectable
      if (wallConfig.type !== 'perimeter') {
        this.selectableObjects.push(wall);
      }
    });
  }

  private createPortals(): void {
    this.currentConfig.portals.forEach(portalConfig => {
      const group = new THREE.Group();
      group.position.set(portalConfig.position.x, portalConfig.position.y, portalConfig.position.z);
      group.name = portalConfig.id;
      group.userData['type'] = 'portal';
      group.userData['config'] = portalConfig;

      // Portal visualization based on type
      const color = portalConfig.type === 'spider' ? 0xff4444 : 0x8B6914;

      // Main ring
      const torusGeo = new THREE.TorusGeometry(5, 0.6, 16, 32);
      const torusMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = Math.PI / 2;
      group.add(torus);

      // Center sphere
      const sphereGeo = new THREE.SphereGeometry(1.2, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: 0xffff99,
        transparent: true,
        opacity: 0.9
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);

      // Detection range indicator (wireframe circle)
      const rangeGeo = new THREE.RingGeometry(portalConfig.detectionRange - 0.5, portalConfig.detectionRange, 32);
      const rangeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      });
      const range = new THREE.Mesh(rangeGeo, rangeMat);
      range.rotation.x = -Math.PI / 2;
      range.position.y = 0.1;
      group.add(range);

      this.scene.add(group);
      this.selectableObjects.push(group);
    });
  }

  private createSpawnPoints(): void {
    this.currentConfig.spawnPoints.forEach(spawnConfig => {
      const group = new THREE.Group();
      group.position.set(spawnConfig.position.x, 0.5, spawnConfig.position.z);
      group.name = spawnConfig.id;
      group.userData['type'] = 'spawnpoint';
      group.userData['config'] = spawnConfig;

      // Spawn point indicator
      const color = spawnConfig.type === 'player' ? 0x00ff00 : 0xffff00;

      const coneGeo = new THREE.ConeGeometry(1, 3, 8);
      const coneMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 1.5;
      group.add(cone);

      // Base circle
      const circleGeo = new THREE.RingGeometry(0.5, spawnConfig.radius, 32);
      const circleMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.rotation.x = -Math.PI / 2;
      group.add(circle);

      this.scene.add(group);
      this.selectableObjects.push(group);
    });
  }

  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver(() => this.onResize());
    resizeObserver.observe(this.canvas);
  }

  private onResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Update controls
    this.controls.update();

    // Apply pan limits
    this.controls.target.clamp(this.minPan, this.maxPan);

    // Execute render callbacks
    this.renderCallbacks.forEach(cb => cb());

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  // Public API
  addRenderCallback(callback: () => void): void {
    this.renderCallbacks.push(callback);
  }

  removeRenderCallback(callback: () => void): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index > -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  addSelectable(object: THREE.Object3D): void {
    if (!this.selectableObjects.includes(object)) {
      this.selectableObjects.push(object);
    }
  }

  removeSelectable(object: THREE.Object3D): void {
    const index = this.selectableObjects.indexOf(object);
    if (index > -1) {
      this.selectableObjects.splice(index, 1);
    }
  }

  // View presets
  setView(preset: 'top' | 'front' | 'isometric' | 'side'): void {
    const distance = this.camera.position.distanceTo(this.controls.target);
    let newPosition: THREE.Vector3;

    switch (preset) {
      case 'top':
        newPosition = new THREE.Vector3(0, distance, 0.001);
        break;
      case 'front':
        newPosition = new THREE.Vector3(0, distance * 0.3, distance);
        break;
      case 'side':
        newPosition = new THREE.Vector3(distance, distance * 0.3, 0);
        break;
      case 'isometric':
      default:
        const d = distance / Math.sqrt(3);
        newPosition = new THREE.Vector3(d, d, d);
        break;
    }

    // Animate camera movement
    const startPos = this.camera.position.clone();
    const startTime = Date.now();
    const duration = 500;

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      this.camera.position.lerpVectors(startPos, newPosition, eased);
      this.camera.lookAt(this.controls.target);

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }

  // Trigger Angular change detection when needed
  triggerChangeDetection(): void {
    this.ngZone.run(() => {});
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.selectableObjects = [];
    this.renderCallbacks = [];
    this.isInitialized = false;
  }
}
