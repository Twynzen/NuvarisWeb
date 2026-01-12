# Análisis Técnico Completo: Sistema 2.5D Three.js - Medidas y Estructura

**Fecha**: 31 de Diciembre, 2025
**Autor**: Análisis Técnico Sistema Nuvariz
**Motor**: Three.js (r150+) con viewport ortográfico isométrico
**Estado**: Juego 2.5D (sprites 2D en mundo 3D)

---

## 1. RESUMEN EJECUTIVO

Este documento proporciona un análisis técnico exhaustivo del sistema Three.js implementado en Nuvariz, un juego roguelite 2.5D. El análisis cubre:

- **Medidas exactas** de todos los elementos del juego (suelos, paredes, puertas, personajes)
- **Sistema de coordenadas** y cómo funciona la proyección isométrica
- **Arquitectura 2.5D**: Sprites 2D posicionados en espacio 3D
- **Propuestas de medidas estándar** para mantener coherencia visual
- **Recomendaciones** para decoración y assets

### Hallazgos Clave

1. **El juego usa un sistema 2.5D híbrido**: Sprites 2D (billboards) en un mundo 3D con cámara ortográfica
2. **Escala del mapa**: 200x200 unidades Three.js
3. **Altura estándar**: Todas las entidades se posicionan en Y=0 (suelo), excepto la altura visual de sprites
4. **Sistema de habitaciones**: Generación procedural con visibilidad limitada y fog dinámico

---

## 2. MEDIDAS ACTUALES DEL SISTEMA

### 2.1 Personajes Jugables

Todos los personajes usan las mismas dimensiones físicas para mantener coherencia:

```typescript
// PlayerThree (player.three.ts:112-114)
public static readonly COLLISION_RADIUS = 1.0;  // Radio de colisión
public static readonly SPRITE_WIDTH = 2;        // Ancho visual
public static readonly SPRITE_HEIGHT = 2;       // Alto visual
```

**Escala visual del sprite**: `4.5 x 4.5` (player.three.ts:145)

#### Velocidades por Personaje

| Personaje | Velocidad (units/s) | Rol |
|-----------|---------------------|-----|
| Proyecto A | 8 | Lento (tanque) |
| Lars | 12 | Medio (mago) |
| Proyecto Y | 18 | Rápido (DPS) |

**Interpretación 2.5D**: Los sprites 2D se escalan a 4.5x4.5 pero la colisión es un círculo de radio 1.0, permitiendo navegación fluida en espacios 3D.

---

### 2.2 Enemigos

Los enemigos son ligeramente más pequeños que el jugador para facilitar navegación:

```typescript
// EnemyThree (enemy.three.ts:22-24)
public static readonly COLLISION_RADIUS = 0.8;
public static readonly SPRITE_WIDTH = 1.5;
public static readonly SPRITE_HEIGHT = 1.5;
```

#### Stats por Tipo

| Tipo | Velocidad | HP | Daño | Radio | XP |
|------|-----------|----|----- |-------|-----|
| Spider | 5 units/s | 50 | 20 | 0.8 | 15 |
| Worm | 3 units/s | 30 | 15 | 0.8 | 10 |

**Nota visual**: Los sprites de enemigos mantienen proporciones similares a los jugadores pero son más pequeños para diferenciación clara.

---

### 2.3 Estructura de Habitaciones (Rooms)

El sistema de habitaciones define las dimensiones de los espacios del juego:

```typescript
// RoomTemplate interface (room-system.ts:117-145)
interface RoomTemplate {
    width: number;   // Eje X
    depth: number;   // Eje Z
    height: number;  // Eje Y (default 8)
    // ...
}
```

#### Medidas Estándar por Tipo de Habitación

Basado en los presets de iluminación y el generador radial:

| Tipo de Room | Width (X) | Depth (Z) | Height (Y) | Uso |
|--------------|-----------|-----------|------------|-----|
| Hub Large | 30 | 30 | 8 | Habitación central |
| Cardinal Medium | 25 | 25 | 8 | Habitaciones N/S/E/W |
| Corner Small | 20 | 20 | 8 | Habitaciones esquina |
| Corridor | 5-10 | Variable | 8 | Pasillos conectores |

