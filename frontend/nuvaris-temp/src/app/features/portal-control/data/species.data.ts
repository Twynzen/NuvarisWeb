/**
 * PORTAL CONTROL - Species Data
 * Complete species definitions based on Nuvaris lore
 * Source: docs/lore/Lore.md
 */

import { Species, SpeciesId } from '../models';

/**
 * HUMANOS
 * Inmigrantes dimensionales de la Tierra, simbólicamente los jugadores.
 * Son los más versátiles pero también los más comunes y fáciles de suplantar.
 */
export const HUMANO_SPECIES: Species = {
  id: 'HUMANO',
  name: 'Humano',
  namePlural: 'Humanos',
  description: 'Inmigrantes dimensionales del planeta Tierra.',
  loreDescription: `Los humanos son inmigrantes dimensionales que llegaron a Tartarus Pryme
    a través de los portales de QDT. Son la raza más versátil y adaptable,
    pero también la más común y predecible. Su naturaleza equilibrada los hace
    útiles en cualquier rol, pero carecen de las habilidades especiales de otras razas.`,
  originWorld: 'Tierra',
  originCities: ['Nueva York', 'Tokyo', 'Londres', 'São Paulo', 'Cairo'],

  baseStats: { STR: 5, AGI: 5, RES: 5, INT: 5 },
  statVariance: 2,

  heightRange: { min: 1.50, max: 2.00 },
  weightRange: { min: 45, max: 120 },
  bodyTemperature: {
    type: 'fixed',
    baseValue: 36.5,
  },
  bloodType: {
    color: 'Roja',
    glowsUnderUV: false,
    temperature: 'warm',
  },

  identifyingFeatures: [
    {
      id: 'eyes_count',
      name: 'Número de Ojos',
      description: 'Los humanos siempre tienen exactamente 2 ojos',
      required: true,
      countRange: { min: 2, max: 2 },
    },
    {
      id: 'appendages',
      name: 'Extremidades',
      description: '4 extremidades: 2 brazos y 2 piernas',
      required: true,
      countRange: { min: 4, max: 4 },
    },
    {
      id: 'skin_type',
      name: 'Tipo de Piel',
      description: 'Piel suave, sin escamas ni exoesqueleto',
      required: true,
      possibleValues: ['suave', 'con_vello'],
    },
  ],

  behavioralTraits: [
    {
      id: 'speech_pattern',
      name: 'Patrón de Habla',
      description: 'Habla continua sin pausas rítmicas',
      detectableBy: 'observation',
    },
    {
      id: 'body_heat',
      name: 'Temperatura Corporal',
      description: 'Mantiene calor corporal constante',
      detectableBy: 'scanner',
    },
  ],

  detectionRules: [
    {
      id: 'temp_check',
      description: 'Temperatura debe estar entre 36-37.5°C',
      checkType: 'range',
      field: 'bodyTemperature',
      expectedRange: { min: 36, max: 37.5 },
      failureFlag: 'TEMPERATURA_ANOMALA',
      severity: 'high',
    },
    {
      id: 'weight_check',
      description: 'Peso debe coincidir con documento ±5kg',
      checkType: 'range',
      field: 'weight',
      failureFlag: 'PESO_INCORRECTO',
      severity: 'medium',
    },
    {
      id: 'eye_count',
      description: 'Debe tener exactamente 2 ojos',
      checkType: 'exact',
      field: 'eyeCount',
      expectedValue: 2,
      failureFlag: 'IMPOSTOR_PROBABLE',
      severity: 'critical',
    },
  ],

  spriteLayers: [
    {
      layerId: 'body',
      required: true,
      options: ['humano_cuerpo_1', 'humano_cuerpo_2', 'humano_cuerpo_3'],
      colorizable: true,
      defaultHueRange: { min: -10, max: 30 },
    },
    {
      layerId: 'face',
      required: true,
      options: ['humano_cara_neutral', 'humano_cara_nervioso', 'humano_cara_serio'],
      colorizable: true,
    },
    {
      layerId: 'clothing',
      required: true,
      options: ['ropa_civil', 'ropa_formal', 'ropa_obrero', 'ropa_refugiado'],
      colorizable: true,
    },
    {
      layerId: 'accessory',
      required: false,
      options: ['gafas', 'sombrero', 'cicatriz', 'barba', 'ninguno'],
      colorizable: false,
    },
  ],
  defaultColorPalette: ['#E8BEAC', '#D4A574', '#8D5524', '#C68642', '#F1C27D'],

  rarity: 'common',
  canBeImpostor: true,
  impostorDifficulty: 'easy',
};

