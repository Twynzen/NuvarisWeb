# Three.js para Editor de Mapas Angular
## Investigacion Completa: Raycaster, TransformControls y OrbitControls

> **Version Three.js:** 0.181.2
> **Framework:** Angular 17+
> **Fecha:** 2025-11-28
> **Estado:** INVESTIGACION COMPLETADA - LISTO PARA DESARROLLO

---

## RESUMEN EJECUTIVO

**Three.js 0.181.2 funciona perfectamente con Angular 17+ para crear editores de mapas 2.5D**, pero requiere patrones especificos:

| Componente | Requisito Critico |
|------------|-------------------|
| **Raycaster + Sprites** | Uso OBLIGATORIO de `setFromCamera()` |
| **TransformControls r169+** | Usar `getHelper()` para agregar a escena |
| **OrbitControls Pan Limits** | Implementacion MANUAL con `target.clamp()` |

Los **THREE.Sprite funcionan con Raycaster y TransformControls**, aunque con limitaciones: se detectan como discos (no rectangulos) y su rotacion es solo 2D via `material.rotation`.

---

## 1. RAYCASTER

### 1.1 Conversion de Coordenadas NDC

```typescript
// CORRECTO: Canvas que NO llena toda la ventana
private getNormalizedCoords(event: MouseEvent, canvas: HTMLCanvasElement): THREE.Vector2 {
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
}

// INCORRECTO: Solo funciona si canvas llena ventana
mouse.x = (event.clientX / window.innerWidth) * 2 - 1;  // NO USAR
```

### 1.2 Propiedades del Raycaster

| Propiedad | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `near` | number | 0 | Distancia minima de interseccion |
| `far` | number | Infinity | Distancia maxima de interseccion |
| `layers` | Layers | default | Filtrar objetos por capa |
| `params.Sprite.threshold` | number | 1 | Tolerancia para deteccion de sprites |

### 1.3 Uso con Sprites (OBLIGATORIO setFromCamera)

```typescript
// FUNCIONA con Sprites
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObjects(sprites);

// NO FUNCIONA con Sprites - lanza error
raycaster.set(origin, direction);  // Falta referencia a camara
```

### 1.4 Estructura de Interseccion

```typescript
interface Intersection {
  distance: number;        // Distancia desde origen del rayo
  point: THREE.Vector3;    // Punto de interseccion en COORDENADAS MUNDO
  face: THREE.Face | null; // Cara intersectada (null para Sprites)
  object: THREE.Object3D;  // El objeto intersectado
  uv?: THREE.Vector2;      // Coordenadas UV en punto de interseccion
}
```

### 1.5 Filtrado con Layers

```typescript
const LAYER_DEFAULT = 0;
const LAYER_SELECTABLE = 1;
const LAYER_GROUND = 2;

// Configurar raycaster para solo revisar capa 1
raycaster.layers.set(LAYER_SELECTABLE);

// Habilitar capa en objetos
sprite.layers.enable(LAYER_SELECTABLE);

// Metodos:
// layers.set(n)    - SOLO capa n activa
// layers.enable(n) - Anadir capa n
// layers.disable(n)- Remover capa n
```

### 1.6 Click en Suelo para Placement

```typescript
// Opcion 1: Mesh invisible raycasteable
private createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(1000, 1000);
  const material = new THREE.MeshBasicMaterial({ visible: false });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;  // Horizontal (plano XZ)
  return ground;
}

// Opcion 2: THREE.Plane matematico (sin mesh)
private getGroundPointMath(event: MouseEvent): THREE.Vector3 | null {
  const mouse = this.getNormalizedCoords(event, this.canvas);
  this.raycaster.setFromCamera(mouse, this.camera);

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();

  return this.raycaster.ray.intersectPlane(groundPlane, target);
}
```

### 1.7 Diferenciacion Click vs Drag

```typescript
private mouseDownPosition: { x: number; y: number } | null = null;
private isDragging = false;
private readonly DRAG_THRESHOLD = 5;  // pixeles

onMouseDown(event: MouseEvent): void {
  this.mouseDownPosition = { x: event.clientX, y: event.clientY };
  this.isDragging = false;
}

onMouseMove(event: MouseEvent): void {
  if (this.mouseDownPosition) {
    const dx = event.clientX - this.mouseDownPosition.x;
    const dy = event.clientY - this.mouseDownPosition.y;
    if (Math.sqrt(dx * dx + dy * dy) > this.DRAG_THRESHOLD) {
      this.isDragging = true;
    }
  }
}

onMouseUp(event: MouseEvent): void {
  if (!this.isDragging && this.mouseDownPosition) {
    this.handleClick(event);  // Esto fue un CLICK, no drag
  }
  this.mouseDownPosition = null;
  this.isDragging = false;
}
```

