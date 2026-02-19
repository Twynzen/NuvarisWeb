# WebGPU e IA local para NPCs en juegos web: guía técnica completa

**Es viable ejecutar NPCs con IA conversacional localmente en el navegador.** WebGPU alcanza el **80% del rendimiento nativo** para inferencia de LLMs, con modelos de 1-3B parámetros generando **40-90 tokens/segundo** en hardware moderno. La combinación Three.js WebGPURenderer + WebLLM permite renderizado 3D acelerado y diálogos de IA en tiempo real, aunque requiere planificación cuidadosa: WebGPU tiene **~78% de soporte global** (noviembre 2025), Three.js WebGPURenderer permanece experimental, y los modelos locales necesitan **1.5-4GB de VRAM**.

---

## Estado actual de WebGPU en navegadores

WebGPU alcanzó soporte universal en los principales navegadores el **25 de noviembre de 2025**, marcando un hito significativo para la computación GPU en web. Chrome y Edge fueron pioneros con soporte estable desde la **versión 113** (abril 2023), seguidos por Firefox **141** (julio 2025, solo Windows) y Safari **26** (junio 2025, requiere macOS Tahoe).

La adopción móvil presenta más limitaciones: Chrome para Android funciona desde la versión 121 con Android 12+, mientras iOS Safari requiere iOS 26+ y permanece detrás de flags experimentales. Firefox para Android no tiene fecha estimada de soporte estable.

### Detección de características y fallback robusto

```typescript
async function initGraphicsAPI(canvas: HTMLCanvasElement) {
  // Intentar WebGPU primero
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        const device = await adapter.requestDevice();
        console.log('Usando WebGPU');
        return { api: 'webgpu', device, adapter };
      }
    } catch (e) {
      console.warn('Inicialización WebGPU falló:', e);
    }
  }

  // Fallback a WebGL2
  const gl2 = canvas.getContext('webgl2');
  if (gl2) {
    console.log('Usando WebGL2 como fallback');
    return { api: 'webgl2', context: gl2 };
  }

  throw new Error('No hay API gráfica GPU disponible');
}
```

### Límites críticos de WebGPU

| Límite | Valor por defecto | Impacto |
|--------|------------------|---------|
| `maxBufferSize` | **256MB** | Limita tamaño de modelos ML |
| `maxStorageBufferBindingSize` | **128MB** | Afecta compute shaders |
| `maxTextureDimension2D` | **8192** | Texturas de juego |
| `maxComputeInvocationsPerWorkgroup` | **256** | Threads por workgroup |

Safari en móvil impone restricciones adicionales de **256MB-993MB** para buffers, limitando modelos de IA grandes.

---

## Three.js WebGPURenderer: estado y migración

El WebGPURenderer de Three.js está en **estado experimental/beta** - funcional pero no recomendado para producción todavía. Desde la versión **r171+**, se distribuye en un bundle separado (`three/webgpu`) con desarrollo activo pero documentación incompleta.

### Configuración básica con TypeScript

```typescript
import * as THREE from 'three/webgpu';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { Fn, time, sin, vec3 } from 'three/tsl';

async function initWebGPU(): Promise<void> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  // WebGPURenderer requiere inicialización async
  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  await renderer.init(); // ¡OBLIGATORIO!
  
  document.body.appendChild(renderer.domElement);

  // Material con shader TSL animado
  const material = new MeshStandardNodeMaterial({ metalness: 0.5, roughness: 0.5 });
  
  material.colorNode = Fn(() => {
    const t = time;
    return vec3(
      sin(t).mul(0.5).add(0.5),
      sin(t.add(2.0)).mul(0.5).add(0.5),
      sin(t.add(4.0)).mul(0.5).add(0.5)
    );
  })();

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  scene.add(mesh);

  renderer.setAnimationLoop(() => {
    mesh.rotation.x += 0.01;
    renderer.render(scene, camera);
  });
}

initWebGPU().catch(console.error);
```

### TSL: el nuevo lenguaje de shaders de Three.js

TSL (Three.js Shading Language) reemplaza los hacks de `onBeforeCompile` con una abstracción JavaScript que **transpila automáticamente a WGSL o GLSL** según el renderer. Esto permite escribir shaders una vez y ejecutarlos en WebGPU o WebGL.

