import { AbilityOption } from '../ability-option';

export const LarsSkills: AbilityOption[] = [
    // BASIC
    {
        id: 'persuasion',
        name: 'Persuasion',
        description: '+5% Mind Control Chance',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player.ability && scene.player.ability.name === 'Mind Control') {
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
            if (scene.player.ability) {
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
            if (scene.player.ability) {
                scene.player.ability.minionDamageMult = (scene.player.ability.minionDamageMult || 1) + 0.2;
            }
        }
    },

    // EPIC
    {
        id: 'mass_hysteria',
        name: 'Mass Hysteria',
        description: 'Mind Control affects small area',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player.ability) {
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
            if (scene.player.ability) {
                scene.player.ability.minionDurationMult = (scene.player.ability.minionDurationMult || 1) + 0.5;
            }
        }
    },
    {
        id: 'sacrifice',
        name: 'Sacrifice',
        description: 'Minion explosion heals 5 HP',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player.ability) {
                scene.player.ability.healOnExplode = true;
            }
        }
    },

    // LEGENDARY
    {
        id: 'hive_mind',
        name: 'Hive Mind',
        description: 'Minions can convert others',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player.ability) {
                scene.player.ability.minionsConvert = true;
            }
        }
    },
    {
        id: 'rebellion',
        name: 'Rebellion',
        description: 'Can convert Elite enemies',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player.ability) {
                scene.player.ability.canConvertElites = true;
            }
        }
    }
];
