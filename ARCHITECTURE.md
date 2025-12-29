# NUVARIS - Arquitectura del Proyecto

## Carpetas Principales

### `/frontend`
Contiene todo el código del proyecto, incluyendo el juego principal, sistemas auxiliares y assets.

### `/docs`
Documentación técnica, investigaciones y planes de desarrollo del proyecto.

### `/.github`
Configuraciones de GitHub Actions, workflows y automatizaciones del repositorio.

---

## Estructura Frontend

### `/frontend/nuvaris-temp`
Aplicación principal del juego desarrollada en Angular 17+ con Three.js como motor gráfico.

### `/frontend/assets3D`
Modelos 3D, texturas y recursos gráficos utilizados en el motor Three.js.

### `/frontend/src`
Código fuente secundario o componentes auxiliares del sistema.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────┐
│              NUVARIS WEB                        │
│         Roguelite 2.5D Game (Three.js)          │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
    ┌───▼───┐                   ┌───▼───┐
    │FRONTEND│                   │ MOTOR │
    │Angular │                   │Three.js│
    │  17+   │                   │ 2.5D  │
    └───┬───┘                   └───┬───┘
        │                           │
    ┌───▼────────────────────────────▼───┐
    │         SISTEMAS                   │
    │  • Game Engine                     │
    │  • Room System                     │
    │  • Map Editor                      │
    │  • Combat System                   │
    │  • Entity Management               │
    │  • Procedural Generation           │
    └────────────────────────────────────┘
```

## Componentes Principales

### 1. **Frontend (Angular 17+)**
Framework web moderno con componentes standalone para la interfaz de usuario, menús y HUD del juego.

### 2. **Motor (Three.js 2.5D)**
Motor gráfico principal con vista isométrica ortográfica para renderizado, iluminación dinámica y manejo de escenas.

### 3. **Sistemas**

#### **Game Engine** (`three-engine.service.ts`)
Core del juego que gestiona el loop principal, actualización de entidades y carga de mapas.

#### **Room System** (`world/`)
Sistema de habitaciones con visibilidad limitada, iluminación dinámica por bioma y fog adaptativo.

#### **Map Editor** (`map-editor/`)
Editor visual completo para crear y editar mapas del juego con generación procedural radial.

#### **Combat System** (`abilities/`, `entities/`)
Sistema de combate con habilidades de personajes, armas, proyectiles y enemigos con IA (Chase/Patrol/Return).

#### **Entity Management** (`entities/`, `systems/`)
Gestión de jugadores, enemigos, proyectiles, orbes de XP, spawners y sistemas de partículas.

#### **Procedural Generation** (`world/template-map-generator.ts`, `procedural-map-generator.ts`)
Generadores de mapas procedurales con algoritmos BSP y radial para crear niveles dinámicos.

---

## Tecnologías Clave

| Categoría | Tecnología |
|-----------|------------|
| Frontend | Angular 17+ (Standalone Components) |
| Motor Gráfico | Three.js r150+ |
| Lenguaje | TypeScript 5.x |
| Build Tool | Angular CLI + Webpack |
| Testing | Karma + Jasmine |

---

## Estado Actual

- **Motor Activo**: Three.js 2.5D con viewport ortográfico isométrico
- **Rama Principal**: `claude/issue-7-20251229-2128`
- **Sistema de Rooms**: Funcional con iluminación dinámica
- **Map Editor**: Operativo con generación procedural
- **Personajes Jugables**: 3 (Arcadio, Lars, Yurany)
- **Sistema de Combate**: Implementado con colisiones circulares

---

*Documento generado el 2025-12-29*