```typescript
import { Fn, uniform, uv, texture, mix, positionLocal, normalLocal, sin, time } from 'three/tsl';

// Uniforms actualizables desde JavaScript
const uStrength = uniform(0.5);
const uColor1 = uniform(new THREE.Color(0xff0000));
const uColor2 = uniform(new THREE.Color(0x0000ff));

// Desplazamiento de vértices animado
const displacementNode = Fn(() => {
  const pos = positionLocal;
  const displacement = sin(pos.x.mul(10.0).add(time)).mul(uStrength);
  return pos.add(normalLocal.mul(displacement));
})();

// Mezcla de colores en fragment
const colorMixNode = Fn(() => {
  const mixFactor = sin(uv().x.mul(3.14).add(time)).mul(0.5).add(0.5);
  return mix(uColor1, uColor2, mixFactor);
})();

const material = new MeshStandardNodeMaterial();
material.positionNode = displacementNode;
material.colorNode = colorMixNode;
```

### Comparativa de rendimiento WebGL vs WebGPU

| Escenario | WebGL | WebGPU | Notas |
|-----------|-------|--------|-------|
| Escenas simples | Más rápido | Overhead inicial | WebGPU tiene costo de setup |
| **Alto número de draw calls** | CPU-bound | **2-5x más rápido** | Batching más eficiente |
| **Compute workloads** | No disponible | **Muy superior** | Shaders de cómputo nativos |
| Partículas (500k+) | Limitado | **Speedup significativo** | GPU compute |

**Recomendación**: Usar WebGPU para proyectos nuevos que necesiten compute shaders o muchos draw calls. Mantener WebGL para proyectos existentes que funcionan bien.

---

## Compute shaders y aceleración de cómputo

Los compute shaders de WebGPU permiten ejecutar cálculos de propósito general en la GPU, ideales para física de partículas, pathfinding, y simulaciones. Se escriben en **WGSL** (WebGPU Shading Language).

### Ejemplo: simulación de partículas en WGSL

```wgsl
struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  life: f32,
  mass: f32
};

struct SimParams {
  deltaTime: f32,
  gravity: vec3<f32>,
  bounds: vec3<f32>,
  damping: f32
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimParams;

@compute @workgroup_size(256)
fn simulate(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= arrayLength(&particles)) { return; }
  
  var p = particles[index];
  
  // Aplicar gravedad e integrar posición
  p.velocity += params.gravity * params.deltaTime;
  p.position += p.velocity * params.deltaTime;
  p.velocity *= params.damping;
  
  // Rebotar en límites
  for (var i = 0u; i < 3u; i++) {
    if (abs(p.position[i]) > params.bounds[i]) {
      p.position[i] = sign(p.position[i]) * params.bounds[i];
      p.velocity[i] *= -0.8;
    }
  }
  
  particles[index] = p;
}
```

### Integración con Three.js usando TSL

```typescript
import { Fn, instancedArray, compute, uniform, instanceIndex, If } from 'three/tsl';

const PARTICLE_COUNT = 100000;

// Buffers de almacenamiento
const positionBuffer = instancedArray(PARTICLE_COUNT, 'vec3');
const velocityBuffer = instancedArray(PARTICLE_COUNT, 'vec3');

const deltaTime = uniform(0.016);
const gravity = uniform(new THREE.Vector3(0, -9.8, 0));

// Definir compute shader con TSL
const updateParticles = Fn(() => {
  const index = instanceIndex;
  const pos = positionBuffer.element(index);
  const vel = velocityBuffer.element(index);
  
  vel.addAssign(gravity.mul(deltaTime));
  pos.addAssign(vel.mul(deltaTime));
  
  If(pos.y.lessThan(0), () => {
    pos.y.assign(0);
    vel.y.mulAssign(-0.8);
  });
  
  positionBuffer.element(index).assign(pos);
  velocityBuffer.element(index).assign(vel);
});

const computeNode = updateParticles().compute(PARTICLE_COUNT);

// En el loop de animación
renderer.compute(computeNode);
```

---

## ONNX Runtime Web con backend WebGPU

ONNX Runtime Web con WebGPU está **production-ready desde febrero 2024** (versión 1.17) y ofrece aceleraciones dramáticas para inferencia de ML.

| Modelo | Speedup vs WASM |
|--------|-----------------|
| Segment Anything encoder | **19x más rápido** |
| Segment Anything decoder | **3.8x más rápido** |
| Stable Diffusion Turbo | ~1 segundo en RTX 4090 |

```typescript
import * as ort from 'onnxruntime-web/webgpu';

async function runInference() {
  const session = await ort.InferenceSession.create('model.onnx', {
    executionProviders: ['webgpu'],
    graphOptimizationLevel: 'all'
  });
  
  const inputData = new Float32Array(1 * 3 * 224 * 224);
  const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 224, 224]);
  
  const results = await session.run({ input: inputTensor });
  return results.output.data;
}
```

