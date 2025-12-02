import * as Phaser from 'phaser';
import { CharacterAbility } from './character-ability';
import { Player } from '../entities/player.entity';
import { Enemy } from '../entities/enemy.entity';
import { Projectile } from '../entities/projectile.entity';
import { GameConfig } from '../config/game.config';
import { YuranySkills } from './skills/yurany.skills';

export class YuranyAbility implements CharacterAbility {
    name = 'Chain Lightning';
    description = 'Attacks chain to nearby enemies.';
    private scene!: Phaser.Scene;
    private player!: Player;
    public chainRange = 150;
    public chainDamagePercent = 0.5;
    public maxBounces = 1;
    public stunChance = 0;
    public hasThunderstorm = false;
    public trueDamage = false;

    initialize(scene: Phaser.Scene, player: Player): void {
        this.scene = scene;
        this.player = player;
    }

    update(time: number, delta: number): void {
        // Trail effect handled in player/projectile
    }

    onProjectileHit(projectile: Projectile, enemy: Enemy, damage: number): void {
        // Chain Lightning Logic
        const enemies = this.getActiveEnemies();

        // Find closest enemy to the hit enemy that hasn't been hit by this projectile yet
        // (Note: In a real complex system we'd track chain depth, for now 1 bounce)

        let closest: Enemy | null = null;
        let minDist = this.chainRange;

        enemies.forEach(other => {
            if (other === enemy) return; // Don't chain to self

            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y);
            if (dist < minDist) {
                minDist = dist;
                closest = other;
            }
        });

        if (closest) {
            this.triggerChainLightning(enemy, closest, damage * this.chainDamagePercent);
        }
    }

    private triggerChainLightning(source: Enemy, target: Enemy, damage: number): void {
        // Visual: Lightning bolt (White)
        const graphics = this.scene.add.graphics();
        graphics.setDepth(GameConfig.depths.projectile + 1);
        graphics.lineStyle(2, 0xffffff, 1); // White color
        graphics.lineBetween(source.x, source.y, target.x, target.y);

        // Fade out visual
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 200,
            onComplete: () => graphics.destroy()
        });

        // Flash effect on target (Black & White)
        if (target.flash) {
            target.flash(0xffffff, 50); // White flash
            this.scene.time.delayedCall(50, () => {
                if (target.active) target.flash(0x000000, 50); // Black flash
            });
        }

        // Apply damage
        target.takeDamage(damage);
    }

    onEnemyHitPlayer(enemy: Enemy, player: Player): void {
        // Static discharge?
    }

    private getActiveEnemies(): Enemy[] {
        const enemyGroup = this.scene.data.get('enemyGroup') as Phaser.GameObjects.Group;
        if (!enemyGroup) return [];
        return enemyGroup.getChildren()
            .filter(child => child instanceof Enemy && child.isActive) as Enemy[];
    }

    getUpgrades(): any[] {
        return YuranySkills;
    }
}
