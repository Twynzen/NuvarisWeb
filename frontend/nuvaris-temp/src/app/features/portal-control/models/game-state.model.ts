/**
 * PORTAL CONTROL - Game State Model
 * Defines the complete game state and progression
 */

import { SpeciesId } from './species.model';
import { Visitor, VisitorId } from './visitor.model';
import { Document, VisitorDocuments } from './document.model';
import {
  InspectorTool,
  InspectorToolState,
  PlayerDecision,
  DecisionEvaluation,
  DailyRules,
  InspectorManual,
  ToolUseResult
} from './detection.model';

/** Game difficulty levels */
export type GameDifficulty = 'FACIL' | 'NORMAL' | 'DIFICIL' | 'PESADILLA';

/** Current phase of the game */
export type GamePhase =
  | 'MENU'
  | 'INTRO'
  | 'DAY_START'
  | 'PROCESSING'
  | 'DAY_END'
  | 'GAME_OVER'
  | 'VICTORY'
  | 'PAUSED';

/** Player statistics */
export interface PlayerStats {
  // Lifetime stats
  totalVisitorsProcessed: number;
  correctDecisions: number;
  incorrectDecisions: number;
  accuracy: number;           // Percentage

  // Detection stats
  fugitivesCaught: number;
  fugitivesMissed: number;
  contrabandIntercepted: number;
  contrabandMissed: number;
  impostorsDetected: number;
  impostorsMissed: number;
  innocentsWronglyDetained: number;

  // Speed stats
  averageProcessingTime: number;
  fastestProcessing: number;
  slowestProcessing: number;

  // Tool usage
  toolUsage: Map<InspectorTool, number>;
  favoriteTools: InspectorTool[];

  // By species
  speciesProcessed: Map<SpeciesId, number>;
  speciesAccuracy: Map<SpeciesId, number>;
}

/** Player resources */
export interface PlayerResources {
  credits: number;            // Currency
  reputation: number;         // 0-100, affects game ending
  warnings: number;           // Too many = game over
  maxWarnings: number;

  // Daily limits
  dailyCreditsEarned: number;
  dailyCreditsPenalty: number;
  dailyBonus: number;
}

/** Day state */
export interface DayState {
  dayNumber: number;
  phase: DayPhase;

  // Time
  dayStartTime: number;
  currentTime: number;
  dayDuration: number;        // In game seconds
  timeRemaining: number;

  // Visitor queue
  visitorQueue: Visitor[];
  currentVisitor: Visitor | null;
  processedVisitors: ProcessedVisitor[];

  // Daily targets
  rules: DailyRules;
  quotaMet: boolean;
  targetsMet: string[];
  targetsMissed: string[];

  // Events
  dailyEvents: DayEvent[];
  triggeredEvents: string[];
}

export type DayPhase =
  | 'BRIEFING'        // Morning briefing
  | 'WORKING'         // Processing visitors
  | 'BREAK'           // Lunch/break (optional)
  | 'OVERTIME'        // After hours
  | 'CLOSING'         // End of day
  | 'SUMMARY';        // Day summary

/** Processed visitor record */
export interface ProcessedVisitor {
  visitor: Visitor;
  documents: VisitorDocuments;
  decision: PlayerDecision;
  evaluation: DecisionEvaluation;
  toolsUsed: ToolUseResult[];
  processingTime: number;
}

/** Daily event */
export interface DayEvent {
  id: string;
  type: DayEventType;
  title: string;
  description: string;
  triggerCondition: string;
  triggered: boolean;
  consequence?: string;
}

export type DayEventType =
  | 'ALERTA_ESPECIAL'
  | 'VISITA_SUPERVISOR'
  | 'INCIDENTE'
  | 'NOTICIA'
  | 'PERSONAJE_ESPECIAL'
  | 'CAMBIO_REGLAS'
  | 'EMERGENCIA';

/** Complete game state */
export interface GameState {
  // Meta
  gameId: string;
  saveSlot: number;
  createdAt: number;
  lastPlayedAt: number;
  playTime: number;           // Total seconds played

  // Settings
  difficulty: GameDifficulty;
  language: string;

  // Current state
  phase: GamePhase;
  isPaused: boolean;

  // Progression
  currentDay: number;
  maxDays: number;            // For story mode
  dayState: DayState | null;

  // Player
  playerName: string;
  playerStats: PlayerStats;
  playerResources: PlayerResources;

  // Tools
  availableTools: Map<InspectorTool, InspectorToolState>;

  // Knowledge
  manual: InspectorManual;
  discoveredSecrets: string[];
  unlockedAchievements: string[];

  // Story
  storyProgress: StoryProgress;

  // Visitors in current session
  currentVisitor: Visitor | null;
  currentDocuments: VisitorDocuments | null;
  visitorHistory: ProcessedVisitor[];
}

/** Story progression */
export interface StoryProgress {
  currentChapter: number;
  completedChapters: number[];
  storyFlags: Map<string, boolean>;
  encounteredCharacters: string[];
  dialogueHistory: Map<string, string[]>;
  endings: string[];          // Possible endings unlocked
  currentEnding: string | null;
}

/** Achievement definition */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement: string;
  isSecret: boolean;
  isUnlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export type AchievementCategory =
  | 'DETECCION'
  | 'VELOCIDAD'
  | 'PRECISION'
  | 'HISTORIA'
  | 'DESCUBRIMIENTO'
  | 'SECRETO';

/** Game settings */
export interface GameSettings {
  // Audio
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;

  // Visual
  showTutorialHints: boolean;
  documentZoom: number;
  highlightErrors: boolean;
  animationSpeed: number;

  // Gameplay
  autoPauseOnAlert: boolean;
  confirmDecisions: boolean;
  showProcessingTime: boolean;

  // Accessibility
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

/** Save game data */
export interface SaveGameData {
  version: string;
  gameState: GameState;
  settings: GameSettings;
  checksum: string;           // For validation
}

/** Game session for current play */
export interface GameSession {
  sessionId: string;
  startedAt: number;
  gameState: GameState;
  settings: GameSettings;

  // Runtime state
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastAutoSave: number;

  // Error tracking
  errors: GameError[];
}

/** Game error for logging */
export interface GameError {
  timestamp: number;
  type: 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  stack?: string;
  context?: any;
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  day: number;
  accuracy: number;
  fugitivesCaught: number;
  difficulty: GameDifficulty;
  date: number;
}

/** Game mode */
export type GameMode =
  | 'HISTORIA'        // Story mode with narrative
  | 'INFINITO'        // Endless mode
  | 'DIARIO'          // Daily challenge
  | 'TUTORIAL';       // Tutorial mode
