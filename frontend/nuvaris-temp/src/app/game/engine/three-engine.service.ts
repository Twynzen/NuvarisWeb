import { Injectable, ElementRef, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { PlayerThree } from '../entities/player.three';
import { MapGenerator } from '../world/map-generator';
import { EnemyThree } from '../entities/enemy.three';
import { XPOrb } from '../entities/xp-orb.three';
import { ProjectileThree } from '../entities/projectile.three';
import { DebugVisualizer } from './debug-visualizer';

@Injectable({
    providedIn: 'root'
})
export class ThreeEngineService implements OnDestroy {
    private canvas!: HTMLCanvasElement;
    private renderer!: THREE.WebGLRenderer;
    private camera!: THREE.PerspectiveCamera;
    private scene!: THREE.Scene;
    private frameId: number | null = null;
    private clock = new THREE.Clock();
    private currentCharacterId: string = 'arcadio'; // Store character ID for restart

    // Game Entities
    private player!: PlayerThree;
    private enemies: EnemyThree[] = [];
    private xpOrbs: XPOrb[] = [];
    private projectiles: ProjectileThree[] = [];
    private damageNumbers: DamageNumber[] = [];
    private lastSpawnTime = 0;
    private lastShootTime = 0;

    // Auto-shoot configuration
    private autoShootInterval = 1.1; // seconds between shots (30 frames @ 30 FPS = 1.0s + 0.1s buffer)
    private autoShootRange = 20; // max range to detect enemies

    // Enemy damage configuration
    private enemyDamage = 10; // damage per second when touching enemy

    // Collision optimization - Broad phase culling
    private maxCollisionCheckDistance = 35; // Only check enemies within this distance

    // Collision visualization
    private damageFlashColor = 0xff3333; // Red for damage
    private lastDamageTime = 0;
    private damageFlashDuration = 0.2; // seconds

    // Performance stats (for debug)
    private collisionChecksPerFrame = 0;
    private enemiesCheckedPerFrame = 0;

    // Debug time scale (only in debug mode) - Ctrl+1, Ctrl+2, Ctrl+3
    private timeScale = 1.0; // 1.0 = normal, 0.5 = slow, 0.25 = very slow

    // Game State
    public gameState = {
        health: 100,
        maxHealth: 100,
        xp: 0,
        xpToLevel: 100,
        level: 1,
        wave: 1,
        score: 0,
        isLevelingUp: false,
        isPaused: false,
        isGameOver: false,
        debugMode: false
    };

    // Input
    private keys: { [key: string]: boolean } = {};

    // Debug Visualizer
    private debugVisualizer!: DebugVisualizer;

    public get currentScene(): THREE.Scene {
        return this.scene;
    }

    public get currentCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    constructor(private ngZone: NgZone) {
        this.setupInput();
    }

    private setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            // P - Toggle Pause
            if (e.key.toLowerCase() === 'p' && !e.ctrlKey) {
                this.togglePause();
            }

            // Ctrl+D - Toggle Debug Mode
            if (e.key.toLowerCase() === 'd' && e.ctrlKey) {
                e.preventDefault();
                this.toggleDebugMode();
            }

            // Speed control (only in debug mode) - Q, W, E keys
            if (this.gameState.debugMode && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (e.key.toLowerCase() === 'q') {
                    this.timeScale = 0.25; // Very slow
                    console.log(`[DEBUG] Time Scale: 0.25x (Very Slow) - Press Q`);
                    e.preventDefault();
                } else if (e.key.toLowerCase() === 'w') {
                    this.timeScale = 0.5; // Slow
                    console.log(`[DEBUG] Time Scale: 0.5x (Slow) - Press W`);
                    e.preventDefault();
                } else if (e.key.toLowerCase() === 'e') {
                    this.timeScale = 1.0; // Normal
                    console.log(`[DEBUG] Time Scale: 1.0x (Normal) - Press E`);
                    e.preventDefault();
                }
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    // Toggle debug visualization mode
    public toggleDebugMode() {
        if (!this.debugVisualizer) return;

        this.gameState.debugMode = this.debugVisualizer.toggle();

        if (this.gameState.debugMode) {
            // Create initial debug visuals
            this.createDebugVisualsForAll();
        }
    }

    // Create debug visuals for all existing entities
    private createDebugVisualsForAll() {
        if (!this.debugVisualizer?.enabled) return;

        // Create map boundary visualization
        this.debugVisualizer.createMapBoundary(200, 8);

        // Update player debug
        if (this.player) {
            this.player.debugGroup = this.debugVisualizer.updatePlayerDebug(
                this.player.mesh.position,
                PlayerThree.COLLISION_RADIUS,
                PlayerThree.SPRITE_WIDTH,
                PlayerThree.SPRITE_HEIGHT,
                this.player.debugGroup || undefined
            );
        }

        // Update enemy debug
        this.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                enemy.debugGroup = this.debugVisualizer.updateEnemyDebug(
                    enemy.mesh.position,
                    EnemyThree.COLLISION_RADIUS,
                    EnemyThree.SPRITE_WIDTH,
                    EnemyThree.SPRITE_HEIGHT,
                    enemy.debugGroup || undefined
                );
            }
        });
    }

    // Update debug visuals positions (called each frame)
    private updateDebugVisuals() {
        if (!this.debugVisualizer?.enabled) return;

        // Update player debug position
        if (this.player?.debugGroup) {
            this.player.debugGroup.position.copy(this.player.mesh.position);
        }

        // Update enemy debug positions
        this.enemies.forEach(enemy => {
            if (enemy.debugGroup && !enemy.isDead) {
                enemy.debugGroup.position.copy(enemy.mesh.position);
            }
        });
    }

    // Find the nearest enemy within range
    private findNearestEnemy(): EnemyThree | null {
        if (this.enemies.length === 0) return null;

        let nearest: EnemyThree | null = null;
        let nearestDist = this.autoShootRange;

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    // Auto-shoot at nearest enemy
    private autoShoot() {
        const currentTime = this.clock.getElapsedTime();
        if (currentTime - this.lastShootTime < this.autoShootInterval) return;

        const nearestEnemy = this.findNearestEnemy();
        if (!nearestEnemy) return;

        const projectile = this.player.shoot(this.scene, nearestEnemy.mesh.position);
        if (projectile) {
            this.projectiles.push(projectile);
            this.lastShootTime = currentTime;
        }
    }

    ngOnDestroy(): void {
        if (this.frameId != null) {
            cancelAnimationFrame(this.frameId);
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
    }

    createScene(canvas: ElementRef<HTMLCanvasElement>, characterId: string = 'arcadio'): void {
        this.currentCharacterId = characterId; // Save for restart
        this.canvas = canvas.nativeElement;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a1a, 30, 100);
        this.scene.background = new THREE.Color(0x0a0a1a);

        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 25, 20);
        this.camera.lookAt(0, 0, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Ground
        this.createGround();

        // Map Generation
        const mapGen = new MapGenerator(this.scene);
        mapGen.generate();

        // Player
        this.player = new PlayerThree(this.scene, characterId);

        // Initialize Debug Visualizer
        this.debugVisualizer = new DebugVisualizer(this.scene);

        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    private createGround() {
        const groundGeo = new THREE.PlaneGeometry(200, 200, 50, 50);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a1a,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(200, 40, 0x00f5ff, 0x1a1a2e);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    animate(): void {
        this.ngZone.runOutsideAngular(() => {
            if (document.readyState !== 'loading') {
                this.render();
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                    this.render();
                });
            }
        });
    }

    render(): void {
        this.frameId = requestAnimationFrame(() => {
            this.render();
        });

        if (this.gameState.isLevelingUp || this.gameState.isPaused || this.gameState.isGameOver) return;

        let delta = this.clock.getDelta();

        // Apply time scale (debug speed control)
        delta *= this.timeScale;

        const currentTime = this.clock.getElapsedTime();

        if (this.player) {
            this.player.update(delta, this.keys);

            // Skip game logic if player is dead
            if (this.player.isDead) {
                this.renderer.render(this.scene, this.camera);
                return;
            }

            // Auto-shoot at nearest enemy
            this.autoShoot();

            // Enemy collision with player (ONLY from enemy attacks)
            this.checkEnemyAttackCollision(currentTime);

            // Spawn enemies
            if (currentTime - this.lastSpawnTime > 2) {
                this.spawnEnemy();
                this.lastSpawnTime = currentTime;
            }

            // Update enemies (with wall collision AND attack behavior)
            this.enemies.forEach(enemy => enemy.update(delta, this.player, 98, currentTime));

            // Update Projectiles & Collision
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const proj = this.projectiles[i];
                proj.update(delta);

                if (proj.isDead) {
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // Collision with Enemies
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (proj.mesh.position.distanceTo(enemy.mesh.position) < 1.5) {
                        const orb = enemy.takeDamage(proj.damage, this.scene);
                        if (orb) {
                            this.xpOrbs.push(orb);
                            this.enemies.splice(j, 1);
                        }

                        // Destroy projectile
                        proj.mesh.visible = false;
                        this.projectiles.splice(i, 1);
                        break; // Projectile hit something, stop checking other enemies
                    }
                }
            }

            // Update XP Orbs
            for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
                const orb = this.xpOrbs[i];
                const collected = orb.update(delta, this.player);
                if (collected) {
                    this.addXp(orb.value);
                    this.xpOrbs.splice(i, 1);
                }
            }

            // Update damage numbers
            for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
                const num = this.damageNumbers[i];
                const shouldRemove = num.update(delta);
                if (shouldRemove) {
                    num.destroy(this.scene);
                    this.damageNumbers.splice(i, 1);
                }
            }

            // Camera follow
            const targetX = this.player.mesh.position.x;
            const targetZ = this.player.mesh.position.z + 20;

            this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
            this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;
            this.camera.lookAt(this.player.mesh.position.x, 0, this.player.mesh.position.z);

            // Update debug visuals
            this.updateDebugVisuals();
        }

        this.renderer.render(this.scene, this.camera);
    }

    resize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    private addXp(amount: number) {
        this.gameState.xp += amount;
        if (this.gameState.xp >= this.gameState.xpToLevel) {
            this.levelUp();
        }
    }

    private levelUp() {
        this.gameState.level++;
        this.gameState.xp = 0;
        this.gameState.xpToLevel = Math.floor(this.gameState.xpToLevel * 1.5);
        this.gameState.isLevelingUp = true;
        console.log('LEVEL UP!');
    }

    public resumeGame() {
        this.gameState.isLevelingUp = false;
        this.gameState.isPaused = false;
        this.clock.getDelta(); // Reset delta to avoid huge jump
    }

    public togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        if (!this.gameState.isPaused) {
            this.clock.getDelta();
        }
    }

    private spawnEnemy() {
        if (!this.player) return;

        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 10;
        const x = this.player.mesh.position.x + Math.cos(angle) * distance;
        const z = this.player.mesh.position.z + Math.sin(angle) * distance;

        const enemy = new EnemyThree(this.scene, x, z);
        this.enemies.push(enemy);

        // Create debug visualization for new enemy if debug mode is enabled
        if (this.debugVisualizer?.enabled) {
            enemy.debugGroup = this.debugVisualizer.updateEnemyDebug(
                enemy.mesh.position,
                EnemyThree.COLLISION_RADIUS,
                EnemyThree.SPRITE_WIDTH,
                EnemyThree.SPRITE_HEIGHT
            );
        }
    }

    // Check collision between player and enemies (ONLY when enemy attacks)
    private checkEnemyAttackCollision(currentTime: number) {
        // Calculate collision threshold: sum of both radii
        const collisionDistance = PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS;

        // Reset stats
        this.collisionChecksPerFrame = 0;
        this.enemiesCheckedPerFrame = 0;

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);

            // BROAD PHASE: Skip enemies too far away (optimization)
            if (dist > this.maxCollisionCheckDistance) {
                continue;
            }

            this.enemiesCheckedPerFrame++;

            // NARROW PHASE: Collision check ONLY when enemy is attacking
            if (dist < collisionDistance && enemy.isCurrentlyAttacking()) {
                this.collisionChecksPerFrame++;

                // Only apply damage ONCE per attack (not every frame)
                // For dash attacks, use separate damage flag to prevent double hits
                const isDashing = enemy.isCurrentlyDashing();
                const damageAlreadyDealt = isDashing ? enemy.hasDealtDashDamage() : enemy.hasDealtDamage();

                if (!damageAlreadyDealt) {
                    // Apply damage from attack
                    const damageAmount = enemy.getAttackDamage();
                    this.gameState.health -= damageAmount;

                    // Mark damage as dealt (use appropriate flag based on attack type)
                    if (isDashing) {
                        enemy.markDashDamageDealt();
                    } else {
                        enemy.markDamageDealt();
                    }

                    // Visual feedback on player when taking damage
                    if (this.player && this.player.mesh) {
                        // Flash effect on player (tint red briefly)
                        const sprite = (this.player.mesh.children[0] as THREE.Sprite);
                        if (sprite && sprite.material) {
                            const material = sprite.material as THREE.SpriteMaterial;
                            const originalColor = material.color.getHex();
                            material.color.setHex(0xff3333); // Red flash

                            setTimeout(() => {
                                material.color.setHex(originalColor);
                            }, 100);
                        }

                        // Show damage number
                        const damageNum = new DamageNumber(
                            this.scene,
                            this.player.mesh.position.x,
                            this.player.mesh.position.z,
                            damageAmount
                        );
                        this.damageNumbers.push(damageNum);

                        // Console log for debugging
                        if (this.gameState.debugMode) {
                            console.log(`[HIT] Enemy attack! Damage: ${damageAmount}, Health: ${this.gameState.health}`);
                        }
                    }

                    // Clamp health
                    if (this.gameState.health <= 0) {
                        this.gameState.health = 0;
                        this.handlePlayerDeath();
                        return;
                    }
                }
            }
        }

        // Log performance metrics if debug enabled
        if (this.gameState.debugMode && this.collisionChecksPerFrame > 0) {
            // Would show collision stats in console if needed
        }
    }

    // Handle player death
    private async handlePlayerDeath() {
        this.player.die();

        // Create glass break effect
        const glassEffect = new GlassBreakEffect(this.scene, this.renderer);

        // STEP 1: Scale up player sprite and zoom camera in on player for dramatic effect
        const deathCameraZoom = async () => {
            return new Promise<void>((resolve) => {
                const startPos = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z);
                const targetPos = new THREE.Vector3(this.player.mesh.position.x, 15, this.player.mesh.position.z + 8);
                const duration = 0.8; // 800ms zoom
                const startTime = Date.now();
                const startScale = 3.0;
                const targetScale = 5.0; // Increase to 5x size

                const animateZoom = () => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const progress = Math.min(elapsed / duration, 1.0);
                    // Easing: ease-in-out
                    const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

                    // Scale up player sprite
                    const currentScale = startScale + (targetScale - startScale) * easeProgress;
                    const sprite = this.player.mesh.children[0] as THREE.Sprite;
                    if (sprite) {
                        sprite.scale.set(currentScale, currentScale, 1);
                    }

                    this.camera.position.x = startPos.x + (targetPos.x - startPos.x) * easeProgress;
                    this.camera.position.y = startPos.y + (targetPos.y - startPos.y) * easeProgress;
                    this.camera.position.z = startPos.z + (targetPos.z - startPos.z) * easeProgress;
                    this.camera.lookAt(this.player.mesh.position.x, 0, this.player.mesh.position.z);

                    if (progress < 1.0) {
                        requestAnimationFrame(animateZoom);
                    } else {
                        resolve();
                    }
                };
                animateZoom();
            });
        };

        // STEP 2: Zoom camera and scale up player simultaneously
        await deathCameraZoom();

        // STEP 3: Show glass break effect
        glassEffect.animate();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // STEP 4: Fade out the player sprite over 1 second
        if (this.player) {
            await this.player.fadeOut(1.0);
        }

        // STEP 5: Clean up glass effect
        glassEffect.destroy();

        // STEP 6: Show game over screen
        this.gameState.isGameOver = true;
    }

    // Reset game state for returning to main menu
    public resetGame() {
        // Stop animation loop
        if (this.frameId != null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        // Clear debug visualizations
        if (this.debugVisualizer) {
            this.debugVisualizer.clearAllDebugMeshes();
        }

        // Clear all entities from scene
        this.enemies.forEach(enemy => {
            this.scene.remove(enemy.mesh);
            if (enemy.debugGroup) {
                this.scene.remove(enemy.debugGroup);
            }
        });
        this.enemies = [];

        this.projectiles.forEach(proj => {
            this.scene.remove(proj.mesh);
        });
        this.projectiles = [];

        this.xpOrbs.forEach(orb => {
            this.scene.remove(orb.mesh);
        });
        this.xpOrbs = [];

        this.damageNumbers.forEach(num => {
            num.destroy(this.scene);
        });
        this.damageNumbers = [];

        if (this.player) {
            this.scene.remove(this.player.mesh);
            if (this.player.debugGroup) {
                this.scene.remove(this.player.debugGroup);
            }
        }

        // Reset game state
        this.gameState = {
            health: 100,
            maxHealth: 100,
            xp: 0,
            xpToLevel: 100,
            level: 1,
            wave: 1,
            score: 0,
            isLevelingUp: false,
            isPaused: false,
            isGameOver: false,
            debugMode: false
        };

        // Reset timers
        this.lastSpawnTime = 0;
        this.lastShootTime = 0;

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
    }

    /**
     * Restart the game without going to menu (same as resetGame but continues playing)
     */
    public restartGame(): void {
        // Clear all entities from scene
        this.enemies.forEach(enemy => {
            this.scene.remove(enemy.mesh);
            if (enemy.debugGroup) {
                this.scene.remove(enemy.debugGroup);
            }
        });
        this.enemies = [];

        this.projectiles.forEach(proj => {
            this.scene.remove(proj.mesh);
        });
        this.projectiles = [];

        this.xpOrbs.forEach(orb => {
            this.scene.remove(orb.mesh);
        });
        this.xpOrbs = [];

        this.damageNumbers.forEach(num => {
            num.destroy(this.scene);
        });
        this.damageNumbers = [];

        if (this.player) {
            this.scene.remove(this.player.mesh);
            if (this.player.debugGroup) {
                this.scene.remove(this.player.debugGroup);
            }
        }

        // Reset game state to initial values
        this.gameState = {
            health: 100,
            maxHealth: 100,
            xp: 0,
            xpToLevel: 100,
            level: 1,
            wave: 1,
            score: 0,
            isLevelingUp: false,
            isPaused: false,
            isGameOver: false,
            debugMode: false
        };

        // Reset camera position
        this.camera.position.set(0, 25, 20);
        this.camera.lookAt(0, 0, 0);

        // Create new player
        this.player = new PlayerThree(this.scene, this.currentCharacterId);

        // Reset timers
        this.lastSpawnTime = 0;
        this.lastShootTime = 0;
        this.clock.start(); // Restart the clock

        // Resume game rendering
        this.render();
    }
}

