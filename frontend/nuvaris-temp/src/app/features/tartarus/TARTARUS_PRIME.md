# TARTARUS PRIME - Documentacion Tecnica Completa

---

## MODUS OPERANDI DE DESARROLLO

### Flujo de Trabajo Iterativo

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE DESARROLLO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CONCEPTO (Concepto.png)                                     │
│     └─> Imagen de referencia del resultado esperado             │
│                                                                 │
│  2. ANALISIS                                                    │
│     └─> Comparar concepto vs estado actual                      │
│     └─> Identificar diferencias criticas                        │
│     └─> Priorizar mejoras                                       │
│                                                                 │
│  3. IMPLEMENTACION                                              │
│     └─> Modificar sistemas Three.js                             │
│     └─> Ajustar shaders, materiales, luces                      │
│     └─> Probar cambios multiples a la vez                       │
│                                                                 │
│  4. VALIDACION (Captura.PNG)                                    │
│     └─> Usuario actualiza captura de pantalla                   │
│     └─> Claude compara resultado vs concepto                    │
│     └─> Identificar que falta o esta mal                        │
│                                                                 │
│  5. ITERACION                                                   │
│     └─> Repetir hasta alcanzar el concepto                      │
│     └─> Documentar cada mejora realizada                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Archivos de Referencia

| Archivo | Ubicacion | Proposito |
|---------|-----------|-----------|
| **Concepto.png** | `features/Concepto.png` | Imagen de EXPECTATIVA - Como DEBE verse |
| **Captura.PNG** | `nuvaris-temp/Captura.PNG` | Imagen de REALIDAD - Como SE VE actualmente |
| **TARTARUS_PRIME.md** | `tartarus/TARTARUS_PRIME.md` | Documentacion tecnica + historial de cambios |

### Proceso de Comparacion Visual

```
CONCEPTO.png                          CAPTURA.PNG
┌─────────────────┐                   ┌─────────────────┐
│                 │                   │                 │
│   EXPECTATIVA   │  ──> COMPARAR ──> │    REALIDAD     │
│                 │                   │                 │
└─────────────────┘                   └─────────────────┘
        │                                     │
        └──────────── DIFERENCIAS ────────────┘
                          │
                          v
              ┌───────────────────────┐
              │  LISTA DE MEJORAS     │
              │  - Iluminacion        │
              │  - Estructura         │
              │  - Efectos            │
              │  - Colores            │
              └───────────────────────┘
```

### Reglas de Desarrollo

1. **NUNCA hacer commit/push sin confirmacion del usuario**
2. **Hacer multiples cambios por iteracion** para ver progreso significativo
3. **Documentar cada cambio** en el historial de este archivo
4. **El usuario es el arbitro** - actualiza Captura.PNG despues de cada iteracion
5. **Ultrathink** - Imaginar y comparar constantemente con el concepto

---

## HISTORIAL DE CAMBIOS

### [2025-12-10] Iteracion 1 - Mejoras de Iluminacion y Estructura

**Cambios realizados:**

1. **volcanic-islands.system.ts**
   - Aumentado `emissiveIntensity` de islas de 0.15 a 0.45
   - Cambiado color emissive a #FF3300 (rojo/naranja fuerte)
   - Anadido PointLight por cada isla para iluminar desde abajo
   - Aumentado `emissiveIntensity` de volcanes de 0.25 a 0.5
   - Anadido PointLight en crater de cada volcan
   - **NUEVO**: Distribucion TOROIDAL de islas (anillo cohesivo)
   - **NUEVO**: Rios de lava conectando las islas
   - **NUEVO**: Luces en cada rio de lava

**Pendiente esta iteracion:**
- [ ] Halo atmosferico rosa prominente
- [ ] Mayor densidad de vapor
- [ ] Ventanas de ciudades mas brillantes

---

## 1. VISION CONCEPTUAL

Tartarus Prime es un **planeta volcanico flotante** en el espacio profundo. Su estructura es unica:

### 1.1 Anatomia del Planeta

```
                    ╭─────────────────────╮
                   ╱    HALO ATMOSFERICO   ╲
                  ╱   (vapor rosa/rojizo)   ╲
                 ╱                           ╲
                │    ╭───────────────╮       │
                │   ╱  ANILLO TOROIDAL ╲     │
                │  ╱   DE ISLAS + LAVA   ╲   │
                │ │    ╭─────────╮       │   │
                │ │   ╱   NUCLEO  ╲      │   │
                │ │  │    MAGMA    │     │   │
                │ │   ╲  ARDIENTE ╱      │   │
                │ │    ╰─────────╯       │   │
                │  ╲                    ╱    │
                │   ╲  CIUDADES STEAM ╱     │
                │    ╰───────────────╯      │
                 ╲                          ╱
                  ╲   PARTICULAS/CENIZA   ╱
                   ╲                     ╱
                    ╰───────────────────╯
```

