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
        if (this.currentAnimation === name) return;

        if (this.animations[name]) {
            this.currentAnimation = name;
            this.currentFrameIndex = 0;
            this.loop = loop;
            this.frameDuration = 1 / frameRate;
            this.timeSinceLastFrame = 0;

            this.spriteMaterial.map = this.animations[name][0];
        }
    }

    update(delta: number) {
        if (!this.currentAnimation) return;

        this.timeSinceLastFrame += delta;

        if (this.timeSinceLastFrame >= this.frameDuration) {
            this.timeSinceLastFrame = 0;
            this.currentFrameIndex++;

            const frames = this.animations[this.currentAnimation];

            if (this.currentFrameIndex >= frames.length) {
                if (this.loop) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex = frames.length - 1;
                    // Animation finished
                }
            }

            this.spriteMaterial.map = frames[this.currentFrameIndex];
        }
    }
}
