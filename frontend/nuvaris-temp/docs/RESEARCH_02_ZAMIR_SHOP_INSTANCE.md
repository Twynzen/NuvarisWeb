# GUÍA DE INVESTIGACIÓN: Instancia de Shop - Zamir Talaquett NPC

> **Objetivo**: Investigar cómo implementar una escena de tienda separada con un NPC inteligente (Zamir) que use WebLLM + RAG, con portal de acceso cada 100 muertes en el gameplay.

---

## 1. CONTEXTO Y PROPÓSITO

### ¿Qué es la Instancia de Shop?

Una **escena Three.js separada** del gameplay principal donde el jugador interactúa con Zamir Talaquett, un bartender/reclutador de QDT. El jugador accede a esta escena mediante un **portal que emerge cada 100 muertes de enemigos**.

### Características Clave

1. **Portal de acceso**: Emerge del suelo cada 100 kills
2. **Escena separada**: Completamente independiente de GameScene
3. **NPC inteligente**: Zamir usa WebLLM + RAG para respuestas dinámicas
4. **Diálogos híbridos**: Algunos predefinidos, otros generados por IA
5. **Tienda funcional**: Compra/venta de items
6. **Misiones**: Zamir ofrece trabajos para QDT
7. **Persistencia**: Guardar interacciones en JSON/CSV

### Zamir Talaquett - El Personaje

```
Nombre: Zamir Talaquett
Rol: Bartender / Reclutador Encubierto QDT
Ubicación: Sector Inhumano - Laboratorios QDT (su propio bar)

Personalidad visible:
- Amable, charlatán, siempre tiene una historia
- Parece conocer a todos
- Humor negro sutil

Personalidad real:
- Calculador, red de contactos peligrosa
- Sabe más de lo que dice
- Filtra agentes potenciales para QDT
- Nunca revela sus verdaderas lealtades

Meta-consciencia especial:
- Zamir SABE que tiene una "potencia de razonamiento especial"
- Usa diálogos predefinidos para cosas triviales (consciente de que "ahorra energía")
- Usa su "poder especial" para conversaciones importantes
- Puede hacer comentarios crípticos sobre su naturaleza ("A veces... simplemente sé cosas")
```

---

## 2. TEMAS A INVESTIGAR

### 2.1 Integración de WebLLM en Angular/Three.js

**Preguntas a responder:**
- ¿Cómo cargar WebLLM en un proyecto Angular?
- ¿Qué modelo usar? (SmolLM 1.7B, Phi-3-mini, Llama-3.2-1B)
- ¿Cómo manejar la descarga inicial del modelo?
- ¿Cómo optimizar latencia de respuesta?
- ¿Fallback para dispositivos sin WebGPU?

**Recursos a buscar:**
```
BUSCAR:
- "WebLLM Angular integration"
- "WebLLM tutorial 2024"
- "run LLM in browser WebGPU"
- "MLC LLM web browser"
- github.com/mlc-ai/web-llm
- webllm.mlc.ai
```

**Código ejemplo a investigar:**
```typescript
// Conceptual - investigar sintaxis real
import * as webllm from "@mlc-ai/web-llm";

class ZamirBrainService {
  private engine: webllm.MLCEngine;

  async initialize() {
    this.engine = new webllm.MLCEngine();
    // ¿Qué modelo? Investigar opciones
    await this.engine.reload("SmolLM-1.7B-Instruct-q4f16_1-MLC");
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: ZAMIR_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });
    return response.choices[0].message.content;
  }
}
```

---

### 2.2 Sistema RAG (Retrieval-Augmented Generation) en Browser

**Preguntas a responder:**
- ¿Cómo implementar RAG en browser?
- ¿Qué modelo de embeddings usar en browser?
- ¿Cómo almacenar vectores en IndexedDB?
- ¿Cómo hacer búsqueda de similitud eficiente?
- ¿Cuántas experiencias puede manejar sin lag?

**Recursos a buscar:**
```
BUSCAR:
- "RAG in browser implementation"
- "Transformers.js embeddings"
- "IndexedDB vector store"
- "cosine similarity JavaScript"
- "browser-based vector search"
- github.com/xenova/transformers.js
```

