# Guía de Investigación: Sistemas de Colisión en Three.js

## Objetivo
Investigar las mejores prácticas para implementar detección de colisiones en juegos 2D/2.5D usando Three.js con sprites billboard.

---

## Parte 1: Fundamentos de Colisión en Three.js

### 1.1 Conceptos Clave a Investigar

**Búsquedas recomendadas:**
- `three.js collision detection sprites`
- `three.js 2D game collision`
- `three.js billboard sprite collision`

**Preguntas a responder:**
1. ¿Three.js tiene sistema de colisiones nativo?
2. ¿Cuál es la diferencia entre colisión 2D y 3D en Three.js?
3. ¿Cómo afecta el comportamiento billboard a la detección de colisiones?

### 1.2 Métodos de Detección

| Método | Descripción | Usar cuando |
|--------|-------------|-------------|
| `distanceTo()` | Distancia euclidiana 3D | Esferas/círculos simples |
| `Box3.intersectsBox()` | AABB collision | Objetos rectangulares |
| `Raycaster` | Ray casting | Click detection, proyectiles |
| `Sphere.intersectsSphere()` | Esfera vs esfera | Colisión circular precisa |

**Investigar:**
```javascript
// ¿Cuál es más eficiente?
mesh.position.distanceTo(other.position) < radius
// vs
new THREE.Sphere(mesh.position, radius).intersectsSphere(otherSphere)
```

---

## Parte 2: Problema Específico - Sprites Billboard

### 2.1 El Desafío

Los sprites en Three.js son "billboards" - siempre miran a la cámara. Esto crea una desconexión:

```
Vista de Cámara (60° ángulo):     Vista Superior (colisión real):
       ___                              ___
      |   |  <- sprite vertical        (   ) <- círculo de colisión
      |___|                             ---
```

**Buscar:**
- `three.js sprite bounding box`
- `three.js sprite collision detection`
- `three.js top-down game collision`

### 2.2 Soluciones a Investigar

1. **Colisión 2D pura (ignorar Y):**
   ```javascript
   const dx = a.position.x - b.position.x;
   const dz = a.position.z - b.position.z;
   const dist2D = Math.sqrt(dx*dx + dz*dz);
   ```

2. **THREE.Sphere para colisión:**
   ```javascript
   const sphereA = new THREE.Sphere(posA, radiusA);
   const sphereB = new THREE.Sphere(posB, radiusB);
   sphereA.intersectsSphere(sphereB);
   ```

3. **THREE.Box3 para bounds:**
   ```javascript
   const box = new THREE.Box3().setFromObject(sprite);
   ```

---

## Parte 3: Visualización de Debug

### 3.1 Problema Actual

La visualización de bounds del sprite es un rectángulo vertical, pero:
- La colisión se hace en el plano XZ (2D top-down)
- El sprite es billboard (siempre mira a cámara)
- El jugador ve desde ángulo de 60°

**Buscar:**
- `three.js debug visualization`
- `three.js wireframe helper`
- `three.js collision bounds visualization`

### 3.2 Alternativas de Visualización

| Tipo | Código | Uso |
|------|--------|-----|
| Círculo horizontal | `CircleGeometry` rotado -90° en X | Colisión 2D real |
| Esfera wireframe | `SphereGeometry` con `wireframe: true` | Colisión 3D |
| Box3Helper | `new THREE.Box3Helper(box)` | AABB bounds |
| GridHelper proyectado | Proyección en suelo | Área de colisión |

### 3.3 Código de Referencia

```javascript
// Círculo de colisión horizontal (en el suelo)
const circleGeo = new THREE.CircleGeometry(radius, 32);
const circleMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
});
const circle = new THREE.Mesh(circleGeo, circleMat);
circle.rotation.x = -Math.PI / 2; // Horizontal
circle.position.y = 0.1; // Ligeramente sobre el suelo
```

---

## Parte 4: Optimización de Rendimiento

### 4.1 Búsquedas Recomendadas

