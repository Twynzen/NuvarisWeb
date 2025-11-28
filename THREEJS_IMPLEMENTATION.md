# NUVARIS - Three.js Implementation Guide

**Última actualización**: Nov 27, 2025
**Motor**: Three.js 2.5D Isométrico
**Estado**: MVP en desarrollo

---

## 1. VISIÓN GENERAL

NUVARIS utiliza **Three.js** como motor principal para un juego roguelite 2.5D con perspectiva isométrica. No es un juego 3D puro, sino sprites 2D (billboards) posicionados en un espacio 3D.

### Características Técnicas
- **Cámara**: Perspectiva ortográfica (para efecto isométrico)
- **Sprites**: Billboard sprites (siempre miran a la cámara)
- **Colisiones**: Basadas en distancia 3D (Vector3.distanceTo)
- **Escala**: Coordenadas en unidades Three.js (sin unidades específicas)
- **Mapa**: 200x200 units, plano XZ con altura Y negligible

---

## 2. ARQUITECTURA PRINCIPAL

### 2.1 ThreeEngineService (`src/app/game/engine/three-engine.service.ts`)

**Responsabilidad**: Orquestar todo el gameplay en Three.js

#### Propiedades Clave
```typescript
private scene: THREE.Scene;
private camera: THREE.PerspectiveCamera;
private renderer: THREE.WebGLRenderer;
private player: PlayerThree;
private enemies: EnemyThree[];
private projectiles: ProjectileThree[];
private portalSystem: PortalSystem;
private debugVisualizer: DebugVisualizer;
```

#### Métodos Principales
- `createScene(canvas, characterId)` - Inicializar Three.js y componentes
- `render()` - Main game loop (requestAnimationFrame)
- `update()` - Lógica de gameplay por frame
- `checkEnemyAttackCollision()` - Detección de daño
- `spawnEnemy(type, count)` - Spawn desde portales
- `toggleSpawning(enabled)` - Control de auto-spawn

#### Game Loop
```
render() {
  delta = clock.getDelta() * timeScale

  if (playerDead) return renderAndExit

  player.update(delta, keys)
  autoShoot()
  checkEnemyAttackCollision()

  portalSystem.update(delta)

  if (autoSpawning && time > 2s) {
    spawnEnemy('spider'|'worm')
  }

  enemies.forEach(e => e.update(delta, player, mapBounds, time, isInvisible))

  projectiles.forEach(p => p.update(delta))
  projectiles.forEach(p => checkCollisionWithEnemies(p))

  xpOrbs.forEach(o => o.update(delta))
  damageNumbers.forEach(n => n.update(delta))

  camera.follow(player)
  renderer.render(scene, camera)
}
```

---

### 2.2 Entidades

#### PlayerThree (`src/app/game/entities/player.three.ts`)

**Propiedades**:
```typescript
mesh: THREE.Group              // Contenedor 3D
sprite: THREE.Sprite           // Visual del jugador
animator: SpriteAnimator       // Sistema de animaciones
position: Vector3              // (x, 0, z)
health: number
isDead: boolean
```

**Colisión**: Radio de 1.5 units
**Animaciones**: walk (4 direcciones), dead

**Métodos importantes**:
- `update(delta, keys)` - Procesar input WASD
- `takeDamage(amount)` - Recibir daño
- `die()` - Iniciar secuencia de muerte
- `fadeOut(duration)` - Desvanecimiento visual

#### EnemyThree (`src/app/game/entities/enemy.three.ts`)

**Tipos**: `'spider' | 'worm'`

**Stats por tipo**:
| Propiedad | Spider | Worm |
|-----------|--------|------|
| Speed | 5 units/s | 3 units/s |
| Health | 50 HP | 30 HP |
| Damage | 20 DMG | 15 DMG |
| Color | 0xffaaaa | 0xaa6633 |

**Sistema de Estados**:
1. **CON PORTAL** (updateWithHomePortal):
   - **CHASE**: Si player < detectionRange → perseguir
   - **RETURN**: Si distToHome > returnThreshold → volver al portal
   - **PATROL**: Si cerca del home → random walk

2. **SIN PORTAL** (updateLegacyBehavior):
   - Perseguir jugador indefinidamente

**Invisibilidad**:
- Si `isPlayerInvisible === true` → Nunca perseguir
- Enemigos con portal: Solo patrullan/retornan
- Enemigos sin portal: Permanecen ociosos

**Ataque Normal**:
- Range: < 5 units
- Cooldown: 1.0s
- Damage: setDamage() por tipo

**Dash Attack (solo Spiders)**:
- Telegraph: 0.25s con parpadeo blanco
- Dash: 0.5s a 4x velocidad
- Range: 5.5-12 units para activar
- Cooldown: 2.0s
- Damage flag separado para evitar double-hit

