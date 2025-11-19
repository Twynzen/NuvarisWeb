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
            // Sprite mode (placeholder for now)
            this.mainVisual = this.scene.add.sprite(
                0,
                0,
                this.currentConfig.texture || 'missing'
            );
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
     * @param axis 'x' or 'y'
     * @param scale Scale factor (e.g., 1.2 for stretch, 0.8 for squash)
     * @param duration Duration in ms
     */
    public squashAndStretch(axis: 'x' | 'y', scale: number, duration: number = 100): void {
        const targetScaleX = axis === 'x' ? scale : (2 - scale); // Preserve volume roughly
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
     * Play animation (for sprites)
     */
    public playAnimation(key: string): void {
        if (this.mainVisual instanceof Phaser.GameObjects.Sprite) {
            this.mainVisual.play(key);
        }
    }
}
