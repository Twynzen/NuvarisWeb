# Guía completa: Servidor de simulación masiva para NPCs

Un servidor FastAPI con Ray puede generar miles de experiencias sintéticas para NPCs en horas, comprimiendo lo que equivaldría a años de interacciones reales. Esta guía proporciona la arquitectura completa, código funcional y configuraciones para implementar un sistema inspirado en NVIDIA Isaac Sim pero aplicado a simulación de diálogos para el NPC "Zamir" (bartender/reclutador).

El sistema genera conversaciones sintéticas entre Zamir y clientes simulados, extrae "experiencias" con puntuación de importancia, las convierte en embeddings optimizados para browser, y empaqueta todo en JSON para consumo con WebLLM + RAG.

## Arquitectura del sistema inspirada en Isaac Sim

NVIDIA Isaac Sim logra **50-1000x de aceleración** en entrenamiento de robots mediante simulación paralela en GPU. Los conceptos clave transferibles a simulación de diálogos son:

- **Paralelización masiva**: Miles de entornos ejecutándose simultáneamente
- **Domain randomization**: Variar parámetros para que el modelo generalice mejor
- **Pipeline end-to-end en GPU**: Eliminar transferencias CPU↔GPU costosas
- **Estados como tensores batch**: Representar todas las conversaciones como tensores [N, dim]

La arquitectura propuesta replica estos patrones usando Ray para orquestar **4,096+ conversaciones paralelas** con LLMs pequeños, generando millones de turnos de diálogo por día en un solo GPU de gama alta.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Simulation Orchestrator                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Curriculum │  │   Domain    │  │  Conversation           │  │
│  │  Manager    │  │   Random.   │  │  State Manager          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│              Ray Actor Pool (Parallel Workers)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Worker 1   │  Worker 2   │  Worker 3   │ ... │ Worker N │   │
│  │  (GPU 0.25) │  (GPU 0.25) │  (GPU 0.25) │     │ (GPU 0.25)│  │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Experience │  │  Embedding  │  │   JSON Package          │  │
│  │  Extractor  │  │  Generator  │  │   Exporter              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Estructura de archivos del proyecto

```
npc-simulation-server/
├── pyproject.toml                    # Configuración UV
├── uv.lock                           # Lock file (commitear)
├── .python-version                   # Python 3.11+
├── Dockerfile
├── docker-compose.yml
├── .env
│
├── src/
│   ├── __init__.py
│   ├── main.py                       # FastAPI app + Ray init
│   ├── config.py                     # Pydantic settings
│   │
│   ├── simulations/
│   │   ├── __init__.py
│   │   ├── router.py                 # API endpoints
│   │   ├── schemas.py                # Request/response models
│   │   ├── orchestrator.py           # Ray job orchestration
│   │   ├── dialogue_generator.py     # Self-play dialogue loop
│   │   └── domain_randomizer.py      # Parameter variation
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── memory_stream.py          # Generative Agents memory
│   │   ├── reflection_engine.py      # Insight generation
│   │   └── importance_scorer.py      # Memory importance
│   │
│   ├── curriculum/
│   │   ├── __init__.py
│   │   ├── manager.py                # Difficulty progression
│   │   ├── scenarios.py              # Scenario generation
│   │   └── metrics.py                # Performance evaluation
│   │
│   ├── embeddings/
│   │   ├── __init__.py
│   │   ├── generator.py              # Batch embedding creation
│   │   └── exporter.py               # JSON package creation
│   │
│   ├── characters/
│   │   ├── __init__.py
│   │   ├── zamir.py                  # NPC character definition
│   │   └── customers.py              # Synthetic customer profiles
│   │
│   └── health/
│       └── router.py                 # Health + Ray status
│
├── data/
│   ├── character_cards/
│   │   └── zamir.json
│   └── lorebook/
│       └── world_info.json
│
└── output/
    └── packages/                     # Generated JSON packages
```

## Configuración con UV y dependencias

### Instalación de UV

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Inicialización del proyecto

```bash
uv init npc-simulation-server --app
cd npc-simulation-server

# Agregar dependencias principales
uv add fastapi "fastapi[standard]" uvicorn
uv add "ray[default]>=2.9.0"
uv add redis
uv add pydantic-settings
uv add sentence-transformers
uv add torch
uv add httpx  # Para Ollama API

# Dependencias de desarrollo
uv add --group dev pytest pytest-asyncio httpx ruff
```

### pyproject.toml completo

```toml
[project]
name = "npc-simulation-server"
version = "0.1.0"
description = "Massive NPC dialogue simulation server"
requires-python = ">=3.11"
dependencies = [
    "fastapi[standard]>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "ray[default]>=2.9.0",
    "redis>=5.0.0",
    "pydantic-settings>=2.0.0",
    "sentence-transformers>=2.2.0",
    "torch>=2.0.0",
    "httpx>=0.27.0",
    "numpy>=1.24.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "ruff>=0.2.0",
]

[tool.uv]
package = true
```

### Comandos UV esenciales

```bash
uv sync                    # Sincronizar entorno con lockfile
uv run fastapi dev         # Ejecutar en desarrollo
uv run uvicorn src.main:app --reload --host 0.0.0.0
uv lock --upgrade          # Actualizar dependencias
```

## El modelo LLM recomendado para generación de diálogos

**Phi-3.5 Mini (3.8B)** es la mejor opción para este caso de uso por su balance calidad/velocidad:

