import * as THREE from 'three';
import { TraumaScreenShake, ScreenShakeConfig } from './trauma-screen-shake';
import { HitStopManager, HitStopConfig } from './hit-stop-manager';

/**
 * Game Feel Orchestrator
 *
 * Central coordinator for all "juice" effects:
 * - Screen shake (trauma-based)
 * - Hit stop (freeze frames)
 * - Future: Chromatic aberration, audio ducking, etc.
 *
 * This provides a simple API for the game engine to call during events.
 *
 * @example
 * // In three-engine.service.ts:
 * this.gameFeel.onPlayerShoot();
 * this.gameFeel.onEnemyHit(damage);
 * this.gameFeel.onPlayerHit(damage);
 *
 * @see RESEARCH_08_GAME_FEEL.md for full documentation
 */

export interface GameFeelConfig {
    // Enable/disable individual systems
    enableScreenShake: boolean;
    enableHitStop: boolean;

    // Intensity multiplier (0-2, default 1)
    // Useful for accessibility or player preference
    intensity: number;

    // Screen shake specific
    screenShake: Partial<ScreenShakeConfig>;

    // Hit stop specific
    hitStop: Partial<HitStopConfig>;
}

// Event presets for QDT
interface EventConfig {
    trauma: number;
    hitStopMs: number;
}

const EVENT_PRESETS: Record<string, EventConfig> = {
    // Player actions
    playerShoot: { trauma: 0.08, hitStopMs: 0 },           // Light recoil feel
    playerMelee: { trauma: 0.12, hitStopMs: 25 },          // Heavier melee swing
    playerDash: { trauma: 0.05, hitStopMs: 0 },            // Quick dash

    // Hits on enemies
    enemyHitLight: { trauma: 0.12, hitStopMs: 35 },        // Small damage
    enemyHitMedium: { trauma: 0.18, hitStopMs: 50 },       // Normal damage
    enemyHitHeavy: { trauma: 0.25, hitStopMs: 75 },        // High damage/crit
    enemyKill: { trauma: 0.20, hitStopMs: 100 },           // Death blow

    // Player takes damage
    playerHitLight: { trauma: 0.20, hitStopMs: 60 },       // Small hit
    playerHitMedium: { trauma: 0.35, hitStopMs: 80 },      // Normal hit
    playerHitHeavy: { trauma: 0.50, hitStopMs: 120 },      // Heavy hit

    // Special events
    explosion: { trauma: 0.60, hitStopMs: 100 },           // Area explosion
    bossAttack: { trauma: 0.45, hitStopMs: 150 },          // Boss special
    levelUp: { trauma: 0.10, hitStopMs: 200 },             // Dramatic pause
    death: { trauma: 0.70, hitStopMs: 300 }                // Player death
};

export class GameFeelOrchestrator {
    private screenShake: TraumaScreenShake;
    private hitStop: HitStopManager;

    // Global enable/disable
    private enabled = true;
    private intensity = 1.0;

    // Individual system toggles
    private enableScreenShake = true;
    private enableHitStop = true;

    // Debug mode
    private debugMode = false;

    constructor(config?: Partial<GameFeelConfig>) {
        // Initialize subsystems
        this.screenShake = new TraumaScreenShake(config?.screenShake);
        this.hitStop = new HitStopManager(config?.hitStop);

        // Apply config
        if (config) {
            this.enableScreenShake = config.enableScreenShake ?? true;
            this.enableHitStop = config.enableHitStop ?? true;
            this.intensity = config.intensity ?? 1.0;
        }

        console.log('[GameFeel] Orchestrator initialized - Screen Shake: ON, Hit Stop: ON');
    }

    // ============================================
    // HIGH-LEVEL EVENT API (Use these in game)
    // ============================================

    /**
     * Call when player shoots
     */
    onPlayerShoot(): void {
        this.triggerEvent('playerShoot');
    }

    /**
     * Call when player uses melee attack
     */
    onPlayerMelee(): void {
        this.triggerEvent('playerMelee');
    }

    /**
     * Call when player dashes
     */
    onPlayerDash(): void {
        this.triggerEvent('playerDash');
    }

    /**
     * Call when an enemy is hit
     * Auto-scales based on damage amount
     *
     * @param damage - Damage dealt to enemy
     * @param maxHealth - Enemy's max health (for scaling)
     * @param isKill - Whether this hit killed the enemy
     */
    onEnemyHit(damage: number, maxHealth: number = 50, isKill: boolean = false): void {
        if (isKill) {
            this.triggerEvent('enemyKill');
            return;
        }

        // Scale based on damage relative to enemy's max health
        const damageRatio = damage / maxHealth;

        if (damageRatio >= 0.5) {
            this.triggerEvent('enemyHitHeavy');
        } else if (damageRatio >= 0.2) {
            this.triggerEvent('enemyHitMedium');
        } else {
            this.triggerEvent('enemyHitLight');
        }
    }

    /**
     * Call when player takes damage
     *
     * @param damage - Damage taken
     * @param maxHealth - Player's max health (for scaling)
     */
    onPlayerHit(damage: number, maxHealth: number = 100): void {
        const damageRatio = damage / maxHealth;

        if (damageRatio >= 0.3) {
            this.triggerEvent('playerHitHeavy');
        } else if (damageRatio >= 0.15) {
            this.triggerEvent('playerHitMedium');
        } else {
            this.triggerEvent('playerHitLight');
        }
    }

