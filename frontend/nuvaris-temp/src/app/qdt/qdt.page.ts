import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ThreeGameComponent } from '../game/components/three-game/three-game.component';
import { MainMenuComponent } from '../game/ui/main-menu/main-menu.component';
import { QdtEntryComponent } from '../game/ui/qdt-entry/qdt-entry.component';
import { CommonModule } from '@angular/common';

type QdtScreenState = 'entry' | 'menu' | 'game';

@Component({
    selector: 'app-qdt-page',
    templateUrl: 'qdt.page.html',
    styleUrls: ['qdt.page.scss'],
    standalone: true,
    imports: [
        IonicModule,
        ThreeGameComponent,
        MainMenuComponent,
        QdtEntryComponent,
        CommonModule
    ],
})
export class QdtPage {
    currentScreen: QdtScreenState = 'entry';
    selectedCharacterId = '';

    constructor(private router: Router) { }

    // Called when user clicks "ENTRAR" button on QDT entry
    onQdtEnter() {
        this.currentScreen = 'menu';
    }

    // Called when user selects a character
    startGame(characterId: string) {
        this.selectedCharacterId = characterId;
        this.currentScreen = 'game';
    }

    // Called when user quits the game - go back to Nuvaris home
    onQuitGame() {
        this.router.navigate(['/']);
    }
}
