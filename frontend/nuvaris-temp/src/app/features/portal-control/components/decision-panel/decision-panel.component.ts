/**
 * PORTAL CONTROL - Decision Panel Component
 * Buttons for making decisions on visitors
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetectionFlag, DecisionType } from '../../models';

@Component({
  selector: 'app-decision-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="decision-panel" [class.disabled]="!hasVisitor">
      <div class="panel-header">
        <h3>⚖️ DECISIÓN</h3>
        @if (processingTime > 0) {
          <span class="timer">{{ formatTime(processingTime) }}</span>
        }
      </div>

      <!-- Flags summary -->
      @if (flags.length > 0) {
        <div class="flags-summary">
          <span class="flags-count">{{ flags.length }} anomalía(s) detectada(s)</span>
          <div class="flags-list">
            @for (flag of flags.slice(0, 3); track flag) {
              <span class="flag-item">⚠️ {{ formatFlag(flag) }}</span>
            }
            @if (flags.length > 3) {
              <span class="more-flags">+{{ flags.length - 3 }} más...</span>
            }
          </div>
        </div>
      }

      <!-- Decision buttons -->
      <div class="decision-buttons">
        <button class="decision-btn approve"
                (click)="makeDecision('APROBAR')"
                [disabled]="!hasVisitor">
          <span class="btn-icon">✅</span>
          <span class="btn-text">APROBAR</span>
          <span class="btn-hint">Entrada permitida</span>
        </button>

        <button class="decision-btn deny"
                (click)="makeDecision('DENEGAR')"
                [disabled]="!hasVisitor">
          <span class="btn-icon">❌</span>
          <span class="btn-text">DENEGAR</span>
          <span class="btn-hint">Rechazar entrada</span>
        </button>

        <button class="decision-btn detain"
                (click)="makeDecision('DETENER')"
                [disabled]="!hasVisitor">
          <span class="btn-icon">🚨</span>
          <span class="btn-text">DETENER</span>
          <span class="btn-hint">Arrestar para investigación</span>
        </button>

        <button class="decision-btn quarantine"
                (click)="makeDecision('CUARENTENA')"
                [disabled]="!hasVisitor">
          <span class="btn-icon">🏥</span>
          <span class="btn-text">CUARENTENA</span>
          <span class="btn-hint">Aislamiento médico</span>
        </button>

        <button class="decision-btn omega"
                (click)="confirmOmega()"
                [disabled]="!hasVisitor"
                [class.confirm]="showOmegaConfirm">
          <span class="btn-icon">☠️</span>
          <span class="btn-text">{{ showOmegaConfirm ? '¿CONFIRMAR?' : 'SECTOR OMEGA' }}</span>
          <span class="btn-hint">{{ showOmegaConfirm ? 'Click para confirmar' : 'Contención extrema' }}</span>
        </button>
      </div>

      <!-- Keyboard shortcuts hint -->
      <div class="shortcuts-hint">
        <span>Atajos: [1] Aprobar [2] Denegar [3] Detener [4] Cuarentena [5] Omega</span>
      </div>
    </div>
  `,
  styles: [`
    .decision-panel {
      width: 100%;
      background: #1a1a2e;
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
    }

    .decision-panel.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .panel-header {
      background: #222;
      padding: 12px 16px;
      border-bottom: 2px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 14px;
      color: #FFC107;
      letter-spacing: 1px;
    }

    .timer {
      font-family: monospace;
      font-size: 18px;
      color: #4CAF50;
    }

    .flags-summary {
      padding: 12px 16px;
      background: rgba(244,67,54,0.1);
      border-bottom: 1px solid rgba(244,67,54,0.3);
    }

    .flags-count {
      color: #F44336;
      font-size: 12px;
      font-weight: bold;
      display: block;
      margin-bottom: 8px;
    }

    .flags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .flag-item {
      background: rgba(244,67,54,0.2);
      color: #F44336;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
    }

    .more-flags {
      color: #888;
      font-size: 10px;
    }

    .decision-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 16px;
    }

    .decision-btn {
      background: #2a2a3e;
      border: 2px solid #444;
      border-radius: 8px;
      padding: 16px 12px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .decision-btn:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .decision-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .decision-btn.approve {
      border-color: #4CAF50;
    }
    .decision-btn.approve:hover:not(:disabled) {
      background: rgba(76,175,80,0.2);
      box-shadow: 0 4px 12px rgba(76,175,80,0.3);
    }

    .decision-btn.deny {
      border-color: #FF9800;
    }
    .decision-btn.deny:hover:not(:disabled) {
      background: rgba(255,152,0,0.2);
      box-shadow: 0 4px 12px rgba(255,152,0,0.3);
    }

    .decision-btn.detain {
      border-color: #F44336;
    }
    .decision-btn.detain:hover:not(:disabled) {
      background: rgba(244,67,54,0.2);
      box-shadow: 0 4px 12px rgba(244,67,54,0.3);
    }

    .decision-btn.quarantine {
      border-color: #2196F3;
    }
    .decision-btn.quarantine:hover:not(:disabled) {
      background: rgba(33,150,243,0.2);
      box-shadow: 0 4px 12px rgba(33,150,243,0.3);
    }

    .decision-btn.omega {
      grid-column: span 2;
      border-color: #9C27B0;
      background: #1a1a2e;
    }
    .decision-btn.omega:hover:not(:disabled) {
      background: rgba(156,39,176,0.2);
      box-shadow: 0 4px 12px rgba(156,39,176,0.3);
    }
    .decision-btn.omega.confirm {
      animation: omegaPulse 0.5s ease-in-out infinite;
      background: rgba(156,39,176,0.3);
    }

    @keyframes omegaPulse {
      0%, 100% { border-color: #9C27B0; }
      50% { border-color: #F44336; }
    }

    .btn-icon {
      font-size: 24px;
    }

    .btn-text {
      font-weight: bold;
      font-size: 12px;
      letter-spacing: 1px;
    }

    .btn-hint {
      font-size: 9px;
      color: #666;
    }

    .shortcuts-hint {
      padding: 8px 16px;
      background: #222;
      border-top: 1px solid #333;
      text-align: center;
    }

    .shortcuts-hint span {
      font-size: 10px;
      color: #555;
    }
  `]
})
export class DecisionPanelComponent {
  @Input() hasVisitor: boolean = false;
  @Input() flags: DetectionFlag[] = [];
  @Input() processingTime: number = 0;
  @Output() onDecision = new EventEmitter<DecisionType>();

  showOmegaConfirm = false;
  private omegaTimeout: any = null;

  makeDecision(decision: DecisionType): void {
    this.showOmegaConfirm = false;
    this.onDecision.emit(decision);
  }

  confirmOmega(): void {
    if (this.showOmegaConfirm) {
      this.makeDecision('OMEGA');
    } else {
      this.showOmegaConfirm = true;
      // Reset after 3 seconds
      this.omegaTimeout = setTimeout(() => {
        this.showOmegaConfirm = false;
      }, 3000);
    }
  }

  formatFlag(flag: string): string {
    return flag.replace(/_/g, ' ').substring(0, 20);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    if (this.omegaTimeout) {
      clearTimeout(this.omegaTimeout);
    }
  }
}
