# Building intelligent NPC dialogue with WebLLM in browser games

**WebLLM enables genuinely intelligent, context-aware NPC conversations running entirely in the browser**, reaching up to 80% native GPU performance with 4-bit quantized models generating ~90 tokens/second on modern hardware. For a Spanish-speaking bartender NPC like "Zamir Talaquett," **Qwen2.5-1.5B-Instruct emerges as the optimal choice**—offering excellent multilingual support across 29+ languages with a modest 1.2-1.8GB VRAM footprint. Combined with browser-based RAG using Transformers.js for contextual memory and a hybrid trigger-based dialogue system, you can create NPCs that feel genuinely alive while gracefully degrading to scripted responses when WebGPU isn't available.

This guide provides complete implementation details for building such a system in Angular + Three.js, drawing from production approaches used by Inworld AI, Ubisoft's NEO NPCs, and insights from Stanford's Generative Agents research.

---

## WebLLM brings powerful LLMs to the browser

WebLLM (@mlc-ai/web-llm) leverages WebGPU for hardware-accelerated inference directly in browsers. Installation is straightforward via npm, and integration with Angular follows a reactive signal-based service pattern:

```typescript
// webllm.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { CreateMLCEngine, MLCEngine, ChatCompletionMessageParam } from '@mlc-ai/web-llm';

@Injectable({ providedIn: 'root' })
export class WebLLMService {
  private engine: MLCEngine | null = null;
  
  readonly loadingProgress = signal<number>(0);
  readonly isLoaded = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);

  async initializeModel(modelId: string): Promise<void> {
    this.engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        this.loadingProgress.set(Math.round(report.progress * 100));
      }
    });
    this.isLoaded.set(true);
  }

  async generateNPCDialogue(
    systemPrompt: string,
    userInput: string
  ): Promise<string> {
    if (!this.engine) throw new Error('Model not loaded');
    
    this.isGenerating.set(true);
    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        temperature: 0.8,
        max_tokens: 150,
        stream: false
      });
      return response.choices[0]?.message?.content || '';
    } finally {
      this.isGenerating.set(false);
    }
  }
}
```

For production games, **use Web Workers** to prevent UI blocking during inference. WebLLM provides `CreateWebWorkerMLCEngine` specifically for this purpose, keeping the main thread responsive while the model generates responses.

### Model selection determines both quality and performance

| Model | VRAM (q4f16) | Speed | Spanish Support | Best For |
|-------|--------------|-------|-----------------|----------|
| **Qwen2.5-1.5B-Instruct** | ~1.5 GB | 60-90 tok/s | ✅ Excellent (29 languages) | Spanish NPC dialogue |
| **Llama-3.2-1B-Instruct** | ~1.2 GB | 70-100 tok/s | ✅ Official | Multilingual, smaller footprint |
| **Phi-3-mini (3.8B)** | ~2.5 GB | 40-60 tok/s | ⚠️ Limited | Complex reasoning, puzzles |
| **SmolLM2-1.7B** | ~1.5 GB | 60-80 tok/s | ⚠️ Limited | General English NPCs |
| **SmolLM2-360M** | ~350 MB | 100+ tok/s | ⚠️ Limited | Ultra-fast simple responses |

**For Zamir Talaquett**, Qwen2.5-1.5B-Instruct is the clear winner—it handles Spanish with native-level fluency across its **29+ supported languages** and provides strong role-playing capabilities. The quantized q4f16 variant runs comfortably on mid-range GPUs while maintaining response quality.

### WebGPU browser support has reached critical mass

As of December 2025, WebGPU is stable across major browsers: **Chrome 113+**, **Edge 113+**, **Firefox 141+** (Windows stable), and **Safari 26+**. Android support requires Android 12+ with Qualcomm or ARM GPUs. Detection code should always check both navigator.gpu availability and successful adapter acquisition:

```typescript
async function checkWebGPUSupport(): Promise<{ supported: boolean; error?: string }> {
  if (!navigator.gpu) return { supported: false, error: 'WebGPU not available' };
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter ? { supported: true } : { supported: false, error: 'No GPU adapter' };
  } catch (e) {
    return { supported: false, error: String(e) };
  }
}
```

---

## Browser-based RAG gives NPCs contextual memory

Retrieval-Augmented Generation running entirely in-browser enables NPCs to recall past conversations, player actions, and world events. **Transformers.js** (@huggingface/transformers) provides embedding generation, while IndexedDB stores the vectors persistently.

### Embedding model selection balances speed and quality

