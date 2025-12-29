# ANÁLISIS DETALLADO DE REQUERIMIENTOS - SIGUIENTE ITERACIÓN

## 🔴 PROBLEMAS IDENTIFICADOS EN PRUEBAS:

1. **Invisibility NO FUNCIONA** ⚠️
   - Comando ejecuta pero no tiene efecto visual
   - Enemigos todavía atacan al jugador invisible
   - CAUSA: Probablemente falta integración en collision detection

## 📋 REQUERIMIENTOS NUEVOS (MUY COMPLEJOS):

### A. SISTEMA DE NIDOS/PORTALES (NEW)

#### A1. Crear objetos Three.js Portales:
- **Spider Portal**: Ubicación fija en mapa, arañas spawnean aquí
  - Visual: Portal/vórtice 3D
  - Color: Rojo/Naranja (spider color)

- **Worm Portal**: Ubicación fija diferente, gusanos spawnean aquí
  - Visual: Agujero/túnel en el suelo
  - Color: Marrón (worm color)

#### A2. Comportamiento Spider (más inteligente):
- Spawnea en Spider Portal
- Patrulla/explora alrededor del nido dentro de rango X
- **SI detecta jugador a distancia Y** → Lo persigue
- **Cuando jugador se aleja** → Vuelve al nido (Spider Portal)
- Repite patrulla

#### A3. Comportamiento Worm (más simple):
- Spawnea en Worm Portal
- Camina en círculos alrededor del nido (rango controlado)
- **SI detecta jugador a distancia Y** → Lo persigue
- **Cuando jugador se aleja** → Vuelve a caminar en círculos
- Siempre cerca de su portal

#### A4. Parámetros a definir:
```typescript
spiderPortal: {
  position: Vector3,
  homeRange: number, // Rango máximo de patrulla desde portal
  detectionRange: number, // A qué distancia detecta jugador
  returnThreshold: number // Distancia para volver al nido
}

wormPortal: {
  position: Vector3,
  circleRadius: number, // Rádio del círculo de patrulla
  detectionRange: number,
  returnThreshold: number
}
```

---

### B. CONTROL DE SPAWN EN DEV CONSOLE

#### B1. Nueva tecla/comando para DETENER spawn:
- Comando: `spawn-toggle` o `spawning false`
- Efecto: Detiene spawn automático de enemigos
- En consola: Mostrar "Spawning: ON/OFF"
- NOTA: ¿Esto afecta los comandos `spawn spider 5`? ¿O solo el spawn automático?

---

### C. UNIFICACIÓN DE DEBUG MODE

#### C1. Consolidar Ctrl+D y Ctrl+K:
- **Ctrl+D**: Eliminar (ya no existe)
- **Ctrl+K**: Abre DevConsole (como ahora)
- Dentro de DevConsole, agregar comando: `debug toggle`
- Efecto: Muestra/oculta visualization del debug mode (circulos de colisión, etc)

#### C2. Visualización Debug dentro de Console:
- El debug mode de Ctrl+D (colisiones, limites, etc) debe ser VISIBLE cuando ConsoleDebug está abierto
- ¿Cómo? ¿Canvas 3D encima de consola? ¿O consola semi-transparente (más transparente)?

---

### D. TRANSPARENCIA DE CONSOLA

#### D1. Hacer consola más transparente:
- Actualmente: `background-color: rgba(0, 0, 0, 0.5)` en overlay
- Cambiar a: `rgba(0, 0, 0, 0.2)` o menos
- NOTA: ¿Que tan transparente? ¿30%, 20%, 10%?
- Objetivo: Ver el juego atrás sin que desaparezca la consola

---

## 🧠 PREGUNTAS CRÍTICAS ANTES DE IMPLEMENTAR:

### Sobre Nidos/Portales:
1. **¿Ubicaciones fijas?** ¿Dónde pongo los portales exactamente en el mapa?
   - ¿Opuesto uno del otro?
   - ¿Arriba/abajo? ¿Izquierda/derecha?
   - ¿Coordenadas específicas?

2. **¿Visuales?** ¿Qué aspecto tienen?
   - ¿Modelos 3D? ¿Sprites? ¿Geometrías simples?
   - ¿Animación de portal? ¿Brillo? ¿Rotación?