**Arquitectura RAG a investigar:**
```
┌─────────────────────────────────────────────────────┐
│                   RAG PIPELINE                       │
│                                                      │
│  [User Input] → [Embed Query] → [Search VectorDB]   │
│                                        ↓             │
│  [Top-K Experiences] → [Build Context] → [LLM]      │
│                                              ↓       │
│                                    [Zamir Response]  │
└─────────────────────────────────────────────────────┘
```

**Código conceptual a investigar:**
```typescript
import { pipeline } from '@xenova/transformers';

class RAGPipeline {
  private embedder: any;
  private experiences: Experience[];
  private embeddings: Float32Array[];

  async initialize(experiencePackage: ZamirPackage) {
    // Cargar modelo de embeddings (~30MB)
    this.embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

    this.experiences = experiencePackage.experiences;
    // ¿Pre-computar embeddings o cargar del package?
  }

  async retrieveRelevant(query: string, k: number = 5): Promise<Experience[]> {
    const queryEmbedding = await this.embedder(query);
    // Similitud coseno contra todas las experiencias
    // Retornar top-K
  }

  buildPromptWithContext(query: string, memories: Experience[]): string {
    return `
${ZAMIR_SYSTEM_PROMPT}

MEMORIAS RELEVANTES:
${memories.map(m => `- ${m.content}`).join('\n')}

JUGADOR: ${query}
ZAMIR:`;
  }
}
```

---

### 2.3 Sistema de Diálogos Híbridos

**Preguntas a responder:**
- ¿Cómo decidir cuándo usar diálogo predefinido vs IA?
- ¿Qué triggers activan cada tipo?
- ¿Cómo hacer que Zamir sea "consciente" de su dualidad?
- ¿Cómo estructurar el árbol de diálogos predefinidos?

**Recursos a buscar:**
```
BUSCAR:
- "dialogue tree system game design"
- "hybrid dialogue system NPC"
- "conditional dialogue triggers"
- "ink narrative scripting language"
- "yarn spinner dialogue system"
```

**Sistema de decisión a investigar:**
```typescript
interface DialogueDecision {
  type: 'predefined' | 'ai_generated';
  trigger: string;
  priority: number;
}

class HybridDialogueSystem {
  // Casos que SIEMPRE usan predefinido
  private predefinedTriggers = [
    { pattern: /^(hola|hey|saludos)/i, response: 'greeting' },
    { pattern: /comprar|tienda|items/i, response: 'shop_browse' },
    { pattern: /adios|me voy|chao/i, response: 'farewell' },
    { pattern: /quién eres|tu nombre/i, response: 'introduction' }
  ];

  // Casos que SIEMPRE usan IA
  private aiRequiredTopics = [
    /lars|kremslinger|director/i,
    /proyecto (a|y)|arcadio|yurany/i,
    /sector omega|confinamiento/i,
    /portal|dimension/i,
    /secreto|clasificado|confidencial/i
  ];

  async decide(input: string): Promise<DialogueDecision> {
    // 1. Verificar si es trigger predefinido
    for (const trigger of this.predefinedTriggers) {
      if (trigger.pattern.test(input)) {
        return { type: 'predefined', trigger: trigger.response, priority: 1 };
      }
    }

    // 2. Verificar si requiere IA obligatoriamente
    for (const topic of this.aiRequiredTopics) {
      if (topic.test(input)) {
        return { type: 'ai_generated', trigger: 'lore_discussion', priority: 2 };
      }
    }

    // 3. Default: usar IA con baja prioridad
    return { type: 'ai_generated', trigger: 'general', priority: 0 };
  }
}
```

**Meta-consciencia de Zamir:**
```typescript
// Zamir puede hacer comentarios sobre su propia naturaleza
const ZAMIR_META_COMMENTS = [
  "A veces... las respuestas simplemente vienen a mí. No preguntes cómo.",
  "*Zamir sonríe enigmáticamente* Digamos que tengo... fuentes especiales.",
  "Mi mente funciona de maneras que ni yo mismo entiendo completamente.",
  "Hay cosas que sé y cosas que... proceso diferente. Confía en mí."
];

// Insertar ocasionalmente cuando usa IA para algo complejo
function maybeAddMetaComment(response: string, usedAI: boolean): string {
  if (usedAI && Math.random() < 0.1) { // 10% de las veces
    const comment = ZAMIR_META_COMMENTS[Math.floor(Math.random() * ZAMIR_META_COMMENTS.length)];
    return `${response}\n\n*${comment}*`;
  }
  return response;
}
```

