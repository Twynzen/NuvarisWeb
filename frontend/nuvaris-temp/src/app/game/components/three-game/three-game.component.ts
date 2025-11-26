import { Component, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { ThreeEngineService } from '../../engine/three-engine.service';
import { CommonModule } from '@angular/common';
import { LevelUpComponent } from '../../ui/level-up/level-up.component';
import { PauseMenuComponent } from '../../ui/pause-menu/pause-menu.component';
import { GameOverComponent } from '../../ui/game-over/game-over.component';

@Component({
    selector: 'app-three-game',
    templateUrl: './three-game.component.html',
    styleUrls: ['./three-game.component.scss'],
    standalone: true,
    imports: [CommonModule, LevelUpComponent, PauseMenuComponent, GameOverComponent]
})
export class ThreeGameComponent implements AfterViewInit {
    @ViewChild('rendererCanvas', { static: true })
    public rendererCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() characterId: string = 'arcadio';
    @Output() quitGame = new EventEmitter<void>();

    constructor(public engServ: ThreeEngineService) { }

    public get gameState() {
        return this.engServ.gameState;
    }

    ngAfterViewInit(): void {
        this.engServ.createScene(this.rendererCanvas, this.characterId);
    }

    onUpgradeSelected(upgrade: any) {
        console.log('Upgrade selected:', upgrade);
        // Apply upgrade logic here (TODO: Implement upgrade application)
        this.engServ.resumeGame();
    }

    onResume() {
        this.engServ.resumeGame();
    }

    onQuit() {
        this.quitGame.emit();
    }

    onReturnToMenu() {
        this.engServ.resetGame();
        this.quitGame.emit();
    }
}