**Altura universal**: Todas las habitaciones usan altura Y=8 para mantener coherencia visual.

---

### 2.4 Paredes (Walls)

Las paredes son BoxGeometry de Three.js con dimensiones específicas:

```typescript
// MapGenerator (map-generator.ts:46-47)
const wallHeight = 8;
const thickness = 2;
```

#### Especificaciones de Muros

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| Altura | 8 units | Altura estándar para todas las paredes |
| Grosor | 2 units | Profundidad del muro (depth en BoxGeometry) |
| Anchura | Variable | Depende del tamaño de la habitación |

#### Posicionamiento de Muros

**CRÍTICO**: Las posiciones de muros son el **CENTRO** del mesh (Three.js BoxGeometry).

Para una habitación centrada en `(cx, cz)` con tamaño `(w, d)`:

```
Muro Norte:  center=(cx, cz + d/2), width=w, depth=2
Muro Sur:    center=(cx, cz - d/2), width=w, depth=2
Muro Este:   center=(cx + w/2, cz), width=2, depth=d
Muro Oeste:  center=(cx - w/2, cz), width=2, depth=d
```

**Altura del centro del muro**: `Y = wallHeight/2 = 4` (room-factory.ts:536)

#### Sistema de Corte de Muros para Puertas

El sistema automáticamente crea aberturas en los muros donde hay puertas (room-factory.ts:263-295):

- Detecta intersección de puertas con muros
- Divide el muro en segmentos antes y después de la puerta
- Mantiene segmentos solo si tienen > 0.1 units de longitud

---

### 2.5 Puertas (Doors)

Las puertas son elementos cruciales que conectan habitaciones:

```typescript
// DOOR_PRESETS (door-system.ts:26-51)
export const DOOR_PRESETS = {
    small: {
        width: 4,      // Puertas de celdas
        height: 8,
        depth: 2
    },
    large: {
        width: 6,      // Puertas estándar
        height: 8,
        depth: 2
    },
    garage: {
        width: 10,     // Puertas de seguridad grandes
        height: 10,
        depth: 3
    }
}
```

#### Tabla de Medidas de Puertas

| Tipo | Ancho | Alto | Grosor | Uso | Color |
|------|-------|------|--------|-----|-------|
| Small | 4 | 8 | 2 | Puertas de celdas (2x4 cells) | 0x5a5a6a |
| Large | 6 | 8 | 2 | Puertas estándar (6x2 cells) | 0x4a5568 |
| Garage | 10 | 10 | 3 | Puertas de seguridad | 0x3a4558 |

#### Sistema de Animación de Puertas

Las puertas se animan verticalmente (door-system.ts:115-119):

```typescript
closedY = height / 2;           // Posición cerrada (visible)
openY = -height / 2 - 0.5;     // Posición abierta (bajo el suelo)
animationSpeed = 6 units/s;     // Velocidad de apertura/cierre
```

#### Proximidad Auto-Open

```typescript
openDistance = 5 units;    // Distancia a la que la puerta comienza a abrirse
closeDistance = 8 units;   // Distancia para iniciar cierre
closeDelay = 1.5 seconds;  // Retraso antes de cerrar automáticamente
```

**Nota de diseño**: Las puertas pequeñas (width=4) son justo el doble del radio de colisión del jugador (2.0), permitiendo paso cómodo.

---

### 2.6 Suelos (Floors)

Los suelos son PlaneGeometry rotados 90° en el eje X:

```typescript
// RoomFactory.createFloor() (room-factory.ts:463-484)
const geometry = new THREE.PlaneGeometry(template.width, template.depth);
mesh.rotation.x = -Math.PI / 2;  // Rotar para que sea horizontal
mesh.position.y = 0.01;           // Ligeramente sobre Y=0 para evitar z-fighting
```

#### Características de Suelos

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| Tipo | PlaneGeometry | Geometría plana de Three.js |
| Rotación | -90° (eje X) | Para orientación horizontal |
| Posición Y | 0.01 | Ligeramente sobre el origen |
| receiveShadow | true | Recibe sombras de objetos |

**Material**: `MeshStandardMaterial` con:
- `roughness: 0.8`
- `metalness: 0.1`
- Color basado en bioma de la habitación
- Textura repetida según tamaño (repeat.set(width/10, depth/10))

