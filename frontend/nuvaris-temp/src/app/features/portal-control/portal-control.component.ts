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
import { ShopService } from './services/shop.service';
import { LoggerService } from './services/logger.service';
import { VisitorWindowComponent } from './components/visitor-window/visitor-window.component';
import { DocumentViewerComponent } from './components/document-viewer/document-viewer.component';
import { ScannerPanelComponent } from './components/scanner-panel/scanner-panel.component';
import { DecisionPanelComponent } from './components/decision-panel/decision-panel.component';
import { GameHudComponent } from './components/game-hud/game-hud.component';
import { IntroScreenComponent } from './components/intro-screen/intro-screen.component';
import { EndGameScreenComponent } from './components/end-game-screen/end-game-screen.component';
import { DaySummaryComponent } from './components/day-summary/day-summary.component';
import { ShopComponent } from './components/shop/shop.component';
import { InspectorTool, DecisionType, GameDifficulty, ShopItem } from './models';
import { getRandomSpecialEvent, getRandomSpecialVisitor, INSPECTOR_TOOLS } from './data';

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
    IntroScreenComponent,
    EndGameScreenComponent,
    DaySummaryComponent,
    ShopComponent,
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

      <!-- Intro screen (replaces old menu) -->
      @if (showIntro()) {
        <app-intro-screen
          (onStartGame)="handleStartGame($event)">
        </app-intro-screen>
      }

      <!-- Day start briefing -->
      @if (showBriefing()) {
        <div class="briefing-screen">
          <div class="briefing-content">
            <h2>📋 INFORME MATUTINO</h2>
            <h3>Día {{ gameState()?.currentDay }} de 30</h3>

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

            @if (getNewToolsForDay().length > 0) {
              <div class="briefing-tools">
                <h4>🔧 Nuevas Herramientas:</h4>
                @for (tool of getNewToolsForDay(); track tool) {
                  <div class="tool-unlock">
                    <span class="tool-name">{{ getToolName(tool) }}</span>
                    <span class="tool-desc">{{ getToolDescription(tool) }}</span>
                  </div>
                }
              </div>
            }

            @if (gameState()?.dayState?.rules?.specialAlerts?.length) {
              <div class="briefing-alerts">
                <h4>⚠️ Alertas Especiales:</h4>
                @for (alert of gameState()?.dayState?.rules?.specialAlerts; track alert.id) {
                  <div class="alert-card" [class]="alert.priority">
                    <strong>{{ alert.title }}</strong>
                    <p>{{ alert.description }}</p>
                    @if (alert.rewardForCapture) {
                      <span class="reward-badge">Recompensa: \${{ alert.rewardForCapture }}</span>
                    }
                  </div>
                }
              </div>
            }

            <div class="briefing-status">
              <span>💵 Dólares: \${{ gameState()?.playerResources?.dollars || 0 }}</span>
              <span>⭐ Reputación: {{ gameState()?.playerResources?.reputation || 50 }}</span>
              <span>⚠️ Advertencias: {{ gameState()?.playerResources?.warnings || 0 }}/{{ gameState()?.playerResources?.maxWarnings || 3 }}</span>
            </div>

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
          (onMenu)="confirmReturnToMenu()">
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
              [dollars]="gameState()?.playerResources?.dollars || 0"
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

      <!-- Day end summary (improved) -->
      @if (showDaySummary()) {
        <app-day-summary
          [dayNumber]="gameState()?.currentDay || 1"
          [processedVisitors]="gameState()?.dayState?.processedVisitors || []"
          [resources]="gameState()?.playerResources || null"
          [canAccessShop]="true"
          [newToolsNextDay]="getNewToolsForNextDay()"
          [hasSpecialAlertTomorrow]="checkSpecialAlertTomorrow()"
          (onContinue)="continueToNextDay()"
          (onOpenShop)="openShop()">
        </app-day-summary>
      }

      <!-- End game screens -->
      @if (showGameOver()) {
        <app-end-game-screen
          [type]="isVictory() ? 'VICTORY' : 'GAME_OVER'"
          [currentDay]="gameState()?.currentDay || 1"
          [stats]="gameState()?.playerStats || null"
          [resources]="gameState()?.playerResources || null"
          [difficulty]="gameState()?.difficulty || 'NORMAL'"
          (onPlayAgain)="resetGame()"
          (onMainMenu)="returnToMenu()">
        </app-end-game-screen>
      }

      <!-- Shop overlay -->
      @if (showShop()) {
        <app-shop
          [shopItems]="getShopItems()"
          [dollars]="gameState()?.playerResources?.dollars || 0"
          [day]="gameState()?.currentDay || 1"
          [reputation]="gameState()?.playerResources?.reputation || 50"
          [purchasedUpgradeIds]="getPurchasedUpgradeIds()"
          (onClose)="closeShop()"
          (onPurchaseUpgrade)="purchaseUpgrade($event)"
          (onPurchaseConsumable)="purchaseConsumable($event)">
        </app-shop>
      }

      <!-- Pause overlay -->
      @if (gameState()?.isPaused && !showShop()) {
        <div class="pause-overlay" (click)="togglePause()">
          <div class="pause-content" (click)="$event.stopPropagation()">
            <h2>⏸️ PAUSA</h2>
            <div class="pause-buttons">
              <button class="resume-btn" (click)="togglePause()">▶️ Continuar</button>
              <button class="shop-btn" (click)="openShop()">🏪 Tienda</button>
              <button class="menu-btn-small" (click)="confirmReturnToMenu()">🏠 Menú Principal</button>
            </div>
          </div>
        </div>
      }

      <!-- Confirm dialog -->
      @if (showConfirmDialog()) {
        <div class="confirm-overlay">
          <div class="confirm-dialog">
            <h3>⚠️ Confirmar</h3>
            <p>{{ confirmMessage() }}</p>
            <div class="confirm-buttons">
              <button class="btn-cancel" (click)="cancelConfirm()">Cancelar</button>
              <button class="btn-confirm" (click)="executeConfirm()">Confirmar</button>
            </div>
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
      position: fixed;
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
      border-top-color: #8B5CF6;
      border-radius: 50%;
      margin: 0 auto 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Briefing screen */
    .briefing-screen {
      position: fixed;
      inset: 0;
      background: linear-gradient(180deg, #0a0a0f 0%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 40;
      overflow-y: auto;
      padding: 40px 20px;
    }

    .briefing-content {
      text-align: center;
      max-width: 600px;
      width: 100%;
    }

    .briefing-content h2 {
      color: #8B5CF6;
      margin-bottom: 8px;
      font-size: 28px;
    }

    .briefing-content h3 {
      color: #666;
      font-weight: normal;
      margin-bottom: 30px;
    }

    .briefing-rules, .briefing-alerts, .briefing-tools {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid #333;
      padding: 20px;
      border-radius: 8px;
      text-align: left;
      margin-bottom: 20px;
    }

    .briefing-rules h4, .briefing-alerts h4, .briefing-tools h4 {
      margin: 0 0 12px 0;
      color: #aaa;
      font-size: 14px;
    }

    .briefing-rules ul {
      margin: 0;
      padding-left: 20px;
    }

    .briefing-rules li {
      margin: 6px 0;
      color: #ccc;
    }

    .tool-unlock {
      padding: 12px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 6px;
      margin: 8px 0;
    }

    .tool-name {
      display: block;
      font-weight: bold;
      color: #A78BFA;
    }

    .tool-desc {
      font-size: 12px;
      color: #888;
    }

    .alert-card {
      background: rgba(244,67,54,0.1);
      border-left: 3px solid #F44336;
      padding: 12px;
      margin: 8px 0;
      border-radius: 4px;
    }

    .alert-card.medium {
      border-left-color: #FFC107;
      background: rgba(255,193,7,0.1);
    }

    .alert-card.high {
      border-left-color: #F44336;
    }

    .alert-card strong {
      color: #F44336;
    }

    .alert-card.medium strong {
      color: #FFC107;
    }

    .alert-card p {
      margin: 6px 0 0 0;
      color: #aaa;
      font-size: 13px;
    }

    .reward-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 8px;
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
      font-size: 12px;
      border-radius: 4px;
    }

    .briefing-status {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin: 24px 0;
      padding: 16px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
    }

    .briefing-status span {
      font-size: 14px;
      color: #aaa;
    }

    .start-btn {
      padding: 20px 48px;
      font-size: 20px;
      background: linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%);
      border: none;
      color: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .start-btn:hover {
      background: linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%);
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

    .decision-area {
      padding: 0 16px 16px;
    }

    /* Pause overlay */
    .pause-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 70;
    }

    .pause-content {
      text-align: center;
      padding: 40px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #333;
      border-radius: 16px;
    }

    .pause-content h2 {
      margin: 0 0 24px 0;
      font-size: 32px;
    }

    .pause-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .resume-btn {
      padding: 16px 48px;
      font-size: 18px;
      background: linear-gradient(180deg, #4CAF50 0%, #388E3C 100%);
      border: none;
      color: white;
      border-radius: 8px;
      cursor: pointer;
    }

    .shop-btn {
      padding: 14px 32px;
      font-size: 16px;
      background: rgba(255, 193, 7, 0.2);
      border: 1px solid rgba(255, 193, 7, 0.5);
      color: #FFC107;
      border-radius: 8px;
      cursor: pointer;
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

    /* Confirm dialog */
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .confirm-dialog {
      background: #1a1a2e;
      border: 2px solid #F44336;
      border-radius: 12px;
      padding: 32px;
      max-width: 400px;
      text-align: center;
    }

    .confirm-dialog h3 {
      margin: 0 0 16px 0;
      color: #F44336;
    }

    .confirm-dialog p {
      color: #aaa;
      margin: 0 0 24px 0;
    }

    .confirm-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-cancel {
      padding: 12px 24px;
      background: #333;
      border: 1px solid #555;
      color: #aaa;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-confirm {
      padding: 12px 24px;
      background: #F44336;
      border: none;
      color: white;
      border-radius: 6px;
      cursor: pointer;
    }

    .paused > *:not(.pause-overlay):not(.confirm-overlay) {
      filter: blur(2px);
    }
  `]
})
export class PortalControlComponent implements OnInit, OnDestroy {
  private gameStateService = inject(GameStateService);
  private detectionService = inject(DetectionService);
  private spriteAssembler = inject(SpriteAssemblerService);
  private shopService = inject(ShopService);
  private logger = inject(LoggerService);

  // State signals
  gameState = this.gameStateService.gameState;
  currentVisitor = this.gameStateService.currentVisitor;
  currentDocuments = this.gameStateService.currentDocuments;
  isLoading = this.gameStateService.isLoading;

  // Local state
  private showIntroFlag = signal(true);
  private showShopFlag = signal(false);
  showConfirmDialog = signal(false);
  confirmMessage = signal('');
  private confirmAction: (() => void) | null = null;

  lastToolResult = signal<any>(null);
  private processingStartTime = 0;

  // Tool states from detection service
  toolStates = computed(() => this.detectionService.getToolStates());

  // Computed view states
  showIntro = computed(() => this.showIntroFlag() && !this.gameState());
  showBriefing = computed(() => this.gameState()?.phase === 'DAY_START');
  showGameplay = computed(() => this.gameState()?.phase === 'PROCESSING');
  showDaySummary = computed(() => this.gameState()?.phase === 'DAY_END');
  showGameOver = computed(() =>
    this.gameState()?.phase === 'GAME_OVER' || this.gameState()?.phase === 'VICTORY'
  );
  isVictory = computed(() => this.gameState()?.phase === 'VICTORY');
  showShop = computed(() => this.showShopFlag());

  ngOnInit(): void {
    this.logger.info('PortalControl', 'Component initialized');
    this.addPlaceholderStyles();
  }

  ngOnDestroy(): void {
    this.gameStateService.resetGame();
    this.shopService.reset();
    this.logger.info('PortalControl', 'Component destroyed');
  }

  private addPlaceholderStyles(): void {
    const styleId = 'portal-control-sprites';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = this.spriteAssembler.getPlaceholderStyles();
      document.head.appendChild(style);
    }
  }

  // === GAME FLOW ===

  handleStartGame(event: { playerName: string; difficulty: GameDifficulty }): void {
    this.showIntroFlag.set(false);
    this.shopService.reset();
    this.gameStateService.startNewGame(event.difficulty, event.playerName);
  }

  beginWork(): void {
    this.gameStateService.beginWork();
    this.processingStartTime = Date.now();
  }

  callNextVisitor(): void {
    this.gameStateService.callNextVisitor();
    this.processingStartTime = Date.now();
    this.lastToolResult.set(null);
  }

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

  makeDecision(decision: DecisionType): void {
    this.gameStateService.makeDecision(decision);
    this.lastToolResult.set(null);
  }

  togglePause(): void {
    this.gameStateService.togglePause();
  }

  continueToNextDay(): void {
    this.showShopFlag.set(false);
    this.gameStateService.continueToNextDay();
  }

  resetGame(): void {
    this.gameStateService.resetGame();
    this.shopService.reset();
    this.showIntroFlag.set(true);
    this.showShopFlag.set(false);
  }

  returnToMenu(): void {
    this.resetGame();
  }

  confirmReturnToMenu(): void {
    this.confirmMessage.set('¿Seguro que quieres salir? Se perderá el progreso no guardado.');
    this.confirmAction = () => this.returnToMenu();
    this.showConfirmDialog.set(true);
  }

  cancelConfirm(): void {
    this.showConfirmDialog.set(false);
    this.confirmAction = null;
  }

  executeConfirm(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.showConfirmDialog.set(false);
    this.confirmAction = null;
  }

  // === SHOP ===

  openShop(): void {
    this.showShopFlag.set(true);
  }

  closeShop(): void {
    this.showShopFlag.set(false);
  }

  getShopItems(): ShopItem[] {
    const day = this.gameState()?.currentDay || 1;
    const reputation = this.gameState()?.playerResources?.reputation || 50;
    return this.shopService.getAvailableShopItems(day, reputation);
  }

  getPurchasedUpgradeIds(): string[] {
    return Array.from(this.shopService.purchasedUpgrades().keys());
  }

  purchaseUpgrade(upgradeId: string): void {
    const currentDollars = this.gameState()?.playerResources?.dollars || 0;
    const result = this.shopService.purchaseUpgrade(upgradeId, currentDollars);

    if (result.success && result.newDollars !== undefined) {
      // Update game state with new dollars
      this.updatePlayerDollars(result.newDollars);
    }
  }

  purchaseConsumable(itemId: string): void {
    const currentDollars = this.gameState()?.playerResources?.dollars || 0;
    const result = this.shopService.purchaseConsumable(itemId, currentDollars);

    if (result.success && result.newDollars !== undefined) {
      this.updatePlayerDollars(result.newDollars);
    }
  }

  private updatePlayerDollars(newAmount: number): void {
    // This would ideally be handled by the game state service
    // For now, we'll trigger a state update
    const state = this.gameState();
    if (state) {
      state.playerResources.dollars = newAmount;
    }
  }

  // === HELPERS ===

  getProcessingTime(): number {
    if (!this.currentVisitor()) return 0;
    return (Date.now() - this.processingStartTime) / 1000;
  }

  getNewToolsForDay(): InspectorTool[] {
    const day = this.gameState()?.currentDay || 1;
    return Object.entries(INSPECTOR_TOOLS)
      .filter(([_, data]) => data.unlockDay === day)
      .map(([tool]) => tool as InspectorTool);
  }

  getNewToolsForNextDay(): string[] {
    const nextDay = (this.gameState()?.currentDay || 0) + 1;
    return Object.entries(INSPECTOR_TOOLS)
      .filter(([_, data]) => data.unlockDay === nextDay)
      .map(([_, data]) => data.name);
  }

  getToolName(tool: InspectorTool): string {
    return INSPECTOR_TOOLS[tool]?.name || tool;
  }

  getToolDescription(tool: InspectorTool): string {
    return INSPECTOR_TOOLS[tool]?.shortDescription || '';
  }

  checkSpecialAlertTomorrow(): boolean {
    const nextDay = (this.gameState()?.currentDay || 0) + 1;
    return nextDay >= 5; // Simplified check
  }

  // === KEYBOARD SHORTCUTS ===

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Don't handle if dialogs are open
    if (this.showConfirmDialog() || this.showShop()) return;

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
