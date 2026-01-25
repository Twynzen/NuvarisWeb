/**
 * PORTAL CONTROL - Detection Service
 * Handles all detection logic, tool usage, and visitor validation
 */

import { Injectable } from '@angular/core';
import {
  Visitor,
  VisitorDocuments,
  DimensionalPassport,
  DetectionAnalysis,
  DetectionFlag,
  FlagDetail,
  DocumentIssue,
  PhysicalAnomaly,
  BehavioralFlag,
  ComparisonResult,
  InspectorTool,
  InspectorToolState,
  ToolUseResult,
  DecisionType,
  PlayerDecision,
  DecisionEvaluation,
  DecisionConsequence,
  ConsequenceType,
  ScannerResults,
} from '../models';
import { SpeciesService } from './species.service';
import { LoggerService } from './logger.service';
import { INSPECTOR_TOOLS, AMBIENT_TEMPERATURE, SCORE_VALUES } from '../data';

@Injectable({
  providedIn: 'root'
})
export class DetectionService {
  private toolStates: Map<InspectorTool, InspectorToolState> = new Map();

  constructor(
    private speciesService: SpeciesService,
    private logger: LoggerService
  ) {
    this.initializeTools();
  }

  /**
   * Initialize all inspector tools
   */
  private initializeTools(): void {
    Object.entries(INSPECTOR_TOOLS).forEach(([toolId, toolData]) => {
      const tool = toolId as InspectorTool;
      this.toolStates.set(tool, {
        tool,
        isAvailable: toolData.unlockDay <= 1,
        isUnlocked: toolData.unlockDay <= 1,
        unlockDay: toolData.unlockDay,
        useCost: toolData.useCost,
        cooldown: toolData.cooldown,
        currentCooldown: 0,
        totalUses: 0,
        description: toolData.description,
        shortDescription: toolData.shortDescription,
      });
    });

    this.logger.info('DetectionService', `Initialized ${this.toolStates.size} tools`);
  }

  /**
   * Unlock tools for a specific day
   */
  unlockToolsForDay(day: number): InspectorTool[] {
    const unlocked: InspectorTool[] = [];

    this.toolStates.forEach((state, tool) => {
      if (state.unlockDay === day && !state.isUnlocked) {
        state.isUnlocked = true;
        state.isAvailable = true;
        unlocked.push(tool);
        this.logger.info('DetectionService', `Unlocked tool: ${tool}`);
      }
    });

    return unlocked;
  }

  /**
   * Get all tool states
   */
  getToolStates(): Map<InspectorTool, InspectorToolState> {
    return new Map(this.toolStates);
  }

  /**
   * Check if a tool can be used
   */
  canUseTool(tool: InspectorTool): { canUse: boolean; reason?: string } {
    const state = this.toolStates.get(tool);
    if (!state) {
      return { canUse: false, reason: 'Herramienta no existe' };
    }
    if (!state.isUnlocked) {
      return { canUse: false, reason: `Disponible en día ${state.unlockDay}` };
    }
    if (state.currentCooldown > 0) {
      return { canUse: false, reason: `En enfriamiento: ${state.currentCooldown}s` };
    }
    return { canUse: true };
  }

  /**
   * Use a tool on a visitor
   */
  useTool(
    tool: InspectorTool,
    visitor: Visitor,
    documents?: VisitorDocuments
  ): ToolUseResult {
    const endTimer = this.logger.time('DetectionService', `Use tool ${tool}`);

    const canUse = this.canUseTool(tool);
    if (!canUse.canUse) {
      endTimer();
      return {
        tool,
        success: false,
        result: null,
        flagsRaised: [],
        message: canUse.reason || 'No se puede usar',
        timestamp: Date.now(),
      };
    }

    // Update tool state
    const state = this.toolStates.get(tool)!;
    state.currentCooldown = state.cooldown;
    state.totalUses++;

    // Execute tool logic
    const result = this.executeToolLogic(tool, visitor, documents);

    // Update visitor's scanner results
    this.updateScannerResults(visitor, tool, result);

    this.logger.info('DetectionService', `Tool ${tool} used`, {
      flagsRaised: result.flagsRaised.length,
    });

    endTimer();
    return result;
  }

