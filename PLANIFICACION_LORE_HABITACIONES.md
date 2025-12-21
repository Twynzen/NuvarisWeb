# PLANIFICACION: LORE, HABITACIONES ESPECIALES Y FLUJO ROGUELITE

> **Documento de Arquitectura y Estrategia de Desarrollo**
> **Proyecto**: Nuvaris - Sector de Confinamiento Omega (QDT)
> **Fecha**: 2025-12-21
> **Estado**: PLANIFICACION (No implementar aun)

---

## INDICE

1. [Estado Actual del Proyecto](#1-estado-actual-del-proyecto)
2. [Arquitectura Tecnica Existente](#2-arquitectura-tecnica-existente)
3. [Lore y Contexto Narrativo](#3-lore-y-contexto-narrativo)
4. [Los Tres Personajes Principales](#4-los-tres-personajes-principales)
5. [Sistema de Habitaciones Especiales](#5-sistema-de-habitaciones-especiales)
6. [Sistema de Portales Interdimensionales](#6-sistema-de-portales-interdimensionales)
7. [Flujo de Juego Roguelite](#7-flujo-de-juego-roguelite)
8. [Sistema de Jefes y Habilidades](#8-sistema-de-jefes-y-habilidades)
9. [Ciclo Infinito de Partidas](#9-ciclo-infinito-de-partidas)
10. [Roadmap de Implementacion](#10-roadmap-de-implementacion)
11. [Assets y Recursos Necesarios](#11-assets-y-recursos-necesarios)
12. [Consideraciones Tecnicas](#12-consideraciones-tecnicas)

---

## 1. ESTADO ACTUAL DEL PROYECTO

### 1.1 Que Existe Actualmente

#### Motor de Juego (Three.js)
```
frontend/nuvaris-temp/src/app/game/
├── core/
│   ├── combat.system.ts      # Sistema de combate
│   ├── entity.manager.ts     # Gestion de entidades
│   └── game-events.ts        # Event Bus profesional
├── entities/
│   ├── player.three.ts       # Player con Three.js
│   ├── enemy.three.ts        # Enemigos
│   ├── projectile.three.ts   # Proyectiles
│   └── xp-orb.three.ts       # Orbes de experiencia
├── world/
│   ├── room-system.ts        # Sistema de habitaciones
│   ├── door-system.ts        # Sistema de puertas
│   ├── portal-system.ts      # Portales (spider/worm)
│   ├── map-generator.ts      # Generador de mapas
│   └── template-map-generator.ts
├── abilities/
│   ├── lars-ability-three.ts
│   ├── proyecto-y-ability-three.ts
│   ├── proyecto-a-ability-three.ts
│   └── skills/
│       ├── lars.skills.ts
│       ├── proyecto-y.skills.ts
│       └── proyecto-a.skills.ts
└── systems/
    ├── spatial-grid.ts       # Optimizacion colisiones
    └── disposable.manager.ts # Limpieza memoria Three.js
```

#### Sistemas Implementados
| Sistema | Estado | Descripcion |
|---------|--------|-------------|
| Movimiento 8-direccional | ✅ Completo | WASD + diagonales |
| Sistema de combate | ✅ Completo | Auto-targeting |
| Habitaciones | ✅ Basico | Room detection, bounds |
| Puertas | ✅ Completo | Auto-open, animaciones |
| Portales | ⚠️ Parcial | Solo spawn de enemigos |
| Level-up | ✅ Completo | Slot machine 3 carriles |
| Habilidades personaje | ✅ Completo | Por personaje |
| Enemigos | 🔄 En progreso | (Tu trabajo actual) |
| Mapas procedurales | ✅ Basico | Radial Room Placement |

### 1.2 Lo Que Falta (Objetivo de Este Documento)

| Funcionalidad | Prioridad | Complejidad |
|---------------|-----------|-------------|
| Habitacion especial por personaje | ALTA | Media |
| Lore inicial de cada personaje | ALTA | Baja |
| Portales para cambiar de mapa | ALTA | Alta |
| Sistema de 4 jefes por mapa | ALTA | Media |
| Habilidades solo al matar jefe | MEDIA | Baja |
| Objetos recolectables | MEDIA | Media |
| Ciclo infinito roguelite | ALTA | Media |

---

## 2. ARQUITECTURA TECNICA EXISTENTE

### 2.1 Sistema de Habitaciones (room-system.ts)

```typescript
// Tipos de habitaciones existentes
type RoomType =
    | 'prison_small' | 'prison_medium' | 'prison_large'
    | 'lab_small' | 'lab_medium' | 'lab_large'
    | 'medical_small' | 'medical_large'
    | 'corridor_horizontal' | 'corridor_vertical'
    | 'corridor_l' | 'corridor_t' | 'corridor_cross'
    | 'hub_small' | 'hub_large'
    | 'custom';

// Biomas disponibles
type RoomBiome = 'prison' | 'laboratory' | 'medical' | 'corridor' | 'hub' | 'garden';
```

**Estructura de una habitacion:**
```typescript
interface RoomTemplate {
    id: string;
    name: string;
    type: RoomType;
    biome: RoomBiome;
    width: number;   // X axis
    depth: number;   // Z axis
    height: number;  // Y axis (default 8)
    walls: RoomWallSegment[];
    doorSockets: DoorSocket[];
    lights: RoomLightSource[];
    spawnPoints: RoomSpawnPoint[];
    lightingPreset: LightingPreset;
    floorColor: number;
    wallColor: number;
    difficulty: number;  // 1-5
    tags: string[];
}
```

### 2.2 Sistema de Puertas (door-system.ts)

```typescript
// Tipos de puertas
const DOOR_PRESETS = {
    small: { width: 4, height: 8, depth: 2 },   // Celdas
    large: { width: 6, height: 8, depth: 2 },   // Estandar
    garage: { width: 10, height: 10, depth: 3 } // Seguridad
};

// Funcionalidad
- Auto-open cuando player se acerca (5 unidades)
- Auto-close despues de delay (1.5s)
- Puertas bloqueadas (requieren llave/evento)
- Animacion de deslizamiento vertical
- Colision cuando cerradas
```

### 2.3 Sistema de Portales (portal-system.ts)

**Estado actual:** Solo spawneadores de enemigos

```typescript
// Portales existentes
type PortalType = 'spider' | 'worm';

interface PortalConfig {
    position: THREE.Vector3;
    type: 'spider' | 'worm';
    homeRange: number;        // Radio de patrulla
    detectionRange: number;   // Rango deteccion player
    returnThreshold: number;  // Distancia para volver
    maxEnemies: number;       // Maximo enemigos activos
}
```

**Visual actual:**
- Spider Portal: Telarana blanca con agujero oscuro
- Worm Portal: Agujero marron en la tierra

### 2.4 Generador Procedural de Mapas

**Algoritmo:** Radial Room Placement (RRP)

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

**Configuracion:**
```typescript
interface RRPConfig {
    seed: string;           // Para reproducibilidad
    hubSize: number;        // Default: 30
    cardinalSize: number;   // Default: 25
    cornerSize: number;     // Default: 20
    spacing: number;        // Default: 20
    corridorWidth: number;  // Default: 5
    addCornerRooms: boolean;
    generateDoors: boolean;
}
```

---

## 3. LORE Y CONTEXTO NARRATIVO

### 3.1 El Universo Nuvaris

**Nuvaris** es un vasto universo donde multiples realidades convergen a traves de portales interdimensionales. El centro es **Tartarus Pryme**, un planeta estratificado.

### 3.2 Corporacion QDT (Quantum Dimensys Technologies)

> *"El dolor es el unico lenguaje universal. Si puedes infligirlo con precision, puedes comunicarte con dioses."*
> — Dr. Lars Kremslinger

**QDT** es una mega-corporacion que controla los portales interdimensionales y la tecnologia cuantica.

**Sector de Confinamiento Omega:**
- Ubicacion: "Bolsa" de realidad artificialmente estabilizada
- Funcion: Prision dimensional y matadero cientifico
- Estado: Cuarentena permanente
- Descripcion: Laboratorio infinito donde las paredes cambian y los pasillos se retuercen

### 3.3 El Contexto del Juego

Los jugadores son **experimentos o prisioneros** forzados a luchar para probar las defensas del sistema. No son heroes voluntarios; son sujetos de prueba.

El laboratorio es una "dimension infinita de horror":
- Paredes que cambian
- Pasillos que se retuercen
- Sistemas de seguridad letales (torretas, drones)
- Portales que escupen criaturas de otras dimensiones

---

## 4. LOS TRES PERSONAJES PRINCIPALES

### 4.1 DR. LARS KREMSLINGER

> **Rol:** El Director / Control Mental
> **Origen:** Humano (anteriormente), ahora Post-humano
> **Color tema:** Purpura cosmico (#9945FF)

**Historia:**
Lars no es un simple cientifico loco; es un genio que miro al abismo y decidio domesticarlo. Su cuerpo ha sido modificado con tecnologia de multiples realidades para soportar la radiacion dimensional y extender su vida indefinidamente. Diseno este "mundo perfecto" de tortura y control para evitar que el infierno se desate sobre Nuvaris. Es el carcelero del multiverso.

**Por que baja a la arena:**
A veces prueba sus propias mejoras psiquicas contra sus creaciones. Cada batalla es un experimento.

**Mecanica principal:** Mind Control
- Intenta controlar enemigos para que luchen por el
- Si falla, puede causar explosion mental
- Los minions controlados eventualmente explotan

**Habilidades disponibles:**
```
BASICAS (63%):
- Persuasion: +5% Mind Control chance
- Leadership: Minions +30% HP
- Charisma: Minions +20% Damage
- Neural Freeze: 30% slow enemies 10%

EPICAS (32%):
- Mass Hysteria: Control afecta area
- Loyalty: Minions duran 50% mas
- Sacrifice: Explosion de minion cura 5 HP
- Unstable Mind: 25% explosion on fail
- Terror: 10% fear on fail

LEGENDARIAS (5%):
- Hive Mind: Minions pueden convertir enemigos
- Volatile Psyche: 50% explosion on fail
- Rebellion: Puede controlar Elites
```

**Habitacion especial sugerida:** LABORATORIO PSIQUICO
- Tema: Laboratorio con tubos de contencion, pantallas holograficas
- Iluminacion: Purpura/azul oscuro, luces parpadeantes
- Elementos: Sillas de tortura mental, maquinas de ondas cerebrales
- Narrativa: "Donde Lars perfecciono el arte de doblar mentes"

---

### 4.2 PROYECTO Y (YURANY)

> **Rol:** Experimento de Fusion Espectral / Asesina Electrica
> **Origen:** Humana fusionada con entidad electrica
> **Color tema:** Cyan electrico (#00FFFF)

**Historia:**
Un experimento de fusion espectral que salio "demasiado bien". Yurany fue una prisionera que sobrevivio a la fusion con una entidad electrica de otra dimension. Su inestabilidad molecular la hace letal pero dificil de contener. QDT la considera su "arma mas impredecible".

**Por que lucha:**
Busca una forma de estabilizar su forma o escapar. Cada enemigo destruido es un paso mas cerca de la libertad... o la aniquilacion total.

**Mecanica principal:** Chain Lightning
- Ataque electrico que rebota entre enemigos
- 8 direcciones de movimiento fluido
- Alta velocidad, baja resistencia

**Habilidades disponibles:**
```
BASICAS (63%):
- Conductivity: +20% Chain Range
- Voltage: +15% Chain Damage
- Quick Charge: +10% Attack Speed
- Sharp Reflexes: +5% Dodge Chance
- Precision: +10% Critical Hit Chance

EPICAS (32%):
- Overload: +1 Chain Bounce
- Static Shock: 15% stun chance
- Phantom Dash: Unlock Dash (Q)
- Deadly Precision: +15% Crit, +25% Crit Damage
- Energized: +10% Movement Speed

LEGENDARIAS (5%):
- Thunderstorm: Lightning cada 2s automatico
- Plasma Arc: Chains ignoran armadura
- Perfect Evasion: +20% Dodge, 200% Crit Damage
```

**Habitacion especial sugerida:** CAMARA DE FUSION
- Tema: Laboratorio de alta energia con bobinas Tesla
- Iluminacion: Cyan brillante, arcos electricos constantes
- Elementos: Tubo de contencion central, generadores overloading
- Narrativa: "El lugar donde Yurany nacio de nuevo... y murio un poco"

---

### 4.3 PROYECTO A (ARCADIO)

> **Rol:** Mutante Biologico / Tanque Viviente
> **Origen:** Humano mutado con ADN de multiples criaturas
> **Color tema:** Rojo sangre (#FF4444)

**Historia:**
Un mutante biologico disenado para ser un tanque viviente. Su fuerza es bruta y su resistencia antinatural. Arcadio era un soldado de elite antes de ser capturado y "mejorado" por QDT. Su mente lucha constantemente contra los instintos bestiales que le implantaron.

**Por que lucha:**
Rabia pura. Cada enemigo destruido es una forma de canalizar la furia que lo consume. Si no mata, la bestia dentro de el lo consumira.

**Mecanica principal:** Melee Devastador
- Ataques cuerpo a cuerpo con carga
- Alta vida, alta resistencia
- Lifesteal, regeneracion

**Habilidades disponibles:**
```
BASICAS (63%):
- Piel de Hierro: +10% Reduccion dano
- Mano Pesada: +20% Knockback
- Vitalidad: +30 Vida maxima
- Piel Gruesa: +5% Reduccion dano
- Sed de Sangre: +5% Lifesteal chance

EPICAS (32%):
- Onda Sismica: +25% Area ataque
- Represalia: 10% thorns damage
- Adrenalina: +5% Speed al recibir dano
- Furia Sangrienta: +15% Lifesteal
- Resiliencia Titan: +2 HP/s regeneracion
- Furia: +50% dano cuando HP < 30%
- Golpes Vampiricos: +10% Heal on lifesteal

LEGENDARIAS (5%):
- Forma Titan: x2 tamano, +50% HP, +50% Damage
- Terremoto: 20% stun on hit
- Modo Berserk: Cada 100 kills, Q mata de un golpe
- Titan Inmortal: +25% Reduccion, +5 HP/s
```

**Habitacion especial sugerida:** ARENA DE GLADIADORES
- Tema: Arena de combate con sangre en las paredes
- Iluminacion: Rojo oscuro, antorchas
- Elementos: Jaulas rotas, huesos, armas oxidadas
- Narrativa: "Donde Arcadio fue convertido en bestia"

---

## 5. SISTEMA DE HABITACIONES ESPECIALES

### 5.1 Concepto

Cada personaje tiene una **habitacion de origen** unica que aparece como el primer mapa del juego. Esta habitacion:

1. Introduce la narrativa del personaje
2. Tiene estetica unica relacionada con su historia
3. Contiene elementos interactivos especificos
4. NO tiene enemigos inicialmente (momento de lore)
5. Tiene un portal de salida que activa el juego

### 5.2 Estructura de Habitacion Especial

```typescript
interface CharacterRoom {
    characterId: 'lars' | 'proyecto_y' | 'proyecto_a';
    roomId: string;
    name: string;
    description: string;

    // Visual
    biome: RoomBiome;
    customLighting: LightingPreset;
    floorTexture: string;
    wallTexture: string;
    ambientParticles?: ParticleConfig;

    // Layout
    size: { width: number; depth: number };
    spawnPoint: { x: number; z: number };
    exitPortal: { x: number; z: number };

    // Lore elements
    loreObjects: LoreObject[];
    narrativeSequence?: NarrativeStep[];

    // Audio
    ambientSound?: string;
    musicTrack?: string;
}

interface LoreObject {
    id: string;
    type: 'terminal' | 'container' | 'hologram' | 'corpse' | 'equipment';
    position: { x: number; z: number };
    interactable: boolean;
    loreText?: string;
    animation?: string;
}
```

### 5.3 Diseno de Habitaciones por Personaje

#### HABITACION DE LARS: "Laboratorio Psiquico Central"

```
Dimensiones: 40x40 unidades
Bioma: laboratory

    ┌────────────────────────────────────────┐
    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
    │  ░  [TUBO]    [TUBO]    [TUBO]      ░  │
    │  ░                                   ░  │
    │  ░     ┌──────────────────┐         ░  │
    │  ░     │   SILLA CENTRAL  │         ░  │
    │  ░     │    (Player       │         ░  │
    │  ░     │     Spawn)       │         ░  │
    │  ░     └──────────────────┘         ░  │
    │  ░                                   ░  │
    │  ░  [CONSOLA]          [CONSOLA]    ░  │
    │  ░                                   ░  │
    │  ░           ╔═══════╗              ░  │
    │  ░           ║PORTAL ║              ░  │
    │  ░           ║ SALIDA║              ░  │
    │  ░           ╚═══════╝              ░  │
    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
    └────────────────────────────────────────┘

Elementos:
- 3 Tubos de contencion con cuerpos suspendidos (hologramas)
- Silla central de control mental (punto de spawn)
- 2 Consolas con logs de experimentos (interactables)
- Portal de salida (activa narrativa antes de entrar)

Iluminacion:
- Ambient: Purpura oscuro (0x1a0a2e)
- Point lights: Purpura brillante en tubos
- Flicker effect en consolas

Narrativa al interactuar:
- Tubo 1: "Sujeto 47. Conversion: Fallida. Resultado: Muerte cerebral."
- Tubo 2: "Sujeto 112. Conversion: Exitosa. Estado: Activo."
- Tubo 3: "Sujeto ???. Conversion: En progreso. Tu."
- Consola: "Iniciando protocolo de prueba OMEGA-7..."
```

#### HABITACION DE PROYECTO Y: "Camara de Fusion Dimensional"

```
Dimensiones: 35x45 unidades (vertical)
Bioma: laboratory (variant: energy)

    ┌────────────────────────────┐
    │  ⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡  │
    │  ⚡                      ⚡  │
    │  ⚡  [BOBINA]  [BOBINA]  ⚡  │
    │  ⚡                      ⚡  │
    │  ⚡     ╭──────────╮     ⚡  │
    │  ⚡     │ TUBO     │     ⚡  │
    │  ⚡     │ CENTRAL  │     ⚡  │
    │  ⚡     │ (Spawn)  │     ⚡  │
    │  ⚡     ╰──────────╯     ⚡  │
    │  ⚡                      ⚡  │
    │  ⚡  [BOBINA]  [BOBINA]  ⚡  │
    │  ⚡                      ⚡  │
    │  ⚡    [GENERADOR]       ⚡  │
    │  ⚡                      ⚡  │
    │  ⚡      ╔═══════╗       ⚡  │
    │  ⚡      ║PORTAL ║       ⚡  │
    │  ⚡      ╚═══════╝       ⚡  │
    │  ⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡  │
    └────────────────────────────┘

Elementos:
- Tubo central de contencion (donde "naciste")
- 4 Bobinas Tesla con arcos electricos constantes
- Generador en overload (particulas, chispas)
- Cables rotos en el suelo
- Portal de salida con borde electrico

Iluminacion:
- Ambient: Azul oscuro (0x0a1a2e)
- Arcos electricos: Cyan brillante (0x00FFFF)
- Flashes aleatorios de luz

Particulas:
- Chispas electricas constantes
- Arcos entre bobinas (shader Three.js)
- Humo del generador

Narrativa:
- Tubo central: "ADVERTENCIA: Sujeto Y inestable. Contencion fallida 47 veces."
- Generador: "Energia requerida para fusion: 12.7 petawatts."
- Al acercarse al portal: "Escuchas el zumbido de tu propia esencia escapando..."
```

#### HABITACION DE PROYECTO A: "Arena del Gladiador"

```
Dimensiones: 50x50 unidades (cuadrada grande)
Bioma: prison (variant: arena)

    ┌────────────────────────────────────────────┐
    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
    │  ▓  [GRADA]  [GRADA]  [GRADA]  [GRADA]  ▓  │
    │  ▓                                      ▓  │
    │  ▓    ╭────────────────────────╮       ▓  │
    │  ▓    │                        │       ▓  │
    │  ▓    │   [JAULA] ░░ [JAULA]   │       ▓  │
    │  ▓    │            ░░          │       ▓  │
    │  ▓    │     ░░░░░░░░░░░░░░     │       ▓  │
    │  ▓    │     ░░░ ARENA ░░░░     │       ▓  │
    │  ▓    │     ░░░(Spawn)░░░░     │       ▓  │
    │  ▓    │     ░░░░░░░░░░░░░░     │       ▓  │
    │  ▓    │            ░░          │       ▓  │
    │  ▓    │   [HUESOS]░░[ARMAS]    │       ▓  │
    │  ▓    │                        │       ▓  │
    │  ▓    ╰────────────────────────╯       ▓  │
    │  ▓                                      ▓  │
    │  ▓           ╔═══════════╗              ▓  │
    │  ▓           ║  PORTAL   ║              ▓  │
    │  ▓           ║ (Sangre)  ║              ▓  │
    │  ▓           ╚═══════════╝              ▓  │
    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
    └────────────────────────────────────────────┘

Elementos:
- Arena central con manchas de sangre
- 2 Jaulas rotas (donde encerraban bestias)
- Pilas de huesos en esquinas
- Armas oxidadas clavadas en paredes
- Gradas vacias (espectadores fantasma?)
- Portal de salida con borde rojo sangre

Iluminacion:
- Ambient: Rojo muy oscuro (0x1a0a0a)
- Antorchas en paredes (point lights naranjas)
- Sombras dramaticas

Particulas:
- Polvo/arena en el aire
- Chispas de antorchas
- Salpicaduras de sangre ocasionales

Narrativa:
- Jaula 1: "Marcas de garras. Las tuyas."
- Huesos: "No todos son de enemigos..."
- Armas: "Ninguna se siente correcta. Tu cuerpo ES el arma."
- Al acercarse al portal: "La bestia ruge. El portal responde."
```

### 5.4 Implementacion Tecnica

**Nuevo archivo:** `character-rooms.ts`

```typescript
// frontend/nuvaris-temp/src/app/game/world/character-rooms.ts

import * as THREE from 'three';
import { RoomTemplate, RoomBiome, LightingPreset } from './room-system';

export interface CharacterRoom extends RoomTemplate {
    characterId: 'lars' | 'proyecto_y' | 'proyecto_a';
    loreObjects: LoreObject[];
    exitPortal: PortalConfig;
    narrativeSequence: NarrativeStep[];
}

export interface LoreObject {
    id: string;
    type: 'terminal' | 'container' | 'hologram' | 'weapon_rack' | 'corpse';
    position: THREE.Vector3;
    scale: THREE.Vector3;
    rotation: number;
    interactable: boolean;
    interactionRadius: number;
    loreText: string[];
    glowColor?: number;
    animation?: 'pulse' | 'flicker' | 'rotate' | 'none';
}

export interface NarrativeStep {
    id: string;
    trigger: 'spawn' | 'interact' | 'approach_portal' | 'time';
    delay?: number;
    text: string;
    duration: number;
    position: 'center' | 'bottom' | 'top';
    style: 'normal' | 'warning' | 'system' | 'memory';
}

export const CHARACTER_ROOMS: Record<string, CharacterRoom> = {
    lars: { /* ... definicion completa ... */ },
    proyecto_y: { /* ... definicion completa ... */ },
    proyecto_a: { /* ... definicion completa ... */ }
};
```

---

## 6. SISTEMA DE PORTALES INTERDIMENSIONALES

### 6.1 Evolucion del Sistema de Portales

**Estado actual:** Portales = Spawneadores de enemigos (spider/worm)

**Estado objetivo:** Portales = Transiciones entre mapas/dimensiones

### 6.2 Tipos de Portales Propuestos

```typescript
type PortalPurpose =
    | 'enemy_spawn'      // Actual: spawn enemigos
    | 'dimension_gate'   // Nuevo: cambio de mapa
    | 'boss_arena'       // Nuevo: entrada a jefe
    | 'exit'             // Nuevo: salida de habitacion especial
    | 'hub_return';      // Nuevo: volver al hub

interface DimensionPortal {
    id: string;
    purpose: PortalPurpose;
    position: THREE.Vector3;

    // Visual
    theme: 'void' | 'fire' | 'electric' | 'organic' | 'cosmic';
    size: 'small' | 'medium' | 'large';
    particleEffect: ParticleConfig;

    // Destino
    destination?: {
        mapId: string;
        spawnPoint: THREE.Vector3;
    };

    // Condiciones
    requiresBossKill?: boolean;
    requiredKills?: number;
    isLocked: boolean;

    // Efectos Three.js
    shaderEffect?: ShaderConfig;
    animation: PortalAnimation;
}
```

### 6.3 Efectos Visuales con Three.js

**Portal de Dimension (concept):**

```typescript
// Shader para portal dimensional
const portalShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;

        void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float angle = atan(center.y, center.x);

            // Espiral
            float spiral = sin(angle * 5.0 + dist * 10.0 - time * 2.0);

            // Glow hacia el centro
            float glow = 1.0 - smoothstep(0.0, 0.5, dist);

            // Color interpolado
            vec3 color = mix(color1, color2, spiral * 0.5 + 0.5);

            // Borde brillante
            float edge = smoothstep(0.45, 0.5, dist) * (1.0 - smoothstep(0.5, 0.55, dist));

            gl_FragColor = vec4(color * glow + edge, glow);
        }
    `,
    uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x9945FF) },
        color2: { value: new THREE.Color(0x00FFFF) }
    }
};
```

**Particulas de portal:**
```typescript
function createPortalParticles(color: number): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const count = 100;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: color,
        size: 0.2,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
}
```

### 6.4 Flujo de Transicion entre Mapas

```
1. Player se acerca al portal
   └─> Activar glow/particulas intensificadas

2. Player entra en portal (colision)
   └─> Fade to black (o efecto warp)
   └─> Guardar estado del player
   └─> Descargar mapa actual (dispose Three.js resources)

3. Carga de nuevo mapa
   └─> Generar mapa procedural (con seed?)
   └─> Cargar en memoria
   └─> Posicionar player en spawnPoint

4. Fade in
   └─> Restaurar estado del player
   └─> Iniciar spawners de enemigos
   └─> Mostrar UI de nuevo mapa
```

---

## 7. FLUJO DE JUEGO ROGUELITE

### 7.1 Estructura del Run

```
┌─────────────────────────────────────────────────────────────┐
│                     SELECCION DE PERSONAJE                  │
│         [LARS]        [PROYECTO Y]        [PROYECTO A]      │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   HABITACION ESPECIAL                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Narrativa inicial del personaje                   │   │
│  │  • Exploracion de lore (opcional)                    │   │
│  │  • Sin enemigos                                      │   │
│  │  • Portal de salida al completar                     │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    MAPA PRINCIPAL (Nivel 1)                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ESTRUCTURA:                                         │   │
│  │  • Hub central + 4-8 habitaciones                    │   │
│  │  • 4 Mini-jefes distribuidos                         │   │
│  │  • Enemigos spawn de portales                        │   │
│  │  • Objetos recolectables                             │   │
│  │                                                      │   │
│  │  OBJETIVO:                                           │   │
│  │  • Matar 4 mini-jefes = 4 nuevas habilidades        │   │
│  │  • Cada jefe muerto abre UN portal dimensional       │   │
│  │  • Elegir portal = elegir siguiente zona             │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  PORTAL A     │   │  PORTAL B     │   │  PORTAL C     │
    │  Zona Prisión │   │  Zona Medical │   │  Zona Reactor │
    └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    MAPA SIGUIENTE (Nivel 2+)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Dificultad escalada (+20% stats enemigos)        │   │
│  │  • Nuevos tipos de enemigos                          │   │
│  │  • 4 nuevos mini-jefes                               │   │
│  │  • Mas portales disponibles                          │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
                        ∞ CICLO INFINITO ∞
```

### 7.2 Detalles del Flujo

**Fase 1: Habitacion Especial (0-2 min)**
- Player aparece en su habitacion de origen
- Puede explorar e interactuar con elementos de lore
- No hay enemigos, no hay peligro
- Portal de salida siempre disponible
- Al entrar al portal: transicion al primer mapa real

**Fase 2: Mapa Principal (5-15 min por mapa)**
- Mapa procedural con 9 habitaciones (hub + 4 cardinales + 4 esquinas)
- Enemigos spawn de portales spider/worm
- 4 mini-jefes en habitaciones aleatorias (no hub)
- Cada jefe muerto:
  - Da acceso a pantalla level-up (habilidad)
  - Abre un portal dimensional en esa habitacion
- Player puede:
  - Seguir matando enemigos para farmear
  - Entrar en cualquier portal abierto

**Fase 3: Transicion**
- Elegir portal = elegir tema del siguiente mapa
- Fade out, carga, fade in
- Stats de enemigos escalan con nivel de mapa

**Fase 4: Ciclo Infinito**
- Cada mapa tiene los mismos 4 jefes requirement
- Dificultad escala exponencialmente
- El run termina cuando el player muere
- Meta-progresion (futuro): desbloquear cosas permanentes

### 7.3 Cambio en Sistema de Habilidades

**Sistema actual:**
- Level up = pantalla de seleccion de habilidad
- Se gana XP de enemigos normales

**Sistema propuesto:**
```
ANTES:
  Matar enemigos → Ganar XP → Level up → Habilidad

DESPUES:
  Matar enemigos → Ganar XP → Level up → SOLO stats basicos (+HP, +Speed, etc.)
  Matar JEFE → Habilidad especial
```

**Beneficios:**
1. Los jefes se sienten importantes
2. 4 habilidades por mapa = ritmo controlado
3. Elegir habilidad tras jefe = decision significativa
4. XP normal sigue siendo util (stats)

---

## 8. SISTEMA DE JEFES Y HABILIDADES

### 8.1 Mini-Jefes por Mapa

Cada mapa tiene exactamente 4 mini-jefes. Cada uno:
- Tiene pool de vida significativo
- Tiene patrones de ataque unicos
- Al morir, garantiza 1 habilidad
- Abre 1 portal dimensional

```typescript
interface MiniBoss {
    id: string;
    name: string;
    type: 'guardian' | 'hunter' | 'caster' | 'swarm';

    // Stats (escalan con nivel de mapa)
    baseHealth: number;
    baseDamage: number;
    speed: number;

    // Comportamiento
    attackPatterns: AttackPattern[];
    specialAbility: SpecialAbility;

    // Visual
    size: number;
    color: number;
    particles: ParticleConfig;

    // Recompensas
    guaranteedAbility: boolean;  // Siempre true para mini-jefes
    opensPortal: boolean;        // Siempre true
    xpValue: number;
}
```

### 8.2 Tipos de Mini-Jefes Sugeridos

**GUARDIAN (Tanque)**
- HP alto, movimiento lento
- Ataque: Slam AoE que deja zona de dano
- Especial: Escudo temporal (reduce 50% dano)
- Color: Azul oscuro

**HUNTER (Perseguidor)**
- HP medio, muy rapido
- Ataque: Dash hacia player
- Especial: Invisibilidad temporal
- Color: Verde

**CASTER (Proyectiles)**
- HP bajo, estatico
- Ataque: Barrages de proyectiles
- Especial: Invocar escudos orbitales
- Color: Morado

**SWARM LORD (Invocador)**
- HP medio, lento
- Ataque: Cuerpo a cuerpo debil
- Especial: Invocar oleadas de minions
- Color: Amarillo

### 8.3 Pantalla de Habilidad Post-Jefe

**Diferencia con level-up normal:**
- Aparece SOLO al matar jefe
- Ofrece habilidades MAS poderosas
- Posiblemente garantiza al menos 1 epica

```
┌─────────────────────────────────────────────────────────────┐
│                    JEFE DERROTADO                           │
│                                                             │
│              "GUARDIAN CAIDO"                               │
│                                                             │
│         Elige tu recompensa:                                │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │  EPICA    │  │  EPICA    │  │ LEGENDARIA│               │
│  │           │  │           │  │           │               │
│  │ Overload  │  │  Static   │  │Thunderstorm│              │
│  │           │  │   Shock   │  │           │               │
│  │ +1 Chain  │  │ 15% Stun  │  │ Auto Zap  │               │
│  │           │  │           │  │           │               │
│  └───────────┘  └───────────┘  └───────────┘               │
│                                                             │
│     [PORTAL DIMENSIONAL ABIERTO EN ESTA HABITACION]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. CICLO INFINITO DE PARTIDAS

### 9.1 Escalado de Dificultad

```typescript
interface DifficultyScaling {
    mapLevel: number;

    // Multiplicadores
    enemyHealthMult: number;      // 1.0 + (level * 0.2)
    enemyDamageMult: number;      // 1.0 + (level * 0.15)
    enemySpeedMult: number;       // 1.0 + (level * 0.05)
    spawnRateMult: number;        // 1.0 + (level * 0.1)

    // Nuevos enemigos por nivel
    unlockedEnemyTypes: string[];

    // Jefes
    bossHealthMult: number;       // 1.0 + (level * 0.3)
    bossDamageMult: number;       // 1.0 + (level * 0.2)
}

function calculateDifficulty(mapLevel: number): DifficultyScaling {
    return {
        mapLevel,
        enemyHealthMult: 1.0 + (mapLevel * 0.2),
        enemyDamageMult: 1.0 + (mapLevel * 0.15),
        enemySpeedMult: 1.0 + (mapLevel * 0.05),
        spawnRateMult: 1.0 + (mapLevel * 0.1),
        unlockedEnemyTypes: getEnemyTypesForLevel(mapLevel),
        bossHealthMult: 1.0 + (mapLevel * 0.3),
        bossDamageMult: 1.0 + (mapLevel * 0.2)
    };
}
```

### 9.2 Temas de Mapas

Cada portal lleva a un mapa con tema diferente:

| Tema | Biomas | Enemigos | Color |
|------|--------|----------|-------|
| Prison | prison, corridor | Zombies, Runners | Gris |
| Laboratory | laboratory, hub | Drones, Mutantes | Azul |
| Medical | medical | Infectados, Syringes | Verde |
| Reactor | custom (reactor) | Roboticos, Radiactivos | Naranja |
| Garden | garden | Organicos, Plantas | Verde brillante |

### 9.3 Objetos Recolectables (Futuro)

```typescript
interface Collectible {
    id: string;
    type: 'health_pack' | 'xp_orb' | 'damage_boost' | 'speed_boost' | 'key';

    // Spawn
    spawnChance: number;
    spawnLocation: 'enemy_drop' | 'chest' | 'secret';

    // Efecto
    effect: CollectibleEffect;
    duration?: number;  // Para boosts temporales

    // Visual
    model: string;
    particles: ParticleConfig;
    glowColor: number;
}
```

---

## 10. ROADMAP DE IMPLEMENTACION

### FASE 1: Habitaciones Especiales (Prioridad ALTA)

**Duracion estimada:** 1-2 semanas

| Tarea | Descripcion | Dependencias |
|-------|-------------|--------------|
| 1.1 | Crear `character-rooms.ts` | room-system.ts |
| 1.2 | Disenar habitacion de Lars | 1.1 |
| 1.3 | Disenar habitacion de Proyecto Y | 1.1 |
| 1.4 | Disenar habitacion de Proyecto A | 1.1 |
| 1.5 | Sistema de objetos interactables | 1.1 |
| 1.6 | Sistema de narrativa (texto en pantalla) | - |
| 1.7 | Integracion con seleccion de personaje | 1.2-1.4 |

### FASE 2: Portales Dimensionales (Prioridad ALTA)

**Duracion estimada:** 1-2 semanas

| Tarea | Descripcion | Dependencias |
|-------|-------------|--------------|
| 2.1 | Refactorizar portal-system.ts | - |
| 2.2 | Crear shader de portal (Three.js) | - |
| 2.3 | Sistema de transicion entre mapas | 2.1 |
| 2.4 | Fade out/in con efecto | 2.3 |
| 2.5 | Preservar estado del player | 2.3 |
| 2.6 | Descargar/cargar mapas sin memory leak | 2.3, disposable.manager.ts |

### FASE 3: Sistema de Mini-Jefes (Prioridad ALTA)

**Duracion estimada:** 1-2 semanas

| Tarea | Descripcion | Dependencias |
|-------|-------------|--------------|
| 3.1 | Crear entidad MiniBoss | enemy.three.ts |
| 3.2 | Implementar 4 tipos de jefes | 3.1 |
| 3.3 | Sistema de spawn de jefes en habitaciones | 3.1, room-system.ts |
| 3.4 | Modificar level-up: solo stats de XP | level-up scene |
| 3.5 | Nueva pantalla de habilidad post-jefe | 3.4 |
| 3.6 | Portal aparece al matar jefe | 3.1, 2.1 |

### FASE 4: Flujo Roguelite Completo (Prioridad MEDIA)

**Duracion estimada:** 1-2 semanas

| Tarea | Descripcion | Dependencias |
|-------|-------------|--------------|
| 4.1 | Game state manager (nivel actual, jefes, etc.) | - |
| 4.2 | Escalado de dificultad | 4.1 |
| 4.3 | Multiples temas de mapa | map-generator.ts |
| 4.4 | Seleccion de portal = seleccion de tema | 2.1, 4.3 |
| 4.5 | UI de progreso del run | 4.1 |
| 4.6 | Pantalla de muerte / restart | - |

### FASE 5: Polish y Extras (Prioridad BAJA)

**Duracion estimada:** Continuo

| Tarea | Descripcion | Dependencias |
|-------|-------------|--------------|
| 5.1 | Audio ambiental por habitacion | audio.service.ts |
| 5.2 | Musica de jefe | 5.1 |
| 5.3 | Objetos recolectables | - |
| 5.4 | Secretos en mapas | - |
| 5.5 | Meta-progresion (futuro) | - |

---

## 11. ASSETS Y RECURSOS NECESARIOS

### 11.1 Assets Visuales

**Habitaciones Especiales:**
- Texturas de suelo por tema (laboratorio, arena, fusion)
- Modelos 3D para objetos de lore (tubos, consolas, jaulas)
- Particulas especiales (electricidad, sangre, psiquico)

**Portales:**
- Shader de portal dimensional
- Particulas de portal (por tema)
- Efectos de transicion

**Jefes:**
- Modelos o sprites para 4 tipos de jefe
- Animaciones de ataque
- Efectos de muerte

### 11.2 Audio

**Ambiente:**
- Habitacion Lars: Zumbido electrico, susurros
- Habitacion Proyecto Y: Chispazos, electricidad estatica
- Habitacion Proyecto A: Gruñidos lejanos, cadenas

**Efectos:**
- Portal activandose
- Portal transicion
- Jefe aparece
- Jefe muere
- Habilidad adquirida

**Musica:**
- Tema de habitacion especial (melancolico)
- Tema de combate normal
- Tema de jefe (intenso)
- Tema de victoria de jefe

### 11.3 Textos/Narrativa

**Por personaje:**
- 5-10 lineas de lore para objetos interactables
- 2-3 lineas de narrativa al spawn
- 1-2 lineas al acercarse al portal

**UI:**
- Nombres de jefes
- Descripciones de portales
- Mensajes de progreso

---

## 12. CONSIDERACIONES TECNICAS

### 12.1 Performance

**Memory Management:**
- Usar `DisposableManager` para limpiar recursos Three.js
- Descargar geometrias/materiales al cambiar de mapa
- Object pooling para particulas

**Render:**
- LOD (Level of Detail) para objetos lejanos
- Frustum culling (ya manejado por Three.js)
- Limitar particulas activas

### 12.2 Compatibilidad

**Generador procedural:**
- Seeds deben producir mismos resultados siempre
- Validar que jefes no spawnen en hub
- Verificar accesibilidad de todas las habitaciones

**Estado del juego:**
- Serializar estado del player entre mapas
- Manejar caso de cierre inesperado

### 12.3 Extensibilidad

**Nuevos personajes (futuro):**
- Sistema debe permitir agregar nuevas habitaciones especiales
- Skills separados por personaje

**Nuevos jefes:**
- Sistema de patrones de ataque modular
- Facil agregar nuevos tipos

**Nuevos temas de mapa:**
- Biomas adicionales en room-system
- Nuevos presets de iluminacion

---

## RESUMEN EJECUTIVO

### Lo que necesitas implementar (en orden):

1. **Habitaciones especiales** para cada personaje (lore inicial)
2. **Portales de transicion** entre mapas (con efectos Three.js)
3. **4 mini-jefes por mapa** que dan habilidades
4. **Flujo roguelite** con escalado infinito
5. **Polish** (audio, particulas, narrativa)

### Cambios clave al sistema actual:

| Actual | Propuesto |
|--------|-----------|
| XP → Habilidad | XP → Stats basicos |
| Jefes cada 5 min | 4 Jefes por mapa, dispersos |
| Un solo mapa | Multiples mapas conectados por portales |
| Sin narrativa | Narrativa en habitacion inicial |
| Portales = spawners | Portales = transiciones |

### Archivos principales a modificar/crear:

```
CREAR:
- character-rooms.ts (habitaciones especiales)
- mini-boss.entity.ts (jefes)
- dimension-portal.ts (portales de transicion)
- run-manager.ts (estado del run)
- narrative-system.ts (texto en pantalla)

MODIFICAR:
- portal-system.ts (agregar tipo 'dimension_gate')
- level-up scene (separar stats de habilidades)
- map-generator.ts (spawn de jefes)
- game-scene (flujo de transicion)
```

---

**Documento creado para planificacion. NO IMPLEMENTAR sin revision y aprobacion.**

**Siguiente paso recomendado:** Revisar este documento, hacer preguntas, y priorizar que implementar primero.
