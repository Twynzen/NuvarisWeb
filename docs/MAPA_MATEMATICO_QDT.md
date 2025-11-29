# MAPA MATEMATICO - SECTOR OMEGA (QDT)
## Laboratorio Dimensional de Bio-Convergencia

> **Proyecto:** NuvarisWeb - Roguelite Three.js
> **Rama:** entorno-limpio
> **Tecnologia:** Three.js + Angular 20
> **Fecha:** 2025-11-28

---

## 1. SISTEMA DE COORDENADAS THREE.JS

```
                    +Z (Norte/Arriba en pantalla)
                        |
                        |
                        |
    -X (Oeste) ─────────┼───────── +X (Este)
                        |
                        |
                        |
                    -Z (Sur/Abajo en pantalla)

    +Y = Altura (perpendicular al suelo)
```

### Convenciones:
- **Origen (0, 0, 0)**: Centro exacto del mapa
- **Eje X**: Horizontal (Este-Oeste)
- **Eje Y**: Vertical/Altura (Arriba-Abajo)
- **Eje Z**: Profundidad (Norte-Sur)
- **Unidades**: 1 unit ≈ 1 metro en escala del juego

---

## 2. DIMENSIONES DEL MUNDO

### 2.1 Mapa Completo
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MURO NORTE                                     │
│  (-100, 0, 100) ─────────────────────────────────────── (100, 0, 100)   │
│        │                                                       │         │
│        │                    ZONA JUGABLE                       │         │
│   M    │     (-98, 0, 98) ─────────────────── (98, 0, 98)     │    M    │
│   U    │           │                               │           │    U    │
│   R    │           │                               │           │    R    │
│   O    │           │         CENTRO                │           │    O    │
│        │           │         (0,0,0)               │           │         │
│   O    │           │            *                  │           │    E    │
│   E    │           │                               │           │    S    │
│   S    │           │                               │           │    T    │
│   T    │     (-98, 0, -98) ────────────────── (98, 0, -98)    │    E    │
│   E    │                                                       │         │
│        │                                                       │         │
│  (-100, 0, -100) ────────────────────────────────── (100, 0, -100)      │
│                           MURO SUR                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Parametros Clave
| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| `mapSize` | 200 units | Dimension total del mapa (200x200) |
| `mapBounds` | 98 units | Limite de movimiento jugable (±98) |
| `wallThickness` | 2 units | Grosor de los muros perimetrales |
| `wallHeight` | 8 units | Altura de los muros |
| `groundSize` | 200x200 units | Dimension del plano de suelo |

---

## 3. ESTRUCTURA DE MUROS PERIMETRALES

### 3.1 Configuracion de Muros
```javascript
// map-generator.ts linea 147-161
const walls = [
    { pos: [0, 100],    dim: [200, 2], name: "NORTE" },  // BoxGeometry(200, 8, 2)
    { pos: [0, -100],   dim: [200, 2], name: "SUR" },    // BoxGeometry(200, 8, 2)
    { pos: [100, 0],    dim: [2, 200], name: "ESTE" },   // BoxGeometry(2, 8, 200)
    { pos: [-100, 0],   dim: [2, 200], name: "OESTE" }   // BoxGeometry(2, 8, 200)
];
```

### 3.2 Posiciones Exactas de Muros
| Muro | Posicion (X, Y, Z) | Dimensiones (W, H, D) |
|------|-------------------|----------------------|
| Norte | (0, 4, 100) | 200 x 8 x 2 |
| Sur | (0, 4, -100) | 200 x 8 x 2 |
| Este | (100, 4, 0) | 2 x 8 x 200 |
| Oeste | (-100, 4, 0) | 2 x 8 x 200 |

### 3.3 Pilares Internos (Obstaculos)
```javascript
// 20 pilares aleatorios
for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 200 * 0.8;  // Rango: -80 a +80
    const z = (Math.random() - 0.5) * 200 * 0.8;  // Rango: -80 a +80
    // BoxGeometry(4, 8, 4) en posicion (x, 4, z)
}
```

| Propiedad | Valor |
|-----------|-------|
| Cantidad | 20 unidades |
| Rango X | -80 a +80 units |
| Rango Z | -80 a +80 units |
| Dimensiones | 4 x 8 x 4 units |

---

## 4. SISTEMA DE PORTALES (NIDOS ENEMIGOS)

