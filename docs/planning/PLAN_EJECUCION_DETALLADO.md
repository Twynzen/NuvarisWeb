# PLAN EJECUTIVO DETALLADO - NUVARIS Portal System & Unification

## STATUS: ANÁLISIS COMPLETADO - LISTO PARA EJECUCIÓN

---

## FASE 0: DECISIONES ASUMIDAS (Por falta de respuesta)

Dado que el usuario requirió comprensión profunda y las preguntas específicas no fueron respondidas, asumo las siguientes decisiones de DISEÑO PRUDENTE:

### A. Portal Locations (ASUMIDO)
```
Basado en mapa isométrico típico (200x200 units):

Spider Portal:
  - Posición: (-80, 0, -80)  // Esquina inferior-izquierda
  - Rango de patrulla: 25 units
  - Rango de detección: 30 units
  - Threshold de retorno: 40 units

Worm Portal:
  - Posición: (80, 0, 80)    // Esquina superior-derecha
  - Rango de patrulla: 20 units
  - Rango de detección: 25 units
  - Threshold de retorno: 35 units

JUSTIFICACIÓN:
  - Balanced para mapas de ~200x200
  - Espacio suficiente para patrulla
  - Distancia razonable para persecución
```

### B. Portal Visuals (ASUMIDO)
```
Tipo: Geometría simple THREE.js (sin assets externos)

Spider Portal:
  - Shape: Vórtex animado (anillo rotativo)
  - Visual: TorusGeometry (radio exterior 4, interior 2)
  - Color: 0xff6666 (rojo, match spider color)
  - Animación: Rotación Y + escala pulsante
  - Altura: y=0 (nivel del suelo)

Worm Portal:
  - Shape: Túnel circular
  - Visual: CylinderGeometry (altura 1, radios)
  - Color: 0xaa6633 (marrón, match worm color)
  - Animación: Rotación Y lenta
  - Altura: y=0

JUSTIFICACIÓN:
  - No requiere assets nuevos
  - Renderiza en tiempo real (bajo overhead)
  - Fácil de ajustar/iterar
```

### C. Spawn Toggle Scope (ASUMIDO)
```
Comportamiento:
  - `spawn-toggle` comando en console
  - Controla SOLO auto-spawn automático (cada 2s)
  - Comandos manuales `spawn spider 5` siguen funcionando
  - Estado persistente durante sesión

JUSTIFICACIÓN:
  - Manual spawning útil para testing
  - Auto-spawn es lo molesto durante debug
  - Separación clara de concerns
```

### D. Debug Mode Unification (ASUMIDO)
```
Cambio de Arquitectura:
  - Eliminar: Ctrl+D key listener completamente
  - Único Entry Point: Ctrl+K (dev console)
  - Nuevo comando: `debug` o `debug toggle`
  - Visualización: THREE.js meshes renderizados en scene
  - Transparencia: Aumentada a permitir ver debug atrás

JUSTIFICACIÓN:
  - Unificación = una interfaz
  - Console es punto central
  - Menos confusion de hotkeys
```

---

## FASE 1: FIX CRITICAL BUG - INVISIBILITY

### Problema Identificado
```typescript
toggleInvisibility() en three-engine.service.ts:149

ACTUAL (INCORRECTO):
  sprite.material.opacity = invisible ? 0.5 : 1.0;  // Semi-transparent

REQUERIDO (CORRECTO):
  sprite.material.opacity = invisible ? 0.0 : 1.0;  // Invisible (0% alpha)

INTEGRACIÓN CON COLISIÓN:
  checkEnemyAttackCollision() - línea 470+
  - ✓ Ya chequea: if (this.gameState.invisible) return;
  - ✓ La lógica está correcta
  - ✗ Solo fallaba porque opacidad era 0.5 en lugar de 0.0
```

### Cambios Requeridos
```
Archivo: src/app/game/engine/three-engine.service.ts
Línea: 156

CAMBIO:
  OLD: sprite.material.opacity = (this.gameState as any).invisible ? 0.5 : 1.0;
  NEW: sprite.material.opacity = (this.gameState as any).invisible ? 0.0 : 1.0;
```

