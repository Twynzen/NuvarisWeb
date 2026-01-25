/**
 * PORTAL CONTROL - Intro Screen Component
 * Story introduction and game setup
 */

import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameDifficulty } from '../../models';

interface StorySlide {
  id: number;
  text: string;
  speaker?: string;
  background?: string;
  effect?: 'fade' | 'typewriter' | 'glitch';
}

@Component({
  selector: 'app-intro-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="intro-container">
      <!-- Title screen -->
      @if (currentPhase() === 'TITLE') {
        <div class="title-screen">
          <div class="title-content">
            <div class="logo-container">
              <div class="logo-glow"></div>
              <h1 class="game-title">PORTAL CONTROL</h1>
              <p class="subtitle">Corporación QDT - Estación Ithor</p>
            </div>

            <div class="menu-options">
              <button class="menu-btn primary" (click)="startNewGame()">
                ▶ NUEVA PARTIDA
              </button>
              <button class="menu-btn" (click)="showHowToPlay()">
                📖 CÓMO JUGAR
              </button>
              <button class="menu-btn" (click)="showCredits()">
                ℹ️ CRÉDITOS
              </button>
            </div>

            <div class="version-info">
              <span>v1.0.0 | Basado en el universo Nuvaris</span>
            </div>
          </div>

          <div class="title-background">
            <div class="portal-effect"></div>
            <div class="particles"></div>
          </div>
        </div>
      }

      <!-- Story intro -->
      @if (currentPhase() === 'STORY') {
        <div class="story-screen" (click)="advanceStory()">
          <div class="story-backdrop"></div>

          <div class="story-content">
            @if (currentSlide().speaker) {
              <div class="speaker-name">{{ currentSlide().speaker }}</div>
            }
            <div class="story-text" [class.typewriter]="currentSlide().effect === 'typewriter'">
              {{ displayedText() }}
            </div>

            <div class="story-progress">
              <div class="progress-dots">
                @for (slide of storySlides; track slide.id; let i = $index) {
                  <span class="dot" [class.active]="i === currentSlideIndex()" [class.seen]="i < currentSlideIndex()"></span>
                }
              </div>
              <span class="continue-hint">{{ isTyping() ? '' : 'Click para continuar...' }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Character creation -->
      @if (currentPhase() === 'CHARACTER') {
        <div class="character-screen">
          <div class="character-content">
            <h2>REGISTRO DE INSPECTOR</h2>

            <div class="form-section">
              <label>Nombre del Inspector:</label>
              <input
                type="text"
                [(ngModel)]="playerName"
                placeholder="Ingresa tu nombre"
                maxlength="20"
                class="name-input">
            </div>

            <div class="form-section">
              <label>Nivel de Dificultad:</label>
              <div class="difficulty-options">
                @for (diff of difficulties; track diff.id) {
                  <button
                    class="difficulty-btn"
                    [class.selected]="selectedDifficulty() === diff.id"
                    (click)="selectedDifficulty.set(diff.id)">
                    <span class="diff-icon">{{ diff.icon }}</span>
                    <span class="diff-name">{{ diff.name }}</span>
                    <span class="diff-desc">{{ diff.description }}</span>
                    <span class="diff-reward">Inicio: \${{ diff.startingDollars }}</span>
                  </button>
                }
              </div>
            </div>

            <div class="form-actions">
              <button class="back-btn" (click)="currentPhase.set('TITLE')">
                ← VOLVER
              </button>
              <button
                class="start-btn"
                [disabled]="!playerName.trim()"
                (click)="confirmAndStart()">
                COMENZAR SERVICIO →
              </button>
            </div>
          </div>
        </div>
      }

      <!-- How to play -->
      @if (currentPhase() === 'HOW_TO_PLAY') {
        <div class="howto-screen">
          <div class="howto-content">
            <h2>📖 CÓMO JUGAR</h2>

            <div class="howto-sections">
              <div class="howto-section">
                <h3>🎯 Objetivo</h3>
                <p>Eres un inspector de portales interdimensionales. Tu trabajo es decidir quién puede entrar a Ithor y quién no.</p>
              </div>

              <div class="howto-section">
                <h3>📋 Proceso</h3>
                <ol>
                  <li>Examina los documentos del visitante</li>
                  <li>Usa tus herramientas de inspección</li>
                  <li>Compara la información con el manual</li>
                  <li>Toma una decisión: Aprobar, Denegar o Detener</li>
                </ol>
              </div>

              <div class="howto-section">
                <h3>⚠️ Cuidado</h3>
                <ul>
                  <li>Los <strong>impostores</strong> fingen ser de otra especie</li>
                  <li>Los <strong>fugitivos</strong> tienen órdenes de captura</li>
                  <li>Los <strong>documentos falsificados</strong> tienen errores</li>
                  <li>Algunos visitantes son <strong>peligrosos</strong></li>
                </ul>
              </div>

              <div class="howto-section">
                <h3>💰 Economía</h3>
                <p>Ganas dólares por decisiones correctas. Úsalos en la tienda para mejorar tu estación.</p>
              </div>

              <div class="howto-section">
                <h3>⭐ Reputación</h3>
                <p>Tu reputación afecta el final del juego. Demasiadas advertencias = Game Over.</p>
              </div>
            </div>

            <button class="back-btn" (click)="currentPhase.set('TITLE')">
              ← VOLVER AL MENÚ
            </button>
          </div>
        </div>
      }

      <!-- Credits -->
      @if (currentPhase() === 'CREDITS') {
        <div class="credits-screen">
          <div class="credits-content">
            <h2>ℹ️ CRÉDITOS</h2>

            <div class="credits-section">
              <h3>PORTAL CONTROL</h3>
              <p>Un juego inspirado en "Papers, Please" de Lucas Pope</p>
              <p>Ambientado en el universo de <strong>Nuvaris</strong></p>
            </div>

            <div class="credits-section">
              <h3>Lore y Universo</h3>
              <p>Basado en la documentación de Nuvaris</p>
              <p>Razas: Humanos, Vulnari, Exópodos, Reptilianos, Inmigrantes</p>
            </div>

            <div class="credits-section">
              <h3>Desarrollo</h3>
              <p>Creado con Angular 18</p>
              <p>Estilo: Comic/Novela Gráfica</p>
            </div>

            <div class="credits-section flavor">
              <p><em>"En el portal, todos son iguales ante el inspector."</em></p>
              <p>- Directiva QDT #7</p>
            </div>

            <button class="back-btn" (click)="currentPhase.set('TITLE')">
              ← VOLVER AL MENÚ
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .intro-container {
      position: fixed;
      inset: 0;
      background: #0a0a1a;
      overflow: hidden;
    }

    /* === TITLE SCREEN === */
    .title-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      position: relative;
    }

    .title-content {
      position: relative;
      z-index: 10;
      text-align: center;
    }

    .logo-container {
      position: relative;
      margin-bottom: 60px;
    }

    .logo-glow {
      position: absolute;
      width: 400px;
      height: 100px;
      background: radial-gradient(ellipse, rgba(138, 43, 226, 0.4) 0%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 3s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    }

    .game-title {
      font-size: 64px;
      font-weight: bold;
      color: #fff;
      text-shadow:
        0 0 10px rgba(138, 43, 226, 0.8),
        0 0 30px rgba(138, 43, 226, 0.5),
        0 0 50px rgba(138, 43, 226, 0.3);
      letter-spacing: 8px;
      margin: 0;
    }

    .subtitle {
      font-size: 18px;
      color: #888;
      letter-spacing: 4px;
      margin-top: 10px;
    }

    .menu-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .menu-btn {
      width: 280px;
      padding: 16px 32px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #333;
      border-radius: 8px;
      color: #aaa;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .menu-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: #555;
      color: #fff;
      transform: translateY(-2px);
    }

    .menu-btn.primary {
      background: linear-gradient(180deg, rgba(138, 43, 226, 0.3) 0%, rgba(138, 43, 226, 0.1) 100%);
      border-color: rgba(138, 43, 226, 0.5);
      color: #fff;
      font-weight: bold;
    }

    .menu-btn.primary:hover {
      background: linear-gradient(180deg, rgba(138, 43, 226, 0.5) 0%, rgba(138, 43, 226, 0.2) 100%);
      border-color: rgba(138, 43, 226, 0.8);
    }

    .version-info {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #444;
    }

    .title-background {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .portal-effect {
      position: absolute;
      width: 600px;
      height: 600px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(138, 43, 226, 0.1) 0%, transparent 70%);
      animation: rotate 20s linear infinite;
    }

    @keyframes rotate {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }

    /* === STORY SCREEN === */
    .story-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      cursor: pointer;
      position: relative;
    }

    .story-backdrop {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, #0a0a1a 0%, #1a1a3e 100%);
    }

    .story-content {
      position: relative;
      z-index: 10;
      max-width: 700px;
      padding: 40px;
    }

    .speaker-name {
      font-size: 14px;
      color: #8B5CF6;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }

    .story-text {
      font-size: 22px;
      line-height: 1.8;
      color: #fff;
      text-align: center;
    }

    .story-text.typewriter {
      border-right: 2px solid #8B5CF6;
      animation: blink 0.7s step-end infinite;
    }

    @keyframes blink {
      from, to { border-color: transparent; }
      50% { border-color: #8B5CF6; }
    }

    .story-progress {
      margin-top: 40px;
      text-align: center;
    }

    .progress-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #333;
      transition: all 0.3s;
    }

    .dot.seen {
      background: #555;
    }

    .dot.active {
      background: #8B5CF6;
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
    }

    .continue-hint {
      font-size: 12px;
      color: #555;
    }

    /* === CHARACTER SCREEN === */
    .character-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: linear-gradient(180deg, #0a0a1a 0%, #16213e 100%);
    }

    .character-content {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #333;
      border-radius: 16px;
      padding: 40px;
      max-width: 600px;
      width: 90%;
    }

    .character-content h2 {
      text-align: center;
      color: #fff;
      margin: 0 0 30px 0;
      font-size: 24px;
      letter-spacing: 4px;
    }

    .form-section {
      margin-bottom: 30px;
    }

    .form-section label {
      display: block;
      color: #888;
      font-size: 12px;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }

    .name-input {
      width: 100%;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #333;
      border-radius: 8px;
      color: #fff;
      font-size: 18px;
      outline: none;
      transition: all 0.2s;
    }

    .name-input:focus {
      border-color: #8B5CF6;
      background: rgba(139, 92, 246, 0.1);
    }

    .difficulty-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .difficulty-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid #333;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .difficulty-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: #555;
    }

    .difficulty-btn.selected {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8B5CF6;
    }

    .diff-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .diff-name {
      font-size: 14px;
      font-weight: bold;
      color: #fff;
    }

    .diff-desc {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    .diff-reward {
      font-size: 12px;
      color: #4CAF50;
      margin-top: 8px;
    }

    .form-actions {
      display: flex;
      gap: 16px;
      margin-top: 20px;
    }

    .back-btn {
      flex: 1;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #333;
      border-radius: 8px;
      color: #888;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .start-btn {
      flex: 2;
      padding: 16px;
      background: linear-gradient(180deg, #4CAF50 0%, #388E3C 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }

    .start-btn:hover:not(:disabled) {
      background: linear-gradient(180deg, #66BB6A 0%, #43A047 100%);
      transform: translateY(-2px);
    }

    .start-btn:disabled {
      background: #444;
      cursor: not-allowed;
    }

    /* === HOW TO PLAY === */
    .howto-screen, .credits-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: linear-gradient(180deg, #0a0a1a 0%, #16213e 100%);
      overflow-y: auto;
    }

    .howto-content, .credits-content {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #333;
      border-radius: 16px;
      padding: 40px;
      max-width: 700px;
      width: 90%;
      margin: 40px 0;
    }

    .howto-content h2, .credits-content h2 {
      text-align: center;
      color: #fff;
      margin: 0 0 30px 0;
    }

    .howto-sections {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .howto-section h3 {
      color: #8B5CF6;
      margin: 0 0 12px 0;
      font-size: 16px;
    }

    .howto-section p, .howto-section li {
      color: #ccc;
      line-height: 1.6;
      font-size: 14px;
    }

    .howto-section ol, .howto-section ul {
      margin: 0;
      padding-left: 20px;
    }

    .credits-section {
      text-align: center;
      margin-bottom: 24px;
    }

    .credits-section h3 {
      color: #8B5CF6;
      margin: 0 0 8px 0;
    }

    .credits-section p {
      color: #aaa;
      margin: 4px 0;
      font-size: 14px;
    }

    .credits-section.flavor {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #333;
    }

    .credits-section.flavor p {
      color: #666;
    }
  `]
})
export class IntroScreenComponent {
  @Output() onStartGame = new EventEmitter<{ playerName: string; difficulty: GameDifficulty }>();

  currentPhase = signal<'TITLE' | 'STORY' | 'CHARACTER' | 'HOW_TO_PLAY' | 'CREDITS'>('TITLE');
  currentSlideIndex = signal(0);
  displayedText = signal('');
  isTyping = signal(false);

  playerName = 'Inspector';
  selectedDifficulty = signal<GameDifficulty>('NORMAL');

  difficulties = [
    { id: 'FACIL' as const, name: 'Fácil', icon: '😊', description: 'Para aprender', startingDollars: 150 },
    { id: 'NORMAL' as const, name: 'Normal', icon: '😐', description: 'Experiencia estándar', startingDollars: 100 },
    { id: 'DIFICIL' as const, name: 'Difícil', icon: '😰', description: 'Más impostores', startingDollars: 75 },
    { id: 'PESADILLA' as const, name: 'Pesadilla', icon: '💀', description: 'Sin piedad', startingDollars: 50 },
  ];

  storySlides: StorySlide[] = [
    {
      id: 0,
      text: 'Año 3247. La humanidad ha descubierto los portales dimensionales.',
      effect: 'typewriter'
    },
    {
      id: 1,
      text: 'Millones de seres de infinitas realidades buscan una nueva vida en mundos lejanos.',
      effect: 'typewriter'
    },
    {
      id: 2,
      text: 'La Corporación QDT controla el flujo interdimensional. El orden debe mantenerse.',
      effect: 'typewriter'
    },
    {
      id: 3,
      text: 'Tú eres el último filtro. El guardián del portal.',
      effect: 'typewriter'
    },
    {
      id: 4,
      speaker: 'DIRECTOR LARS',
      text: '"En tus manos está decidir quién entra... y quién no."',
      effect: 'typewriter'
    },
    {
      id: 5,
      speaker: 'DIRECTOR LARS',
      text: '"Un impostor puede causar una guerra. Un refugiado rechazado puede morir."',
      effect: 'typewriter'
    },
    {
      id: 6,
      text: 'Bienvenido a la estación de control portal de Ithor.',
      effect: 'typewriter'
    },
    {
      id: 7,
      text: 'Tu turno comienza ahora.',
      effect: 'typewriter'
    },
  ];

  private typewriterTimeout: any = null;

  currentSlide(): StorySlide {
    return this.storySlides[this.currentSlideIndex()];
  }

  startNewGame(): void {
    this.currentPhase.set('STORY');
    this.currentSlideIndex.set(0);
    this.typeText(this.storySlides[0].text);
  }

  showHowToPlay(): void {
    this.currentPhase.set('HOW_TO_PLAY');
  }

  showCredits(): void {
    this.currentPhase.set('CREDITS');
  }

  advanceStory(): void {
    if (this.isTyping()) {
      // Skip typewriter, show full text
      clearTimeout(this.typewriterTimeout);
      this.displayedText.set(this.currentSlide().text);
      this.isTyping.set(false);
      return;
    }

    const nextIndex = this.currentSlideIndex() + 1;
    if (nextIndex >= this.storySlides.length) {
      // Story finished, go to character creation
      this.currentPhase.set('CHARACTER');
    } else {
      this.currentSlideIndex.set(nextIndex);
      this.typeText(this.storySlides[nextIndex].text);
    }
  }

  private typeText(text: string): void {
    this.isTyping.set(true);
    this.displayedText.set('');

    let index = 0;
    const typeChar = () => {
      if (index < text.length) {
        this.displayedText.update(t => t + text[index]);
        index++;
        this.typewriterTimeout = setTimeout(typeChar, 40);
      } else {
        this.isTyping.set(false);
      }
    };

    typeChar();
  }

  confirmAndStart(): void {
    if (!this.playerName.trim()) return;

    this.onStartGame.emit({
      playerName: this.playerName.trim(),
      difficulty: this.selectedDifficulty()
    });
  }
}