- `three.js collision optimization`
- `spatial partitioning javascript`
- `quadtree collision detection`
- `three.js octree`

### 4.2 Técnicas de Optimización

1. **Broad Phase vs Narrow Phase:**
   - Broad: Filtrar candidatos rápidamente (distancia aproximada)
   - Narrow: Verificar colisión precisa solo con candidatos

2. **Spatial Partitioning:**
   - Grid-based: Dividir mundo en celdas
   - Quadtree: Para 2D
   - Octree: Para 3D (three.js tiene `THREE.Octree` en examples)

3. **Object Pooling:**
   ```javascript
   // Reusar vectores para evitar garbage collection
   const tempVec = new THREE.Vector3();
   tempVec.subVectors(a.position, b.position);
   const dist = tempVec.length();
   ```

### 4.3 Comparativa de Rendimiento

| Método | Complejidad | Memoria | Mejor para |
|--------|-------------|---------|------------|
| Fuerza bruta | O(n²) | Baja | <50 objetos |
| Grid | O(n) | Media | Objetos uniformes |
| Quadtree | O(n log n) | Media | 2D dinámico |
| Octree | O(n log n) | Alta | 3D complejo |

---

## Parte 5: Librerías Especializadas

### 5.1 Opciones a Investigar

1. **cannon-es** (física 3D):
   - `npm install cannon-es`
   - https://github.com/pmndrs/cannon-es

2. **@dimforge/rapier2d** (física 2D en WASM):
   - Muy rápido
   - https://rapier.rs/

3. **three-mesh-bvh** (BVH para meshes):
   - https://github.com/gkjohnson/three-mesh-bvh

4. **yuka** (AI y steering):
   - Incluye collision avoidance
   - https://mugen87.github.io/yuka/

**Buscar:**
- `three.js physics engine comparison`
- `three.js 2d physics`
- `rapier js three.js integration`

---

## Parte 6: Checklist de Investigación

### Preguntas a Responder

- [ ] ¿Cuál es el método más eficiente para <100 enemigos?
- [ ] ¿Vale la pena usar una librería de física para un roguelite simple?
- [ ] ¿Cómo manejan otros juegos 2.5D la colisión con sprites billboard?
- [ ] ¿Existe overhead significativo usando `THREE.Sphere` vs `distanceTo()`?
- [ ] ¿Quadtree es necesario para nuestro caso de uso?

### Recursos Recomendados

1. **Three.js Discourse:** https://discourse.threejs.org/
2. **Three.js Examples:** https://threejs.org/examples/
3. **Game Dev StackExchange:** https://gamedev.stackexchange.com/
4. **r/threejs Reddit:** https://reddit.com/r/threejs

### Términos de Búsqueda Clave

```
three.js sprite collision detection
three.js 2d game tutorial
three.js top down shooter
three.js roguelike collision
three.js billboard collision bounds
javascript game collision optimization
spatial hashing javascript
```

---

## Parte 7: Implementación Actual (Referencia)

### Bug Identificado

```typescript
// three-engine.service.ts línea 427
// ACTUAL (bug):
if (dist < this.enemyDamageRadius) // enemyDamageRadius = 1.5

// CORRECTO:
if (dist < (PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS)) // = 3.0
```

### Fórmula de Colisión Circular

```
Dos círculos colisionan cuando:
distancia(centroA, centroB) < radioA + radioB

En nuestro caso:
- Player radius: 1.5
- Enemy radius: 1.5
- Colisión ocurre cuando: dist < 3.0
```

---

## Notas Finales

Esta guía está diseñada para investigar mejoras al sistema de colisiones del juego NUVARIZ. Los fixes básicos ya están implementados en la rama de desarrollo. Esta investigación es para optimizaciones futuras y mejores prácticas.

**Prioridad de investigación:**
1. ⭐⭐⭐ Optimización para múltiples enemigos
2. ⭐⭐ Visualización de debug mejorada
3. ⭐ Librerías de física (solo si necesario)
