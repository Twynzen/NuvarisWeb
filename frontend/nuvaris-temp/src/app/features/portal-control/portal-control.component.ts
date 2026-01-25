/**
 * PORTAL CONTROL - Main Game Component
 * The main game page that orchestrates all gameplay
 */

import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameStateService } from './services/game-state.service';
import { DetectionService } from './services/detection.service';
import { SpriteAssemblerService } from './services/sprite-assembler.service';
import { LoggerService } from './services/logger.service';
import { VisitorWindowComponent } from './components/visitor-window/visitor-window.component';
import { DocumentViewerComponent } from './components/document-viewer/document-viewer.component';
import { ScannerPanelComponent } from './components/scanner-panel/scanner-panel.component';
import { DecisionPanelComponent } from './components/decision-panel/decision-panel.component';
import { GameHudComponent } from './components/game-hud/game-hud.component';
import { InspectorTool, DecisionType, GameDifficulty } from './models';

@Component({
  selector: 'app-portal-control',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    VisitorWindowComponent,
    DocumentViewerComponent,
    ScannerPanelComponent,
    DecisionPanelComponent,
    GameHudComponent,
  ],
  template: `
    <div class="portal-control-game" [class.paused]="gameState()?.isPaused">
      <!-- Loading screen -->
      @if (isLoading()) {
        <div class="loading-screen">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <h2>CARGANDO PORTAL CONTROL</h2>
            <p>Preparando sistemas de inspección...</p>
          </div>
        </div>
      }

      <!-- Main menu -->
      @if (showMenu()) {
        <div class="main-menu">
          <div class="menu-content">
            <h1 class="game-title">PORTAL CONTROL</h1>
            <p class="game-subtitle">Centro de Procesamiento Dimensional - ITHOR</p>

            <div class="menu-options">
              <button class="menu-btn new-game" (click)="startNewGame('NORMAL')">
                🎮 Nueva Partida
              </button>

              <div class="difficulty-options">
                <button class="diff-btn" (click)="startNewGame('FACIL')">😊 Fácil</button>
                <button class="diff-btn" (click)="startNewGame('NORMAL')">😐 Normal</button>
                <button class="diff-btn" (click)="startNewGame('DIFICIL')">😰 Difícil</button>
                <button class="diff-btn" (click)="startNewGame('PESADILLA')">💀 Pesadilla</button>
              </div>

              <a routerLink="/" class="menu-btn back">
                ← Volver al Inicio
              </a>
            </div>

            <div class="menu-info">
              <p>Año 3042 - Ciclo de Apertura</p>
              <p>Corporación QDT - Todos los derechos reservados</p>
            </div>
          </div>
        </div>
      }

      <!-- Day start briefing -->
      @if (showBriefing()) {
        <div class="briefing-screen">
          <div class="briefing-content">
            <h2>📋 INFORME MATUTINO</h2>
            <h3>Día {{ gameState()?.currentDay }}</h3>

            <div class="briefing-rules">
              <h4>Reglas del Día:</h4>
              <ul>
                @for (species of gameState()?.dayState?.rules?.allowedSpecies; track species) {
                  <li>✅ {{ species }} permitidos</li>
                }
                @for (origin of gameState()?.dayState?.rules?.bannedOrigins; track origin) {
                  <li>❌ Prohibido: {{ origin }}</li>
                }
              </ul>
            </div>

            @if (gameState()?.dayState?.rules?.specialAlerts?.length) {
              <div class="briefing-alerts">
                <h4>⚠️ Alertas Especiales:</h4>
                @for (alert of gameState()?.dayState?.rules?.specialAlerts; track alert.id) {
                  <div class="alert-card">
                    <strong>{{ alert.title }}</strong>
                    <p>{{ alert.description }}</p>
                  </div>
                }
              </div>
            }

            <button class="start-btn" (click)="beginWork()">
              🚪 ABRIR PORTAL
            </button>
          </div>
        </div>
      }

      <!-- Main gameplay -->
      @if (showGameplay()) {
        <!-- HUD -->
        <app-game-hud
          [dayState]="gameState()?.dayState || null"
          [resources]="gameState()?.playerResources || null"
          [stats]="gameState()?.playerStats || null"
          [isPaused]="gameState()?.isPaused || false"
          (onPause)="togglePause()"
          (onMenu)="openMenu()">
        </app-game-hud>

        <!-- Game area -->
        <div class="game-area">
          <!-- Left: Visitor window -->
          <div class="left-panel">
            <app-visitor-window
              [visitor]="currentVisitor()"
              (onCallNext)="callNextVisitor()">
            </app-visitor-window>
          </div>

          <!-- Center: Documents -->
          <div class="center-panel">
            <app-document-viewer
              [documents]="currentDocuments()"
              [visitorWeight]="currentVisitor()?.appearance?.weight || 0"
              [visitorHeight]="currentVisitor()?.appearance?.height || 0">
            </app-document-viewer>
          </div>

          <!-- Right: Scanner and tools -->
          <div class="right-panel">
            <app-scanner-panel
              [toolStates]="toolStates()"
              [scannerResults]="currentVisitor()?.scannerResults || null"
              [lastToolResult]="lastToolResult()"
              [credits]="gameState()?.playerResources?.credits || 0"
              (onUseTool)="useTool($event)">
            </app-scanner-panel>
          </div>
        </div>

        <!-- Decision panel (bottom) -->
        <div class="decision-area">
          <app-decision-panel
            [hasVisitor]="currentVisitor() !== null"
            [flags]="currentVisitor()?.detectionFlags || []"
            [processingTime]="getProcessingTime()"
            (onDecision)="makeDecision($event)">
          </app-decision-panel>
        </div>
      }

      <!-- Day end summary -->
      @if (showDaySummary()) {
        <div class="summary-screen">
          <div class="summary-content">
            <h2>📊 RESUMEN DEL DÍA {{ gameState()?.currentDay }}</h2>

            <div class="summary-stats">
              <div class="stat-card">
                <span class="stat-number">{{ gameState()?.dayState?.processedVisitors?.length || 0 }}</span>
                <span class="stat-label">Visitantes Procesados</span>
              </div>
              <div class="stat-card good">
                <span class="stat-number">{{ countCorrectDecisions() }}</span>
                <span class="stat-label">Decisiones Correctas</span>
              </div>
              <div class="stat-card bad">
                <span class="stat-number">{{ countIncorrectDecisions() }}</span>
                <span class="stat-label">Errores</span>
              </div>
              <div class="stat-card">
                <span class="stat-number">{{ gameState()?.playerResources?.dailyCreditsEarned || 0 }}</span>
                <span class="stat-label">Créditos Ganados</span>
              </div>
            </div>

            <div class="summary-earnings">
              <p>Balance del día: <strong [class.positive]="getDayBalance() >= 0" [class.negative]="getDayBalance() < 0">
                {{ getDayBalance() >= 0 ? '+' : '' }}{{ getDayBalance() }} créditos
              </strong></p>
              <p>Créditos totales: <strong>{{ gameState()?.playerResources?.credits || 0 }}</strong></p>
            </div>

            <button class="continue-btn" (click)="continueToNextDay()">
              ➡️ CONTINUAR AL DÍA {{ (gameState()?.currentDay || 0) + 1 }}
            </button>
          </div>
        </div>
      }

      <!-- Game over -->
      @if (showGameOver()) {
        <div class="gameover-screen">
          <div class="gameover-content">
            <h1>{{ isVictory() ? '🎉 VICTORIA' : '💀 FIN DEL JUEGO' }}</h1>

            @if (isVictory()) {
              <p>Has completado tu servicio en el Portal A-7.</p>
              <p>La Corporación QDT te agradece tu dedicación.</p>
            } @else {
              <p>Has recibido demasiadas advertencias.</p>
              <p>Tu contrato ha sido terminado.</p>
            }

            <div class="final-stats">
              <p>Días trabajados: {{ gameState()?.currentDay }}</p>
              <p>Precisión final: {{ gameState()?.playerStats?.accuracy | number:'1.0-0' }}%</p>
              <p>Fugitivos capturados: {{ gameState()?.playerStats?.fugitivesCaught }}</p>
            </div>

            <button class="restart-btn" (click)="resetGame()">
              🔄 Jugar de Nuevo
            </button>
          </div>
        </div>
      }

      <!-- Pause overlay -->
      @if (gameState()?.isPaused) {
        <div class="pause-overlay" (click)="togglePause()">
          <div class="pause-content" (click)="$event.stopPropagation()">
            <h2>⏸️ PAUSA</h2>
            <button class="resume-btn" (click)="togglePause()">▶️ Continuar</button>
            <button class="menu-btn-small" (click)="openMenu()">🏠 Menú Principal</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .portal-control-game {
      width: 100%;
      min-height: 100vh;
      background: #0a0a0f;
      color: white;
      font-family: 'Segoe UI', system-ui, sans-serif;
      position: relative;
      overflow: hidden;
    }

    /* Loading screen */
    .loading-screen {
      position: absolute;
      inset: 0;
      background: #0a0a0f;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .loading-content {
      text-align: center;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #333;
      border-top-color: #4CAF50;
      border-radius: 50%;
      margin: 0 auto 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Main menu */
    .main-menu {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, #0a0a0f 0%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }

    .menu-content {
      text-align: center;
      max-width: 500px;
      padding: 40px;
    }

    .game-title {
      font-size: 48px;
      font-weight: 300;
      letter-spacing: 8px;
      margin: 0 0 10px 0;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .game-subtitle {
      color: #666;
      font-size: 14px;
      letter-spacing: 2px;
      margin: 0 0 40px 0;
    }

    .menu-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 40px;
    }

    .menu-btn {
      padding: 16px 32px;
      font-size: 18px;
      border: 2px solid #4CAF50;
      background: rgba(76,175,80,0.1);
      color: #4CAF50;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      display: block;
    }

    .menu-btn:hover {
      background: #4CAF50;
      color: white;
      transform: translateY(-2px);
    }

    .menu-btn.back {
      border-color: #666;
      color: #666;
      background: transparent;
    }

    .menu-btn.back:hover {
      background: #666;
      color: white;
    }

    .difficulty-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .diff-btn {
      padding: 12px;
      border: 1px solid #444;
      background: #1a1a2e;
      color: #aaa;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .diff-btn:hover {
      border-color: #4CAF50;
      color: white;
    }

    .menu-info {
      color: #444;
      font-size: 11px;
    }

    .menu-info p {
      margin: 4px 0;
    }

    /* Briefing screen */
    .briefing-screen {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, #0a0a0f 0%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 40;
    }

    .briefing-content {
      text-align: center;
      max-width: 600px;
      padding: 40px;
    }

    .briefing-content h2 {
      color: #4CAF50;
      margin-bottom: 8px;
    }

    .briefing-content h3 {
      color: #888;
      font-weight: normal;
      margin-bottom: 30px;
    }

    .briefing-rules, .briefing-alerts {
      background: #1a1a2e;
      padding: 20px;
      border-radius: 8px;
      text-align: left;
      margin-bottom: 20px;
    }

    .briefing-rules h4, .briefing-alerts h4 {
      margin: 0 0 12px 0;
      color: #aaa;
    }

    .briefing-rules ul {
      margin: 0;
      padding-left: 20px;
    }

    .briefing-rules li {
      margin: 6px 0;
    }

    .alert-card {
      background: rgba(244,67,54,0.1);
      border-left: 3px solid #F44336;
      padding: 12px;
      margin: 8px 0;
      border-radius: 4px;
    }

    .alert-card strong {
      color: #F44336;
    }

    .alert-card p {
      margin: 6px 0 0 0;
      color: #aaa;
      font-size: 13px;
    }

    .start-btn {
      padding: 20px 48px;
      font-size: 20px;
      background: #4CAF50;
      border: none;
      color: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .start-btn:hover {
      background: #66BB6A;
      transform: scale(1.05);
    }

    /* Game area */
    .game-area {
      display: flex;
      gap: 16px;
      padding: 16px;
      height: calc(100vh - 160px);
      justify-content: center;
    }

    .left-panel, .center-panel, .right-panel {
      display: flex;
      flex-direction: column;
    }

    /* Decision area */
    .decision-area {
      padding: 0 16px 16px;
    }

    /* Summary screen */
    .summary-screen {
      position: absolute;
      inset: 0;
      background: rgba(10,10,15,0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 30;
    }

    .summary-content {
      text-align: center;
      max-width: 600px;
      padding: 40px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 30px 0;
    }

    .stat-card {
      background: #1a1a2e;
      padding: 24px;
      border-radius: 8px;
    }

    .stat-card.good { border: 2px solid #4CAF50; }
    .stat-card.bad { border: 2px solid #F44336; }

    .stat-number {
      display: block;
      font-size: 36px;
      font-weight: bold;
    }

    .stat-label {
      color: #888;
      font-size: 12px;
    }

    .summary-earnings {
      margin: 20px 0;
    }

    .positive { color: #4CAF50; }
    .negative { color: #F44336; }

    .continue-btn {
      padding: 16px 48px;
      font-size: 18px;
      background: #4CAF50;
      border: none;
      color: white;
      border-radius: 8px;
      cursor: pointer;
    }

    /* Game over */
    .gameover-screen {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, #1a0a0a 0%, #0a0a0f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 60;
    }

    .gameover-content {
      text-align: center;
      padding: 40px;
    }

    .gameover-content h1 {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .final-stats {
      margin: 30px 0;
      padding: 20px;
      background: #1a1a2e;
      border-radius: 8px;
    }

    .restart-btn {
      padding: 16px 48px;
      font-size: 18px;
      background: #4CAF50;
      border: none;
      color: white;
      border-radius: 8px;
      cursor: pointer;
    }

    /* Pause overlay */
    .pause-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 70;
    }

    .pause-content {
      text-align: center;
      padding: 40px;
      background: #1a1a2e;
      border-radius: 12px;
    }

    .resume-btn {
      padding: 16px 48px;
      font-size: 18px;
      background: #4CAF50;
      border: none;
      color: white;
      border-radius: 8px;
      cursor: pointer;
      margin: 20px 10px 10px;
    }

    .menu-btn-small {
      padding: 12px 24px;
      font-size: 14px;
      background: transparent;
      border: 1px solid #666;
      color: #aaa;
      border-radius: 6px;
      cursor: pointer;
    }

    .paused {
      filter: blur(2px);
    }

    .paused .pause-overlay {
      filter: none;
    }
  `]
})
export class PortalControlComponent implements OnInit, OnDestroy {
  private gameStateService = inject(GameStateService);
  private detectionService = inject(DetectionService);
  private spriteAssembler = inject(SpriteAssemblerService);
  private logger = inject(LoggerService);

