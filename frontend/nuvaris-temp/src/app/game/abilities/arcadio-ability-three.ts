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

    // LIFESTEAL - Arcadio roba vida con cada golpe
    public lifestealPercent = 0.15; // 15% base lifesteal (robar vida por golpe)

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

    // Reference to game state for lifesteal
    private gameStateRef: any = null;

    initialize(scene: THREE.Scene, player: PlayerThree, gameState?: any): void {
        this.scene = scene;
        this.player = player;
        this.gameStateRef = gameState;
        console.log('[ARCADIO] Titan Strength ability initialized - 15% Lifesteal active');
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

    /**
     * Apply lifesteal from melee damage dealt
     * Called after melee attack deals damage
     */
    public applyLifesteal(totalDamage: number, enemiesHit: number): number {
        if (totalDamage <= 0 || !this.gameStateRef) return 0;

        const healAmount = Math.ceil(totalDamage * this.lifestealPercent);

        // Apply healing
        const oldHealth = this.gameStateRef.health;
        this.gameStateRef.health = Math.min(
            this.gameStateRef.health + healAmount,
            this.gameStateRef.maxHealth
        );

        const actualHeal = this.gameStateRef.health - oldHealth;

        if (actualHeal > 0) {
            console.log(`[ARCADIO] Lifesteal: +${actualHeal} HP (${this.lifestealPercent * 100}% of ${totalDamage} damage)`);

            // Visual feedback - green flash on player + floating number
            this.createHealEffect(actualHeal);
        }

        return actualHeal;
    }

    /**
     * Create visual heal effect on player with floating heal number
     */
    private createHealEffect(healAmount: number): void {
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
}
