/**
 * PORTAL CONTROL - Day Summary Component
 * Detailed end of day statistics and summary
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessedVisitor, PlayerResources, DayState } from '../../models';

@Component({
  selector: 'app-day-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="summary-overlay">
      <div class="summary-container">
        <!-- Header -->
        <div class="summary-header">
          <div class="day-badge">DÍA {{ dayNumber }}</div>
          <h2>📋 INFORME DE JORNADA</h2>
          <p class="header-subtitle">Resumen de actividades del día</p>
        </div>

        <!-- Quick stats -->
        <div class="quick-stats">
          <div class="quick-stat">
            <span class="stat-number">{{ processedVisitors.length }}</span>
            <span class="stat-label">Procesados</span>
          </div>
          <div class="quick-stat correct">
            <span class="stat-number">{{ getCorrectCount() }}</span>
            <span class="stat-label">Correctas</span>
          </div>
          <div class="quick-stat incorrect">
            <span class="stat-number">{{ getIncorrectCount() }}</span>
            <span class="stat-label">Errores</span>
          </div>
          <div class="quick-stat accuracy">
            <span class="stat-number">{{ getAccuracy() | number:'1.0-0' }}%</span>
            <span class="stat-label">Precisión</span>
          </div>
        </div>

        <!-- Earnings breakdown -->
        <div class="earnings-section">
          <h3>💰 BALANCE FINANCIERO</h3>
          <div class="earnings-breakdown">
            <div class="earning-row positive">
              <span class="earning-label">Ganancias del día</span>
              <span class="earning-value">+\${{ resources?.dailyDollarsEarned || 0 }}</span>
            </div>
            <div class="earning-row negative">
              <span class="earning-label">Penalizaciones</span>
              <span class="earning-value">-\${{ resources?.dailyDollarsPenalty || 0 }}</span>
            </div>
            @if ((resources?.dailyBonus || 0) > 0) {
              <div class="earning-row bonus">
                <span class="earning-label">Bonus del día</span>
                <span class="earning-value">+\${{ resources?.dailyBonus || 0 }}</span>
              </div>
            }
            <div class="earning-row total">
              <span class="earning-label">Balance neto</span>
              <span class="earning-value" [class.positive]="getNetBalance() >= 0" [class.negative]="getNetBalance() < 0">
                {{ getNetBalance() >= 0 ? '+' : '' }}\${{ getNetBalance() }}
              </span>
            </div>
            <div class="earning-divider"></div>
            <div class="earning-row final">
              <span class="earning-label">Dólares totales</span>
              <span class="earning-value">\${{ resources?.dollars || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Decisions log -->
        <div class="decisions-section">
          <h3>📝 REGISTRO DE DECISIONES</h3>
          <div class="decisions-log">
            @for (visitor of processedVisitors; track visitor.visitor.id; let i = $index) {
              <div class="decision-entry" [class.correct]="visitor.evaluation.wasCorrect" [class.incorrect]="!visitor.evaluation.wasCorrect">
                <span class="entry-number">#{{ i + 1 }}</span>
                <span class="entry-name">{{ visitor.visitor.name }}</span>
                <span class="entry-species">{{ visitor.visitor.declaredSpecies }}</span>
                <span class="entry-decision">{{ visitor.decision.decision }}</span>
                <span class="entry-result">
                  {{ visitor.evaluation.wasCorrect ? '✓' : '✗' }}
                </span>
                <span class="entry-points" [class.positive]="visitor.evaluation.finalPoints > 0" [class.negative]="visitor.evaluation.finalPoints < 0">
                  {{ visitor.evaluation.finalPoints > 0 ? '+' : '' }}{{ visitor.evaluation.finalPoints }}
                </span>
              </div>
            } @empty {
              <div class="no-decisions">
                No se procesaron visitantes hoy.
              </div>
            }
          </div>
        </div>

        <!-- Warnings status -->
        <div class="warnings-section">
          <h3>⚠️ ESTADO DE ADVERTENCIAS</h3>
          <div class="warnings-display">
            <div class="warning-boxes">
              @for (w of getWarningArray(); track w; let i = $index) {
                <div class="warning-box" [class.active]="i < (resources?.warnings || 0)"></div>
              }
            </div>
            <p class="warnings-text">
              {{ resources?.warnings || 0 }} de {{ resources?.maxWarnings || 3 }} advertencias
              @if ((resources?.warnings || 0) >= ((resources?.maxWarnings || 3) - 1)) {
                <span class="danger-text">¡PELIGRO!</span>
              }
            </p>
          </div>
        </div>

        <!-- Performance grade -->
        <div class="grade-section">
          <h3>📊 CALIFICACIÓN DEL DÍA</h3>
          <div class="grade-display">
            <span class="grade-letter" [class]="getDayGrade()">{{ getDayGrade() }}</span>
            <span class="grade-description">{{ getGradeDescription() }}</span>
          </div>
        </div>

        <!-- Next day preview -->
        @if (dayNumber < 30) {
          <div class="preview-section">
            <h3>📅 MAÑANA</h3>
            <div class="preview-content">
              <p>Día {{ dayNumber + 1 }} de 30</p>
              @if (newToolsNextDay.length > 0) {
                <p class="new-tools">🔧 Nuevas herramientas disponibles: {{ newToolsNextDay.join(', ') }}</p>
              }
              @if (hasSpecialAlertTomorrow) {
                <p class="special-alert">🚨 Se esperan condiciones especiales</p>
              }
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="summary-actions">
          @if (canAccessShop) {
            <button class="action-btn shop" (click)="onOpenShop.emit()">
              🏪 TIENDA
            </button>
          }
          <button class="action-btn continue" (click)="onContinue.emit()">
            @if (dayNumber >= 30) {
              🏆 VER RESULTADOS FINALES
            } @else {
              ➡️ CONTINUAR AL DÍA {{ dayNumber + 1 }}
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .summary-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
      padding: 40px 20px;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .summary-container {
      max-width: 700px;
      width: 100%;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #333;
      border-radius: 16px;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .summary-header {
      text-align: center;
      padding: 24px;
      border-bottom: 1px solid #333;
    }

    .day-badge {
      display: inline-block;
      padding: 4px 16px;
      background: rgba(139, 92, 246, 0.3);
      border: 1px solid rgba(139, 92, 246, 0.5);
      border-radius: 20px;
      color: #A78BFA;
      font-size: 12px;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }

    .summary-header h2 {
      margin: 0;
      color: #fff;
      font-size: 24px;
    }

    .header-subtitle {
      color: #666;
      font-size: 14px;
      margin: 8px 0 0 0;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      background: #333;
      margin: 0;
    }

    .quick-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 16px;
      background: #1a1a2e;
    }

    .quick-stat .stat-number {
      font-size: 28px;
      font-weight: bold;
      color: #fff;
    }

    .quick-stat .stat-label {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    .quick-stat.correct .stat-number { color: #4CAF50; }
    .quick-stat.incorrect .stat-number { color: #F44336; }
    .quick-stat.accuracy .stat-number { color: #FFC107; }

    h3 {
      color: #888;
      font-size: 12px;
      letter-spacing: 2px;
      margin: 0 0 16px 0;
      text-transform: uppercase;
    }

    .earnings-section {
      padding: 24px;
      border-bottom: 1px solid #333;
    }

    .earnings-breakdown {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 16px;
    }

    .earning-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }

    .earning-label {
      color: #aaa;
      font-size: 14px;
    }

    .earning-value {
      font-weight: bold;
      font-size: 14px;
    }

    .earning-row.positive .earning-value { color: #4CAF50; }
    .earning-row.negative .earning-value { color: #F44336; }
    .earning-row.bonus .earning-value { color: #FFC107; }
    .earning-row.total {
      border-top: 1px solid #444;
      margin-top: 8px;
      padding-top: 16px;
    }
    .earning-row.total .earning-value.positive { color: #4CAF50; }
    .earning-row.total .earning-value.negative { color: #F44336; }

    .earning-divider {
      height: 1px;
      background: #333;
      margin: 12px 0;
    }

    .earning-row.final .earning-label,
    .earning-row.final .earning-value {
      font-size: 18px;
      color: #fff;
    }

    .decisions-section {
      padding: 24px;
      border-bottom: 1px solid #333;
    }

    .decisions-log {
      max-height: 200px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }

    .decision-entry {
      display: grid;
      grid-template-columns: 40px 1fr 100px 80px 30px 50px;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 12px;
      align-items: center;
    }

    .decision-entry:last-child {
      border-bottom: none;
    }

    .decision-entry.correct {
      background: rgba(76, 175, 80, 0.05);
    }

    .decision-entry.incorrect {
      background: rgba(244, 67, 54, 0.05);
    }

    .entry-number {
      color: #555;
    }

    .entry-name {
      color: #fff;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entry-species {
      color: #888;
      font-size: 10px;
    }

    .entry-decision {
      color: #A78BFA;
      font-size: 10px;
      text-transform: uppercase;
    }

    .entry-result {
      text-align: center;
      font-size: 14px;
    }

    .correct .entry-result { color: #4CAF50; }
    .incorrect .entry-result { color: #F44336; }

    .entry-points {
      text-align: right;
      font-weight: bold;
    }

    .entry-points.positive { color: #4CAF50; }
    .entry-points.negative { color: #F44336; }

    .no-decisions {
      padding: 20px;
      text-align: center;
      color: #555;
    }

    .warnings-section {
      padding: 24px;
      border-bottom: 1px solid #333;
    }

    .warnings-display {
      text-align: center;
    }

    .warning-boxes {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .warning-box {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid #333;
      border-radius: 8px;
    }

    .warning-box.active {
      background: rgba(244, 67, 54, 0.3);
      border-color: #F44336;
    }

    .warnings-text {
      color: #888;
      font-size: 14px;
      margin: 0;
    }

    .danger-text {
      color: #F44336;
      font-weight: bold;
      margin-left: 8px;
    }

    .grade-section {
      padding: 24px;
      border-bottom: 1px solid #333;
    }

    .grade-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .grade-letter {
      font-size: 48px;
      font-weight: bold;
    }

    .grade-letter.S { color: #FFD700; }
    .grade-letter.A { color: #4CAF50; }
    .grade-letter.B { color: #2196F3; }
    .grade-letter.C { color: #FF9800; }
    .grade-letter.D { color: #F44336; }

    .grade-description {
      color: #aaa;
      font-size: 16px;
    }

    .preview-section {
      padding: 24px;
      border-bottom: 1px solid #333;
    }

    .preview-content {
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      padding: 16px;
    }

    .preview-content p {
      margin: 0 0 8px 0;
      color: #aaa;
      font-size: 14px;
    }

    .preview-content p:last-child {
      margin-bottom: 0;
    }

    .new-tools {
      color: #4CAF50 !important;
    }

    .special-alert {
      color: #FFC107 !important;
    }

    .summary-actions {
      display: flex;
      gap: 12px;
      padding: 24px;
    }

    .action-btn {
      flex: 1;
      padding: 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.shop {
      background: rgba(255, 193, 7, 0.2);
      border: 1px solid rgba(255, 193, 7, 0.5);
      color: #FFC107;
    }

    .action-btn.shop:hover {
      background: rgba(255, 193, 7, 0.3);
    }

    .action-btn.continue {
      flex: 2;
      background: linear-gradient(180deg, #4CAF50 0%, #388E3C 100%);
      color: #fff;
    }

    .action-btn.continue:hover {
      background: linear-gradient(180deg, #66BB6A 0%, #43A047 100%);
      transform: translateY(-2px);
    }
  `]
})
export class DaySummaryComponent {
  @Input() dayNumber: number = 1;
  @Input() processedVisitors: ProcessedVisitor[] = [];
  @Input() resources: PlayerResources | null = null;
  @Input() canAccessShop: boolean = true;
  @Input() newToolsNextDay: string[] = [];
  @Input() hasSpecialAlertTomorrow: boolean = false;

  @Output() onContinue = new EventEmitter<void>();
  @Output() onOpenShop = new EventEmitter<void>();

  getCorrectCount(): number {
    return this.processedVisitors.filter(v => v.evaluation.wasCorrect).length;
  }

  getIncorrectCount(): number {
    return this.processedVisitors.filter(v => !v.evaluation.wasCorrect).length;
  }

  getAccuracy(): number {
    if (this.processedVisitors.length === 0) return 0;
    return (this.getCorrectCount() / this.processedVisitors.length) * 100;
  }

  getNetBalance(): number {
    if (!this.resources) return 0;
    return (this.resources.dailyDollarsEarned || 0) -
           (this.resources.dailyDollarsPenalty || 0) +
           (this.resources.dailyBonus || 0);
  }

  getWarningArray(): number[] {
    return Array(this.resources?.maxWarnings || 3).fill(0);
  }

  getDayGrade(): string {
    const accuracy = this.getAccuracy();
    const processed = this.processedVisitors.length;

    if (processed === 0) return 'C';

    let score = accuracy;
    if (processed >= 10) score += 10;
    if (processed >= 15) score += 10;

    if (score >= 95) return 'S';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  }

  getGradeDescription(): string {
    const grade = this.getDayGrade();
    const descriptions: Record<string, string> = {
      'S': 'Día perfecto',
      'A': 'Excelente trabajo',
      'B': 'Buen desempeño',
      'C': 'Aceptable',
      'D': 'Necesitas mejorar',
    };
    return descriptions[grade] || '';
  }
}
