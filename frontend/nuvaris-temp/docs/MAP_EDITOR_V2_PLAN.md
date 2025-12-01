# Map Editor V2 - Plan de Mejoras Procedurales

## Resumen Ejecutivo

Este documento detalla las mejoras necesarias para el sistema de generación procedural de mapas en NUVARIS. El objetivo es crear un editor robusto que permita:

1. Control preciso sobre el número de habitaciones
2. Visualización en tiempo real de cambios
3. Edición híbrida (manual + procedural)
4. Corredores inteligentes que respeten la geometría existente
5. Compatibilidad total con el sistema de fog occlusion

---

## Estado Actual - Problemas Identificados

### 1. **Corredores atraviesan habitaciones**
- **Ubicación**: `procedural-map-generator.ts:389-446`
- **Problema**: Los corredores en L se dibujan desde centro a centro sin verificar si atraviesan otras habitaciones
- **Impacto**: Muros duplicados, colisiones incorrectas, visual roto

### 2. **Control de habitaciones impreciso**
- **Problema**: `maxDepth` controla indirectamente el número de rooms, pero no garantiza cantidad exacta
- **Impacto**: No se puede especificar "quiero exactamente 5 habitaciones"

### 3. **Puertas colisionan con muros**
- **Ubicación**: `procedural-map-generator.ts:644-729`
- **Problema**: Las puertas se colocan en posiciones que pueden coincidir con muros existentes
- **Impacto**: Colisiones bloqueadas, puertas inútiles

### 4. **Walls offset incorrecto**
- **Ubicación**: `procedural-map-generator.ts:451-541`
- **Problema**: Posiciones de muros tienen offsets que causan gaps o solapamientos
- **Impacto**: Gaps de luz, colisiones rotas

### 5. **No hay editor JSON con preview**
- **Problema**: No se puede editar directamente el JSON y ver cambios en tiempo real
- **Impacto**: Iteración lenta, debugging difícil

---

## Arquitectura Propuesta V2

```
┌─────────────────────────────────────────────────────────────────┐
│                     MAP EDITOR V2 UI                            │
├─────────────────┬─────────────────────┬─────────────────────────┤
│                 │                     │                         │
│  JSON EDITOR    │    3D VIEWPORT      │   PROPERTIES PANEL     │
│  (Monaco/Code)  │    (Three.js)       │   - Room config        │
│                 │                     │   - Corridor config    │
│  ┌───────────┐  │  ┌───────────────┐  │   - Portal config      │
│  │ {         │  │  │               │  │                         │
│  │  "rooms": │  │  │   Live        │  │  ┌──────────────────┐  │
│  │  [        │  │  │   Preview     │  │  │ Room Count: [5]  │  │
│  │   {...}   │←─┼──│               │──┼→ │ Min Size: [15]   │  │
│  │  ],       │  │  │               │  │  │ Max Size: [40]   │  │
│  │  "corr":  │  │  └───────────────┘  │  │ Corridor W: [6]  │  │
│  │  [...]    │  │                     │  └──────────────────┘  │
│  │ }         │  │                     │                         │
│  └───────────┘  │                     │                         │
│                 │                     │                         │
└─────────────────┴─────────────────────┴─────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │      ProceduralMapGeneratorV2       │
            │  ─────────────────────────────────  │
            │  + generateWithExactRoomCount(n)    │
            │  + validateCorridorPath(a, b)       │
            │  + findSafeCorridorRoute(a, b)      │
            │  + placeDoorsAtIntersections()      │
            │  + removeOverlappingWalls()         │
            │  + exportBSPFormat()                │
            └─────────────────────────────────────┘
```

---

## Plan de Implementación

### FASE 1: Corrección de Bugs Críticos (Alta Prioridad)

#### 1.1 Fix: Corredores atraviesan habitaciones

**Archivo**: `procedural-map-generator.ts`

**Algoritmo propuesto - Pathfinding A* para corredores**:

```typescript
interface PathNode {
    x: number;
    z: number;
    g: number;  // Cost from start
    h: number;  // Heuristic to end
    f: number;  // Total cost
    parent: PathNode | null;
}

findSafeCorridorPath(roomA: Room, roomB: Room, allRooms: Room[]): Corridor[] {
    // 1. Crear grid de navegación
    const gridSize = 5; // Resolución del pathfinding
    const grid = createNavigationGrid(allRooms, gridSize);

    // 2. Marcar habitaciones como no-transitables (excepto sus bordes)
    for (const room of allRooms) {
        markRoomInteriorAsBlocked(grid, room);
    }

    // 3. Encontrar punto de salida de roomA hacia roomB
    const exitA = findBestExitPoint(roomA, roomB);
    const entryB = findBestEntryPoint(roomB, roomA);

    // 4. A* pathfinding evitando interiores de habitaciones
    const path = aStarPathfind(grid, exitA, entryB);

    // 5. Convertir path a segmentos de corredor
    return pathToCorridors(path, this.config.corridorWidth);
}
```

**Pasos de implementación**:
1. Agregar método `createNavigationGrid()`
2. Agregar método `aStarPathfind()`
3. Agregar método `pathToCorridors()` que convierte path en segmentos H/V
4. Modificar `connectRooms()` para usar el nuevo pathfinding

#### 1.2 Fix: Walls con offset incorrecto

**Problema actual**:
```typescript
// Línea 459-494: Walls de room tienen offset de thickness/2
x: room.x + room.width / 2,  // Centro del muro
z: room.z + room.depth,      // Borde + 0 (debería ser - thickness/2)
```

**Solución**:
```typescript
// North wall - DEBE estar en el borde interno
this.walls.push({
    id: `wall_${this.wallIdCounter++}`,
    x: room.x + room.width / 2,
    z: room.z + room.depth - thickness / 2,  // Borde interno
    width: room.width,
    depth: thickness,
    isPerimeter: false
});
```

#### 1.3 Fix: Puertas colisionan con muros

**Solución**: Sistema de "door slots" predefinidos

```typescript
interface DoorSlot {
    roomId: string;
    side: 'north' | 'south' | 'east' | 'west';
    position: number;  // 0-1 normalized along wall
    width: number;
    used: boolean;
}

createDoorSlots(room: Room): DoorSlot[] {
    const slots: DoorSlot[] = [];
    const slotWidth = 8; // Ancho mínimo para puerta

    // Crear slots en cada pared si hay espacio
    if (room.width >= slotWidth + 4) {
        slots.push({ roomId: room.id, side: 'north', position: 0.5, width: slotWidth, used: false });
        slots.push({ roomId: room.id, side: 'south', position: 0.5, width: slotWidth, used: false });
    }
    if (room.depth >= slotWidth + 4) {
        slots.push({ roomId: room.id, side: 'east', position: 0.5, width: slotWidth, used: false });
        slots.push({ roomId: room.id, side: 'west', position: 0.5, width: slotWidth, used: false });
    }

    return slots;
}

// Al crear corredor, marcar slot como usado y crear apertura en muro
connectWithDoor(slotA: DoorSlot, slotB: DoorSlot): void {
    slotA.used = true;
    slotB.used = true;

    // Crear apertura en muro (no agregar wall en esa zona)
    this.createWallWithOpening(slotA);
    this.createWallWithOpening(slotB);
}
```

---

### FASE 2: Control de Habitaciones (Media Prioridad)

#### 2.1 Generación con conteo exacto de rooms

**Nuevo método**: `generateWithRoomCount(count: number)`

```typescript
generateWithRoomCount(targetRooms: number): GeneratedMapData {
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
        // Ajustar maxDepth dinámicamente
        const estimatedDepth = Math.ceil(Math.log2(targetRooms)) + 1;
        this.config.maxDepth = estimatedDepth;

        // Ajustar splitChance para acercarse al target
        this.config.splitChance = this.calculateOptimalSplitChance(targetRooms);

        this.reset();
        this.splitNode(root, 0);
        this.createRoomsInLeaves(root);

        if (this.rooms.length === targetRooms) {
            break;
        }

        // Ajustar parámetros para siguiente intento
        if (this.rooms.length < targetRooms) {
            this.config.splitChance = Math.min(1, this.config.splitChance + 0.05);
        } else {
            this.config.splitChance = Math.max(0.3, this.config.splitChance - 0.05);
        }

        attempts++;
    }

    // Continuar con generación normal
    this.connectRooms(root);
    // ...resto del proceso
}
```

