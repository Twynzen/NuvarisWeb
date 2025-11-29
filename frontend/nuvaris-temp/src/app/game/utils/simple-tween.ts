/**
 * Simple Tweening System
 *
 * A lightweight alternative to GSAP for basic property animation.
 * Supports easing and callbacks.
 *
 * Usage:
 *   SimpleTween.to(light, { intensity: 1 }, 0.5, 'easeOut');
 *   SimpleTween.update(deltaTime);  // Call in animation loop
 */

export type EasingFunction = (t: number) => number;

export interface TweenOptions {
    duration: number;
    ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
    onComplete?: () => void;
    onUpdate?: (progress: number) => void;
    yoyo?: boolean;
    repeat?: number;
}

interface ActiveTween {
    target: any;
    properties: { [key: string]: { start: number; end: number } };
    elapsed: number;
    duration: number;
    easing: EasingFunction;
    onComplete?: () => void;
    onUpdate?: (progress: number) => void;
    yoyo: boolean;
    repeat: number;
    repeatCount: number;
    direction: 1 | -1;
    id: number;
}

// Easing functions
const EASINGS: Record<string, EasingFunction> = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => t * (2 - t),
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    // Power2 equivalents (for GSAP compatibility)
    'power2.in': (t) => t * t,
    'power2.out': (t) => t * (2 - t),
    'power2.inOut': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    // Sine
    'sine.inOut': (t) => -(Math.cos(Math.PI * t) - 1) / 2
};

/**
 * Simple Tween System
 */
export class SimpleTween {
    private static activeTweens: ActiveTween[] = [];
    private static nextId = 0;
    private static targetTweenMap: Map<any, Set<number>> = new Map();

    /**
     * Animate properties of an object
     */
    static to(
        target: any,
        properties: { [key: string]: number },
        duration: number,
        ease: string = 'easeOut',
        options?: Partial<TweenOptions>
    ): number {
        // Kill existing tweens on same target/properties
        this.killTweensOf(target, Object.keys(properties));

        const id = this.nextId++;
        const easing = EASINGS[ease] || EASINGS['easeOut'];

        // Capture start values
        const propertyData: { [key: string]: { start: number; end: number } } = {};
        for (const key of Object.keys(properties)) {
            const startValue = this.getNestedProperty(target, key);
            if (typeof startValue === 'number') {
                propertyData[key] = {
                    start: startValue,
                    end: properties[key]
                };
            }
        }

        const tween: ActiveTween = {
            target,
            properties: propertyData,
            elapsed: 0,
            duration,
            easing,
            onComplete: options?.onComplete,
            onUpdate: options?.onUpdate,
            yoyo: options?.yoyo || false,
            repeat: options?.repeat ?? 0,
            repeatCount: 0,
            direction: 1,
            id
        };

        this.activeTweens.push(tween);

        // Track tween by target
        if (!this.targetTweenMap.has(target)) {
            this.targetTweenMap.set(target, new Set());
        }
        this.targetTweenMap.get(target)!.add(id);

        return id;
    }

    /**
     * Kill all tweens on a target
     */
    static killTweensOf(target: any, properties?: string[]): void {
        const tweenIds = this.targetTweenMap.get(target);
        if (!tweenIds) return;

        const idsToRemove: number[] = [];

        for (const id of tweenIds) {
            const tweenIndex = this.activeTweens.findIndex(t => t.id === id);
            if (tweenIndex === -1) continue;

            const tween = this.activeTweens[tweenIndex];

            // If specific properties, only kill if matching
            if (properties) {
                const hasMatchingProperty = properties.some(p => p in tween.properties);
                if (!hasMatchingProperty) continue;
            }

            this.activeTweens.splice(tweenIndex, 1);
            idsToRemove.push(id);
        }

        idsToRemove.forEach(id => tweenIds.delete(id));
        if (tweenIds.size === 0) {
            this.targetTweenMap.delete(target);
        }
    }

    /**
     * Update all active tweens - call in animation loop
     */
    static update(deltaTime: number): void {
        for (let i = this.activeTweens.length - 1; i >= 0; i--) {
            const tween = this.activeTweens[i];
            tween.elapsed += deltaTime * tween.direction;

            let progress = Math.min(Math.max(tween.elapsed / tween.duration, 0), 1);
            const easedProgress = tween.easing(progress);

            // Apply properties
            for (const key of Object.keys(tween.properties)) {
                const prop = tween.properties[key];
                const value = prop.start + (prop.end - prop.start) * easedProgress;
                this.setNestedProperty(tween.target, key, value);
            }

            // Callback
            if (tween.onUpdate) {
                tween.onUpdate(easedProgress);
            }

            // Check completion
            if (progress >= 1) {
                if (tween.yoyo) {
                    tween.direction = -1;
                    tween.elapsed = tween.duration;
                } else if (tween.repeat === -1 || tween.repeatCount < tween.repeat) {
                    tween.elapsed = 0;
                    tween.repeatCount++;
                    if (tween.yoyo) {
                        tween.direction = 1;
                    }
                } else {
                    // Complete
                    if (tween.onComplete) {
                        tween.onComplete();
                    }
                    this.activeTweens.splice(i, 1);

                    // Remove from target map
                    const targetTweens = this.targetTweenMap.get(tween.target);
                    if (targetTweens) {
                        targetTweens.delete(tween.id);
                        if (targetTweens.size === 0) {
                            this.targetTweenMap.delete(tween.target);
                        }
                    }
                }
            } else if (progress <= 0 && tween.direction === -1) {
                // Yoyo back to start
                if (tween.repeat === -1 || tween.repeatCount < tween.repeat) {
                    tween.direction = 1;
                    tween.elapsed = 0;
                    tween.repeatCount++;
                } else {
                    if (tween.onComplete) {
                        tween.onComplete();
                    }
                    this.activeTweens.splice(i, 1);
                }
            }
        }
    }

    /**
     * Get nested property value (e.g., "position.x")
     */
    private static getNestedProperty(obj: any, path: string): any {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }

    /**
     * Set nested property value
     */
    private static setNestedProperty(obj: any, path: string, value: any): void {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] === undefined) return;
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    /**
     * Get count of active tweens
     */
    static getActiveTweenCount(): number {
        return this.activeTweens.length;
    }

    /**
     * Clear all tweens
     */
    static clear(): void {
        this.activeTweens = [];
        this.targetTweenMap.clear();
    }
}

/**
 * Compatibility wrapper for GSAP-like API
 */
export const gsap = {
    to: (target: any, options: any) => {
        const { duration, ease, onComplete, yoyo, repeat, ...properties } = options;
        return SimpleTween.to(target, properties, duration || 0.5, ease, {
            onComplete,
            yoyo,
            repeat
        });
    },

    killTweensOf: (target: any) => {
        SimpleTween.killTweensOf(target);
    },

    update: (deltaTime: number) => {
        SimpleTween.update(deltaTime);
    }
};
