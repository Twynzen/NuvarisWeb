import { AbilityOption } from '../ability-option';

/**
 * ARCADIO SKILLS - Proyecto A / El Mutante
 *
 * Arcadio es un mutante biológico de fuerza incalculable,
 * diseñado para resistir y aplastar cualquier amenaza dimensional.
 * Sus habilidades se centran en:
 * - Resistencia y reducción de daño
 * - Fuerza bruta y knockback
 * - Robo de vida
 * - Modo Berserk (legendaria especial)
 *
 * PROBABILIDADES: 60% básica, 30% épica, 5% legendaria
 */
export const ArcadioSkills: AbilityOption[] = [
    // ============================================
    // BÁSICAS (60% probabilidad de aparecer)
    // ============================================
    {
        id: 'iron_skin',
        name: 'Piel de Hierro',
        description: '+10% reducción de daño',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.damageReduction = (scene.player.damageReduction || 0) + 0.1;
            }
        }
    },
    {
        id: 'heavy_hand',
        name: 'Mano Pesada',
        description: '+20% fuerza de knockback',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.knockbackMultiplier = (scene.player.knockbackMultiplier || 1) + 0.2;
            }
        }
    },
    {
        id: 'vitality',
        name: 'Vitalidad',
        description: '+30 HP máximo',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.maxHealth += 30;
                scene.player.health += 30;
            }
        }
    },
    {
        id: 'regeneration',
        name: 'Regeneración',
        description: '+1 HP por segundo',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.healthRegen = (scene.player.ability.healthRegen || 0) + 1;
            }
        }
    },
    {
        id: 'minor_lifesteal',
        name: 'Robo de Vida Menor',
        description: '+3% robo de vida en ataques',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.lifesteal = (scene.player.lifesteal || 0) + 0.03;
            }
        }
    },
    {
        id: 'thick_skin',
        name: 'Piel Gruesa',
        description: '+5% reducción de daño adicional',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.damageReduction = (scene.player.damageReduction || 0) + 0.05;
            }
        }
    },

    // ============================================
    // ÉPICAS (30% probabilidad de aparecer)
    // ============================================
    {
        id: 'seismic_wave',
        name: 'Onda Sísmica',
        description: '+25% área/rango de ataque',
        rarity: 'epica',
        effect: (scene: any) => {
            scene.player?.getWeapons()?.forEach((w: any) => {
                if (w.config?.name === 'Titan Punch') {
                    w.config.range *= 1.25;
                }
            });
        }
    },
    {
        id: 'retaliation',
        name: 'Represalia',
        description: 'Devuelve 10% del daño recibido',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.thorns = (scene.player.thorns || 0) + 0.1;
            }
        }
    },
    {
        id: 'adrenaline',
        name: 'Adrenalina',
        description: '+15% velocidad por 2s al recibir daño',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.hasAdrenaline = true;
                scene.player.adrenalineBonus = 0.15;
                scene.player.adrenalineDuration = 2;
            }
        }
    },
    {
        id: 'vampiric_strikes',
        name: 'Golpes Vampíricos',
        description: '+8% robo de vida en ataques',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.lifesteal = (scene.player.lifesteal || 0) + 0.08;
            }
        }
    },
    {
        id: 'unstoppable',
        name: 'Imparable',
        description: 'Inmune a ralentización y aturdimiento',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.immuneToCC = true;
            }
        }
    },
    {
        id: 'bloodlust',
        name: 'Sed de Sangre',
        description: '+2% daño por cada 10% HP perdido',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasBloodlust = true;
            }
        }
    },

    // ============================================
    // LEGENDARIAS (5% probabilidad de aparecer)
    // ============================================
    {
        id: 'titan_form',
        name: 'Forma Titán',
        description: 'Tamaño x2, +50% HP, +50% Daño (permanente)',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.setScale?.(2);
                scene.player.maxHealth = Math.floor(scene.player.maxHealth * 1.5);
                scene.player.health = scene.player.maxHealth;
                scene.player.damage = Math.floor((scene.player.damage || 10) * 1.5);
            }
        }
    },
    {
        id: 'earthquake',
        name: 'Terremoto',
        description: 'Ataques tienen 20% de aturdir enemigos',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.stunChance = 0.2;
            }
        }
    },
    {
        id: 'berserk_mode',
        name: 'MODO BERSERK',
        description: 'Cada 100 kills: 10s de vida infinita + mata de 1 golpe',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasBerserkMode = true;
                scene.player.ability.berserkKillsRequired = 100;
                scene.player.ability.berserkCurrentKills = 0;
                scene.player.ability.berserkDuration = 10; // segundos
                scene.player.ability.berserkActive = false;
                console.log('[ARCADIO] MODO BERSERK desbloqueado! Mata 100 enemigos para activarlo.');
            }
        }
    },
    {
        id: 'immortal_rage',
        name: 'Rabia Inmortal',
        description: 'Al caer a 0 HP, sobrevive con 1 HP por 5s (1 vez por partida)',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasImmortalRage = true;
                scene.player.ability.immortalRageUsed = false;
                console.log('[ARCADIO] Rabia Inmortal desbloqueada!');
            }
        }
    }
];
