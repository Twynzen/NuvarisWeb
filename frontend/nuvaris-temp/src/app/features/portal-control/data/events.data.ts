/**
 * PORTAL CONTROL - Events Data
 * Special events, rare occurrences, and special visitors
 */

import { SpecialEvent, SpecialVisitor, EventDialogue } from '../models';

/** All special events that can occur during the game */
export const SPECIAL_EVENTS: SpecialEvent[] = [
  // === DAY 1-5 EVENTS ===
  {
    id: 'supervisor_intro',
    type: 'VISITA_SUPERVISOR',
    title: 'Primera Inspección',
    description: 'El Supervisor Krell viene a evaluar tu primer día.',
    dialogue: [
      { speaker: 'Supervisor Krell', text: 'Ah, el nuevo recluta. Espero que hayas leído el manual.', emotion: 'stern' },
      { speaker: 'Supervisor Krell', text: 'QDT no tolera errores. Un impostor que pase puede significar miles de muertes.', emotion: 'warning' },
      { speaker: 'Supervisor Krell', text: 'Pero tampoco queremos incidentes diplomáticos. Sé justo, pero firme.', emotion: 'neutral' },
    ],
    triggerDay: 1,
    triggerChance: 1.0,
    triggerConditions: [],
    hasOccurred: false,
    canRepeat: false,
    rewards: { dollars: 25, reputation: 5 }
  },
  {
    id: 'bribe_attempt_small',
    type: 'SOBORNO',
    title: 'Pequeña Tentación',
    description: 'Un visitante nervioso te ofrece dinero extra.',
    dialogue: [
      { speaker: 'Visitante', text: '*susurra* Escucha, sé que mis papeles no están... perfectos.', emotion: 'nervous' },
      { speaker: 'Visitante', text: 'Tengo $50 aquí. Podrían ser tuyos si... miras hacia otro lado.', emotion: 'hopeful' },
    ],
    triggerDay: null,
    triggerChance: 0.08,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 2 },
      { type: 'DAY_RANGE', operator: '<=', value: 10 }
    ],
    hasOccurred: false,
    canRepeat: true,
    choices: [
      {
        id: 'accept_bribe',
        text: 'Aceptar el soborno',
        consequence: {
          dollarsChange: 50,
          reputationChange: -15,
          warningChange: 0,
          narrative: 'Guardas el dinero discretamente. Tu conciencia pesa, pero tu bolsillo no.'
        }
      },
      {
        id: 'reject_bribe',
        text: 'Rechazar y reportar',
        consequence: {
          dollarsChange: 20,
          reputationChange: 10,
          warningChange: 0,
          narrative: 'Rechazas el soborno. El visitante es detenido. Tu supervisor está impresionado.'
        }
      },
      {
        id: 'reject_silent',
        text: 'Rechazar sin reportar',
        consequence: {
          dollarsChange: 0,
          reputationChange: 0,
          warningChange: 0,
          narrative: 'Rechazas en silencio. El visitante asiente y procede con sus documentos.'
        }
      }
    ]
  },
  {
    id: 'equipment_malfunction',
    type: 'SABOTAJE',
    title: 'Fallo del Sistema',
    description: 'Uno de tus escáneres muestra lecturas erráticas.',
    dialogue: [
      { speaker: 'Sistema', text: '⚠️ ALERTA: Calibración del termógrafo comprometida.', emotion: 'warning' },
      { speaker: 'Sistema', text: 'Las lecturas pueden variar ±5°C hasta que termine el día.', emotion: 'neutral' },
    ],
    triggerDay: null,
    triggerChance: 0.05,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 3 }
    ],
    hasOccurred: false,
    canRepeat: true,
    consequences: {
      specialFlag: 'thermograph_unreliable',
      narrative: 'Tendrás que confiar más en otros métodos de detección hoy.'
    }
  },

  // === DAY 6-15 EVENTS ===
  {
    id: 'corrupt_inspector',
    type: 'INSPECTOR_CORRUPTO',
    title: 'Propuesta Indecente',
    description: 'Un colega te hace una propuesta cuestionable.',
    dialogue: [
      { speaker: 'Inspector Vex', text: 'Hey, novato. ¿Cómo va el trabajo?', emotion: 'casual' },
      { speaker: 'Inspector Vex', text: 'Mira, tengo un... negocio paralelo. Ciertos "clientes" pagan bien por pasar sin problemas.', emotion: 'sneaky' },
      { speaker: 'Inspector Vex', text: 'Una vez al día, solo miras hacia otro lado. 50/50, ¿qué dices?', emotion: 'expectant' },
    ],
    triggerDay: null,
    triggerChance: 0.06,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 6 },
      { type: 'REPUTATION', operator: '<', value: 70 }
    ],
    hasOccurred: false,
    canRepeat: false,
    choices: [
      {
        id: 'join_corruption',
        text: 'Unirse al esquema',
        consequence: {
          dollarsChange: 100,
          reputationChange: -5,
          specialFlag: 'corruption_partner',
          narrative: 'Aceptas. Dinero fácil, pero ¿a qué costo?'
        }
      },
      {
        id: 'report_corruption',
        text: 'Reportar a supervisores',
        consequence: {
          dollarsChange: 50,
          reputationChange: 20,
          specialFlag: 'corruption_reporter',
          narrative: 'Vex es arrestado esa noche. Te ganas enemigos, pero también respeto.'
        }
      },
      {
        id: 'decline_silent',
        text: 'Declinar sin reportar',
        consequence: {
          dollarsChange: 0,
          reputationChange: 0,
          narrative: 'Vex se encoge de hombros. "Tu pérdida, novato."'
        }
      }
    ]
  },
  {
    id: 'dimensional_storm',
    type: 'EMERGENCIA',
    title: 'Tormenta Dimensional',
    description: 'Una anomalía dimensional afecta el portal.',
    dialogue: [
      { speaker: 'Sistema', text: '🚨 ALERTA ROJA: Tormenta dimensional detectada', emotion: 'critical' },
      { speaker: 'Director Lars', text: '*por intercomunicador* ¡Todos los inspectores, máxima alerta!', emotion: 'urgent' },
      { speaker: 'Director Lars', text: 'La tormenta puede traer entidades inestables. Protocolo Omega autorizado.', emotion: 'stern' },
    ],
    triggerDay: null,
    triggerChance: 0.04,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 8 }
    ],
    hasOccurred: false,
    canRepeat: true,
    consequences: {
      specialFlag: 'dimensional_storm_active',
      narrative: 'Durante el resto del día, hay más visitantes peligrosos y más recompensa por detectarlos.'
    },
    rewards: { dollars: 0, reputation: 0, unlocks: ['omega_bonus_active'] }
  },
  {
    id: 'refugee_crisis',
    type: 'EMERGENCIA',
    title: 'Crisis de Refugiados',
    description: 'Una dimensión ha colapsado. Miles huyen.',
    dialogue: [
      { speaker: 'Sistema', text: '⚠️ ALERTA: Dimensión Theta-7 en colapso terminal.', emotion: 'warning' },
      { speaker: 'Supervisor Krell', text: 'Prepárate. Van a llegar oleadas de refugiados.', emotion: 'stern' },
      { speaker: 'Supervisor Krell', text: 'Muchos serán legítimos, pero los criminales aprovecharán el caos.', emotion: 'warning' },
    ],
    triggerDay: null,
    triggerChance: 0.05,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 10 }
    ],
    hasOccurred: false,
    canRepeat: true,
    consequences: {
      specialFlag: 'refugee_crisis',
      narrative: 'Más visitantes hoy, con más variedad. Tu humanidad será puesta a prueba.'
    }
  },

  // === DAY 16+ EVENTS ===
  {
    id: 'director_visit',
    type: 'VISITA_DIRECTOR',
    title: 'Visita del Director Lars',
    description: 'El legendario Director viene personalmente.',
    dialogue: [
      { speaker: 'Director Lars', text: '*aparece de la nada* Inspector.', emotion: 'neutral' },
      { speaker: 'Director Lars', text: 'He revisado tus registros. Interesante.', emotion: 'thoughtful' },
      { speaker: 'Director Lars', text: 'En este trabajo, la perfección es imposible. Pero la integridad no lo es.', emotion: 'wise' },
      { speaker: 'Director Lars', text: 'Recuérdalo siempre.', emotion: 'stern' },
    ],
    triggerDay: null,
    triggerChance: 0.03,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 15 },
      { type: 'REPUTATION', operator: '>=', value: 50 }
    ],
    hasOccurred: false,
    canRepeat: false,
    rewards: { dollars: 100, reputation: 15, unlocks: ['director_blessing'] }
  },
  {
    id: 'invasion_warning',
    type: 'INVASIÓN_DIMENSIONAL',
    title: 'Señales de Invasión',
    description: 'Inteligencia detecta actividad sospechosa.',
    dialogue: [
      { speaker: 'Agente Sombra', text: '*comunicación encriptada* Inspector, esto es clasificado.', emotion: 'serious' },
      { speaker: 'Agente Sombra', text: 'Hemos detectado patrones. Alguien está infiltrando agentes.', emotion: 'concerned' },
      { speaker: 'Agente Sombra', text: 'En los próximos días, estate MUY atento a impostores. Es crítico.', emotion: 'urgent' },
    ],
    triggerDay: null,
    triggerChance: 0.04,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 12 }
    ],
    hasOccurred: false,
    canRepeat: false,
    consequences: {
      specialFlag: 'invasion_alert',
      narrative: 'A partir de ahora, habrá más impostores. Detectarlos es crucial.'
    }
  },
  {
    id: 'family_visit',
    type: 'FAMILIAR_FUGITIVO',
    title: 'Rostro Conocido',
    description: 'Alguien de tu pasado aparece en la fila.',
    dialogue: [
      { speaker: '???', text: '¿Eres tú? ¡No puedo creerlo!', emotion: 'surprised' },
      { speaker: '???', text: 'Soy Mira. ¿Recuerdas? Del orfanato de Nueva Esperanza.', emotion: 'hopeful' },
      { speaker: 'Mira', text: 'Escucha... mis papeles no son... perfectos. Pero NECESITO cruzar.', emotion: 'desperate' },
      { speaker: 'Mira', text: 'Por los viejos tiempos. Por favor.', emotion: 'pleading' },
    ],
    triggerDay: null,
    triggerChance: 0.02,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 10 }
    ],
    hasOccurred: false,
    canRepeat: false,
    choices: [
      {
        id: 'help_mira',
        text: 'Dejarla pasar',
        consequence: {
          dollarsChange: 0,
          reputationChange: -20,
          warningChange: 1,
          specialFlag: 'helped_mira',
          narrative: 'La dejas pasar. Ella sonríe con lágrimas. "Nunca lo olvidaré."'
        }
      },
      {
        id: 'process_mira',
        text: 'Procesarla normalmente',
        consequence: {
          dollarsChange: 0,
          reputationChange: 5,
          specialFlag: 'denied_mira',
          narrative: 'Haces tu trabajo. Mira es denegada. No voltea a verte al irse.'
        }
      }
    ]
  },
  {
    id: 'plague_warning',
    type: 'PLAGA',
    title: 'Parásito Dimensional',
    description: 'Se detecta una nueva amenaza biológica.',
    dialogue: [
      { speaker: 'Dra. Velox', text: 'Inspector, escucha con atención.', emotion: 'serious' },
      { speaker: 'Dra. Velox', text: 'Hemos identificado un nuevo parásito dimensional. Se llama "Sombra Interior".', emotion: 'concerned' },
      { speaker: 'Dra. Velox', text: 'Los infectados muestran comportamiento errático y temperaturas anormales.', emotion: 'clinical' },
      { speaker: 'Dra. Velox', text: 'Si detectas algo, CUARENTENA inmediata. No Omega, no denegación. Cuarentena.', emotion: 'emphatic' },
    ],
    triggerDay: null,
    triggerChance: 0.03,
    triggerConditions: [
      { type: 'DAY_RANGE', operator: '>=', value: 8 }
    ],
    hasOccurred: false,
    canRepeat: false,
    consequences: {
      specialFlag: 'plague_active',
      narrative: 'Algunos visitantes estarán infectados. La cuarentena es la única respuesta correcta.'
    }
  },
  {
    id: 'mysterious_gift',
    type: 'REGALO_MISTERIOSO',
    title: 'Paquete Sin Remitente',
    description: 'Encuentras un paquete en tu escritorio.',
    dialogue: [
      { speaker: 'Sistema', text: 'Objeto no identificado detectado en estación de trabajo.', emotion: 'neutral' },
      { speaker: 'Nota', text: '"Para el inspector. De un amigo. Úsalo con sabiduría."', emotion: 'mysterious' },
    ],
    triggerDay: null,
    triggerChance: 0.04,
    triggerConditions: [
      { type: 'DECISIONS', operator: '>=', value: 50 }
    ],
    hasOccurred: false,
    canRepeat: false,
    choices: [
      {
        id: 'open_gift',
        text: 'Abrir el paquete',
        consequence: {
          dollarsChange: 75,
          specialFlag: 'mysterious_benefactor',
          narrative: 'Dentro hay dinero y una nota: "Sigue haciendo lo correcto."'
        }
      },
      {
        id: 'report_gift',
        text: 'Reportar a seguridad',
        consequence: {
          reputationChange: 10,
          narrative: 'Seguridad confisca el paquete. Nunca sabrás qué contenía.'
        }
      }
    ]
  },
];

