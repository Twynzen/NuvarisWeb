# Generador Procedural de Mapas - Radial Room Placement (RRP)

## Filosofia

> **"Hacer lo manual procedural"**
> El generador sigue los mismos pasos que un disenador usaria para crear un mapa a mano.

Basado en el analisis matematico de `legacy.json` - un mapa hecho manualmente que funciona perfectamente con el sistema de fog occlusion, puertas, y colisiones.

---

## Estructura del Mapa Generado

```
        NW ─────── NORTH ─────── NE
        │           │            │
        │     ┌─────┴─────┐      │
        │     │           │      │
      WEST ───┤    HUB    ├─── EAST
        │     │           │      │
        │     └─────┬─────┘      │
        │           │            │
        SW ─────── SOUTH ─────── SE
```

### Componentes

| Componente | Cantidad | Descripcion |
|------------|----------|-------------|
| Hub | 1 | Room central, punto de spawn del jugador |
| Cardinales | 4 | Rooms en N/S/E/W conectadas al hub |
| Esquinas | 4 | Rooms en NW/NE/SW/SE conectadas a cardinales |
| Corredores | 8 | Pasillos rectos entre rooms adyacentes |
| Puertas | 8 | En cada interseccion corredor-room |

---

## Configuracion del Generador

### Parametros Disponibles

```typescript
interface RRPConfig {
    seed: string;           // Seed para reproducibilidad
    hubSize: number;        // Tamano del hub central (default: 30)
    cardinalSize: number;   // Tamano de rooms cardinales (default: 25)
    cornerSize: number;     // Tamano de rooms esquinas (default: 20)
    spacing: number;        // Distancia entre rooms (default: 20)
    corridorWidth: number;  // Ancho de pasillos (default: 5)
    wallThickness: number;  // Grosor de muros (default: 2)
    addCornerRooms: boolean;// Incluir esquinas (default: true)
    generateDoors: boolean; // Generar puertas (default: true)
}
```

### Valores por Defecto (estilo Legacy)

| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| hubSize | 30 | Hub de 30x30 unidades |
| cardinalSize | 25 | Cardinales de 25x25 |
| cornerSize | 20 | Esquinas de 20x20 |
| spacing | 20 | 20 unidades entre rooms |
| corridorWidth | 5 | Pasillos de 5 unidades de ancho |

---

## Uso en el Editor de Mapas

### Paso 1: Abrir el Panel Procedural

1. Ir a `/map-editor`
2. Click en el boton **Procedural** en el toolbar

### Paso 2: Configurar Parametros

```
┌─────────────────────────────────┐
│ GENERADOR PROCEDURAL            │
├─────────────────────────────────┤
│ SEED                            │
│ [ABC123]  [Refresh]             │
│                                 │
│ TAMANO HABITACIONES             │
│ Hub Central:     [30]           │
│ Cardinales:      [25]           │
│ Esquinas:        [20]           │
│                                 │
│ LAYOUT                          │
│ Separacion:      [20]           │
│ Ancho Pasillos:  [5]            │
│ [x] Incluir Esquinas            │
│                                 │
│ PUERTAS                         │
│ [x] Generar Puertas             │
│                                 │
│ [  GENERAR MAPA  ]              │
│ [  Exportar JSON ]              │
└─────────────────────────────────┘
```

### Paso 3: Generar y Exportar

1. Ajustar parametros segun necesidad
2. Click en **GENERAR MAPA**
3. Revisar el resultado en el viewport
4. Click en **Exportar JSON** para guardar

---

## Ejemplos de Configuracion

### Ejemplo 1: Mapa Compacto (5 rooms)

Ideal para partidas rapidas o tutoriales.

```typescript
{
    seed: "COMPACT01",
    hubSize: 25,
    cardinalSize: 20,
    cornerSize: 15,
    spacing: 15,
    corridorWidth: 4,
    addCornerRooms: false,  // Sin esquinas
    generateDoors: true
}
```

**Resultado:**
- 5 rooms (hub + 4 cardinales)
- 4 corredores
- 4 puertas
- Mapa pequeno (~100x100 unidades)

```
              NORTH
                │
      WEST ─── HUB ─── EAST
                │
              SOUTH
```

### Ejemplo 2: Mapa Estandar Legacy (9 rooms)

Configuracion que replica exactamente el legacy.json.

```typescript
{
    seed: "LEGACY01",
    hubSize: 30,
    cardinalSize: 25,
    cornerSize: 20,
    spacing: 20,
    corridorWidth: 5,
    addCornerRooms: true,
    generateDoors: true
}
```

**Resultado:**
- 9 rooms completas
- 8 corredores
- 8 puertas
- Mapa mediano (~170x170 unidades)

### Ejemplo 3: Mapa Amplio

Para partidas mas largas con mas espacio de exploracion.

```typescript
{
    seed: "LARGE01",
    hubSize: 40,
    cardinalSize: 35,
    cornerSize: 25,
    spacing: 30,
    corridorWidth: 8,
    addCornerRooms: true,
    generateDoors: true
}
```

**Resultado:**
- 9 rooms grandes
- Corredores anchos (puertas tipo "large")
- Mapa grande (~250x250 unidades)

### Ejemplo 4: Laberinto Estrecho

Pasillos estrechos, rooms pequenas.

```typescript
{
    seed: "MAZE01",
    hubSize: 20,
    cardinalSize: 15,
    cornerSize: 12,
    spacing: 25,        // Mas separacion
    corridorWidth: 3,   // Pasillos estrechos
    addCornerRooms: true,
    generateDoors: true
}
```

**Resultado:**
- Rooms pequenas muy separadas
- Corredores largos y estrechos
- Mayor sensacion de laberinto

### Ejemplo 5: Arena Abierta