### 4.1 Plano de Portales
```
                        Z+
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        │   WORM-1      │    SPIDER-2   │
        │  (-40,0,40)   │   (40,0,40)   │
        │      ●        │       ◆       │
        │               │               │
   -X ──┼───────────────┼───────────────┼── +X
        │               │               │
        │   SPIDER-1    │    WORM-2     │
        │  (-40,0,-40)  │   (40,0,-40)  │
        │      ◆        │       ●       │
        │               │               │
        └───────────────┼───────────────┘
                        │
                        Z-

    ◆ = Spider Portal (Rojo)
    ● = Worm Portal (Marron)
```

### 4.2 Configuracion de Portales
| Portal | Tipo | Posicion (X, Y, Z) | homeRange | detectionRange | returnThreshold | maxEnemies |
|--------|------|-------------------|-----------|----------------|-----------------|------------|
| Spider-1 | spider | (-40, 0, -40) | 20 | 30 | 40 | 10 |
| Spider-2 | spider | (40, 0, 40) | 20 | 30 | 40 | 10 |
| Worm-1 | worm | (-40, 0, 40) | 15 | 25 | 35 | 10 |
| Worm-2 | worm | (40, 0, -40) | 15 | 25 | 35 | 10 |

### 4.3 Geometria de Portales

#### Spider Portal
```javascript
// Anillo exterior: TorusGeometry(5, 0.6, 16, 100)
// Anillo medio: TorusGeometry(4, 0.5, 16, 100)
// Anillo interior: TorusGeometry(3, 0.4, 16, 100)
// Esfera central: SphereGeometry(1.2, 16, 16)
// 10 Conos: ConeGeometry(0.4, 1.5, 8) a radio 6
```

#### Worm Portal
```javascript
// Cilindro exterior: CylinderGeometry(4.5, 4.5, 2, 16)
// Cilindro interior: CylinderGeometry(3, 3, 2.5, 16)
// Espiral: TorusGeometry(3.5, 0.6, 12, 50)
// 10 Rocas: TetrahedronGeometry(0.5) a radio 5.5
```

---

## 5. SISTEMA DE BIOMAS

### 5.1 Distribucion Radial
```javascript
// 8 zonas de bioma distribuidas circularmente
const numZones = 8;
for (let i = 0; i < numZones; i++) {
    const angle = (i / numZones) * Math.PI * 2;  // 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
    const distance = 30 + Math.random() * 40;     // 30-70 units del centro
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
}
```

### 5.2 Tipos de Bioma
| Bioma | Color | Nombre | enemyMod | Accent Color |
|-------|-------|--------|----------|--------------|
| VOID | 0x0a0a1a | Vacio Eterno | 1.0 | - |
| CRYSTAL | 0x1a0a2e | Cavernas Cristal | 1.2 | 0x00f5ff |
| INFERNO | 0x2a0a0a | Tierras Igneas | 1.5 | 0xff4400 |
| TOXIC | 0x0a2a0a | Pantano Toxico | 1.3 | 0x00ff44 |
| STORM | 0x0a1a2a | Zona Tormentosa | 1.4 | 0x4488ff |

### 5.3 Geometria de Zona
```javascript
// Radio: 15 + random * 10 (15-25 units)
CircleGeometry(radius, 32)
// Posicion Y: 0.02 (ligeramente sobre el suelo)
// Rotacion X: -PI/2 (horizontal)
```

### 5.4 Acentos por Bioma
| Bioma | Geometria | Altura |
|-------|-----------|--------|
| CRYSTAL | ConeGeometry(0.5, 3-5, 6) | 1.5 |
| INFERNO | SphereGeometry(0.5-1, 8, 8) | 0.5 |
| Otros | BoxGeometry(1, 1-3, 1) | 1.0 |

---

## 6. OBJETOS DEL ENTORNO

### 6.1 Cilindros Decorativos (100 unidades)
```javascript
for (let i = 0; i < 100; i++) {
    const x = (Math.random() - 0.5) * 200 * 0.8;  // -80 a +80
    const z = (Math.random() - 0.5) * 200 * 0.8;  // -80 a +80

    // Solo si esta fuera del centro (radio > 10)
    if (Math.sqrt(x*x + z*z) > 10) {
        const height = 2 + Math.random() * 4;  // 2-6 units
        // CylinderGeometry(0.5, 0.7, height, 8)
        // Posicion: (x, height/2, z)
    }
}
```

