import * as THREE from 'three';

export interface AtlasMetadata {
    image: string;
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
    frameCount: number;
    atlasWidth: number;
    atlasHeight: number;
    frames: Array<{ x: number; y: number; w: number; h: number }>;
}

export interface AtlasAnimationConfig {
    name: string;
    atlasPath: string;      // Path to the atlas PNG (e.g., 'assets/atlas/proyecto-a/proyecto-a-idle.png')
    metadataPath: string;   // Path to the JSON metadata
    frameRate: number;
    loop: boolean;
}

interface AtlasAnimation {
    texture: THREE.Texture;
    metadata: AtlasMetadata;
    frameRate: number;
    loop: boolean;
}

/**
 * AtlasSpriteAnimator - Drop-in replacement for SpriteAnimator using sprite atlas sheets.
 *
 * Instead of loading individual PNG files per frame, this loads a single atlas texture
 * and uses UV offset/repeat to display individual frames. Same API as SpriteAnimator.
 *
 * Benefits:
 * - 1 texture load per animation instead of 30+
 * - ~60-70% less GPU memory usage
 * - Dramatically fewer HTTP requests
 */
export class AtlasSpriteAnimator {
    private textureLoader = new THREE.TextureLoader();
    private animations: { [name: string]: AtlasAnimation } = {};
    private currentAnimation: string | null = null;
    private currentFrameIndex = 0;
    private timeSinceLastFrame = 0;
    private frameDuration = 0;
    private loop = true;
    private spriteMaterial: THREE.SpriteMaterial;

    // Subset loop properties (for hold effect when charge is complete)
    private useSubset = false;
    private subsetStart = 0;
    private subsetEnd = 0;

    // Static frame mode (for 360 rotation - display specific frame without animation)
    private isStaticMode = false;

    // Reverse playback mode
    private isReversed = false;

    // Animation complete callback
    private onAnimationComplete: (() => void) | null = null;

    // Track pending loads for async readiness
    private pendingLoads = 0;

    constructor(material: THREE.SpriteMaterial) {
        this.spriteMaterial = material;
    }

    /**
     * Load an atlas animation. Fetches the JSON metadata then loads the atlas texture.
     */
    loadAnimation(config: AtlasAnimationConfig): void {
        this.pendingLoads++;

        // Load metadata JSON
        fetch(config.metadataPath)
            .then(res => res.json())
            .then((metadata: AtlasMetadata) => {
                const texture = this.textureLoader.load(config.atlasPath, () => {
                    this.pendingLoads--;
                });

                // Configure texture for atlas usage
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;

                // Set repeat to show one frame at a time
                texture.repeat.set(1 / metadata.columns, 1 / metadata.rows);

                this.animations[config.name] = {
                    texture,
                    metadata,
                    frameRate: config.frameRate,
                    loop: config.loop,
                };
            })
            .catch(err => {
                console.error(`[AtlasSpriteAnimator] Failed to load atlas: ${config.metadataPath}`, err);
                this.pendingLoads--;
            });
    }

    /**
     * Check if all animations have finished loading
     */
    isReady(): boolean {
        return this.pendingLoads === 0;
    }

    /**
     * Set the UV offset to display a specific frame from the atlas
     */
    private setFrame(anim: AtlasAnimation, frameIndex: number): void {
        const { columns, rows } = anim.metadata;
        const col = frameIndex % columns;
        // UV origin is bottom-left in Three.js, but atlas is top-left
        const row = rows - 1 - Math.floor(frameIndex / columns);

        anim.texture.offset.set(col / columns, row / rows);
        this.spriteMaterial.map = anim.texture;
    }

    /**
     * Play animation forward (same API as SpriteAnimator)
     */
    play(name: string, loop = true, frameRate = 10, skipFrames = 0, forceReset = false): void {
        if (!forceReset && this.currentAnimation === name && !this.useSubset && !this.isStaticMode && !this.isReversed && skipFrames === 0) return;

        // Exit all special modes
        this.useSubset = false;
        this.subsetStart = 0;
        this.subsetEnd = 0;
        this.isStaticMode = false;
        this.isReversed = false;

        const anim = this.animations[name];
        if (anim) {
            this.currentAnimation = name;
            this.currentFrameIndex = Math.min(skipFrames, anim.metadata.frameCount - 1);
            this.loop = loop;
            this.frameDuration = 1 / frameRate;
            this.timeSinceLastFrame = 0;
            this.setFrame(anim, this.currentFrameIndex);
        }
    }

