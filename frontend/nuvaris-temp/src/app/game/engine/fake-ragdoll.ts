import * as THREE from 'three';

/**
 * Fake Ragdoll System
 *
 * Creates a satisfying death effect WITHOUT requiring separate body parts.
 * The sprite rotates, flies, and fades as a single unit.
 *
 * Effect sequence:
 * 1. Sprite receives impulse (direction from damage source)
 * 2. Sprite rotates while flying
 * 3. Gravity pulls it down
 * 4. Sprite fades out and shrinks
 * 5. Cleanup
 */

export interface FakeRagdollConfig {
    // Physics
    initialVelocityMin: number;      // Min launch speed
    initialVelocityMax: number;      // Max launch speed
    rotationSpeedMin: number;        // Min rotation (radians/sec)
    rotationSpeedMax: number;        // Max rotation (radians/sec)
    gravity: number;                 // Downward acceleration
    groundY: number;                 // Y position of ground
    bounciness: number;              // 0-1, how much velocity is kept on bounce
    friction: number;                // 0-1, horizontal slowdown per second

    // Visual
    duration: number;                // Total effect duration in seconds
    fadeStartTime: number;           // When to start fading (0-1 of duration)
    shrinkOnDeath: boolean;          // Shrink sprite as it dies

    // Randomness
    arcHeightMin: number;            // Min upward component
    arcHeightMax: number;            // Max upward component
}

const DEFAULT_CONFIG: FakeRagdollConfig = {
    initialVelocityMin: 8,
    initialVelocityMax: 15,
    rotationSpeedMin: 3,
    rotationSpeedMax: 8,
    gravity: 25,
    groundY: 0.1,
    bounciness: 0.3,
    friction: 0.95,
    duration: 1.5,
    fadeStartTime: 0.5,
    shrinkOnDeath: true,
    arcHeightMin: 5,
    arcHeightMax: 12
};

/**
 * Individual ragdoll instance for one dying entity
 */
export class FakeRagdollInstance {
    private sprite: THREE.Sprite;
    private velocity: THREE.Vector3;
    private rotationSpeed: number;
    private elapsed: number = 0;
    private config: FakeRagdollConfig;
    private initialScale: THREE.Vector3;
    private initialOpacity: number;
    private isComplete: boolean = false;
    private hasBounced: boolean = false;

    constructor(
        sprite: THREE.Sprite,
        damageDirection: THREE.Vector3,
        config: Partial<FakeRagdollConfig> = {}
    ) {
        this.sprite = sprite;
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Store initial values for interpolation
        this.initialScale = sprite.scale.clone();
        this.initialOpacity = (sprite.material as THREE.SpriteMaterial).opacity;

        // Calculate launch velocity
        const speed = this.randomRange(
            this.config.initialVelocityMin,
            this.config.initialVelocityMax
        );

        // Direction: opposite of damage direction + upward arc
        const launchDir = damageDirection.clone().negate().normalize();
        const upwardForce = this.randomRange(
            this.config.arcHeightMin,
            this.config.arcHeightMax
        );

        this.velocity = new THREE.Vector3(
            launchDir.x * speed,
            upwardForce,  // Y is up
            launchDir.z * speed
        );

        // Random rotation speed (can be negative for variety)
        this.rotationSpeed = this.randomRange(
            this.config.rotationSpeedMin,
            this.config.rotationSpeedMax
        ) * (Math.random() > 0.5 ? 1 : -1);
    }

