/**
 * PORTAL CONTROL - End Game Screen Component
 * Game Over and Victory screens with detailed statistics
 */

import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerStats, PlayerResources, GameDifficulty } from '../../models';

export type EndGameType = 'GAME_OVER' | 'VICTORY';

interface StatDisplay {
  label: string;
  value: string | number;
  icon: string;
  highlight?: 'good' | 'bad' | 'neutral';
}

@Component({
  selector: 'app-end-game-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="end-game-overlay" [class.victory]="type === 'VICTORY'" [class.game-over]="type === 'GAME_OVER'">
      <div class="end-game-container">
        <!-- Header with result -->
        <div class="result-header">
          @if (type === 'VICTORY') {
            <div class="victory-icon">🏆</div>
            <h1>¡VICTORIA!</h1>
            <p class="result-subtitle">Has completado tu servicio con honor</p>
          } @else {
            <div class="gameover-icon">💀</div>
            <h1>JUEGO TERMINADO</h1>
            <p class="result-subtitle">{{ getGameOverReason() }}</p>
          }
        </div>

        <!-- Summary cards -->
        <div class="summary-section">
          <div class="summary-cards">
            <div class="summary-card days">
              <span class="card-value">{{ currentDay }}</span>
              <span class="card-label">Días Trabajados</span>
            </div>
            <div class="summary-card visitors">
              <span class="card-value">{{ stats?.totalVisitorsProcessed || 0 }}</span>
              <span class="card-label">Visitantes Procesados</span>
            </div>
            <div class="summary-card accuracy">
              <span class="card-value">{{ (stats?.accuracy || 0) | number:'1.0-0' }}%</span>
              <span class="card-label">Precisión</span>
            </div>
            <div class="summary-card dollars">
              <span class="card-value">\${{ resources?.dollars || 0 }}</span>
              <span class="card-label">Dólares Finales</span>
            </div>
          </div>
        </div>

        <!-- Detailed stats -->
        <div class="detailed-stats">
          <h3>📊 ESTADÍSTICAS DETALLADAS</h3>

          <div class="stats-grid">
            <!-- Decision stats -->
            <div class="stat-group">
              <h4>Decisiones</h4>
              <div class="stat-row">
                <span class="stat-icon">✅</span>
                <span class="stat-label">Correctas</span>
                <span class="stat-value good">{{ stats?.correctDecisions || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">❌</span>
                <span class="stat-label">Incorrectas</span>
                <span class="stat-value bad">{{ stats?.incorrectDecisions || 0 }}</span>
              </div>
            </div>

            <!-- Detection stats -->
            <div class="stat-group">
              <h4>Detección</h4>
              <div class="stat-row">
                <span class="stat-icon">🚔</span>
                <span class="stat-label">Fugitivos capturados</span>
                <span class="stat-value good">{{ stats?.fugitivesCaught || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">🏃</span>
                <span class="stat-label">Fugitivos escapados</span>
                <span class="stat-value bad">{{ stats?.fugitivesMissed || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">🎭</span>
                <span class="stat-label">Impostores detectados</span>
                <span class="stat-value good">{{ stats?.impostorsDetected || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">👤</span>
                <span class="stat-label">Impostores no detectados</span>
                <span class="stat-value bad">{{ stats?.impostorsMissed || 0 }}</span>
              </div>
            </div>

            <!-- Error stats -->
            <div class="stat-group">
              <h4>Errores</h4>
              <div class="stat-row">
                <span class="stat-icon">😢</span>
                <span class="stat-label">Inocentes detenidos</span>
                <span class="stat-value bad">{{ stats?.innocentsWronglyDetained || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">📦</span>
                <span class="stat-label">Contrabando interceptado</span>
                <span class="stat-value good">{{ stats?.contrabandIntercepted || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">📦</span>
                <span class="stat-label">Contrabando pasado</span>
                <span class="stat-value bad">{{ stats?.contrabandMissed || 0 }}</span>
              </div>
            </div>

            <!-- Speed stats -->
            <div class="stat-group">
              <h4>Velocidad</h4>
              <div class="stat-row">
                <span class="stat-icon">⏱️</span>
                <span class="stat-label">Tiempo promedio</span>
                <span class="stat-value">{{ formatTime(stats?.averageProcessingTime || 0) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">⚡</span>
                <span class="stat-label">Más rápido</span>
                <span class="stat-value good">{{ formatTime(stats?.fastestProcessing || 0) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon">🐢</span>
                <span class="stat-label">Más lento</span>
                <span class="stat-value">{{ formatTime(stats?.slowestProcessing || 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Final rating -->
        <div class="final-rating">
          <h3>CALIFICACIÓN FINAL</h3>
          <div class="rating-display">
            <span class="rating-grade" [class]="getRatingClass()">{{ calculateRating() }}</span>
            <span class="rating-title">{{ getRatingTitle() }}</span>
          </div>
          <p class="rating-description">{{ getRatingDescription() }}</p>
        </div>

        <!-- Ending narrative -->
        <div class="ending-narrative">
          <p>{{ getEndingNarrative() }}</p>
        </div>

        <!-- Actions -->
        <div class="end-actions">
          <button class="action-btn secondary" (click)="onMainMenu.emit()">
            🏠 MENÚ PRINCIPAL
          </button>
          <button class="action-btn primary" (click)="onPlayAgain.emit()">
            🔄 JUGAR DE NUEVO
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .end-game-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
      padding: 40px 20px;
      animation: fadeIn 0.5s ease-out;
    }

    .end-game-overlay.victory {
      background: linear-gradient(180deg, rgba(10, 50, 30, 0.95) 0%, rgba(10, 10, 30, 0.98) 100%);
    }

    .end-game-overlay.game-over {
      background: linear-gradient(180deg, rgba(50, 10, 10, 0.95) 0%, rgba(10, 10, 30, 0.98) 100%);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .end-game-container {
      max-width: 800px;
      width: 100%;
      animation: slideUp 0.5s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .result-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .victory-icon, .gameover-icon {
      font-size: 80px;
      margin-bottom: 16px;
      animation: bounce 1s ease infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .result-header h1 {
      font-size: 48px;
      margin: 0;
      letter-spacing: 8px;
    }

    .victory .result-header h1 {
      color: #4CAF50;
      text-shadow: 0 0 30px rgba(76, 175, 80, 0.5);
    }

    .game-over .result-header h1 {
      color: #F44336;
      text-shadow: 0 0 30px rgba(244, 67, 54, 0.5);
    }

    .result-subtitle {
      font-size: 16px;
      color: #888;
      margin-top: 8px;
    }

    .summary-section {
      margin-bottom: 32px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .summary-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #333;
      border-radius: 12px;
    }

    .card-value {
      font-size: 32px;
      font-weight: bold;
      color: #fff;
    }

    .card-label {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      text-align: center;
    }

    .summary-card.days { border-color: rgba(33, 150, 243, 0.3); }
    .summary-card.days .card-value { color: #2196F3; }

    .summary-card.visitors { border-color: rgba(156, 39, 176, 0.3); }
    .summary-card.visitors .card-value { color: #9C27B0; }

    .summary-card.accuracy { border-color: rgba(255, 152, 0, 0.3); }
    .summary-card.accuracy .card-value { color: #FF9800; }

    .summary-card.dollars { border-color: rgba(76, 175, 80, 0.3); }
    .summary-card.dollars .card-value { color: #4CAF50; }

    .detailed-stats {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .detailed-stats h3 {
      text-align: center;
      color: #fff;
      margin: 0 0 24px 0;
      font-size: 16px;
      letter-spacing: 2px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .stat-group {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 16px;
    }

    .stat-group h4 {
      color: #888;
      font-size: 12px;
      letter-spacing: 2px;
      margin: 0 0 12px 0;
      text-transform: uppercase;
    }

    .stat-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-icon {
      font-size: 16px;
      width: 24px;
    }

    .stat-label {
      flex: 1;
      font-size: 13px;
      color: #aaa;
    }

    .stat-value {
      font-size: 16px;
      font-weight: bold;
      color: #fff;
    }

    .stat-value.good { color: #4CAF50; }
    .stat-value.bad { color: #F44336; }

    .final-rating {
      text-align: center;
      margin-bottom: 32px;
      padding: 32px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
    }

    .final-rating h3 {
      color: #888;
      font-size: 12px;
      letter-spacing: 3px;
      margin: 0 0 16px 0;
    }

    .rating-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .rating-grade {
      font-size: 72px;
      font-weight: bold;
      line-height: 1;
    }

    .rating-grade.S { color: #FFD700; text-shadow: 0 0 30px rgba(255, 215, 0, 0.5); }
    .rating-grade.A { color: #4CAF50; }
    .rating-grade.B { color: #2196F3; }
    .rating-grade.C { color: #FF9800; }
    .rating-grade.D { color: #F44336; }
    .rating-grade.F { color: #9C27B0; }

    .rating-title {
      font-size: 18px;
      color: #fff;
      letter-spacing: 2px;
    }

    .rating-description {
      font-size: 14px;
      color: #666;
      margin-top: 12px;
    }

    .ending-narrative {
      text-align: center;
      padding: 24px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      margin-bottom: 32px;
    }

    .ending-narrative p {
      color: #ccc;
      font-style: italic;
      line-height: 1.8;
      margin: 0;
    }

    .end-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
    }

    .action-btn {
      padding: 16px 32px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #aaa;
    }

    .action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .action-btn.primary {
      background: linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%);
      color: #fff;
    }

    .action-btn.primary:hover {
      background: linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%);
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .result-header h1 {
        font-size: 32px;
      }

      .rating-grade {
        font-size: 56px;
      }
    }
  `]
})
export class EndGameScreenComponent {
  @Input() type: EndGameType = 'GAME_OVER';
  @Input() currentDay: number = 1;
  @Input() stats: PlayerStats | null = null;
  @Input() resources: PlayerResources | null = null;
  @Input() difficulty: GameDifficulty = 'NORMAL';
  @Input() gameOverReason: string = '';

  @Output() onPlayAgain = new EventEmitter<void>();
  @Output() onMainMenu = new EventEmitter<void>();

  formatTime(seconds: number): string {
    if (!seconds || seconds === Infinity) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  getGameOverReason(): string {
    if (this.gameOverReason) return this.gameOverReason;
    if ((this.resources?.warnings || 0) >= (this.resources?.maxWarnings || 3)) {
      return 'Demasiadas advertencias. Has sido despedido.';
    }
    if ((this.resources?.reputation || 0) <= 0) {
      return 'Tu reputación ha llegado a cero.';
    }
    return 'Tu servicio ha terminado.';
  }

  calculateRating(): string {
    const accuracy = this.stats?.accuracy || 0;
    const days = this.currentDay;
    const fugitiveRatio = this.stats?.fugitivesCaught || 0;
    const isVictory = this.type === 'VICTORY';

    // Calculate score
    let score = accuracy;
    score += (days / 30) * 20; // Up to 20 points for days
    score += fugitiveRatio * 5; // 5 points per fugitive
    if (isVictory) score += 20; // Bonus for winning

    if (score >= 95) return 'S';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  getRatingClass(): string {
    return this.calculateRating();
  }

  getRatingTitle(): string {
    const rating = this.calculateRating();
    const titles: Record<string, string> = {
      'S': 'LEYENDA DIMENSIONAL',
      'A': 'INSPECTOR ÉLITE',
      'B': 'INSPECTOR COMPETENTE',
      'C': 'INSPECTOR PROMEDIO',
      'D': 'INSPECTOR DEFICIENTE',
      'F': 'FRACASO TOTAL',
    };
    return titles[rating] || 'INSPECTOR';
  }

  getRatingDescription(): string {
    const rating = this.calculateRating();
    const descriptions: Record<string, string> = {
      'S': 'Tu nombre será recordado en los anales de QDT.',
      'A': 'Excelente trabajo. Pocos alcanzan este nivel.',
      'B': 'Buen desempeño. Hay espacio para mejorar.',
      'C': 'Cumpliste con tu deber, nada más.',
      'D': 'Necesitas más entrenamiento.',
      'F': 'El Director Lars está muy decepcionado.',
    };
    return descriptions[rating] || '';
  }

  getEndingNarrative(): string {
    const rating = this.calculateRating();
    const isVictory = this.type === 'VICTORY';

    if (isVictory) {
      if (rating === 'S' || rating === 'A') {
        return 'Te retiras como héroe. Las dimensiones te deben su seguridad. El Director Lars personalmente te entrega una medalla. "Inspector", dice, "has superado todas las expectativas. Que tu legado inspire a las futuras generaciones."';
      }
      if (rating === 'B' || rating === 'C') {
        return 'Completas tu servicio con dignidad. No eres una leyenda, pero tampoco un fracaso. El sistema funciona gracias a inspectores como tú. Silenciosos, constantes, necesarios.';
      }
      return 'Sobreviviste. Apenas. Pero sobreviviste. A veces eso es suficiente en este trabajo.';
    } else {
      if ((this.resources?.warnings || 0) >= (this.resources?.maxWarnings || 3)) {
        return 'Las advertencias se acumularon. El Supervisor Krell te mira con decepción mientras recoges tus cosas. "El portal no perdona la incompetencia", dice. Tu carrera en QDT ha terminado.';
      }
      return 'Los portales seguirán funcionando sin ti. Otro inspector ocupará tu lugar mañana. Así es este trabajo: implacable, necesario, eterno. Tú solo fuiste un eslabón en la cadena.';
    }
  }
}
