/**
 * PORTAL CONTROL - Scanner Panel Component
 * Displays available tools and their results
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectorTool, InspectorToolState, ScannerResults, ToolUseResult } from '../../models';
import { INSPECTOR_TOOLS } from '../../data';

@Component({
  selector: 'app-scanner-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scanner-panel">
      <div class="panel-header">
        <h3>🔬 HERRAMIENTAS</h3>
      </div>

      <!-- Tool grid -->
      <div class="tool-grid">
        @for (tool of getAvailableTools(); track tool.tool) {
          <button class="tool-btn"
                  [class.disabled]="!canUseTool(tool)"
                  [class.on-cooldown]="tool.currentCooldown > 0"
                  [class.used]="hasResult(tool.tool)"
                  (click)="useTool(tool.tool)"
                  [disabled]="!canUseTool(tool)"
                  [title]="tool.description">
            <span class="tool-icon">{{ getToolIcon(tool.tool) }}</span>
            <span class="tool-name">{{ tool.shortDescription }}</span>
            @if (tool.currentCooldown > 0) {
              <span class="cooldown-indicator">{{ tool.currentCooldown | number:'1.0-0' }}s</span>
            }
            @if (tool.useCost > 0) {
              <span class="cost-indicator">💰{{ tool.useCost }}</span>
            }
          </button>
        }
      </div>

      <!-- Results display -->
      <div class="results-section">
        <h4>📊 RESULTADOS</h4>
        <div class="results-list">
          @if (hasAnyResults()) {
            @if (scannerResults?.massScanner) {
              <div class="result-item" [class.anomaly]="scannerResults.massScanner.anomalyDetected">
                <span class="result-icon">⚖️</span>
                <span class="result-label">Peso:</span>
                <span class="result-value">{{ scannerResults.massScanner.measuredWeight }}kg</span>
                @if (scannerResults.massScanner.anomalyDetected) {
                  <span class="anomaly-badge">!</span>
                }
              </div>
            }

            @if (scannerResults?.thermalScanner) {
              <div class="result-item" [class.anomaly]="scannerResults.thermalScanner.heatSignature === 'irregular'">
                <span class="result-icon">🌡️</span>
                <span class="result-label">Temperatura:</span>
                <span class="result-value">{{ scannerResults.thermalScanner.measuredTemperature }}°C</span>
                <span class="result-detail">({{ scannerResults.thermalScanner.heatSignature }})</span>
              </div>
            }

            @if (scannerResults?.uvScanner) {
              <div class="result-item">
                <span class="result-icon">💜</span>
                <span class="result-label">Luz UV:</span>
                <span class="result-value">{{ scannerResults.uvScanner.bloodGlowDetected ? 'Brillo detectado' : 'Sin brillo' }}</span>
              </div>
              @if (scannerResults.uvScanner.hiddenMarkingsFound?.length) {
                <div class="result-sub">
                  @for (mark of scannerResults.uvScanner.hiddenMarkingsFound; track mark) {
                    <span class="marking">{{ mark }}</span>
                  }
                </div>
              }
            }

            @if (scannerResults?.magnetometer) {
              <div class="result-item">
                <span class="result-icon">🧲</span>
                <span class="result-label">Magnetómetro:</span>
                <span class="result-value">{{ scannerResults.magnetometer.metallicPresence ? 'Positivo' : 'Negativo' }}</span>
                @if (scannerResults.magnetometer.metalType) {
                  <span class="result-detail">({{ scannerResults.magnetometer.metalType }})</span>
                }
              </div>
            }

            @if (scannerResults?.dimensionalVisor) {
              <div class="result-item" [class.anomaly]="!scannerResults.dimensionalVisor.signatureMatch">
                <span class="result-icon">👁️</span>
                <span class="result-label">Firma Dim.:</span>
                <span class="result-value">{{ scannerResults.dimensionalVisor.signatureMatch ? 'Coincide' : 'NO COINCIDE' }}</span>
              </div>
              <div class="result-item" [class.anomaly]="scannerResults.dimensionalVisor.radiationLevel !== 'safe'">
                <span class="result-icon">☢️</span>
                <span class="result-label">Radiación:</span>
                <span class="result-value radiation-{{ scannerResults.dimensionalVisor.radiationLevel }}">
                  {{ scannerResults.dimensionalVisor.radiationLevel | uppercase }}
                </span>
              </div>
            }

            @if (scannerResults?.intentionDetector) {
              <div class="result-item" [class.anomaly]="scannerResults.intentionDetector.deceptionProbability > 60">
                <span class="result-icon">🧠</span>
                <span class="result-label">Engaño:</span>
                <span class="result-value">{{ scannerResults.intentionDetector.deceptionProbability }}%</span>
                <div class="progress-bar">
                  <div class="progress-fill deception"
                       [style.width.%]="scannerResults.intentionDetector.deceptionProbability">
                  </div>
                </div>
              </div>
              <div class="result-item">
                <span class="result-icon">😠</span>
                <span class="result-label">Hostilidad:</span>
                <span class="result-value">{{ scannerResults.intentionDetector.hostilityLevel }}%</span>
                <div class="progress-bar">
                  <div class="progress-fill hostility"
                       [style.width.%]="scannerResults.intentionDetector.hostilityLevel">
                  </div>
                </div>
              </div>
            }

            @if (scannerResults?.ulnarResonator) {
              <div class="result-item" [class.anomaly]="!scannerResults.ulnarResonator.ulnarResponse">
                <span class="result-icon">📡</span>
                <span class="result-label">Resonancia Ulnar:</span>
                <span class="result-value">
                  {{ scannerResults.ulnarResonator.ulnarResponse
                     ? 'Positiva (' + scannerResults.ulnarResonator.ulnarCount + ' Ulnar)'
                     : 'SIN RESPUESTA' }}
                </span>
              </div>
            }
          } @else {
            <div class="no-results">
              <p>Sin escaneos realizados</p>
              <p class="hint">Usa las herramientas para inspeccionar al visitante</p>
            </div>
          }
        </div>
      </div>

      <!-- Last tool message -->
      @if (lastToolResult) {
        <div class="last-result-message" [class.has-flags]="lastToolResult.flagsRaised.length > 0">
          {{ lastToolResult.message }}
          @if (lastToolResult.flagsRaised.length > 0) {
            <div class="flags-raised">
              @for (flag of lastToolResult.flagsRaised; track flag) {
                <span class="flag">⚠️ {{ formatFlag(flag) }}</span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .scanner-panel {
      width: 280px;
      background: #1a1a2e;
      border: 2px solid #333;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      background: #222;
      padding: 12px 16px;
      border-bottom: 2px solid #333;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 14px;
      color: #4CAF50;
      letter-spacing: 1px;
    }

    .tool-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 12px;
    }

    .tool-btn {
      background: #2a2a3e;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 12px 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      position: relative;
    }

    .tool-btn:hover:not(:disabled) {
      background: #3a3a4e;
      border-color: #4CAF50;
      transform: translateY(-2px);
    }

    .tool-btn.disabled, .tool-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tool-btn.on-cooldown {
      background: #333;
    }

    .tool-btn.used {
      border-color: #4CAF50;
      box-shadow: 0 0 8px rgba(76,175,80,0.3);
    }

    .tool-icon {
      font-size: 24px;
    }

    .tool-name {
      font-size: 10px;
      text-align: center;
      line-height: 1.2;
    }

    .cooldown-indicator {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #F44336;
      color: white;
      font-size: 9px;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .cost-indicator {
      position: absolute;
      bottom: 4px;
      right: 4px;
      font-size: 9px;
      color: #FFC107;
    }

    .results-section {
      flex: 1;
      padding: 12px;
      border-top: 1px solid #333;
      overflow-y: auto;
    }

    .results-section h4 {
      margin: 0 0 12px 0;
      font-size: 12px;
      color: #888;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #2a2a3e;
      border-radius: 4px;
      font-size: 11px;
      flex-wrap: wrap;
    }

    .result-item.anomaly {
      background: rgba(244,67,54,0.2);
      border-left: 3px solid #F44336;
    }

    .result-icon {
      font-size: 16px;
    }

    .result-label {
      color: #888;
    }

    .result-value {
      color: white;
      font-weight: bold;
    }

    .result-detail {
      color: #666;
      font-size: 10px;
    }

    .anomaly-badge {
      background: #F44336;
      color: white;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
    }

    .result-sub {
      width: 100%;
      padding-left: 24px;
    }

    .marking {
      display: block;
      font-size: 10px;
      color: #888;
    }

    .progress-bar {
      width: 60px;
      height: 6px;
      background: #333;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    .progress-fill.deception {
      background: linear-gradient(90deg, #4CAF50, #FFC107, #F44336);
    }

    .progress-fill.hostility {
      background: linear-gradient(90deg, #4CAF50, #F44336);
    }

    .radiation-safe { color: #4CAF50; }
    .radiation-low { color: #8BC34A; }
    .radiation-moderate { color: #FFC107; }
    .radiation-high { color: #FF5722; }
    .radiation-critical { color: #F44336; font-weight: bold; animation: blink 0.5s infinite; }

    @keyframes blink {
      50% { opacity: 0.5; }
    }

    .no-results {
      text-align: center;
      color: #666;
      padding: 20px;
    }

    .no-results p {
      margin: 4px 0;
    }

    .hint {
      font-size: 10px;
      color: #555;
    }

    .last-result-message {
      padding: 12px;
      background: #222;
      border-top: 1px solid #333;
      font-size: 12px;
      color: #aaa;
    }

    .last-result-message.has-flags {
      background: rgba(244,67,54,0.1);
    }

    .flags-raised {
      margin-top: 8px;
    }

    .flag {
      display: block;
      color: #F44336;
      font-size: 11px;
    }
  `]
})
export class ScannerPanelComponent {
  @Input() toolStates: Map<InspectorTool, InspectorToolState> = new Map();
  @Input() scannerResults: ScannerResults | null = null;
  @Input() lastToolResult: ToolUseResult | null = null;
  @Input() dollars: number = 0;
  @Output() onUseTool = new EventEmitter<InspectorTool>();

  private readonly toolIcons: Record<InspectorTool, string> = {
    ESCANER_MASA: '⚖️',
    TERMOGRAFO: '🌡️',
    LUZ_UV: '💜',
    MAGNETOMETRO: '🧲',
    VISOR_DIMENSIONAL: '👁️',
    DETECTOR_INTENCION: '🧠',
    RESONADOR_ULNAR: '📡',
    LUPA_DOCUMENTOS: '🔍',
    VERIFICADOR_SELLOS: '✅',
    BASE_DATOS_CAPTURAS: '🗃️',
  };

  getAvailableTools(): InspectorToolState[] {
    return Array.from(this.toolStates.values())
      .filter(t => t.isUnlocked)
      .sort((a, b) => a.unlockDay - b.unlockDay);
  }

  canUseTool(tool: InspectorToolState): boolean {
    if (tool.currentCooldown > 0) return false;
    if (tool.useCost > this.dollars) return false;
    return true;
  }

  hasResult(tool: InspectorTool): boolean {
    if (!this.scannerResults) return false;
    const keyMap: Partial<Record<InspectorTool, keyof ScannerResults>> = {
      ESCANER_MASA: 'massScanner',
      TERMOGRAFO: 'thermalScanner',
      LUZ_UV: 'uvScanner',
      MAGNETOMETRO: 'magnetometer',
      VISOR_DIMENSIONAL: 'dimensionalVisor',
      DETECTOR_INTENCION: 'intentionDetector',
      RESONADOR_ULNAR: 'ulnarResonator',
    };
    const key = keyMap[tool];
    return key ? !!this.scannerResults[key] : false;
  }

  hasAnyResults(): boolean {
    return this.scannerResults !== null && Object.keys(this.scannerResults).length > 0;
  }

  getToolIcon(tool: InspectorTool): string {
    return this.toolIcons[tool] || '🔧';
  }

  useTool(tool: InspectorTool): void {
    this.onUseTool.emit(tool);
  }

  formatFlag(flag: string): string {
    return flag.replace(/_/g, ' ').toLowerCase();
  }
}
