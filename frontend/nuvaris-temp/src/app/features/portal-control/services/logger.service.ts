/**
 * PORTAL CONTROL - Logger Service
 * Centralized logging with levels and context
 */

import { Injectable } from '@angular/core';
import { GameError } from '../models';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDebugMode = true; // Set to false in production

  private readonly levelColors: Record<LogLevel, string> = {
    debug: '#888888',
    info: '#4CAF50',
    warn: '#FF9800',
    error: '#F44336',
  };

  private readonly levelIcons: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  };

  /**
   * Log a debug message (only in debug mode)
   */
  debug(source: string, message: string, data?: any): void {
    if (this.isDebugMode) {
      this.log('debug', source, message, data);
    }
  }

  /**
   * Log an info message
   */
  info(source: string, message: string, data?: any): void {
    this.log('info', source, message, data);
  }

  /**
   * Log a warning message
   */
  warn(source: string, message: string, data?: any): void {
    this.log('warn', source, message, data);
  }

  /**
   * Log an error message
   */
  error(source: string, message: string, error?: Error | any): void {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    this.log('error', source, message, data);
  }

  /**
   * Create a GameError object for game state
   */
  createGameError(source: string, message: string, error?: Error): GameError {
    return {
      timestamp: Date.now(),
      type: 'error',
      source,
      message,
      stack: error?.stack,
      context: error,
    };
  }

  /**
   * Log with timing for performance tracking
   */
  time(source: string, label: string): () => void {
    const start = performance.now();
    this.debug(source, `⏱️ Started: ${label}`);

    return () => {
      const duration = performance.now() - start;
      this.debug(source, `⏱️ Completed: ${label} (${duration.toFixed(2)}ms)`);
    };
  }

  /**
   * Group related logs
   */
  group(source: string, label: string, fn: () => void): void {
    if (this.isDebugMode) {
      console.group(`[${source}] ${label}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by source
   */
  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source === source);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.info('LoggerService', 'Logs cleared');
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
    this.info('LoggerService', `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, source: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      data,
    };

    // Add to internal log
    this.logs.push(entry);

    // Trim if over limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const icon = this.levelIcons[level];
    const color = this.levelColors[level];
    const timestamp = new Date(entry.timestamp).toISOString().substr(11, 12);

    const prefix = `%c${icon} [${timestamp}] [${source}]`;
    const style = `color: ${color}; font-weight: bold;`;

    if (data !== undefined) {
      console.log(prefix, style, message, data);
    } else {
      console.log(prefix, style, message);
    }
  }
}