  /**
   * Execute specific tool logic
   */
  private executeToolLogic(
    tool: InspectorTool,
    visitor: Visitor,
    documents?: VisitorDocuments
  ): ToolUseResult {
    const timestamp = Date.now();
    const flags: DetectionFlag[] = [];
    let result: any;
    let message: string;

    switch (tool) {
      case 'ESCANER_MASA': {
        const species = this.speciesService.getByIdOrThrow(visitor.declaredSpecies);
        const measuredWeight = visitor.appearance.weight;
        const expectedRange = species.weightRange;
        const anomaly = measuredWeight < expectedRange.min || measuredWeight > expectedRange.max;

        if (anomaly) {
          flags.push('PESO_INCORRECTO');
        }

        result = { measuredWeight, anomalyDetected: anomaly };
        message = `Peso medido: ${measuredWeight}kg${anomaly ? ' (¡ANOMALÍA!)' : ''}`;
        break;
      }

      case 'TERMOGRAFO': {
        const species = this.speciesService.getByIdOrThrow(visitor.declaredSpecies);
        const measuredTemp = visitor.appearance.bodyTemperature;
        const expectedRange = this.speciesService.getExpectedTemperature(
          visitor.declaredSpecies,
          AMBIENT_TEMPERATURE
        );
        const anomaly = measuredTemp < expectedRange.min || measuredTemp > expectedRange.max;

        if (anomaly) {
          flags.push('TEMPERATURA_ANOMALA');
        }

        const heatSignature = measuredTemp < 30 ? 'cold' :
                             measuredTemp > 38 ? 'hot' :
                             anomaly ? 'irregular' : 'normal';

        result = { measuredTemperature: measuredTemp, heatSignature };
        message = `Temperatura: ${measuredTemp}°C (${heatSignature})`;
        break;
      }

      case 'LUZ_UV': {
        const species = this.speciesService.getByIdOrThrow(visitor.declaredSpecies);
        const shouldGlow = species.bloodType.glowsUnderUV;
        const actuallyGlows = !visitor.truth.isImpostor && shouldGlow;
        const hiddenMarkings: string[] = [];

        if (visitor.declaredSpecies === 'EXOPODO') {
          hiddenMarkings.push(`Marca de Colmena: ${documents?.passport?.casteCode || 'No visible'}`);
        }

        if (shouldGlow && !actuallyGlows) {
          flags.push('BIOLOGIA_ANOMALA');
        }

        result = { bloodGlowDetected: actuallyGlows, hiddenMarkingsFound: hiddenMarkings };
        message = `Brillo UV: ${actuallyGlows ? 'Detectado' : 'No detectado'}`;
        break;
      }

      case 'MAGNETOMETRO': {
        const isReptiliano = visitor.declaredSpecies === 'REPTILIANO';
        const shouldHaveMagneticScales = isReptiliano;
        const hasMagneticResponse = isReptiliano && !visitor.truth.isImpostor;

        if (shouldHaveMagneticScales && !hasMagneticResponse) {
          flags.push('IMPOSTOR_PROBABLE');
        }

        result = {
          metallicPresence: hasMagneticResponse,
          metalType: hasMagneticResponse ? 'Escamas metálicas' : undefined,
        };
        message = `Respuesta magnética: ${hasMagneticResponse ? 'Positiva' : 'Negativa'}`;
        break;
      }

      case 'VISOR_DIMENSIONAL': {
        const declaredSignature = documents?.passport?.dimensionalSignature || 'DESCONOCIDA';
        const signatureMatch = !visitor.truth.isImpostor && Math.random() > 0.1;
        const radiationLevel = visitor.truth.isInfected ? 'high' :
                              visitor.declaredSpecies === 'INMIGRANTE' ? 'moderate' : 'safe';

        if (!signatureMatch) {
          flags.push('DIMENSION_INCORRECTA');
        }
        if (radiationLevel === 'high' || radiationLevel === 'critical') {
          flags.push('RADIACION_PELIGROSA');
        }

        result = {
          dimensionalSignature: declaredSignature,
          signatureMatch,
          radiationLevel,
        };
        message = `Firma: ${signatureMatch ? 'Coincide' : 'NO COINCIDE'}, Radiación: ${radiationLevel}`;
        break;
      }

      case 'DETECTOR_INTENCION': {
        const deceptionProbability = visitor.truth.isImpostor || visitor.truth.isFugitive
          ? 40 + Math.random() * 50
          : Math.random() * 30;
        const hostilityLevel = visitor.truth.isFugitive
          ? 30 + Math.random() * 40
          : Math.random() * 20;

        if (deceptionProbability > 60) {
          flags.push('COMPORTAMIENTO_SOSPECHOSO');
        }

        result = {
          deceptionProbability: Math.round(deceptionProbability),
          hostilityLevel: Math.round(hostilityLevel),
        };
        message = `Engaño: ${Math.round(deceptionProbability)}%, Hostilidad: ${Math.round(hostilityLevel)}%`;
        break;
      }

      case 'RESONADOR_ULNAR': {
        const isVulnari = visitor.declaredSpecies === 'VULNARI';
        const shouldRespond = isVulnari;
        const actuallyResponds = isVulnari && !visitor.truth.isImpostor;
        const ulnarCount = actuallyResponds ? visitor.appearance.appendageCount : 0;

        if (shouldRespond && !actuallyResponds) {
          flags.push('MIMETICO_DETECTADO');
        }
        if (isVulnari && ulnarCount < 4) {
          flags.push('APENDICES_INCORRECTOS');
        }

        result = { ulnarResponse: actuallyResponds, ulnarCount };
        message = `Resonancia Ulnar: ${actuallyResponds ? `Positiva (${ulnarCount} Ulnar)` : 'Sin respuesta'}`;
        break;
      }

      case 'LUPA_DOCUMENTOS': {
        const errors = documents?.passport?.errors || [];
        const detectedErrors = errors.filter(e =>
          e.detectionDifficulty === 'easy' ||
          (e.detectionDifficulty === 'medium' && Math.random() > 0.3)
        );

        if (detectedErrors.length > 0) {
          flags.push('DOCUMENTO_FALSIFICADO');
        }

        result = { errorsFound: detectedErrors.length, details: detectedErrors };
        message = `Errores detectados: ${detectedErrors.length}`;
        break;
      }

      case 'VERIFICADOR_SELLOS': {
        const seals = documents?.passport?.seals || [];
        const fakeSeals = seals.filter(s => !s.isAuthentic);

        if (fakeSeals.length > 0) {
          flags.push('DOCUMENTO_FALSIFICADO');
        }

        result = { totalSeals: seals.length, fakeSeals: fakeSeals.length };
        message = `Sellos verificados: ${seals.length}, Falsos: ${fakeSeals.length}`;
        break;
      }

      case 'BASE_DATOS_CAPTURAS': {
        const isFugitive = visitor.truth.isFugitive;

        if (isFugitive) {
          flags.push('ORDEN_DE_CAPTURA');
        }

        result = {
          matchFound: isFugitive,
          fugitiveDetails: isFugitive ? {
            reason: visitor.truth.fugitiveReason,
            dangerLevel: visitor.truth.hiddenDangerLevel,
          } : null,
        };
        message = isFugitive ? '¡ALERTA! Coincidencia en base de datos' : 'Sin coincidencias';
        break;
      }

      default:
        result = {};
        message = 'Herramienta no implementada';
    }

    return {
      tool,
      success: true,
      result,
      flagsRaised: flags,
      message,
      timestamp,
    };
  }