    /**
     * Play animation in reverse (same API as SpriteAnimator)
     */
    playReverse(name: string, frameRate: number = 30, skipFrames: number = 0): void {
        const anim = this.animations[name];
        if (!anim) return;

        this.useSubset = false;
        this.subsetStart = 0;
        this.subsetEnd = 0;
        this.isStaticMode = false;

        this.currentAnimation = name;
        this.currentFrameIndex = Math.max(0, anim.metadata.frameCount - 1 - skipFrames);
        this.loop = false;
        this.frameDuration = 1 / frameRate;
        this.timeSinceLastFrame = 0;
        this.isReversed = true;

        this.setFrame(anim, this.currentFrameIndex);
    }

    /**
     * Set callback for animation completion
     */
    setOnComplete(callback: (() => void) | null): void {
        this.onAnimationComplete = callback;
    }

    /**
     * Check if current animation has completed
     */
    isAnimationComplete(): boolean {
        if (!this.currentAnimation) return true;
        if (this.loop) return false;

        const anim = this.animations[this.currentAnimation];
        if (!anim) return true;

        if (this.isReversed) {
            return this.currentFrameIndex <= 0;
        }
        return this.currentFrameIndex >= anim.metadata.frameCount - 1;
    }

    /**
     * Check if currently playing in reverse
     */
    isPlayingReverse(): boolean {
        return this.isReversed;
    }

    /**
     * Display a specific frame without animation (for 360 rotation hold)
     */
    setStaticFrame(name: string, frameIndex: number): void {
        const anim = this.animations[name];
        if (!anim) return;

        const clampedIndex = Math.max(0, Math.min(frameIndex, anim.metadata.frameCount - 1));

        this.useSubset = false;
        this.isStaticMode = true;
        this.isReversed = false;
        this.currentAnimation = name;
        this.currentFrameIndex = clampedIndex;

        this.setFrame(anim, clampedIndex);
    }

    /**
     * Check if in static frame mode
     */
    isInStaticMode(): boolean {
        return this.isStaticMode;
    }

    /**
     * Play a subset of frames in a loop (for charge hold effect)
     */
    playSubsetLoop(name: string, startFrame: number, endFrame: number, frameRate: number = 12): void {
        const anim = this.animations[name];
        if (!anim) return;

        const maxFrame = anim.metadata.frameCount - 1;
        this.subsetStart = Math.max(0, Math.min(startFrame, maxFrame));
        this.subsetEnd = Math.max(this.subsetStart, Math.min(endFrame, maxFrame));

        this.currentAnimation = name;
        this.currentFrameIndex = this.subsetStart;
        this.frameDuration = 1 / frameRate;
        this.timeSinceLastFrame = 0;
        this.useSubset = true;
        this.loop = true;
        this.isStaticMode = false;
        this.isReversed = false;

        this.setFrame(anim, this.subsetStart);
    }

    /**
     * Stop subset loop mode
     */
    stopSubsetLoop(): void {
        this.useSubset = false;
        this.subsetStart = 0;
        this.subsetEnd = 0;
    }

    /**
     * Check if in subset loop mode
     */
    isInSubsetLoop(): boolean {
        return this.useSubset;
    }

    /**
     * Update animation frame (call each game tick)
     */
    update(delta: number): void {
        if (!this.currentAnimation || this.isStaticMode) return;

        const anim = this.animations[this.currentAnimation];
        if (!anim) return;

        this.timeSinceLastFrame += delta;

        if (this.timeSinceLastFrame >= this.frameDuration) {
            this.timeSinceLastFrame = 0;

            if (this.isReversed) {
                this.currentFrameIndex--;

                if (this.currentFrameIndex < 0) {
                    this.currentFrameIndex = 0;
                    this.isReversed = false;

                    if (this.onAnimationComplete) {
                        const callback = this.onAnimationComplete;
                        this.onAnimationComplete = null;
                        callback();
                    }
                }
            } else {
                this.currentFrameIndex++;

                const maxFrame = this.useSubset ? this.subsetEnd : anim.metadata.frameCount - 1;
                const minFrame = this.useSubset ? this.subsetStart : 0;

                if (this.currentFrameIndex > maxFrame) {
                    if (this.loop) {
                        this.currentFrameIndex = minFrame;
                    } else {
                        this.currentFrameIndex = maxFrame;

                        if (this.onAnimationComplete) {
                            const callback = this.onAnimationComplete;
                            this.onAnimationComplete = null;
                            callback();
                        }
                    }
                }
            }

            this.setFrame(anim, this.currentFrameIndex);
        }
    }

    /**
     * Dispose all loaded textures
     */
    dispose(): void {
        for (const name of Object.keys(this.animations)) {
            this.animations[name].texture.dispose();
        }
        this.animations = {};
    }
}
