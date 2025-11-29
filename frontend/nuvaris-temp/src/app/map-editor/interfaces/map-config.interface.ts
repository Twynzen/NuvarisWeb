/**
 * Map Editor Configuration Interfaces
 * Based on mathematical analysis of QDT Sector Omega
 */

export interface Vector3Config {
  x: number;
  y: number;
  z: number;
}

export interface MapConfig {
  id: string;
  name: string;
  version: string;
  size: MapSize;
  bounds: MapBounds;
  ground: GroundConfig;
  walls: WallConfig[];
  portals: PortalConfig[];
  biomes: BiomeConfig[];
  objects: ObjectConfig[];
  spawnPoints: SpawnPointConfig[];
  lighting: LightingConfig;
  fog: FogConfig;
}

export interface MapSize {
  width: number;      // Default: 200
  height: number;     // Default: 200
  gridDivisions: number; // Default: 40
}

export interface MapBounds {
  playableRadius: number;  // Default: 98
  wallOffset: number;      // Default: 100
}

export interface GroundConfig {
  color: number;
  gridVisible: boolean;
  gridDivisions: number;
  gridColor1: number;
  gridColor2: number;
}

export interface WallConfig {
  id: string;
  type: 'perimeter' | 'internal' | 'custom';
  position: Vector3Config;
  dimensions: Vector3Config;
  rotation: Vector3Config;
  texture: string;
  isCollidable: boolean;
}

export interface PortalConfig {
  id: string;
  type: 'spider' | 'worm' | 'custom';
  position: Vector3Config;
  homeRange: number;
  detectionRange: number;
  returnThreshold: number;
  maxEnemies: number;
  spawnRate: number;
  isActive: boolean;
}

export type BiomeType = 'VOID' | 'CRYSTAL' | 'INFERNO' | 'TOXIC' | 'STORM';

export interface BiomeConfig {
  id: string;
  type: BiomeType;
  position: Vector3Config;
  radius: number;
  color: number;
  accentColor?: number;
  enemyModifier: number;
}

export interface ObjectConfig {
  id: string;
  type: 'cylinder' | 'box' | 'sphere' | 'custom';
  position: Vector3Config;
  dimensions: Vector3Config;
  rotation: Vector3Config;
  color: number;
  isCollidable: boolean;
  layer: 'decoration' | 'obstacle' | 'interactive';
}

export interface SpawnPointConfig {
  id: string;
  type: 'player' | 'enemy' | 'item';
  position: Vector3Config;
  radius: number;
  isDefault: boolean;
}

export interface LightingConfig {
  ambientColor: number;
  ambientIntensity: number;
  directionalColor: number;
  directionalIntensity: number;
  directionalPosition: Vector3Config;
}

export interface FogConfig {
  enabled: boolean;
  color: number;
  near: number;
  far: number;
}

// Default configuration based on current map
export const DEFAULT_MAP_CONFIG: MapConfig = {
  id: 'sector-omega-default',
  name: 'Sector Omega - Default',
  version: '1.0.0',
  size: {
    width: 200,
    height: 200,
    gridDivisions: 40
  },
  bounds: {
    playableRadius: 98,
    wallOffset: 100
  },
  ground: {
    color: 0x0a0a1a,
    gridVisible: true,
    gridDivisions: 40,
    gridColor1: 0x00f5ff,
    gridColor2: 0x1a1a2e
  },
  walls: [
    { id: 'wall_north', type: 'perimeter', position: { x: 0, y: 4, z: 100 }, dimensions: { x: 200, y: 8, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, texture: 'assets/environment/wall_1.png', isCollidable: true },
    { id: 'wall_south', type: 'perimeter', position: { x: 0, y: 4, z: -100 }, dimensions: { x: 200, y: 8, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, texture: 'assets/environment/wall_1.png', isCollidable: true },
    { id: 'wall_east', type: 'perimeter', position: { x: 100, y: 4, z: 0 }, dimensions: { x: 2, y: 8, z: 200 }, rotation: { x: 0, y: 0, z: 0 }, texture: 'assets/environment/wall_1.png', isCollidable: true },
    { id: 'wall_west', type: 'perimeter', position: { x: -100, y: 4, z: 0 }, dimensions: { x: 2, y: 8, z: 200 }, rotation: { x: 0, y: 0, z: 0 }, texture: 'assets/environment/wall_1.png', isCollidable: true }
  ],
  portals: [
    { id: 'spider_1', type: 'spider', position: { x: -40, y: 0, z: -40 }, homeRange: 20, detectionRange: 30, returnThreshold: 40, maxEnemies: 10, spawnRate: 2, isActive: true },
    { id: 'spider_2', type: 'spider', position: { x: 40, y: 0, z: 40 }, homeRange: 20, detectionRange: 30, returnThreshold: 40, maxEnemies: 10, spawnRate: 2, isActive: true },
    { id: 'worm_1', type: 'worm', position: { x: -40, y: 0, z: 40 }, homeRange: 15, detectionRange: 25, returnThreshold: 35, maxEnemies: 10, spawnRate: 2, isActive: true },
    { id: 'worm_2', type: 'worm', position: { x: 40, y: 0, z: -40 }, homeRange: 15, detectionRange: 25, returnThreshold: 35, maxEnemies: 10, spawnRate: 2, isActive: true }
  ],
  biomes: [],
  objects: [],
  spawnPoints: [
    { id: 'player_spawn', type: 'player', position: { x: 0, y: 0, z: 0 }, radius: 5, isDefault: true }
  ],
  lighting: {
    ambientColor: 0x222244,
    ambientIntensity: 0.5,
    directionalColor: 0xffffff,
    directionalIntensity: 0.8,
    directionalPosition: { x: 50, y: 100, z: 50 }
  },
  fog: {
    enabled: true,
    color: 0x0a0a1a,
    near: 30,
    far: 100
  }
};