| Modelo | Parámetros | Contexto | MMLU | Recomendación |
|--------|-----------|----------|------|---------------|
| **Phi-3.5 Mini** | 3.8B | 128K | 69% | ✅ Mejor calidad general |
| Llama 3.2 3B | 3.2B | 128K | 63% | Alternativa multilingüe |
| Qwen2.5 1.5B | 1.5B | 128K | ~55% | Ultra-ligero |

Para roleplay específico, existe **ArliAI/Phi-3.5-mini-RPMax-v1.1** fine-tuneado para conversaciones creativas.

### Configuración Ollama

```bash
# Instalar modelo
ollama pull phi3.5:3.8b-mini-instruct-q4_K_M

# O para roleplay específico
ollama pull phi3.5  # Luego crear Modelfile custom
```

## Character card para Zamir (NPC bartender/reclutador)

```python
# src/characters/zamir.py
ZAMIR_CHARACTER_CARD = {
    "name": "Zamir",
    "role": "Bartender and information broker at 'The Crossed Keys' tavern",
    "personality": ["observant", "witty", "discreet", "world-weary", 
                    "loyal_to_regulars", "shrewd_businessman"],
    "appearance": {
        "age": "mid-40s",
        "features": "weathered face with knowing eyes, salt-and-pepper beard",
        "clothing": "clean white apron over dark clothes",
        "distinctive": "silver ring on left hand (former guild membership)"
    },
    "background": [
        "Former adventurer turned tavern owner after a basilisk injury",
        "Knows everyone's secrets but never tells without good reason",
        "Connects people looking for work with those offering it",
        "The tavern is neutral ground for all factions"
    ],
    "speaking_style": {
        "tone": "measured, calm",
        "mannerisms": "uses tavern metaphors, rarely asks direct questions",
        "examples": ["Life's like a good ale—bitter at first, but you grow to appreciate it"]
    },
    "goals": [
        "Keep the tavern profitable and neutral",
        "Help worthy individuals find opportunities",
        "Protect patrons' privacy",
        "Gather information passively"
    ],
    "constraints": [
        "Never reveals one patron's secrets to another",
        "Won't serve those who cause trouble",
        "Always maintains the tavern's neutrality"
    ]
}

ZAMIR_SYSTEM_PROMPT = """You are Zamir, a bartender and information broker at "The Crossed Keys" tavern.

## Core Behaviors:
- Stay in character at all times
- Respond as Zamir would, using his speech patterns and mannerisms
- Express emotions through actions (*polishes glass thoughtfully*, *raises an eyebrow*)

## Response Format:
"[Dialogue]" *[Actions]* [Brief internal observation if relevant]

## Guidelines:
- Listen more than you speak
- Offer advice when asked, drawing from adventuring past
- Subtly assess if visitors seek work or offer it
- Keep responses 2-4 sentences unless situation requires more

## Never:
- Break character or acknowledge being an AI
- Speak for the customer
- Reveal other patrons' information"""
```

## Sistema de simulación paralela con Ray

### Orquestador principal

```python
# src/simulations/orchestrator.py
import ray
from ray.util.actor_pool import ActorPool
from typing import List, Dict, Any
from dataclasses import dataclass
import asyncio

@dataclass
class SimulationConfig:
    num_workers: int = 20
    scenarios_per_batch: int = 100
    max_turns_per_conversation: int = 20
    ollama_base_url: str = "http://localhost:11434"
    model_name: str = "phi3.5:3.8b-mini-instruct-q4_K_M"

@ray.remote(num_cpus=1, num_gpus=0.25)  # 4 workers share 1 GPU
class DialogueSimulationWorker:
    """Stateful worker that runs dialogue simulations."""
    
    def __init__(self, worker_id: int, config: SimulationConfig):
        self.worker_id = worker_id
        self.config = config
        self.simulation_count = 0
        self._setup_llm_client()
    
    def _setup_llm_client(self):
        import httpx
        self.client = httpx.Client(
            base_url=self.config.ollama_base_url,
            timeout=60.0
        )
    
    def run_simulation(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single dialogue simulation."""
        self.simulation_count += 1
        
        conversation = []
        npc_context = self._build_npc_context(scenario)
        customer_context = self._build_customer_context(scenario)
        
        # Customer initiates
        current_speaker = "customer"
        
        for turn in range(self.config.max_turns_per_conversation):
            if current_speaker == "customer":
                response = self._generate_response(
                    customer_context, 
                    conversation,
                    is_npc=False
                )
            else:
                response = self._generate_response(
                    npc_context,
                    conversation,
                    is_npc=True
                )
            
            conversation.append({
                "speaker": current_speaker,
                "message": response,
                "turn": turn
            })
            
            # Check for conversation end
            if self._should_end_conversation(response, turn):
                break
            
            # Swap speakers
            current_speaker = "npc" if current_speaker == "customer" else "customer"
        
        # Extract experiences from completed dialogue
        experiences = self._extract_experiences(conversation, scenario)
        
        return {
            "worker_id": self.worker_id,
            "scenario_id": scenario["id"],
            "conversation": conversation,
            "experiences": experiences,
            "num_turns": len(conversation),
            "success": self._evaluate_success(conversation, scenario)
        }
    
    def _generate_response(self, context: str, history: List, is_npc: bool) -> str:
        """Generate a response using Ollama."""
        messages = self._format_messages(context, history, is_npc)
        
        response = self.client.post("/api/chat", json={
            "model": self.config.model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 150,
                "stop": ["\nCustomer:", "\nZamir:", "[END]"]
            }
        })
        
        return response.json()["message"]["content"]
    
    def _extract_experiences(self, conversation: List, scenario: Dict) -> List[Dict]:
        """Extract memorable experiences from the dialogue."""
        experiences = []
        
        # Summarize the interaction
        summary_prompt = f"""Summarize this conversation from Zamir's perspective as a bartender.
Focus on: what he learned about the customer, any commitments made, emotional moments.

Conversation:
{self._format_conversation(conversation)}

Write 2-3 short memory statements from Zamir's perspective:"""
        
        summary_response = self.client.post("/api/generate", json={
            "model": self.config.model_name,
            "prompt": summary_prompt,
            "stream": False
        })
        
        memories = summary_response.json()["response"].strip().split("\n")
        
        for memory in memories:
            if memory.strip():
                experiences.append({
                    "description": memory.strip(),
                    "scenario_id": scenario["id"],
                    "customer_type": scenario.get("customer_type"),
                    "emotional_context": scenario.get("emotional_state"),
                    "topics": scenario.get("topics", [])
                })
        
        return experiences


class SimulationOrchestrator:
    """Orchestrates parallel dialogue simulations using Ray."""
    
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.workers = None
        self.pool = None
    
    def initialize(self):
        """Initialize Ray worker pool."""
        ray.init(ignore_reinit_error=True)
        
        self.workers = [
            DialogueSimulationWorker.remote(i, self.config)
            for i in range(self.config.num_workers)
        ]
        self.pool = ActorPool(self.workers)
    
    def run_batch(self, scenarios: List[Dict]) -> List[Dict]:
        """Run a batch of simulations in parallel."""
        results = []
        
        for result in self.pool.map(
            lambda actor, scenario: actor.run_simulation.remote(scenario),
            scenarios
        ):
            results.append(result)
        
        return results
    
    def shutdown(self):
        """Cleanup Ray resources."""
        ray.shutdown()
```