---

## 7. ENTIDADES DEL JUEGO

### 7.1 PLAYER (Jugador)

```
    ┌─────────────────┐
    │                 │
    │    SPRITE       │  3 x 3 units
    │    BOUNDS       │
    │                 │
    │    ┌───────┐    │
    │    │COLISN │    │  Radio: 1.5 units
    │    │  ●    │    │  Diametro: 3 units
    │    └───────┘    │
    │                 │
    └─────────────────┘

    Shadow: CircleGeometry(0.8)
```

| Propiedad | Valor | Descripcion |
|-----------|-------|-------------|
| COLLISION_RADIUS | 1.5 units | Radio de colision circular |
| SPRITE_WIDTH | 3 units | Ancho del sprite |
| SPRITE_HEIGHT | 3 units | Alto del sprite |
| Shadow Radius | 0.8 units | Radio de la sombra |
| mapBounds | 98 units | Limite de movimiento |

#### Estadisticas por Personaje
| Personaje | Velocidad | Descripcion |
|-----------|-----------|-------------|
| Arcadio | 8 units/sec | Tanque (lento) |
| Lars | 12 units/sec | Balanceado |
| Yurany | 18 units/sec | Rapida |

### 7.2 ENEMY (Enemigos)

```
    ┌─────────────┐
    │             │
    │   SPRITE    │  2 x 2 units
    │   BOUNDS    │
    │   ┌─────┐   │
    │   │ ●   │   │  Radio: 1.5 units
    │   └─────┘   │
    │             │
    └─────────────┘
```

| Propiedad | Spider | Worm |
|-----------|--------|------|
| COLLISION_RADIUS | 1.5 | 1.5 |
| SPRITE_WIDTH | 2 | 2 |
| SPRITE_HEIGHT | 2 | 2 |
| speed | 5 units/sec | 3 units/sec |
| health | 50 HP | 30 HP |
| attackDamage | 20 | 15 |
| attackRange | 5 units | 5 units |
| attackCooldown | 1.0 sec | 1.0 sec |

#### Sistema de Dash
| Propiedad | Valor |
|-----------|-------|
| dashTriggerMin | 5.5 units |
| dashTriggerMax | 12 units |
| dashSpeed | 4x velocidad normal |
| dashDuration | 0.5 sec |
| dashCooldown | 2.0 sec |
| telegraphDuration | 0.25 sec |

### 7.3 PROJECTILE (Proyectil)

| Propiedad | Valor |
|-----------|-------|
| Sprite Scale | 2 x 2 units |
| speed | 20 units/sec |
| damage | 10 HP |
| lifeTime | 2 segundos |
| Posicion Y | 1 unit (sobre suelo) |

### 7.4 XP ORB (Orbe de Experiencia)

| Propiedad | Valor |
|-----------|-------|
| Geometria | SphereGeometry(0.3, 8, 8) |
| Posicion Y | 0.5 units |
| speed (magnetismo) | 15 units/sec |
| magnetRadius | 5 units |
| collectRadius | 1 unit |
| value (default) | 10 XP |

---

## 8. SISTEMA DE CAMARA

```javascript
// Camara Perspectiva
PerspectiveCamera(60, aspectRatio, 0.1, 1000)

// Posicion Inicial
camera.position.set(0, 25, 20);

// Seguimiento del Jugador
const targetX = player.position.x;
const targetZ = player.position.z + 20;
camera.position.x += (targetX - camera.position.x) * 0.1;
camera.position.z += (targetZ - camera.position.z) * 0.1;
```

| Propiedad | Valor |
|-----------|-------|
| FOV | 60 grados |
| Near Plane | 0.1 units |
| Far Plane | 1000 units |
| Altura (Y) | 25 units |
| Offset Z | +20 units detras del jugador |
| Suavizado | 0.1 (lerp) |

### Niebla
```javascript
Fog(0x0a0a1a, 30, 100)
// Color: Azul muy oscuro
// Near: 30 units
// Far: 100 units
```

---

## 9. SISTEMA DE ILUMINACION

### Luz Ambiental
```javascript
AmbientLight(0x222244, 0.5)
// Color: Azul oscuro
// Intensidad: 0.5
```

### Luz Direccional
```javascript
DirectionalLight(0xffffff, 0.8)
position.set(50, 100, 50)
castShadow = true
```

---

