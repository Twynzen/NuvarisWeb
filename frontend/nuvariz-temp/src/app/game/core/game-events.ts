import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as THREE from 'three';

/**
 * Game Event Types - All possible events in the game
 */
export enum GameEventType {
    // Combat Events
    ENEMY_DAMAGED = 'enemy_damaged',
    ENEMY_KILLED = 'enemy_killed',
    PLAYER_DAMAGED = 'player_damaged',
    PLAYER_HEALED = 'player_healed',
    PROJECTILE_HIT = 'projectile_hit',
    PROJECTILE_DESTROYED = 'projectile_destroyed',

    // Entity Events
    ENEMY_SPAWNED = 'enemy_spawned',
    ENEMY_MIND_CONTROLLED = 'enemy_mind_controlled',
    MINION_EXPLODED = 'minion_exploded',

    // Player Events
    PLAYER_LEVEL_UP = 'player_level_up',
    XP_GAINED = 'xp_gained',
    SCORE_CHANGED = 'score_changed',

    // Game State Events
    GAME_PAUSED = 'game_paused',
    GAME_RESUMED = 'game_resumed',
    GAME_OVER = 'game_over',
    WAVE_STARTED = 'wave_started',
    WAVE_COMPLETED = 'wave_completed',

    // Ability Events
    ABILITY_TRIGGERED = 'ability_triggered',
    CHARGE_STARTED = 'charge_started',
    CHARGE_RELEASED = 'charge_released',
    BERSERK_ACTIVATED = 'berserk_activated',
    BERSERK_ENDED = 'berserk_ended'
}

/**
 * Base interface for all game events
 */
export interface GameEvent {
    type: GameEventType;
    timestamp: number;
}

/**
 * Combat event data
 */
export interface DamageEvent extends GameEvent {
    type: GameEventType.ENEMY_DAMAGED | GameEventType.PLAYER_DAMAGED;
    targetId: string;
    damage: number;
    source: 'projectile' | 'melee' | 'ability' | 'dot';
    position: THREE.Vector3;
    isCritical?: boolean;
}

export interface KillEvent extends GameEvent {
    type: GameEventType.ENEMY_KILLED;
    enemyId: string;
    enemyType: string;
    position: THREE.Vector3;
    xpReward: number;
    scoreReward: number;
    killedBy: 'player' | 'minion' | 'ability';
}

export interface ProjectileHitEvent extends GameEvent {
    type: GameEventType.PROJECTILE_HIT;
    projectileId: string;
    targetId: string;
    damage: number;
    position: THREE.Vector3;
}

export interface HealEvent extends GameEvent {
    type: GameEventType.PLAYER_HEALED;
    amount: number;
    source: 'lifesteal' | 'ability' | 'pickup';
    newHealth: number;
}

export interface SpawnEvent extends GameEvent {
    type: GameEventType.ENEMY_SPAWNED;
    enemyId: string;
    enemyType: string;
    position: THREE.Vector3;
}

export interface XPEvent extends GameEvent {
    type: GameEventType.XP_GAINED;
    amount: number;
    totalXP: number;
    source: string;
}

export interface AbilityEvent extends GameEvent {
    type: GameEventType.ABILITY_TRIGGERED | GameEventType.CHARGE_STARTED | GameEventType.CHARGE_RELEASED;
    abilityName: string;
    characterId: string;
    data?: any;
}

/**
 * Union type of all events
 */
export type AnyGameEvent =
    | GameEvent
    | DamageEvent
    | KillEvent
    | ProjectileHitEvent
    | HealEvent
    | SpawnEvent
    | XPEvent
    | AbilityEvent;

/**
 * GameEventBus - Central event system for decoupled communication
 *
 * Usage:
 *   // Emit an event
 *   eventBus.emit({ type: GameEventType.ENEMY_KILLED, ... });
 *
 *   // Listen to specific event type
 *   eventBus.on(GameEventType.ENEMY_KILLED).subscribe(event => { ... });
 *
 *   // Listen to all events
 *   eventBus.all$.subscribe(event => { ... });
 */
export class GameEventBus {
    private static instance: GameEventBus;
    private eventSubject = new Subject<AnyGameEvent>();

    // Observable for all events
    public readonly all$: Observable<AnyGameEvent> = this.eventSubject.asObservable();

    // Event statistics
    private stats = {
        totalEmitted: 0,
        byType: new Map<GameEventType, number>()
    };

    private constructor() {}

    /**
     * Get singleton instance
     */
    static getInstance(): GameEventBus {
        if (!GameEventBus.instance) {
            GameEventBus.instance = new GameEventBus();
        }
        return GameEventBus.instance;
    }

    /**
     * Emit a game event
     */
    emit<T extends AnyGameEvent>(event: Omit<T, 'timestamp'> & { timestamp?: number }): void {
        const fullEvent = {
            ...event,
            timestamp: event.timestamp || performance.now()
        } as T;

        // Update stats
        this.stats.totalEmitted++;
        const count = this.stats.byType.get(event.type) || 0;
        this.stats.byType.set(event.type, count + 1);

        this.eventSubject.next(fullEvent);
    }

    /**
     * Subscribe to a specific event type
     */
    on<T extends AnyGameEvent>(eventType: GameEventType): Observable<T> {
        return this.all$.pipe(
            filter(event => event.type === eventType)
        ) as Observable<T>;
    }

    /**
     * Subscribe to multiple event types
     */
    onAny(...eventTypes: GameEventType[]): Observable<AnyGameEvent> {
        return this.all$.pipe(
            filter(event => eventTypes.includes(event.type))
        );
    }

    /**
     * Get event statistics
     */
    getStats(): { totalEmitted: number; byType: Record<string, number> } {
        const byType: Record<string, number> = {};
        this.stats.byType.forEach((count, type) => {
            byType[type] = count;
        });
        return {
            totalEmitted: this.stats.totalEmitted,
            byType
        };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats.totalEmitted = 0;
        this.stats.byType.clear();
    }
}

// Export singleton instance
export const gameEventBus = GameEventBus.getInstance();
