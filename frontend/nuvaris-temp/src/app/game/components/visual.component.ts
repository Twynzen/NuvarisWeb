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
    private flipX: boolean = false;
    private flipY: boolean = false;

    // Debug
    private debugGraphics?: Phaser.GameObjects.Graphics;
    private debugText?: Phaser.GameObjects.Text;
    private isDebugEnabled: boolean = false;

    constructor(scene: Phaser.Scene, config: VisualConfig) {
        super(scene);
        this.currentConfig = config;
        this.createVisual();
        this.scene.add.existing(this);

        // Listen for global debug toggle
        this.scene.events.on('debug-toggle', (enabled: boolean) => {
            this.setDebug(enabled);
        });
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

        if (this.mainVisual instanceof Phaser.GameObjects.Sprite) {
            this.mainVisual.setFlip(this.flipX, this.flipY);
        }

        if (this.currentTint !== undefined) {
            this.setTint(this.currentTint);
        }

        this.add(this.mainVisual);

        if (this.isDebugEnabled) {
            this.updateDebugInfo();
        }
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
    private currentTint?: number;

    /**
     * Set tint/color
     */
    public setTint(color: number): void {
        this.currentTint = color;
        if (this.mainVisual instanceof Phaser.GameObjects.Shape) {
            this.mainVisual.setFillStyle(color);
        } else {
            this.mainVisual.setTint(color);
        }
    }

    /**
     * Set tint fill (solid color)
     */
    public setTintFill(color: number): void {
        if (this.mainVisual instanceof Phaser.GameObjects.Shape) {
            this.mainVisual.setFillStyle(color);
        } else {
            this.mainVisual.setTintFill(color);
        }
    }

    /**
     * Clear tint
     */
    public clearTint(): void {
        if (this.mainVisual instanceof Phaser.GameObjects.Shape) {
            this.mainVisual.setFillStyle(this.currentConfig.color || 0xffffff);
        } else {
            this.mainVisual.clearTint();
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
            this.mainVisual.setTintFill(0xffffff);
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
    public playAnimation(key: string, frameRate: number = 8, ignoreIfPlaying: boolean = true, loop: boolean = true): void {
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
                    const nextIndex = this.currentFrameIndex + 1;
                    if (nextIndex >= frames.length) {
                        if (!loop) {
                            // Stop animation on last frame
                            if (this.animationTimer) {
                                this.animationTimer.remove();
                                this.animationTimer = undefined;
                            }
                            return;
                        }
                        this.currentFrameIndex = 0;
                    } else {
                        this.currentFrameIndex = nextIndex;
                    }
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
        this.flipX = x;
        this.flipY = y;
        if (this.mainVisual instanceof Phaser.GameObjects.Sprite) {
            this.mainVisual.setFlip(x, y);
        }
    }

    public override destroy(fromScene?: boolean): void {
        this.scene.events.off('debug-toggle');
        super.destroy(fromScene);
    }

    /**
     * Enable/Disable debug info
     */
    public setDebug(enabled: boolean): void {
        this.isDebugEnabled = enabled;
        if (enabled) {
            this.updateDebugInfo();

            // Make interactive for selection
            let width = 0;
            let height = 0;
            if (this.mainVisual instanceof Phaser.GameObjects.Sprite || this.mainVisual instanceof Phaser.GameObjects.Shape) {
                width = this.mainVisual.displayWidth;
                height = this.mainVisual.displayHeight;
            }

            this.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
            this.on('pointerdown', (pointer: any, localX: number, localY: number, event: any) => {
                this.scene.events.emit('visual-selected', this);
                // Stop propagation so we don't click through to movement
                if (event && event.stopPropagation) event.stopPropagation();
            });
        } else {
            this.debugGraphics?.destroy();
            this.debugText?.destroy();
            this.debugGraphics = undefined;
            this.debugText = undefined;

            // Disable interaction
            this.disableInteractive();
            this.off('pointerdown');
        }
    }

    public resize(width: number, height: number): void {
        this.currentConfig.width = width;
        this.currentConfig.height = height;

        if (this.mainVisual instanceof Phaser.GameObjects.Sprite || this.mainVisual instanceof Phaser.GameObjects.Shape) {
            this.mainVisual.setDisplaySize(width, height);
        }

        if (this.isDebugEnabled) {
            this.updateDebugInfo();

            // Update interaction area
            this.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
        }
    }

    private updateDebugInfo(): void {
        if (!this.isDebugEnabled) return;

        if (this.debugGraphics) this.debugGraphics.clear();
        else this.debugGraphics = this.scene.add.graphics();

        if (this.debugText) this.debugText.destroy();

        let width = 0;
        let height = 0;

        if (this.mainVisual instanceof Phaser.GameObjects.Sprite) {
            width = this.mainVisual.displayWidth;
            height = this.mainVisual.displayHeight;
        } else if (this.mainVisual instanceof Phaser.GameObjects.Shape) {
            width = this.mainVisual.displayWidth;
            height = this.mainVisual.displayHeight;
            // Shapes might need different handling depending on origin
        }

        // Draw box (Red)
        this.debugGraphics.lineStyle(1, 0xff0000, 1);
        this.debugGraphics.strokeRect(-width / 2, -height / 2, width, height);
        this.add(this.debugGraphics);

        // Draw text
        this.debugText = this.scene.add.text(0, -height / 2 - 15, `${Math.round(width)}x${Math.round(height)}`, {
            fontSize: '10px',
            color: '#ff0000',
            backgroundColor: '#ffffff'
        });
        this.debugText.setOrigin(0.5, 0.5);
        this.add(this.debugText);
    }
}
