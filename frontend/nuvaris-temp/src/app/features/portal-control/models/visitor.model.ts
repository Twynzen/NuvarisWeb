/**
 * PORTAL CONTROL - Visitor Model
 * Defines the structure of visitors arriving at the portal
 */

import { SpeciesId, MorphologyType, DangerLevel, DetectionFlag, SpeciesStats } from './species.model';

/** Unique identifier for visitors */
export type VisitorId = string;

/** Current state of the visitor in the system */
export type VisitorState =
  | 'WAITING'     // Waiting in queue
  | 'AT_WINDOW'   // Currently at the inspection window
  | 'SCANNING'    // Being scanned
  | 'APPROVED'    // Approved for entry
  | 'DENIED'      // Denied entry
  | 'DETAINED'    // Detained for further investigation
  | 'ESCAPED'     // Escaped (failed to detain)
  | 'OMEGA';      // Sent to Sector Omega

/** Physical appearance of the visitor */
export interface VisitorAppearance {
  // Base physical traits
  height: number;        // in meters
  weight: number;        // in kg
  bodyTemperature: number; // in Celsius

  // Species-specific features
  skinTone: string;      // Hex color
  eyeCount: number;
  appendageCount: number; // Arms, tentacles, etc.
  specialFeatures: string[]; // e.g., "ulnar_6", "escamas_metalicas"

  // Visual modifiers for sprite assembly
  spriteBase: string;    // Base sprite asset
  spriteLayers: VisitorSpriteLayer[];
  hueShift: number;      // -180 to 180
  saturationMod: number; // 0.5 to 1.5
  scaleX: number;        // 0.8 to 1.2
  scaleY: number;        // 0.85 to 1.15
  brightness: number;    // 0.7 to 1.3
}

/** Sprite layer for visual assembly */
export interface VisitorSpriteLayer {
  layerId: string;
  assetName: string;
  zIndex: number;
  hueShift?: number;
  opacity?: number;
}

/** Visitor's actual hidden truth (for game logic) */
export interface VisitorTruth {
  isImpostor: boolean;
  realSpecies?: SpeciesId;
  isFugitive: boolean;
  fugitiveReason?: string;
  isCarryingContraband: boolean;
  contrabandType?: string;
  isInfected: boolean;
  infectionType?: string;
  hasFakeDocuments: boolean;
  fakeDocumentErrors: string[];
  hiddenDangerLevel: DangerLevel;
  secretMission?: string; // For special story cases
}

/** Visitor behavior during inspection */
export interface VisitorBehavior {
  nervousness: number;       // 0-100, affects dialogue
  cooperativeness: number;   // 0-100
  aggression: number;        // 0-100
  deceptionSkill: number;    // 0-100, how good at lying
  currentMood: VisitorMood;
  dialogueStyle: DialogueStyle;
}

export type VisitorMood =
  | 'calm'
  | 'nervous'
  | 'angry'
  | 'sad'
  | 'excited'
  | 'suspicious'
  | 'terrified';

export type DialogueStyle =
  | 'formal'
  | 'casual'
  | 'aggressive'
  | 'submissive'
  | 'evasive'
  | 'friendly';

/** Travel information declared by visitor */
export interface TravelInfo {
  declaredPurpose: TravelPurpose;
  declaredDuration: string;    // e.g., "3 ciclos", "permanente"
  declaredDestination: string; // City or sector
  declaredOrigin: string;      // Where they came from
  hasReturnTicket: boolean;
  sponsorName?: string;        // If visiting someone
  sponsorRelation?: string;
}

export type TravelPurpose =
  | 'TURISMO'
  | 'NEGOCIOS'
  | 'REFUGIO'
  | 'PEREGRINACION'
  | 'TRABAJO'
  | 'REUNION_FAMILIAR'
  | 'DIPLOMACIA'
  | 'INVESTIGACION'
  | 'TRATAMIENTO_MEDICO'
  | 'TRANSITO'
  | 'OTRO';

/** Scanner results from various tools */
export interface ScannerResults {
  massScanner?: {
    measuredWeight: number;
    anomalyDetected: boolean;
  };
  thermalScanner?: {
    measuredTemperature: number;
    heatSignature: 'normal' | 'cold' | 'hot' | 'irregular';
  };
  uvScanner?: {
    bloodGlowDetected: boolean;
    hiddenMarkingsFound: string[];
  };
  magnetometer?: {
    metallicPresence: boolean;
    metalType?: string;
  };
  dimensionalVisor?: {
    dimensionalSignature: string;
    signatureMatch: boolean;
    radiationLevel: 'safe' | 'low' | 'moderate' | 'high' | 'critical';
  };
  intentionDetector?: {
    deceptionProbability: number; // 0-100
    hostilityLevel: number;       // 0-100
  };
  ulnarResonator?: {  // Vulnari-specific
    ulnarResponse: boolean;
    ulnarCount?: number;
  };
}

/** Complete visitor entity */
export interface Visitor {
  id: VisitorId;

  // Identity
  name: string;
  declaredSpecies: SpeciesId;
  actualSpecies: SpeciesId;
  morphology: MorphologyType;
  stats: SpeciesStats;

  // Appearance
  appearance: VisitorAppearance;

  // Hidden truth (game logic)
  truth: VisitorTruth;

  // Behavior
  behavior: VisitorBehavior;

  // Travel
  travelInfo: TravelInfo;

  // Current state
  state: VisitorState;
  arrivalTime: number;      // Game time when arrived
  processingTime: number;   // Time spent at window

  // Scanner results (populated as player uses tools)
  scannerResults: ScannerResults;

  // Detection flags raised during inspection
  detectionFlags: DetectionFlag[];

  // Dialogue
  currentDialogue: string[];
  dialogueIndex: number;
  hasAnsweredQuestions: boolean;

  // Special cases
  isStoryCharacter: boolean;
  storyCharacterId?: string;
}

/** Visitor generation parameters */
export interface VisitorGenerationParams {
  day: number;              // Current game day (affects difficulty)
  difficulty: number;       // 1-10
  forceSpecies?: SpeciesId;
  forceImpostor?: boolean;
  forceFugitive?: boolean;
  forceContraband?: boolean;
  isStoryVisitor?: boolean;
  storyVisitorId?: string;
}

/** Dialogue line for visitor conversations */
export interface DialogueLine {
  id: string;
  text: string;
  mood: VisitorMood;
  isLie: boolean;
  triggersFlag?: DetectionFlag;
  nextLines?: string[];  // Possible follow-up line IDs
}

/** Dialogue tree for a visitor */
export interface VisitorDialogue {
  greeting: DialogueLine[];
  questions: Map<string, DialogueLine[]>; // Question ID -> Possible responses
  reactions: Map<string, DialogueLine[]>; // Action ID -> Reactions
  farewell: DialogueLine[];
}