  /**
   * Update visitor's scanner results
   */
  private updateScannerResults(
    visitor: Visitor,
    tool: InspectorTool,
    result: ToolUseResult
  ): void {
    const scannerKey = this.toolToScannerKey(tool);
    if (scannerKey && result.result) {
      (visitor.scannerResults as any)[scannerKey] = result.result;
    }

    // Add flags to visitor
    result.flagsRaised.forEach(flag => {
      if (!visitor.detectionFlags.includes(flag)) {
        visitor.detectionFlags.push(flag);
      }
    });
  }

  /**
   * Map tool to scanner results key
   */
  private toolToScannerKey(tool: InspectorTool): keyof ScannerResults | null {
    const mapping: Partial<Record<InspectorTool, keyof ScannerResults>> = {
      ESCANER_MASA: 'massScanner',
      TERMOGRAFO: 'thermalScanner',
      LUZ_UV: 'uvScanner',
      MAGNETOMETRO: 'magnetometer',
      VISOR_DIMENSIONAL: 'dimensionalVisor',
      DETECTOR_INTENCION: 'intentionDetector',
      RESONADOR_ULNAR: 'ulnarResonator',
    };
    return mapping[tool] || null;
  }

  /**
   * Perform complete detection analysis
   */
  analyzeVisitor(visitor: Visitor, documents: VisitorDocuments): DetectionAnalysis {
    const endTimer = this.logger.time('DetectionService', 'Analyze visitor');

    const documentIssues = this.analyzeDocuments(visitor, documents);
    const physicalAnomalies = this.analyzePhysical(visitor);
    const behavioralFlags = this.analyzeBehavior(visitor);
    const comparisons = this.compareDeclarations(visitor, documents);

    // Calculate scores
    const documentScore = this.calculateDocumentScore(documentIssues);
    const physicalScore = this.calculatePhysicalScore(physicalAnomalies);
    const behavioralScore = this.calculateBehavioralScore(behavioralFlags);
    const dimensionalScore = this.calculateDimensionalScore(visitor);

    // Compile all flags
    const allFlags = new Set<DetectionFlag>(visitor.detectionFlags);
    documentIssues.forEach(i => allFlags.add(i.error.errorType as DetectionFlag));

    const flagDetails: FlagDetail[] = this.compileFlagDetails(
      Array.from(allFlags),
      documentIssues,
      physicalAnomalies,
      behavioralFlags
    );

    // Calculate overall suspicion
    const overallSuspicion = this.calculateOverallSuspicion(
      documentScore,
      physicalScore,
      behavioralScore,
      dimensionalScore
    );

    // Determine recommended action
    const recommendedAction = this.determineRecommendedAction(
      overallSuspicion,
      visitor,
      Array.from(allFlags)
    );

    const analysis: DetectionAnalysis = {
      visitorId: visitor.id,
      overallSuspicion,
      recommendedAction,
      confidence: this.calculateConfidence(visitor),
      flagsRaised: Array.from(allFlags),
      flagDetails,
      documentScore,
      physicalScore,
      behavioralScore,
      dimensionalScore,
      documentIssues,
      physicalAnomalies,
      behavioralFlags,
      declaredVsActual: comparisons,
    };

    this.logger.info('DetectionService', 'Analysis complete', {
      suspicion: overallSuspicion,
      recommended: recommendedAction,
      flags: allFlags.size,
    });

    endTimer();
    return analysis;
  }

