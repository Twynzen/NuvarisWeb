# PROMPT PARA SONNET - Testing Sistema de Colisiones NUVARIS

## Contexto
Se implementaron mejoras al sistema de colisiones en Three.js basadas en la GUIA_INVESTIGACION_COLISIONES_THREEJS.
Los cambios incluyen:
- **Optimización Broad Phase**: Culling de enemigos lejanos (> 35 unidades)
- **Visualización Debug Mejorada**: Círculos de colisión dinámicos y líneas de distancia
- **Feedback Visual**: Flash y stats de daño

## Rama
`claude/pulir-refactor-nuvaris-01GS9xqt6Q24sHsA2845vQU5`

## Cambios Realizados

### 1. three-engine.service.ts
- Agregado `maxCollisionCheckDistance = 35` para culling
- Implementado broad phase + narrow phase
- Stats de colisiones por frame (debug)

### 2. debug-visualizer.ts
- Nuevo método: `visualizeCollisionRange()` - muestra rango de culling
- Nuevo método: `visualizeDistanceLine()` - línea entre player y enemigos
- Colores dinámicos basados en estado (colisión activa = naranja, rango = cyan)

### 3. Fórmula de Colisión (sin cambios, ya correcta)
```
Colisión = dist < (PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS)
         = dist < 3.0
```

---

## INSTRUCCIONES PARA SONNET

### Objetivo
Verificar que el sistema de colisiones funcione correctamente y sin errores visuales.

### Checklist de Testing

#### 1. STARTUP (5 min)
Abre el juego y selecciona cualquier personaje:
- [ ] Juego carga sin errores en consola
- [ ] Player visible en centro de pantalla
- [ ] Enemigos aparecen después de 2 segundos
- [ ] No hay crashes en los primeros 30 segundos

#### 2. DEBUG VISUALIZATION (10 min)
Presiona `Ctrl+D` para activar debug mode:
- [ ] Se activa modo debug sin crash
- [ ] Player tiene círculo VERDE (collision radius)
- [ ] Player tiene cuadrado AMARILLO (sprite bounds)
- [ ] Enemigos tienen círculo ROJO (collision radius)
- [ ] Se ve línea CYAN alrededor del mapa (boundaries)
- [ ] Los círculos se mueven con los personajes

#### 3. COLLISION DETECTION (15 min)
Acerca el player a enemigos:
- [ ] Player recibe daño cuando toca enemigos
- [ ] Daño se acumula correctamente (health bar desciende)
- [ ] La fórmula de distancia es correcta (tocarse a ~3 unidades)
- [ ] Múltiples enemigos causan más daño (damage stacking)
- [ ] Enemigos lejanos (> 35 unidades) NO causan daño

#### 4. PERFORMANCE & OPTIMIZATION (10 min)
Con 10-20 enemigos en pantalla:
- [ ] Juego mantiene 60 FPS (sin slowdown visible)
- [ ] No hay lag cuando enemigos se acercan
- [ ] Debug mode no ralentiza significativamente
- [ ] Enemies cullados no crean objetos visuales innecesarios

#### 5. EDGE CASES (10 min)
Prueba situaciones extremas:
- [ ] Player en esquina + 5 enemigos alrededor → Daño correcto
- [ ] Rápido movement (WASD muy rápido) → Sin glitches de colisión
- [ ] Múltiples enemigos ocupando misma posición → Sin crash
- [ ] Player recibe daño desde diferentes direcciones → Funciona igual

#### 6. VISUAL FEEDBACK (5 min)
- [ ] Cuando player recibe daño: Se ve cambio visual (si está implementado)
- [ ] El número de health actualiza en tiempo real
- [ ] Debug circles NO parpadean o se distorsionan

---

## PASO A PASO PARA TESTEAR

### Parte 1: Setup Básico
```
1. npm install
2. npm run start
3. Seleccionar cualquier personaje
4. Esperar 10 segundos a que aparezcan enemigos
```

### Parte 2: Debug Visual
```
1. Presionar Ctrl+D para activar debug
2. Observar:
   - Círculo verde alrededor del player
   - Círculos rojos alrededor de enemigos
   - Línea cyan formando el perímetro del mapa
3. Presionar Ctrl+D de nuevo para desactivar (debe limpiar todo)
```

### Parte 3: Colisiones
```
1. Usar WASD/Flechas para acercarse a un enemigo lentamente
2. Observar cuando la distancia en debug se vuelve < 3.0
3. Verificar que health disminuye
4. Repetir con múltiples enemigos
```

### Parte 4: Performance
```
1. Dejar juego correr 2-3 minutos
2. Abrir DevTools (F12) → Console
3. Ver si hay warnings o errors
4. Verificar FPS con Ctrl+D activado y desactivado
```