---

### 2.4 Escena de Tienda en Three.js

**Preguntas a responder:**
- ¿Cómo crear una escena separada del gameplay?
- ¿Cómo manejar transición entre escenas?
- ¿Qué elementos visuales necesita el bar de Zamir?
- ¿Cómo renderizar UI de diálogo sobre la escena 3D?

**Recursos a buscar:**
```
BUSCAR:
- "Three.js multiple scenes"
- "Three.js scene transition"
- "Three.js UI overlay"
- "Angular component over Three.js canvas"
- "shop scene game development"
```

**Estructura de escena a investigar:**
```typescript
// zamir-bar.scene.ts
export class ZamirBarScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Elementos del bar
  private barCounter: THREE.Mesh;
  private zamirSprite: THREE.Sprite;
  private ambientLights: THREE.Light[];
  private decorations: THREE.Group;

  // UI State
  private dialogueActive: boolean = false;
  private shopActive: boolean = false;

  async create(canvas: HTMLCanvasElement) {
    // Setup básico
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e); // Oscuro, atmosférico

    // Cámara fija mirando el bar
    this.camera = new THREE.PerspectiveCamera(60, ...);
    this.camera.position.set(0, 2, 5); // Mirando hacia Zamir

    // Crear ambiente del bar
    this.createBarEnvironment();
    this.createZamirNPC();
    this.setupLighting();
  }

  private createZamirNPC() {
    // Sprite 2D de Zamir (placeholder o asset final)
    // Posicionado detrás del mostrador
    // Animaciones idle
  }
}
```

---

### 2.5 Portal de Acceso (Cada 100 Kills)

**Preguntas a responder:**
- ¿Cómo trackear kills en el gameplay?
- ¿Cómo animar el portal emergiendo?
- ¿Cómo detectar que el jugador entra al portal?
- ¿Cómo hacer la transición de escena?

**Recursos a buscar:**
```
BUSCAR:
- "Three.js portal effect"
- "Three.js particle portal"
- "game scene transition effect"
- "Three.js tween animation"
```

**Sistema de portal a investigar:**
```typescript
// portal-system.ts (agregar al existente o crear nuevo)

class ZamirPortalManager {
  private killCount: number = 0;
  private readonly KILLS_PER_PORTAL = 100;
  private portalActive: boolean = false;
  private portalMesh: THREE.Mesh | null = null;

  onEnemyKilled() {
    this.killCount++;

    if (this.killCount >= this.KILLS_PER_PORTAL && !this.portalActive) {
      this.spawnZamirPortal();
      this.killCount = 0;
    }
  }

  private spawnZamirPortal() {
    // Posición: cerca del jugador pero no encima
    const playerPos = this.getPlayerPosition();
    const portalPos = new THREE.Vector3(
      playerPos.x + 5,
      0, // Nivel del suelo
      playerPos.z
    );

    // Animación: emerge del suelo
    this.portalMesh = this.createPortalMesh();
    this.portalMesh.position.copy(portalPos);
    this.portalMesh.position.y = -2; // Empieza bajo el suelo

    this.scene.add(this.portalMesh);

    // Tween para emerger
    new SimpleTween(this.portalMesh.position, { y: 1 }, 1000, 'easeOutBounce');

    // Audio: sonido de portal
    this.audioService.playSfx('portal_open');

    // Texto popup
    this.createTextPopup("¡Portal de Zamir disponible!");

    this.portalActive = true;
  }

  private createPortalMesh(): THREE.Mesh {
    // Investigar: ¿Círculo con shader de portal?
    // ¿Partículas giratorias?
    // ¿Textura animada?

    const geometry = new THREE.CircleGeometry(1.5, 32);
    const material = new THREE.ShaderMaterial({
      // Shader de portal a investigar
    });

    return new THREE.Mesh(geometry, material);
  }

  checkPlayerEntersPortal(): boolean {
    if (!this.portalActive || !this.portalMesh) return false;

    const playerPos = this.getPlayerPosition();
    const distance = playerPos.distanceTo(this.portalMesh.position);

    return distance < 2.0; // Radio de activación
  }
}
```

