/**
 * PORTAL CONTROL - Document Model
 * Defines all document types used in the immigration system
 */

import { SpeciesId, DetectionFlag } from './species.model';
import { TravelPurpose, VisitorId } from './visitor.model';

/** Document unique identifier */
export type DocumentId = string;

/** Types of documents in the system */
export type DocumentType =
  | 'PASAPORTE_DIMENSIONAL'
  | 'VISA_TRABAJO'
  | 'VISA_TURISMO'
  | 'VISA_REFUGIADO'
  | 'VISA_DIPLOMATICA'
  | 'PERMISO_TRANSITO'
  | 'CERTIFICADO_SALUD'
  | 'ORDEN_CAPTURA'
  | 'AUTORIZACION_QDT'
  | 'LICENCIA_COMERCIO';

/** Document status */
export type DocumentStatus =
  | 'VALIDO'
  | 'CADUCADO'
  | 'FALSIFICADO'
  | 'ROBADO'
  | 'REVOCADO'
  | 'PENDIENTE';

/** Issuing authority */
export interface IssuingAuthority {
  id: string;
  name: string;
  city: string;
  dimension: string;
  sealCode: string;   // Verification code
  isValid: boolean;   // Some authorities no longer exist
}

/** Document seal/stamp */
export interface DocumentSeal {
  authorityId: string;
  date: string;       // Format: "Ciclo XXXX.X"
  type: 'ENTRADA' | 'SALIDA' | 'TRANSITO' | 'RECHAZO' | 'ESPECIAL';
  portCode: string;   // Portal code, e.g., "ITHOR-A7"
  isAuthentic: boolean;
}

/** Photo on document */
export interface DocumentPhoto {
  subjectName: string;
  subjectSpecies: SpeciesId;

  // Visual characteristics that should match
  eyeCount: number;
  appendageCount: number;
  distinctiveFeatures: string[];

  // Photo metadata
  photoDate: string;
  photoLocation: string;

  // For detecting mismatches
  matchesHolder: boolean;
  mismatchReasons: string[];
}

/** Error types that can be present in documents */
export interface DocumentError {
  errorType: DocumentErrorType;
  field: string;
  expectedValue?: string;
  actualValue?: string;
  severity: 'minor' | 'major' | 'critical';
  detectionDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  requiresTool?: string;  // Tool needed to detect
}

export type DocumentErrorType =
  | 'FECHA_INVALIDA'
  | 'SELLO_FALSO'
  | 'FOTO_NO_COINCIDE'
  | 'AUTORIDAD_INEXISTENTE'
  | 'NUMERO_INVALIDO'
  | 'DIMENSION_INCORRECTA'
  | 'ESPECIE_INCORRECTA'
  | 'FIRMA_INVALIDA'
  | 'FORMATO_INCORRECTO'
  | 'DATOS_CONTRADICTORIOS'
  | 'DOCUMENTO_ROBADO'
  | 'DUPLICADO';

/** Base document interface */
export interface BaseDocument {
  id: DocumentId;
  type: DocumentType;
  holderId: VisitorId;
  holderName: string;

  // Document metadata
  documentNumber: string;
  issueDate: string;
  expirationDate: string;
  issuingAuthority: IssuingAuthority;

  // Status
  status: DocumentStatus;
  isAuthentic: boolean;

  // Errors (for game logic)
  errors: DocumentError[];

  // Visual state
  isExamined: boolean;
  isMarked: boolean;
  notes: string[];
}

/** Dimensional Passport - Primary ID document */
export interface DimensionalPassport extends BaseDocument {
  type: 'PASAPORTE_DIMENSIONAL';

  // Holder information
  holderSpecies: SpeciesId;
  holderOriginWorld: string;
  holderOriginDimension: string;
  holderOriginCity: string;

  // Physical description
  registeredHeight: number;
  registeredWeight: number;
  bloodType: string;
  distinctiveFeatures: string[];

  // Species-specific fields
  ulnarCount?: number;        // For Vulnari
  casteCode?: string;         // For Exopodos
  scaleType?: string;         // For Reptilianos
  morphologyType?: string;    // For Inmigrantes

