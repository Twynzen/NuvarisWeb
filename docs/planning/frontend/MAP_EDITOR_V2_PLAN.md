# Map Editor V2 - Plan: Manual → Procedural

## Filosofía

> **"Hacer lo manual procedural"**
> El generador debe seguir los mismos pasos que un diseñador usaría para crear un mapa a mano.

Basado en el análisis de `legacy.json` - un mapa hecho manualmente que funciona perfectamente.

---

## Análisis de legacy.json (El Patrón Exitoso)

### Estructura
```
        NW ─── NORTH ─── NE
        │        │        │
      WEST ─── HUB ─── EAST
        │        │        │
        SW ─── SOUTH ─── SE
```

### Jerarquía de Construcción (cómo se hizo a mano)
1. **Hub central** (30x30) en posición (0,0)
2. **4 rooms cardinales** (25x25) en N/S/E/W del hub
3. **4 rooms esquinas** (20x20) conectadas a las cardinales
4. **Corredores rectos** entre rooms adyacentes
5. **Puertas** en cada intersección corredor↔room
6. **Muros divididos** con gaps para las puertas

### Métricas Clave
| Elemento | Cantidad | Tamaño |
|----------|----------|--------|
| Hub | 1 | 30x30 |
| Rooms cardinales | 4 | 25x25 |
| Rooms esquinas | 4 | 20x20 |
| Corredores | 8 | width=5, length=20 |
| Puertas | 8 | width=5 |
| Separación rooms | ~20 unidades |

---

## Nuevo Algoritmo: Radial Room Placement (RRP)

### Diferencias con BSP

| BSP (actual) | RRP (nuevo) |
|--------------|-------------|
| Subdivide espacio recursivamente | Coloca rooms desde el centro hacia afuera |
| Corredores en L (centro a centro) | Corredores rectos (borde a borde) |
| Rooms de formas variables | Rooms rectangulares uniformes |
| Puertas en posiciones random | Puertas solo en intersecciones válidas |
| Muros completos | Muros con gaps predefinidos |

### Pseudocódigo

```typescript
generateMap(config: RRPConfig): GeneratedMapData {
    // PASO 1: Crear hub central
    const hub = createRoom('hub', 0, 0, config.hubSize);
    rooms.push(hub);

    // PASO 2: Colocar rooms cardinales
    const cardinals = placeCardinalRooms(hub, config.cardinalSize, config.spacing);
    rooms.push(...cardinals);

    // PASO 3: Colocar rooms en esquinas (si config lo permite)
    if (config.addCornerRooms) {
        const corners = placeCornerRooms(cardinals, config.cornerSize, config.spacing);
        rooms.push(...corners);
    }

    // PASO 4: Conectar rooms adyacentes con corredores RECTOS
    for (const [roomA, roomB] of getAdjacentPairs(rooms)) {
        const corridor = createStraightCorridor(roomA, roomB, config.corridorWidth);
        corridors.push(corridor);
    }

    // PASO 5: Crear muros para cada room CON GAPS para puertas
    for (const room of rooms) {
        const connectedCorridors = getCorridorsConnectedTo(room);
        const walls = createWallsWithGaps(room, connectedCorridors);
        allWalls.push(...walls);
    }

    // PASO 6: Crear puertas en cada intersección corredor↔room
    for (const corridor of corridors) {
        const doors = createDoorsAtEnds(corridor);
        allDoors.push(...doors);
    }

    return { rooms, corridors, walls: allWalls, doors: allDoors, ... };
}
```

---

## Fases de Implementación

### FASE 1: RadialRoomGenerator (Core)
**Archivo nuevo**: `radial-room-generator.ts`

```typescript
interface RRPConfig {
    seed: string;
    hubSize: number;           // 25-35
    cardinalSize: number;      // 20-30
    cornerSize: number;        // 15-25
    spacing: number;           // 15-25 (distancia entre rooms)
    corridorWidth: number;     // 5-8
    addCornerRooms: boolean;   // true/false
    addSecondRing: boolean;    // para mapas más grandes
    doorWidth: number;         // 5
}
```

**Entregables**:
- Clase `RadialRoomGenerator`
- Método `generate()` que retorna `GeneratedMapData`
- Compatible con el formato existente (rooms, corridors, walls, doors, portals)

### FASE 2: Corredores Rectos
**Modificar**: La conexión entre rooms

**Antes (BSP)**:
```
Room A ──────────┐
    centro       │  Corredor en L
                 │  (puede atravesar otras rooms)
Room B ──────────┘
    centro
```

**Después (RRP)**:
```
Room A │████████│
       │  gap   │ ← Corredor recto (borde a borde)
Room B │████████│
```

**Algoritmo**:
```typescript
createStraightCorridor(roomA: Room, roomB: Room, width: number): Corridor {
    // Determinar si conexión es horizontal o vertical
    const isHorizontal = Math.abs(roomA.centerX - roomB.centerX) >
                         Math.abs(roomA.centerZ - roomB.centerZ);

    if (isHorizontal) {
        // Corredor horizontal: de borde derecho de A a borde izquierdo de B (o viceversa)
        const startX = roomA.centerX > roomB.centerX ? roomA.x : roomA.x + roomA.width;
        const endX = roomA.centerX > roomB.centerX ? roomB.x + roomB.width : roomB.x;
        const z = (roomA.centerZ + roomB.centerZ) / 2; // Centrado verticalmente

        return { startX, endX, startZ: z, endZ: z, width, horizontal: true };
    } else {
        // Corredor vertical: similar pero en eje Z
        // ...
    }
}
```

