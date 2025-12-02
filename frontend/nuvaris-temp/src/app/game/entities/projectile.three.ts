import * as THREE from 'three';
import { SpriteAnimator } from '../engine/sprite-animator';

export class ProjectileThree {
    public mesh: THREE.Group;
    private sprite: THREE.Sprite;
    private animator: SpriteAnimator;
    private speed = 20;
    private direction: THREE.Vector3;
    public damage = 10;
    public isDead = false;
    private lifeTime = 2; // seconds
    private characterId: string;

    // ========== ARCADIO HOZ CURVA ==========
    private isCurvedProjectile = false;
    private curveProgress = 0; // 0 to 1 (represents 1/4 circle arc)
    private curveRadius = 6; // Radio del arco
    private curveSpeed = 3; // Velocidad del arco (más alto = más rápido)
    private startPosition!: THREE.Vector3;
    private curveCenter!: THREE.Vector3; // Centro del arco
    private startAngle = 0; // Ángulo inicial
    private curveDirection = 1; // 1 = clockwise, -1 = counter-clockwise

    constructor(scene: THREE.Scene, x: number, z: number, direction: THREE.Vector3, characterId: string) {
        this.characterId = characterId;
        this.direction = direction.normalize();
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 1, z);
        this.startPosition = new THREE.Vector3(x, 1, z);

        // Sprite & Material
        const material = new THREE.SpriteMaterial({
            transparent: true,
            color: 0xffffff
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.center.set(0.5, 0.5);
        this.sprite.scale.set(2, 2, 1);
        this.mesh.add(this.sprite);

        scene.add(this.mesh);

        // Animator
        this.animator = new SpriteAnimator(material);
        this.loadAnimation(characterId);
        this.animator.play('shoot', true, 30);

        // ARCADIO: Configurar proyectil curvo (hoz)
        if (characterId === 'arcadio') {
            this.setupCurvedProjectile();
        }
    }

    /**
     * Configura el proyectil curvo para Arcadio (hoz que hace 1/4 de círculo)
     * La hoz barre HACIA el enemigo, empezando desde un lado del jugador
     */
    private setupCurvedProjectile(): void {
        this.isCurvedProjectile = true;
        this.damage = 40; // Daño de Arcadio
        this.lifeTime = 0.6; // Duración del arco
        this.curveProgress = 0;

        // El centro del arco es la posición del jugador
        this.curveCenter = this.startPosition.clone();

        // Calcular ángulo hacia el enemigo (dirección del ataque)
        const angleToEnemy = Math.atan2(this.direction.z, this.direction.x);

        // El arco empieza 45° antes de la dirección al enemigo y termina 45° después
        // Esto crea un barrido de 90° centrado en el enemigo
        this.startAngle = angleToEnemy - (Math.PI / 4); // 45° antes

        // Dirección del barrido (siempre hacia adelante)
        this.curveDirection = 1;

        // Escala más grande para la hoz
        this.sprite.scale.set(3, 3, 1);
    }

    private loadAnimation(characterId: string) {
        let folder = characterId;
        let prefix = `${characterId}-shoot-`;

        if (characterId === 'yurany') {
            folder = 'proyecto-y';
            prefix = 'y-shoot-';
        }

        this.animator.loadAnimation({
            name: 'shoot',
            texturePath: `assets/${folder}/shoot/shoot`,
            prefix: prefix,
            suffix: '.png',
            frameCount: 30,
            frameRate: 30,
            loop: true
        });
    }

    update(delta: number) {
        this.lifeTime -= delta;
        if (this.lifeTime <= 0) {
            this.isDead = true;
            this.mesh.visible = false;
            return;
        }

        if (this.isCurvedProjectile) {
            // ========== MOVIMIENTO CURVO (HOZ) ==========
            // La hoz barre un arco de 90° centrado en la dirección al enemigo
            this.curveProgress += delta * this.curveSpeed;

            // Arco de 90 grados (PI/2 radianes)
            const arcAngle = Math.PI / 2;
            const currentArc = Math.min(this.curveProgress, 1.0) * arcAngle;

            // Calcular ángulo actual (empieza en startAngle y barre hacia adelante)
            const angle = this.startAngle + currentArc;

            // Calcular posición en el arco alrededor del jugador (curveCenter)
            const newX = this.curveCenter.x + Math.cos(angle) * this.curveRadius;
            const newZ = this.curveCenter.z + Math.sin(angle) * this.curveRadius;

            this.mesh.position.x = newX;
            this.mesh.position.z = newZ;

            // Rotar el sprite para que apunte tangente a la curva
            this.sprite.material.rotation = angle + Math.PI / 2;

            // Morir cuando complete el arco
            if (this.curveProgress >= 1) {
                this.isDead = true;
                this.mesh.visible = false;
            }
        } else {
            // ========== MOVIMIENTO LINEAL (Lars, Yurany) ==========
            this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * delta));
        }

        this.animator.update(delta);
    }
}
