import { Injectable, ElementRef, NgZone, OnDestroy, Inject } from '@angular/core';
import * as THREE from 'three';
import { PlayerThree } from '../entities/player.three';
import { MapGenerator } from '../world/map-generator';
import { EnemyThree, EnemyDeathReward } from '../entities/enemy.three';
import { ProjectileThree } from '../entities/projectile.three';
import { DebugVisualizer } from './debug-visualizer';
import { PortalSystem, MapPortalData } from '../world/portal-system';
import { DoorSystem, DoorConfig } from '../world/door-system';
import { CharacterAbilityThree } from '../abilities/character-ability-three';
import { ProyectoAAbilityThree } from '../abilities/proyecto-a-ability-three';
import { LarsAbilityThree } from '../abilities/lars-ability-three';
import { ProyectoYAbilityThree } from '../abilities/proyecto-y-ability-three';
import { MapLoaderService, MapData, MapObject, DoorMapConfig } from '../services/map-loader.service';
import { RoomVisibilityManager } from '../world/room-visibility.manager';
import { RoomTemplateLoader, RoomFactory } from '../world/room-factory';
import { TemplateMapGenerator, TemplateMapConfig, GeneratedTemplateMap } from '../world/template-map-generator';
import { SimpleTween } from '../utils/simple-tween';
import { BSPToRoomConverter, UnifiedMapData } from '../world/bsp-to-room.converter';
import { PlayerFogSystem } from '../world/player-fog.system';
import { AudioService } from '../services/audio.service';
import { CharacterCursor } from '../ui/character-cursor';
import { GameState, createInitialGameState } from '../models/game-state.interface';
import { SpatialGrid } from '../systems/spatial-grid';
import { DisposableManager } from '../systems/disposable.manager';
import { CombatSystem, EntityManager, gameEventBus, GameEventType } from '../core';

