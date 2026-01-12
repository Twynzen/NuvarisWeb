import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { EditorSceneService } from './editor-scene.service';
import { SelectionService } from './selection.service';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface TransformState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface TransformCommand {
  objectId: string;
  objectName: string;
  mode: TransformMode;
  before: TransformState;
  after: TransformState;
}

@Injectable({ providedIn: 'root' })
export class TransformControlsService {
  private transformControls: TransformControls | null = null;
  private stateBeforeDrag: TransformState | null = null;

  // Public observables
  public transformChange$ = new Subject<TransformState>();
  public transformComplete$ = new Subject<TransformCommand>();
  public mode$ = new BehaviorSubject<TransformMode>('translate');
  public isActive$ = new BehaviorSubject<boolean>(false);
  public snapEnabled$ = new BehaviorSubject<boolean>(false);

  private isInitialized = false;
  private boundOnKeyDown!: (event: KeyboardEvent) => void;
  private boundOnKeyUp!: (event: KeyboardEvent) => void;

  constructor(
    private ngZone: NgZone,
    private sceneService: EditorSceneService,
    private selectionService: SelectionService
  ) {}

  initialize(): void {
    if (this.isInitialized) return;
    if (!this.sceneService.isReady) {
      console.warn('[TransformControls] Scene service not ready');
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.transformControls = new TransformControls(
        this.sceneService.camera,
        this.sceneService.renderer.domElement
      );

      // CRITICAL: Use getHelper() for Three.js r169+
      this.sceneService.scene.add(this.transformControls.getHelper());

      // Configure for 2.5D editor (no Y axis manipulation)
      this.configureFor2DEditor();

      // Setup event listeners
      this.setupEventListeners();
      this.setupKeyboardShortcuts();

      // Subscribe to selection changes
      this.selectionService.selectionChange$.subscribe(object => {
        if (object) {
          this.attach(object);
        } else {
          this.detach();
        }
      });
    });

    this.isInitialized = true;
  }

  private configureFor2DEditor(): void {
    if (!this.transformControls) return;

    this.transformControls.setSpace('world');
    this.transformControls.showX = true;
    this.transformControls.showY = false; // No vertical movement in 2.5D
    this.transformControls.showZ = true;
  }

  private setupEventListeners(): void {
    if (!this.transformControls) return;

    // Disable OrbitControls while dragging
    this.transformControls.addEventListener('dragging-changed', (event) => {
      const isDragging = event.value as boolean;
      this.sceneService.controls.enabled = !isDragging;

      this.ngZone.run(() => {
        this.isActive$.next(isDragging);

        if (isDragging) {
          // Drag started - save state for undo
          this.stateBeforeDrag = this.getCurrentState();
        } else {
          // Drag ended - emit command for undo/redo
          if (this.stateBeforeDrag && this.transformControls?.object) {
            const command: TransformCommand = {
              objectId: this.transformControls.object.uuid,
              objectName: this.transformControls.object.name || 'unnamed',
              mode: this.mode$.value,
              before: this.stateBeforeDrag,
              after: this.getCurrentState()!
            };
            this.transformComplete$.next(command);
          }
          this.stateBeforeDrag = null;
        }
      });
    });

    // Emit changes during drag
    this.transformControls.addEventListener('objectChange', () => {
      const state = this.getCurrentState();
      if (state) {
        this.ngZone.run(() => this.transformChange$.next(state));
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);

    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Ignore if typing in input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'w':
        this.setMode('translate');
        break;
      case 'e':
        this.setMode('rotate');
        break;
      case 'r':
        this.setMode('scale');
        break;
      case 'q':
        this.toggleSpace();
        break;
      case 'escape':
        this.reset();
        this.selectionService.clearSelection();
        break;
      case 'delete':
      case 'backspace':
        // Could emit delete event here
        break;
    }

    // Shift for snap
    if (event.key === 'Shift') {
      this.enableSnap(true);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.enableSnap(false);
    }
  }

  // Public API
  attach(object: THREE.Object3D): void {
    this.transformControls?.attach(object);
  }

  detach(): void {
    this.transformControls?.detach();
  }

  setMode(mode: TransformMode): void {
    this.transformControls?.setMode(mode);
    this.mode$.next(mode);

    // Reconfigure axes based on mode
    if (this.transformControls) {
      if (mode === 'rotate') {
        // Only allow Y rotation (spinning)
        this.transformControls.showX = false;
        this.transformControls.showY = true;
        this.transformControls.showZ = false;
      } else {
        // X and Z for translate/scale
        this.transformControls.showX = true;
        this.transformControls.showY = false;
        this.transformControls.showZ = true;
      }
    }
  }

  toggleSpace(): void {
    if (!this.transformControls) return;
    const current = this.transformControls.space;
    this.transformControls.setSpace(current === 'local' ? 'world' : 'local');
  }

  enableSnap(enable: boolean): void {
    if (!this.transformControls) return;

    this.snapEnabled$.next(enable);

    if (enable) {
      // Snap to 5 units (matches our grid)
      this.transformControls.setTranslationSnap(5);
      this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
      this.transformControls.setScaleSnap(0.25);
    } else {
      this.transformControls.setTranslationSnap(null);
      this.transformControls.setRotationSnap(null);
      this.transformControls.setScaleSnap(null);
    }
  }

  setTranslationSnap(value: number | null): void {
    this.transformControls?.setTranslationSnap(value);
  }

  setRotationSnap(degrees: number | null): void {
    if (degrees === null) {
      this.transformControls?.setRotationSnap(null);
    } else {
      this.transformControls?.setRotationSnap(THREE.MathUtils.degToRad(degrees));
    }
  }

  reset(): void {
    this.transformControls?.reset();
  }

  private getCurrentState(): TransformState | null {
    const obj = this.transformControls?.object;
    if (!obj) return null;

    return {
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone()
    };
  }

  // Apply a saved state (for undo/redo)
  applyState(objectId: string, state: TransformState): void {
    const obj = this.sceneService.scene.getObjectByProperty('uuid', objectId);
    if (obj) {
      obj.position.copy(state.position);
      obj.rotation.copy(state.rotation);
      obj.scale.copy(state.scale);
    }
  }

  dispose(): void {
    if (!this.isInitialized) return;

    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);

    if (this.transformControls) {
      this.transformControls.dispose();
      this.sceneService.scene.remove(this.transformControls.getHelper());
    }

    this.isInitialized = false;
  }
}