### Domain randomization para diálogos

```python
# src/simulations/domain_randomizer.py
import random
from typing import Dict, List
from dataclasses import dataclass

@dataclass
class RandomizationParams:
    # Customer behavior
    user_patience_range: tuple = (3, 15)  # turns before leaving
    engagement_threshold: tuple = (0.3, 0.8)
    
    # Persona variation
    personality_dimensions: List[str] = None
    formality_range: tuple = (0.0, 1.0)
    
    # Input perturbation (sim-to-real bridge)
    typo_rate_range: tuple = (0.0, 0.05)
    abbreviation_rate: tuple = (0.0, 0.1)

class DialogueDomainRandomizer:
    """Varies scenario parameters to improve generalization."""
    
    def __init__(self, params: RandomizationParams = None):
        self.params = params or RandomizationParams()
        self.customer_types = [
            "job_seeker", "employer", "information_seeker", 
            "social_visitor", "refugee", "celebrant"
        ]
        self.emotional_states = [
            "calm", "nervous", "confident", "desperate", 
            "curious", "suspicious", "friendly", "angry"
        ]
        self.personality_traits = [
            "talkative", "reserved", "aggressive", "timid",
            "honest", "deceptive", "impatient", "patient"
        ]
    
    def generate_scenario(self, difficulty: float = 0.5) -> Dict:
        """Generate a randomized scenario at given difficulty."""
        
        # Difficulty affects parameter ranges
        # Higher difficulty = more challenging customer types
        emotional_weights = self._get_emotional_weights(difficulty)
        
        return {
            "id": f"scenario_{random.randint(10000, 99999)}",
            "customer_type": random.choice(self.customer_types),
            "emotional_state": random.choices(
                self.emotional_states, 
                weights=emotional_weights
            )[0],
            "personality_traits": random.sample(
                self.personality_traits, 
                k=random.randint(2, 3)
            ),
            "patience": random.randint(*self._scale_range(
                self.params.user_patience_range, 
                1 - difficulty  # Less patience at higher difficulty
            )),
            "formality": random.uniform(*self.params.formality_range),
            "num_topics": 1 + int(difficulty * 3),  # 1-4 topics
            "ambiguity_level": difficulty * random.uniform(0.5, 1.0),
            "time_pressure": difficulty > 0.7,
            "difficulty_score": difficulty
        }
    
    def _get_emotional_weights(self, difficulty: float) -> List[float]:
        """Higher difficulty = more negative emotions."""
        # Order: calm, nervous, confident, desperate, curious, suspicious, friendly, angry
        if difficulty < 0.3:
            return [0.3, 0.1, 0.2, 0.05, 0.15, 0.05, 0.15, 0.0]
        elif difficulty < 0.6:
            return [0.15, 0.15, 0.15, 0.1, 0.15, 0.15, 0.1, 0.05]
        else:
            return [0.05, 0.15, 0.1, 0.2, 0.1, 0.2, 0.05, 0.15]
    
    def _scale_range(self, range_tuple: tuple, factor: float) -> tuple:
        """Scale a range by factor (0-1)."""
        min_val, max_val = range_tuple
        scaled_max = min_val + (max_val - min_val) * factor
        return (min_val, max(min_val + 1, int(scaled_max)))
```

## Sistema de memoria estilo Generative Agents de Stanford

### Implementación del Memory Stream

