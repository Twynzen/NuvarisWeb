import * as THREE from 'three';

/**
 * Extended shader type for onBeforeCompile callback
 */
interface ShaderWithUniforms {
    uniforms: { [key: string]: { value: any } };
    vertexShader: string;
    fragmentShader: string;
}

/**
 * PlayerFogSystem - Fog radial centrado en el jugador CON oclusión por paredes
 *
 * Este sistema combina:
 * 1. Fog basado en distancia al jugador (no a la cámara)
 * 2. Oclusión por room bounds (lo que está fuera del room actual = oscuro total)
 *
 * Características:
 * - Burbuja de claridad alrededor del jugador
 * - Fragmentos FUERA del room actual = fog máximo
 * - Fragmentos DENTRO del room = fog normal basado en distancia
 * - Rooms adyacentes visibles pueden tener fog intermedio
 * - Actualización de parámetros en runtime sin recompilación
 *
 * Técnica: onBeforeCompile para inyectar shader chunks personalizados
 */

export interface PlayerFogConfig {
    fogColor: THREE.Color;
    fogNear: number;      // Radio interior de claridad total
    fogFar: number;       // Radio exterior donde fog es 100%
    roomOcclusionEnabled: boolean;  // Si true, fragmentos fuera del room = oscuro
    outsideRoomFogFactor: number;   // Factor de fog para fragmentos fuera del room (0.8-1.0)
}

export class PlayerFogSystem {
    private materialShaders: Map<THREE.Material, ShaderWithUniforms> = new Map();
    private playerPosition: THREE.Vector3 = new THREE.Vector3();
    private config: PlayerFogConfig;
    private scene: THREE.Scene;
    private isEnabled: boolean = true;

    // Room bounds for occlusion
    private currentRoomMin: THREE.Vector3 = new THREE.Vector3(-1000, -1000, -1000);
    private currentRoomMax: THREE.Vector3 = new THREE.Vector3(1000, 1000, 1000);
    private hasRoomBounds: boolean = false;

    // Visible rooms bounds (for adjacent rooms through doors)
    private visibleRoomsBounds: THREE.Box3[] = [];

    constructor(scene: THREE.Scene, config: Partial<PlayerFogConfig> = {}) {
        this.scene = scene;
        this.config = {
            fogColor: config.fogColor || new THREE.Color(0x0a0a0f),
            fogNear: config.fogNear ?? 18,
            fogFar: config.fogFar ?? 28,
            roomOcclusionEnabled: config.roomOcclusionEnabled ?? true,
            outsideRoomFogFactor: config.outsideRoomFogFactor ?? 0.95
        };

        // CRÍTICO: Scene.fog debe existir para activar USE_FOG define en los shaders
        this.scene.fog = new THREE.Fog(this.config.fogColor, 1, 100);
        this.scene.background = this.config.fogColor.clone();

        console.log(`[PlayerFogSystem] Initialized with fogNear=${this.config.fogNear}, fogFar=${this.config.fogFar}, roomOcclusion=${this.config.roomOcclusionEnabled}`);
    }

