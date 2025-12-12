# Game Feel profesional para disparos en Three.js

Los disparos impactantes y satisfactorios resultan de combinar **8 sistemas de feedback sincronizados**: screen shake trauma-based, hit stop de 50-150ms, partículas GPU con three.quarks, audio multicapa con Web Audio API, vibración de gamepad dual-rumble, post-procesado dinámico, y técnicas de "juice" visual como muzzle flash y números de daño. La clave está en la calibración precisa de cada sistema y su coordinación temporal perfecta.

Este documento proporciona implementaciones completas en TypeScript/Three.js con parámetros probados por estudios como Vlambeer (Nuclear Throne, Super Crate Box), Team Cherry (Hollow Knight) y Matt Makes Games (Celeste). Cada técnica incluye código funcional, valores recomendados y consideraciones de rendimiento para navegadores web.

---

## Screen shake trauma-based: el estándar de la industria

El sistema trauma-based, popularizado por Jan Willem Nijman de Vlambeer y formalizado por Squirrel Eiserloh en GDC, mantiene un valor de **trauma entre 0 y 1** donde el shake real = trauma² o trauma³. Esta relación no lineal hace que impactos pequeños sean sutiles mientras los grandes escalen dramáticamente.

```typescript
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

interface ScreenShakeConfig {
  maxTranslationX: number;
  maxTranslationY: number;
  maxRotationZ: number;      // Roll es el más tolerable
  traumaDecay: number;        // Decay por segundo
  traumaPower: number;        // Exponente (2 o 3)
  frequency: number;          // Velocidad de muestreo del ruido
}

class TraumaScreenShake {
  private trauma = 0;
  private time = 0;
  private noise2D = createNoise2D();
  private homePosition = new THREE.Vector3();
  private homeRotation = new THREE.Euler();
  
  private config: ScreenShakeConfig = {
    maxTranslationX: 0.3,
    maxTranslationY: 0.2,
    maxRotationZ: 3,          // grados
    traumaDecay: 1.5,
    traumaPower: 2,
    frequency: 20             // Hz - alto para evitar motion sickness
  };

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(deltaTime: number, camera: THREE.Camera): void {
    if (this.trauma <= 0) {
      camera.position.copy(this.homePosition);
      return;
    }

    this.time += deltaTime;
    const shake = Math.pow(this.trauma, this.config.traumaPower);
    const t = this.time * this.config.frequency;

    // Perlin noise para movimiento suave
    const offsetX = this.config.maxTranslationX * shake * this.noise2D(1, t);
    const offsetY = this.config.maxTranslationY * shake * this.noise2D(10, t);
    const angleZ = THREE.MathUtils.degToRad(this.config.maxRotationZ) * 
                   shake * this.noise2D(100, t);

    camera.position.set(
      this.homePosition.x + offsetX,
      this.homePosition.y + offsetY,
      this.homePosition.z
    );
    camera.rotation.z = this.homeRotation.z + angleZ;

    this.trauma = Math.max(0, this.trauma - this.config.traumaDecay * deltaTime);
  }
}
```

**Valores de trauma recomendados por tipo de evento:**

| Evento | Trauma | Max Translación | Max Rotación | Decay |
|--------|--------|-----------------|--------------|-------|
| Disparo pistola | 0.15-0.20 | 0.15 units | 2° | 2.0/s |
| Disparo rifle | 0.25-0.35 | 0.25 units | 3° | 1.5/s |
| Disparo escopeta | 0.40-0.50 | 0.40 units | 5° | 1.2/s |
| Explosión cercana | 0.60-0.80 | 0.60 units | 8° | 0.8/s |

Para **evitar motion sickness**, mantén la frecuencia de shake por encima de **1 Hz** (las frecuencias alrededor de 0.2 Hz son las más nauseógenas según investigación de Golding et al.), limita la amplitud al **1-2% de la altura de pantalla**, y ofrece siempre una opción para desactivar el shake.

---

## Hit stop: pausas que amplifican el impacto

El hit stop (freeze frames) pausa brevemente la acción al conectar un golpe, dando al ojo tiempo para registrar el impacto. Hollow Knight usa **3-4 frames** (~50-67ms), Celeste usa **2-3 frames** (~33-50ms), y los juegos de peleas como Street Fighter usan **8-12 frames** (133-200ms).

