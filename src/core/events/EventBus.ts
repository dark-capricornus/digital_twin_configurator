import type { EventType, EventPayloads, EventHandler, EventSubscription } from './types';

class EventBusImpl {
  private listeners: Map<EventType, Set<EventHandler<any>>> = new Map();
  private onceListeners: Map<EventType, Set<EventHandler<any>>> = new Map();

  /**
   * Subscribe to an event.
   */
  public subscribe<T extends EventType>(type: T, handler: EventHandler<T>): EventSubscription {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    return {
      unsubscribe: () => this.unsubscribe(type, handler)
    };
  }

  /**
   * Subscribe to an event only once.
   */
  public once<T extends EventType>(type: T, handler: EventHandler<T>): void {
    if (!this.onceListeners.has(type)) {
      this.onceListeners.set(type, new Set());
    }
    this.onceListeners.get(type)!.add(handler);
  }

  /**
   * Unsubscribe from an event.
   */
  public unsubscribe<T extends EventType>(type: T, handler: EventHandler<T>): void {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.delete(handler);
    }
    if (this.onceListeners.has(type)) {
      this.onceListeners.get(type)!.delete(handler);
    }
  }

  /**
   * Emit an event to all subscribers.
   */
  public emit<T extends EventType>(type: T, payload: EventPayloads[T]): void {
    // Standard listeners
    if (this.listeners.has(type)) {
      const handlers = Array.from(this.listeners.get(type)!);
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] Error in handler for event ${type}:`, err);
        }
      }
    }

    // Once listeners
    if (this.onceListeners.has(type)) {
      const handlers = Array.from(this.onceListeners.get(type)!);
      this.onceListeners.delete(type); // clear immediately to prevent recursive triggers
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] Error in once-handler for event ${type}:`, err);
        }
      }
    }
    
    // Future: Add hooks for transaction logging, analytics, or multiplayer replication here
  }
}

export const EventBus = new EventBusImpl();