### 1.2 Capas del Planeta (de adentro hacia afuera)

| Capa | Radio | Descripcion |
|------|-------|-------------|
| **Nucleo de Magma** | 10 unidades | Esfera incandescente con patrones de conveccion |
| **Zona de Erupciones** | 10-12 u | Particulas de lava eyectadas del nucleo |
| **Anillo de Islas** | 15-25 u | Anillo TOROIDAL de rocas volcanicas flotantes |
| **Rios de Lava** | 15-25 u | Conexiones de magma entre islas |
| **Ciudades Steampunk** | Sobre islas | Estructuras metalicas con ventanas brillantes |
| **Vapor Denso** | 13-30 u | Capas de vapor visible con gradiente |
| **Halo Atmosferico** | 25-40 u | Glow rosa/rojizo difuso envolvente |
| **Particulas de Ceniza** | 15-50 u | Ceniza y embers flotando |

---

## 2. NUCLEO DE MAGMA (MagmaCoreSystem)

### 2.1 Estructura Visual

El nucleo es una **esfera de lava viva** con:

- **Celulas de conveccion**: Patrones organicos que simulan magma burbujeante
- **Hotspots**: Puntos mas brillantes (amarillo/blanco) donde la temperatura es maxima
- **Zonas frias**: Areas mas oscuras (naranja/rojo oscuro)
- **Burbujas**: Deformaciones en la superficie que suben y explotan

### 2.2 Shader del Nucleo (magma.shader.ts)

```glsl
// Patron de conveccion
float convection = fbm(position * 0.3 + time * 0.1);

// Hotspots aleatorios
float hotspot = pow(noise(position * 2.0 + time * 0.5), 3.0);

// Color gradient: rojo oscuro -> naranja -> amarillo -> blanco
vec3 coldColor = vec3(0.6, 0.1, 0.0);   // Rojo oscuro
vec3 hotColor = vec3(1.0, 0.8, 0.2);    // Amarillo
vec3 superHot = vec3(1.0, 1.0, 0.8);    // Casi blanco

color = mix(coldColor, hotColor, convection);
color = mix(color, superHot, hotspot);
```

### 2.3 Sistema de Glow

4 capas de glow concentrico:
- Capa 1: Radio 1.05x, Color #FF6600, Opacidad 40%
- Capa 2: Radio 1.15x, Color #FF4400, Opacidad 25%
- Capa 3: Radio 1.30x, Color #FF2200, Opacidad 15%
- Capa 4: Radio 1.50x, Color #880000, Opacidad 8%

### 2.4 Sistema de Erupciones

3000 particulas que:
1. Nacen en la superficie del nucleo
2. Son eyectadas hacia afuera con velocidad variable
3. Son afectadas por "gravedad" hacia el nucleo
4. Cambian de color: amarillo -> naranja -> rojo -> desaparecen
5. Tiempo de vida: ~2.5 segundos

---

## 3. ANILLO DE ISLAS VOLCANICAS (VolcanicIslandsSystem)

### 3.1 Estructura TOROIDAL (CRITICO)

**IMPORTANTE**: Las islas NO estan dispersas aleatoriamente. Forman un **ANILLO TOROIDAL** cohesivo alrededor del nucleo, como los anillos de Saturno pero mas gruesos y rocosos.

```
Vista lateral:
        ╭──────────╮
       ╱  ISLAS     ╲
      ╱    ╭───╮     ╲
     │    │ N │      │
     │    │ U │      │
     │    │ C │      │
     │    │ L │      │
     │    │ E │      │
     │    │ O │      │
      ╲    ╰───╯    ╱
       ╲  ISLAS    ╱
        ╰──────────╯

Vista superior:
         ╭───────────────╮
        ╱   I S L A S     ╲
       ╱    ╭───────╮      ╲
      │    ╱ NUCLEO  ╲      │
      │   │   (O)    │      │
      │    ╲        ╱       │
       ╲    ╰───────╯      ╱
        ╲    I S L A S    ╱
         ╰───────────────╯
```

### 3.2 Configuracion de Anillos

| Anillo | Radio | Cantidad | Tamanio Islas |
|--------|-------|----------|---------------|
| Interior | 16-22 u | 40% del total | Pequenas-medianas |
| Medio | 24-30 u | 35% del total | Medianas-grandes |
| Exterior | 32-40 u | 25% del total | Grandes |

### 3.3 Anatomia de una Isla