  // State signals
  gameState = this.gameStateService.gameState;
  currentVisitor = this.gameStateService.currentVisitor;
  currentDocuments = this.gameStateService.currentDocuments;
  isLoading = this.gameStateService.isLoading;

  // Local state
  showMenuFlag = signal(true);
  lastToolResult = signal<any>(null);
  private processingStartTime = 0;

  // Tool states from detection service
  toolStates = computed(() => this.detectionService.getToolStates());

  // Computed view states
  showMenu = computed(() => this.showMenuFlag() && !this.gameState());
  showBriefing = computed(() => this.gameState()?.phase === 'DAY_START');
  showGameplay = computed(() => this.gameState()?.phase === 'PROCESSING');
  showDaySummary = computed(() => this.gameState()?.phase === 'DAY_END');
  showGameOver = computed(() =>
    this.gameState()?.phase === 'GAME_OVER' || this.gameState()?.phase === 'VICTORY'
  );
  isVictory = computed(() => this.gameState()?.phase === 'VICTORY');

  ngOnInit(): void {
    this.logger.info('PortalControl', 'Component initialized');
    // Add placeholder styles
    this.addPlaceholderStyles();
  }

  ngOnDestroy(): void {
    this.gameStateService.resetGame();
    this.logger.info('PortalControl', 'Component destroyed');
  }

