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

    // Static frame mode (for 360 rotation - display specific frame without animation)
    private isStaticMode = false;

    // Reverse playback mode
    private isReversed = false;

    // Animation complete callback
    private onAnimationComplete: (() => void) | null = null;

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

    /**
     * Play animation forward
     * @param name Animation name
     * @param loop Whether to loop
     * @param frameRate Frames per second
     * @param skipFrames Number of frames to skip at start (for seamless transitions)
     * @param forceReset Force restart even if same animation is playing
     */
    play(name: string, loop = true, frameRate = 10, skipFrames = 0, forceReset = false) {
        if (!forceReset && this.currentAnimation === name && !this.useSubset && !this.isStaticMode && !this.isReversed && skipFrames === 0) return;

        // Exit all special modes when playing a new animation
        this.useSubset = false;
        this.subsetStart = 0;
        this.subsetEnd = 0;
        this.isStaticMode = false;
        this.isReversed = false;

        if (this.animations[name]) {
            this.currentAnimation = name;
            // Skip frames for seamless transitions (e.g., skipFrames=1 starts at frame index 1)
            const frames = this.animations[name];
            this.currentFrameIndex = Math.min(skipFrames, frames.length - 1);
            this.loop = loop;
            this.frameDuration = 1 / frameRate;
            this.timeSinceLastFrame = 0;

            this.spriteMaterial.map = frames[this.currentFrameIndex];
        }
    }

    /**
     * Play animation in reverse (from last frame to first)
     * Useful for recovery animations
     * @param name Animation name
     * @param frameRate Frames per second
     * @param skipFrames Number of frames to skip at start (from end, for seamless transitions)
     */
    playReverse(name: string, frameRate: number = 30, skipFrames: number = 0): void {
        if (!this.animations[name]) return;

        // Exit all special modes
        this.useSubset = false;
        this.subsetStart = 0;
        this.subsetEnd = 0;
        this.isStaticMode = false;

        this.currentAnimation = name;
        const frames = this.animations[name];
        // Skip frames from end for seamless transitions (e.g., skipFrames=1 starts at frames.length-2)
        this.currentFrameIndex = Math.max(0, frames.length - 1 - skipFrames);
        this.loop = false;
        this.frameDuration = 1 / frameRate;
        this.timeSinceLastFrame = 0;
        this.isReversed = true;

        this.spriteMaterial.map = frames[this.currentFrameIndex];
    }

    /**
     * Set callback for when animation completes (non-looping animations only)
     * @param callback Function to call when animation finishes
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

        const frames = this.animations[this.currentAnimation];
        if (this.isReversed) {
            return this.currentFrameIndex <= 0;
        }
        return this.currentFrameIndex >= frames.length - 1;
    }

    /**
     * Check if currently playing in reverse
     */
    isPlayingReverse(): boolean {
        return this.isReversed;
    }

    /**
     * Display a specific frame without animation (for 360 rotation hold)
     * @param name Animation name to get frame from
     * @param frameIndex Frame to display (0-indexed)
     */
    setStaticFrame(name: string, frameIndex: number): void {
        if (!this.animations[name]) return;

        const frames = this.animations[name];
        const clampedIndex = Math.max(0, Math.min(frameIndex, frames.length - 1));

        // Stop any ongoing animation modes
        this.useSubset = false;
        this.isStaticMode = true;
        this.isReversed = false;
        this.currentAnimation = name;
        this.currentFrameIndex = clampedIndex;

        // Set texture directly
        this.spriteMaterial.map = frames[clampedIndex];
    }

    /**
     * Check if currently in static frame mode
     */
    isInStaticMode(): boolean {
        return this.isStaticMode;
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
        this.isStaticMode = false;
        this.isReversed = false;

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
        // Don't update if no animation or in static mode (manual frame control)
        if (!this.currentAnimation || this.isStaticMode) return;

        this.timeSinceLastFrame += delta;

        if (this.timeSinceLastFrame >= this.frameDuration) {
            this.timeSinceLastFrame = 0;

            const frames = this.animations[this.currentAnimation];

            if (this.isReversed) {
                // REVERSE MODE: decrement frames
                this.currentFrameIndex--;

                if (this.currentFrameIndex < 0) {
                    this.currentFrameIndex = 0;
                    this.isReversed = false;

                    // Fire callback when reverse animation completes
                    if (this.onAnimationComplete) {
                        const callback = this.onAnimationComplete;
                        this.onAnimationComplete = null;
                        callback();
                    }
                }
            } else {
                // NORMAL MODE: increment frames
                this.currentFrameIndex++;

                // Determine loop boundaries based on subset mode
                const maxFrame = this.useSubset ? this.subsetEnd : frames.length - 1;
                const minFrame = this.useSubset ? this.subsetStart : 0;

                if (this.currentFrameIndex > maxFrame) {
                    if (this.loop) {
                        this.currentFrameIndex = minFrame;
                    } else {
                        this.currentFrameIndex = maxFrame;

                        // Fire callback when non-loop animation completes
                        if (this.onAnimationComplete) {
                            const callback = this.onAnimationComplete;
                            this.onAnimationComplete = null;
                            callback();
                        }
                    }
                }
            }

            this.spriteMaterial.map = frames[this.currentFrameIndex];
        }
    }
}
