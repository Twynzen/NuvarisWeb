# PLAN: Sistema de Iluminacion Dinamica y Fog Focalizado

## OBJETIVO FINAL

Crear un sistema donde:
1. **TODO esta oscuro/nublado** por defecto
2. **Solo el area del jugador** esta iluminada y libre de fog
3. **La luz "corta" la niebla** creando un circulo de claridad
4. **Menu de control** para ajustar parametros en tiempo real
5. **Presets por bioma** con transiciones suaves

---

## ARQUITECTURA PROPUESTA

```
┌─────────────────────────────────────────────────────────────┐
│                    LightingController                        │
│  (Nuevo servicio que coordina todo)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  FogSystem      │  │  PlayerLight    │  │  RoomLights │ │
│  │  (Custom Shader)│  │  (Spot/Point)   │  │  (Per biome)│ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┼───────────────────┘        │
│                                │                            │
│                    ┌───────────▼───────────┐                │
│                    │   EffectComposer      │                │
│                    │   (Post-processing)   │                │
│                    └───────────────────────┘                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    LightingDebugPanel                       │
│  (dat.GUI / lil-gui para control en tiempo real)           │
└─────────────────────────────────────────────────────────────┘
```

---

## FASES DE IMPLEMENTACION

### FASE 1: Investigacion (TU PARTE)
**Duracion estimada**: 1 sesion de deep search

Usar el instructivo `RESEARCH_LIGHTING_FOG_THREEJS.md` para obtener:
- Solucion tecnica recomendada
- Codigo funcional de shaders
- Ejemplos de post-processing

### FASE 2: Fog Personalizado Basado en Jugador
**Archivos a crear/modificar**:
- `src/app/game/world/custom-fog.system.ts` (NUEVO)
- `src/app/game/world/room-lighting.system.ts` (MODIFICAR)

**Tareas**:
1. Crear shader de fog que use `playerPosition` como centro de claridad
2. Implementar `onBeforeCompile` para inyectar en materiales existentes
3. O crear post-processing pass con EffectComposer

**Resultado esperado**:
- Fog denso en toda la escena
- Circulo de claridad alrededor del jugador
- Radio configurable

### FASE 3: Luz del Jugador Mejorada
**Archivos a modificar**:
- `src/app/game/world/room-lighting.system.ts`

**Tareas**:
1. Cambiar `PointLight` por `SpotLight` apuntando hacia abajo
2. Configurar intensidad, distancia, angulo optimos
3. Agregar luz secundaria suave para relleno
4. Implementar "flicker" opcional para efecto de antorcha

**Configuracion propuesta**:
```typescript
interface PlayerLightConfig {
    type: 'point' | 'spot';
    intensity: number;      // 1.0 - 5.0
    distance: number;       // 15 - 50
    color: number;          // 0xffeedd (warm) o 0xaaccff (cold)
    angle?: number;         // Solo para spot: 0.3 - 1.0
    penumbra?: number;      // Suavidad del borde: 0.0 - 1.0
    flickerEnabled: boolean;
    flickerIntensity: number;
}
```

### FASE 4: Sistema de Control (Debug Panel)
**Archivos a crear**:
- `src/app/game/ui/lighting-panel/` (NUEVO componente Angular)
- `src/app/game/config/lighting-presets.ts` (NUEVO)

**Tareas**:
1. Crear panel flotante con controles
2. Sliders para: fog density, fog color, light intensity, light radius
3. Dropdown para presets (Dark Dungeon, Bright Lab, etc.)
4. Boton "Apply to Room" para guardar preset al bioma actual
5. Toggle para mostrar/ocultar panel (tecla L?)

**Controles del panel**:
```
┌─────────────────────────────────────┐
│  LIGHTING CONTROLS            [X]  │
├─────────────────────────────────────┤
│  Preset: [Dark Dungeon ▼]          │
├─────────────────────────────────────┤
│  FOG                               │
│  Density:    [████████░░] 0.8      │
│  Color:      [■■■■] #0a0a15        │
│  Near:       [██░░░░░░░░] 5        │
│  Far:        [████████░░] 40       │
├─────────────────────────────────────┤
│  PLAYER LIGHT                      │
│  Intensity:  [██████░░░░] 2.5      │
│  Radius:     [████░░░░░░] 20       │
│  Color:      [■■■■] #ffeedd        │
│  Flicker:    [ON]                  │
├─────────────────────────────────────┤
│  AMBIENT                           │
│  Intensity:  [██░░░░░░░░] 0.1      │
│  Color:      [■■■■] #1a1a2e        │
├─────────────────────────────────────┤
│  [Save Preset] [Reset] [Export]    │
└─────────────────────────────────────┘
```