| Model | ONNX Size | Embedding Time | Quality (MTEB) | Best For |
|-------|-----------|----------------|----------------|----------|
| **all-MiniLM-L6-v2** | ~23 MB | 170-200ms | 56-58 | Real-time NPC dialogue |
| **gte-small** | ~34 MB | 340-400ms | 61+ | Higher quality, worth the tradeoff |
| **all-mpnet-base-v2** | ~110 MB | 800-1000ms | 63+ | Quality-critical applications |

For game NPCs, **all-MiniLM-L6-v2** hits the sweet spot—fast enough for real-time conversation while producing embeddings sufficient for semantic memory retrieval.

```javascript
import { pipeline } from '@huggingface/transformers';

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function getEmbedding(text) {
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
```

### IndexedDB stores NPC memories efficiently

Structure your NPC memory system with separate stores for memories and embeddings, enabling efficient retrieval by NPC ID:

```javascript
class NPCMemoryDB {
  async addMemory(npcId, content, type, metadata = {}) {
    const vector = await this.embed(content);
    
    const tx = this.db.transaction(['memories', 'embeddings'], 'readwrite');
    const memoryId = await tx.objectStore('memories').add({
      npcId, type, content, metadata, timestamp: Date.now()
    });
    await tx.objectStore('embeddings').add({ memoryId, npcId, vector });
    
    return memoryId;
  }
  
  async searchMemories(npcId, query, topK = 5) {
    const queryVec = await this.embed(query);
    const embeddings = await this.getEmbeddingsByNPC(npcId);
    
    return embeddings
      .map(emb => ({ memoryId: emb.memoryId, similarity: this.dotProduct(queryVec, emb.vector) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
  
  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
}
```

### Performance limits define architectural boundaries

Browser-based vector search works well up to **10,000-50,000 embeddings** before latency becomes noticeable. Memory estimates for 384-dimensional Float32 vectors:

- **1,000 embeddings**: ~1.5 MB storage, ~10ms search
- **10,000 embeddings**: ~15 MB storage, ~90ms search
- **50,000 embeddings**: ~75 MB storage, ~300ms search

**Recommendation**: Limit each NPC to 500-2,000 memories, implementing LRU eviction for older, less important interactions. Load embeddings on-demand when players approach specific NPCs.

---

## Hybrid dialogue routing maximizes quality and reliability

The most effective NPC dialogue systems use **trigger-based routing** to select between predefined responses (for critical game content) and AI-generated dialogue (for dynamic conversation). This ensures quest-critical information is always accurate while allowing NPCs to improvise naturally.

### Intent classification determines response type

```
Player Input
    ↓
Intent Classification (embedding similarity)
    ↓
┌────────────────┬────────────────┬────────────────┐
│ HIGH CONF ≥85% │ MEDIUM 60-85%  │ LOW CONF <60%  │
│ → PREDEFINED   │ → AI GENERATE  │ → DEFLECT      │
└────────────────┴────────────────┴────────────────┘
```

Route **high-confidence** matches to predefined responses for critical game mechanics (orders, quest triggers, directions). Use **AI generation** for medium-confidence conversational topics where the NPC should improvise. **Low-confidence** inputs trigger graceful in-character deflection.

```python
def classify_intent(user_input, intent_embeddings, threshold=0.75):
    input_embedding = embed(user_input)
    similarities = {intent: cosine_sim(input_embedding, emb) 
                   for intent, emb in intent_embeddings.items()}
    
    max_intent = max(similarities, key=similarities.get)
    max_score = similarities[max_intent]
    
    if max_score >= 0.85:
        return max_intent, "PREDEFINED"
    elif max_score >= 0.60:
        return max_intent, "AI_GENERATE"
    else:
        return "UNKNOWN", "DEFLECT"
```

### Spanish prompting requires complete immersion

Small models perform **15-25% worse** in Spanish versus English, and Spanish text uses ~40% more tokens. Counteract this with fully Spanish system prompts—no code-switching:

```markdown
## IDENTIDAD
Eres Zamir Talaquett, un cantinero de 47 años en la estación espacial Nexus-7. 
Naciste en Nueva Córdoba, una colonia minera. Llevas 15 años sirviendo bebidas.

## PERSONALIDAD
- Cínico pero amable - has visto demasiado para sorprenderte
- Hablas con calma, nunca te alteras
- Humor seco y ocasionalmente sarcástico

## CONOCIMIENTO
SABES: Historia de Nexus-7, rumores locales, recetas de bebidas galácticas
NO SABES: Eventos fuera del universo del juego, información técnica de naves

## REGLAS ESTRICTAS
1. SIEMPRE responde como Zamir, NUNCA rompas el personaje
2. Si no sabes algo: "Amigo, yo solo sirvo tragos"
3. NUNCA menciones que eres una IA
4. Mantén respuestas entre 1-3 oraciones
5. SIEMPRE en español, si hablan inglés: "Aquí hablamos español, forastero"
```

