/**
 * PORTAL CONTROL - Visitor Window Component
 * Displays the current visitor at the inspection window
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Visitor } from '../../models';
import { SpriteAssemblerService, AssembledSprite } from '../../services/sprite-assembler.service';

@Component({
  selector: 'app-visitor-window',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="visitor-window" [class.has-visitor]="visitor" [class.empty]="!visitor">
      <!-- Window frame -->
      <div class="window-frame">
        <div class="frame-top">
          <span class="portal-label">PORTAL A-7</span>
          <span class="status-light" [class.active]="visitor"></span>
        </div>

        <!-- Glass panel -->
        <div class="glass-panel">
          @if (visitor) {
            <!-- Visitor display -->
            <div class="visitor-container" [class]="getMoodClass()">
              <!-- Placeholder sprite (until real assets) -->
              <div class="sprite-placeholder"
                   [innerHTML]="placeholderHTML"
                   [style.color]="getSpriteColor()">
              </div>

              <!-- Mood indicator -->
              <div class="mood-indicator" [class]="visitor.behavior.currentMood">
                {{ getMoodEmoji() }}
              </div>

              <!-- Species badge -->
              <div class="species-badge">
                {{ visitor.declaredSpecies }}
              </div>
            </div>

            <!-- Dialogue bubble -->
            <div class="dialogue-bubble" *ngIf="currentDialogue">
              <p>{{ currentDialogue }}</p>
              <button class="next-btn" (click)="nextDialogue()" *ngIf="hasMoreDialogue">
                ▶
              </button>
            </div>
          } @else {
            <!-- Empty window -->
            <div class="empty-window">
              <div class="waiting-icon">⏳</div>
              <p>Esperando visitante...</p>
            </div>
          }
        </div>

        <!-- Window controls -->
        <div class="frame-bottom">
          <button class="call-btn"
                  (click)="onCallNext.emit()"
                  [disabled]="visitor !== null">
            📢 Llamar Siguiente
          </button>
        </div>
      </div>

      <!-- Detection flags overlay -->
      @if (visitor && visitor.detectionFlags.length > 0) {
        <div class="flags-overlay">
          <div class="flag-badge" *ngFor="let flag of visitor.detectionFlags">
            ⚠️ {{ formatFlag(flag) }}
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .visitor-window {
      width: 320px;
      height: 480px;
      position: relative;
    }

    .window-frame {
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%);
      border: 4px solid #444;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow:
        inset 0 0 20px rgba(0,0,0,0.5),
        0 10px 30px rgba(0,0,0,0.5);
    }

    .frame-top {
      height: 40px;
      background: #333;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      border-bottom: 2px solid #222;
    }

    .portal-label {
      color: #888;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .status-light {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #333;
      border: 2px solid #222;
    }

    .status-light.active {
      background: #4CAF50;
      box-shadow: 0 0 10px #4CAF50;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .glass-panel {
      flex: 1;
      background: linear-gradient(180deg,
        rgba(100,150,200,0.1) 0%,
        rgba(50,100,150,0.05) 100%
      );
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .visitor-container {
      position: relative;
      width: 200px;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .visitor-container.nervous {
      animation: nervousShake 0.5s ease-in-out infinite;
    }

    .visitor-container.terrified {
      animation: nervousShake 0.2s ease-in-out infinite;
    }

    @keyframes nervousShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }

    .sprite-placeholder {
      width: 100%;
      height: 100%;
    }

    .sprite-placeholder :deep(.sprite-placeholder) {
      width: 100%;
      height: 100%;
    }

    .mood-indicator {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 40px;
      height: 40px;
      background: #1a1a2e;
      border: 2px solid #444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .mood-indicator.nervous { border-color: #FFC107; }
    .mood-indicator.terrified { border-color: #F44336; }
    .mood-indicator.angry { border-color: #F44336; }
    .mood-indicator.calm { border-color: #4CAF50; }

    .species-badge {
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #aaa;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .dialogue-bubble {
      position: absolute;
      bottom: 20px;
      left: 10px;
      right: 10px;
      background: white;
      color: #333;
      padding: 12px 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 14px;
      line-height: 1.4;
    }

    .dialogue-bubble::before {
      content: '';
      position: absolute;
      top: -10px;
      left: 30px;
      border: 10px solid transparent;
      border-bottom-color: white;
      border-top: none;
    }

    .dialogue-bubble p {
      margin: 0;
    }

    .next-btn {
      position: absolute;
      right: 8px;
      bottom: 8px;
      width: 24px;
      height: 24px;
      border: none;
      background: #e0e0e0;
      border-radius: 50%;
      cursor: pointer;
      font-size: 10px;
    }

    .next-btn:hover {
      background: #ccc;
    }

    .empty-window {
      text-align: center;
      color: #666;
    }

    .waiting-icon {
      font-size: 48px;
      margin-bottom: 16px;
      animation: waiting 2s ease-in-out infinite;
    }

    @keyframes waiting {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(180deg); }
    }

    .empty-window p {
      font-size: 14px;
      margin: 0;
    }

    .frame-bottom {
      height: 50px;
      background: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      border-top: 2px solid #222;
    }

    .call-btn {
      background: linear-gradient(180deg, #4CAF50 0%, #388E3C 100%);
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }

    .call-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(76,175,80,0.4);
    }

    .call-btn:disabled {
      background: #555;
      cursor: not-allowed;
    }

    .flags-overlay {
      position: absolute;
      top: 50px;
      right: -10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .flag-badge {
      background: rgba(244,67,54,0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      white-space: nowrap;
      animation: flagPulse 1s ease-in-out infinite;
    }

    @keyframes flagPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `]
})
export class VisitorWindowComponent implements OnChanges {
  @Input() visitor: Visitor | null = null;
  @Output() onCallNext = new EventEmitter<void>();

  assembledSprite: AssembledSprite | null = null;
  placeholderHTML = '';
  currentDialogue = '';
  hasMoreDialogue = false;
  private dialogueIndex = 0;

  constructor(private spriteAssembler: SpriteAssemblerService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visitor'] && this.visitor) {
      this.assembledSprite = this.spriteAssembler.assembleSprite(this.visitor);
      this.placeholderHTML = this.spriteAssembler.generatePlaceholderHTML(this.visitor);
      this.dialogueIndex = 0;
      this.updateDialogue();
    }
  }

  updateDialogue(): void {
    if (this.visitor && this.visitor.currentDialogue.length > 0) {
      this.currentDialogue = this.visitor.currentDialogue[this.dialogueIndex];
      this.hasMoreDialogue = this.dialogueIndex < this.visitor.currentDialogue.length - 1;
    } else {
      this.currentDialogue = '';
      this.hasMoreDialogue = false;
    }
  }

  nextDialogue(): void {
    if (this.hasMoreDialogue) {
      this.dialogueIndex++;
      this.updateDialogue();
    }
  }

  getMoodClass(): string {
    return this.visitor?.behavior.currentMood || '';
  }

  getMoodEmoji(): string {
    const emojis: Record<string, string> = {
      calm: '😐',
      nervous: '😰',
      angry: '😠',
      sad: '😢',
      excited: '😃',
      suspicious: '🤨',
      terrified: '😱',
    };
    return emojis[this.visitor?.behavior.currentMood || 'calm'] || '😐';
  }

  getSpriteColor(): string {
    if (!this.visitor) return '#666';
    // Return first color from species palette
    return this.visitor.appearance.skinTone;
  }

  formatFlag(flag: string): string {
    return flag.replace(/_/g, ' ').toLowerCase();
  }
}
