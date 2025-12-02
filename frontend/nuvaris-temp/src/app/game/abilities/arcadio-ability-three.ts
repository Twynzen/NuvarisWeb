import * as THREE from 'three';
import { CharacterAbilityThree } from './character-ability-three';
import { PlayerThree } from '../entities/player.three';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { ArcadioSkills } from './skills/arcadio.skills';

/**
 * Arcadio Ability - Three.js implementation
 * Passive: Titan Strength
 * - Uses powerful melee punch (AOE around player)
 * - Increased damage resistance
 * - Knockback effect on hits
 * - Thorns damage when hit (upgrade)
 */
export class ArcadioAbilityThree implements CharacterAbilityThree {
    name = 'Titan Strength';
    description = 'Uses a powerful melee punch and has increased resistance.';

    private scene!: THREE.Scene;
    private player!: PlayerThree;

    // Melee damage properties (used by ThreeEngineService)
    public damage = 40; // Base melee damage
    public knockbackMultiplier = 1; // Knockback force multiplier

    // LIFESTEAL - Arcadio tiene probabilidad de curar al golpear
    public lifestealChance = 0.30; // 30% probabilidad de activar curación
    public lifestealHealPercent = 0.20; // 20% de la vida máxima cuando se activa

    // Damage reduction (stacks with upgrades)
    public damageReduction = 0; // 0 = 0%, 0.1 = 10%, etc.

    // Thorns/Retaliation (upgrade)
    public thorns = 0; // 0 = 0%, 0.1 = 10% damage reflected

    // Adrenaline effect state (upgrade)
    public hasAdrenaline = false;
    public adrenalineActive = false;
    private adrenalineTimer = 0;
    private adrenalineSpeedBoost = 0.05; // 5% speed boost
    private adrenalineDuration = 2; // 2 seconds

    // Stun chance (upgrade)
    public stunChance = 0; // Earthquake legendary

    // ========== BERSERK MODE (Legendary) ==========
    public canBerserk = false; // Unlocked via skill
    public berserkKillCounter = 0; // Kills since last berserk
    public berserkKillsRequired = 100; // Kills needed to activate
    public berserkActive = false;
    private berserkTimer = 0;
    public berserkDuration = 8; // 8 seconds of berserk
    public berserkReady = false; // True when 100 kills reached

    // Berserk bonuses
    public berserkOneHitKill = true; // All attacks kill instantly
    public berserkFullLifesteal = true; // Every hit heals

    // Callback for berserk activation sound
    public onBerserkActivateCallback: (() => void) | null = null;

    // ========== ADDITIONAL UPGRADES ==========
    // Blood Rage - increased lifesteal chance
    public bloodRageBonus = 0; // Extra lifesteal chance

    // Titan Resilience - HP regen
    public hasRegeneration = false;
    public regenAmount = 0; // HP per second
    private regenTimer = 0;

    // Fury - damage boost when low HP
    public hasFury = false;
    public furyThreshold = 0.3; // Below 30% HP
    public furyDamageBoost = 0.5; // +50% damage

    // Reference to game state for lifesteal
    private gameStateRef: any = null;

    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void {
        this.scene = scene;
        this.player = player;
        this.gameStateRef = gameState;
        console.log('[ARCADIO] Titan Strength ability initialized - 30% chance for 20% HP heal');
    }

    /**
     * Set game state reference for lifesteal
     */
    public setGameState(gameState: any): void {
        this.gameStateRef = gameState;
    }

    update(delta: number, scene: THREE.Scene, player: PlayerThree, enemies: EnemyThree[]): void {
        // Update Adrenaline cooldown if active
        if (this.adrenalineActive) {
            this.adrenalineTimer -= delta;
            if (this.adrenalineTimer <= 0) {
                this.adrenalineActive = false;
                console.log('[ARCADIO] Adrenaline wore off');
            }
        }

        // ========== BERSERK MODE UPDATE ==========
        if (this.berserkActive) {
            this.berserkTimer -= delta;

            // Visual pulsing effect during berserk
            if (this.player && this.player.mesh) {
                const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
                this.player.mesh.scale.set(pulse, pulse, pulse);
            }

            if (this.berserkTimer <= 0) {
                this.deactivateBerserk();
            }
        }

        // ========== REGENERATION UPDATE ==========
        if (this.hasRegeneration && this.regenAmount > 0 && this.gameStateRef) {
            this.regenTimer += delta;
            if (this.regenTimer >= 1) { // Every second
                this.regenTimer = 0;
                if (this.gameStateRef.health < this.gameStateRef.maxHealth) {
                    this.gameStateRef.health = Math.min(
                        this.gameStateRef.health + this.regenAmount,
                        this.gameStateRef.maxHealth
                    );
                    // Small heal indicator
                    this.showHealNumber(this.regenAmount);
                }
            }
        }
    }

