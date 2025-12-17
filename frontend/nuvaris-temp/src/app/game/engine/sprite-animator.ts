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

export class SpriteAnimator {
    private textureLoader = new THREE.TextureLoader();
    private animations: { [name: string]: THREE.Texture[] } = {};
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

    constructor(material: THREE.SpriteMaterial) {
        this.spriteMaterial = material;
    }

    // Load an animation sequence
    loadAnimation(config: AnimationConfig) {
        const frames: THREE.Texture[] = [];
        const start = config.startFrame || 1;

        for (let i = 0; i < config.frameCount; i++) {
            const frameNum = (start + i).toString().padStart(3, '0');
            const path = `${config.texturePath}/${config.prefix}${frameNum}${config.suffix}`;
            frames.push(this.textureLoader.load(path));
        }

        this.animations[config.name] = frames;
    }

    play(name: string, loop = true, frameRate = 10) {
        if (this.currentAnimation === name && !this.useSubset) return;

        // Exit subset mode when playing a new animation
        this.useSubset = false;
        this.subsetStart = 0;
        this.subsetEnd = 0;

        if (this.animations[name]) {
            this.currentAnimation = name;
            this.currentFrameIndex = 0;
            this.loop = loop;
            this.frameDuration = 1 / frameRate;
            this.timeSinceLastFrame = 0;

            this.spriteMaterial.map = this.animations[name][0];
        }
    }

    /**
     * Play a subset of frames in a loop (for hold effect when charge is complete)
     * @param name Animation name
     * @param startFrame First frame of subset (0-indexed)
     * @param endFrame Last frame of subset (0-indexed, inclusive)
     * @param frameRate Frames per second
     */
    playSubsetLoop(name: string, startFrame: number, endFrame: number, frameRate: number = 12): void {
        if (!this.animations[name]) return;

        const frames = this.animations[name];
        // Clamp to valid range
        this.subsetStart = Math.max(0, Math.min(startFrame, frames.length - 1));
        this.subsetEnd = Math.max(this.subsetStart, Math.min(endFrame, frames.length - 1));

        this.currentAnimation = name;
        this.currentFrameIndex = this.subsetStart;
        this.frameDuration = 1 / frameRate;
        this.timeSinceLastFrame = 0;
        this.useSubset = true;
        this.loop = true;

        this.spriteMaterial.map = frames[this.subsetStart];
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
     * Check if currently in subset loop mode
     */
    isInSubsetLoop(): boolean {
        return this.useSubset;
    }

    update(delta: number) {
        if (!this.currentAnimation) return;

        this.timeSinceLastFrame += delta;

        if (this.timeSinceLastFrame >= this.frameDuration) {
            this.timeSinceLastFrame = 0;
            this.currentFrameIndex++;

            const frames = this.animations[this.currentAnimation];

            // Determine loop boundaries based on subset mode
            const maxFrame = this.useSubset ? this.subsetEnd : frames.length - 1;
            const minFrame = this.useSubset ? this.subsetStart : 0;

            if (this.currentFrameIndex > maxFrame) {
                if (this.loop) {
                    this.currentFrameIndex = minFrame;
                } else {
                    this.currentFrameIndex = maxFrame;
                    // Animation finished
                }
            }

            this.spriteMaterial.map = frames[this.currentFrameIndex];
        }
    }
}
