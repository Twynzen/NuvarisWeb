import { AbilityOption } from '../ability-option';

/**
 * YURANY SKILLS - Proyecto Y / El Experimento
 *
 * Yurany es una entidad de fusión espectral, inestable y letal.
 * Libera tormentas de energía sobre sus enemigos.
 * Sus habilidades se centran en:
 * - Cadenas eléctricas que rebotan entre enemigos
 * - Habilidades fantasmales para esquivar (Phase/Dash)
 * - Daño crítico y velocidad
 *
 * PROBABILIDADES: 60% básica, 30% épica, 5% legendaria
 */
export const YuranySkills: AbilityOption[] = [
    // ============================================
    // BÁSICAS (60% probabilidad de aparecer)
    // ============================================
    {
        id: 'conductivity',
        name: 'Conductividad',
        description: '+20% rango de cadena',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability?.name === 'Chain Lightning') {
                scene.player.ability.chainRange *= 1.2;
            }
        }
    },
    {
        id: 'voltage',
        name: 'Voltaje',
        description: '+15% daño de cadena',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability?.name === 'Chain Lightning') {
                scene.player.ability.chainDamagePercent += 0.15;
            }
        }
    },
    {
        id: 'quick_charge',
        name: 'Carga Rápida',
        description: '+10% velocidad de ataque',
        rarity: 'basica',
        effect: (scene: any) => {
            scene.player?.getWeapons()?.forEach((w: any) => {
                if (w.config) w.config.cooldown *= 0.9;
            });
        }
    },
    {
        id: 'spectral_agility',
        name: 'Agilidad Espectral',
        description: '+10% velocidad de movimiento',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.speed *= 1.1;
            }
        }
    },
    {
        id: 'static_field',
        name: 'Campo Estático',
        description: 'Enemigos cercanos reciben 5% más daño',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.nearbyDamageBonus = (scene.player.ability.nearbyDamageBonus || 0) + 0.05;
            }
        }
    },
    {
        id: 'minor_critical',
        name: 'Precisión Menor',
        description: '+5% probabilidad de crítico',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.critChance = (scene.player.critChance || 0) + 0.05;
            }
        }
    },

    // ============================================
    // ÉPICAS (30% probabilidad de aparecer)
    // ============================================
    {
        id: 'overload',
        name: 'Sobrecarga',
        description: '+1 rebote de cadena',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability?.name === 'Chain Lightning') {
                scene.player.ability.maxBounces = (scene.player.ability.maxBounces || 1) + 1;
            }
        }
    },
    {
        id: 'static_shock',
        name: 'Descarga Estática',
        description: 'Cadenas tienen 15% de aturdir',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability?.name === 'Chain Lightning') {
                scene.player.ability.stunChance = 0.15;
            }
        }
    },
    {
        id: 'phantom_dash',
        name: 'Dash Fantasma',
        description: 'Desbloquea dash con invulnerabilidad (tecla SHIFT)',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.canDash = true;
                scene.player.ability.dashCooldown = 3; // 3 segundos cooldown
                scene.player.ability.dashDuration = 0.3; // 300ms de dash
                console.log('[YURANY] Dash Fantasma desbloqueado - Usa SHIFT para dash');
            }
        }
    },
    {
        id: 'critical_surge',
        name: 'Oleada Crítica',
        description: '+15% probabilidad de crítico',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.critChance = (scene.player.critChance || 0) + 0.15;
            }
        }
    },
    {
        id: 'ghost_phase',
        name: 'Fase Fantasma',
        description: '10% de probabilidad de evitar daño completamente',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.phaseChance = (scene.player.ability.phaseChance || 0) + 0.10;
            }
        }
    },
    {
        id: 'energized',
        name: 'Energizada',
        description: '+15% velocidad mientras ataca',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.speed *= 1.15;
            }
        }
    },

    // ============================================
    // LEGENDARIAS (5% probabilidad de aparecer)
    // ============================================
    {
        id: 'thunderstorm',
        name: 'Tormenta Eléctrica',
        description: 'Rayos aleatorios golpean enemigos cada 2s',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasThunderstorm = true;
                scene.player.ability.thunderstormInterval = 2; // segundos
                console.log('[YURANY] Tormenta Eléctrica activada!');
            }
        }
    },
    {
        id: 'plasma_arc',
        name: 'Arco de Plasma',
        description: 'Cadenas ignoran armadura (Daño Verdadero)',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.trueDamage = true;
            }
        }
    },
    {
        id: 'spectral_form',
        name: 'Forma Espectral',
        description: '25% de evitar daño + atravesar enemigos por 3s (cada 30s)',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasSpectralForm = true;
                scene.player.ability.spectralFormCooldown = 30;
                scene.player.ability.spectralFormDuration = 3;
                scene.player.ability.phaseChance = (scene.player.ability.phaseChance || 0) + 0.25;
                console.log('[YURANY] Forma Espectral desbloqueada!');
            }
        }
    },
    {
        id: 'chain_master',
        name: 'Maestra de Cadenas',
        description: 'Cadenas pueden rebotar infinitamente (max 10) + 2x daño',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability?.name === 'Chain Lightning') {
                scene.player.ability.maxBounces = 10;
                scene.player.ability.chainDamagePercent *= 2;
            }
        }
    }
];
