/**
 * PORTAL CONTROL - Species Service
 * Manages species data and lookups
 */

import { Injectable } from '@angular/core';
import { Species, SpeciesId, SpeciesRegistry } from '../models';
import { SPECIES_DATA, ALL_SPECIES, SPECIES_BY_RARITY } from '../data';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class SpeciesService implements SpeciesRegistry {
  readonly species: Map<SpeciesId, Species>;

  constructor(private logger: LoggerService) {
    this.species = SPECIES_DATA;
    this.logger.info('SpeciesService', `Loaded ${this.species.size} species`);
  }

  /**
   * Get species by ID
   */
  getById(id: SpeciesId): Species | undefined {
    const species = this.species.get(id);
    if (!species) {
      this.logger.warn('SpeciesService', `Species not found: ${id}`);
    }
    return species;
  }

  /**
   * Get species by ID (throws if not found)
   */
  getByIdOrThrow(id: SpeciesId): Species {
    const species = this.getById(id);
    if (!species) {
      const error = new Error(`Species not found: ${id}`);
      this.logger.error('SpeciesService', 'Species not found', error);
      throw error;
    }
    return species;
  }

  /**
   * Get all species
   */
  getAll(): Species[] {
    return ALL_SPECIES;
  }

  /**
   * Get species by category (not implemented in current data model)
   */
  getByCategory(category: string): Species[] {
    // For now, return all species since category isn't in the data
    this.logger.debug('SpeciesService', `Getting species by category: ${category}`);
    return ALL_SPECIES;
  }

  /**
   * Get species by rarity
   */
  getByRarity(rarity: Species['rarity']): Species[] {
    return SPECIES_BY_RARITY[rarity] || [];
  }

  /**
   * Get a random species based on rarity weights
   */
  getRandomSpecies(excludeRare: boolean = false): Species {
    const weights = {
      common: 50,
      uncommon: 30,
      rare: excludeRare ? 0 : 15,
      very_rare: excludeRare ? 0 : 5,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        const speciesOfRarity = this.getByRarity(rarity as Species['rarity']);
        if (speciesOfRarity.length > 0) {
          const selected = speciesOfRarity[Math.floor(Math.random() * speciesOfRarity.length)];
          this.logger.debug('SpeciesService', `Selected random species: ${selected.id} (${rarity})`);
          return selected;
        }
      }
    }

    // Fallback to human
    this.logger.warn('SpeciesService', 'Fallback to HUMANO');
    return this.getByIdOrThrow('HUMANO');
  }

  /**
   * Get species that can impersonate the given species
   */
  getPotentialImpostors(targetSpeciesId: SpeciesId): Species[] {
    const target = this.getById(targetSpeciesId);
    if (!target || !target.canBeImpostor) {
      return [];
    }

    // Any species can try to impersonate another
    return ALL_SPECIES.filter(s => s.id !== targetSpeciesId);
  }

  /**
   * Check if a value is within a species' expected range
   */
  isWithinRange(
    speciesId: SpeciesId,
    field: 'height' | 'weight',
    value: number
  ): boolean {
    const species = this.getById(speciesId);
    if (!species) return false;

    const range = field === 'height' ? species.heightRange : species.weightRange;
    return value >= range.min && value <= range.max;
  }

  /**
   * Get expected temperature for a species
   */
  getExpectedTemperature(speciesId: SpeciesId, ambientTemp: number): { min: number; max: number } {
    const species = this.getById(speciesId);
    if (!species) {
      return { min: 36, max: 37.5 }; // Default human range
    }

    const temp = species.bodyTemperature;

    switch (temp.type) {
      case 'fixed':
        return {
          min: (temp.baseValue || 36.5) - 1,
          max: (temp.baseValue || 36.5) + 1,
        };
      case 'ambient_relative':
        const offset = temp.ambientOffset || 0;
        return {
          min: ambientTemp + offset - 1,
          max: ambientTemp + offset + 1,
        };
      case 'variable':
        return temp.range || { min: 20, max: 40 };
      default:
        return { min: 36, max: 37.5 };
    }
  }

  /**
   * Get identifying features for a species
   */
  getIdentifyingFeatures(speciesId: SpeciesId): Species['identifyingFeatures'] {
    const species = this.getById(speciesId);
    return species?.identifyingFeatures || [];
  }

  /**
   * Get detection rules for a species
   */
  getDetectionRules(speciesId: SpeciesId): Species['detectionRules'] {
    const species = this.getById(speciesId);
    return species?.detectionRules || [];
  }

  /**
   * Get sprite layers configuration for a species
   */
  getSpriteLayers(speciesId: SpeciesId): Species['spriteLayers'] {
    const species = this.getById(speciesId);
    return species?.spriteLayers || [];
  }

  /**
   * Get default color palette for a species
   */
  getColorPalette(speciesId: SpeciesId): string[] {
    const species = this.getById(speciesId);
    return species?.defaultColorPalette || ['#888888'];
  }

  /**
   * Validate that a species exists
   */
  isValidSpecies(id: string): id is SpeciesId {
    return this.species.has(id as SpeciesId);
  }
}
