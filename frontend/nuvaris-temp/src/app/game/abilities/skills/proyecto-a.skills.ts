import { AbilityOption } from '../ability-option';

export const ProyectoASkills: AbilityOption[] = [
    // ========== BASICA (63% probabilidad) ==========
    {
        id: 'iron_skin',
        name: 'Piel de Hierro',
        description: '+10% Reduccion de dano',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.damageReduction += 0.1;
            }
        }
    },
    {
        id: 'heavy_hand',
        name: 'Mano Pesada',
        description: '+20% Fuerza de empuje',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.knockbackMultiplier += 0.2;
            }
        }
    },
    {
        id: 'vitality',
        name: 'Vitalidad',
        description: '+30 Vida maxima',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.maxHealth += 30;
                scene.player.health += 30;
            }
        }
    },
    {
        id: 'thick_skin',
        name: 'Piel Gruesa',
        description: '+5% Reduccion de dano',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.damageReduction += 0.05;
            }
        }
    },
    {
        id: 'blood_thirst',
        name: 'Sed de Sangre',
        description: '+5% Probabilidad de robo de vida',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.bloodRageBonus += 0.05;
            }
        }
    },

    // ========== EPICA (32% probabilidad) ==========
    {
        id: 'seismic_wave',
        name: 'Onda Sismica',
        description: '+25% Area de ataque',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.getWeapons) {
                scene.player.getWeapons().forEach((w: any) => {
                    if (w.config.name === 'Titan Punch') {
                        w.config.range *= 1.25;
                    }
                });
            }
        }
    },
    {
        id: 'retaliation',
        name: 'Represalia',
        description: 'Devuelve 10% del dano recibido',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.thorns += 0.1;
            }
        }
    },
    {
        id: 'adrenaline',
        name: 'Adrenalina',
        description: '+5% Velocidad por 2s al recibir dano',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasAdrenaline = true;
            }
        }
    },
    {
        id: 'blood_rage',
        name: 'Furia Sangrienta',
        description: '+15% Probabilidad de robo de vida',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.bloodRageBonus += 0.15;
            }
        }
    },
    {
        id: 'titan_resilience',
        name: 'Resiliencia Titan',
        description: 'Regenera 2 HP por segundo',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasRegeneration = true;
                scene.player.ability.regenAmount += 2;
            }
        }
    },
    {
        id: 'fury',
        name: 'Furia',
        description: '+50% dano cuando vida < 30%',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.hasFury = true;
            }
        }
    },
    {
        id: 'vampiric_strikes',
        name: 'Golpes Vampiricos',
        description: '+10% Curacion por robo de vida',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.lifestealHealPercent += 0.10;
            }
        }
    },

    // ========== LEGENDARIA (5% probabilidad) ==========
    {
        id: 'titan_form',
        name: 'Forma Titan',
        description: 'Tamano x2, +50% HP, +50% Dano',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player) {
                if (scene.player.mesh) {
                    scene.player.mesh.scale.set(1.5, 1.5, 1.5);
                }
                scene.player.maxHealth = Math.ceil(scene.player.maxHealth * 1.5);
                scene.player.health = scene.player.maxHealth;
                if (scene.player.ability) {
                    scene.player.ability.damage = Math.ceil(scene.player.ability.damage * 1.5);
                }
            }
        }
    },
    {
        id: 'earthquake',
        name: 'Terremoto',
        description: '20% de aturdir enemigos al golpear',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.stunChance = 0.2;
            }
        }
    },
    {
        id: 'berserk_mode',
        name: 'Modo Berserk',
        description: 'Cada 100 muertes: Q para matar de un golpe y curar',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.canBerserk = true;
                console.log('[PROJECT A] BERSERK MODE UNLOCKED! Kill 100 enemies then press Q!');
            }
        }
    },
    {
        id: 'immortal_titan',
        name: 'Titan Inmortal',
        description: '+25% Reduccion de dano, +5 HP/s regeneracion',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.damageReduction += 0.25;
                scene.player.ability.hasRegeneration = true;
                scene.player.ability.regenAmount += 5;
            }
        }
    }
];
