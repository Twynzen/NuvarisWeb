# NUVARIS - Documentacion Completa del Proyecto

## Estado: EN DESARROLLO - Three.js 2.5D Roguelite

---

## 1. RESUMEN EJECUTIVO

**NUVARIS** es un juego roguelite estilo **Vampire Survivors** en desarrollo con **Three.js** como motor principal.

### ESTADO ACTUAL (Dec 01, 2025)
- **Motor Activo**: Three.js 2.5D (viewport ortografico isometrico)
- **Rama de Desarrollo**: `feature/map-editor-v2-procedural-improvements`
- **Base**: `claude/nuvaris-game-architecture-*`
- **Nota**: La version anterior con Phaser 3 esta archivada. El desarrollo se enfoca ahora en Three.js.

### Tecnologias Principales
- **Frontend**: Angular 17+ (Standalone Components)
- **Motor Principal**: Three.js (r150+) - 2.5D isometrico
- **Framework Web**: Angular CLI / Webpack
- **Lenguaje**: TypeScript 5.x
- **Build Tool**: Angular CLI

### Features Implementados
- Sistema de portal para spawn de enemigos
- AI de enemigos (3 estados: Chase/Patrol/Return)
- Sistema de colisiones circular (player + enemigos + proyectiles)
- Dev Console unificada (Ctrl+K)
- Invisibilidad para testing (enemigos no detectan jugador)
- Animaciones de sprites (30 frames por animacion)
- Efecto de muerte con glass break + zoom
- Sistemas de dano + inmunidad + multiplicador
- Sistema de habilidades Three.js (Arcadio, Lars, Yurany)
- Arcadio: Hoz curva (proyectil en arco de 90 grados)
- Numeros de dano flotantes (blancos sobre enemigos)
- Lifesteal de Arcadio (15% + numeros verdes de curacion)
- Map Editor completo (crear/editar mapas del juego)
- **NUEVO: RadialRoomGenerator** - Generador procedural estilo legacy
- **NUEVO: Sistema de Rooms con visibilidad limitada**
- **NUEVO: Sistema de iluminacion dinamica por room**
- **NUEVO: Fog dinamico basado en tamano de habitacion**
- **NUEVO: BSPToRoomConverter - puente editor/juego**
- **NUEVO: Sistema unificado de carga de mapas**
- **NUEVO: Minimap con muros sincronizados**

---

## 2. ARQUITECTURA FÍSICA DEL PROYECTO