/**
 * VULNARI
 * Melancólicos con tentáculos cerebrales (Ulnar).
 * Los más difíciles de suplantar debido a los Ulnar.
 */
export const VULNARI_SPECIES: Species = {
  id: 'VULNARI',
  name: 'Vulnari',
  namePlural: 'Vulnari',
  description: 'Seres melancólicos con apéndices cerebrales llamados Ulnar.',
  loreDescription: `Los Vulnari son una raza etérea y melancólica, conocidos por sus
    "Ulnar" - apéndices prensiles que emergen de sus cabezas como tentáculos cerebrales.
    Poseen una conexión innata con "La Intención", lo que les permite percibir
    mentiras y emociones. Habitan principalmente en las ciudades flotantes de Nau-Vel
    y Armonía Vulnari, donde su canto resuena entre las nubes.`,
  originWorld: 'Tartarus Pryme',
  originCities: ['Nau-Vel', 'Armonía Vulnari', 'Ithor'],

  baseStats: { STR: 2, AGI: 6, RES: 5, INT: 7 },
  statVariance: 1,

  heightRange: { min: 1.60, max: 2.10 },
  weightRange: { min: 35, max: 65 },
  bodyTemperature: {
    type: 'ambient_relative',
    ambientOffset: -2,
  },
  bloodType: {
    color: 'Azul Luminiscente',
    glowsUnderUV: true,
    temperature: 'cold',
  },

  identifyingFeatures: [
    {
      id: 'ulnar',
      name: 'Ulnar (Tentáculos Cerebrales)',
      description: 'Apéndices prensiles que emergen de la cabeza. Entre 4-8.',
      required: true,
      countRange: { min: 4, max: 8 },
      detectionTool: 'RESONADOR_ULNAR',
    },
    {
      id: 'skin_multicolor',
      name: 'Piel Multicolor',
      description: 'Piel con tonalidades cambiantes entre púrpura, azul y plateado',
      required: true,
      possibleValues: ['púrpura', 'azul', 'plateado', 'rosa_pálido'],
    },
    {
      id: 'eyes_luminous',
      name: 'Ojos Luminosos',
      description: 'Ojos que emiten un brillo tenue',
      required: true,
    },
  ],

  behavioralTraits: [
    {
      id: 'melancholy',
      name: 'Melancolía Característica',
      description: 'Los Vulnari mantienen una expresión melancólica constante',
      detectableBy: 'observation',
      suspiciousIf: 'Muestra alegría excesiva o constante',
    },
    {
      id: 'involuntary_melody',
      name: 'Melodía Involuntaria',
      description: 'Producen melodías sutiles al hablar, especialmente cuando mienten',
      detectableBy: 'observation',
      suspiciousIf: 'No produce ninguna melodía al hablar',
    },
    {
      id: 'intention_sensitivity',
      name: 'Sensibilidad a la Intención',
      description: 'Reaccionan a las emociones e intenciones de otros',
      detectableBy: 'interrogation',
    },
  ],

  detectionRules: [
    {
      id: 'ulnar_count',
      description: 'Debe tener entre 4-8 Ulnar',
      checkType: 'range',
      field: 'ulnarCount',
      expectedRange: { min: 4, max: 8 },
      failureFlag: 'IMPOSTOR_PROBABLE',
      severity: 'critical',
    },
    {
      id: 'ulnar_response',
      description: 'Los Ulnar deben responder al Resonador',
      checkType: 'presence',
      field: 'ulnarResponse',
      expectedValue: true,
      failureFlag: 'MIMETICO_DETECTADO',
      severity: 'critical',
    },
    {
      id: 'blood_glow',
      description: 'La sangre debe brillar bajo luz UV',
      checkType: 'presence',
      field: 'bloodGlowsUV',
      expectedValue: true,
      failureFlag: 'BIOLOGIA_ANOMALA',
      severity: 'high',
    },
    {
      id: 'temp_check',
      description: 'Temperatura debe ser 2°C inferior al ambiente',
      checkType: 'comparison',
      field: 'bodyTemperature',
      failureFlag: 'TEMPERATURA_ANOMALA',
      severity: 'medium',
    },
    {
      id: 'melody_check',
      description: 'Debe producir melodías al hablar',
      checkType: 'presence',
      field: 'producesMelody',
      expectedValue: true,
      failureFlag: 'COMPORTAMIENTO_SOSPECHOSO',
      severity: 'medium',
    },
  ],

  spriteLayers: [
    {
      layerId: 'body',
      required: true,
      options: ['vulnari_cuerpo_esbelto', 'vulnari_cuerpo_delgado', 'vulnari_cuerpo_etereo'],
      colorizable: true,
      defaultHueRange: { min: -60, max: 60 },
    },
    {
      layerId: 'ulnar',
      required: true,
      options: ['ulnar_4', 'ulnar_6', 'ulnar_8'],
      colorizable: true,
    },
    {
      layerId: 'face',
      required: true,
      options: ['vulnari_cara_melancolico', 'vulnari_cara_sereno', 'vulnari_cara_triste'],
      colorizable: true,
    },
    {
      layerId: 'clothing',
      required: true,
      options: ['tunica_simple', 'vestimenta_noble', 'ropas_peregrino'],
      colorizable: true,
    },
    {
      layerId: 'accessory',
      required: false,
      options: ['joyas_resonantes', 'cristal_musical', 'velo_etereo', 'ninguno'],
      colorizable: false,
    },
  ],
  defaultColorPalette: ['#8B5CF6', '#3B82F6', '#C0C0C0', '#FFC0CB', '#E9D5FF'],

  rarity: 'uncommon',
  canBeImpostor: true,
  impostorDifficulty: 'hard',
};