#### ProjectileThree (`src/app/game/entities/projectile.three.ts`)

**Propiedades**:
```typescript
damage: number
speed: number
lifetime: number (max 5000ms)
pierce: number (enemies atravesados)
```

**Colisión**: Radio 1.5 units contra enemigos

#### XPOrb (`src/app/game/entities/xp-orb.three.ts`)

- Gravedad hacia jugador
- Aceleración magnética
- Rango de atracción: 100 units

---

### 2.3 Portal System (`src/app/game/world/portal-system.ts`)

**Propósito**: Gestionar spawn de enemigos desde ubicaciones fijas

**4 Portales**:
1. Spider Portal 1: (-40, 0, -40) - 10 max spiders
2. Spider Portal 2: (40, 0, 40) - 10 max spiders
3. Worm Portal 1: (-40, 0, 40) - 10 max worms
4. Worm Portal 2: (40, 0, -40) - 10 max worms

**Visuales Creativos Three.js**:
- **Spider**: Vórtex con 3 anillos + esfera central + 10 conos
- **Worm**: Túnel con cilindros + espiral + 10 rocas

**Animaciones**:
- Rotación Y
- Pulsación (sin escala Z para mantener 2D)
- Flotación (movimiento Y suave)

**Control**:
- `toggleSpawning(enabled)` - Parar/reanudar auto-spawn

---

### 2.4 Dev Console (`src/app/game/ui/dev-console/`)

**Hotkey**: Ctrl+K (único entry point para debug)

**Comandos Disponibles**:
```
vel <speed>              - Game speed (1.0 = normal)
god                      - Toggle god mode
health <amount>          - Set player HP
invisible                - Toggle invisibility (enemies don't detect)
attack on/off            - Toggle auto-shoot
dmg-multiplier <val>     - Damage multiplier
spawn <spider|worm> [n]  - Manual spawn
spawn-toggle on/off      - Control auto-spawn every 2s
killall                  - Kill all enemies
enemies-list             - List active enemies
debug                    - Toggle collision visualization
fps                      - Show FPS stats
help                     - Show all commands
clear                    - Clear console
```

**Features**:
- Historial de comandos (Arrow Up/Down)
- Persistencia en localStorage
- Timestamps en cada log
- Tipos: info, success, warning, error, command
- Transparencia: 20% (rgba 0,0,0,0.2)

---

## 3. SISTEMA DE COLISIONES

### Detección de Distancia
```typescript
const dist = entity1.mesh.position.distanceTo(entity2.mesh.position);
const collision = dist < (RADIUS_1 + RADIUS_2);
```

### Radios de Colisión
- Player: 1.5 units
- Enemy: 1.5 units
- Projectile: 1.5 units
- **Colisión**: dist < 3.0 units

### Optimización Broad-Phase
```typescript
private maxCollisionCheckDistance = 35; // Skip enemigos > 35 units
```

### Inmunidad a Daño
```typescript
if (playerDamageImmunityTime > 0) return; // Skip daño
playerDamageImmunityTime = 0.1; // 100ms de inmunidad
```

---

## 4. SISTEMA DE ANIMACIONES

### SpriteAnimator (`src/app/game/engine/sprite-animator.ts`)

**Propósito**: Reproducir secuencias de frames desde atlas de sprites

```typescript
animator.loadAnimation({
  name: 'walk',
  texturePath: 'assets/Enemys/spider/walk',
  prefix: 'spider-walk-',
  suffix: '.png',
  frameCount: 30,
  frameRate: 15,
  loop: true
});

animator.play('walk');
animator.update(delta);
```

### Assets Requeridos
- **Player**: 30 frames por animación (idle, walk x4, shoot x3, dead)
- **Enemies**: 30 frames walk (intestine-worm-walk-1.png ... 30.png)

---

## 5. SISTEMA DE DAÑO

### Causas de Daño
1. **Ataque de Enemigo Normal**: 10-20 DMG cada 1s
2. **Dash de Enemigo**: 15-20 DMG (una sola vez por dash)
3. **Proyectil de Enemigo**: (no implementado aún)

### Modificadores de Daño
```typescript
// Dev Console
dmg-multiplier 2.0  // Dobla el daño que hace el jugador

// Aplicado en:
damage *= (gameState.damageMultiplier || 1.0);
```

### Flags Anti-Double-Hit
```typescript
// Ataque normal
hasDealtDamageThisAttack: boolean
markDamageDealt()

// Dash attack
hasDealtDamageThisDash: boolean
markDashDamageDealt()
```

---

## 6. INVISIBILIDAD (DEV MODE)

### Comando
```
invisible    // Toggle en console
```