## 10. GRID DE REFERENCIA

```javascript
GridHelper(200, 40, 0x00f5ff, 0x1a1a2e)
// Tamano: 200 units
// Divisiones: 40 (cada celda = 5 units)
// Color lineas principales: Cyan
// Color lineas secundarias: Azul oscuro
// Posicion Y: 0.01
// Opacidad: 0.3
```

---

## 11. SISTEMA DE COLISIONES

### 11.1 Distancias de Colision
```javascript
// Colision Player-Enemy
const collisionDistance = PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS;
// = 1.5 + 1.5 = 3.0 units

// Colision Projectile-Enemy
const projectileHitDistance = 1.5 units;

// Colision XP-Player
const xpCollectDistance = 1.0 unit;
```

### 11.2 Optimizacion (Broad Phase)
```javascript
maxCollisionCheckDistance = 35 units;  // Solo verificar enemigos cercanos
```

---

## 12. PLANO CARTESIANO COMPLETO

```
Z = 100  ┌────────────────────────────────────────────────────────────────────────┐
         │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ MURO NORTE ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
         │▓                                                                      ▓│
Z = 80   │▓  ┌─────────────────────────────────────────────────────────────────┐ ▓│
         │▓  │                                                                 │ ▓│
         │▓  │    ░░░                                                 ░░░      │ ▓│
         │▓  │   ░░░░░   BIOMA-7                         BIOMA-0    ░░░░░     │ ▓│
Z = 60   │▓  │    ░░░    (315°)                          (0°)        ░░░      │ ▓│
         │▓  │                                                                 │ ▓│
         │▓  │                                                                 │ ▓│
Z = 40   │▓  │    ●════════════════════════════════════════◆                   │ ▓│
         │▓  │  WORM-1                                   SPIDER-2              │ ▓│
         │▓  │ (-40,0,40)                                (40,0,40)             │ ▓│
         │▓  │    │                                          │                 │ ▓│
Z = 20   │▓  │    │   ░░░                           ░░░     │                 │ ▓│
         │▓  │    │  ░░░░░  BIOMA-6               BIOMA-1   │                 │ ▓│
         │▓  │    │   ░░░   (270°)                (45°)     │                 │ ▓│
         │▓  │    │                                          │                 │ ▓│
Z = 0    │▓  │════╪══════════════════●══════════════════════╪═════════════════│ ▓│
         │▓  │    │                CENTRO                    │                 │ ▓│
         │▓  │    │                (0,0,0)                   │                 │ ▓│
         │▓  │    │                  ★                       │                 │ ▓│
Z = -20  │▓  │    │   ░░░                           ░░░     │                 │ ▓│
         │▓  │    │  ░░░░░  BIOMA-5               BIOMA-2   │                 │ ▓│
         │▓  │    │   ░░░   (225°)                (90°)     │                 │ ▓│
         │▓  │    │                                          │                 │ ▓│
Z = -40  │▓  │    ◆════════════════════════════════════════●                   │ ▓│
         │▓  │  SPIDER-1                                 WORM-2                │ ▓│
         │▓  │ (-40,0,-40)                              (40,0,-40)             │ ▓│
         │▓  │                                                                 │ ▓│
Z = -60  │▓  │    ░░░                                         ░░░              │ ▓│
         │▓  │   ░░░░░   BIOMA-4                  BIOMA-3    ░░░░░            │ ▓│
         │▓  │    ░░░    (180°)                   (135°)      ░░░              │ ▓│
         │▓  │                                                                 │ ▓│
Z = -80  │▓  └─────────────────────────────────────────────────────────────────┘ ▓│
         │▓                                                                      ▓│
Z = -100 │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ MURO SUR ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
         └────────────────────────────────────────────────────────────────────────┘
        X=-100      X=-60       X=-20   X=0   X=20        X=60        X=100

LEYENDA:
  ▓ = Muro Perimetral (espesor 2, altura 8)
  ★ = Spawn Point Jugador (Centro)
  ◆ = Spider Portal (Rojo)
  ● = Worm Portal (Marron)
  ░ = Zona de Bioma (radio 15-25)
  ═ = Rango de Deteccion Portal (30 units spider, 25 units worm)
  │ = Limite de Retorno (40 units spider, 35 units worm)
```

---

## 13. SECCION TRANSVERSAL (Vista Lateral)