### FASE 3: Muros con Gaps
**Modificar**: La generación de muros

**Antes (BSP)**:
```typescript
// Muro norte completo
walls.push({ x: room.centerX, z: room.z + room.depth, width: room.width, ... });
```

**Después (RRP)**:
```typescript
// Muro norte CON GAP si hay corredor conectado
const northCorridors = corridors.filter(c => connectsToNorth(c, room));
if (northCorridors.length > 0) {
    const gap = northCorridors[0];
    // Muro izquierdo del gap
    walls.push({ x: room.x + gapLeftWidth/2, z: room.z + room.depth, width: gapLeftWidth, ... });
    // Muro derecho del gap
    walls.push({ x: room.x + room.width - gapRightWidth/2, z: room.z + room.depth, width: gapRightWidth, ... });
} else {
    // Muro completo (sin gap)
    walls.push({ x: room.centerX, z: room.z + room.depth, width: room.width, ... });
}
```

### FASE 4: Puertas Automáticas
**Modificar**: Colocación de puertas

```typescript
createDoorsAtEnds(corridor: Corridor): Door[] {
    const doors: Door[] = [];

    // Puerta al inicio del corredor
    doors.push({
        x: corridor.startX,
        z: corridor.startZ,
        width: corridor.width,
        rotation: corridor.horizontal ? Math.PI/2 : 0,
        type: corridor.width >= 8 ? 'large' : 'small'
    });

    // Puerta al final del corredor (opcional, configurable)
    if (config.doorsAtBothEnds) {
        doors.push({
            x: corridor.endX,
            z: corridor.endZ,
            // ...
        });
    }

    return doors;
}
```

### FASE 5: Variación Controlada
**Agregar**: Parámetros para variedad manteniendo calidad

```typescript
interface RRPVariation {
    roomSizeVariation: number;    // 0-0.3 (±30% del tamaño base)
    spacingVariation: number;     // 0-0.2 (±20% del spacing)
    skipRoomChance: number;       // 0-0.3 (probabilidad de no crear una room)
    extraCorridorChance: number;  // 0-0.2 (conexiones adicionales entre rooms)
}
```

### FASE 6: UI en Editor
**Modificar**: Panel de generación procedural

```
┌─────────────────────────────────┐
│ GENERACIÓN RADIAL               │
├─────────────────────────────────┤
│ Seed: [ABC123]  [🎲 Random]     │
│                                 │
│ Estructura:                     │
│ ○ Solo Hub (1 room)             │
│ ○ Hub + Cardinales (5 rooms)    │
│ ● Hub + Card + Esquinas (9)     │
│ ○ Doble anillo (13+ rooms)      │
│                                 │
│ Tamaños:                        │
│ Hub:      [30] ────●──── [30]   │
│ Rooms:    [25] ────●──── [25]   │
│ Spacing:  [20] ────●──── [20]   │
│ Corredor: [5]  ────●──── [5]    │
│                                 │
│ [x] Agregar puertas             │
│ [x] Variación de tamaños        │
│                                 │
│ [  GENERAR MAPA  ]              │
└─────────────────────────────────┘
```

---

## Orden de Implementación

| # | Tarea | Tiempo Est. | Resultado |
|---|-------|-------------|-----------|
| 1 | Crear `RadialRoomGenerator` básico | 2h | Hub + 4 cardinales |
| 2 | Agregar rooms esquinas | 1h | 9 rooms como legacy |
| 3 | Corredores rectos (borde a borde) | 2h | Sin atravesar rooms |
| 4 | Muros con gaps | 2h | Aperturas para puertas |
| 5 | Puertas automáticas | 1h | En cada intersección |
| 6 | Integrar con editor UI | 1h | Reemplazar panel procedural |
| 7 | Variación controlada | 1h | Mapas únicos pero válidos |
| 8 | Testing y ajustes | 2h | Verificar con 10+ seeds |

**Total estimado**: ~12 horas de desarrollo

---

## Validación

### Test: Comparar con Legacy
```typescript
// El mapa generado debe tener estructura similar a legacy.json
expect(generated.rooms.length).toBe(9);
expect(generated.corridors.length).toBe(8);
expect(generated.doors.length).toBe(8);
expect(noCorridorCrossesRoom(generated)).toBe(true);
expect(allDoorsAtValidIntersections(generated)).toBe(true);
```

### Test: Reproducibilidad
```typescript
// Mismo seed = mismo mapa
const map1 = generator.generate('SEED123');
const map2 = generator.generate('SEED123');
expect(map1).toEqual(map2);
```

---

## Resultado Esperado

Mapas generados que:
1. ✅ Tienen estructura clara y jugable (como legacy)
2. ✅ Corredores nunca atraviesan rooms
3. ✅ Puertas siempre en posiciones válidas
4. ✅ Muros sin gaps incorrectos
5. ✅ Variedad controlada (diferentes seeds = diferentes layouts)
6. ✅ Compatibles con fog occlusion y todos los sistemas existentes

---

*Plan actualizado: 2025-11-30*
*Enfoque: Manual → Procedural (Radial Room Placement)*
