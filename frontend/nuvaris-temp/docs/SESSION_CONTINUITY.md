# SESSION CONTINUITY - Attack Feel System
## Para siguiente sesion de Claude

---

## ESTADO ACTUAL

- **Rama:** `feature/character-attack-feel` (nueva, basada en development)
- **Commit pendiente:** Documentacion + prototipo Lars

---

## CONTEXTO DEL PROYECTO

### Arquitectura de Combate
```
player.three.ts       -> shoot() crea ProjectileThree
projectile.three.ts   -> Movimiento lineal o curvo (hoz)
*-ability-three.ts    -> Habilidades pasivas y efectos
three-engine.service.ts -> autoShoot() cada 1.1s, colisiones
sprite-animator.ts    -> 30 frames @ 30 FPS por animacion
```

### Problema a Resolver
- Animaciones de 30 frames = 1 segundo de lag
- Sin diferenciacion de "feel" entre personajes
- Proyectiles sprite 2D para todos (no ideal para Lars)

---

## VISION DEL DIRECTOR (Daniel)

### LARS - Control Mental
- **SIN proyectil visible** - ataque mental instantaneo
- Animacion de Lars: ojos brillando/concentrandose (3-4 frames)
- Efecto en enemigo: aura purpura cuando es "mirado"
- El dano/control es instantaneo al enemigo mas cercano

### PROYECTO Y (Yurany) - Rayo Electrico
- Efecto Three.js de electricidad (ya existe createLightningEffect)
- Puede mantener sprite o usar solo Three.js
- Chain lightning ya funciona visualmente

### PROYECTO A (Arcadio) - Melee
- Golpe en area, 4 direcciones
- Efectos Three.js de impacto
- Animacion pesada con anticipacion (5-8 frames)

---

## TRABAJO PENDIENTE

### 1. PROTOTIPO LARS (Prioridad Alta)
Modificar para que:
- NO cree ProjectileThree
- Efecto instantaneo en enemigo mas cercano
- Crear efecto visual de "mirada mental"

Archivos a modificar:
- `three-engine.service.ts` -> autoShoot() para Lars
- `lars-ability-three.ts` -> nuevo metodo attackMental()

### 2. SPRITES NUEVOS (Daniel los crea)
Por cada personaje, validar uno por uno:

**Lars:**
- `lars-mental-{dir}-001.png` a 004.png (4 frames x 4 direcciones)
- Mostrar concentracion, ojos brillando

**Proyecto Y:**
- `proyecto-y-shoot-{dir}-001.png` a 003.png (3 frames x 4 direcciones)
- Pose rapida de disparo

**Proyecto A:**
- `proyecto-a-attack-{dir}-001.png` a 008.png (8 frames x 4 direcciones)
- Anticipacion -> golpe -> recuperacion

### 3. SISTEMA KEY FRAMES
Modificar sprite-animator.ts para soportar:
```typescript
playKeyFrames(animName, frames[], frameRate, loop, onComplete)
onFrameReached(frameNum, callback)
```

### 4. EFECTOS THREE.JS MEJORADOS
- Lars: createMentalEffect() - aura en enemigo
- Proyecto Y: mejorar createLightningEffect()
- Proyecto A: createImpactEffect() - AOE visual

---

## ARCHIVOS CLAVE

| Archivo | Proposito |
|---------|-----------|
| `player.three.ts` | shoot(), meleeAttack(), animaciones |
| `projectile.three.ts` | Movimiento proyectil |
| `lars-ability-three.ts` | Habilidad Lars |
| `proyecto-y-ability-three.ts` | Habilidad Yurany |
| `proyecto-a-ability-three.ts` | Habilidad Arcadio |
| `three-engine.service.ts` | autoShoot(), loop principal |
| `sprite-animator.ts` | Sistema de animacion |

---

## COMO CONTINUAR

1. Leer este documento
2. Revisar `ATTACK_FEEL_IMPLEMENTATION_PLAN.md` para detalles tecnicos
3. Continuar con prototipo Lars si no se completo
4. Validar sprites que Daniel vaya creando
5. Iterar: codigo -> prueba -> feedback -> ajuste

---

## COMMITS PENDIENTES

Antes de cerrar sesion, commitear:
- Este documento
- ATTACK_FEEL_IMPLEMENTATION_PLAN.md
- Cualquier codigo de prototipo

---

## FLUJO DE TRABAJO ACORDADO

1. Claude hace prototipos Three.js para validar feel
2. Daniel crea sprites basados en el feel validado
3. Validamos sprites juntos (pocos frames, uno por uno)
4. Integramos sprites al sistema
5. Pulimos timing y efectos

---

*Documento de continuidad - 2025-12-13*
*Rama: feature/character-attack-feel*
