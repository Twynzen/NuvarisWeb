/**
 * PORTAL CONTROL - Shop Service
 * Handles purchases, upgrades, and consumables
 */

import { Injectable, signal, computed } from '@angular/core';
import {
  StationUpgrade,
  ConsumableItem,
  ShopItem,
  UpgradeEffectType,
  PlayerResources
} from '../models';
import { LoggerService } from './logger.service';
import {
  STATION_UPGRADES,
  CONSUMABLE_ITEMS,
  getAvailableUpgrades,
  calculateUpgradeCost
} from '../data/upgrades.data';

export interface PurchaseResult {
  success: boolean;
  message: string;
  newDollars?: number;
}

export interface ActiveEffects {
  toolAccuracyBoost: number;
  toolCooldownReduction: number;
  dollarsMultiplier: number;
  reputationProtection: number;
  extraWarnings: number;
  timeExtension: number;
  visitorInsightLevel: number;
  errorHighlightLevel: number;
  speedBonusIncrease: number;
  specialVisitorChance: number;
  hasAutoMassScan: boolean;
  hasAutoThermoScan: boolean;
  hasQuarantineOption: boolean;
  hasOmegaOption: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  // Purchased upgrades state
  private _purchasedUpgrades = signal<Map<string, StationUpgrade>>(new Map());
  private _consumables = signal<Map<string, ConsumableItem>>(new Map());
  private _activeDoubleReward = signal(false);

  // Public computed signals
  readonly purchasedUpgrades = this._purchasedUpgrades.asReadonly();
  readonly consumables = this._consumables.asReadonly();
  readonly activeDoubleReward = this._activeDoubleReward.asReadonly();

  // Computed active effects
  readonly activeEffects = computed<ActiveEffects>(() => {
    const upgrades = Array.from(this._purchasedUpgrades().values());
    return this.calculateActiveEffects(upgrades);
  });

  constructor(private logger: LoggerService) {
    this.initializeConsumables();
  }

  /**
   * Initialize consumables inventory
   */
  private initializeConsumables(): void {
    const consumablesMap = new Map<string, ConsumableItem>();
    CONSUMABLE_ITEMS.forEach(item => {
      consumablesMap.set(item.id, { ...item, quantity: 0 });
    });
    this._consumables.set(consumablesMap);
  }

  /**
   * Get available shop items for current day/reputation
   */
  getAvailableShopItems(day: number, reputation: number): ShopItem[] {
    const purchasedIds = Array.from(this._purchasedUpgrades().keys());
    const availableUpgrades = getAvailableUpgrades(day, reputation, purchasedIds);

    const upgradeItems: ShopItem[] = availableUpgrades.map(upgrade => ({
      id: upgrade.id,
      type: 'UPGRADE',
      upgrade: {
        ...upgrade,
        cost: calculateUpgradeCost(upgrade)
      },
      isAvailable: true,
      isNew: day === upgrade.requiredDay
    }));

    const consumableItems: ShopItem[] = CONSUMABLE_ITEMS.map(item => {
      const owned = this._consumables().get(item.id);
      return {
        id: item.id,
        type: 'CONSUMABLE',
        consumable: owned || item,
        isAvailable: (owned?.quantity || 0) < item.maxQuantity,
        isNew: false
      };
    });

    return [...upgradeItems, ...consumableItems];
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeId: string, currentDollars: number): PurchaseResult {
    const baseUpgrade = STATION_UPGRADES.find(u => u.id === upgradeId);
    if (!baseUpgrade) {
      return { success: false, message: 'Mejora no encontrada' };
    }

    // Get current upgrade state (may have been upgraded before)
    let upgrade = this._purchasedUpgrades().get(upgradeId);
    if (upgrade) {
      // Already purchased, check if can upgrade further
      if (upgrade.level >= upgrade.maxLevel) {
        return { success: false, message: 'Nivel máximo alcanzado' };
      }
      upgrade = { ...upgrade };
    } else {
      upgrade = { ...baseUpgrade };
    }

    const cost = calculateUpgradeCost(upgrade);

    if (currentDollars < cost) {
      return { success: false, message: `Necesitas $${cost}. Tienes $${currentDollars}` };
    }

    // Purchase successful
    upgrade.isPurchased = true;
    upgrade.level++;
    upgrade.purchasedAt = Date.now();

    this._purchasedUpgrades.update(map => {
      const newMap = new Map(map);
      newMap.set(upgradeId, upgrade!);
      return newMap;
    });

    this.logger.info('Shop', `Purchased upgrade: ${upgrade.name} (Level ${upgrade.level})`);

    return {
      success: true,
      message: `¡${upgrade.name} adquirido!`,
      newDollars: currentDollars - cost
    };
  }

  /**
   * Purchase a consumable item
   */
  purchaseConsumable(itemId: string, currentDollars: number): PurchaseResult {
    const baseItem = CONSUMABLE_ITEMS.find(i => i.id === itemId);
    if (!baseItem) {
      return { success: false, message: 'Artículo no encontrado' };
    }

    const currentItem = this._consumables().get(itemId);
    if (currentItem && currentItem.quantity >= baseItem.maxQuantity) {
      return { success: false, message: 'Cantidad máxima alcanzada' };
    }

    if (currentDollars < baseItem.cost) {
      return { success: false, message: `Necesitas $${baseItem.cost}` };
    }

    this._consumables.update(map => {
      const newMap = new Map(map);
      const item = newMap.get(itemId) || { ...baseItem, quantity: 0 };
      item.quantity++;
      newMap.set(itemId, item);
      return newMap;
    });

    this.logger.info('Shop', `Purchased consumable: ${baseItem.name}`);

    return {
      success: true,
      message: `¡${baseItem.name} adquirido!`,
      newDollars: currentDollars - baseItem.cost
    };
  }