```
Y (Altura)
│
│ 8 ─┬─────────────────────────────────────────────────┬─ Tope de Muros
│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│    │▓                                               ▓│
│ 6 ─│▓  ┌───────┐                    ┌───────┐       ▓│── Pilares (altura 8)
│    │▓  │PILAR  │                    │PILAR  │       ▓│
│ 4 ─│▓  │       │  ═══════════════   │       │       ▓│── Centro de Muros
│    │▓  │       │     PORTAL         │       │       ▓│
│ 3 ─│▓  └───────┘                    └───────┘       ▓│
│    │▓                                               ▓│
│ 2 ─│▓          ╔═══╗                                ▓│── Tope Sprite Player
│    │▓          ║ P ║  Sprite 3x3                    ▓│
│ 1 ─│▓          ║   ║                                ▓│
│    │▓          ╚═══╝                                ▓│
│ 0 ─│▓══════════════════════════════════════════════▓│── Suelo
│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└────┼───────────────────────────────────────────────────── X/Z
   -100                      0                        100
```

---

## 14. ZONAS DEL MAPA

### 14.1 Zona Externa (Muros Inexpugnables)
```
Limites: |X| > 98 OR |Z| > 98
Caracteristicas:
  - Muros solidos de 2 units de grosor
  - Altura de 8 units
  - Textura: assets/environment/wall_1.png
  - Impenetrables (collision fisica)
```

### 14.2 Zona Jugable Interna
```
Limites: -98 <= X <= 98 AND -98 <= Z <= 98
Area: 196 x 196 = 38,416 units²
Caracteristicas:
  - Suelo plano (PlaneGeometry 200x200)
  - Grid visible (40 divisiones = 5 units/celda)
  - 20 pilares aleatorios
  - 100 objetos decorativos
  - 8 zonas de bioma
  - 4 portales enemigos
```

### 14.3 Zona Central (Safe Zone)
```
Limites: |X| < 10 AND |Z| < 10
Radio: ~14 units desde origen
Caracteristicas:
  - Sin objetos decorativos
  - Spawn point del jugador
  - Area inicial segura
```

### 14.4 Zonas de Portal
```
Posiciones fijas: (±40, 0, ±40)
Radio de influencia:
  - Spider: 20 units (home), 30 units (deteccion), 40 units (retorno)
  - Worm: 15 units (home), 25 units (deteccion), 35 units (retorno)
```

---

## 15. PROPUESTA: EDITOR DE MAPAS

### 15.1 Arquitectura Sugerida

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MAP EDITOR ARCHITECTURE                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        EDITOR INTERFACE                              │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │
│  │  │ TERRAIN │ │ WALLS   │ │ PORTALS │ │ OBJECTS │ │ ENTITIES│       │ │
│  │  │  TOOL   │ │  TOOL   │ │  TOOL   │ │  TOOL   │ │  TOOL   │       │ │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │ │
│  └───────┼──────────┼─────────┼─────────┼─────────┼────────────────────┘ │
│          │          │         │         │         │                      │
│          ▼          ▼         ▼         ▼         ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         MAP DATA LAYER                               │ │
│  │                                                                       │ │
│  │   MapConfig {                                                         │ │
│  │     size: { width: 200, height: 200 }                                │ │
│  │     bounds: { playable: 98, walls: 100 }                             │ │
│  │     walls: Wall[]                                                     │ │
│  │     portals: Portal[]                                                 │ │
│  │     biomes: Biome[]                                                   │ │
│  │     objects: EnvironmentObject[]                                      │ │
│  │     spawnPoints: SpawnPoint[]                                         │ │
│  │   }                                                                   │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                               │                                          │
│                               ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      SERIALIZATION LAYER                            │ │
│  │                                                                       │ │
│  │   JSON Export/Import   ←→   Binary Format   ←→   Preview Mode        │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                               │                                          │
│                               ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      THREE.JS RENDERER                              │ │
│  │                                                                       │ │
│  │   Scene Graph   ←→   Camera Controls   ←→   Gizmos/Handles          │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Interfaces TypeScript Propuestas