---

## ERRORES ESPERADOS A BUSCAR

### 🔴 Critical (DEBE arreglarse)
- [ ] Crash cuando se activa debug (`Ctrl+D`)
- [ ] Colisiones no funcionan (player no recibe daño)
- [ ] Memory leak (health/memory crece infinitamente)
- [ ] Matemática de distancia incorrecta

### 🟡 Warnings (Reportar, pero no bloquea)
- [ ] Debug mode consume muchos recursos
- [ ] Circles parpadean o distorsionan
- [ ] Algunos enemigos no se renderizan
- [ ] Lag ocasional en pantalla

### 🟢 Expected (Normal)
- [ ] Consola muestra logs de debug
- [ ] FPS puede bajar con 100+ enemigos (normal)
- [ ] Enemigos pueden solaparse (no tiene physics)

---

## SI ENCUENTRAS ERRORES

### Paso 1: Documentar
```
1. Toma screenshot del error
2. Copia el mensaje exacto de console
3. Describe qué acciones llevaron al error
4. Anota si es reproducible o aleatorio
```

### Paso 2: Reportar formato
```
ERROR: [Nombre del error]
UBICACIÓN: [Dónde ocurre - ej: "Al tocar enemigo", "Al activar Ctrl+D"]
REPRODUCIBLE: [Sí/No]
SCREENSHOT: [Adjunta imagen]
CONSOLE ERROR: [Mensaje exacto]
```

### Paso 3: Intentar Arreglar
```
1. Revisa el archivo indicado en el error
2. Busca la línea específica
3. Compara con la implementación esperada
4. Haz cambios mínimos para arreglar
5. Re-prueba
```

---

## CASOS ESPECIALES A TESTEAR

### Test 1: Múltiples Enemigos
- Dejar jugar hasta que haya 10+ enemigos
- Verificar que el jugador recibe daño de todos
- Confirmar que el daño es acumulativo

### Test 2: Enemigos Lejanos (Culling)
- Mover enemigos fuera del rango visible
- Verificar que NO reciben daño
- Debug: Enemigos > 35 unidades deben tener circles gris/desactivados

### Test 3: Movimiento Rápido
- WASD spam muy rápido hacia enemigos
- Teleport visual (sin physics real)
- Verificar colisiones siguen siendo correctas

### Test 4: Debug Toggle
- Ctrl+D ON → Ver debug
- Ctrl+D OFF → Debug desaparece completamente
- Ctrl+D ON → Debug aparece de nuevo correctamente

---

## MÉTRICAS DE ÉXITO

### ✅ Juego considerado "FUNCIONAL" si:
1. No hay crashes
2. Colisiones detectadas correctamente
3. Debug mode funciona sin lag
4. 60 FPS con <20 enemigos
5. Daño se aplica correctamente

### ⚠️ Juego necesita revisión si:
1. Crashes ocasionales
2. Colisiones incorrectas (no toca o toca siempre)
3. Debug mode ralentiza juego >20%
4. FPS cae <30 fps con 10 enemigos

---

## CONSOLAS Y SHORTCUTS

| Tecla | Función |
|-------|---------|
| `Ctrl+D` | Toggle Debug Visualization |
| `P` | Pause/Resume |
| `WASD` | Movimiento |
| `Flechas` | Movimiento alternativo |
| `F12` | DevTools (Console) |

---

## INFORMACIÓN TÉCNICA (Para contexto)

### Colisión formula
```
distance(playerPos, enemyPos) < (1.5 + 1.5) = 3.0
```

### Broad Phase (Optimización)
```
if (distance > 35) {
    continue; // Skip este enemigo (muy lejano)
}
```

### Debug Colors
- 🟢 Verde: Player collision radius
- 🔴 Rojo: Enemy collision radius
- 🟡 Amarillo: Sprite bounds
- 🔵 Cyan: Map boundaries
- 🟠 Naranja: Collision active (cuando toca)

---

## TIEMPO ESTIMADO
- Testing completo: **45-60 minutos**
- Testing rápido (sin edge cases): **15-20 minutos**

---

## NOTAS FINALES

1. **Antigravity**: Este IDE permite review visual en tiempo real, aprovéchalo
2. **Iteración**: Si encuentras bug, intenta arreglarlo y re-prueba
3. **Documentación**: Incluye screenshots de errores si los hay
4. **Performance**: Usa DevTools para medir FPS reales

---

**Versión**: 1.0
**Fecha**: 2025-11-26
**Rama Objetivo**: claude/pulir-refactor-nuvaris-01GS9xqt6Q24sHsA2845vQU5

¡A testear!
