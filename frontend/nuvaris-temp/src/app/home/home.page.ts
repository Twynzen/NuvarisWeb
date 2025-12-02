import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThreeGameComponent } from '../game/components/three-game/three-game.component';
import { MainMenuComponent } from '../game/ui/main-menu/main-menu.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, ThreeGameComponent, MainMenuComponent, CommonModule],
})
export class HomePage {
  gameStarted = false;
  selectedCharacterId = '';

  constructor() { }

  startGame(characterId: string) {
    this.selectedCharacterId = characterId;
    this.gameStarted = true;
  }

  onQuitGame() {
    this.gameStarted = false;
    this.selectedCharacterId = '';
  }
}
