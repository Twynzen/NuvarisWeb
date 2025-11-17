import { Component, OnInit, OnDestroy, AfterViewInit, NgZone, Output, EventEmitter } from '@angular/core';
import * as Phaser from 'phaser';
import { GameScene } from '../../scenes/game.scene';
import { LevelUpScene } from '../../scenes/level-up.scene';

@Component({
  selector: 'app-phaser-game',
  templateUrl: './phaser-game.component.html',
  styleUrls: ['./phaser-game.component.scss']
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
