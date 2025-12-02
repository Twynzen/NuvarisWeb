import { Injectable } from '@angular/core';

/**
 * Configuración de sonido individual
 */
interface SoundConfig {
  key: string;
  path: string;
  volume: number;
  loop: boolean;
  category: 'music' | 'sfx' | 'ambient' | 'ui';
}

/**
 * AudioService - Sistema de audio robusto para QDT: Protocolo Omega
 *
 * Características:
 * - Precarga de todos los sonidos al iniciar
 * - Control de volumen por categoría (música, SFX, ambiente, UI)
 * - Soporte para loops y one-shots
 * - Health warning con latidos
 * - Persistencia de configuración en localStorage
 */
@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();

  // Volúmenes por categoría (0-1)
  private musicVolume = 0.3;  // Música más baja por defecto
  private sfxVolume = 0.7;
  private ambientVolume = 0.5;
  private uiVolume = 0.6;
  private masterVolume = 1.0;

  // Estado
  private isInitialized = false;
  private isMuted = false;

  // Health warning state
  private healthWarningActive = false;
  private healthWarningSource: AudioBufferSourceNode | null = null;

  // Walk sound state
  private isWalking = false;
  private walkSoundInterval: ReturnType<typeof setInterval> | null = null;
  private walkIntervalMs = 350; // Milisegundos entre pasos
  private currentWalkCharacter: string = 'arcadio';

  // Configuración de sonidos
  private readonly soundConfigs: SoundConfig[] = [
    // === AMBIENTE ===
    { key: 'ambiente-menu', path: 'assets/sounds/ambiente-qdt-menu.mp3', volume: 0.25, loop: true, category: 'music' },
    { key: 'ambiente-gameplay', path: 'assets/sounds/ambiente-qdt-gameplay.mp3', volume: 0.2, loop: true, category: 'music' },

    // === ARCADIO ===
    { key: 'arcadio-dead', path: 'assets/sounds/arcadio-dead.wav', volume: 0.8, loop: false, category: 'sfx' },
    { key: 'arcadio-heal', path: 'assets/sounds/arcadio-heal.mp3', volume: 0.3, loop: false, category: 'sfx' },
    { key: 'arcadio-hit', path: 'assets/sounds/arcadio-hit.wav', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'arcadio-shoot', path: 'assets/sounds/arcadio-shoot.wav', volume: 0.5, loop: false, category: 'sfx' },
    { key: 'arcadio-berserk', path: 'assets/sounds/arcadio-berserk.wav', volume: 1.0, loop: false, category: 'sfx' },
    { key: 'walk-arcadio', path: 'assets/sounds/walk-arcadio.mp3', volume: 0.3, loop: false, category: 'sfx' },

    // === LARS ===
    { key: 'lars-dead', path: 'assets/sounds/lars-dead.mp3', volume: 0.8, loop: false, category: 'sfx' },
    { key: 'lars-hit', path: 'assets/sounds/lars-hit.mp3', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'lars-mind-control', path: 'assets/sounds/lars-mind-control.wav', volume: 0.7, loop: false, category: 'sfx' },
    { key: 'lars-shoot', path: 'assets/sounds/lars-shoot.wav', volume: 0.5, loop: false, category: 'sfx' },
    { key: 'minion-explode', path: 'assets/sounds/minion-explode.wav', volume: 0.8, loop: false, category: 'sfx' },

    // === YURANY ===
    { key: 'yurany-dead', path: 'assets/sounds/yurany-dead.wav', volume: 0.8, loop: false, category: 'sfx' },
    { key: 'yurany-hit', path: 'assets/sounds/yurany-hit.mp3', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'yurany-shoot', path: 'assets/sounds/yurany-shoot.wav', volume: 0.5, loop: false, category: 'sfx' },
    { key: 'yurany-shoot-chain', path: 'assets/sounds/yurany-shoot-chain.wav', volume: 0.6, loop: false, category: 'sfx' },

    // === ENEMIGOS ===
    { key: 'spider-bite', path: 'assets/sounds/spider-bite.mp3', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'spider-dead', path: 'assets/sounds/spider-dead.mp3', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'spider-spawn', path: 'assets/sounds/spider-spawn.wav', volume: 0.5, loop: false, category: 'sfx' },
    { key: 'worm-bite', path: 'assets/sounds/worm-bite.wav', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'worm-dead', path: 'assets/sounds/worm-dead.wav', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'worm-spawn', path: 'assets/sounds/worm-spawn.wav', volume: 0.5, loop: false, category: 'sfx' },

    // === PUERTAS Y PORTALES ===
    { key: 'door', path: 'assets/sounds/door.wav', volume: 0.6, loop: false, category: 'sfx' },
    { key: 'portals', path: 'assets/sounds/portals.wav', volume: 0.4, loop: true, category: 'ambient' },

    // === UI ===
    { key: 'ui-hover', path: 'assets/sounds/ui-hover.wav', volume: 0.4, loop: false, category: 'ui' },
    { key: 'ui-select', path: 'assets/sounds/ui-select.wav', volume: 0.5, loop: false, category: 'ui' },
    { key: 'level-up', path: 'assets/sounds/level-up.wav', volume: 0.7, loop: false, category: 'ui' },
    { key: 'roulette', path: 'assets/sounds/roulette.wav', volume: 0.5, loop: false, category: 'ui' },

    // === EVENTOS ===
    { key: 'health-warning', path: 'assets/sounds/health_warning.wav', volume: 0.5, loop: true, category: 'sfx' },

    // === CAMINATAS ===
    { key: 'walk-player', path: 'assets/sounds/walk-player.wav', volume: 0.3, loop: false, category: 'sfx' },
  ];

  constructor() {
    this.loadVolumeSettings();
  }

  /**
   * Inicializar el sistema de audio
   * DEBE llamarse después de una interacción del usuario (click)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Crear gain nodes para cada categoría
      this.createGainNodes();

      // Precargar todos los sonidos
      await this.preloadSounds();

      this.isInitialized = true;
      console.log('[AudioService] Sistema de audio inicializado correctamente');
    } catch (error) {
      console.error('[AudioService] Error inicializando audio:', error);
    }
  }

  /**
   * Crear gain nodes para control de volumen por categoría
   */
  private createGainNodes(): void {
    if (!this.audioContext) return;

    const categories = ['music', 'sfx', 'ambient', 'ui'];
    categories.forEach(category => {
      const gainNode = this.audioContext!.createGain();
      gainNode.connect(this.audioContext!.destination);
      this.gainNodes.set(category, gainNode);
    });

    // Aplicar volúmenes guardados
    this.updateAllVolumes();
  }

  /**
   * Precargar todos los sonidos
   */
  private async preloadSounds(): Promise<void> {
    const loadPromises = this.soundConfigs.map(async (config) => {
      try {
        const response = await fetch(config.path);
        if (!response.ok) {
          console.warn(`[AudioService] No se pudo cargar: ${config.path}`);
          return;
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.sounds.set(config.key, audioBuffer);
      } catch (error) {
        console.warn(`[AudioService] Error cargando ${config.key}:`, error);
      }
    });

    await Promise.all(loadPromises);
    console.log(`[AudioService] ${this.sounds.size}/${this.soundConfigs.length} sonidos cargados`);
  }

  /**
   * Reproducir un sonido
   */
  play(key: string, options?: { volume?: number; loop?: boolean }): void {
    if (!this.isInitialized || this.isMuted || !this.audioContext) return;

    const buffer = this.sounds.get(key);
    if (!buffer) {
      console.warn(`[AudioService] Sonido no encontrado: ${key}`);
      return;
    }

    const config = this.soundConfigs.find(c => c.key === key);
    if (!config) return;

    // Si es un loop activo, no reiniciar
    if (options?.loop && this.activeSources.has(key)) return;

    // Detener instancia anterior si existe (para one-shots rápidos)
    this.stop(key);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = options?.loop ?? config.loop;

    // Crear gain node individual para este sonido
    const soundGain = this.audioContext.createGain();
    const baseVolume = options?.volume ?? config.volume;
    soundGain.gain.value = baseVolume * this.getCategoryVolume(config.category) * this.masterVolume;

    // Conectar: source -> soundGain -> categoryGain -> destination
    const categoryGain = this.gainNodes.get(config.category);
    if (categoryGain) {
      source.connect(soundGain);
      soundGain.connect(categoryGain);
    } else {
      source.connect(soundGain);
      soundGain.connect(this.audioContext.destination);
    }

    source.start(0);
    this.activeSources.set(key, source);

    // Limpiar cuando termine (solo para one-shots)
    if (!source.loop) {
      source.onended = () => {
        this.activeSources.delete(key);
      };
    }
  }

  /**
   * Detener un sonido
   */
  stop(key: string): void {
    const source = this.activeSources.get(key);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // Ignorar si ya estaba detenido
      }
      this.activeSources.delete(key);
    }
  }

  /**
   * Detener todos los sonidos de una categoría
   */
  stopCategory(category: 'music' | 'sfx' | 'ambient' | 'ui'): void {
    this.soundConfigs.filter(c => c.category === category).forEach(config => {
      this.stop(config.key);
    });
  }

  /**
   * Detener todos los sonidos
   */
  stopAll(): void {
    this.activeSources.forEach((source, key) => {
      try {
        source.stop();
      } catch (e) {}
    });
    this.activeSources.clear();
    this.stopWalking();
    this.stopHealthWarning();
  }

  // ==================== MUSIC CONTROL ====================

  /**
   * Iniciar música del menú
   */
  playMenuMusic(): void {
    this.stop('ambiente-gameplay');
    this.play('ambiente-menu', { loop: true });
  }

  /**
   * Iniciar música del gameplay
   */
  playGameplayMusic(): void {
    this.stop('ambiente-menu');
    this.play('ambiente-gameplay', { loop: true });
  }

  /**
   * Detener toda la música
   */
  stopMusic(): void {
    this.stop('ambiente-menu');
    this.stop('ambiente-gameplay');
  }

  // ==================== HEALTH WARNING ====================

  /**
   * Iniciar alerta de vida baja (latidos)
   */
  startHealthWarning(): void {
    if (this.healthWarningActive) return;
    this.healthWarningActive = true;
    this.play('health-warning', { loop: true });
    console.log('[AudioService] Health warning started');
  }

  /**
   * Detener alerta de vida baja
   */
  stopHealthWarning(): void {
    if (!this.healthWarningActive) return;
    this.healthWarningActive = false;
    this.stop('health-warning');
    console.log('[AudioService] Health warning stopped');
  }

  /**
   * Verificar si debe activarse/desactivarse el health warning
   * @param currentHealth Vida actual
   * @param maxHealth Vida máxima
   * @param threshold Umbral en porcentaje (default 15%)
   */
  checkHealthWarning(currentHealth: number, maxHealth: number, threshold: number = 15): void {
    const healthPercent = (currentHealth / maxHealth) * 100;

    if (healthPercent <= threshold && healthPercent > 0) {
      this.startHealthWarning();
    } else {
      this.stopHealthWarning();
    }
  }

  // ==================== CHARACTER-SPECIFIC SOUNDS ====================

  /**
   * Reproducir sonido de disparo según el personaje
   */
  playShoot(characterId: string): void {
    switch (characterId) {
      case 'arcadio':
        this.play('arcadio-shoot');
        break;
      case 'lars':
        this.play('lars-shoot');
        break;
      case 'yurany':
        this.play('yurany-shoot');
        break;
    }
  }

  /**
   * Reproducir sonido de daño según el personaje
   */
  playHit(characterId: string): void {
    switch (characterId) {
      case 'arcadio':
        this.play('arcadio-hit');
        break;
      case 'lars':
        this.play('lars-hit');
        break;
      case 'yurany':
        this.play('yurany-hit');
        break;
    }
  }

  /**
   * Reproducir sonido de muerte según el personaje
   */
  playDeath(characterId: string): void {
    this.stopHealthWarning(); // Detener latidos al morir
    switch (characterId) {
      case 'arcadio':
        this.play('arcadio-dead');
        break;
      case 'lars':
        this.play('lars-dead');
        break;
      case 'yurany':
        this.play('yurany-dead');
        break;
    }
  }

  /**
   * Reproducir sonido de caminar según el personaje (un paso)
   */
  playWalk(characterId: string): void {
    if (characterId === 'arcadio') {
      this.play('walk-arcadio');
    } else {
      this.play('walk-player');
    }
  }

  /**
   * Iniciar sonidos de pasos (se reproducen a intervalos mientras el jugador camina)
   */
  startWalking(characterId: string): void {
    if (this.isWalking && this.currentWalkCharacter === characterId) return;

    // Si ya estaba caminando con otro personaje, detener
    if (this.isWalking) {
      this.stopWalking();
    }

    this.isWalking = true;
    this.currentWalkCharacter = characterId;

    // Reproducir primer paso inmediatamente
    this.playWalk(characterId);

    // Configurar intervalo para los siguientes pasos
    this.walkSoundInterval = setInterval(() => {
      if (this.isWalking && !this.isMuted) {
        this.playWalk(this.currentWalkCharacter);
      }
    }, this.walkIntervalMs);
  }

  /**
   * Detener sonidos de pasos
   */
  stopWalking(): void {
    if (!this.isWalking) return;

    this.isWalking = false;

    if (this.walkSoundInterval) {
      clearInterval(this.walkSoundInterval);
      this.walkSoundInterval = null;
    }
  }

  /**
   * Verificar si el jugador está caminando (para sincronizar con el engine)
   */
  isCurrentlyWalking(): boolean {
    return this.isWalking;
  }

  // ==================== LARS SPECIAL SOUNDS ====================

  /**
   * Reproducir sonido de explosión de minions (Lars ability)
   */
  playMinionExplode(): void {
    this.play('minion-explode');
  }

  // ==================== ARCADIO SPECIAL SOUNDS ====================

  /**
   * Reproducir sonido de activación de modo berserk (Arcadio ability)
   */
  playBerserk(): void {
    this.play('arcadio-berserk');
  }

  // ==================== ENEMY SOUNDS ====================

  /**
   * Reproducir sonido de ataque de enemigo
   */
  playEnemyAttack(enemyType: 'spider' | 'worm'): void {
    if (enemyType === 'spider') {
      this.play('spider-bite');
    } else {
      this.play('worm-bite');
    }
  }

  /**
   * Reproducir sonido de muerte de enemigo
   */
  playEnemyDeath(enemyType: 'spider' | 'worm'): void {
    if (enemyType === 'spider') {
      this.play('spider-dead');
    } else {
      this.play('worm-dead');
    }
  }

  /**
   * Reproducir sonido de spawn de enemigo
   */
  playEnemySpawn(enemyType: 'spider' | 'worm'): void {
    if (enemyType === 'spider') {
      this.play('spider-spawn');
    } else {
      this.play('worm-spawn');
    }
  }

  // ==================== VOLUME CONTROL ====================

  private getCategoryVolume(category: string): number {
    switch (category) {
      case 'music': return this.musicVolume;
      case 'sfx': return this.sfxVolume;
      case 'ambient': return this.ambientVolume;
      case 'ui': return this.uiVolume;
      default: return 1;
    }
  }

  private updateAllVolumes(): void {
    if (!this.audioContext) return;

    const musicGain = this.gainNodes.get('music');
    const sfxGain = this.gainNodes.get('sfx');
    const ambientGain = this.gainNodes.get('ambient');
    const uiGain = this.gainNodes.get('ui');

    if (musicGain) musicGain.gain.value = this.musicVolume * this.masterVolume;
    if (sfxGain) sfxGain.gain.value = this.sfxVolume * this.masterVolume;
    if (ambientGain) ambientGain.gain.value = this.ambientVolume * this.masterVolume;
    if (uiGain) uiGain.gain.value = this.uiVolume * this.masterVolume;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  setUIVolume(volume: number): void {
    this.uiVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  getMasterVolume(): number { return this.masterVolume; }
  getMusicVolume(): number { return this.musicVolume; }
  getSFXVolume(): number { return this.sfxVolume; }
  getAmbientVolume(): number { return this.ambientVolume; }
  getUIVolume(): number { return this.uiVolume; }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAll();
    }
    this.saveVolumeSettings();
    return this.isMuted;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  // ==================== PERSISTENCE ====================

  private saveVolumeSettings(): void {
    const settings = {
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      ambientVolume: this.ambientVolume,
      uiVolume: this.uiVolume,
      isMuted: this.isMuted
    };
    localStorage.setItem('qdt_audio_settings', JSON.stringify(settings));
  }

  private loadVolumeSettings(): void {
    try {
      const saved = localStorage.getItem('qdt_audio_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.masterVolume = settings.masterVolume ?? 1.0;
        this.musicVolume = settings.musicVolume ?? 0.3;
        this.sfxVolume = settings.sfxVolume ?? 0.7;
        this.ambientVolume = settings.ambientVolume ?? 0.5;
        this.uiVolume = settings.uiVolume ?? 0.6;
        this.isMuted = settings.isMuted ?? false;
      }
    } catch (e) {
      console.warn('[AudioService] Error cargando configuración de audio');
    }
  }

  /**
   * Verificar si el sistema está inicializado
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
