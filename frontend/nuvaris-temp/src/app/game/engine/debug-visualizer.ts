import * as THREE from 'three';

/**
 * Debug Visualizer for collision boxes and sprite bounds
 * Toggle with Ctrl+D
 */
export class DebugVisualizer {
    private scene: THREE.Scene;
    private debugMeshes: THREE.Object3D[] = [];
    private isEnabled = false;

    // Colors for different debug elements
    private static COLORS = {
        PLAYER_COLLISION: 0x00ff00,      // Green - Player collision radius
        ENEMY_COLLISION: 0xff0000,        // Red - Enemy collision radius
        SPRITE_BOUNDS: 0xffff00,          // Yellow - Sprite bounds
        STRUCTURE_COLLISION: 0x0088ff,    // Blue - Structure/wall collision
        PROJECTILE_COLLISION: 0xff00ff,   // Magenta - Projectile collision
        MAP_BOUNDS: 0x00ffff              // Cyan - Map boundary
    };

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    get enabled(): boolean {
        return this.isEnabled;
    }

    toggle(): boolean {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) {
            this.clearAllDebugMeshes();
        }
        console.log(`[DEBUG] Visualization ${this.isEnabled ? 'ENABLED' : 'DISABLED'}`);
        return this.isEnabled;
    }

    // Clear all debug visualizations
    clearAllDebugMeshes() {
        this.debugMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh instanceof THREE.Mesh || mesh instanceof THREE.Line) {
                mesh.geometry?.dispose();
                if (mesh.material instanceof THREE.Material) {
                    mesh.material.dispose();
                }
            }
        });
        this.debugMeshes = [];
    }

    // Create a circle (for collision radius visualization)
    createCollisionCircle(radius: number, color: number, segments: number = 32): THREE.Line {
        const geometry = new THREE.BufferGeometry();
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(theta) * radius,
                0.1, // Slightly above ground
                Math.sin(theta) * radius
            ));
        }

        geometry.setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        return new THREE.Line(geometry, material);
    }

    // Create a rectangle for sprite bounds (vertical plane)
    createSpriteBounds(width: number, height: number, color: number): THREE.Line {
        const geometry = new THREE.BufferGeometry();
        const halfW = width / 2;

        const points = [
            new THREE.Vector3(-halfW, 0, 0),
            new THREE.Vector3(halfW, 0, 0),
            new THREE.Vector3(halfW, height, 0),
            new THREE.Vector3(-halfW, height, 0),
            new THREE.Vector3(-halfW, 0, 0)
        ];

        geometry.setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        return new THREE.Line(geometry, material);
    }

    // Create a box wireframe for 3D structures
    createBoxWireframe(width: number, height: number, depth: number, color: number): THREE.LineSegments {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        geometry.dispose();
        return new THREE.LineSegments(edges, material);
    }

    // Update debug visualization for player
    updatePlayerDebug(
        position: THREE.Vector3,
        collisionRadius: number,
        spriteWidth: number,
        spriteHeight: number,
        existingDebugGroup?: THREE.Group
    ): THREE.Group {
        // Remove existing if provided
        if (existingDebugGroup) {
            this.scene.remove(existingDebugGroup);
            const index = this.debugMeshes.indexOf(existingDebugGroup);
            if (index > -1) this.debugMeshes.splice(index, 1);
        }

        if (!this.isEnabled) return new THREE.Group();

        const group = new THREE.Group();

        // Collision circle (green)
        const collisionCircle = this.createCollisionCircle(
            collisionRadius,
            DebugVisualizer.COLORS.PLAYER_COLLISION
        );
        group.add(collisionCircle);

        // Sprite bounds (yellow)
        const spriteBounds = this.createSpriteBounds(
            spriteWidth,
            spriteHeight,
            DebugVisualizer.COLORS.SPRITE_BOUNDS
        );
        group.add(spriteBounds);

        // Label
        group.position.copy(position);
        this.scene.add(group);
        this.debugMeshes.push(group);

        return group;
    }

    // Update debug visualization for enemy
    updateEnemyDebug(
        position: THREE.Vector3,
        collisionRadius: number,
        spriteWidth: number,
        spriteHeight: number,
        existingDebugGroup?: THREE.Group
    ): THREE.Group {
        if (existingDebugGroup) {
            this.scene.remove(existingDebugGroup);
            const index = this.debugMeshes.indexOf(existingDebugGroup);
            if (index > -1) this.debugMeshes.splice(index, 1);
        }

        if (!this.isEnabled) return new THREE.Group();

        const group = new THREE.Group();

        // Collision circle (red)
        const collisionCircle = this.createCollisionCircle(
            collisionRadius,
            DebugVisualizer.COLORS.ENEMY_COLLISION
        );
        group.add(collisionCircle);

        // Sprite bounds (yellow)
        const spriteBounds = this.createSpriteBounds(
            spriteWidth,
            spriteHeight,
            DebugVisualizer.COLORS.SPRITE_BOUNDS
        );
        group.add(spriteBounds);

        group.position.copy(position);
        this.scene.add(group);
        this.debugMeshes.push(group);

        return group;
    }

    // Create static structure debug visualization
    createStructureDebug(
        position: THREE.Vector3,
        width: number,
        height: number,
        depth: number
    ): THREE.LineSegments {
        if (!this.isEnabled) return new THREE.LineSegments();

        const wireframe = this.createBoxWireframe(
            width,
            height,
            depth,
            DebugVisualizer.COLORS.STRUCTURE_COLLISION
        );
        wireframe.position.copy(position);
        this.scene.add(wireframe);
        this.debugMeshes.push(wireframe);

        return wireframe;
    }

    // Create map boundary visualization
    createMapBoundary(mapSize: number, wallHeight: number): void {
        if (!this.isEnabled) return;

        const halfSize = mapSize / 2;
        const material = new THREE.LineBasicMaterial({
            color: DebugVisualizer.COLORS.MAP_BOUNDS,
            linewidth: 3
        });

        // Create boundary lines at ground level
        const groundPoints = [
            new THREE.Vector3(-halfSize, 0.2, -halfSize),
            new THREE.Vector3(halfSize, 0.2, -halfSize),
            new THREE.Vector3(halfSize, 0.2, halfSize),
            new THREE.Vector3(-halfSize, 0.2, halfSize),
            new THREE.Vector3(-halfSize, 0.2, -halfSize)
        ];

        const groundGeometry = new THREE.BufferGeometry().setFromPoints(groundPoints);
        const groundLine = new THREE.Line(groundGeometry, material);
        this.scene.add(groundLine);
        this.debugMeshes.push(groundLine);

        // Create vertical corner lines
        const corners = [
            [-halfSize, -halfSize],
            [halfSize, -halfSize],
            [halfSize, halfSize],
            [-halfSize, halfSize]
        ];

        corners.forEach(([x, z]) => {
            const vertPoints = [
                new THREE.Vector3(x, 0.2, z),
                new THREE.Vector3(x, wallHeight, z)
            ];
            const vertGeometry = new THREE.BufferGeometry().setFromPoints(vertPoints);
            const vertLine = new THREE.Line(vertGeometry, material.clone());
            this.scene.add(vertLine);
            this.debugMeshes.push(vertLine);
        });
    }

    // Create projectile debug visualization
    createProjectileDebug(position: THREE.Vector3, radius: number): THREE.Line {
        if (!this.isEnabled) return new THREE.Line();

        const circle = this.createCollisionCircle(
            radius,
            DebugVisualizer.COLORS.PROJECTILE_COLLISION,
            16
        );
        circle.position.copy(position);
        this.scene.add(circle);
        this.debugMeshes.push(circle);

        return circle;
    }

    // Batch update for all enemies (more efficient)
    updateAllEnemiesDebug(
        enemies: Array<{ position: THREE.Vector3; isDead: boolean }>,
        collisionRadius: number,
        spriteWidth: number,
        spriteHeight: number
    ): void {
        // This is called from the engine to batch update enemy debug visuals
        // Individual enemy debug groups are managed separately
    }
}
