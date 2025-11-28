# COMPRENSIÓN PROFUNDA DEL PROYECTO NUVARIS - Three.js Version

## 1. CONTEXTO ACTUAL (Nov 27, 2025)

### Estado del Proyecto
- **Motor**: Three.js (versión experimental/secundaria)
- **Framework**: Angular 17+ (Standalone Components)
- **Rama Actual**: `claude/pulir-refactor-nuvaris-01GS9xqt6Q24sHsA2845vQU5`
- **Build Status**: Compilación exitosa (warning: SCSS budget exceeded 429 bytes)
- **Iteración Actual**: Evaluación y mejora de sistema de dev console

### Componentes Principales Implementados
1. ✅ Player (PlayerThree) - Sprite animado, movimiento WASD
2. ✅ Enemies (EnemyThree) - Spiders y Worms con AI
3. ✅ Combat System - Ataque automático a enemigos cercanos
4. ✅ Projectiles - Sistema de proyectiles con colisiones
5. ✅ XP Orbs - Recolección de experiencia
6. ✅ Death Animation - Secuencia de muerte con zoom y glass effect
7. ✅ Dev Console - Terminal integrada con 14+ comandos (Ctrl+K)
8. ⚠️ Invisibility Command - IMPLEMENTADO PERO NO FUNCIONA (bug crítico)
9. ⚠️ Debug Mode - Separado en Ctrl+D (necesita unificación con Ctrl+K)

---

## 2. ARQUITECTURA ACTUAL DE THREE.JS

### Sistema de Coordenadas
```
THREE.js 2.5D (Isometric-like):
  X-axis: Ancho (izquierda/derecha)
  Y-axis: Altura (solo cámara, no usado en colisiones)
  Z-axis: Profundidad (arriba/abajo en pantalla)

Cámara: THREE.PerspectiveCamera ortográfica top-down
Collisiones: Vector3.distanceTo() - distancia 3D entre posiciones
Sprites: THREE.Sprite con billboard effect (siempre miran a cámara)
```

### Entidades Principales

#### PlayerThree (player.three.ts)
```typescript
Propiedades:
  - mesh: THREE.Group (contenedor para sprite)
  - sprite: THREE.Sprite (visual)
  - animator: SpriteAnimator (30 frames por animación)
  - position: Vector3 (x, 0, z)
  - speed: number (200 units/sec aprox)

Collision:
  - COLLISION_RADIUS = 1.5
  - SPRITE_WIDTH = 2
  - SPRITE_HEIGHT = 2

Métodos:
  - update(keys, delta) - Movimiento WASD
  - takeDamage(amount) - Recibe daño
  - die() - Inicia secuencia de muerte
  - fadeOut(duration) - Desvanecimiento de sprite

Animaciones:
  - walk (omnidireccional)
  - dead (animación de muerte)
```

#### EnemyThree (enemy.three.ts)
```typescript
Propiedades:
  - mesh: THREE.Group
  - sprite: THREE.Sprite
  - animator: SpriteAnimator
  - position: Vector3 (x, 0, z)
  - type: 'spider' | 'worm'
  - health: number (50 spiders, 30 worms)
  - speed: number (5 spiders, 3 worms)

Estado de Combate:
  - isAttacking: boolean (cooldown 1.0s)
  - isDashing: boolean (cooldown 2.0s, duración 0.5s)
  - isTelegraphing: boolean (0.25s antes de dash)
  - hasDealtDamageThisAttack: boolean
  - hasDealtDamageThisDash: boolean

Rango de Ataque:
  - Normal attack: < 5 units
  - Dash trigger: 5.5-12 units (spiders only)
  - Detection: ~20 units (pursuit range)

Métodos:
  - update(playerPos, delta) - IA y movimiento
  - takeDamage(amount, scene) - Recibe daño
  - hasDealtDashDamage() / markDashDamageDealt()
  - playAnimation(name) / stopAnimation()

Animaciones:
  - walk (30 frames)
  - dead (20 frames, fade-out)
```