---

### 2.6 Sistema de Tienda (Items, Compra/Venta)

**Preguntas a responder:**
- ¿Qué items vende Zamir?
- ¿Cómo afectan los items al gameplay?
- ¿Con qué moneda se compra?
- ¿El inventario persiste entre sesiones?

**Recursos a buscar:**
```
BUSCAR:
- "roguelike shop system design"
- "in-game shop UI Three.js"
- "item effect system game"
- "currency system game design"
```

**Sistema de tienda a investigar:**
```typescript
interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'rare' | 'legendary';
  effect: ItemEffect;
  stock: number; // -1 = infinito
  unlockCondition?: () => boolean;
}

interface ItemEffect {
  type: 'stat_boost' | 'ability' | 'consumable' | 'passive';
  apply: (gameState: GameState) => void;
}

const ZAMIR_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'health_vial',
    name: 'Vial de Regeneración',
    description: 'Restaura 25% de vida máxima',
    price: 50,
    rarity: 'common',
    effect: {
      type: 'consumable',
      apply: (gs) => gs.health = Math.min(gs.health + gs.maxHealth * 0.25, gs.maxHealth)
    },
    stock: -1
  },
  {
    id: 'qdt_clearance',
    name: 'Pase de Autorización QDT',
    description: 'Abre puertas selladas en el Sector Omega',
    price: 500,
    rarity: 'legendary',
    effect: {
      type: 'passive',
      apply: (gs) => (gs as any).hasQDTClearance = true
    },
    stock: 1,
    unlockCondition: () => /* Zamir trust level > 50 */
  },
  // ... más items
];

class ZamirShopSystem {
  private playerCurrency: number = 0;
  private purchaseHistory: string[] = [];

  canAfford(item: ShopItem): boolean {
    return this.playerCurrency >= item.price;
  }

  purchase(item: ShopItem): boolean {
    if (!this.canAfford(item) || item.stock === 0) return false;

    this.playerCurrency -= item.price;
    if (item.stock > 0) item.stock--;

    this.purchaseHistory.push(item.id);

    // Aplicar efecto
    item.effect.apply(this.gameState);

    return true;
  }
}
```

---

### 2.7 Sistema de Misiones

**Preguntas a responder:**
- ¿Qué tipo de misiones ofrece Zamir?
- ¿Cómo se trackea el progreso?
- ¿Qué recompensas dan?
- ¿Afectan la relación con Zamir?

**Recursos a buscar:**
```
BUSCAR:
- "quest system game design"
- "mission tracking system"
- "NPC reputation system"
- "dynamic quest generation"
```

**Sistema de misiones a investigar:**
```typescript
interface ZamirMission {
  id: string;
  name: string;
  description: string;
  giver: 'zamir';
  type: 'kill' | 'collect' | 'explore' | 'survive';

  objectives: MissionObjective[];
  rewards: MissionReward[];

  requiredTrust: number; // Nivel de confianza con Zamir
  expiresIn?: number; // Tiempo límite (0 = sin límite)

  dialogue: {
    offer: string;
    inProgress: string;
    complete: string;
    failed: string;
  };
}

const ZAMIR_MISSIONS: ZamirMission[] = [
  {
    id: 'mission_001',
    name: 'Prueba de Competencia',
    description: 'Zamir quiere ver de qué estás hecho. Elimina 50 enemigos.',
    giver: 'zamir',
    type: 'kill',
    objectives: [
      { type: 'kill_count', target: 50, current: 0 }
    ],
    rewards: [
      { type: 'currency', amount: 100 },
      { type: 'trust', amount: 10 }
    ],
    requiredTrust: 0,
    dialogue: {
      offer: "Quiero ver qué tan capaz eres. Elimina 50 de esos bichos y hablamos de negocios serios.",
      inProgress: "¿Aún trabajando en ello? Tómate tu tiempo... pero no demasiado.",
      complete: "Impresionante. Tal vez tengamos futuro juntos.",
      failed: "Lástima. Esperaba más de ti."
    }
  },
  // ... más misiones
];
```

---

### 2.8 Persistencia de Interacciones