#### 2.2 UI para control de rooms

```html
<!-- Nuevo slider en el panel procedural -->
<div class="config-row">
    <label>Habitaciones Exactas</label>
    <div class="room-count-control">
        <button (click)="decrementRooms()">-</button>
        <input type="number" [(ngModel)]="proceduralConfig.targetRoomCount" min="1" max="20">
        <button (click)="incrementRooms()">+</button>
    </div>
</div>

<div class="presets">
    <button (click)="setRoomCount(1)">1 Room (Test)</button>
    <button (click)="setRoomCount(3)">3 Rooms</button>
    <button (click)="setRoomCount(5)">5 Rooms</button>
    <button (click)="setRoomCount(10)">10 Rooms</button>
</div>
```

---

### FASE 3: Editor JSON con Preview (Media-Alta Prioridad)

#### 3.1 Agregar Monaco Editor

```bash
npm install ngx-monaco-editor-v2
```

#### 3.2 Componente JSON Editor

**Nuevo archivo**: `json-editor-panel.component.ts`

```typescript
@Component({
    selector: 'app-json-editor-panel',
    template: `
        <div class="json-editor-container">
            <div class="editor-toolbar">
                <button (click)="formatJSON()">Format</button>
                <button (click)="validateJSON()">Validate</button>
                <button (click)="applyChanges()">Apply</button>
                <span class="status" [class.error]="hasError">{{ statusMessage }}</span>
            </div>
            <ngx-monaco-editor
                [options]="editorOptions"
                [(ngModel)]="jsonContent"
                (ngModelChange)="onContentChange($event)">
            </ngx-monaco-editor>
        </div>
    `
})
export class JsonEditorPanelComponent {
    @Input() mapData: GeneratedMapData;
    @Output() mapDataChange = new EventEmitter<GeneratedMapData>();

    editorOptions = {
        theme: 'vs-dark',
        language: 'json',
        minimap: { enabled: false },
        automaticLayout: true
    };

    // Debounce para preview en tiempo real
    private updateDebouncer = new Subject<string>();

    ngOnInit() {
        this.updateDebouncer.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(json => this.tryApplyJSON(json));
    }

    onContentChange(content: string) {
        this.updateDebouncer.next(content);
    }

    private tryApplyJSON(json: string) {
        try {
            const data = JSON.parse(json);
            if (this.validateMapData(data)) {
                this.mapDataChange.emit(data);
                this.statusMessage = 'Valid - Preview updated';
                this.hasError = false;
            }
        } catch (e) {
            this.statusMessage = `Error: ${e.message}`;
            this.hasError = true;
        }
    }
}
```

#### 3.3 Integración bidireccional

```typescript
// En editor-viewport.component.ts

// Cuando cambia el JSON
onJSONChange(newData: GeneratedMapData) {
    this.clearAllObjects();
    this.applyGeneratedMap(newData);
    this.lastGeneratedData = newData;
}

// Cuando cambia el viewport (mover objeto)
onViewportObjectMoved(objId: string, newPos: Vector3) {
    // Actualizar lastGeneratedData
    const room = this.lastGeneratedData.rooms.find(r => r.id === objId);
    if (room) {
        room.x = newPos.x - room.width / 2;
        room.z = newPos.z - room.depth / 2;
        room.centerX = newPos.x;
        room.centerZ = newPos.z;
    }

    // Emitir cambio al JSON editor
    this.jsonEditorComponent.updateFromData(this.lastGeneratedData);
}
```

---

### FASE 4: Colocación de Rooms Completas (Media Prioridad)

#### 4.1 Room Templates

