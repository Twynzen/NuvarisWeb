# NUVARIS - Documentacion Completa del Proyecto

## Estado: EN DESARROLLO - Three.js 2.5D Roguelite

---

## 1. RESUMEN EJECUTIVO

**NUVARIS** es un juego roguelite estilo **Vampire Survivors** en desarrollo con **Three.js** como motor principal.

### ⚠️ ESTADO ACTUAL (Nov 28, 2025)
- **Motor Activo**: Three.js 2.5D (viewport ortográfico isométrico)
- **Rama de Desarrollo**: `feature/map-integration`
- **Nota**: La versión anterior con Phaser 3 está archivada. El desarrollo se enfoca ahora en Three.js.

### Tecnologías Principales
- **Frontend**: Angular 17+ (Standalone Components)
- **Motor Principal**: Three.js (r150+) - 2.5D isométrico
- **Framework Web**: Angular CLI / Webpack
- **Lenguaje**: TypeScript 5.x
- **Build Tool**: Angular CLI

### Features Implementados
✅ Sistema de portal para spawn de enemigos
✅ AI de enemigos (3 estados: Chase/Patrol/Return)
✅ Sistema de colisiones circular (player + enemigos + proyectiles)
✅ Dev Console unificada (Ctrl+K)
✅ Invisibilidad para testing (enemigos no detectan jugador)
✅ Animaciones de sprites (30 frames por animación)
✅ Efecto de muerte con glass break + zoom
✅ Sistemas de daño + inmunidad + multiplicador
✅ **Sistema de habilidades Three.js** (Arcadio, Lars, Yurany)
✅ **Arcadio: Hoz curva** (proyectil en arco de 90°)
✅ **Números de daño flotantes** (blancos sobre enemigos)
✅ **Lifesteal de Arcadio** (15% + números verdes de curación)
✅ **Map Editor completo** (crear/editar mapas del juego)

---

## 2. ESTRUCTURA DEL PROYECTO

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
│   │   ├── three-engine.service.ts
│   │   └── sprite-animator.ts
│   ├── entities/            # Entidades del juego
│   │   ├── player.entity.ts
│   │   ├── player.three.ts
│   │   ├── enemy.entity.ts
│   │   ├── enemy.three.ts
│   │   ├── boss.entity.ts
│   │   ├── projectile.entity.ts
│   │   ├── projectile.three.ts
│   │   ├── weapon.entity.ts
│   │   ├── xp-gem.entity.ts
│   │   ├── xp-orb.three.ts
│   │   └── weapons/
│   │       └── punch.weapon.ts
│   ├── scenes/              # Escenas Phaser
│   │   ├── preload.scene.ts
│   │   ├── menu.scene.ts
│   │   ├── character-selection.scene.ts
│   │   ├── game.scene.ts
│   │   └── level-up.scene.ts
│   ├── systems/             # Sistemas del juego
│   │   ├── enemy-spawner.system.ts
│   │   ├── xp-manager.system.ts
│   │   ├── particle-manager.system.ts
│   │   ├── audio-manager.system.ts
│   │   └── lab-generator.system.ts
│   ├── ui/                  # Componentes UI Angular
│   │   ├── level-up/
│   │   └── pause-menu/
│   └── world/               # Generacion de mundo
│       ├── map-generator.ts
│       └── portal-system.ts
├── map-editor/              # Editor de mapas
│   └── components/
│       └── editor-viewport/
│           ├── editor-viewport.component.ts   # Logica Three.js
│           ├── editor-viewport.component.html # UI layout
│           └── editor-viewport.component.scss # Estilos
└── assets/                  # Assets del juego
    ├── arcadio/
    ├── lars/
    ├── proyecto-y/
    ├── Enemys/
    └── environment/
