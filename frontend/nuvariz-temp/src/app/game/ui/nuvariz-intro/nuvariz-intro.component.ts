import { Component, Output, EventEmitter, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Star {
    x: number;
    y: number;
    size: number;
    baseOpacity: number;
    opacity: number;
    twinkleSpeed: number;
    twinklePhase: number;
    color: { r: number; g: number; b: number };
    // For shooting stars
    isShooting?: boolean;
    vx?: number;
    vy?: number;
    trail?: { x: number; y: number; opacity: number }[];
}

interface Nebula {
    x: number;
    y: number;
    radius: number;
    color: { r: number; g: number; b: number };
    opacity: number;
    pulseSpeed: number;
    pulsePhase: number;
}

@Component({
    selector: 'app-nuvariz-intro',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './nuvariz-intro.component.html',
    styleUrls: ['./nuvariz-intro.component.scss']
})
export class NuvarizIntroComponent implements OnInit, OnDestroy, AfterViewInit {
    @Output() continue = new EventEmitter<void>();
    @ViewChild('starCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    showTitle = false;
    showPrompt = false;
    canContinue = false;

    private stars: Star[] = [];
    private nebulae: Nebula[] = [];
    private animationFrame: number | null = null;
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private time = 0;
    private shootingStarTimer = 0;

    constructor(private router: Router) { }

    ngOnInit() {
        // Sequence the reveal
        setTimeout(() => this.showTitle = true, 500);
        setTimeout(() => {
            this.showPrompt = true;
            this.canContinue = true;
        }, 2500);
    }

    ngAfterViewInit() {
        this.initCanvas();
        this.createStarField();
        this.createNebulae();
        this.animate();
    }

    ngOnDestroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    @HostListener('window:resize')
    onResize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.createStarField();
            this.createNebulae();
        }
    }

    // Navigate to QDT
    navigateToQdt(event: Event) {
        event.stopPropagation();
        if (this.canContinue) {
            this.router.navigate(['/qdt']);
        }
    }

    // Navigate to Tartarus Prime
    navigateToTartarus(event: Event) {
        event.stopPropagation();
        if (this.canContinue) {
            this.router.navigate(['/tartarus-prime']);
        }
    }

    private initCanvas() {
        this.canvas = this.canvasRef.nativeElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private createStarField() {
        this.stars = [];
        const numStars = Math.floor((this.canvas.width * this.canvas.height) / 3000);

        // Star color palettes (mystical/ethereal)
        const starColors = [
            { r: 255, g: 255, b: 255 },  // Pure white
            { r: 200, g: 220, b: 255 },  // Ice blue
            { r: 255, g: 240, b: 220 },  // Warm white
            { r: 220, g: 200, b: 255 },  // Soft violet
            { r: 180, g: 200, b: 255 },  // Cool blue
        ];

        for (let i = 0; i < numStars; i++) {
            const colorIndex = Math.floor(Math.random() * starColors.length);
            const size = Math.random() < 0.1 ? Math.random() * 2.5 + 1.5 : Math.random() * 1.5 + 0.3;

            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: size,
                baseOpacity: Math.random() * 0.5 + 0.3,
                opacity: 0,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
                color: { ...starColors[colorIndex] }
            });
        }
    }

    private createNebulae() {
        this.nebulae = [];
        const nebulaColors = [
            { r: 80, g: 40, b: 120 },   // Deep purple
            { r: 40, g: 60, b: 100 },   // Deep blue
            { r: 60, g: 30, b: 80 },    // Violet
            { r: 30, g: 50, b: 90 },    // Midnight blue
        ];

        // Create 3-5 nebula clouds
        const numNebulae = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numNebulae; i++) {
            const colorIndex = Math.floor(Math.random() * nebulaColors.length);
            this.nebulae.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 300 + 200,
                color: { ...nebulaColors[colorIndex] },
                opacity: Math.random() * 0.15 + 0.05,
                pulseSpeed: Math.random() * 0.005 + 0.002,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    private createShootingStar() {
        // Find a random position at the top or sides
        const startX = Math.random() * this.canvas.width;
        const startY = Math.random() * this.canvas.height * 0.3;

        const angle = Math.PI / 4 + Math.random() * Math.PI / 4; // 45-90 degrees down
        const speed = 8 + Math.random() * 6;

        this.stars.push({
            x: startX,
            y: startY,
            size: 2 + Math.random() * 1.5,
            baseOpacity: 1,
            opacity: 1,
            twinkleSpeed: 0,
            twinklePhase: 0,
            color: { r: 255, g: 255, b: 255 },
            isShooting: true,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            trail: []
        });
    }

    private animate = () => {
        this.time += 0.016; // ~60fps
        this.shootingStarTimer += 0.016;

        // Spawn shooting stars occasionally
        if (this.shootingStarTimer > 4 + Math.random() * 6) {
            this.shootingStarTimer = 0;
            this.createShootingStar();
        }

        this.draw();
        this.animationFrame = requestAnimationFrame(this.animate);
    }

    private draw() {
        // Clear with fade effect for trails
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw nebulae (subtle background glow)
        this.drawNebulae();

        // Draw and update stars
        this.drawStars();
    }

    private drawNebulae() {
        for (const nebula of this.nebulae) {
            // Pulse animation
            const pulse = Math.sin(this.time * nebula.pulseSpeed + nebula.pulsePhase) * 0.3 + 0.7;
            const currentOpacity = nebula.opacity * pulse;

            const gradient = this.ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.radius
            );

            gradient.addColorStop(0, `rgba(${nebula.color.r}, ${nebula.color.g}, ${nebula.color.b}, ${currentOpacity})`);
            gradient.addColorStop(0.5, `rgba(${nebula.color.r}, ${nebula.color.g}, ${nebula.color.b}, ${currentOpacity * 0.3})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                nebula.x - nebula.radius,
                nebula.y - nebula.radius,
                nebula.radius * 2,
                nebula.radius * 2
            );

            // Slowly drift nebulae
            nebula.x += Math.sin(this.time * 0.1 + nebula.pulsePhase) * 0.1;
            nebula.y += Math.cos(this.time * 0.08 + nebula.pulsePhase) * 0.05;
        }
    }

    private drawStars() {
        for (let i = this.stars.length - 1; i >= 0; i--) {
            const star = this.stars[i];

            if (star.isShooting) {
                // Update shooting star
                star.x += star.vx!;
                star.y += star.vy!;

                // Add to trail
                star.trail!.unshift({ x: star.x, y: star.y, opacity: 1 });

                // Limit trail length
                if (star.trail!.length > 20) {
                    star.trail!.pop();
                }

                // Fade trail
                for (let t = 0; t < star.trail!.length; t++) {
                    star.trail![t].opacity *= 0.85;
                }

                // Draw trail
                for (let t = 0; t < star.trail!.length; t++) {
                    const trailPoint = star.trail![t];
                    const trailSize = star.size * (1 - t / star.trail!.length) * 0.8;
                    this.ctx.beginPath();
                    this.ctx.arc(trailPoint.x, trailPoint.y, trailSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${trailPoint.opacity * 0.5})`;
                    this.ctx.fill();
                }

                // Draw shooting star head with glow
                const gradient = this.ctx.createRadialGradient(
                    star.x, star.y, 0,
                    star.x, star.y, star.size * 4
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.3, 'rgba(200, 220, 255, 0.6)');
                gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // Remove if off screen
                if (star.x > this.canvas.width + 50 || star.y > this.canvas.height + 50) {
                    this.stars.splice(i, 1);
                }
            } else {
                // Regular twinkling star
                star.twinklePhase += star.twinkleSpeed;
                star.opacity = star.baseOpacity * (0.5 + 0.5 * Math.sin(star.twinklePhase));

                // Draw star with glow
                const { r, g, b } = star.color;

                // Outer glow
                if (star.size > 1) {
                    const glowGradient = this.ctx.createRadialGradient(
                        star.x, star.y, 0,
                        star.x, star.y, star.size * 3
                    );
                    glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.8})`);
                    glowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.2})`);
                    glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = glowGradient;
                    this.ctx.fill();
                }

                // Core
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.opacity})`;
                this.ctx.fill();

                // Sparkle cross effect for bigger stars
                if (star.size > 1.5 && star.opacity > 0.5) {
                    const sparkleSize = star.size * 2;
                    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.3})`;
                    this.ctx.lineWidth = 0.5;

                    // Vertical line
                    this.ctx.beginPath();
                    this.ctx.moveTo(star.x, star.y - sparkleSize);
                    this.ctx.lineTo(star.x, star.y + sparkleSize);
                    this.ctx.stroke();

                    // Horizontal line
                    this.ctx.beginPath();
                    this.ctx.moveTo(star.x - sparkleSize, star.y);
                    this.ctx.lineTo(star.x + sparkleSize, star.y);
                    this.ctx.stroke();
                }
            }
        }
    }
}
