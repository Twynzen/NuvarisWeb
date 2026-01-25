/**
 * PORTAL CONTROL - Visitor Generator Service
 * Procedurally generates visitors with all their attributes
 */

import { Injectable } from '@angular/core';
import {
  Visitor,
  VisitorId,
  VisitorAppearance,
  VisitorTruth,
  VisitorBehavior,
  VisitorSpriteLayer,
  TravelInfo,
  TravelPurpose,
  VisitorMood,
  DialogueStyle,
  VisitorGenerationParams,
  SpeciesId,
  Species,
  DangerLevel,
  SpeciesStats,
  MorphologyType,
} from '../models';
import { NAMES_BY_SPECIES, TRAVEL_PURPOSES, DESTINATION_CITIES } from '../data';
import { SpeciesService } from './species.service';
import { LoggerService } from './logger.service';
import { AMBIENT_TEMPERATURE } from '../data/rules.data';

@Injectable({
  providedIn: 'root'
})
export class VisitorGeneratorService {
  private visitorCounter = 0;

  constructor(
    private speciesService: SpeciesService,
    private logger: LoggerService
  ) {}

  /**
   * Generate a new visitor
   */
  generateVisitor(params: VisitorGenerationParams): Visitor {
    const endTimer = this.logger.time('VisitorGenerator', 'Generate visitor');

    try {
      // Determine species
      const species = params.forceSpecies
        ? this.speciesService.getByIdOrThrow(params.forceSpecies)
        : this.speciesService.getRandomSpecies(params.day < 3);

      // Determine if this is an impostor
      const isImpostor = params.forceImpostor ?? this.shouldBeImpostor(species, params.difficulty);

      // Generate base visitor
      const visitor = this.createBaseVisitor(species, isImpostor, params);

      this.logger.info('VisitorGenerator', `Generated visitor: ${visitor.name}`, {
        species: visitor.declaredSpecies,
        isImpostor: visitor.truth.isImpostor,
        isFugitive: visitor.truth.isFugitive,
      });

      endTimer();
      return visitor;

    } catch (error) {
      this.logger.error('VisitorGenerator', 'Failed to generate visitor', error);
      endTimer();
      throw error;
    }
  }

  /**
   * Create the base visitor object
   */
  private createBaseVisitor(
    species: Species,
    isImpostor: boolean,
    params: VisitorGenerationParams
  ): Visitor {
    const id = this.generateVisitorId();
    const name = this.generateName(species.id);

    // Determine actual species if impostor
    let actualSpecies: Species = species;
    if (isImpostor) {
      const impostorSpecies = this.selectImpostorSpecies(species);
      if (impostorSpecies) {
        actualSpecies = impostorSpecies;
      }
    }

    // Generate appearance
    const appearance = this.generateAppearance(species, actualSpecies, isImpostor);

    // Generate truth
    const truth = this.generateTruth(isImpostor, actualSpecies, params);

    // Generate behavior
    const behavior = this.generateBehavior(truth);

    // Generate travel info
    const travelInfo = this.generateTravelInfo(species);

    // Generate stats
    const stats = this.generateStats(actualSpecies);

    // Determine morphology
    const morphology = this.determineMorphology(species.id);

    const visitor: Visitor = {
      id,
      name,
      declaredSpecies: species.id,
      actualSpecies: actualSpecies.id,
      morphology,
      stats,
      appearance,
      truth,
      behavior,
      travelInfo,
      state: 'WAITING',
      arrivalTime: Date.now(),
      processingTime: 0,
      scannerResults: {},
      detectionFlags: [],
      currentDialogue: this.generateGreeting(species, behavior),
      dialogueIndex: 0,
      hasAnsweredQuestions: false,
      isStoryCharacter: params.isStoryVisitor ?? false,
      storyCharacterId: params.storyVisitorId,
    };

    return visitor;
  }

  /**
   * Generate a unique visitor ID
   */
  private generateVisitorId(): VisitorId {
    this.visitorCounter++;
    return `VIS-${Date.now()}-${this.visitorCounter.toString().padStart(4, '0')}`;
  }

  /**
   * Generate a name based on species patterns
   */
  generateName(speciesId: SpeciesId): string {
    const pattern = NAMES_BY_SPECIES.get(speciesId);
    if (!pattern) {
      this.logger.warn('VisitorGenerator', `No name pattern for species: ${speciesId}`);
      return 'Desconocido';
    }

    const prefix = pattern.prefixes.length > 0
      ? this.randomElement(pattern.prefixes)
      : '';
    const root = this.randomElement(pattern.roots);
    const connector = pattern.connectors.length > 0
      ? this.randomElement(pattern.connectors)
      : ' ';
    const suffix = this.randomElement(pattern.suffixes);

    // Some species use different name structures
    if (speciesId === 'HUMANO') {
      return `${root}${connector}${suffix}`;
    }

    return `${prefix}${root}${suffix}`;
  }