```typescript
class HitStopManager {
  private timeScale = 1;
  private hitStopEndTime = 0;
  private frozenEntities: Set<string> = new Set();

  // Freeze global (todo el mundo se pausa)
  freezeGlobal(durationMs: number): void {
    this.timeScale = 0;
    this.hitStopEndTime = performance.now() + durationMs;
  }

  // Freeze selectivo (solo el enemigo golpeado)
  freezeEntity(entityId: string, durationMs: number): void {
    this.frozenEntities.add(entityId);
    setTimeout(() => this.frozenEntities.delete(entityId), durationMs);
  }

  isEntityFrozen(entityId: string): boolean {
    return this.frozenEntities.has(entityId);
  }

  update(): number {
    if (this.timeScale === 0 && performance.now() >= this.hitStopEndTime) {
      this.timeScale = 1;
    }
    return this.timeScale;
  }

  getScaledDelta(rawDelta: number): number {
    return rawDelta * this.timeScale;
  }
}

// Integración en game loop
function gameLoop(currentTime: number): void {
  const rawDelta = (currentTime - lastTime) / 1000;
  const scaledDelta = hitStop.update() * rawDelta;
  
  // Lógica del juego usa scaledDelta (se pausa durante hit stop)
  player.update(scaledDelta);
  enemies.forEach(e => e.update(scaledDelta));
  
  // Pero efectos visuales pueden usar rawDelta (siguen animando)
  particles.update(rawDelta);
  screenShake.update(rawDelta, camera);
  
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}
```

**Duraciones óptimas de hit stop:**
- Golpe ligero: **30-50ms** (2-3 frames a 60fps)
- Golpe medio: **60-100ms** (4-6 frames)
- Golpe pesado/crítico: **100-150ms** (6-9 frames)
- Finisher/kill: **150-250ms** (9-15 frames)

---

## Partículas GPU con three.quarks para millones de partículas

Para efectos como muzzle flash, chispas de impacto y debris, **three.quarks** es la librería recomendada por su rendimiento (hasta 100K+ partículas) y su sistema de batching automático. La alternativa para prototipos rápidos es three-nebula, pero tiene menor rendimiento.

```typescript
import * as QUARKS from 'three.quarks';

// Sistema de chispas de impacto
function createImpactSparks(batchRenderer: QUARKS.BatchedRenderer): QUARKS.ParticleSystem {
  return new QUARKS.ParticleSystem({
    duration: 0.5,
    looping: false,
    startLife: new QUARKS.IntervalValue(0.2, 0.5),
    startSpeed: new QUARKS.IntervalValue(5, 15),
    startSize: new QUARKS.IntervalValue(0.02, 0.08),
    startColor: new QUARKS.ConstantColor(new THREE.Vector4(1, 0.8, 0.3, 1)),
    worldSpace: true,
    maxParticle: 50,
    
    emissionBursts: [{
      time: 0,
      count: new QUARKS.IntervalValue(20, 40),
      cycle: 1,
      interval: 0.01,
      probability: 1
    }],
    
    shape: new QUARKS.ConeEmitter({
      radius: 0.05,
      angle: Math.PI / 4
    }),
    
    behaviors: [
      new QUARKS.SizeOverLife(
        new QUARKS.PiecewiseBezier([[new QUARKS.Bezier(1, 0.8, 0.3, 0), 0]])
      ),
      new QUARKS.ApplyForce(new THREE.Vector3(0, -15, 0), new QUARKS.ConstantValue(1))
    ]
  });
}

// Muzzle flash instantáneo
function createMuzzleFlash(batchRenderer: QUARKS.BatchedRenderer): QUARKS.ParticleSystem {
  return new QUARKS.ParticleSystem({
    duration: 0.08,
    looping: false,
    startLife: new QUARKS.IntervalValue(0.04, 0.08),
    startSize: new QUARKS.IntervalValue(0.4, 1.2),
    startColor: new QUARKS.ConstantColor(new THREE.Vector4(1, 0.9, 0.5, 1)),
    maxParticle: 3,
    
    emissionBursts: [{
      time: 0,
      count: new QUARKS.ConstantValue(1),
      cycle: 1,
      interval: 0.01,
      probability: 1
    }],
    
    behaviors: [
      new QUARKS.SizeOverLife(
        new QUARKS.PiecewiseBezier([[new QUARKS.Bezier(0.5, 1, 1, 0), 0]])
      )
    ]
  });
}
```

**Budget de partículas recomendado para web:**
- Muzzle flash: **3-5 partículas** por disparo
- Chispas de impacto: **20-50 partículas** por impacto
- Debris: **10-30 partículas** por explosión
- Smoke trails: **50-200 partículas** por trail

Para **más de 500K partículas**, implementa un sistema GPGPU con compute shaders o usa WebGPU si está disponible.

---

## Audio multicapa con Web Audio API

