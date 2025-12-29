# NUVARIS Web

Roguelite 2.5D estilo Vampire Survivors desarrollado con Angular 17+ y Three.js.

---

## 📁 Estructura del Proyecto

```
NuvarisWeb/
│
├── 📂 frontend/                    ← Aplicación web del juego
│   └── nuvaris-temp/               ← ⭐ PROYECTO ACTIVO
│       ├── src/app/                   - Código Angular + Three.js
│       ├── src/assets/                - Sprites, sonidos, mapas
│       └── README.md                  - Guía del código frontend
│
├── 📂 backend/                     ← Backend del proyecto (futuro)
│   └── README.md                      - Placeholder
│
├── 📂 docs/                        ← 📚 TODA LA DOCUMENTACIÓN
│   ├── README.md                      - Índice completo
│   ├── CLAUDE.md                      - Arquitectura para Claude/Agentes
│   ├── ARCHITECTURE.md                - Arquitectura técnica detallada
│   │
│   ├── setup/                         - Configuración y guías
│   ├── implementation/                - Implementaciones técnicas
│   │   └── frontend/                  - Docs específicos del frontend
│   ├── planning/                      - Planes y análisis
│   │   └── frontend/
│   ├── research/                      - Investigaciones técnicas
│   │   └── frontend/
│   ├── development/                   - Testing, debugging, sesiones
│   │   └── frontend/
│   ├── lore/                          - Historia y narrativa del juego
│   └── archive/                       - Documentos obsoletos
│
├── 📂 .github/                     ← GitHub Actions y workflows
│   └── workflows/
│       └── claude.yml                 - Claude Code Action
│
└── 📂 maps/                        ← Mapas exportados del editor
```

---

## 🚀 Inicio Rápido

### Ejecutar el Juego

```bash
cd frontend/nuvaris-temp
npm install
npm run start
```

Abre: `http://localhost:4200`

### Ejecutar el Map Editor

```bash
cd frontend/nuvaris-temp
npm run start
```

Abre: `http://localhost:4200/map-editor`

---

## 🎮 Qué es NUVARIS

**Género**: Roguelite 2.5D bullet hell
**Motor**: Three.js (viewport ortográfico isométrico)
**Framework**: Angular 17+ con Standalone Components
**Estado**: En desarrollo activo

### Features Principales

- ✅ **3 Personajes Jugables**: Arcadio, Lars, Yurany
- ✅ **Sistema de Combate**: Habilidades, proyectiles, colisiones
- ✅ **IA de Enemigos**: 3 estados (Chase/Patrol/Return)
- ✅ **Sistema de Rooms**: Visibilidad limitada + iluminación dinámica
- ✅ **Generación Procedural**: Mapas con algoritmo BSP y radial
- ✅ **Map Editor**: Editor visual completo
- ✅ **Dev Console**: Debugging con Ctrl+K

---

## 📖 Documentación

### Para Empezar

1. **[docs/CLAUDE.md](docs/CLAUDE.md)** - Contexto completo del proyecto (para Claude/Agentes)
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitectura técnica
3. **[docs/README.md](docs/README.md)** - Índice completo de documentación

### Por Categoría

- **Frontend**: `docs/implementation/frontend/`, `docs/planning/frontend/`, `docs/research/frontend/`
- **Lore**: `docs/lore/`
- **Setup**: `docs/setup/`

---

## 🗂️ Ubicación de Archivos Clave

### Código Frontend (Angular + Three.js)

**Ruta**: `frontend/nuvaris-temp/src/app/`

| Qué | Dónde |
|-----|-------|
| **Motor principal** | `game/engine/three-engine.service.ts` |
| **Personajes** | `game/entities/player.three.ts` |
| **Enemigos** | `game/entities/enemy.three.ts` |
| **Habilidades** | `game/abilities/` |
| **Sistema de Rooms** | `game/world/room-*.ts` |
| **Map Editor** | `map-editor/` |
| **UI/HUD** | `game/ui/` |
| **Menús** | `features/main-menu/` |

### Assets

**Ruta**: `frontend/nuvaris-temp/src/assets/`

| Qué | Dónde |
|-----|-------|
| **Sprites de personajes** | `sprites/characters/` |
| **Sprites de enemigos** | `sprites/enemies/` |
| **Efectos visuales** | `sprites/effects/` |
| **Sonidos** | `sounds/` |
| **Mapas JSON** | `maps/` |

---

## 🛠️ Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| **Frontend** | Angular 17+ (Standalone Components) |
| **Motor Gráfico** | Three.js r150+ |
| **Lenguaje** | TypeScript 5.x |
| **Build Tool** | Angular CLI + Webpack |
| **Testing** | Karma + Jasmine |

---

## 🌳 Ramas

- **`development`** - Rama principal de desarrollo (DEFAULT)
- **`claude/*`** - Ramas creadas por Claude Code Action
- **`feature/*`** - Features en desarrollo

---

## 🤖 Claude Code Action

Este proyecto usa Claude Code Action para automatización en GitHub.

**Trigger**: Menciona `@claude` en issues o PRs

**Ejemplo**:
```
@claude crea un documento que explique el sistema de colisiones en src/app/game/entities/
```

**Documentación**: [docs/setup/CLAUDE_CODE_ACTION_SETUP.md](docs/setup/CLAUDE_CODE_ACTION_SETUP.md)

---

## 📝 Convenciones

### Commits

```
feat(scope): descripción corta
fix(scope): descripción del fix
docs: actualización de documentación
refactor: refactorización sin cambio funcional
```

### Estructura de Código

- **Servicios**: `.service.ts`
- **Componentes**: `.component.ts`
- **Entidades**: `.entity.ts` o `.three.ts` (Three.js)
- **Sistemas**: `.system.ts`
- **Managers**: `.manager.ts`

---

## 🎯 Próximos Pasos

Ver: [docs/planning/](docs/planning/)

---

## 📜 Licencia

Proyecto privado en desarrollo.

---

*Última actualización: 2025-12-29*
