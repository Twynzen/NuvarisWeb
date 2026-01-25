/**
 * PORTAL CONTROL - Rules Data
 * Game rules, daily rules, and inspector manual entries
 */

import { SpeciesId, InspectorTool, ManualEntry, ManualCategory, DailyRules } from '../models';

/** Tool definitions */
export const INSPECTOR_TOOLS: Record<InspectorTool, {
  name: string;
  description: string;
  shortDescription: string;
  unlockDay: number;
  useCost: number;
  cooldown: number;
  icon: string;
}> = {
  ESCANER_MASA: {
    name: 'Escáner de Masa',
    description: 'Mide el peso exacto del visitante. Útil para detectar impostores que no pueden replicar la masa corporal de la especie que fingen ser.',
    shortDescription: 'Mide peso real',
    unlockDay: 1,
    useCost: 0,
    cooldown: 2,
    icon: 'scale',
  },
  TERMOGRAFO: {
    name: 'Termógrafo',
    description: 'Mide la temperatura corporal. Los Reptilianos son de sangre fría, los Vulnari son más fríos que el ambiente, y los Humanos mantienen ~36.5°C.',
    shortDescription: 'Mide temperatura',
    unlockDay: 1,
    useCost: 0,
    cooldown: 2,
    icon: 'thermometer',
  },
  LUZ_UV: {
    name: 'Luz Ultravioleta',
    description: 'Revela marcas ocultas, sangre que brilla (Vulnari, Exópodos), y marcas de colmena. También detecta sellos de documentos alterados.',
    shortDescription: 'Revela marcas ocultas',
    unlockDay: 1,
    useCost: 0,
    cooldown: 3,
    icon: 'flashlight',
  },
  MAGNETOMETRO: {
    name: 'Magnetómetro',
    description: 'Detecta presencia de metal. Las escamas de los Reptilianos son metálicas y reaccionan a este escáner.',
    shortDescription: 'Detecta metal',
    unlockDay: 2,
    useCost: 0,
    cooldown: 3,
    icon: 'magnet',
  },
  VISOR_DIMENSIONAL: {
    name: 'Visor Dimensional',
    description: 'Lee la firma dimensional del visitante. Cada dimensión tiene una firma única que debe coincidir con los documentos.',
    shortDescription: 'Lee firma dimensional',
    unlockDay: 3,
    useCost: 5,
    cooldown: 5,
    icon: 'eye',
  },
  DETECTOR_INTENCION: {
    name: 'Detector de Intención',
    description: 'Tecnología Vulnari que detecta mentiras y hostilidad. No es 100% preciso pero ayuda a identificar sospechosos.',
    shortDescription: 'Detecta mentiras',
    unlockDay: 4,
    useCost: 10,
    cooldown: 8,
    icon: 'brain',
  },
  RESONADOR_ULNAR: {
    name: 'Resonador Ulnar',
    description: 'Hace vibrar los Ulnar auténticos de los Vulnari. Un impostor con tentáculos falsos no responderá al resonador.',
    shortDescription: 'Verifica Ulnar',
    unlockDay: 2,
    useCost: 0,
    cooldown: 4,
    icon: 'radio',
  },
  LUPA_DOCUMENTOS: {
    name: 'Lupa de Documentos',
    description: 'Amplifica los documentos para ver detalles pequeños: fechas, sellos, firmas, y posibles alteraciones.',
    shortDescription: 'Amplifica documentos',
    unlockDay: 1,
    useCost: 0,
    cooldown: 1,
    icon: 'search',
  },
  VERIFICADOR_SELLOS: {
    name: 'Verificador de Sellos',
    description: 'Compara los sellos de los documentos con la base de datos oficial. Detecta sellos falsificados o de autoridades inexistentes.',
    shortDescription: 'Verifica sellos oficiales',
    unlockDay: 2,
    useCost: 0,
    cooldown: 3,
    icon: 'stamp',
  },
  BASE_DATOS_CAPTURAS: {
    name: 'Base de Datos de Capturas',
    description: 'Acceso a la lista de fugitivos buscados. Compara la foto del visitante con criminales conocidos.',
    shortDescription: 'Busca fugitivos',
    unlockDay: 3,
    useCost: 5,
    cooldown: 10,
    icon: 'database',
  },
};

