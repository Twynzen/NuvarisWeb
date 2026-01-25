/**
 * PORTAL CONTROL - Sprite Assembler Service
 * Assembles visitor sprites from modular layers with visual modifications
 */

import { Injectable } from '@angular/core';
import { Visitor, VisitorSpriteLayer, SpeciesId } from '../models';
import { SpeciesService } from './species.service';
import { LoggerService } from './logger.service';

/** Assembled sprite result */
export interface AssembledSprite {
  visitorId: string;
  layers: SpriteLayer[];
  containerStyle: SpriteContainerStyle;
  effectsApplied: string[];
}

/** Individual sprite layer */
export interface SpriteLayer {
  id: string;
  assetPath: string;
  zIndex: number;
  style: SpriteLayerStyle;
}

/** Style for a sprite layer */
export interface SpriteLayerStyle {
  filter: string;
  transform: string;
  opacity: number;
}

/** Container style for the whole sprite */
export interface SpriteContainerStyle {
  width: string;
  height: string;
  transform: string;
  filter: string;
}

/** Placeholder mode when assets are missing */
export type PlaceholderMode = 'silhouette' | 'geometric' | 'text' | 'none';

@Injectable({
  providedIn: 'root'
})
export class SpriteAssemblerService {
  // Base path for sprite assets
  private readonly ASSET_BASE_PATH = 'assets/portal-control/sprites';

  // Whether to use placeholders when assets are missing
  private usePlaceholders = true;
  private placeholderMode: PlaceholderMode = 'silhouette';

  constructor(
    private speciesService: SpeciesService,
    private logger: LoggerService
  ) {}

  /**
   * Assemble a complete sprite for a visitor
   */
  assembleSprite(visitor: Visitor): AssembledSprite {
    const endTimer = this.logger.time('SpriteAssembler', `Assemble sprite for ${visitor.id}`);

    try {
      const layers = this.assembleLayers(visitor);
      const containerStyle = this.calculateContainerStyle(visitor);
      const effectsApplied = this.determineEffects(visitor);

      endTimer();

      return {
        visitorId: visitor.id,
        layers,
        containerStyle,
        effectsApplied,
      };

    } catch (error) {
      this.logger.error('SpriteAssembler', 'Failed to assemble sprite', error);
      endTimer();

      // Return fallback
      return this.createFallbackSprite(visitor);
    }
  }

  /**
   * Assemble all layers for a visitor
   */
  private assembleLayers(visitor: Visitor): SpriteLayer[] {
    const layers: SpriteLayer[] = [];

    // Sort visitor's sprite layers by zIndex
    const sortedLayers = [...visitor.appearance.spriteLayers].sort(
      (a, b) => a.zIndex - b.zIndex
    );

    sortedLayers.forEach(layer => {
      const spriteLayer = this.createSpriteLayer(visitor, layer);
      layers.push(spriteLayer);
    });

    return layers;
  }

  /**
   * Create a single sprite layer
   */
  private createSpriteLayer(visitor: Visitor, layer: VisitorSpriteLayer): SpriteLayer {
    const speciesId = visitor.declaredSpecies.toLowerCase();
    const assetPath = `${this.ASSET_BASE_PATH}/${speciesId}/${layer.assetName}.png`;

    // Calculate filter for this layer
    const hueShift = (layer.hueShift || 0) + visitor.appearance.hueShift;
    const saturation = visitor.appearance.saturationMod * 100;
    const brightness = visitor.appearance.brightness * 100;

    const filter = [
      `hue-rotate(${hueShift}deg)`,
      `saturate(${saturation}%)`,
      `brightness(${brightness}%)`,
    ].join(' ');

    return {
      id: layer.layerId,
      assetPath,
      zIndex: layer.zIndex,
      style: {
        filter,
        transform: 'none',
        opacity: layer.opacity ?? 1,
      },
    };
  }

