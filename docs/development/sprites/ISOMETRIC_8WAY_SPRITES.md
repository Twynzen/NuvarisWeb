# Sprites Isometricos 8-Way (Turnaround) con Animacion de Caminata

> Documentacion basada en el pipeline de @chongdashu (26 marzo 2026, post ID 2037109734445084684).
> Pipeline 100% reproducible con herramientas de IA disponibles en 2026 (fal.ai + Nano Banana 2 + Veo 3.1).

## Objetivo

Convertir un sprite lateral simple (estilo 2D platformer) en un sheet isometrico de 8 direcciones con animacion de walk, ideal para juegos tipo *Final Fantasy Tactics*.

La meta no es un sprite "cualquiera", sino **mantener la identidad exacta del personaje** (colores, proporciones, cara legible, etc.) y reinterpretarlo en vista isometrica.

---

## 1. Contenido Original del Post

> "I wanted to see if I could take a single non-isometric pixel art sprite and turn it into a full isometric 8-way turnaround with walk animation -- the kind of thing you'd need for a Final Fantasy Tactics-style game.
> All accomplished with existing available AI tools and models. This time I decided to use fal.ai so that I could perform experiments quickly and compare results.
>
> **Start From One Sprite**
> This is the source. A side-view pirate generated with GPT Image 1.5 for a 2D platformer.
> The goal was not 'make any pirate.' The goal was: same red bandana, same blue tunic, same compact body proportions, same readable face. But now reinterpreted into a tactics-style isometric view.
>
> **The First Question: Which Model For The Isometric Anchor?**
> GPT Image 1.5 produced the strongest single result... Nano Banana 2 was the model I liked most for this workflow. It preserved the pirate identity well, gave a clean isometric read, and was materially cheaper...
> GPT 1.5 can handle transparent backgrounds well. Nano Banana 2 needed #00FF00 chroma-key green (flat, no gradients, no shadows). Not magenta (#FF00FF).
>
> **The Workflow: Staged, Not One-Shot**
> One-shot turnarounds don't work. The workflow that actually worked was staged:
> - Stage 1: One Approved Isometric Anchor (SE-facing).
> - Stage 2: Build The 4 Cardinal Facings (N/S/E/W). Trick: West kept drifting -> just mirror East in code.
> - Stage 3: Generate Diagonals From Cardinals. Use semantic descriptions: "NW = mostly back, plus left side", etc.
> - Stage 4: Deterministic Assembly (crop, mirror, normalize height, combine in code).
>
> **Bringing It To Life: Walk Animation With Veo 3.1**
> Took the SW-facing frame... ran it through Google Veo 3.1 Fast via fal.ai. It held the pirate's facing and identity better than the others.
>
> **The Pipeline**
> Side-view sprite -> Nano Banana 2 (SE anchor) -> Nano Banana 2 (4 cardinals) -> Nano Banana 2 (4 diagonals) -> Deterministic assembly -> 8-way sheet -> Veo 3.1 Fast (walk from SW).
> All image generation through fal.ai. All deterministic steps in Python.
>
> **Lessons Learnt**
> - One-shot doesn't work. Staged + anchor + cardinals + diagonals + code = reliable.
> - Model consistency > peak quality.
> - Know when to stop prompting and start coding.
> - Background handling is model-specific.
> - Semantic descriptions beat compass labels.
> - Veo 3.1 is great for sprite animation.
>
> The Real Point: This is about a repeatable, model-agnostic pipeline... The gap is in the last mile (pixel density, clean edges, frame-extractable animation). But the path from one reference to isometric 8-way concept + walk animation is now something you can do in a couple of minutes thanks to AI."

---

## 2. Paso a Paso con Herramientas Actuales (Marzo 2026)

### Herramientas principales

| Herramienta | Uso | Notas |
|---|---|---|
| **fal.ai** | Plataforma de ejecucion | Nano Banana 2 + Veo 3.1, 5-10s por imagen |
| **Nano Banana 2** | Generacion de sprites isometricos | Consistencia de personaje, soporta 14 refs |
| **Veo 3.1 Fast** | Animacion de walk cycles | Mantiene facing e identidad |
| **Python + Pillow** | Ensamblaje deterministico | Gratis y local |
| **Aseprite** (opcional) | Pulido final pixel art | Limpieza de bordes y paleta |

### Paso 1: Preparar la referencia

Genera o usa un sprite lateral (side-view) en PNG con fondo transparente o chroma-key `#00FF00` (verde puro).