/**
 * Simple floating damage number
 */
class DamageNumber {
    public mesh: THREE.Sprite;
    private lifetime = 1.0; // 1 second
    private age = 0;

    constructor(scene: THREE.Scene, x: number, z: number, damage: number) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const context = canvas.getContext('2d')!;

        // Draw damage text
        context.fillStyle = '#ff3333'; // Red
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`-${damage}`, 64, 32);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(2, 1, 1);
        // Desplazar el número de daño hacia la derecha para no superponerse con el personaje
        this.mesh.position.set(x + 3, 2, z); // Offset 3 units a la derecha

        scene.add(this.mesh);
    }

    update(delta: number): boolean {
        this.age += delta;

        // Move up
        this.mesh.position.y += delta * 2; // Rise at 2 units/sec

        // Fade out
        const alpha = 1.0 - (this.age / this.lifetime);
        (this.mesh.material as THREE.SpriteMaterial).opacity = alpha;

        // Return true if should be removed
        return this.age >= this.lifetime;
    }

    destroy(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        (this.mesh.material as THREE.SpriteMaterial).map?.dispose();
        (this.mesh.material as THREE.SpriteMaterial).dispose();
    }
}

/**
 * Glass break effect - renders a cracked glass pattern on screen during death
 */
class GlassBreakEffect {
    private mesh: THREE.Sprite;
    private canvas!: HTMLCanvasElement;
    private context!: CanvasRenderingContext2D;
    private cracks: Crack[] = [];
    private isAnimating = false;

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
        // Create canvas for glass effect
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.context = this.canvas.getContext('2d')!;