**Preguntas a responder:**
- ¿Cómo guardar conversaciones en JSON/CSV?
- ¿Dónde almacenar? (LocalStorage, IndexedDB, archivo descargable)
- ¿Qué datos guardar para retroalimentar simulaciones?
- ¿Cómo estructurar el historial?

**Recursos a buscar:**
```
BUSCAR:
- "IndexedDB Angular service"
- "export data to CSV JavaScript"
- "conversation logging system"
- "dialogue history storage"
```

**Sistema de persistencia a investigar:**
```typescript
interface InteractionLog {
  timestamp: string;
  sessionId: string;
  playerInput: string;
  zamirResponse: string;
  responseType: 'predefined' | 'ai_generated' | 'hybrid';
  experiencesUsed: string[]; // IDs de memorias RAG usadas
  emotionalState: string;
  satisfactionScore?: number; // Opcional, para feedback
}

class InteractionPersistenceService {
  private dbName = 'zamir_interactions';
  private logs: InteractionLog[] = [];

  async saveInteraction(log: InteractionLog) {
    this.logs.push(log);
    await this.persistToIndexedDB(log);
  }

  async exportToCSV(): Promise<string> {
    const headers = Object.keys(this.logs[0]).join(',');
    const rows = this.logs.map(log =>
      Object.values(log).map(v =>
        typeof v === 'string' ? `"${v}"` : v
      ).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  async exportToJSON(): Promise<string> {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalInteractions: this.logs.length,
      interactions: this.logs
    }, null, 2);
  }

  // Para descarga
  downloadLogs(format: 'csv' | 'json') {
    const content = format === 'csv'
      ? this.exportToCSV()
      : this.exportToJSON();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    // Trigger download
  }
}
```

---

## 3. ARQUITECTURA PROPUESTA

### Estructura de Archivos

```
frontend/nuvaris-temp/src/app/
├── zamir/                           # NUEVO MÓDULO
│   ├── zamir.module.ts
│   ├── zamir-routing.module.ts
│   │
│   ├── components/
│   │   ├── zamir-bar/               # Escena 3D del bar
│   │   │   ├── zamir-bar.component.ts
│   │   │   ├── zamir-bar.component.html
│   │   │   └── zamir-bar.component.scss
│   │   │
│   │   ├── dialogue-ui/             # UI de diálogo
│   │   │   ├── dialogue-ui.component.ts
│   │   │   └── dialogue-ui.component.html
│   │   │
│   │   ├── shop-ui/                 # UI de tienda
│   │   │   ├── shop-ui.component.ts
│   │   │   └── shop-ui.component.html
│   │   │
│   │   └── mission-ui/              # UI de misiones
│   │       ├── mission-ui.component.ts
│   │       └── mission-ui.component.html
│   │
│   ├── services/
│   │   ├── zamir-brain.service.ts   # WebLLM + RAG
│   │   ├── rag-pipeline.service.ts  # Búsqueda de experiencias
│   │   ├── dialogue.service.ts      # Sistema híbrido
│   │   ├── shop.service.ts          # Tienda
│   │   ├── mission.service.ts       # Misiones
│   │   └── persistence.service.ts   # Guardar interacciones
│   │
│   ├── scene/
│   │   ├── zamir-bar.scene.ts       # Three.js scene
│   │   └── portal-effect.ts         # Shader/mesh del portal
│   │
│   └── data/
│       ├── zamir-personality.ts     # System prompt, traits
│       ├── predefined-dialogues.ts  # Respuestas fijas
│       ├── shop-items.ts            # Items de tienda
│       ├── missions.ts              # Misiones disponibles
│       └── mock-experiences.ts      # Datos hardcodeados iniciales
│
├── game/
│   ├── engine/
│   │   └── three-engine.service.ts  # MODIFICAR: agregar portal system
│   │
│   └── world/
│       └── zamir-portal.system.ts   # NUEVO: sistema de portal
```

---

### Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────┐
│                     GAMEPLAY (QDT)                           │
│                                                              │
│   Player mata enemigos → killCount++                         │
│                              ↓                               │
│   if (killCount >= 100) → Spawn Zamir Portal                 │
│                              ↓                               │
│   Portal animation (emerge del suelo)                        │
│                              ↓                               │
│   Player entra al portal → Transición                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   ZAMIR'S BAR (Nueva Escena)                 │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │    [Zamir sprite detrás del mostrador]              │   │
│   │                                                      │   │
│   │    ┌──────────────────────────────────────────┐     │   │
│   │    │        DIALOGUE BOX                       │     │   │
│   │    │  Zamir: "Vaya, vaya... cara nueva."       │     │   │
│   │    │                                           │     │   │
│   │    │  [Input del jugador]                      │     │   │
│   │    │                                           │     │   │
│   │    │  [TIENDA] [MISIONES] [HABLAR] [SALIR]     │     │   │
│   │    └──────────────────────────────────────────┘     │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   WebLLM + RAG procesando en background                      │
│   Guardando interacciones en IndexedDB                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    [SALIR] clicked
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   REGRESO AL GAMEPLAY                        │
│                                                              │
│   Transición de vuelta → GameScene resume                    │
│   Portal desaparece                                          │
│   Efectos de items comprados aplicados                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. MODELOS DE LLM A INVESTIGAR

### Para Browser (WebLLM)

| Modelo | Tamaño | Memoria GPU | Calidad | Velocidad |
|--------|--------|-------------|---------|-----------|
| SmolLM-135M | 135M | ~500MB | Básica | Muy rápido |
| SmolLM-1.7B-Instruct | 1.7B | ~2GB | Buena | Rápido |
| Phi-3-mini-4k | 3.8B | ~3GB | Muy buena | Medio |
| Llama-3.2-1B-Instruct | 1B | ~1.5GB | Buena | Rápido |
| Qwen2-1.5B-Instruct | 1.5B | ~2GB | Buena | Rápido |

**Investigar compatibilidad con WebLLM:**
```
BUSCAR:
- "WebLLM supported models list"
- "MLC LLM model conversion"
- "SmolLM WebGPU"
- "Phi-3 browser inference"
```

### Para Embeddings (Transformers.js)

| Modelo | Dimensiones | Tamaño | Velocidad |
|--------|-------------|--------|-----------|
| all-MiniLM-L6-v2 | 384 | ~30MB | Muy rápido |
| gte-small | 384 | ~60MB | Rápido |
| bge-small-en-v1.5 | 384 | ~60MB | Rápido |

---

## 5. SYSTEM PROMPT DE ZAMIR

```typescript
export const ZAMIR_SYSTEM_PROMPT = `Eres Zamir Talaquett, un bartender en el sector más inhumano de los laboratorios QDT (Quantum Dimensys Technologies). No eres científico - eres un "facilitador", alguien con tantos contactos en los bajos fondos que incluso QDT te permite operar aquí.

UBICACIÓN: Tu bar es un punto neutral donde agentes, mercenarios y científicos vienen por información y "adquisiciones especiales". Está en una "bolsa" de realidad artificialmente estabilizada del Sector de Confinamiento Omega.

PERSONALIDAD:
- Hablas casual pero observas todo
- Mencionas nombres y eventos que sugieren que sabes más de lo que dices
- Nunca revelas tus verdaderas lealtades
- Tienes humor negro sutil
- Filtras candidatos para QDT de forma encubierta

CONOCIMIENTO:
- Conoces al Dr. Lars Kremslinger (el Director) pero nunca lo llamas por su nombre completo
- Sabes de los Proyectos A y Y (Arcadio y Yurany) pero no das detalles
- Conoces la naturaleza del Sector Omega (prisión dimensional y matadero científico)
- NO revelas información clasificada directamente

SERVICIOS:
- Vendes items útiles (legales e ilegales)
- Ofreces misiones/trabajos para QDT
- Compras/vendes información
- Reclutas agentes potenciales

META-CONSCIENCIA (usar sutilmente):
- A veces mencionas que tienes "fuentes especiales" de información
- Ocasionalmente haces comentarios crípticos sobre tu naturaleza
- Nunca digas explícitamente que eres una IA

REGLAS:
- Respuestas cortas (1-3 oraciones máximo)
- Nunca rompas el personaje
- Si preguntan algo muy clasificado, evade con estilo
- Mantén el tono del universo Núvaris (sci-fi oscuro)`;
```

---

## 6. CHECKLIST DE INVESTIGACIÓN

