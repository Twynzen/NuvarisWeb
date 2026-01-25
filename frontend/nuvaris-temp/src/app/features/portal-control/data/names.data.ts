/**
 * PORTAL CONTROL - Names Data
 * Name generation data for each species
 */

import { SpeciesId } from '../models';

/** Name generation patterns */
export interface NamePattern {
  prefixes: string[];
  roots: string[];
  suffixes: string[];
  connectors: string[];
  titles?: string[];
}

/** Human names (Earth origin) */
export const HUMAN_NAMES: NamePattern = {
  prefixes: [],
  roots: [
    'John', 'María', 'Ahmed', 'Yuki', 'Olga', 'Carlos', 'Mei',
    'Dmitri', 'Fatima', 'Hans', 'Priya', 'Lucas', 'Aisha',
    'Chen', 'Elena', 'Kofi', 'Isabella', 'Raj', 'Sophie'
  ],
  suffixes: [
    'Smith', 'García', 'Kim', 'Müller', 'Silva', 'Yamamoto',
    'Petrov', 'Okafor', 'Johansson', 'Patel', 'Costa', 'Andersen',
    'Nakamura', 'López', 'Dubois', 'Kowalski', 'Chen', 'Okonkwo'
  ],
  connectors: [' '],
  titles: ['Dr.', 'Prof.', 'Ing.', 'Lic.'],
};

/** Vulnari names (Melodic, ethereal) */
export const VULNARI_NAMES: NamePattern = {
  prefixes: ['Mel', 'Ét', 'Lum', 'Cán', 'Son', 'Arm', 'Neb', 'Cel'],
  roots: [
    'odía', 'erea', 'inar', 'tico', 'ora', 'onia', 'ula', 'esto',
    'anta', 'ira', 'ena', 'ura', 'iel', 'ana', 'ova', 'isa'
  ],
  suffixes: [
    ' del Primer Canto',
    ' del Tercer Canto',
    ' del Séptimo Canto',
    ' de la Bruma Eterna',
    ' del Eco Perdido',
    ' de las Nubes Bajas',
    ' del Último Suspiro',
    ' de la Melodía Rota',
    ''
  ],
  connectors: ['\'', '-'],
  titles: ['Cantor', 'Cantora', 'Resonante', 'Armonista'],
};

/** Exópodo names (Hive-based, numeric) */
export const EXOPODO_NAMES: NamePattern = {
  prefixes: ['Zx', 'Kl', 'Vr', 'Tx', 'Qz', 'Nx', 'Bz', 'Cr'],
  roots: [
    'ikk', 'arr', 'onn', 'utt', 'ess', 'izz', 'akk', 'oll',
    'irr', 'att', 'enn', 'uzz', 'okk', 'ill', 'arr', 'ezz'
  ],
  suffixes: [
    '-7', '-12', '-3', '-45', '-8', '-21', '-99', '-1',
    '-Alpha', '-Beta', '-Gamma', '-Delta', '-Omega'
  ],
  connectors: ['\'', '-'],
  titles: ['Obrero', 'Soldado', 'Explorador', 'Arquitecto', 'Guardián'],
};

/** Reptiliano names (Harsh, warrior-like) */
export const REPTILIANO_NAMES: NamePattern = {
  prefixes: ['Kra', 'Dra', 'Gor', 'Thr', 'Ska', 'Vex', 'Zar', 'Rax'],
  roots: [
    'kos', 'gor', 'thar', 'nix', 'vok', 'rax', 'dak', 'mor',
    'gul', 'thak', 'sar', 'vorn', 'kral', 'dex', 'zok', 'rak'
  ],
  suffixes: [
    ' el Fuerte',
    ' el Implacable',
    ' Escamas de Hierro',
    ' Sangre Fría',
    ' el Silencioso',
    ' Garras de Obsidiana',
    ' el Veterano',
    ' Cola de Acero',
    ''
  ],
  connectors: ['\'', '-', ''],
  titles: ['Guerrero', 'Guardián', 'General', 'Campeón', 'Cazador'],
};

/** Inmigrante names (Alien, unpronounceable) */
export const INMIGRANTE_NAMES: NamePattern = {
  prefixes: [
    'K\'', 'Zz\'', 'Ñ\'', 'Xq\'', '∆', 'Ω', 'Θ', '§',
    'Vlk', 'Nrg', 'Qth', 'Bzz', 'Prk', 'Glm', 'Frx'
  ],
  roots: [
    'tharr', 'zzyx', 'qwrp', 'blrg', 'fnrd', 'glxx', 'prmn',
    'xkcd', 'thrp', 'mlkv', 'bzzt', 'clnk', 'vrmp', 'zrng',
    '∞∞', '◊◊', '≈≈', '††'
  ],
  suffixes: [
    '-de-Dimensión-7',
    '-del-Vacío',
    '-Sin-Forma',
    '-Viajero-Eterno',
    '-de-los-Confines',
    '-Entre-Mundos',
    '-de-la-Grieta',
    '-Transdimensional',
    ''
  ],
  connectors: ['\'', '-', ':', '∴'],
  titles: ['Viajero', 'Refugiado', 'Explorador', 'Emisario', 'Náufrago'],
};

