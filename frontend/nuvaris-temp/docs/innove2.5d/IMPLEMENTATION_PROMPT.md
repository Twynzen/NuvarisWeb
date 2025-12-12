# 🚀 IMPLEMENTATION PROMPT: Sistema 2.5D Revolucionario para QDT

> **INSTRUCCIÓN PARA EL AGENTE**: Este es un prompt de implementación incremental. Debes colaborar con el humano, solicitar revisión antes de cada commit, y el humano hará push manualmente.

---

## 🎯 OBJETIVO PRINCIPAL

Implementar el sistema 2.5D revolucionario para el juego QDT (Quantum Drift Tartarus) siguiendo la investigación documentada en `docs/innove2.5d/`. El sistema debe integrar:

1. **Sprites 2D con iluminación dinámica** (Mesh + PlaneGeometry + MeshStandardMaterial)
2. **Física ragdoll** con Rapier.js
3. **Animaciones reactivas** con sistema skeletal propio
4. **Game feel profesional** (screen shake, hit stop, partículas)
5. **NPCs con IA local** usando WebLLM (preparado para Zamir)

---

## 📁 CONTEXTO DEL PROYECTO

```
Proyecto: NuvarisWeb/frontend/nuvaris-temp
Framework: Angular + TypeScript
Renderizado: Three.js (actualmente WebGL)
Audio: Web Audio API
Sprites actuales: PNG sequences con THREE.Sprite
Server: npm start (ya corriendo en localhost:4200)
```

### Archivos Clave a Modificar/Crear:

| Archivo Existente | Propósito |
|-------------------|-----------|
| `src/app/game/entities/player.three.ts` | Jugador actual |
| `src/app/game/entities/enemy.three.ts` | Enemigos actuales |
| `src/app/game/engine/three-engine.service.ts` | Motor principal |
| `src/app/game/engine/debug-visualizer.ts` | Debug visual |

| Archivo Nuevo | Propósito |
|---------------|-----------|
| `src/app/game/engine/lit-sprite.ts` | Sprite con iluminación |
| `src/app/game/engine/game-feel.ts` | Screen shake, hit stop |
| `src/app/game/engine/physics-rapier.ts` | Física Rapier.js |
| `src/app/game/engine/skeletal-2d/` | Sistema skeletal propio |

---

## 📋 PLAN DE IMPLEMENTACIÓN INCREMENTAL

### FASE 1: Game Feel (Impacto Inmediato) ⏱️ ~2 horas
**Prioridad: ALTA** - Mejora inmediata en sensación de juego

```
[ ] 1.1 Crear src/app/game/engine/game-feel.ts
    - TraumaScreenShake (trauma-based con Perlin noise)
    - HitStopManager (freeze frames 50-150ms)
    - GameFeelOrchestrator (coordina todo)

[ ] 1.2 Integrar en three-engine.service.ts
    - Añadir llamadas a screenShake.addTrauma() en disparos
    - Añadir hitStop.freezeGlobal() en impactos

[ ] 1.3 VERIFICAR: Disparar y ver screen shake + hit stop
    - SOLICITAR REVISIÓN HUMANA antes de commit
```

---

### FASE 2: Lit Sprites (Iluminación 2D) ⏱️ ~3 horas
**Prioridad: ALTA** - Base visual del sistema 2.5D

```
[ ] 2.1 Crear src/app/game/engine/lit-sprite.ts (clase LitSprite2D)
    - THREE.Mesh + PlaneGeometry + MeshStandardMaterial
    - Billboard manual en update()
    - Soporte para normal maps (opcional)
    - customDepthMaterial para sombras

[ ] 2.2 Migrar player.three.ts de THREE.Sprite a LitSprite2D
    - Mantener animaciones existentes
    - Verificar que reciba iluminación

[ ] 2.3 Ajustar iluminación en three-engine.service.ts
    - Añadir PointLight siguiendo al jugador
    - Verificar sombras

[ ] 2.4 VERIFICAR: Jugador iluminado dinámicamente
    - SOLICITAR REVISIÓN HUMANA antes de commit
```

---

### FASE 3: Física Rapier.js (Ragdoll) ⏱️ ~4 horas
**Prioridad: MEDIA** - Requiere instalación de dependencia

