# Plan de Desarrollo Sostenible: Sistema de Sprites Isometricos para Nuvaris

## Vision General

Implementar un pipeline reproducible para generar, integrar y gestionar sprites isometricos 8-way en el ecosistema web de Nuvaris (Three.js), partiendo del workflow documentado por @chongdashu.

---

## Fase 1: Fundamentos (Semana 1-2)

### 1.1 Script de ensamblaje de sprites
- [ ] Crear script Python (`tools/sprite-assembler/`) para ensamblaje deterministico
  - Recorte automatico de frames
  - Normalizacion de altura/baseline
  - Generacion de sprite sheets (4x2 grid para 8 direcciones)
  - Soporte chroma-key `#00FF00` -> transparencia
  - Espejado automatico (E -> W) cuando se requiera
- [ ] Tests unitarios para el script

### 1.2 Primer personaje de prueba
- [ ] Generar un personaje de prueba usando el pipeline fal.ai + Nano Banana 2
- [ ] Documentar los prompts exactos que funcionaron
- [ ] Guardar assets en `assets/sprites/characters/test-pirate/`

---

## Fase 2: Integracion Three.js (Semana 3-4)

### 2.1 Sistema de sprites en Three.js
- [ ] Componente `IsometricSprite` que:
  - Carga sprite sheet como textura
  - Billboard (orientado a camara)
  - Actualiza UV offset segun direccion (8-way)
  - Soporta animacion por frames (walk cycle)
- [ ] Sistema de direcciones: calculo de facing basado en movimiento del personaje

### 2.2 Integracion con el mapa isometrico
- [ ] Posicionamiento correcto sobre tiles isometricos
- [ ] Ordenamiento Z (depth sorting) para solapamiento correcto
- [ ] Escala consistente sprite vs tiles

---

## Fase 3: Animacion (Semana 5-6)

### 3.1 Walk cycle
- [ ] Pipeline para generar walk cycles con Veo 3.1 Fast
- [ ] Extractor de frames desde video/GIF generado
- [ ] Sprite sheet con multiples frames por direccion (ej: 8 dirs x 4-6 frames)
- [ ] Componente de animacion con control de velocidad y loop

### 3.2 Animaciones adicionales
- [ ] Idle (1-2 frames, subtle breathing)
- [ ] Preparar estructura para: attack, hurt, cast (futuro)

---

## Fase 4: Pipeline de Produccion (Semana 7-8)

### 4.1 Automatizacion
- [ ] Script CLI que recibe un sprite lateral y genera:
  1. Prompts optimizados para cada stage
  2. Llamadas API a fal.ai (Nano Banana 2)
  3. Ensamblaje automatico del sheet
  4. Generacion de walk cycle (Veo 3.1)
  5. Sprite sheet final listo para Three.js
- [ ] Configuracion por personaje (JSON/YAML con traits, colores, estilo)

### 4.2 Galeria de personajes
- [ ] Generar 3-5 personajes distintos para validar el pipeline
- [ ] Documentar variaciones de prompts por tipo de personaje
- [ ] Asset library organizada (`assets/sprites/characters/{nombre}/`)

---

## Fase 5: Pulido y Optimizacion (Semana 9-10)

### 5.1 Calidad visual
- [ ] Guia de pulido en Aseprite post-IA (limpieza de bordes, paleta unificada)
- [ ] Paleta de colores compartida para consistencia entre personajes
- [ ] Tamanos estandar definidos (32x32, 48x48, 64x64)

### 5.2 Performance web
- [ ] Texture atlas (multiples personajes en una textura)
- [ ] LOD: sprites simplificados para distancia
- [ ] Lazy loading de sprite sheets no visibles

---

## Estructura de Archivos Propuesta

```
NuvarisWeb/
  tools/
    sprite-assembler/
      assembler.py          # Script principal de ensamblaje
      chroma_key.py         # Conversion #00FF00 -> alpha
      mirror.py             # Espejado E->W
      requirements.txt      # Pillow
  src/
    sprites/
      IsometricSprite.ts    # Componente Three.js
      SpriteAnimator.ts     # Sistema de animacion
      DirectionResolver.ts  # Calculo de facing 8-way
      SpriteSheet.ts        # Carga y manejo de sheets
  assets/
    sprites/
      characters/
        {nombre}/
          reference.png     # Sprite lateral original
          anchor_se.png     # Ancla isometrica
          cardinals/        # N, S, E, W
          diagonals/        # NE, NW, SE, SW
          sheet_8way.png    # Sheet final
          walk/             # Frames de animacion
          config.json       # Metadata del personaje
  docs/
    development/
      sprites/
        ISOMETRIC_8WAY_SPRITES.md   # Documentacion del pipeline
        DEVELOPMENT_PLAN.md         # Este archivo
        PROMPT_TEMPLATES.md         # Templates de prompts (futuro)
```

---

## Principios de Desarrollo Sostenible

1. **Reproducibilidad**: Todo prompt, parametro y paso debe estar documentado
2. **Automatizacion progresiva**: Empezar manual, automatizar lo que se repite
3. **Assets versionados**: Los sprites finales van al repo, los intermedios son regenerables
4. **Model-agnostic**: El pipeline debe sobrevivir cambios de modelo de IA
5. **Calidad sobre cantidad**: Mejor 5 personajes bien pulidos que 50 mediocres
6. **Iteration budget**: Maximo 3 intentos por stage antes de ajustar el approach

---

## Costos Estimados (fal.ai, marzo 2026)

| Operacion | Costo aprox. por personaje |
|---|---|
| Nano Banana 2 (8-12 generaciones) | ~$0.10-0.20 |
| Veo 3.1 Fast (1-2 walk cycles) | ~$0.05-0.10 |
| **Total por personaje** | **~$0.15-0.30** |

Para 20 personajes: ~$3-6 USD total en generacion.

---

## Siguiente Paso Inmediato

**Iniciar Fase 1.1**: Crear el script de ensamblaje en Python como primera herramienta tangible.
