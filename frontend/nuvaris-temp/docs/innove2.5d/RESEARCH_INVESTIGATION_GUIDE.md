# 🔬 RESEARCH INVESTIGATION GUIDE
## Sistema Revolucionario 2.5D para QDT

> **Objetivo**: Definir el camino tecnológico correcto para crear un juego 2.5D revolucionario donde sprites 2D interactúan dinámicamente con un mundo 3D mediante físicas, animaciones reactivas, y NPCs con IA local.

---

## 📋 CONTEXTO DEL PROYECTO ACTUAL

### Stack Tecnológico Existente
- **Framework**: Angular + TypeScriptQ
- **Renderizado 3D**: Three.js (WebGL)
- **Sprites**: PNG sequences (30 frames por animación)
- **Audio**: Web Audio API
- **Entorno**: Navegador web moderno

### Limitaciones Actuales Identificadas
1. Sprites con animaciones predefinidas (no reactivas)
2. Colisiones básicas (círculos/cajas)
3. Sin físicas de ragdoll
4. NPCs con comportamiento scripted
5. Sin aceleración GPU para IA

---

## 🎯 ÁREAS DE INVESTIGACIÓN

### ÁREA 1: Sistema 2.5D Profesional
> ¿Cómo hacer que sprites 2D se integren perfectamente en un mundo 3D?

#### Preguntas Clave
- [ ] ¿Mantener sprites como billboards o convertir a meshes planos?
- [ ] ¿Cómo manejar depth sorting correctamente?
- [ ] ¿Qué técnica usan juegos como Hades, Dead Cells, Octopath Traveler?
- [ ] ¿Shadows y lighting en sprites 2D?
- [ ] ¿Normal maps para sprites 2D?

#### Tecnologías a Investigar
| Tecnología | Descripción | Investigar |
|------------|-------------|------------|
| **Sprite Stacking** | Múltiples capas de sprites para efecto 3D | Viabilidad en Three.js |
| **Normal Maps 2D** | Iluminación dinámica en sprites | Generación automática |
| **Depth Peeling** | Transparencia correcta | Performance impact |
| **Impostor Billboards** | Pre-renderizado de ángulos | Setup pipeline |

#### Referencias a Analizar
- [ ] Octopath Traveler (HD-2D system)
- [ ] Dead Cells (2D in 3D lighting)
- [ ] Hades (isometric 2D/3D blend)
- [ ] Paper Mario (2D in 3D worlds)

---

### ÁREA 2: Animaciones Reactivas Dinámicas
> ¿Cómo generar animaciones basadas en lo que sucede en el entorno?

#### Preguntas Clave
- [ ] ¿Interpolación procedural entre poses?
- [ ] ¿Inverse Kinematics (IK) en 2D?
- [ ] ¿Blending de animaciones en tiempo real?
- [ ] ¿Deformación de sprites basada en físicas?

#### Tecnologías a Investigar
| Tecnología | Descripción | Investigar |
|------------|-------------|------------|
| **Spine Runtime** | Animación skeletal 2D | Licencia, integración Three.js |
| **DragonBones** | Alternativa open source a Spine | Capacidades, performance |
| **Live2D** | Deformación de mesh 2D | Uso en tiempo real |
| **Procedural Animation** | IK, motion matching | Implementación JS |

#### Preguntas Específicas para Spine
- ¿Costo de licencia para web?
- ¿Runtime JavaScript disponible?
- ¿Integra con Three.js?
- ¿Soporta mesh deformation?
- ¿Soporta IK constraints?
- ¿Physics/ragdoll built-in?

---

### ÁREA 3: Sistema Ragdoll 2D en Mundo 3D
> ¿Cómo implementar físicas de ragdoll en sprites 2D que interactúen con geometría 3D?

#### Preguntas Clave
- [ ] ¿Ragdoll puramente 2D proyectado en 3D?
- [ ] ¿O ragdoll 3D renderizado como sprite?
- [ ] ¿Cómo colisiona con paredes 3D?
- [ ] ¿Performance de física en navegador?

#### Tecnologías a Investigar
| Tecnología | Descripción | Investigar |
|------------|-------------|------------|
| **Rapier.js** | Motor de física 2D/3D en Rust→WASM | Performance, ragdoll support |
| **Matter.js** | Física 2D pura JavaScript | Integración Three.js |
| **Cannon-es** | Física 3D para Three.js | Ragdoll constraints |
| **Box2D WASM** | Port de Box2D a WebAssembly | Performance vs Matter.js |
| **Jolt Physics** | Nueva librería 3D | Features, Three.js support |

---

### ÁREA 4: WebGPU y Aceleración de Cómputo
> ¿Cómo usar WebGPU para IA, físicas, y efectos visuales?

#### Preguntas Clave
- [ ] ¿Soporte actual de WebGPU en navegadores?
- [ ] ¿Three.js tiene renderer WebGPU estable?
- [ ] ¿Qué podemos offloadear a GPU compute shaders?
- [ ] ¿Es viable ejecutar modelos de IA en WebGPU?

#### Tecnologías a Investigar
| Tecnología | Descripción | Investigar |
|------------|-------------|------------|
| **Three.js WebGPURenderer** | Renderer alternativo | Estabilidad, features |
| **WebGPU Compute** | Shaders de cómputo general | Physics, AI inference |
| **ONNX Runtime Web** | Ejecutar modelos ML | WebGPU backend |
| **WebNN** | API nativa de ML | Soporte, vs WebGPU |
| **Transformers.js** | Hugging Face en browser | Performance, modelos |