```

---

## 3. PERSONAJES JUGABLES

### 3.1 ARCADIO (Titan)
**Archivo**: `abilities/arcadio.ability.ts`, `abilities/skills/arcadio.skills.ts`

| Stat | Valor Base |
|------|------------|
| Vida | 100 |
| Velocidad | 200 |
| Arma | PunchWeapon (melee) |

**Habilidad Pasiva**: `Rage` - Cuanto menos vida, mas dano (+50% dano al 25% HP)

**Skills Desbloqueables**:
| Skill | Rareza | Efecto |
|-------|--------|--------|
| Ground Slam | Basica | AOE 150 radio, cooldown 5s |
| Iron Skin | Basica | +30 armadura, -10% velocidad |
| Battle Cry | Epica | +25% dano equipo 10s |
| Meteor Strike | Legendaria | 200 dano AOE desde el cielo |

**Animaciones** (30 frames c/u):
- `arcadio-idle` - Idle animado
- `arcadio-walk-right/down/up` - Caminar 4 direcciones
- `arcadio-shoot-right/down/up` - Disparar 3 direcciones
- `arcadio-projectile` - Proyectil animado
- `arcadio-dead` - Animacion de muerte

---

### 3.2 LARS (Hechicero Oscuro)
**Archivo**: `abilities/lars.ability.ts`, `abilities/skills/lars.skills.ts`

| Stat | Valor Base |
|------|------------|
| Vida | 80 |
| Velocidad | 220 |
| Arma | MagicMissileWeapon |

**Habilidad Pasiva**: `Dark Pact` - 10% lifesteal en todo el dano

**Skills Desbloqueables**:
| Skill | Rareza | Efecto |
|-------|--------|--------|
| Shadow Bolt | Basica | Proyectil +25% dano |
| Soul Harvest | Basica | +5 HP por kill |
| Chain Lightning | Epica | Salta 3 enemigos, 80% dano |
| Mind Control | Legendaria | Convierte enemigo en aliado 30s |

**Mecanica Mind Control** (enemy.entity.ts:229-260):
- Enemigo se vuelve azul (tint 0x0000ff)
- Ataca a otros enemigos
- Puede explodir causando AOE
- Dura hasta muerte o timer

---

### 3.3 YURANY (Proyecto Y)
**Archivo**: `abilities/yurany.ability.ts`, `abilities/skills/yurany.skills.ts`

| Stat | Valor Base |
|------|------------|
| Vida | 70 |
| Velocidad | 250 (mas rapida) |
| Arma | FireballWeapon |

**Habilidad Pasiva**: `Phase` - 20% chance de esquivar dano

**Skills Desbloqueables**:
| Skill | Rareza | Efecto |
|-------|--------|--------|
| Blink | Basica | Teleport 200 unidades, cooldown 3s |
| Phantom Clones | Epica | 2 clones por 5s, 30% dano |
| Time Stop | Legendaria | Congela enemigos 3s |

---

## 4. SISTEMA DE COMBATE

### 4.1 Flujo de Combate Automatico
```
[GameScene.update]
    → [Player.update]
        → [Weapon.update]
            → findClosestEnemy()
            → fire() si cooldown OK y en rango
                → Projectile.fire() o PunchWeapon.fire()
```

### 4.2 Armas Disponibles (weapon.entity.ts)

| Arma | Dano | Cooldown | Rango | Velocidad | Notas |
|------|------|----------|-------|-----------|-------|
| FireballWeapon | 15 | 1000ms | 400 | 300 | Yurany default |
| MagicMissileWeapon | 8 | 500ms | 350 | 400 | Lars default |
| LightningBoltWeapon | 35 | 2000ms | 500 | 500 | Lento, potente |
| PunchWeapon | 40 | 800ms | 150 | - | Arcadio melee, knockback |
| OrbitalWeapon | 20 | 100ms | 100 | - | Orbitas alrededor del jugador |
| AoEWeapon | 40 | 3000ms | 250 | - | Explosion en area |
| BeamWeapon | 5/tick | 100ms | 400 | - | Laser continuo |

### 4.3 Sistema de Proyectiles (projectile.entity.ts)

**Propiedades**:
- `damage` - Dano base
- `speed` - Velocidad de viaje
- `pierce` - Enemigos que atraviesa
- `lifetime` - 3000ms maximo
- `particleColor` - Color segun personaje (rojo/azul/blanco)

**Flujo**:
```
fire() → setPosition → setVelocity → playAnimation
    → update() cada frame:
        - createParticleTrail (cada 50ms)
        - checkLifetime
    → onHit():
        - canHit(target)?
        - pierce-- o despawn()