  /**
   * Analyze documents for issues
   */
  private analyzeDocuments(visitor: Visitor, documents: VisitorDocuments): DocumentIssue[] {
    const issues: DocumentIssue[] = [];

    if (documents.passport) {
      documents.passport.errors.forEach(error => {
        issues.push({
          documentId: documents.passport!.id,
          error,
          description: `${error.field}: ${error.actualValue}`,
          visualHint: this.getVisualHint(error.field),
        });
      });
    }

    if (documents.visa && 'errors' in documents.visa) {
      (documents.visa as any).errors.forEach((error: any) => {
        issues.push({
          documentId: documents.visa!.id,
          error,
          description: `${error.field}: ${error.actualValue}`,
        });
      });
    }

    return issues;
  }

  /**
   * Get visual hint for where to look
   */
  private getVisualHint(field: string): string {
    const hints: Record<string, string> = {
      'issueDate': 'Esquina superior derecha',
      'expirationDate': 'Junto a fecha de emisión',
      'photo': 'Foto del documento',
      'issuingAuthority': 'Sello inferior',
      'weight': 'Datos físicos',
      'ulnarCount': 'Datos de especie',
    };
    return hints[field] || 'Revisar documento completo';
  }

  /**
   * Analyze physical characteristics
   */
  private analyzePhysical(visitor: Visitor): PhysicalAnomaly[] {
    const anomalies: PhysicalAnomaly[] = [];
    const species = this.speciesService.getByIdOrThrow(visitor.declaredSpecies);

    // Check weight
    if (visitor.scannerResults.massScanner?.anomalyDetected) {
      anomalies.push({
        type: 'weight',
        expected: `${species.weightRange.min}-${species.weightRange.max}kg`,
        actual: `${visitor.appearance.weight}kg`,
        source: 'scanner',
        scannerUsed: 'ESCANER_MASA',
      });
    }

    // Check temperature
    if (visitor.scannerResults.thermalScanner?.heatSignature === 'irregular') {
      const expectedRange = this.speciesService.getExpectedTemperature(
        visitor.declaredSpecies,
        AMBIENT_TEMPERATURE
      );
      anomalies.push({
        type: 'temperature',
        expected: `${expectedRange.min}-${expectedRange.max}°C`,
        actual: `${visitor.appearance.bodyTemperature}°C`,
        source: 'scanner',
        scannerUsed: 'TERMOGRAFO',
      });
    }

    return anomalies;
  }

