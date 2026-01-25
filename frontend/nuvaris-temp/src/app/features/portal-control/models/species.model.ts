/**
 * PORTAL CONTROL - Species Model
 * Defines all species/races in the Nuvaris universe
 * Based on official lore from docs/lore/Lore.md
 */

/** Base stats for each species */
export interface SpeciesStats {
  STR: number; // Strength (1-10)
  AGI: number; // Agility (1-10)
  RES: number; // Resistance (1-10)
  INT: number; // Intelligence (1-10)
}

/** Physical range for measurable traits */
export interface PhysicalRange {
  min: number;
  max: number;
}

/** Blood type information */
export interface BloodType {
  color: string;
  glowsUnderUV: boolean;
  temperature: 'warm' | 'cold' | 'ambient' | 'variable';
}

/** Identifying feature that can be checked */
export interface IdentifyingFeature {
  id: string;
  name: string;
  description: string;
  required: boolean;
  countRange?: PhysicalRange;
  possibleValues?: string[];
  detectionTool?: string; // Tool required to detect this feature
}

/** Behavioral trait that can be observed */
export interface BehavioralTrait {
  id: string;
  name: string;
  description: string;
  detectableBy: 'observation' | 'scanner' | 'interrogation' | 'special_tool';
  suspiciousIf?: string; // What makes this suspicious
}

/** Detection rule for validating species */
export interface DetectionRule {
  id: string;
  description: string;
  checkType: 'range' | 'exact' | 'presence' | 'absence' | 'comparison';
  field: string;
  expectedValue?: any;
  expectedRange?: PhysicalRange;
  failureFlag: DetectionFlag;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/** Possible detection flags */
export type DetectionFlag =
  | 'IMPOSTOR_PROBABLE'
  | 'BIOLOGIA_ANOMALA'
  | 'DOCUMENTO_FALSIFICADO'
  | 'DIMENSION_INCORRECTA'
  | 'ORDEN_DE_CAPTURA'
  | 'CUARENTENA_REQUERIDA'
  | 'CONTRABANDO_DETECTADO'
  | 'RADIACION_PELIGROSA'
  | 'PARASITO_DIMENSIONAL'
  | 'MIMETICO_DETECTADO'
  | 'COLMENA_EXTINTA'
  | 'TEMPERATURA_ANOMALA'
  | 'PESO_INCORRECTO'
  | 'APENDICES_INCORRECTOS'
  | 'COMPORTAMIENTO_SOSPECHOSO';

/** Sprite layer configuration */
export interface SpriteLayerConfig {
  layerId: string;
  required: boolean;
  options: string[]; // Asset file names without extension
  colorizable: boolean;
  defaultHueRange?: PhysicalRange; // Default hue shift range
}

/** Complete species definition */
export interface Species {
  id: SpeciesId;
  name: string;
  namePlural: string;
  description: string;
  loreDescription: string;
  originWorld: string;
  originCities: string[];

  // Stats
  baseStats: SpeciesStats;
  statVariance: number; // How much stats can vary from base

  // Physical characteristics
  heightRange: PhysicalRange; // in meters
  weightRange: PhysicalRange; // in kg
  bodyTemperature: {
    type: 'fixed' | 'ambient_relative' | 'variable';
    baseValue?: number; // Celsius
    ambientOffset?: number; // For ambient_relative
    range?: PhysicalRange;
  };
  bloodType: BloodType;

  // Identifying features
  identifyingFeatures: IdentifyingFeature[];
  behavioralTraits: BehavioralTrait[];

  // Detection rules
  detectionRules: DetectionRule[];

  // Visual configuration
  spriteLayers: SpriteLayerConfig[];
  defaultColorPalette: string[]; // Hex colors

  // Rarity and generation
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare';
  canBeImpostor: boolean; // Can other species impersonate this one
  impostorDifficulty: 'easy' | 'medium' | 'hard'; // How hard to detect impostor
}

/** Valid species IDs based on lore */
export type SpeciesId =
  | 'HUMANO'
  | 'VULNARI'
  | 'EXOPODO'
  | 'REPTILIANO'
  | 'INMIGRANTE';

/** Species category for grouping */
export type SpeciesCategory =
  | 'NATIVO'      // Native to Tartarus Pryme
  | 'TERRESTRE'   // From Earth (Humans)
  | 'DIMENSIONAL' // From other dimensions (Inmigrantes)
  | 'HIBRIDO';    // Hybrid/Modified (like QDT subjects)

/** Morphology type for classification */
export type MorphologyType =
  | 'CARBONO'     // Carbon-based (Humans)
  | 'SILICIO'     // Silicon-based (Exopodos)
  | 'SANGRE_FRIA' // Cold-blooded (Reptilianos)
  | 'ETEREO'      // Ethereal (Vulnari, some Inmigrantes)
  | 'HIBRIDO'     // Hybrid
  | 'DESCONOCIDO';// Unknown (dangerous Inmigrantes)

/** Danger level classification */
export type DangerLevel =
  | 'INOFENSIVO'  // Harmless
  | 'CONTROLADO'  // Requires monitoring
  | 'POTENCIAL'   // Potential threat
  | 'ACTIVO'      // Active threat
  | 'OMEGA';      // Send to Sector Omega!

/** Species registry for quick lookup */
export interface SpeciesRegistry {
  species: Map<SpeciesId, Species>;
  getById(id: SpeciesId): Species | undefined;
  getByCategory(category: SpeciesCategory): Species[];
  getByRarity(rarity: Species['rarity']): Species[];
  getRandomSpecies(excludeRare?: boolean): Species;
}
