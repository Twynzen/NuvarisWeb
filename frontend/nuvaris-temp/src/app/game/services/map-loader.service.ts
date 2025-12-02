import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ============================================
// MAP DATA INTERFACES (Normalized Format)
// ============================================

export interface PortalConfig {
    homeRange: number;
    detectionRange: number;
    returnThreshold: number;
    maxEnemies: number;
    spawnRate: number;
}

export interface DoorMapConfig {
    width: number;
    height?: number;
    depth?: number;
    type: 'small' | 'large' | 'garage' | 'custom';
    isOpen: boolean;
    locked?: boolean;
    autoClose?: boolean;
    autoCloseDelay?: number;
    linkedTo?: string;
}

export interface MapObject {
    id: string;
    type: 'wall' | 'portal' | 'spawn' | 'door';
    subtype?: string;
    position: { x: number; z: number };
    rotation?: number;
    scale?: { x: number; z: number };
    config?: PortalConfig | DoorMapConfig;
}

export interface MapData {
    name: string;
    version: string;
    gridSize?: number;
    size?: { width: number; height: number };
    playerSpawn?: { x: number; z: number };
    objects: MapObject[];
}

// ============================================
// LEGACY/PROCEDURAL FORMAT INTERFACES
// (Format from procedural generator)
// ============================================

interface LegacyWall {
    id: string;
    position: [number, number];  // [x, z] array
    size: [number, number];      // [width, depth] array
    type: string;
}

interface LegacyPortal {
    id: string;
    position: [number, number];  // [x, z] array
    type: 'spider' | 'worm';
    homeRange: number;
    detectionRange: number;
    maxEnemies: number;
    spawnRate: number;
}

interface LegacySpawnPoint {
    id: string;
    position: [number, number];  // [x, z] array
    type: string;
}

interface LegacyDoor {
    id: string;
    position: [number, number];  // [x, z] array
    size: [number, number];      // [width, depth] array
    state: 'open' | 'closed';
    locked?: boolean;
}

interface LegacyMapData {
    id?: string;
    name: string;
    version: string;
    size?: { width: number; height: number };
    walls: LegacyWall[];
    portals: LegacyPortal[];
    spawnPoints: LegacySpawnPoint[];
    doors?: LegacyDoor[];
}

// ============================================
// MAP LOADER SERVICE
// ============================================

@Injectable({
    providedIn: 'root'
})
export class MapLoaderService {
    // Available maps - hardcoded list for now
    // In production, this could be fetched from a server
    private readonly AVAILABLE_MAPS = ['legacy', 'labyrinth', 'default', 'small-arena', 'sector-omega', 'nivel1-lab'];

    private currentMapName: string = '';
    private currentMapData: MapData | null = null;

    constructor(private http: HttpClient) {}

    /**
     * Get list of available map names
     */
    getAvailableMaps(): string[] {
        return [...this.AVAILABLE_MAPS];
    }

    /**
     * Get current loaded map name
     */
    getCurrentMapName(): string {
        return this.currentMapName || 'none';
    }

    /**
     * Get current map data
     */
    getCurrentMapData(): MapData | null {
        return this.currentMapData;
    }

    /**
     * Load a map by name from assets/maps/
     */
    async loadByName(mapName: string): Promise<MapData> {
        const url = `assets/maps/${mapName}.json`;

        try {
            const rawData = await firstValueFrom(
                this.http.get<any>(url)
            );

            // Normalize the map data (handles both formats)
            const mapData = this.normalizeMapFormat(rawData);

            this.currentMapName = mapName;
            this.currentMapData = mapData;

            console.log(`[MapLoader] Loaded map: ${mapName} (${mapData.objects.length} objects)`);
            return mapData;
        } catch (error) {
            console.error(`[MapLoader] Failed to load map: ${mapName}`, error);
            throw new Error(`Map "${mapName}" not found`);
        }
    }

    /**
     * Load raw map data without normalization (for format detection)
     */
    async loadRawByName(mapName: string): Promise<any> {
        const url = `assets/maps/${mapName}.json`;

        try {
            const rawData = await firstValueFrom(
                this.http.get<any>(url)
            );
            console.log(`[MapLoader] Loaded raw map data: ${mapName}`);
            return rawData;
        } catch (error) {
            console.error(`[MapLoader] Failed to load map: ${mapName}`, error);
            throw new Error(`Map "${mapName}" not found`);
        }
    }

    /**
     * Load map from raw JSON data (for editor integration)
     */
    loadFromData(rawData: any): MapData {
        const mapData = this.normalizeMapFormat(rawData);
        this.currentMapName = mapData.name || 'custom';
        this.currentMapData = mapData;
        console.log(`[MapLoader] Loaded custom map: ${this.currentMapName}`);
        return mapData;
    }

    /**
     * Detect and normalize map format
     * Supports both:
     * - New format: { objects: [...] }
     * - Legacy format: { walls: [...], portals: [...], spawnPoints: [...] }
     */
    private normalizeMapFormat(rawData: any): MapData {
        // Check if it's already in the new format (has 'objects' array)
        if (rawData.objects && Array.isArray(rawData.objects)) {
            console.log('[MapLoader] Detected new format (objects array)');
            return rawData as MapData;
        }

        // Check if it's legacy format (has 'walls', 'portals', 'spawnPoints', 'doors')
        if (rawData.walls || rawData.portals || rawData.spawnPoints || rawData.doors) {
            console.log('[MapLoader] Detected legacy format, converting...');
            return this.convertLegacyFormat(rawData as LegacyMapData);
        }

        // Unknown format, return as-is with empty objects
        console.warn('[MapLoader] Unknown map format, returning empty objects');
        return {
            name: rawData.name || 'unknown',
            version: rawData.version || '1.0',
            objects: []
        };
    }

