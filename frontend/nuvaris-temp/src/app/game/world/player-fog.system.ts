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
 * PlayerFogSystem - Fog radial centrado en el jugador
 *
 * Este sistema reemplaza el fog estándar de Three.js (basado en distancia a cámara)
 * con un fog personalizado que calcula la densidad basándose en la distancia al jugador.
 *
 * Características:
 * - Burbuja de claridad alrededor del jugador
 * - Transición suave de fogNear a fogFar
 * - Calculo en XZ (ignora altura para vista top-down)
 * - Compatible con MeshStandardMaterial
 * - Actualización de parámetros en runtime sin recompilación
 *
 * Técnica: onBeforeCompile para inyectar shader chunks personalizados
 */

export interface PlayerFogConfig {
    fogColor: THREE.Color;
    fogNear: number;      // Radio interior de claridad total
    fogFar: number;       // Radio exterior donde fog es 100%
}

export class PlayerFogSystem {
    private materialShaders: Map<THREE.Material, ShaderWithUniforms> = new Map();
    private playerPosition: THREE.Vector3 = new THREE.Vector3();
    private config: PlayerFogConfig;
    private scene: THREE.Scene;
    private isEnabled: boolean = true;

    constructor(scene: THREE.Scene, config: Partial<PlayerFogConfig> = {}) {
        this.scene = scene;
        this.config = {
            fogColor: config.fogColor || new THREE.Color(0x0a0a0f),
            fogNear: config.fogNear ?? 18,
            fogFar: config.fogFar ?? 28
        };

        // CRÍTICO: Scene.fog debe existir para activar USE_FOG define en los shaders
        // Usamos valores dummy ya que nuestro shader personalizado los reemplaza
        this.scene.fog = new THREE.Fog(this.config.fogColor, 1, 100);
        // También actualizar background para que coincida con fog color
        this.scene.background = this.config.fogColor.clone();

        console.log(`[PlayerFogSystem] Initialized with fogNear=${this.config.fogNear}, fogFar=${this.config.fogFar}`);
    }

    /**
     * Aplica fog personalizado a un MeshStandardMaterial
     * Llamar después de crear el material, antes del primer render
     */
    public applyToMaterial(material: THREE.MeshStandardMaterial): void {
        if (!material) return;

        material.fog = true; // Asegurar que fog esté habilitado

        material.onBeforeCompile = (shader: ShaderWithUniforms) => {
            // Añadir uniforms personalizados
            shader.uniforms['uPlayerPosition'] = { value: this.playerPosition.clone() };
            shader.uniforms['uFogNear'] = { value: this.config.fogNear };
            shader.uniforms['uFogFar'] = { value: this.config.fogFar };
            shader.uniforms['uCustomFogColor'] = { value: this.config.fogColor.clone() };
            shader.uniforms['uFogEnabled'] = { value: this.isEnabled ? 1.0 : 0.0 };

            // Modificar vertex shader - añadir varying para world position
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

            // Modificar fragment shader - reemplazar cálculo de fog
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
                    varying float vFogDepth;
                    varying vec3 vWorldPosition;
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

                        // Fog factor: 0 = sin fog (cerca), 1 = fog completo (lejos)
                        float fogFactor = smoothstep(uFogNear, uFogFar, distFromPlayer);

                        // Aplicar fog
                        gl_FragColor.rgb = mix(gl_FragColor.rgb, uCustomFogColor, fogFactor);
                    }
                #endif
                `
            );

            // Guardar referencia para actualizar uniforms
            this.materialShaders.set(material, shader);
        };

        // Cache key para evitar problemas de recompilación
        material.customProgramCacheKey = () => `playerFogMaterial_v2_${this.isEnabled}`;
    }

    /**
     * Llamar cada frame antes de render
     */
    public update(playerPosition: THREE.Vector3): void {
        this.playerPosition.copy(playerPosition);

        // Actualizar uniforms en todos los materiales
        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uPlayerPosition']) {
                shader.uniforms['uPlayerPosition'].value.copy(this.playerPosition);
            }
        });
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

        // Actualizar background para que coincida
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
     * Habilitar/deshabilitar el fog
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;

        this.materialShaders.forEach((shader) => {
            if (shader.uniforms['uFogEnabled']) {
                shader.uniforms['uFogEnabled'].value = enabled ? 1.0 : 0.0;
            }
        });

        // También toggle scene.fog para consistencia
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
            fogFar: this.config.fogFar
        };
    }

    /**
     * Aplicar preset de configuración
     */
    public applyPreset(preset: Partial<PlayerFogConfig>): void {
        if (preset.fogColor) {
            this.setFogColor(preset.fogColor);
        }
        if (preset.fogNear !== undefined && preset.fogFar !== undefined) {
            this.setFogRadius(preset.fogNear, preset.fogFar);
        }
    }

    /**
     * Obtener número de materiales con fog aplicado
     */
    public getMaterialCount(): number {
        return this.materialShaders.size;
    }

    /**
     * Limpiar un material específico (cuando se elimina del escena)
     */
    public removeMaterial(material: THREE.Material): void {
        this.materialShaders.delete(material);
    }

    /**
     * Dispose - limpiar recursos
     */
    public dispose(): void {
        this.materialShaders.clear();
        console.log('[PlayerFogSystem] Disposed');
    }
}
