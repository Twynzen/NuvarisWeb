import { AbilityOption } from '../ability-option';

export const YuranySkills: AbilityOption[] = [
    // ==================== BASIC (63% chance) ====================
    {
        id: 'conductivity',
        name: 'Conductivity',
        description: '+20% Chain Range',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
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
            if (scene.player?.ability) {
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
            if (scene.player?.getWeapons) {
                scene.player.getWeapons().forEach((w: any) => {
                    w.config.cooldown *= 0.9;
                });
            }
        }
    },
    {
        id: 'sharp_reflexes',
        name: 'Sharp Reflexes',
        description: '+5% Dodge Chance',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.dodgeChance += 0.05;
            }
        }
    },
    {
        id: 'precision',
        name: 'Precision',
        description: '+10% Critical Hit Chance',
        rarity: 'basica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.critChance += 0.10;
            }
        }
    },

    // ==================== EPIC (32% chance) ====================
    {
        id: 'overload',
        name: 'Overload',
        description: '+1 Chain Bounce',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.maxBounces = (scene.player.ability.maxBounces || 1) + 1;
            }
        }
    },
    {
        id: 'static_shock',
        name: 'Static Shock',
        description: 'Chains have 15% stun chance',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.stunChance = 0.15;
            }
        }
    },
    {
        id: 'phantom_dash',
        name: 'Phantom Dash',
        description: 'Unlock Dash ability (press Q)',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.canDash = true;
            }
        }
    },
    {
        id: 'deadly_precision',
        name: 'Deadly Precision',
        description: '+15% Crit Chance, +25% Crit Damage',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.critChance += 0.15;
                scene.player.ability.critMultiplier += 0.25;
            }
        }
    },
    {
        id: 'energized',
        name: 'Energized',
        description: '+10% Movement Speed',
        rarity: 'epica',
        effect: (scene: any) => {
            if (scene.player) {
                scene.player.speed *= 1.1;
            }
        }
    },

    // ==================== LEGENDARY (5% chance) ====================
    {
        id: 'thunderstorm',
        name: 'Thunderstorm',
        description: 'Lightning strikes random enemies every 2s',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
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
            if (scene.player?.ability) {
                scene.player.ability.trueDamage = true;
            }
        }
    },
    {
        id: 'perfect_evasion',
        name: 'Perfect Evasion',
        description: '+20% Dodge, 200% Crit Damage',
        rarity: 'legendaria',
        effect: (scene: any) => {
            if (scene.player?.ability) {
                scene.player.ability.dodgeChance += 0.20;
                scene.player.ability.critMultiplier = 2.0;
            }
        }
    }
];