```typescript
interface RoomTemplate {
    id: string;
    name: string;
    width: number;
    depth: number;
    doors: DoorSlot[];  // Posiciones predefinidas de puertas
    features: RoomFeature[];  // Decoraciones, spawns, etc.
}

const ROOM_TEMPLATES: RoomTemplate[] = [
    {
        id: 'small_square',
        name: 'Small Square',
        width: 15,
        depth: 15,
        doors: [
            { side: 'north', position: 0.5 },
            { side: 'south', position: 0.5 },
            { side: 'east', position: 0.5 },
            { side: 'west', position: 0.5 }
        ],
        features: []
    },
    {
        id: 'large_hall',
        name: 'Large Hall',
        width: 40,
        depth: 25,
        doors: [
            { side: 'north', position: 0.25 },
            { side: 'north', position: 0.75 },
            { side: 'south', position: 0.5 },
        ],
        features: [
            { type: 'pillar', position: { x: 0.25, z: 0.5 } },
            { type: 'pillar', position: { x: 0.75, z: 0.5 } }
        ]
    },
    {
        id: 'corridor_room',
        name: 'Corridor Room',
        width: 30,
        depth: 10,
        doors: [
            { side: 'east', position: 0.5 },
            { side: 'west', position: 0.5 }
        ],
        features: []
    }
];
```

#### 4.2 Herramienta de colocación manual

```typescript
// Nuevo modo en el editor
placeRoomMode = false;
selectedTemplate: RoomTemplate | null = null;

enterPlaceRoomMode(template: RoomTemplate) {
    this.placeRoomMode = true;
    this.selectedTemplate = template;
    this.createRoomPreview(template);
}

onCanvasClickInPlaceMode(worldPos: Vector3) {
    if (!this.selectedTemplate) return;

    // Verificar que no colisione con rooms existentes
    if (this.checkRoomCollision(worldPos, this.selectedTemplate)) {
        this.showError('Room would collide with existing room');
        return;
    }

    // Crear room
    const newRoom: Room = {
        id: `room_manual_${Date.now()}`,
        x: worldPos.x - this.selectedTemplate.width / 2,
        z: worldPos.z - this.selectedTemplate.depth / 2,
        width: this.selectedTemplate.width,
        depth: this.selectedTemplate.depth,
        centerX: worldPos.x,
        centerZ: worldPos.z,
        connected: false
    };

    this.lastGeneratedData.rooms.push(newRoom);
    this.generateWallsForRoom(newRoom);
    this.refreshViewport();
}
```

---

### FASE 5: Corredores Inteligentes (Alta Prioridad)

#### 5.1 Auto-conexión de rooms

```typescript
interface ConnectionSuggestion {
    roomA: Room;
    roomB: Room;
    doorSlotA: DoorSlot;
    doorSlotB: DoorSlot;
    distance: number;
    path: PathSegment[];
    isValid: boolean;
}

suggestConnections(unconnectedRoom: Room): ConnectionSuggestion[] {
    const suggestions: ConnectionSuggestion[] = [];

    // Buscar rooms cercanas
    const nearbyRooms = this.rooms
        .filter(r => r.id !== unconnectedRoom.id)
        .filter(r => this.getDistance(r, unconnectedRoom) < 100)
        .sort((a, b) => this.getDistance(a, unconnectedRoom) - this.getDistance(b, unconnectedRoom));

    for (const targetRoom of nearbyRooms.slice(0, 3)) {
        // Encontrar mejor combinación de door slots
        const bestSlots = this.findBestDoorSlotPair(unconnectedRoom, targetRoom);

        if (bestSlots) {
            // Calcular path
            const path = this.findSafeCorridorPath(
                unconnectedRoom, targetRoom,
                bestSlots.slotA, bestSlots.slotB
            );

            suggestions.push({
                roomA: unconnectedRoom,
                roomB: targetRoom,
                doorSlotA: bestSlots.slotA,
                doorSlotB: bestSlots.slotB,
                distance: this.getDistance(unconnectedRoom, targetRoom),
                path,
                isValid: path.length > 0
            });
        }
    }

    return suggestions.filter(s => s.isValid);
}
```

#### 5.2 UI para conexiones sugeridas

```html
<div class="connection-suggestions" *ngIf="selectedRoom && !selectedRoom.connected">
    <h4>Connect to:</h4>
    <div *ngFor="let suggestion of connectionSuggestions" class="suggestion">
        <span>{{ suggestion.roomB.id }} ({{ suggestion.distance | number:'1.0-0' }}m)</span>
        <button (click)="applyConnection(suggestion)">Connect</button>
        <button (click)="previewConnection(suggestion)">Preview</button>
    </div>
</div>
```