---

## 3. SISTEMA DE COORDENADAS Y PROYECCIÓN

### 3.1 Espacio de Coordenadas Three.js

Nuvaris usa el sistema estándar de Three.js con una peculiaridad 2.5D:

```
Ejes:
  X → Horizontal derecha
  Y ↑ Vertical arriba
  Z → Profundidad (hacia la cámara)

Convención 2.5D:
  Posición en plano XZ (horizontal)
  Y siempre = 0 para entidades en el suelo
  Altura visual se maneja con sprites escalados
```

### 3.2 Cámara Isométrica

El juego usa una cámara **PerspectiveCamera** configurada para simular vista isométrica:

```typescript
// Configuración típica en three-engine.service.ts
camera = new THREE.PerspectiveCamera(
    fov,     // Campo de visión
    aspect,  // Ratio de aspecto
    0.1,     // Near clipping
    1000     // Far clipping
);

// Posicionamiento para vista isométrica
camera.position.set(x, altura, z);
camera.lookAt(target);
```

**Nota**: Aunque se usa PerspectiveCamera, el ángulo y distancia crean un efecto similar a ortográfico para mantener la estética 2.5D.

### 3.3 Billboard Sprites (Always Facing Camera)

Todos los personajes y enemigos son **Sprites** que siempre miran a la cámara:

```typescript
// PlayerThree constructor (player.three.ts:137-145)
const material = new THREE.SpriteMaterial({
    transparent: true,
    color: 0xffffff,
    side: THREE.DoubleSide
});

this.sprite = new THREE.Sprite(material);
this.sprite.center.set(0.5, 0);      // Pivot en centro-abajo
this.sprite.scale.set(4.5, 4.5, 1);  // Escala visual
```

**Características clave de Sprites**:
1. **Siempre miran a la cámara** (billboard)
2. **Pivot en (0.5, 0)**: Centro horizontal, base vertical
3. **Escala independiente** del tamaño de colisión
4. **Material transparente** para fondos de sprites

---

## 4. SISTEMA DE ILUMINACIÓN Y FOG

### 4.1 Presets de Iluminación por Bioma

Cada tipo de habitación tiene un preset de iluminación específico:

```typescript
// LIGHTING_PRESETS (room-system.ts:476-504)
export const LIGHTING_PRESETS: Record<RoomBiome, LightingPreset> = {
    prison: {
        ambient: { color: 0x1a1a2e, intensity: 0.2 },
        fog: { color: 0x0a0a15, near: 25, far: 55 }
    },
    laboratory: {
        ambient: { color: 0x2a3a4a, intensity: 0.4 },
        fog: { color: 0x1a2a3a, near: 28, far: 60 }
    },
    medical: {
        ambient: { color: 0x3a3a4a, intensity: 0.5 },
        fog: { color: 0x2a2a3a, near: 25, far: 55 }
    },
    corridor: {
        ambient: { color: 0x1a1a1a, intensity: 0.15 },
        fog: { color: 0x0a0a0a, near: 15, far: 40 }
    },
    hub: {
        ambient: { color: 0x2a2a3a, intensity: 0.35 },
        fog: { color: 0x1a1a2a, near: 30, far: 70 }
    },
    garden: {
        ambient: { color: 0x1a2a1a, intensity: 0.3 },
        fog: { color: 0x0a1a0a, near: 35, far: 80 }
    }
};
```

### 4.2 Fog Dinámico Basado en Tamaño de Habitación

El sistema ajusta el fog automáticamente según el tamaño de la habitación actual:

```typescript
// Cálculo del fog dinámico (room-lighting.system.ts)
const roomDiagonal = Math.sqrt(width² + depth²) / 2;
const fogNear = Math.max(presetNear, roomDiagonal + 5);
```

**Lógica**: El fog comienza **fuera** de la habitación actual, garantizando que la room del jugador esté 100% visible.

---

## 5. COLISIONES Y FÍSICA

### 5.1 Sistema de Colisión Circular

El juego usa detección de colisión basada en **distancia 3D**:

```typescript
// Colisión jugador-enemigo
const dist = player.mesh.position.distanceTo(enemy.mesh.position);
const collision = dist < (PLAYER_RADIUS + ENEMY_RADIUS);
```

