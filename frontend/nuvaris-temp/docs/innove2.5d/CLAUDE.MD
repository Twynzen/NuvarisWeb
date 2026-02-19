# 🎮 EVOLUTION GAME V2 - CLAUDE.MD
## Super Mapa de Trabajo para QDT (Quantum Drift Tartarus)

> **Este documento es la guía maestra para la evolución del juego.** 
> Cada cambio importante debe reflejarse aquí. Antes de cada implementación, lee la documentación correspondiente.

---

## 📊 ESTADO ACTUAL DEL PROYECTO

| Componente | Estado | Versión |
|------------|--------|---------|
| Angular + Three.js | ✅ Funcionando | 18+ |
| Sprites 2D | ⚠️ Básico (THREE.Sprite) | v1 |
| Física | ⚠️ Colisiones simples | v1 |
| Animaciones | ⚠️ PNG sequences | v1 |
| Audio | ✅ Web Audio API | v1 |
| NPCs | ❌ Scripted básico | v0 |
| Game Feel | ❌ Sin implementar | v0 |

---

## 🗺️ DOCUMENTACIÓN DISPONIBLE

### Core 2.5D (Prioridad ALTA)
| Documento | Contenido | Tamaño |
|-----------|-----------|--------|
| [RESEARCH_03_2D_IN_3D_SYSTEM.md](./RESEARCH_03_2D_IN_3D_SYSTEM.md) | Sistema 2.5D + Rapier.js + Spine | 16KB |
| [RESEARCH_08_GAME_FEEL.md](./RESEARCH_08_GAME_FEEL.md) | Screen shake, hit stop, partículas, audio | 23KB |
| [CUSTOM_SKELETAL_SYSTEM_GUIDE.md](./CUSTOM_SKELETAL_SYSTEM_GUIDE.md) | Sistema skeletal 2D propio (alt. a Spine) | 25KB |

### WebGPU + IA (Prioridad MEDIA)
| Documento | Contenido | Tamaño |
|-----------|-----------|--------|
| [RESEARCH_06_WEBGPU_POTENTIAL.md](./RESEARCH_06_WEBGPU_POTENTIAL.md) | WebGPU, compute shaders, WebLLM | 23KB |

### NPCs con IA - Zamir (Prioridad BAJA - Última fase)
| Documento | Contenido | Tamaño |
|-----------|-----------|--------|
| [SERVERNPCS.MD](./SERVERNPCS.MD) | Servidor simulación masiva NPCs (Ray + FastAPI) | 55KB |
| [GAMEPLAYNPC.MD](./GAMEPLAYNPC.MD) | Implementación NPC en gameplay (WebLLM + RAG) | 20KB |

### Guías de Referencia
| Documento | Contenido |
|-----------|-----------|
| [RESEARCH_INVESTIGATION_GUIDE.md](./RESEARCH_INVESTIGATION_GUIDE.md) | Guía original de investigación |
| [IMPLEMENTATION_PROMPT.md](./IMPLEMENTATION_PROMPT.md) | Prompt para implementación incremental |

---

## 🚀 ROADMAP EVOLUTION V2