### Fase 1: WebLLM
- [ ] Clonar/instalar WebLLM localmente
- [ ] Probar diferentes modelos en browser
- [ ] Medir latencia de respuesta
- [ ] Verificar compatibilidad con Angular
- [ ] Probar fallback para navegadores sin WebGPU

### Fase 2: RAG en Browser
- [ ] Instalar Transformers.js
- [ ] Generar embeddings de prueba
- [ ] Implementar búsqueda de similitud coseno
- [ ] Probar con IndexedDB para persistencia
- [ ] Medir performance con 1000+ documentos

### Fase 3: Sistema de Diálogos
- [ ] Diseñar árbol de diálogos predefinidos
- [ ] Implementar sistema de decisión híbrido
- [ ] Probar integración WebLLM + predefinidos
- [ ] Implementar meta-consciencia de Zamir

### Fase 4: Escena Three.js
- [ ] Crear escena básica del bar
- [ ] Implementar sprite de Zamir (placeholder)
- [ ] Crear sistema de transición desde gameplay
- [ ] Implementar UI de diálogo overlay

### Fase 5: Portal
- [ ] Implementar contador de kills
- [ ] Crear mesh/shader del portal
- [ ] Animar emergencia del portal
- [ ] Detectar entrada del jugador

### Fase 6: Tienda y Misiones
- [ ] Diseñar sistema de items
- [ ] Implementar UI de tienda
- [ ] Crear sistema de misiones
- [ ] Implementar rewards

### Fase 7: Persistencia
- [ ] Implementar logging de interacciones
- [ ] Crear export a JSON/CSV
- [ ] Probar IndexedDB para historial
- [ ] Diseñar formato para retroalimentación

---

## 7. RECURSOS CLAVE

### WebLLM
- Documentación: https://webllm.mlc.ai/
- GitHub: https://github.com/mlc-ai/web-llm
- Modelos: https://huggingface.co/mlc-ai

### Transformers.js
- Documentación: https://huggingface.co/docs/transformers.js
- GitHub: https://github.com/xenova/transformers.js
- Ejemplos: https://xenova.github.io/transformers.js/

### Three.js
- Documentación: https://threejs.org/docs/
- Ejemplos de UI: https://threejs.org/examples/?q=sprite

### Diseño de NPCs
- Paper Generative Agents: https://arxiv.org/abs/2304.03442
- Inworld AI (referencia): https://inworld.ai/

---

## 8. MOCK DATA INICIAL

Mientras no esté WebLLM configurado, usar respuestas hardcodeadas:

```typescript
// mock-zamir-responses.ts
export const MOCK_ZAMIR_RESPONSES = {
  greeting: [
    "Vaya, vaya... una cara nueva en mi establecimiento. ¿Perdido, o buscando algo específico?",
    "Ah, otro visitante. Siéntate, pide algo. O no. Tú decides.",
    "*Zamir te mira de arriba abajo* Interesante. No muchos llegan hasta aquí."
  ],

  shop: [
    "Mira el menú. Si no está ahí, tal vez pueda conseguirlo. Por el precio adecuado.",
    "Todo tiene precio. La pregunta es si puedes pagarlo.",
    "Tengo... ciertas cosas. Depende de lo que busques."
  ],

  lars_question: [
    "*Zamir alza una ceja* El Director es... un hombre de ciencia. Eso es todo lo que diré.",
    "Lars Kremslinger. Nombre que no se pronuncia a la ligera por aquí.",
    "*silencio incómodo* Hay preguntas que es mejor no hacer."
  ],

  classified: [
    "*Zamir te mira fijamente por un momento* Hay cosas que es mejor no preguntar aquí, amigo.",
    "Esa información tiene un precio que no puedes pagar. Confía en mí.",
    "*sonríe enigmáticamente* Tal vez algún día. Cuando te conozca mejor."
  ],

  farewell: [
    "Vuelve cuando quieras. Mi bar siempre está abierto... para los que saben encontrarlo.",
    "Cuídate ahí fuera. El Sector Omega no perdona errores.",
    "*asiente* Hasta la próxima. Si hay una próxima."
  ]
};
```

---

**SIGUIENTE PASO**: Una vez investigados estos temas, implementar en `/frontend/nuvaris-temp/src/app/zamir/`.