### 📍 UBICACIÓN RAÍZ
**Path absoluto**: `C:\Users\Daniel\Desktop\Daniel\nuvaris\NuvarisWeb\`

### 🗂️ Estructura Completa

```
NuvarisWeb/                                  ← RAÍZ DEL PROYECTO
│
├── 📂 frontend/                             ← TODO EL CÓDIGO FRONTEND
│   └── nuvaris-temp/                        ← ⭐ PROYECTO ACTIVO (Angular + Three.js)
│       ├── src/
│       │   ├── app/                         ← Código TypeScript Angular
│       │   │   ├── game/                    ← ⭐ MOTOR DEL JUEGO (Three.js)
│       │   │   ├── features/                ← Features (menús, UI)
│       │   │   └── map-editor/              ← Editor de mapas
│       │   └── assets/                      ← Sprites, sonidos, mapas JSON
│       ├── angular.json
│       ├── package.json
│       └── tsconfig.json
│
├── 📂 backend/                              ← ⚠️ FUTURO (todavía no existe)
│   └── README.md                            ← Placeholder
│
├── 📂 docs/                                 ← 📚 TODA LA DOCUMENTACIÓN
│   ├── README.md                            ← Índice completo
│   ├── CLAUDE.md                            ← ⭐ ESTE ARCHIVO (arquitectura para agentes)
│   ├── ARCHITECTURE.md                      ← Arquitectura técnica
│   │
│   ├── setup/                               ← Guías de configuración
│   │   └── CLAUDE_CODE_ACTION_SETUP.md
│   │
│   ├── implementation/                      ← Implementaciones técnicas
│   │   ├── frontend/                        ← Docs específicos del frontend
│   │   │   ├── THREEJS_IMPLEMENTATION.md
│   │   │   ├── isometric_guide.md
│   │   │   └── ...
│   │   ├── MAP_SYSTEM_DOCUMENTATION.md
│   │   └── ...
│   │
│   ├── planning/                            ← Planes y análisis
│   │   ├── frontend/
│   │   └── ...
│   │
│   ├── research/                            ← Investigaciones técnicas
│   │   ├── frontend/
│   │   └── ...
│   │
│   ├── development/                         ← Testing, debugging, sesiones
│   │   ├── frontend/
│   │   └── ...
│   │
│   ├── lore/                                ← Historia y narrativa del juego
│   │   ├── Lore.md
│   │   └── ...
│   │
│   └── archive/                             ← Documentos obsoletos
│
├── 📂 .github/                              ← GitHub Actions
│   └── workflows/
│       └── claude.yml                       ← Claude Code Action workflow
│
├── 📂 maps/                                 ← Mapas exportados del editor
│
└── README.md                                ← ⭐ README PRINCIPAL DEL PROYECTO
```

### 🎯 REGLAS PARA AGENTES/CLAUDE

**Cuando te pidan sobre:**

| Solicitud | Ubicación |
|-----------|-----------|
| **"Frontend"**, **"código del juego"**, **"UI"**, **"visual"** | `frontend/nuvaris-temp/src/app/` |
| **"Motor"**, **"Three.js"**, **"engine"** | `frontend/nuvaris-temp/src/app/game/engine/` |
| **"Personajes"**, **"player"**, **"enemigos"** | `frontend/nuvaris-temp/src/app/game/entities/` |
| **"Habilidades"**, **"skills"**, **"ataques"** | `frontend/nuvaris-temp/src/app/game/abilities/` |
| **"Mapas"**, **"rooms"**, **"procedural"** | `frontend/nuvaris-temp/src/app/game/world/` |
| **"Map editor"**, **"editor visual"** | `frontend/nuvaris-temp/src/app/map-editor/` |
| **"Sprites"**, **"assets"**, **"sonidos"** | `frontend/nuvaris-temp/src/assets/` |
| **"Documentación"**, **"docs"** | `docs/` (subcarpetas por categoría) |
| **"Backend"**, **"API"**, **"servidor"** | ⚠️ No existe todavía - ver `backend/README.md` |

### 🚨 IMPORTANTE

- **Proyecto Phaser ELIMINADO**: Ya no existe `frontend/src/`. TODO el código está en `frontend/nuvaris-temp/`
- **Documentación centralizada**: TODO en `docs/`, NO en carpetas de código
- **Backend futuro**: Existe `backend/` pero solo con README placeholder
- **Rama default**: `development`

---

## 3. ESTRUCTURA DEL CÓDIGO (frontend/nuvaris-temp)

```
frontend/nuvaris-temp/
├── src/app/game/
│   ├── abilities/           # Habilidades de personajes
│   │   ├── skills/          # Skills especificos por personaje
│   │   ├── character-ability.ts
│   │   ├── arcadio.ability.ts
│   │   ├── lars.ability.ts
│   │   └── yurany.ability.ts
│   ├── components/          # Componentes visuales
│   │   ├── visual.component.ts
│   │   └── three-game/
│   ├── config/              # Configuracion del juego
│   │   └── game.config.ts
│   ├── engine/              # Motores del juego
│   │   ├── three-engine.service.ts  # Motor principal
│   │   ├── sprite-animator.ts
│   │   └── debug-visualizer.ts
│   ├── entities/            # Entidades del juego
│   │   ├── player.three.ts
│   │   ├── enemy.three.ts
│   │   ├── projectile.three.ts
│   │   └── xp-orb.three.ts
│   ├── systems/             # Sistemas del juego
│   │   ├── enemy-spawner.system.ts
│   │   ├── xp-manager.system.ts
│   │   ├── particle-manager.system.ts
│   │   └── audio-manager.system.ts
│   ├── ui/                  # Componentes UI Angular
│   │   ├── minimap/         # Minimap con muros sincronizados
│   │   ├── level-up/
│   │   └── pause-menu/
│   ├── utils/               # Utilidades
│   │   └── simple-tween.ts  # Sistema de tweening para animaciones
│   └── world/               # Sistema de mundo y habitaciones
│       ├── room-system.ts           # Tipos e interfaces de rooms
│       ├── room-visibility.manager.ts # Controlador maestro
│       ├── room-lighting.system.ts  # Iluminacion dinamica
│       ├── room-factory.ts          # Fabrica de habitaciones
│       ├── wall-collision.system.ts # Colisiones con muros
│       ├── bsp-to-room.converter.ts # Conversor BSP -> Rooms
│       ├── template-map-generator.ts # Generador procedural
│       ├── procedural-map-generator.ts # Generador BSP
│       ├── portal-system.ts
│       └── door-system.ts
├── map-editor/              # Editor de mapas
│   └── components/
│       └── editor-viewport/
└── assets/
    ├── room-templates/      # Templates JSON de habitaciones
    └── ...
```

---

## 11. SISTEMA DE ROOMS Y VISIBILIDAD LIMITADA

### 3.1 Arquitectura General

El sistema permite crear mapas con habitaciones donde:
- Solo la habitacion actual del jugador esta iluminada
- Las demas habitaciones estan oscurecidas con fog
- El fog se ajusta dinamicamente al tamano de cada habitacion
- Las paredes forman habitaciones cerradas con aberturas para puertas

### 3.2 Componentes Principales

#### RoomVisibilityManager (`room-visibility.manager.ts`)
Controlador maestro que integra todos los subsistemas:
```typescript
// Inicializar
await roomVisibilityManager.initialize(scene, camera);

