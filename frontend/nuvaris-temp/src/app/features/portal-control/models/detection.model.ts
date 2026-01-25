/**
 * PORTAL CONTROL - Detection Model
 * Defines the detection and validation system
 */

import { SpeciesId, DetectionFlag, DangerLevel, MorphologyType } from './species.model';
import { VisitorId, ScannerResults } from './visitor.model';
import { DocumentId, DocumentError } from './document.model';

/** Tool types available to the inspector */
export type InspectorTool =
  | 'ESCANER_MASA'           // Mass/weight scanner
  | 'TERMOGRAFO'             // Thermal scanner
  | 'LUZ_UV'                 // UV light for blood/markings
  | 'MAGNETOMETRO'           // Metal detector for scales
  | 'VISOR_DIMENSIONAL'      // Dimensional signature reader
  | 'DETECTOR_INTENCION'     // Vulnari-based lie detector
  | 'RESONADOR_ULNAR'        // Ulnar authenticator
  | 'LUPA_DOCUMENTOS'        // Document magnifier
  | 'VERIFICADOR_SELLOS'     // Seal verifier
  | 'BASE_DATOS_CAPTURAS';   // Fugitive database

/** Tool state */
export interface InspectorToolState {
  tool: InspectorTool;
  isAvailable: boolean;
  isUnlocked: boolean;
  unlockDay: number;        // Day when tool becomes available
  useCost: number;          // Cost per use (if any)
  cooldown: number;         // Seconds before can use again
  currentCooldown: number;
  totalUses: number;
  description: string;
  shortDescription: string;
}

/** Result of using a tool */
export interface ToolUseResult {
  tool: InspectorTool;
  success: boolean;
  result: any;              // Tool-specific result
  flagsRaised: DetectionFlag[];
  message: string;
  timestamp: number;
}

/** Detection analysis result */
export interface DetectionAnalysis {
  visitorId: VisitorId;

  // Overall assessment
  overallSuspicion: number;   // 0-100
  recommendedAction: DecisionType;
  confidence: number;         // 0-100

  // Flags
  flagsRaised: DetectionFlag[];
  flagDetails: FlagDetail[];

  // Category scores
  documentScore: number;      // 0-100 (100 = perfect)
  physicalScore: number;      // 0-100
  behavioralScore: number;    // 0-100
  dimensionalScore: number;   // 0-100

  // Specific issues
  documentIssues: DocumentIssue[];
  physicalAnomalies: PhysicalAnomaly[];
  behavioralFlags: BehavioralFlag[];

  // Comparison data
  declaredVsActual: ComparisonResult[];
}

/** Detail about a raised flag */
export interface FlagDetail {
  flag: DetectionFlag;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'document' | 'physical' | 'behavioral' | 'scanner' | 'database';
  description: string;
  evidence: string[];
  toolUsed?: InspectorTool;
}

/** Document-specific issue */
export interface DocumentIssue {
  documentId: DocumentId;
  error: DocumentError;
  description: string;
  visualHint?: string;      // Where to look on the document
}

/** Physical anomaly detected */
export interface PhysicalAnomaly {
  type: string;
  expected: string;
  actual: string;
  source: 'observation' | 'scanner';
  scannerUsed?: InspectorTool;
}

/** Behavioral flag */
export interface BehavioralFlag {
  type: string;
  description: string;
  confidence: number;       // 0-100
  dialogueEvidence?: string[];
}

/** Comparison between declared and actual values */
export interface ComparisonResult {
  field: string;
  declaredValue: any;
  actualValue: any;
  matches: boolean;
  discrepancy?: string;
}

/** Decision types for visitor processing */
export type DecisionType =
  | 'APROBAR'               // Approve entry
  | 'DENEGAR'               // Deny entry
  | 'DETENER'               // Detain for investigation
  | 'CUARENTENA'            // Send to quarantine
  | 'OMEGA'                 // Send to Sector Omega
  | 'DERIVAR';              // Forward to supervisor

/** Decision made by the player */
export interface PlayerDecision {
  visitorId: VisitorId;
  decision: DecisionType;
  reason: string;
  flagsCited: DetectionFlag[];
  timestamp: number;
  processingTime: number;   // How long player took
  toolsUsed: InspectorTool[];
}

/** Evaluation of player's decision */
export interface DecisionEvaluation {
  decision: PlayerDecision;
  wasCorrect: boolean;
  correctDecision: DecisionType;

  // Scoring
  basePoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  finalPoints: number;

  // Detailed feedback
  feedback: string;
  missedFlags: DetectionFlag[];
  falseFlags: DetectionFlag[];

  // Consequences
  consequences: DecisionConsequence[];
}

/** Consequence of a decision */
export interface DecisionConsequence {
  type: ConsequenceType;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
  affectsDay: boolean;      // Immediate effect
  affectsFuture: boolean;   // Long-term effect
  pointsLost?: number;
  reputationChange?: number;
}

export type ConsequenceType =
  | 'FUGITIVO_ESCAPO'       // Let a fugitive through
  | 'INOCENTE_DETENIDO'     // Detained an innocent
  | 'CONTRABANDO_ENTRO'     // Contraband got through
  | 'INFECCION_PROPAGADA'   // Infection spread
  | 'INCIDENTE_DIPLOMATICO' // Diplomatic incident
  | 'ELOGIO_SUPERVISOR'     // Praise from supervisor
  | 'ADVERTENCIA'           // Warning
  | 'MULTA'                 // Fine
  | 'PROMOCION'             // Promotion
  | 'DESPIDO';              // Fired

/** Daily rules that change */
export interface DailyRules {
  day: number;

  // General rules
  allowedSpecies: SpeciesId[];
  bannedOrigins: string[];      // Banned planets/dimensions
  requiredDocuments: string[];
  specialAlerts: SpecialAlert[];

  // Quotas
  minApprovals: number;
  maxDenials: number;
  targetProcessingTime: number; // Average seconds per visitor

  // Difficulty modifiers
  impostorChance: number;       // 0-1
  errorChance: number;          // 0-1
  fugitiveChance: number;       // 0-1

  // Unlocks
  newToolsAvailable: InspectorTool[];
  newRulesIntroduced: string[];
}

/** Special alert for the day */
export interface SpecialAlert {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetSpecies?: SpeciesId;
  targetOrigin?: string;
  rewardForCapture?: number;
}

/** Inspector manual entry */
export interface ManualEntry {
  id: string;
  category: ManualCategory;
  title: string;
  content: string;
  unlockDay: number;
  isUnlocked: boolean;

  // Related entries
  relatedEntries: string[];
  relatedSpecies?: SpeciesId[];
  relatedTools?: InspectorTool[];
}

export type ManualCategory =
  | 'ESPECIES'
  | 'DOCUMENTOS'
  | 'HERRAMIENTAS'
  | 'PROCEDIMIENTOS'
  | 'ALERTAS'
  | 'HISTORIA';

/** Inspector manual */
export interface InspectorManual {
  entries: Map<string, ManualEntry>;
  categories: Map<ManualCategory, ManualEntry[]>;
  recentlyViewed: string[];
  bookmarks: string[];
}