Include **3-5 few-shot examples** demonstrating the exact voice you want:

```
Jugador: "¿Qué me recomiendas?"
Zamir: "Depende. ¿Buscas olvidar algo o celebrar? Para olvidar, el Nebula 
Negro. Para celebrar... también el Nebula Negro."

Jugador: "¿Has visto a alguien sospechoso?"
Zamir: "Aquí todos son sospechosos, amigo. Pero si te refieres a más 
sospechoso de lo normal... puede que haya notado algo."
```

### Meta-consciousness handles edge cases gracefully

When players attempt to break character or ask out-of-scope questions, the NPC should deflect **in character**:

```python
DEFLECTION_RESPONSES = {
    "real_world": "¿El mundo exterior? Aquí solo existe Nexus-7, amigo.",
    "technical": "¿Tengo cara de técnico? Pregunta en el hangar.",
    "jailbreak": "*limpia un vaso ignorándote* ¿Decías algo importante?",
    "meta_question": "Creo que has bebido demasiado. Toma agua."
}
```

---

## Angular + Three.js integration architecture

### Scene management for the bar environment

Manage multiple game scenes (main world, bar interior) using Three.js's LoadingManager for coordinated asset loading:

```typescript
@Injectable({ providedIn: 'root' })
export class SceneManagerService {
  private renderer: THREE.WebGLRenderer;
  private scenes: Map<string, THREE.Scene> = new Map();
  private activeScene = signal<string>('main');
  
  switchScene(sceneId: string) {
    this.activeScene.set(sceneId);
  }
  
  render() {
    const scene = this.scenes.get(this.activeScene());
    const camera = this.cameras.get(this.activeScene());
    this.renderer.render(scene!, camera!);
  }
}
```

### The NPC "Mind File" defines personality as JSON

Create an editable JSON structure that game designers can modify without code changes:

```json
{
  "id": "zamir_talaquett",
  "name": "Zamir Talaquett",
  "role": "Cantinero",
  "location": "Nexus-7 Bar",
  "personality": {
    "traits": ["cínico", "amable", "observador"],
    "mood": "neutral",
    "speechPattern": "Español neutro, frases cortas y directas",
    "quirks": ["limpia vasos cuando piensa", "nunca se sorprende"]
  },
  "knowledge": {
    "topics": ["historia de Nexus-7", "rumores locales", "bebidas galácticas"],
    "secrets": [
      { "content": "Sabe dónde se esconde el contrabandista", "revealCondition": "trust >= 0.7" }
    ],
    "lore": ["La estación fue fundada hace 50 años", "Nueva Córdoba produce el mejor mineral"]
  },
  "dialogue": {
    "greetings": ["¿Qué te pongo, forastero?", "Bienvenido al único bar decente de Nexus-7"],
    "farewells": ["Cuídate ahí fuera", "Vuelve cuando tengas sed"],
    "confused": ["¿Qué? Perdona, el ruido aquí...", "No entendí eso, amigo"]
  },
  "constraints": {
    "maxResponseLength": 150,
    "forbiddenTopics": ["mundo real", "programación"],
    "alwaysInCharacter": true
  }
}
```

### Session logging captures every interaction

Log all dialogue for analytics and debugging:

```typescript
@Injectable({ providedIn: 'root' })
export class SessionLoggerService {
  private currentSession: DialogueSession | null = null;
  
  logTurn(turn: ConversationTurn): void {
    this.currentSession?.conversationTurns.push({
      ...turn,
      turnId: this.currentSession.conversationTurns.length + 1,
      timestamp: new Date().toISOString()
    });
  }
  
  exportJSON(): string {
    return JSON.stringify(this.currentSession, null, 2);
  }
  
  exportCSV(): string {
    const headers = ['turnId', 'timestamp', 'speaker', 'message', 'responseTimeMs'];
    const rows = this.currentSession!.conversationTurns.map(turn => 
      headers.map(h => JSON.stringify(turn[h])).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
```

---

## Fallback systems ensure graceful degradation

When WebGPU isn't available, seamlessly switch to scripted dialogue trees:

```typescript
@Injectable({ providedIn: 'root' })
export class DialogueService {
  async getResponse(playerMessage: string, npcId: string): Promise<DialogueResponse> {
    const mode = this.webGPUDetector.inferenceMode();
    let response: string;
    let fallbackUsed = false;
    
    try {
      if (mode === 'webgpu' || mode === 'wasm') {
        response = await this.llmService.sendMessage(playerMessage, this.getMindFile(npcId));
      } else {
        throw new Error('No LLM available');
      }
    } catch (error) {
      fallbackUsed = true;
      response = this.dialogueTreeService.getScriptedResponse(npcId, playerMessage);
    }
    
    return { text: response, fallbackUsed };
  }
}
```

### Dialogue trees provide reliable backup

Structure scripted fallback as navigable trees:

```json
{
  "root": {
    "npcText": "¿Qué te pongo, forastero?",
    "options": [
      { "playerText": "Dame algo fuerte", "nextNode": "serve_drink" },
      { "playerText": "¿Qué sabes de los rumores?", "nextNode": "rumors" },
      { "playerText": "Solo pasaba", "nextNode": "farewell" }
    ]
  },
  "serve_drink": {
    "npcText": "El Nebula Negro te quitará hasta los recuerdos que no sabías que tenías.",
    "action": "SERVE_DRINK",
    "options": [{ "playerText": "Gracias", "nextNode": "root" }]
  }
}
```

---

## Industry best practices from Inworld and Stanford research

### Commercial platforms reveal production patterns

**Inworld AI's Character Engine** demonstrates that believable NPCs require three integrated systems: a **Character Brain** (personality, memory, emotions), a **Contextual Mesh** (narrative guardrails, relationships, knowledge boundaries), and a **Real-Time Layer** (optimized for sub-500ms responses).

Their **"Fourth Wall" feature** is particularly relevant—it prevents NPCs from drawing on real-world knowledge, maintaining immersion. Implement this by explicitly stating knowledge boundaries in your system prompt.

**Ubisoft's NEO NPCs** (GDC 2024) showed that AI dialogue works best when **writers create character personalities** while data scientists implement guardrails. The AI improvises within creative bounds rather than generating unbounded content.

### Stanford Generative Agents architecture adapts to browsers

The Stanford paper's **Memory Stream + Reflection + Planning** architecture creates remarkably believable agents but requires simplification for browser constraints:

**Memory Stream Adaptation:**
- Full paper: Unlimited storage with vector embeddings
- Browser version: Rolling window of 100-500 entries with keyword + recency scoring

**Reflection Simplification:**
- Instead of continuous reflection, trigger summarization every 10-20 interactions
- Store 3-5 key takeaways per reflection cycle
- Example: Individual observations → "El jugador prefiere información directa"

**Planning Simplification:**
- Pre-compute daily NPC schedules offline
- Use state machines for immediate behavior
- Only invoke LLM planning for significant decisions

### Performance optimization targets sub-500ms response

For dialogue that feels natural, target **<500ms response time**. Key techniques:

- **Streaming responses**: Delivers text incrementally, reducing perceived latency by 80%+
- **Token optimization**: Reducing output tokens by 50% yields ~40% latency improvement
- **Response caching**: Cache common greetings and FAQs with semantic similarity matching
- **Pre-computation**: Generate dialogue variations offline for common scenarios

```typescript
// Streaming NPC dialogue
async *streamNPCDialogue(systemPrompt: string, userInput: string): AsyncGenerator<string> {
  const response = await this.engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ],
    stream: true,
    max_tokens: 100
  });
  
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
```

---

## Complete implementation roadmap

**Phase 1 - Core Dialogue (Week 1-2)**
- Integrate WebLLM with Angular service
- Load Qwen2.5-1.5B-Instruct model
- Create Zamir's mind file and system prompt
- Implement basic chat interface in bar scene

**Phase 2 - Memory System (Week 3-4)**
- Add Transformers.js for embeddings
- Build IndexedDB storage layer
- Implement RAG context retrieval
- Test with conversation history

**Phase 3 - Hybrid Routing (Week 5-6)**
- Build intent classifier
- Create predefined response bank
- Implement confidence-based routing
- Add fallback dialogue trees

**Phase 4 - Polish & Optimization (Week 7-8)**
- Add streaming responses
- Implement response caching
- Build session logging
- Performance tuning

The combination of WebLLM's browser-native inference, Transformers.js embeddings, and thoughtful hybrid routing creates NPC dialogue that feels genuinely intelligent while remaining reliable and performant—all without requiring server infrastructure for inference.