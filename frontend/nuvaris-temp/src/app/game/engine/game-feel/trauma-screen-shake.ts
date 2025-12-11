import * as THREE from 'three';

/**
 * Trauma-Based Screen Shake System
 *
 * Based on Vlambeer's approach (Nuclear Throne, Super Crate Box):
 * - Maintains a "trauma" value between 0 and 1
 * - Actual shake = trauma^2 (quadratic for better feel)
 * - Uses Perlin-like noise for smooth, non-repetitive motion
 * - High frequency (20Hz+) to avoid motion sickness
 *
 * @see RESEARCH_08_GAME_FEEL.md for full documentation
 */

export interface ScreenShakeConfig {
    maxTranslationX: number;    // Max horizontal offset in world units
    maxTranslationY: number;    // Max vertical offset in world units
    maxRotationZ: number;       // Max roll rotation in degrees
    traumaDecay: number;        // Decay per second (higher = faster recovery)
    traumaPower: number;        // Exponent (2 = quadratic, 3 = cubic)
    frequency: number;          // Noise sampling frequency in Hz
}

/**
 * Simple 2D noise function for shake variation
 * Uses sine waves with prime multipliers for pseudo-random behavior
 */
function noise2D(seed: number, t: number): number {
    // Combine multiple sine waves with different frequencies
    const x = Math.sin(t * 1.0 + seed * 12.9898) * 43758.5453;
    const y = Math.sin(t * 2.3 + seed * 78.233) * 23421.6312;
    const z = Math.sin(t * 3.7 + seed * 45.164) * 84231.1234;

    // Combine and normalize to -1 to 1
    return Math.sin(x + y + z);
}

export class TraumaScreenShake {
    private trauma = 0;
    private time = 0;

    // Home position/rotation (where camera should be without shake)
    private homePosition = new THREE.Vector3();
    private homeRotation = new THREE.Euler();

    // Shake offsets (applied after home position)
    private shakeOffset = new THREE.Vector3();
    private shakeRotation = 0;

    // Configuration with sensible defaults for QDT
    private config: ScreenShakeConfig = {
        maxTranslationX: 0.4,      // Horizontal shake range
        maxTranslationY: 0.3,      // Vertical shake range
        maxRotationZ: 2.5,         // Roll in degrees (subtle)
        traumaDecay: 1.8,          // Fast recovery for action game
        traumaPower: 2,            // Quadratic (industry standard)
        frequency: 25              // High frequency for smooth feel
    };

    // Noise seeds for different axes (prevents synchronized shake)
    private readonly seedX = 1;
    private readonly seedY = 100;
    private readonly seedZ = 1000;

    constructor(config?: Partial<ScreenShakeConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * Add trauma to the system
     * Values stack but are clamped to 1.0
     *
     * Recommended values:
     * - Player shoot: 0.1 - 0.15
     * - Enemy hit: 0.15 - 0.25
     * - Player hit: 0.25 - 0.4
     * - Explosion: 0.5 - 0.8
     * - Boss attack: 0.6 - 1.0
     */
    addTrauma(amount: number): void {
        this.trauma = Math.min(1, this.trauma + amount);
    }

    /**
     * Set trauma directly (useful for sustained effects)
     */
    setTrauma(amount: number): void {
        this.trauma = Math.max(0, Math.min(1, amount));
    }

    /**
     * Get current trauma level (for UI/debugging)
     */
    getTrauma(): number {
        return this.trauma;
    }

    /**
     * Get current shake intensity (trauma^power)
     */
    getShakeIntensity(): number {
        return Math.pow(this.trauma, this.config.traumaPower);
    }

    /**
     * Store the camera's "home" position before applying shake
     * Call this AFTER your camera follow logic, BEFORE applying shake
     */
    setHomePosition(position: THREE.Vector3, rotation?: THREE.Euler): void {
        this.homePosition.copy(position);
        if (rotation) {
            this.homeRotation.copy(rotation);
        }
    }

    /**
     * Update shake and apply to camera
     *
     * @param deltaTime - Time since last frame in seconds (use RAW delta, not scaled)
     * @param camera - The camera to shake
     */
    update(deltaTime: number, camera: THREE.Camera): void {
        // Always advance time for noise sampling
        this.time += deltaTime;

        // If no trauma, reset camera to home and exit early
        if (this.trauma <= 0.001) {
            this.trauma = 0;
            this.shakeOffset.set(0, 0, 0);
            this.shakeRotation = 0;
            return;
        }

        // Calculate shake intensity (quadratic or cubic based on config)
        const shake = Math.pow(this.trauma, this.config.traumaPower);

        // Sample noise at current time * frequency
        const t = this.time * this.config.frequency;

        // Calculate offsets using noise
        const offsetX = this.config.maxTranslationX * shake * noise2D(this.seedX, t);
        const offsetY = this.config.maxTranslationY * shake * noise2D(this.seedY, t);
        const angleZ = THREE.MathUtils.degToRad(this.config.maxRotationZ) * shake * noise2D(this.seedZ, t);

        // Store offsets
        this.shakeOffset.set(offsetX, offsetY, 0);
        this.shakeRotation = angleZ;

        // Apply shake to camera (offset from home position)
        camera.position.set(
            this.homePosition.x + offsetX,
            this.homePosition.y + offsetY,
            this.homePosition.z
        );

        // Apply rotation shake (only Z axis / roll for 2.5D)
        camera.rotation.z = this.homeRotation.z + angleZ;

        // Decay trauma over time
        this.trauma = Math.max(0, this.trauma - this.config.traumaDecay * deltaTime);
    }

    /**
     * Apply shake offset to a position (without updating internal state)
     * Useful for applying shake to other objects
     */
    applyShakeToPosition(position: THREE.Vector3): THREE.Vector3 {
        return position.clone().add(this.shakeOffset);
    }

    /**
     * Get current shake offset (for applying to UI or other elements)
     */
    getShakeOffset(): THREE.Vector3 {
        return this.shakeOffset.clone();
    }

    /**
     * Reset all shake state
     */
    reset(): void {
        this.trauma = 0;
        this.time = 0;
        this.shakeOffset.set(0, 0, 0);
        this.shakeRotation = 0;
    }

    /**
     * Update configuration at runtime
     */
    setConfig(config: Partial<ScreenShakeConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration (for debugging/UI)
     */
    getConfig(): ScreenShakeConfig {
        return { ...this.config };
    }
}
