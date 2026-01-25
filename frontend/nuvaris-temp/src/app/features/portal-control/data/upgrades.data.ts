/**
 * PORTAL CONTROL - Upgrades Data
 * All purchasable upgrades for the control station
 */

import { StationUpgrade, ConsumableItem } from '../models';

/** All available station upgrades */
export const STATION_UPGRADES: StationUpgrade[] = [
  // === HERRAMIENTAS (Tool Upgrades) ===
  {
    id: 'tool_precision_1',
    name: 'Calibración de Precisión I',
    description: 'Mejora la precisión de todos los escáneres en un 10%.',
    category: 'HERRAMIENTAS',
    cost: 50,
    icon: '🎯',
    requiredDay: 1,
    requiredUpgrades: [],
    requiredReputation: 0,
    effects: [
      { type: 'TOOL_ACCURACY_BOOST', value: 10, description: '+10% precisión' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'tool_precision_2',
    name: 'Calibración de Precisión II',
    description: 'Mejora adicional de precisión. Detecta anomalías más sutiles.',
    category: 'HERRAMIENTAS',
    cost: 150,
    icon: '🎯',
    requiredDay: 5,
    requiredUpgrades: ['tool_precision_1'],
    requiredReputation: 30,
    effects: [
      { type: 'TOOL_ACCURACY_BOOST', value: 15, description: '+15% precisión' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'tool_cooldown_1',
    name: 'Sistema de Enfriamiento Rápido',
    description: 'Reduce el tiempo de espera entre usos de herramientas en 20%.',
    category: 'HERRAMIENTAS',
    cost: 75,
    icon: '❄️',
    requiredDay: 2,
    requiredUpgrades: [],
    requiredReputation: 0,
    effects: [
      { type: 'TOOL_COOLDOWN_REDUCTION', value: 20, description: '-20% cooldown' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'tool_cooldown_2',
    name: 'Sistema de Enfriamiento Avanzado',
    description: 'Enfriamiento criogénico. Reduce el cooldown en un 35%.',
    category: 'HERRAMIENTAS',
    cost: 200,
    icon: '🧊',
    requiredDay: 7,
    requiredUpgrades: ['tool_cooldown_1'],
    requiredReputation: 40,
    effects: [
      { type: 'TOOL_COOLDOWN_REDUCTION', value: 35, description: '-35% cooldown' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'auto_mass_scan',
    name: 'Auto-Escáner de Masa',
    description: 'El escáner de masa se activa automáticamente cuando llega un visitante.',
    category: 'HERRAMIENTAS',
    cost: 120,
    icon: '⚖️',
    requiredDay: 4,
    requiredUpgrades: [],
    requiredReputation: 25,
    effects: [
      { type: 'AUTO_SCAN', value: 1, description: 'Auto-escaneo de masa' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 1
  },
  {
    id: 'auto_thermo_scan',
    name: 'Auto-Termógrafo',
    description: 'El termógrafo se activa automáticamente cuando llega un visitante.',
    category: 'HERRAMIENTAS',
    cost: 120,
    icon: '🌡️',
    requiredDay: 4,
    requiredUpgrades: [],
    requiredReputation: 25,
    effects: [
      { type: 'AUTO_SCAN', value: 2, description: 'Auto-escaneo térmico' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 1
  },

  // === ESTACIÓN (Station Improvements) ===
  {
    id: 'station_comfort_1',
    name: 'Silla Ergonómica',
    description: 'Una silla más cómoda te permite trabajar mejor. +15 segundos por día.',
    category: 'ESTACION',
    cost: 40,
    icon: '🪑',
    requiredDay: 1,
    requiredUpgrades: [],
    requiredReputation: 0,
    effects: [
      { type: 'TIME_EXTENSION', value: 15, description: '+15s por día' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'station_comfort_2',
    name: 'Escritorio Ampliado',
    description: 'Más espacio para documentos. +30 segundos por día.',
    category: 'ESTACION',
    cost: 100,
    icon: '🗄️',
    requiredDay: 3,
    requiredUpgrades: ['station_comfort_1'],
    requiredReputation: 20,
    effects: [
      { type: 'TIME_EXTENSION', value: 30, description: '+30s por día' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'station_lighting',
    name: 'Iluminación Mejorada',
    description: 'Mejor luz para detectar irregularidades. Resalta errores en documentos.',
    category: 'ESTACION',
    cost: 80,
    icon: '💡',
    requiredDay: 2,
    requiredUpgrades: [],
    requiredReputation: 0,
    effects: [
      { type: 'ERROR_HIGHLIGHT', value: 1, description: 'Resalta errores obvios' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 2
  },
  {
    id: 'station_lighting_2',
    name: 'Iluminación Forense',
    description: 'Luz especializada que revela más detalles ocultos.',
    category: 'ESTACION',
    cost: 180,
    icon: '🔦',
    requiredDay: 6,
    requiredUpgrades: ['station_lighting'],
    requiredReputation: 35,
    effects: [
      { type: 'ERROR_HIGHLIGHT', value: 2, description: 'Resalta todos los errores' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 2
  },
  {
    id: 'station_ventilation',
    name: 'Sistema de Ventilación',
    description: 'Aire fresco te mantiene alerta. +1 advertencia máxima.',
    category: 'ESTACION',
    cost: 250,
    icon: '🌀',
    requiredDay: 5,
    requiredUpgrades: [],
    requiredReputation: 30,
    effects: [
      { type: 'EXTRA_WARNING', value: 1, description: '+1 advertencia permitida' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 2
  },

  // === PERSONAL (Personal Perks) ===
  {
    id: 'personal_intuition',
    name: 'Instinto de Inspector',
    description: 'Tu experiencia te da pistas sobre los visitantes.',
    category: 'PERSONAL',
    cost: 100,
    icon: '🧿',
    requiredDay: 3,
    requiredUpgrades: [],
    requiredReputation: 20,
    effects: [
      { type: 'VISITOR_INSIGHT', value: 1, description: 'Pistas básicas' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'personal_intuition_2',
    name: 'Sexto Sentido',
    description: 'Puedes sentir cuando algo no está bien.',
    category: 'PERSONAL',
    cost: 250,
    icon: '👁️‍🗨️',
    requiredDay: 8,
    requiredUpgrades: ['personal_intuition'],
    requiredReputation: 50,
    effects: [
      { type: 'VISITOR_INSIGHT', value: 2, description: 'Pistas avanzadas' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'personal_reputation_shield',
    name: 'Buena Reputación',
    description: 'Tu historial te protege. Reduces pérdida de reputación en 25%.',
    category: 'PERSONAL',
    cost: 150,
    icon: '🛡️',
    requiredDay: 4,
    requiredUpgrades: [],
    requiredReputation: 35,
    effects: [
      { type: 'REPUTATION_PROTECTION', value: 25, description: '-25% pérdida de reputación' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 2
  },
  {
    id: 'personal_speed_master',
    name: 'Procesamiento Veloz',
    description: 'Tu eficiencia es reconocida. +50% bonus por velocidad.',
    category: 'PERSONAL',
    cost: 120,
    icon: '⚡',
    requiredDay: 3,
    requiredUpgrades: [],
    requiredReputation: 25,
    effects: [
      { type: 'SPEED_BONUS_INCREASE', value: 50, description: '+50% bonus velocidad' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 2
  },

  // === TECNOLOGÍA (Tech Upgrades) ===
  {
    id: 'tech_database_upgrade',
    name: 'Base de Datos Ampliada',
    description: 'Acceso a más registros de fugitivos y criminales.',
    category: 'TECNOLOGIA',
    cost: 200,
    icon: '🗃️',
    requiredDay: 5,
    requiredUpgrades: [],
    requiredReputation: 30,
    effects: [
      { type: 'TOOL_ACCURACY_BOOST', value: 20, description: '+20% detección fugitivos' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 2
  },
  {
    id: 'tech_ai_assistant',
    name: 'Asistente IA Básico',
    description: 'Una IA te sugiere banderas rojas que podrías haber pasado.',
    category: 'TECNOLOGIA',
    cost: 300,
    icon: '🤖',
    requiredDay: 7,
    requiredUpgrades: [],
    requiredReputation: 45,
    effects: [
      { type: 'VISITOR_INSIGHT', value: 3, description: 'Sugerencias de IA' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 1
  },
  {
    id: 'tech_bonus_multiplier',
    name: 'Contrato Mejorado',
    description: 'Mejor paga por tu trabajo. +20% de dólares ganados.',
    category: 'TECNOLOGIA',
    cost: 180,
    icon: '📈',
    requiredDay: 4,
    requiredUpgrades: [],
    requiredReputation: 30,
    effects: [
      { type: 'DOLLARS_MULTIPLIER', value: 20, description: '+20% ganancias' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'tech_special_visitors',
    name: 'Canal VIP',
    description: 'Atrae más visitantes especiales con recompensas únicas.',
    category: 'TECNOLOGIA',
    cost: 220,
    icon: '⭐',
    requiredDay: 6,
    requiredUpgrades: [],
    requiredReputation: 40,
    effects: [
      { type: 'SPECIAL_VISITOR_CHANCE', value: 15, description: '+15% visitantes especiales' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 2
  },

  // === DECISIONES ESPECIALES ===
  {
    id: 'decision_quarantine',
    name: 'Protocolo de Cuarentena',
    description: 'Desbloquea la opción de enviar visitantes a cuarentena.',
    category: 'TECNOLOGIA',
    cost: 150,
    icon: '🏥',
    requiredDay: 3,
    requiredUpgrades: [],
    requiredReputation: 20,
    effects: [
      { type: 'NEW_DECISION_OPTION', value: 1, description: 'Opción: Cuarentena' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 1
  },
  {
    id: 'decision_omega',
    name: 'Acceso Nivel Omega',
    description: 'Autorización para enviar amenazas extremas al Sector Omega.',
    category: 'TECNOLOGIA',
    cost: 400,
    icon: 'Ω',
    requiredDay: 10,
    requiredUpgrades: ['decision_quarantine'],
    requiredReputation: 60,
    effects: [
      { type: 'NEW_DECISION_OPTION', value: 2, description: 'Opción: Sector Omega' }
    ],
    isPurchased: false,
    level: 0,
    maxLevel: 1
  },
];

/** Consumable items available for purchase */
export const CONSUMABLE_ITEMS: ConsumableItem[] = [
  {
    id: 'skip_visitor',
    name: 'Pase de Emergencia',
    description: 'Salta al siguiente visitante sin penalización.',
    cost: 30,
    icon: '⏭️',
    quantity: 0,
    maxQuantity: 3,
    effect: 'SKIP_VISITOR'
  },
  {
    id: 'extra_time',
    name: 'Prórroga',
    description: 'Añade 30 segundos al tiempo restante del día.',
    cost: 25,
    icon: '⏱️',
    quantity: 0,
    maxQuantity: 5,
    effect: 'EXTRA_TIME'
  },
  {
    id: 'reveal_truth',
    name: 'Informe Clasificado',
    description: 'Revela si el visitante actual es legítimo o no.',
    cost: 50,
    icon: '📋',
    quantity: 0,
    maxQuantity: 2,
    effect: 'REVEAL_TRUTH'
  },
  {
    id: 'remove_warning',
    name: 'Disculpa Oficial',
    description: 'Elimina una advertencia de tu expediente.',
    cost: 100,
    icon: '📜',
    quantity: 0,
    maxQuantity: 2,
    effect: 'REMOVE_WARNING'
  },
  {
    id: 'double_reward',
    name: 'Bono de Productividad',
    description: 'Duplica la recompensa de tu próxima decisión correcta.',
    cost: 40,
    icon: '💰',
    quantity: 0,
    maxQuantity: 3,
    effect: 'DOUBLE_REWARD'
  },
];

/** Get upgrade by ID */
export function getUpgradeById(id: string): StationUpgrade | undefined {
  return STATION_UPGRADES.find(u => u.id === id);
}

/** Get upgrades by category */
export function getUpgradesByCategory(category: StationUpgrade['category']): StationUpgrade[] {
  return STATION_UPGRADES.filter(u => u.category === category);
}

/** Get available upgrades for a given day and reputation */
export function getAvailableUpgrades(
  day: number,
  reputation: number,
  purchasedUpgrades: string[]
): StationUpgrade[] {
  return STATION_UPGRADES.filter(upgrade => {
    // Check if already purchased at max level
    if (purchasedUpgrades.includes(upgrade.id) && upgrade.level >= upgrade.maxLevel) {
      return false;
    }

    // Check day requirement
    if (upgrade.requiredDay > day) return false;

    // Check reputation requirement
    if (upgrade.requiredReputation > reputation) return false;

    // Check prerequisite upgrades
    const hasPrerequisites = upgrade.requiredUpgrades.every(
      reqId => purchasedUpgrades.includes(reqId)
    );
    if (!hasPrerequisites) return false;

    return true;
  });
}

/** Calculate upgrade cost (increases with level) */
export function calculateUpgradeCost(upgrade: StationUpgrade): number {
  const levelMultiplier = 1 + (upgrade.level * 0.5);
  return Math.floor(upgrade.cost * levelMultiplier);
}
