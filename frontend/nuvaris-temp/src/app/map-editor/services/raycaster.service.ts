import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { SelectionService } from './selection.service';
import { EditorSceneService } from './editor-scene.service';

@Injectable({ providedIn: 'root' })
export class RaycasterService {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Click vs drag detection
  private mouseDownPos: { x: number; y: number } | null = null;
  private isDragging = false;
  private readonly DRAG_THRESHOLD = 5; // pixels

  private isInitialized = false;
  private boundOnMouseDown!: (event: MouseEvent) => void;
  private boundOnMouseMove!: (event: MouseEvent) => void;
  private boundOnMouseUp!: (event: MouseEvent) => void;

  constructor(
    private ngZone: NgZone,
    private selectionService: SelectionService,
    private sceneService: EditorSceneService
  ) {}

  initialize(): void {
    if (this.isInitialized) return;
    if (!this.sceneService.isReady) {
      console.warn('[Raycaster] Scene service not ready');
      return;
    }

    const canvas = this.sceneService.renderer.domElement;

    // Bind methods
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);

    // Run listeners OUTSIDE Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      canvas.addEventListener('mousedown', this.boundOnMouseDown);
      canvas.addEventListener('mousemove', this.boundOnMouseMove);
      canvas.addEventListener('mouseup', this.boundOnMouseUp);
    });

    this.isInitialized = true;
  }

  private getNDC(event: MouseEvent): THREE.Vector2 {
    const canvas = this.sceneService.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    this.mouse.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    return this.mouse;
  }

  private onMouseDown(event: MouseEvent): void {
    // Only handle left click for selection
    if (event.button !== 0) return;

    this.mouseDownPos = { x: event.clientX, y: event.clientY };
    this.isDragging = false;
  }

  private onMouseMove(event: MouseEvent): void {
    // Check for drag
    if (this.mouseDownPos) {
      const dx = event.clientX - this.mouseDownPos.x;
      const dy = event.clientY - this.mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }
    }

    // Hover detection (throttled)
    this.handleHover(event);
  }

  private onMouseUp(event: MouseEvent): void {
    // Only handle left click
    if (event.button !== 0) return;

    if (!this.isDragging && this.mouseDownPos) {
      this.handleClick(event);
    }

    this.mouseDownPos = null;
    this.isDragging = false;
  }

  private handleClick(event: MouseEvent): void {
    this.getNDC(event);
    this.raycaster.setFromCamera(this.mouse, this.sceneService.camera);

    // Check selectables first
    const objectIntersects = this.raycaster.intersectObjects(
      this.sceneService.selectables,
      true // recursive for groups
    );

    if (objectIntersects.length > 0) {
      // Find the root selectable object (might be a child of a group)
      let selectedObject = objectIntersects[0].object;

      // Walk up to find the root selectable
      while (selectedObject.parent && !this.sceneService.selectables.includes(selectedObject)) {
        selectedObject = selectedObject.parent;
      }

      // Enter Angular zone for state updates
      this.ngZone.run(() => {
        this.selectionService.select(selectedObject);
      });
      return;
    }

    // Check ground for placement
    const groundIntersects = this.raycaster.intersectObject(this.sceneService.ground);

    if (groundIntersects.length > 0) {
      this.ngZone.run(() => {
        this.selectionService.clearSelection();
        this.selectionService.emitGroundClick(groundIntersects[0].point);
      });
    }
  }

  private lastHoverTime = 0;
  private readonly HOVER_THROTTLE = 50; // ms

  private handleHover(event: MouseEvent): void {
    const now = Date.now();
    if (now - this.lastHoverTime < this.HOVER_THROTTLE) return;
    this.lastHoverTime = now;

    this.getNDC(event);
    this.raycaster.setFromCamera(this.mouse, this.sceneService.camera);

    const intersects = this.raycaster.intersectObjects(
      this.sceneService.selectables,
      true
    );

    if (intersects.length > 0) {
      let hoveredObject = intersects[0].object;

      // Walk up to find the root selectable
      while (hoveredObject.parent && !this.sceneService.selectables.includes(hoveredObject)) {
        hoveredObject = hoveredObject.parent;
      }

      this.selectionService.hover(hoveredObject);
    } else {
      this.selectionService.hover(null);
    }
  }

  // Get 3D point on ground from mouse position
  getGroundPoint(event: MouseEvent): THREE.Vector3 | null {
    this.getNDC(event);
    this.raycaster.setFromCamera(this.mouse, this.sceneService.camera);

    const intersects = this.raycaster.intersectObject(this.sceneService.ground);

    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }

    return null;
  }

  // Get 3D point on ground from normalized coordinates
  getGroundPointFromNDC(ndc: THREE.Vector2): THREE.Vector3 | null {
    this.raycaster.setFromCamera(ndc, this.sceneService.camera);

    const intersects = this.raycaster.intersectObject(this.sceneService.ground);

    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }

    return null;
  }

  dispose(): void {
    if (!this.isInitialized) return;

    const canvas = this.sceneService.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('mousedown', this.boundOnMouseDown);
      canvas.removeEventListener('mousemove', this.boundOnMouseMove);
      canvas.removeEventListener('mouseup', this.boundOnMouseUp);
    }

    this.isInitialized = false;
  }
}