---

## 2. TRANSFORM CONTROLS

### 2.1 BREAKING CHANGE en r169+ (CRITICO)

```typescript
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

const transformControls = new TransformControls(camera, renderer.domElement);

// ANTIGUO (antes de r169) - YA NO FUNCIONA
scene.add(transformControls);

// NUEVO (r169+) - OBLIGATORIO PARA THREE.JS 0.181.2
scene.add(transformControls.getHelper());

// Vincular a objeto
transformControls.attach(myObject);

// Desvincular
transformControls.detach();
```

### 2.2 Modos de Transformacion

| Modo | Metodo | Tecla | Visual |
|------|--------|-------|--------|
| Mover | `setMode('translate')` | W | Flechas X/Y/Z |
| Rotar | `setMode('rotate')` | E | Circulos de rotacion |
| Escalar | `setMode('scale')` | R | Cajas en ejes |

```typescript
window.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case 'w': transformControls.setMode('translate'); break;
    case 'e': transformControls.setMode('rotate'); break;
    case 'r': transformControls.setMode('scale'); break;
    case 'q':
      transformControls.setSpace(
        transformControls.space === 'local' ? 'world' : 'local'
      );
      break;
    case 'escape': transformControls.reset(); break;
  }
});
```

### 2.3 Configuracion para Editor 2.5D Top-Down

```typescript
transformControls.setSpace('world');
transformControls.showX = true;   // Mostrar eje X (rojo)
transformControls.showY = false;  // OCULTAR eje Y - no mover vertical
transformControls.showZ = true;   // Mostrar eje Z (azul)
```

### 2.4 Snap to Grid

```typescript
// Snap fijo
transformControls.setTranslationSnap(1);  // Pasos de 1 unidad
transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));  // 15 grados
transformControls.setScaleSnap(0.25);

// Desactivar snap
transformControls.setTranslationSnap(null);
transformControls.setRotationSnap(null);
transformControls.setScaleSnap(null);

// Toggle con Shift
window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') {
    transformControls.setTranslationSnap(1);
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    transformControls.setTranslationSnap(null);
  }
});
```

### 2.5 Eventos de TransformControls

| Evento | Cuando se dispara | Uso |
|--------|-------------------|-----|
| `change` | Cualquier cambio visual | Re-renderizar escena |
| `dragging-changed` | Inicia/termina drag | **Deshabilitar OrbitControls** |
| `objectChange` | Transform del objeto cambia | Actualizar UI, guardar estado |

```typescript
// CRITICO: Integracion con OrbitControls
transformControls.addEventListener('dragging-changed', (event) => {
  orbitControls.enabled = !event.value;
});

// Obtener valores despues de transformacion
transformControls.addEventListener('objectChange', () => {
  const obj = transformControls.object;
  console.log('Posicion:', obj.position.clone());
  console.log('Rotacion:', obj.rotation.clone());
  console.log('Escala:', obj.scale.clone());
});
```

### 2.6 TransformControls con Sprites

```typescript
// SI FUNCIONA
const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
transformControls.attach(sprite);

// LIMITACION: Rotacion solo afecta material.rotation (2D)
transformControls.addEventListener('objectChange', () => {
  if (transformControls.object?.isSprite) {
    const sprite = transformControls.object as THREE.Sprite;
    sprite.material.rotation = sprite.rotation.z;
  }
});

// ALTERNATIVA: Envolver sprite en Group para control 3D completo
const group = new THREE.Group();
const sprite = new THREE.Sprite(material);
group.add(sprite);
transformControls.attach(group);
```

---

## 3. ORBIT CONTROLS

### 3.1 Configuracion Basica

```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const controls = new OrbitControls(camera, renderer.domElement);

// OBLIGATORIO llamar update() en cada frame si usas damping
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
```

### 3.2 Limites de Movimiento

