import { AbilityOption } from '../ability-option';

export const ArcadioSkills: AbilityOption[] = [
    // BASIC
    {
        id: 'iron_skin',
        name: 'Iron Skin',
        description: '+10% Damage Reduction',
        rarity: 'basica',
        effect: (scene: any) => {
            // Assuming player has a damageReduction property or we modify takeDamage logic
            // For now, we can just buff health as a proxy or add a property
            if (!scene.player.damageReduction) scene.player.damageReduction = 0;
            scene.player.damageReduction += 0.1;
        }
    },
    {
        id: 'heavy_hand',
        name: 'Heavy Hand',
        description: '+20% Knockback Force',
        rarity: 'basica',
        effect: (scene: any) => {
            // We need to access the ability to modify knockback
            // Or just set a flag on player
            if (!scene.player.knockbackMultiplier) scene.player.knockbackMultiplier = 1;
            scene.player.knockbackMultiplier += 0.2;
        }
    },
    {
        id: 'vitality',
        name: 'Vitality',
        description: '+30 Max HP',
        rarity: 'basica',
        effect: (scene: any) => {
            scene.player.maxHealth += 30;
            scene.player.health += 30;
        }
    },

    // EPIC
    {
        id: 'seismic_wave',
        name: 'Seismic Wave',
        description: '+25% Attack Area/Range',
        rarity: 'epica',
        effect: (scene: any) => {
            scene.player.getWeapons().forEach((w: any) => {
                if (w.config.name === 'Titan Punch') {
                    w.config.range *= 1.25;
                }
            });
        }
    },
    {
        id: 'retaliation',
        name: 'Retaliation',
        description: 'Return 10% damage taken',
        rarity: 'epica',
        effect: (scene: any) => {
            if (!scene.player.thorns) scene.player.thorns = 0;
            scene.player.thorns += 0.1;
        }
    },
    {
        id: 'adrenaline',
        name: 'Adrenaline',
        description: '+5% Speed for 2s after hit',
        rarity: 'epica',
        effect: (scene: any) => {
            scene.player.hasAdrenaline = true;
        }
    },

    // LEGENDARY
    {
        id: 'titan_form',
        name: 'Titan Form',
        description: 'Double size, +50% HP, +50% Damage',
        rarity: 'legendaria',
        effect: (scene: any) => {
            scene.player.setScale(2); // Assuming container scaling works
            scene.player.maxHealth *= 1.5;
            scene.player.health = scene.player.maxHealth;
            scene.player.damage *= 1.5;
        }
    },
    {
        id: 'earthquake',
        name: 'Earthquake',
        description: 'Attacks have 20% chance to stun',
        rarity: 'legendaria',
        effect: (scene: any) => {
            scene.player.stunChance = 0.2;
        }
    }
];