### 5.2 Radios de Colisión

| Entidad | Radio | Notas |
|---------|-------|-------|
| Jugador | 1.0 | Base para diseño |
| Enemigo | 0.8 | Más pequeño para navegación |
| Proyectil | 1.5 | Mayor para detección generosa |

**Principio de diseño**: Los radios son menores que el ancho visual para evitar colisiones "injustas" donde los sprites se tocan pero las hitboxes no.

### 5.3 Colisión con Muros (AABB)

El sistema de muros usa **Axis-Aligned Bounding Boxes**:

```typescript
// WallCollisionSystem (wall-collision.system.ts:182-189)
checkSphereCollision(position: Vector3, radius: number):
    { collides: boolean; pushVector: Vector3 }
{
    // Crea AABB del jugador
    const sphereBox = new THREE.Box3(
        new THREE.Vector3(x - radius, y - radius, z - radius),
        new THREE.Vector3(x + radius, y + radius, z + radius)
    );
    // Compara con AABB de muros...
}
```

**Optimización**: Spatial grid con celdas de 20 units para reducir verificaciones de O(n) a O(log n).

---

## 6. GENERACIÓN PROCEDURAL DE MAPAS

### 6.1 Generador Radial (RadialRoomGenerator)

El generador crea mapas con estructura predecible:

```
        NW ────── NORTH ────── NE
        │           │          │
      WEST ──────  HUB  ────── EAST
        │           │          │
        SW ────── SOUTH ────── SE
```

#### Configuración Default

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| hubSize | 30 | Tamaño del hub central |
| cardinalSize | 25 | Tamaño de rooms N/S/E/W |
| cornerSize | 20 | Tamaño de esquinas |
| spacing | 20 | Distancia entre rooms |
| corridorWidth | 5 | Ancho de pasillos |

### 6.2 Sistema BSP (Binary Space Partitioning)

El sistema BSP divide el espacio recursivamente para crear dungeons orgánicos:

1. Divide el espacio en 2 subregiones
2. Repite recursivamente hasta alcanzar tamaño mínimo
3. Crea habitaciones dentro de las hojas del árbol
4. Conecta habitaciones con corredores

**Resultado**: Dungeons con estructura orgánica pero navegables.

---

## 7. ASSETS VISUALES Y DECORACIÓN

### 7.1 Estructura de Assets

```
assets/
├── Enemys/
│   ├── spider/
│   │   └── walk/           # 30 frames de animación
│   └── worm/
├── environment/
│   ├── wall_1.png          # Texturas de muros
│   ├── wall_2.png
│   └── ...
├── lars/                    # Personaje mago (18 carpetas de animaciones)
├── proyecto-a/              # Personaje tanque (15 carpetas)
├── proyecto-y/              # Personaje DPS (23 carpetas)
└── room-templates/          # Templates JSON de habitaciones
```

### 7.2 Sistema de Animación de Sprites

Los sprites usan secuencias de frames PNG:

```typescript
// SpriteAnimator carga secuencias de 30 frames
// Ejemplo: spider-walk-001.png hasta spider-walk-030.png

animator.loadAnimation({
    name: 'walk',
    frames: 30,
    fps: 24,
    loop: true
});
```

**Estándar**: 30 frames por animación @ 24 FPS

---

## 8. PROPUESTAS Y RECOMENDACIONES

### 8.1 Medidas Estándar Propuestas para Coherencia

#### Escala de Referencia: El Jugador

Para mantener coherencia visual, todo debe escalarse relativamente al jugador:

| Elemento | Medida Propuesta | Justificación |
|----------|------------------|---------------|
| **Unidad base** | 1 unit = ~50cm en el "mundo real" | Radio jugador 1.0 = ~50cm |
| **Altura de personaje** | Sprite 4.5 units (2.25m visual) | Escala heroica |
| **Puerta pequeña** | 4 units (2m) | Jugador pasa cómodamente (radio 1.0 * 2 = 2.0) |
| **Puerta estándar** | 6 units (3m) | Permite paso de 2 jugadores |
| **Altura de techo** | 8 units (4m) | Proporción arquitectónica estándar |
| **Grosor de muro** | 2 units (1m) | Visible pero no excesivo |