Hub grande, sin esquinas, rooms amplias.

```typescript
{
    seed: "ARENA01",
    hubSize: 50,        // Hub muy grande
    cardinalSize: 30,
    cornerSize: 20,
    spacing: 10,        // Poco espacio entre rooms
    corridorWidth: 10,  // Corredores muy anchos
    addCornerRooms: false,
    generateDoors: false // Sin puertas
}
```

**Resultado:**
- Hub central dominante
- Transiciones fluidas sin puertas
- Ideal para combate intenso

---

## Matematicas del Generador

### Posicionamiento de Rooms

**Hub Central:**
```
centerX = 0
centerZ = 0
x = -hubSize / 2
z = -hubSize / 2
```

**Rooms Cardinales:**
```
distance = hubSize/2 + spacing + cardinalSize/2

WEST:  centerX = -distance, centerZ = 0
EAST:  centerX = +distance, centerZ = 0
NORTH: centerX = 0, centerZ = +distance
SOUTH: centerX = 0, centerZ = -distance
```

**Rooms Esquinas:**
```
NW: x_min = WEST.x,  z = NORTH.z
NE: x_max = EAST.x,  z = NORTH.z
SW: x_min = WEST.x,  z = SOUTH.z
SE: x_max = EAST.x,  z = SOUTH.z
```

### Corredores

Los corredores son **rectos** y van de **borde a borde**:

```
┌──────────┐
│   ROOM   │
│          ├────────────┤ Corredor horizontal
│          │            │
└──────────┘            │
                        │
              ┌─────────┘
              │ Corredor vertical
              │
              ▼
```

**Corredor Horizontal:**
```
startX = roomA.x + roomA.width  (borde derecho)
endX = roomB.x                   (borde izquierdo)
z = 0 (centrado)
```

**Corredor Vertical:**
```
startZ = roomA.z + roomA.depth  (borde superior)
endZ = roomB.z                   (borde inferior)
x = centro del overlap
```

### Muros con Gaps

Cada muro de room se divide cuando hay un corredor:

```
Sin corredor:           Con corredor:
┌──────────────┐        ┌─────┐   ┌─────┐
│              │        │     │ G │     │
                              A
                              P
```

**Calculo del gap:**
```
gapWidth = corridorWidth
sideWidth = (roomWidth - corridorWidth) / 2
```

---

## Formato JSON de Salida

El generador produce un JSON compatible con el juego:

```json
{
    "name": "Radial Map - ABC123",
    "version": "1.0",
    "generatedWith": {
        "seed": "ABC123",
        "config": { ... }
    },
    "playerSpawn": { "x": 0, "z": 0 },
    "objects": [
        {
            "id": "wall_0",
            "type": "wall",
            "subtype": "normal",
            "position": { "x": -8.75, "z": 15 },
            "scale": { "x": 12.5, "z": 2 }
        },
        {
            "id": "door_0",
            "type": "door",
            "subtype": "small",
            "position": { "x": -15, "z": 0 },
            "rotation": 1.5707963267948966,
            "config": {
                "width": 5,
                "height": 8,
                "depth": 2,
                "type": "small",
                "isOpen": false
            }
        },
        {
            "id": "spawn_player",
            "type": "spawn",
            "subtype": "player",
            "position": { "x": 0, "z": 0 }
        }
    ]
}
```

---

## Reproducibilidad con Seeds

El mismo seed **siempre** genera el mismo mapa:

```typescript
// Estos dos generan el MISMO mapa
generator1.generate("MYSEED123");
generator2.generate("MYSEED123");

// Este genera un mapa DIFERENTE
generator3.generate("OTHERSEED");
```

**Casos de uso:**
- Compartir mapas con otros jugadores
- Recrear un mapa que te gusto
- Testing consistente
- Speedruns con el mismo layout

---

## Integracion con Sistemas del Juego

### Fog Occlusion

El generador crea rooms compatibles con el sistema de fog:
- Cada room es una `RoomInstance`
- Los corredores conectan rooms para visibilidad
- Las puertas actuan como puntos de transicion

### Colisiones

Todos los muros generados tienen:
- Posicion correcta para el sistema de colisiones
- Dimensiones consistentes
- Sin overlaps ni gaps incorrectos

### Puertas

Las puertas se colocan automaticamente:
- En cada interseccion corredor-room
- Con rotacion correcta segun orientacion
- Tipo basado en ancho del corredor

---

## Tips y Mejores Practicas

1. **Usa seeds descriptivos**: `TUTORIAL01`, `BOSS_ARENA`, `MAZE_HARD`

2. **Para testing rapido**: Desactiva esquinas (`addCornerRooms: false`)

3. **Balance espacial**:
   - `spacing` muy bajo = rooms se sienten conectadas
   - `spacing` alto = sensacion de laberinto

4. **Ancho de pasillos**:
   - 3-4 = estrecho, tactico
   - 5-6 = normal, fluido
   - 8+ = abierto, tipo arena

5. **Para jefes**: Hub grande (40-50) con esquinas desactivadas

---

## Troubleshooting

### El mapa se ve muy pequeno
- Aumenta `hubSize`, `cardinalSize`, `cornerSize`
- Aumenta `spacing`

### Las rooms se superponen
- Aumenta `spacing`
- Reduce tamanos de rooms

### Las puertas no aparecen
- Verifica que `generateDoors: true`
- Revisa que `corridorWidth >= 3`

### El mapa no carga en el juego
- Exporta usando el boton "Exportar JSON"
- Verifica que el archivo este en `assets/maps/`
- Agrega el nombre a `AVAILABLE_MAPS` en `map-loader.service.ts`

---

*Documentacion actualizada: 2025-11-30*
*Generador: Radial Room Placement (RRP) v1.0*
