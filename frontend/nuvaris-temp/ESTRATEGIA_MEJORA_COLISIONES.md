# Estrategia de Mejora del Sistema de Colisiones NUVARIS

## Análisis Actual

### Estado Existente (Rama actual)
✅ **Lo que ya está bien:**
- Fórmula de colisión correcta: `dist < (PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS)` = 3.0
- Sistema de debug visualizer con Ctrl+D habilitado
- Colisiones XZ (2D top-down) correctamente implementadas
- Player y Enemy tienen COLLISION_RADIUS = 1.5
- Debug visualization muestra círculos de colisión en verde (player) y rojo (enemy)

### Problemas Identificados
❌ **Por mejorar según GUIA_INVESTIGACION:**
1. **Visualización de debug limitada** - Solo círculos y bounds básicos
2. **Sin optimización de rendimiento** - Brute force O(n²) para colisiones
3. **Sin spatial partitioning** - Sin grid/quadtree para acelerar búsquedas
4. **Colisiones mundo-jugador** - No hay validación contra muros/obstáculos
5. **Sin feedback visual mejorado** - Colisiones sin efectos visuales

## Estrategia de Implementación

### FASE 1: Mejora Inmediata (Sin breaking changes)
**Objetivo**: Aprovechar antigravity para visualización mejorada

#### 1.1 - Mejorar Debug Visualizer
- Mostrar líneas de colisión cuando hay contacto (rojo pulsante)
- Distancia actual entre objetos
- Proyección de colisiones futuras
- Toggle para ver diferentes tipos de debug

#### 1.2 - Optimización Broad Phase
- Implementar simple grid-based culling
- Distancia máxima de búsqueda = 30 unidades
- Solo chequear enemigos dentro del rango

#### 1.3 - Feedback Visual
- Flash en color según tipo de colisión
- Pequeño screen-shake en colisión
- Número de daño visible

### FASE 2: Sistema Robusto (Para future scaling)
**Si escalamos a 100+ enemigos**
- Sistema de grid 10x10 para spatial partitioning
- Quadtree para búsquedas dinámicas
- Object pooling para debug meshes

### FASE 3: Validación Sonnet
**Cuando esté listo**
- Prompt interactivo para test completo
- Verificación visual con capturas
- Casos de edge cases

## Priorización

### Must Have (Implementar ahora)
1. ✅ Grid-based culling para enemigos lejanos
2. ✅ Mejorar debug visualization
3. ✅ Feedback visual de daño

### Nice to Have (Opcional)
1. 🟡 Quadtree si hay 100+ enemigos
2. 🟡 Physics-based knockback
3. 🟡 Collision prediction

### Diferido (Future)
1. ⏳ Sistema de muros destructibles
2. ⏳ Obstacles dinámicos
3. ⏳ Raycast para targeting

## Cambios Específicos a Hacer

### 1. three-engine.service.ts
```typescript
// ANTES: O(n²) - chequear todos los enemigos contra player
for (const enemy of this.enemies) {
    const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
    if (dist < collisionDistance) { ... }
}

// DESPUÉS: O(n) con culling
for (const enemy of this.enemies) {
    // Culling: solo si cerca (< 30)
    const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
    if (dist > 30) continue; // Skip lejanos

    if (dist < collisionDistance) { ... }
}
```

### 2. debug-visualizer.ts
- Agregar `visualizeCollisionLine(from, to, color)` para mostrar vectores
- Agregar `visualizeCollisionDistance(pos, radius)` dinámico
- Toggle para mostrar solo colisiones activas

### 3. Efectos Visuales
- Flash rojo en player cuando recibe daño
- Número de daño flotante
- Pequeño knockback (solo visual, sin physics)

## Testing Strategy (Para Sonnet)

### Test Plan
1. ✅ Verifica colisiones player-enemy funcionen
2. ✅ Visualización debug se activa con Ctrl+D
3. ✅ Enemigos lejanos no generan cálculos
4. ✅ Daño se aplica correctamente
5. ✅ Efectos visuales se ven bien
6. ✅ Performance mantiene 60 FPS con 20 enemigos

### Casos a Verificar
- [ ] Player en esquina + enemigos alrededor
- [ ] Múltiples enemigos tocando simultáneamente
- [ ] Cambios rápidos de posición (teleport)
- [ ] Enemigos que aparecen/desaparecen

---

**Versión**: 1.0
**Fecha**: 2025-11-26
**Estado**: Listo para implementación
