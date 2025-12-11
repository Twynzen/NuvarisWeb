# GUÍA DE INVESTIGACIÓN: Servidor de Simulaciones Masivas de Experiencias

> **Objetivo**: Investigar cómo implementar un servidor que simule miles de interacciones para NPCs inteligentes, generando "experiencias vividas" que luego se comprimen en embeddings para uso en browser.

---

## 1. CONTEXTO Y PROPÓSITO

### ¿Qué es el Servidor de Simulaciones?

Un backend que ejecuta **simulaciones masivas paralelas** de escenarios de interacción NPC-jugador. Similar a cómo NVIDIA Isaac Sim entrena robots en miles de entornos simultáneos, este servidor:

1. **Genera escenarios** aleatorios de interacción (compras, negociaciones, amenazas, etc.)
2. **Simula conversaciones** entre NPCs virtuales y "clientes" sintéticos
3. **Extrae experiencias significativas** (memorias importantes para el NPC)
4. **Genera embeddings** de cada experiencia usando modelos de embedding
5. **Empaqueta** los datos en formato JSON/CSV para consumo en browser

### Caso de Uso: Zamir Talaquett

El bartender Zamir necesita "haber vivido" miles de situaciones:
- Negociaciones con agentes de QDT
- Intentos de soborno
- Solicitudes de información clasificada
- Ventas de items ilegales
- Reclutamiento de agentes potenciales
- Amenazas y extorsiones
- Conversaciones casuales sobre el lore de QDT

---

## 2. TEMAS A INVESTIGAR

### 2.1 Arquitectura de Simulación Paralela

**Preguntas a responder:**
- ¿Cómo ejecutar miles de simulaciones en paralelo?
- ¿Qué framework usar? (Node.js workers, Python multiprocessing, Go routines)
- ¿Cómo estructurar un "escenario" de simulación?
- ¿Qué parámetros randomizar? (tipo de cliente, estado emocional, intención, contexto)

**Recursos a buscar:**
```
BUSCAR:
- "parallel simulation framework node.js"
- "massive parallel NPC training"
- "domain randomization for AI agents"
- "procedural scenario generation for games"
- "synthetic data generation for dialogue systems"
```

**Ejemplo de estructura de escenario a investigar:**
```typescript
interface SimulationScenario {
  id: string;
  npcId: string;

  // Cliente sintético
  client: {
    type: 'agent' | 'scientist' | 'mercenary' | 'unknown';
    personality: 'aggressive' | 'cautious' | 'friendly' | 'suspicious';
    intention: 'buy' | 'sell' | 'info' | 'recruit' | 'threaten';
    knowledgeLevel: number; // 0-1: cuánto sabe del lore
  };

  // Contexto
  context: {
    timeOfDay: 'morning' | 'night';
    recentEvents: string[]; // eventos recientes en QDT
    zamirMood: 'normal' | 'stressed' | 'suspicious';
  };

  // Parámetros de randomización
  randomSeed: number;
}
```

---

### 2.2 Generación de Diálogos Sintéticos

**Preguntas a responder:**
- ¿Cómo generar diálogos coherentes sin LLM en tiempo real?
- ¿Templates + variables vs LLM pequeño para generación?
- ¿Cómo mantener consistencia de personalidad del NPC?
- ¿Cómo evaluar calidad de diálogos generados?

**Recursos a buscar:**
```
BUSCAR:
- "synthetic dialogue generation dataset"
- "GPT dialogue simulation training data"
- "character-consistent dialogue generation"
- "dialogue tree to neural training data"
- "self-play dialogue agents"
```

**Enfoque híbrido a investigar:**
```
Opción A: Templates + Slots
  [GREETING] → "¿Qué te trae a mi bar, {CLIENT_TYPE}?"
  [NEGOTIATION] → "Eso vale {PRICE}, pero para ti... {MODIFIED_PRICE}"

Opción B: LLM pequeño para generación
  - Usar GPT-4 API para generar N diálogos base
  - Luego usar LLM local (Llama/Mistral) para variaciones

Opción C: Self-play (dos LLMs conversando)
  - LLM 1 = Zamir (system prompt con personalidad)
  - LLM 2 = Cliente aleatorio (system prompt con intención)
  - Grabar toda la conversación
```