```
           ╭─────╮  <- Volcan/crater con lava
          ╱       ╲
         ╱ ROCAS   ╲
        │  CIUDAD   │  <- Estructuras steampunk
        │   ▓▓▓▓    │
       ╱             ╲
      ╱   BASE ROCOSA ╲
     │                 │
      ╲   RAICES      ╱  <- Formaciones tipo estalactita
       ╲  ROCOSAS    ╱
        ╰───────────╯
```

### 3.4 Materiales de las Islas

**Material base de roca volcanica:**
```javascript
{
  color: 0x2d2d3a,        // Gris oscuro con tinte azulado
  roughness: 0.92,        // Muy rugoso
  metalness: 0.08,        // Ligeramente metalico
  emissive: 0x1a0800,     // Emision rojiza tenue
  emissiveIntensity: 0.15 // DEBE SER MAYOR para visibilidad
}
```

### 3.5 Grietas de Lava

Cada isla tiene 4-8 grietas de lava:
- Tubos de lava con geometria TubeGeometry
- Color #FF4400 con emision propia
- Animacion de pulso: opacidad 70%-85%
- Iluminan las rocas cercanas

---

## 4. RIOS DE LAVA (NUEVO - FALTA IMPLEMENTAR)

### 4.1 Concepto

Los rios de lava **conectan las islas** formando el anillo toroidal. Son flujos de magma que:
- Fluyen entre islas adyacentes
- Tienen animacion de flujo direccional
- Emiten luz propia iluminando las islas
- Crean el efecto visual de un "cinturon de fuego"

### 4.2 Implementacion Propuesta

```typescript
class LavaRiver {
  // Bezier curve entre dos islas
  private curve: THREE.CatmullRomCurve3;

  // Geometria tubular que sigue la curva
  private riverMesh: THREE.Mesh;

  // Shader con flujo animado
  private material: THREE.ShaderMaterial;
}
```

---

## 5. SISTEMA ATMOSFERICO (AtmosphereSystem)

### 5.1 Capas de Vapor

5 capas concentricas de vapor:

| Capa | Radio | Opacidad | Color | Rotacion |
|------|-------|----------|-------|----------|
| 1 | 1.35x nucleo | 12% | #8B7355 | Horario |
| 2 | 1.55x nucleo | 8% | #6B5344 | Anti-horario |
| 3 | 1.80x nucleo | 6% | #5A6B4F | Horario |
| 4 | 2.10x nucleo | 4% | #4A5A4A | Anti-horario |
| 5 | 2.50x nucleo | 3% | #3A4A4A | Horario |

### 5.2 HALO ATMOSFERICO (CRITICO - MEJORAR)

El concepto muestra un **HALO ROSA/ROJIZO MUY PROMINENTE** que envuelve todo el planeta. Actualmente es demasiado sutil.

**Implementacion necesaria:**
```typescript
// Esfera grande con shader de halo
const haloGeometry = new THREE.SphereGeometry(
  config.atmosphereRadius * 1.8,  // Radio grande
  64, 64
);

const haloMaterial = new THREE.ShaderMaterial({
  uniforms: {
    innerColor: { value: new THREE.Color(0xff4422) },
    outerColor: { value: new THREE.Color(0x220011) },
    glowIntensity: { value: 1.5 }
  },
  fragmentShader: `
    // Fresnel effect para glow en bordes
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);

    // Gradiente desde centro (transparente) a bordes (rosa)
    vec3 color = mix(innerColor, outerColor, fresnel);
    float alpha = fresnel * glowIntensity * 0.6;
  `,
  transparent: true,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending
});
```

### 5.3 Particulas de Ceniza

- 4000 particulas de ceniza gris
- Movimiento orbital lento alrededor del nucleo
- Drift suave con ruido simplex
- Tamano: 0.03-0.11 unidades

### 5.4 Embers (Chispas Incandescentes)

- 1500 particulas brillantes
- Nacen cerca del nucleo
- Suben en espiral hacia afuera
- Colores: amarillo -> naranja -> rojo
- Parpadeo de intensidad

---

## 6. CIUDADES STEAMPUNK (CitiesSystem)

### 6.1 Ubicacion

Las ciudades se construyen sobre las islas mas grandes del anillo. Cada ciudad tiene:

- **Torres/chimeneas** con humo animado
- **Edificios** con multiples niveles
- **Ventanas iluminadas** (CRITICO - deben brillar)
- **Estructuras metalicas** (escaleras, gruas, plataformas)
- **Engranajes** visibles girando

### 6.2 Iluminacion de Ventanas

```typescript
// Cada ventana es un plano con emision
const windowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffcc66,        // Amarillo calido
  emissive: 0xffaa44,     // Emision fuerte
  emissiveIntensity: 2.0  // MUY brillante
});

// Animacion de parpadeo
light.intensity = baseIntensity * (0.8 + Math.sin(time * 3) * 0.2);
```