Un disparo convincente requiere **5 capas de sonido**: body (define el arma), transient (ataque inicial), bass/sub (peso), mechanical (eyección, recámara), y tail (reverb ambiental). La Web Audio API permite mezclar estas capas con variación de pitch y volumen para evitar fatiga auditiva.

```typescript
class LayeredGunshotSystem {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private compressor: DynamicsCompressorNode;
  private buffers: Map<string, AudioBuffer> = new Map();

  constructor() {
    this.ctx = new AudioContext();
    this.setupMasterChain();
  }

  private setupMasterChain(): void {
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Compresor para control dinámico
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;    // dB
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 6;          // 6:1 para disparos
    this.compressor.attack.value = 0.001;     // 1ms - preserva transiente
    this.compressor.release.value = 0.15;     // 150ms

    // Limiter como safety
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;

    this.masterGain.connect(this.compressor);
    this.compressor.connect(limiter);
    limiter.connect(this.ctx.destination);
  }

  playGunshot(weaponType: 'pistol' | 'rifle' | 'shotgun'): void {
    const layers = this.getLayersForWeapon(weaponType);
    const now = this.ctx.currentTime;

    layers.forEach(layer => {
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers.get(layer.name)!;
      
      // Variación de pitch (±5% típico)
      source.playbackRate.value = 0.95 + Math.random() * 0.1;
      
      const gain = this.ctx.createGain();
      // Variación de volumen (±10%)
      gain.gain.value = layer.gain * (0.9 + Math.random() * 0.2);
      
      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(now + layer.delay / 1000);
    });
  }

  private getLayersForWeapon(type: string) {
    const presets = {
      pistol: [
        { name: 'pistol_body', gain: 1.0, delay: 0 },
        { name: 'pistol_transient', gain: 0.8, delay: 0 },
        { name: 'pistol_bass', gain: 0.5, delay: 2 },
        { name: 'pistol_mech', gain: 0.4, delay: 8 }
      ],
      rifle: [
        { name: 'rifle_body', gain: 1.0, delay: 0 },
        { name: 'rifle_transient', gain: 0.9, delay: 0 },
        { name: 'rifle_bass', gain: 0.7, delay: 2 },
        { name: 'rifle_mech', gain: 0.3, delay: 5 },
        { name: 'rifle_tail', gain: 0.5, delay: 15 }
      ],
      shotgun: [
        { name: 'shotgun_body', gain: 1.0, delay: 0 },
        { name: 'shotgun_bass', gain: 0.9, delay: 0 },
        { name: 'shotgun_pump', gain: 0.6, delay: 200 }
      ]
    };
    return presets[type] || presets.pistol;
  }
}
```

**Audio ducking** reduce música y ambiente cuando el jugador dispara:

```typescript
class AudioDucker {
  private musicGain: GainNode;
  private readonly duckAmount = 0.3;      // 30% del volumen original
  private readonly duckAttack = 0.01;     // 10ms
  private readonly duckRelease = 0.3;     // 300ms

  triggerDuck(): void {
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(this.duckAmount, now, this.duckAttack);
    
    // Regresar gradualmente después de 100ms
    setTimeout(() => {
      this.musicGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, this.duckRelease);
    }, 100);
  }
}
```

Para audio espacial 3D, usa `THREE.PositionalAudio` con `refDistance: 5`, `maxDistance: 100`, y `rolloffFactor: 1.5` para rifles.

---

## Haptic feedback con Gamepad API

La vibración del gamepad añade una dimensión física al feedback. Chrome y Edge soportan **dual-rumble** con motor fuerte (bajo) y débil (alto). Firefox tiene soporte limitado, Safari no lo soporta.

```typescript
class GamepadHaptics {
  readonly patterns = {
    pistol: { duration: 80, weakMagnitude: 0.8, strongMagnitude: 0.4 },
    rifle: { duration: 100, weakMagnitude: 0.6, strongMagnitude: 0.7 },
    shotgun: { duration: 150, weakMagnitude: 1.0, strongMagnitude: 1.0 },
    machineGun: { duration: 40, weakMagnitude: 0.5, strongMagnitude: 0.3 },
    sniper: { duration: 200, weakMagnitude: 0.7, strongMagnitude: 1.0 }
  };

  async fireWeapon(type: keyof typeof this.patterns): Promise<void> {
    const gamepad = navigator.getGamepads()[0];
    if (!gamepad?.vibrationActuator) return;

    const pattern = this.patterns[type];
    await gamepad.vibrationActuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration: pattern.duration,
      weakMagnitude: pattern.weakMagnitude,
      strongMagnitude: pattern.strongMagnitude
    });
  }

  async playerHit(damage: number): Promise<void> {
    const intensity = Math.min(damage / 100, 1.0);
    const gamepad = navigator.getGamepads()[0];
    if (!gamepad?.vibrationActuator) return;

    await gamepad.vibrationActuator.playEffect('dual-rumble', {
      duration: 200 + intensity * 100,
      weakMagnitude: 0.6 * intensity,
      strongMagnitude: 0.9 * intensity
    });
  }
}
```