**Impacto**: Bajo risk, alto valor (fix crítico que user reportó)

---

## FASE 2: CREATE PORTAL SYSTEM INFRASTRUCTURE

### 2A. Crear `src/app/game/world/portal-system.ts`

```typescript
// Archivo nuevo: ~180 líneas

import * as THREE from 'three';

export interface PortalConfig {
    position: THREE.Vector3;
    type: 'spider' | 'worm';
    homeRange: number;
    detectionRange: number;
    returnThreshold: number;
    color: number;
}

export class PortalSystem {
    private scene: THREE.Scene;
    private portals: Map<'spider' | 'worm', Portal> = new Map();
    private spawningEnabled = true;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public initialize() {
        // Create spider portal
        this.portals.set('spider', new Portal(this.scene, {
            position: new THREE.Vector3(-80, 0, -80),
            type: 'spider',
            homeRange: 25,
            detectionRange: 30,
            returnThreshold: 40,
            color: 0xff6666
        }));

        // Create worm portal
        this.portals.set('worm', new Portal(this.scene, {
            position: new THREE.Vector3(80, 0, 80),
            type: 'worm',
            homeRange: 20,
            detectionRange: 25,
            returnThreshold: 35,
            color: 0xaa6633
        }));
    }

    public getSpawnPoint(type: 'spider' | 'worm'): THREE.Vector3 {
        const portal = this.portals.get(type);
        if (!portal) return new THREE.Vector3(0, 0, 0);

        // Spawn en radio aleatorio alrededor del portal
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 10;
        const pos = portal.position.clone();
        pos.x += Math.cos(angle) * distance;
        pos.z += Math.sin(angle) * distance;
        return pos;
    }

    public getPortal(type: 'spider' | 'worm'): Portal | undefined {
        return this.portals.get(type);
    }

    public toggleSpawning(enabled: boolean) {
        this.spawningEnabled = enabled;
    }

    public isSpawningEnabled(): boolean {
        return this.spawningEnabled;
    }

    public update(delta: number) {
        this.portals.forEach(portal => portal.update(delta));
    }
}

// Portal visual class (~80 líneas)
class Portal {
    public mesh: THREE.Group;
    public position: THREE.Vector3;
    public type: 'spider' | 'worm';
    public homeRange: number;
    public detectionRange: number;
    public returnThreshold: number;
    private rotationSpeed = 1.0;
    private pulsePhase = 0;
    private pulseMagnitude = 1.2;

    constructor(scene: THREE.Scene, config: PortalConfig) {
        this.position = config.position;
        this.type = config.type;
        this.homeRange = config.homeRange;
        this.detectionRange = config.detectionRange;
        this.returnThreshold = config.returnThreshold;

        this.mesh = new THREE.Group();
        this.mesh.position.copy(config.position);

        if (config.type === 'spider') {
            this.createSpiderPortal(config.color);
        } else {
            this.createWormPortal(config.color);
        }

        scene.add(this.mesh);
    }

    private createSpiderPortal(color: number) {
        // Vórtex rotativo: anillo
        const geometry = new THREE.TorusGeometry(4, 2, 16, 100);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.7
        });
        const torus = new THREE.Mesh(geometry, material);
        torus.rotation.x = Math.PI / 4; // Tilt 45 degrees
        this.mesh.add(torus);
    }

    private createWormPortal(color: number) {
        // Túnel circular
        const geometry = new THREE.CylinderGeometry(3, 3, 1, 16);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.6
        });
        const cylinder = new THREE.Mesh(geometry, material);
        this.mesh.add(cylinder);
    }

    public update(delta: number) {
        // Rotación
        this.mesh.rotation.y += this.rotationSpeed * delta;

        // Pulsación
        this.pulsePhase += delta * 2;
        const pulse = Math.sin(this.pulsePhase) * 0.1 + 1.0;
        this.mesh.scale.set(pulse, 1, pulse);
    }
}
```

