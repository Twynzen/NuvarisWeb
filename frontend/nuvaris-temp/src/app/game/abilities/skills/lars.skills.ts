import { AbilityOption } from '../ability-option';

/**
 * LARS SKILLS - El Doctor
 *
 * Lars es el director del Sector Omega que usa tecnología experimental
 * para controlar mentes. Sus habilidades se centran en:
 * - Convertir enemigos en minions
 * - Explotar minions para daño en área
 * - Efectos de control y manipulación
 *
 * PROBABILIDADES: 60% básica, 30% épica, 5% legendaria
 */
export const LarsSkills: AbilityOption[] = [
    // ============================================
    // BÁSICAS (60% probabilidad de aparecer)
    // ============================================
    {
        id: 'persuasion',
        name: 'Persuasión',
        description: '+5% probabilidad de conversión',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability?.name === 'Mind Control') {
                scene.player.ability.controlChance += 0.05;
            }
        }
    },
    {
        id: 'leadership',
        name: 'Liderazgo',
        description: 'Minions tienen +30% HP',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionHealthMult = (scene.player.ability.minionHealthMult || 1) + 0.3;
            }
        }
    },
    {
        id: 'charisma',
        name: 'Carisma',
        description: 'Minions hacen +20% daño',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionDamageMult = (scene.player.ability.minionDamageMult || 1) + 0.2;
            }
        }
    },
    {
        id: 'mental_detonation',
        name: 'Detonación Mental',
        description: 'Desbloquea: Explotar minions (tecla Q)',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.canExplodeMinions = true;
                console.log('[LARS] Detonación Mental desbloqueada - Usa Q para explotar minions');
            }
        }
    },
    {
        id: 'slowdown_shot',
        name: 'Disparo Paralizante',
        description: 'Disparos ralentizan enemigos 10%',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.slowOnHit = true;
                scene.player.ability.slowAmount = (scene.player.ability.slowAmount || 0) + 0.10;
            }
        }
    },
    {
        id: 'extended_control',
        name: 'Control Extendido',
        description: 'Minions duran +25% más tiempo',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionDurationMult = (scene.player.ability.minionDurationMult || 1) + 0.25;
            }
        }
    },

    // ============================================
    // ÉPICAS (30% probabilidad de aparecer)
    // ============================================
    {
        id: 'terror',
        name: 'Terror',
        description: '10% de asustar enemigos si falla conversión (huyen 3s)',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.fearOnFailedConversion = true;
                scene.player.ability.fearChance = 0.10;
                scene.player.ability.fearDuration = 3;
            }
        }
    },
    {
        id: 'failed_explosion',
        name: 'Explosión Fallida',
        description: '25% de explotar si falla conversión (daño en área)',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.explodeOnFailedConversion = true;
                scene.player.ability.failedExplosionChance = 0.25;
            }
        }
    },
    {
        id: 'mass_hysteria',
        name: 'Histeria Masiva',
        description: 'Control Mental afecta área pequeña',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.areaControl = true;
            }
        }
    },
    {
        id: 'loyalty',
        name: 'Lealtad',
        description: 'Minions duran +50% más tiempo',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionDurationMult = (scene.player.ability.minionDurationMult || 1) + 0.5;
            }
        }
    },
    {
        id: 'sacrifice',
        name: 'Sacrificio',
        description: 'Explosión de minion cura 5 HP',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.healOnExplode = true;
                scene.player.ability.healAmount = 5;
            }
        }
    },
    {
        id: 'enhanced_slow',
        name: 'Ralentización Mejorada',
        description: 'Disparos ralentizan +15% adicional',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.slowOnHit = true;
                scene.player.ability.slowAmount = (scene.player.ability.slowAmount || 0) + 0.15;
            }
        }
    },

    // ============================================
    // LEGENDARIAS (5% probabilidad de aparecer)
    // ============================================
    {
        id: 'enhanced_explosion',
        name: 'Explosión Mejorada',
        description: '50% de explotar si falla conversión (REEMPLAZA 25%)',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.explodeOnFailedConversion = true;
                scene.player.ability.failedExplosionChance = 0.50; // Reemplaza el 25%
            }
        }
    },
    {
        id: 'hive_mind',
        name: 'Mente Colmena',
        description: 'Minions pueden convertir a otros enemigos',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionsConvert = true;
            }
        }
    },
    {
        id: 'rebellion',
        name: 'Rebelión',
        description: 'Puede convertir enemigos Elite y Mini-bosses',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.canConvertElites = true;
            }
        }
    },
    {
        id: 'psychic_storm',
        name: 'Tormenta Psíquica',
        description: 'Cada 10s, intenta convertir todos los enemigos cercanos',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasPsychicStorm = true;
                scene.player.ability.psychicStormInterval = 10; // segundos
            }
        }
    }
];