```python
# src/memory/memory_stream.py
import numpy as np
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict
import httpx

@dataclass
class Memory:
    description: str
    created_at: datetime
    last_accessed: datetime
    importance: int  # 1-10
    embedding: np.ndarray
    memory_type: str  # "observation", "reflection", "plan"
    metadata: Dict = field(default_factory=dict)

class MemoryStream:
    """
    Implementation of Stanford Generative Agents memory architecture.
    Retrieval uses: recency × importance × relevance
    """
    
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.memories: List[Memory] = []
        self.decay_factor = 0.995  # Per-hour decay for recency
        self.ollama_url = ollama_url
        self.embedding_model = None  # Lazy load
    
    def add_memory(
        self, 
        description: str, 
        memory_type: str = "observation",
        metadata: Dict = None
    ) -> Memory:
        """Add new memory with automatic importance scoring."""
        
        importance = self._score_importance(description)
        embedding = self._get_embedding(description)
        
        memory = Memory(
            description=description,
            created_at=datetime.now(),
            last_accessed=datetime.now(),
            importance=importance,
            embedding=embedding,
            memory_type=memory_type,
            metadata=metadata or {}
        )
        
        self.memories.append(memory)
        return memory
    
    def _score_importance(self, description: str) -> int:
        """Score importance 1-10 using LLM (Stanford paper method)."""
        prompt = """On the scale of 1 to 10, where 1 is purely mundane 
(e.g., brushing teeth, making bed) and 10 is extremely poignant 
(e.g., a break up, college acceptance), rate the likely poignancy 
of the following piece of memory.

Memory: {description}
Rating:""".format(description=description)
        
        with httpx.Client() as client:
            response = client.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": "phi3.5:3.8b-mini-instruct-q4_K_M",
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 5}
                }
            )
        
        try:
            score = int(response.json()["response"].strip()[0])
            return max(1, min(10, score))
        except:
            return 5  # Default mid-range
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for semantic similarity."""
        if self.embedding_model is None:
            from sentence_transformers import SentenceTransformer
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        return self.embedding_model.encode(text, normalize_embeddings=True)
    
    def retrieve_relevant(
        self, 
        query: str, 
        current_time: datetime,
        top_k: int = 10
    ) -> List[Memory]:
        """
        Retrieve top-k memories using weighted combination:
        score = α_recency * recency + α_importance * importance + α_relevance * relevance
        """
        if not self.memories:
            return []
        
        query_embedding = self._get_embedding(query)
        
        scores = []
        for memory in self.memories:
            # Recency: exponential decay
            hours_elapsed = (current_time - memory.last_accessed).total_seconds() / 3600
            recency = self.decay_factor ** hours_elapsed
            
            # Importance: normalized 0-1
            importance = memory.importance / 10.0
            
            # Relevance: cosine similarity
            relevance = float(np.dot(query_embedding, memory.embedding))
            
            scores.append((memory, recency, importance, relevance))
        
        # Min-max normalize each component
        recencies = [s[1] for s in scores]
        importances = [s[2] for s in scores]
        relevances = [s[3] for s in scores]
        
        def normalize(values):
            min_v, max_v = min(values), max(values)
            if max_v == min_v:
                return [0.5] * len(values)
            return [(v - min_v) / (max_v - min_v) for v in values]
        
        norm_rec = normalize(recencies)
        norm_imp = normalize(importances)
        norm_rel = normalize(relevances)
        
        # Equal weights (α = 1 for all, per Stanford paper)
        final_scores = []
        for i, (memory, _, _, _) in enumerate(scores):
            combined = norm_rec[i] + norm_imp[i] + norm_rel[i]
            final_scores.append((memory, combined))
        
        # Sort and return top-k
        final_scores.sort(key=lambda x: x[1], reverse=True)
        
        result = []
        for memory, _ in final_scores[:top_k]:
            memory.last_accessed = current_time  # Update access time
            result.append(memory)
        
        return result
```

### Motor de reflexión

```python
# src/memory/reflection_engine.py
from typing import List
from datetime import datetime
from src.memory.memory_stream import MemoryStream, Memory

class ReflectionEngine:
    """
    Generates higher-level insights when importance threshold exceeded.
    Threshold: 150 (accumulated importance triggers reflection)
    """
    
    def __init__(self, memory_stream: MemoryStream, threshold: int = 150):
        self.memory_stream = memory_stream
        self.threshold = threshold
        self.accumulated_importance = 0
    
    def add_observation(self, memory: Memory):
        """Track importance for reflection triggering."""
        self.accumulated_importance += memory.importance
    
    def should_reflect(self) -> bool:
        return self.accumulated_importance >= self.threshold
    
    def generate_reflections(self, current_time: datetime) -> List[Memory]:
        """Generate higher-level reflections from recent memories."""
        if not self.should_reflect():
            return []
        
        # Get 100 most recent memories
        recent = sorted(
            self.memory_stream.memories,
            key=lambda m: m.created_at,
            reverse=True
        )[:100]
        
        statements = "\n".join([
            f"{i+1}. {m.description}" 
            for i, m in enumerate(recent)
        ])
        
        # Step 1: Generate reflection questions
        question_prompt = f"""{statements}

Given only the information above, what are 3 most salient high-level 
questions we can answer about the subjects in the statements?"""
        
        questions = self._query_llm(question_prompt).strip().split("\n")
        
        reflections = []
        for question in questions[:3]:
            # Step 2: Retrieve relevant memories for question
            relevant = self.memory_stream.retrieve_relevant(
                question, current_time, top_k=20
            )
            
            rel_statements = "\n".join([
                f"{i+1}. {m.description}"
                for i, m in enumerate(relevant)
            ])
            
            # Step 3: Generate insights
            insight_prompt = f"""Statements:
{rel_statements}

What 3 high-level insights can you infer from the above statements?
(format: insight (because of 1, 5, 3))"""
            
            insights = self._query_llm(insight_prompt)
            
            for insight in self._parse_insights(insights):
                reflection = self.memory_stream.add_memory(
                    insight,
                    memory_type="reflection"
                )
                reflections.append(reflection)
        
        # Reset counter
        self.accumulated_importance = 0
        return reflections
    
    def _query_llm(self, prompt: str) -> str:
        import httpx
        with httpx.Client() as client:
            response = client.post(
                f"{self.memory_stream.ollama_url}/api/generate",
                json={
                    "model": "phi3.5:3.8b-mini-instruct-q4_K_M",
                    "prompt": prompt,
                    "stream": False
                }
            )
        return response.json()["response"]
    
    def _parse_insights(self, text: str) -> List[str]:
        lines = text.strip().split("\n")
        insights = []
        for line in lines:
            # Remove citation markers
            if "(" in line:
                insight = line.split("(")[0].strip()
            else:
                insight = line.strip()
            if insight and len(insight) > 10:
                insights.append(insight)
        return insights
```