```
╔═══════════════════════════════════════════════════════════════════╗
║                    EVOLUTION GAME V2 ROADMAP                       ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  FASE 1: GAME FEEL (1-2 días)                                     ║
║  ├── [ ] Screen Shake (trauma-based)                              ║
║  ├── [ ] Hit Stop (freeze frames)                                 ║
║  ├── [ ] Partículas básicas                                       ║
║  └── [ ] Audio ducking                                            ║
║           📄 Doc: RESEARCH_08_GAME_FEEL.md                        ║
║                                                                    ║
║  FASE 2: LIT SPRITES (2-3 días)                                   ║
║  ├── [ ] Migrar de THREE.Sprite a Mesh+Plane                      ║
║  ├── [ ] MeshStandardMaterial con iluminación                     ║
║  ├── [ ] Sombras dinámicas                                        ║
║  └── [ ] Billboard manual                                         ║
║           📄 Doc: RESEARCH_03_2D_IN_3D_SYSTEM.md                  ║
║                                                                    ║
║  FASE 3: FÍSICA RAPIER.JS (3-4 días)                              ║
║  ├── [ ] Instalar @dimforge/rapier2d-compat                       ║
║  ├── [ ] Wrapper física 2D                                        ║
║  ├── [ ] Ragdoll en muerte de enemigos                            ║
║  └── [ ] Colisión con geometría 3D                                ║
║           📄 Doc: RESEARCH_03_2D_IN_3D_SYSTEM.md (sección Rapier) ║
║                                                                    ║
║  FASE 4: PARTÍCULAS GPU (2 días)                                  ║
║  ├── [ ] Instalar three.quarks                                    ║
║  ├── [ ] Muzzle flash                                             ║
║  ├── [ ] Chispas de impacto                                       ║
║  └── [ ] Debris en explosiones                                    ║
║           📄 Doc: RESEARCH_08_GAME_FEEL.md (sección partículas)   ║
║                                                                    ║
║  FASE 5: ANIMACIONES REACTIVAS (1 semana) [OPCIONAL]              ║
║  ├── [ ] Sistema skeletal propio                                  ║
║  ├── [ ] Bone2D + Skeleton2D                                      ║
║  ├── [ ] AnimationPlayer con keyframes                            ║
║  └── [ ] MeshDeformer (skinning 2D)                               ║
║           📄 Doc: CUSTOM_SKELETAL_SYSTEM_GUIDE.md                 ║
║                                                                    ║
║  FASE 6: WEBGPU (2-3 días) [EXPERIMENTAL]                         ║
║  ├── [ ] Migrar a WebGPURenderer                                  ║
║  ├── [ ] TSL shaders                                              ║
║  └── [ ] Compute shaders para física                              ║
║           📄 Doc: RESEARCH_06_WEBGPU_POTENTIAL.md                 ║
║                                                                    ║
║  FASE 7: NPC ZAMIR (1-2 semanas) [ÚLTIMA]                         ║
║  ├── [ ] Instalar @mlc-ai/web-llm                                 ║
║  ├── [ ] NPCDialogueService                                       ║
║  ├── [ ] Sistema de memoria (IndexedDB + embeddings)              ║
║  ├── [ ] Routing híbrido (IA + scripted)                          ║
║  └── [ ] [EXTRA] Servidor simulación masiva                       ║
║           📄 Docs: GAMEPLAYNPC.MD + SERVERNPCS.MD                 ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### FASE 1: Game Feel 🎯
```
[ ] 1.1 Crear src/app/game/engine/game-feel/
    [ ] trauma-screen-shake.ts
    [ ] hit-stop-manager.ts
    [ ] game-feel-orchestrator.ts

[ ] 1.2 Integrar en three-engine.service.ts
    [ ] Import GameFeelOrchestrator
    [ ] Llamar en disparos
    [ ] Llamar en impactos

[ ] 1.3 Verificar funcionamiento
    [ ] Disparar y ver screen shake
    [ ] Impactar enemigo y ver hit stop

🔴 SOLICITAR REVISIÓN HUMANA ANTES DE COMMIT
```

### FASE 2: Lit Sprites 💡
```
[ ] 2.1 Crear src/app/game/engine/lit-sprite.ts
    [ ] Clase LitSprite2D
    [ ] Mesh + PlaneGeometry
    [ ] MeshStandardMaterial
    [ ] Billboard en update()

[ ] 2.2 Migrar player.three.ts
    [ ] Cambiar THREE.Sprite por LitSprite2D
    [ ] Mantener SpriteAnimator

[ ] 2.3 Configurar iluminación
    [ ] PointLight siguiendo jugador
    [ ] Sombras

🔴 SOLICITAR REVISIÓN HUMANA ANTES DE COMMIT
```

### FASE 3: Física Rapier.js 🦴
```
[ ] 3.1 Instalar dependencia
    npm install @dimforge/rapier2d-compat
    ⚠️ REQUIERE APROBACIÓN

[ ] 3.2 Crear src/app/game/engine/physics/
    [ ] rapier-world.ts
    [ ] ragdoll-factory.ts
    [ ] physics-sync.ts

[ ] 3.3 Implementar ragdoll
    [ ] En muerte de enemigo
    [ ] Transición animación → ragdoll