// Crear habitacion desde template
const room = roomVisibilityManager.createRoom('hub_large', position, rotation);

// Registrar habitacion existente
roomVisibilityManager.registerRoom(room);

// Actualizar cada frame
roomVisibilityManager.update(playerPosition, delta);

// Obtener estadisticas
const stats = roomVisibilityManager.getStats();
// { roomCount, wallCount, visibleRoomCount, currentRoomId }
```

#### RoomLightingSystem (`room-lighting.system.ts`)
Maneja la iluminacion dinamica:
- Luz ambiental por bioma
- Luz del jugador (torch effect)
- Fade in/out de luces al cambiar de habitacion
- **Fog dinamico**: `fog.near` se ajusta al tamano de la habitacion actual

```typescript
// El fog se calcula automaticamente:
const roomDiagonal = sqrt(width² + depth²) / 2;
const fogNear = max(presetNear, roomDiagonal + 5);
// Esto garantiza que la habitacion actual este 100% libre de fog
```

#### WallCollisionSystem (`wall-collision.system.ts`)
Sistema de colisiones con muros:
- AABB (Axis-Aligned Bounding Box) para deteccion rapida
- Spatial grid para optimizacion
- Metodos para minimap: `getWallsForMinimap()`

### 3.3 Biomas y Presets de Iluminacion

Definidos en `room-system.ts`:

| Bioma | Ambient Color | Ambient Intensity | Fog Near | Fog Far |
|-------|---------------|-------------------|----------|---------|
| hub | 0x2a2a3a | 0.35 | 30 | 70 |
| laboratory | 0x2a3a4a | 0.4 | 28 | 60 |
| prison | 0x1a1a2e | 0.2 | 25 | 55 |
| medical | 0x3a3a4a | 0.5 | 25 | 55 |
| corridor | 0x1a1a1a | 0.15 | 15 | 40 |
| garden | 0x1a2a1a | 0.3 | 35 | 80 |

### 3.4 BSPToRoomConverter (`bsp-to-room.converter.ts`)

Convierte datos del editor BSP al sistema de rooms del juego:

```typescript
const converter = new BSPToRoomConverter(scene);
const unifiedData = converter.convert(bspMapData);
// unifiedData contiene: rooms, corridors, wallMeshes, doors, portals, playerSpawn
```

**Interfaces principales**:
```typescript
interface GeneratedBSPMapData {
    rooms: BSPRoom[];
    corridors: BSPCorridor[];
    walls: BSPWallData[];
    portals: BSPPortalData[];
    doors: BSPDoorData[];
    playerSpawn: { x: number; z: number };
    config: BSPMapConfig;
}

interface UnifiedMapData {
    name: string;
    rooms: RoomInstance[];
    corridors: RoomInstance[];
    wallMeshes: THREE.Mesh[];
    doors: BSPDoorData[];
    portals: BSPPortalData[];
    playerSpawn: THREE.Vector3;
    bounds: THREE.Box3;
}
```

### 3.5 Carga Unificada de Mapas

En `three-engine.service.ts`:

```typescript
// Cargar mapa unificado (acepta BSP o UnifiedMapData)
await threeEngine.loadUnifiedMap(mapData);

