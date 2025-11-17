import * as Phaser from 'phaser';

export class ParticleManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create explosion effect
   */
  createExplosion(x: number, y: number, color: number = 0xff6600, count: number = 16): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = Phaser.Math.Between(100, 200);
      const size = Phaser.Math.Between(4, 8);

      const particle = this.scene.add.circle(x, y, size, color);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create hit effect
   */
  createHitEffect(x: number, y: number, color: number = 0xffffff): void {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 100);
      const size = Phaser.Math.Between(3, 6);

      const particle = this.scene.add.circle(x, y, size, color);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create level-up effect
   */
  createLevelUpEffect(x: number, y: number): void {
    // Expanding ring
    const ring = this.scene.add.circle(x, y, 10, 0xffff00, 0);
    ring.setStrokeStyle(4, 0xffff00);

    this.scene.tweens.add({
      targets: ring,
      radius: 150,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });

    // Sparkles
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 / 24) * i;
      const distance = 50;

      const sparkle = this.scene.add.star(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        5,
        4,
        8,
        0xffff00
      );

      this.scene.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * (distance + 100),
        y: y + Math.sin(angle) * (distance + 100),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 600,
        delay: i * 20,
        onComplete: () => sparkle.destroy()
      });
    }
  }

  /**
   * Create trail effect
   */
  createTrail(x: number, y: number, color: number = 0x00ffff): void {
    const particle = this.scene.add.circle(x, y, 4, color, 0.8);

    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => particle.destroy()
    });
  }

  /**
   * Create blood splatter
   */
  createBloodSplatter(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(30, 80);
      const size = Phaser.Math.Between(2, 5);

      const particle = this.scene.add.circle(x, y, size, 0x990000);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create boss entrance effect
   */
  createBossEntranceEffect(x: number, y: number): void {
    // Lightning strikes
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const distance = 200;

      const lightning = this.scene.add.line(
        0, 0,
        x, y,
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        0xff00ff
      );
      lightning.setLineWidth(3);
      lightning.setAlpha(0.8);

      this.scene.tweens.add({
        targets: lightning,
        alpha: 0,
        duration: 300,
        delay: i * 50,
        onComplete: () => lightning.destroy()
      });
    }

    // Central explosion
    this.createExplosion(x, y, 0xff00ff, 32);
  }

  /**
   * Create text popup
   */
  createTextPopup(x: number, y: number, text: string, color: string = '#ffffff'): void {
    const textObj = this.scene.add.text(x, y, text, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    textObj.setOrigin(0.5);
    textObj.setDepth(1000);

    this.scene.tweens.add({
      targets: textObj,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => textObj.destroy()
    });
  }

  /**
   * Create damage number popup
   */
  createDamageNumber(x: number, y: number, damage: number, isCrit: boolean = false): void {
    const color = isCrit ? '#ff0000' : '#ffffff';
    const fontSize = isCrit ? '32px' : '20px';
    const text = isCrit ? `${damage}!` : `${damage}`;

    const textObj = this.scene.add.text(x, y, text, {
      fontSize: fontSize,
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    textObj.setOrigin(0.5);
    textObj.setDepth(999);

    this.scene.tweens.add({
      targets: textObj,
      y: y - 30,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => textObj.destroy()
    });
  }
}