// Default map to load on game start
const DEFAULT_MAP_NAME = 'labyrinth';

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
    private currentCharacterId: string = 'proyecto-a'; // Store character ID for restart

    // Game Entities
    private player!: PlayerThree;
    private enemies: EnemyThree[] = [];
    private projectiles: ProjectileThree[] = [];
    private damageNumbers: DamageNumber[] = [];
    private lastSpawnTime = 0;
    private lastShootTime = 0;
    private wasPlayerWalking = false; // Track walking state for sound
    private portalSystem!: PortalSystem;
    private doorSystem!: DoorSystem;
    private autoSpawningEnabled = true;

    // Room Visibility System (limited vision per room)
    private roomVisibilityManager!: RoomVisibilityManager;

    // Template-based map generator
    private roomFactory!: RoomFactory;
    private templateMapGenerator!: TemplateMapGenerator;
    private currentGeneratedMap: GeneratedTemplateMap | null = null;

    // BSP to Room converter (unified map system)
    private bspConverter!: BSPToRoomConverter;
    private currentUnifiedMap: UnifiedMapData | null = null;

    // Map system
    private mapWalls: THREE.Mesh[] = [];
    private currentMapName: string = '';
    private mapFloor: THREE.Mesh | null = null;

    // Player-centered fog system
    private playerFogSystem!: PlayerFogSystem;

    // Character Abilities System
    private characterAbility!: CharacterAbilityThree;

    // Character Cursor (3D cursor that follows mouse)
    private characterCursor: CharacterCursor | null = null;

    // Auto-shoot configuration
    private autoShootInterval = 1.1; // seconds between shots (30 frames @ 30 FPS = 1.0s + 0.1s buffer)
    private autoShootRange = 20; // max range to detect enemies

    // ========== LARS CHARGE ATTACK SYSTEM ==========
    private isMouseDown = false;
    private mousePosition = { x: 0, y: 0 };
    private chargeEffects: THREE.Object3D[] = []; // Visual effects during charge
    private chargeIndicator: THREE.Mesh | null = null;
    private chargeParticles: THREE.Mesh[] = [];

    // Enemy damage configuration
    private enemyDamage = 10; // damage per second when touching enemy

    // Collision optimization - Broad phase culling
    private maxCollisionCheckDistance = 35; // Only check enemies within this distance
    private enemySpatialGrid = new SpatialGrid<EnemyThree>(8); // 8-unit cells for enemy lookup

    // Memory management - tracks Three.js resources for proper disposal
    private disposableManager = new DisposableManager();

    // Collision visualization
    private damageFlashColor = 0xff3333; // Red for damage
    private lastDamageTime = 0;
    private damageFlashDuration = 0.2; // seconds
    private playerDamageImmunityTime = 0; // Current immunity timer
    private playerDamageImmunityDuration = 0.1; // 100ms immunity after taking damage to prevent double-hits

    // Performance stats (for debug)
    private collisionChecksPerFrame = 0;
    private enemiesCheckedPerFrame = 0;

    // Debug time scale (only in debug mode) - Ctrl+1, Ctrl+2, Ctrl+3
    private timeScale = 1.0; // 1.0 = normal, 0.5 = slow, 0.25 = very slow

    // Camera zoom (mouse wheel)
    private cameraZoom = 1.0;
    private cameraZoomMin = 0.5;  // Zoom in max (closer view)
    private cameraZoomMax = 2.0;  // Zoom out max (farther view)
    private cameraZoomSpeed = 0.1;
    private baseCameraY = 25;
    private baseCameraZ = 20;

    // Game State (typed interface - eliminates 'as any' casts)
    public gameState: GameState = createInitialGameState();

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

    constructor(
        private ngZone: NgZone,
        private mapLoader: MapLoaderService,
        private roomTemplateLoader: RoomTemplateLoader,
        public audioService: AudioService,
        private combatSystem: CombatSystem,
        private entityManager: EntityManager
    ) {
        this.setupInput();
        // Create RoomVisibilityManager (will be initialized in createScene)
        this.roomVisibilityManager = new RoomVisibilityManager(this.roomTemplateLoader);

        // Subscribe to combat events for audio feedback
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for decoupled systems
     */
    private setupEventListeners(): void {
        // Play sound on enemy kill
        gameEventBus.on(GameEventType.ENEMY_KILLED).subscribe((event: any) => {
            this.audioService.playEnemyDeath(event.enemyType);
        });

        // Play sound on player damage
        gameEventBus.on(GameEventType.PLAYER_DAMAGED).subscribe(() => {
            this.audioService.playHit(this.currentCharacterId);
        });
    }

    private setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            // P - Toggle Pause
            if (e.key.toLowerCase() === 'p' && !e.ctrlKey) {
                this.togglePause();
            }

            // E - Interact with nearby door
            if (e.key.toLowerCase() === 'e' && !e.ctrlKey && this.player) {
                this.interactWithNearbyDoor();
            }

            // Q - Character special abilities
            if (e.key.toLowerCase() === 'q' && !e.ctrlKey && this.player) {
                this.triggerCharacterSpecialAbility();
            }

            // NOTE: Ctrl+D disabled - debug mode now controlled via Ctrl+K console 'debug toggle' command
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

        // ========== LARS CHARGE ATTACK - Mouse/Touch Input ==========
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Camera zoom with mouse wheel
        window.addEventListener('wheel', (e) => this.handleCameraZoom(e), { passive: false });

        // Touch support for mobile
        window.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        window.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        window.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    }

    // ========== MOUSE/TOUCH HANDLERS FOR LARS CHARGE ==========

    private handleMouseDown(e: MouseEvent): void {
        // Only left click, and only for Lars and Proyecto-Y (charge attack characters)
        if (e.button !== 0) return;
        if (!this.player || (this.currentCharacterId !== 'lars' && this.currentCharacterId !== 'proyecto-y')) return;
        if (this.gameState.isPaused || this.gameState.isLevelingUp || this.gameState.isGameOver) return;

        this.isMouseDown = true;
        this.mousePosition = { x: e.clientX, y: e.clientY };

        // Start charging
        if (this.player.startCharge()) {
            this.createChargeVisualEffects();
        }
    }

    private handleMouseUp(e: MouseEvent): void {
        if (e.button !== 0) return;
        if (!this.isMouseDown) return;

        this.isMouseDown = false;

        if (!this.player || (this.currentCharacterId !== 'lars' && this.currentCharacterId !== 'proyecto-y')) return;
        if (this.gameState.isPaused || this.gameState.isLevelingUp || this.gameState.isGameOver) return;

        // Get world position from mouse
        const worldPos = this.screenToWorld(e.clientX, e.clientY);

        // Release charge and get result
        const result = this.player.releaseCharge(worldPos);

        if (result) {
            // Execute the attack based on character and charge level
            if (this.currentCharacterId === 'lars') {
                this.executeLarsChargeAttack(result.chargeLevel, worldPos);
            } else if (this.currentCharacterId === 'proyecto-y') {
                this.executeProyectoYChargeAttack(result.chargeLevel, worldPos);
            }
        }

        // Clean up visual effects
        this.clearChargeVisualEffects();
    }

    private handleMouseMove(e: MouseEvent): void {
        this.mousePosition = { x: e.clientX, y: e.clientY };

        // Update charge indicator direction if charging
        if (this.isMouseDown && this.player?.isChargingAttack()) {
            this.updateChargeIndicatorDirection();
        }
    }

    private handleTouchStart(e: TouchEvent): void {
        if (e.touches.length === 0) return;
        if (!this.player || (this.currentCharacterId !== 'lars' && this.currentCharacterId !== 'proyecto-y')) return;
        if (this.gameState.isPaused || this.gameState.isLevelingUp || this.gameState.isGameOver) return;

        // Use first touch
        const touch = e.touches[0];
        this.isMouseDown = true;
        this.mousePosition = { x: touch.clientX, y: touch.clientY };

        if (this.player.startCharge()) {
            this.createChargeVisualEffects();
        }
    }

    private handleTouchEnd(e: TouchEvent): void {
        if (!this.isMouseDown) return;

        this.isMouseDown = false;

        if (!this.player || (this.currentCharacterId !== 'lars' && this.currentCharacterId !== 'proyecto-y')) return;
        if (this.gameState.isPaused || this.gameState.isLevelingUp || this.gameState.isGameOver) return;

        // Use last known mouse position
        const worldPos = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);

        const result = this.player.releaseCharge(worldPos);

        if (result) {
            // Execute the attack based on character and charge level
            if (this.currentCharacterId === 'lars') {
                this.executeLarsChargeAttack(result.chargeLevel, worldPos);
            } else if (this.currentCharacterId === 'proyecto-y') {
                this.executeProyectoYChargeAttack(result.chargeLevel, worldPos);
            }
        }

        this.clearChargeVisualEffects();
    }

    private handleTouchMove(e: TouchEvent): void {
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        this.mousePosition = { x: touch.clientX, y: touch.clientY };

        if (this.isMouseDown && this.player?.isChargingAttack()) {
            this.updateChargeIndicatorDirection();
        }
    }

    /**
     * Handle camera zoom with mouse wheel
     * Scroll up = zoom in (closer), scroll down = zoom out (farther)
     */
    private handleCameraZoom(event: WheelEvent): void {
        // Prevent page scroll
        event.preventDefault();

        // Don't zoom when game is paused or in menu
        if (this.gameState.isPaused || this.gameState.isLevelingUp || this.gameState.isGameOver) return;

        // Calculate zoom direction: deltaY > 0 = scroll down = zoom out
        const delta = event.deltaY > 0 ? this.cameraZoomSpeed : -this.cameraZoomSpeed;

        // Apply zoom with limits
        this.cameraZoom = Math.max(this.cameraZoomMin, Math.min(this.cameraZoomMax, this.cameraZoom + delta));

        // Update camera position based on zoom level
        // Higher zoom value = camera further away = smaller view
        this.camera.position.y = this.baseCameraY * this.cameraZoom;
        this.camera.position.z = this.baseCameraZ * this.cameraZoom;
    }

    /**
     * Convert screen coordinates to world position (on the ground plane y=0)
     */
    private screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
        if (!this.camera || !this.canvas) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Normalize screen coordinates
        const rect = this.canvas.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;

        // Create raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        // Intersect with ground plane (y = 0)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, intersection);

        return intersection || new THREE.Vector3(0, 0, 0);
    }

    /**
     * Trigger character special ability (Q key)
     * Lars: Explode minions
     * Yurany: Dash
     * Arcadio: Berserk mode (when ready)
     */
    private triggerCharacterSpecialAbility(): void {
        if (!this.characterAbility || !this.player) return;
        if (this.gameState.isPaused || this.gameState.isLevelingUp) return;

        // Lars: Explode minions
        if (this.currentCharacterId === 'lars' && this.characterAbility instanceof LarsAbilityThree) {
            const larsAbility = this.characterAbility as LarsAbilityThree;
            larsAbility.triggerExplosion(this.enemies);
            return;
        }

        // Project Y: Dash ability
        if (this.currentCharacterId === 'proyecto-y' && this.characterAbility instanceof ProyectoYAbilityThree) {
            const projectYAbility = this.characterAbility as ProyectoYAbilityThree;

            // Get movement direction for dash
            const direction = new THREE.Vector3();
            if (this.keys['w'] || this.keys['arrowup']) direction.z -= 1;
            if (this.keys['s'] || this.keys['arrowdown']) direction.z += 1;
            if (this.keys['a'] || this.keys['arrowleft']) direction.x -= 1;
            if (this.keys['d'] || this.keys['arrowright']) direction.x += 1;

            projectYAbility.executeDash(this.player, direction, this.scene);
            return;
        }

        // Project A: Berserk mode
        if (this.currentCharacterId === 'proyecto-a' && this.characterAbility instanceof ProyectoAAbilityThree) {
            const projectAAbility = this.characterAbility as ProyectoAAbilityThree;
            projectAAbility.activateBerserk();
            return;
        }
    }

    /**
     * Interact with nearby door (toggle open/close)
     */
    private interactWithNearbyDoor(): void {
        if (!this.doorSystem || !this.player) return;

        const playerX = this.player.mesh.position.x;
        const playerZ = this.player.mesh.position.z;
        const interactRange = 6; // Units - player must be within this range to interact

        const nearestDoor = this.doorSystem.getNearestDoor(playerX, playerZ, interactRange);
        if (nearestDoor) {
            // Sound is handled by door callback
            this.doorSystem.toggleDoor(nearestDoor.id);
        }
    }

    // Toggle debug visualization mode
    public toggleDebugMode(): boolean {
        if (!this.debugVisualizer) return false;

        this.gameState.debugMode = this.debugVisualizer.toggle();

        if (this.gameState.debugMode) {
            // Create initial debug visuals
            this.createDebugVisualsForAll();
        }

        return this.gameState.debugMode;
    }

    // Toggle room collision debug visualization
    public toggleRoomDebug(): boolean {
        if (!this.roomVisibilityManager) return false;
        return this.roomVisibilityManager.toggleDebug();
    }

    // Get room visibility stats
    public getRoomStats(): { roomCount: number; wallCount: number; visibleRoomCount: number; currentRoomId: string | null } | null {
        if (!this.roomVisibilityManager) return null;
        return this.roomVisibilityManager.getStats();
    }

    // Toggle fog on/off (nebline command)
    public setFog(enabled: boolean): boolean {
        if (!this.scene) return false;

        // Use PlayerFogSystem if available
        if (this.playerFogSystem) {
            this.playerFogSystem.setEnabled(enabled);
            console.log(`[DEV] Player-centered fog: ${enabled ? 'ON' : 'OFF'}`);
            return enabled;
        }

        // Fallback to standard fog
        if (enabled) {
            this.scene.fog = new THREE.Fog(0x0a0a0f, 20, 80);
            console.log('[DEV] Fog: ON (legacy)');
            return true;
        } else {
            this.scene.fog = null;
            console.log('[DEV] Fog: OFF');
            return false;
        }
    }

    // Get current fog state
    public isFogEnabled(): boolean {
        return this.playerFogSystem?.isActive() ?? (this.scene?.fog !== null);
    }

    // --- Player Fog System Commands (Dev Console) ---

    /**
     * Set fog radius (near/far) - creates bubble of clarity around player
     * @param near - Distance where fog starts (full visibility)
     * @param far - Distance where fog is 100% opaque
     */
    public setFogRadius(near: number, far: number): { near: number; far: number } {
        if (!this.playerFogSystem) {
            console.warn('[DEV] PlayerFogSystem not initialized');
            return { near: 0, far: 0 };
        }
        this.playerFogSystem.setFogRadius(near, far);
        return this.playerFogSystem.getFogRadius();
    }

    /**
     * Get current fog radius
     */
    public getFogRadius(): { near: number; far: number } {
        if (!this.playerFogSystem) {
            return { near: 0, far: 0 };
        }
        return this.playerFogSystem.getFogRadius();
    }

    /**
     * Set fog color (hex value)
     * @param colorHex - Color in hex format (0x0a0a0f or '#0a0a0f')
     */
    public setFogColor(colorHex: number | string): string {
        if (!this.playerFogSystem) {
            console.warn('[DEV] PlayerFogSystem not initialized');
            return '#000000';
        }
        if (typeof colorHex === 'string') {
            // Parse hex string like '#0a0a0f' or '0a0a0f'
            const cleanHex = colorHex.replace('#', '');
            const numericHex = parseInt(cleanHex, 16);
            this.playerFogSystem.setFogColor(numericHex);
        } else {
            this.playerFogSystem.setFogColor(colorHex);
        }
        return '#' + this.playerFogSystem.getFogColor().getHexString();
    }

    /**
     * Get current fog color as hex string
     */
    public getFogColor(): string {
        if (!this.playerFogSystem) {
            return '#000000';
        }
        return '#' + this.playerFogSystem.getFogColor().getHexString();
    }

    /**
     * Get fog system stats (for dev console)
     */
    public getFogStats(): { enabled: boolean; near: number; far: number; color: string; materials: number } {
        if (!this.playerFogSystem) {
            return { enabled: false, near: 0, far: 0, color: '#000000', materials: 0 };
        }
        const radius = this.playerFogSystem.getFogRadius();
        return {
            enabled: this.playerFogSystem.isActive(),
            near: radius.near,
            far: radius.far,
            color: '#' + this.playerFogSystem.getFogColor().getHexString(),
            materials: this.playerFogSystem.getMaterialCount()
        };
    }

    /**
     * Toggle player-centered fog on/off
     */
    public togglePlayerFog(enabled?: boolean): boolean {
        if (!this.playerFogSystem) {
            return false;
        }
        const newState = enabled !== undefined ? enabled : !this.playerFogSystem.isActive();
        this.playerFogSystem.setEnabled(newState);
        return newState;
    }

    /**
     * Update fog room bounds based on visible rooms
     * Called when player changes room
     */
    private updateFogRoomBounds(): void {
        if (!this.playerFogSystem || !this.roomVisibilityManager) return;

        const visibleRooms = this.roomVisibilityManager.getVisibleRooms();

        if (visibleRooms.length === 0) {
            // No rooms = no bounds restriction
            this.playerFogSystem.setCurrentRoomBounds(null);
            return;
        }

        // Combine bounds of all visible rooms
        const roomBounds = visibleRooms.map(room => room.bounds);
        this.playerFogSystem.setVisibleRoomsBounds(roomBounds);
    }

    /**
     * Toggle room occlusion for fog
     */
    public toggleRoomOcclusion(enabled?: boolean): boolean {
        if (!this.playerFogSystem) return false;

        const newState = enabled !== undefined ? enabled : !this.playerFogSystem.isRoomOcclusionEnabled();
        this.playerFogSystem.setRoomOcclusionEnabled(newState);
        return newState;
    }

    /**
     * Set fog factor for areas outside the current room
     */
    public setOutsideRoomFogFactor(factor: number): number {
        if (!this.playerFogSystem) return 0;
        this.playerFogSystem.setOutsideRoomFogFactor(factor);
        return factor;
    }

    // --- Minimap Data Access ---

    /**
     * Get the player entity (for ability system)
     */
    public getPlayer(): any {
        if (!this.player) return null;

        // Ensure ability reference is attached
        if (this.characterAbility && !(this.player as any).ability) {
            (this.player as any).ability = this.characterAbility;
        }

        return this.player;
    }

    public getPlayerPosition(): { x: number; z: number } | null {
        if (!this.player?.mesh) return null;
        return { x: this.player.mesh.position.x, z: this.player.mesh.position.z };
    }

    public getPlayerDirection(): { x: number; z: number } | null {
        if (!this.player) return null;
        // Get direction from player's last movement or facing direction
        const dir = (this.player as any).lastDirection || { x: 0, z: -1 };
        return dir;
    }

    public getMapWallsForMinimap(): Array<{ x: number; z: number; width: number; depth: number; rotation?: number }> {
        const walls: Array<{ x: number; z: number; width: number; depth: number; rotation?: number }> = [];

        // 1. Walls from legacy JSON maps (this.mapWalls)
        for (const wall of this.mapWalls) {
            walls.push({
                x: wall.position.x,
                z: wall.position.z,
                width: wall.userData['wallWidth'] || wall.scale.x || 10,
                depth: wall.userData['wallDepth'] || wall.scale.z || 2,
                rotation: wall.rotation.y
            });
        }

        // 2. Walls from Room Visibility System (BSP/Template rooms)
        if (this.roomVisibilityManager?.isInitialized()) {
            const roomWalls = this.roomVisibilityManager.getAllWallsForMinimap();
            walls.push(...roomWalls);
        }

        return walls;
    }

    public getEnemiesForMinimap(): Array<{ x: number; z: number; type: string }> {
        return this.enemies
            .filter(e => !e.isDead)
            .map(enemy => ({
                x: enemy.mesh.position.x,
                z: enemy.mesh.position.z,
                type: (enemy as any).type || 'enemy'
            }));
    }

    public getDoorsForMinimap(): Array<{ x: number; z: number; width: number; rotation: number; isOpen: boolean }> {
        if (!this.doorSystem) return [];
        return this.doorSystem.getDoorsForMinimap();
    }

    public getPortalsForMinimap(): Array<{ x: number; z: number; type: string }> {
        if (!this.portalSystem) return [];
        return this.portalSystem.getPortalsForMinimap();
    }

    // --- Developer Mode Commands ---

    public setGameSpeed(speed: number) {
        this.timeScale = speed;
        console.log(`[DEV] Game Speed set to ${speed}x`);
    }

    public toggleGodMode(): boolean {
        this.gameState.godMode = !this.gameState.godMode;
        console.log(`[DEV] God Mode: ${this.gameState.godMode}`);
        return this.gameState.godMode;
    }

    public setPlayerHealth(amount: number) {
        this.gameState.health = amount;
        if (this.gameState.health > this.gameState.maxHealth) {
            this.gameState.maxHealth = this.gameState.health;
        }
        console.log(`[DEV] Player Health set to ${amount}`);
    }

    public toggleAutoShoot(enabled: boolean) {
        this.gameState.autoShootEnabled = enabled;
        console.log(`[DEV] Auto-shoot: ${enabled}`);
    }

    public setDamageMultiplier(multiplier: number) {
        this.gameState.damageMultiplier = multiplier;
        console.log(`[DEV] Damage Multiplier: ${multiplier}x`);
    }

    public toggleInvisibility(): boolean {
        this.gameState.invisible = !this.gameState.invisible;

        // Note: Invisibility makes player invisible to ENEMIES (they won't detect/attack)
        // No visual change to player sprite - purely functional for AI

        console.log(`[DEV] Invisibility: ${this.gameState.invisible}`);
        return this.gameState.invisible;
    }

    public killAllEnemies(): number {
        const count = this.enemies.length;
        // Mark all as dead so they are removed in next update
        this.enemies.forEach(e => {
            e.takeDamage(999999, this.scene); // Ensure they drop XP/die properly
        });
        // Force immediate cleanup
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            this.scene.remove(enemy.mesh);
            if (enemy.debugGroup) this.scene.remove(enemy.debugGroup);
        }
        this.enemies = [];
        console.log(`[DEV] Killed ${count} enemies`);
        return count;
    }

    public spawnEnemy(type: string, count: number = 1) {
        if (!this.player) return;

        for (let i = 0; i < count; i++) {
            // Use portal system for spawn location
            let spawnPos = this.portalSystem.getSpawnPoint(type === 'worm' ? 'worm' : 'spider');

            // If portal returns origin (no portals), spawn around player with spread
            if (spawnPos.x === 0 && spawnPos.z === 0) {
                const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
                const distance = 15 + Math.random() * 10; // 15-25 units from player
                spawnPos = new THREE.Vector3(
                    this.player.mesh.position.x + Math.cos(angle) * distance,
                    0,
                    this.player.mesh.position.z + Math.sin(angle) * distance
                );
            }

            const x = spawnPos.x;
            const z = spawnPos.z;

            const enemyType = type === 'worm' ? 'worm' : 'spider';
            const enemy = new EnemyThree(this.scene, x, z, enemyType);

            // Assign home portal
            const portal = this.portalSystem.getPortal(enemyType);
            if (portal) {
                enemy.setHomePortal(portal);
            }

            this.enemies.push(enemy);

            if (this.debugVisualizer?.enabled) {
                enemy.debugGroup = this.debugVisualizer.updateEnemyDebug(
                    enemy.mesh.position,
                    EnemyThree.COLLISION_RADIUS,
                    EnemyThree.SPRITE_WIDTH,
                    EnemyThree.SPRITE_HEIGHT
                );
            }
        }
        console.log(`[DEV] Spawned ${count} ${type}(s)`);
    }

    public toggleSpawning(enabled: boolean) {
        this.autoSpawningEnabled = enabled;
        if (this.portalSystem) {
            this.portalSystem.toggleSpawning(enabled);
        }
        console.log(`[DEV] Auto-spawn: ${enabled ? 'ON' : 'OFF'}`);
    }

    public spawnWave() {
        // Simulate a wave spawn
        this.spawnEnemy('spider', 3);
        this.spawnEnemy('worm', 2);
        console.log(`[DEV] Spawned Wave`);
    }

    public getGameStats() {
        return {
            fps: 1 / this.clock.getDelta(), // Approximate
            enemyCount: this.enemies.length,
            health: this.gameState.health,
            timeScale: this.timeScale
        };
    }

    // --- Procedural Map Generation with Templates ---

    /**
     * Generate a procedural map using room templates
     */
    public async generateProceduralMap(config?: Partial<TemplateMapConfig>): Promise<void> {
        // Clear current map
        this.clearCurrentMap();

        // Dispose previous generated map
        if (this.currentGeneratedMap) {
            this.templateMapGenerator.dispose();
            this.currentGeneratedMap = null;
        }

        // Initialize factory and generator if needed
        if (!this.roomFactory) {
            this.roomFactory = new RoomFactory(this.scene);
        }
        if (!this.templateMapGenerator) {
            this.templateMapGenerator = new TemplateMapGenerator(
                this.scene,
                this.roomTemplateLoader,
                this.roomFactory
            );
        }

        // Default configuration
        const fullConfig: TemplateMapConfig = {
            seed: config?.seed || `map_${Date.now()}`,
            startTemplate: config?.startTemplate || 'hub_large',
            minRooms: config?.minRooms || 8,
            maxRooms: config?.maxRooms || 15,
            biomeWeights: config?.biomeWeights || {
                'hub': 0.1,
                'corridor': 0.4,
                'prison': 0.3,
                'laboratory': 0.3
            },
            difficultyProgression: config?.difficultyProgression ?? true,
            maxDifficulty: config?.maxDifficulty || 5,
            branchingFactor: config?.branchingFactor || 0.7
        };

        try {
            // Generate the map
            this.currentGeneratedMap = await this.templateMapGenerator.generate(fullConfig);

            // Register walls for collision
            for (const room of this.currentGeneratedMap.rooms) {
                for (const wall of room.walls) {
                    this.mapWalls.push(wall);
                }
            }

            // Update room visibility manager with generated rooms
            if (this.roomVisibilityManager) {
                for (const room of this.currentGeneratedMap.rooms) {
                    this.roomVisibilityManager.registerRoom(room);
                }
            }

            // Set player position to start room
            if (this.player && this.currentGeneratedMap.rooms.length > 0) {
                const startRoom = this.currentGeneratedMap.rooms.find(
                    r => r.id === this.currentGeneratedMap!.startRoomId
                );
                if (startRoom) {
                    this.player.mesh.position.set(
                        startRoom.worldPosition.x,
                        0,
                        startRoom.worldPosition.z
                    );
                }
            }

            // Kill all enemies
            this.killAllEnemies();

            this.currentMapName = `procedural_${fullConfig.seed}`;
            console.log(`[Game] Generated procedural map: ${this.currentGeneratedMap.rooms.length} rooms`);
        } catch (error) {
            console.error('[Game] Failed to generate procedural map:', error);
            throw error;
        }
    }

    /**
     * Get list of available room templates
     */
    public getAvailableTemplates(): string[] {
        return this.roomTemplateLoader.getAllTemplates().map(t => t.id);
    }

    /**
     * Create a test map with multiple rooms to verify lighting system
     * Creates: Hub (center) + Lab (north) + Prison (east) connected by corridors
     * Uses the unified system with synthetic BSP data
     */
    public async createTestLightingMap(): Promise<{ roomCount: number; biomes: string[] }> {
        console.log('[Game] Creating test lighting map with unified system...');

        // Define room sizes
        const hubSize = 30;
        const labSize = 25;
        const prisonSize = 25;
        const wallThickness = 2;
        const corridorWidth = 5;
        const corridorLength = 10;  // Distance between rooms (must match generateTestMapWalls)

        // Calculate room positions
        const hubHalf = hubSize / 2;
        const labHalf = labSize / 2;
        const prisonHalf = prisonSize / 2;
        const labCenterZ = hubHalf + corridorLength + labHalf;
        const prisonCenterX = hubHalf + corridorLength + prisonHalf;

        // Create synthetic BSP data for test map
        const syntheticBSPData = {
            rooms: [
                // Hub room at center (0, 0)
                {
                    id: 'hub_center',
                    x: -hubHalf,
                    z: -hubHalf,
                    width: hubSize,
                    depth: hubSize,
                    centerX: 0,
                    centerZ: 0,
                    connected: true
                },
                // Lab room to the north
                {
                    id: 'lab_north',
                    x: -labHalf,
                    z: labCenterZ - labHalf,
                    width: labSize,
                    depth: labSize,
                    centerX: 0,
                    centerZ: labCenterZ,
                    connected: true
                },
                // Prison room to the east
                {
                    id: 'prison_east',
                    x: prisonCenterX - prisonHalf,
                    z: -prisonHalf,
                    width: prisonSize,
                    depth: prisonSize,
                    centerX: prisonCenterX,
                    centerZ: 0,
                    connected: true
                }
            ],
            corridors: [
                // Corridor from hub to lab (vertical - along Z axis)
                {
                    id: 'corridor_hub_lab',
                    startX: 0,
                    startZ: hubHalf,
                    endX: 0,
                    endZ: labCenterZ - labHalf,
                    width: corridorWidth,
                    horizontal: false
                },
                // Corridor from hub to prison (horizontal - along X axis)
                {
                    id: 'corridor_hub_prison',
                    startX: hubHalf,
                    startZ: 0,
                    endX: prisonCenterX - prisonHalf,
                    endZ: 0,
                    width: corridorWidth,
                    horizontal: true
                }
            ],
            walls: this.generateTestMapWalls(hubSize, labSize, prisonSize, corridorWidth, wallThickness),
            portals: [],
            doors: [],
            playerSpawn: { x: 0, z: 0 },
            config: {
                seed: 'test_lighting',
                mapWidth: 150,
                mapDepth: 150,
                minRoomSize: 20,
                maxRoomSize: 35,
                roomPadding: 5,
                corridorWidth: corridorWidth,
                maxDepth: 4,
                splitChance: 0.5,
                portalCount: 0,
                wallThickness: wallThickness,
                generateDoors: false,
                doorChance: 0
            }
        };

        // Load using unified system
        await this.loadUnifiedMap(syntheticBSPData);

        this.currentMapName = 'test_lighting';

        // Get biomes from unified map
        const biomes: string[] = [];
        if (this.currentUnifiedMap) {
            this.currentUnifiedMap.rooms.forEach(room => {
                if (room.template?.biome) {
                    biomes.push(room.template.biome);
                }
            });
        }

        const roomCount = this.currentUnifiedMap?.rooms.length || 0;
        const corridorCount = this.currentUnifiedMap?.corridors.length || 0;

        console.log(`[Game] ═══════════════════════════════════════════`);
        console.log(`[Game] Test lighting map created: ${roomCount} rooms, ${corridorCount} corridors`);
        console.log(`[Game] Biomes: ${[...new Set(biomes)].join(', ')}`);
        console.log(`[Game] ═══════════════════════════════════════════`);

        // Log room stats
        const stats = this.roomVisibilityManager.getStats();
        console.log(`[Game] Room Stats: ${stats.roomCount} rooms, ${stats.wallCount} walls`);

        return { roomCount: roomCount + corridorCount, biomes: [...new Set(biomes)] };
    }

    /**
     * Generate wall data for test lighting map
     *
     * IMPORTANT: Wall positions (x, z) represent the CENTER of the wall mesh.
     * Three.js BoxGeometry is centered at its position.
     *
     * For a room centered at (cx, cz) with size (w, d):
     * - North wall center: (cx, cz + d/2)
     * - South wall center: (cx, cz - d/2)
     * - East wall center:  (cx + w/2, cz)
     * - West wall center:  (cx - w/2, cz)
     */
    private generateTestMapWalls(hubSize: number, labSize: number, prisonSize: number, corridorWidth: number, wallThickness: number): any[] {
        const walls: any[] = [];
        let wallId = 0;

        // Helper to add wall with CENTER position
        const addWall = (centerX: number, centerZ: number, width: number, depth: number, isPerimeter = true) => {
            walls.push({
                id: `wall_${wallId++}`,
                x: centerX,
                z: centerZ,
                width,
                depth,
                isPerimeter
            });
        };

        const hubHalf = hubSize / 2;
        const gapHalf = corridorWidth / 2;

        // ========== HUB ROOM (center at 0,0) ==========
        // Hub size: 30x30, from (-15,-15) to (15,15)

        // Hub North wall - with gap for corridor to Lab
        // Left segment: from (-15, 15) to (-gapHalf, 15)
        const hubNorthLeftWidth = hubHalf - gapHalf;
        addWall(
            -hubHalf + hubNorthLeftWidth / 2,  // center X
            hubHalf,                            // center Z
            hubNorthLeftWidth,                  // width
            wallThickness                       // depth
        );
        // Right segment: from (gapHalf, 15) to (15, 15)
        addWall(
            hubHalf - hubNorthLeftWidth / 2,
            hubHalf,
            hubNorthLeftWidth,
            wallThickness
        );

        // Hub South wall - solid
        addWall(0, -hubHalf, hubSize, wallThickness);

        // Hub East wall - with gap for corridor to Prison
        // Bottom segment: from (15, -15) to (15, -gapHalf)
        const hubEastBottomDepth = hubHalf - gapHalf;
        addWall(
            hubHalf,
            -hubHalf + hubEastBottomDepth / 2,
            wallThickness,
            hubEastBottomDepth
        );
        // Top segment: from (15, gapHalf) to (15, 15)
        addWall(
            hubHalf,
            hubHalf - hubEastBottomDepth / 2,
            wallThickness,
            hubEastBottomDepth
        );

        // Hub West wall - solid
        addWall(-hubHalf, 0, wallThickness, hubSize);

        // ========== LAB ROOM (north of hub) ==========
        // Lab center: (0, hubHalf + corridorLength + labHalf)
        const corridorLength = 10;  // Distance between rooms
        const labCenterZ = hubHalf + corridorLength + labSize / 2;
        const labHalf = labSize / 2;

        // Lab North wall - solid
        addWall(0, labCenterZ + labHalf, labSize, wallThickness);

        // Lab South wall - with gap for corridor
        const labSouthLeftWidth = labHalf - gapHalf;
        addWall(
            -labHalf + labSouthLeftWidth / 2,
            labCenterZ - labHalf,
            labSouthLeftWidth,
            wallThickness
        );
        addWall(
            labHalf - labSouthLeftWidth / 2,
            labCenterZ - labHalf,
            labSouthLeftWidth,
            wallThickness
        );

        // Lab East wall - solid
        addWall(labHalf, labCenterZ, wallThickness, labSize);

        // Lab West wall - solid
        addWall(-labHalf, labCenterZ, wallThickness, labSize);

        // ========== PRISON ROOM (east of hub) ==========
        // Prison center: (hubHalf + corridorLength + prisonHalf, 0)
        const prisonCenterX = hubHalf + corridorLength + prisonSize / 2;
        const prisonHalf = prisonSize / 2;

        // Prison North wall - solid
        addWall(prisonCenterX, prisonHalf, prisonSize, wallThickness);

        // Prison South wall - solid
        addWall(prisonCenterX, -prisonHalf, prisonSize, wallThickness);

        // Prison East wall - solid
        addWall(prisonCenterX + prisonHalf, 0, wallThickness, prisonSize);

        // Prison West wall - with gap for corridor
        const prisonWestBottomDepth = prisonHalf - gapHalf;
        addWall(
            prisonCenterX - prisonHalf,
            -prisonHalf + prisonWestBottomDepth / 2,
            wallThickness,
            prisonWestBottomDepth
        );
        addWall(
            prisonCenterX - prisonHalf,
            prisonHalf - prisonWestBottomDepth / 2,
            wallThickness,
            prisonWestBottomDepth
        );

        // ========== CORRIDOR: HUB to LAB (vertical) ==========
        // From hub north (z=15) to lab south (z=labCenterZ-labHalf)
        const corridorHubLabLength = labCenterZ - labHalf - hubHalf;
        const corridorHubLabCenterZ = hubHalf + corridorHubLabLength / 2;

        // Left wall of corridor
        addWall(-gapHalf, corridorHubLabCenterZ, wallThickness, corridorHubLabLength, false);
        // Right wall of corridor
        addWall(gapHalf, corridorHubLabCenterZ, wallThickness, corridorHubLabLength, false);

        // ========== CORRIDOR: HUB to PRISON (horizontal) ==========
        // From hub east (x=15) to prison west (x=prisonCenterX-prisonHalf)
        const corridorHubPrisonLength = prisonCenterX - prisonHalf - hubHalf;
        const corridorHubPrisonCenterX = hubHalf + corridorHubPrisonLength / 2;

        // Top wall of corridor
        addWall(corridorHubPrisonCenterX, gapHalf, corridorHubPrisonLength, wallThickness, false);
        // Bottom wall of corridor
        addWall(corridorHubPrisonCenterX, -gapHalf, corridorHubPrisonLength, wallThickness, false);

        return walls;
    }

    /**
     * Load a unified map from BSP data or UnifiedMapData
     * This is the main entry point for loading maps from the editor
     */
    public async loadUnifiedMap(data: UnifiedMapData | any): Promise<void> {
        console.log('[Game] Loading unified map...');

        // Clear current map without full disposal
        this.clearCurrentMapForUnified();

        // Reinitialize room visibility system
        if (!this.roomVisibilityManager.isInitialized()) {
            await this.roomVisibilityManager.initialize(this.scene, this.camera);
        }

        // Initialize BSP converter if needed
        if (!this.bspConverter) {
            this.bspConverter = new BSPToRoomConverter(this.scene);
        }

        // Convert BSP data to unified format if needed
        let unifiedData: UnifiedMapData;
        if (this.isBSPMapData(data)) {
            console.log('[Game] Converting BSP data to unified format...');
            unifiedData = this.bspConverter.convert(data);
        } else {
            unifiedData = data as UnifiedMapData;
        }

        this.currentUnifiedMap = unifiedData;
        this.currentMapName = unifiedData.name;

        // Register all rooms with the visibility system
        for (const room of unifiedData.rooms) {
            this.roomVisibilityManager.registerRoom(room);
        }

        // Register corridors as rooms too
        for (const corridor of unifiedData.corridors) {
            this.roomVisibilityManager.registerRoom(corridor);
        }

        // Register all wall meshes with collision system AND mapWalls for minimap
        for (const wallMesh of unifiedData.wallMeshes) {
            this.scene.add(wallMesh);
            this.mapWalls.push(wallMesh);  // For legacy minimap support
            this.roomVisibilityManager.registerWallMesh(wallMesh);

            // Apply player-centered fog to wall material
            if (this.playerFogSystem && wallMesh.material instanceof THREE.MeshStandardMaterial) {
                this.playerFogSystem.applyToMaterial(wallMesh.material);
            }
        }

        // Apply fog to room floor materials
        for (const room of [...unifiedData.rooms, ...unifiedData.corridors]) {
            if (room.floor?.material instanceof THREE.MeshStandardMaterial) {
                if (this.playerFogSystem) {
                    this.playerFogSystem.applyToMaterial(room.floor.material);
                }
            }
        }

        // Initialize portals from BSP data (always clear, even if empty)
        const portalConfigs: MapPortalData[] = (unifiedData.portals || []).map(p => ({
            id: p.id,
            type: 'portal' as const,
            subtype: p.type,
            position: { x: p.x, z: p.z },
            config: {
                homeRange: p.homeRange,
                detectionRange: p.detectionRange,
                returnThreshold: p.detectionRange + 10,
                maxEnemies: p.maxEnemies,
                spawnRate: p.spawnRate
            }
        }));
        this.portalSystem.initializeFromConfig(portalConfigs);
        console.log(`[Game] Initialized ${portalConfigs.length} portals`);

        // Initialize doors from BSP data
        if (unifiedData.doors && unifiedData.doors.length > 0) {
            const doorConfigs: DoorConfig[] = unifiedData.doors.map(d => ({
                id: d.id,
                position: { x: d.x, z: d.z },
                width: d.width,
                height: d.height,
                depth: d.depth,
                rotation: d.rotation,
                type: d.type as 'small' | 'large' | 'garage' | 'custom',
                isOpen: d.isOpen,
                locked: false,
                autoClose: true
            }));
            this.doorSystem.initializeFromConfig(doorConfigs);
            console.log(`[Game] Initialized ${doorConfigs.length} doors`);
        }

        // Move player to spawn point
        if (this.player) {
            this.player.mesh.position.copy(unifiedData.playerSpawn);
            console.log(`[Game] Player moved to spawn: (${unifiedData.playerSpawn.x}, ${unifiedData.playerSpawn.z})`);
        }

        // Kill all enemies for fresh start
        this.killAllEnemies();

        // Log stats
        const roomCount = unifiedData.rooms.length + unifiedData.corridors.length;
        const portalCount = unifiedData.portals?.length || 0;
        const doorCount = unifiedData.doors?.length || 0;
        console.log(`[Game] ═══════════════════════════════════════════`);
        console.log(`[Game] Unified map loaded: ${unifiedData.name}`);
        console.log(`[Game] ${unifiedData.rooms.length} rooms, ${unifiedData.corridors.length} corridors`);
        console.log(`[Game] ${unifiedData.wallMeshes.length} walls, ${portalCount} portals, ${doorCount} doors`);
        console.log(`[Game] ═══════════════════════════════════════════`);
    }

    /**
     * Check if data is BSP map format (from procedural generator)
     */
    private isBSPMapData(data: any): boolean {
        // BSP data has 'rooms', 'corridors', 'walls', and 'config' properties
        // UnifiedMapData has 'name', 'rooms' (RoomInstance[]), 'wallMeshes'
        return data && 'rooms' in data && 'corridors' in data && 'config' in data && !('wallMeshes' in data);
    }

    /**
     * Clear current map without disposing room visibility manager
     * Used for loading new maps in unified system
     */
    private clearCurrentMapForUnified(): void {
        // Remove legacy walls
        for (const wall of this.mapWalls) {
            this.scene.remove(wall);
            wall.geometry.dispose();
            if (wall.material instanceof THREE.Material) {
                wall.material.dispose();
            }
        }
        this.mapWalls = [];

        // Clear portals
        this.portalSystem.clear();

        // Clear doors
        if (this.doorSystem) {
            this.doorSystem.clear();
        }

        // Clear rooms without disposing the manager
        if (this.roomVisibilityManager?.isInitialized()) {
            this.roomVisibilityManager.clearAllRooms();
        }

        // Clear unified map reference
        this.currentUnifiedMap = null;

        console.log('[Game] Cleared current map (unified mode)');
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

    // ========== LARS CHARGE ATTACK VISUAL EFFECTS ==========

    /**
     * Create visual effects while Lars is charging
     * NOTE: Visual effects disabled - charge animation on player sprite is sufficient
     */
    private createChargeVisualEffects(): void {
        // Visual effects disabled - the charge animation provides enough feedback
    }

    /**
     * Update charge visual effects each frame
     * NOTE: Visual effects disabled - charge animation on player sprite is sufficient
     */
    private updateChargeVisualEffects(): void {
        // Visual effects disabled
    }

    /**
     * Update charge indicator to point towards mouse position
     */
    private updateChargeIndicatorDirection(): void {
        // Update player charge animation based on mouse direction
        if (this.player && this.mousePosition) {
            const worldPos = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);

            if (this.currentCharacterId === 'proyecto-y') {
                // Proyecto-Y: Use dedicated charge update method
                this.player.updateProyectoYCharge(0.016, worldPos);  // Approximate delta
            } else {
                // Lars: Use existing charge direction method
                this.player.updateChargeDirection(worldPos);
            }
        }
        // Update visual effects
        this.updateChargeVisualEffects();
    }

    /**
     * Clear all charge visual effects
     */
    private clearChargeVisualEffects(): void {
        for (const effect of this.chargeEffects) {
            this.scene.remove(effect);
            if ((effect as THREE.Mesh).geometry) {
                (effect as THREE.Mesh).geometry.dispose();
            }
            if ((effect as THREE.Mesh).material) {
                const material = (effect as THREE.Mesh).material;
                if (Array.isArray(material)) {
                    material.forEach(m => m.dispose());
                } else {
                    material.dispose();
                }
            }
        }

        this.chargeEffects = [];
        this.chargeParticles = [];
        this.chargeIndicator = null;

        console.log('[LARS CHARGE] Visual effects cleared');
    }

    /**
     * Execute Lars charge attack based on charge level
     */
    private executeLarsChargeAttack(chargeLevel: number, targetPosition: THREE.Vector3): void {
        if (!this.player || !this.characterAbility) return;

        const larsAbility = this.characterAbility as LarsAbilityThree;

        // Find enemy at or near target position
        let targetEnemy = this.findEnemyNearPosition(targetPosition, 5);

        // If no enemy near target, find nearest enemy in range
        if (!targetEnemy) {
            targetEnemy = this.findNearestEnemy();
        }

        if (!targetEnemy) {
            console.log('[LARS CHARGE] No valid target found');
            return;
        }

        // Calculate mind control chance based on charge level
        let mindControlChance: number;
        let damage: number;

        if (chargeLevel >= 1.0) {
            // Full charge = 40% max mind control chance
            mindControlChance = 0.40;
            damage = 50;
            console.log('[LARS CHARGE] FULL CHARGE! 40% mind control chance');
        } else if (chargeLevel >= 0.66) {
            // Level 2 = 25% chance
            mindControlChance = 0.25;
            damage = 35;
        } else if (chargeLevel >= 0.33) {
            // Level 1 = 15% chance
            mindControlChance = 0.15;
            damage = 25;
        } else {
            // Quick tap = 5% chance
            mindControlChance = 0.05;
            damage = 15;
        }

        // Create enhanced mental attack effect
        larsAbility.createMentalAttackEffect(
            this.player.mesh.position,
            targetEnemy,
            this.scene
        );

        // Apply damage and handle rewards if enemy dies
        const reward = targetEnemy.takeDamage(damage, this.scene);
        if (reward) {
            this.addXp(reward.xp);
            this.gameState.score += reward.score;
            // Remove dead enemy from array
            const idx = this.enemies.indexOf(targetEnemy);
            if (idx > -1) this.enemies.splice(idx, 1);
        }

        // Attempt mind control with calculated chance
        if (!targetEnemy.isDead && !targetEnemy.isMindControlled) {
            if (Math.random() < mindControlChance) {
                const duration = 10 * larsAbility.minionDurationMult;
                targetEnemy.mindControl(duration, larsAbility.minionHealthMult, larsAbility.minionDamageMult);

                if (larsAbility.onMindControlCallback) {
                    larsAbility.onMindControlCallback();
                }

                console.log(`[LARS CHARGE] Mind control SUCCESS! (${(mindControlChance * 100).toFixed(0)}% chance)`);
            } else {
                console.log(`[LARS CHARGE] Mind control failed (${(mindControlChance * 100).toFixed(0)}% chance)`);

                // Check for fail effects (explosion, fear) from ability upgrades
                if (larsAbility.explodeOnFailChance > 0 && Math.random() < larsAbility.explodeOnFailChance) {
                    // Trigger fail explosion (handled by ability)
                }
            }
        }

        // Play sound
        this.audioService.playShoot(this.currentCharacterId);
    }

    /**
     * Execute Proyecto-Y charge chain attack based on charge level
     * Chain lightning that hits multiple enemies with decreasing damage
     */
    private executeProyectoYChargeAttack(chargeLevel: number, targetPosition: THREE.Vector3): void {
        if (!this.player || !this.characterAbility) return;

        const proyectoYAbility = this.characterAbility as ProyectoYAbilityThree;

        // Execute chain attack and get results
        const results = proyectoYAbility.executeChargeChainAttack(
            chargeLevel,
            targetPosition,
            this.enemies,
            this.scene,
            this.player.mesh.position
        );

        // Process results (XP, score, remove dead enemies)
        let totalDamage = 0;
        const deadEnemyIndices: number[] = [];

        for (const result of results) {
            totalDamage += result.damage;

            if (result.orb) {
                // Enemy died - collect reward
                this.addXp(result.orb.xp);
                this.gameState.score += result.orb.score;

                // Mark for removal
                const idx = this.enemies.indexOf(result.enemy);
                if (idx > -1 && !deadEnemyIndices.includes(idx)) {
                    deadEnemyIndices.push(idx);
                }
            }
        }

        // Remove dead enemies (in reverse order to preserve indices)
        deadEnemyIndices.sort((a, b) => b - a);
        for (const idx of deadEnemyIndices) {
            this.enemies.splice(idx, 1);
        }

        if (results.length > 0) {
            console.log(`[PROYECTO-Y] Chain attack complete! Hit ${results.length} enemies for ${totalDamage} total damage`);
        }

        // Play sound
        this.audioService.playShoot(this.currentCharacterId);
    }

    /**
     * Find enemy near a world position
     */
    private findEnemyNearPosition(position: THREE.Vector3, maxDistance: number): EnemyThree | null {
        let nearest: EnemyThree | null = null;
        let nearestDist = maxDistance;

        for (const enemy of this.enemies) {
            if (enemy.isDead || enemy.isMindControlled) continue;

            const dist = enemy.mesh.position.distanceTo(position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    // Find the nearest enemy within range (excludes minions)
    private findNearestEnemy(): EnemyThree | null {
        if (this.enemies.length === 0) return null;

        let nearest: EnemyThree | null = null;
        let nearestDist = this.autoShootRange;

        for (const enemy of this.enemies) {
            // Skip dead enemies AND mind-controlled minions (allies)
            if (enemy.isDead || enemy.isMindControlled) continue;

            const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    // Auto-attack at nearest enemy (different behavior per character)
    private autoShoot() {
        // Check if auto-shoot is disabled via Dev Mode
        if (!this.gameState.autoShootEnabled) return;

        // Lars and Proyecto-Y use manual charge system, not auto-shoot
        if (this.currentCharacterId === 'lars' || this.currentCharacterId === 'proyecto-y') return;

        const currentTime = this.clock.getElapsedTime();

        // Check cooldown
        if (currentTime - this.lastShootTime < this.autoShootInterval) return;

        // ========== ARCADIO: ATAQUE DE ZONA (sin proyectil) ==========
        if (this.player.usesCurvedProjectile()) {
            // Arcadio solo ataca enemigos CERCANOS (rango 8 unidades)
            const arcadioRange = 8;
            const nearestEnemy = this.findNearestEnemyInRange(arcadioRange);

            if (!nearestEnemy) return; // No hay enemigo cerca, NO atacar

            // Ataque de zona instantaneo - SIN proyectil
            this.lastShootTime = currentTime;

            const attackDir = new THREE.Vector3()
                .subVectors(nearestEnemy.mesh.position, this.player.mesh.position)
                .normalize();

            // Crear efecto de impacto melee (picos 3D + screen shake)
            if (this.characterAbility) {
                const arcadioAbility = this.characterAbility as any;
                if (arcadioAbility.createMeleeImpactEffect) {
                    arcadioAbility.createMeleeImpactEffect(
                        this.player.mesh.position,
                        attackDir,
                        this.scene,
                        arcadioRange,
                        this.camera // Pasar camara para screen shake
                    );
                }

                // Aplicar daño de zona a todos los enemigos en el abanico
                const angleSpread = Math.PI * 0.8; // 144 grados (mismo que picos)
                const baseAngle = Math.atan2(attackDir.z, attackDir.x);
                const damage = arcadioAbility.damage || 40;

                for (const enemy of this.enemies) {
                    if (enemy.isDead || enemy.isMindControlled) continue;

                    const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
                    if (dist > arcadioRange) continue;

                    // Verificar si está dentro del abanico
                    const toEnemy = new THREE.Vector3()
                        .subVectors(enemy.mesh.position, this.player.mesh.position);
                    const enemyAngle = Math.atan2(toEnemy.z, toEnemy.x);
                    let angleDiff = enemyAngle - baseAngle;

                    // Normalizar angulo
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    if (Math.abs(angleDiff) <= angleSpread / 2) {
                        const reward = enemy.takeDamage(damage, this.scene);
                        if (reward) {
                            this.addXp(reward.xp);
                            this.gameState.score += reward.score;
                            // Enemy will be cleaned up in the main update loop
                        }

                        // Aplicar knockback
                        enemy.applyKnockback(this.player.mesh.position, 5);

                        // Lifesteal de Arcadio
                        if (arcadioAbility.applyLifesteal) {
                            arcadioAbility.applyLifesteal(damage, 1);
                        }
                    }
                }
            }

            // Arcadio mira hacia el enemigo (sin animacion larga)
            this.player.faceTarget(nearestEnemy.mesh.position);

            // Play shoot sound
            this.audioService.playShoot(this.currentCharacterId);
            return;
        }

        // ========== LARS: Uses manual charge attack system ==========
        // Lars no longer uses auto-shoot - controlled via mouse click/hold
        if (this.currentCharacterId === 'lars') {
            // Skip auto-shoot for Lars - uses new charge system
            return;
        }

        // ========== YURANY Y OTROS: RANGED ATTACK con proyectil ==========
        const nearestEnemy = this.findNearestEnemy();
        if (!nearestEnemy) return;

        const projectile = this.player.shoot(this.scene, nearestEnemy.mesh.position);
        if (projectile) {
            this.projectiles.push(projectile);
            this.lastShootTime = currentTime;
            // Play shoot sound
            this.audioService.playShoot(this.currentCharacterId);
        }
    }

    // Find nearest enemy within a specific range (for Arcadio)
    private findNearestEnemyInRange(maxRange: number): EnemyThree | null {
        if (this.enemies.length === 0) return null;

        let nearest: EnemyThree | null = null;
        let nearestDist = maxRange;

        for (const enemy of this.enemies) {
            if (enemy.isDead || enemy.isMindControlled) continue;

            const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    ngOnDestroy(): void {
        if (this.frameId != null) {
            cancelAnimationFrame(this.frameId);
        }
        if (this.characterCursor) {
            this.characterCursor.dispose();
        }
        // Dispose all tracked Three.js resources to prevent memory leaks
        if (this.scene) {
            this.disposableManager.disposeAll(this.scene);
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
    }

    createScene(canvas: ElementRef<HTMLCanvasElement>, characterId: string = 'arcadio'): void {
        this.currentCharacterId = characterId; // Save for restart
        this.canvas = canvas.nativeElement;

        // Initialize Audio System
        this.audioService.initialize().then(() => {
            console.log('[Game] Audio system initialized');
            // Start gameplay music
            this.audioService.playGameplayMusic();
        });

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
        this.scene.background = new THREE.Color(0x0a0a0f);

        // Initialize core game systems
        this.combatSystem.initialize();
        this.entityManager.initialize(this.scene);

        // Initialize player-centered fog system
        this.playerFogSystem = new PlayerFogSystem(this.scene, {
            fogColor: new THREE.Color(0x0a0a0f),  // Oscuridad casi negra
            fogNear: 18,  // Burbuja de claridad: 18 unidades
            fogFar: 28    // Transición suave hasta 28 unidades
        });

        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 25, 20);
        this.camera.lookAt(0, 0, 0);

        // Lighting - ambient + directional for better visibility
        const ambientLight = new THREE.AmbientLight(0x222244, 0.7);
        this.scene.add(ambientLight);
        this.disposableManager.track(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        this.disposableManager.track(directionalLight);

        // Ground
        this.createGround();

        // Initialize Portal System (will be populated by map loader)
        this.portalSystem = new PortalSystem(this.scene);

        // Initialize Door System (will be populated by map loader)
        this.doorSystem = new DoorSystem(this.scene);

        // Set up door sound callback
        this.doorSystem.setDoorSoundCallback(() => {
            this.audioService.play('door');
        });

        // Initialize Debug Visualizer
        this.debugVisualizer = new DebugVisualizer(this.scene);

        // Initialize Room Visibility System
        this.roomVisibilityManager.initialize(this.scene, this.camera).then(() => {
            console.log('[Game] Room visibility system initialized');

            // Set up callback for room changes to update fog bounds
            this.roomVisibilityManager.onRoomChange = (newRoom, oldRoom) => {
                this.updateFogRoomBounds();
            };
        }).catch((err) => {
            console.warn('[Game] Room visibility system initialization failed', err);
        });

        // Load default map asynchronously
        this.loadMapByName(DEFAULT_MAP_NAME).then(() => {
            // Player - created after map loads to use correct spawn position
            const spawnPos = this.mapLoader.getPlayerSpawnPosition(this.mapLoader.getCurrentMapData()!);
            this.player = new PlayerThree(this.scene, characterId);
            this.player.mesh.position.set(spawnPos.x, 0, spawnPos.z);

            // Initialize Character Ability based on selected character
            this.initializeCharacterAbility(characterId);

            // Initialize character cursor (3D targeting reticle)
            this.characterCursor = new CharacterCursor(this.scene, characterId);

            console.log(`[Game] Started with map: ${this.currentMapName}`);
        }).catch((err) => {
            // Fallback to legacy hardcoded map if loading fails
            console.warn('[Game] Failed to load default map, using legacy fallback', err);
            this.loadLegacyMap();

            // Player at center
            this.player = new PlayerThree(this.scene, characterId);
            this.initializeCharacterAbility(characterId);

            // Initialize character cursor (3D targeting reticle)
            this.characterCursor = new CharacterCursor(this.scene, characterId);
        });

        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    // ============================================
    // MAP LOADING SYSTEM
    // ============================================

    /**
     * Load a map by name (for Dev Console command)
     * Supports both BSP format (rooms/corridors) and legacy format (objects array)
     */
    public async loadMapByName(mapName: string): Promise<void> {
        try {
            // First, fetch raw JSON to detect format
            const rawData = await this.mapLoader.loadRawByName(mapName);

            // Detect format and route to appropriate loader
            if (this.isBSPMapData(rawData)) {
                console.log(`[Game] Detected BSP format for map: ${mapName}`);
                await this.loadUnifiedMap(rawData);
                this.currentMapName = mapName;
            } else {
                // Legacy format - use old loader
                const mapData = this.mapLoader.loadFromData(rawData);
                this.applyMapData(mapData);
                this.currentMapName = mapName;
            }

            console.log(`[Game] Map "${mapName}" loaded successfully`);
        } catch (error) {
            console.error(`[Game] Failed to load map: ${mapName}`, error);
            throw error;
        }
    }

    /**
     * Apply loaded map data to the scene
     */
    private applyMapData(mapData: MapData): void {
        // Clear existing map objects
        this.clearCurrentMap();

        // Create walls from map data
        const walls = this.mapLoader.getWallConfigs(mapData);
        for (const wall of walls) {
            this.createWallFromConfig(wall);
        }

        // Initialize portals from map data
        const portals = this.mapLoader.getPortalConfigs(mapData);
        this.portalSystem.initializeFromConfig(portals as MapPortalData[]);

        // Initialize doors from map data
        const doorObjects = this.mapLoader.getDoorConfigs(mapData);
        const doorConfigs: DoorConfig[] = doorObjects.map(obj => {
            // Get default values from door presets
            const defaults: Record<string, { height: number; depth: number }> = {
                small: { height: 8, depth: 2 },
                large: { height: 8, depth: 2 },
                garage: { height: 10, depth: 3 },
                custom: { height: 8, depth: 2 }
            };
            const preset = defaults[obj.config.type] || defaults['custom'];

            return {
                id: obj.id,
                position: obj.position,
                width: obj.config.width,
                height: obj.config.height ?? preset.height,
                depth: obj.config.depth ?? preset.depth,
                rotation: obj.rotation ? THREE.MathUtils.degToRad(obj.rotation) : 0,
                type: obj.config.type as 'small' | 'large' | 'garage' | 'custom',
                isOpen: obj.config.isOpen,
                locked: obj.config.locked,
                autoClose: obj.config.autoClose ?? true,
                autoCloseDelay: obj.config.autoCloseDelay,
                linkedTo: obj.config.linkedTo
            };
        });
        this.doorSystem.initializeFromConfig(doorConfigs);

        // Update player position if player exists
        if (this.player) {
            const spawnPos = this.mapLoader.getPlayerSpawnPosition(mapData);
            this.player.mesh.position.set(spawnPos.x, 0, spawnPos.z);
        }

        // Kill all existing enemies when map changes
        this.killAllEnemies();

        console.log(`[Game] Applied map: ${mapData.name} (${mapData.objects.length} objects, ${doorConfigs.length} doors)`);
    }

    /**
     * Create a wall mesh from map config
     */
    private createWallFromConfig(wallConfig: MapObject): void {
        const textureLoader = new THREE.TextureLoader();
        const wallTexture = textureLoader.load('assets/environment/wall_1.png');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;

        const scaleX = wallConfig.scale?.x || 10;
        const scaleZ = wallConfig.scale?.z || 2;
        const wallHeight = 8;

        wallTexture.repeat.set(scaleX / 10, 1);

        const wallMat = new THREE.MeshStandardMaterial({
            map: wallTexture,
            roughness: 0.5,
            metalness: 0.3
        });

        // Apply player-centered fog to wall material
        if (this.playerFogSystem) {
            this.playerFogSystem.applyToMaterial(wallMat);
        }

        const geo = new THREE.BoxGeometry(scaleX, wallHeight, scaleZ);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(wallConfig.position.x, wallHeight / 2, wallConfig.position.z);

        if (wallConfig.rotation) {
            mesh.rotation.y = THREE.MathUtils.degToRad(wallConfig.rotation);
        }

        // Store collision data for wall collision system
        mesh.userData['isWall'] = true;
        mesh.userData['wallWidth'] = scaleX;
        mesh.userData['wallDepth'] = scaleZ;
        mesh.userData['collisionBox'] = new THREE.Box3().setFromObject(mesh);

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.mapWalls.push(mesh);
    }

    /**
     * Check collision between a point (with radius) and map walls
     * Returns push-back vector if collision detected
     */
    private checkMapWallCollision(x: number, z: number, radius: number): { x: number; z: number } {
        const result = { x: 0, z: 0 };

        for (const wall of this.mapWalls) {
            if (!wall.userData['isWall']) continue;

            const wallPos = wall.position;
            const halfWidth = (wall.userData['wallWidth'] || 10) / 2;
            const halfDepth = (wall.userData['wallDepth'] || 2) / 2;

            // Handle rotated walls
            const rotation = wall.rotation.y;

            // Transform point to wall's local space
            const dx = x - wallPos.x;
            const dz = z - wallPos.z;

            let localX: number, localZ: number;
            if (Math.abs(rotation) > 0.01) {
                const cos = Math.cos(-rotation);
                const sin = Math.sin(-rotation);
                localX = dx * cos - dz * sin;
                localZ = dx * sin + dz * cos;
            } else {
                localX = dx;
                localZ = dz;
            }

            // Find closest point on wall AABB
            const closestX = Math.max(-halfWidth, Math.min(halfWidth, localX));
            const closestZ = Math.max(-halfDepth, Math.min(halfDepth, localZ));

            // Calculate distance from point to closest point
            const distX = localX - closestX;
            const distZ = localZ - closestZ;
            const distSq = distX * distX + distZ * distZ;

            if (distSq < radius * radius && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const overlap = radius - dist;

                // Calculate push direction in local space
                let pushX = (distX / dist) * overlap;
                let pushZ = (distZ / dist) * overlap;

                // Transform back to world space
                if (Math.abs(rotation) > 0.01) {
                    const cos = Math.cos(rotation);
                    const sin = Math.sin(rotation);
                    const worldPushX = pushX * cos - pushZ * sin;
                    const worldPushZ = pushX * sin + pushZ * cos;
                    result.x += worldPushX;
                    result.z += worldPushZ;
                } else {
                    result.x += pushX;
                    result.z += pushZ;
                }
            }
        }

        return result;
    }

    /**
     * Clear current map (walls, portals, and doors)
     */
    private clearCurrentMap(): void {
        // Remove all walls
        for (const wall of this.mapWalls) {
            this.scene.remove(wall);
            wall.geometry.dispose();
            if (wall.material instanceof THREE.Material) {
                wall.material.dispose();
            }
        }
        this.mapWalls = [];

        // Clear portals
        this.portalSystem.clear();

        // Clear doors
        if (this.doorSystem) {
            this.doorSystem.clear();
        }

        // Clear room visibility system
        if (this.roomVisibilityManager) {
            this.roomVisibilityManager.dispose();
        }

        console.log('[Game] Cleared current map');
    }

    /**
     * Legacy map loading (fallback when JSON loading fails)
     */
    private loadLegacyMap(): void {
        // Fallback: create basic boundary walls only
        const mapGen = new MapGenerator(this.scene);
        mapGen.generate();

        this.currentMapName = 'legacy';
        console.log('[Game] Loaded legacy hardcoded map');
    }

    /**
     * Get current map name (for Dev Console)
     */
    public getCurrentMapName(): string {
        return this.currentMapName || 'none';
    }

    /**
     * Get map info (for Dev Console)
     */
    public getMapInfo(): { name: string; objects: number; portals: number; walls: number } {
        const info = this.mapLoader.getMapInfo();
        return {
            name: info.name,
            objects: info.objects,
            portals: info.portals,
            walls: info.walls
        };
    }

    /**
     * Get available maps (for Dev Console)
     */
    public getAvailableMaps(): string[] {
        return this.mapLoader.getAvailableMaps();
    }

    private createGround() {
        // Inner floor (gray, visible area within walls)
        const innerFloorGeo = new THREE.PlaneGeometry(196, 196, 50, 50);
        const innerFloorMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.1
        });
        // Apply player-centered fog to floor material
        if (this.playerFogSystem) {
            this.playerFogSystem.applyToMaterial(innerFloorMat);
        }
        const innerFloor = new THREE.Mesh(innerFloorGeo, innerFloorMat);
        innerFloor.rotation.x = -Math.PI / 2;
        innerFloor.position.y = 0.01;
        innerFloor.receiveShadow = true;
        this.scene.add(innerFloor);
        this.mapFloor = innerFloor;
        this.disposableManager.track(innerFloor);

        // Outer background (dark) - also with fog
        const outerFloorGeo = new THREE.PlaneGeometry(400, 400, 50, 50);
        const outerFloorMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            roughness: 0.9,
            metalness: 0.1
        });
        if (this.playerFogSystem) {
            this.playerFogSystem.applyToMaterial(outerFloorMat);
        }
        const outerFloor = new THREE.Mesh(outerFloorGeo, outerFloorMat);
        outerFloor.rotation.x = -Math.PI / 2;
        outerFloor.position.y = -0.01;
        outerFloor.receiveShadow = true;
        this.scene.add(outerFloor);
        this.disposableManager.track(outerFloor);
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

        // Handle cursor visibility based on game state
        const shouldShowGameCursor = !this.gameState.isLevelingUp && !this.gameState.isPaused && !this.gameState.isGameOver;
        if (this.characterCursor) {
            this.characterCursor.setVisible(shouldShowGameCursor);
        }
        if (this.canvas) {
            this.canvas.style.cursor = shouldShowGameCursor ? 'none' : 'default';
            // Also set on parent container for when overlays are shown
            if (this.canvas.parentElement) {
                this.canvas.parentElement.style.cursor = shouldShowGameCursor ? 'none' : 'default';
            }
        }

        if (this.gameState.isLevelingUp || this.gameState.isPaused || this.gameState.isGameOver) return;

        let delta = this.clock.getDelta();

        // Update SimpleTween animations (for room lighting transitions)
        SimpleTween.update(delta);

        // Apply time scale (debug speed control)
        delta *= this.timeScale;

        const currentTime = this.clock.getElapsedTime();

        // Update player damage immunity timer
        if (this.playerDamageImmunityTime > 0) {
            this.playerDamageImmunityTime -= delta;
        }

        if (this.player) {
            this.player.update(delta, this.keys);

            // ========== WALK SOUND DETECTION ==========
            // Check if player is moving (WASD keys)
            const isCurrentlyWalking = (this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d']) && !this.player.isDead;

            if (isCurrentlyWalking && !this.wasPlayerWalking) {
                // Started walking
                this.audioService.startWalking(this.currentCharacterId);
            } else if (!isCurrentlyWalking && this.wasPlayerWalking) {
                // Stopped walking
                this.audioService.stopWalking();
            }
            this.wasPlayerWalking = isCurrentlyWalking;
            // ========================================

            // Update character cursor (3D targeting reticle)
            if (this.characterCursor) {
                const worldPos = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);
                this.characterCursor.update(worldPos, delta);
            }

            // Update player-centered fog system
            if (this.playerFogSystem) {
                this.playerFogSystem.update(this.player.mesh.position);
            }

            // Update room visibility system (room detection, lighting)
            if (this.roomVisibilityManager) {
                this.roomVisibilityManager.update(this.player.mesh.position, delta);
            }

            // Skip game logic if player is dead
            if (this.player.isDead) {
                this.renderer.render(this.scene, this.camera);
                return;
            }

            // UPDATE ABILITY: Called every frame for continuous ability logic
            if (this.characterAbility) {
                this.characterAbility.update(delta, this.scene, this.player, this.enemies);
            }

            // Update charge system (if charging)
            if (this.player.isChargingAttack()) {
                if (this.currentCharacterId === 'proyecto-y') {
                    // Proyecto-Y: Update charge phase and direction
                    const worldPos = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);
                    this.player.updateProyectoYCharge(delta, worldPos);
                } else if (this.currentCharacterId === 'lars') {
                    // Lars: Update visual effects
                    this.updateChargeVisualEffects();
                }
            }

            // Auto-shoot at nearest enemy (not used by Lars - uses manual charge system)
            this.autoShoot();

            // Enemy collision with player (ONLY from enemy attacks)
            this.checkEnemyAttackCollision(currentTime);

            // Update portal system
            if (this.portalSystem) {
                this.portalSystem.update(delta);
            }

            // Update door system (animations + proximity auto-open)
            const playerX = this.player.mesh.position.x;
            const playerZ = this.player.mesh.position.z;
            if (this.doorSystem) {
                // Pass player position for auto-open/close proximity detection
                this.doorSystem.update(delta, playerX, playerZ);

                // Check door collision - prevent player from walking through closed doors
                const collidingDoor = this.doorSystem.checkCollision(
                    playerX,
                    playerZ,
                    PlayerThree.COLLISION_RADIUS
                );
                if (collidingDoor) {
                    // Push player away from closed door
                    const doorPos = collidingDoor.config.position;
                    const dx = playerX - doorPos.x;
                    const dz = playerZ - doorPos.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist > 0.1) {
                        const pushStrength = 0.5;
                        this.player.mesh.position.x += (dx / dist) * pushStrength;
                        this.player.mesh.position.z += (dz / dist) * pushStrength;
                    }
                }
            }

            // Wall collision for player (using room visibility system)
            if (this.roomVisibilityManager) {
                const collision = this.roomVisibilityManager.resolvePlayerCollision(
                    this.player.mesh.position,
                    0, 0,  // No velocity tracking yet, use position-based collision
                    PlayerThree.COLLISION_RADIUS,
                    delta
                );
                // Apply push-back if collision detected (non-zero delta returned)
                if (collision.x !== 0 || collision.z !== 0) {
                    this.player.mesh.position.x += collision.x;
                    this.player.mesh.position.z += collision.z;
                }
            }

            // Wall collision for player (using map walls from JSON)
            if (this.mapWalls.length > 0) {
                const wallCollision = this.checkMapWallCollision(
                    this.player.mesh.position.x,
                    this.player.mesh.position.z,
                    PlayerThree.COLLISION_RADIUS
                );
                if (wallCollision.x !== 0 || wallCollision.z !== 0) {
                    this.player.mesh.position.x += wallCollision.x;
                    this.player.mesh.position.z += wallCollision.z;
                }
            }

            // Spawn enemies (only if portals exist)
            if (this.autoSpawningEnabled && this.portalSystem.hasPortals() && currentTime - this.lastSpawnTime > 2) {
                this.spawnEnemy(Math.random() < 0.6 ? 'spider' : 'worm');
                this.lastSpawnTime = currentTime;
            }

            // Update enemies (with wall collision AND attack behavior)
            const isPlayerInvisible = this.gameState.invisible;
            this.enemies.forEach(enemy => enemy.update(delta, this.player, 98, currentTime, isPlayerInvisible, this.enemies));

            // Check door collision for enemies - push them away from closed doors
            if (this.doorSystem) {
                this.enemies.forEach(enemy => {
                    if (enemy.isDead) return;
                    const enemyX = enemy.mesh.position.x;
                    const enemyZ = enemy.mesh.position.z;
                    const collidingDoor = this.doorSystem.checkCollision(
                        enemyX,
                        enemyZ,
                        EnemyThree.COLLISION_RADIUS
                    );
                    if (collidingDoor) {
                        // Push enemy away from closed door
                        const doorPos = collidingDoor.config.position;
                        const dx = enemyX - doorPos.x;
                        const dz = enemyZ - doorPos.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist > 0.1) {
                            const pushStrength = 0.4;
                            enemy.mesh.position.x += (dx / dist) * pushStrength;
                            enemy.mesh.position.z += (dz / dist) * pushStrength;
                        }
                    }
                });
            }

            // Wall collision for enemies (using room visibility system)
            if (this.roomVisibilityManager) {
                this.enemies.forEach(enemy => {
                    if (enemy.isDead) return;
                    const targetPos = this.player.mesh.position;
                    const resolvedPos = this.roomVisibilityManager.resolveEnemyCollision(
                        enemy.mesh.position,
                        targetPos,
                        0,  // Speed not needed for position-based resolution
                        EnemyThree.COLLISION_RADIUS,
                        delta
                    );
                    // Update enemy position if collision resolved
                    enemy.mesh.position.copy(resolvedPos);
                });
            }

            // Wall collision for enemies (using map walls from JSON)
            if (this.mapWalls.length > 0) {
                this.enemies.forEach(enemy => {
                    if (enemy.isDead) return;
                    const wallCollision = this.checkMapWallCollision(
                        enemy.mesh.position.x,
                        enemy.mesh.position.z,
                        EnemyThree.COLLISION_RADIUS
                    );
                    if (wallCollision.x !== 0 || wallCollision.z !== 0) {
                        enemy.mesh.position.x += wallCollision.x;
                        enemy.mesh.position.z += wallCollision.z;
                    }
                });
            }

            // Clean up enemies killed by mind-controlled allies
            this.enemies = this.enemies.filter(e => !e.isDead);

            // Update spatial grid for optimized collision detection (O(n+m) instead of O(n×m))
            this.enemySpatialGrid.update(this.enemies);

            // Update Projectiles & Collision (using spatial grid)
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const proj = this.projectiles[i];
                proj.update(delta);

                if (proj.isDead) {
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // Collision with Enemies - use spatial grid for O(1) lookup
                const nearbyEnemies = this.enemySpatialGrid.getNearby(proj.mesh.position, 3);
                let projectileHit = false;

                for (const enemy of nearbyEnemies) {
                    if (projectileHit) break;

                    // Skip mind-controlled enemies (minions) - don't damage allies!
                    if (enemy.isMindControlled || enemy.isDead) continue;

                    if (proj.mesh.position.distanceTo(enemy.mesh.position) < 1.5) {
                        // Apply damage multiplier if set
                        let damage = proj.damage;
                        if (this.gameState.damageMultiplier !== 1) {
                            damage *= this.gameState.damageMultiplier;
                        }

                        // CALL ABILITY HOOK: onProjectileHit (for Chain Lightning, Mind Control, etc.)
                        if (this.characterAbility) {
                            this.characterAbility.onProjectileHit(
                                proj,
                                enemy,
                                damage,
                                this.scene,
                                this.enemies
                            );
                        }

                        const enemyType = enemy.getType();

                        // Apply berserk damage if active (one-hit kill)
                        let finalDamage = damage;
                        if (this.characterAbility instanceof ProyectoAAbilityThree) {
                            const projectAAbility = this.characterAbility as ProyectoAAbilityThree;
                            if (projectAAbility.isBerserkActive()) {
                                finalDamage = 999999; // One-hit kill during berserk
                            }
                            // Apply damage multiplier (fury)
                            finalDamage *= projectAAbility.getDamageMultiplier();
                        }

                        const reward = enemy.takeDamage(finalDamage, this.scene);
                        if (reward) {
                            // Add XP and score directly (no orbs)
                            this.addXp(reward.xp);
                            this.gameState.score += reward.score;
                            // Enemy is marked as dead, will be filtered next frame
                            // Play enemy death sound
                            this.audioService.playEnemyDeath(enemyType);

                            // Register kill for Project A berserk counter
                            if (this.characterAbility instanceof ProyectoAAbilityThree) {
                                const projectAAbility = this.characterAbility as ProyectoAAbilityThree;
                                projectAAbility.registerKill();

                                // Berserk mode: heal on every kill
                                if (projectAAbility.isBerserkActive() && projectAAbility.berserkFullLifesteal) {
                                    const healAmount = Math.ceil(this.gameState.maxHealth * 0.05);
                                    const actualHeal = Math.min(
                                        healAmount,
                                        this.gameState.maxHealth - this.gameState.health
                                    );
                                    if (actualHeal > 0) {
                                        this.gameState.health += actualHeal;
                                        // Show heal effect
                                        projectAAbility.createHealEffect(actualHeal);
                                        // Check health warning (stop heartbeat if healed above threshold)
                                        this.audioService.checkHealthWarning(this.gameState.health, this.gameState.maxHealth, 15);
                                    }
                                }
                            }

                            // PROJECT A LIFESTEAL: Robar vida cuando el proyectil golpea
                            if (this.characterAbility && this.characterAbility.name === 'Titan Strength') {
                                const projectAAbility = this.characterAbility as ProyectoAAbilityThree;
                                projectAAbility.applyLifesteal(damage, 1);
                            }

                            // Destroy projectile
                            proj.mesh.visible = false;
                            this.projectiles.splice(i, 1);
                            projectileHit = true;
                        }
                    }
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

        // Play level up sound
        this.audioService.play('level-up');

        // Stop other sounds when leveling up
        this.audioService.stopHealthWarning();
        this.audioService.stopWalking();
        this.wasPlayerWalking = false;

        console.log('LEVEL UP!');
    }

    public resumeGame() {
        this.gameState.isLevelingUp = false;
        this.gameState.isPaused = false;
        this.clock.getDelta(); // Reset delta to avoid huge jump
    }

    public pauseGame() {
        this.gameState.isPaused = true;
        this.audioService.stopWalking();
        this.wasPlayerWalking = false;
    }

    public togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        if (this.gameState.isPaused) {
            // Stop walk sounds when paused
            this.audioService.stopWalking();
            this.wasPlayerWalking = false;
        } else {
            this.clock.getDelta();
        }
    }





    // Check collision between player and enemies (ONLY when enemy attacks)
    private checkEnemyAttackCollision(currentTime: number) {
        // God Mode Check
        if (this.gameState.godMode) return;
        // Invisibility Check - enemies shouldn't attack if invisible (simplified logic for now)
        if (this.gameState.invisible) return;

        // Calculate collision threshold: sum of both radii
        const collisionDistance = PlayerThree.COLLISION_RADIUS + EnemyThree.COLLISION_RADIUS;

        // Reset stats
        this.collisionChecksPerFrame = 0;
        this.enemiesCheckedPerFrame = 0;

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            // Skip mind-controlled enemies (minions) - they don't attack the player!
            if (enemy.isMindControlled) continue;

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

                // Check if player is currently immune from recent damage
                const isPlayerImmune = this.playerDamageImmunityTime > 0;

                if (!damageAlreadyDealt && !isPlayerImmune) {
                    // Get base damage from enemy
                    let damageAmount = enemy.getAttackDamage();

                    // CALL ABILITY HOOK: onEnemyHitPlayer (for dodge, thorns, etc.)
                    if (this.characterAbility) {
                        damageAmount = this.characterAbility.onEnemyHitPlayer(
                            enemy,
                            this.player,
                            damageAmount,
                            this.scene
                        );
                    }

                    // Apply damage to player
                    this.gameState.health -= damageAmount;

                    // Cancel charge if hit while charging (Lars and Proyecto-Y)
                    if ((this.currentCharacterId === 'lars' || this.currentCharacterId === 'proyecto-y') && this.player.isChargingAttack()) {
                        this.player.cancelCharge();
                        this.clearChargeVisualEffects();
                        this.isMouseDown = false;
                        console.log('[LARS] Charge cancelled due to damage!');
                    }

                    // Play hit sounds
                    this.audioService.playHit(this.currentCharacterId);
                    this.audioService.playEnemyAttack(enemy.getType());

                    // Check health warning (15% threshold)
                    this.audioService.checkHealthWarning(this.gameState.health, this.gameState.maxHealth, 15);

                    // Set player damage immunity to prevent multiple hits within 100ms
                    this.playerDamageImmunityTime = this.playerDamageImmunityDuration;

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
                            // Always restore to white (0xffffff) - the true original color
                            // This prevents the bug where rapid damage would capture red as "original"
                            material.color.setHex(0xff3333); // Red flash

                            setTimeout(() => {
                                material.color.setHex(0xffffff); // Always restore to white
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

        // Play death sound and stop all other sounds
        this.audioService.playDeath(this.currentCharacterId);
        this.audioService.stopHealthWarning();
        this.audioService.stopWalking();
        this.audioService.stopMusic();

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

        // STEP 3: Show glass break effect and wait for death animation
        // Death animation lasts 2 seconds total
        // Fade out begins 1 second before the end (at 1 second mark)
        glassEffect.animate();

        // Wait 1 second before starting fade out
        await new Promise(resolve => setTimeout(resolve, 1000));

        // STEP 4: Fade out the player sprite over 1 second (starts at 1s, ends at 2s)
        if (this.player) {
            await this.player.fadeOut(1.0);
        }

        // STEP 5: Clean up glass effect
        glassEffect.destroy();

        // STEP 6: Show game over screen immediately after fade out completes
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
        this.gameState = createInitialGameState();

        // Reset timers and states
        this.lastSpawnTime = 0;
        this.lastShootTime = 0;
        this.wasPlayerWalking = false;

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
        this.gameState = createInitialGameState();

        // Reset camera position
        this.camera.position.set(0, 25, 20);
        this.camera.lookAt(0, 0, 0);

        // Create new player
        this.player = new PlayerThree(this.scene, this.currentCharacterId);

        // Reinitialize character ability for new player
        this.initializeCharacterAbility(this.currentCharacterId);

        // Recreate character cursor
        if (this.characterCursor) {
            this.characterCursor.dispose();
        }
        this.characterCursor = new CharacterCursor(this.scene, this.currentCharacterId);

        // Reset timers and states
        this.lastSpawnTime = 0;
        this.lastShootTime = 0;
        this.wasPlayerWalking = false;
        this.audioService.stopWalking();
        this.clock.start(); // Restart the clock

        // Restart gameplay music
        this.audioService.playGameplayMusic();

        // Resume game rendering
        this.render();
    }

    // ========== Character Ability System ==========

    /**
     * Initialize character-specific ability based on selected character
     */
    private initializeCharacterAbility(characterId: string): void {
        switch (characterId) {
            case 'proyecto-a':
                this.characterAbility = new ProyectoAAbilityThree();
                break;
            case 'lars':
                this.characterAbility = new LarsAbilityThree();
                break;
            case 'proyecto-y':
                this.characterAbility = new ProyectoYAbilityThree();
                break;
            default:
                this.characterAbility = new ProyectoAAbilityThree();
        }

        // Initialize the ability with game state reference
        this.characterAbility.initialize(this.scene, this.player, this.gameState);

        // Set up audio callbacks for each character
        if (characterId === 'proyecto-a' && this.characterAbility) {
            const projectAAbility = this.characterAbility as ProyectoAAbilityThree;
            projectAAbility.setGameState(this.gameState);
            // Connect heal sound callback
            projectAAbility.onHealCallback = () => {
                this.audioService.play('proyecto-a-heal');
            };
            // Connect berserk activation sound callback
            projectAAbility.onBerserkActivateCallback = () => {
                this.audioService.playBerserk();
            };
            // Connect health changed callback to check heartbeat sound
            projectAAbility.onHealthChangedCallback = () => {
                this.audioService.checkHealthWarning(this.gameState.health, this.gameState.maxHealth, 15);
            };
        }

        if (characterId === 'lars' && this.characterAbility) {
            const larsAbility = this.characterAbility as LarsAbilityThree;
            // Connect mind control sound callback
            larsAbility.onMindControlCallback = () => {
                this.audioService.play('lars-mind-control');
            };
            // Connect minion explosion sound callback
            larsAbility.onMinionExplodeCallback = () => {
                this.audioService.playMinionExplode();
            };
        }

        if (characterId === 'proyecto-y' && this.characterAbility) {
            const projectYAbility = this.characterAbility as ProyectoYAbilityThree;
            // Connect chain lightning sound callback
            projectYAbility.onChainLightningCallback = () => {
                this.audioService.play('proyecto-y-shoot-chain');
            };
        }

        // Store reference to ability in player for potential direct access
        (this.player as any).ability = this.characterAbility;
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
