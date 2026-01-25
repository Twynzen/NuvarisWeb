/**
 * PORTAL CONTROL - Shop Component
 * Interface for purchasing upgrades and consumables
 */

import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShopItem, StationUpgrade, ConsumableItem, UpgradeCategory } from '../../models';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shop-overlay" (click)="onClose.emit()">
      <div class="shop-container" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="shop-header">
          <h2>🏪 TIENDA DE MEJORAS</h2>
          <div class="player-dollars">
            <span class="dollar-icon">💵</span>
            <span class="dollar-amount">\${{ dollars }}</span>
          </div>
          <button class="close-btn" (click)="onClose.emit()">✕</button>
        </div>

        <!-- Category tabs -->
        <div class="category-tabs">
          @for (cat of categories; track cat.id) {
            <button
              class="tab-btn"
              [class.active]="selectedCategory() === cat.id"
              (click)="selectedCategory.set(cat.id)">
              <span class="tab-icon">{{ cat.icon }}</span>
              <span class="tab-name">{{ cat.name }}</span>
            </button>
          }
        </div>

        <!-- Shop items -->
        <div class="shop-content">
          @if (selectedCategory() === 'CONSUMABLES') {
            <div class="items-grid consumables">
              @for (item of getConsumableItems(); track item.id) {
                <div class="shop-item consumable" [class.unavailable]="!item.isAvailable">
                  <div class="item-icon">{{ item.consumable?.icon }}</div>
                  <div class="item-info">
                    <h4>{{ item.consumable?.name }}</h4>
                    <p>{{ item.consumable?.description }}</p>
                    <div class="item-meta">
                      <span class="item-stock">
                        Stock: {{ item.consumable?.quantity }}/{{ item.consumable?.maxQuantity }}
                      </span>
                    </div>
                  </div>
                  <div class="item-action">
                    <span class="item-cost">\${{ item.consumable?.cost }}</span>
                    <button
                      class="buy-btn"
                      [disabled]="!canAfford(item.consumable?.cost || 0) || !item.isAvailable"
                      (click)="purchaseConsumable(item)">
                      {{ item.isAvailable ? 'COMPRAR' : 'LLENO' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="items-grid upgrades">
              @for (item of getUpgradeItems(); track item.id) {
                <div
                  class="shop-item upgrade"
                  [class.purchased]="item.upgrade?.isPurchased && item.upgrade?.level === item.upgrade?.maxLevel"
                  [class.unavailable]="!canPurchaseUpgrade(item)"
                  [class.new]="item.isNew">
                  @if (item.isNew) {
                    <div class="new-badge">NUEVO</div>
                  }
                  <div class="item-icon">{{ item.upgrade?.icon }}</div>
                  <div class="item-info">
                    <h4>
                      {{ item.upgrade?.name }}
                      @if (item.upgrade?.maxLevel && item.upgrade.maxLevel > 1) {
                        <span class="level-badge">
                          Nv. {{ item.upgrade?.level || 0 }}/{{ item.upgrade?.maxLevel }}
                        </span>
                      }
                    </h4>
                    <p>{{ item.upgrade?.description }}</p>
                    <div class="item-effects">
                      @for (effect of item.upgrade?.effects; track effect.type) {
                        <span class="effect-tag">{{ effect.description }}</span>
                      }
                    </div>
                    @if (item.upgrade?.requiredUpgrades?.length) {
                      <div class="requirements">
                        Requiere: {{ getRequirementNames(item.upgrade?.requiredUpgrades || []) }}
                      </div>
                    }
                  </div>
                  <div class="item-action">
                    <span class="item-cost">\${{ item.upgrade?.cost }}</span>
                    @if (item.upgrade?.level === item.upgrade?.maxLevel) {
                      <span class="maxed-badge">MÁXIMO</span>
                    } @else {
                      <button
                        class="buy-btn"
                        [disabled]="!canPurchaseUpgrade(item)"
                        (click)="purchaseUpgrade(item)">
                        {{ item.upgrade?.isPurchased ? 'MEJORAR' : 'COMPRAR' }}
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="empty-message">
                  <p>No hay mejoras disponibles en esta categoría por ahora.</p>
                  <p class="hint">Aumenta tu reputación y avanza más días para desbloquear más.</p>
                </div>
              }
            </div>
          }
        </div>

        <!-- Footer with active effects summary -->
        <div class="shop-footer">
          <div class="active-effects">
            <span class="effects-title">Efectos activos:</span>
            @if (activeEffectsList().length > 0) {
              @for (effect of activeEffectsList(); track effect) {
                <span class="active-effect">{{ effect }}</span>
              }
            } @else {
              <span class="no-effects">Ninguno todavía</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shop-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .shop-container {
      width: 90%;
      max-width: 900px;
      max-height: 90vh;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #444;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .shop-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 2px solid #333;
    }

    .shop-header h2 {
      flex: 1;
      margin: 0;
      font-size: 24px;
      color: #FFD700;
    }

    .player-dollars {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid rgba(76, 175, 80, 0.5);
      border-radius: 8px;
    }

    .dollar-icon {
      font-size: 24px;
    }

    .dollar-amount {
      font-size: 20px;
      font-weight: bold;
      color: #4CAF50;
    }

    .close-btn {
      width: 36px;
      height: 36px;
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid rgba(244, 67, 54, 0.5);
      border-radius: 8px;
      color: #F44336;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(244, 67, 54, 0.4);
    }

    .category-tabs {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid #333;
      overflow-x: auto;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #333;
      border-radius: 8px;
      color: #888;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .tab-btn.active {
      background: rgba(255, 193, 7, 0.2);
      border-color: rgba(255, 193, 7, 0.5);
      color: #FFC107;
    }

    .tab-icon {
      font-size: 18px;
    }

    .tab-name {
      font-size: 13px;
      font-weight: 500;
    }

    .shop-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .items-grid {
      display: grid;
      gap: 12px;
    }

    .items-grid.upgrades {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }

    .items-grid.consumables {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }

    .shop-item {
      position: relative;
      display: flex;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid #333;
      border-radius: 10px;
      transition: all 0.2s;
    }

    .shop-item:hover:not(.unavailable):not(.purchased) {
      background: rgba(255, 255, 255, 0.06);
      border-color: #555;
      transform: translateY(-2px);
    }

    .shop-item.unavailable {
      opacity: 0.5;
    }

    .shop-item.purchased {
      background: rgba(76, 175, 80, 0.1);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .shop-item.new {
      border-color: rgba(255, 193, 7, 0.5);
    }

    .new-badge {
      position: absolute;
      top: -8px;
      right: 12px;
      padding: 2px 8px;
      background: #FFC107;
      color: #000;
      font-size: 10px;
      font-weight: bold;
      border-radius: 4px;
    }

    .item-icon {
      font-size: 32px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      flex-shrink: 0;
    }

    .item-info {
      flex: 1;
      min-width: 0;
    }

    .item-info h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .level-badge {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(33, 150, 243, 0.3);
      color: #2196F3;
      border-radius: 4px;
    }

    .item-info p {
      margin: 0 0 8px 0;
      font-size: 11px;
      color: #888;
      line-height: 1.4;
    }

    .item-effects {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .effect-tag {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
      border-radius: 4px;
    }

    .requirements {
      margin-top: 6px;
      font-size: 10px;
      color: #FFC107;
    }

    .item-meta {
      font-size: 11px;
      color: #666;
    }

    .item-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 80px;
    }

    .item-cost {
      font-size: 16px;
      font-weight: bold;
      color: #4CAF50;
    }

    .buy-btn {
      width: 100%;
      padding: 8px 12px;
      background: linear-gradient(180deg, #4CAF50 0%, #388E3C 100%);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }

    .buy-btn:hover:not(:disabled) {
      background: linear-gradient(180deg, #66BB6A 0%, #43A047 100%);
      transform: scale(1.05);
    }

    .buy-btn:disabled {
      background: #444;
      cursor: not-allowed;
    }

    .maxed-badge {
      padding: 8px 12px;
      background: rgba(33, 150, 243, 0.2);
      color: #2196F3;
      font-size: 11px;
      font-weight: bold;
      border-radius: 6px;
      text-align: center;
    }

    .empty-message {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .empty-message p {
      margin: 8px 0;
    }

    .empty-message .hint {
      font-size: 12px;
      color: #555;
    }

    .shop-footer {
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid #333;
    }

    .active-effects {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .effects-title {
      font-size: 12px;
      color: #666;
    }

    .active-effect {
      font-size: 10px;
      padding: 4px 8px;
      background: rgba(156, 39, 176, 0.2);
      color: #CE93D8;
      border-radius: 4px;
    }

    .no-effects {
      font-size: 11px;
      color: #555;
      font-style: italic;
    }
  `]
})
export class ShopComponent {
  @Input() shopItems: ShopItem[] = [];
  @Input() dollars: number = 0;
  @Input() day: number = 1;
  @Input() reputation: number = 50;
  @Input() purchasedUpgradeIds: string[] = [];

  @Output() onClose = new EventEmitter<void>();
  @Output() onPurchaseUpgrade = new EventEmitter<string>();
  @Output() onPurchaseConsumable = new EventEmitter<string>();

  selectedCategory = signal<UpgradeCategory | 'CONSUMABLES'>('HERRAMIENTAS');

  categories = [
    { id: 'HERRAMIENTAS' as const, name: 'Herramientas', icon: '🔧' },
    { id: 'ESTACION' as const, name: 'Estación', icon: '🏢' },
    { id: 'PERSONAL' as const, name: 'Personal', icon: '👤' },
    { id: 'TECNOLOGIA' as const, name: 'Tecnología', icon: '💻' },
    { id: 'CONSUMABLES' as const, name: 'Consumibles', icon: '📦' },
  ];

  activeEffectsList = computed(() => {
    const effects: string[] = [];
    this.shopItems
      .filter(item => item.type === 'UPGRADE' && item.upgrade?.isPurchased)
      .forEach(item => {
        item.upgrade?.effects.forEach(effect => {
          effects.push(effect.description);
        });
      });
    return effects;
  });

  getUpgradeItems(): ShopItem[] {
    return this.shopItems.filter(
      item => item.type === 'UPGRADE' &&
              item.upgrade?.category === this.selectedCategory()
    );
  }

  getConsumableItems(): ShopItem[] {
    return this.shopItems.filter(item => item.type === 'CONSUMABLE');
  }

  canAfford(cost: number): boolean {
    return this.dollars >= cost;
  }

  canPurchaseUpgrade(item: ShopItem): boolean {
    if (!item.upgrade) return false;
    if (!this.canAfford(item.upgrade.cost)) return false;
    if (item.upgrade.level >= item.upgrade.maxLevel) return false;
    if (item.upgrade.requiredReputation > this.reputation) return false;
    if (item.upgrade.requiredDay > this.day) return false;

    // Check prerequisites
    const hasPrereqs = item.upgrade.requiredUpgrades.every(
      reqId => this.purchasedUpgradeIds.includes(reqId)
    );
    return hasPrereqs;
  }

  purchaseUpgrade(item: ShopItem): void {
    if (item.upgrade && this.canPurchaseUpgrade(item)) {
      this.onPurchaseUpgrade.emit(item.upgrade.id);
    }
  }

  purchaseConsumable(item: ShopItem): void {
    if (item.consumable && item.isAvailable && this.canAfford(item.consumable.cost)) {
      this.onPurchaseConsumable.emit(item.consumable.id);
    }
  }

  getRequirementNames(requiredIds: string[]): string {
    return requiredIds
      .map(id => {
        const item = this.shopItems.find(i => i.id === id);
        return item?.upgrade?.name || id;
      })
      .join(', ');
  }
}