---

## Estructura de Archivos V2

```
map-editor/
├── components/
│   ├── editor-viewport/           # Viewport 3D principal
│   │   ├── editor-viewport.component.ts
│   │   ├── editor-viewport.component.html
│   │   └── editor-viewport.component.scss
│   ├── json-editor-panel/         # NUEVO: Editor JSON
│   │   ├── json-editor-panel.component.ts
│   │   └── json-editor-panel.component.scss
│   ├── room-catalog/              # NUEVO: Catálogo de templates
│   │   ├── room-catalog.component.ts
│   │   └── room-catalog.component.scss
│   └── connection-panel/          # NUEVO: Panel de conexiones
│       ├── connection-panel.component.ts
│       └── connection-panel.component.scss
├── services/
│   ├── procedural-map-generator.ts      # Generador BSP existente
│   ├── procedural-map-generator-v2.ts   # NUEVO: Generador mejorado
│   ├── corridor-pathfinder.ts           # NUEVO: A* para corredores
│   └── room-validation.ts               # NUEVO: Validación de colisiones
└── models/
    ├── room-templates.ts           # NUEVO: Templates de rooms
    └── map-data.interfaces.ts      # Interfaces compartidas
```

---

## Orden de Implementación Recomendado

| Prioridad | Tarea | Tiempo Est. | Dependencias |
|-----------|-------|-------------|--------------|
| 1 | Fix wall offsets | 2h | Ninguna |
| 2 | Fix corredores atraviesan rooms (A*) | 6h | Ninguna |
| 3 | Fix puertas colisionan | 3h | #2 |
| 4 | Control exacto de room count | 4h | Ninguna |
| 5 | UI sliders para room count | 2h | #4 |
| 6 | JSON Editor básico | 4h | Ninguna |
| 7 | Bidireccional JSON ↔ Viewport | 3h | #6 |
| 8 | Room templates & catalog | 4h | Ninguna |
| 9 | Manual room placement | 4h | #8 |
| 10 | Auto-connection suggestions | 4h | #2, #9 |

---

## Testing Incremental

### Test Suite 1: 1 Room
```json
{
  "testName": "Single Room",
  "config": { "targetRoomCount": 1 },
  "assertions": [
    "rooms.length === 1",
    "walls.length === 4 + 4",  // 4 room + 4 perimeter
    "corridors.length === 0",
    "doors.length === 0"
  ]
}
```

### Test Suite 2: 2 Rooms + 1 Corridor
```json
{
  "testName": "Two Rooms Connected",
  "config": { "targetRoomCount": 2 },
  "assertions": [
    "rooms.length === 2",
    "corridors.length >= 1",
    "rooms[0].connected === true",
    "rooms[1].connected === true",
    "noCorridorIntersectsRoomInterior(corridors, rooms)"
  ]
}
```

### Test Suite 3: Door Placement
```json
{
  "testName": "Doors Don't Collide",
  "config": { "targetRoomCount": 3, "generateDoors": true },
  "assertions": [
    "doors.length > 0",
    "allDoorsAtWallOpenings(doors, walls)",
    "noDoorsInsideRooms(doors, rooms)"
  ]
}
```

---

## Métricas de Éxito

1. **Generación determinística**: Mismo seed → mismo mapa (100%)
2. **Room count accuracy**: ±0 rooms del target
3. **Corridor validity**: 0 corredores atraviesan rooms
4. **Door placement**: 100% puertas en aperturas válidas
5. **Performance**: <500ms generación para 10 rooms
6. **JSON round-trip**: Import → Export = identical

---

## Referencias

- [BSP Dungeon Generation](http://www.roguebasin.com/index.php/Basic_BSP_Dungeon_generation)
- [A* Pathfinding](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Procedural Content Generation](https://pcgbook.com/)

---

*Documento creado: 2025-11-30*
*Branch: feature/map-editor-v2-procedural-improvements*