/**
 * EXÓPODOS
 * Hormigas humanoides con exoesqueleto.
 * Su sistema de castas y marcas de colmena son verificables.
 */
export const EXOPODO_SPECIES: Species = {
  id: 'EXOPODO',
  name: 'Exópodo',
  namePlural: 'Exópodos',
  description: 'Hormigas humanoides con exoesqueleto y organización de colmena.',
  loreDescription: `Los Exópodos son la columna vertebral de la fuerza laboral de Tartarus Pryme.
    Esta raza insectoide organizada en colmenas posee exoesqueletos resistentes y
    una mente colmena que los hace increíblemente eficientes. Cada Exópodo lleva
    la marca de su colmena en el tórax, un código de 6 dígitos que identifica
    su origen y casta. Su sangre ámbar brilla bajo luz ultravioleta.`,
  originWorld: 'Tartarus Pryme',
  originCities: ['Ithor', 'Sectores Industriales', 'Colmenas Subterráneas'],

  baseStats: { STR: 2, AGI: 6, RES: 4, INT: 8 },
  statVariance: 1,

  heightRange: { min: 1.40, max: 1.80 },
  weightRange: { min: 40, max: 80 },
  bodyTemperature: {
    type: 'variable',
    range: { min: 28, max: 35 },
  },
  bloodType: {
    color: 'Ámbar',
    glowsUnderUV: true,
    temperature: 'variable',
  },

  identifyingFeatures: [
    {
      id: 'exoskeleton',
      name: 'Exoesqueleto',
      description: 'Caparazón duro que cubre todo el cuerpo',
      required: true,
    },
    {
      id: 'antennae',
      name: 'Antenas',
      description: 'Par de antenas en la cabeza para comunicación',
      required: true,
      countRange: { min: 2, max: 2 },
    },
    {
      id: 'compound_eyes',
      name: 'Ojos Compuestos',
      description: 'Ojos facetados característicos de insectos',
      required: true,
    },
    {
      id: 'appendages',
      name: 'Extremidades',
      description: 'Entre 4-6 extremidades funcionales',
      required: true,
      countRange: { min: 4, max: 6 },
    },
    {
      id: 'hive_mark',
      name: 'Marca de Colmena',
      description: 'Código de 6 dígitos grabado en el tórax',
      required: true,
      detectionTool: 'LUZ_UV',
    },
  ],

  behavioralTraits: [
    {
      id: 'hive_patterns',
      name: 'Patrones de Colmena',
      description: 'Movimientos coordinados y eficientes',
      detectableBy: 'observation',
    },
    {
      id: 'caste_behavior',
      name: 'Comportamiento de Casta',
      description: 'Actúa según su rol: obrero, soldado, o noble',
      detectableBy: 'observation',
      suspiciousIf: 'Comportamiento incongruente con casta declarada',
    },
    {
      id: 'pheromone_communication',
      name: 'Comunicación por Feromonas',
      description: 'Emite feromonas detectables por otros Exópodos',
      detectableBy: 'special_tool',
    },
  ],

  detectionRules: [
    {
      id: 'hive_mark_valid',
      description: 'La marca de colmena debe ser válida (no #000000)',
      checkType: 'absence',
      field: 'hiveMarkInvalid',
      expectedValue: false,
      failureFlag: 'COLMENA_EXTINTA',
      severity: 'critical',
    },
    {
      id: 'appendage_count',
      description: 'Debe tener 4-6 extremidades',
      checkType: 'range',
      field: 'appendageCount',
      expectedRange: { min: 4, max: 6 },
      failureFlag: 'BIOLOGIA_ANOMALA',
      severity: 'high',
    },
    {
      id: 'blood_glow',
      description: 'Sangre ámbar debe brillar bajo UV',
      checkType: 'presence',
      field: 'bloodGlowsUV',
      expectedValue: true,
      failureFlag: 'IMPOSTOR_PROBABLE',
      severity: 'high',
    },
    {
      id: 'exoskeleton_check',
      description: 'Debe tener exoesqueleto detectable',
      checkType: 'presence',
      field: 'hasExoskeleton',
      expectedValue: true,
      failureFlag: 'MIMETICO_DETECTADO',
      severity: 'critical',
    },
  ],

  spriteLayers: [
    {
      layerId: 'body',
      required: true,
      options: ['exopodo_obrero', 'exopodo_soldado', 'exopodo_noble'],
      colorizable: true,
      defaultHueRange: { min: -30, max: 30 },
    },
    {
      layerId: 'head',
      required: true,
      options: ['exopodo_cabeza_standard', 'exopodo_cabeza_soldado', 'exopodo_cabeza_reina'],
      colorizable: true,
    },
    {
      layerId: 'antennae',
      required: true,
      options: ['antenas_cortas', 'antenas_largas', 'antenas_dañadas'],
      colorizable: true,
    },
    {
      layerId: 'hive_mark',
      required: true,
      options: ['marca_colmena_activa', 'marca_colmena_extinta', 'marca_colmena_noble'],
      colorizable: false,
    },
    {
      layerId: 'accessory',
      required: false,
      options: ['herramienta_obrero', 'armadura_soldado', 'insignia_noble', 'ninguno'],
      colorizable: false,
    },
  ],
  defaultColorPalette: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460'],

  rarity: 'common',
  canBeImpostor: true,
  impostorDifficulty: 'medium',
};