  /**
   * Determine if visitor should be an impostor
   */
  private shouldBeImpostor(species: Species, difficulty: number): boolean {
    if (!species.canBeImpostor) return false;

    const baseChance = 0.1 + (difficulty * 0.03);
    return Math.random() < baseChance;
  }

  /**
   * Select what species the impostor actually is
   */
  private selectImpostorSpecies(targetSpecies: Species): Species | null {
    const potentialImpostors = this.speciesService.getPotentialImpostors(targetSpecies.id);
    if (potentialImpostors.length === 0) return null;

    // Weight towards Inmigrantes as they're more likely to impersonate
    const weighted = potentialImpostors.flatMap(s =>
      s.id === 'INMIGRANTE' ? [s, s, s] : [s]
    );

    return this.randomElement(weighted);
  }

  /**
   * Generate visitor appearance
   */
  private generateAppearance(
    declaredSpecies: Species,
    actualSpecies: Species,
    isImpostor: boolean
  ): VisitorAppearance {
    // Use declared species for visual, but actual species affects some values
    const species = declaredSpecies;
    const actual = actualSpecies;

    // Physical measurements - if impostor, might not match species range
    const height = isImpostor
      ? this.randomInRange(actual.heightRange.min, actual.heightRange.max)
      : this.randomInRange(species.heightRange.min, species.heightRange.max);

    const weight = isImpostor
      ? this.randomInRange(actual.weightRange.min * 0.8, actual.weightRange.max * 1.2)
      : this.randomInRange(species.weightRange.min, species.weightRange.max);

    // Temperature based on actual species
    const bodyTemperature = this.calculateBodyTemperature(actual, AMBIENT_TEMPERATURE);

    // Visual elements based on declared species (disguise)
    const skinTone = this.randomElement(species.defaultColorPalette);

    // Eye count - might be wrong for impostors
    let eyeCount = 2;
    const eyeFeature = species.identifyingFeatures.find(f => f.id.includes('eye'));
    if (eyeFeature?.countRange) {
      eyeCount = isImpostor && Math.random() < 0.3
        ? eyeFeature.countRange.min - 1 // Obvious mistake
        : this.randomInt(eyeFeature.countRange.min, eyeFeature.countRange.max);
    }

    // Appendage count
    let appendageCount = 4;
    const appendageFeature = species.identifyingFeatures.find(f =>
      f.id.includes('appendage') || f.id.includes('ulnar')
    );
    if (appendageFeature?.countRange) {
      appendageCount = isImpostor && Math.random() < 0.4
        ? appendageFeature.countRange.min - 1 // Too few
        : this.randomInt(appendageFeature.countRange.min, appendageFeature.countRange.max);
    }

    // Special features
    const specialFeatures = this.generateSpecialFeatures(species, isImpostor);

    // Sprite layers
    const spriteLayers = this.generateSpriteLayers(species);

    // Visual modifiers
    const hueShift = this.randomInRange(-40, 40);
    const saturationMod = this.randomInRange(0.85, 1.15);
    const scaleX = this.randomInRange(0.9, 1.1);
    const scaleY = this.randomInRange(0.9, 1.1);
    const brightness = this.randomInRange(0.85, 1.15);

    return {
      height: Math.round(height * 100) / 100,
      weight: Math.round(weight * 10) / 10,
      bodyTemperature: Math.round(bodyTemperature * 10) / 10,
      skinTone,
      eyeCount,
      appendageCount,
      specialFeatures,
      spriteBase: this.selectSpriteBase(species),
      spriteLayers,
      hueShift,
      saturationMod,
      scaleX,
      scaleY,
      brightness,
    };
  }

  /**
   * Calculate body temperature based on species
   */
  private calculateBodyTemperature(species: Species, ambientTemp: number): number {
    const temp = species.bodyTemperature;

    switch (temp.type) {
      case 'fixed':
        return (temp.baseValue || 36.5) + this.randomInRange(-0.5, 0.5);
      case 'ambient_relative':
        return ambientTemp + (temp.ambientOffset || 0) + this.randomInRange(-0.5, 0.5);
      case 'variable':
        return this.randomInRange(temp.range?.min || 20, temp.range?.max || 40);
      default:
        return 36.5;
    }
  }

  /**
   * Generate special features based on species
   */
  private generateSpecialFeatures(species: Species, isImpostor: boolean): string[] {
    const features: string[] = [];

    for (const feature of species.identifyingFeatures) {
      if (feature.required) {
        if (feature.countRange) {
          const count = isImpostor && Math.random() < 0.3
            ? feature.countRange.min - 1
            : this.randomInt(feature.countRange.min, feature.countRange.max);
          features.push(`${feature.id}_${count}`);
        } else if (feature.possibleValues) {
          features.push(this.randomElement(feature.possibleValues));
        } else {
          features.push(feature.id);
        }
      }
    }

    return features;
  }