  /**
   * Add sprite placeholder styles to document
   */
  private addPlaceholderStyles(): void {
    const styleId = 'portal-control-sprites';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = this.spriteAssembler.getPlaceholderStyles();
      document.head.appendChild(style);
    }
  }

  /**
   * Start a new game
   */
  startNewGame(difficulty: GameDifficulty): void {
    this.showMenuFlag.set(false);
    this.gameStateService.startNewGame(difficulty, 'Inspector');
  }

  /**
   * Begin work phase
   */
  beginWork(): void {
    this.gameStateService.beginWork();
    this.processingStartTime = Date.now();
  }

  /**
   * Call next visitor
   */
  callNextVisitor(): void {
    this.gameStateService.callNextVisitor();
    this.processingStartTime = Date.now();
    this.lastToolResult.set(null);
  }

  /**
   * Use a tool on current visitor
   */
  useTool(tool: InspectorTool): void {
    const visitor = this.currentVisitor();
    if (!visitor) return;

    const result = this.detectionService.useTool(
      tool,
      visitor,
      this.currentDocuments() || undefined
    );
    this.lastToolResult.set(result);
  }

  /**
   * Make a decision on current visitor
   */
  makeDecision(decision: DecisionType): void {
    this.gameStateService.makeDecision(decision);
    this.lastToolResult.set(null);
  }

  /**
   * Toggle pause
   */
  togglePause(): void {
    this.gameStateService.togglePause();
  }

  /**
   * Open menu
   */
  openMenu(): void {
    this.gameStateService.resetGame();
    this.showMenuFlag.set(true);
  }

  /**
   * Continue to next day
   */
  continueToNextDay(): void {
    this.gameStateService.continueToNextDay();
  }

  /**
   * Reset game
   */
  resetGame(): void {
    this.gameStateService.resetGame();
    this.showMenuFlag.set(true);
  }

  /**
   * Get processing time for current visitor
   */
  getProcessingTime(): number {
    if (!this.currentVisitor()) return 0;
    return (Date.now() - this.processingStartTime) / 1000;
  }

  /**
   * Count correct decisions in day
   */
  countCorrectDecisions(): number {
    const processed = this.gameState()?.dayState?.processedVisitors || [];
    return processed.filter(p => p.evaluation.wasCorrect).length;
  }

  /**
   * Count incorrect decisions in day
   */
  countIncorrectDecisions(): number {
    const processed = this.gameState()?.dayState?.processedVisitors || [];
    return processed.filter(p => !p.evaluation.wasCorrect).length;
  }

  /**
   * Get day balance
   */
  getDayBalance(): number {
    const resources = this.gameState()?.playerResources;
    if (!resources) return 0;
    return resources.dailyCreditsEarned - resources.dailyCreditsPenalty;
  }

  /**
   * Handle keyboard shortcuts
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.gameState()?.phase !== 'PROCESSING') return;
    if (!this.currentVisitor()) return;

    switch (event.key) {
      case '1':
        this.makeDecision('APROBAR');
        break;
      case '2':
        this.makeDecision('DENEGAR');
        break;
      case '3':
        this.makeDecision('DETENER');
        break;
      case '4':
        this.makeDecision('CUARENTENA');
        break;
      case '5':
        this.makeDecision('OMEGA');
        break;
      case 'Escape':
        this.togglePause();
        break;
    }
  }
}
