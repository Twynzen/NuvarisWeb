import * as THREE from 'three';

export type NavigationMode = 'orbit' | 'explore' | 'focus';

interface NavigationState {
  mode: NavigationMode;
  target: THREE.Vector3;
  distance: number;
  rotation: { theta: number; phi: number };
  focusedObject: THREE.Object3D | null;
}

export class NavigationSystem {
  private state: NavigationState = {
    mode: 'orbit',
    target: new THREE.Vector3(0, 0, 0),
    distance: 50,
    rotation: { theta: 0, phi: Math.PI / 3 },
    focusedObject: null,
  };

  private smoothState: NavigationState;
  private camera: THREE.PerspectiveCamera;

  // Sensitivity settings
  private rotationSensitivity = 2.5;
  private zoomSensitivity = 80;

  // Constraints
  private minDistance = 18;
  private maxDistance = 120;
  private minPhi = 0.2;
  private maxPhi = Math.PI - 0.2;

  // Auto-rotation
  private autoRotate = true;
  private autoRotateSpeed = 0.0003;
  private lastInteractionTime = 0;
  private autoRotateDelay = 3000; // Resume auto-rotate after 3s of inactivity

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.smoothState = JSON.parse(JSON.stringify(this.state));
    this.smoothState.target = this.state.target.clone();
  }

  /**
   * Handle open hand gesture - Rotate around the planet
   */
  handleOpenHand(deltaX: number, deltaY: number): void {
    this.lastInteractionTime = performance.now();

    this.state.rotation.theta -= deltaX * this.rotationSensitivity;
    this.state.rotation.phi += deltaY * this.rotationSensitivity;

    // Clamp phi
    this.state.rotation.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.state.rotation.phi));
  }

  /**
   * Handle pinch gesture - Zoom in/out
   */
  handlePinch(deltaY: number): void {
    this.lastInteractionTime = performance.now();

    this.state.distance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.state.distance + deltaY * this.zoomSensitivity)
    );
  }

  /**
   * Handle point gesture - Slow pan
   */
  handlePoint(deltaX: number, deltaY: number): void {
    this.lastInteractionTime = performance.now();

    // Slower rotation for precise control
    this.state.rotation.theta -= deltaX * this.rotationSensitivity * 0.3;
  }

  /**
   * Handle fist gesture - Stop/select
   */
  handleFist(): void {
    this.lastInteractionTime = performance.now();
    // Could be used for selection in the future
  }

  /**
   * Keyboard controls for desktop
   */
  handleKeyboard(key: string, delta: number): void {
    this.lastInteractionTime = performance.now();

    const speed = delta * 2;

    switch (key) {
      case 'ArrowLeft':
      case 'a':
        this.state.rotation.theta += speed;
        break;
      case 'ArrowRight':
      case 'd':
        this.state.rotation.theta -= speed;
        break;
      case 'ArrowUp':
      case 'w':
        this.state.rotation.phi = Math.max(this.minPhi, this.state.rotation.phi - speed * 0.5);
        break;
      case 'ArrowDown':
      case 's':
        this.state.rotation.phi = Math.min(this.maxPhi, this.state.rotation.phi + speed * 0.5);
        break;
      case 'q':
        this.state.distance = Math.max(this.minDistance, this.state.distance - speed * 20);
        break;
      case 'e':
        this.state.distance = Math.min(this.maxDistance, this.state.distance + speed * 20);
        break;
    }
  }

  /**
   * Mouse wheel zoom
   */
  handleWheel(deltaY: number): void {
    this.lastInteractionTime = performance.now();

    const zoomSpeed = 0.05;
    this.state.distance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.state.distance + deltaY * zoomSpeed)
    );
  }

  /**
   * Mouse drag rotation
   */
  handleMouseDrag(deltaX: number, deltaY: number): void {
    this.lastInteractionTime = performance.now();

    this.state.rotation.theta -= deltaX * 0.01;
    this.state.rotation.phi += deltaY * 0.01;
    this.state.rotation.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.state.rotation.phi));
  }

  /**
   * Focus on a specific object
   */
  focusOn(object: THREE.Object3D, distance: number = 15): void {
    this.state.mode = 'focus';
    this.state.focusedObject = object;
    this.state.target.copy(object.position);
    this.state.distance = distance;
    this.lastInteractionTime = performance.now();
  }

  /**
   * Reset to orbital view
   */
  resetToOrbit(): void {
    this.state.mode = 'orbit';
    this.state.target.set(0, 0, 0);
    this.state.distance = 50;
    this.state.rotation.phi = Math.PI / 3;
    this.state.focusedObject = null;
  }

  /**
   * Set auto-rotation
   */
  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  /**
   * Update camera position - call this every frame
   */
  update(delta: number): void {
    const now = performance.now();

    // Auto-rotate if enabled and no recent interaction
    if (this.autoRotate && (now - this.lastInteractionTime) > this.autoRotateDelay) {
      this.state.rotation.theta += this.autoRotateSpeed;
    }

    // Smooth interpolation
    const smoothing = 0.08;

    this.smoothState.rotation.theta += (this.state.rotation.theta - this.smoothState.rotation.theta) * smoothing;
    this.smoothState.rotation.phi += (this.state.rotation.phi - this.smoothState.rotation.phi) * smoothing;
    this.smoothState.distance += (this.state.distance - this.smoothState.distance) * smoothing;
    this.smoothState.target.lerp(this.state.target, smoothing);

    // Calculate camera position in spherical coordinates
    const x = this.smoothState.distance * Math.sin(this.smoothState.rotation.phi) * Math.cos(this.smoothState.rotation.theta);
    const y = this.smoothState.distance * Math.cos(this.smoothState.rotation.phi);
    const z = this.smoothState.distance * Math.sin(this.smoothState.rotation.phi) * Math.sin(this.smoothState.rotation.theta);

    this.camera.position.set(
      this.smoothState.target.x + x,
      this.smoothState.target.y + y,
      this.smoothState.target.z + z
    );

    this.camera.lookAt(this.smoothState.target);
  }

  /**
   * Get current state for UI feedback
   */
  getState(): { distance: number; mode: NavigationMode } {
    return {
      distance: this.state.distance,
      mode: this.state.mode,
    };
  }

  /**
   * Get normalized zoom level (0-1)
   */
  getZoomLevel(): number {
    return (this.state.distance - this.minDistance) / (this.maxDistance - this.minDistance);
  }
}