| Propiedad | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `minDistance` | number | 0 | Zoom minimo (PerspectiveCamera) |
| `maxDistance` | number | Infinity | Zoom maximo (PerspectiveCamera) |
| `minZoom` | number | 0 | Zoom minimo (OrthographicCamera) |
| `maxZoom` | number | Infinity | Zoom maximo (OrthographicCamera) |
| `minPolarAngle` | number | 0 | Angulo vertical minimo (0 = arriba) |
| `maxPolarAngle` | number | Math.PI | Angulo vertical maximo (PI = abajo) |

### 3.3 Configuracion para Editor 2.5D

```typescript
// Vista TOP-DOWN (sin rotacion)
controls.minPolarAngle = 0;
controls.maxPolarAngle = 0;
controls.enableRotate = false;

// Vista ISOMETRICA (angulo fijo 45)
const ISO_ANGLE = Math.PI / 4;
controls.minPolarAngle = ISO_ANGLE;
controls.maxPolarAngle = ISO_ANGLE;

// Vista con TILT LIMITADO (30-60 grados)
controls.minPolarAngle = Math.PI / 6;  // 30
controls.maxPolarAngle = Math.PI / 3;  // 60

// Limites de zoom
controls.minDistance = 50;
controls.maxDistance = 1000;
```

### 3.4 Limites de Pan (IMPLEMENTACION MANUAL)

**OrbitControls NO tiene `minPan`/`maxPan` nativo:**

```typescript
// Definir limites del mapa
const minPan = new THREE.Vector3(-500, 0, -500);
const maxPan = new THREE.Vector3(500, 0, 500);

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Aplicar limites de pan
  controls.target.clamp(minPan, maxPan);

  renderer.render(scene, camera);
}
```

### 3.5 Configuracion de Botones del Mouse

```typescript
import { MOUSE, TOUCH } from 'three';

// Configuracion recomendada para editor de mapas
controls.mouseButtons = {
  LEFT: MOUSE.PAN,       // Pan con click izquierdo
  MIDDLE: MOUSE.DOLLY,   // Zoom con rueda
  RIGHT: MOUSE.ROTATE    // Rotar con click derecho
};

controls.touches = {
  ONE: TOUCH.PAN,
  TWO: TOUCH.DOLLY_PAN
};
```

### 3.6 Vistas Predefinidas

```typescript
const VIEW_PRESETS = {
  TOP: new THREE.Vector3(0, 100, 0.001),
  FRONT: new THREE.Vector3(0, 0, 100),
  BACK: new THREE.Vector3(0, 0, -100),
  LEFT: new THREE.Vector3(-100, 0, 0),
  RIGHT: new THREE.Vector3(100, 0, 0),
  ISOMETRIC: new THREE.Vector3(100, 100, 100)
};

function setView(viewName: keyof typeof VIEW_PRESETS): void {
  const preset = VIEW_PRESETS[viewName];
  const distance = camera.position.distanceTo(controls.target);
  const direction = preset.clone().normalize();
  camera.position.copy(controls.target).add(direction.multiplyScalar(distance));
  camera.lookAt(controls.target);
  controls.update();
}
```

---

## 4. SERVICIOS ANGULAR COMPLETOS

### 4.1 SelectionService

```typescript
// selection.service.ts
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

  get currentSelection(): THREE.Object3D | null {
    return this.selectionState.value.selected;
  }

  select(object: THREE.Object3D | null): void {
    const current = this.selectionState.value;
    if (current.selected !== object) {
      this.selectionState.next({ ...current, selected: object });
    }
  }

  hover(object: THREE.Object3D | null): void {
    const current = this.selectionState.value;
    if (current.hovered !== object) {
      this.selectionState.next({ ...current, hovered: object });
    }
  }

  emitGroundClick(point: THREE.Vector3): void {
    this.clickSubject.next(point);
  }

  clearSelection(): void {
    this.selectionState.next({ selected: null, hovered: null });
  }
}
```

### 4.2 RaycasterService

