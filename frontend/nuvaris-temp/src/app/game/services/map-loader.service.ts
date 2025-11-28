import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ============================================
// MAP DATA INTERFACES
// ============================================

export interface PortalConfig {
    homeRange: number;
    detectionRange: number;
    returnThreshold: number;
    maxEnemies: number;
    spawnRate: number;
}

export interface MapObject {
    id: string;
    type: 'wall' | 'portal' | 'spawn';
    subtype?: string;
    position: { x: number; z: number };
    rotation?: number;
    scale?: { x: number; z: number };
    config?: PortalConfig;
}

export interface MapData {
    name: string;
    version: string;
    gridSize: number;
    playerSpawn?: { x: number; z: number };
    objects: MapObject[];
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
    private readonly AVAILABLE_MAPS = ['default', 'small-arena'];

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
            const mapData = await firstValueFrom(
                this.http.get<MapData>(url)
            );

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
     * Load map from raw JSON data (for editor integration)
     */
    loadFromData(mapData: MapData): MapData {
        this.currentMapName = mapData.name || 'custom';
        this.currentMapData = mapData;
        console.log(`[MapLoader] Loaded custom map: ${this.currentMapName}`);
        return mapData;
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
}