#### Habitaciones Recomendadas

| Tipo | Ancho (units) | Profundidad (units) | Capacidad |
|------|---------------|---------------------|-----------|
| Celda pequeña | 10 x 10 | 10 | 1-2 personajes |
| Habitación mediana | 20 x 20 | 20 | Combate 3-5 enemigos |
| Sala grande | 30 x 30 | 30 | Boss fights, eventos |
| Corredor estrecho | 5 x Variable | Variable | Paso individual |
| Corredor ancho | 10 x Variable | Variable | Permite combate |

### 8.2 Decoración Visual 2.5D

#### Principios de Diseño 2.5D

1. **Sprites 2D en plano 3D**: Todos los objetos decorativos son sprites que miran a la cámara
2. **Depth sorting**: Objetos más cercanos al jugador se dibujan encima
3. **Escala consistente**: Usar la escala del jugador como referencia

#### Elementos Decorativos Propuestos

| Elemento | Sprite Size | Colisión | Posición Y | Uso |
|----------|-------------|----------|------------|-----|
| **Props pequeños** | 1.5 x 1.5 | No | 0 | Escombros, objetos en suelo |
| **Props medianos** | 3 x 3 | Sí (radius 0.5) | 0 | Cajas, muebles bajos |
| **Props grandes** | 6 x 6 | Sí (radius 1.5) | 0 | Mesas, estanterías |
| **Props verticales** | 2 x 8 | Sí (radius 0.5) | 0 | Columnas, postes |
| **Decoración de pared** | 4 x 4 | No | Altura/2 | Cuadros, carteles (posicionar en Y=4) |

#### Texturas de Muros y Suelos

**Recomendaciones**:

1. **Resolución**: 512x512 o 1024x1024 para texturas tileable
2. **Formato**: PNG con transparencia para muros con ventanas/barrotes
3. **Repetición**: Configurar UV mapping con repeat.set(width/10, height/10)
4. **Tipos de muros**:
   - Normal: Concreto/metal (0x3a3a3a)
   - Reforzado: Metal oscuro (0x4a4a5a)
   - Vidrio: Transparente (0x88ccff, opacity 0.3)
   - Barrotes: Metal oxidado (0x3a3a3a)

### 8.3 Integración con Personajes 2D

#### Escala de Sprites de Personajes

Los personajes actuales usan sprites con escala `4.5 x 4.5` (player.three.ts:145):

```typescript
this.sprite.scale.set(4.5, 4.5, 1);
```

**Propuesta de estandarización**:

| Categoría | Escala Base | Ratio Visual |
|-----------|-------------|--------------|
| Jugadores | 4.5 x 4.5 | 1.0x (referencia) |
| Enemigos pequeños (Worm) | 3.0 x 3.0 | 0.67x |
| Enemigos medianos (Spider) | 4.0 x 4.0 | 0.89x |
| Enemigos grandes | 6.0 x 6.0 | 1.33x |
| Boss | 9.0 x 9.0 | 2.0x |

**Nota**: La escala visual NO afecta la colisión. Los radios de colisión se mantienen independientes.

#### Atlas de Sprites Recomendado

Para optimización, agrupar sprites en atlases:

1. **atlas-players.png**: Todos los personajes jugables (4096x4096)
2. **atlas-enemies-small.png**: Worms y enemigos pequeños (2048x2048)
3. **atlas-enemies-medium.png**: Spiders y enemigos medianos (2048x2048)
4. **atlas-props.png**: Props y decoración (2048x2048)
5. **atlas-effects.png**: Efectos visuales, proyectiles (2048x2048)

**Ventaja**: Reduce draw calls de potencialmente 100+ a 5-6.

### 8.4 Iluminación Dinámica para Atmosfera

#### Luces por Habitación

Actualmente definido en `RoomTemplate.lights`:

```typescript
interface RoomLightSource {
    localPosition: { x, y, z };
    type: 'point' | 'spot';
    color: number;
    intensity: number;
    distance: number;
}
```

**Propuestas de luces estándar**:

| Tipo de Room | Luz Principal | Luces Secundarias | Atmósfera |
|--------------|---------------|-------------------|-----------|
| Prison | Point(0x8888ff, 0.3) centro-alto | 4x Point(0x4444aa, 0.1) esquinas | Oscuro, azulado |
| Laboratory | Point(0xaaaaff, 0.5) centro | 2x Spot hacia mesas | Clínico, blanco |
| Medical | Point(0xffffff, 0.6) centro | Varios Point alrededor | Brillante |
| Corridor | 2-3x Point a lo largo | Ninguna | Tenue, claustrofóbico |
| Hub | Point(0xffeecc, 0.4) centro | 4x Point(0xffccaa, 0.2) | Cálido, seguro |

#### Fog Dinámico por Situación

**Propuesta**: Ajustar fog según contexto de juego:

```typescript
// Normal gameplay
fogNear = roomDiagonal + 5;
fogFar = roomDiagonal + 30;

// Combate intenso (más visibilidad)
fogNear = roomDiagonal + 10;
fogFar = roomDiagonal + 50;

// Modo stealth/horror (menos visibilidad)
fogNear = roomDiagonal;
fogFar = roomDiagonal + 15;
```

### 8.5 Optimización para Rendimiento

#### Culling y LOD

**Recomendaciones**:

1. **Frustum Culling**: Ya implementado con layers de Three.js
2. **Distance-based LOD para animaciones**:
   ```typescript
   const distance = player.position.distanceTo(enemy.position);
   if (distance > 50) {
       enemy.animator.setFPS(12);  // 12 FPS lejos
   } else if (distance > 30) {
       enemy.animator.setFPS(18);  // 18 FPS medio
   } else {
       enemy.animator.setFPS(24);  // 24 FPS cerca
   }
   ```
3. **Object Pooling**: Reutilizar enemigos/proyectiles muertos
4. **Texture Atlases**: Ya mencionado arriba

#### Límites Recomendados

Para mantener 60 FPS en hardware medio:

| Métrica | Límite Recomendado | Actual |
|---------|-------------------|--------|
| Enemigos activos | < 50 | Variable |
| Proyectiles activos | < 100 | Variable |
| Habitaciones cargadas | < 9 (3x3 chunk) | Depende del mapa |
| Luces dinámicas | < 10 | Por habitación |
| Draw calls | < 50 | Depende de atlases |

### 8.6 Herramientas y Workflow

#### Creación de Sprites 2D para 3D

**Pipeline recomendado**:

1. **Modelado 3D** (Blender):
   - Modelar personaje/objeto en 3D
   - Configurar cámara ortográfica con ángulo isométrico (35.264° X, 45° Z)
   - Animar en 3D

2. **Renderizado**:
   - Renderizar cada frame desde ángulo fijo
   - Salida: PNG con fondo transparente
   - Resolución: 512x512 o 1024x1024 por frame

3. **Post-procesamiento** (Photoshop/GIMP):
   - Añadir detalles pintados a mano
   - Ajustar colores para match con paleta del juego
   - Exportar secuencia

4. **Empaquetado** (TexturePacker):
   - Crear atlas con todas las animaciones
   - Exportar JSON con coordenadas de frames
   - Comprimir PNG-8 para mobile

**Consistencia crítica**:
- **Mismo ángulo de cámara** para todos los assets
- **Misma escala de referencia** (1 unit Blender = 1 unit Three.js)
- **Misma iluminación** en todos los renders

#### Herramientas Alternativas

Para proyectos indie sin presupuesto:

1. **Sprites 2D directos**:
   - Aseprite para pixel art
   - Krita para painted style
   - Procreate (iPad) para hand-drawn

2. **Generación con IA** (2025):
   - Stable Diffusion + ControlNet para consistencia
   - Scenario AI con modelos custom-trained
   - Upscaling con Topaz Gigapixel o Real-ESRGAN

3. **Assets gratuitos**:
   - OpenGameArt.org
   - Itch.io asset packs
   - Kenney.nl (isometric packs)

---

## 9. MATEMÁTICA DE POSICIONAMIENTO

### 9.1 Cálculo de Posiciones de Muros

**IMPORTANTE**: Las posiciones son el **CENTRO** del mesh.

Para una habitación centrada en `(cx, cz)` con tamaño `(w, d)`:

```javascript
// Muro Norte (superior en el plano XZ)
position = {
    x: cx,
    y: wallHeight / 2,  // 4
    z: cz + d / 2
};
dimensions = {
    width: w,
    height: 8,
    depth: 2
};

// Muro Sur (inferior en el plano XZ)
position = {
    x: cx,
    y: wallHeight / 2,
    z: cz - d / 2
};
dimensions = {
    width: w,
    height: 8,
    depth: 2
};

// Muro Este (derecha en el plano XZ)
position = {
    x: cx + w / 2,
    y: wallHeight / 2,
    z: cz
};
dimensions = {
    width: 2,
    height: 8,
    depth: d
};

// Muro Oeste (izquierda en el plano XZ)
position = {
    x: cx - w / 2,
    y: wallHeight / 2,
    z: cz
};
dimensions = {
    width: 2,
    height: 8,
    depth: d
};
```

### 9.2 Cálculo de Bounds de Habitación

```typescript
// RoomFactory.calculateBounds() (room-factory.ts:555-599)
function calculateBounds(
    template: RoomTemplate,
    worldPosition: Vector3,
    rotation: number
): Box3 {
    const halfWidth = template.width / 2;
    const halfDepth = template.depth / 2;

    if (rotation === 0) {
        return new Box3(
            new Vector3(
                worldPosition.x - halfWidth,
                0,
                worldPosition.z - halfDepth
            ),
            new Vector3(
                worldPosition.x + halfWidth,
                template.height,
                worldPosition.z + halfDepth
            )
        );
    }

    // Para habitaciones rotadas, calcular esquinas rotadas
    // y crear Box3 que las contenga...
}
```

### 9.3 Detección de Habitación Actual

```typescript
// RoomDetectionSystem.detectRoom() (room-system.ts:297-327)
function detectRoom(playerPosition: Vector3): RoomInstance | null {
    // 1. Verificar habitación actual primero (más probable)
    if (currentRoom && currentRoom.bounds.containsPoint(playerPosition)) {
        return currentRoom;
    }

    // 2. Verificar habitaciones adyacentes
    for (adjacentRoom of adjacentRooms) {
        if (adjacentRoom.bounds.containsPoint(playerPosition)) {
            return adjacentRoom;
        }
    }

    // 3. Búsqueda completa (fallback)
    for (room of allRooms) {
        if (room.bounds.containsPoint(playerPosition)) {
            return room;
        }
    }

    return null;  // Jugador fuera de todas las habitaciones
}
```

**Optimización**: Complejidad O(1) en caso común, O(n) en caso peor.

---

## 10. CONCLUSIONES Y PRÓXIMOS PASOS

### 10.1 Estado Actual del Sistema

**Fortalezas**:
1. ✅ Sistema de coordenadas bien definido y consistente
2. ✅ Medidas estandarizadas para puertas, muros y habitaciones
3. ✅ Sistema de colisión robusto con optimización spatial
4. ✅ Generación procedural funcional (Radial y BSP)
5. ✅ Iluminación dinámica por bioma con fog adaptativo
6. ✅ Sistema de animación 2D eficiente

**Áreas de Mejora**:
1. ⚠️ Falta documentación de medidas estándar para props decorativos
2. ⚠️ Assets visuales podrían beneficiarse de atlases optimizados
3. ⚠️ Sistema de LOD para animaciones no implementado
4. ⚠️ Falta variedad en tipos de habitaciones

### 10.2 Recomendaciones Prioritarias

#### Alta Prioridad

1. **Estandarizar medidas de props decorativos** (esta semana)
   - Crear tabla de referencia
   - Implementar en templates de habitaciones

2. **Crear atlases de textura optimizados** (esta semana)
   - Agrupar sprites por categoría
   - Reducir draw calls a < 10

3. **Documentar pipeline de creación de assets** (esta semana)
   - Guía de Blender a Three.js
   - Plantillas de cámara y lighting

#### Media Prioridad

4. **Implementar sistema LOD para animaciones** (próximo sprint)
   - Reducir FPS de animaciones para entidades lejanas
   - Benchmark de rendimiento

5. **Expandir variedad de habitaciones** (próximo sprint)
   - Crear 5-10 templates adicionales por bioma
   - Integrar con generador procedural

