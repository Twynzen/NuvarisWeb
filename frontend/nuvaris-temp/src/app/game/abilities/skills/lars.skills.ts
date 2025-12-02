import { AbilityOption } from '../ability-option';

export const LarsSkills: AbilityOption[] = [
    // ==================== BASIC (63% chance) ====================
    {
        id: 'persuasion',
        name: 'Persuasion',
        description: '+5% Mind Control chance',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.controlChance += 0.05;
            }
        }
    },
    {
        id: 'leadership',
        name: 'Leadership',
        description: 'Minions have +30% HP',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionHealthMult = (scene.player.ability.minionHealthMult || 1) + 0.3;
            }
        }
    },
    {
        id: 'charisma',
        name: 'Charisma',
        description: 'Minions deal +20% Damage',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionDamageMult = (scene.player.ability.minionDamageMult || 1) + 0.2;
            }
        }
    },
    {
        id: 'neural_freeze',
        name: 'Neural Freeze',
        description: '30% chance to slow enemies by 10%',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.slowChance = 0.3;
                scene.player.ability.slowAmount = 0.1;
            }
        }
    },

    // ==================== EPIC (32% chance) ====================
    {
        id: 'mass_hysteria',
        name: 'Mass Hysteria',
        description: 'Mind Control affects small area',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.areaControl = true;
            }
        }
    },
    {
        id: 'loyalty',
        name: 'Loyalty',
        description: 'Minions last 50% longer',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionDurationMult = (scene.player.ability.minionDurationMult || 1) + 0.5;
            }
        }
    },
    {
        id: 'sacrifice',
        name: 'Sacrifice',
        description: 'Minion explosion heals 5 HP each',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.healOnExplode = true;
                scene.player.ability.healAmount = 5;
            }
        }
    },
    {
        id: 'unstable_mind',
        name: 'Unstable Mind',
        description: '25% chance to explode on fail',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.explodeOnFailChance = 0.25;
            }
        }
    },
    {
        id: 'terror',
        name: 'Terror',
        description: '10% chance to fear enemies on fail',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.fearChance = 0.1;
            }
        }
    },

    // ==================== LEGENDARY (5% chance) ====================
    {
        id: 'hive_mind',
        name: 'Hive Mind',
        description: 'Minions can convert other enemies',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.minionsConvert = true;
            }
        }
    },
    {
        id: 'volatile_psyche',
        name: 'Volatile Psyche',
        description: '50% chance to explode on fail (replaces 25%)',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                // Legendary replaces epic version
                scene.player.ability.explodeOnFailChance = 0.50;
                scene.player.ability.explodeOnFailDamage = 60; // Higher damage too
            }
        }
    },
    {
        id: 'rebellion',
        name: 'Rebellion',
        description: 'Can convert Elite enemies',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.canConvertElites = true;
            }
        }
    }
];
