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
  dollars: number;            // Currency (Oro Blanco)
  reputation: number;         // 0-100, affects game ending
  warnings: number;           // Too many = game over
  maxWarnings: number;

  // Daily limits
  dailyDollarsEarned: number;
  dailyDollarsPenalty: number;
  dailyBonus: number;
}

/** Upgrade categories */
export type UpgradeCategory =
  | 'HERRAMIENTAS'      // Tool upgrades
  | 'ESTACION'          // Station improvements
  | 'PERSONAL'          // Personal perks
  | 'TECNOLOGIA';       // Tech upgrades

/** Station upgrade definition */
export interface StationUpgrade {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  cost: number;
  icon: string;

  // Requirements
  requiredDay: number;
  requiredUpgrades: string[];
  requiredReputation: number;

  // Effects
  effects: UpgradeEffect[];

  // State
  isPurchased: boolean;
  purchasedAt?: number;
  level: number;
  maxLevel: number;
}

/** Upgrade effect types */
export interface UpgradeEffect {
  type: UpgradeEffectType;
  value: number;
  description: string;
}

export type UpgradeEffectType =
  | 'TOOL_COOLDOWN_REDUCTION'    // Reduces tool cooldowns
  | 'TOOL_ACCURACY_BOOST'       // Increases detection accuracy
  | 'DOLLARS_MULTIPLIER'        // Multiplies earnings
  | 'REPUTATION_PROTECTION'     // Reduces reputation loss
  | 'EXTRA_WARNING'             // +1 max warning
  | 'TIME_EXTENSION'            // More time per day
  | 'VISITOR_INSIGHT'           // Shows hints about visitors
  | 'AUTO_SCAN'                 // Auto-uses a tool
  | 'ERROR_HIGHLIGHT'           // Highlights document errors
  | 'SPEED_BONUS_INCREASE'      // Better speed bonus rewards
  | 'NEW_DECISION_OPTION'       // Unlocks new decision type
  | 'SPECIAL_VISITOR_CHANCE';   // More special visitors

/** Shop item */
export interface ShopItem {
  id: string;
  type: 'UPGRADE' | 'CONSUMABLE' | 'COSMETIC';
  upgrade?: StationUpgrade;
  consumable?: ConsumableItem;
  isAvailable: boolean;
  isNew: boolean;
}

/** Consumable item (one-time use) */
export interface ConsumableItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  quantity: number;
  maxQuantity: number;
  effect: ConsumableEffect;
}

export type ConsumableEffect =
  | 'SKIP_VISITOR'          // Skip current visitor without penalty
  | 'EXTRA_TIME'            // +30 seconds for current visitor
  | 'REVEAL_TRUTH'          // Reveals if visitor is legit or not
  | 'REMOVE_WARNING'        // Removes one warning
  | 'DOUBLE_REWARD';        // Double dollars for next correct decision

/** Special event definition */
export interface SpecialEvent {
  id: string;
  type: SpecialEventType;
  title: string;
  description: string;
  dialogue: EventDialogue[];

  // Trigger conditions
  triggerDay: number | null;      // null = can happen any day
  triggerChance: number;          // 0-1 probability
  triggerConditions: EventCondition[];

  // State
  hasOccurred: boolean;
  canRepeat: boolean;

  // Consequences
  choices?: EventChoice[];
  rewards?: EventReward;
  consequences?: EventConsequence;
}

export type SpecialEventType =
  | 'VISITA_SUPERVISOR'
  | 'INSPECTOR_CORRUPTO'
  | 'CELEBRIDAD'
  | 'FAMILIAR_FUGITIVO'
  | 'SOBORNO'
  | 'INVASIÓN_DIMENSIONAL'
  | 'PLAGA'
  | 'VISITA_DIRECTOR'
  | 'SABOTAJE'
  | 'REGALO_MISTERIOSO'
  | 'EMERGENCIA_MEDICA'
  | 'MANIFESTACION';

export interface EventDialogue {
  speaker: string;
  text: string;
  emotion?: string;
  portrait?: string;
}

export interface EventCondition {
  type: 'DAY_RANGE' | 'REPUTATION' | 'DOLLARS' | 'DECISIONS' | 'SPECIAL_FLAG';
  operator: '>' | '<' | '==' | '>=' | '<=';
  value: number | string;
}

export interface EventChoice {
  id: string;
  text: string;
  requirements?: EventCondition[];
  consequence: EventConsequence;
}

export interface EventReward {
  dollars?: number;
  reputation?: number;
  items?: string[];
  unlocks?: string[];
}

export interface EventConsequence {
  dollarsChange?: number;
  reputationChange?: number;
  warningChange?: number;
  specialFlag?: string;
  triggersEvent?: string;
  narrative?: string;
}

/** Special visitor (unique character) */
export interface SpecialVisitor {
  id: string;
  name: string;
  title: string;
  species: string;
  description: string;
  portrait: string;

  // When they appear
  appearDay: number | null;
  appearChance: number;

  // Behavior
  isAlwaysLegal: boolean;
  isAlwaysIllegal: boolean;
  hasForcedOutcome: boolean;
  forcedDecision?: string;

  // Dialogue
  greetingDialogue: string[];
  approvalDialogue: string[];
  denialDialogue: string[];
  detentionDialogue: string[];

  // Rewards/consequences
  correctReward: EventReward;
  incorrectConsequence: EventConsequence;

  // Story
  unlocksStory?: string;
  hasBeenSeen: boolean;
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