  /**
   * Generate sprite layers for a species
   */
  private generateSpriteLayers(species: Species): VisitorSpriteLayer[] {
    const layers: VisitorSpriteLayer[] = [];

    species.spriteLayers.forEach((config, index) => {
      // Skip optional layers sometimes
      if (!config.required && Math.random() < 0.3) {
        return;
      }

      const assetName = this.randomElement(config.options);
      if (assetName === 'ninguno') return;

      layers.push({
        layerId: config.layerId,
        assetName,
        zIndex: index,
        hueShift: config.colorizable ? this.randomInRange(-30, 30) : 0,
        opacity: 1,
      });
    });

    return layers;
  }

  /**
   * Select base sprite for species
   */
  private selectSpriteBase(species: Species): string {
    const bodyLayer = species.spriteLayers.find(l => l.layerId === 'body');
    if (bodyLayer) {
      return this.randomElement(bodyLayer.options);
    }
    return `${species.id.toLowerCase()}_base`;
  }

  /**
   * Generate the hidden truth about the visitor
   */
  private generateTruth(
    isImpostor: boolean,
    actualSpecies: Species,
    params: VisitorGenerationParams
  ): VisitorTruth {
    const isFugitive = params.forceFugitive ?? (Math.random() < 0.05 + params.difficulty * 0.01);
    const isCarryingContraband = params.forceContraband ?? (Math.random() < 0.08);
    const isInfected = Math.random() < 0.03;
    const hasFakeDocuments = isImpostor || isFugitive || Math.random() < 0.1;

    const fakeDocumentErrors: string[] = [];
    if (hasFakeDocuments) {
      const possibleErrors = [
        'FECHA_INVALIDA',
        'SELLO_FALSO',
        'FOTO_NO_COINCIDE',
        'NUMERO_INVALIDO',
        'ESPECIE_INCORRECTA',
      ];
      const errorCount = this.randomInt(1, 3);
      for (let i = 0; i < errorCount; i++) {
        fakeDocumentErrors.push(this.randomElement(possibleErrors));
      }
    }

    const hiddenDangerLevel = this.determineDangerLevel(
      isImpostor,
      isFugitive,
      isCarryingContraband,
      isInfected
    );

    return {
      isImpostor,
      realSpecies: isImpostor ? actualSpecies.id : undefined,
      isFugitive,
      fugitiveReason: isFugitive ? this.generateFugitiveReason() : undefined,
      isCarryingContraband,
      contrabandType: isCarryingContraband ? this.generateContrabandType() : undefined,
      isInfected,
      infectionType: isInfected ? 'Parásito Dimensional Clase B' : undefined,
      hasFakeDocuments,
      fakeDocumentErrors,
      hiddenDangerLevel,
    };
  }

  /**
   * Determine danger level
   */
  private determineDangerLevel(
    isImpostor: boolean,
    isFugitive: boolean,
    hasContraband: boolean,
    isInfected: boolean
  ): DangerLevel {
    if (isFugitive && isImpostor) return 'OMEGA';
    if (isFugitive) return 'ACTIVO';
    if (isInfected) return 'POTENCIAL';
    if (isImpostor || hasContraband) return 'CONTROLADO';
    return 'INOFENSIVO';
  }

  /**
   * Generate fugitive reason
   */
  private generateFugitiveReason(): string {
    const reasons = [
      'Robo dimensional de artefactos',
      'Espionaje corporativo para QDT rival',
      'Tráfico de especies protegidas',
      'Sabotaje de portal dimensional',
      'Asesinato en dimensión de origen',
      'Deserción de ejército interdimensional',
      'Fraude de documentos a gran escala',
    ];
    return this.randomElement(reasons);
  }

  /**
   * Generate contraband type
   */
  private generateContrabandType(): string {
    const types = [
      'Cristales de Vacío',
      'Esporas parasitarias',
      'Tecnología prohibida',
      'Armas orgánicas',
      'Documentos clasificados',
      'Sustancias psicoactivas dimensionales',
    ];
    return this.randomElement(types);
  }