  /**
   * Calculate container style for the whole sprite
   */
  private calculateContainerStyle(visitor: Visitor): SpriteContainerStyle {
    const app = visitor.appearance;

    // Base size
    const baseWidth = 256;
    const baseHeight = 384;

    // Apply scale
    const width = Math.round(baseWidth * app.scaleX);
    const height = Math.round(baseHeight * app.scaleY);

    // Container transform
    const transform = `scale(${app.scaleX}, ${app.scaleY})`;

    // Container filter (for overall effects)
    const filterParts: string[] = [];

    // Add special effects based on visitor state
    if (visitor.behavior.nervousness > 70) {
      filterParts.push('drop-shadow(0 0 5px rgba(255,0,0,0.3))');
    }

    return {
      width: `${width}px`,
      height: `${height}px`,
      transform,
      filter: filterParts.join(' ') || 'none',
    };
  }

  /**
   * Determine what effects to apply
   */
  private determineEffects(visitor: Visitor): string[] {
    const effects: string[] = [];

    if (visitor.declaredSpecies === 'INMIGRANTE') {
      effects.push('dimensional_shimmer');
    }

    if (visitor.declaredSpecies === 'VULNARI') {
      effects.push('ethereal_glow');
    }

    if (visitor.behavior.nervousness > 80) {
      effects.push('nervous_shake');
    }

    if (visitor.truth.isInfected) {
      effects.push('infection_pulse');
    }

    return effects;
  }

  /**
   * Create a fallback sprite when assembly fails
   */
  private createFallbackSprite(visitor: Visitor): AssembledSprite {
    return {
      visitorId: visitor.id,
      layers: [{
        id: 'fallback',
        assetPath: `${this.ASSET_BASE_PATH}/common/silhouette_${visitor.declaredSpecies.toLowerCase()}.png`,
        zIndex: 0,
        style: {
          filter: 'none',
          transform: 'none',
          opacity: 1,
        },
      }],
      containerStyle: {
        width: '256px',
        height: '384px',
        transform: 'none',
        filter: 'none',
      },
      effectsApplied: ['fallback_mode'],
    };
  }

