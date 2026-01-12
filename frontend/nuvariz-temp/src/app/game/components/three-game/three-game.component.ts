import { Component, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { ThreeEngineService } from '../../engine/three-engine.service';
import { CommonModule } from '@angular/common';
import { LevelUpComponent } from '../../ui/level-up/level-up.component';
import { PauseMenuComponent } from '../../ui/pause-menu/pause-menu.component';
import { GameOverComponent } from '../../ui/game-over/game-over.component';
import { DevConsoleComponent } from '../../ui/dev-console/dev-console.component';
import { MinimapComponent } from '../../ui/minimap/minimap.component';

@Component({
    selector: 'app-three-game',
    templateUrl: './three-game.component.html',
    styleUrls: ['./three-game.component.scss'],
    standalone: true,
    imports: [CommonModule, LevelUpComponent, PauseMenuComponent, GameOverComponent, DevConsoleComponent, MinimapComponent]
})
export class ThreeGameComponent implements AfterViewInit, OnDestroy {
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

    ngOnDestroy(): void {
        // Stop all audio when component is destroyed
        this.engServ.audioService.stopAll();
    }

    onUpgradeSelected(upgrade: any) {
        console.log('Upgrade selected:', upgrade);

        // Apply the upgrade effect if it has one
        if (upgrade && typeof upgrade.effect === 'function') {
            // Create a scene context with player reference
            const sceneContext = {
                player: this.engServ.getPlayer()
            };

            try {
                upgrade.effect(sceneContext);
                console.log(`[UPGRADE] Applied: ${upgrade.name}`);
            } catch (e) {
                console.error(`[UPGRADE] Failed to apply ${upgrade.name}:`, e);
            }
        }

        // Play roulette/selection sound
        this.engServ.audioService.play('roulette');

        this.engServ.resumeGame();
    }

    onResume() {
        this.engServ.resumeGame();
    }

    onQuit() {
        // Stop gameplay music when quitting
        this.engServ.audioService.stopMusic();
        this.engServ.audioService.stopHealthWarning();
        this.quitGame.emit();
    }

    onReturnToMenu() {
        // Stop gameplay music when returning to menu
        this.engServ.audioService.stopMusic();
        this.engServ.audioService.stopHealthWarning();
        this.engServ.resetGame();
        this.quitGame.emit();
    }

    onPlayAgain() {
        // Restart the game without going back to menu
        this.engServ.restartGame();
    }
}
