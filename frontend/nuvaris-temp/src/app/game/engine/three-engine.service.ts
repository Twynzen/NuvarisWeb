import { Injectable, ElementRef, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { PlayerThree } from '../entities/player.three';
import { MapGenerator } from '../world/map-generator';
import { EnemyThree } from '../entities/enemy.three';
import { XPOrb } from '../entities/xp-orb.three';
import { ProjectileThree } from '../entities/projectile.three';

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

    // Game Entities
    private player!: PlayerThree;
    private enemies: EnemyThree[] = [];
    private xpOrbs: XPOrb[] = [];
    private projectiles: ProjectileThree[] = [];
    private lastSpawnTime = 0;
    private lastShootTime = 0;

    // Auto-shoot configuration
    private autoShootInterval = 0.5; // seconds between shots
    private autoShootRange = 20; // max range to detect enemies

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
        isPaused: false
    };

    // Input
    private keys: { [key: string]: boolean } = {};

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
            if (e.key.toLowerCase() === 'p') {
                this.togglePause();
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
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

        if (this.gameState.isLevelingUp || this.gameState.isPaused) return;

        const delta = this.clock.getDelta();

        if (this.player) {
            this.player.update(delta, this.keys);

            // Auto-shoot at nearest enemy
            this.autoShoot();

            // Spawn enemies
            if (this.clock.getElapsedTime() - this.lastSpawnTime > 2) {
                this.spawnEnemy();
                this.lastSpawnTime = this.clock.getElapsedTime();
            }

            // Update enemies (with wall collision)
            this.enemies.forEach(enemy => enemy.update(delta, this.player, 98));

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

            // Camera follow
            const targetX = this.player.mesh.position.x;
            const targetZ = this.player.mesh.position.z + 20;

            this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
            this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;
            this.camera.lookAt(this.player.mesh.position.x, 0, this.player.mesh.position.z);
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
    }
}
