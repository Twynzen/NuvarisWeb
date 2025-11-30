import * as THREE from 'three';
import { SimpleTween } from '../utils/simple-tween';
import {
    RoomInstance,
    RoomLightInstance,
    LightingPreset,
    LIGHTING_PRESETS,
    RoomBiome
} from './room-system';

/**
 * Room Lighting System
 *
 * Manages dynamic lighting based on which room the player is in:
 * - Turns on lights in current room
 * - Turns on lights in adjacent rooms with open doors
 * - Smooth transitions for fade in/out (using SimpleTween)
 * - Manages ambient light and fog per room biome
 */
export class RoomLightingSystem {
    private scene: THREE.Scene;
    private camera: THREE.Camera;

    // Shared lights
    private ambientLight: THREE.AmbientLight;
    private playerLight: THREE.SpotLight;  // Changed to SpotLight for shadow casting

    // Room lights registry
    private roomLights: Map<string, RoomLightInstance[]> = new Map();

    // Currently active lights
    private activeLights: Set<RoomLightInstance> = new Set();

    // Current state
    private currentBiome: RoomBiome = 'laboratory';

    // Configuration
    private readonly TRANSITION_DURATION = 0.4;  // seconds

    // Layer constants (matching room-system)
    private readonly LAYER_SHARED = 0;
    private readonly LAYER_ROOM_START = 1;

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;

        // Create shared ambient light (reduced for darker areas)
        this.ambientLight = new THREE.AmbientLight(0x111122, 0.15);
        this.scene.add(this.ambientLight);

        // Create player-following SpotLight with shadow casting
        // SpotLight(color, intensity, distance, angle, penumbra, decay)
        this.playerLight = new THREE.SpotLight(
            0xffe4c4,   // Warm torch color
            2.5,        // Increased intensity for spotlight
            35,         // Distance
            Math.PI / 3, // Angle (60 degrees cone)
            0.5,        // Penumbra (soft edge)
            1.5         // Decay
        );
        this.playerLight.position.set(0, 12, 0);  // Higher position for top-down
        this.playerLight.target.position.set(0, 0, 0);  // Point downward

        // Enable shadow casting
        this.playerLight.castShadow = true;
        this.playerLight.shadow.mapSize.width = 1024;
        this.playerLight.shadow.mapSize.height = 1024;
        this.playerLight.shadow.camera.near = 1;
        this.playerLight.shadow.camera.far = 40;
        this.playerLight.shadow.camera.fov = 60;
        this.playerLight.shadow.bias = -0.001;  // Reduce shadow acne
        this.playerLight.shadow.radius = 2;     // Soft shadows

        this.playerLight.layers.enableAll();
        this.scene.add(this.playerLight);
        this.scene.add(this.playerLight.target);  // Important: add target to scene

