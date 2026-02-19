/**
 * Hit Stop Manager - Freeze Frame System
 *
 * Creates impactful moments by briefly pausing the game action.
 * Based on techniques from:
 * - Hollow Knight: 3-4 frames (50-67ms) on enemy hits
 * - Celeste: 2-3 frames (33-50ms) on impacts
 * - Street Fighter: 8-12 frames (133-200ms) for heavy hits
 *
 * The key insight: visual effects and particles continue during freeze,
 * only gameplay logic pauses. This creates dramatic emphasis.
 *
 * @see RESEARCH_08_GAME_FEEL.md for full documentation
 */

export interface HitStopConfig {
    // Default durations in milliseconds
    lightHit: number;      // Small impacts
    mediumHit: number;     // Standard hits
    heavyHit: number;      // Critical/powerful hits
    killHit: number;       // Death blows
}

export class HitStopManager {
    // Current time scale (1 = normal, 0 = frozen)
    private timeScale = 1;

    // When the current freeze ends (performance.now() timestamp)
    private freezeEndTime = 0;

    // Entities frozen individually (for selective freeze)
    private frozenEntities: Map<string, number> = new Map();

    // Configuration
    private config: HitStopConfig = {
        lightHit: 35,      // ~2 frames at 60fps
        mediumHit: 67,     // ~4 frames at 60fps
        heavyHit: 100,     // ~6 frames at 60fps
        killHit: 150       // ~9 frames at 60fps
    };

    // Statistics for debugging
    private stats = {
        totalFreezes: 0,
        lastFreezeDuration: 0,
        lastFreezeTime: 0
    };

    constructor(config?: Partial<HitStopConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * Freeze the entire game for a duration
     *
     * Use for:
     * - Player hitting enemy
     * - Player taking damage
     * - Critical hits
     * - Death moments
     *
     * @param durationMs - Duration in milliseconds
     */
    freezeGlobal(durationMs: number): void {
        // Don't override a longer existing freeze
        const newEndTime = performance.now() + durationMs;
        if (newEndTime > this.freezeEndTime) {
            this.timeScale = 0;
            this.freezeEndTime = newEndTime;

            // Stats
            this.stats.totalFreezes++;
            this.stats.lastFreezeDuration = durationMs;
            this.stats.lastFreezeTime = performance.now();
        }
    }

    /**
     * Freeze using preset durations
     */
    freezeLight(): void {
        this.freezeGlobal(this.config.lightHit);
    }

    freezeMedium(): void {
        this.freezeGlobal(this.config.mediumHit);
    }

    freezeHeavy(): void {
        this.freezeGlobal(this.config.heavyHit);
    }

    freezeKill(): void {
        this.freezeGlobal(this.config.killHit);
    }

    /**
     * Freeze based on damage amount (auto-scale duration)
     * Higher damage = longer freeze
     *
     * @param damage - Damage dealt
     * @param maxDamage - Reference max damage (default 100)
     */
    freezeByDamage(damage: number, maxDamage: number = 100): void {
        // Normalize damage to 0-1 range
        const normalized = Math.min(damage / maxDamage, 1);

        // Interpolate between light and heavy based on damage
        const minDuration = this.config.lightHit;
        const maxDuration = this.config.heavyHit;
        const duration = minDuration + (maxDuration - minDuration) * normalized;

        this.freezeGlobal(duration);
    }

    /**
     * Freeze a specific entity (selective freeze)
     * Useful for freezing only the hit enemy while player continues
     *
     * @param entityId - Unique identifier for the entity
     * @param durationMs - Duration in milliseconds
     */
    freezeEntity(entityId: string, durationMs: number): void {
        const endTime = performance.now() + durationMs;
        this.frozenEntities.set(entityId, endTime);
    }

    /**
     * Check if a specific entity is frozen
     */
    isEntityFrozen(entityId: string): boolean {
        const endTime = this.frozenEntities.get(entityId);
        if (!endTime) return false;

        if (performance.now() >= endTime) {
            this.frozenEntities.delete(entityId);
            return false;
        }
        return true;
    }

    /**
     * Update the hit stop system
     * Call this at the START of your game loop
     *
     * @returns Current time scale (0 = frozen, 1 = normal)
     */
    update(): number {
        // Check if global freeze has ended
        if (this.timeScale === 0 && performance.now() >= this.freezeEndTime) {
            this.timeScale = 1;
        }

        // Clean up expired entity freezes
        const now = performance.now();
        for (const [entityId, endTime] of this.frozenEntities) {
            if (now >= endTime) {
                this.frozenEntities.delete(entityId);
            }
        }

        return this.timeScale;
    }

    /**
     * Get the scaled delta time
     * Use this for gameplay logic that should pause during hit stop
     *
     * @param rawDelta - The raw delta time in seconds
     * @returns Scaled delta (0 during freeze, rawDelta otherwise)
     */
    getScaledDelta(rawDelta: number): number {
        return rawDelta * this.timeScale;
    }

    /**
     * Get current time scale (for external use)
     */
    getTimeScale(): number {
        return this.timeScale;
    }

    /**
     * Check if currently in a global freeze
     */
    isFrozen(): boolean {
        return this.timeScale === 0;
    }

    /**
     * Get remaining freeze time in milliseconds
     */
    getRemainingFreezeTime(): number {
        if (this.timeScale === 1) return 0;
        return Math.max(0, this.freezeEndTime - performance.now());
    }

    /**
     * Cancel all freezes immediately
     */
    cancelFreeze(): void {
        this.timeScale = 1;
        this.freezeEndTime = 0;
        this.frozenEntities.clear();
    }

    /**
     * Get statistics for debugging
     */
    getStats(): typeof this.stats {
        return { ...this.stats };
    }

    /**
     * Update configuration at runtime
     */
    setConfig(config: Partial<HitStopConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): HitStopConfig {
        return { ...this.config };
    }

    /**
     * Reset all state
     */
    reset(): void {
        this.timeScale = 1;
        this.freezeEndTime = 0;
        this.frozenEntities.clear();
        this.stats = {
            totalFreezes: 0,
            lastFreezeDuration: 0,
            lastFreezeTime: 0
        };
    }
}