### FASE 5: Presets por Bioma
**Archivos a modificar**:
- `src/app/game/world/room-system.ts` (expandir LIGHTING_PRESETS)

**Presets a crear**:
```typescript
const LIGHTING_PRESETS = {
    // Muy oscuro, solo luz del jugador
    dark_dungeon: {
        fog: { density: 0.9, color: 0x050508, near: 3, far: 25 },
        ambient: { color: 0x0a0a0f, intensity: 0.05 },
        playerLight: { intensity: 3.0, radius: 18, color: 0xffe4c4 }
    },

    // Laboratorio con luces fluorescentes
    bright_lab: {
        fog: { density: 0.3, color: 0x1a2a3a, near: 20, far: 60 },
        ambient: { color: 0x3a4a5a, intensity: 0.4 },
        playerLight: { intensity: 1.0, radius: 25, color: 0xffffff }
    },

    // Prision tenebrosa
    grim_prison: {
        fog: { density: 0.7, color: 0x0a0a15, near: 5, far: 30 },
        ambient: { color: 0x1a1a2e, intensity: 0.1 },
        playerLight: { intensity: 2.0, radius: 15, color: 0xff9966 }
    },

    // Jardin con luz natural
    mystic_garden: {
        fog: { density: 0.4, color: 0x1a2a1a, near: 15, far: 50 },
        ambient: { color: 0x2a3a2a, intensity: 0.3 },
        playerLight: { intensity: 1.5, radius: 22, color: 0xaaffaa }
    }
};
```

### FASE 6: Integracion con Map Editor
**Archivos a modificar**:
- `src/app/map-editor/components/editor-viewport/`

**Tareas**:
1. Agregar seccion "Lighting" en panel de propiedades de room
2. Permitir asignar preset de iluminacion a cada habitacion
3. Preview de iluminacion en el editor
4. Exportar configuracion de luz en JSON del mapa

---

## DEPENDENCIAS TECNICAS

Segun la investigacion, podriamos necesitar:

1. **Post-processing** (ya incluido en Three.js examples):
   ```bash
   # No necesita instalacion, usar de three/examples/jsm/postprocessing/
   ```

2. **lil-gui** para debug panel:
   ```bash
   npm install lil-gui
   ```

3. **Custom shaders** - No requiere dependencias extra

---

## METRICAS DE EXITO

| Metrica | Objetivo |
|---------|----------|
| FPS | Mantener 60fps con fog activo |
| Claridad visual | Area del jugador 100% visible |
| Transiciones | Suaves al cambiar de room (<500ms) |
| Controles | Panel funcional con feedback inmediato |

---

## RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Mitigacion |
|--------|--------------|------------|
| Performance con custom shaders | Media | Usar post-processing solo si es necesario |
| Incompatibilidad con materiales | Baja | Testear con MeshStandardMaterial primero |
| Complejidad de shaders | Alta | Empezar con solucion simple, iterar |

---

## ORDEN DE IMPLEMENTACION RECOMENDADO

```
1. [INVESTIGACION] ─► Obtener codigo funcional de fog personalizado
         │
         ▼
2. [PROTOTIPO] ─► Implementar fog basico basado en playerPosition
         │
         ▼
3. [REFINAMIENTO] ─► Ajustar luz del jugador para complementar
         │
         ▼
4. [DEBUG PANEL] ─► Crear controles para iterar rapidamente
         │
         ▼
5. [PRESETS] ─► Definir configuraciones por bioma
         │
         ▼
6. [INTEGRACION] ─► Conectar con map editor
```

---

## ARCHIVOS FINALES ESPERADOS

```
src/app/game/
├── world/
│   ├── custom-fog.system.ts      # Sistema de fog personalizado
│   ├── room-lighting.system.ts   # (Modificado) Luz mejorada
│   └── room-system.ts            # (Modificado) Presets expandidos
├── config/
│   └── lighting-presets.ts       # Configuraciones de iluminacion
├── ui/
│   └── lighting-panel/           # Panel de debug
│       ├── lighting-panel.component.ts
│       ├── lighting-panel.component.html
│       └── lighting-panel.component.scss
└── shaders/                      # (Nuevo directorio)
    ├── custom-fog.vert
    └── custom-fog.frag
```

---

*Plan creado: 2025-11-30*
*Requiere: Resultados de investigacion antes de FASE 2*