// Crear mapa de test para verificar iluminacion
await threeEngine.createTestLightingMap();
// Crea: Hub (centro) + Lab (norte) + Prison (este) + corredores
```

### 3.6 Matematica de Posicionamiento de Muros

**IMPORTANTE**: Las posiciones de muros son el CENTRO del mesh (Three.js BoxGeometry).

Para una habitacion centrada en (cx, cz) con tamano (w, d):
```
Norte: center=(cx, cz + d/2), width=w, depth=wallThickness
Sur:   center=(cx, cz - d/2), width=w, depth=wallThickness
Este:  center=(cx + w/2, cz), width=wallThickness, depth=d
Oeste: center=(cx - w/2, cz), width=wallThickness, depth=d
```

---

## 11. DEV CONSOLE

Abrir con **Ctrl+K**

### Comandos Utiles:
| Comando | Descripcion |
|---------|-------------|
| `testlight` | Carga mapa de prueba con 3 habitaciones |
| `fog` | Toggle fog on/off |
| `debug` | Toggle visualizacion de colisiones |
| `invisible` | Enemigos no detectan al jugador |
| `god` | Invulnerabilidad |
| `kill` | Mata todos los enemigos |
| `spawn spider 5` | Spawna 5 aranas |

---

## 11. PERSONAJES JUGABLES

### 5.1 ARCADIO (Titan)
| Stat | Valor |
|------|-------|
| Vida | 100 |
| Velocidad | 200 |
| Arma | PunchWeapon (melee) |
| Pasiva | Rage (+50% dano al 25% HP) |

### 5.2 LARS (Hechicero)
| Stat | Valor |
|------|-------|
| Vida | 80 |
| Velocidad | 220 |
| Arma | MagicMissileWeapon |
| Pasiva | Dark Pact (10% lifesteal) |

### 5.3 YURANY (Proyecto Y)
| Stat | Valor |
|------|-------|
| Vida | 70 |
| Velocidad | 250 |
| Arma | FireballWeapon |
| Pasiva | Phase (20% dodge) |

---

## 11. SISTEMA DE COMBATE

### Armas Disponibles
| Arma | Dano | Cooldown | Rango |
|------|------|----------|-------|
| FireballWeapon | 15 | 1000ms | 400 |
| MagicMissileWeapon | 8 | 500ms | 350 |
| PunchWeapon | 40 | 800ms | 150 |

### Enemigos
| Tipo | HP | Velocidad | Dano | XP |
|------|-----|-----------|------|-----|
| Worm | 20 | 50 | 10 | 10 |
| Spider | 15 | 100 | 8 | 15 |
| Boss | 500 | 60 | 30 | 500 |

---

## 11. MAP EDITOR

### Ruta
`http://localhost:4200/map-editor`

### Controles
- **W/E/R**: Translate/Rotate/Scale
- **G**: Toggle Grid
- **Delete**: Eliminar objeto
- **Ctrl+D**: Duplicar
- **LMB**: Pan camara
- **RMB**: Rotar camara
- **Scroll**: Zoom

### Exportar/Importar
Los mapas se guardan en formato JSON compatible con `loadUnifiedMap()`.

---

## 7.1 GENERADOR RADIAL (Procedural)

Genera mapas siguiendo el patron de `legacy.json` - estructura probada y funcional.

### Estructura Generada
```
        NW ─────── NORTH ─────── NE
        │           │            │
      WEST ───────  HUB  ─────── EAST
        │           │            │
        SW ─────── SOUTH ─────── SE
```

### Configuracion
| Parametro | Default | Descripcion |
|-----------|---------|-------------|
| hubSize | 30 | Tamano del hub central |
| cardinalSize | 25 | Tamano de rooms N/S/E/W |
| cornerSize | 20 | Tamano de rooms esquinas |
| spacing | 20 | Distancia entre rooms |
| corridorWidth | 5 | Ancho de pasillos |
| addCornerRooms | true | Incluir las 4 esquinas |
| generateDoors | true | Crear puertas automaticas |

### Uso en Editor
1. Click en boton **Procedural** en toolbar
2. Ajustar parametros
3. Click en **GENERAR MAPA**
4. Click en **Exportar JSON** para guardar

### Archivo
`map-editor/services/radial-room-generator.ts`

### Documentacion Completa
Ver `docs/PROCEDURAL_MAP_GENERATOR.md` para ejemplos y matematicas.

---

## 11. COMO EJECUTAR

```bash
cd frontend/nuvaris-temp
npm install
npm run start
# Juego: http://localhost:4200
# Map Editor: http://localhost:4200/map-editor
```

### Controles del Juego
- **WASD/Flechas**: Movimiento
- **ESC**: Pausa
- **Ctrl+K**: Dev Console

---

## 11. ARCHIVOS CLAVE PARA REFERENCIA

| Archivo | Proposito |
|---------|-----------|
| `three-engine.service.ts` | Motor principal, carga de mapas |
| `room-visibility.manager.ts` | Controlador de rooms |
| `room-lighting.system.ts` | Iluminacion y fog dinamico |
| `room-system.ts` | Tipos, interfaces, presets |
| `bsp-to-room.converter.ts` | Conversor editor -> juego |
| `wall-collision.system.ts` | Colisiones con muros |
| `radial-room-generator.ts` | Generador procedural radial |

---

## 11. PROXIMOS PASOS (TODO)

### Iluminacion Avanzada
- [ ] Sistema de iluminacion completamente focalizada en room del player
- [ ] Menu de control de iluminacion para experimentar
- [ ] Diferentes tipos de luz (spotlight, area light)
- [ ] Integracion completa con map editor

### Gameplay
- [ ] Mas tipos de enemigos
- [ ] Sistema de guardado
- [ ] Mas armas desbloqueables

### Optimizacion
- [ ] Texture atlases
- [ ] Spatial hashing mejorado
- [ ] LOD para habitaciones lejanas

---

*Documentacion actualizada: 2025-12-01*
*Sistema de Rooms y Visibilidad Limitada: FUNCIONAL*
*Generador Radial Procedural: FUNCIONAL*