/** Manual entries */
export const MANUAL_ENTRIES: ManualEntry[] = [
  // ESPECIES
  {
    id: 'species_humanos',
    category: 'ESPECIES',
    title: 'Humanos',
    content: `Los Humanos son inmigrantes dimensionales de la Tierra.

CARACTERÍSTICAS FÍSICAS:
- Altura: 1.50m - 2.00m
- Peso: 45kg - 120kg
- Temperatura: 36°C - 37.5°C (constante)
- Sangre: Roja, NO brilla bajo UV
- Ojos: Exactamente 2
- Extremidades: 4 (2 brazos, 2 piernas)

CÓMO DETECTAR IMPOSTORES:
- Temperatura incorrecta
- Peso fuera de rango
- Más o menos de 2 ojos
- Cualquier apéndice extra

DOCUMENTOS REQUERIDOS:
- Pasaporte Dimensional
- Visa correspondiente al propósito`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['doc_passport', 'tool_thermograph'],
    relatedSpecies: ['HUMANO'],
  },
  {
    id: 'species_vulnari',
    category: 'ESPECIES',
    title: 'Vulnari',
    content: `Los Vulnari son seres etéreos conocidos por sus Ulnar.

CARACTERÍSTICAS FÍSICAS:
- Altura: 1.60m - 2.10m
- Peso: 35kg - 65kg (ligeros)
- Temperatura: 2°C MENOR que el ambiente
- Sangre: Azul Luminiscente, BRILLA bajo UV
- Ulnar: 4-8 tentáculos cerebrales (OBLIGATORIO)
- Piel: Tonos púrpura, azul, plateado

COMPORTAMIENTO NORMAL:
- Expresión melancólica constante
- Producen melodías sutiles al hablar
- Especialmente al mentir, la melodía se intensifica

CÓMO DETECTAR IMPOSTORES:
- Menos de 4 o más de 8 Ulnar
- No responden al Resonador Ulnar
- Sangre que no brilla bajo UV
- Expresión alegre constante (SOSPECHOSO)
- Sin melodía al hablar

ADVERTENCIA: Los Vulnari auténticos pueden detectar TUS mentiras.`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['tool_ulnar_resonator', 'tool_uv'],
    relatedSpecies: ['VULNARI'],
  },
  {
    id: 'species_exopodos',
    category: 'ESPECIES',
    title: 'Exópodos',
    content: `Los Exópodos son insectoides con estructura de colmena.

CARACTERÍSTICAS FÍSICAS:
- Altura: 1.40m - 1.80m
- Peso: 40kg - 80kg
- Temperatura: Variable (28°C - 35°C)
- Sangre: Ámbar, BRILLA bajo UV
- Extremidades: 4-6 funcionales
- Exoesqueleto: Obligatorio
- Antenas: Par obligatorio
- Ojos: Compuestos (facetados)

MARCA DE COLMENA:
- Código de 6 dígitos en el tórax
- Visible bajo luz UV
- Código #000000 = COLMENA EXTINTA (documento falso)

CASTAS:
- Obrero: Más pequeño, 4 extremidades
- Soldado: Más grande, mandíbulas prominentes
- Noble: Colores más brillantes, 6 extremidades

CÓMO DETECTAR IMPOSTORES:
- Sin exoesqueleto
- Marca de colmena inválida o inexistente
- Sangre que no brilla bajo UV
- Comportamiento incongruente con casta`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['tool_uv'],
    relatedSpecies: ['EXOPODO'],
  },
  {
    id: 'species_reptilianos',
    category: 'ESPECIES',
    title: 'Reptilianos',
    content: `Los Reptilianos son guerreros de sangre fría.

CARACTERÍSTICAS FÍSICAS:
- Altura: 1.90m - 2.40m (MÍNIMO 1.90m)
- Peso: 120kg - 200kg (MÍNIMO 120kg)
- Temperatura: IGUAL al ambiente (sangre fría)
- Sangre: Verde oscuro, no brilla
- Escamas: Metálicas (responden al magnetómetro)
- Cola: Opcional (0.5m - 1m)
- Garras: Retráctiles

COMPORTAMIENTO NORMAL:
- Postura erguida, alerta
- Expresiones faciales mínimas
- Voz grave
- Territoriales (reaccionan a invasión de espacio)

CÓMO DETECTAR IMPOSTORES:
- Peso menor a 120kg
- Altura menor a 1.90m
- Temperatura diferente al ambiente
- Escamas que no responden al magnetómetro
- Emociones exageradas (SOSPECHOSO)

ADVERTENCIA: Los Reptilianos genuinos pueden ser agresivos si se sienten amenazados.`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['tool_magnetometer', 'tool_mass_scanner'],
    relatedSpecies: ['REPTILIANO'],
  },
  {
    id: 'species_inmigrantes',
    category: 'ESPECIES',
    title: 'Inmigrantes Dimensionales',
    content: `Los Inmigrantes son seres de otras dimensiones.

ADVERTENCIA: Esta categoría es la más impredecible.

CARACTERÍSTICAS FÍSICAS:
- Altura: VARIABLE (0.30m - 3.00m)
- Peso: VARIABLE (5kg - 500kg)
- Temperatura: VARIABLE
- Morfología: Humanoide, Amorfo, Etéreo, Mecánico, etc.

VERIFICACIÓN OBLIGATORIA:
1. Firma Dimensional (usar Visor Dimensional)
2. Nivel de Radiación (debe ser seguro)
3. Ausencia de parásitos dimensionales
4. Documentación de origen

SEÑALES DE PELIGRO:
- Radiación dimensional elevada
- Inestabilidad de forma
- Parásitos dimensionales detectados
- Documentos de "Dimensión Prohibida"

CUARENTENA OBLIGATORIA SI:
- Radiación > nivel moderado
- Origen desconocido
- Síntomas de inestabilidad dimensional

DESTINO OMEGA SI:
- Entidad hostil confirmada
- Parásito clase A detectado
- Intento de invasión dimensional`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['tool_dimensional_visor', 'proc_quarantine'],
    relatedSpecies: ['INMIGRANTE'],
  },

  // DOCUMENTOS
  {
    id: 'doc_passport',
    category: 'DOCUMENTOS',
    title: 'Pasaporte Dimensional',
    content: `El Pasaporte Dimensional es el documento principal de identidad.

ELEMENTOS A VERIFICAR:
1. FOTO: Debe coincidir con el portador
   - Número de ojos
   - Apéndices visibles
   - Rasgos distintivos

2. DATOS PERSONALES:
   - Nombre completo
   - Especie declarada
   - Origen dimensional
   - Características físicas registradas

3. FECHAS:
   - Emisión: No futura
   - Expiración: No pasada
   - Formato: "Ciclo XXXX.X"

4. SELLOS:
   - Autoridad emisora válida
   - Código de portal
   - Firma dimensional

5. FIRMA DIMENSIONAL:
   - Patrón único
   - Verificable con Visor Dimensional

ERRORES COMUNES EN FALSIFICACIONES:
- Fechas inconsistentes
- Sellos de autoridades inexistentes
- Foto que no coincide
- Peso/altura fuera de rango de especie`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['tool_document_magnifier', 'tool_seal_verifier'],
  },
  {
    id: 'doc_visa',
    category: 'DOCUMENTOS',
    title: 'Visas y Permisos',
    content: `Las visas autorizan la entrada según el propósito.

TIPOS DE VISA:
- TURISMO: Máximo 30 ciclos, destinos limitados
- TRABAJO: Requiere empleador verificable
- REFUGIADO: Requiere motivo documentado
- DIPLOMÁTICA: Inmunidad según nivel
- TRÁNSITO: Solo paso, tiempo limitado

VERIFICAR:
1. Tipo de visa coincide con propósito declarado
2. Fechas válidas
3. Destino permitido
4. Empleador/sponsor existe (si aplica)

VISAS SOSPECHOSAS:
- Turismo + equipaje de trabajo
- Tránsito + sin ticket de salida
- Refugiado + origen no en conflicto`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['doc_passport'],
  },

  // HERRAMIENTAS
  {
    id: 'tool_thermograph',
    category: 'HERRAMIENTAS',
    title: 'Termógrafo',
    content: `Mide la temperatura corporal del visitante.

USO:
Haz clic en el termógrafo y luego en el visitante.

TEMPERATURAS ESPERADAS:
- Humanos: 36°C - 37.5°C (fija)
- Vulnari: Ambiente - 2°C
- Exópodos: 28°C - 35°C (variable)
- Reptilianos: = Temperatura ambiente
- Inmigrantes: Variable

ANOMALÍAS:
- Humano frío = posible impostor
- Vulnari caliente = posible impostor
- Reptiliano diferente al ambiente = impostor`,
    unlockDay: 1,
    isUnlocked: true,
    relatedTools: ['TERMOGRAFO'],
  },

  // PROCEDIMIENTOS
  {
    id: 'proc_quarantine',
    category: 'PROCEDIMIENTOS',
    title: 'Protocolo de Cuarentena',
    content: `Cuándo enviar a cuarentena:

OBLIGATORIO:
- Radiación dimensional > moderada
- Síntomas de enfermedad dimensional
- Certificado de salud vencido
- Parásito dimensional sospechado

PROCEDIMIENTO:
1. Marcar visitante como CUARENTENA
2. Documentar motivo
3. Notificar a médico de turno
4. NO aprobar ni denegar entrada

DURACIÓN:
- Mínimo: 3 ciclos
- Máximo: Indefinido si hay riesgo`,
    unlockDay: 1,
    isUnlocked: true,
    relatedEntries: ['species_inmigrantes'],
  },
  {
    id: 'proc_omega',
    category: 'PROCEDIMIENTOS',
    title: 'Protocolo Omega',
    content: `CLASIFICACIÓN: ULTRA SECRETO

El Sector Omega es la última línea de defensa.

ENVIAR A OMEGA SI:
- Entidad hostil confirmada
- Parásito dimensional clase A
- Amenaza existencial detectada
- Orden directa del Director Lars

ADVERTENCIA:
- Solo usar en casos extremos
- Decisión irreversible
- Requiere documentación completa
- Posible revisión por supervisores

El Sector Omega no es una prisión común.
Es donde lo desconocido es contenido.`,
    unlockDay: 5,
    isUnlocked: false,
    relatedEntries: ['species_inmigrantes'],
  },
];