    /**
     * Aplica fog personalizado a un MeshStandardMaterial
     */
    public applyToMaterial(material: THREE.MeshStandardMaterial): void {
        if (!material) return;

        material.fog = true;

        material.onBeforeCompile = (shader: ShaderWithUniforms) => {
            // Uniforms básicos de fog
            shader.uniforms['uPlayerPosition'] = { value: this.playerPosition.clone() };
            shader.uniforms['uFogNear'] = { value: this.config.fogNear };
            shader.uniforms['uFogFar'] = { value: this.config.fogFar };
            shader.uniforms['uCustomFogColor'] = { value: this.config.fogColor.clone() };
            shader.uniforms['uFogEnabled'] = { value: this.isEnabled ? 1.0 : 0.0 };

            // Uniforms para room occlusion
            shader.uniforms['uRoomMin'] = { value: this.currentRoomMin.clone() };
            shader.uniforms['uRoomMax'] = { value: this.currentRoomMax.clone() };
            shader.uniforms['uRoomOcclusionEnabled'] = { value: this.config.roomOcclusionEnabled ? 1.0 : 0.0 };
            shader.uniforms['uOutsideRoomFogFactor'] = { value: this.config.outsideRoomFogFactor };
            shader.uniforms['uHasRoomBounds'] = { value: this.hasRoomBounds ? 1.0 : 0.0 };

            // Vertex shader - calcular world position
            shader.vertexShader = shader.vertexShader.replace(
                '#include <fog_pars_vertex>',
                `
                #ifdef USE_FOG
                    varying float vFogDepth;
                    varying vec3 vWorldPosition;
                #endif
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <fog_vertex>',
                `
                #ifdef USE_FOG
                    vFogDepth = -mvPosition.z;
                    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                #endif
                `
            );

            // Fragment shader - fog con oclusión por room
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <fog_pars_fragment>',
                `
                #ifdef USE_FOG
                    uniform vec3 fogColor;
                    uniform vec3 uPlayerPosition;
                    uniform float uFogNear;
                    uniform float uFogFar;
                    uniform vec3 uCustomFogColor;
                    uniform float uFogEnabled;

                    // Room occlusion uniforms
                    uniform vec3 uRoomMin;
                    uniform vec3 uRoomMax;
                    uniform float uRoomOcclusionEnabled;
                    uniform float uOutsideRoomFogFactor;
                    uniform float uHasRoomBounds;

                    varying float vFogDepth;
                    varying vec3 vWorldPosition;

                    // Función para verificar si un punto está dentro del room
                    bool isInsideRoom(vec3 pos) {
                        return pos.x >= uRoomMin.x && pos.x <= uRoomMax.x &&
                               pos.z >= uRoomMin.z && pos.z <= uRoomMax.z;
                    }

                    // Función para calcular distancia al borde del room más cercano
                    float distanceToRoomEdge(vec3 pos) {
                        float dx = min(abs(pos.x - uRoomMin.x), abs(pos.x - uRoomMax.x));
                        float dz = min(abs(pos.z - uRoomMin.z), abs(pos.z - uRoomMax.z));
                        return min(dx, dz);
                    }
                #endif
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <fog_fragment>',
                `
                #ifdef USE_FOG
                    if (uFogEnabled > 0.5) {
                        // Calcular distancia desde el jugador (XZ para top-down)
                        float distFromPlayer = length(vWorldPosition.xz - uPlayerPosition.xz);

                        // Fog base basado en distancia al jugador
                        float baseFogFactor = smoothstep(uFogNear, uFogFar, distFromPlayer);

                        float finalFogFactor = baseFogFactor;

                        // Aplicar oclusión por room si está habilitada
                        if (uRoomOcclusionEnabled > 0.5 && uHasRoomBounds > 0.5) {
                            bool insideRoom = isInsideRoom(vWorldPosition);

                            if (!insideRoom) {
                                // Fuera del room actual = fog casi máximo
                                // Pero con transición suave cerca del borde
                                float distToRoom = distanceToRoomEdge(vWorldPosition);
                                float edgeFade = smoothstep(0.0, 3.0, distToRoom);

                                // Mezclar entre fog normal y fog máximo
                                finalFogFactor = mix(baseFogFactor, uOutsideRoomFogFactor, edgeFade);
                            }
                        }

                        // Aplicar fog
                        gl_FragColor.rgb = mix(gl_FragColor.rgb, uCustomFogColor, finalFogFactor);
                    }
                #endif
                `
            );

            this.materialShaders.set(material, shader);
        };

        material.customProgramCacheKey = () => `playerFogMaterial_v3_${this.isEnabled}_${this.config.roomOcclusionEnabled}`;
    }

