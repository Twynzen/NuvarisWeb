# NUVARIZ - Frontend (Angular + Three.js)

⭐ **Este es el proyecto activo del juego**

---

## 🚀 Inicio Rápido

### Instalar Dependencias

```bash
npm install
```

### Ejecutar el Juego

```bash
npm run start
```

Abre: `http://localhost:4200`

### Ejecutar el Map Editor

```bash
npm run start
```

Abre: `http://localhost:4200/map-editor`

### Dev Console

Presiona **Ctrl+K** durante el juego para abrir la consola de desarrollo.

Comandos útiles:
- `god` - Modo dios
- `invisible` - Enemigos no te detectan
- `kill` - Mata todos los enemigos
- `spawn spider 5` - Spawna 5 arañas
- `testlight` - Carga mapa de prueba de iluminación
- `fog` - Toggle fog on/off
- `debug` - Toggle visualización de colisiones

---

## 📁 Estructura del Código

```
src/
├── app/
│   ├── game/                       ⭐ MOTOR DEL JUEGO (Three.js)
│   │   ├── engine/                    - Motor principal
│   │   │   ├── three-engine.service.ts  ← Motor principal
│   │   │   ├── sprite-animator.ts       ← Animación de sprites
│   │   │   └── debug-visualizer.ts      ← Debug visual
│   │   │
│   │   ├── entities/                  - Entidades del juego
│   │   │   ├── player.three.ts          ← Jugador
│   │   │   ├── enemy.three.ts           ← Enemigos
│   │   │   ├── projectile.three.ts      ← Proyectiles
│   │   │   └── xp-orb.three.ts          ← Orbes de XP
│   │   │
│   │   ├── abilities/                 - Habilidades de personajes
│   │   │   ├── skills/                  ← Skills específicos
│   │   │   ├── arcadio.ability.ts       ← Arcadio (Titan)
│   │   │   ├── lars.ability.ts          ← Lars (Hechicero)
│   │   │   └── yurany.ability.ts        ← Yurany (Proyecto Y)
│   │   │
│   │   ├── world/                     - Sistema de mundo
│   │   │   ├── room-visibility.manager.ts ← Manager de rooms
│   │   │   ├── room-lighting.system.ts    ← Iluminación dinámica
│   │   │   ├── wall-collision.system.ts   ← Colisiones con muros
│   │   │   ├── procedural-map-generator.ts ← Generador BSP
│   │   │   └── portal-system.ts           ← Portales de enemigos
│   │   │
│   │   ├── systems/                   - Sistemas del juego
│   │   │   ├── enemy-spawner.system.ts    ← Spawn de enemigos
│   │   │   ├── xp-manager.system.ts       ← Sistema de XP
│   │   │   ├── particle-manager.system.ts ← Partículas
│   │   │   └── audio-manager.system.ts    ← Audio
│   │   │
│   │   ├── ui/                        - UI del juego
│   │   │   ├── minimap/                   ← Minimap
│   │   │   ├── level-up/                  ← Pantalla de level up
│   │   │   └── pause-menu/                ← Menú de pausa
│   │   │
│   │   ├── components/                - Componentes Angular
│   │   │   └── three-game/                ← Componente principal
│   │   │
│   │   └── config/                    - Configuración
│   │       └── game.config.ts             ← Config del juego
│   │
│   ├── map-editor/                 ⭐ EDITOR DE MAPAS
│   │   └── components/
│   │       └── editor-viewport/           ← Viewport del editor
│   │
│   └── features/                     - Features de la app
│       ├── main-menu/                     ← Menú principal
│       └── character-selection/           ← Selección de personaje
│
└── assets/                           ⭐ RECURSOS
    ├── sprites/
    │   ├── characters/                    - Sprites de personajes
    │   ├── enemies/                       - Sprites de enemigos
    │   └── effects/                       - Efectos visuales
    ├── sounds/                            - Sonidos y música
    ├── maps/                              - Mapas JSON
    └── room-templates/                    - Templates de habitaciones
```

---

## 🎮 Personajes Jugables

### Arcadio (El Titan)
- **HP**: 100
- **Velocidad**: 200
- **Arma**: Hoz Curva (melee en arco de 90°)
- **Pasiva**: Rage (+50% daño al 25% HP)
- **Lifesteal**: 15%

### Lars (Hechicero)
- **HP**: 80
- **Velocidad**: 220
- **Arma**: Magic Missile
- **Pasiva**: Dark Pact (10% lifesteal)

### Yurany (Proyecto Y)
- **HP**: 70
- **Velocidad**: 250
- **Arma**: Fireball
- **Pasiva**: Phase (20% dodge)

---

## 🏗️ Arquitectura Técnica

### Motor: Three.js 2.5D
- **Viewport**: Ortográfico isométrico
- **Renderizado**: Canvas con Three.js r150+
- **Animaciones**: Sprite sheets (30 frames)
- **Iluminación**: Dinámica por room + fog adaptativo

### Framework: Angular 17+
- **Componentes**: Standalone (sin módulos)
- **TypeScript**: 5.x
- **Routing**: Angular Router
- **Build**: Angular CLI + Webpack

### Sistemas Clave

**Game Loop** (`three-engine.service.ts`):
- 60 FPS target
- Update/Render separados
- Delta time para física

**Colisiones** (`wall-collision.system.ts`):
- AABB para detección rápida
- Spatial grid para optimización
- Círculos para entities

**Rooms** (`room-visibility.manager.ts`):
- Visibilidad limitada
- Iluminación dinámica
- Fog adaptativo por tamaño

---

## 🗺️ Sistema de Mapas

### Map Editor
- Editor visual en `http://localhost:4200/map-editor`
- Controles: W/E/R (translate/rotate/scale)
- Exporta a JSON compatible con el juego

### Generación Procedural
- **BSP**: Algoritmo Binary Space Partitioning
- **Radial**: Patrón legacy (hub + 8 rooms)
- **Templates**: Rooms predefinidas en JSON

---

## 📚 Documentación

**Documentación completa**: `/docs/`

| Tema | Ubicación |
|------|-----------|
| **Arquitectura general** | `/docs/ARCHITECTURE.md` |
| **Instrucciones para Claude** | `/docs/CLAUDE.md` |
| **Implementaciones** | `/docs/implementation/frontend/` |
| **Investigación** | `/docs/research/frontend/` |
| **Testing** | `/docs/development/frontend/` |

---

## 🛠️ Scripts Disponibles

```bash
npm run start          # Inicia dev server
npm run build          # Build de producción
npm run test           # Ejecuta tests
npm run lint           # Linter
```

---

## 🔧 Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Framework | Angular 17+ |
| Motor 3D | Three.js r150+ |
| Lenguaje | TypeScript 5.x |
| Build | Angular CLI + Webpack |
| Testing | Karma + Jasmine |

---

## 📝 Convenciones de Código

### Archivos
- **Servicios**: `.service.ts`
- **Componentes**: `.component.ts`
- **Entidades Three.js**: `.three.ts`
- **Sistemas**: `.system.ts`
- **Managers**: `.manager.ts`

### Nomenclatura
- **Classes**: PascalCase (`ThreeEngine`)
- **Variables**: camelCase (`playerPosition`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ENEMIES`)
- **Files**: kebab-case (`three-engine.service.ts`)

---

*Para más información, consulta la documentación en `/docs/`*