```

### 4.4 Sistema de Dano

**Player.takeDamage()** (player.entity.ts:229-245):
```typescript
if (isInvulnerable) return false;
health -= amount;
visual.flash(); // Feedback visual
visual.squashAndStretch('y', 0.8, 100); // Juice
if (health <= 0) die();
```

**Enemy.takeDamage()** (enemy.entity.ts:157-176):
```typescript
health -= amount;
visual.flash(50);
visual.squashAndStretch('x', 1.2, 50);
updateHealthBar();
if (health <= 0) {
    emit('enemy-died', { x, y, xpValue });
    despawn();
}
```

---

## 5. SISTEMA DE ENEMIGOS

### 5.1 Tipos de Enemigos (enemy-spawner.system.ts)

| Tipo | HP | Velocidad | Dano | XP | Sprite |
|------|-----|-----------|------|-----|--------|
| Zombie/Worm | 20 | 50 | 10 | 10 | worm-move |
| Runner/Spider | 15 | 100 | 8 | 15 | spider-move |

### 5.2 Comportamiento de Enemigos (enemy.entity.ts:369-479)

**IA Normal**:
```
update() {
    if (isMindControlled) → atacar otros enemigos
    else {
        if (hay minion cerca < 300) → atacar minion
        else → perseguir jugador
    }

    if (type === 'spider' && cooldown OK) {
        if (distancia < 150 && > 50) → DASH ATTACK
    }
}
```

**Dash Attack** (solo Spiders):
- Cooldown: 2s
- Duracion: 300ms
- Velocidad: 3x normal
- Visual: Flash blanco

### 5.3 Sistema de Spawn (enemy-spawner.system.ts)

**Oleadas Progresivas**:
```typescript
Wave 1:   5 enemigos
Wave 2:  10 enemigos
Wave 3:  15 enemigos
Wave N:   5 * N enemigos