  /**
   * Analyze behavioral indicators
   */
  private analyzeBehavior(visitor: Visitor): BehavioralFlag[] {
    const flags: BehavioralFlag[] = [];

    if (visitor.behavior.nervousness > 60) {
      flags.push({
        type: 'high_nervousness',
        description: 'Visitante muestra nerviosismo excesivo',
        confidence: visitor.behavior.nervousness,
      });
    }

    if (visitor.behavior.deceptionSkill > 50 &&
        visitor.scannerResults.intentionDetector?.deceptionProbability &&
        visitor.scannerResults.intentionDetector.deceptionProbability > 50) {
      flags.push({
        type: 'deception_detected',
        description: 'Posible engaño detectado',
        confidence: visitor.scannerResults.intentionDetector.deceptionProbability,
      });
    }

    return flags;
  }

  /**
   * Compare declared vs actual values
   */
  private compareDeclarations(
    visitor: Visitor,
    documents: VisitorDocuments
  ): ComparisonResult[] {
    const comparisons: ComparisonResult[] = [];

    if (documents.passport) {
      comparisons.push({
        field: 'Peso',
        declaredValue: documents.passport.registeredWeight,
        actualValue: visitor.appearance.weight,
        matches: Math.abs(documents.passport.registeredWeight - visitor.appearance.weight) <= 5,
      });

      comparisons.push({
        field: 'Altura',
        declaredValue: documents.passport.registeredHeight,
        actualValue: visitor.appearance.height,
        matches: Math.abs(documents.passport.registeredHeight - visitor.appearance.height) <= 0.05,
      });

      if (documents.passport.ulnarCount !== undefined) {
        comparisons.push({
          field: 'Ulnar',
          declaredValue: documents.passport.ulnarCount,
          actualValue: visitor.appearance.appendageCount,
          matches: documents.passport.ulnarCount === visitor.appearance.appendageCount,
        });
      }
    }

    return comparisons;
  }