**WebNN API** permanece experimental (requiere flags en Chrome/Edge) pero promete acceso a NPUs dedicados cuando madure.

---

## WebLLM para NPCs con IA local

WebLLM es la solución más madura para ejecutar LLMs en el navegador, alcanzando **71-80% del rendimiento nativo**. Mantenido por el equipo MLC AI, tiene **16.9k estrellas en GitHub** y actualizaciones frecuentes.

### Modelos recomendados para NPCs

| Modelo | VRAM | Velocidad | Uso recomendado |
|--------|------|-----------|-----------------|
| **Llama-3.2-1B-q4f16** | ~1.5GB | Muy rápida | NPCs simples (mercaderes, guardias) |
| **Qwen2-0.5B-q4f16** | ~945MB | Ultra rápida | Diálogos básicos, móvil |
| **Phi-3.5-mini-q4f16-1k** | ~2.5GB | Rápida | NPCs conversacionales |
| **Gemma-2-2b-q4f16** | ~1.9GB | Rápida | NPCs complejos (compañeros) |

### Benchmarks de rendimiento

| Hardware | Tokens/segundo | Notas |
|----------|---------------|-------|
| Apple M3 Max | **40-90 tok/s** | Excelente soporte Metal |
| NVIDIA RTX 3080/4080 | **30-60 tok/s** | Via Dawn backend |
| Intel Iris integrada | **5-15 tok/s** | Funcional pero limitado |
| AMD integrada | **8-20 tok/s** | Variable por drivers |

### Implementación completa con streaming

```typescript
import { CreateMLCEngine, MLCEngineInterface, InitProgressCallback } from "@mlc-ai/web-llm";

class NPCDialogueSystem {
  private engine: MLCEngineInterface | null = null;
  private isLoading = false;

  async initialize(onProgress: (percent: number, text: string) => void): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU no disponible');
      return false;
    }

    this.isLoading = true;
    
    const progressCallback: InitProgressCallback = (progress) => {
      onProgress(Math.round(progress.progress * 100), progress.text);
    };

    try {
      this.engine = await CreateMLCEngine(
        "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        { initProgressCallback: progressCallback }
      );
      this.isLoading = false;
      return true;
    } catch (error) {
      console.error('Error cargando modelo:', error);
      this.isLoading = false;
      return false;
    }
  }

  async generateResponse(
    npcPersonality: string,
    playerInput: string,
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
    onToken: (token: string) => void
  ): Promise<string> {
    if (!this.engine) throw new Error('Motor no inicializado');

    const messages = [
      { role: "system" as const, content: npcPersonality },
      ...conversationHistory.slice(-4), // Últimos 4 turnos
      { role: "user" as const, content: playerInput }
    ];

    const stream = await this.engine.chat.completions.create({
      messages,
      max_tokens: 60,
      temperature: 0.7,
      stream: true
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullResponse += delta;
      onToken(delta);
    }

    return fullResponse;
  }
}

// Uso en el juego
const npcSystem = new NPCDialogueSystem();

// Pre-cargar durante loading screen
await npcSystem.initialize((percent, text) => {
  updateLoadingBar(percent, `Cargando IA: ${text}`);
});

// Generar diálogo de NPC
const merchantPrompt = `Eres Bryn, un tabernero amigable en un RPG medieval. 
Personalidad: cálido, curioso, conoce los rumores locales.
REGLAS: Respuestas máximo 40 palabras. Mantén el personaje.`;

await npcSystem.generateResponse(
  merchantPrompt,
  "¿Qué hay de especial hoy?",
  [],
  (token) => appendToDialogueBox(token)
);
```

---

## Comparativa de soluciones LLM en navegador

| Característica | WebLLM | Transformers.js v3 | wllama |
|---------------|--------|-------------------|--------|
| **Backend** | WebGPU + WASM | WebGPU o WASM | Solo WASM |
| **Rendimiento WebGPU** | ~50-100 tok/s | ~40-80 tok/s | N/A (CPU) |
| **Rendimiento WASM** | N/A | ~10-30 tok/s | ~10-30 tok/s |
| **Soporte navegadores** | ~70% (WebGPU) | 95%+ (WASM fallback) | 95%+ |
| **Formato modelos** | MLC compilado | ONNX | GGUF |
| **JSON estructurado** | ✅ Nativo | ❌ Manual | ❌ Manual |
| **Ecosistema** | ~50 modelos | 1200+ modelos | Cualquier GGUF |
| **Ideal para** | Chat con max rendimiento | Diversidad de tareas ML | Máxima compatibilidad |