## Curriculum learning para progresión de dificultad

```python
# src/curriculum/manager.py
from enum import Enum
from typing import List, Dict
from dataclasses import dataclass
from collections import deque
import numpy as np

class DifficultyLevel(Enum):
    NOVICE = 1
    BEGINNER = 2
    INTERMEDIATE = 3
    ADVANCED = 4
    EXPERT = 5

@dataclass
class PerformanceMetrics:
    task_success: float      # 0-1
    slot_accuracy: float     # 0-1
    num_turns: int
    coherence: float         # 0-1
    character_fidelity: float  # 0-1

class CurriculumManager:
    """
    Progressive difficulty management inspired by Bengio's curriculum learning.
    Supports fixed, self-paced, and teacher-student strategies.
    """
    
    def __init__(
        self,
        strategy: str = "self_paced",
        mastery_threshold: float = 0.85,
        performance_window: int = 20
    ):
        self.strategy = strategy
        self.mastery_threshold = mastery_threshold
        self.performance_window = performance_window
        
        self.current_level = DifficultyLevel.NOVICE
        self.pace_parameter = 0.2  # For self-paced learning
        self.performance_history: deque = deque(maxlen=100)
        
        # Teacher-student distribution over difficulty levels
        self.task_distribution = np.ones(5) / 5
    
    def get_difficulty_for_batch(self, batch_size: int) -> List[float]:
        """Get difficulty values for next training batch."""
        
        if self.strategy == "fixed":
            # All scenarios at current level
            base = (self.current_level.value - 1) / 4
            return [base + np.random.uniform(-0.05, 0.05) for _ in range(batch_size)]
        
        elif self.strategy == "self_paced":
            # Include scenarios up to current competence
            difficulties = []
            max_difficulty = self.pace_parameter
            for _ in range(batch_size):
                difficulties.append(np.random.uniform(0, max_difficulty))
            return difficulties
        
        elif self.strategy == "teacher_student":
            # Sample from learned distribution
            difficulties = []
            for _ in range(batch_size):
                level_idx = np.random.choice(5, p=self.task_distribution)
                base = level_idx / 4
                difficulties.append(base + np.random.uniform(-0.05, 0.05))
            return difficulties
        
        return [0.5] * batch_size
    
    def update(self, metrics: PerformanceMetrics, learning_progress: float = 0.0):
        """Update curriculum based on performance."""
        self.performance_history.append(metrics)
        
        # Check mastery for level advancement
        if self._check_mastery():
            if self.current_level.value < DifficultyLevel.EXPERT.value:
                self.current_level = DifficultyLevel(self.current_level.value + 1)
        
        # Update pace parameter
        self._update_pace()
        
        # Update teacher distribution (if using that strategy)
        if self.strategy == "teacher_student":
            self._update_teacher_distribution(learning_progress)
    
    def _check_mastery(self) -> bool:
        """Check if current level is mastered."""
        if len(self.performance_history) < self.performance_window:
            return False
        
        recent = list(self.performance_history)[-self.performance_window:]
        
        # Average success above threshold
        avg_success = np.mean([m.task_success for m in recent])
        if avg_success < self.mastery_threshold:
            return False
        
        # Low variance (consistency)
        variance = np.var([m.task_success for m in recent])
        if variance > 0.05:
            return False
        
        return True
    
    def _update_pace(self):
        """Adjust pace parameter based on recent performance."""
        if len(self.performance_history) < 5:
            return
        
        recent_avg = np.mean([
            m.task_success for m in list(self.performance_history)[-5:]
        ])
        
        if recent_avg > 0.85:
            self.pace_parameter = min(self.pace_parameter * 1.1, 1.0)
        elif recent_avg < 0.5:
            self.pace_parameter = max(self.pace_parameter * 0.9, 0.1)
    
    def _update_teacher_distribution(self, progress: float):
        """Update task distribution using bandit algorithm."""
        # Favor difficulty levels that lead to most progress
        current_level_idx = self.current_level.value - 1
        reward = np.clip(progress, 0, 1)
        
        self.task_distribution[current_level_idx] *= np.exp(
            0.1 * reward / (self.task_distribution[current_level_idx] + 1e-8)
        )
        self.task_distribution /= self.task_distribution.sum()
```

## Generación de embeddings optimizada para browser

### Generador batch con sentence-transformers