    /**
     * Actualizar posición del jugador - llamar cada frame
     */
    public update(playerPosition: THREE.Vector3): void {
        this.playerPosition.copy(playerPosition);

        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uPlayerPosition']) {
                shader.uniforms['uPlayerPosition'].value.copy(this.playerPosition);
            }
        });
    }

    /**
     * Establecer bounds del room actual para oclusión
     */
    public setCurrentRoomBounds(bounds: THREE.Box3 | null): void {
        if (bounds) {
            this.currentRoomMin.copy(bounds.min);
            this.currentRoomMax.copy(bounds.max);
            this.hasRoomBounds = true;

            // Expandir ligeramente los bounds para evitar artefactos en los bordes
            const expansion = 0.5;
            this.currentRoomMin.x -= expansion;
            this.currentRoomMin.z -= expansion;
            this.currentRoomMax.x += expansion;
            this.currentRoomMax.z += expansion;
        } else {
            // Sin bounds = todo visible (mapa abierto)
            this.currentRoomMin.set(-1000, -1000, -1000);
            this.currentRoomMax.set(1000, 1000, 1000);
            this.hasRoomBounds = false;
        }

        // Actualizar uniforms en todos los materiales
        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uRoomMin']) {
                shader.uniforms['uRoomMin'].value.copy(this.currentRoomMin);
            }
            if (shader.uniforms['uRoomMax']) {
                shader.uniforms['uRoomMax'].value.copy(this.currentRoomMax);
            }
            if (shader.uniforms['uHasRoomBounds']) {
                shader.uniforms['uHasRoomBounds'].value = this.hasRoomBounds ? 1.0 : 0.0;
            }
        });

        if (bounds) {
            console.log(`[PlayerFogSystem] Room bounds set: (${this.currentRoomMin.x.toFixed(1)}, ${this.currentRoomMin.z.toFixed(1)}) to (${this.currentRoomMax.x.toFixed(1)}, ${this.currentRoomMax.z.toFixed(1)})`);
        }
    }

    /**
     * Establecer bounds de múltiples rooms visibles (para rooms adyacentes)
     */
    public setVisibleRoomsBounds(roomBounds: THREE.Box3[]): void {
        this.visibleRoomsBounds = roomBounds;

        // Calcular bounds combinados de todos los rooms visibles
        if (roomBounds.length > 0) {
            const combinedBounds = new THREE.Box3();
            for (const bounds of roomBounds) {
                combinedBounds.union(bounds);
            }
            this.setCurrentRoomBounds(combinedBounds);
        }
    }

    /**
     * Habilitar/deshabilitar oclusión por room
     */
    public setRoomOcclusionEnabled(enabled: boolean): void {
        this.config.roomOcclusionEnabled = enabled;

        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uRoomOcclusionEnabled']) {
                shader.uniforms['uRoomOcclusionEnabled'].value = enabled ? 1.0 : 0.0;
            }
        });

        console.log(`[PlayerFogSystem] Room occlusion: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Establecer factor de fog para áreas fuera del room
     */
    public setOutsideRoomFogFactor(factor: number): void {
        this.config.outsideRoomFogFactor = Math.max(0, Math.min(1, factor));

        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uOutsideRoomFogFactor']) {
                shader.uniforms['uOutsideRoomFogFactor'].value = this.config.outsideRoomFogFactor;
            }
        });

        console.log(`[PlayerFogSystem] Outside room fog factor: ${this.config.outsideRoomFogFactor}`);
    }

    /**
     * Actualizar radio del fog en runtime
     */
    public setFogRadius(near: number, far: number): void {
        this.config.fogNear = near;
        this.config.fogFar = far;

        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uFogNear']) {
                shader.uniforms['uFogNear'].value = near;
            }
            if (shader.uniforms['uFogFar']) {
                shader.uniforms['uFogFar'].value = far;
            }
        });

        console.log(`[PlayerFogSystem] Radius updated: near=${near}, far=${far}`);
    }

    /**
     * Obtener radio actual del fog
     */
    public getFogRadius(): { near: number; far: number } {
        return { near: this.config.fogNear, far: this.config.fogFar };
    }

    /**
     * Actualizar color del fog en runtime
     */
    public setFogColor(color: THREE.Color | number): void {
        if (typeof color === 'number') {
            this.config.fogColor.setHex(color);
        } else {
            this.config.fogColor.copy(color);
        }

        if (this.scene.background instanceof THREE.Color) {
            this.scene.background.copy(this.config.fogColor);
        }

        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uCustomFogColor']) {
                shader.uniforms['uCustomFogColor'].value.copy(this.config.fogColor);
            }
        });

        console.log(`[PlayerFogSystem] Color updated: #${this.config.fogColor.getHexString()}`);
    }

    /**
     * Obtener color actual del fog
     */
    public getFogColor(): THREE.Color {
        return this.config.fogColor.clone();
    }

    /**
     * Habilitar/deshabilitar el fog completamente
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;

        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uFogEnabled']) {
                shader.uniforms['uFogEnabled'].value = enabled ? 1.0 : 0.0;
            }
        });

        if (enabled) {
            if (!this.scene.fog) {
                this.scene.fog = new THREE.Fog(this.config.fogColor, 1, 100);
            }
        } else {
            this.scene.fog = null;
        }

        console.log(`[PlayerFogSystem] ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Verificar si el fog está habilitado
     */
    public isActive(): boolean {
        return this.isEnabled;
    }

    /**
     * Obtener configuración actual
     */
    public getConfig(): PlayerFogConfig {
        return {
            fogColor: this.config.fogColor.clone(),
            fogNear: this.config.fogNear,
            fogFar: this.config.fogFar,
            roomOcclusionEnabled: this.config.roomOcclusionEnabled,
            outsideRoomFogFactor: this.config.outsideRoomFogFactor
        };
    }

    /**
     * Obtener número de materiales con fog aplicado
     */
    public getMaterialCount(): number {
        return this.materialShaders.size;
    }

    /**
     * Obtener si room occlusion está habilitada
     */
    public isRoomOcclusionEnabled(): boolean {
        return this.config.roomOcclusionEnabled;
    }

    /**
     * Obtener bounds del room actual
     */
    public getCurrentRoomBounds(): { min: THREE.Vector3; max: THREE.Vector3 } | null {
        if (!this.hasRoomBounds) return null;
        return {
            min: this.currentRoomMin.clone(),
            max: this.currentRoomMax.clone()
        };
    }

    /**
     * Dispose - limpiar recursos
     */
    public dispose(): void {
        this.materialShaders.clear();
        this.visibleRoomsBounds = [];
        console.log('[PlayerFogSystem] Disposed');
    }
}