/** Special visitors with unique interactions */
export const SPECIAL_VISITORS: SpecialVisitor[] = [
  {
    id: 'celebrity_singer',
    name: 'Lyria Vox',
    title: 'Cantante Interdimensional',
    species: 'VULNARI',
    description: 'La famosa cantante Vulnari cuyas melodías han cautivado millones de dimensiones.',
    portrait: 'celebrity_vulnari',
    appearDay: null,
    appearChance: 0.02,
    isAlwaysLegal: true,
    isAlwaysIllegal: false,
    hasForcedOutcome: false,
    greetingDialogue: [
      '♪ Inspector, es un placer conocerte ♪',
      'Mi gira interdimensional me trae aquí. Espero que mis papeles estén en orden.',
      '¿Te gustaría un autógrafo? *sonríe melancólicamente*'
    ],
    approvalDialogue: [
      '♪ Gracias, inspector. Que la melodía te acompañe ♪',
      '*tararea una canción mientras cruza*'
    ],
    denialDialogue: [
      '*la melodía se vuelve triste* Entiendo. El deber es el deber.',
      'Mis fans estarán decepcionados, pero respeto tu decisión.'
    ],
    detentionDialogue: [
      '¿Detención? ¡Pero soy Lyria Vox! Esto debe ser un error...',
      '*la melodía se vuelve disonante*'
    ],
    correctReward: { dollars: 30, reputation: 5 },
    incorrectConsequence: { reputationChange: -10, narrative: 'Has detenido a una celebridad inocente. Las noticias no serán amables.' },
    hasBeenSeen: false
  },
  {
    id: 'fugitive_general',
    name: 'General Vrax',
    title: 'Criminal de Guerra Reptiliano',
    species: 'REPTILIANO',
    description: 'Buscado por crímenes de guerra en 17 dimensiones. Peligroso.',
    portrait: 'fugitive_reptilian',
    appearDay: null,
    appearChance: 0.015,
    isAlwaysLegal: false,
    isAlwaysIllegal: true,
    hasForcedOutcome: false,
    greetingDialogue: [
      '*postura perfectamente erguida* Inspector.',
      'Soy un simple comerciante. Mis documentos están en perfecto orden.',
      '*escamas metálicas brillan bajo la luz*'
    ],
    approvalDialogue: [
      '*sonrisa depredadora* Sabía que eras sensato.',
      '*cruza con paso militar*'
    ],
    denialDialogue: [
      '*gruñido bajo* Esto no ha terminado, inspector.',
      'Volveremos a vernos.'
    ],
    detentionDialogue: [
      '¡IMPOSIBLE! ¿Cómo me reconociste?',
      '*intenta huir pero es contenido* ¡Te arrepentirás de esto!'
    ],
    correctReward: { dollars: 150, reputation: 25, unlocks: ['captured_war_criminal'] },
    incorrectConsequence: {
      reputationChange: -30,
      dollarsChange: -50,
      narrative: 'Has dejado escapar a un criminal de guerra. Las víctimas de Vrax claman justicia.'
    },
    hasBeenSeen: false
  },
  {
    id: 'diplomat_ambassador',
    name: 'Embajador Zyx-9',
    title: 'Diplomático de Alto Rango',
    species: 'INMIGRANTE',
    description: 'Embajador de una dimensión aliada. Inmunidad diplomática.',
    portrait: 'diplomat_entity',
    appearDay: null,
    appearChance: 0.025,
    isAlwaysLegal: true,
    isAlwaysIllegal: false,
    hasForcedOutcome: false,
    greetingDialogue: [
      '*forma etérea pulsa suavemente* Saludos, oficial.',
      'Vengo en misión diplomática. Mi inmunidad debería estar registrada.',
      'Confío en que esto será rápido.'
    ],
    approvalDialogue: [
      'Excelente. La cooperación entre nuestras realidades es vital.',
      '*se desvanece parcialmente al cruzar*'
    ],
    denialDialogue: [
      '*pulsa con luz naranja* ¿Denegado? Esto causará un incidente.',
      'Mi gobierno será informado.'
    ],
    detentionDialogue: [
      '*BRILLA INTENSAMENTE* ¡ESTO ES UN ULTRAJE!',
      '¡Exijo hablar con el Director Lars INMEDIATAMENTE!'
    ],
    correctReward: { dollars: 20, reputation: 10 },
    incorrectConsequence: {
      reputationChange: -20,
      warningChange: 1,
      narrative: 'Incidente diplomático. Tu supervisor no está contento.'
    },
    hasBeenSeen: false
  },
  {
    id: 'child_lost',
    name: 'Pip',
    title: 'Niño Perdido',
    species: 'HUMANO',
    description: 'Un niño pequeño que parece perdido y asustado.',
    portrait: 'child_human',
    appearDay: null,
    appearChance: 0.02,
    isAlwaysLegal: true,
    isAlwaysIllegal: false,
    hasForcedOutcome: true,
    forcedDecision: 'DERIVAR',
    greetingDialogue: [
      '*sniff* ¿Señor? ¿Señora?',
      'No encuentro a mi mamá. Ella dijo que esperara pero... *solloza*',
      '¿Puede ayudarme?'
    ],
    approvalDialogue: [
      '¿Puedo pasar? Pero... no sé a dónde ir.',
      '*mira alrededor confundido*'
    ],
    denialDialogue: [
      '*comienza a llorar* ¿No puedo entrar? Pero mi mamá...',
      '*se sienta en el suelo sollozando*'
    ],
    detentionDialogue: [
      '¡NO! ¡No quiero ir ahí! ¡MAMÁ!',
      '*llora desconsoladamente*'
    ],
    correctReward: { dollars: 0, reputation: 15, narrative: 'Pip es llevado a servicios sociales. Le encuentran a su madre.' },
    incorrectConsequence: {
      reputationChange: -15,
      narrative: 'Un niño perdido no debería ser tratado así. Las noticias lo cubren.'
    },
    unlocksStory: 'pip_storyline',
    hasBeenSeen: false
  },
  {
    id: 'royal_exopodo',
    name: 'Reina Chitara III',
    title: 'Monarca de la Colmena Dorada',
    species: 'EXOPODO',
    description: 'Líder de una de las colmenas más poderosas. Viaja con séquito reducido.',
    portrait: 'royal_exopodo',
    appearDay: 15,
    appearChance: 0.5,
    isAlwaysLegal: true,
    isAlwaysIllegal: false,
    hasForcedOutcome: false,
    greetingDialogue: [
      '*antenas se mueven con gracia* Zzzz... Inspector.',
      'Somos Chitara de la Colmena Dorada. Nuestro linaje precede a las estrellas.',
      'Nuestros documentos son impecables, naturalmente.'
    ],
    approvalDialogue: [
      'Zzzz... Como esperábamos. Competente.',
      '*sus guardias hacen una reverencia mientras cruza*'
    ],
    denialDialogue: [
      '*click de mandíbulas* Interesante. Un insecto que nos niega.',
      'Recordaremos tu nombre, inspector.'
    ],
    detentionDialogue: [
      '*CHIRRIDO ENSORDECEDOR* ¡ESTO ES GUERRA!',
      '*sus guardias entran en modo de combate*'
    ],
    correctReward: { dollars: 75, reputation: 15, unlocks: ['friend_of_hive'] },
    incorrectConsequence: {
      reputationChange: -25,
      dollarsChange: -100,
      warningChange: 1,
      narrative: 'Has insultado a la realeza Exópoda. Las consecuencias serán graves.'
    },
    hasBeenSeen: false
  },
  {
    id: 'mysterious_stranger',
    name: '???',
    title: 'El Caminante',
    species: 'INMIGRANTE',
    description: 'Una figura envuelta en sombras. No hay registros de su existencia.',
    portrait: 'mysterious_entity',
    appearDay: null,
    appearChance: 0.01,
    isAlwaysLegal: false,
    isAlwaysIllegal: false,
    hasForcedOutcome: false,
    greetingDialogue: [
      '*la luz parece evitarlo* ...',
      'Inspector. Te he observado.',
      'Tus decisiones... interesantes. Muy interesantes.',
      '¿Me dejarás pasar? ¿O intentarás detenerme?'
    ],
    approvalDialogue: [
      '*sonríe, aunque no tiene boca visible* Sabio.',
      'Nos veremos de nuevo, inspector. Pronto.',
      '*desaparece incluso antes de cruzar el portal*'
    ],
    denialDialogue: [
      '*la sombra se profundiza* ¿Denegado? Qué... mortal de tu parte.',
      'El resultado será el mismo.',
      '*se desvanece en las sombras*'
    ],
    detentionDialogue: [
      '*risa que resuena en múltiples dimensiones*',
      '¿Detenerme? ¿A MÍ?',
      '*las luces parpadean y desaparece*',
      'Sistema: ERROR - Visitante no encontrado en celda de detención.'
    ],
    correctReward: { dollars: 0, reputation: 0, unlocks: ['walker_encounter'] },
    incorrectConsequence: {
      reputationChange: 0,
      specialFlag: 'walker_interested',
      narrative: 'El Caminante se ha fijado en ti. No sabes si eso es bueno o malo.'
    },
    unlocksStory: 'walker_mystery',
    hasBeenSeen: false
  },
];