        // Generate random crack pattern
        this.generateCracks();

        // Create sprite from canvas
        const texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(window.innerWidth / 100, window.innerHeight / 100, 1);
        this.mesh.position.z = 100; // Far forward to cover everything

        scene.add(this.mesh);
    }

    private generateCracks(): void {
        const numCracks = 8 + Math.floor(Math.random() * 4);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        for (let i = 0; i < numCracks; i++) {
            const angle = (Math.PI * 2 * i) / numCracks + (Math.random() - 0.5) * 0.5;
            const distance = 200 + Math.random() * 300;

            this.cracks.push({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                angle: angle,
                branches: []
            });
        }

        // Generate branches from each crack
        this.cracks.forEach(crack => {
            const numBranches = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numBranches; i++) {
                const branchAngle = crack.angle + (Math.random() - 0.5) * Math.PI * 0.5;
                const branchLength = 100 + Math.random() * 200;
                crack.branches.push({
                    angle: branchAngle,
                    length: branchLength,
                    progress: 0
                });
            }
        });
    }

    animate(): void {
        this.isAnimating = true;
        const startTime = Date.now();
        const duration = 1.5; // 1.5 seconds for crack animation

        const animateCracks = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1.0);

            // Clear canvas
            this.context.fillStyle = 'rgba(0, 0, 0, 0)';
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw main cracks
            this.context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.context.lineWidth = 2;
            this.context.lineCap = 'round';

            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;

            this.cracks.forEach((crack, index) => {
                // Main crack line
                const crackProgress = Math.min(progress * 1.2, 1.0);
                const startX = centerX;
                const startY = centerY;
                const endX = centerX + Math.cos(crack.angle) * 250 * crackProgress;
                const endY = centerY + Math.sin(crack.angle) * 250 * crackProgress;

                this.context.beginPath();
                this.context.moveTo(startX, startY);
                this.context.lineTo(endX, endY);
                this.context.stroke();

                // Draw branches
                crack.branches.forEach(branch => {
                    const branchProgress = Math.max(0, Math.min(progress * 1.5 - index * 0.1, 1.0));
                    const branchStartX = centerX + Math.cos(crack.angle) * 150 * (progress * 0.8);
                    const branchStartY = centerY + Math.sin(crack.angle) * 150 * (progress * 0.8);
                    const branchEndX = branchStartX + Math.cos(branch.angle) * branch.length * branchProgress;
                    const branchEndY = branchStartY + Math.sin(branch.angle) * branch.length * branchProgress;

                    this.context.beginPath();
                    this.context.moveTo(branchStartX, branchStartY);
                    this.context.lineTo(branchEndX, branchEndY);
                    this.context.stroke();
                });
            });

            // Update texture
            (this.mesh.material as THREE.SpriteMaterial).map!.needsUpdate = true;

            if (progress < 1.0 && this.isAnimating) {
                requestAnimationFrame(animateCracks);
            }
        };

        animateCracks();
    }

    destroy(): void {
        this.isAnimating = false;
        (this.mesh.material as THREE.SpriteMaterial).map?.dispose();
        (this.mesh.material as THREE.SpriteMaterial).dispose();
    }
}

interface Crack {
    x: number;
    y: number;
    angle: number;
    branches: {
        angle: number;
        length: number;
        progress: number;
    }[];
}
