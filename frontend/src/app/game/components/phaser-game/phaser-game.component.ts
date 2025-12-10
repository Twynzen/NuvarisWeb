import { Component, OnInit, OnDestroy, AfterViewInit, NgZone, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as Phaser from 'phaser';
import { GameScene } from '../../scenes/game.scene';
import { LevelUpScene } from '../../scenes/level-up.scene';

@Component({
  selector: 'app-phaser-game',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="game-wrapper">
      <a routerLink="/home" class="back-button">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        Back
      </a>
      <div id="phaser-game-container" class="game-container"></div>
    </div>
  `,
  styles: [`
    .game-wrapper {
      position: relative;
      width: 100%;
      height: 100vh;
    }

    .back-button {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: rgba(255, 68, 0, 0.3);
      border-color: rgba(255, 68, 0, 0.5);
    }

    .back-button svg {
      width: 20px;
      height: 20px;
    }

    .game-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #1a1a2e;
      overflow: hidden;
    }

    :host ::ng-deep .game-container canvas {
      display: block;
    }
  `]
})
export class PhaserGameComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() gameReady = new EventEmitter<Phaser.Game>();
  @Output() sceneEvent = new EventEmitter<any>();

  private game?: Phaser.Game;
  private config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [GameScene, LevelUpScene]
  };

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    // Initialize Phaser outside Angular zone for better performance
    this.ngZone.runOutsideAngular(() => {
      this.initializeGame();
    });
  }

  ngOnDestroy(): void {
    this.destroyGame();
  }

  private initializeGame(): void {
    if (!this.game) {
      this.game = new Phaser.Game(this.config);

      // Emit game ready event back to Angular
      this.ngZone.run(() => {
        this.gameReady.emit(this.game);
      });

      // Set up event bridge between Phaser and Angular
      this.setupEventBridge();
    }
  }

  private setupEventBridge(): void {
    if (!this.game) return;

    // Listen to custom events from Phaser scenes
    this.game.events.on('scene-event', (data: any) => {
      this.ngZone.run(() => {
        this.sceneEvent.emit(data);
      });
    });
  }

  private destroyGame(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }

  // Public method to send events to Phaser from Angular
  public sendEventToGame(eventName: string, data?: any): void {
    if (this.game) {
      this.game.events.emit(eventName, data);
    }
  }
}