/** Get random special event for given conditions */
export function getRandomSpecialEvent(
  day: number,
  reputation: number,
  totalDecisions: number,
  dollars: number,
  occurredEvents: string[]
): SpecialEvent | null {
  const eligibleEvents = SPECIAL_EVENTS.filter(event => {
    // Already occurred and can't repeat
    if (occurredEvents.includes(event.id) && !event.canRepeat) return false;

    // Check trigger day
    if (event.triggerDay !== null && event.triggerDay !== day) return false;

    // Check conditions
    return event.triggerConditions.every(condition => {
      switch (condition.type) {
        case 'DAY_RANGE':
          return evaluateCondition(day, condition.operator, condition.value as number);
        case 'REPUTATION':
          return evaluateCondition(reputation, condition.operator, condition.value as number);
        case 'DOLLARS':
          return evaluateCondition(dollars, condition.operator, condition.value as number);
        case 'DECISIONS':
          return evaluateCondition(totalDecisions, condition.operator, condition.value as number);
        default:
          return true;
      }
    });
  });

  // Roll for each event
  for (const event of eligibleEvents) {
    if (Math.random() < event.triggerChance) {
      return event;
    }
  }

  return null;
}

/** Get special visitor if one should appear */
export function getRandomSpecialVisitor(
  day: number,
  seenVisitors: string[]
): SpecialVisitor | null {
  const eligibleVisitors = SPECIAL_VISITORS.filter(visitor => {
    if (seenVisitors.includes(visitor.id)) return false;
    if (visitor.appearDay !== null && visitor.appearDay !== day) return false;
    return true;
  });

  for (const visitor of eligibleVisitors) {
    if (Math.random() < visitor.appearChance) {
      return visitor;
    }
  }

  return null;
}

/** Helper function to evaluate conditions */
function evaluateCondition(value: number, operator: string, target: number): boolean {
  switch (operator) {
    case '>': return value > target;
    case '<': return value < target;
    case '>=': return value >= target;
    case '<=': return value <= target;
    case '==': return value === target;
    default: return true;
  }
}

/** Get event by ID */
export function getEventById(id: string): SpecialEvent | undefined {
  return SPECIAL_EVENTS.find(e => e.id === id);
}

/** Get special visitor by ID */
export function getSpecialVisitorById(id: string): SpecialVisitor | undefined {
  return SPECIAL_VISITORS.find(v => v.id === id);
}