        // Initialize camera layers
        this.camera.layers.enable(this.LAYER_SHARED);
    }

    /**
     * Update tweens - must be called each frame
     */
    public update(deltaTime: number): void {
        SimpleTween.update(deltaTime);
    }

    /**
     * Register lights for a room
     */
    public registerRoomLights(room: RoomInstance): void {
        const lights: RoomLightInstance[] = [];

        for (const lightDef of room.template.lights) {
            let light: THREE.PointLight | THREE.SpotLight;

            if (lightDef.type === 'spot') {
                light = new THREE.SpotLight(
                    lightDef.color,
                    0,  // Start at 0 intensity
                    lightDef.distance,
                    lightDef.angle || Math.PI / 4,
                    lightDef.penumbra || 0.3,
                    lightDef.decay || 2
                );
            } else {
                light = new THREE.PointLight(
                    lightDef.color,
                    0,  // Start at 0 intensity
                    lightDef.distance,
                    lightDef.decay || 2
                );
            }

            // Calculate world position
            const worldPos = new THREE.Vector3(
                room.worldPosition.x + lightDef.localPosition.x,
                lightDef.localPosition.y,
                room.worldPosition.z + lightDef.localPosition.z
            );
            light.position.copy(worldPos);

            // Configure shadows (only for designated lights)
            if (lightDef.castShadow) {
                light.castShadow = true;
                light.shadow.mapSize.set(512, 512);
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = lightDef.distance;
            }

            // Assign to room's layer
            light.layers.set(room.layer);

            // Add to scene
            this.scene.add(light);

            // Create instance record
            const instance: RoomLightInstance = {
                id: `${room.id}_${lightDef.id}`,
                light,
                baseIntensity: lightDef.intensity,
                isActive: false
            };

            lights.push(instance);
        }

        this.roomLights.set(room.id, lights);
    }

    /**
     * Unregister lights for a room
     */
    public unregisterRoomLights(roomId: string): void {
        const lights = this.roomLights.get(roomId);
        if (!lights) return;

        for (const lightInstance of lights) {
            // Kill any running animations
            SimpleTween.killTweensOf(lightInstance.light);

            // Remove from scene
            this.scene.remove(lightInstance.light);

            // Dispose shadow map if exists
            if (lightInstance.light.shadow?.map) {
                lightInstance.light.shadow.map.dispose();
            }
        }

        this.roomLights.delete(roomId);
    }

    /**
     * Update visibility when player enters a new room
     */
    public onRoomEnter(
        currentRoom: RoomInstance,
        visibleRooms: RoomInstance[]
    ): void {
        // Collect all lights that should be active
        const shouldBeActive = new Set<RoomLightInstance>();

        for (const room of visibleRooms) {
            const lights = this.roomLights.get(room.id);
            if (lights) {
                lights.forEach(l => shouldBeActive.add(l));
            }
        }

        // Fade out lights that should no longer be active
        for (const light of this.activeLights) {
            if (!shouldBeActive.has(light)) {
                this.fadeOutLight(light);
            }
        }

        // Fade in lights that should now be active
        for (const light of shouldBeActive) {
            if (!this.activeLights.has(light)) {
                this.fadeInLight(light);
            }
        }

        // Update active set
        this.activeLights = shouldBeActive;

        // Update ambient light and fog based on biome AND room size
        this.updateBiomeLighting(currentRoom.template.biome, currentRoom);

        // Update camera layers
        this.updateCameraLayers(visibleRooms);
    }

    /**
     * Fade in a light smoothly
     */
    private fadeInLight(lightInstance: RoomLightInstance): void {
        lightInstance.isActive = true;

        SimpleTween.killTweensOf(lightInstance.light);
        SimpleTween.to(
            lightInstance.light,
            { intensity: lightInstance.baseIntensity },
            this.TRANSITION_DURATION,
            'easeOut'
        );
    }

    /**
     * Fade out a light smoothly
     */
    private fadeOutLight(lightInstance: RoomLightInstance): void {
        lightInstance.isActive = false;

        SimpleTween.killTweensOf(lightInstance.light);
        SimpleTween.to(
            lightInstance.light,
            { intensity: 0 },
            this.TRANSITION_DURATION,
            'easeIn'
        );
    }

    /**
     * Update ambient light and fog based on room biome and size
     * Fog is adjusted so the current room is ALWAYS clear (no fog inside)
     */
    private updateBiomeLighting(biome: RoomBiome, currentRoom?: RoomInstance): void {
        const preset = LIGHTING_PRESETS[biome];
        const biomeChanged = biome !== this.currentBiome;
        this.currentBiome = biome;

        // Only update ambient if biome changed
        if (biomeChanged) {
            // Animate ambient light color transition
            const targetR = ((preset.ambient.color >> 16) & 255) / 255;
            const targetG = ((preset.ambient.color >> 8) & 255) / 255;
            const targetB = (preset.ambient.color & 255) / 255;

            SimpleTween.to(
                this.ambientLight.color,
                { r: targetR, g: targetG, b: targetB },
                this.TRANSITION_DURATION,
                'easeInOut'
            );

            SimpleTween.to(
                this.ambientLight,
                { intensity: preset.ambient.intensity },
                this.TRANSITION_DURATION,
                'easeInOut'
            );
        }

        // Update fog - ALWAYS adjust based on current room size
        if (preset.fog && this.scene.fog instanceof THREE.Fog) {
            // Calculate fog.near based on room size so room is CLEAR
            let fogNear = preset.fog.near;
            let fogFar = preset.fog.far;

            if (currentRoom?.bounds) {
                // Get room diagonal (max distance from center to corner)
                const size = new THREE.Vector3();
                currentRoom.bounds.getSize(size);
                const roomDiagonal = Math.sqrt(size.x * size.x + size.z * size.z) / 2;

                // fog.near should be at least roomDiagonal + buffer
                // This ensures the entire room is fog-free
                const buffer = 5; // Extra clear space beyond room edge
                fogNear = Math.max(preset.fog.near, roomDiagonal + buffer);

                // Adjust far proportionally
                fogFar = fogNear + (preset.fog.far - preset.fog.near);

                console.log(`[RoomLighting] Room ${currentRoom.id}: diagonal=${roomDiagonal.toFixed(1)}, fogNear=${fogNear.toFixed(1)}, fogFar=${fogFar.toFixed(1)}`);
            }

            SimpleTween.to(
                this.scene.fog,
                { near: fogNear, far: fogFar },
                this.TRANSITION_DURATION,
                'easeInOut'
            );

            // Update fog color if biome changed
            if (biomeChanged) {
                const fogR = ((preset.fog.color >> 16) & 255) / 255;
                const fogG = ((preset.fog.color >> 8) & 255) / 255;
                const fogB = (preset.fog.color & 255) / 255;

                SimpleTween.to(
                    this.scene.fog.color,
                    { r: fogR, g: fogG, b: fogB },
                    this.TRANSITION_DURATION,
                    'easeInOut'
                );
            }
        }
    }

    /**
     * Update camera layers to only see visible rooms
     */
    private updateCameraLayers(visibleRooms: RoomInstance[]): void {
        // Disable all room layers
        for (let i = this.LAYER_ROOM_START; i < 32; i++) {
            this.camera.layers.disable(i);
        }

        // Enable visible room layers
        for (const room of visibleRooms) {
            this.camera.layers.enable(room.layer);
        }
    }

    /**
     * Update player light position (call each frame)
     */
    public updatePlayerLight(playerPosition: THREE.Vector3): void {
        // Position light above player
        this.playerLight.position.set(
            playerPosition.x,
            playerPosition.y + 12,  // Higher for better shadow coverage
            playerPosition.z
        );

        // Point spotlight at player position (on ground)
        this.playerLight.target.position.set(
            playerPosition.x,
            0,
            playerPosition.z
        );
    }

    /**
     * Set player light intensity (for torch power-ups, etc.)
     */
    public setPlayerLightIntensity(intensity: number): void {
        SimpleTween.to(this.playerLight, { intensity }, 0.3, 'easeOut');
    }

    /**
     * Set player light distance (for torch upgrades)
     */
    public setPlayerLightDistance(distance: number): void {
        SimpleTween.to(this.playerLight, { distance }, 0.5, 'easeOut');
    }

    /**
     * Flash effect for damage or events
     */
    public flashRoomLights(roomId: string, color: number, duration: number = 0.1): void {
        const lights = this.roomLights.get(roomId);
        if (!lights) return;

        for (const lightInstance of lights) {
            const originalColor = lightInstance.light.color.getHex();

            lightInstance.light.color.setHex(color);

            setTimeout(() => {
                lightInstance.light.color.setHex(originalColor);
            }, duration * 1000);
        }
    }

    /**
     * Create emergency/alarm lighting effect
     */
    public setAlarmMode(roomId: string, enabled: boolean): void {
        const lights = this.roomLights.get(roomId);
        if (!lights) return;

        if (enabled) {
            for (const lightInstance of lights) {
                // Store original values
                (lightInstance as any)._originalColor = lightInstance.light.color.getHex();
                (lightInstance as any)._originalIntensity = lightInstance.baseIntensity;

                // Set to red immediately
                lightInstance.light.color.setRGB(1, 0, 0);

                // Pulsing alarm effect
                SimpleTween.to(
                    lightInstance.light,
                    { intensity: lightInstance.baseIntensity * 1.5 },
                    0.5,
                    'sine.inOut',
                    { yoyo: true, repeat: -1 }
                );
            }
        } else {
            for (const lightInstance of lights) {
                SimpleTween.killTweensOf(lightInstance.light);

                // Restore original values
                const originalColor = (lightInstance as any)._originalColor;
                const originalIntensity = (lightInstance as any)._originalIntensity;

                if (originalColor !== undefined) {
                    lightInstance.light.color.setHex(originalColor);
                }

                if (originalIntensity !== undefined) {
                    SimpleTween.to(
                        lightInstance.light,
                        { intensity: originalIntensity },
                        0.3,
                        'easeOut'
                    );
                }
            }
        }
    }

    /**
     * Get all active lights (for debugging)
     */
    public getActiveLights(): RoomLightInstance[] {
        return Array.from(this.activeLights);
    }

    /**
     * Initialize fog for the scene
     */
    public initializeFog(biome: RoomBiome = 'laboratory'): void {
        const preset = LIGHTING_PRESETS[biome];

        if (preset.fog) {
            this.scene.fog = new THREE.Fog(
                preset.fog.color,
                preset.fog.near,
                preset.fog.far
            );
        }
    }

    /**
     * Clear all room lights without disposing shared lights
     * Used when loading a new map
     */
    public clearAllLights(): void {
        // Kill all tweens and remove room lights
        for (const [, lights] of this.roomLights) {
            for (const lightInstance of lights) {
                SimpleTween.killTweensOf(lightInstance.light);
                this.scene.remove(lightInstance.light);
            }
        }

        this.roomLights.clear();
        this.activeLights.clear();

        console.log('[RoomLightingSystem] Cleared all room lights');
    }

    /**
     * Clean up all lights
     */
    public dispose(): void {
        // Kill all tweens
        for (const [, lights] of this.roomLights) {
            for (const lightInstance of lights) {
                SimpleTween.killTweensOf(lightInstance.light);
                this.scene.remove(lightInstance.light);
            }
        }

        this.roomLights.clear();
        this.activeLights.clear();

        // Remove shared lights
        this.scene.remove(this.ambientLight);
        this.scene.remove(this.playerLight);

        // Clear all tweens
        SimpleTween.clear();
    }
}
