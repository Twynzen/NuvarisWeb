import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-game-over',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './game-over.component.html',
    styleUrls: ['./game-over.component.scss']
})
export class GameOverComponent implements OnInit {
    @Input() score: number = 0;
    @Input() level: number = 1;
    @Output() returnToMenu = new EventEmitter<void>();
    @Output() playAgain = new EventEmitter<void>();

    private gameOverSound: HTMLAudioElement | null = null;

    ngOnInit() {
        this.playGameOverSound();
    }

    private playGameOverSound() {
        try {
            this.gameOverSound = new Audio('assets/sounds/game-over.wav');
            this.gameOverSound.volume = 0.6;
            this.gameOverSound.play().catch(err => {
                console.warn('Could not play game over sound:', err);
            });
        } catch (e) {
            console.warn('Error loading game over sound:', e);
        }
    }

    onReturnToMenu() {
        this.stopSound();
        this.returnToMenu.emit();
    }

    onPlayAgain() {
        this.stopSound();
        this.playAgain.emit();
    }

    private stopSound() {
        if (this.gameOverSound) {
            this.gameOverSound.pause();
            this.gameOverSound = null;
        }
    }
}