### Paso 2: Generar el ancla isometrica SE (Stage 1)

- Modelo: `fal-ai/nano-banana-2` (text-to-image o image-to-image)
- Prompt ejemplo:

```
Isometric SE view of the exact same pixel art [character description],
[key visual traits], Final Fantasy Tactics style, clean pixel art,
transparent background or #00FF00 chroma key
```

- Sube la referencia como image prompt. Aprueba la mejor.

### Paso 3: 4 direcciones cardinales N/S/E/W (Stage 2)

- Genera las 4 juntas o por separado.
- **Truco clave**: si West se desvia, genera solo East y **espeja en codigo** (no luches contra el modelo).

### Paso 4: 4 diagonales NW/NE/SW/SE (Stage 3)

- Usa como referencias: el ancla SE + el sheet de cardinals.
- **Usa descripciones semanticas**, no solo etiquetas de brujula:
  - "NW = mostly back plus left side, same character, same colors, isometric pixel art..."

### Paso 5: Ensamblaje deterministico en Python (Stage 4)

```python
from PIL import Image

# Carga los 8 frames recortados
frames = [Image.open(f"frame_{i}.png") for i in range(8)]

# Normaliza altura y baseline
target_height = 64
for i in range(len(frames)):
    w = int(frames[i].width * target_height / frames[i].height)
    frames[i] = frames[i].resize((w, target_height), Image.NEAREST)

# Ensambla sheet (4x2 grid)
sheet = Image.new("RGBA", (64 * 4, 64 * 2))
for i, frame in enumerate(frames):
    sheet.paste(frame, ((i % 4) * 64, (i // 4) * 64))

sheet.save("8way_sheet.png")
```

### Paso 6: Animacion de caminata

- Toma el frame SW del sheet -> subelo a **Veo 3.1 Fast** en fal.ai.
- Prompt:

```
Pixel art [character] walking in place, SW isometric view,
loopable walk cycle, maintain exact character identity and facing
```

- Exporta como GIF o frames y extrae.

**Tiempo total estimado**: 5-15 minutos por personaje una vez dominado el workflow.

---

## 3. Integracion en Videojuego

### Godot 4.3+ (recomendado para 2D pixel art)

1. Importa el PNG del sheet como `Texture2D`
2. Usa `AnimatedSprite2D` o `Sprite2D` + `AnimationPlayer`
3. Crea animaciones: `walk_n`, `walk_ne`, `walk_e`, `walk_se`, `walk_s`, `walk_sw`, `walk_w`, `walk_nw`

```gdscript
var direction = Vector2.ZERO

func update_animation():
    var angle = direction.angle()
    var dir_index = round((angle + PI) / (PI / 4)) % 8
    var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    $AnimatedSprite2D.play("walk_" + dirs[dir_index])
```

### Unity 6

1. Sprite Renderer + Animator Controller
2. Slice el sheet en Sprite Editor (Grid)
3. Crea 8 animaciones de walk y usa Blend Tree 2D Directional

### Three.js (Nuvaris Web)

Para integracion web con nuestro stack Three.js:

1. Cargar el sprite sheet como textura
2. Usar `PlaneGeometry` con material transparente orientado a camara (billboard)
3. Actualizar UV offset segun direccion y frame de animacion
4. Combinar con el sistema de tiles isometrico existente

---

## 4. Lecciones Clave

1. **One-shot no funciona** - El pipeline staged (ancla + cardinals + diagonals + codigo) es confiable
2. **Consistencia del modelo > calidad pico** - Nano Banana 2 gana por consistencia
3. **Saber cuando dejar de promptear y empezar a codear** - El ensamblaje deterministico es clave
4. **Background handling es model-specific** - Nano Banana 2 necesita `#00FF00`, no transparencia
5. **Descripciones semanticas > etiquetas de brujula** - "mostly back plus left side" > "NW"
6. **Veo 3.1 es excelente para animacion de sprites** - Mantiene facing e identidad

---

## 5. Recursos Adicionales

- Canal YouTube de @chongdashu - Tutoriales gratuitos
- **VibeGameDev** (vibegamedev.com) - Recursos pagos con prompts exactos, codigo fuente y pipelines completos
- **Limitacion actual (2026)**: La IA da excelente concepto/pre-produccion, pero el "last mile" (pixel density perfecto, bordes limpios) aun requiere toque manual en Aseprite
