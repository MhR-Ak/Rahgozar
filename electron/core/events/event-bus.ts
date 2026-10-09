import { EventEmitter } from 'events';
import crypto from 'crypto';
import { LiveEvent } from '../../types';
import { DatabaseManager } from '../storage/database';
import { LogSanitizer } from '../security/log-sanitizer';

export type EventCallback = (event: LiveEvent) => void;

/**
 * Live Event & Status Engine
 * Manages real-time state broadcasts, 3-tiered explanations, deduplication,
 * and persistent storage of all system actions and errors.
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus | null = null;
  private recentEventSignatures: Map<string, number> = new Map();
  private db: DatabaseManager;

  private constructor() {
    super();
    this.db = DatabaseManager.getInstance();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publishes an event with 3 tiers of explanations (Simple, Detailed, Expert)
   */
  public emitEvent(params: {
    level: 'info' | 'success' | 'warning' | 'error' | 'expert';
    category: 'engine' | 'diagnosis' | 'routing' | 'security' | 'system';
    title: string;
    explanationSimple: string;
    explanationDetailed: string;
    explanationExpert: string;
    actionTaken?: string;
    userRemedy?: string;
  }): LiveEvent | null {
    const signature = `${params.category}:${params.title}:${params.level}`;
    const now = Date.now();
    const lastSeen = this.recentEventSignatures.get(signature);

    // Suppress identical events within 3 seconds to avoid spam/loop oscillations
    if (lastSeen && now - lastSeen < 3000) {
      return null;
    }
    this.recentEventSignatures.set(signature, now);

    // Clean old signatures
    if (this.recentEventSignatures.size > 100) {
      for (const [sig, timestamp] of this.recentEventSignatures.entries()) {
        if (now - timestamp > 30000) {
          this.recentEventSignatures.delete(sig);
        }
      }
    }

    const event: LiveEvent = {
      id: crypto.randomUUID(),
      timestamp: now,
      level: params.level,
      category: params.category,
      title: params.title,
      explanationSimple: params.explanationSimple,
      explanationDetailed: params.explanationDetailed,
      explanationExpert: LogSanitizer.sanitize(params.explanationExpert),
      actionTaken: params.actionTaken,
      userRemedy: params.userRemedy,
    };

    // Save to database
    try {
      this.db.addEvent(event);
    } catch (err) {
      console.error('Failed to log event to database:', err);
    }

    // Broadcast to memory listeners (Electron IPC)
    this.emit('app-event', event);
    return event;
  }
}
