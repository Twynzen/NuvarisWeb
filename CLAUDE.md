# NUVARIS - 2.5D Roguelite Game

## Tech Stack
Angular 20, Three.js 0.181.2, TypeScript 5.9, Ionic 8, Capacitor 7.
Dev server: `cd frontend/nuvaris-temp && ng serve` (port 4200)

## Project Structure
Active project: `frontend/nuvaris-temp/`
- `src/app/game/engine/` - Three.js engine (three-engine.service.ts = main game loop)
- `src/app/game/entities/` - Player, enemies, projectiles (player.three.ts, enemy.three.ts)
- `src/app/game/abilities/` - Character skills (proyecto-a, lars, proyecto-y)
- `src/app/game/world/` - Room system, map generation, collisions, portals
- `src/app/game/systems/` - Spatial grid, disposable manager
- `src/app/game/core/` - Combat system, entity manager, event bus
- `src/app/game/ui/` - HUD, minimap, level-up, pause menu, dev console
- `src/app/map-editor/` - Visual map editor (route: /map-editor)
- `src/app/features/tartarus/` - Tartarus biome (advanced shaders/postprocessing)
- `src/assets/` - Sprites (individual PNGs), sounds, map JSONs

## Key Files
- `game/engine/three-engine.service.ts` - Main engine (~3400 lines), game loop, map loading
- `game/engine/sprite-animator.ts` - Frame-by-frame sprite animation
- `game/entities/player.three.ts` - Player entity (~1900 lines)
- `game/entities/enemy.three.ts` - Enemy AI (Chase/Patrol/Return states)
- `game/world/room-visibility.manager.ts` - Room visibility + lighting controller
- `game/world/room-factory.ts` - Room geometry, walls (MeshStandardMaterial)
- `game/core/combat.system.ts` - Damage, healing, multipliers

## Visual Verification Workflow
After ANY visual/rendering change:
1. Use Playwright MCP to navigate to localhost:4200
2. Take a screenshot with browser_take_screenshot
3. Check browser console for WebGL errors with browser_console_messages
4. Iterate until visually correct

## Three.js Conventions
- WebGLRenderer: alpha, antialias, preserveDrawingBuffer, PCFSoftShadowMap
- Sprites: THREE.Sprite + SpriteMaterial (individual PNG frames, 30fps default)
- Environment: MeshStandardMaterial for walls/floors (roughness, metalness)
- Camera: PerspectiveCamera (60 FOV)
- Tone mapping: ACESFilmicToneMapping
- NearestFilter on sprite textures for crisp edges

## File Naming Conventions
- `.three.ts` - Three.js entities (player.three.ts, enemy.three.ts)
- `.system.ts` - Game systems (combat.system.ts, room-lighting.system.ts)
- `.manager.ts` - Managers (room-visibility.manager.ts, disposable.manager.ts)
- `.service.ts` - Angular services (three-engine.service.ts, audio.service.ts)

## Characters
- Arcadio (proyecto-a): Titan, 100HP, melee scythe, Rage passive
- Lars: Sorcerer, 80HP, magic missiles, Dark Pact lifesteal
- Yurany (proyecto-y): 70HP, fireballs, Phase dodge

## Dev Console (Ctrl+K)
testlight, fog, debug, invisible, god, kill, spawn spider 5

## MCP Servers Available
- Playwright: browser automation, screenshots, console reading
- Context7: up-to-date Three.js documentation in context

## Build & Test
```bash
cd frontend/nuvaris-temp
npm install
ng serve          # Dev server at localhost:4200
ng build          # Production build
ng lint           # Linting
ng test           # Unit tests
```

## Full Documentation
See `docs/CLAUDE.md` for complete project documentation including room system, combat details, map editor, and procedural generation.