  /**
   * Generate visitor behavior
   */
  private generateBehavior(truth: VisitorTruth): VisitorBehavior {
    // Base nervousness affected by what they're hiding
    let nervousness = this.randomInt(10, 30);
    if (truth.isImpostor) nervousness += 20;
    if (truth.isFugitive) nervousness += 30;
    if (truth.isCarryingContraband) nervousness += 15;

    nervousness = Math.min(100, nervousness);

    const cooperativeness = truth.isFugitive
      ? this.randomInt(20, 50)
      : this.randomInt(50, 90);

    const aggression = truth.isFugitive
      ? this.randomInt(30, 70)
      : this.randomInt(5, 30);

    const deceptionSkill = truth.isImpostor || truth.isFugitive
      ? this.randomInt(40, 80)
      : this.randomInt(10, 40);

    const currentMood = this.determineMood(nervousness, aggression);
    const dialogueStyle = this.determineDialogueStyle(cooperativeness, nervousness);

    return {
      nervousness,
      cooperativeness,
      aggression,
      deceptionSkill,
      currentMood,
      dialogueStyle,
    };
  }

  /**
   * Determine mood based on stats
   */
  private determineMood(nervousness: number, aggression: number): VisitorMood {
    if (nervousness > 70) return 'terrified';
    if (aggression > 60) return 'angry';
    if (nervousness > 50) return 'nervous';
    if (nervousness > 30) return 'suspicious';
    return 'calm';
  }

  /**
   * Determine dialogue style
   */
  private determineDialogueStyle(cooperativeness: number, nervousness: number): DialogueStyle {
    if (cooperativeness < 30) return 'aggressive';
    if (nervousness > 60) return 'evasive';
    if (cooperativeness > 70) return 'friendly';
    return 'formal';
  }

  /**
   * Generate travel information
   */
  private generateTravelInfo(species: Species): TravelInfo {
    const purposes: TravelPurpose[] = [
      'TURISMO', 'NEGOCIOS', 'REFUGIO', 'PEREGRINACION',
      'TRABAJO', 'REUNION_FAMILIAR', 'TRANSITO'
    ];

    const declaredPurpose = this.randomElement(purposes);
    const purposeData = TRAVEL_PURPOSES[declaredPurpose];

    const destination = this.randomElement(
      DESTINATION_CITIES.filter(c => !c.restricted || declaredPurpose === 'DIPLOMACIA')
    );

    const durations = ['7 ciclos', '14 ciclos', '30 ciclos', '90 ciclos', 'permanente'];

    return {
      declaredPurpose,
      declaredDuration: this.randomElement(durations),
      declaredDestination: destination.name,
      declaredOrigin: this.randomElement(species.originCities),
      hasReturnTicket: declaredPurpose !== 'REFUGIO' && Math.random() > 0.2,
      sponsorName: Math.random() > 0.7 ? this.generateName('HUMANO') : undefined,
    };
  }

  /**
   * Generate stats for visitor
   */
  private generateStats(species: Species): SpeciesStats {
    const variance = species.statVariance;
    return {
      STR: this.clamp(species.baseStats.STR + this.randomInt(-variance, variance), 1, 10),
      AGI: this.clamp(species.baseStats.AGI + this.randomInt(-variance, variance), 1, 10),
      RES: this.clamp(species.baseStats.RES + this.randomInt(-variance, variance), 1, 10),
      INT: this.clamp(species.baseStats.INT + this.randomInt(-variance, variance), 1, 10),
    };
  }

  /**
   * Determine morphology from species
   */
  private determineMorphology(speciesId: SpeciesId): MorphologyType {
    const morphologyMap: Record<SpeciesId, MorphologyType> = {
      HUMANO: 'CARBONO',
      VULNARI: 'ETEREO',
      EXOPODO: 'SILICIO',
      REPTILIANO: 'SANGRE_FRIA',
      INMIGRANTE: 'DESCONOCIDO',
    };
    return morphologyMap[speciesId] || 'DESCONOCIDO';
  }

  /**
   * Generate greeting dialogue
   */
  private generateGreeting(species: Species, behavior: VisitorBehavior): string[] {
    const greetings: Record<DialogueStyle, string[]> = {
      formal: [
        'Buenos ciclos, inspector.',
        'Solicito permiso para ingresar.',
        'Aquí están mis documentos.',
      ],
      friendly: [
        '¡Hola! ¿Qué tal el día?',
        'Un placer conocerle, inspector.',
        'Espero que todo esté en orden.',
      ],
      aggressive: [
        '¿Cuánto va a tardar esto?',
        'Tengo prisa, sea rápido.',
        'Mis documentos están perfectos.',
      ],
      evasive: [
        'Eh... hola.',
        'Sí, aquí tengo... los papeles.',
        'Todo debería estar... bien.',
      ],
      submissive: [
        'Por favor, inspector...',
        'Haré lo que me pida.',
        'No quiero problemas.',
      ],
      casual: [
        'Hey, ¿qué hay?',
        'Otro día, otro portal.',
        'Venga, hagamos esto rápido.',
      ],
    };

    return greetings[behavior.dialogueStyle] || greetings.formal;
  }

  // Utility methods
  private randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
