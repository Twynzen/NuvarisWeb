# ISSUE: Limpieza de Ramas Obsoletas

## Estado: PENDIENTE

## Rama Base de Trabajo
- **development** - Rama principal de desarrollo activo
- **main** - Producción (no tocar sin merge de development)

## Ramas a CONSERVAR
- `development` (base activa)
- `main` (producción)
- `claude/nuvaris-game-architecture-*` (arquitectura actual)
- `feature/map-editor-v2-procedural-improvements` (en desarrollo)
- `nuvaris-stable-v1` (backup estable)

## Ramas CANDIDATAS A ELIMINAR

### Experimentales/Obsoletas
- [ ] `entorno` - experimental
- [ ] `entorno-limpio` - experimental
- [ ] `isometric-test` - test viejo
- [ ] `pre-update-debugmode` - debugging viejo
- [ ] `neon-survivors-refactor` - refactor abandonado
- [ ] `refactorizacion-animaciones` - posiblemente mergeado

### Features posiblemente mergeadas
- [ ] `feature/asset-integration`
- [ ] `feature/audio-sounds-system`
- [ ] `feature/codebase-cleanup-phaser-removal`
- [ ] `feature/cosmic-lab`
- [ ] `feature/enemy-ai-improvements`
- [ ] `feature/game-feel-system`
- [ ] `feature/gameplay-improvements`
- [ ] `feature/gothic-menu`
- [ ] `feature/map-integration`
- [ ] `feature/menu-redesign-cosmic-horror`
- [ ] `feature/sendell-experience-system`
- [ ] `feature/tartarus-prime-integration`
- [ ] `feature/test-tartarus-integration`
- [ ] `feature/unified-room-system-fog`
- [ ] `refactor/visual-decoupling`

### Claude branches completadas
- [ ] `claude/add-tatarus-prime-route-*`
- [ ] `claude/analyze-map-structure-*`
- [ ] `claude/define-character-sounds-*`
- [ ] `claude/evaluate-shop-feature-*`
- [ ] `claude/lars-minion-explosion-*`
- [ ] `claude/limited-vision-system-*`
- [ ] `claude/pulir-refactor-nuvaris-*`
- [ ] `claude/refactor-map-generation-*`

## Comandos para limpieza

```bash
# Ver ramas mergeadas en development
git branch --merged development

# Eliminar rama local
git branch -d nombre-rama

# Eliminar rama remota
git push origin --delete nombre-rama

# Eliminar todas las ramas locales mergeadas (excepto development y main)
git branch --merged development | grep -v "development\|main" | xargs git branch -d
```

## Notas
- Revisar cada rama antes de eliminar
- Verificar que no hay trabajo sin mergear
- Hacer backup del repo antes de limpieza masiva

---
*Creado: 2025-12-13*
