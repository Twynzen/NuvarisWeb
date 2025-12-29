# NUVARIS - Sistema de Mapas: Documentacion Tecnica Completa

## Version: 1.0.0 | Fecha: 2025-11-28

---

# INDICE

1. [Sistema de Coordenadas](#1-sistema-de-coordenadas)
2. [Estructura del Mapa JSON](#2-estructura-del-mapa-json)
3. [Tipos de Elementos](#3-tipos-de-elementos)
4. [Patrones de Construccion](#4-patrones-de-construccion)
5. [Ejemplos Practicos](#5-ejemplos-practicos)
6. [Elementos Futuros (Roadmap)](#6-elementos-futuros-roadmap)
7. [Guia para Generacion por Prompt](#7-guia-para-generacion-por-prompt)

---

# 1. SISTEMA DE COORDENADAS

## 1.1 Ejes y Orientacion

El sistema usa **Three.js** con coordenadas 3D, pero el juego opera en un plano **2.5D** (vista isometrica desde arriba):

```
                    +Z (Norte/Arriba en pantalla)
                     ^
                     |
                     |
    -X (Oeste) <-----+-----> +X (Este)
                     |
                     |
                     v
                    -Z (Sur/Abajo en pantalla)
```

### Ejes:
| Eje | Descripcion | Rango Tipico | Uso |
|-----|-------------|--------------|-----|
| **X** | Horizontal (Este-Oeste) | -100 a +100 | Posicion lateral |
| **Y** | Vertical (Altura) | 0 a 8 | **NO SE USA EN JSON** - Auto-calculado |
| **Z** | Profundidad (Norte-Sur) | -100 a +100 | Posicion vertical en pantalla |

### Por que no hay Y en el JSON?
El eje Y (altura) se calcula automaticamente:
- **Muros**: `Y = wallHeight / 2` (centrado vertical, altura = 8 unidades)
- **Portales**: `Y = 0` (sobre el suelo)
- **Jugador**: `Y = 0` (sobre el suelo)

Si en el futuro se necesitan elementos elevados (puentes, plataformas), se agregaria `elevation` o `height` al JSON.

## 1.2 Tamano del Mapa

```
Mapa estandar: 200 x 200 unidades
Rango X: -100 a +100
Rango Z: -100 a +100
Centro: (0, 0)
```

```
(-100, +100) -------- (0, +100) -------- (+100, +100)
     |                    |                    |
     |     NOROESTE       |     NORESTE        |
     |                    |                    |
(-100, 0) ------------ (0, 0) ------------ (+100, 0)
     |                    |                    |
     |     SUROESTE       |     SURESTE        |
     |                    |                    |
(-100, -100) ------- (0, -100) ------- (+100, -100)
```

## 1.3 Escala y Proporciones

| Elemento | Tamano Aproximado | Referencia |
|----------|-------------------|------------|
| Jugador | ~1 unidad de radio | Base de medida |
| Muro delgado | 2 unidades de grosor | Pared interior |
| Muro perimetral | 4 unidades de grosor | Borde del mapa |
| Habitacion pequena | 10x10 unidades | Celda/closet |
| Habitacion mediana | 20x20 unidades | Oficina/dormitorio |
| Habitacion grande | 30x30 unidades | Salon/almacen |
| Casa pequena | 25x20 unidades | Vivienda basica |
| Edificio | 40x40+ unidades | Estructura mayor |

---

# 2. ESTRUCTURA DEL MAPA JSON

## 2.1 Formato Legacy (Procedural Generator)

```json
{
  "id": "map_123456789",
  "name": "Nombre del Mapa",
  "version": "1.0",
  "size": {
    "width": 200,
    "height": 200
  },
  "walls": [...],
  "portals": [...],
  "spawnPoints": [...]
}
```

## 2.2 Formato Nuevo (Map Editor)

```json
{
  "name": "Nombre del Mapa",
  "version": "1.0",
  "gridSize": 5,
  "playerSpawn": { "x": 0, "z": 0 },
  "objects": [...]
}
```

**Nota**: El sistema acepta AMBOS formatos automaticamente.

---

# 3. TIPOS DE ELEMENTOS

## 3.1 WALLS (Muros)

Los muros son cajas 3D que bloquean el movimiento.

### Estructura (Formato Legacy):
```json
{
  "id": "wall_1",
  "position": [X, Z],
  "size": [ANCHO, PROFUNDIDAD],
  "type": "normal" | "perimeter"
}
```

### Estructura (Formato Nuevo):
```json
{
  "id": "wall_1",
  "type": "wall",
  "subtype": "normal",
  "position": { "x": 0, "z": 50 },
  "scale": { "x": 100, "z": 2 },
  "rotation": 0
}
```

### Campos:
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | string | Identificador unico |
| `position` | [x,z] o {x,z} | Centro del muro |
| `size/scale` | [w,d] o {x,z} | Ancho (X) y Profundidad (Z) |
| `type/subtype` | string | "normal", "perimeter", "reinforced" |
| `rotation` | number | Grados de rotacion (0-360) |

### Tipos de Muros:
| Tipo | Uso | Grosor Tipico |
|------|-----|---------------|
| `normal` | Paredes interiores | 2 unidades |
| `perimeter` | Bordes del mapa | 4 unidades |
| `reinforced` | (Futuro) Indestructibles | 3 unidades |

### Ejemplos de Muros:

**Muro horizontal (Este-Oeste):**
```json
{
  "id": "wall_horizontal",
  "position": [0, 50],
  "size": [100, 2],
  "type": "normal"
}
```
Esto crea: Muro de 100 unidades de largo en X, 2 de grosor en Z, centrado en (0, 50)

**Muro vertical (Norte-Sur):**
```json
{
  "id": "wall_vertical",
  "position": [50, 0],
  "size": [2, 100],
  "type": "normal"
}
```
Esto crea: Muro de 2 unidades de ancho en X, 100 de largo en Z, centrado en (50, 0)

---

## 3.2 PORTALS (Portales de Enemigos)

Los portales son puntos de spawn de enemigos con IA territorial.

### Estructura:
```json
{
  "id": "portal_spider_0",
  "position": [X, Z],
  "type": "spider" | "worm",
  "homeRange": 15,
  "detectionRange": 30,
  "maxEnemies": 10,
  "spawnRate": 2
}
```

### Campos:
| Campo | Tipo | Descripcion | Rango Tipico |
|-------|------|-------------|--------------|
| `id` | string | Identificador unico | - |
| `position` | [x,z] | Centro del portal | Dentro del mapa |
| `type` | string | Tipo de enemigo que genera | "spider", "worm" |
| `homeRange` | number | Radio de patrullaje | 10-25 |
| `detectionRange` | number | Radio de deteccion del jugador | 20-40 |
| `maxEnemies` | number | Maximo de enemigos simultaneos | 5-15 |
| `spawnRate` | number | Segundos entre spawns | 1-5 |

### Tipos de Portales:
| Tipo | Visual | Enemigo | Caracteristicas |
|------|--------|---------|-----------------|
| `spider` | Telarana blanca | Arana rapida | Rapido, dash attack |
| `worm` | Agujero marron | Gusano lento | Lento, mas HP |

### Comportamiento de Enemigos:
```
Estados de IA:
1. PATROL: Merodea dentro de homeRange del portal
2. CHASE: Persigue al jugador si esta dentro de detectionRange
3. RETURN: Regresa al portal si el jugador sale de detectionRange
```

---

## 3.3 SPAWN POINTS (Puntos de Aparicion)

### Estructura:
```json
{
  "id": "player_spawn",
  "position": [X, Z],
  "type": "player"
}
```

### Tipos:
| Tipo | Uso |
|------|-----|
| `player` | Donde aparece el jugador al iniciar |
| `enemy` | (Futuro) Zonas de spawn alternativas |
| `item` | (Futuro) Donde aparecen items |
| `checkpoint` | (Futuro) Puntos de guardado |

---

# 4. PATRONES DE CONSTRUCCION

## 4.1 Habitacion Rectangular Basica

Una habitacion de 20x15 unidades con una entrada:

```json
{
  "walls": [
    {"id": "room1_north", "position": [0, 7.5], "size": [20, 2], "type": "normal"},
    {"id": "room1_south", "position": [0, -7.5], "size": [20, 2], "type": "normal"},
    {"id": "room1_east", "position": [10, 0], "size": [2, 15], "type": "normal"},
    {"id": "room1_west_top", "position": [-10, 4], "size": [2, 7], "type": "normal"},
    {"id": "room1_west_bot", "position": [-10, -4], "size": [2, 7], "type": "normal"}
  ]
}
```

Visualizacion:
```
    +------------------+
    |                  |
    |                  |
====                  |  (==== es la entrada)
    |                  |
    |                  |
    +------------------+
```

## 4.2 Corredor en L

```json
{
  "walls": [
    {"id": "l_h1", "position": [0, 0], "size": [30, 2], "type": "normal"},
    {"id": "l_h2", "position": [0, 6], "size": [30, 2], "type": "normal"},
    {"id": "l_v1", "position": [15, 15], "size": [2, 20], "type": "normal"},
    {"id": "l_v2", "position": [21, 15], "size": [2, 20], "type": "normal"}
  ]
}
```

## 4.3 Casa Simple (4 Habitaciones)

```
+--------+--------+
|        |        |
| Sala   | Cocina |
|        |        |
+---  ---+---  ---+
|        |        |
| Dorm1  | Dorm2  |
|        |        |
+--------+--------+
```

```json
{
  "walls": [
    // Perimetro exterior
    {"id": "house_n", "position": [0, 25], "size": [50, 2], "type": "normal"},
    {"id": "house_s", "position": [0, -25], "size": [50, 2], "type": "normal"},
    {"id": "house_e", "position": [25, 0], "size": [2, 50], "type": "normal"},
    {"id": "house_w", "position": [-25, 0], "size": [2, 50], "type": "normal"},

    // Division horizontal central
    {"id": "house_mid_h_l", "position": [-15, 0], "size": [18, 2], "type": "normal"},
    {"id": "house_mid_h_r", "position": [15, 0], "size": [18, 2], "type": "normal"},

    // Division vertical central (con puertas)
    {"id": "house_mid_v_top", "position": [0, 17], "size": [2, 14], "type": "normal"},
    {"id": "house_mid_v_bot", "position": [0, -17], "size": [2, 14], "type": "normal"}
  ]
}
```

## 4.4 Formulas de Posicionamiento

### Centrar un muro en una habitacion:
```
Para una habitacion desde (x1,z1) hasta (x2,z2):
  Centro X = (x1 + x2) / 2
  Centro Z = (z1 + z2) / 2
```

### Crear entrada/puerta en un muro:
```
Muro original: position: [0, 50], size: [100, 2]
Para crear puerta de 6 unidades en el centro:

Muro izquierdo:  position: [-26.5, 50], size: [47, 2]
Muro derecho:    position: [26.5, 50], size: [47, 2]
(Espacio de 6 unidades en el medio)
```

### Conectar habitaciones:
```
Habitacion A: esquina en (-50, -50), tamano 30x30
Habitacion B: esquina en (-20, -50), tamano 30x30

Muro compartido: position: [-20, -35], size: [2, 30]
Puerta: Dividir el muro en 2 segmentos dejando espacio
```

---

# 5. EJEMPLOS PRACTICOS

## 5.1 Pueblo Pequeno

```json
{
  "name": "Pueblo Pequeno",
  "version": "1.0",
  "size": {"width": 200, "height": 200},
  "walls": [
    // Casa 1 (esquina noroeste)
    {"id": "casa1_n", "position": [-70, -40], "size": [25, 2], "type": "normal"},
    {"id": "casa1_s", "position": [-70, -60], "size": [25, 2], "type": "normal"},
    {"id": "casa1_e", "position": [-57, -50], "size": [2, 20], "type": "normal"},
    {"id": "casa1_w", "position": [-82, -50], "size": [2, 20], "type": "normal"},

    // Casa 2 (al lado)
    {"id": "casa2_n", "position": [-30, -40], "size": [25, 2], "type": "normal"},
    {"id": "casa2_s", "position": [-30, -60], "size": [25, 2], "type": "normal"},
    {"id": "casa2_e", "position": [-17, -50], "size": [2, 20], "type": "normal"},
    {"id": "casa2_w", "position": [-42, -50], "size": [2, 20], "type": "normal"},

    // Plaza central (espacio abierto con muros decorativos)
    {"id": "plaza_bench1", "position": [0, 0], "size": [8, 2], "type": "normal"},
    {"id": "plaza_bench2", "position": [0, 10], "size": [8, 2], "type": "normal"},

    // Perimetro del pueblo
    {"id": "perim_n", "position": [0, 100], "size": [200, 4], "type": "perimeter"},
    {"id": "perim_s", "position": [0, -100], "size": [200, 4], "type": "perimeter"},
    {"id": "perim_e", "position": [100, 0], "size": [4, 200], "type": "perimeter"},
    {"id": "perim_w", "position": [-100, 0], "size": [4, 200], "type": "perimeter"}
  ],
  "portals": [
    {"id": "portal_1", "position": [70, 70], "type": "spider", "homeRange": 20, "detectionRange": 35, "maxEnemies": 8, "spawnRate": 3}
  ],
  "spawnPoints": [
    {"id": "player_spawn", "position": [0, -80], "type": "player"}
  ]
}
```

## 5.2 Laberinto Simple

```json
{
  "name": "Laberinto",
  "version": "1.0",
  "size": {"width": 200, "height": 200},
  "walls": [
    // Muros del laberinto (patron de serpiente)
    {"id": "maze_1", "position": [-60, 80], "size": [80, 2], "type": "normal"},
    {"id": "maze_2", "position": [-20, 60], "size": [80, 2], "type": "normal"},
    {"id": "maze_3", "position": [-60, 40], "size": [80, 2], "type": "normal"},
    {"id": "maze_4", "position": [-20, 20], "size": [80, 2], "type": "normal"},
    {"id": "maze_5", "position": [-60, 0], "size": [80, 2], "type": "normal"},

    // Perimetro
    {"id": "perim_n", "position": [0, 100], "size": [200, 4], "type": "perimeter"},
    {"id": "perim_s", "position": [0, -100], "size": [200, 4], "type": "perimeter"},
    {"id": "perim_e", "position": [100, 0], "size": [4, 200], "type": "perimeter"},
    {"id": "perim_w", "position": [-100, 0], "size": [4, 200], "type": "perimeter"}
  ],
  "portals": [
    {"id": "portal_end", "position": [80, -80], "type": "worm", "homeRange": 15, "detectionRange": 25, "maxEnemies": 5, "spawnRate": 4}
  ],
  "spawnPoints": [
    {"id": "player_spawn", "position": [-80, 90], "type": "player"}
  ]
}
```

---

# 6. ELEMENTOS FUTUROS (ROADMAP)

## 6.1 Elementos Planificados

| Elemento | Descripcion | Prioridad |
|----------|-------------|-----------|
| `door` | Puertas que se abren/cierran | Alta |
| `floor_zone` | Zonas con diferentes texturas | Media |
| `light` | Fuentes de luz puntuales | Media |
| `decoration` | Objetos decorativos (arboles, rocas) | Baja |
| `trigger` | Zonas que activan eventos | Alta |
| `npc` | Personajes no jugables | Media |
| `chest` | Cofres con items | Media |
| `teleporter` | Teletransportadores | Baja |

## 6.2 Estructura Propuesta para Elementos Futuros

### Puerta:
```json
{
  "id": "door_1",
  "type": "door",
  "position": [0, 50],
  "size": [4, 2],
  "state": "closed",
  "locked": false,
  "keyId": null
}
```

### Zona de Piso:
```json
{
  "id": "floor_grass",
  "type": "floor_zone",
  "bounds": {"x1": -50, "z1": -50, "x2": 50, "z2": 50},
  "texture": "grass",
  "walkSpeed": 0.8
}
```

### Luz:
```json
{
  "id": "light_1",
  "type": "light",
  "position": [0, 0],
  "color": "#ffaa00",
  "intensity": 1.5,
  "radius": 20
}
```

### Decoracion:
```json
{
  "id": "tree_1",
  "type": "decoration",
  "subtype": "tree_pine",
  "position": [30, 40],
  "scale": 1.5,
  "blocking": true
}
```

### NPC:
```json
{
  "id": "npc_merchant",
  "type": "npc",
  "subtype": "merchant",
  "position": [0, 0],
  "dialog": "dialogs/merchant_1.json",
  "inventory": ["potion_health", "sword_basic"]
}
```

---

# 7. GUIA PARA GENERACION POR PROMPT

## 7.1 Instrucciones para Claude/AI

Cuando generes un mapa, sigue estas reglas:

### Reglas Obligatorias:
1. **Siempre incluir perimetro** con `type: "perimeter"` en los 4 bordes
2. **IDs unicos** para cada elemento
3. **Coordenadas dentro del rango** -100 a +100 (o segun size del mapa)
4. **Al menos 1 spawnPoint** de tipo "player"
5. **Portales alejados del spawn** del jugador (minimo 30 unidades)

### Template Base:
```json
{
  "name": "[NOMBRE DEL MAPA]",
  "version": "1.0",
  "size": {"width": 200, "height": 200},
  "walls": [
    // Perimetro (OBLIGATORIO)
    {"id": "wall_perimeter_north", "position": [0, 100], "size": [200, 4], "type": "perimeter"},
    {"id": "wall_perimeter_south", "position": [0, -100], "size": [200, 4], "type": "perimeter"},
    {"id": "wall_perimeter_east", "position": [100, 0], "size": [4, 200], "type": "perimeter"},
    {"id": "wall_perimeter_west", "position": [-100, 0], "size": [4, 200], "type": "perimeter"},

    // Muros internos aqui...
  ],
  "portals": [
    // Minimo 1 portal recomendado
  ],
  "spawnPoints": [
    {"id": "player_spawn", "position": [0, 0], "type": "player"}
  ]
}
```

## 7.2 Prompts de Ejemplo

### Prompt: "Genera un mapa de ciudad medieval"
```
Crear mapa con:
- Muralla exterior (perimetro)
- Plaza central (20x20 espacio abierto en 0,0)
- 4 casas en las esquinas (cada una 15x15)
- Calles de 8 unidades de ancho conectando todo
- 2 portales en esquinas opuestas (fuera de las casas)
- Spawn del jugador en la entrada sur
```

### Prompt: "Genera un laboratorio con 3 alas"
```
Crear mapa con:
- Pasillo central vertical (6 unidades de ancho)
- Ala Oeste: 4 celdas de 10x10
- Ala Este: 2 salas grandes de 20x15
- Ala Norte: Sala de jefe (30x30)
- Portales en cada ala
- Spawn en entrada sur del pasillo
```

## 7.3 Checklist de Validacion

Antes de considerar un mapa completo, verificar:

- [ ] Perimetro completo (4 muros)
- [ ] IDs unicos en todos los elementos
- [ ] Coordenadas dentro del rango del mapa
- [ ] Spawn del jugador accesible (no dentro de muros)
- [ ] Portales en posiciones validas
- [ ] No hay muros superpuestos
- [ ] Espacios navegables conectados (el jugador puede llegar a todos lados)

---

# APENDICE A: Referencia Rapida

## Formulas Utiles

```
// Centro de un rectangulo
centerX = (x1 + x2) / 2
centerZ = (z1 + z2) / 2

// Tamano de un rectangulo
width = abs(x2 - x1)
depth = abs(z2 - z1)

// Distancia entre dos puntos
distance = sqrt((x2-x1)^2 + (z2-z1)^2)

// Muro horizontal de A hasta B en altura Z
position: [(A + B) / 2, Z]
size: [abs(B - A), 2]

// Muro vertical de A hasta B en posicion X
position: [X, (A + B) / 2]
size: [2, abs(B - A)]
```

## Tamanos de Referencia

| Estructura | Tamano Sugerido | Muros |
|------------|-----------------|-------|
| Celda | 8x8 | 4 muros + puerta |
| Habitacion | 15x15 | 4 muros + puerta |
| Salon | 25x20 | 4 muros + 2 puertas |
| Casa simple | 25x20 | 4 ext + divisiones |
| Edificio | 40x40 | Complejo |
| Arena | 60x60 | Solo perimetro |
| Pueblo | 100x100 | Multiples estructuras |

---

# APENDICE B: Glosario

| Termino | Definicion |
|---------|------------|
| **Position** | Punto central del elemento en coordenadas (X, Z) |
| **Size/Scale** | Dimensiones del elemento (Ancho en X, Profundidad en Z) |
| **Perimeter** | Muros del borde del mapa que encierran el area jugable |
| **Portal** | Punto de spawn de enemigos con comportamiento territorial |
| **HomeRange** | Radio en el que los enemigos patrullan alrededor del portal |
| **DetectionRange** | Radio en el que los enemigos detectan al jugador |
| **SpawnPoint** | Posicion donde aparece el jugador u otros elementos |
| **Subtype** | Categoria secundaria del elemento (ej: "spider", "worm") |

---

*Documento generado: 2025-11-28*
*Version del sistema de mapas: 1.0*
*Ultima actualizacion: Soporte dual-format (legacy + nuevo)*
