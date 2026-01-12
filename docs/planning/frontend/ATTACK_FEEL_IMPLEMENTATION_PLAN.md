# Plan de Implementacion: Attack Feel System
## Nuvariz - Sensacion de Disparo por Personaje

---

## RESPUESTA TECNICA A GEMINI

### Como manejamos sprites actualmente:

```typescript
// THREE.SpriteMaterial con texturas INDIVIDUALES (NO atlas UV)
const material = new THREE.SpriteMaterial({ transparent: true });
this.sprite = new THREE.Sprite(material);

// SpriteAnimator cambia material.map cada frame
class SpriteAnimator {
    update(delta) {
        if (timeSinceLastFrame >= frameDuration) {
            this.spriteMaterial.map = frames[currentFrameIndex]; // Cambio de textura
        }
    }
}
```

**Conclusion:** Podemos interrumpir animaciones facilmente. El sistema permite Key Poses seleccionando frames especificos de los 30 existentes.

---

## ESTRUCTURA ACTUAL DE ASSETS

### Animacion del PERSONAJE disparando:
```
assets/{character}/shoot/
├── down/     -> {char}-shoot-down-001.png a 030.png (30 frames)
├── up/       -> {char}-shoot-up-001.png a 030.png   (30 frames)
├── left/     -> {char}-shoot-left-001.png a 030.png (30 frames)
├── right/    -> {char}-shoot-right-001.png a 030.png(30 frames)
└── shoot/    -> PROYECTIL: {char}-shoot-001.png a 030.png
```

### Animacion del PROYECTIL volando:
```
assets/{character}/shoot/shoot/
└── {character}-shoot-001.png a 030.png (30 frames en loop)
```

| Personaje | Prefijo Personaje | Prefijo Proyectil |
|-----------|-------------------|-------------------|
| Proyecto A | proyecto-a-shoot-{dir}- | proyecto-a-shoot- |
| Proyecto Y | proyecto-y-shoot-{dir}- | proyecto-y-shoot- |
| Lars | lars-shoot-{dir}- | lars-shoot- |

---

## DIAGNOSTICO REAL DEL PROBLEMA

### Codigo Actual (player.three.ts)

```typescript
// Linea 143-161: Carga de animaciones de disparo
this.animator.loadAnimation({
    name: 'shoot-right',
    texturePath: `assets/${folder}/shoot/right`,
    prefix: `${prefix}shoot-right-`,
    frameCount: 30,     // <-- PROBLEMA: 30 frames
    frameRate: 30,      // <-- A 30 FPS = 1 SEGUNDO de animacion
    loop: false
});

// Linea 351: Reproduccion
this.animator.play(shootAnim, false, 30);

// Linea 355-357: Reset del estado
setTimeout(() => {
    this.isShooting = false;
}, 1000);  // <-- 1 segundo completo
```

### Codigo Actual (projectile.three.ts)

```typescript
// Linea 91-99: Carga del proyectil
this.animator.loadAnimation({
    name: 'shoot',
    texturePath: `assets/${folder}/shoot/shoot`,
    frameCount: 30,     // <-- 30 frames de proyectil
    frameRate: 30,
    loop: true          // <-- Loop continuo mientras vuela
});

// Linea 48: Reproduccion
this.animator.play('shoot', true, 30);
```

### Problema Resumido

| Elemento | Estado Actual | Problema |
|----------|--------------|----------|
| Animacion personaje | 30 frames @ 30 FPS | 1 segundo de lag visual |
| Proyectil spawn | Frame 0 (inmediato) | OK pero animacion no acompana |
| Proyectil animacion | 30 frames loop | OK para vuelo, no para impacto |
| Cooldown | 1.1 segundos fijo | No diferenciado por personaje |
| Diferenciacion | Misma logica todos | Sin identidad unica |

---

## SOLUCION PROPUESTA

### Estrategia: Key Poses desde assets existentes

**NO necesitamos crear nuevos sprites.** Podemos seleccionar frames clave de los 30 existentes.

#### Analisis visual necesario:
Revisar cada secuencia de 30 frames e identificar:
1. **Frame de anticipacion** (preparar el ataque)
2. **Frame de accion** (momento del disparo/golpe)
3. **Frame de recuperacion** (volver a pose neutra)

### Modificaciones al SpriteAnimator