/**
 * REPTILIANOS
 * Guerreros de sangre fría con escamas metálicas.
 * Su peso y temperatura son fáciles de verificar.
 */
export const REPTILIANO_SPECIES: Species = {
  id: 'REPTILIANO',
  name: 'Reptiliano',
  namePlural: 'Reptilianos',
  description: 'Guerreros de sangre fría con escamas metálicas.',
  loreDescription: `Los Reptilianos son la casta guerrera de Tartarus Pryme.
    Su imponente físico, cubierto de escamas metálicas que brillan con tonos
    cobrizos y dorados, los hace inconfundibles. Son de sangre fría, lo que
    significa que su temperatura corporal siempre coincide con el ambiente.
    Habitan principalmente en la fortaleza de Khrale, donde entrenan sin cesar.`,
  originWorld: 'Tartarus Pryme',
  originCities: ['Khrale', 'Ithor', 'Forjas de Obsidiana'],

  baseStats: { STR: 8, AGI: 3, RES: 7, INT: 2 },
  statVariance: 1,

  heightRange: { min: 1.90, max: 2.40 },
  weightRange: { min: 120, max: 200 },
  bodyTemperature: {
    type: 'ambient_relative',
    ambientOffset: 0,
  },
  bloodType: {
    color: 'Verde Oscuro',
    glowsUnderUV: false,
    temperature: 'cold',
  },

  identifyingFeatures: [
    {
      id: 'metallic_scales',
      name: 'Escamas Metálicas',
      description: 'Escamas que reaccionan al magnetismo',
      required: true,
      detectionTool: 'MAGNETOMETRO',
    },
    {
      id: 'eyes_slit',
      name: 'Pupilas Verticales',
      description: 'Ojos con pupilas de reptil',
      required: true,
    },
    {
      id: 'claws',
      name: 'Garras',
      description: 'Garras retráctiles en manos y pies',
      required: true,
    },
    {
      id: 'tail',
      name: 'Cola',
      description: 'Cola muscular de 0.5-1m',
      required: false,
      countRange: { min: 0, max: 1 },
    },
  ],

  behavioralTraits: [
    {
      id: 'warrior_stance',
      name: 'Postura de Guerrero',
      description: 'Mantienen postura erguida y alerta',
      detectableBy: 'observation',
    },
    {
      id: 'cold_demeanor',
      name: 'Temperamento Frío',
      description: 'Expresiones faciales mínimas, voz grave',
      detectableBy: 'observation',
      suspiciousIf: 'Muestra emociones exageradas',
    },
    {
      id: 'territorial',
      name: 'Comportamiento Territorial',
      description: 'Reaccionan a invasiones de espacio personal',
      detectableBy: 'interrogation',
    },
  ],

  detectionRules: [
    {
      id: 'weight_minimum',
      description: 'Peso mínimo de adulto: 120kg',
      checkType: 'range',
      field: 'weight',
      expectedRange: { min: 120, max: 250 },
      failureFlag: 'PESO_INCORRECTO',
      severity: 'high',
    },
    {
      id: 'temp_ambient',
      description: 'Temperatura debe igualar al ambiente',
      checkType: 'comparison',
      field: 'bodyTemperature',
      failureFlag: 'TEMPERATURA_ANOMALA',
      severity: 'high',
    },
    {
      id: 'magnetic_scales',
      description: 'Escamas deben reaccionar al magnetómetro',
      checkType: 'presence',
      field: 'magneticResponse',
      expectedValue: true,
      failureFlag: 'IMPOSTOR_PROBABLE',
      severity: 'critical',
    },
    {
      id: 'height_minimum',
      description: 'Altura mínima: 1.90m',
      checkType: 'range',
      field: 'height',
      expectedRange: { min: 1.90, max: 2.50 },
      failureFlag: 'BIOLOGIA_ANOMALA',
      severity: 'medium',
    },
  ],

  spriteLayers: [
    {
      layerId: 'body',
      required: true,
      options: ['reptiliano_masivo', 'reptiliano_atletico', 'reptiliano_anciano'],
      colorizable: true,
      defaultHueRange: { min: -20, max: 40 },
    },
    {
      layerId: 'scales',
      required: true,
      options: ['escamas_metalicas', 'escamas_volcanicas', 'escamas_acuaticas'],
      colorizable: true,
    },
    {
      layerId: 'head_crest',
      required: true,
      options: ['cresta_guerrero', 'cresta_noble', 'cresta_obrero', 'sin_cresta'],
      colorizable: true,
    },
    {
      layerId: 'scars',
      required: false,
      options: ['cicatriz_combate', 'cicatriz_ritual', 'quemaduras', 'ninguno'],
      colorizable: false,
    },
    {
      layerId: 'armor',
      required: false,
      options: ['armadura_guerrero', 'vestimenta_civil', 'uniforme_guardia', 'ninguno'],
      colorizable: true,
    },
  ],
  defaultColorPalette: ['#2F4F4F', '#556B2F', '#6B8E23', '#8B4513', '#B8860B'],

  rarity: 'uncommon',
  canBeImpostor: true,
  impostorDifficulty: 'medium',
};