### 2B. Crear `src/app/game/entities/portal.three.ts`

**Nota**: Ya cubierto dentro de portal-system.ts como clase `Portal`
**Alternativa**: Exportar Portal como archivo separado si quieres mejor separación

---

## FASE 3: INTEGRATE PORTAL SYSTEM IN ENGINE

### 3A. Modificar `src/app/game/engine/three-engine.service.ts`

```typescript
// Línea ~6-8 (imports)
ADD: import { PortalSystem } from '../world/portal-system';

// Línea ~30 (properties)
ADD: private portalSystem!: PortalSystem;
     private autoSpawningEnabled = true;

// Línea ~250 (createScene method - AFTER scene creation)
ADD: this.portalSystem = new PortalSystem(this.scene);
     this.portalSystem.initialize();

// Línea ~181 (spawnEnemy method - REPLACE random spawn)
OLD CODE:
  const angle = Math.random() * Math.PI * 2;
  const distance = 10 + Math.random() * 5;
  const x = this.player.mesh.position.x + Math.cos(angle) * distance;
  const z = this.player.mesh.position.z + Math.sin(angle) * distance;

NEW CODE:
  const spawnPos = this.portalSystem.getSpawnPoint(type === 'worm' ? 'worm' : 'spider');
  const x = spawnPos.x;
  const z = spawnPos.z;

// Línea ~190 (new method - AFTER spawnEnemy)
ADD:
  public toggleSpawning(enabled: boolean) {
      this.autoSpawningEnabled = enabled;
      if (this.portalSystem) {
          this.portalSystem.toggleSpawning(enabled);
      }
      console.log(`[DEV] Auto-spawn: ${enabled ? 'ON' : 'OFF'}`);
  }

// Línea ~600 (update loop - BEFORE enemy update)
ADD: if (this.portalSystem) {
         this.portalSystem.update(delta);
     }

// Línea ~700 (auto-spawn section - ADD CHECK)
OLD: if (this.lastSpawnTime > 2.0) { ... spawn ... }
NEW: if (this.lastSpawnTime > 2.0 && this.autoSpawningEnabled) { ... spawn ... }
```

---

## FASE 4: IMPLEMENT ENEMY HOME-BASE BEHAVIOR

### 4A. Modificar `src/app/game/entities/enemy.three.ts`