El motor **strongMagnitude** proporciona vibraciones de baja frecuencia (impacto, peso), mientras que **weakMagnitude** da vibraciones de alta frecuencia (zumbido, feedback rápido). Para disparos, combina ambos: la escopeta usa ambos al máximo, la pistola enfatiza el motor débil para sensación de "snap".

---

## Post-processing dinámico para impacto visual

La librería **pmndrs/postprocessing** supera al EffectComposer built-in de Three.js porque combina múltiples efectos en un solo shader pass, mejorando significativamente el rendimiento.

```typescript
import { 
  EffectComposer, EffectPass, RenderPass,
  BloomEffect, ChromaticAberrationEffect, 
  VignetteEffect, NoiseEffect
} from 'postprocessing';

class GameEffectsManager {
  private composer: EffectComposer;
  private bloom: BloomEffect;
  private chromatic: ChromaticAberrationEffect;
  private vignette: VignetteEffect;
  private noise: NoiseEffect;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType  // HDR, evita banding
    });

    this.bloom = new BloomEffect({
      intensity: 0.5,
      luminanceThreshold: 0.8,
      mipmapBlur: true
    });

    this.chromatic = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0, 0),
      radialModulation: true,
      modulationOffset: 0.15
    });

    this.vignette = new VignetteEffect({ offset: 0.3, darkness: 0.3 });
    this.noise = new NoiseEffect({ premultiply: true });
    this.noise.blendMode.opacity.value = 0.04;

    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(new EffectPass(camera, 
      this.bloom, this.chromatic, this.vignette, this.noise
    ));
  }

  onWeaponFire(): void {
    // Bloom spike para muzzle flash
    this.bloom.intensity = 2.5;
    this.animateTo(this.bloom, 'intensity', 0.5, 100);
    
    // Aberración cromática sutil
    this.chromatic.offset.set(0.003, 0.003);
    this.animateTo(this.chromatic.offset, 'x', 0, 80);
  }

  onTakeDamage(damage: number): void {
    const intensity = Math.min(damage / 100, 1);
    
    // Aberración cromática fuerte
    this.chromatic.offset.set(0.015 * intensity, 0.015 * intensity);
    this.animateTo(this.chromatic.offset, 'x', 0, 250);
    
    // Vignette flash
    this.vignette.darkness = 0.7;
    this.animateTo(this.vignette, 'darkness', 0.3, 200);
  }

  private animateTo(obj: any, prop: string, target: number, durationMs: number): void {
    const start = obj[prop];
    const startTime = performance.now();
    
    const animate = () => {
      const t = Math.min((performance.now() - startTime) / durationMs, 1);
      obj[prop] = start + (target - start) * (1 - Math.pow(1 - t, 3));
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }
}
```

**Coste de rendimiento de efectos (de menor a mayor):**
1. Vignette, Noise/Grain - muy bajo
2. Chromatic Aberration - bajo (3 samples de textura)
3. Bloom - medio-alto (múltiples blur passes)
4. Motion Blur - alto
5. SSAO, DoF - muy alto

Para móviles, desactiva bloom y motion blur. Usa `composer.setSize(width * 0.75, height * 0.75)` para renderizar a menor resolución.

---

## Visual juice: muzzle flash, hit flash y números de daño

Las técnicas de "juice" visual incluyen muzzle flash sprites, hit flash blanco en enemigos, y números de daño con física. Estas pequeñas adiciones multiplican la sensación de impacto.

```typescript
// Enemy hit flash - shader que pone todo blanco brevemente
const hitFlashShader = `
  uniform sampler2D tDiffuse;
  uniform float uFlashAmount;
  varying vec2 vUv;
  
  void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    vec3 finalColor = mix(texColor.rgb, vec3(1.0), uFlashAmount);
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// Sistema de números de daño con física
class DamageNumbers {
  private numbers: Array<{
    x: number; y: number; value: number;
    vx: number; vy: number; age: number;
    scale: number; isCrit: boolean;
  }> = [];

