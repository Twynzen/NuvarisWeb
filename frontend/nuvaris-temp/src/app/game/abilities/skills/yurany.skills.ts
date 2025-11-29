import { AbilityOption } from '../ability-option';

export const YuranySkills: AbilityOption[] = [
    // BASIC
    {
        id: 'conductivity',
        name: 'Conductivity',
        description: '+20% Chain Range',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player.ability && scene.player.ability.name === 'Chain Lightning') {
                scene.player.ability.chainRange *= 1.2;
            }
        }
    },
    {
        id: 'voltage',
        name: 'Voltage',
        description: '+15% Chain Damage',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player.ability && scene.player.ability.name === 'Chain Lightning') {
                scene.player.ability.chainDamagePercent += 0.15;
            }
        }
    },
    {
        id: 'quick_charge',
        name: 'Quick Charge',
        description: '+10% Attack Speed',
        rarity: 'basica',
        effect: (scene: any) => {
            scene.player.getWeapons().forEach((w: any) => {
                w.config.cooldown *= 0.9;
            });
        }
    },

    // EPIC
    {
        id: 'overload',
        name: 'Overload',
        description: '+1 Chain Bounce',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player.ability && scene.player.ability.name === 'Chain Lightning') {
                scene.player.ability.maxBounces = (scene.player.ability.maxBounces || 1) + 1;
            }
        }
    },
    {
        id: 'static_shock',
        name: 'Static Shock',
        description: 'Chains have 15% chance to stun',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player.ability && scene.player.ability.name === 'Chain Lightning') {
                scene.player.ability.stunChance = 0.15;
            }
        }
    },
    {
        id: 'energized',
        name: 'Energized',
        description: '+10% Speed per active chain',
        rarity: 'epica',
        effect: (scene: any) => {
            // Complex logic, maybe just flat speed for now
            scene.player.speed *= 1.1;
        }
    },

    // LEGENDARY
    {
        id: 'thunderstorm',
        name: 'Thunderstorm',
        description: 'Lightning strikes random enemies',
        rarity: 'legendaria',
        effect: (scene: any) => {
            // Start a timer in the ability
            if (scene.player.ability) {
                scene.player.ability.hasThunderstorm = true;
            }
        }
    },
    {
        id: 'plasma_arc',
        name: 'Plasma Arc',
        description: 'Chains ignore armor (True Damage)',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player.ability) {
                scene.player.ability.trueDamage = true;
            }
        }
    }
];