---

### 2.3 Extracción de Experiencias Significativas

**Preguntas a responder:**
- ¿Cómo identificar qué partes de una simulación son "memorables"?
- ¿Cómo asignar scores de importancia (1-10)?
- ¿Qué metadata extraer de cada experiencia?
- ¿Cómo evitar duplicados y mantener diversidad?

**Recursos a buscar:**
```
BUSCAR:
- "Stanford Generative Agents memory importance"
- "experience importance scoring NPC"
- "memory compression for dialogue agents"
- "salient event detection in conversations"
- PAPER: "Generative Agents: Interactive Simulacra of Human Behavior"
```

**Formato de experiencia a investigar:**
```json
{
  "id": "exp_001",
  "timestamp": "2025-01-15T14:30:00Z",
  "type": "negotiation",
  "content": "Un mercenario intentó venderme armas robadas de QDT. Le dije que no trabajo con material caliente sin antes verificar procedencia.",
  "importance": 7,
  "emotion": "cautious",
  "outcome": "rejected_deal",
  "tags": ["weapons", "qdt", "illegal", "mercenary"],
  "relatedMemories": ["exp_042", "exp_089"]
}
```

---

### 2.4 Generación de Embeddings

**Preguntas a responder:**
- ¿Qué modelo de embedding usar? (all-MiniLM-L6-v2, gte-small, etc.)
- ¿Dimensionalidad óptima? (384 vs 768 vs 1024)
- ¿Cómo generar embeddings en batch eficientemente?
- ¿Formato de salida para consumo en browser?

**Recursos a buscar:**
```
BUSCAR:
- "sentence-transformers batch embedding"
- "embedding model comparison 2024"
- "all-MiniLM-L6-v2 vs gte-small performance"
- "export embeddings to json"
- "Hugging Face sentence embeddings API"
```

**Código ejemplo a investigar:**
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

experiences = [
  "Vendí información sobre el Sector Omega a un agente encubierto",
  "Un científico de QDT me preguntó si podía conseguir especímenes",
  # ... miles más
]

embeddings = model.encode(experiences, show_progress_bar=True)

# Exportar para browser
import json
output = {
  "npcId": "zamir_001",
  "embeddings": embeddings.tolist(),
  "experiences": experiences
}
```

---

### 2.5 Curriculum Learning para NPCs

**Preguntas a responder:**
- ¿Cómo estructurar la dificultad progresiva de escenarios?
- ¿Qué métricas usar para evaluar "performance" del NPC?
- ¿Cómo mezclar escenarios fáciles con difíciles?

**Recursos a buscar:**
```
BUSCAR:
- "curriculum learning NPC training"
- "progressive difficulty AI training"
- "self-paced learning reinforcement"
- PAPER: "Curriculum Learning" (Bengio et al.)
```

**Fases de curriculum sugeridas para investigar:**
```
Fase 1: Baseline
  - Ventas simples de items comunes
  - Clientes amigables
  - Sin presión

Fase 2: Complejidad
  - Múltiples items en una transacción
  - Preguntas sobre lore
  - Clientes indecisos

Fase 3: Negociación
  - Regateo de precios
  - Solicitudes especiales
  - Trueques

Fase 4: Desafío
  - Clientes agresivos
  - Intentos de estafa
  - Demandas contradictorias

Fase 5: Adversarial
  - Intentos de extorsión
  - Agentes encubiertos investigando
  - Amenazas veladas

Fase 6: Maestría
  - Escenarios multi-partido
  - Conflictos de lealtad
  - Información clasificada de QDT