  spawn(x: number, y: number, damage: number, isCrit: boolean): void {
    this.numbers.push({
      x, y, value: damage,
      vx: (Math.random() - 0.5) * 100,
      vy: -150 - Math.random() * 100,
      age: 0,
      scale: isCrit ? 1.5 : 1.0,
      isCrit
    });
  }

  update(dt: number): void {
    for (const num of this.numbers) {
      num.vy += 200 * dt;  // gravedad
      num.x += num.vx * dt;
      num.y += num.vy * dt;
      num.age += dt * 1000;
      
      // Elastic scale en spawn (primeros 200ms)
      if (num.age < 200) {
        const t = num.age / 200;
        num.scale = (num.isCrit ? 1.5 : 1.0) * this.easeOutElastic(t);
      }
    }
    // Eliminar números viejos (>1 segundo)
    this.numbers = this.numbers.filter(n => n.age < 1000);
  }

  private easeOutElastic(x: number): number {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 :
      Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  }
}
```

**Easing functions esenciales:**
- **easeOutBack** (con overshoot): UI animations, popup de números
- **easeOutElastic**: números de daño, efectos bouncy
- **easeOutQuad**: camera lerp, fade outs
- **easeOutCubic**: decay de efectos visuales

---

## Orquestando todos los sistemas sin sobrecarga sensorial

El secreto final es **coordinar todos los sistemas** en un único punto de disparo, escalando la intensidad según el contexto.

```typescript
class GameFeelOrchestrator {
  constructor(
    private screenShake: TraumaScreenShake,
    private hitStop: HitStopManager,
    private audio: LayeredGunshotSystem,
    private haptics: GamepadHaptics,
    private effects: GameEffectsManager,
    private particles: ParticleManager
  ) {}

  onPlayerShoot(weapon: WeaponType, position: THREE.Vector3): void {
    const intensity = this.getIntensity(weapon);
    
    // Todo sincronizado en el mismo frame
    this.screenShake.addTrauma(intensity.trauma);
    this.audio.playGunshot(weapon.type);
    this.haptics.fireWeapon(weapon.type);
    this.effects.onWeaponFire();
    this.particles.spawnMuzzleFlash(position, weapon.direction);
  }

  onEnemyHit(enemy: Enemy, damage: number, isCrit: boolean): void {
    const intensity = isCrit ? 1.5 : 1.0;
    
    // Hit stop - más largo para críticos
    this.hitStop.freezeGlobal(isCrit ? 100 : 50);
    
    // Screen shake adicional
    this.screenShake.addTrauma(0.15 * intensity);
    
    // Partículas de impacto
    this.particles.spawnImpactSparks(enemy.position);
    if (damage > 30) this.particles.spawnDebris(enemy.position);
    
    // Flash blanco en enemigo (2-3 frames)
    enemy.triggerHitFlash(50);
    
    // Números de daño
    this.damageNumbers.spawn(enemy.position.x, enemy.position.y, damage, isCrit);
  }

  private getIntensity(weapon: WeaponType) {
    return {
      pistol: { trauma: 0.15, hitStop: 30 },
      rifle: { trauma: 0.25, hitStop: 50 },
      shotgun: { trauma: 0.45, hitStop: 80 },
      sniper: { trauma: 0.50, hitStop: 100 }
    }[weapon.type];
  }
}
```

**Reglas para evitar sobrecarga sensorial:**
1. **Prioriza por importancia**: críticos reciben tratamiento completo, hits normales más suave
2. **Decay rápido**: shake decae cuadráticamente, hit stop < 150ms, flash < 50ms
3. **Opciones de accesibilidad**: permite desactivar shake, reducir flash, desactivar haptics
4. **No acumules infinitamente**: cap de trauma en 1.0, límite de partículas activas

---

## Conclusión

El game feel excepcional emerge de la **sinergia entre sistemas**, no de cada técnica aislada. Un disparo satisfactorio combina el trauma-based screen shake de Vlambeer con hit stop de 50-100ms, audio multicapa con variación de pitch del ±5%, partículas GPU con three.quarks, vibración dual-rumble sincronizada, y post-procesado con bloom/chromatic aberration dinámico.

Los valores más críticos a recordar: **trauma 0.15-0.45** según arma, **hit stop 50-100ms**, **pitch variation ±5%**, **bloom spike a 2.5x** en disparo, **decay siempre exponencial**. Usa pmndrs/postprocessing sobre el EffectComposer nativo, three.quarks sobre three-nebula para partículas, y Howler.js si quieres una API más simple que Web Audio nativo.

La diferencia entre un juego que "funciona" y uno que "se siente increíble" está en estos detalles de feedback, calibrados con precisión milimétrica y coordinados en perfecta sincronía.