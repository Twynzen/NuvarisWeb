import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import * as THREE from 'three';

import { EditorSceneService } from '../../services/editor-scene.service';
import { SelectionService } from '../../services/selection.service';
import { RaycasterService } from '../../services/raycaster.service';
import { TransformControlsService, TransformMode } from '../../services/transform-controls.service';

@Component({
  selector: 'app-editor-viewport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-viewport.component.html',
  styleUrls: ['./editor-viewport.component.scss']
})
export class EditorViewportComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  currentMode: TransformMode = 'translate';
  isSnapEnabled = false;
  selectedObjectName: string | null = null;
  selectedObjectPosition: THREE.Vector3 | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private sceneService: EditorSceneService,
    private selectionService: SelectionService,
    private raycasterService: RaycasterService,
    private transformService: TransformControlsService
  ) {}

  ngAfterViewInit(): void {
    // Initialize scene
    this.sceneService.initialize(this.canvasRef.nativeElement);

    // Initialize raycaster (needs scene to be ready)
    setTimeout(() => {
      this.raycasterService.initialize();
      this.transformService.initialize();
    }, 100);

    // Subscribe to service events
    this.subscriptions.push(
      this.transformService.mode$.subscribe(mode => {
        this.currentMode = mode;
      }),

      this.transformService.snapEnabled$.subscribe(enabled => {
        this.isSnapEnabled = enabled;
      }),

      this.selectionService.selection$.subscribe(state => {
        if (state.selected) {
          this.selectedObjectName = state.selected.name || state.selected.userData['type'] || 'Object';
          this.selectedObjectPosition = state.selected.position.clone();
        } else {
          this.selectedObjectName = null;
          this.selectedObjectPosition = null;
        }
      }),

      this.transformService.transformChange$.subscribe(state => {
        this.selectedObjectPosition = state.position.clone();
      }),

      this.selectionService.groundClick$.subscribe(point => {
        console.log('[Editor] Ground clicked at:', point);
        // Future: Show context menu for placing objects
      })
    );
  }

  // Toolbar actions
  setMode(mode: TransformMode): void {
    this.transformService.setMode(mode);
  }

  setView(preset: 'top' | 'front' | 'isometric' | 'side'): void {
    this.sceneService.setView(preset);
  }

  toggleSnap(): void {
    this.transformService.enableSnap(!this.isSnapEnabled);
  }

  clearSelection(): void {
    this.selectionService.clearSelection();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.raycasterService.dispose();
    this.transformService.dispose();
    this.sceneService.ngOnDestroy();
  }
}
