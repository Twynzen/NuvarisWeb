import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// Object types for the catalog
interface CatalogItem {
  id: string;
  name: string;
  icon: string;
  type: 'wall' | 'portal' | 'spawn' | 'decoration' | 'biome';
  subtype?: string;
}

interface CatalogCategory {
  name: string;
  icon: string;
  expanded: boolean;
  items: CatalogItem[];
}

// Map object interface
interface MapObject {
  id: string;
  type: string;
  subtype?: string;
  mesh: THREE.Object3D;
  config: any;
}

@Component({
  selector: 'app-editor-viewport',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-viewport.component.html',
  styleUrls: ['./editor-viewport.component.scss']
})
export class EditorViewportComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Three.js core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private orbitControls!: OrbitControls;
  private transformControls!: TransformControls;
  private animationFrameId: number = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Map objects
  private mapObjects: MapObject[] = [];
  private groundPlane!: THREE.Mesh;
  private gridHelper!: THREE.GridHelper;

  // Selection state
  selectedObject: MapObject | null = null;
  currentMode: 'translate' | 'rotate' | 'scale' = 'translate';
  isSnapEnabled = false;

  // UI state
  cursorPosition = { x: 0, z: 0 };
  showGrid = true;
  showRanges = true;

  // Catalog - Only functional items
  objectCatalog: CatalogCategory[] = [
    {
      name: 'ESTRUCTURAS',
      icon: '🏗️',
      expanded: true,
      items: [
        { id: 'wall', name: 'Wall', icon: '🧱', type: 'wall', subtype: 'normal' }
      ]
    },
    {
      name: 'PORTALES',
      icon: '🌀',
      expanded: true,
      items: [
        { id: 'portal_spider', name: 'Portal Spider', icon: '🕷️', type: 'portal', subtype: 'spider' },
        { id: 'portal_worm', name: 'Portal Worm', icon: '🪱', type: 'portal', subtype: 'worm' }
      ]
    },
    {
      name: 'SPAWN POINTS',
      icon: '📍',
      expanded: true,
      items: [
        { id: 'spawn_player', name: 'Player Spawn', icon: '👤', type: 'spawn', subtype: 'player' },
        { id: 'spawn_enemy', name: 'Enemy Spawn Zone', icon: '💀', type: 'spawn', subtype: 'enemy' }
      ]
    }
  ];

  // Dragging from catalog
  private draggedItem: CatalogItem | null = null;
  private placementPreview: THREE.Object3D | null = null;

  // Menus
  showFileMenu = false;
  showEditMenu = false;
  showViewMenu = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.loadBaseMap();
    this.setupEventListeners();
    this.animate();

    console.log('[MapEditor] Initialized successfully');
  }

  private initThreeJS(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.set(80, 80, 80);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Orbit Controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.minDistance = 20;
    this.orbitControls.maxDistance = 300;
    this.orbitControls.maxPolarAngle = Math.PI / 2.2;
    this.orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };

    // Transform Controls
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setMode('translate');
    this.transformControls.setSpace('world');
    this.transformControls.showY = false; // 2.5D - no Y axis
    this.scene.add(this.transformControls.getHelper());

    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Ground
    this.createGround();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());
  }

  private createGround(): void {
    // Visible ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground_visible';
    this.scene.add(ground);

    // Raycast plane (invisible)
    const raycastGeo = new THREE.PlaneGeometry(250, 250);
    const raycastMat = new THREE.MeshBasicMaterial({ visible: false });
    this.groundPlane = new THREE.Mesh(raycastGeo, raycastMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0.01;
    this.groundPlane.name = 'ground_raycast';
    this.scene.add(this.groundPlane);

    // Grid
    this.gridHelper = new THREE.GridHelper(200, 40, 0x00f5ff, 0x1a1a2e);
    this.gridHelper.position.y = 0.02;
    (this.gridHelper.material as THREE.Material).opacity = 0.4;
    (this.gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(this.gridHelper);
  }

  private loadBaseMap(): void {
    // Create perimeter walls
    this.createWall('wall_north', 0, 100, 200, 4, true);
    this.createWall('wall_south', 0, -100, 200, 4, true);
    this.createWall('wall_east', 100, 0, 4, 200, true);
    this.createWall('wall_west', -100, 0, 4, 200, true);

    // Create portals based on game config
    this.createPortal('portal_spider_1', -40, -40, 'spider');
    this.createPortal('portal_spider_2', 40, 40, 'spider');
    this.createPortal('portal_worm_1', -40, 40, 'worm');
    this.createPortal('portal_worm_2', 40, -40, 'worm');

    // Create player spawn
    this.createSpawnPoint('player_spawn', 0, 0, 'player');

    console.log('[MapEditor] Base map loaded with', this.mapObjects.length, 'objects');
  }

  private createWall(id: string, x: number, z: number, width: number, depth: number, isPerimeter: boolean): void {
    const height = 8;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: isPerimeter ? 0x2a2a4a : 0x444466,
      roughness: 0.5
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = id;
    mesh.userData['type'] = 'wall';
    mesh.userData['isPerimeter'] = isPerimeter;

    this.scene.add(mesh);

    this.mapObjects.push({
      id,
      type: 'wall',
      subtype: isPerimeter ? 'perimeter' : 'normal',
      mesh,
      config: { x, z, width, depth, isPerimeter }
    });
  }

  private createPortal(id: string, x: number, z: number, type: 'spider' | 'worm'): void {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.name = id;
    group.userData['type'] = 'portal';
    group.userData['portalType'] = type;

    const color = type === 'spider' ? 0xff4444 : 0x8B6914;

    // Main ring
    const torusGeo = new THREE.TorusGeometry(5, 0.6, 16, 32);
    const torusMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI / 2;
    group.add(torus);

    // Center glow
    const sphereGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffff99, transparent: true, opacity: 0.9 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    // Detection range indicator
    const rangeGeo = new THREE.RingGeometry(29, 30, 32);
    const rangeMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const range = new THREE.Mesh(rangeGeo, rangeMat);
    range.rotation.x = -Math.PI / 2;
    range.position.y = 0.1;
    range.name = 'range_indicator';
    group.add(range);

    // Home range indicator
    const homeRangeGeo = new THREE.RingGeometry(14, 15, 32);
    const homeRangeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const homeRange = new THREE.Mesh(homeRangeGeo, homeRangeMat);
    homeRange.rotation.x = -Math.PI / 2;
    homeRange.position.y = 0.05;
    homeRange.name = 'home_range_indicator';
    group.add(homeRange);

    this.scene.add(group);

    this.mapObjects.push({
      id,
      type: 'portal',
      subtype: type,
      mesh: group,
      config: {
        x, z, type,
        homeRange: 15,
        detectionRange: 30,
        maxEnemies: 10,
        spawnRate: 2
      }
    });
  }

  private createSpawnPoint(id: string, x: number, z: number, type: 'player' | 'enemy'): void {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.name = id;
    group.userData['type'] = 'spawn';
    group.userData['spawnType'] = type;

    const color = type === 'player' ? 0x00ff00 : 0xffff00;

    // Cone indicator
    const coneGeo = new THREE.ConeGeometry(1.5, 4, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 2;
    group.add(cone);

    // Base circle
    const circleGeo = new THREE.RingGeometry(0.5, 3, 32);
    const circleMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.1;
    group.add(circle);

    this.scene.add(group);

    this.mapObjects.push({
      id,
      type: 'spawn',
      subtype: type,
      mesh: group,
      config: { x, z, type, radius: 3 }
    });
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    // Mouse click for selection
    canvas.addEventListener('click', (event) => this.onCanvasClick(event));

    // Mouse move for cursor position
    canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));

    // Keyboard shortcuts
    window.addEventListener('keydown', (event) => this.onKeyDown(event));

    // Close menus on outside click
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-btn') && !target.closest('.dropdown-menu')) {
        this.closeAllMenus();
      }
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    // Skip if clicking on transform controls
    if (this.transformControls.dragging) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for object selection (exclude perimeter walls)
    const selectables = this.mapObjects
      .filter(obj => !obj.mesh.userData['isPerimeter'])
      .map(obj => obj.mesh);

    const intersects = this.raycaster.intersectObjects(selectables, true);

    if (intersects.length > 0) {
      // Find the map object
      let hitObject = intersects[0].object;
      while (hitObject.parent && !selectables.includes(hitObject)) {
        hitObject = hitObject.parent;
      }

      const mapObj = this.mapObjects.find(o => o.mesh === hitObject);
      if (mapObj) {
        this.selectObject(mapObj);
      }
    } else {
      // Check ground click
      const groundIntersects = this.raycaster.intersectObject(this.groundPlane);
      if (groundIntersects.length > 0) {
        this.deselectObject();
      }
    }

    this.cdr.detectChanges();
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);

    if (intersects.length > 0) {
      this.cursorPosition.x = Math.round(intersects[0].point.x * 10) / 10;
      this.cursorPosition.z = Math.round(intersects[0].point.z * 10) / 10;
    }

    // Update placement preview if dragging from catalog
    if (this.placementPreview && intersects.length > 0) {
      this.placementPreview.position.x = intersects[0].point.x;
      this.placementPreview.position.z = intersects[0].point.z;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement) return;

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
      case 'escape':
        this.deselectObject();
        break;
      case 'delete':
      case 'backspace':
        this.deleteSelected();
        break;
      case 'd':
        if (event.ctrlKey) {
          event.preventDefault();
          this.duplicateSelected();
        }
        break;
      case 'z':
        if (event.ctrlKey) {
          event.preventDefault();
          // TODO: Undo
        }
        break;
      case 'g':
        this.toggleGrid();
        break;
    }

    // Shift for snap
    if (event.key === 'Shift') {
      this.enableSnap(true);
    }
  }

  private selectObject(obj: MapObject): void {
    // Deselect previous
    if (this.selectedObject) {
      this.removeHighlight(this.selectedObject.mesh);
    }

    this.selectedObject = obj;
    this.addHighlight(obj.mesh);
    this.transformControls.attach(obj.mesh);

    console.log('[MapEditor] Selected:', obj.id);
  }

  deselectObject(): void {
    if (this.selectedObject) {
      this.removeHighlight(this.selectedObject.mesh);
      this.transformControls.detach();
      this.selectedObject = null;
    }
    this.closeAllMenus();
  }

  private addHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material.color) {
          child.userData['originalColor'] = material.color.getHex();
          if (material.emissive) {
            material.emissive = new THREE.Color(0x00ffff);
            material.emissiveIntensity = 0.3;
          }
        }
      }
    });
  }

  private removeHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material.emissive) {
          material.emissive = new THREE.Color(0x000000);
          material.emissiveIntensity = 0;
        }
      }
    });
  }

  private onResize(): void {
    const container = this.canvasRef.nativeElement.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);
  };

  // ========== PUBLIC METHODS FOR UI ==========

  setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.currentMode = mode;
    this.transformControls.setMode(mode);

    if (mode === 'rotate') {
      this.transformControls.showX = false;
      this.transformControls.showY = true;
      this.transformControls.showZ = false;
    } else {
      this.transformControls.showX = true;
      this.transformControls.showY = false;
      this.transformControls.showZ = true;
    }
  }

  enableSnap(enable: boolean): void {
    this.isSnapEnabled = enable;
    if (enable) {
      this.transformControls.setTranslationSnap(5);
      this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
    } else {
      this.transformControls.setTranslationSnap(null);
      this.transformControls.setRotationSnap(null);
    }
  }

  toggleSnap(): void {
    this.enableSnap(!this.isSnapEnabled);
  }

  setView(preset: 'top' | 'front' | 'isometric' | 'side'): void {
    const distance = 120;
    let newPos: THREE.Vector3;

    switch (preset) {
      case 'top':
        newPos = new THREE.Vector3(0, distance, 0.001);
        break;
      case 'front':
        newPos = new THREE.Vector3(0, distance * 0.3, distance);
        break;
      case 'side':
        newPos = new THREE.Vector3(distance, distance * 0.3, 0);
        break;
      case 'isometric':
      default:
        newPos = new THREE.Vector3(80, 80, 80);
        break;
    }

    this.camera.position.copy(newPos);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.target.set(0, 0, 0);
  }

  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.gridHelper.visible = this.showGrid;
  }

  toggleRanges(): void {
    this.showRanges = !this.showRanges;
    this.mapObjects.forEach(obj => {
      if (obj.type === 'portal') {
        const rangeIndicator = obj.mesh.getObjectByName('range_indicator');
        const homeRangeIndicator = obj.mesh.getObjectByName('home_range_indicator');
        if (rangeIndicator) rangeIndicator.visible = this.showRanges;
        if (homeRangeIndicator) homeRangeIndicator.visible = this.showRanges;
      }
    });
  }

  toggleCategory(category: CatalogCategory): void {
    category.expanded = !category.expanded;
  }

  // ========== CATALOG ACTIONS ==========

  onCatalogItemClick(item: CatalogItem): void {
    // Create object at center and select it
    const id = `${item.id}_${Date.now()}`;

    switch (item.type) {
      case 'wall':
        this.createWall(id, 0, 0, 20, 4, false);
        break;
      case 'portal':
        this.createPortal(id, 0, 0, item.subtype as 'spider' | 'worm');
        break;
      case 'spawn':
        this.createSpawnPoint(id, 0, 0, item.subtype as 'player' | 'enemy');
        break;
    }

    // Select the newly created object
    const newObj = this.mapObjects[this.mapObjects.length - 1];
    this.selectObject(newObj);
    this.cdr.detectChanges();
  }

  // ========== EDIT ACTIONS ==========

  deleteSelected(): void {
    if (!this.selectedObject) return;
    if (this.selectedObject.mesh.userData['isPerimeter']) return; // Can't delete perimeter

    this.scene.remove(this.selectedObject.mesh);
    this.mapObjects = this.mapObjects.filter(o => o !== this.selectedObject);
    this.transformControls.detach();
    this.selectedObject = null;
    this.cdr.detectChanges();
  }

  duplicateSelected(): void {
    if (!this.selectedObject) return;

    const obj = this.selectedObject;
    const newId = `${obj.type}_${Date.now()}`;
    const offset = 10;

    switch (obj.type) {
      case 'wall':
        this.createWall(
          newId,
          obj.mesh.position.x + offset,
          obj.mesh.position.z + offset,
          obj.config.width,
          obj.config.depth,
          false
        );
        break;
      case 'portal':
        this.createPortal(
          newId,
          obj.mesh.position.x + offset,
          obj.mesh.position.z + offset,
          obj.subtype as 'spider' | 'worm'
        );
        break;
      case 'spawn':
        this.createSpawnPoint(
          newId,
          obj.mesh.position.x + offset,
          obj.mesh.position.z + offset,
          obj.subtype as 'player' | 'enemy'
        );
        break;
    }

    // Select the new object
    const newObj = this.mapObjects[this.mapObjects.length - 1];
    this.selectObject(newObj);
    this.cdr.detectChanges();
  }

  // ========== MENU ACTIONS ==========

  toggleMenu(menu: 'file' | 'edit' | 'view'): void {
    this.showFileMenu = menu === 'file' ? !this.showFileMenu : false;
    this.showEditMenu = menu === 'edit' ? !this.showEditMenu : false;
    this.showViewMenu = menu === 'view' ? !this.showViewMenu : false;
  }

  closeAllMenus(): void {
    this.showFileMenu = false;
    this.showEditMenu = false;
    this.showViewMenu = false;
  }

  // File menu actions
  newMap(): void {
    if (confirm('¿Crear nuevo mapa? Se perderán los cambios no guardados.')) {
      // Remove all non-perimeter objects
      this.mapObjects.filter(o => !o.mesh.userData['isPerimeter']).forEach(obj => {
        this.scene.remove(obj.mesh);
      });
      this.mapObjects = this.mapObjects.filter(o => o.mesh.userData['isPerimeter']);
      this.deselectObject();
    }
    this.closeAllMenus();
  }

  saveMap(): void {
    const mapData = {
      id: 'map_' + Date.now(),
      name: 'Sector Omega',
      version: '1.0',
      size: { width: 200, height: 200 },
      walls: this.mapObjects.filter(o => o.type === 'wall').map(o => ({
        id: o.id,
        position: [o.mesh.position.x, o.mesh.position.z],
        size: [o.config.width, o.config.depth],
        type: o.subtype
      })),
      portals: this.mapObjects.filter(o => o.type === 'portal').map(o => ({
        id: o.id,
        position: [o.mesh.position.x, o.mesh.position.z],
        type: o.subtype,
        homeRange: o.config.homeRange,
        detectionRange: o.config.detectionRange,
        maxEnemies: o.config.maxEnemies,
        spawnRate: o.config.spawnRate
      })),
      spawnPoints: this.mapObjects.filter(o => o.type === 'spawn').map(o => ({
        id: o.id,
        position: [o.mesh.position.x, o.mesh.position.z],
        type: o.subtype
      }))
    };

    const json = JSON.stringify(mapData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'map_config.json';
    a.click();

    URL.revokeObjectURL(url);
    this.closeAllMenus();
    console.log('[MapEditor] Map saved:', mapData);
  }

  loadMap(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const mapData = JSON.parse(event.target?.result as string);
          this.loadMapFromData(mapData);
          console.log('[MapEditor] Map loaded:', mapData);
        } catch (err) {
          alert('Error loading map file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
    this.closeAllMenus();
  }

  private loadMapFromData(data: any): void {
    // Clear existing non-perimeter objects
    this.mapObjects.filter(o => !o.mesh.userData['isPerimeter']).forEach(obj => {
      this.scene.remove(obj.mesh);
    });
    this.mapObjects = this.mapObjects.filter(o => o.mesh.userData['isPerimeter']);

    // Load walls
    data.walls?.forEach((w: any) => {
      if (w.type !== 'perimeter') {
        this.createWall(w.id, w.position[0], w.position[1], w.size[0], w.size[1], false);
      }
    });

    // Load portals
    data.portals?.forEach((p: any) => {
      this.createPortal(p.id, p.position[0], p.position[1], p.type);
    });

    // Load spawn points
    data.spawnPoints?.forEach((s: any) => {
      this.createSpawnPoint(s.id, s.position[0], s.position[1], s.type);
    });

    this.deselectObject();
  }

  loadTemplate(): void {
    this.loadBaseMap();
    this.closeAllMenus();
  }

  // ========== PROPERTIES PANEL ==========

  updateObjectPosition(axis: 'x' | 'z', value: number): void {
    if (!this.selectedObject) return;

    if (axis === 'x') {
      this.selectedObject.mesh.position.x = value;
    } else {
      this.selectedObject.mesh.position.z = value;
    }

    // Update config
    this.selectedObject.config[axis] = value;
  }

  updatePortalConfig(key: string, value: number): void {
    if (!this.selectedObject || this.selectedObject.type !== 'portal') return;

    this.selectedObject.config[key] = value;

    // Update visual indicators
    if (key === 'detectionRange') {
      const rangeIndicator = this.selectedObject.mesh.getObjectByName('range_indicator') as THREE.Mesh;
      if (rangeIndicator) {
        rangeIndicator.geometry.dispose();
        rangeIndicator.geometry = new THREE.RingGeometry(value - 1, value, 32);
      }
    } else if (key === 'homeRange') {
      const homeRangeIndicator = this.selectedObject.mesh.getObjectByName('home_range_indicator') as THREE.Mesh;
      if (homeRangeIndicator) {
        homeRangeIndicator.geometry.dispose();
        homeRangeIndicator.geometry = new THREE.RingGeometry(value - 1, value, 32);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.orbitControls?.dispose();
    this.transformControls?.dispose();
    this.renderer?.dispose();
  }
}