    /**
     * Call on explosion
     */
    onExplosion(): void {
        this.triggerEvent('explosion');
    }

    /**
     * Call when boss does special attack
     */
    onBossAttack(): void {
        this.triggerEvent('bossAttack');
    }

    /**
     * Call on level up
     */
    onLevelUp(): void {
        this.triggerEvent('levelUp');
    }

    /**
     * Call on player death
     */
    onPlayerDeath(): void {
        this.triggerEvent('death');
    }

    // ============================================
    // LOW-LEVEL API (For custom events)
    // ============================================

    /**
     * Add trauma directly (0-1 scale)
     */
    addTrauma(amount: number): void {
        if (!this.enabled || !this.enableScreenShake) return;
        this.screenShake.addTrauma(amount * this.intensity);
    }

    /**
     * Trigger hit stop directly (in milliseconds)
     */
    triggerHitStop(durationMs: number): void {
        if (!this.enabled || !this.enableHitStop) return;
        this.hitStop.freezeGlobal(durationMs * this.intensity);
    }

    /**
     * Trigger an event by name
     */
    triggerEvent(eventName: string): void {
        if (!this.enabled) return;

        const preset = EVENT_PRESETS[eventName];
        if (!preset) {
            console.warn(`[GameFeel] Unknown event: ${eventName}`);
            return;
        }

        if (this.enableScreenShake && preset.trauma > 0) {
            this.screenShake.addTrauma(preset.trauma * this.intensity);
        }

        if (this.enableHitStop && preset.hitStopMs > 0) {
            this.hitStop.freezeGlobal(preset.hitStopMs * this.intensity);
        }

        if (this.debugMode) {
            console.log(`[GameFeel] Event: ${eventName} | Trauma: ${preset.trauma} | HitStop: ${preset.hitStopMs}ms`);
        }
    }

    // ============================================
    // UPDATE (Call every frame)
    // ============================================

    /**
     * Update all systems - call at START of game loop
     * Returns the time scale for gameplay (0 = frozen, 1 = normal)
     */
    update(): number {
        return this.hitStop.update();
    }

    /**
     * Get time scale for gameplay logic
     * Multiply your delta by this value
     */
    getTimeScale(): number {
        return this.hitStop.getTimeScale();
    }

    /**
     * Get scaled delta time
     * @param rawDelta - Raw delta time in seconds
     */
    getScaledDelta(rawDelta: number): number {
        return this.hitStop.getScaledDelta(rawDelta);
    }

    /**
     * Apply screen shake to camera
     * Call this AFTER camera follow logic, using RAW delta
     *
     * @param camera - The camera to shake
     * @param rawDelta - Raw delta time (NOT scaled by hit stop)
     */
    applyShake(camera: THREE.Camera, rawDelta: number): void {
        if (!this.enabled || !this.enableScreenShake) return;

        // Store current camera position as "home" before shake
        this.screenShake.setHomePosition(camera.position, camera.rotation as THREE.Euler);

        // Update and apply shake
        this.screenShake.update(rawDelta, camera);
    }

    // ============================================
    // CONFIGURATION
    // ============================================

    /**
     * Enable/disable all game feel effects
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        console.log(`[GameFeel] ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Set global intensity multiplier (0-2)
     */
    setIntensity(intensity: number): void {
        this.intensity = Math.max(0, Math.min(2, intensity));
        console.log(`[GameFeel] Intensity: ${this.intensity}`);
    }

    getIntensity(): number {
        return this.intensity;
    }

    /**
     * Toggle screen shake
     */
    setScreenShakeEnabled(enabled: boolean): void {
        this.enableScreenShake = enabled;
        console.log(`[GameFeel] Screen Shake: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Toggle hit stop
     */
    setHitStopEnabled(enabled: boolean): void {
        this.enableHitStop = enabled;
        console.log(`[GameFeel] Hit Stop: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Enable debug logging
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    // ============================================
    // DEBUG / STATS
    // ============================================

    /**
     * Get current state for debugging/UI
     */
    getState(): {
        enabled: boolean;
        intensity: number;
        trauma: number;
        shakeIntensity: number;
        timeScale: number;
        isFrozen: boolean;
        remainingFreeze: number;
    } {
        return {
            enabled: this.enabled,
            intensity: this.intensity,
            trauma: this.screenShake.getTrauma(),
            shakeIntensity: this.screenShake.getShakeIntensity(),
            timeScale: this.hitStop.getTimeScale(),
            isFrozen: this.hitStop.isFrozen(),
            remainingFreeze: this.hitStop.getRemainingFreezeTime()
        };
    }

    /**
     * Reset all effects
     */
    reset(): void {
        this.screenShake.reset();
        this.hitStop.reset();
    }

    /**
     * Get access to subsystems for advanced configuration
     */
    getScreenShake(): TraumaScreenShake {
        return this.screenShake;
    }

    getHitStop(): HitStopManager {
        return this.hitStop;
    }
}