/** Generate daily rules based on day number */
export function generateDailyRules(day: number): DailyRules {
  const baseImpostorChance = 0.1 + (day * 0.02);
  const baseErrorChance = 0.15 + (day * 0.025);
  const baseFugitiveChance = 0.05 + (day * 0.015);

  // Determine which species are allowed/banned
  const allSpecies: SpeciesId[] = ['HUMANO', 'VULNARI', 'EXOPODO', 'REPTILIANO', 'INMIGRANTE'];
  let allowedSpecies = [...allSpecies];
  const bannedOrigins: string[] = [];

  // Add some restrictions based on day
  if (day >= 3 && day % 3 === 0) {
    bannedOrigins.push('Dimensión Roja');
  }
  if (day >= 5 && day % 5 === 0) {
    bannedOrigins.push('Sector Cuarentena-7');
  }
  if (day >= 7) {
    bannedOrigins.push('Vacío Exterior');
  }

  // Determine new tools
  const newTools: InspectorTool[] = [];
  Object.entries(INSPECTOR_TOOLS).forEach(([tool, data]) => {
    if (data.unlockDay === day) {
      newTools.push(tool as InspectorTool);
    }
  });

  // Special alerts based on day
  const specialAlerts: DailyRules['specialAlerts'] = [];
  if (day >= 3) {
    specialAlerts.push({
      id: `alert_day_${day}`,
      title: 'Alerta de Seguridad',
      description: 'Se han reportado impostores usando disfraces biológicos.',
      priority: 'medium',
    });
  }
  if (day >= 5) {
    specialAlerts.push({
      id: `fugitive_alert_${day}`,
      title: 'Fugitivo Buscado',
      description: 'Fugitivo peligroso podría intentar cruzar el portal.',
      priority: 'high',
      rewardForCapture: 100 * day,
    });
  }

  return {
    day,
    allowedSpecies,
    bannedOrigins,
    requiredDocuments: ['PASAPORTE_DIMENSIONAL'],
    specialAlerts,
    minApprovals: Math.max(5, 10 - Math.floor(day / 3)),
    maxDenials: 10 + day,
    targetProcessingTime: Math.max(30, 60 - day * 2),
    impostorChance: Math.min(0.4, baseImpostorChance),
    errorChance: Math.min(0.5, baseErrorChance),
    fugitiveChance: Math.min(0.2, baseFugitiveChance),
    newToolsAvailable: newTools,
    newRulesIntroduced: day === 1 ? ['Verificación básica de documentos'] : [],
  };
}

/** Score values */
export const SCORE_VALUES = {
  correctApproval: 10,
  correctDenial: 15,
  correctDetention: 25,
  correctOmega: 50,
  incorrectApproval: -20,
  incorrectDenial: -15,
  missedFugitive: -50,
  missedContraband: -30,
  wronglyDetained: -25,
  speedBonus: 5,
  perfectDay: 100,
};

/** Ambient temperature for the game */
export const AMBIENT_TEMPERATURE = 22; // Celsius
