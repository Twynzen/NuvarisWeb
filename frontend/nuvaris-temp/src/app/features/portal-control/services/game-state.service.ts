/**
 * PORTAL CONTROL - Game State Service
 * Manages the complete game state and progression
 */

import { Injectable, signal, computed } from '@angular/core';
import {
  GameState,
  GamePhase,
  GameDifficulty,
  DayState,
  DayPhase,
  PlayerStats,
  PlayerResources,
  ProcessedVisitor,
  Visitor,
  VisitorDocuments,
  PlayerDecision,
  DecisionEvaluation,
  InspectorTool,
  InspectorToolState,
  GameSettings,
  InspectorManual,
  StoryProgress,
  DayEvent,
  VisitorGenerationParams,
} from '../models';
import { VisitorGeneratorService } from './visitor-generator.service';
import { DocumentGeneratorService } from './document-generator.service';
import { DetectionService } from './detection.service';
import { LoggerService } from './logger.service';
import { generateDailyRules, MANUAL_ENTRIES } from '../data';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  // Reactive state signals
  private _gameState = signal<GameState | null>(null);
  private _currentVisitor = signal<Visitor | null>(null);
  private _currentDocuments = signal<VisitorDocuments | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public computed signals
  readonly gameState = this._gameState.asReadonly();
  readonly currentVisitor = this._currentVisitor.asReadonly();
  readonly currentDocuments = this._currentDocuments.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isGameActive = computed(() => {
    const state = this._gameState();
    return state !== null && state.phase !== 'MENU' && state.phase !== 'GAME_OVER';
  });

  readonly currentDay = computed(() => this._gameState()?.currentDay ?? 0);
  readonly phase = computed(() => this._gameState()?.phase ?? 'MENU');

  // Game loop interval
  private gameLoopInterval: any = null;
  private lastTickTime = 0;

  constructor(
    private visitorGenerator: VisitorGeneratorService,
    private documentGenerator: DocumentGeneratorService,
    private detectionService: DetectionService,
    private logger: LoggerService
  ) {}

  /**
   * Start a new game
   */
  startNewGame(difficulty: GameDifficulty = 'NORMAL', playerName: string = 'Inspector'): void {
    this.logger.info('GameState', `Starting new game: ${difficulty}`);
    this._isLoading.set(true);

    try {
      const gameState = this.createInitialGameState(difficulty, playerName);
      this._gameState.set(gameState);

      // Start day 1
      this.startDay(1);

      this._isLoading.set(false);
      this.logger.info('GameState', 'Game started successfully');

    } catch (error) {
      this.logger.error('GameState', 'Failed to start game', error);
      this._error.set('Error al iniciar el juego');
      this._isLoading.set(false);
    }
  }

  /**
   * Create initial game state
   */
  private createInitialGameState(difficulty: GameDifficulty, playerName: string): GameState {
    const difficultyMultiplier = {
      FACIL: 0.7,
      NORMAL: 1.0,
      DIFICIL: 1.3,
      PESADILLA: 1.6,
    };

    return {
      gameId: `GAME-${Date.now()}`,
      saveSlot: 0,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      playTime: 0,

      difficulty,
      language: 'es',

      phase: 'DAY_START',
      isPaused: false,

      currentDay: 1,
      maxDays: 30,
      dayState: null,

      playerName,
      playerStats: this.createInitialStats(),
      playerResources: this.createInitialResources(difficulty),

      availableTools: this.detectionService.getToolStates(),

      manual: this.createInitialManual(),
      discoveredSecrets: [],
      unlockedAchievements: [],

      storyProgress: this.createInitialStoryProgress(),

      currentVisitor: null,
      currentDocuments: null,
      visitorHistory: [],
    };
  }

  /**
   * Create initial player stats
   */
  private createInitialStats(): PlayerStats {
    return {
      totalVisitorsProcessed: 0,
      correctDecisions: 0,
      incorrectDecisions: 0,
      accuracy: 0,
      fugitivesCaught: 0,
      fugitivesMissed: 0,
      contrabandIntercepted: 0,
      contrabandMissed: 0,
      impostorsDetected: 0,
      impostorsMissed: 0,
      innocentsWronglyDetained: 0,
      averageProcessingTime: 0,
      fastestProcessing: Infinity,
      slowestProcessing: 0,
      toolUsage: new Map(),
      favoriteTools: [],
      speciesProcessed: new Map(),
      speciesAccuracy: new Map(),
    };
  }

  /**
   * Create initial resources
   */
  private createInitialResources(difficulty: GameDifficulty): PlayerResources {
    const startingDollars = {
      FACIL: 150,
      NORMAL: 100,
      DIFICIL: 75,
      PESADILLA: 50,
    };

    return {
      dollars: startingDollars[difficulty],
      reputation: 50,
      warnings: 0,
      maxWarnings: difficulty === 'PESADILLA' ? 2 : 3,
      dailyDollarsEarned: 0,
      dailyDollarsPenalty: 0,
      dailyBonus: 0,
    };
  }

  /**
   * Create initial manual
   */
  private createInitialManual(): InspectorManual {
    const entries = new Map<string, any>();
    const categories = new Map<string, any[]>();

    MANUAL_ENTRIES.forEach(entry => {
      entries.set(entry.id, {
        ...entry,
        isUnlocked: entry.unlockDay <= 1,
      });

      if (!categories.has(entry.category)) {
        categories.set(entry.category, []);
      }
      categories.get(entry.category)!.push(entry);
    });

    return {
      entries,
      categories,
      recentlyViewed: [],
      bookmarks: [],
    };
  }

  /**
   * Create initial story progress
   */
  private createInitialStoryProgress(): StoryProgress {
    return {
      currentChapter: 1,
      completedChapters: [],
      storyFlags: new Map(),
      encounteredCharacters: [],
      dialogueHistory: new Map(),
      endings: [],
      currentEnding: null,
    };
  }

  /**
   * Start a new day
   */
  startDay(dayNumber: number): void {
    this.logger.info('GameState', `Starting day ${dayNumber}`);

    const state = this._gameState();
    if (!state) return;

    // Unlock new tools
    const newTools = this.detectionService.unlockToolsForDay(dayNumber);
    if (newTools.length > 0) {
      this.logger.info('GameState', `Unlocked tools: ${newTools.join(', ')}`);
    }

    // Generate daily rules
    const rules = generateDailyRules(dayNumber);

    // Create day state
    const dayState: DayState = {
      dayNumber,
      phase: 'BRIEFING',
      dayStartTime: Date.now(),
      currentTime: 0,
      dayDuration: 300, // 5 minutes real time
      timeRemaining: 300,
      visitorQueue: [],
      currentVisitor: null,
      processedVisitors: [],
      rules,
      quotaMet: false,
      targetsMet: [],
      targetsMissed: [],
      dailyEvents: this.generateDailyEvents(dayNumber),
      triggeredEvents: [],
    };

    // Generate initial visitor queue
    this.populateVisitorQueue(dayState, state.difficulty);

    // Update state
    this._gameState.update(s => s ? {
      ...s,
      currentDay: dayNumber,
      phase: 'DAY_START',
      dayState,
    } : null);
  }

  /**
   * Generate daily events
   */
  private generateDailyEvents(day: number): DayEvent[] {
    const events: DayEvent[] = [];

    if (day >= 3) {
      events.push({
        id: `event_supervisor_${day}`,
        type: 'VISITA_SUPERVISOR',
        title: 'Visita del Supervisor',
        description: 'El supervisor revisará tu trabajo.',
        triggerCondition: 'visitors_processed >= 5',
        triggered: false,
      });
    }

    return events;
  }

  /**
   * Populate visitor queue
   */
  private populateVisitorQueue(dayState: DayState, difficulty: GameDifficulty): void {
    const visitorCount = 8 + Math.floor(Math.random() * 5) + dayState.dayNumber;
    const difficultyLevel = { FACIL: 3, NORMAL: 5, DIFICIL: 7, PESADILLA: 9 }[difficulty];

    for (let i = 0; i < visitorCount; i++) {
      const params: VisitorGenerationParams = {
        day: dayState.dayNumber,
        difficulty: difficultyLevel,
      };

      const visitor = this.visitorGenerator.generateVisitor(params);
      dayState.visitorQueue.push(visitor);
    }

    this.logger.info('GameState', `Generated ${visitorCount} visitors for day ${dayState.dayNumber}`);
  }

  /**
   * Begin the work phase
   */
  beginWork(): void {
    this.logger.info('GameState', 'Beginning work phase');

    this._gameState.update(s => s ? {
      ...s,
      phase: 'PROCESSING',
      dayState: s.dayState ? {
        ...s.dayState,
        phase: 'WORKING',
      } : null,
    } : null);

    // Get first visitor
    this.callNextVisitor();

    // Start game loop
    this.startGameLoop();
  }

  /**
   * Start the game loop
   */
  private startGameLoop(): void {
    this.lastTickTime = Date.now();

    this.gameLoopInterval = setInterval(() => {
      const now = Date.now();
      const delta = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      this.gameTick(delta);
    }, 1000);
  }

  /**
   * Game tick - called every second
   */
  private gameTick(deltaSeconds: number): void {
    const state = this._gameState();
    if (!state || state.isPaused || state.phase !== 'PROCESSING') return;

    // Update cooldowns
    this.detectionService.updateCooldowns(deltaSeconds);

    // Update time
    this._gameState.update(s => {
      if (!s?.dayState) return s;
      const newTimeRemaining = s.dayState.timeRemaining - deltaSeconds;

      if (newTimeRemaining <= 0) {
        // End of day
        this.endDay();
        return s;
      }

      return {
        ...s,
        playTime: s.playTime + deltaSeconds,
        dayState: {
          ...s.dayState,
          currentTime: s.dayState.currentTime + deltaSeconds,
          timeRemaining: newTimeRemaining,
        },
      };
    });
  }

  /**
   * Call the next visitor
   */
  callNextVisitor(): void {
    const state = this._gameState();
    if (!state?.dayState) return;

    const queue = state.dayState.visitorQueue;
    if (queue.length === 0) {
      this.logger.info('GameState', 'No more visitors in queue');
      this.endDay();
      return;
    }

    const visitor = queue.shift()!;
    visitor.state = 'AT_WINDOW';
    visitor.arrivalTime = Date.now();

    const documents = this.documentGenerator.generateDocuments(visitor);

    this._currentVisitor.set(visitor);
    this._currentDocuments.set(documents);

    this._gameState.update(s => s?.dayState ? {
      ...s,
      dayState: {
        ...s.dayState,
        currentVisitor: visitor,
        visitorQueue: queue,
      },
    } : null);

    this.logger.info('GameState', `Called visitor: ${visitor.name}`);
  }

  /**
   * Use a tool on current visitor
   */
  useTool(tool: InspectorTool): void {
    const visitor = this._currentVisitor();
    const documents = this._currentDocuments();

    if (!visitor) {
      this.logger.warn('GameState', 'No visitor to use tool on');
      return;
    }

    const result = this.detectionService.useTool(tool, visitor, documents || undefined);

    // Update visitor with new scanner results
    this._currentVisitor.set({ ...visitor });

    // Update tool usage stats
    this._gameState.update(s => {
      if (!s) return null;
      const usage = s.playerStats.toolUsage;
      usage.set(tool, (usage.get(tool) || 0) + 1);
      return {
        ...s,
        playerStats: {
          ...s.playerStats,
          toolUsage: usage,
        },
      };
    });
  }

  /**
   * Make a decision on current visitor
   */
  makeDecision(decisionType: 'APROBAR' | 'DENEGAR' | 'DETENER' | 'CUARENTENA' | 'OMEGA'): void {
    const visitor = this._currentVisitor();
    const documents = this._currentDocuments();
    const state = this._gameState();

    if (!visitor || !documents || !state) {
      this.logger.error('GameState', 'Cannot make decision: missing data');
      return;
    }

    const processingTime = (Date.now() - visitor.arrivalTime) / 1000;

    const decision: PlayerDecision = {
      visitorId: visitor.id,
      decision: decisionType,
      reason: '',
      flagsCited: visitor.detectionFlags,
      timestamp: Date.now(),
      processingTime,
      toolsUsed: Array.from(Object.keys(visitor.scannerResults)) as InspectorTool[],
    };

    // Analyze and evaluate
    const analysis = this.detectionService.analyzeVisitor(visitor, documents);
    const evaluation = this.detectionService.evaluateDecision(decision, visitor, analysis);

    // Update visitor state
    visitor.state = decisionType === 'APROBAR' ? 'APPROVED' :
                   decisionType === 'DENEGAR' ? 'DENIED' :
                   decisionType === 'CUARENTENA' ? 'DETAINED' :
                   decisionType === 'OMEGA' ? 'OMEGA' : 'DETAINED';

    // Record processed visitor
    const processed: ProcessedVisitor = {
      visitor,
      documents,
      decision,
      evaluation,
      toolsUsed: Array.from(Object.keys(visitor.scannerResults)).map(k => ({
        tool: k as InspectorTool,
        success: true,
        result: (visitor.scannerResults as any)[k],
        flagsRaised: [],
        message: '',
        timestamp: Date.now(),
      })),
      processingTime,
    };

    // Update stats and resources
    this.updateStatsAfterDecision(evaluation);
    this.updateResourcesAfterDecision(evaluation);

    // Add to history and clear current
    this._gameState.update(s => {
      if (!s?.dayState) return s;
      return {
        ...s,
        dayState: {
          ...s.dayState,
          processedVisitors: [...s.dayState.processedVisitors, processed],
          currentVisitor: null,
        },
        visitorHistory: [...s.visitorHistory, processed],
      };
    });

    this._currentVisitor.set(null);
    this._currentDocuments.set(null);

    this.logger.info('GameState', `Decision made: ${decisionType}`, {
      wasCorrect: evaluation.wasCorrect,
      points: evaluation.finalPoints,
    });

    // Call next visitor
    setTimeout(() => this.callNextVisitor(), 1000);
  }

  /**
   * Update stats after decision
   */
  private updateStatsAfterDecision(evaluation: DecisionEvaluation): void {
    this._gameState.update(s => {
      if (!s) return null;

      const stats = { ...s.playerStats };
      stats.totalVisitorsProcessed++;

      if (evaluation.wasCorrect) {
        stats.correctDecisions++;
      } else {
        stats.incorrectDecisions++;
      }

      stats.accuracy = (stats.correctDecisions / stats.totalVisitorsProcessed) * 100;

      return {
        ...s,
        playerStats: stats,
      };
    });
  }

  /**
   * Update resources after decision
   */
  private updateResourcesAfterDecision(evaluation: DecisionEvaluation): void {
    this._gameState.update(s => {
      if (!s) return null;

      const resources = { ...s.playerResources };

      if (evaluation.finalPoints > 0) {
        resources.dollars += evaluation.finalPoints;
        resources.dailyDollarsEarned += evaluation.finalPoints;
      } else {
        resources.dollars = Math.max(0, resources.dollars + evaluation.finalPoints);
        resources.dailyDollarsPenalty += Math.abs(evaluation.finalPoints);
      }

      // Update reputation
      evaluation.consequences.forEach(c => {
        if (c.reputationChange) {
          resources.reputation = Math.max(0, Math.min(100,
            resources.reputation + c.reputationChange
          ));
        }
      });

      return {
        ...s,
        playerResources: resources,
      };
    });
  }

  /**
   * End the current day
   */
  endDay(): void {
    this.logger.info('GameState', 'Ending day');

    // Stop game loop
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    this._gameState.update(s => s ? {
      ...s,
      phase: 'DAY_END',
      dayState: s.dayState ? {
        ...s.dayState,
        phase: 'SUMMARY',
      } : null,
    } : null);

    this._currentVisitor.set(null);
    this._currentDocuments.set(null);
  }

  /**
   * Continue to next day
   */
  continueToNextDay(): void {
    const state = this._gameState();
    if (!state) return;

    const nextDay = state.currentDay + 1;

    if (nextDay > state.maxDays || state.playerResources.warnings >= state.playerResources.maxWarnings) {
      this.endGame(state.playerResources.warnings >= state.playerResources.maxWarnings ? 'GAME_OVER' : 'VICTORY');
      return;
    }

    this.startDay(nextDay);
  }

  /**
   * End the game
   */
  endGame(outcome: 'GAME_OVER' | 'VICTORY'): void {
    this.logger.info('GameState', `Game ended: ${outcome}`);

    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    this._gameState.update(s => s ? {
      ...s,
      phase: outcome,
    } : null);
  }

  /**
   * Pause/unpause the game
   */
  togglePause(): void {
    this._gameState.update(s => s ? {
      ...s,
      isPaused: !s.isPaused,
      phase: !s.isPaused ? 'PAUSED' : 'PROCESSING',
    } : null);
  }

  /**
   * Reset game state
   */
  resetGame(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    this._gameState.set(null);
    this._currentVisitor.set(null);
    this._currentDocuments.set(null);
    this._error.set(null);

    this.logger.info('GameState', 'Game reset');
  }

  /**
   * Get current day state
   */
  getDayState(): DayState | null {
    return this._gameState()?.dayState ?? null;
  }

  /**
   * Get player resources
   */
  getResources(): PlayerResources | null {
    return this._gameState()?.playerResources ?? null;
  }

  /**
   * Get player stats
   */
  getStats(): PlayerStats | null {
    return this._gameState()?.playerStats ?? null;
  }
}
