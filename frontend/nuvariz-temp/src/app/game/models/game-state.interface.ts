/**
 * Game State Interface
 * Defines the structure of the game state object used by ThreeEngineService
 */
export interface GameState {
    // Core gameplay
    health: number;
    maxHealth: number;
    xp: number;
    xpToLevel: number;
    level: number;
    wave: number;
    score: number;

    // UI states
    isLevelingUp: boolean;
    isPaused: boolean;
    isGameOver: boolean;
    debugMode: boolean;

    // Dev mode properties (previously used with 'as any')
    godMode: boolean;
    invisible: boolean;
    autoShootEnabled: boolean;
    damageMultiplier: number;
}

/**
 * Creates the initial game state with default values
 */
export function createInitialGameState(): GameState {
    return {
        // Core gameplay
        health: 100,
        maxHealth: 100,
        xp: 0,
        xpToLevel: 100,
        level: 1,
        wave: 1,
        score: 0,

        // UI states
        isLevelingUp: false,
        isPaused: false,
        isGameOver: false,
        debugMode: false,

        // Dev mode (disabled by default)
        godMode: false,
        invisible: false,
        autoShootEnabled: true,
        damageMultiplier: 1
    };
}
