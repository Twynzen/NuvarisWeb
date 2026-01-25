/**
 * PORTAL CONTROL - Document Generator Service
 * Generates documents for visitors with intentional errors for impostors/fugitives
 */

import { Injectable } from '@angular/core';
import {
  Visitor,
  DimensionalPassport,
  WorkVisa,
  TourismVisa,
  RefugeeVisa,
  VisitorDocuments,
  DocumentSeal,
  DocumentPhoto,
  DocumentError,
  DocumentErrorType,
  IssuingAuthority,
  DocumentType,
  HealthCertificate,
} from '../models';
import { SpeciesService } from './species.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentGeneratorService {
  private documentCounter = 0;

  // Valid issuing authorities
  private readonly validAuthorities: IssuingAuthority[] = [
    { id: 'ITHOR-GOV', name: 'Gobierno de Ithor', city: 'Ithor', dimension: 'Núvaris Prime', sealCode: 'ITH-001', isValid: true },
    { id: 'QDT-CORP', name: 'QDT Corporation', city: 'Sector Omega', dimension: 'Núvaris Prime', sealCode: 'QDT-777', isValid: true },
    { id: 'NAU-VEL', name: 'Concilio de Nau-Vel', city: 'Nau-Vel', dimension: 'Núvaris Prime', sealCode: 'NAU-333', isValid: true },
    { id: 'KHRALE', name: 'Fortaleza Khrale', city: 'Khrale', dimension: 'Núvaris Prime', sealCode: 'KHR-666', isValid: true },
    { id: 'EARTH-UN', name: 'Naciones Unidas de la Tierra', city: 'Nueva York', dimension: 'Tierra Prime', sealCode: 'UNE-100', isValid: true },
  ];

  // Invalid authorities (for fake documents)
  private readonly invalidAuthorities: IssuingAuthority[] = [
    { id: 'FAKE-001', name: 'Gobierno Dimensional Universal', city: 'Desconocido', dimension: 'Variable', sealCode: 'XXX-000', isValid: false },
    { id: 'DEFUNCT', name: 'Imperio de Cristal (Disuelto)', city: 'Ruinas', dimension: 'Dimensión Muerta', sealCode: 'CRY-999', isValid: false },
  ];

  constructor(
    private speciesService: SpeciesService,
    private logger: LoggerService
  ) {}

  /**
   * Generate all documents for a visitor
   */
  generateDocuments(visitor: Visitor): VisitorDocuments {
    const endTimer = this.logger.time('DocumentGenerator', 'Generate documents');

    try {
      const passport = this.generatePassport(visitor);
      const visa = this.generateVisa(visitor);
      const healthCert = this.generateHealthCertificate(visitor);

      const documents: VisitorDocuments = {
        visitorId: visitor.id,
        passport,
        visa,
        healthCertificate: healthCert,
        additionalDocuments: [],
        hasAllRequired: this.checkAllRequired(visitor, passport, visa),
        missingDocuments: this.getMissingDocuments(visitor, passport, visa),
        totalErrors: this.countTotalErrors(passport, visa, healthCert),
      };

      this.logger.info('DocumentGenerator', `Generated documents for ${visitor.name}`, {
        hasPassport: !!passport,
        hasVisa: !!visa,
        totalErrors: documents.totalErrors,
      });

      endTimer();
      return documents;

    } catch (error) {
      this.logger.error('DocumentGenerator', 'Failed to generate documents', error);
      endTimer();
      throw error;
    }
  }

  /**
   * Generate Dimensional Passport
   */
  private generatePassport(visitor: Visitor): DimensionalPassport {
    const species = this.speciesService.getByIdOrThrow(visitor.declaredSpecies);
    const isFake = visitor.truth.hasFakeDocuments;
    const errors: DocumentError[] = [];

    // Generate document number
    const documentNumber = this.generateDocumentNumber('PD');

    // Dates
    const { issueDate, expirationDate, dateErrors } = this.generateDates(isFake);
    errors.push(...dateErrors);

    // Issuing authority
    const { authority, authorityError } = this.selectAuthority(isFake);
    if (authorityError) errors.push(authorityError);

    // Photo
    const { photo, photoErrors } = this.generatePhoto(visitor, isFake);
    errors.push(...photoErrors);

    // Physical data - might be wrong for impostors
    const { registeredHeight, registeredWeight, physicalErrors } =
      this.generatePhysicalData(visitor, isFake);
    errors.push(...physicalErrors);

    // Species-specific data
    const speciesData = this.generateSpeciesSpecificData(visitor, isFake);
    if (speciesData.error) errors.push(speciesData.error);

    // Seals
    const seals = this.generateSeals(isFake);

    // Dimensional signature
    const dimensionalSignature = this.generateDimensionalSignature(visitor, isFake);
    const signatureVerified = !isFake || Math.random() > 0.5;

    const passport: DimensionalPassport = {
      id: this.generateDocumentId(),
      type: 'PASAPORTE_DIMENSIONAL',
      holderId: visitor.id,
      holderName: visitor.name,
      documentNumber,
      issueDate,
      expirationDate,
      issuingAuthority: authority,
      status: isFake ? 'FALSIFICADO' : 'VALIDO',
      isAuthentic: !isFake,
      errors,
      isExamined: false,
      isMarked: false,
      notes: [],

      holderSpecies: visitor.declaredSpecies,
      holderOriginWorld: species.originWorld,
      holderOriginDimension: 'Núvaris Prime',
      holderOriginCity: visitor.travelInfo.declaredOrigin,

      registeredHeight,
      registeredWeight,
      bloodType: species.bloodType.color,
      distinctiveFeatures: visitor.appearance.specialFeatures,

      ulnarCount: speciesData.ulnarCount,
      casteCode: speciesData.casteCode,
      scaleType: speciesData.scaleType,
      morphologyType: speciesData.morphologyType,

      photo,
      dimensionalSignature,
      signatureVerified,
      seals,
      multiDimensionalAccess: Math.random() > 0.7,
      restrictedSectors: ['Sector Omega'],
    };

    return passport;
  }

  /**
   * Generate appropriate visa based on travel purpose
   */
  private generateVisa(visitor: Visitor): WorkVisa | TourismVisa | RefugeeVisa | undefined {
    const purpose = visitor.travelInfo.declaredPurpose;
    const isFake = visitor.truth.hasFakeDocuments;

    switch (purpose) {
      case 'TRABAJO':
        return this.generateWorkVisa(visitor, isFake);
      case 'TURISMO':
      case 'PEREGRINACION':
        return this.generateTourismVisa(visitor, isFake);
      case 'REFUGIO':
        return this.generateRefugeeVisa(visitor, isFake);
      default:
        return this.generateTourismVisa(visitor, isFake);
    }
  }

  /**
   * Generate Work Visa
   */
  private generateWorkVisa(visitor: Visitor, isFake: boolean): WorkVisa {
    const errors: DocumentError[] = [];
    const { issueDate, expirationDate, dateErrors } = this.generateDates(isFake);
    errors.push(...dateErrors);
    const { authority } = this.selectAuthority(isFake);

    return {
      id: this.generateDocumentId(),
      type: 'VISA_TRABAJO',
      holderId: visitor.id,
      holderName: visitor.name,
      documentNumber: this.generateDocumentNumber('VT'),
      issueDate,
      expirationDate,
      issuingAuthority: authority,
      status: isFake ? 'FALSIFICADO' : 'VALIDO',
      isAuthentic: !isFake,
      errors,
      isExamined: false,
      isMarked: false,
      notes: [],

      employerName: this.generateEmployerName(),
      employerSector: this.randomElement(['Industrial', 'Comercial', 'Servicios', 'Tecnología']),
      jobTitle: this.randomElement(['Técnico', 'Operador', 'Analista', 'Especialista']),
      duration: visitor.travelInfo.declaredDuration,
      workSectorRestrictions: [],
    };
  }

  /**
   * Generate Tourism Visa
   */
  private generateTourismVisa(visitor: Visitor, isFake: boolean): TourismVisa {
    const errors: DocumentError[] = [];
    const { issueDate, expirationDate, dateErrors } = this.generateDates(isFake);
    errors.push(...dateErrors);
    const { authority } = this.selectAuthority(isFake);

    return {
      id: this.generateDocumentId(),
      type: 'VISA_TURISMO',
      holderId: visitor.id,
      holderName: visitor.name,
      documentNumber: this.generateDocumentNumber('VTU'),
      issueDate,
      expirationDate,
      issuingAuthority: authority,
      status: isFake ? 'FALSIFICADO' : 'VALIDO',
      isAuthentic: !isFake,
      errors,
      isExamined: false,
      isMarked: false,
      notes: [],

      maxDuration: '30 ciclos',
      allowedCities: ['Ithor', 'Nau-Vel', 'Armonía Vulnari'],
      sponsorRequired: false,
    };
  }

  /**
   * Generate Refugee Visa
   */
  private generateRefugeeVisa(visitor: Visitor, isFake: boolean): RefugeeVisa {
    const errors: DocumentError[] = [];
    const { issueDate, expirationDate, dateErrors } = this.generateDates(isFake);
    errors.push(...dateErrors);
    const { authority } = this.selectAuthority(isFake);

    return {
      id: this.generateDocumentId(),
      type: 'VISA_REFUGIADO',
      holderId: visitor.id,
      holderName: visitor.name,
      documentNumber: this.generateDocumentNumber('VR'),
      issueDate,
      expirationDate,
      issuingAuthority: authority,
      status: isFake ? 'FALSIFICADO' : 'VALIDO',
      isAuthentic: !isFake,
      errors,
      isExamined: false,
      isMarked: false,
      notes: [],

      fleeingFrom: this.randomElement(['Dimensión Roja', 'Vacío Exterior', 'Tierra Muerta']),
      reason: 'Conflicto dimensional',
      temporaryStatus: true,
      reviewDate: this.generateFutureDate(),
      asylumGrantedBy: authority.name,
    };
  }

  /**
   * Generate Health Certificate
   */
  private generateHealthCertificate(visitor: Visitor): HealthCertificate {
    const isFake = visitor.truth.hasFakeDocuments;
    const errors: DocumentError[] = [];
    const { authority } = this.selectAuthority(false); // Health certs usually valid

    return {
      id: this.generateDocumentId(),
      type: 'CERTIFICADO_SALUD',
      holderId: visitor.id,
      holderName: visitor.name,
      documentNumber: this.generateDocumentNumber('CS'),
      issueDate: this.generateRecentDate(),
      expirationDate: this.generateFutureDate(),
      issuingAuthority: authority,
      status: 'VALIDO',
      isAuthentic: true,
      errors,
      isExamined: false,
      isMarked: false,
      notes: [],

      examDate: this.generateRecentDate(),
      examLocation: 'Centro Médico Ithor',
      doctorName: 'Dr. ' + this.randomElement(['Vex', 'Morana', 'Krill', 'Thessa']),
      doctorLicense: 'MED-' + Math.floor(Math.random() * 9000 + 1000),

      isHealthy: !visitor.truth.isInfected,
      conditions: visitor.truth.isInfected ? ['Infección dimensional detectada'] : [],
      vaccinations: ['Anti-parásito dimensional', 'Estabilizador de fase'],
      quarantineRequired: visitor.truth.isInfected,
      quarantineDays: visitor.truth.isInfected ? 14 : undefined,

      radiationLevel: visitor.truth.isInfected ? 'MODERATE' : 'SAFE',
      parasiteCheck: visitor.truth.isInfected ? 'POSITIVE' : 'NEGATIVE',
    };
  }

  /**
   * Generate dates with possible errors
   */
  private generateDates(isFake: boolean): {
    issueDate: string;
    expirationDate: string;
    dateErrors: DocumentError[];
  } {
    const errors: DocumentError[] = [];
    const currentCycle = 3042;

    let issueCycle = currentCycle - Math.floor(Math.random() * 5);
    let expirationCycle = currentCycle + Math.floor(Math.random() * 5) + 1;

    // Introduce errors for fake documents
    if (isFake && Math.random() < 0.4) {
      if (Math.random() < 0.5) {
        // Future issue date
        issueCycle = currentCycle + 5;
        errors.push({
          errorType: 'FECHA_INVALIDA',
          field: 'issueDate',
          expectedValue: `Antes de Ciclo ${currentCycle}`,
          actualValue: `Ciclo ${issueCycle}`,
          severity: 'critical',
          detectionDifficulty: 'easy',
        });
      } else {
        // Expired
        expirationCycle = currentCycle - 2;
        errors.push({
          errorType: 'FECHA_INVALIDA',
          field: 'expirationDate',
          expectedValue: `Después de Ciclo ${currentCycle}`,
          actualValue: `Ciclo ${expirationCycle}`,
          severity: 'major',
          detectionDifficulty: 'easy',
        });
      }
    }

    return {
      issueDate: `Ciclo ${issueCycle}.${Math.floor(Math.random() * 10)}`,
      expirationDate: `Ciclo ${expirationCycle}.${Math.floor(Math.random() * 10)}`,
      dateErrors: errors,
    };
  }

  /**
   * Select issuing authority
   */
  private selectAuthority(isFake: boolean): {
    authority: IssuingAuthority;
    authorityError?: DocumentError;
  } {
    if (isFake && Math.random() < 0.3) {
      const invalidAuth = this.randomElement(this.invalidAuthorities);
      return {
        authority: invalidAuth,
        authorityError: {
          errorType: 'AUTORIDAD_INEXISTENTE',
          field: 'issuingAuthority',
          expectedValue: 'Autoridad válida',
          actualValue: invalidAuth.name,
          severity: 'critical',
          detectionDifficulty: 'medium',
          requiresTool: 'VERIFICADOR_SELLOS',
        },
      };
    }

    return {
      authority: this.randomElement(this.validAuthorities),
    };
  }

  /**
   * Generate photo data
   */
  private generatePhoto(visitor: Visitor, isFake: boolean): {
    photo: DocumentPhoto;
    photoErrors: DocumentError[];
  } {
    const errors: DocumentError[] = [];

    let eyeCount = visitor.appearance.eyeCount;
    let appendageCount = visitor.appearance.appendageCount;

    // Photo might not match for impostors
    if (isFake && Math.random() < 0.4) {
      if (Math.random() < 0.5) {
        eyeCount = visitor.appearance.eyeCount + 1;
        errors.push({
          errorType: 'FOTO_NO_COINCIDE',
          field: 'photo.eyeCount',
          expectedValue: `${eyeCount} ojos en foto`,
          actualValue: `${visitor.appearance.eyeCount} ojos en persona`,
          severity: 'major',
          detectionDifficulty: 'easy',
        });
      } else {
        appendageCount = visitor.appearance.appendageCount - 1;
        errors.push({
          errorType: 'FOTO_NO_COINCIDE',
          field: 'photo.appendageCount',
          expectedValue: `${appendageCount} apéndices en foto`,
          actualValue: `${visitor.appearance.appendageCount} apéndices en persona`,
          severity: 'major',
          detectionDifficulty: 'medium',
        });
      }
    }

    const photo: DocumentPhoto = {
      subjectName: visitor.name,
      subjectSpecies: visitor.declaredSpecies,
      eyeCount,
      appendageCount,
      distinctiveFeatures: visitor.appearance.specialFeatures.slice(0, 2),
      photoDate: this.generateRecentDate(),
      photoLocation: 'Oficina de Documentación Ithor',
      matchesHolder: errors.length === 0,
      mismatchReasons: errors.map(e => e.actualValue || ''),
    };

    return { photo, photoErrors: errors };
  }

  /**
   * Generate physical data with possible errors
   */
  private generatePhysicalData(visitor: Visitor, isFake: boolean): {
    registeredHeight: number;
    registeredWeight: number;
    physicalErrors: DocumentError[];
  } {
    const errors: DocumentError[] = [];

    let registeredHeight = visitor.appearance.height;
    let registeredWeight = visitor.appearance.weight;

    if (isFake && visitor.truth.isImpostor && Math.random() < 0.5) {
      // Weight doesn't match (impostor using disguise)
      registeredWeight = visitor.appearance.weight + (Math.random() > 0.5 ? 30 : -30);
      errors.push({
        errorType: 'DATOS_CONTRADICTORIOS',
        field: 'weight',
        expectedValue: `${registeredWeight}kg`,
        actualValue: `${visitor.appearance.weight}kg medido`,
        severity: 'major',
        detectionDifficulty: 'easy',
        requiresTool: 'ESCANER_MASA',
      });
    }

    return {
      registeredHeight: Math.round(registeredHeight * 100) / 100,
      registeredWeight: Math.round(registeredWeight * 10) / 10,
      physicalErrors: errors,
    };
  }

  /**
   * Generate species-specific document data
   */
  private generateSpeciesSpecificData(visitor: Visitor, isFake: boolean): {
    ulnarCount?: number;
    casteCode?: string;
    scaleType?: string;
    morphologyType?: string;
    error?: DocumentError;
  } {
    const result: {
      ulnarCount?: number;
      casteCode?: string;
      scaleType?: string;
      morphologyType?: string;
      error?: DocumentError;
    } = {};

    switch (visitor.declaredSpecies) {
      case 'VULNARI':
        result.ulnarCount = visitor.appearance.appendageCount;
        if (isFake && visitor.truth.isImpostor && Math.random() < 0.5) {
          result.ulnarCount = visitor.appearance.appendageCount + 2;
          result.error = {
            errorType: 'DATOS_CONTRADICTORIOS',
            field: 'ulnarCount',
            expectedValue: `${result.ulnarCount} Ulnar`,
            actualValue: `${visitor.appearance.appendageCount} Ulnar visible`,
            severity: 'critical',
            detectionDifficulty: 'medium',
          };
        }
        break;

      case 'EXOPODO':
        result.casteCode = isFake && Math.random() < 0.3
          ? '000000' // Extinct hive
          : this.generateHiveCode();
        if (result.casteCode === '000000') {
          result.error = {
            errorType: 'DATOS_CONTRADICTORIOS',
            field: 'casteCode',
            expectedValue: 'Código de colmena activa',
            actualValue: 'Código de colmena extinta',
            severity: 'critical',
            detectionDifficulty: 'hard',
            requiresTool: 'LUZ_UV',
          };
        }
        break;

      case 'REPTILIANO':
        result.scaleType = this.randomElement(['Metálicas', 'Volcánicas', 'Acuáticas']);
        break;

      case 'INMIGRANTE':
        result.morphologyType = this.randomElement([
          'Humanoide', 'Amorfo', 'Etéreo', 'Mecánico', 'Cristalino'
        ]);
        break;
    }

    return result;
  }

  /**
   * Generate entry/exit seals
   */
  private generateSeals(isFake: boolean): DocumentSeal[] {
    const seals: DocumentSeal[] = [];
    const sealCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < sealCount; i++) {
      const isAuthentic = !isFake || Math.random() > 0.3;
      seals.push({
        authorityId: this.randomElement(this.validAuthorities).id,
        date: `Ciclo ${3040 + i}.${Math.floor(Math.random() * 10)}`,
        type: this.randomElement(['ENTRADA', 'SALIDA', 'TRANSITO']),
        portCode: `ITHOR-${String.fromCharCode(65 + Math.floor(Math.random() * 8))}${Math.floor(Math.random() * 9) + 1}`,
        isAuthentic,
      });
    }

    return seals;
  }

  /**
   * Generate dimensional signature
   */
  private generateDimensionalSignature(visitor: Visitor, isFake: boolean): string {
    const chars = 'ABCDEF0123456789';
    let signature = '';
    for (let i = 0; i < 16; i++) {
      signature += chars[Math.floor(Math.random() * chars.length)];
      if (i % 4 === 3 && i < 15) signature += '-';
    }
    return signature;
  }

  /**
   * Generate document ID
   */
  private generateDocumentId(): string {
    this.documentCounter++;
    return `DOC-${Date.now()}-${this.documentCounter.toString().padStart(4, '0')}`;
  }

  /**
   * Generate document number
   */
  private generateDocumentNumber(prefix: string): string {
    return `${prefix}-${Math.floor(Math.random() * 900000 + 100000)}`;
  }

  /**
   * Generate hive code for Exopodos
   */
  private generateHiveCode(): string {
    return Math.floor(Math.random() * 900000 + 100000).toString();
  }

  /**
   * Generate employer name
   */
  private generateEmployerName(): string {
    const prefixes = ['Corporación', 'Industrias', 'Servicios', 'Grupo'];
    const names = ['Vortex', 'Prisma', 'Nexus', 'Quantum', 'Aurora'];
    return `${this.randomElement(prefixes)} ${this.randomElement(names)}`;
  }

  /**
   * Generate recent date
   */
  private generateRecentDate(): string {
    const cycle = 3042 - Math.floor(Math.random() * 2);
    return `Ciclo ${cycle}.${Math.floor(Math.random() * 10)}`;
  }

  /**
   * Generate future date
   */
  private generateFutureDate(): string {
    const cycle = 3042 + Math.floor(Math.random() * 5) + 1;
    return `Ciclo ${cycle}.${Math.floor(Math.random() * 10)}`;
  }

  /**
   * Check if all required documents are present
   */
  private checkAllRequired(
    visitor: Visitor,
    passport: DimensionalPassport | undefined,
    visa: any
  ): boolean {
    return !!passport && !!visa;
  }

  /**
   * Get list of missing documents
   */
  private getMissingDocuments(
    visitor: Visitor,
    passport: DimensionalPassport | undefined,
    visa: any
  ): DocumentType[] {
    const missing: DocumentType[] = [];
    if (!passport) missing.push('PASAPORTE_DIMENSIONAL');
    if (!visa) missing.push('VISA_TURISMO'); // Default expected visa
    return missing;
  }

  /**
   * Count total errors across all documents
   */
  private countTotalErrors(...documents: (any | undefined)[]): number {
    return documents.reduce((total, doc) => {
      return total + (doc?.errors?.length || 0);
    }, 0);
  }

  /**
   * Utility: Random element from array
   */
  private randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