    /**
     * Called when a projectile hits an enemy
     * Arcadio uses MELEE, not projectiles - this is a no-op
     */
    onProjectileHit(
        projectile: ProjectileThree,
        enemy: EnemyThree,
        damage: number,
        scene: THREE.Scene,
        allEnemies: EnemyThree[]
    ): void {
        // Arcadio doesn't use projectiles - melee is handled directly
        // through ThreeEngineService.autoShoot() -> player.meleeAttack()
    }

    /**
     * Called when an enemy hits the player
     * Apply damage reduction and thorns effect
     */
    onEnemyHitPlayer(
        enemy: EnemyThree,
        player: PlayerThree,
        damageAmount: number,
        scene: THREE.Scene
    ): number {
        // Apply damage reduction
        const reducedDamage = damageAmount * (1 - this.damageReduction);

        // Apply thorns/retaliation damage to the enemy
        if (this.thorns > 0) {
            const thornsDamage = damageAmount * this.thorns;
            enemy.takeDamage(thornsDamage, scene);
            console.log(`[ARCADIO] Thorns reflected ${thornsDamage.toFixed(1)} damage`);
        }

        // Trigger adrenaline if unlocked
        if (this.hasAdrenaline && !this.adrenalineActive) {
            this.activateAdrenaline();
        }

        return Math.ceil(reducedDamage);
    }

    getUpgrades(): any[] {
        return ArcadioSkills;
    }

    // ========== LIFESTEAL SYSTEM ==========

    // Callback para reproducir sonido de curación (se setea desde el engine)
    public onHealCallback: (() => void) | null = null;

    /**
     * Apply lifesteal from melee damage dealt
     * Called after melee attack deals damage
     * - 30% probabilidad de activar curación
     * - Cuando se activa, cura 20% de la vida máxima
     */
    public applyLifesteal(totalDamage: number, enemiesHit: number): number {
        if (totalDamage <= 0 || !this.gameStateRef || enemiesHit <= 0) return 0;

        // 30% probabilidad de activar curación
        const roll = Math.random();
        if (roll > this.lifestealChance) {
            // No se activó el lifesteal
            return 0;
        }

        // Curación = 20% de la vida máxima
        const healAmount = Math.ceil(this.gameStateRef.maxHealth * this.lifestealHealPercent);

        // Apply healing
        const oldHealth = this.gameStateRef.health;
        this.gameStateRef.health = Math.min(
            this.gameStateRef.health + healAmount,
            this.gameStateRef.maxHealth
        );

        const actualHeal = this.gameStateRef.health - oldHealth;

        if (actualHeal > 0) {
            console.log(`[ARCADIO] Lifesteal activated! +${actualHeal} HP (${this.lifestealHealPercent * 100}% of max HP, roll: ${(roll * 100).toFixed(1)}%)`);

            // Visual feedback - green flash on player + floating number
            this.createHealEffect(actualHeal);

            // Play heal sound
            if (this.onHealCallback) {
                this.onHealCallback();
            }
        }

        return actualHeal;
    }

    /**
     * Create visual heal effect on player with floating heal number
     * Public so it can be called from engine during berserk
     */
    public createHealEffect(healAmount: number): void {
        if (!this.player || !this.player.mesh || !this.scene) return;

        // Flash green briefly
        const sprite = this.player.mesh.children[0] as THREE.Sprite;
        if (sprite && sprite.material) {
            const material = sprite.material as THREE.SpriteMaterial;
            const originalColor = material.color.getHex();
            material.color.setHex(0x00ff00); // Green flash

            setTimeout(() => {
                material.color.setHex(originalColor);
            }, 150);
        }

        // Show floating heal number above player
        this.showHealNumber(healAmount);
    }