```typescript
// map-editor.types.ts

interface MapConfig {
    id: string;
    name: string;
    version: string;
    size: MapSize;
    bounds: MapBounds;
    ground: GroundConfig;
    walls: WallConfig[];
    portals: PortalConfig[];
    biomes: BiomeConfig[];
    objects: ObjectConfig[];
    spawnPoints: SpawnPointConfig[];
    lighting: LightingConfig;
    fog: FogConfig;
}

interface MapSize {
    width: number;      // Default: 200
    height: number;     // Default: 200
    gridDivisions: number; // Default: 40
}

interface MapBounds {
    playableRadius: number;  // Default: 98
    wallOffset: number;      // Default: 100
}

interface WallConfig {
    id: string;
    type: 'perimeter' | 'internal' | 'custom';
    position: Vector3Config;
    dimensions: Vector3Config;
    rotation: Vector3Config;
    texture: string;
    isCollidable: boolean;
}

interface PortalConfig {
    id: string;
    type: 'spider' | 'worm' | 'custom';
    position: Vector3Config;
    homeRange: number;
    detectionRange: number;
    returnThreshold: number;
    maxEnemies: number;
    spawnRate: number;
    isActive: boolean;
}

interface BiomeConfig {
    id: string;
    type: BiomeType;
    position: Vector3Config;
    radius: number;
    color: number;
    accentColor?: number;
    enemyModifier: number;
    accentObjects: AccentObjectConfig[];
}

interface ObjectConfig {
    id: string;
    type: 'cylinder' | 'box' | 'sphere' | 'custom';
    position: Vector3Config;
    dimensions: Vector3Config;
    rotation: Vector3Config;
    color: number;
    isCollidable: boolean;
    layer: 'decoration' | 'obstacle' | 'interactive';
}

interface SpawnPointConfig {
    id: string;
    type: 'player' | 'enemy' | 'item';
    position: Vector3Config;
    radius: number;
    isDefault: boolean;
}

interface Vector3Config {
    x: number;
    y: number;
    z: number;
}

type BiomeType = 'VOID' | 'CRYSTAL' | 'INFERNO' | 'TOXIC' | 'STORM';
```

### 15.3 Componentes del Editor

```
┌────────────────────────────────────────────────────────────────────┐
│                    EDITOR UI COMPONENTS                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐ ┌─────────────────────────────────┐ ┌──────────┐ │
│  │   TOOLBAR    │ │         3D VIEWPORT             │ │ INSPECTOR│ │
│  │              │ │                                 │ │          │ │
│  │  [Select]    │ │    ┌─────────────────────┐     │ │ Position │ │
│  │  [Move]      │ │    │                     │     │ │  X: ___  │ │
│  │  [Rotate]    │ │    │     SCENE VIEW      │     │ │  Y: ___  │ │
│  │  [Scale]     │ │    │                     │     │ │  Z: ___  │ │
│  │  [Place]     │ │    │    (Isometric/      │     │ │          │ │
│  │  [Delete]    │ │    │     Top-Down)       │     │ │ Rotation │ │
│  │              │ │    │                     │     │ │  X: ___  │ │
│  │  ─────────   │ │    │        ★            │     │ │  Y: ___  │ │
│  │              │ │    │     [Player]        │     │ │  Z: ___  │ │
│  │  [Wall]      │ │    │                     │     │ │          │ │
│  │  [Portal]    │ │    │  ◆           ●      │     │ │ Scale    │ │
│  │  [Biome]     │ │    │ [Spider]  [Worm]    │     │ │  W: ___  │ │
│  │  [Object]    │ │    │                     │     │ │  H: ___  │ │
│  │  [Entity]    │ │    └─────────────────────┘     │ │  D: ___  │ │
│  │              │ │                                 │ │          │ │
│  └──────────────┘ │  [Orbit] [Pan] [Zoom] [Reset]  │ └──────────┘ │
│                   └─────────────────────────────────┘              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        HIERARCHY                                │ │
│  │  ▼ Scene                                                        │ │
│  │    ▼ Environment                                                │ │
│  │      - Ground                                                   │ │
│  │      - Grid                                                     │ │
│  │      ▼ Walls (5)                                                │ │
│  │        - North Wall                                             │ │
│  │        - South Wall                                             │ │
│  │        - East Wall                                              │ │
│  │        - West Wall                                              │ │
│  │        - Pillar_001                                             │ │
│  │      ▼ Portals (4)                                              │ │
│  │        - Spider Portal 1                                        │ │
│  │        - Spider Portal 2                                        │ │
│  │        - Worm Portal 1                                          │ │
│  │        - Worm Portal 2                                          │ │
│  │      ▼ Biomes (8)                                               │ │
│  │      ▼ Objects (100)                                            │ │
│  │    ▼ Entities                                                   │ │
│  │      - Player Spawn                                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 15.4 Estrategias de Flexibilidad

#### A. Sistema de Capas
```typescript
enum MapLayer {
    GROUND = 0,
    BIOME = 1,
    OBJECT = 5,
    WALL = 10,
    PORTAL = 15,
    ENTITY = 20,
    UI = 100
}
```

#### B. Sistema de Grid Snap
```typescript
interface GridSnapConfig {
    enabled: boolean;
    size: number;        // Default: 5 units (como grid actual)
    subDivisions: number; // 1, 2, 4, 8
    showGrid: boolean;
}
```

#### C. Sistema de Prefabs
```typescript
interface Prefab {
    id: string;
    name: string;
    category: 'wall' | 'portal' | 'object' | 'compound';
    components: PrefabComponent[];
    thumbnail: string;
}