🔴 SOLICITAR REVISIÓN HUMANA ANTES DE COMMIT
```

### FASE 4-7: [Continuar similar...]

---

## 🔧 FLUJO DE TRABAJO COLABORATIVO

> ⚠️ **TRABAJO EN EQUIPO**: Este proyecto se desarrolla de forma colaborativa.
> La IA implementa, el humano prueba y valida, y solo el humano hace push.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO POR CADA FASE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1️⃣  IA LEE documentación correspondiente                     │
│              ↓                                                  │
│   2️⃣  IA IMPLEMENTA cambios incrementales                      │
│              ↓                                                  │
│   3️⃣  IA VERIFICA que compila sin errores                      │
│              ↓                                                  │
│   4️⃣  IA SOLICITA REVISIÓN con instrucciones de prueba         │
│              ↓                                                  │
│   5️⃣  HUMANO PRUEBA en el navegador (localhost:4200)           │
│              ↓                                                  │
│   6️⃣  HUMANO DA FEEDBACK (aprobar / pedir cambios)             │
│              ↓                                                  │
│   7️⃣  Si aprobado → COMMIT JUNTOS                              │
│              ↓                                                  │
│   8️⃣  HUMANO HACE PUSH al repositorio                          │
│              ↓                                                  │
│   9️⃣  SIGUIENTE FASE                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Reglas de Implementación:
1. **Leer** el documento correspondiente antes de cada fase
2. **Entender** cómo se integra con el código existente
3. **Implementar** de forma incremental (pequeños cambios)
4. **Verificar** que compila sin errores antes de pedir revisión
5. **Esperar feedback** del humano antes de continuar

### Formato de Solicitud de Revisión:
```markdown
📝 SOLICITUD DE REVISIÓN - FASE [X]

**Archivos modificados**:
- path/to/file.ts (creado/modificado)

**Cambios realizados**:
- Descripción breve

**Cómo verificar**:
1. Paso 1
2. Paso 2

⚠️ ESPERANDO APROBACIÓN PARA COMMIT
```

---

## 📈 PROGRESO

| Fecha | Fase | Estado | Notas |
|-------|------|--------|-------|
| 2024-12-11 | Setup | ✅ | Documentación completa |
| - | Fase 1 | ⏳ | Pendiente |
| - | Fase 2 | ⏳ | Pendiente |
| - | Fase 3 | ⏳ | Pendiente |
| - | Fase 4 | ⏳ | Pendiente |
| - | Fase 5 | ⏳ | Opcional |
| - | Fase 6 | ⏳ | Experimental |
| - | Fase 7 | ⏳ | Última |

---

## 🎯 COMANDO PARA INICIAR

```
Para comenzar, dime: "Inicia Fase 1"

Leeré RESEARCH_08_GAME_FEEL.md y comenzaré a implementar 
el sistema de screen shake y hit stop.
```

---

## 📁 ESTRUCTURA DE ARCHIVOS ESPERADA

```
src/app/game/
├── engine/
│   ├── game-feel/                    ← FASE 1
│   │   ├── trauma-screen-shake.ts
│   │   ├── hit-stop-manager.ts
│   │   └── game-feel-orchestrator.ts
│   │
│   ├── lit-sprite.ts                 ← FASE 2
│   │
│   ├── physics/                      ← FASE 3
│   │   ├── rapier-world.ts
│   │   ├── ragdoll-factory.ts
│   │   └── physics-sync.ts
│   │
│   ├── particles/                    ← FASE 4
│   │   └── quarks-effects.ts
│   │
│   └── skeletal-2d/                  ← FASE 5 (opcional)
│       ├── bone-2d.ts
│       ├── skeleton-2d.ts
│       ├── animation-player.ts
│       └── mesh-deformer.ts
│
├── npc/                              ← FASE 7 (última)
│   ├── npc-dialogue.service.ts
│   ├── npc-memory.service.ts
│   └── zamir/
│       ├── zamir-mind.json
│       └── zamir.npc.ts
│
└── entities/
    ├── player.three.ts              ← Modificar Fase 2
    └── enemy.three.ts               ← Modificar Fase 3
```

---

> **NOTA IMPORTANTE**: Este documento se actualiza después de cada fase completada. 
> El humano hace push después de cada revisión aprobada.