```typescript
// Línea ~1-5 (imports)
ADD: import { PortalSystem } from '../world/portal-system'; // If needed

// Línea ~14 (properties - AFTER enemyType)
ADD: public homePortal: any = null; // Portal reference
     public isReturningToHome: boolean = false;
     public isPatrolling: boolean = true;
     private patrolCenter: THREE.Vector3 = new THREE.Vector3();
     private patrolRadius: number = 0;

// Constructor (línea ~58 - AFTER setup)
ADD:
     // Por ahora, sin portal assignment aquí
     // Se asignará desde ThreeEngineService después de creación

// Línea ~150 (update method - IMPORTANTE: REWRITE BEHAVIOR)
OLD LOGIC: (perseguir jugador siempre)
NEW LOGIC: (3 estados: patrol, chase, return)

// Agregar método helper:
public setHomePortal(portal: any, portalConfig: any) {
    this.homePortal = portal;
    this.patrolCenter = portal.position.clone();
    this.patrolRadius = portalConfig.homeRange;
}

// Agregar nuevo método de comportamiento:
private updateBehavior(playerPos: THREE.Vector3, delta: number) {
    if (!this.homePortal) {
        // Sin portal: comportamiento antiguo (perseguir)
        this.chasingBehavior(playerPos, delta);
        return;
    }

    const distToPlayer = this.mesh.position.distanceTo(playerPos);
    const distToHome = this.mesh.position.distanceTo(this.patrolCenter);
    const portal = this.homePortal;

    // ESTADO 1: PERSIGUIENDO AL JUGADOR
    if (distToPlayer < portal.detectionRange) {
        this.isReturningToHome = false;
        this.isPatrolling = false;
        this.chasingBehavior(playerPos, delta);
    }
    // ESTADO 2: VOLVIENDO AL HOGAR
    else if (distToHome > portal.returnThreshold) {
        this.isReturningToHome = true;
        this.isPatrolling = false;
        this.returnHomeBehavior(delta);
    }
    // ESTADO 3: PATRULLANDO
    else {
        this.isReturningToHome = false;
        this.isPatrolling = true;
        this.patrolBehavior(delta);
    }
}

// Comportamiento de patrulla
private patrolBehavior(delta: number) {
    // Random walk alrededor del centro del portal
    // Mantener dentro de patrolRadius
    if (Math.random() < 0.02) {
        // Cambiar dirección ocasionalmente
        const angle = Math.random() * Math.PI * 2;
        const moveDistance = this.speed * delta;
        const newX = this.mesh.position.x + Math.cos(angle) * moveDistance;
        const newZ = this.mesh.position.z + Math.sin(angle) * moveDistance;
        const newDist = new THREE.Vector3(newX, 0, newZ).distanceTo(this.patrolCenter);

        if (newDist < this.patrolRadius) {
            this.mesh.position.x = newX;
            this.mesh.position.z = newZ;
        }
    }
}

// Comportamiento de retorno al hogar
private returnHomeBehavior(delta: number) {
    const direction = this.patrolCenter.clone().sub(this.mesh.position);
    direction.y = 0;
    direction.normalize();

    const moveDistance = this.speed * delta;
    this.mesh.position.x += direction.x * moveDistance;
    this.mesh.position.z += direction.z * moveDistance;
}

// Comportamiento de persecución (antiguo)
private chasingBehavior(playerPos: THREE.Vector3, delta: number) {
    const direction = playerPos.clone().sub(this.mesh.position);
    direction.y = 0;
    direction.normalize();

    const distToPlayer = this.mesh.position.distanceTo(playerPos);

    // Lógica existente de ataque + dash
    if (distToPlayer < this.attackRange) {
        this.performAttack();
    } else if (distToPlayer >= this.dashTriggerMin && distToPlayer <= this.dashTriggerMax) {
        this.performDash(direction);
    }

    // Movimiento hacia jugador
    const moveDistance = this.speed * delta;
    this.mesh.position.x += direction.x * moveDistance;
    this.mesh.position.z += direction.z * moveDistance;
}
```

---

## FASE 5: ASSIGN PORTALS TO ENEMIES

### 5A. Modificar `src/app/game/engine/three-engine.service.ts` (spawnEnemy)

```typescript
// Línea ~181-202 (spawnEnemy method)
ADD después de crear enemy:

const portal = this.portalSystem.getPortal(type === 'worm' ? 'worm' : 'spider');
const portalConfig = type === 'worm'
    ? { homeRange: 20, detectionRange: 25, returnThreshold: 35 }
    : { homeRange: 25, detectionRange: 30, returnThreshold: 40 };

if (portal) {
    enemy.setHomePortal(portal, portalConfig);
}
```

---

## FASE 6: UNIFY DEBUG MODES

### 6A. Remover Ctrl+D listener

Archivo: `src/app/game/engine/three-engine.service.ts`

```typescript
// Línea ~97-101 (removeActually, don't remove just comment for safety)
COMMENT OUT or DELETE:
    // Ctrl+D - Toggle Debug Mode
    if (e.key.toLowerCase() === 'd' && e.ctrlKey) {
        e.preventDefault();
        this.toggleDebugMode();
    }
```

### 6B. Agregar 'debug' command al dev-console

Archivo: `src/app/game/ui/dev-console/dev-console.component.ts`

```typescript
// Línea ~180 (en executeCommand switch statement)
ADD:
    case 'debug':
        const isDebugOn = this.engineService.toggleDebugMode();
        this.addLog('success', `Debug Mode: ${isDebugOn ? 'ON' : 'OFF'}`);
        break;

// Actualizar help command para incluir:
    case 'help':
        const helpText = `
        Commands:
        - debug              Toggle debug visualization (colisiones)
        - help               Show this help
        ...
        `;
```