```

---

## 3. STACK TECNOLÓGICO A INVESTIGAR

### Backend Options

| Tecnología | Pros | Contras | Investigar |
|------------|------|---------|------------|
| **Python + FastAPI** | Ecosistema ML, sentence-transformers nativo | Concurrencia limitada | ✅ Prioridad |
| **Node.js + Workers** | Familiar, fácil integración | ML libraries limitadas | ✅ Secundario |
| **Go + goroutines** | Alta concurrencia | Menos ML tooling | ⚠️ Opcional |
| **Ray (Python)** | Diseñado para parallelism ML | Curva de aprendizaje | ✅ Investigar |

### Generación de Diálogos

| Opción | Costo | Calidad | Velocidad |
|--------|-------|---------|-----------|
| **OpenAI API (GPT-4)** | Alto ($$$) | Excelente | Lento (rate limits) |
| **Anthropic Claude API** | Alto ($$$) | Excelente | Medio |
| **Local Llama 3 (70B)** | GPU ($) | Muy bueno | Medio |
| **Local Mistral (7B)** | CPU viable | Bueno | Rápido |
| **Templates + Slots** | Gratis | Variable | Muy rápido |

### Embeddings

| Modelo | Dimensiones | Tamaño | Calidad |
|--------|-------------|--------|---------|
| **all-MiniLM-L6-v2** | 384 | 80MB | Muy bueno |
| **gte-small** | 384 | 60MB | Bueno |
| **bge-base-en-v1.5** | 768 | 220MB | Excelente |
| **nomic-embed-text** | 768 | 270MB | Excelente |

---

## 4. ARQUITECTURA PROPUESTA A VALIDAR

```
┌─────────────────────────────────────────────────────────────┐
│                   SIMULATION SERVER                          │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Scenario     │    │ Dialogue     │    │ Experience   │  │
│  │ Generator    │───►│ Simulator    │───►│ Extractor    │  │
│  │              │    │ (LLM/Template)│   │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       │           │
│         │              ┌──────────────┐         │           │
│         └─────────────►│ Parallel     │◄────────┘           │
│                        │ Orchestrator │                     │
│                        │ (Ray/Workers)│                     │
│                        └──────────────┘                     │
│                               │                              │
│                               ▼                              │
│                   ┌──────────────────┐                      │
│                   │ Embedding        │                      │
│                   │ Generator        │                      │
│                   │ (sentence-trans) │                      │
│                   └──────────────────┘                      │
│                               │                              │
│                               ▼                              │
│                   ┌──────────────────┐                      │
│                   │ Package Builder  │                      │
│                   │ (JSON export)    │                      │
│                   └──────────────────┘                      │
│                               │                              │
└───────────────────────────────┼──────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   zamir_package.json  │
                    │   - experiences[]     │
                    │   - embeddings[]      │
                    │   - personality       │
                    │   - lore_context      │
                    └──────────────────────┘
