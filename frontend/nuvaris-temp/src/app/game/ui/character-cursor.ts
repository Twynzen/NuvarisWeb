import * as THREE from 'three';

/**
 * CharacterCursor - Cursor 3D personalizado por personaje
 * Reemplaza el cursor nativo del navegador con un efecto visual en el mundo 3D
 */
export class CharacterCursor {
    private scene: THREE.Scene;
    private cursorGroup: THREE.Group;
    private outerRing!: THREE.Mesh;
    private innerGlow!: THREE.Sprite;
    private pulsePhase = 0;
    private characterId: string;

    // Colores por personaje
    private static readonly COLORS: { [key: string]: { primary: number; glow: number } } = {
        'lars': { primary: 0x8B00FF, glow: 0xDA70D6 },      // Púrpura
        'proyecto-a': { primary: 0xFF4500, glow: 0xFF6347 }, // Naranja
        'proyecto-y': { primary: 0x00BFFF, glow: 0x87CEEB }  // Cyan
    };

    constructor(scene: THREE.Scene, characterId: string) {
        this.scene = scene;
        this.characterId = characterId;
        this.cursorGroup = new THREE.Group();
        this.createCursor();
    }

    private createCursor(): void {
        const colors = CharacterCursor.COLORS[this.characterId] || CharacterCursor.COLORS['lars'];

        // Anillo exterior (targeting ring)
        const ringGeom = new THREE.RingGeometry(0.6, 0.8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: colors.primary,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        this.outerRing = new THREE.Mesh(ringGeom, ringMat);
        this.outerRing.rotation.x = -Math.PI / 2; // Flat on ground

        // Glow central (sprite con textura procedural)
        const glowTexture = this.createGlowTexture(colors.glow);
        const glowMat = new THREE.SpriteMaterial({
            map: glowTexture,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        this.innerGlow = new THREE.Sprite(glowMat);
        this.innerGlow.scale.set(1.8, 1.8, 1);

        // Punto central pequeño
        const centerGeom = new THREE.CircleGeometry(0.1, 16);
        const centerMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const centerDot = new THREE.Mesh(centerGeom, centerMat);
        centerDot.rotation.x = -Math.PI / 2;

        this.cursorGroup.add(this.outerRing);
        this.cursorGroup.add(this.innerGlow);
        this.cursorGroup.add(centerDot);
        this.cursorGroup.position.y = 0.15; // Slightly above ground

        this.scene.add(this.cursorGroup);
    }

    private createGlowTexture(color: number): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;

        // Radial gradient for glow
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.5)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Update cursor position and animation
     * @param worldPosition Position in 3D world where cursor should be
     * @param delta Time since last frame
     */
    public update(worldPosition: THREE.Vector3, delta: number): void {
        // Move cursor to mouse world position
        this.cursorGroup.position.x = worldPosition.x;
        this.cursorGroup.position.z = worldPosition.z;

        // Pulse effect
        this.pulsePhase += delta * 3;
        const pulse = 0.95 + Math.sin(this.pulsePhase) * 0.05;
        this.outerRing.scale.set(pulse, pulse, 1);

        // Slow rotation of ring
        this.outerRing.rotation.z += delta * 0.5;

        // Glow pulse (inverse to ring)
        const glowPulse = 1.0 + Math.sin(this.pulsePhase + Math.PI) * 0.1;
        this.innerGlow.scale.set(1.8 * glowPulse, 1.8 * glowPulse, 1);
    }

    /**
     * Show or hide cursor
     */
    public setVisible(visible: boolean): void {
        this.cursorGroup.visible = visible;
    }

    /**
     * Check if cursor is visible
     */
    public isVisible(): boolean {
        return this.cursorGroup.visible;
    }

    /**
     * Get cursor world position
     */
    public getPosition(): THREE.Vector3 {
        return this.cursorGroup.position.clone();
    }

    /**
     * Change cursor color (for character switch or effects)
     */
    public setCharacter(characterId: string): void {
        if (this.characterId === characterId) return;

        this.characterId = characterId;
        const colors = CharacterCursor.COLORS[characterId] || CharacterCursor.COLORS['lars'];

        // Update ring color
        (this.outerRing.material as THREE.MeshBasicMaterial).color.setHex(colors.primary);

        // Update glow texture
        const newGlowTexture = this.createGlowTexture(colors.glow);
        (this.innerGlow.material as THREE.SpriteMaterial).map = newGlowTexture;
        (this.innerGlow.material as THREE.SpriteMaterial).needsUpdate = true;
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        this.scene.remove(this.cursorGroup);

        // Dispose geometries and materials
        this.cursorGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
            if (child instanceof THREE.Sprite) {
                if (child.material.map) {
                    child.material.map.dispose();
                }
                child.material.dispose();
            }
        });
    }
}