  /**
   * Use a consumable item
   */
  useConsumable(itemId: string): { success: boolean; effect: string | null } {
    const item = this._consumables().get(itemId);
    if (!item || item.quantity <= 0) {
      return { success: false, effect: null };
    }

    this._consumables.update(map => {
      const newMap = new Map(map);
      const updatedItem = { ...item, quantity: item.quantity - 1 };
      newMap.set(itemId, updatedItem);
      return newMap;
    });

    // Handle special effects
    if (item.effect === 'DOUBLE_REWARD') {
      this._activeDoubleReward.set(true);
    }

    this.logger.info('Shop', `Used consumable: ${item.name}`);

    return { success: true, effect: item.effect };
  }

  /**
   * Clear double reward flag after use
   */
  clearDoubleReward(): void {
    this._activeDoubleReward.set(false);
  }

  /**
   * Get consumable count
   */
  getConsumableCount(itemId: string): number {
    return this._consumables().get(itemId)?.quantity || 0;
  }

  /**
   * Check if an upgrade is purchased
   */
  hasUpgrade(upgradeId: string): boolean {
    return this._purchasedUpgrades().has(upgradeId);
  }

  /**
   * Get upgrade level
   */
  getUpgradeLevel(upgradeId: string): number {
    return this._purchasedUpgrades().get(upgradeId)?.level || 0;
  }

  /**
   * Calculate all active effects from purchased upgrades
   */
  private calculateActiveEffects(upgrades: StationUpgrade[]): ActiveEffects {
    const effects: ActiveEffects = {
      toolAccuracyBoost: 0,
      toolCooldownReduction: 0,
      dollarsMultiplier: 0,
      reputationProtection: 0,
      extraWarnings: 0,
      timeExtension: 0,
      visitorInsightLevel: 0,
      errorHighlightLevel: 0,
      speedBonusIncrease: 0,
      specialVisitorChance: 0,
      hasAutoMassScan: false,
      hasAutoThermoScan: false,
      hasQuarantineOption: false,
      hasOmegaOption: false
    };

    upgrades.forEach(upgrade => {
      upgrade.effects.forEach(effect => {
        const value = effect.value * upgrade.level;
        switch (effect.type) {
          case 'TOOL_ACCURACY_BOOST':
            effects.toolAccuracyBoost += value;
            break;
          case 'TOOL_COOLDOWN_REDUCTION':
            effects.toolCooldownReduction += value;
            break;
          case 'DOLLARS_MULTIPLIER':
            effects.dollarsMultiplier += value;
            break;
          case 'REPUTATION_PROTECTION':
            effects.reputationProtection += value;
            break;
          case 'EXTRA_WARNING':
            effects.extraWarnings += value;
            break;
          case 'TIME_EXTENSION':
            effects.timeExtension += value;
            break;
          case 'VISITOR_INSIGHT':
            effects.visitorInsightLevel = Math.max(effects.visitorInsightLevel, value);
            break;
          case 'ERROR_HIGHLIGHT':
            effects.errorHighlightLevel = Math.max(effects.errorHighlightLevel, value);
            break;
          case 'SPEED_BONUS_INCREASE':
            effects.speedBonusIncrease += value;
            break;
          case 'SPECIAL_VISITOR_CHANCE':
            effects.specialVisitorChance += value;
            break;
          case 'AUTO_SCAN':
            if (effect.value === 1) effects.hasAutoMassScan = true;
            if (effect.value === 2) effects.hasAutoThermoScan = true;
            break;
          case 'NEW_DECISION_OPTION':
            if (effect.value === 1) effects.hasQuarantineOption = true;
            if (effect.value === 2) effects.hasOmegaOption = true;
            break;
        }
      });
    });

    return effects;
  }

  /**
   * Apply dollars multiplier
   */
  applyDollarsMultiplier(baseDollars: number): number {
    const effects = this.activeEffects();
    let multiplier = 1 + (effects.dollarsMultiplier / 100);

    if (this._activeDoubleReward()) {
      multiplier *= 2;
      this.clearDoubleReward();
    }

    return Math.floor(baseDollars * multiplier);
  }

  /**
   * Apply reputation protection
   */
  applyReputationProtection(baseLoss: number): number {
    const effects = this.activeEffects();
    const protection = effects.reputationProtection / 100;
    return Math.floor(baseLoss * (1 - protection));
  }

  /**
   * Get modified cooldown for a tool
   */
  getModifiedCooldown(baseCooldown: number): number {
    const effects = this.activeEffects();
    const reduction = effects.toolCooldownReduction / 100;
    return Math.max(1, Math.floor(baseCooldown * (1 - reduction)));
  }

  /**
   * Get modified day duration
   */
  getModifiedDayDuration(baseDuration: number): number {
    const effects = this.activeEffects();
    return baseDuration + effects.timeExtension;
  }

  /**
   * Get max warnings with upgrades
   */
  getModifiedMaxWarnings(baseMaxWarnings: number): number {
    const effects = this.activeEffects();
    return baseMaxWarnings + effects.extraWarnings;
  }

  /**
   * Reset shop state for new game
   */
  reset(): void {
    this._purchasedUpgrades.set(new Map());
    this.initializeConsumables();
    this._activeDoubleReward.set(false);
    this.logger.info('Shop', 'Shop state reset');
  }

  /**
   * Get total money spent
   */
  getTotalSpent(): number {
    let total = 0;
    this._purchasedUpgrades().forEach(upgrade => {
      for (let i = 0; i < upgrade.level; i++) {
        const levelCost = Math.floor(upgrade.cost * (1 + i * 0.5));
        total += levelCost;
      }
    });
    return total;
  }
}