  /**
   * Generate CSS for a sprite
   */
  generateSpriteCSS(sprite: AssembledSprite): string {
    const lines: string[] = [];

    // Container styles
    lines.push(`.sprite-container-${sprite.visitorId} {`);
    lines.push(`  width: ${sprite.containerStyle.width};`);
    lines.push(`  height: ${sprite.containerStyle.height};`);
    lines.push(`  transform: ${sprite.containerStyle.transform};`);
    lines.push(`  filter: ${sprite.containerStyle.filter};`);
    lines.push(`  position: relative;`);
    lines.push(`}`);
    lines.push('');

    // Layer styles
    sprite.layers.forEach(layer => {
      lines.push(`.sprite-layer-${layer.id} {`);
      lines.push(`  position: absolute;`);
      lines.push(`  top: 0;`);
      lines.push(`  left: 0;`);
      lines.push(`  width: 100%;`);
      lines.push(`  height: 100%;`);
      lines.push(`  z-index: ${layer.zIndex};`);
      lines.push(`  filter: ${layer.style.filter};`);
      lines.push(`  opacity: ${layer.style.opacity};`);
      lines.push(`  background-image: url('${layer.assetPath}');`);
      lines.push(`  background-size: contain;`);
      lines.push(`  background-repeat: no-repeat;`);
      lines.push(`  background-position: center;`);
      lines.push(`}`);
      lines.push('');
    });

    // Effect animations
    if (sprite.effectsApplied.includes('nervous_shake')) {
      lines.push(`@keyframes nervousShake {`);
      lines.push(`  0%, 100% { transform: translateX(0); }`);
      lines.push(`  25% { transform: translateX(-2px); }`);
      lines.push(`  75% { transform: translateX(2px); }`);
      lines.push(`}`);
      lines.push(`.sprite-container-${sprite.visitorId} {`);
      lines.push(`  animation: nervousShake 0.3s ease-in-out infinite;`);
      lines.push(`}`);
    }

    if (sprite.effectsApplied.includes('ethereal_glow')) {
      lines.push(`.sprite-container-${sprite.visitorId}::after {`);
      lines.push(`  content: '';`);
      lines.push(`  position: absolute;`);
      lines.push(`  inset: -10px;`);
      lines.push(`  background: radial-gradient(ellipse, rgba(139,92,246,0.2), transparent);`);
      lines.push(`  z-index: -1;`);
      lines.push(`  animation: pulse 2s ease-in-out infinite;`);
      lines.push(`}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate placeholder HTML when assets aren't available
   */
  generatePlaceholderHTML(visitor: Visitor): string {
    const species = this.speciesService.getById(visitor.declaredSpecies);
    const color = species?.defaultColorPalette[0] || '#666666';

    switch (this.placeholderMode) {
      case 'silhouette':
        return this.generateSilhouettePlaceholder(visitor, color);
      case 'geometric':
        return this.generateGeometricPlaceholder(visitor, color);
      case 'text':
        return this.generateTextPlaceholder(visitor);
      default:
        return '<div class="sprite-placeholder"></div>';
    }
  }

  /**
   * Generate silhouette placeholder
   */
  private generateSilhouettePlaceholder(visitor: Visitor, color: string): string {
    const shapes = this.getSpeciesShape(visitor.declaredSpecies);

    return `
      <div class="sprite-placeholder silhouette" style="--base-color: ${color}">
        <svg viewBox="0 0 100 150" class="silhouette-svg">
          ${shapes}
        </svg>
        <div class="placeholder-label">${visitor.declaredSpecies}</div>
      </div>
    `;
  }

  /**
   * Get SVG shape for species silhouette
   */
  private getSpeciesShape(speciesId: SpeciesId): string {
    const shapes: Record<SpeciesId, string> = {
      HUMANO: `
        <ellipse cx="50" cy="25" rx="20" ry="25" fill="currentColor"/>
        <rect x="25" y="50" width="50" height="80" rx="10" fill="currentColor"/>
        <rect x="10" y="55" width="15" height="50" rx="5" fill="currentColor"/>
        <rect x="75" y="55" width="15" height="50" rx="5" fill="currentColor"/>
      `,
      VULNARI: `
        <ellipse cx="50" cy="30" rx="18" ry="28" fill="currentColor"/>
        <path d="M30 10 Q20 -10 35 5" stroke="currentColor" stroke-width="4" fill="none"/>
        <path d="M40 8 Q25 -15 38 2" stroke="currentColor" stroke-width="4" fill="none"/>
        <path d="M60 8 Q75 -15 62 2" stroke="currentColor" stroke-width="4" fill="none"/>
        <path d="M70 10 Q80 -10 65 5" stroke="currentColor" stroke-width="4" fill="none"/>
        <ellipse cx="50" cy="100" rx="22" ry="45" fill="currentColor"/>
      `,
      EXOPODO: `
        <ellipse cx="50" cy="25" rx="22" ry="20" fill="currentColor"/>
        <path d="M35 5 L30 -10" stroke="currentColor" stroke-width="3"/>
        <path d="M65 5 L70 -10" stroke="currentColor" stroke-width="3"/>
        <ellipse cx="50" cy="80" rx="25" ry="40" fill="currentColor"/>
        <rect x="15" y="50" width="10" height="35" rx="3" fill="currentColor"/>
        <rect x="75" y="50" width="10" height="35" rx="3" fill="currentColor"/>
        <rect x="20" y="65" width="8" height="30" rx="3" fill="currentColor"/>
        <rect x="72" y="65" width="8" height="30" rx="3" fill="currentColor"/>
      `,
      REPTILIANO: `
        <ellipse cx="50" cy="28" rx="25" ry="28" fill="currentColor"/>
        <path d="M30 5 L25 -5 L35 0" fill="currentColor"/>
        <path d="M70 5 L75 -5 L65 0" fill="currentColor"/>
        <rect x="20" y="55" width="60" height="85" rx="15" fill="currentColor"/>
        <rect x="5" y="60" width="18" height="55" rx="8" fill="currentColor"/>
        <rect x="77" y="60" width="18" height="55" rx="8" fill="currentColor"/>
        <path d="M50 140 Q50 165 60 180 L40 180 Q50 165 50 140" fill="currentColor"/>
      `,
      INMIGRANTE: `
        <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.7"/>
        <circle cx="40" cy="40" r="8" fill="white" opacity="0.5"/>
        <circle cx="65" cy="55" r="12" fill="white" opacity="0.5"/>
        <ellipse cx="50" cy="100" rx="30" ry="40" fill="currentColor" opacity="0.5"/>
        <path d="M20 80 Q-10 90 15 110" stroke="currentColor" stroke-width="8" fill="none"/>
        <path d="M80 80 Q110 90 85 110" stroke="currentColor" stroke-width="8" fill="none"/>
      `,
    };

    return shapes[speciesId] || shapes.HUMANO;
  }

  /**
   * Generate geometric placeholder
   */
  private generateGeometricPlaceholder(visitor: Visitor, color: string): string {
    return `
      <div class="sprite-placeholder geometric" style="background: ${color}">
        <div class="geo-shape head"></div>
        <div class="geo-shape body"></div>
        <div class="geo-label">${visitor.name.substring(0, 2).toUpperCase()}</div>
      </div>
    `;
  }

  /**
   * Generate text placeholder
   */
  private generateTextPlaceholder(visitor: Visitor): string {
    return `
      <div class="sprite-placeholder text">
        <div class="text-species">${visitor.declaredSpecies}</div>
        <div class="text-name">${visitor.name}</div>
        <div class="text-mood">${visitor.behavior.currentMood}</div>
      </div>
    `;
  }

  /**
   * Set placeholder mode
   */
  setPlaceholderMode(mode: PlaceholderMode): void {
    this.placeholderMode = mode;
    this.logger.info('SpriteAssembler', `Placeholder mode set to: ${mode}`);
  }

  /**
   * Check if an asset exists (would need to be async in real implementation)
   */
  assetExists(assetPath: string): boolean {
    // In a real implementation, this would check if the asset file exists
    // For now, always return false to use placeholders
    return false;
  }

  /**
   * Preload assets for a species
   */
  preloadSpeciesAssets(speciesId: SpeciesId): Promise<void> {
    // In a real implementation, this would preload all assets for a species
    this.logger.debug('SpriteAssembler', `Preloading assets for ${speciesId}`);
    return Promise.resolve();
  }

  /**
   * Get the CSS for placeholder styles
   */
  getPlaceholderStyles(): string {
    return `
      .sprite-placeholder {
        width: 200px;
        height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        position: relative;
        overflow: hidden;
      }

      .sprite-placeholder.silhouette {
        background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
        color: var(--base-color, #666);
      }

      .silhouette-svg {
        width: 80%;
        height: 70%;
        filter: drop-shadow(0 0 10px currentColor);
      }

      .placeholder-label {
        position: absolute;
        bottom: 10px;
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .sprite-placeholder.geometric {
        border-radius: 20px;
      }

      .geo-shape.head {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(255,255,255,0.3);
        margin-bottom: 10px;
      }

      .geo-shape.body {
        width: 80px;
        height: 120px;
        border-radius: 40px 40px 20px 20px;
        background: rgba(255,255,255,0.2);
      }

      .geo-label {
        position: absolute;
        font-size: 48px;
        font-weight: bold;
        color: rgba(255,255,255,0.3);
      }

      .sprite-placeholder.text {
        background: #1a1a2e;
        color: white;
        font-family: monospace;
      }

      .text-species {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .text-name {
        font-size: 14px;
        opacity: 0.7;
      }

      .text-mood {
        font-size: 12px;
        opacity: 0.5;
        margin-top: 20px;
        text-transform: uppercase;
      }
    `;
  }
}