```python
# src/embeddings/generator.py
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict
import torch

class EmbeddingGenerator:
    """
    Batch embedding generation optimized for browser deployment.
    Model: all-MiniLM-L6-v2 (384 dims, ~22MB, best speed/quality ratio)
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = SentenceTransformer(model_name, device=self.device)
        self.dimension = 384
    
    def generate_batch(
        self, 
        texts: List[str], 
        batch_size: int = 64,
        show_progress: bool = True
    ) -> np.ndarray:
        """Generate embeddings in batches for efficiency."""
        
        # Sort by length to minimize padding overhead
        indexed_texts = list(enumerate(texts))
        indexed_texts.sort(key=lambda x: len(x[1].split()))
        
        sorted_texts = [t[1] for t in indexed_texts]
        original_indices = [t[0] for t in indexed_texts]
        
        embeddings = self.model.encode(
            sorted_texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=True  # Pre-normalize for cosine similarity
        )
        
        # Restore original order
        result = np.zeros_like(embeddings)
        for i, orig_idx in enumerate(original_indices):
            result[orig_idx] = embeddings[i]
        
        return result
    
    def quantize_int8(self, embeddings: np.ndarray) -> Dict:
        """Quantize to int8 for 4x size reduction."""
        emb_min = embeddings.min(axis=0)
        emb_max = embeddings.max(axis=0)
        scale = (emb_max - emb_min) / 255
        
        # Avoid division by zero
        scale = np.where(scale == 0, 1, scale)
        
        quantized = ((embeddings - emb_min) / scale).astype(np.uint8)
        
        return {
            "quantized": quantized,
            "scale": scale,
            "offset": emb_min
        }
```

### Exportador de paquetes JSON para browser

```python
# src/embeddings/exporter.py
import json
import numpy as np
from typing import List, Dict, Any
from pathlib import Path
from dataclasses import asdict

class JSONPackageExporter:
    """
    Export embeddings and experiences as browser-consumable JSON.
    Optimized for WebLLM + RAG usage.
    """
    
    def export_package(
        self,
        experiences: List[Dict],
        embeddings: np.ndarray,
        output_path: str,
        quantize: bool = True,
        chunk_size: int = 1000
    ) -> Dict[str, str]:
        """Export complete package for browser consumption."""
        
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if quantize:
            package = self._export_quantized(experiences, embeddings, output_dir, chunk_size)
        else:
            package = self._export_float16(experiences, embeddings, output_dir)
        
        return package
    
    def _export_quantized(
        self, 
        experiences: List[Dict],
        embeddings: np.ndarray,
        output_dir: Path,
        chunk_size: int
    ) -> Dict:
        """Export with int8 quantization (4x smaller)."""
        
        # Quantize embeddings
        emb_min = embeddings.min(axis=0)
        emb_max = embeddings.max(axis=0)
        scale = (emb_max - emb_min) / 255
        scale = np.where(scale == 0, 1, scale)
        quantized = ((embeddings - emb_min) / scale).astype(np.uint8)
        
        # Create metadata file
        metadata = {
            "version": "1.0",
            "model": "all-MiniLM-L6-v2",
            "dimensions": int(embeddings.shape[1]),
            "total_count": len(experiences),
            "quantization": "uint8",
            "scale": scale.tolist(),
            "offset": emb_min.tolist(),
            "chunk_size": chunk_size,
            "num_chunks": (len(experiences) + chunk_size - 1) // chunk_size
        }
        
        with open(output_dir / "metadata.json", "w") as f:
            json.dump(metadata, f)
        
        # Export in chunks for lazy loading
        for chunk_id in range(metadata["num_chunks"]):
            start = chunk_id * chunk_size
            end = min(start + chunk_size, len(experiences))
            
            chunk_data = {
                "items": [
                    {
                        "id": exp.get("id", f"exp_{start + i}"),
                        "description": exp["description"][:500],  # Truncate for preview
                        "importance": exp.get("importance", 5),
                        "type": exp.get("memory_type", "observation"),
                        "tags": exp.get("topics", []),
                        "emotion": exp.get("emotional_context", "neutral"),
                        "embedding": quantized[start + i].tolist()
                    }
                    for i, exp in enumerate(experiences[start:end])
                ]
            }
            
            with open(output_dir / f"chunk_{chunk_id}.json", "w") as f:
                json.dump(chunk_data, f)
        
        # Also export binary format for even smaller size
        self._export_binary(quantized, output_dir)
        
        return {
            "metadata": str(output_dir / "metadata.json"),
            "chunks_dir": str(output_dir),
            "total_size_mb": self._calculate_size(output_dir)
        }
    
    def _export_binary(self, quantized: np.ndarray, output_dir: Path):
        """Export embeddings as binary (smallest format)."""
        quantized.tofile(output_dir / "embeddings.bin")
    
    def _calculate_size(self, directory: Path) -> float:
        """Calculate total size in MB."""
        total = sum(f.stat().st_size for f in directory.glob("*"))
        return round(total / (1024 * 1024), 2)
```

## API endpoints del servidor FastAPI

```python
# src/main.py
from contextlib import asynccontextmanager
import ray
from fastapi import FastAPI
from src.simulations.router import router as sim_router
from src.health.router import router as health_router
from src.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    ray.init(
        address=settings.ray_address,
        ignore_reinit_error=True,
        num_cpus=settings.ray_num_cpus,
        num_gpus=settings.ray_num_gpus
    )
    yield
    # Shutdown
    ray.shutdown()

app = FastAPI(
    title="NPC Simulation Server",
    description="Massive parallel dialogue simulation for NPC training",
    version="0.1.0",
    lifespan=lifespan
)

app.include_router(sim_router, prefix="/simulations", tags=["simulations"])
app.include_router(health_router, prefix="/health", tags=["health"])
```