  /**
   * Calculate document score (100 = perfect)
   */
  private calculateDocumentScore(issues: DocumentIssue[]): number {
    if (issues.length === 0) return 100;
    const penalty = issues.reduce((sum, issue) => {
      return sum + (issue.error.severity === 'critical' ? 30 :
                   issue.error.severity === 'major' ? 20 : 10);
    }, 0);
    return Math.max(0, 100 - penalty);
  }

  /**
   * Calculate physical score
   */
  private calculatePhysicalScore(anomalies: PhysicalAnomaly[]): number {
    return Math.max(0, 100 - anomalies.length * 25);
  }

  /**
   * Calculate behavioral score
   */
  private calculateBehavioralScore(flags: BehavioralFlag[]): number {
    const avgConfidence = flags.reduce((sum, f) => sum + f.confidence, 0) / (flags.length || 1);
    return Math.max(0, 100 - avgConfidence);
  }

  /**
   * Calculate dimensional score
   */
  private calculateDimensionalScore(visitor: Visitor): number {
    const dimVisor = visitor.scannerResults.dimensionalVisor;
    if (!dimVisor) return 100;

    let score = 100;
    if (!dimVisor.signatureMatch) score -= 40;
    if (dimVisor.radiationLevel === 'high') score -= 30;
    if (dimVisor.radiationLevel === 'critical') score -= 50;

    return Math.max(0, score);
  }

  /**
   * Calculate overall suspicion level
   */
  private calculateOverallSuspicion(
    docScore: number,
    physScore: number,
    behavScore: number,
    dimScore: number
  ): number {
    const avgScore = (docScore + physScore + behavScore + dimScore) / 4;
    return Math.round(100 - avgScore);
  }

  /**
   * Calculate confidence in analysis
   */
  private calculateConfidence(visitor: Visitor): number {
    const toolsUsed = Object.keys(visitor.scannerResults).length;
    return Math.min(100, 30 + toolsUsed * 15);
  }

  /**
   * Compile flag details
   */
  private compileFlagDetails(
    flags: DetectionFlag[],
    docIssues: DocumentIssue[],
    physAnomalies: PhysicalAnomaly[],
    behavFlags: BehavioralFlag[]
  ): FlagDetail[] {
    return flags.map(flag => ({
      flag,
      severity: this.getFlagSeverity(flag),
      source: this.getFlagSource(flag),
      description: this.getFlagDescription(flag),
      evidence: this.getFlagEvidence(flag, docIssues, physAnomalies, behavFlags),
    }));
  }

  /**
   * Get flag severity
   */
  private getFlagSeverity(flag: DetectionFlag): FlagDetail['severity'] {
    const criticalFlags: DetectionFlag[] = [
      'IMPOSTOR_PROBABLE', 'ORDEN_DE_CAPTURA', 'PARASITO_DIMENSIONAL',
      'MIMETICO_DETECTADO', 'RADIACION_PELIGROSA'
    ];
    const highFlags: DetectionFlag[] = [
      'DOCUMENTO_FALSIFICADO', 'BIOLOGIA_ANOMALA', 'DIMENSION_INCORRECTA'
    ];

    if (criticalFlags.includes(flag)) return 'critical';
    if (highFlags.includes(flag)) return 'high';
    return 'medium';
  }

  /**
   * Get flag source
   */
  private getFlagSource(flag: DetectionFlag): FlagDetail['source'] {
    const docFlags: DetectionFlag[] = ['DOCUMENTO_FALSIFICADO', 'DIMENSION_INCORRECTA'];
    const scannerFlags: DetectionFlag[] = [
      'PESO_INCORRECTO', 'TEMPERATURA_ANOMALA', 'BIOLOGIA_ANOMALA',
      'MIMETICO_DETECTADO', 'RADIACION_PELIGROSA'
    ];

    if (docFlags.includes(flag)) return 'document';
    if (scannerFlags.includes(flag)) return 'scanner';
    return 'physical';
  }