```

---

## 5. OUTPUT ESPERADO DEL SERVIDOR

### Archivo: `zamir_experience_package.json`

```json
{
  "npcId": "zamir_talaquett",
  "version": "1.0.0",
  "generatedAt": "2025-01-15T00:00:00Z",
  "simulationStats": {
    "totalScenarios": 10000,
    "uniqueExperiences": 2500,
    "averageImportance": 5.4
  },

  "personality": {
    "name": "Zamir Talaquett",
    "role": "Bartender / Reclutador Encubierto QDT",
    "location": "Sector Inhumano - Laboratorios QDT",
    "traits": {
      "friendliness": 0.7,
      "suspicion": 0.6,
      "humor": 0.5,
      "secrecy": 0.9
    },
    "systemPrompt": "Eres Zamir Talaquett, un bartender en el sector más inhumano de los laboratorios QDT..."
  },

  "loreContext": {
    "organization": "QDT - Quantum Dimensys Technologies",
    "location": "Sector de Confinamiento Omega",
    "keyFigures": ["Dr. Lars Kremslinger", "Proyecto A", "Proyecto Y"],
    "forbiddenTopics": ["ubicación exacta del portal", "códigos de acceso"]
  },

  "experiences": [
    {
      "id": "exp_001",
      "content": "Un mercenario intentó venderme armas robadas de QDT. Le dije que no trabajo con material caliente.",
      "embedding": [0.12, -0.45, 0.33, ...], // 384 dimensiones
      "metadata": {
        "importance": 7,
        "type": "negotiation",
        "emotion": "cautious",
        "tags": ["weapons", "mercenary", "rejected"]
      }
    },
    // ... 2499 más
  ],

  "predefinedDialogues": {
    "greeting_first_time": [
      "Vaya, vaya... una cara nueva en mi establecimiento.",
      "¿Perdido, o buscando algo específico?"
    ],
    "greeting_returning": [
      "Ah, mi cliente favorito regresa.",
      "¿Lo de siempre, o vienes por algo más interesante?"
    ],
    "shop_browse": [
      "Mira el menú. Si no está ahí, tal vez pueda conseguirlo.",
      "Todo tiene precio. La pregunta es si puedes pagarlo."
    ],
    "classified_question": [
      "*Zamir te mira fijamente por un momento*",
      "Hay cosas que es mejor no preguntar aquí, amigo."
    ]
  }
}
```

### Archivo: `zamir_interactions_log.csv`

Para retroalimentación y mejora continua:

```csv
timestamp,session_id,player_input,zamir_response,response_type,satisfaction_score
2025-01-15T14:30:00Z,sess_001,"¿Qué tienes para vender?","Mira el menú. Si no está ahí...",predefined,null
2025-01-15T14:30:15Z,sess_001,"Cuéntame sobre Lars","*alza una ceja* El Director es... un hombre de ciencia.",rag_generated,null
2025-01-15T14:30:45Z,sess_001,"¿Tienes armas?","Tengo lo que necesitas. La pregunta es...",hybrid,null
```

---

## 6. CHECKLIST DE INVESTIGACIÓN

### Fase 1: Fundamentos
- [ ] Leer paper "Generative Agents: Interactive Simulacra of Human Behavior" (Stanford)
- [ ] Estudiar arquitectura de NVIDIA Isaac Sim (conceptos de paralelismo)
- [ ] Investigar sentence-transformers para embeddings
- [ ] Elegir stack de backend (Python recomendado)

### Fase 2: Prototipo de Generación
- [ ] Crear 50 escenarios de prueba manualmente
- [ ] Experimentar con templates de diálogo
- [ ] Probar generación con LLM local (Ollama + Llama/Mistral)
- [ ] Evaluar calidad de diálogos generados

### Fase 3: Pipeline de Embeddings
- [ ] Instalar sentence-transformers
- [ ] Generar embeddings de prueba
- [ ] Medir tiempo de generación en batch
- [ ] Definir formato de exportación JSON

### Fase 4: Paralelismo
- [ ] Investigar Ray para Python o Worker Threads para Node
- [ ] Medir speedup con simulaciones paralelas
- [ ] Optimizar uso de memoria

### Fase 5: Integración
- [ ] Definir formato final de package
- [ ] Crear script de generación completo
- [ ] Documentar cómo correr el servidor
- [ ] Generar primer package de Zamir (10K experiencias)

---

## 7. RECURSOS CLAVE

### Papers
- Generative Agents (Stanford): https://arxiv.org/abs/2304.03442
- Curriculum Learning (Bengio): https://ronan.collobert.com/pub/matos/2009_curriculum_icml.pdf

### Repositorios
- Stanford Generative Agents: github.com/joonspk-research/generative_agents
- Sentence-Transformers: github.com/UKPLab/sentence-transformers
- Ray (parallel computing): github.com/ray-project/ray

### Herramientas
- Ollama (LLM local): ollama.ai
- LangChain (orquestación): langchain.com
- FAISS (vector search): github.com/facebookresearch/faiss

---

## 8. DATOS HARDCODEADOS INICIALES

Mientras no exista el servidor, usar este mock data:

```typescript
// mock-zamir-experiences.ts
export const MOCK_ZAMIR_PACKAGE = {
  npcId: "zamir_talaquett",
  experiences: [
    {
      id: "exp_mock_001",
      content: "Un agente de QDT vino preguntando por el Proyecto Y. Le serví un trago y cambié de tema.",
      embedding: null, // Se generará en browser con modelo local
      metadata: { importance: 8, type: "evasion", tags: ["qdt", "proyecto_y"] }
    },
    {
      id: "exp_mock_002",
      content: "Vendí información sobre las patrullas del Sector Omega a un mercenario. Pagó bien.",
      embedding: null,
      metadata: { importance: 6, type: "sale", tags: ["info", "mercenary"] }
    },
    // ... 20-50 experiencias hardcodeadas para MVP
  ]
};
```

---

**SIGUIENTE PASO**: Una vez investigados estos temas, implementar prototipo en `/backend/simulation-server/` o similar.
