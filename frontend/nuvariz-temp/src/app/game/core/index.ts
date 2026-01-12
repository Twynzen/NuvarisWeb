/**
 * NUVARIZ Game Core Module
 *
 * This module contains the core architecture for the game:
 * - GameEventBus: Decoupled event-based communication
 * - CombatSystem: Combat logic and collision handling
 * - EntityManager: Centralized entity management
 *
 * Architecture Overview:
 * ┌─────────────────────────────────────────────────────────┐
 * │                   ThreeEngineService                     │
 * │  (Orchestrator - Scene, Render Loop, Input)             │
 * └─────────────────────┬───────────────────────────────────┘
 *                       │
 *        ┌──────────────┼──────────────┐
 *        ▼              ▼              ▼
 * ┌─────────────┐ ┌───────────┐ ┌─────────────┐
 * │EntityManager│ │CombatSystem│ │ GameEventBus│
 * │             │ │            │ │             │
 * │• Enemies    │ │• Collisions│ │• Events     │
 * │• Projectiles│ │• Damage    │ │• Observers  │
 * │• Player     │ │• Rewards   │ │• Stats      │
 * └─────────────┘ └───────────┘ └─────────────┘
 *        │              │              ▲
 *        └──────────────┴──────────────┘
 *                    Events
 */

// Event System
export {
    GameEventBus,
    GameEventType,
    gameEventBus,
    // Event types
    type GameEvent,
    type AnyGameEvent,
    type DamageEvent,
    type KillEvent,
    type ProjectileHitEvent,
    type HealEvent,
    type SpawnEvent,
    type XPEvent,
    type AbilityEvent
} from './game-events';

// Combat System
export {
    CombatSystem,
    type CombatConfig,
    type CombatResult
} from './combat.system';

// Entity Manager
export {
    EntityManager,
    type EntityStats
} from './entity.manager';