```typescript
// Nuevo metodo: Reproducir solo frames especificos
playKeyFrames(
    animName: string,
    frames: number[],    // Ej: [1, 8, 15, 22] para 4 key poses
    frameRate: number,
    loop: boolean,
    onComplete?: () => void
): void

// Nuevo metodo: Callback en frame especifico
onFrameReached(frameNum: number, callback: () => void): void
```

---

## CONFIGURACION POR PERSONAJE

### 1. PROYECTO Y (Yurany) - Rayo Electrico
**Identidad:** Instantaneo, veloz, preciso

```typescript
const PROYECTO_Y_CONFIG = {
    // Seleccionar 3 frames de los 30 existentes
    // Necesita analisis visual: buscar frames de:
    // - Pose neutral/inicio
    // - Mano extendida (momento del rayo)
    // - Retorno rapido
    keyFrames: [1, 10, 20],  // EJEMPLO - ajustar tras revision visual

    animation: {
        frameRate: 60,        // Muy rapido
        totalDuration: 50,    // ~50ms
        projectileSpawnFrame: 1  // Spawn en frame de accion
    },

    projectile: {
        // Mantener 30 frames en loop - el rayo volando se ve bien
        speed: 25,
        lifetime: 1.5
    },

    timing: {
        cooldown: 0.8,
        canMoveWhileShooting: true
    }
};
```

### 2. PROYECTO A (Arcadio) - Hoz Curva
**Identidad:** Poder bruto, peso, devastador

```typescript
const PROYECTO_A_CONFIG = {
    // Seleccionar 8 frames para anticipacion pesada
    // Buscar frames de:
    // - Pose inicial (frames 1-2)
    // - Levantando arma/cargando (frames 3-5)
    // - Golpe maximo (frame ~12-15)
    // - Recuperacion (frames 20-25)
    keyFrames: [1, 3, 6, 9, 12, 18, 24, 28], // EJEMPLO

    animation: {
        frameRate: 20,         // Mas lento = mas peso
        totalDuration: 400,    // ~400ms
        projectileSpawnFrame: 4 // Spawn despues de carga
    },

    projectile: {
        // La hoz ya tiene movimiento curvo implementado
        curveRadius: 6,
        curveSpeed: 3,
        damage: 40
    },

    timing: {
        cooldown: 1.2,
        canMoveWhileShooting: false,
        rootMotion: 0.5  // Avance sutil durante ataque
    }
};
```

### 3. LARS - Control Mental
**Identidad:** Misterioso, canalizado, ominoso

```typescript
const LARS_CONFIG = {
    // Sistema de 2 partes: inicio + loop
    // Buscar frames de:
    // - Inicio canalizacion (frames 1-5)
    // - Loop sostenido (frames 10-20 en bucle)
    // - Liberacion (frames 25-30)
    startupFrames: [1, 3, 5],
    loopFrames: [10, 12, 14, 16, 18],  // Bucle de canalizacion
    releaseFrames: [25, 27, 30],

    animation: {
        startupFrameRate: 30,
        loopFrameRate: 15,     // Mas lento durante canal
        releaseFrameRate: 30,
        projectileSpawnFrame: 3 // Al terminar startup
    },

    projectile: {
        speed: 18,
        lifetime: 2.0
    },

    timing: {
        cooldown: 1.0,
        canMoveWhileShooting: true,
        movementSpeedMultiplier: 0.5  // 50% velocidad mientras canaliza
    }
};
```

---

## PLAN DE IMPLEMENTACION DETALLADO

### Fase 1: Analisis Visual de Assets
**Responsable: Daniel**

1. Abrir las secuencias de 30 frames de cada personaje
2. Identificar los KEY FRAMES para cada fase:
   - Anticipacion
   - Accion (disparo/golpe)
   - Recuperacion
3. Documentar los numeros de frame seleccionados

**Herramienta sugerida:** Cualquier visor de imagenes que muestre miniaturas

### Fase 2: Modificar SpriteAnimator
**Implementacion en codigo**

Archivo: `sprite-animator.ts`

