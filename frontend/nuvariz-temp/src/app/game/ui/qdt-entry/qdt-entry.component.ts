import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-qdt-entry',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qdt-entry.component.html',
    styleUrls: ['./qdt-entry.component.scss']
})
export class QdtEntryComponent implements OnInit {
    @Output() enter = new EventEmitter<void>();

    showLogo = false;
    showSubtitle = false;
    showButton = false;
    glitchActive = false;

    ngOnInit() {
        // Sequence the reveal
        setTimeout(() => this.showLogo = true, 300);
        setTimeout(() => this.showSubtitle = true, 1200);
        setTimeout(() => this.showButton = true, 2000);

        // Random glitch effect
        this.startGlitchEffect();
    }

    private startGlitchEffect() {
        setInterval(() => {
            if (Math.random() > 0.85) {
                this.glitchActive = true;
                setTimeout(() => this.glitchActive = false, 100 + Math.random() * 150);
            }
        }, 2000);
    }

    onEnter() {
        this.enter.emit();
    }
}