  // Photo
  photo: DocumentPhoto;

  // Dimensional signature
  dimensionalSignature: string;
  signatureVerified: boolean;

  // Travel history
  seals: DocumentSeal[];

  // Special permissions
  multiDimensionalAccess: boolean;
  restrictedSectors: string[];
}

/** Work Visa */
export interface WorkVisa extends BaseDocument {
  type: 'VISA_TRABAJO';

  employerName: string;
  employerSector: string;
  jobTitle: string;
  duration: string;
  salary?: string;
  workSectorRestrictions: string[];
}

/** Tourism Visa */
export interface TourismVisa extends BaseDocument {
  type: 'VISA_TURISMO';

  maxDuration: string;
  allowedCities: string[];
  sponsorRequired: boolean;
  sponsorName?: string;
}

/** Refugee Visa */
export interface RefugeeVisa extends BaseDocument {
  type: 'VISA_REFUGIADO';

  fleeingFrom: string;
  reason: string;
  temporaryStatus: boolean;
  reviewDate: string;
  asylumGrantedBy: string;
}

/** Diplomatic Visa */
export interface DiplomaticVisa extends BaseDocument {
  type: 'VISA_DIPLOMATICA';

  embassy: string;
  diplomaticRank: string;
  immunityLevel: 'FULL' | 'LIMITED' | 'NONE';
  missionPurpose: string;
}

/** Transit Permit */
export interface TransitPermit extends BaseDocument {
  type: 'PERMISO_TRANSITO';

  entryPortal: string;
  exitPortal: string;
  maxTransitTime: string;
  allowedRoute: string[];
}

/** Health Certificate */
export interface HealthCertificate extends BaseDocument {
  type: 'CERTIFICADO_SALUD';

  examDate: string;
  examLocation: string;
  doctorName: string;
  doctorLicense: string;

  // Health status
  isHealthy: boolean;
  conditions: string[];
  vaccinations: string[];
  quarantineRequired: boolean;
  quarantineDays?: number;

  // Dimensional contamination
  radiationLevel: 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH';
  parasiteCheck: 'NEGATIVE' | 'POSITIVE' | 'INCONCLUSIVE';
}

/** Capture Order - For fugitives */
export interface CaptureOrder extends BaseDocument {
  type: 'ORDEN_CAPTURA';

  subjectName: string;
  subjectSpecies: SpeciesId;
  subjectDescription: string;
  subjectPhoto: DocumentPhoto;

  crime: string;
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  reward?: string;

  issuedBy: string;
  validInDimensions: string[];

  notes: string;
}

/** QDT Authorization - For entering QDT facilities */
export interface QDTAuthorization extends BaseDocument {
  type: 'AUTORIZACION_QDT';

  clearanceLevel: 'VISITOR' | 'EMPLOYEE' | 'RESEARCHER' | 'DIRECTOR';
  allowedSectors: string[];
  escortRequired: boolean;
  backgroundCheckPassed: boolean;
  specialConditions: string[];
}

/** Union type for all documents */
export type Document =
  | DimensionalPassport
  | WorkVisa
  | TourismVisa
  | RefugeeVisa
  | DiplomaticVisa
  | TransitPermit
  | HealthCertificate
  | CaptureOrder
  | QDTAuthorization;

/** Document set for a visitor */
export interface VisitorDocuments {
  visitorId: VisitorId;
  passport?: DimensionalPassport;
  visa?: WorkVisa | TourismVisa | RefugeeVisa | DiplomaticVisa;
  transitPermit?: TransitPermit;
  healthCertificate?: HealthCertificate;
  additionalDocuments: Document[];

  // Quick access
  hasAllRequired: boolean;
  missingDocuments: DocumentType[];
  totalErrors: number;
}

/** Rules for document requirements */
export interface DocumentRequirements {
  purpose: TravelPurpose;
  requiredDocuments: DocumentType[];
  optionalDocuments: DocumentType[];
  specialConditions: string[];
}

/** Document verification result */
export interface DocumentVerificationResult {
  documentId: DocumentId;
  isValid: boolean;
  errors: DocumentError[];
  flags: DetectionFlag[];
  notes: string[];
}