```typescript
// raycaster.service.ts
import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { SelectionService } from './selection.service';

@Injectable({ providedIn: 'root' })
export class RaycasterService {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private camera!: THREE.Camera;
  private canvas!: HTMLCanvasElement;
  private selectableObjects: THREE.Object3D[] = [];
  private groundPlane!: THREE.Mesh;

  private mouseDownPos: { x: number; y: number } | null = null;
  private isDragging = false;
  private readonly DRAG_THRESHOLD = 5;

  constructor(
    private ngZone: NgZone,
    private selectionService: SelectionService
  ) {}

  initialize(
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
    selectables: THREE.Object3D[],
    ground: THREE.Mesh
  ): void {
    this.camera = camera;
    this.canvas = canvas;
    this.selectableObjects = selectables;
    this.groundPlane = ground;

    this.ngZone.runOutsideAngular(() => {
      canvas.addEventListener('mousedown', this.onMouseDown);
      canvas.addEventListener('mousemove', this.onMouseMove);
      canvas.addEventListener('mouseup', this.onMouseUp);
    });
  }

  private getNDC(event: MouseEvent): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    return this.mouse;
  }

  private onMouseDown = (event: MouseEvent): void => {
    this.mouseDownPos = { x: event.clientX, y: event.clientY };
    this.isDragging = false;
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (this.mouseDownPos) {
      const dx = event.clientX - this.mouseDownPos.x;
      const dy = event.clientY - this.mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }
    }
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (!this.isDragging && this.mouseDownPos) {
      this.handleClick(event);
    }
    this.mouseDownPos = null;
    this.isDragging = false;
  };

  private handleClick(event: MouseEvent): void {
    this.getNDC(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const objectIntersects = this.raycaster.intersectObjects(
      this.selectableObjects,
      false
    );

    if (objectIntersects.length > 0) {
      this.ngZone.run(() => {
        this.selectionService.select(objectIntersects[0].object);
      });
      return;
    }

    const groundIntersects = this.raycaster.intersectObject(this.groundPlane);
    if (groundIntersects.length > 0) {
      this.ngZone.run(() => {
        this.selectionService.select(null);
        this.selectionService.emitGroundClick(groundIntersects[0].point);
      });
    }
  }

  addSelectable(object: THREE.Object3D): void {
    this.selectableObjects.push(object);
  }

  removeSelectable(object: THREE.Object3D): void {
    const index = this.selectableObjects.indexOf(object);
    if (index > -1) this.selectableObjects.splice(index, 1);
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
  }
}
```

### 4.3 TransformControlsService

```typescript
// transform-controls.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export interface TransformState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface TransformCommand {
  objectId: string;
  before: TransformState;
  after: TransformState;
}

@Injectable({ providedIn: 'root' })
export class TransformControlsService {
  private transformControls: TransformControls | null = null;
  private orbitControls: OrbitControls | null = null;
  private scene: THREE.Scene | null = null;
  private stateBeforeDrag: TransformState | null = null;

  public transformChange$ = new Subject<TransformState>();
  public transformComplete$ = new Subject<TransformCommand>();
  public mode$ = new BehaviorSubject<'translate' | 'rotate' | 'scale'>('translate');
  public isActive$ = new BehaviorSubject<boolean>(false);

  constructor(private ngZone: NgZone) {}

  initialize(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    orbitControls?: OrbitControls
  ): void {
    this.scene = scene;
    this.orbitControls = orbitControls || null;

    this.transformControls = new TransformControls(camera, renderer.domElement);

    // OBLIGATORIO para r169+
    scene.add(this.transformControls.getHelper());

    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }

  private setupEventListeners(): void {
    if (!this.transformControls) return;

    this.transformControls.addEventListener('dragging-changed', (event) => {
      if (this.orbitControls) {
        this.orbitControls.enabled = !event.value;
      }

      this.ngZone.run(() => {
        this.isActive$.next(event.value);

        if (event.value) {
          this.stateBeforeDrag = this.getCurrentState();
        } else {
          if (this.stateBeforeDrag && this.transformControls?.object) {
            const command: TransformCommand = {
              objectId: this.transformControls.object.uuid,
              before: this.stateBeforeDrag,
              after: this.getCurrentState()!
            };
            this.transformComplete$.next(command);
          }
          this.stateBeforeDrag = null;
        }
      });
    });

    this.transformControls.addEventListener('objectChange', () => {
      const state = this.getCurrentState();
      if (state) {
        this.ngZone.run(() => this.transformChange$.next(state));
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement) return;

      switch (event.key.toLowerCase()) {
        case 'w': this.setMode('translate'); break;
        case 'e': this.setMode('rotate'); break;
        case 'r': this.setMode('scale'); break;
        case 'q': this.toggleSpace(); break;
        case 'escape': this.reset(); break;
      }

      if (event.key === 'Shift') this.enableSnap(true);
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') this.enableSnap(false);
    });
  }

  attach(object: THREE.Object3D): void {
    this.transformControls?.attach(object);
  }

  detach(): void {
    this.transformControls?.detach();
  }

  setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.transformControls?.setMode(mode);
    this.mode$.next(mode);
  }

  toggleSpace(): void {
    if (!this.transformControls) return;
    const current = this.transformControls.space;
    this.transformControls.setSpace(current === 'local' ? 'world' : 'local');
  }

  enableSnap(enable: boolean): void {
    if (!this.transformControls) return;
    if (enable) {
      this.transformControls.setTranslationSnap(1);
      this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
      this.transformControls.setScaleSnap(0.25);
    } else {
      this.transformControls.setTranslationSnap(null);
      this.transformControls.setRotationSnap(null);
      this.transformControls.setScaleSnap(null);
    }
  }

  configureFor2DEditor(): void {
    if (!this.transformControls) return;
    this.transformControls.setSpace('world');
    this.transformControls.showX = true;
    this.transformControls.showY = false;
    this.transformControls.showZ = true;
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

  dispose(): void {
    if (this.transformControls && this.scene) {
      this.transformControls.dispose();
      this.scene.remove(this.transformControls.getHelper());
    }
  }
}
```

