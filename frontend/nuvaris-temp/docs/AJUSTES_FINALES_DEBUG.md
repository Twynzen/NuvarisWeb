# Ajustes Finales - Debug Speed Control y Shooting Timing

## Resumen

Se realizaron dos ajustes críticos para mejorar la experiencia de testing:

1. **Cambio de teclas de speed control** (sin conflictos con navegador)
2. **Sincronización de disparos con animación** (un disparo por animación)

---

## 1. Speed Control Keys

### Problema Original
- Teclas: Ctrl+1, Ctrl+2, Ctrl+3
- Conflicto: Ctrl+1, Ctrl+2, Ctrl+3 abren nuevas pestañas en navegador
- Resultado: No se podía usar speed control sin interrumpir el flujo

### Solución
- **Nuevas teclas**: Q, W, E
- Q: 0.25x speed (muy lento)
- W: 0.5x speed (lento)
- E: 1.0x speed (normal)
- Sin conflictos con navegador

### Cómo Usar
```
1. Ctrl+D → Activar debug mode
2. Q → Ralentizar a 0.25x (ver frame by frame)
3. W → Ralentizar a 0.5x (lento pero jugable)
4. E → Volver a 1.0x (normal)

Console muestra:
[DEBUG] Time Scale: 0.25x (Very Slow) - Press Q
[DEBUG] Time Scale: 0.5x (Slow) - Press W
[DEBUG] Time Scale: 1.0x (Normal) - Press E
```

### Código
```typescript
// three-engine.service.ts líneas 99-114

// Speed control (only in debug mode) - Q, W, E keys
if (this.gameState.debugMode && !e.ctrlKey && !e.shiftKey && !e.altKey) {
    if (e.key.toLowerCase() === 'q') {
        this.timeScale = 0.25; // Very slow
        console.log(`[DEBUG] Time Scale: 0.25x (Very Slow) - Press Q`);
        e.preventDefault();
    } else if (e.key.toLowerCase() === 'w') {
        this.timeScale = 0.5; // Slow
        console.log(`[DEBUG] Time Scale: 0.5x (Slow) - Press W`);
        e.preventDefault();
    } else if (e.key.toLowerCase() === 'e') {
        this.timeScale = 1.0; // Normal
        console.log(`[DEBUG] Time Scale: 1.0x (Normal) - Press E`);
        e.preventDefault();
    }
}
```

---

## 2. Shooting Animation Timing

### Problema Original

**Matemática:**
- Animación de shoot: 30 frames
- Frame rate: 30 FPS
- Duración real: 30 / 30 = **1.0 segundo**

**Configuración anterior:**
- autoShootInterval: 0.5 segundos
- Resultado: Disparaba cada 0.5s MIENTRAS la animación aún duraba 1.0s
- Efecto: **2 disparos por cada animación** (muy rápido)

**Ejemplo temporal:**
```
Tiempo 0.0s: Inicia animación de shoot (durará 1.0s)
Tiempo 0.5s: DISPARO 1 (animación aún en progreso)
Tiempo 1.0s: DISPARO 2 (animación termina ahora)
Resultado: 2 disparos en 1.0 segundo ❌
```

### Solución

**Nuevo intervalo:**
- autoShootInterval: **1.1 segundos**
- setTimeout en shoot(): **1000ms** (1 segundo)

**Matemática:**
```
Duración de animación: 1.0 segundo
+ Buffer de seguridad: 0.1 segundo
= Intervalo entre disparos: 1.1 segundos
```

**Ejemplo temporal:**
```
Tiempo 0.0s: Inicia animación de shoot (durará 1.0s)
Tiempo 1.0s: Animación termina
Tiempo 1.1s: DISPARO (espera completada)
Tiempo 2.1s: Siguiente disparo
Resultado: 1 disparo cada 1.1 segundos ✅
```

### Código

**three-engine.service.ts línea 30:**
```typescript
// ANTES:
private autoShootInterval = 0.5; // Too fast

// AHORA:
private autoShootInterval = 1.1; // seconds between shots (30 frames @ 30 FPS = 1.0s + 0.1s buffer)
```

**player.three.ts línea 345:**
```typescript
// ANTES:
setTimeout(() => {
    this.isShooting = false;
}, 200); // Too short

// AHORA:
// Reset shooting state after animation completes
// 30 frames @ 30 FPS = 1000ms
setTimeout(() => {
    this.isShooting = false;
}, 1000);
```

---

## Testing

### Verificar Speed Control
```
1. npm run start
2. Ctrl+D (activar debug)
3. Presiona Q
   → Console muestra: [DEBUG] Time Scale: 0.25x (Very Slow) - Press Q
   → Todo en pantalla se ralentiza
4. Presiona W
   → Console muestra: [DEBUG] Time Scale: 0.5x (Slow) - Press W
   → Más rápido que Q, más lento que normal
5. Presiona E
   → Console muestra: [DEBUG] Time Scale: 1.0x (Normal) - Press E
   → Vuelve a velocidad normal
```

### Verificar Shooting Timing
```
1. npm run start
2. Ctrl+D (debug)
3. Q (ralentizar a 0.25x)
4. Observa al personaje:
   - Inicia animación de shoot
   - Espera a que termine completamente
   - Siguiente disparo ocurre DESPUÉS de terminar
   - Patrón: 1 disparo por animación
5. E (volver a normal)
   - Mismo patrón, pero más rápido
```

### Checklist
- [ ] Q ralentiza a 0.25x sin abrir pestañas
- [ ] W ralentiza a 0.5x sin abrir pestañas
- [ ] E vuelve a 1.0x normal
- [ ] Un disparo por animación (no 2)
- [ ] Disparos sincronizados con final de animación
- [ ] Console muestra speed scale messages

---

## Impacto

### Speed Control
- ✅ Sin conflictos con navegador
- ✅ Fácil ver en tiempo real qué sucede
- ✅ Frame by frame viewing (0.25x)
- ✅ Testing más fluido

### Shooting Timing
- ✅ Un disparo = una animación completa
- ✅ Más predecible (1.1s entre disparos)
- ✅ Visualmente sincronizado
- ✅ Mejor para observar colisiones

---

## Configuración Futura

### Si quieres cambiar intervalos:
```typescript
// three-engine.service.ts
private autoShootInterval = 1.1; // Ajustar aquí

// Para personajes más rápidos:
private autoShootInterval = 0.8; // Dispara más rápido

// Para personajes más lentos:
private autoShootInterval = 1.5; // Dispara más lento
```

### Si quieres cambiar velocidades de debug:
```typescript
// three-engine.service.ts setupInput()
if (e.key.toLowerCase() === 'q') {
    this.timeScale = 0.25; // Cambiar este valor
}
```

---

## Commits Relacionados

```
d22b0c1 - fix: Sync shooting animation timing and change speed control keys
```

Changes:
- Speed control: Ctrl+# → Q/W/E
- Shooting interval: 0.5s → 1.1s
- Animation timeout: 200ms → 1000ms

---

**Versión**: 1.0
**Fecha**: 2025-11-26
**Estado**: Implementado y listo para usar