Cada 5 oleadas: BOSS SPAWN
```

**Spawn Logic**:
- Spawn fuera de pantalla (distance > 600 del player)
- Object Pooling para performance
- Max 100 enemigos activos

### 5.4 Boss (boss.entity.ts)

| Stat | Valor |
|------|-------|
| HP | 500 |
| Velocidad | 60 |
| Dano | 30 |
| XP | 500 |

**Ataques Especiales** (cada 5s):
1. **Dash Attack** - Carga rapida hacia el jugador
2. **Spawn Minions** - Invoca 5 enemigos alrededor
3. **Area Damage** - Circulo de dano 200 radio

**Muerte del Boss**:
- Explosion de 20 particulas
- Screen shake 500ms
- Emite evento `boss-defeated`

---

## 6. SISTEMA DE EXPERIENCIA Y NIVELES

### 6.1 XP Manager (xp-manager.system.ts)

**XP Gems** (xp-gem.entity.ts):
| Valor | Color | Radio |
|-------|-------|-------|
| < 20 | Verde (low) | 6px |
| 20-49 | Amarillo (medium) | 7px |
| 50+ | Azul (high) | 8px |

**Magnet System**:
- Radio base: 100px (player.pickupRadius)
- Aceleracion: 1.05x por frame
- Velocidad max: 600

### 6.2 Level Up System

**XP por Nivel**:
```typescript
xpToNextLevel = 100 * level
// Level 1: 100 XP
// Level 2: 200 XP
// Level 5: 500 XP
```

**Level Up Scene** (level-up.scene.ts):
1. Pausa el juego
2. Genera 3 opciones aleatorias
3. **Ruleta Animada** - Destaca opciones secuencialmente
4. Seleccion automatica tras ruleta
5. Aplica mejora y resume

**Probabilidad de Rareza**:
| Rareza | Probabilidad | Color |
|--------|--------------|-------|
| Basica | 60% | Gris #aaaaaa |
| Epica | 35% | Morado #9945ff |
| Legendaria | 5% | Naranja #ffa500 |

### 6.3 Upgrades Genericos Disponibles

**Basicas**:
- Health Boost: +20 Max HP
- Speed Boost: +15% velocidad
- Damage Boost: +10% dano
- Cooldown Reduction: -10% cooldowns
- Magnet: +50 pickup radius

**Epicas**:
- Piercing Shots: +1 pierce
- Critical Hits: 15% crit chance (2x dano)
- Life Steal: 5% del dano como heal
- Multi Shot: +1 proyectil

**Legendarias**:
- Time Warp: Enemigos -30% velocidad
- Shield: 5s invulnerabilidad
- Nova: Mata todos los enemigos en pantalla

---

## 7. MOTOR VISUAL Y ANIMACIONES

### 7.1 VisualComponent (visual.component.ts)

Componente unificado para todos los sprites/shapes:

**Modos**:
- `shape` - Formas geometricas (circle, rectangle)
- `sprite` - Texturas/Sprites

**Metodos de Juice**:
```typescript
flash(duration = 100)           // Flash blanco
squashAndStretch(axis, scale, duration)  // Deformacion elastica
setTint(color)                  // Colorear
setTintFill(color)              // Color solido
playAnimation(key, frameRate)   // Reproducir animacion
```

### 7.2 Sistema de Animaciones (game.config.ts)

Las animaciones se definen como arrays de frames:
```typescript
animations: {
    'arcadio-idle': ['arcadio-idle-1', 'arcadio-idle-2', ... 'arcadio-idle-30'],
    'arcadio-walk-right': [...30 frames],
    'worm-move': [...30 frames],
    // etc
}
```

**Reproduccion**:
```typescript
visual.playAnimation('arcadio-idle', 15); // 15 FPS
```

### 7.3 Preload Scene (preload.scene.ts)

Carga todos los assets del juego:

**Personajes** (30 frames por animacion):
- Arcadio: idle, walk (4 dir), shoot (3 dir), projectile, dead, concept
- Lars: idle, walk (4 dir), shoot (3 dir), projectile, dead, concept
- Yurany: idle, walk (4 dir), shoot (3 dir), projectile, dead, concept

**Enemigos**:
- Intestine Worm: 30 frames walk
- Spider: 30 frames walk
- Spider Boss: faces, walk, hit

**Generados Proceduralmente**:
- `iso-floor` - Tile isometrico 64x32
- `iso-wall` - Cubo isometrico 64x96

---

## 8. SISTEMAS AUXILIARES

### 8.1 Particle Manager (particle-manager.system.ts)

**Efectos Disponibles**:
- `createHitEffect(x, y, color)` - Impacto de proyectil
- `createDeathEffect(x, y)` - Muerte de enemigo
- `createXPCollectEffect(x, y)` - Recoleccion XP
- `createProjectileTrail(x, y, characterId)` - Estela de proyectil
- `createLevelUpEffect(x, y)` - Subida de nivel
- `createDamageText(x, y, damage, isCrit)` - Numeros de dano

### 8.2 Audio Manager (audio-manager.system.ts)

**Canales**:
- BGM (Background Music) - Loop continuo
- SFX (Sound Effects) - One-shots

**Metodos**:
```typescript
playBGM(key, volume)
stopBGM()
playSFX(key, volume)
setMasterVolume(0-1)
```

### 8.3 Lab Generator (lab-generator.system.ts)

Genera mazmorras isometricas procedurales:

**Algoritmo**:
1. Crear tilemap isometrico
2. Llenar con walls
3. Generar 20 habitaciones aleatorias (4-10 tiles)
4. Conectar habitaciones con corredores
5. Validar posiciones para spawn

### 8.4 Map Generator - Three.js (map-generator.ts)

**Biomas**:
| Bioma | Color | Mod Enemigos |
|-------|-------|--------------|
| VOID | 0x0a0a1a | 1.0x |
| CRYSTAL | 0x1a0a2e | 1.2x |
| INFERNO | 0x2a0a0a | 1.5x |
| TOXIC | 0x0a2a0a | 1.3x |
| STORM | 0x0a1a2a | 1.4x |

---

## 9. ESCENAS DEL JUEGO

### 9.1 Flujo de Escenas
```
PreloadScene → MenuScene → CharacterSelectionScene → GameScene
                                                        ↓
                                                   LevelUpScene (overlay)
                                                        ↓
                                                   PauseMenu (overlay)