### Transformers.js con WebGPU

```typescript
import { pipeline } from "@huggingface/transformers";

const generator = await pipeline(
  "text-generation",
  "onnx-community/Qwen2.5-0.5B-Instruct",
  { device: "webgpu", dtype: "q4" }
);

const messages = [
  { role: "system", content: "Eres un herrero gruñón. Sé breve." },
  { role: "user", content: "¿Cuánto cuesta una espada?" }
];

const output = await generator(messages, { 
  max_new_tokens: 50,
  temperature: 0.7
});
```

---

## Arquitectura híbrida local + API

La estrategia óptima combina inferencia local para interacciones frecuentes con API cloud para momentos críticos.

| Escenario | Usar local | Usar API |
|-----------|------------|----------|
| Saludos de NPCs | ✅ | |
| Diálogo de misiones complejas | | ✅ |
| Conversaciones ambientales | ✅ | |
| Escenas narrativas críticas | | ✅ |
| Juego offline requerido | ✅ | |
| Dispositivos de gama baja | | ✅ |

### Sistema de fallback robusto

```typescript
class HybridNPCDialogue {
  private localEngine: MLCEngineInterface | null = null;
  private responseCache = new Map<string, string>();
  private useLocal = true;

  async initialize(): Promise<void> {
    try {
      this.localEngine = await CreateMLCEngine("Qwen2-0.5B-Instruct-q4f16_1-MLC");
    } catch {
      console.warn("Modelo local no disponible, usando API");
      this.useLocal = false;
    }
  }

  async getResponse(npcId: string, input: string, context: any[]): Promise<string> {
    // Verificar caché primero
    const cacheKey = `${npcId}:${input.toLowerCase().trim()}`;
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey)!;
    }

    try {
      const response = this.useLocal && this.localEngine
        ? await this.generateLocal(npcId, input, context)
        : await this.generateAPI(npcId, input, context);
      
      this.responseCache.set(cacheKey, response);
      return response;
    } catch {
      // Fallback final a respuestas pre-escritas
      return this.getScriptedFallback(npcId);
    }
  }

  private async generateLocal(npcId: string, input: string, context: any[]): Promise<string> {
    const result = await this.localEngine!.chat.completions.create({
      messages: [
        { role: "system", content: this.getNPCPrompt(npcId) },
        ...context.slice(-4),
        { role: "user", content: input }
      ],
      max_tokens: 50,
      temperature: 0.7
    });
    return result.choices[0].message.content || "";
  }

  private async generateAPI(npcId: string, input: string, context: any[]): Promise<string> {
    const response = await fetch('/api/npc-dialogue', {
      method: 'POST',
      body: JSON.stringify({ npcId, input, context })
    });
    return (await response.json()).content;
  }
}
```

---

## Optimizaciones específicas para NPCs de juego

### Prompts concisos para baja latencia

```typescript
// ❌ Malo: prompt verboso
const badPrompt = `Eres un herrero medieval llamado Garrett que ha trabajado 
en la aldea de Millbrook durante treinta años. Eres gruñón pero amable...`;

// ✅ Bueno: prompt conciso
const goodPrompt = `Herrero. Gruñón, breve. Máximo 2 oraciones.`;

// Aún mejor: plantillas pre-definidas
const NPCTemplates = {
  merchant: "Mercader. Amigable, menciona precios. Breve.",
  guard: "Guardia. Suspicaz, formal. Una oración máximo.",
  innkeeper: "Tabernero. Cálido, charlatán. Máximo 30 palabras."
};
```

### Gestión de ventana de contexto

```typescript
class ConversationManager {
  private conversations = new Map<string, Array<{role: string, content: string}>>();
  private readonly maxTurns = 6;

  addTurn(npcId: string, role: 'user' | 'assistant', content: string): void {
    if (!this.conversations.has(npcId)) {
      this.conversations.set(npcId, []);
    }
    
    const turns = this.conversations.get(npcId)!;
    turns.push({ role, content });
    
    // Ventana deslizante - mantener solo turnos recientes
    if (turns.length > this.maxTurns * 2) {
      this.conversations.set(npcId, turns.slice(-this.maxTurns * 2));
    }
  }

  getContext(npcId: string): Array<{role: string, content: string}> {
    return this.conversations.get(npcId) || [];
  }
}
```

