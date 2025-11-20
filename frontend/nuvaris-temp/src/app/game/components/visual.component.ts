import * as Phaser from 'phaser';
import { GameConfig } from '../config/game.config';

export type VisualType = 'shape' | 'sprite';
export type ShapeType = 'rectangle' | 'circle';

export interface VisualConfig {
    type: VisualType;
    shape?: ShapeType;
    color?: number;
    width?: number;
    height?: number;
    radius?: number;
    texture?: string;
    frame?: string | number;
}

export class VisualComponent extends Phaser.GameObjects.Container {
    private mainVisual!: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite;
    private currentConfig: VisualConfig;
    private originalScale: { x: number, y: number } = { x: 1, y: 1 };

    private animationTimer?: Phaser.Time.TimerEvent;
    private currentAnimKey: string = '';
    private currentFrameIndex: number = 0;

    constructor(scene: Phaser.Scene, config: VisualConfig) {
        super(scene);
        this.currentConfig = config;
        this.createVisual();
        this.scene.add.existing(this);
    }

    private createVisual(): void {
        if (this.mainVisual) {
            this.mainVisual.destroy();
        }

        if (this.currentConfig.type === 'shape') {
            if (this.currentConfig.shape === 'circle') {
                this.mainVisual = this.scene.add.circle(
                    0,
                    0,
                    this.currentConfig.radius || 10,
                    this.currentConfig.color || 0xffffff
                );
            } else {
                this.mainVisual = this.scene.add.rectangle(
                    0,
                    0,
                    this.currentConfig.width || 32,
                    this.currentConfig.height || 32,
                    this.currentConfig.color || 0xffffff
                );
            }
        } else {
            // Sprite mode
            this.mainVisual = this.scene.add.sprite(
                0,
                0,
                this.currentConfig.texture || 'missing'
            );

            if (this.currentConfig.width && this.currentConfig.height) {
                this.mainVisual.setDisplaySize(this.currentConfig.width, this.currentConfig.height);
            }
        }

        this.add(this.mainVisual);
    }

    /**
     * Update visual configuration
     */
    public setConfig(config: Partial<VisualConfig>): void {
        this.currentConfig = { ...this.currentConfig, ...config };
        this.createVisual();
    }

    /**
     * Switch to sprite mode with specific texture
     */
    public setSprite(texture: string): void {
        if (this.currentConfig.type !== 'sprite' || this.currentConfig.texture !== texture) {
            this.setConfig({ type: 'sprite', texture: texture });
        }
    }

    /**
     * Set tint/color
     */
    public setTint(color: number): void {
        if (this.mainVisual instanceof Phaser.GameObjects.Shape) {
            this.mainVisual.setFillStyle(color);
        } else {
            this.mainVisual.setTint(color);
        }
    }

    /**
     * Flash effect (white flash)
     */
    public flash(duration: number = 100): void {
        const originalColor = this.currentConfig.color || 0xffffff;

        if (this.mainVisual instanceof Phaser.GameObjects.Shape) {
            this.mainVisual.setFillStyle(0xffffff);
        } else {
            this.mainVisual.setTint(0xffffff);
        }

        this.scene.time.delayedCall(duration, () => {
            if (this.mainVisual instanceof Phaser.GameObjects.Shape) {
                this.mainVisual.setFillStyle(originalColor);
            } else {
                this.mainVisual.clearTint();
            }
        });
    }

    /**
     * Squash and Stretch effect
     */
    public squashAndStretch(axis: 'x' | 'y', scale: number, duration: number = 100): void {
        const targetScaleX = axis === 'x' ? scale : (2 - scale);
        const targetScaleY = axis === 'y' ? scale : (2 - scale);

        this.scene.tweens.add({
            targets: this,
            scaleX: targetScaleX,
            scaleY: targetScaleY,
            yoyo: true,
            duration: duration,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Play manual animation based on GameConfig keys
     */
    public playAnimation(key: string, frameRate: number = 8, ignoreIfPlaying: boolean = true): void {
        if (ignoreIfPlaying && this.currentAnimKey === key) return;

        // Stop previous animation
        if (this.animationTimer) {
            this.animationTimer.remove();
            this.animationTimer = undefined;
        }

        this.currentAnimKey = key;
        this.currentFrameIndex = 0;

        const frames = (GameConfig.animations as any)[key];
        if (!frames || frames.length === 0) {
            // Fallback if animation not found, try to set as static texture
            this.setSprite(key);
            return;
        }

        // Set initial frame
        this.setSprite(frames[0]);

        if (frames.length > 1) {
            const delay = 1000 / frameRate;
            this.animationTimer = this.scene.time.addEvent({
                delay: delay,
                callback: () => {
                    this.currentFrameIndex = (this.currentFrameIndex + 1) % frames.length;
                    this.setSprite(frames[this.currentFrameIndex]);
                },
                loop: true
            });
        }
    }

    /**
     * Stop current animation
     */
    public stopAnimation(): void {
        if (this.animationTimer) {
            this.animationTimer.remove();
            this.animationTimer = undefined;
        }
        this.currentAnimKey = '';
    }

    /**
     * Set Flip
     */
    public setFlip(x: boolean, y: boolean): void {
        if (this.mainVisual instanceof Phaser.GameObjects.Sprite) {
            this.mainVisual.setFlip(x, y);
        }
    }
}