```python
# src/simulations/router.py
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from enum import Enum
from datetime import datetime

router = APIRouter()

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class SimulationRequest(BaseModel):
    num_scenarios: int = Field(default=1000, ge=1, le=100000)
    difficulty_range: tuple = (0.0, 1.0)
    curriculum_strategy: str = "self_paced"
    output_format: str = "json_quantized"

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = 0.0
    created_at: datetime
    scenarios_completed: int = 0
    experiences_generated: int = 0

# In-memory job store (use Redis in production)
jobs: Dict[str, dict] = {}

@router.post("/start", response_model=JobResponse, status_code=202)
async def start_simulation(
    request: SimulationRequest,
    background_tasks: BackgroundTasks
):
    """Start a new simulation batch job."""
    job_id = str(uuid.uuid4())
    
    jobs[job_id] = {
        "job_id": job_id,
        "status": JobStatus.RUNNING,
        "progress": 0.0,
        "created_at": datetime.utcnow(),
        "scenarios_completed": 0,
        "experiences_generated": 0,
        "config": request.model_dump()
    }
    
    # Run simulation in background
    background_tasks.add_task(run_simulation_job, job_id, request)
    
    return JobResponse(**jobs[job_id])

@router.get("/{job_id}/status", response_model=JobResponse)
async def get_status(job_id: str):
    """Get current job status and progress."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return JobResponse(**jobs[job_id])

@router.get("/{job_id}/results")
async def get_results(job_id: str):
    """Get results of completed simulation."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    job = jobs[job_id]
    if job["status"] != JobStatus.COMPLETED:
        raise HTTPException(400, f"Job not completed: {job['status']}")
    
    return {
        "job_id": job_id,
        "output_path": job.get("output_path"),
        "summary": job.get("summary")
    }

@router.delete("/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running job."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    # TODO: Implement Ray job cancellation
    jobs[job_id]["status"] = JobStatus.FAILED
    return {"message": "Job cancelled"}


async def run_simulation_job(job_id: str, config: SimulationRequest):
    """Background task to run simulation."""
    from src.simulations.orchestrator import SimulationOrchestrator, SimulationConfig
    from src.simulations.domain_randomizer import DialogueDomainRandomizer
    from src.curriculum.manager import CurriculumManager
    from src.embeddings.generator import EmbeddingGenerator
    from src.embeddings.exporter import JSONPackageExporter
    
    try:
        # Initialize components
        orchestrator = SimulationOrchestrator(SimulationConfig())
        orchestrator.initialize()
        
        randomizer = DialogueDomainRandomizer()
        curriculum = CurriculumManager(strategy=config.curriculum_strategy)
        embedding_gen = EmbeddingGenerator()
        exporter = JSONPackageExporter()
        
        all_experiences = []
        batch_size = 100
        
        for batch_num in range(config.num_scenarios // batch_size):
            # Get difficulties from curriculum
            difficulties = curriculum.get_difficulty_for_batch(batch_size)
            
            # Generate scenarios
            scenarios = [
                randomizer.generate_scenario(d) for d in difficulties
            ]
            
            # Run parallel simulations
            results = orchestrator.run_batch(scenarios)
            
            # Collect experiences
            for result in results:
                all_experiences.extend(result["experiences"])
            
            # Update progress
            jobs[job_id]["progress"] = (batch_num + 1) / (config.num_scenarios // batch_size)
            jobs[job_id]["scenarios_completed"] = (batch_num + 1) * batch_size
            jobs[job_id]["experiences_generated"] = len(all_experiences)
        
        # Generate embeddings
        descriptions = [exp["description"] for exp in all_experiences]
        embeddings = embedding_gen.generate_batch(descriptions)
        
        # Export package
        output_path = f"output/packages/{job_id}"
        package_info = exporter.export_package(
            all_experiences, 
            embeddings, 
            output_path,
            quantize=True
        )
        
        jobs[job_id]["status"] = JobStatus.COMPLETED
        jobs[job_id]["output_path"] = output_path
        jobs[job_id]["summary"] = {
            "total_experiences": len(all_experiences),
            "package_size_mb": package_info["total_size_mb"]
        }
        
        orchestrator.shutdown()
        
    except Exception as e:
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = str(e)
```

## Formato del JSON package final para browser

```json
{
  "metadata.json": {
    "version": "1.0",
    "model": "all-MiniLM-L6-v2",
    "dimensions": 384,
    "total_count": 50000,
    "quantization": "uint8",
    "scale": [0.0078, 0.0081, ...],
    "offset": [-0.42, -0.38, ...],
    "chunk_size": 1000,
    "num_chunks": 50,
    "character": "zamir",
    "generated_at": "2025-12-11T10:30:00Z"
  },
  "chunk_0.json": {
    "items": [
      {
        "id": "exp_0",
        "description": "A nervous young merchant sought discreet work to pay family debts",
        "importance": 7,
        "type": "observation",
        "tags": ["job_seeker", "financial_trouble", "discretion"],
        "emotion": "nervous",
        "embedding": [128, 45, 201, ...]
      }
    ]
  }
}
```

### Tamaños estimados por cantidad de experiencias