### 6.3 Humo de Chimeneas

Sistema de particulas por cada chimenea:
- 50 particulas de humo gris
- Suben con movimiento ondulante
- Se disipan gradualmente
- Color: #555555 -> transparente

---

## 7. CRIATURAS (CreaturesSystem)

### 7.1 Gusanos de Vapor (Steam Worms)

- Criaturas serpentiformes que nadan en el vapor
- Cuerpo segmentado con movimiento ondulante
- Brillan con luz propia (bioluminiscencia)
- Se mueven en paths de Bezier aleatorios

### 7.2 Pajaros de Ceniza (Ash Birds)

- Criaturas voladoras pequenas
- Vuelan en bandadas alrededor del planeta
- Siluetas oscuras contra el glow del nucleo

---

## 8. POST-PROCESSING (PostProcessingSystem)

### 8.1 Efectos Activos

| Efecto | Intensidad | Proposito |
|--------|------------|-----------|
| **Bloom** | 1.5 | Glow en areas brillantes |
| **Heat Distortion** | Sutil | Ondulacion por calor |
| **Vignette** | 0.3 | Oscurecer bordes |
| **Color Grading** | Warm | Tono calido general |

### 8.2 Configuracion de Bloom

```typescript
const bloomPass = new UnrealBloomPass(
  resolution,
  1.5,    // strength - MUY IMPORTANTE
  0.4,    // radius
  0.85    // threshold
);
```

---

## 9. PROBLEMAS ACTUALES Y SOLUCIONES

### 9.1 Islas Muy Oscuras

**Problema**: Las islas no se ven, parecen siluetas negras.

**Solucion**:
1. Aumentar `emissiveIntensity` de las rocas de 0.15 a 0.4
2. Anadir luces puntuales cerca de cada isla
3. Aumentar ambient light de 0.5 a 0.8
4. Hacer que las grietas de lava emitan luz real (PointLight)

### 9.2 Falta el Anillo Toroidal

**Problema**: Las islas estan dispersas, no forman un anillo cohesivo.

**Solucion**:
1. Cambiar distribucion de islas a toroidal
2. Anadir rios de lava que conecten las islas
3. Reducir variacion vertical de las islas

### 9.3 Halo Atmosferico Debil

**Problema**: No se ve el glow rosa/rojizo prominente del concepto.

**Solucion**:
1. Anadir esfera grande con shader de halo
2. Usar AdditiveBlending para el glow
3. Aumentar intensidad del efecto Fresnel

### 9.4 Parece un Sol, no un Planeta

**Problema**: Demasiado brillo central, faltan las capas externas.

**Solucion**:
1. Reducir ligeramente brillo del nucleo
2. Aumentar prominencia del anillo de islas
3. Anadir mas capas de vapor visible
4. Mejorar contraste entre nucleo y anillo

---

## 10. CONFIGURACION (TartarusConfig)

```typescript
interface TartarusConfig {
  coreRadius: number;        // 10 - Radio del nucleo de magma
  atmosphereRadius: number;  // 25 - Radio de la atmosfera
  islandCount: number;       // 14 - Cantidad de islas
  volcanoCount: number;      // 8  - Islas con volcan activo
  creatureCount: number;     // 12 - Cantidad de criaturas
  cityDensity: number;       // 0.6 - Densidad de ciudades
}
```

---

## 11. CONTROLES DE NAVEGACION

| Control | Accion |
|---------|--------|
| **Mouse Drag** | Rotar vista |
| **Scroll** | Zoom |
| **WASD / Flechas** | Rotar vista |
| **Q / E** | Zoom |
| **Mano abierta** | Rotar (hand tracking) |
| **Pinch** | Zoom (hand tracking) |

---

## 12. ARCHIVOS DEL SISTEMA

```
tartarus/
├── tartarus.component.ts      # Componente principal
├── tartarus.module.ts         # Modulo Angular
├── shaders/
│   └── magma.shader.ts        # Shaders GLSL del nucleo
└── systems/
    ├── magma-core.system.ts   # Sistema del nucleo
    ├── volcanic-islands.system.ts # Sistema de islas
    ├── atmosphere.system.ts   # Sistema atmosferico
    ├── creatures.system.ts    # Criaturas
    ├── cities.system.ts       # Ciudades steampunk
    ├── navigation.system.ts   # Controles de camara
    └── postprocessing.system.ts # Efectos post-proceso
```

---

*Documentacion creada: 2025-12-10*
*Estado: EN DESARROLLO*
*Proxima revision: Despues de mejoras visuales*