---

### ÁREA 5: NPC con IA Local
> ¿Cómo ejecutar modelos de lenguaje localmente para NPCs inteligentes?

#### Preguntas Clave
- [ ] ¿Qué tamaño de modelo cabe en memoria del navegador?
- [ ] ¿Latencia aceptable para conversación natural?
- [ ] ¿Cuánto pesa el modelo en caché?
- [ ] ¿API externa vs local: cuándo usar cada uno?

#### Tecnologías a Investigar
| Tecnología | Descripción | Investigar |
|------------|-------------|------------|
| **llama.cpp WASM** | LLaMA en navegador | Modelos pequeños (1-3B params) |
| **WebLLM** | Runtime de LLM optimizado | Performance, modelos soportados |
| **Transformers.js** | Pipeline de HuggingFace | Modelos conversacionales |
| **OpenAI API** | GPT-4/3.5 como fallback | Costo, latencia |
| **Ollama** | LLM local en servidor | Self-hosted option |

#### Decisión Local vs API
| Escenario | Recomendación | Razón |
|-----------|---------------|-------|
| Frases cortas NPC | Local (WebLLM) | Baja latencia, offline |
| Conversación compleja | API (GPT-4) | Mejor calidad |
| Lore generation | API (una vez) | Cache resultado |
| Reacciones rápidas | Rules-based | Sin LLM |

---

### ÁREA 6: Sensación de Disparo y Feedback
> ¿Cómo hacer que los disparos se sientan impactantes?

#### Preguntas Clave
- [ ] ¿Screen shake paramétrico?
- [ ] ¿Hit stop / freeze frames?
- [ ] ¿Partículas GPU optimizadas?
- [ ] ¿Audio layering y ducking?
- [ ] ¿Haptic feedback (gamepad)?

#### Tecnologías a Investigar
| Tecnología | Descripción | Investigar |
|------------|-------------|------------|
| **GPU Particles** | Millones de partículas | Three.js instancing |
| **Gamepad API** | Vibración, analog | Soporte Firefox/Chrome |
| **Web Audio** | Spatial audio, effects | 3D positioning |
| **Post-processing** | Bloom, aberration | Performance cost |

---

## 📊 MATRIZ DE PRIORIZACIÓN

Para cada tecnología, evaluar:

| Criterio | Peso |
|----------|------|
| Impacto visual | 3x |
| Viabilidad técnica | 2x |
| Esfuerzo implementación | 1x |
| Compatibilidad browser | 2x |

---

## 📝 ESTRUCTURA DEL OUTPUT DE INVESTIGACIÓN

Para cada área investigada, documentar:

```markdown
## [ÁREA]: [Nombre]

### Conclusión Ejecutiva (1 párrafo)

### Tecnología Seleccionada
- **Nombre**: 
- **Razón**: 
- **Alternativa si falla**: 

### Implementación
1. Instalación/setup
2. Integración con proyecto actual
3. Código ejemplo mínimo

### Limitaciones Conocidas

### Recursos
- Documentación oficial: [link]
- Tutorial recomendado: [link]
- Ejemplo funcional: [link]

### Timeline Estimado
- Prototipo: X días
- Producción: X días
```

---

## 🚀 ORDEN DE INVESTIGACIÓN SUGERIDO

**Fase 1** (Fundamentos): Áreas 1, 2, 3
- Sistema 2.5D → Física Ragdoll → Animaciones Reactivas

**Fase 2** (Polish): Área 6
- Feedback de Disparo

**Fase 3** (Innovación): Áreas 4, 5
- WebGPU → IA Local NPC

---

## 🔍 PREGUNTAS FINALES DE VALIDACIÓN

Antes de implementar cada tecnología, responder:

1. **¿Funciona en los navegadores objetivo?** (Chrome, Firefox, Edge)
2. **¿Cuál es el fallback si no funciona?**
3. **¿Afecta el tiempo de carga inicial?**
4. **¿Cuánta memoria consume?**
5. **¿Es mantenible a largo plazo?**
6. **¿Hay comunidad/soporte activo?**
7. **¿Cuál es el costo (licencias, APIs)?**

---

## 📁 ARCHIVOS DE OUTPUT ESPERADOS

```
docs/
├── RESEARCH_03_2D_IN_3D_SYSTEM.md      ← Sistema 2.5D profesional
├── RESEARCH_04_PHYSICS_RAGDOLL.md      ← Física y ragdoll
├── RESEARCH_05_REACTIVE_ANIMATIONS.md  ← Animaciones dinámicas
├── RESEARCH_06_WEBGPU_POTENTIAL.md     ← WebGPU y compute
├── RESEARCH_07_LOCAL_AI_NPCs.md        ← IA local vs API
└── RESEARCH_08_GAME_FEEL.md            ← Feedback y sensaciones
```

Cada archivo debe contener:
- Hallazgos de investigación
- Código de ejemplo funcional
- Decisión final con justificación
- Plan de implementación paso a paso

---

> **NOTA**: Esta guía es un INSTRUCTIVO para generar investigación profunda. El objetivo es producir documentos técnicos claros que permitan implementar cada sistema con confianza.