### Efecto
- **Sin cambio visual** - Jugador sigue visible
- **Los enemigos NO lo detectan**
- **Los enemigos NO lo atacan**
- **Los enemigos con portal**: Patrullan/retornan a home
- **Los enemigos sin portal**: Permanecen ociosos

### Implementación
```typescript
// Engine
const isPlayerInvisible = (this.gameState as any).invisible;
this.enemies.forEach(e => e.update(..., isPlayerInvisible));

// Enemy AI
if (isPlayerInvisible) {
  // PATROL o RETURN, nunca CHASE
  return;
}
```

---

## 7. MAPEO DE TECLAS

### Gameplay
- **W/A/S/D** - Movimiento
- **P** - Pausa
- **ESC** - Pausa (en Angular)

### Dev Console
- **Ctrl+K** - Toggle console
- (Dentro de console) Arrow Up/Down - Historial
- (Dentro de console) Enter - Ejecutar comando

### Debug (Solo en Console)
- `debug` comando - Toggle visualización de colisiones

---

## 8. COORDENADAS Y ESPACIOS

### Espacio de Juego (Three.js)
```
X-axis: Ancho (izquierda/derecha)
Y-axis: Altura (arriba/abajo) - casi no se usa
Z-axis: Profundidad (arriba/abajo en pantalla)

Rango típico: -100 a +100 en X y Z
```

### Mapa Bounds
```typescript
const mapBounds = 98;
// Límites: -98 a +98 en ambos ejes

// Clamping
position.x = Math.max(-mapBounds, Math.min(mapBounds, position.x));
position.z = Math.max(-mapBounds, Math.min(mapBounds, position.z));
```

### Cámara
```typescript
camera = new PerspectiveCamera(60, width/height, 0.1, 1000);
camera.position.set(0, 25, 20);  // Slightly elevated, back view
camera.lookAt(0, 0, 0);           // Look at player

// En render loop
camera.position.x = player.x;
camera.position.z = player.z + 20;
```

---

## 9. ESTRUCTURA DE ARCHIVOS PARA THREE.JS

```
src/app/game/
├── engine/
│   ├── three-engine.service.ts      # Motor principal
│   ├── sprite-animator.ts           # Sistema de animaciones
│   └── debug-visualizer.ts          # Visualización debug
│
├── entities/
│   ├── player.three.ts              # Jugador
│   ├── enemy.three.ts               # Enemigos (con AI de portal)
│   ├── projectile.three.ts          # Proyectiles
│   ├── xp-orb.three.ts              # Orbes de XP
│   └── damage-number.ts             # Números de daño flotante
│
├── world/
│   ├── portal-system.ts             # Sistema de portales
│   └── map-generator.ts             # Generación de mapa
│
└── ui/
    └── dev-console/
        ├── dev-console.component.ts
        ├── dev-console.component.html
        └── dev-console.component.scss
```

---

## 10. BUILD Y COMPILACIÓN

### Build
```bash
cd frontend/nuvaris-temp
npm run build
```

**Status**: ✅ Compila exitosamente
**Warnings**: SCSS budget (no error)

### Development
```bash
npm start
```

Abre en `http://localhost:4200`

---

## 11. PRÓXIMOS PASOS PLANEADOS

### Phase 1: Polish Portal System
- [ ] Mejorar visuales de portales
- [ ] Agregar sonidos de spawn
- [ ] Partículas en portales

### Phase 2: Enemy Features
- [ ] Más tipos de enemigos
- [ ] Diferentes patrones de attack
- [ ] Boss fight mechanics

### Phase 3: Weapons & Upgrades
- [ ] Sistema de armas
- [ ] Árbol de upgrades
- [ ] Abilities especiales por personaje

### Phase 4: UI & Polish
- [ ] HUD completo (vida, score, waves)
- [ ] Menu de pausa mejorado
- [ ] Efectos visuales avanzados

---

## 12. TROUBLESHOOTING

### Enemigos no spawning desde portales
**Check**: `portalSystem.initialize()` se llamó en `createScene()`
**Check**: `portalSystem.update(delta)` se llama en render loop

### Invisibility no funciona
**Check**: `isPlayerInvisible` se pasa a `enemy.update()`
**Check**: `updateWithHomePortal()` chequea el flag

### Colisiones no detectan
**Check**: Radios son 1.5 units (collision = dist < 3.0)
**Check**: `maxCollisionCheckDistance = 35` (broad-phase)

### FPS bajo
**Check**: `maxCollisionCheckDistance` - aumentar si hay muchos enemigos
**Check**: `damageNumbers` - limitar cantidad simultánea
**Check**: Portal animations - reducir complejidad si es necesario

---

*Documento actualizado: Nov 27, 2025*
*Rama: claude/pulir-refactor-nuvaris-01GS9xqt6Q24sHsA2845vQU5*