#### ProjectileThree (projectile.three.ts)
```typescript
Propiedades:
  - mesh: THREE.Group
  - position: Vector3
  - velocity: Vector3
  - damage: number (aprox 15-25)
  - speed: number (20-30)
  - lifetime: number (max 5s)
  - pierce: number (enemies penetrados)

Métodos:
  - update(delta) - Movimiento y colisión
  - isHittingEnemy(enemy) - Detección de colisión
  - despawn() - Remover del juego
```

#### XPOrb (xp-orb.three.ts)
```typescript
Propiedades:
  - mesh: THREE.Group
  - position: Vector3
  - value: number (puntos XP)
  - speed: number (variable según atracción)

Métodos:
  - update(playerPos, delta) - Gravedad hacia jugador
  - collect() - Recolectar y sumar XP
```

---

## 3. SISTEMA DE COLISIONES

### Detección de Distancia
```typescript
// En three-engine.service.ts - checkEnemyAttackCollision()
const distanceToEnemy = this.player.mesh.position.distanceTo(enemy.mesh.position);

// Condiciones para ataque
if (distanceToEnemy < (PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS)) {
    // Colisión detectada: suma de radios = 1.5 + 1.5 = 3.0 units
}
```

### Optimización: Broad-phase Culling
```typescript
// Línea 39 de three-engine.service.ts
private maxCollisionCheckDistance = 35; // Solo check enemigos dentro de 35 units

// En update loop (línea ~600):
if (distanceToEnemy > this.maxCollisionCheckDistance) {
    continue; // Skip este enemigo
}
```

### Inmunidad a Daño
```typescript
// Prevenir acumulación de daño en múltiples frames
private playerDamageImmunityTime = 0;
private playerDamageImmunityDuration = 0.1; // 100ms

// En collision check:
if (this.playerDamageImmunityTime > 0) {
    return; // Ignorar este daño
}
// Aplicar daño y resetear timer
this.playerDamageImmunityTime = this.playerDamageImmunityDuration;
```

---

## 4. SISTEMA DE ENEMIGOS

### Tipos de Enemigos

#### SPIDERS (Arañas)
```typescript
Stats:
  - Speed: 5 units/sec
  - Health: 50 HP
  - Damage: 20 per attack
  - Color: 0xffaaaa (rosado/rojo)
  - Attack Cooldown: 1.0s
  - Dash Cooldown: 2.0s

Comportamiento Actual:
  1. Persigue al jugador constantemente
  2. Ataca si está a < 5 units (normal attack)
  3. Dash si está a 5.5-12 units:
     - Telegraph (0.25s) - parpadea blanco
     - Dash (0.5s) - se mueve 4x velocidad
     - Cooldown (2.0s)

AI Actual:
  - Calcular dirección hacia jugador
  - Si en rango normal: atacar
  - Si en rango dash: telegraphiar y dashear
  - Mantener persecución constante
```

#### WORMS (Gusanos)
```typescript
Stats:
  - Speed: 3 units/sec (más lento)
  - Health: 30 HP (menos resistente)
  - Damage: 15 per attack
  - Color: 0xaa6633 (marrón)
  - Attack Cooldown: 1.0s
  - NO DASH (solo ataque normal)

Comportamiento Actual:
  - Mismo que spiders pero sin dash
  - Persiguen al jugador
  - Atacan si < 5 units
  - Sin movimiento especial

Asset Path:
  - Animación: assets/Enemys/intestine-worm/walk/
```

### Spawn Actual
```typescript
// En spawnEnemy(type, count) - línea 181
const angle = Math.random() * Math.PI * 2;
const distance = 10 + Math.random() * 5; // 10-15 units del jugador
const x = player.position.x + Math.cos(angle) * distance;
const z = player.position.z + Math.sin(angle) * distance;

const enemy = new EnemyThree(scene, x, z, type);
```

---

## 5. SISTEMA DE DEV CONSOLE (Actual)

