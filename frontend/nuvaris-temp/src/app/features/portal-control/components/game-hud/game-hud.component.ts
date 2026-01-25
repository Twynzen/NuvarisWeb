/**
 * PORTAL CONTROL - Game HUD Component
 * Displays game status, day info, resources
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerResources, DayState, PlayerStats, GamePhase } from '../../models';

@Component({
  selector: 'app-game-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-hud">
      <!-- Top bar -->
      <div class="top-bar">
        <!-- Day info -->
        <div class="day-info">
          <span class="day-label">DÍA</span>
          <span class="day-number">{{ dayState?.dayNumber || 1 }}</span>
        </div>

        <!-- Time remaining -->
        <div class="time-info" [class.warning]="isTimeLow()" [class.critical]="isTimeCritical()">
          <span class="time-icon">⏱️</span>
          <span class="time-value">{{ formatTime(dayState?.timeRemaining || 0) }}</span>
        </div>

        <!-- Dollars (Oro Blanco) -->
        <div class="dollars-info">
          <span class="dollars-icon">💵</span>
          <span class="dollars-value">\${{ resources?.dollars || 0 }}</span>
        </div>

        <!-- Reputation -->
        <div class="reputation-info">
          <span class="rep-icon">⭐</span>
          <span class="rep-value">{{ resources?.reputation || 50 }}</span>
          <div class="rep-bar">
            <div class="rep-fill" [style.width.%]="resources?.reputation || 50"></div>
          </div>
        </div>

        <!-- Warnings -->
        <div class="warnings-info" [class.has-warnings]="(resources?.warnings || 0) > 0">
          <span class="warning-icon">⚠️</span>
          <span class="warning-value">{{ resources?.warnings || 0 }}/{{ resources?.maxWarnings || 3 }}</span>
        </div>

        <!-- Pause button -->
        <button class="pause-btn" (click)="onPause.emit()">
          {{ isPaused ? '▶️' : '⏸️' }}
        </button>

        <!-- Menu button -->
        <button class="menu-btn" (click)="onMenu.emit()">
          ☰
        </button>
      </div>

      <!-- Stats bar (collapsible) -->
      <div class="stats-bar" [class.expanded]="showStats">
        <button class="stats-toggle" (click)="showStats = !showStats">
          📊 Estadísticas {{ showStats ? '▲' : '▼' }}
        </button>
        @if (showStats && stats) {
          <div class="stats-content">
            <div class="stat-item">
              <span class="stat-label">Procesados:</span>
              <span class="stat-value">{{ stats.totalVisitorsProcessed }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Precisión:</span>
              <span class="stat-value">{{ stats.accuracy | number:'1.0-0' }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Fugitivos:</span>
              <span class="stat-value good">{{ stats.fugitivesCaught }}</span>
              <span class="stat-separator">/</span>
              <span class="stat-value bad">{{ stats.fugitivesMissed }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Impostores:</span>
              <span class="stat-value good">{{ stats.impostorsDetected }}</span>
              <span class="stat-separator">/</span>
              <span class="stat-value bad">{{ stats.impostorsMissed }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Queue indicator -->
      <div class="queue-info">
        <span class="queue-icon">👥</span>
        <span class="queue-label">Cola:</span>
        <span class="queue-value">{{ dayState?.visitorQueue?.length || 0 }}</span>
        <span class="queue-processed">
          ({{ dayState?.processedVisitors?.length || 0 }} procesados)
        </span>
      </div>

      <!-- Special alerts -->
      @if (dayState?.rules?.specialAlerts?.length) {
        <div class="alerts-bar">
          @for (alert of dayState?.rules?.specialAlerts; track alert.id) {
            <div class="alert-item" [class]="alert.priority">
              <span class="alert-icon">🚨</span>
              <span class="alert-title">{{ alert.title }}</span>
              <span class="alert-desc">{{ alert.description }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .game-hud {
      width: 100%;
      user-select: none;
    }

    .top-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      border-bottom: 2px solid #333;
    }

    .day-info {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .day-label {
      font-size: 10px;
      color: #666;
      letter-spacing: 2px;
    }

    .day-number {
      font-size: 28px;
      font-weight: bold;
      color: white;
      line-height: 1;
    }

    .time-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #2a2a3e;
      border-radius: 8px;
    }

    .time-info.warning {
      background: rgba(255,152,0,0.2);
      animation: pulse 1s ease-in-out infinite;
    }

    .time-info.critical {
      background: rgba(244,67,54,0.2);
      animation: pulse 0.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .time-icon {
      font-size: 20px;
    }

    .time-value {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      color: white;
    }

    .dollars-info {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(255,193,7,0.1);
      border-radius: 8px;
      border: 1px solid rgba(255,193,7,0.3);
    }

    .dollars-icon {
      font-size: 18px;
    }

    .dollars-value {
      font-size: 18px;
      font-weight: bold;
      color: #FFC107;
    }

    .reputation-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 200px;
    }

    .rep-icon {
      font-size: 18px;
    }

    .rep-value {
      font-size: 14px;
      color: white;
      min-width: 30px;
    }

    .rep-bar {
      flex: 1;
      height: 8px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
    }

    .rep-fill {
      height: 100%;
      background: linear-gradient(90deg, #F44336 0%, #FFC107 50%, #4CAF50 100%);
      transition: width 0.3s;
    }

    .warnings-info {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #2a2a3e;
      border-radius: 8px;
    }

    .warnings-info.has-warnings {
      background: rgba(244,67,54,0.2);
      border: 1px solid rgba(244,67,54,0.5);
    }

    .warning-icon {
      font-size: 16px;
    }

    .warning-value {
      font-size: 14px;
      color: #aaa;
    }

    .has-warnings .warning-value {
      color: #F44336;
      font-weight: bold;
    }

    .pause-btn, .menu-btn {
      width: 40px;
      height: 40px;
      background: #2a2a3e;
      border: 1px solid #444;
      border-radius: 8px;
      color: white;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pause-btn:hover, .menu-btn:hover {
      background: #3a3a4e;
      border-color: #666;
    }

    .stats-bar {
      background: #16213e;
      border-bottom: 1px solid #333;
    }

    .stats-toggle {
      width: 100%;
      padding: 8px;
      background: none;
      border: none;
      color: #666;
      font-size: 12px;
      cursor: pointer;
    }

    .stats-toggle:hover {
      color: #aaa;
    }

    .stats-content {
      display: flex;
      gap: 24px;
      padding: 8px 20px 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stat-label {
      font-size: 11px;
      color: #666;
    }

    .stat-value {
      font-size: 14px;
      font-weight: bold;
      color: white;
    }

    .stat-value.good {
      color: #4CAF50;
    }

    .stat-value.bad {
      color: #F44336;
    }

    .stat-separator {
      color: #444;
    }

    .queue-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: #1a1a2e;
      border-bottom: 1px solid #333;
      font-size: 12px;
    }

    .queue-icon {
      font-size: 16px;
    }

    .queue-label {
      color: #666;
    }

    .queue-value {
      font-weight: bold;
      color: white;
    }

    .queue-processed {
      color: #555;
    }

    .alerts-bar {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 20px;
      background: rgba(244,67,54,0.1);
    }

    .alert-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      border-left: 3px solid #F44336;
    }

    .alert-item.medium {
      border-left-color: #FFC107;
    }

    .alert-item.high {
      border-left-color: #F44336;
      animation: alertPulse 2s ease-in-out infinite;
    }

    .alert-item.critical {
      border-left-color: #9C27B0;
      animation: alertPulse 1s ease-in-out infinite;
    }

    @keyframes alertPulse {
      0%, 100% { background: rgba(0,0,0,0.3); }
      50% { background: rgba(244,67,54,0.2); }
    }

    .alert-icon {
      font-size: 14px;
    }

    .alert-title {
      font-weight: bold;
      font-size: 11px;
      color: white;
    }

    .alert-desc {
      font-size: 10px;
      color: #aaa;
    }
  `]
})
export class GameHudComponent {
  @Input() dayState: DayState | null = null;
  @Input() resources: PlayerResources | null = null;
  @Input() stats: PlayerStats | null = null;
  @Input() isPaused: boolean = false;
  @Output() onPause = new EventEmitter<void>();
  @Output() onMenu = new EventEmitter<void>();

  showStats = false;

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  isTimeLow(): boolean {
    return (this.dayState?.timeRemaining || 0) < 60;
  }

  isTimeCritical(): boolean {
    return (this.dayState?.timeRemaining || 0) < 30;
  }
}
