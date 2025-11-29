import * as Phaser from 'phaser';
import { CharacterAbility } from './character-ability';
import { Player } from '../entities/player.entity';
import { Enemy } from '../entities/enemy.entity';
import { Projectile } from '../entities/projectile.entity';
import { PunchWeapon } from '../entities/weapons/punch.weapon';
import { ArcadioSkills } from './skills/arcadio.skills';

export class ArcadioAbility implements CharacterAbility {
    name = 'Titan Strength';
    description = 'Uses a powerful melee punch and has increased resistance.';
    private scene!: Phaser.Scene;
    private player!: Player;

    initialize(scene: Phaser.Scene, player: Player): void {
        this.scene = scene;
        this.player = player;

        // Equip Punch Weapon
        // We need to clear existing weapons first or just add it?
        // For now, let's assume we replace the default weapon or add it as primary.
        // Since Player has a list, we can just add it.
        // Ideally, we should remove the default "peashooter" if it exists.

        // Hack: Clear weapons array to remove default, then add Punch
        // Note: This might remove other weapons if called later, but initialize is called at start.
        (player as any).weapons = [];

        const punch = new PunchWeapon(scene, player);
        player.addWeapon(punch);
    }

    update(time: number, delta: number): void {
        // No active update needed
    }

    onProjectileHit(projectile: Projectile, enemy: Enemy, damage: number): void {
        // Not used for PunchWeapon as it doesn't use Projectile class
    }

    onEnemyHitPlayer(enemy: Enemy, player: Player): void {
        // Thorns effect? Or just resistance visual
        // For now, just a "clang" sound visual effect
    }

    getUpgrades(): any[] {
        return ArcadioSkills;
    }
}
