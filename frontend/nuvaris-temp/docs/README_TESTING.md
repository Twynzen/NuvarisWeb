# 🎮 TESTING SYSTEM DE COLISIONES - NUVARIS

## 🚀 QUICK START

```bash
npm install
npm run start
# Luego: Selecciona personaje → Presiona Ctrl+D → Toca enemigos
```

---

## 📋 ¿QUÉ TENGO QUE TESTEAR?

### 3 Opciones (Elige una):

#### 🏃 **RÁPIDO** (15-20 min)
1. Juego carga sin errores
2. Ctrl+D muestra debug (círculos verdes y rojos)
3. Player recibe daño al tocar enemigos
4. **Result**: ✅ o ❌

#### 🚶 **ESTÁNDAR** (30-40 min)
→ Lee: **PROMPT_PARA_SONNET.txt**
→ 5 secciones de testing con checklist

#### 🧑‍🔬 **COMPLETO** (45-60 min)
→ Lee: **PROMPT_SONNET_TESTING.md**
→ 6 secciones + edge cases + performance benchmarks

---

## 🎮 CÓMO TESTEAR (Super Simple)

### Paso 1: Startup
```
npm run start
→ Selecciona cualquier personaje
→ Espera 10 segundos a que aparezcan enemigos
→ Verifica: No hay errores en consola (F12)
```

### Paso 2: Debug Visual
```
Presiona: Ctrl+D

Deberías ver:
✅ Círculo VERDE alrededor del player
✅ Círculos ROJOS alrededor de enemigos
✅ Línea CYAN al perímetro del mapa
✅ Cuadrados AMARILLOS (sprite bounds)

Si no ves esto → ❌ ERROR en visualización
```

### Paso 3: Colisiones
```
Usa WASD o Flechas para moverte hacia un enemigo

Cuando toques un enemigo:
✅ Tu "Health" debe disminuir
✅ Deberías ver cambio visual (flash rojo?)
❌ Si no ves daño → ERROR en colisiones

Intenta con múltiples enemigos:
✅ Dos enemigos = más daño que uno
✅ Enemigos lejanos (> 35 unidades) = sin daño
```

### Paso 4: Performance
```
Abre DevTools: F12 → Console

Deja jugar 2 minutos:
✅ No hay errores en rojo
✅ El juego no se ralentiza
✅ FPS constante (con Ctrl+D ON/OFF)

Pressiona Ctrl+D:
✅ Debug se activa sin lag
✅ Debug se desactiva limpiamente (sin residuos)
```

---

## 📊 RESULTADOS ESPERADOS

### ✅ TODO CORRECTO si ves:
- Juego carga normal
- Debug mode funciona con Ctrl+D
- Colisiones causan daño visible
- Sin crashes o errores

### ❌ ALGO MAL si ves:
- Crashes (red text en console)
- Debug mode no funciona (Ctrl+D no hace nada)
- Colisiones incorrectas (no recibe daño)
- Performance degradado (mucho lag)

---

## 🐛 SI ENCUENTRAS ERRORES

### Reporesta Así:

```
ERROR: [Nombre corto]
QUÉ PASÓ: [Descripción]
CÓMO REPRODUCIR: [Pasos para hacerlo ocurrir]
RESULTADO ESPERADO: [Qué debería pasar]
RESULTADO ACTUAL: [Qué viste]
SCREENSHOT: [Opcional pero útil]
CONSOLE ERROR: [Mensaje exacto si lo hay]
```

### Ejemplo:
```
ERROR: Debug visualization no se activa
QUÉ PASÓ: Presioné Ctrl+D pero no vi cambios
CÓMO REPRODUCIR: Lanzar juego → Presionar Ctrl+D
RESULTADO ESPERADO: Ver círculos verdes y rojos
RESULTADO ACTUAL: Nada cambió
CONSOLE ERROR: (ninguno)
```

---

## 🎯 CHECKLIST MINIMAL (5 min)

- [ ] npm run start → ✅ Juego carga
- [ ] Selecciona personaje → ✅ Player aparece
- [ ] Espera enemigos → ✅ Enemigos aparecen
- [ ] Presiona Ctrl+D → ✅ Debug aparece
- [ ] Acerca a enemigo → ✅ Recibe daño
- [ ] Presiona Ctrl+D → ✅ Debug desaparece

**Si todos son ✅ → Testing exitoso**

---

## 📚 DOCUMENTACIÓN

### Necesitas más detalle?

| Quiero... | Leer... |
|-----------|---------|
| Instrucciones paso a paso | `PROMPT_SONNET_TESTING.md` |
| Version resumida | `PROMPT_PARA_SONNET.txt` |
| Qué se cambió | `RESUMEN_CAMBIOS_COLISIONES.md` |
| Plan estratégico | `ESTRATEGIA_MEJORA_COLISIONES.md` |
| Todo el proyecto | `../claude.md` |

---

## 🎮 CONTROLES

| Tecla | Función |
|-------|---------|
| **WASD** | Movimiento |
| **Flechas** | Movimiento alternativo |
| **Ctrl+D** | Toggle Debug Visualization |
| **P** | Pause |
| **F12** | DevTools / Console |

---

## 🔍 QUÉ ESTÁ SIENDO TESTEADO

### Código Modificado:
- `three-engine.service.ts` (líneas 36-46, 432-486)
  - Broad-phase culling
  - Collision metrics
  - Damage feedback

- `debug-visualizer.ts` (líneas 277-328)
  - Collision range visualization
  - Distance lines
  - Dynamic colors

### Sin cambios (pero verificar que sigan funcionando):
- Player movement
- Enemy AI
- Health system
- All other game mechanics

---

## ⚡ PERFORMANCE ESPERADO

| Scenario | Esperado |
|----------|----------|
| 10 enemigos | 60 FPS |
| 20 enemigos | 50+ FPS |
| 50 enemigos | 30+ FPS |
| Con Ctrl+D ON | -5 a 10% FPS |

---

## 🎓 NOTAS TÉCNICAS

### Fórmula de Colisión (Invariante)
```
Colisión = distancia < (1.5 + 1.5) = 3.0
```

### Broad Phase Culling
```
Si distancia > 35 → No checkear colisión
Si distancia ≤ 35 → Checkear colisión normal
```

### Debug Colors
```
🟢 Verde:   Player collision radius
🔴 Rojo:    Enemy collision radius
🟡 Amarillo: Sprite bounds
🔵 Cyan:    Map boundaries
🟠 Naranja: Collision happening (active)
```

---

## 🆘 SOPORTE

Si algo no funciona:

1. **Revisa console** (F12) para errores
2. **Intenta Ctrl+D** para ver debug
3. **Lee PROMPT_SONNET_TESTING.md** si necesitas más info
4. **Reporta error** con el formato de arriba

---

## ✅ CHECKLIST FINAL

Antes de reportar "TODO OK":

- [ ] Juego launched sin errores
- [ ] Player visible
- [ ] Enemigos spawneando
- [ ] Ctrl+D funciona
- [ ] Colisiones funcionan (damage visible)
- [ ] Sin crashes en 2+ minutos de juego
- [ ] Performance acceptable (FPS estable)
- [ ] Debug toggle ON/OFF sin problemas

---

**VERSIÓN**: 1.0
**FECHA**: 2025-11-26
**RAMA**: claude/pulir-refactor-nuvaris-01GS9xqt6Q24sHsA2845vQU5

🚀 **LISTO PARA TESTEAR**