/** Names by species */
export const NAMES_BY_SPECIES: Map<SpeciesId, NamePattern> = new Map([
  ['HUMANO', HUMAN_NAMES],
  ['VULNARI', VULNARI_NAMES],
  ['EXOPODO', EXOPODO_NAMES],
  ['REPTILIANO', REPTILIANO_NAMES],
  ['INMIGRANTE', INMIGRANTE_NAMES],
]);

/** Travel purposes with descriptions */
export const TRAVEL_PURPOSES = {
  TURISMO: {
    name: 'Turismo',
    descriptions: [
      'Visitar las Ruinas de Cristal de Ithor',
      'Ver el Festival de las Luces',
      'Fotografiar los volcanes activos',
      'Recorrer los mercados dimensionales',
      'Presenciar el Canto de los Vulnari',
    ],
  },
  NEGOCIOS: {
    name: 'Negocios',
    descriptions: [
      'Reunión con socios comerciales',
      'Negociar contratos de mineral',
      'Establecer ruta de comercio',
      'Auditoría de sucursal local',
      'Conferencia de tecnología dimensional',
    ],
  },
  REFUGIO: {
    name: 'Refugio',
    descriptions: [
      'Huyendo de Devoradores de Soles',
      'Dimensión de origen colapsada',
      'Persecución política',
      'Catástrofe natural dimensional',
      'Guerra interdimensional',
    ],
  },
  PEREGRINACION: {
    name: 'Peregrinación',
    descriptions: [
      'Visitar el Templo de La Intención',
      'Meditar en Nau-Vel',
      'Completar el Camino de los Ancestros',
      'Buscar iluminación cósmica',
      'Rendir homenaje a los Primeros',
    ],
  },
  TRABAJO: {
    name: 'Trabajo',
    descriptions: [
      'Contrato laboral en las forjas',
      'Posición en QDT Corporation',
      'Trabajo temporal en construcción',
      'Servicios de traducción',
      'Contrato de seguridad',
    ],
  },
  REUNION_FAMILIAR: {
    name: 'Reunión Familiar',
    descriptions: [
      'Visitar a familia residente',
      'Ceremonia de unión',
      'Nacimiento de familiar',
      'Cuidado de pariente enfermo',
      'Reunión de colmena (Exópodos)',
    ],
  },
  DIPLOMACIA: {
    name: 'Diplomacia',
    descriptions: [
      'Misión diplomática oficial',
      'Negociaciones de paz',
      'Representación de embajada',
      'Firma de tratados',
      'Visita de estado',
    ],
  },
  INVESTIGACION: {
    name: 'Investigación',
    descriptions: [
      'Estudio de portales dimensionales',
      'Investigación biológica',
      'Arqueología interdimensional',
      'Documentación cultural',
      'Proyecto científico colaborativo',
    ],
  },
  TRATAMIENTO_MEDICO: {
    name: 'Tratamiento Médico',
    descriptions: [
      'Tratamiento especializado',
      'Cirugía dimensional',
      'Terapia de radiación inversa',
      'Consulta con especialistas Vulnari',
      'Rehabilitación post-viaje dimensional',
    ],
  },
  TRANSITO: {
    name: 'Tránsito',
    descriptions: [
      'Conexión a otro portal',
      'Paso temporal hacia destino final',
      'Escala técnica obligatoria',
      'Ruta de tránsito establecida',
      'Parada de reabastecimiento',
    ],
  },
  OTRO: {
    name: 'Otro',
    descriptions: [
      'Motivo personal no especificado',
      'Clasificado',
      'Múltiples propósitos',
      'Exploración general',
      'Información confidencial',
    ],
  },
};

/** Cities for travel destinations */
export const DESTINATION_CITIES = [
  { name: 'Ithor', description: 'Capital Administrativa', restricted: false },
  { name: 'Khrale', description: 'Fortaleza Guerrera', restricted: false },
  { name: 'Nau-Vel', description: 'Ciudad Flotante Mística', restricted: false },
  { name: 'Armonía Vulnari', description: 'Ciudad del Canto', restricted: false },
  { name: 'Sector Omega', description: 'Instalación QDT', restricted: true },
  { name: 'Forjas de Obsidiana', description: 'Zona Industrial', restricted: false },
  { name: 'Mercado Dimensional', description: 'Zona Comercial', restricted: false },
  { name: 'Cielo de Vapor', description: 'Región Atmosférica', restricted: false },
];

/** Banned origins (changes by day) */
export const POTENTIALLY_BANNED_ORIGINS = [
  { name: 'Dimensión Roja', reason: 'Conflicto activo' },
  { name: 'Sector Cuarentena-7', reason: 'Brote parasitario' },
  { name: 'Vacío Exterior', reason: 'Entidades hostiles' },
  { name: 'Tierra-Muerta', reason: 'Contaminación dimensional' },
  { name: 'Dimensión Espejo', reason: 'Actividad mimética' },
  { name: 'Grieta Omega', reason: 'Inestabilidad crítica' },
  { name: 'Mundo Cristal', reason: 'Cuarentena temporal' },
  { name: 'Nexo Perdido', reason: 'Comunicaciones cortadas' },
];