  /**
   * Get flag description
   */
  private getFlagDescription(flag: DetectionFlag): string {
    const descriptions: Record<DetectionFlag, string> = {
      IMPOSTOR_PROBABLE: 'Sospecha de suplantación de identidad',
      BIOLOGIA_ANOMALA: 'Características biológicas no coinciden con especie',
      DOCUMENTO_FALSIFICADO: 'Documento presenta irregularidades',
      DIMENSION_INCORRECTA: 'Firma dimensional no coincide',
      ORDEN_DE_CAPTURA: 'Coincidencia en base de datos de fugitivos',
      CUARENTENA_REQUERIDA: 'Requiere aislamiento médico',
      CONTRABANDO_DETECTADO: 'Objetos prohibidos detectados',
      RADIACION_PELIGROSA: 'Niveles de radiación dimensional peligrosos',
      PARASITO_DIMENSIONAL: 'Posible infección parasitaria',
      MIMETICO_DETECTADO: 'Disfraz biológico detectado',
      COLMENA_EXTINTA: 'Código de colmena no válido',
      TEMPERATURA_ANOMALA: 'Temperatura corporal fuera de rango',
      PESO_INCORRECTO: 'Peso no corresponde a especie',
      APENDICES_INCORRECTOS: 'Número de apéndices incorrecto',
      COMPORTAMIENTO_SOSPECHOSO: 'Comportamiento indica engaño',
    };
    return descriptions[flag] || 'Anomalía detectada';
  }

  /**
   * Get evidence for flag
   */
  private getFlagEvidence(
    flag: DetectionFlag,
    docIssues: DocumentIssue[],
    physAnomalies: PhysicalAnomaly[],
    behavFlags: BehavioralFlag[]
  ): string[] {
    const evidence: string[] = [];

    docIssues.forEach(issue => {
      if (issue.error.errorType === flag) {
        evidence.push(`Documento: ${issue.description}`);
      }
    });

    physAnomalies.forEach(anomaly => {
      evidence.push(`Físico: ${anomaly.type} - Esperado ${anomaly.expected}, Actual ${anomaly.actual}`);
    });

    behavFlags.forEach(bf => {
      evidence.push(`Comportamiento: ${bf.description}`);
    });

    return evidence;
  }

  /**
   * Determine recommended action based on analysis
   */
  private determineRecommendedAction(
    suspicion: number,
    visitor: Visitor,
    flags: DetectionFlag[]
  ): DecisionType {
    // Critical flags always require detention or Omega
    if (flags.includes('ORDEN_DE_CAPTURA')) return 'OMEGA';
    if (flags.includes('PARASITO_DIMENSIONAL')) return 'CUARENTENA';
    if (flags.includes('RADIACION_PELIGROSA')) return 'CUARENTENA';

    // High suspicion
    if (suspicion >= 70) return 'DETENER';
    if (suspicion >= 50) return 'DENEGAR';
    if (suspicion >= 30) return 'DERIVAR';

    return 'APROBAR';
  }