/**
 * INMIGRANTES
 * Seres de otras dimensiones con formas impredecibles.
 * La categoría más variada y potencialmente peligrosa.
 */
export const INMIGRANTE_SPECIES: Species = {
  id: 'INMIGRANTE',
  name: 'Inmigrante Dimensional',
  namePlural: 'Inmigrantes Dimensionales',
  description: 'Seres de otros universos con formas y habilidades impredecibles.',
  loreDescription: `Los Inmigrantes Dimensionales son la categoría más diversa y misteriosa.
    Provienen de infinitas realidades alternativas, cada uno con biología y
    habilidades únicas. Algunos son refugiados huyendo de catástrofes cósmicas,
    otros son exploradores, y algunos... son amenazas disfrazadas.
    Su impredecibilidad los hace los más difíciles de evaluar.`,
  originWorld: 'Variable',
  originCities: ['Desconocido', 'Múltiples Dimensiones'],

  baseStats: { STR: 5, AGI: 5, RES: 5, INT: 5 }, // 20 puntos libres en lore
  statVariance: 5, // Alta variabilidad

  heightRange: { min: 0.30, max: 3.00 }, // Muy variable
  weightRange: { min: 5, max: 500 },     // Muy variable
  bodyTemperature: {
    type: 'variable',
    range: { min: -50, max: 200 },
  },
  bloodType: {
    color: 'Variable',
    glowsUnderUV: false, // Variable
    temperature: 'variable',
  },

  identifyingFeatures: [
    {
      id: 'morphology',
      name: 'Morfología',
      description: 'Forma corporal variable: humanoide, amorfo, etéreo, mecánico',
      required: true,
      possibleValues: ['humanoide', 'amorfo', 'etereo', 'mecanico', 'cristalino', 'gaseoso'],
    },
    {
      id: 'dimensional_signature',
      name: 'Firma Dimensional',
      description: 'Patrón único de energía dimensional',
      required: true,
      detectionTool: 'VISOR_DIMENSIONAL',
    },
  ],

  behavioralTraits: [
    {
      id: 'unfamiliar_customs',
      name: 'Costumbres Desconocidas',
      description: 'Puede no entender protocolos locales',
      detectableBy: 'observation',
    },
    {
      id: 'dimensional_stress',
      name: 'Estrés Dimensional',
      description: 'Puede mostrar signos de trauma por viaje dimensional',
      detectableBy: 'observation',
    },
    {
      id: 'variable_communication',
      name: 'Comunicación Variable',
      description: 'Puede requerir traductor o comunicarse de formas inusuales',
      detectableBy: 'interrogation',
    },
  ],

  detectionRules: [
    {
      id: 'dimensional_signature',
      description: 'La firma dimensional debe coincidir con documentos',
      checkType: 'exact',
      field: 'dimensionalSignature',
      failureFlag: 'DIMENSION_INCORRECTA',
      severity: 'critical',
    },
    {
      id: 'radiation_level',
      description: 'Nivel de radiación dimensional debe ser seguro',
      checkType: 'range',
      field: 'radiationLevel',
      failureFlag: 'RADIACION_PELIGROSA',
      severity: 'critical',
    },
    {
      id: 'parasite_check',
      description: 'No debe portar parásitos dimensionales',
      checkType: 'absence',
      field: 'hasParasite',
      expectedValue: false,
      failureFlag: 'PARASITO_DIMENSIONAL',
      severity: 'critical',
    },
  ],

  spriteLayers: [
    {
      layerId: 'body',
      required: true,
      options: [
        'inmigrante_humanoide',
        'inmigrante_amorfo',
        'inmigrante_etereo',
        'inmigrante_mecanico',
        'inmigrante_cristalino',
        'inmigrante_tentacular'
      ],
      colorizable: true,
      defaultHueRange: { min: -180, max: 180 },
    },
    {
      layerId: 'features',
      required: false,
      options: [
        'ojos_multiples',
        'sin_ojos',
        'tentaculos',
        'alas',
        'cristales',
        'vapores',
        'ninguno'
      ],
      colorizable: true,
    },
    {
      layerId: 'aura',
      required: false,
      options: ['aura_energia', 'aura_oscura', 'aura_brillante', 'distorsion', 'ninguno'],
      colorizable: true,
    },
    {
      layerId: 'accessory',
      required: false,
      options: ['traductor_universal', 'contenedor_atmosfera', 'dispositivo_desconocido', 'ninguno'],
      colorizable: false,
    },
  ],
  defaultColorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],

  rarity: 'rare',
  canBeImpostor: false, // Ellos SON la forma desconocida
  impostorDifficulty: 'hard',
};

/** Complete species registry */
export const SPECIES_DATA: Map<SpeciesId, Species> = new Map([
  ['HUMANO', HUMANO_SPECIES],
  ['VULNARI', VULNARI_SPECIES],
  ['EXOPODO', EXOPODO_SPECIES],
  ['REPTILIANO', REPTILIANO_SPECIES],
  ['INMIGRANTE', INMIGRANTE_SPECIES],
]);

/** Get all species as array */
export const ALL_SPECIES: Species[] = Array.from(SPECIES_DATA.values());

/** Species by rarity */
export const SPECIES_BY_RARITY = {
  common: ALL_SPECIES.filter(s => s.rarity === 'common'),
  uncommon: ALL_SPECIES.filter(s => s.rarity === 'uncommon'),
  rare: ALL_SPECIES.filter(s => s.rarity === 'rare'),
  very_rare: ALL_SPECIES.filter(s => s.rarity === 'very_rare'),
};