```
[ ] 3.1 Instalar dependencias
    npm install @dimforge/rapier2d-compat
    (Requiere aprobación del humano)

[ ] 3.2 Crear src/app/game/engine/physics-rapier.ts
    - Wrapper para mundo Rapier 2D
    - Sincronización con Three.js (2D pos → 3D mesh)
    - Métodos: createRagdoll(), step(), sync()

[ ] 3.3 Implementar ragdoll en muerte de enemigo
    - Al morir, transicionar de animación a ragdoll
    - Colisión con paredes 3D proyectadas a 2D

[ ] 3.4 VERIFICAR: Enemigo muerto cae con ragdoll físico
    - SOLICITAR REVISIÓN HUMANA antes de commit
```

---

### FASE 4: Partículas GPU ⏱️ ~2 horas
**Prioridad: MEDIA**

```
[ ] 4.1 Instalar three.quarks
    npm install three.quarks

[ ] 4.2 Crear sistema de partículas
    - Muzzle flash (3-5 partículas)
    - Chispas de impacto (20-50 partículas)
    - Debris en explosiones

[ ] 4.3 Integrar con GameFeelOrchestrator

[ ] 4.4 VERIFICAR: Partículas en disparos e impactos
    - SOLICITAR REVISIÓN HUMANA antes de commit
```

---

### FASE 5: Sistema Skeletal 2D (Opcional/Avanzado) ⏱️ ~1 semana
**Prioridad: BAJA** - Solo si se requieren animaciones reactivas

```
[ ] 5.1 Crear estructura en src/app/game/engine/skeletal-2d/
    - Bone2D.ts
    - Skeleton2D.ts
    - AnimationPlayer.ts
    - MeshDeformer.ts

[ ] 5.2 Definir skeleton JSON para personaje

[ ] 5.3 Integrar con LitSprite2D

[ ] 5.4 VERIFICAR: Personaje con esqueleto animado
    - SOLICITAR REVISIÓN HUMANA antes de commit
```

---

### FASE 6: IA Local para NPCs (Zamir) ⏱️ ~4 horas
**Prioridad: MEDIA** - Conecta con RESEARCH_02_ZAMIR

```
[ ] 6.1 Instalar WebLLM
    npm install @mlc-ai/web-llm

[ ] 6.2 Crear src/app/game/npc/npc-dialogue.service.ts
    - NPCDialogueSystem con WebLLM
    - Fallback a API
    - Caché de respuestas

[ ] 6.3 Integrar con sistema existente de Zamir (RESEARCH_02)

[ ] 6.4 VERIFICAR: NPC responde con IA local
    - SOLICITAR REVISIÓN HUMANA antes de commit
```

---

## 🔧 REGLAS DE IMPLEMENTACIÓN

### Antes de CADA cambio:
1. **Leer** el archivo existente completo
2. **Entender** la integración con el sistema actual
3. **Planear** cambios mínimos necesarios
4. **Implementar** de forma incremental
5. **Verificar** que compila sin errores
6. **Solicitar revisión** al humano

### Formato de Solicitud de Revisión:
```
📝 SOLICITUD DE REVISIÓN

**Fase**: [número y nombre]
**Archivos modificados**:
- path/to/file1.ts (creado/modificado)
- path/to/file2.ts (modificado)

**Cambios realizados**:
- Descripción breve

**Cómo verificar**:
1. Paso 1
2. Paso 2

**⚠️ Esperando aprobación para commit**
```

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

| Documento | Contenido |
|-----------|-----------|
| `docs/innove2.5d/RESEARCH_03_2D_IN_3D_SYSTEM.md` | 2.5D + Animaciones + Rapier |
| `docs/innove2.5d/RESEARCH_06_WEBGPU_POTENTIAL.md` | WebGPU + WebLLM |
| `docs/innove2.5d/RESEARCH_08_GAME_FEEL.md` | Screen shake, hit stop, partículas |
| `docs/innove2.5d/CUSTOM_SKELETAL_SYSTEM_GUIDE.md` | Sistema skeletal propio |
| `docs/RESEARCH_02_ZAMIR_SHOP_INSTANCE.md` | NPC Zamir |

---

## 🚦 COMANDO DE INICIO

```
Inicia con FASE 1 (Game Feel) - es la que tiene mayor impacto 
inmediato con menor riesgo. Lee RESEARCH_08_GAME_FEEL.md primero.
```

---

## ✅ CRITERIOS DE ÉXITO

- [ ] El juego siente "juicier" con screen shake y hit stop
- [ ] Los sprites reaccionan a la iluminación dinámica
- [ ] Los enemigos tienen ragdoll físico al morir
- [ ] Las partículas mejoran el feedback visual
- [ ] El NPC Zamir puede conversar con IA local
- [ ] Todo funciona sin romper el gameplay existente