    /**
     * Convert legacy format to normalized format
     */
    private convertLegacyFormat(legacy: LegacyMapData): MapData {
        const objects: MapObject[] = [];

        // Convert walls
        if (legacy.walls) {
            for (const wall of legacy.walls) {
                objects.push({
                    id: wall.id,
                    type: 'wall',
                    subtype: wall.type || 'normal',
                    position: {
                        x: wall.position[0],
                        z: wall.position[1]
                    },
                    scale: {
                        x: wall.size[0],
                        z: wall.size[1]
                    }
                });
            }
        }

        // Convert portals
        if (legacy.portals) {
            for (const portal of legacy.portals) {
                objects.push({
                    id: portal.id,
                    type: 'portal',
                    subtype: portal.type,
                    position: {
                        x: portal.position[0],
                        z: portal.position[1]
                    },
                    config: {
                        homeRange: portal.homeRange,
                        detectionRange: portal.detectionRange,
                        returnThreshold: portal.detectionRange + 10, // Default offset
                        maxEnemies: portal.maxEnemies,
                        spawnRate: portal.spawnRate
                    }
                });
            }
        }

        // Convert spawn points
        if (legacy.spawnPoints) {
            for (const spawn of legacy.spawnPoints) {
                objects.push({
                    id: spawn.id,
                    type: 'spawn',
                    subtype: spawn.type,
                    position: {
                        x: spawn.position[0],
                        z: spawn.position[1]
                    }
                });
            }
        }

        // Convert doors
        if (legacy.doors) {
            for (const door of legacy.doors) {
                // Determine door type based on size
                const width = door.size[0];
                const depth = door.size[1];
                const maxDim = Math.max(width, depth);
                let doorType: 'small' | 'large' | 'garage' | 'custom' = 'custom';
                if (maxDim <= 4) doorType = 'small';
                else if (maxDim <= 6) doorType = 'large';
                else if (maxDim >= 10) doorType = 'garage';

                objects.push({
                    id: door.id,
                    type: 'door',
                    position: {
                        x: door.position[0],
                        z: door.position[1]
                    },
                    // Calculate rotation based on which dimension is larger
                    rotation: width > depth ? 0 : 90,
                    config: {
                        width: Math.max(width, depth),  // Use larger dimension as width
                        depth: Math.min(width, depth),  // Use smaller as depth
                        height: 8,  // Standard door height
                        type: doorType,
                        isOpen: door.state === 'open',
                        locked: door.locked || false,
                        autoClose: true  // Enable auto-close by default
                    }
                });
            }
        }

        const normalized: MapData = {
            name: legacy.name,
            version: legacy.version,
            size: legacy.size,
            objects
        };

        console.log(`[MapLoader] Converted legacy format: ${objects.length} objects (${legacy.walls?.length || 0} walls, ${legacy.portals?.length || 0} portals, ${legacy.spawnPoints?.length || 0} spawns, ${legacy.doors?.length || 0} doors)`);

        return normalized;
    }

    /**
     * Check if a map exists
     */
    mapExists(mapName: string): boolean {
        return this.AVAILABLE_MAPS.includes(mapName);
    }

    /**
     * Get map info summary
     */
    getMapInfo(): { name: string; objects: number; portals: number; walls: number; spawns: number } {
        if (!this.currentMapData) {
            return { name: 'none', objects: 0, portals: 0, walls: 0, spawns: 0 };
        }

        const objects = this.currentMapData.objects;
        return {
            name: this.currentMapName,
            objects: objects.length,
            portals: objects.filter(o => o.type === 'portal').length,
            walls: objects.filter(o => o.type === 'wall').length,
            spawns: objects.filter(o => o.type === 'spawn').length
        };
    }

    /**
     * Extract player spawn position from map data
     */
    getPlayerSpawnPosition(mapData: MapData): { x: number; z: number } {
        // First check explicit playerSpawn
        if (mapData.playerSpawn) {
            return mapData.playerSpawn;
        }

        // Then look for spawn object with subtype 'player'
        const playerSpawn = mapData.objects.find(
            o => o.type === 'spawn' && o.subtype === 'player'
        );

        if (playerSpawn) {
            return playerSpawn.position;
        }

        // Default to center
        return { x: 0, z: 0 };
    }

    /**
     * Extract portal configurations from map data
     */
    getPortalConfigs(mapData: MapData): Array<MapObject & { config: PortalConfig }> {
        return mapData.objects.filter(
            o => o.type === 'portal' && o.config
        ) as Array<MapObject & { config: PortalConfig }>;
    }

    /**
     * Extract wall configurations from map data
     */
    getWallConfigs(mapData: MapData): MapObject[] {
        return mapData.objects.filter(o => o.type === 'wall');
    }

    /**
     * Extract door configurations from map data
     */
    getDoorConfigs(mapData: MapData): Array<MapObject & { config: DoorMapConfig }> {
        return mapData.objects.filter(
            o => o.type === 'door' && o.config
        ) as Array<MapObject & { config: DoorMapConfig }>;
    }

    /**
     * Get map info summary (updated with doors)
     */
    getMapInfoExtended(): {
        name: string;
        objects: number;
        portals: number;
        walls: number;
        spawns: number;
        doors: number;
    } {
        if (!this.currentMapData) {
            return { name: 'none', objects: 0, portals: 0, walls: 0, spawns: 0, doors: 0 };
        }

        const objects = this.currentMapData.objects;
        return {
            name: this.currentMapName,
            objects: objects.length,
            portals: objects.filter(o => o.type === 'portal').length,
            walls: objects.filter(o => o.type === 'wall').length,
            spawns: objects.filter(o => o.type === 'spawn').length,
            doors: objects.filter(o => o.type === 'door').length
        };
    }
}