```

### 9.2 MenuScene
- Titulo "NUVARIS" con efecto glitch
- Fondo negro cosmico con niebla
- Viñeta radial
- Input: SPACE o click para continuar

### 9.3 CharacterSelectionScene
- 3 tarjetas de personaje
- Muestra stats y habilidad pasiva
- Preview de animacion concept (30 frames)

### 9.4 GameScene
**Inicializacion**:
1. Crear mapa (LabGenerator o simple)
2. Spawn player con arma segun personaje
3. Iniciar EnemySpawner
4. Setup collision handlers
5. Setup camera follow

**Update Loop**:
```
update(time, delta) {
    handleInput();
    player.update();
    enemies.forEach(e => e.update());
    projectiles.forEach(p => p.update());
    xpGems.forEach(g => g.update());
    particleManager.update();
    updateUI();
}
```

---

## 10. CONFIGURACION DEL JUEGO (game.config.ts)

### 10.1 Balance
```typescript
balance: {
    player: {
        maxHealth: 100,
        speed: 200,
        invulnerabilityTime: 1000
    },
    enemies: {
        zombie: { health: 20, speed: 50, damage: 10, xp: 10 },
        runner: { health: 15, speed: 100, damage: 8, xp: 15 },
        boss: { health: 500, speed: 60, damage: 30, xp: 500 }
    }
}
```

### 10.2 Colores
```typescript
colors: {
    player: { arcadio: 0xff4444, lars: 0x4444ff, yurany: 0x44ff44 },
    enemy: { zombie: 0x8b0000, runner: 0x006400, boss: 0xff00ff },
    projectile: { player: 0xffff00, enemy: 0xff0000 },
    xp: { low: 0x00ff00, medium: 0xffff00, high: 0x00ffff }
}
```

### 10.3 Depths (Z-Order)
```typescript
depths: {
    floor: -100,
    item: 50,
    enemy: 100,
    player: 200,
    projectile: 300,
    particles: 400,
    ui: 1000
}
```

---

## 11. VERSION THREE.JS (Experimental)

### 11.1 ThreeEngineService (three-engine.service.ts)

Motor alternativo usando Three.js para graficos 3D:

**Caracteristicas**:
- Camara ortografica top-down
- Sprites como PlaneGeometry con texturas
- SpriteAnimator para animaciones
- Sistema de iluminacion ambiental + direccional

### 11.2 Entidades Three.js
- `player.three.ts` - Player con sprites animados
- `enemy.three.ts` - Enemigos con movimiento
- `projectile.three.ts` - Proyectiles con trails
- `xp-orb.three.ts` - Orbes de XP

**Estado**: Motor principal activo - todas las features nuevas usan Three.js

---

## 12. MAP EDITOR (editor-viewport.component.ts)

### 12.1 Descripcion General
Editor visual para crear y modificar mapas del juego. Permite colocar estructuras, portales y puntos de spawn que luego se exportan a JSON para cargarlos en el juego.

**Ruta**: `/map-editor`
**Archivo**: `src/app/map-editor/components/editor-viewport/`

### 12.2 Interfaz de Usuario

```
+------------------------------------------------------------------+
|  [Archivo v] [Editar v] [Vista v]  |  [W] [E] [R]  |  [Snap]     |  <- Toolbar
+------------------------------------------------------------------+
| OBJETOS      |                                   | PROPIEDADES   |
| -----------  |                                   | -----------   |
| ESTRUCTURAS  |                                   | ID: wall_1    |
|   Wall       |        [VIEWPORT 3D]              | Tipo: WALL    |
| PORTALES     |        Three.js Canvas            | Posicion:     |
|   Spider     |        OrbitControls              |   X: 0.0      |
|   Worm       |        TransformControls          |   Z: 0.0      |
| SPAWN POINTS |                                   |               |
|   Player     |                                   | [Duplicar]    |
|   Enemy      |                                   | [Eliminar]    |
+------------------------------------------------------------------+
| Cursor: X: 10 | Z: 5  | Seleccionado: wall_1     | LMB/RMB/Scroll|
+------------------------------------------------------------------+
```

### 12.3 Catalogo de Objetos

| Categoria | Item | Icono | Tipo | Descripcion |
|-----------|------|-------|------|-------------|
| ESTRUCTURAS | Wall | 🧱 | wall | Muro colisionable |
| PORTALES | Portal Spider | 🕷️ | portal | Spawn de aranas |
| PORTALES | Portal Worm | 🪱 | portal | Spawn de gusanos |
| SPAWN POINTS | Player Spawn | 👤 | spawn | Punto inicial del jugador |
| SPAWN POINTS | Enemy Spawn Zone | 💀 | spawn | Zona de spawn enemigos |

### 12.4 Controles del Editor

**Mouse**:
- LMB (arrastrar): Pan de camara
- RMB (arrastrar): Rotar camara
- Scroll: Zoom in/out
- Click en objeto: Seleccionar

**Teclado**:
- W: Modo Translate (mover)
- E: Modo Rotate (rotar)
- R: Modo Scale (escalar)
- G: Toggle Grid
- Delete/Supr: Eliminar seleccionado
- Ctrl+D: Duplicar seleccionado
- Esc: Deseleccionar

### 12.5 Configuracion de Portales

Cada portal tiene parametros configurables:

| Parametro | Rango | Default | Descripcion |
|-----------|-------|---------|-------------|
| homeRange | 5-50 | 15 | Radio donde enemigos patrullan |
| detectionRange | 10-100 | 30 | Radio de deteccion del jugador |
| maxEnemies | 1-50 | 10 | Maximo enemigos simultaneos |
| spawnRate | 0.5-10 | 2 | Segundos entre spawns |

### 12.6 Formato JSON de Mapas

```typescript
interface MapData {
  name: string;           // Nombre del mapa
  version: string;        // Version del formato
  gridSize: number;       // Tamano de celda del grid
  objects: MapObject[];   // Array de objetos
}