    private randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    /**
     * Update the ragdoll physics and visuals
     * @returns true when effect is complete and should be cleaned up
     */
    update(delta: number): boolean {
        if (this.isComplete) return true;

        this.elapsed += delta;

        // Check if duration exceeded
        if (this.elapsed >= this.config.duration) {
            this.isComplete = true;
            return true;
        }

        // === PHYSICS ===

        // Apply gravity
        this.velocity.y -= this.config.gravity * delta;

        // Apply friction to horizontal movement
        this.velocity.x *= Math.pow(this.config.friction, delta);
        this.velocity.z *= Math.pow(this.config.friction, delta);

        // Update position
        this.sprite.position.x += this.velocity.x * delta;
        this.sprite.position.y += this.velocity.y * delta;
        this.sprite.position.z += this.velocity.z * delta;

        // Ground collision
        if (this.sprite.position.y <= this.config.groundY) {
            this.sprite.position.y = this.config.groundY;

            // Bounce (only once for realism)
            if (!this.hasBounced && Math.abs(this.velocity.y) > 1) {
                this.velocity.y *= -this.config.bounciness;
                this.rotationSpeed *= 0.5; // Slow rotation on impact
                this.hasBounced = true;
            } else {
                this.velocity.y = 0;
                this.rotationSpeed *= 0.9; // Friction stops rotation
            }
        }

        // === ROTATION ===
        // Rotate the sprite material (2D rotation)
        (this.sprite.material as THREE.SpriteMaterial).rotation += this.rotationSpeed * delta;

        // Slow down rotation over time
        this.rotationSpeed *= 0.98;

        // === VISUAL FADE ===
        const progress = this.elapsed / this.config.duration;

        if (progress > this.config.fadeStartTime) {
            const fadeProgress = (progress - this.config.fadeStartTime) / (1 - this.config.fadeStartTime);

            // Fade opacity
            const material = this.sprite.material as THREE.SpriteMaterial;
            material.opacity = this.initialOpacity * (1 - fadeProgress);

            // Shrink
            if (this.config.shrinkOnDeath) {
                const scale = 1 - (fadeProgress * 0.5); // Shrink to 50%
                this.sprite.scale.set(
                    this.initialScale.x * scale,
                    this.initialScale.y * scale,
                    this.initialScale.z * scale
                );
            }
        }

        return false;
    }

    /**
     * Check if the ragdoll effect is complete
     */
    isDone(): boolean {
        return this.isComplete;
    }

    /**
     * Force complete and cleanup
     */
    destroy(): void {
        this.isComplete = true;
    }
}

/**
 * Manager for all active ragdoll effects
 */
export class FakeRagdollManager {
    private activeRagdolls: Map<string, FakeRagdollInstance> = new Map();
    private config: Partial<FakeRagdollConfig>;
    private idCounter: number = 0;

    constructor(config: Partial<FakeRagdollConfig> = {}) {
        this.config = config;
    }

    /**
     * Start a ragdoll effect on a sprite
     *
     * @param sprite - The THREE.Sprite to ragdoll
     * @param damageDirection - Direction the damage came FROM (will launch opposite)
     * @returns ID for tracking this ragdoll
     */
    startRagdoll(
        sprite: THREE.Sprite,
        damageDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1)
    ): string {
        const id = `ragdoll_${this.idCounter++}`;
        const instance = new FakeRagdollInstance(sprite, damageDirection, this.config);
        this.activeRagdolls.set(id, instance);

        return id;
    }

    /**
     * Update all active ragdolls
     * Call this every frame with delta time
     *
     * @returns Array of completed ragdoll IDs (for cleanup)
     */
    update(delta: number): string[] {
        const completedIds: string[] = [];

        for (const [id, ragdoll] of this.activeRagdolls) {
            const isComplete = ragdoll.update(delta);
            if (isComplete) {
                completedIds.push(id);
            }
        }

        // Remove completed ragdolls
        for (const id of completedIds) {
            this.activeRagdolls.delete(id);
        }

        return completedIds;
    }

    /**
     * Get count of active ragdolls
     */
    getActiveCount(): number {
        return this.activeRagdolls.size;
    }

    /**
     * Stop a specific ragdoll
     */
    stopRagdoll(id: string): void {
        const ragdoll = this.activeRagdolls.get(id);
        if (ragdoll) {
            ragdoll.destroy();
            this.activeRagdolls.delete(id);
        }
    }

    /**
     * Stop all ragdolls
     */
    stopAll(): void {
        for (const ragdoll of this.activeRagdolls.values()) {
            ragdoll.destroy();
        }
        this.activeRagdolls.clear();
    }

    /**
     * Update configuration for future ragdolls
     */
    setConfig(config: Partial<FakeRagdollConfig>): void {
        this.config = { ...this.config, ...config };
    }
}
