import * as THREE from 'three';
import { CharacterAbilityThree } from './character-ability-three';
import { PlayerThree } from '../entities/player.three';
import { EnemyThree } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { ProyectoASkills } from './skills/proyecto-a.skills';

/**
 * Arcadio Ability - Three.js implementation
 * Passive: Titan Strength
 * - Uses powerful melee punch (AOE around player)
 * - Increased damage resistance
 * - Knockback effect on hits
 * - Thorns damage when hit (upgrade)
 */
export class ProyectoAAbilityThree implements CharacterAbilityThree {
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
        console.log('[PROJECT A] Titan Strength ability initialized - 30% chance for 20% HP heal');
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
                console.log('[PROJECT A] Adrenaline wore off');
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

                    // Notify engine to check health warning (stop heartbeat if health is above threshold)
                    if (this.onHealthChangedCallback) {
                        this.onHealthChangedCallback();
                    }
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
            console.log(`[PROJECT A] Thorns reflected ${thornsDamage.toFixed(1)} damage`);
        }

        // Trigger adrenaline if unlocked
        if (this.hasAdrenaline && !this.adrenalineActive) {
            this.activateAdrenaline();
        }

        return Math.ceil(reducedDamage);
    }

    getUpgrades(): any[] {
        return ProyectoASkills;
    }

    // ========== LIFESTEAL SYSTEM ==========

    // Callback para reproducir sonido de curación (se setea desde el engine)
    public onHealCallback: (() => void) | null = null;

    // Callback para verificar health warning después de curarse (se setea desde el engine)
    public onHealthChangedCallback: (() => void) | null = null;

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
            console.log(`[PROJECT A] Lifesteal activated! +${actualHeal} HP (${this.lifestealHealPercent * 100}% of max HP, roll: ${(roll * 100).toFixed(1)}%)`);

            // Visual feedback - green flash on player + floating number
            this.createHealEffect(actualHeal);

            // Play heal sound
            if (this.onHealCallback) {
                this.onHealCallback();
            }

            // Notify engine to check health warning (stop heartbeat if health is above threshold)
            if (this.onHealthChangedCallback) {
                this.onHealthChangedCallback();
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
        console.log('[PROJECT A] Adrenaline activated! +5% speed for 2s');
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
            console.log('[PROJECT A] Earthquake stun applied!');
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
            console.log('[PROJECT A] BERSERK READY! Press Q to activate!');
            this.createBerserkReadyEffect();
        }
    }

    /**
     * Activate berserk mode (called from engine on Q press)
     */
    public activateBerserk(): boolean {
        if (!this.canBerserk) {
            console.log('[PROJECT A] Berserk not unlocked');
            return false;
        }

        if (!this.berserkReady) {
            console.log(`[PROJECT A] Berserk not ready (${this.berserkKillCounter}/${this.berserkKillsRequired} kills)`);
            return false;
        }

        if (this.berserkActive) {
            console.log('[PROJECT A] Berserk already active');
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

        console.log(`[PROJECT A] BERSERK MODE ACTIVATED! ${this.berserkDuration}s of carnage!`);
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

        console.log('[PROJECT A] Berserk mode ended');
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

    // ========== MELEE IMPACT EFFECT (golpe visual con picos 3D) ==========
    /**
     * Crea efecto visual de impacto melee EPICO
     * - PICOS 3D (ConeGeometry) que emergen del suelo
     * - Screen shake de la camara
     * - Ondas de choque en el suelo
     * - Particulas de escombros volando
     */
    public createMeleeImpactEffect(
        playerPos: THREE.Vector3,
        attackDirection: THREE.Vector3,
        scene: THREE.Scene,
        radius: number = 6,
        camera?: THREE.Camera
    ): void {
        // 1. PICOS 3D que emergen del suelo
        const spikes: THREE.Mesh[] = [];
        const spikeMaterials: THREE.MeshBasicMaterial[] = [];
        const spikeCount = 8;

        for (let i = 0; i < spikeCount; i++) {
            // Distribuir picos en abanico frente al jugador
            const angleSpread = Math.PI * 0.8; // 144 grados
            const angle = -angleSpread / 2 + (i / (spikeCount - 1)) * angleSpread;

            // Rotar respecto a la direccion de ataque
            const baseAngle = Math.atan2(attackDirection.z, attackDirection.x);
            const finalAngle = baseAngle + angle;

            // Distancia variable del centro
            const distance = 1.5 + Math.random() * (radius - 2);

            const spikeX = playerPos.x + Math.cos(finalAngle) * distance;
            const spikeZ = playerPos.z + Math.sin(finalAngle) * distance;

            // Crear pico (cono puntiagudo)
            const spikeHeight = 1.5 + Math.random() * 1.5;
            const spikeRadius = 0.3 + Math.random() * 0.2;
            const spikeGeometry = new THREE.ConeGeometry(spikeRadius, spikeHeight, 6);
            const spikeMaterial = new THREE.MeshBasicMaterial({
                color: 0x1a1a1a, // NEGRO
                transparent: true,
                opacity: 0.9
            });

            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            spike.position.set(spikeX, -spikeHeight / 2, spikeZ); // Empieza bajo tierra
            spike.rotation.x = (Math.random() - 0.5) * 0.3; // Ligera inclinacion aleatoria
            spike.rotation.z = (Math.random() - 0.5) * 0.3;

            // Guardar altura objetivo para animacion
            (spike as any).targetY = spikeHeight / 2;
            (spike as any).baseHeight = spikeHeight;

            scene.add(spike);
            spikes.push(spike);
            spikeMaterials.push(spikeMaterial);
        }

        // 2. Grietas en el suelo (SOLO en zona del abanico donde salen los picos)
        const cracks: THREE.Line[] = [];
        const crackMaterials: THREE.LineBasicMaterial[] = [];
        const crackCount = 8; // Menos grietas, solo en zona de daño
        const baseAngle = Math.atan2(attackDirection.z, attackDirection.x);
        const angleSpread = Math.PI * 0.8; // Mismo abanico que los picos (144 grados)

        for (let i = 0; i < crackCount; i++) {
            // Grietas solo dentro del abanico de ataque
            const relativeAngle = -angleSpread / 2 + (i / (crackCount - 1)) * angleSpread;
            const angle = baseAngle + relativeAngle;
            const length = radius * 0.8 + Math.random() * radius * 0.4;

            // Crear linea con zigzag
            const crackPoints: THREE.Vector3[] = [];
            const segments = 4;
            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const dist = t * length;
                let x = playerPos.x + Math.cos(angle) * dist;
                let z = playerPos.z + Math.sin(angle) * dist;

                // Zigzag
                if (j > 0 && j < segments) {
                    const perpAngle = angle + Math.PI / 2;
                    const offset = (Math.random() - 0.5) * 0.5;
                    x += Math.cos(perpAngle) * offset;
                    z += Math.sin(perpAngle) * offset;
                }

                crackPoints.push(new THREE.Vector3(x, 0.1, z));
            }

            const crackGeometry = new THREE.BufferGeometry().setFromPoints(crackPoints);
            const crackMaterial = new THREE.LineBasicMaterial({
                color: 0x000000, // NEGRO
                transparent: true,
                opacity: 0.8
            });

            const crack = new THREE.Line(crackGeometry, crackMaterial);
            scene.add(crack);
            cracks.push(crack);
            crackMaterials.push(crackMaterial);
        }

        // 3. Particulas de escombros volando (SOLO en zona del abanico)
        const debris: THREE.Mesh[] = [];
        const debrisGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

        for (let i = 0; i < 12; i++) {
            const debrisMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x1a1a1a : 0x0a0a0a, // NEGRO variado
                transparent: true,
                opacity: 1
            });

            const piece = new THREE.Mesh(debrisGeometry, debrisMaterial);

            // Posicion inicial SOLO en zona del abanico
            const relativeAngle = -angleSpread / 2 + Math.random() * angleSpread;
            const spawnAngle = baseAngle + relativeAngle;
            const spawnDist = 1 + Math.random() * (radius - 1);
            piece.position.set(
                playerPos.x + Math.cos(spawnAngle) * spawnDist,
                0.5,
                playerPos.z + Math.sin(spawnAngle) * spawnDist
            );

            // Velocidad de salida (hacia arriba y en direccion del ataque)
            (piece as any).velocity = new THREE.Vector3(
                attackDirection.x * 0.2 + (Math.random() - 0.5) * 0.2,
                0.3 + Math.random() * 0.3,
                attackDirection.z * 0.2 + (Math.random() - 0.5) * 0.2
            );

            // Rotacion aleatoria
            (piece as any).rotSpeed = new THREE.Vector3(
                Math.random() * 0.3,
                Math.random() * 0.3,
                Math.random() * 0.3
            );

            scene.add(piece);
            debris.push(piece);
        }

        // 4. Flash de impacto (adelante, en zona de daño)
        const flashGeometry = new THREE.CircleGeometry(1.5, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333, // Gris oscuro (contraste con negro)
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.rotation.x = -Math.PI / 2;
        // Posicionar adelante en direccion del ataque
        flash.position.set(
            playerPos.x + attackDirection.x * (radius * 0.4),
            0.2,
            playerPos.z + attackDirection.z * (radius * 0.4)
        );
        scene.add(flash);

        // 5. SCREEN SHAKE - guardar referencia a la camara si existe
        let shakeIntensity = 0.3;
        let originalCameraPos: THREE.Vector3 | null = null;
        if (camera) {
            originalCameraPos = camera.position.clone();
        }

        // Animacion
        let frame = 0;
        const maxFrames = 25;
        const animInterval = setInterval(() => {
            frame++;
            const progress = frame / maxFrames;

            // Picos emergen del suelo (primeros frames) y luego bajan
            for (const spike of spikes) {
                const targetY = (spike as any).targetY;
                if (progress < 0.4) {
                    // Subiendo rapido
                    spike.position.y = -targetY + (targetY * 2) * (progress / 0.4);
                } else {
                    // Bajando lento
                    const downProgress = (progress - 0.4) / 0.6;
                    spike.position.y = targetY * (1 - downProgress * 0.8);
                }
            }

            // Fade de picos
            for (const mat of spikeMaterials) {
                if (progress > 0.6) {
                    mat.opacity = Math.max(0, 0.9 * (1 - (progress - 0.6) / 0.4));
                }
            }

            // Fade de grietas
            for (const mat of crackMaterials) {
                mat.opacity = Math.max(0, 0.8 * (1 - progress * 0.8));
            }

            // Escombros caen con gravedad
            for (const piece of debris) {
                const vel = (piece as any).velocity;
                const rotSpeed = (piece as any).rotSpeed;

                piece.position.add(vel);
                vel.y -= 0.02; // Gravedad

                piece.rotation.x += rotSpeed.x;
                piece.rotation.y += rotSpeed.y;
                piece.rotation.z += rotSpeed.z;

                // Fade
                (piece.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
            }

            // Flash expande y desvanece
            flashMaterial.opacity = Math.max(0, 0.8 - progress * 2);
            flash.scale.set(1 + progress * 3, 1 + progress * 3, 1);

            // Screen shake (primeros frames)
            if (camera && originalCameraPos && progress < 0.3) {
                const shake = shakeIntensity * (1 - progress / 0.3);
                camera.position.x = originalCameraPos.x + (Math.random() - 0.5) * shake;
                camera.position.y = originalCameraPos.y + (Math.random() - 0.5) * shake * 0.5;
                camera.position.z = originalCameraPos.z + (Math.random() - 0.5) * shake;
            } else if (camera && originalCameraPos) {
                // Restaurar posicion
                camera.position.copy(originalCameraPos);
            }

            if (frame >= maxFrames) {
                // Restaurar camara
                if (camera && originalCameraPos) {
                    camera.position.copy(originalCameraPos);
                }

                // Limpiar picos
                for (const spike of spikes) {
                    scene.remove(spike);
                    spike.geometry.dispose();
                }
                for (const mat of spikeMaterials) {
                    mat.dispose();
                }

                // Limpiar grietas
                for (const crack of cracks) {
                    scene.remove(crack);
                    crack.geometry.dispose();
                }
                for (const mat of crackMaterials) {
                    mat.dispose();
                }

                // Limpiar escombros
                for (const piece of debris) {
                    scene.remove(piece);
                    (piece.material as THREE.MeshBasicMaterial).dispose();
                }
                debrisGeometry.dispose();

                // Limpiar flash
                scene.remove(flash);
                flashGeometry.dispose();
                flashMaterial.dispose();

                clearInterval(animInterval);
            }
        }, 25); // ~40fps
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
