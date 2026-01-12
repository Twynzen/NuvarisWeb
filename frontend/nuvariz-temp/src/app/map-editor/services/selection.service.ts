import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import * as THREE from 'three';

export interface SelectionState {
  selected: THREE.Object3D | null;
  hovered: THREE.Object3D | null;
}

@Injectable({ providedIn: 'root' })
export class SelectionService {
  private selectionState = new BehaviorSubject<SelectionState>({
    selected: null,
    hovered: null
  });

  readonly selection$ = this.selectionState.asObservable();

  private clickSubject = new Subject<THREE.Vector3>();
  readonly groundClick$ = this.clickSubject.asObservable();

  private selectionChangeSubject = new Subject<THREE.Object3D | null>();
  readonly selectionChange$ = this.selectionChangeSubject.asObservable();

  get currentSelection(): THREE.Object3D | null {
    return this.selectionState.value.selected;
  }

  get currentHovered(): THREE.Object3D | null {
    return this.selectionState.value.hovered;
  }

  select(object: THREE.Object3D | null): void {
    const current = this.selectionState.value;
    if (current.selected !== object) {
      // Remove highlight from previous selection
      if (current.selected) {
        this.removeHighlight(current.selected);
      }

      // Add highlight to new selection
      if (object) {
        this.addHighlight(object);
      }

      this.selectionState.next({ ...current, selected: object });
      this.selectionChangeSubject.next(object);
    }
  }

  hover(object: THREE.Object3D | null): void {
    const current = this.selectionState.value;
    if (current.hovered !== object) {
      // Don't change hover highlight if object is selected
      if (current.hovered && current.hovered !== current.selected) {
        this.removeHoverHighlight(current.hovered);
      }

      if (object && object !== current.selected) {
        this.addHoverHighlight(object);
      }

      this.selectionState.next({ ...current, hovered: object });
    }
  }

  emitGroundClick(point: THREE.Vector3): void {
    this.clickSubject.next(point);
  }

  clearSelection(): void {
    const current = this.selectionState.value;
    if (current.selected) {
      this.removeHighlight(current.selected);
    }
    this.selectionState.next({ selected: null, hovered: null });
    this.selectionChangeSubject.next(null);
  }

  private addHighlight(object: THREE.Object3D): void {
    // Store original color in userData
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        const material = child.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
        if (material.color) {
          child.userData['originalColor'] = material.color.getHex();
          // Tint with selection color (cyan)
          material.color.setHex(0x00ffff);
        }
      }
    });
  }

  private removeHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        const material = child.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
        if (material.color && child.userData['originalColor'] !== undefined) {
          material.color.setHex(child.userData['originalColor']);
        }
      }
    });
  }

  private addHoverHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        const material = child.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
        if (material.color && child.userData['originalColor'] === undefined) {
          child.userData['hoverColor'] = material.color.getHex();
          // Slight brighten for hover
          const color = new THREE.Color(material.color.getHex());
          color.offsetHSL(0, 0, 0.1);
          material.color.copy(color);
        }
      }
    });
  }

  private removeHoverHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        const material = child.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
        if (material.color && child.userData['hoverColor'] !== undefined) {
          material.color.setHex(child.userData['hoverColor']);
          delete child.userData['hoverColor'];
        }
      }
    });
  }
}
