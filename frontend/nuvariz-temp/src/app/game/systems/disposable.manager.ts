import * as THREE from 'three';

/**
 * DisposableManager - Tracks and disposes Three.js resources to prevent memory leaks
 *
 * Three.js doesn't automatically garbage collect GPU resources like:
 * - Geometries (vertex buffers)
 * - Materials (shaders)
 * - Textures (GPU memory)
 *
 * This manager tracks these resources and properly disposes them when:
 * - The game resets/restarts
 * - The player changes maps
 * - The component is destroyed
 *
 * Usage:
 *   const manager = new DisposableManager();
 *   manager.track(mesh);
 *   manager.trackTexture(texture);
 *   // Later...
 *   manager.disposeAll(scene);
 */
export class DisposableManager {
    private objects: Set<THREE.Object3D> = new Set();
    private textures: Set<THREE.Texture> = new Set();
    private materials: Set<THREE.Material> = new Set();
    private geometries: Set<THREE.BufferGeometry> = new Set();

    // Statistics
    private stats = {
        objectsTracked: 0,
        texturesTracked: 0,
        materialsTracked: 0,
        geometriesTracked: 0,
        lastDisposeCount: 0
    };

    /**
     * Track a Three.js Object3D (Mesh, Group, Light, etc.)
     * Will automatically track its geometry and material if it's a Mesh
     */
    track(object: THREE.Object3D): void {
        this.objects.add(object);
        this.stats.objectsTracked++;

        // Auto-track mesh resources
        if (object instanceof THREE.Mesh) {
            if (object.geometry) {
                this.trackGeometry(object.geometry);
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => this.trackMaterial(m));
                } else {
                    this.trackMaterial(object.material);
                }
            }
        }

        // Recursively track children
        object.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                this.track(child);
            }
        });
    }

    /**
     * Track a texture
     */
    trackTexture(texture: THREE.Texture): void {
        this.textures.add(texture);
        this.stats.texturesTracked++;
    }

    /**
     * Track a material
     */
    trackMaterial(material: THREE.Material): void {
        this.materials.add(material);
        this.stats.materialsTracked++;

        // Auto-track textures in common material types
        if (material instanceof THREE.MeshBasicMaterial ||
            material instanceof THREE.MeshStandardMaterial ||
            material instanceof THREE.MeshPhongMaterial) {
            if (material.map) this.trackTexture(material.map);
            if ((material as any).normalMap) this.trackTexture((material as any).normalMap);
            if ((material as any).roughnessMap) this.trackTexture((material as any).roughnessMap);
        }

        if (material instanceof THREE.SpriteMaterial) {
            if (material.map) this.trackTexture(material.map);
        }
    }

    /**
     * Track a geometry
     */
    trackGeometry(geometry: THREE.BufferGeometry): void {
        this.geometries.add(geometry);
        this.stats.geometriesTracked++;
    }

    /**
     * Dispose all tracked resources and remove objects from scene
     */
    disposeAll(scene: THREE.Scene): void {
        let disposed = 0;

        // Remove and dispose objects
        for (const obj of this.objects) {
            scene.remove(obj);
            disposed++;
        }

        // Dispose geometries
        for (const geometry of this.geometries) {
            geometry.dispose();
            disposed++;
        }

        // Dispose materials
        for (const material of this.materials) {
            material.dispose();
            disposed++;
        }

        // Dispose textures
        for (const texture of this.textures) {
            texture.dispose();
            disposed++;
        }

        // Clear sets
        this.objects.clear();
        this.textures.clear();
        this.materials.clear();
        this.geometries.clear();

        // Update stats
        this.stats.lastDisposeCount = disposed;

        console.log(`[DisposableManager] Disposed ${disposed} resources`);
    }

    /**
     * Dispose a specific object (and untrack it)
     */
    disposeObject(object: THREE.Object3D, scene: THREE.Scene): void {
        scene.remove(object);
        this.objects.delete(object);

        if (object instanceof THREE.Mesh) {
            if (object.geometry && this.geometries.has(object.geometry)) {
                object.geometry.dispose();
                this.geometries.delete(object.geometry);
            }
            if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                for (const mat of materials) {
                    if (this.materials.has(mat)) {
                        mat.dispose();
                        this.materials.delete(mat);
                    }
                }
            }
        }
    }

    /**
     * Get tracking statistics
     */
    getStats(): typeof this.stats {
        return { ...this.stats };
    }

    /**
     * Get current tracked counts
     */
    getCurrentCounts(): { objects: number; textures: number; materials: number; geometries: number } {
        return {
            objects: this.objects.size,
            textures: this.textures.size,
            materials: this.materials.size,
            geometries: this.geometries.size
        };
    }
}

/**
 * Global texture cache to prevent loading the same texture multiple times
 */
export class TextureCache {
    private static instance: TextureCache;
    private cache: Map<string, THREE.Texture> = new Map();
    private loader = new THREE.TextureLoader();

    static getInstance(): TextureCache {
        if (!TextureCache.instance) {
            TextureCache.instance = new TextureCache();
        }
        return TextureCache.instance;
    }

    /**
     * Load a texture, using cached version if available
     */
    load(path: string): THREE.Texture {
        if (this.cache.has(path)) {
            return this.cache.get(path)!;
        }

        const texture = this.loader.load(path);
        this.cache.set(path, texture);
        return texture;
    }

    /**
     * Clear the entire cache and dispose all textures
     */
    clear(): void {
        for (const texture of this.cache.values()) {
            texture.dispose();
        }
        this.cache.clear();
        console.log('[TextureCache] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; paths: string[] } {
        return {
            size: this.cache.size,
            paths: Array.from(this.cache.keys())
        };
    }
}