6. **Optimizar fog dinámico** (próximo sprint)
   - Transiciones suaves entre habitaciones
   - Efectos especiales (niebla tóxica, vapor)

#### Baja Prioridad

7. **Sistema de decoración procedural** (futuro)
   - Colocar props automáticamente en habitaciones
   - Reglas basadas en tipo de habitación

8. **Efectos de post-procesamiento** (futuro)
   - Bloom para luces
   - Color grading por bioma

### 10.3 Métricas de Éxito

Para evaluar mejoras:

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| **Rendimiento** | 60 FPS en hardware medio | FPS counter in-game |
| **Coherencia visual** | 0 assets con escala incorrecta | Manual QA |
| **Draw calls** | < 20 por frame | Three.js stats |
| **Tiempo de carga** | < 3 segundos | Performance API |
| **Satisfacción visual** | Feedback positivo de playtesters | Encuestas |

### 10.4 Recursos Adicionales

**Documentación relacionada**:
- `/docs/CLAUDE.md` - Arquitectura general del proyecto
- `/docs/implementation/THREEJS_IMPLEMENTATION.md` - Guía de implementación Three.js
- `/docs/implementation/MAP_SYSTEM_DOCUMENTATION.md` - Sistema de mapas
- `/docs/implementation/frontend/PROCEDURAL_MAP_GENERATOR.md` - Generación procedural

**Archivos clave del código**:
- `/frontend/nuvaris-temp/src/app/game/engine/three-engine.service.ts` - Motor principal
- `/frontend/nuvaris-temp/src/app/game/world/room-system.ts` - Sistema de habitaciones
- `/frontend/nuvaris-temp/src/app/game/world/room-factory.ts` - Creación de habitaciones
- `/frontend/nuvaris-temp/src/app/game/world/door-system.ts` - Sistema de puertas
- `/frontend/nuvaris-temp/src/app/game/entities/player.three.ts` - Jugador
- `/frontend/nuvaris-temp/src/app/game/entities/enemy.three.ts` - Enemigos

---

## APÉNDICE A: Tabla de Referencia Rápida

### Medidas Estándar del Juego

| Elemento | Medida | Unidades | Notas |
|----------|--------|----------|-------|
| **Jugador - Radio colisión** | 1.0 | units | Base de diseño |
| **Jugador - Sprite** | 4.5 x 4.5 | units | Visual |
| **Enemigo - Radio colisión** | 0.8 | units | Más pequeño |
| **Enemigo - Sprite** | 3.0-4.0 | units | Variable |
| **Puerta pequeña** | 4 x 8 x 2 | units | W x H x D |
| **Puerta grande** | 6 x 8 x 2 | units | W x H x D |
| **Puerta garage** | 10 x 10 x 3 | units | W x H x D |
| **Muro - Altura** | 8 | units | Estándar |
| **Muro - Grosor** | 2 | units | Depth |
| **Habitación pequeña** | 20 x 20 x 8 | units | W x D x H |
| **Habitación mediana** | 25 x 25 x 8 | units | W x D x H |
| **Habitación grande** | 30 x 30 x 8 | units | W x D x H |
| **Corredor estrecho** | 5 x Variable x 8 | units | Paso único |
| **Corredor ancho** | 10 x Variable x 8 | units | Combate |
| **Mapa completo** | 200 x 200 | units | Bounds |

### Conversión Aproximada a "Mundo Real"

Asumiendo **1 unit ≈ 0.5 metros** (basado en radio jugador = 1.0):

| Elemento | Unidades Three.js | Metros Aprox. |
|----------|-------------------|---------------|
| Jugador (radio) | 1.0 | 0.5m |
| Puerta pequeña (ancho) | 4.0 | 2.0m |
| Puerta grande (ancho) | 6.0 | 3.0m |
| Altura de techo | 8.0 | 4.0m |
| Habitación pequeña | 20 x 20 | 10m x 10m |
| Habitación grande | 30 x 30 | 15m x 15m |

---

**Fin del Documento**

*Este análisis proporciona la base técnica necesaria para mantener coherencia visual y funcional en el desarrollo de Nuvaris. Todas las medidas son recomendaciones basadas en el código actual y pueden ajustarse según necesidades de gameplay.*