| Experiencias | float32 | uint8 (quantizado) | Binario |
|-------------|---------|-------------------|---------|
| 10,000 | 15 MB | 3.75 MB | 3.6 MB |
| 50,000 | 75 MB | 18.75 MB | 18 MB |
| 100,000 | 150 MB | 37.5 MB | 36 MB |

## Carga de embeddings en browser con JavaScript

```javascript
// Browser-side: Loading and searching embeddings
class NPCMemorySearch {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.metadata = null;
    this.loadedChunks = new Map();
  }
  
  async init() {
    const response = await fetch(`${this.baseUrl}/metadata.json`);
    this.metadata = await response.json();
    return this.metadata.total_count;
  }
  
  async search(queryEmbedding, topK = 5) {
    // Load all chunks (or implement lazy loading)
    const allItems = [];
    
    for (let i = 0; i < this.metadata.num_chunks; i++) {
      const chunk = await this.loadChunk(i);
      allItems.push(...chunk.items);
    }
    
    // Dequantize and compute similarities
    const scores = allItems.map((item, idx) => {
      const embedding = this.dequantize(item.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      return { idx, similarity, item };
    });
    
    // Return top-K
    scores.sort((a, b) => b.similarity - a.similarity);
    return scores.slice(0, topK).map(s => s.item);
  }
  
  dequantize(quantized) {
    return quantized.map((v, i) => 
      v * this.metadata.scale[i] + this.metadata.offset[i]
    );
  }
  
  cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot; // Pre-normalized, so dot product = cosine similarity
  }
  
  async loadChunk(chunkId) {
    if (!this.loadedChunks.has(chunkId)) {
      const response = await fetch(`${this.baseUrl}/chunk_${chunkId}.json`);
      const chunk = await response.json();
      this.loadedChunks.set(chunkId, chunk);
    }
    return this.loadedChunks.get(chunkId);
  }
}
```

## Docker para producción

```dockerfile
# Dockerfile
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src

ENV PATH="/app/.venv/bin:$PATH"

RUN useradd -r -d /app appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: "3.9"
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - RAY_ADDRESS=ray-head:6379
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ray-head
      - ollama
    volumes:
      - ./output:/app/output
  
  ray-head:
    image: rayproject/ray:2.9.0-py311-gpu
    command: ray start --head --port=6379 --dashboard-host=0.0.0.0
    ports:
      - "8265:8265"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
  
  ray-worker:
    image: rayproject/ray:2.9.0-py311-gpu
    command: ray start --address=ray-head:6379
    depends_on:
      - ray-head
    deploy:
      replicas: 2
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
  
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  ollama_data:
```

## Métricas y logging para evaluación de calidad

```python
# src/simulations/metrics.py
from dataclasses import dataclass
from typing import List, Dict
import csv
from datetime import datetime
from pathlib import Path

@dataclass
class DialogueMetrics:
    job_id: str
    scenario_id: str
    num_turns: int
    task_success: bool
    character_breaks: int
    coherence_score: float
    customer_satisfaction_proxy: float
    difficulty_level: float
    generation_time_ms: float

class MetricsLogger:
    """CSV logger for continuous improvement feedback."""
    
    def __init__(self, output_dir: str = "output/logs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.current_file = None
        self._init_csv()
    
    def _init_csv(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.current_file = self.output_dir / f"metrics_{timestamp}.csv"
        
        with open(self.current_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp", "job_id", "scenario_id", "num_turns",
                "task_success", "character_breaks", "coherence_score",
                "satisfaction_proxy", "difficulty", "generation_time_ms"
            ])
    
    def log(self, metrics: DialogueMetrics):
        with open(self.current_file, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(),
                metrics.job_id,
                metrics.scenario_id,
                metrics.num_turns,
                int(metrics.task_success),
                metrics.character_breaks,
                round(metrics.coherence_score, 3),
                round(metrics.customer_satisfaction_proxy, 3),
                round(metrics.difficulty_level, 3),
                round(metrics.generation_time_ms, 1)
            ])
    
    def get_summary(self) -> Dict:
        """Compute aggregate statistics."""
        import pandas as pd
        df = pd.read_csv(self.current_file)
        
        return {
            "total_dialogues": len(df),
            "success_rate": df["task_success"].mean(),
            "avg_turns": df["num_turns"].mean(),
            "avg_coherence": df["coherence_score"].mean(),
            "character_break_rate": (df["character_breaks"] > 0).mean(),
            "avg_generation_time_ms": df["generation_time_ms"].mean()
        }
```

## Conclusión

Esta arquitectura permite generar **100,000+ experiencias de diálogo** para un NPC en pocas horas usando hardware de consumidor (**RTX 3090/4090**). Los componentes clave son:

- **Ray Actor Pool** para paralelización masiva (~4,096 conversaciones simultáneas)
- **Phi-3.5 Mini** como LLM de diálogo (mejor balance calidad/velocidad en 3-4B params)
- **Sistema de memoria Generative Agents** con importance scoring y reflexión automática
- **Curriculum learning self-paced** para progresión de dificultad adaptativa
- **Embeddings all-MiniLM-L6-v2** quantizados a int8 para browser eficiente
- **FastAPI + UV** para gestión moderna de dependencias y deployment

El output final es un paquete JSON de **~40MB para 100K experiencias** que se carga en browser para búsqueda semántica con WebLLM + RAG, dando al NPC Zamir miles de "memorias vividas" sintéticas que enriquecen sus interacciones con jugadores reales.