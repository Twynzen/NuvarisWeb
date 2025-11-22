import * as Phaser from 'phaser';
import { Weapon } from '../weapon.entity';
import { Player } from '../player.entity';
import { VisualComponent } from '../../components/visual.component';
import { GameConfig } from '../../config/game.config';

export class PunchWeapon extends Weapon {
    constructor(scene: Phaser.Scene, player: Player) {
        super(scene, player, {
            name: 'Titan Punch',
            damage: 40,
            cooldown: 800, // 0.8 seconds
            range: 150, // Short range
            projectileSpeed: 0, // Not a projectile
            level: 1
        });
    }

    protected override fire(target: any): void {
        // Calculate direction to target (or mouse/aim)
        // Since we pass a target, we use that. Ideally we'd use mouse position if available,
        // but for now we stick to the auto-aim logic or just aim at the closest enemy.

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);

        // 1. Visual Effect: "hit-arcadio" asset appearing in front
        const offset = 60;
        const x = this.player.x + Math.cos(angle) * offset;
        const y = this.player.y + Math.sin(angle) * offset;

        const punchVisual = new VisualComponent(this.scene, {
            type: 'sprite',
            texture: 'arcadio-hit',
            width: 80,
            height: 80
        });
        punchVisual.setPosition(x, y);
        punchVisual.setRotation(angle);
        punchVisual.setDepth(GameConfig.depths.projectile);

        // Animation: Scale up and fade out
        punchVisual.setScale(0.5);
        punchVisual.setAlpha(1);

        this.scene.tweens.add({
            targets: punchVisual,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => punchVisual.destroy()
        });

        // 2. Area Damage (Cone / Circle in front)
        const enemies = this.getActiveEnemies();
        const hitRadius = 100; // Radius of the punch impact
        const coneAngle = Math.PI / 2; // 90 degrees cone

        enemies.forEach(enemy => {
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

            // Check if within impact radius
            if (dist <= hitRadius) {
                // Apply damage
                enemy.takeDamage(this.config.damage);

                // Apply Knockback (Heavy)
                if (enemy.body) {
                    const knockbackForce = 400; // Very strong
                    const pushAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);

                    // Use applyKnockback if available (it should be)
                    if (enemy.applyKnockback) {
                        enemy.applyKnockback(
                            Math.cos(pushAngle) * knockbackForce,
                            Math.sin(pushAngle) * knockbackForce,
                            300 // Duration
                        );
                    } else {
                        // Fallback
                        enemy.body.setVelocity(
                            Math.cos(pushAngle) * knockbackForce,
                            Math.sin(pushAngle) * knockbackForce
                        );
                    }
                }

                // Screen shake on hit
                this.scene.cameras.main.shake(50, 0.002);
            }
        });

        // Trigger player animation
        this.player.onShoot(target.x, target.y);
    }
}