### Ubicación del Código
- **Componente**: `src/app/game/ui/dev-console/dev-console.component.ts` (364 líneas)
- **Template**: `dev-console.component.html` (21 líneas)
- **Estilos**: `dev-console.component.scss` (108 líneas)
- **Integración**: three-game.component.ts (línea 8 import, línea 15 imports array)

### Hotkeys Actuales
```
Ctrl+K - Toggle dev console (abre/cierra overlay)
Ctrl+D - Toggle debug mode (visualización de colisiones)
```

### Comandos Disponibles
```
1. help                          - Mostrar esta ayuda
2. clear                         - Limpiar consola
3. vel <number>                  - Game speed (1.0 = normal, 0.5 = slow)
4. god                           - Toggle god mode (sin daño)
5. health <number>               - Set player health
6. attack <on|off>               - Toggle auto-shoot
7. dmg-multiplier <number>       - Damage multiplier (2.0 = doble daño)
8. invisible                     - Toggle invisibility (BROKEN)
9. killall                       - Matar todos los enemigos
10. spawn <spider|worm> <count> - Spawn enemigos (test)
11. spawn-wave                   - Spawn onda de enemigos
12. enemies-list                 - Listar enemigos activos
13. enemies <count>              - Spawn automático N veces
14. fps                          - Mostrar FPS actual
```