interface PrefabComponent {
    type: string;
    config: ObjectConfig | WallConfig | PortalConfig;
    relativePosition: Vector3Config;
}
```

#### D. Generacion Procedural Configurable
```typescript
interface ProceduralConfig {
    biomes: {
        count: number;          // Default: 8
        minRadius: number;      // Default: 15
        maxRadius: number;      // Default: 25
        distribution: 'radial' | 'random' | 'grid';
    };
    objects: {
        count: number;          // Default: 100
        types: ObjectTypeWeight[];
        exclusionZones: ExclusionZone[];
    };
    pillars: {
        count: number;          // Default: 20
        minSpacing: number;
        distribution: 'random' | 'grid' | 'organic';
    };
}
```

### 15.5 Formato de Archivo Sugerido

```json
{
    "version": "1.0.0",
    "meta": {
        "name": "Sector Omega - Lab Alpha",
        "author": "QDT Team",
        "created": "2025-11-28T00:00:00Z",
        "modified": "2025-11-28T00:00:00Z"
    },
    "map": {
        "size": { "width": 200, "height": 200 },
        "bounds": { "playable": 98, "wall": 100 },
        "ground": {
            "color": "0x0a0a1a",
            "gridVisible": true,
            "gridDivisions": 40
        }
    },
    "walls": [
        {
            "id": "wall_north",
            "type": "perimeter",
            "position": { "x": 0, "y": 4, "z": 100 },
            "dimensions": { "x": 200, "y": 8, "z": 2 }
        }
    ],
    "portals": [
        {
            "id": "spider_1",
            "type": "spider",
            "position": { "x": -40, "y": 0, "z": -40 },
            "homeRange": 20,
            "detectionRange": 30,
            "returnThreshold": 40,
            "maxEnemies": 10
        }
    ],
    "biomes": [],
    "objects": [],
    "spawnPoints": [
        {
            "id": "player_spawn",
            "type": "player",
            "position": { "x": 0, "y": 0, "z": 0 },
            "isDefault": true
        }
    ]
}
```

---

## 16. INVESTIGACION REQUERIDA

Para implementar el editor de mapas completo, se recomienda investigar:

### 16.1 Three.js
- **TransformControls**: Para manipulacion de objetos (mover, rotar, escalar)
- **OrbitControls**: Para navegacion de camara en el editor
- **Raycaster**: Para seleccion de objetos con click
- **GLTFExporter/Loader**: Para guardar/cargar escenas completas

### 16.2 Angular
- **Angular CDK Drag and Drop**: Para la jerarquia y paneles
- **ngx-color-picker**: Para seleccion de colores
- **Angular Material**: Para componentes de UI del editor

### 16.3 Persistencia
- **IndexedDB**: Para almacenamiento local de mapas
- **File System Access API**: Para guardar/cargar archivos .json

---

## 17. SIGUIENTE PASO RECOMENDADO

1. **Fase 1**: Crear `MapConfig` interface y `MapLoader` service
2. **Fase 2**: Implementar serialization/deserialization del mapa actual
3. **Fase 3**: Crear UI basica del editor con Three.js viewport
4. **Fase 4**: Agregar herramientas de edicion (select, move, place)
5. **Fase 5**: Implementar sistema de prefabs y generacion procedural

---

> **Nota**: Este documento sirve como referencia matematica completa del entorno actual. Cualquier cambio en el codigo debe reflejarse aqui para mantener la consistencia del sistema.