### 4.4 SceneService

```typescript
// scene.service.ts
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Injectable({ providedIn: 'root' })
export class SceneService implements OnDestroy {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;

  private animationFrameId: number = 0;
  private canvas!: HTMLCanvasElement;

  private readonly minPan = new THREE.Vector3(-100, 0, -100);
  private readonly maxPan = new THREE.Vector3(100, 0, 100);

  constructor(private ngZone: NgZone) {}

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    this.ngZone.runOutsideAngular(() => {
      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupControls();
      this.setupResizeHandler();
      this.animate();
    });
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
  }

  private setupCamera(): void {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
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
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.screenSpacePanning = true;

    this.controls.minDistance = 20;
    this.controls.maxDistance = 500;

    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 3;

    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
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

    this.controls.update();
    this.controls.target.clamp(this.minPan, this.maxPan);

    this.renderer.render(this.scene, this.camera);
  };

  triggerChangeDetection(): void {
    this.ngZone.run(() => {});
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
```

---

## 5. ERRORES COMUNES Y SOLUCIONES

| Error | Causa | Solucion |
|-------|-------|----------|
| Raycaster no detecta Sprites | Usando `set()` en vez de `setFromCamera()` | Siempre usar `raycaster.setFromCamera(mouse, camera)` |
| TransformControls invisible | Patron antiguo `scene.add(controls)` | Usar `scene.add(controls.getHelper())` para r169+ |
| OrbitControls se activa al transformar | No hay integracion entre controles | Usar evento `dragging-changed` para deshabilitar orbit |
| Damping no funciona | Falta `update()` en loop | Llamar `controls.update()` en cada frame |
| Limites de pan no existen | No es feature nativo | Implementar `controls.target.clamp()` manualmente |
| Performance lento en Angular | Zone.js detecta cambios | Usar `ngZone.runOutsideAngular()` para render loop |
| Rotacion de Sprite no funciona | Sprites usan rotacion 2D | Aplicar a `sprite.material.rotation` o envolver en Group |
| Coordenadas de mouse incorrectas | Canvas no llena ventana | Usar `getBoundingClientRect()` para calcular offset |

---

## 6. CONFIGURACION OPTIMA PARA EDITOR 2.5D

```typescript
// Configuracion combinando los tres sistemas
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.screenSpacePanning = true;
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = Math.PI / 3;
controls.minDistance = 20;
controls.maxDistance = 500;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE
};

const transformControls = new TransformControls(camera, renderer.domElement);
scene.add(transformControls.getHelper());  // OBLIGATORIO r169+
transformControls.setSpace('world');
transformControls.showY = false;  // Solo X y Z para 2.5D

// Integracion critica
transformControls.addEventListener('dragging-changed', (e) => {
  controls.enabled = !e.value;
});

// Limites de pan (en animation loop)
const minPan = new THREE.Vector3(-100, 0, -100);
const maxPan = new THREE.Vector3(100, 0, 100);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  controls.target.clamp(minPan, maxPan);
  renderer.render(scene, camera);
}
```

---

> **ESTADO:** Investigacion completada. Listo para desarrollo del Map Editor.
