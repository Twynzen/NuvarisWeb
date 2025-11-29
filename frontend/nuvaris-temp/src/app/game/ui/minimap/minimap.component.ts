import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeEngineService } from '../../engine/three-engine.service';

interface MinimapEntity {
    x: number;
    z: number;
    type: 'player' | 'enemy' | 'door' | 'portal' | 'wall';
    color: string;
    width?: number;
    height?: number;
    rotation?: number;
}

@Component({
    selector: 'app-minimap',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './minimap.component.html',
    styleUrls: ['./minimap.component.scss']
})
export class MinimapComponent implements AfterViewInit, OnDestroy {
    @ViewChild('minimapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    @Input() size: number = 180;  // Size of minimap in pixels
    @Input() scale: number = 2;   // World units per pixel

    private ctx!: CanvasRenderingContext2D;
    private animationId: number | null = null;
    public isVisible = true;

    // Colors for different entities
    private readonly COLORS = {
        background: 'rgba(10, 10, 26, 0.85)',
        border: 'rgba(0, 255, 255, 0.6)',
        wall: 'rgba(80, 80, 100, 0.9)',
        player: '#00ff88',
        enemy: '#ff4444',
        door: '#ffaa00',
        doorOpen: '#44ff44',
        portal: '#aa44ff',
        grid: 'rgba(50, 50, 70, 0.3)'
    };

    mapName: string = '';

    constructor(private engineService: ThreeEngineService) {}

    ngAfterViewInit() {
        const canvas = this.canvasRef.nativeElement;
        canvas.width = this.size;
        canvas.height = this.size;

        this.ctx = canvas.getContext('2d')!;
        this.startRendering();
    }

    ngOnDestroy() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
    }

    toggleVisibility() {
        this.isVisible = !this.isVisible;
    }

    private startRendering() {
        const render = () => {
            if (this.isVisible) {
                this.draw();
            }
            this.animationId = requestAnimationFrame(render);
        };
        render();
    }

    private draw() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const size = this.size;
        const halfSize = size / 2;

        // Get player position as center
        const playerPos = this.engineService.getPlayerPosition();
        if (!playerPos) return;

        const centerX = playerPos.x;
        const centerZ = playerPos.z;

        // Clear and draw background
        ctx.fillStyle = this.COLORS.background;
        ctx.fillRect(0, 0, size, size);

        // Draw grid
        this.drawGrid(ctx, centerX, centerZ);

        // Get all entities to draw
        const walls = this.engineService.getMapWallsForMinimap();
        const enemies = this.engineService.getEnemiesForMinimap();
        const doors = this.engineService.getDoorsForMinimap();
        const portals = this.engineService.getPortalsForMinimap();

        // Draw walls
        ctx.fillStyle = this.COLORS.wall;
        for (const wall of walls) {
            this.drawWall(ctx, wall, centerX, centerZ, halfSize);
        }

        // Draw portals
        ctx.fillStyle = this.COLORS.portal;
        for (const portal of portals) {
            this.drawCircle(ctx, portal.x, portal.z, 4, centerX, centerZ, halfSize);
        }

        // Draw doors
        for (const door of doors) {
            ctx.fillStyle = door.isOpen ? this.COLORS.doorOpen : this.COLORS.door;
            this.drawRect(ctx, door.x, door.z, door.width / this.scale, 3, door.rotation, centerX, centerZ, halfSize);
        }

        // Draw enemies
        ctx.fillStyle = this.COLORS.enemy;
        for (const enemy of enemies) {
            this.drawCircle(ctx, enemy.x, enemy.z, 3, centerX, centerZ, halfSize);
        }

        // Draw player (always in center)
        ctx.fillStyle = this.COLORS.player;
        ctx.beginPath();
        ctx.arc(halfSize, halfSize, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw player direction indicator
        const playerDir = this.engineService.getPlayerDirection();
        if (playerDir) {
            ctx.strokeStyle = this.COLORS.player;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(halfSize, halfSize);
            ctx.lineTo(halfSize + playerDir.x * 10, halfSize + playerDir.z * 10);
            ctx.stroke();
        }

        // Draw border
        ctx.strokeStyle = this.COLORS.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, size - 2, size - 2);

        // Update map name
        this.mapName = this.engineService.getCurrentMapName() || 'Unknown';
    }

    private drawGrid(ctx: CanvasRenderingContext2D, centerX: number, centerZ: number) {
        const size = this.size;
        const gridStep = 20; // Grid lines every 20 pixels

        ctx.strokeStyle = this.COLORS.grid;
        ctx.lineWidth = 1;

        // Calculate offset based on player position
        const offsetX = (centerX / this.scale) % gridStep;
        const offsetZ = (centerZ / this.scale) % gridStep;

        // Vertical lines
        for (let x = -offsetX; x < size; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }

        // Horizontal lines
        for (let z = -offsetZ; z < size; z += gridStep) {
            ctx.beginPath();
            ctx.moveTo(0, z);
            ctx.lineTo(size, z);
            ctx.stroke();
        }
    }

    private drawWall(
        ctx: CanvasRenderingContext2D,
        wall: { x: number; z: number; width: number; depth: number; rotation?: number },
        centerX: number,
        centerZ: number,
        halfSize: number
    ) {
        const screenX = halfSize + (wall.x - centerX) / this.scale;
        const screenZ = halfSize + (wall.z - centerZ) / this.scale;
        const w = wall.width / this.scale;
        const h = wall.depth / this.scale;

        // Skip if off screen
        if (screenX + w < 0 || screenX - w > this.size || screenZ + h < 0 || screenZ - h > this.size) {
            return;
        }

        ctx.save();
        ctx.translate(screenX, screenZ);
        if (wall.rotation) {
            ctx.rotate(wall.rotation);
        }
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
    }

    private drawRect(
        ctx: CanvasRenderingContext2D,
        x: number, z: number,
        width: number, height: number,
        rotation: number,
        centerX: number, centerZ: number,
        halfSize: number
    ) {
        const screenX = halfSize + (x - centerX) / this.scale;
        const screenZ = halfSize + (z - centerZ) / this.scale;

        ctx.save();
        ctx.translate(screenX, screenZ);
        if (rotation) {
            ctx.rotate(rotation);
        }
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
    }

    private drawCircle(
        ctx: CanvasRenderingContext2D,
        x: number, z: number,
        radius: number,
        centerX: number, centerZ: number,
        halfSize: number
    ) {
        const screenX = halfSize + (x - centerX) / this.scale;
        const screenZ = halfSize + (z - centerZ) / this.scale;

        // Skip if off screen
        if (screenX < -radius || screenX > this.size + radius ||
            screenZ < -radius || screenZ > this.size + radius) {
            return;
        }

        ctx.beginPath();
        ctx.arc(screenX, screenZ, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
