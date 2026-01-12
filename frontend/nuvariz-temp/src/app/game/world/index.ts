/**
 * NUVARIZ Room-Based Visibility System
 *
 * Complete system for managing room visibility, lighting, and collisions.
 *
 * Main Components:
 * - RoomVisibilityManager: Main controller (use this!)
 * - RoomDetectionSystem: Detects which room the player is in
 * - RoomLightingSystem: Dynamic lighting per room
 * - WallCollisionSystem: Wall collision detection
 * - RoomFactory: Creates room instances from templates
 * - RoomTemplateLoader: Loads room templates from JSON
 *
 * Usage:
 * ```typescript
 * // Initialize (once)
 * await roomVisibilityManager.initialize(scene, camera);
 *
 * // Create rooms
 * const hub = roomVisibilityManager.createRoom('hub_large', new THREE.Vector3(0, 0, 0));
 * const cell = roomVisibilityManager.createRoom('prison_small', new THREE.Vector3(30, 0, 0));
 *
 * // Connect rooms via doors
 * roomVisibilityManager.connectRooms(hub, 'door_east', cell, 'door_main');
 *
 * // In game loop
 * roomVisibilityManager.update(playerPosition, deltaTime);
 *
 * // Resolve collisions
 * const movement = roomVisibilityManager.resolvePlayerCollision(
 *   playerPosition, velocityX, velocityZ, radius, deltaTime
 * );
 * ```
 */

// Core room system types and detection
export {
    RoomType,
    RoomBiome,
    DoorDirection,
    DoorSocket,
    RoomLightSource,
    RoomSpawnPoint,
    RoomWallSegment,
    LightingPreset,
    RoomTemplate,
    RoomDoor,
    RoomLightInstance,
    RoomInstance,
    RoomDetectionSystem,
    LIGHTING_PRESETS,
    ROOM_COLORS
} from './room-system';

// Room factory and template loading
export {
    RoomTemplateLoader,
    RoomFactory
} from './room-factory';

// Lighting system
export { RoomLightingSystem } from './room-lighting.system';

// Wall collision system
export {
    WallCollisionSystem,
    EntityCollisionHelper
} from './wall-collision.system';

// Main visibility manager (recommended entry point)
export { RoomVisibilityManager } from './room-visibility.manager';

// Template-based procedural map generator
export {
    TemplateMapGenerator,
    TemplateMapConfig,
    GeneratedTemplateMap
} from './template-map-generator';