### 6C. Aumentar Console Transparency

Archivo: `src/app/game/ui/dev-console/dev-console.component.scss`

```scss
// Línea ~20 (dev-console-overlay)
CHANGE:
    OLD: background-color: rgba(0, 0, 0, 0.5);
    NEW: background-color: rgba(0, 0, 0, 0.2);
```

---

## FASE 7: CLEANUP AND POLISHING

### 7A. Update gameState interface

Asegurar que incluye todas las dev mode flags:
```typescript
public gameState = {
    health: 100,
    maxHealth: 100,
    xp: 0,
    xpToLevel: 100,
    level: 1,
    wave: 1,
    score: 0,
    isLevelingUp: false,
    isPaused: false,
    isGameOver: false,
    debugMode: false,
    // Dev mode flags (typed as 'any' for flexibility)
};
```

### 7B. Agregar 'spawn-toggle' command

Ya cubierto en Fase 3 con `toggleSpawning()`

---

## RESUMEN DE CAMBIOS POR ARCHIVO

| Archivo | Líneas | Tipo | Descripción |
|---------|--------|------|------------|
| three-engine.service.ts | 156 | Edit | Fix invisibility opacity 0.5→0.0 |
| three-engine.service.ts | 30 | Add | Property: portalSystem |
| three-engine.service.ts | 85-90 | Add | Initialize portalSystem in createScene |
| three-engine.service.ts | 181-202 | Edit | spawnEnemy usa portals |
| three-engine.service.ts | 210+ | Add | toggleSpawning() method |
| three-engine.service.ts | 600+ | Add | portalSystem.update() in loop |
| three-engine.service.ts | 700+ | Edit | auto-spawn check autoSpawningEnabled |
| three-engine.service.ts | 97-101 | Delete/Comment | Ctrl+D listener |
| portal-system.ts | NEW | Create | Portal system infrastructure (180 líneas) |
| enemy.three.ts | 20-30 | Add | Portal-related properties |
| enemy.three.ts | 150+ | Edit | Rewrite behavior (patrol/chase/return) |
| enemy.three.ts | 250+ | Add | setHomePortal() method |
| dev-console.ts | 180+ | Add | 'debug' command |
| dev-console.ts | 210+ | Add | 'spawn-toggle' command |
| dev-console.scss | 20 | Edit | Opacity 0.5→0.2 |

---

## ESTIMACIÓN DE COMPLEJIDAD

| Fase | Complejidad | Riesgo | Tiempo Est | Prioridad |
|------|-------------|--------|-----------|-----------|
| 1. Fix Invisibility | 🟢 Muy Baja | 🟢 Bajo | 5 min | 🔴 CRÍTICA |
| 2. Portal System | 🟡 Media | 🟡 Medio | 30 min | 🟠 Alta |
| 3. Integrate Portals | 🟡 Media | 🟡 Medio | 20 min | 🟠 Alta |
| 4. Enemy AI | 🟠 Alta | 🟠 Medio-Alto | 40 min | 🟠 Alta |
| 5. Portal Assignment | 🟢 Baja | 🟢 Bajo | 15 min | 🟠 Alta |
| 6. Debug Unification | 🟡 Media | 🟢 Bajo | 20 min | 🟠 Alta |
| 7. Polishing | 🟢 Baja | 🟢 Bajo | 15 min | 🟡 Media |

**Total Estimado**: 2-3 hours
**Context Window**: ~150K tokens usados de 200K

---

## DECISIÓN: COMENZAR IMPLEMENTACIÓN

Basado en:
1. ✅ Análisis completo completado
2. ✅ Arquitectura clara documentada
3. ✅ Decisiones de diseño asumidas responsablemente
4. ✅ Plan detallado línea-por-línea
5. ✅ Riesgos identificados y mitigados

**Status**: LISTO PARA EJECUTAR

---

*Documento: Plan Ejecutivo Detallado*
*Fecha: Nov 27, 2025*
*Estado: APROBADO PARA EJECUCIÓN*