### Características del Console
- ✅ Historial de comandos (con Arrow Up/Down)
- ✅ Persistencia en localStorage (último comando)
- ✅ Timestamps en cada log
- ✅ Tipos de log: info, success, warning, error, command
- ✅ Scroll automático al final
- ⚠️ Opacidad fija en 0.5 (usuario quiere más transparente)
- ⚠️ Fondo oscuro (#1e1e1e) dificulta ver gameplay

---

## 6. PROBLEMAS IDENTIFICADOS

### CRÍTICO - BUG: Invisibility No Funciona
```typescript
// toggleInvisibility() - línea 149
public toggleInvisibility(): boolean {
    (this.gameState as any).invisible = !(this.gameState as any).invisible;

    // Solo cambia opacidad del sprite
    if (this.player && this.player.mesh) {
        const sprite = this.player.mesh.children[0] as THREE.Sprite;
        if (sprite) {
            sprite.material.opacity = (this.gameState as any).invisible ? 0.5 : 1.0;
        }
    }
    return (this.gameState as any).invisible;
}

PROBLEMA:
  ❌ Cambia opacidad a 0.5 (semi-transparente)
  ❌ NO hace invisible al jugador (debería ser 0.0)
  ❌ NO se integra con collision detection

COLISIÓN ACTUAL (línea 470):
  checkEnemyAttackCollision() {
      if ((this.gameState as any).godMode) return;
      if ((this.gameState as any).invisible) return; // ← CHECK EXISTE
      // ...aplicar daño
  }

INVESTIGACIÓN:
  - El check existe pero flag puede no estar sincronizado
  - O la opacidad debería ser 0.0, no 0.5
  - Necesita testing para verificar si check realmente funciona
```

### IMPORTANTE - Unificación de Debug Mode
```typescript
Actual Estado:
  - Ctrl+D abre debug visualization (colisiones, boundaries)
  - Ctrl+K abre dev console (comandos)
  - DebugVisualizer: Renderiza círculos de colisión sobre scene

REQUERIMIENTO:
  - Eliminar Ctrl+D completamente
  - Ctrl+K es el ÚNICO punto de entrada
  - Debug visualization debe ser visible mientras console está abierto
  - Dentro del console, comando: `debug toggle`

PROBLEMA ARQUITECTÓNICO:
  - debugVisualizer renderiza sobre THREE.Scene
  - Dev console es overlay HTML por encima del canvas
  - ¿Cómo mostrar THREE meshes DETRÁS de overlay HTML?

SOLUCIÓN PROPUESTA:
  - Mantener debugVisualizer renderizando en scene (3D)
  - Hacer console más transparente (20-30% opacidad)
  - Canvas render pasa atrás del console overlay
  - Usuario ve colisiones DETRÁS del console
```

### IMPORTANTE - Console Transparency
```typescript
Archivo: dev-console.component.scss (línea ~20)
.dev-console-overlay {
    background-color: rgba(0, 0, 0, 0.5); // 50% opacity - muy oscuro
}

REQUERIMIENTO:
  - Reducir a 20-30% opacidad
  - Permitir ver gameplay atrás
  - Mantener legibilidad del texto

RIESGO:
  - Texto puede volverse difícil de leer
  - Necesita testear con colores más claros
  - Posible usar bg-color para texto (legibilidad)
```

---

## 7. REQUERIMIENTOS NUEVOS: Portal System

### Especificación Alta Nivel
```
Portal/Nido System:
  - Dos portales fijos en el mapa
    1. Spider Portal (para spiders)
    2. Worm Portal (para worms)

  - Los enemigos spawned aquí (en lugar de random cercano)
  - Enemigos patrullan alrededor del portal
  - Si detectan jugador a distancia X → Lo persiguen
  - Si jugador se aleja beyond threshold → Vuelven al portal
  - Patrulla/comportamiento normal dentro de home range
```

### Preguntas Críticas Sin Respuesta
```
1. ¿Ubicación exacta de portales en mapa?
   - Coordenadas específicas (x, z)?
   - Opuesto uno del otro?
   - Arriba/abajo o izquierda/derecha?
   - Distancia entre ellos?

2. ¿Visual de portales?
   - Modelo 3D?
   - Sprite?
   - Geometría simple (círculo, vórtex)?
   - Animación (rotación, brillo)?
   - Color específico?

3. ¿Parámetros de comportamiento?
   Spider:
     - homeRange: ¿20, 30, 40 units?
     - detectionRange: ¿15, 20, 25 units?
     - returnThreshold: ¿Cuando distancia > 30 units?

   Worm:
     - circleRadius: ¿10, 15, 20 units?
     - detectionRange: ¿12, 15, 18 units?
     - returnThreshold: ¿Cuando distancia > 25 units?

4. ¿Auto-spawn usa portales?
   - Cada 2 segundos spawn en portal?
   - O spawn automático desaparece?
   - Comandos manuales spawn <type> 5 ¿usan portal?

5. ¿Spawn-toggle alcance?
   - ¿Detiene TODO spawn (manual + auto)?
   - O solo auto-spawn cada 2s?
   - ¿State visible en HUD o solo en console?
```

---

## 8. ARQUITECTURA PROPUESTA PARA PORTAL SYSTEM

### Nuevos Archivos a Crear
```
src/app/game/world/portal-system.ts (150-200 líneas)
  - Clase: PortalSystem
  - Gestiona dos portales fijos
  - Métodos:
    * initialize(spiderPos, wormPos)
    * getSpawnPoint(type) - Retorna portal position
    * update(delta) - Actualizar visualización
    * toggleSpawning(enabled) - On/Off auto-spawn

src/app/game/entities/portal.three.ts (100-150 líneas)
  - Clase: PortalThree
  - Representa un portal visual
  - Propiedades:
    * position: Vector3
    * type: 'spider' | 'worm'
    * homeRange: number
    * detectionRange: number
    * returnThreshold: number
  - Métodos:
    * update(delta)
    * animate() - Efecto visual
```

### Modificaciones a Archivos Existentes
```
src/app/game/engine/three-engine.service.ts:
  - Línea ~30: Agregar portalSystem property
  - Método: initPortals() - Crear portales
  - Método: toggleSpawning(enabled) - Control de spawn
  - spawnEnemy(): Usar portalSystem.getSpawnPoint() en lugar de random
  - update(): Llamar portalSystem.update()

src/app/game/entities/enemy.three.ts:
  - Nueva propiedad: homePortal: PortalThree
  - Nueva propiedad: isReturningToHome: boolean
  - Nueva propiedad: isPatrolling: boolean
  - update(): Agregar lógica de home-based AI
    * if (distanceToPlayer < detectionRange) → perseguir
    * else if (distanceToHome > returnThreshold) → volver al portal
    * else → patrullar alrededor del portal

src/app/game/ui/dev-console/dev-console.component.ts:
  - Línea ~180: Agregar comando 'spawn-toggle'
  - Línea ~200: Llamar engineService.toggleSpawning()
  - Agregar comando 'debug' para toggle visualización

src/app/game/ui/dev-console/dev-console.component.scss:
  - Línea ~20: Cambiar opacity de 0.5 a 0.2-0.3
```

---

## 9. FLUJO DE IMPLEMENTACIÓN PROPUESTO

### Fase 1: Análisis y Validación (AHORA)
- [x] Leer y entender codebase completo
- [x] Documentar arquitectura actual
- [x] Identificar bugs (invisibility)
- [ ] Responder 5 preguntas críticas sobre portales
- [ ] Validar comprensión con usuario

### Fase 2: Fix Critical Bug
- [ ] Investigar invisibility flag sync
- [ ] Aumentar opacidad a 0.0 (no 0.5)
- [ ] Verificar collision detection respeta flag
- [ ] Test en game

### Fase 3: Portal Infrastructure
- [ ] Crear portal-system.ts
- [ ] Crear portal.three.ts
- [ ] Inicializar en engine
- [ ] Integrar spawn con portales

### Fase 4: Enemy Home-Base AI
- [ ] Agregar homePortal a EnemyThree
- [ ] Implementar lógica patrol/detect/chase/return
- [ ] Parámetros configurables por tipo

### Fase 5: Debug Consolidation
- [ ] Remover Ctrl+D key listener
- [ ] Agregar 'debug' command en console
- [ ] Hacer console más transparente
- [ ] Agregar 'spawn-toggle' command

### Fase 6: Testing y Polish
- [ ] Test todas las funcionalidades
- [ ] Ajustar parámetros de balance
- [ ] Optimizar performance

---

## 10. DEPENDENCIAS Y RIESGOS

### Dependencias
```
portal-system.ts
  ↓
enemy.three.ts (agrega homePortal property)
  ↓
three-engine.service.ts (integra portal spawn)
  ↓
dev-console.component.ts (agrega spawn-toggle command)

Orden de implementación CRÍTICO:
  1. portal-system.ts (standalone)
  2. enemy.three.ts (uses portal-system)
  3. three-engine.service.ts (uses both)
  4. dev-console.component.ts (control)
```

### Riesgos
```
❌ RIESGO ALTO: No tener coordenadas exactas de portales
   → Implementación especulativa = refactor después

⚠️  RIESGO MEDIO: Parámetros de AI (ranges, cooldowns)
   → Necesita tuning y testing

⚠️  RIESGO BAJO: Integración con collision system
   → Arquitectura bien separada, bajo riesgo
```

---

## 11. CONTEXT WINDOW BUDGET

**Tokens disponibles**: ~130K (de 200K máximo)
**Complejidad**: ALTA (cambios arquitectónicos)
**Estimación**: Fase 1-2 caben en este context window
              Fases 3-5 necesitan nuevo context window

---

## 12. PRÓXIMOS PASOS

### INMEDIATO (Sin aguardar aprobación)
1. Compilar y verificar estado actual
2. Crear lista TODO consolidada
3. Validar entendimiento con detalles específicos

### REQUIERE RESPUESTA DEL USUARIO
1. **Ubicación exacta de portales** (coordenadas o descripción)
2. **Visual de portales** (tipo de asset)
3. **Parámetros de comportamiento** (ranges específicos)
4. **Decisiones de gameplay** (spawn toggle scope, etc)

### DESPUÉS DE APROBACIÓN
1. Implementar fixes críticos (invisibility)
2. Crear portal system
3. Integrar con enemies
4. Unificar debug modes
5. Transparencia console

---

*Documento generado: Nov 27, 2025*
*Estado: Análisis completado, aguardando decisiones del usuario*