interface MapObject {
  id: string;             // ID unico (ej: "wall_1", "portal_spider_0")
  type: 'wall' | 'portal' | 'spawn';
  subtype?: string;       // 'normal', 'spider', 'worm', 'player', 'enemy'
  position: { x: number, z: number };
  rotation?: number;      // Rotacion en Y (grados)
  scale?: { x: number, z: number };
  config?: PortalConfig;  // Solo para portales
}
```

### 12.7 Funciones del Menu

**Archivo**:
- Nuevo Mapa: Limpia escena, carga mapa base
- Cargar Mapa (JSON): Importa archivo .json
- Guardar Mapa: Exporta a archivo .json
- Cargar Plantilla Base: Carga mapa con muros perimetrales

**Editar**:
- Duplicar (Ctrl+D): Copia objeto seleccionado
- Eliminar (Delete): Borra objeto seleccionado
- Deseleccionar (Esc): Quita seleccion

**Vista**:
- Vista Superior/Frontal/Lateral/Isometrica
- Toggle Grid
- Toggle Rangos (visualiza homeRange/detectionRange)

### 12.8 Mapa Base por Defecto

Al iniciar o crear nuevo mapa:
- 4 muros perimetrales (100x100 unidades)
- 4 portales en las esquinas:
  - NE: Spider (x:40, z:40)
  - NW: Worm (x:-40, z:40)
  - SE: Worm (x:40, z:-40)
  - SW: Spider (x:-40, z:-40)
- 1 spawn de jugador en el centro (0, 0)

---

## 13. PROBLEMAS CONOCIDOS Y TODO

### 13.1 Bugs Conocidos
- [ ] Upgrade system en Three.js no aplica efectos
- [ ] Algunas animaciones faltan frames
- [ ] Mind Control timer puede no limpiarse correctamente

### 13.2 Features Pendientes
- [ ] Sistema de audio completo
- [ ] Mas tipos de enemigos
- [ ] Sistema de guardado
- [ ] Leaderboard
- [ ] Mas armas desbloqueables
- [ ] Modo endless vs modo historia
- [ ] Integrar mapas del editor con el juego

### 13.3 Optimizaciones Pendientes
- [ ] Texture atlases para reducir draw calls
- [ ] Spatial hashing para colisiones
- [ ] Web Workers para IA enemigos

---

## 14. COMO EJECUTAR

```bash
cd frontend/nuvaris-temp
npm install
npm run start
# Abrir http://localhost:4200
# Map Editor: http://localhost:4200/map-editor
```

### Controles del Juego
- **WASD/Flechas**: Movimiento
- **ESC**: Pausa
- **Click**: Seleccionar en menus
- **SPACE**: Confirmar/Continuar

### Controles del Map Editor
- **W/E/R**: Translate/Rotate/Scale
- **G**: Toggle Grid
- **Delete**: Eliminar objeto
- **Ctrl+D**: Duplicar objeto
- **LMB**: Pan camara
- **RMB**: Rotar camara
- **Scroll**: Zoom

---

## 15. CREDITOS

- **Engine**: Three.js (principal) / Phaser 3 (legacy)
- **Framework**: Angular 17
- **Assets**: Custom sprites (30 frames por animacion)
- **Inspiracion**: Vampire Survivors, Brotato

---

*Documentacion actualizada: 2025-11-28*
*Rama: feature/map-integration*
*Base: entorno-limpio*
