import * as Phaser from 'phaser';
import { CharacterAbility } from './character-ability';
import { Player } from '../entities/player.entity';
import { Enemy } from '../entities/enemy.entity';
import { Projectile } from '../entities/projectile.entity';
import { LarsSkills } from './skills/lars.skills';

export class LarsAbility implements CharacterAbility {
    name = 'Mind Control';
    description = 'Chance to convert enemies to fight for you.';
    private scene!: Phaser.Scene;
    private player!: Player;
    private conversionChance = 0.1; // 10% chance
    public controlChance = 0.1; // 10% base
    public minionHealthMult = 1;
    public minionDamageMult = 1;
    public areaControl = false;
    public minionDurationMult = 1;
    public healOnExplode = false;
    public minionsConvert = false;
    public canConvertElites = false;

    // Ability: Manual Explosion (Unlockable)
    public canExplodeMinions = false;

    initialize(scene: Phaser.Scene, player: Player): void {
        this.scene = scene;
        this.player = player;
    }

    update(time: number, delta: number): void {
        // Nothing specific per frame
    }

    onProjectileHit(projectile: Projectile, enemy: Enemy, damage: number): void {
        // Chance to convert
        if (Math.random() < this.conversionChance && !enemy.isMindControlled) {
            enemy.mindControl();
        }
    }

    onEnemyHitPlayer(enemy: Enemy, player: Player): void {
        // Maybe fear effect?
    }

    /**
     * Trigger explosion of all mind-controlled minions
     */
    triggerExplosion(): void {
        if (!this.canExplodeMinions) return;

        const enemies = this.scene.data.get('enemyGroup') as Phaser.GameObjects.Group;
        if (!enemies) return;

        enemies.getChildren().forEach(child => {
            const enemy = child as Enemy;
            if (enemy.isActive && enemy.isMindControlled) {
                enemy.manualExplode();
            }
        });
    }

    getUpgrades(): any[] {
        return LarsSkills;
    }
}