### Pre-carga durante pantalla de loading

```typescript
class GameLoader {
  async load(): Promise<void> {
    // Iniciar descarga del modelo en paralelo con otros assets
    const modelPromise = this.preloadNPCModel();
    const assetsPromise = this.loadGameAssets();
    const audioPromise = this.loadAudio();
    
    await assetsPromise;
    showLoadingScreen("Cargando mundo...");
    
    // El modelo puede continuar cargando
    await Promise.all([audioPromise, modelPromise]);
    hideLoadingScreen();
  }

  private async preloadNPCModel(): Promise<void> {
    const cache = await caches.open('npc-models-v1');
    const cached = await cache.match('model-weights');
    
    if (cached) {
      console.log("Cargando modelo desde caché");
      // Cargas subsecuentes: 5-30 segundos
    } else {
      // Primera carga: 30s - 5+ minutos según modelo/red
      console.log("Descargando modelo por primera vez");
    }
  }
}
```

---

## Consideraciones de UX

### Indicador de "pensando" con streaming

```typescript
function NPCDialogueBox({ npcId }: { npcId: string }) {
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState("");

  const handlePlayerInput = async (input: string) => {
    setIsThinking(true);
    setResponse("");

    try {
      await npcSystem.generateResponse(
        getNPCPersonality(npcId),
        input,
        conversationHistory,
        (token) => {
          setIsThinking(false); // Ocultar indicador tras primer token
          setResponse(prev => prev + token);
        }
      );
    } catch {
      setResponse(getScriptedFallback(npcId));
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <DialogueBox>
      {isThinking && <ThinkingDots />}
      {response && <TypewriterText text={response} />}
    </DialogueBox>
  );
}
```

### Detección de capacidades y degradación graceful

```typescript
async function detectAICapabilities(): Promise<'webgpu' | 'wasm' | 'scripted'> {
  // Verificar WebGPU
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) return 'webgpu';
  }
  
  // Verificar WASM SIMD
  if (typeof WebAssembly?.validate === 'function') {
    return 'wasm';
  }
  
  return 'scripted';
}

function getRecommendedModel(capability: string) {
  switch (capability) {
    case 'webgpu': return { model: 'Qwen2-1.5B-q4f16', backend: 'webllm' };
    case 'wasm': return { model: 'TinyLlama-1.1B-Q4_K_M', backend: 'wllama' };
    default: return { model: null, backend: 'scripted' };
  }
}
```

---

## Recomendaciones finales por caso de uso

### Para juegos indie pequeños
- **Tecnología**: Transformers.js + Qwen2-0.5B (WebGPU primario, WASM fallback)
- **VRAM**: ~1GB
- **Estrategia**: Pre-cachear modelo durante instalación, limitar contexto a 3-4 turnos

### Para juegos de complejidad media
- **Tecnología**: WebLLM + Qwen2-1.5B
- **VRAM**: ~1.6GB
- **Estrategia**: Arquitectura híbrida local+API, cachear respuestas comunes

### Para juegos AAA/complejos
- **Tecnología**: Híbrido con múltiples niveles de modelos
- **Estrategia**: Local para NPCs ambientales, API para personajes principales, pre-generar diálogos críticos

### Guía de tamaño de modelo por dispositivo

| Dispositivo | Modelo máximo | Recomendado |
|-------------|---------------|-------------|
| Móvil gama media | 500MB | Qwen2-0.5B-q4 |
| Móvil flagship | 1GB | TinyLlama-1.1B-q4 |
| Desktop GPU integrada | 1.5GB | Qwen2-1.5B-q4 |
| Desktop GPU dedicada | 3GB+ | Phi-3-mini-q4 |

---

## Conclusión

La ejecución de NPCs con IA conversacional en el navegador es **técnicamente viable y práctica** para juegos 2.5D en 2025. **WebLLM con modelos de 1-3B parámetros** ofrece el mejor equilibrio entre rendimiento y calidad, mientras **Three.js WebGPURenderer** proporciona renderizado acelerado con compute shaders para física y simulaciones.

Los principales desafíos son el soporte limitado en móviles (iOS Safari requiere iOS 26+), los tiempos de carga inicial (30 segundos a 5 minutos para modelos de 1-4GB), y la fragmentación de navegadores que exige implementar fallbacks robustos. La arquitectura híbrida que combina inferencia local para el 80% de interacciones con API cloud para momentos críticos ofrece el mejor balance de experiencia de usuario, privacidad y costos operativos.