    /**
     * Show floating green heal number above player
     */
    private showHealNumber(healAmount: number): void {
        if (!this.scene || !this.player || !this.player.mesh) return;

        // Create canvas for heal text
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const context = canvas.getContext('2d')!;

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw green heal text with black outline
        context.fillStyle = '#00ff00'; // Green for healing
        context.strokeStyle = '#003300'; // Dark green outline
        context.lineWidth = 4;
        context.font = 'bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        const text = `+${healAmount}`;
        context.strokeText(text, 64, 32);
        context.fillText(text, 64, 32);

        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const healSprite = new THREE.Sprite(spriteMaterial);
        healSprite.scale.set(2, 1, 1);

        // Position above player
        const playerPos = this.player.mesh.position.clone();
        healSprite.position.set(
            playerPos.x,
            playerPos.y + 3,
            playerPos.z
        );

        this.scene.add(healSprite);

        // Animate upward and fade out
        let elapsed = 0;
        const duration = 0.8;
        const startY = healSprite.position.y;

        const animate = () => {
            elapsed += 0.016; // ~60fps
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(healSprite);
                texture.dispose();
                spriteMaterial.dispose();
                return;
            }

            // Move up
            healSprite.position.y = startY + progress * 2;

            // Fade out
            spriteMaterial.opacity = 1 - progress;

            requestAnimationFrame(animate);
        };

