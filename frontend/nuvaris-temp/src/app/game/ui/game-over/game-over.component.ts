import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-game-over',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './game-over.component.html',
    styleUrls: ['./game-over.component.scss']
})
export class GameOverComponent {
    @Input() score: number = 0;
    @Input() level: number = 1;
    @Output() returnToMenu = new EventEmitter<void>();
    @Output() playAgain = new EventEmitter<void>();

    onReturnToMenu() {
        this.returnToMenu.emit();
    }

    onPlayAgain() {
        this.playAgain.emit();
    }
}