3. **Rango de patrulla vs detección**:
   - Spider home range: ¿20 unidades? ¿30?
   - Spider detection: ¿15 unidades?
   - Worm circle radius: ¿10 unidades?
   - Worm detection: ¿12 unidades?

4. **¿Spawn automático sigue usando estos portales?**
   - O sea, ¿cada 2 segundos spawnea un enemigo EN el portal?
   - ¿O spawn automático desaparece y SOLO manual spawning?

### Sobre Control de Spawn:
5. **¿`spawn-toggle` detiene TODO spawn?**
   - Incluyendo comandos `spawn spider 5`?
   - O solo spawn automático cada 2s?

6. **¿Dónde mostrar estado?**
   - ¿En consola output? ¿Badge en HUD?

### Sobre Debug Mode Unificado:
7. **¿Una sola tecla Ctrl+K abre consola?**
   - ¿Y dentro hay comando `debug toggle`?
   - ¿O debería ser diferente?

8. **Visualización debug detrás de consola**:
   - ¿Quieres ver colisiones/limites MIENTRAS tienes consola abierta?
   - ¿Consola transparente = ves debug atrás?

9. **¿Mantener `Ctrl+D` para debug sin consola?**
   - O eliminar completamente?

### Sobre Transparencia:
10. **¿Qué porcentaje de opacidad?**
    - 20% = muy transparente (riesgo: difícil leer consola)
    - 30% = medio
    - 50% = actual (opaco)

---

## 📊 IMPACTO EN ARQUITECTURA:

### Archivos a CREAR:
- `src/app/game/world/portal-system.ts` (NEW - gestionar portales)
- `src/app/game/entities/portal.three.ts` (NEW - visual del portal)

### Archivos a MODIFICAR:
- `three-engine.service.ts`:
  - Agregar `portalSystem`
  - Crear método `initPortals()`
  - Modificar `spawnEnemy()` para usar portales
  - Agregar `toggleSpawning()`
  - Integrar debug visualization con consola

- `enemy.three.ts`:
  - Agregar propiedad `homePortal: Portal`
  - Agregar estados: `isReturningToHome`, `isPatrolling`
  - Nueva lógica en `update()` para detectar jugador y regresar

- `dev-console.component.ts`:
  - Agregar comando `spawn-toggle`
  - Agregar comando `debug`
  - Cambiar Ctrl+K comportamiento

- `dev-console.component.scss`:
  - Reducir opacidad overlay
  - Mejorar legibilidad con fondo más transparente

- `three-game.component.html`:
  - ¿Seguir mostrando debug-indicator cuando Ctrl+D? No, porque desaparece Ctrl+D
  - ¿Mostrar dentro de consola? Sí

---

## 🎯 PRIORIDAD DE IMPLEMENTACIÓN:

1. **CRÍTICO - Entender requerimientos** (ESTO AHORA)
   - Responder todas las preguntas arriba
   - Definir coordenadas de portales
   - Definir rangos y parámetros exactos

2. **ALTO - Infraestructura Portal**
   - Crear portal-system.ts
   - Crear portal.three.ts (visual)
   - Inicializar portales en engine

3. **ALTO - Lógica enemiga**
   - Modificar EnemyThree para comportamiento "home"
   - Integrar detección de jugador
   - Patrulla básica

4. **MEDIO - Debug unificado**
   - Unificar Ctrl+D + Ctrl+K
   - Agregar comandos en consola
   - Integrar visualization debug

5. **BAJO - Polish**
   - Transparencia consola
   - Animaciones portales
   - Efectos visuales

---

## ⚠️ CONTEXTO RESTANTE:

**Tokens disponibles**: Estimado ~30-40% del máximo
**Complejidad**: ALTÍSIMA (cambio arquitectónico significativo)
**Riesgo**: ALTO si no está claro qué hacer

---

## ✅ SIGUIENTE PASO:

**ESPERAR TU RESPUESTA A LAS 10 PREGUNTAS CRÍTICAS**

Sin claridad en estos puntos, la implementación será errática y probablemente habrá que refactorizar.