        animate();
    }

    // ========== ADRENALINE SYSTEM ==========

    /**
     * Activate adrenaline speed boost
     */
    public activateAdrenaline(): void {
        if (this.adrenalineActive) return; // Already active

        this.adrenalineActive = true;
        this.adrenalineTimer = this.adrenalineDuration;
        console.log('[ARCADIO] Adrenaline activated! +5% speed for 2s');
    }

    /**
     * Get current speed boost from adrenaline
     */
    public getSpeedBoost(): number {
        return this.adrenalineActive ? this.adrenalineSpeedBoost : 0;
    }

    /**
     * Check if adrenaline is active
     */
    public isAdrenalineActive(): boolean {
        return this.adrenalineActive;
    }

    // ========== UTILITY METHODS ==========

    /**
     * Manually apply knockback to an enemy
     * (used if needed outside of normal melee attack)
     */
    public applyKnockback(enemy: EnemyThree, knockbackForce: number): void {
        if (!enemy.mesh || !this.player) return;

        enemy.applyKnockback(this.player.mesh.position, knockbackForce * this.knockbackMultiplier);
    }

    /**
     * Apply stun to enemies hit by melee (Earthquake upgrade)
     * Called after melee attack if stunChance > 0
     */
    public tryApplyStun(enemy: EnemyThree): void {
        if (this.stunChance > 0 && Math.random() < this.stunChance) {
            enemy.applyStun(0.5); // 500ms stun
            console.log('[ARCADIO] Earthquake stun applied!');
        }
    }

    // ========== BERSERK MODE SYSTEM ==========

    /**
     * Register a kill for berserk counter
     * Called when Arcadio kills an enemy
     */
    public registerKill(): void {
        if (!this.canBerserk) return;

        this.berserkKillCounter++;

        // Check if berserk is ready
        if (this.berserkKillCounter >= this.berserkKillsRequired && !this.berserkReady && !this.berserkActive) {
            this.berserkReady = true;
            console.log('[ARCADIO] BERSERK READY! Press Q to activate!');
            this.createBerserkReadyEffect();
        }
    }

    /**
     * Activate berserk mode (called from engine on Q press)
     */
    public activateBerserk(): boolean {
        if (!this.canBerserk) {
            console.log('[ARCADIO] Berserk not unlocked');
            return false;
        }

        if (!this.berserkReady) {
            console.log(`[ARCADIO] Berserk not ready (${this.berserkKillCounter}/${this.berserkKillsRequired} kills)`);
            return false;
        }

        if (this.berserkActive) {
            console.log('[ARCADIO] Berserk already active');
            return false;
        }

        // Activate berserk
        this.berserkActive = true;
        this.berserkTimer = this.berserkDuration;
        this.berserkReady = false;
        this.berserkKillCounter = 0;

        // Visual effect
        this.createBerserkActivateEffect();

        // Play sound
        if (this.onBerserkActivateCallback) {
            this.onBerserkActivateCallback();
        }

        console.log(`[ARCADIO] BERSERK MODE ACTIVATED! ${this.berserkDuration}s of carnage!`);
        return true;
    }

    /**
     * Deactivate berserk mode
     */
    private deactivateBerserk(): void {
        this.berserkActive = false;
        this.berserkTimer = 0;

        // Reset player scale
        if (this.player && this.player.mesh) {
            this.player.mesh.scale.set(1, 1, 1);
        }

        console.log('[ARCADIO] Berserk mode ended');
    }

    /**
     * Check if berserk is active (for damage calculation in engine)
     */
    public isBerserkActive(): boolean {
        return this.berserkActive;
    }

    /**
     * Get berserk status for UI
     */
    public getBerserkStatus(): { ready: boolean; active: boolean; kills: number; required: number; timeLeft: number } {
        return {
            ready: this.berserkReady,
            active: this.berserkActive,
            kills: this.berserkKillCounter,
            required: this.berserkKillsRequired,
            timeLeft: this.berserkTimer
        };
    }

    /**
     * Get current damage multiplier (includes fury bonus)
     */
    public getDamageMultiplier(): number {
        let multiplier = 1;

        // Fury bonus when low HP
        if (this.hasFury && this.gameStateRef) {
            const hpPercent = this.gameStateRef.health / this.gameStateRef.maxHealth;
            if (hpPercent <= this.furyThreshold) {
                multiplier += this.furyDamageBoost;
            }
        }

        return multiplier;
    }

    /**
     * Get effective lifesteal chance (base + blood rage bonus)
     */
    public getEffectiveLifestealChance(): number {
        return this.lifestealChance + this.bloodRageBonus;
    }

    // ========== BERSERK VISUAL EFFECTS ==========

    private createBerserkReadyEffect(): void {
        if (!this.player || !this.player.mesh || !this.scene) return;

        // Flash red to indicate berserk ready
        const sprite = this.player.mesh.children[0] as THREE.Sprite;
        if (sprite && sprite.material) {
            const material = sprite.material as THREE.SpriteMaterial;
            const originalColor = material.color.getHex();

            // Red flash sequence
            let flashes = 0;
            const flashInterval = setInterval(() => {
                material.color.setHex(flashes % 2 === 0 ? 0xff0000 : originalColor);
                flashes++;
                if (flashes >= 6) {
                    clearInterval(flashInterval);
                    material.color.setHex(originalColor);
                }
            }, 100);
        }

        // Create "BERSERK READY" text
        this.showBerserkText('BERSERK READY!', 0xff0000);
    }

    private createBerserkActivateEffect(): void {
        if (!this.player || !this.player.mesh || !this.scene) return;

        // Explosion ring effect
        const ringGeometry = new THREE.RingGeometry(1, 3, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(this.player.mesh.position);
        ring.position.y = 0.5;
        this.scene.add(ring);

        // Expand and fade
        let scale = 1;
        let opacity = 1;
        const animInterval = setInterval(() => {
            scale += 0.5;
            opacity -= 0.08;

            ring.scale.set(scale, scale, 1);
            ringMaterial.opacity = Math.max(0, opacity);

            if (opacity <= 0) {
                this.scene.remove(ring);
                ringGeometry.dispose();
                ringMaterial.dispose();
                clearInterval(animInterval);
            }
        }, 30);

        // Tint player red during berserk
        const sprite = this.player.mesh.children[0] as THREE.Sprite;
        if (sprite && sprite.material) {
            (sprite.material as THREE.SpriteMaterial).color.setHex(0xff6666);
        }

        // Show activation text
        this.showBerserkText('BERSERK!', 0xff0000);
    }

    private showBerserkText(text: string, color: number): void {
        if (!this.scene || !this.player || !this.player.mesh) return;

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d')!;

        context.clearRect(0, 0, canvas.width, canvas.height);

        // Convert hex color to CSS string
        const cssColor = '#' + color.toString(16).padStart(6, '0');

        context.fillStyle = cssColor;
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        context.strokeText(text, 128, 32);
        context.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const textSprite = new THREE.Sprite(spriteMaterial);
        textSprite.scale.set(4, 1, 1);

        const playerPos = this.player.mesh.position.clone();
        textSprite.position.set(playerPos.x, playerPos.y + 4, playerPos.z);

        this.scene.add(textSprite);

        // Animate up and fade
        let elapsed = 0;
        const duration = 1.5;
        const startY = textSprite.position.y;

        const animate = () => {
            elapsed += 0.016;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(textSprite);
                texture.dispose();
                spriteMaterial.dispose();
                return;
            }

            textSprite.position.y = startY + progress * 3;
            spriteMaterial.opacity = 1 - progress;

            requestAnimationFrame(animate);
        };

        animate();
    }
}
