import * as THREE from 'three';

export interface AnimationConfig {
    name: string;
    texturePath: string; // Path to folder or base name
    frameCount: number;
    frameRate: number;
    loop: boolean;
    prefix: string; // e.g. "arcadio-idle-"
    suffix: string; // e.g. ".png"
    startFrame?: number; // default 1
}

interface AnimationData {
    frames: THREE.Texture[];
    frameRate: number;
    loop: boolean;
}

export class SpriteAnimator {
    private textureLoader = new THREE.TextureLoader();
    private animations: { [name: string]: AnimationData } = {};
    private pendingLoads: Promise<void>[] = [];
    private currentAnimation: string | null = null;
    private currentFrameIndex = 0;
    private timeSinceLastFrame = 0;
    private frameDuration = 0;
    private loop = true;
    private spriteMaterial: THREE.SpriteMaterial;

    // Track loading state
    private isPreloaded = false;
    private totalTextures = 0;
    private loadedTextures = 0;

    constructor(material: THREE.SpriteMaterial) {
        this.spriteMaterial = material;
    }

    /**
     * Load an animation sequence
     * Textures are loaded asynchronously - use preloadAll() to wait for completion
     * The frameRate from config is stored and used automatically when playing
     */
    loadAnimation(config: AnimationConfig) {
        const frames: THREE.Texture[] = [];
        const start = config.startFrame || 1;

        for (let i = 0; i < config.frameCount; i++) {
            const frameNum = (start + i).toString().padStart(3, '0');
            const path = `${config.texturePath}/${config.prefix}${frameNum}${config.suffix}`;

            this.totalTextures++;

            // Create a promise for this texture load
            const loadPromise = new Promise<void>((resolve, reject) => {
                const texture = this.textureLoader.load(
                    path,
                    // onLoad
                    () => {
                        this.loadedTextures++;
                        resolve();
                    },
                    // onProgress (not used)
                    undefined,
                    // onError
                    (error) => {
                        console.warn(`[SPRITE] Failed to load texture: ${path}`, error);
                        this.loadedTextures++;
                        resolve(); // Resolve anyway to not block other loads
                    }
                );

                // Configure texture for illustrated sprites (smooth scaling)
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.generateMipmaps = true;

                frames.push(texture);
            });

            this.pendingLoads.push(loadPromise);
        }

        // Store animation with its configured frameRate and loop setting
        this.animations[config.name] = {
            frames,
            frameRate: config.frameRate,
            loop: config.loop
        };
    }

    /**
     * Wait for all textures to be fully loaded
     * Call this before starting the game to avoid stuttering
     * @returns Promise that resolves when all textures are loaded
     */
    async preloadAll(): Promise<void> {
        if (this.pendingLoads.length === 0) {
            this.isPreloaded = true;
            return;
        }

        console.log(`[SPRITE] Preloading ${this.totalTextures} textures...`);
        const startTime = Date.now();

        await Promise.all(this.pendingLoads);

        const elapsed = Date.now() - startTime;
        console.log(`[SPRITE] Preloaded ${this.loadedTextures}/${this.totalTextures} textures in ${elapsed}ms`);

        this.isPreloaded = true;
        this.pendingLoads = []; // Clear pending loads
    }

    /**
     * Get loading progress (0-1)
     */
    getLoadingProgress(): number {
        if (this.totalTextures === 0) return 1;
        return this.loadedTextures / this.totalTextures;
    }

    /**
     * Check if all textures are preloaded
     */
    isFullyLoaded(): boolean {
        return this.isPreloaded;
    }

    /**
     * Play an animation
     * @param name Animation name
     * @param loop Override loop setting (optional, uses config default if not provided)
     * @param frameRate Override frameRate (optional, uses config default if not provided)
     */
    play(name: string, loop?: boolean, frameRate?: number) {
        if (this.currentAnimation === name) return;

        const animData = this.animations[name];
        if (animData) {
            this.currentAnimation = name;
            this.currentFrameIndex = 0;

            // Use provided values or fall back to animation config defaults
            this.loop = loop !== undefined ? loop : animData.loop;
            const fps = frameRate !== undefined ? frameRate : animData.frameRate;
            this.frameDuration = 1 / fps;
            this.timeSinceLastFrame = 0;

            // Only set texture if frames are loaded
            if (animData.frames[0]) {
                this.spriteMaterial.map = animData.frames[0];
            }
        }
    }

    update(delta: number) {
        if (!this.currentAnimation) return;

        const animData = this.animations[this.currentAnimation];
        if (!animData) return;

        this.timeSinceLastFrame += delta;

        if (this.timeSinceLastFrame >= this.frameDuration) {
            this.timeSinceLastFrame = 0;
            this.currentFrameIndex++;

            const frames = animData.frames;

            if (this.currentFrameIndex >= frames.length) {
                if (this.loop) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex = frames.length - 1;
                    // Animation finished
                }
            }

            // Only update if texture exists
            if (frames[this.currentFrameIndex]) {
                this.spriteMaterial.map = frames[this.currentFrameIndex];
            }
        }
    }

    /**
     * Get current animation name
     */
    getCurrentAnimation(): string | null {
        return this.currentAnimation;
    }

    /**
     * Check if an animation exists
     */
    hasAnimation(name: string): boolean {
        return name in this.animations;
    }

    /**
     * Force reset current animation (useful after preload)
     */
    resetCurrentAnimation(): void {
        if (this.currentAnimation) {
            const animData = this.animations[this.currentAnimation];
            if (animData && animData.frames[0]) {
                this.currentFrameIndex = 0;
                this.timeSinceLastFrame = 0;
                this.spriteMaterial.map = animData.frames[0];
            }
        }
    }
}
