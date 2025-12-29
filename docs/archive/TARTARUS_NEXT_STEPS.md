# TARTARUS PRIME - Próximos Pasos (CRITICAL)

## CONTEXTO ACTUAL (No tienes acceso a captura.png - lee esto cuidadosamente)

### Estado Visual Actual:
- ✅ **Continentes funcionando BIEN**: Masas irregulares de tierra oscura sobre océano de magma
- ✅ **Corteza continental**: Se ve correctamente con FBM noise (60% tierra, 40% magma)
- ❌ **PROBLEMA: Estructuras volcánicas actuales son MUY GEOMÉTRICAS**
  - Parecen "torres" o "palitos" negros
  - Parecen "metal retorcido" artificial
  - NO se ven como montañas/volcanes orgánicos
  - Son 12 formaciones aleatorias que no tienen lógica geológica

## PROBLEMA CRÍTICO A RESOLVER

**Archivo:** `volcanic-islands.system.ts`

**Formaciones actuales (LÍNEA 140-219):**
```typescript
// 3 massive formations (citadel, forge, haven)
// 4 distributed islands
// 5 small outcrops
// TOTAL: 12 formaciones
```

**Por qué están mal:**
1. Son **geometría procedural con picos afilados** → parecen torres
2. Usan `createMassiveMountainRange()` que genera **spikes geométricos**
3. Se distribuyen **aleatoriamente** sin lógica geológica
4. NO se integran con los continentes (parecen flotar)

## SOLUCIÓN REQUERIDA

### 1. ELIMINAR todas las formaciones actuales
- Borrar las 12 formaciones (massive, islands, outcrops)
- Mantener solo el sistema base pero vacío

### 2. CREAR solo 4 VOLCANES REALISTAS

**Características requeridas:**
- **Forma:** Conos volcánicos orgánicos (NO torres/spikes)
- **Geometría:** ConeGeometry con roughness/noise sutil
- **Ubicación:** ESTRATÉGICA en zonas con MÁS superficie continental
- **Altura:** Similar a actual (~2-3x coreRadius) - ya está bien
- **Lógica:** Volcanes surgen de puntos calientes BAJO continentes

### 3. POSICIONAMIENTO INTELIGENTE (NO aleatorio)

**Método propuesto:**
```typescript
// Samplear el shader de continentes (continentNoise)
// Encontrar los 4 puntos con MAYOR valor de continentNoise
// = Centros de masas continentales
// Colocar volcanes allí (lógica geológica correcta)
```

**Pseudocódigo:**
```
1. Crear grid spherical de puntos de muestra (ej: 100 puntos)
2. Para cada punto:
   - Calcular continentNoise en ese punto (mismo FBM que shader)
3. Ordenar puntos por valor de noise (mayor = más continente)
4. Seleccionar top 4 puntos
5. Crear volcanes en esas posiciones
```

### 4. GEOMETRÍA VOLCÁN REALISTA

**NO usar:**
- ❌ createMassiveMountainRange (crea spikes)
- ❌ Múltiples peaks (parecen torres)

**SÍ usar:**
```typescript
// Cono volcánico simple
const volcanoGeometry = new THREE.ConeGeometry(
  baseRadius,      // Base ancha
  height,          // Altura ~2-3x coreRadius
  32,              // Radial segments
  8,               // Height segments para terracing
  false            // No open ended
);

// Añadir noise sutil a vértices para irregularidad
// Aplicar material de roca oscura (ya existe: materials.rock)
```

**Crater en cima (opcional pero recomendado):**
```typescript
// Pequeño TorusGeometry en la cima para crater
// Color más oscuro/glow sutil (magma en crater)
```

## ARCHIVOS A MODIFICAR

### 1. `volcanic-islands.system.ts`

**Función a reescribir completamente:**
```typescript
private createMassiveFormations(): void {
  // PASO 1: Samplear continentes
  const volcanoPositions = this.findContinentalHotspots(4);

  // PASO 2: Crear 4 volcanes orgánicos
  volcanoPositions.forEach((pos, i) => {
    const volcano = this.createRealisticVolcano({
      position: pos,
      baseRadius: 2.5 + Math.random() * 0.5,
      height: this.coreRadius * (2.0 + Math.random() * 0.5),
      hasCrater: true,
      hasCity: i < 3, // Solo 3 primeros con ciudades
      cityType: ['capital', 'industrial', 'residential'][i]
    });
    this.formations.push(volcano);
    this.mesh.add(volcano);
  });
}
```

**Método nuevo requerido:**
```typescript
private findContinentalHotspots(count: number): THREE.Vector3[] {
  // Implementar sampling de continentNoise
  // Usar mismo FBM que en volcanic-crust.system.ts
  // Retornar top N posiciones
}

private createRealisticVolcano(config: VolcanoConfig): THREE.Group {
  // Crear ConeGeometry orgánica
  // NO spikes, NO torres
  // Añadir crater, ciudad, detalles
}
```

### 2. NO modificar:
- ✅ `volcanic-crust.system.ts` - Continentes funcionan bien
- ✅ `magma-core.system.ts` - Core está correcto
- ✅ `atmosphere.system.ts` - OK
- ✅ Shaders - OK

## CRITERIOS DE ÉXITO

**El planeta debe verse así:**
1. Continentes irregulares de roca oscura (ya está ✅)
2. Océanos de magma naranja brillante entre continentes (ya está ✅)
3. **4 volcanes cónicos orgánicos** surgiendo de centros continentales
4. Volcanes se integran visualmente con continentes (misma roca oscura)
5. NO más estructuras geométricas/torres/spikes

## PARÁMETROS VISUALES ACTUALES (Mantener)

```typescript
// Estos YA están bien configurados:
- coreRadius: 10
- Continentes: 60% cobertura
- Luces: 6 total (optimizado)
- Bloom: reducido (0.6 strength, 0.85 threshold)
- Materials emissive: reducidos (0.04-0.03)
```

## NOTAS IMPORTANTES

1. **El usuario NO quiere más formaciones** - solo 4 volcanes estratégicos
2. **Lógica geológica es clave** - volcanes en centros continentales
3. **Orgánico > Geométrico** - conos suaves, no spikes
4. **Ya hay ciudades implementadas** - reutilizar sistema existente para 3 volcanes

## COMMITS RECIENTES (Referencia)

```
c680f79 docs: update screenshot
e2c199d refactor: continental landmasses (FBM noise)
c02c98b feat: volcanic crust layer
4a713e0 perf: optimize performance (12 formations, 6 lights)
06640a1 fix: reduce brightness
8ca37ba feat: Phase 1 atmospheric effects
```

## DEBUG

Si el siguiente Claude tiene dudas:
- Revisar `volcanic-crust.system.ts:114-123` para ver cómo se calcula `continentNoise` con FBM
- Reutilizar esa misma lógica para sampling de hotspots
- La altura actual de formaciones (~2-3x coreRadius) YA es correcta, mantenerla

---

**PRIORIDAD MÁXIMA:** Reemplazar formaciones geométricas con 4 volcanes orgánicos estratégicos.