```typescript
// Agregar:
private keyFrameMode = false;
private keyFrames: number[] = [];
private keyFrameIndex = 0;
private onCompleteCallback?: () => void;
private frameCallbacks: Map<number, () => void> = new Map();

playKeyFrames(animName: string, frames: number[], frameRate: number,
              loop: boolean, onComplete?: () => void): void {
    this.keyFrameMode = true;
    this.keyFrames = frames;
    this.keyFrameIndex = 0;
    this.currentAnimation = animName;
    this.loop = loop;
    this.frameDuration = 1 / frameRate;
    this.onCompleteCallback = onComplete;

    // Mostrar primer key frame
    const actualFrame = this.keyFrames[0] - 1; // 0-indexed
    this.spriteMaterial.map = this.animations[animName][actualFrame];
}

onFrameReached(frameNum: number, callback: () => void): void {
    this.frameCallbacks.set(frameNum, callback);
}

// Modificar update() para soportar key frames
```

### Fase 3: Sistema AttackFeel por Personaje
**Nuevos archivos**

```
src/app/game/combat/
├── attack-feel.config.ts    // Configuraciones por personaje
├── attack-feel.system.ts    // Sistema principal
└── attack-states.ts         // Estados de ataque
```

### Fase 4: Integrar en Player
**Modificar player.three.ts**

```typescript
// Reemplazar shoot() actual con:
shoot(scene: THREE.Scene, targetPosition?: THREE.Vector3): ProjectileThree | null {
    if (this.isShooting) return null;

    const config = ATTACK_FEEL_CONFIGS[this.characterId];
    const direction = this.calculateShootDirection(targetPosition);
    const shootAnim = this.getDirectionalAnimation('shoot', direction);

    this.isShooting = true;

    // Usar key frames en lugar de todos los 30
    this.animator.playKeyFrames(
        shootAnim,
        config.keyFrames,
        config.animation.frameRate,
        false,
        () => { this.isShooting = false; }
    );

    // Spawn proyectil en frame especifico
    this.animator.onFrameReached(config.animation.projectileSpawnFrame, () => {
        return new ProjectileThree(scene, this.mesh.position.x,
                                   this.mesh.position.z, direction,
                                   this.characterId);
    });
}
```

### Fase 5: VFX y Pulido
**Efectos visuales por personaje**

- **Proyecto Y:** Muzzle flash cyan, sin screen shake
- **Proyecto A:** Muzzle flash naranja, screen shake fuerte
- **Lars:** Aura purpura pulsante, sin shake

---

## ARCHIVOS A MODIFICAR

| Archivo | Cambios |
|---------|---------|
| `sprite-animator.ts` | Agregar `playKeyFrames()`, `onFrameReached()` |
| `player.three.ts` | Refactorizar `shoot()` para usar configs |
| `projectile.three.ts` | Mantener igual por ahora |
| NUEVO: `attack-feel.config.ts` | Configuraciones por personaje |
| NUEVO: `attack-feel.system.ts` | Sistema de gestion |

---

## METRICAS DE EXITO

| Personaje | Input-to-Visual | Input-to-Damage | Sensacion |
|-----------|-----------------|-----------------|-----------|
| Proyecto Y | <50ms | <100ms | Instantaneo, preciso |
| Proyecto A | <100ms | ~400ms | Pesado, poderoso |
| Lars | <80ms | <150ms | Misterioso, fluido |

---

## PROXIMOS PASOS INMEDIATOS

1. **Daniel:** Revisar visualmente los 30 frames de cada animacion shoot
2. **Daniel:** Identificar y documentar key frames por personaje
3. **Claude:** Implementar modificaciones a SpriteAnimator
4. **Prueba:** Validar con Proyecto Y (mas simple)
5. **Iterar:** Ajustar framerates y timing segun feedback

---

## NOTAS IMPORTANTES

### Sobre los 30 frames existentes
Los 30 frames ya estan ahi - no necesitas regenerarlos. La estrategia es **seleccionar** los frames clave, no crear nuevos.

### Mirror de sprites
Ya tienes left/right separados. No es necesario mirror por ahora.

### El proyectil ya funciona
La animacion del proyectil volando (shoot/shoot/) esta bien con 30 frames en loop. El cambio es principalmente en la animacion del PERSONAJE.

### Probar incrementalmente
Implementar primero en Proyecto Y porque es el mas simple (instantaneo). Una vez funcione, escalar a Proyecto A y Lars.

---

*Documento actualizado: 2025-12-13*
*Con analisis completo de assets existentes*
*Colaboracion: Daniel (Director) + Claude (Implementacion) + Gemini (Consultoria)*