  /**
   * Evaluate player's decision
   */
  evaluateDecision(
    decision: PlayerDecision,
    visitor: Visitor,
    analysis: DetectionAnalysis
  ): DecisionEvaluation {
    const correctDecision = this.getCorrectDecision(visitor);
    const wasCorrect = decision.decision === correctDecision;

    // Calculate points
    let basePoints = 0;
    let bonusPoints = 0;
    let penaltyPoints = 0;

    if (wasCorrect) {
      basePoints = SCORE_VALUES[`correct${this.capitalizeFirst(decision.decision)}` as keyof typeof SCORE_VALUES] || 10;
      if (decision.processingTime < 30) {
        bonusPoints = SCORE_VALUES.speedBonus;
      }
    } else {
      penaltyPoints = Math.abs(
        SCORE_VALUES[`incorrect${this.capitalizeFirst(decision.decision)}` as keyof typeof SCORE_VALUES] || -10
      );

      // Additional penalties
      if (visitor.truth.isFugitive && decision.decision === 'APROBAR') {
        penaltyPoints += Math.abs(SCORE_VALUES.missedFugitive);
      }
    }

    const consequences = this.determineConsequences(decision, visitor, wasCorrect);

    return {
      decision,
      wasCorrect,
      correctDecision,
      basePoints,
      bonusPoints,
      penaltyPoints,
      finalPoints: basePoints + bonusPoints - penaltyPoints,
      feedback: this.generateFeedback(wasCorrect, visitor, decision),
      missedFlags: wasCorrect ? [] : visitor.detectionFlags.filter(f => !decision.flagsCited.includes(f)),
      falseFlags: decision.flagsCited.filter(f => !visitor.detectionFlags.includes(f)),
      consequences,
    };
  }

  /**
   * Get the correct decision for a visitor
   */
  private getCorrectDecision(visitor: Visitor): DecisionType {
    if (visitor.truth.isFugitive) return 'DETENER';
    if (visitor.truth.isInfected) return 'CUARENTENA';
    if (visitor.truth.hiddenDangerLevel === 'OMEGA') return 'OMEGA';
    if (visitor.truth.isImpostor) return 'DENEGAR';
    if (visitor.truth.hasFakeDocuments) return 'DENEGAR';
    if (visitor.truth.isCarryingContraband) return 'DETENER';
    return 'APROBAR';
  }

  /**
   * Determine consequences of a decision
   */
  private determineConsequences(
    decision: PlayerDecision,
    visitor: Visitor,
    wasCorrect: boolean
  ): DecisionConsequence[] {
    const consequences: DecisionConsequence[] = [];

    if (!wasCorrect) {
      if (visitor.truth.isFugitive && decision.decision === 'APROBAR') {
        consequences.push({
          type: 'FUGITIVO_ESCAPO',
          description: `Fugitivo ${visitor.name} escapó`,
          severity: 'severe',
          affectsDay: true,
          affectsFuture: true,
          reputationChange: -10,
        });
      }

      if (!visitor.truth.isFugitive && !visitor.truth.isImpostor &&
          (decision.decision === 'DETENER' || decision.decision === 'OMEGA')) {
        consequences.push({
          type: 'INOCENTE_DETENIDO',
          description: 'Ciudadano inocente detenido injustamente',
          severity: 'moderate',
          affectsDay: true,
          affectsFuture: false,
          reputationChange: -5,
        });
      }
    } else {
      if (visitor.truth.isFugitive) {
        consequences.push({
          type: 'ELOGIO_SUPERVISOR',
          description: 'Fugitivo capturado exitosamente',
          severity: 'minor',
          affectsDay: false,
          affectsFuture: true,
          reputationChange: 5,
        });
      }
    }

    return consequences;
  }

  /**
   * Generate feedback message
   */
  private generateFeedback(
    wasCorrect: boolean,
    visitor: Visitor,
    decision: PlayerDecision
  ): string {
    if (wasCorrect) {
      return `Decisión correcta. ${visitor.name} fue procesado apropiadamente.`;
    }

    if (visitor.truth.isFugitive && decision.decision === 'APROBAR') {
      return `¡Error crítico! ${visitor.name} era un fugitivo buscado.`;
    }

    if (visitor.truth.isImpostor && decision.decision === 'APROBAR') {
      return `Error: ${visitor.name} era un impostor disfrazado.`;
    }

    return `Decisión incorrecta. Revisa el manual para casos similares.`;
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Update tool cooldowns (call each game tick)
   */
  updateCooldowns(deltaSeconds: number): void {
    this.toolStates.forEach(state => {
      if (state.currentCooldown > 0) {
        state.currentCooldown = Math.max(0, state.currentCooldown - deltaSeconds);
      }
    });
  }
}
