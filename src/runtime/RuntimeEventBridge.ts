import { RuntimeEngine } from './RuntimeEngine';
import { EventBus } from '../core/events';

export class RuntimeEventBridge {
  private engine: RuntimeEngine;

  constructor(engine: RuntimeEngine) {
    this.engine = engine;
  }

  public initialize(): void {
    // Listen for editor events to mutate runtime state safely
    EventBus.subscribe('COMMAND_EXECUTED', this.handleCommand);
    EventBus.subscribe('COMMAND_UNDONE', this.handleCommand);
    EventBus.subscribe('COMMAND_REDONE', this.handleCommand);
  }

  public dispose(): void {
    EventBus.unsubscribe('COMMAND_EXECUTED', this.handleCommand);
    EventBus.unsubscribe('COMMAND_UNDONE', this.handleCommand);
    EventBus.unsubscribe('COMMAND_REDONE', this.handleCommand);
  }

  private handleCommand = (_payload: any): void => {
    if (!this.engine) return;
    // In a production system, this intercepts Command changes (like position updates)
    // and safely pipes them into the RuntimeEngine's authoritative ECS state.
    // console.debug('[RuntimeEventBridge] Processing Editor Command:', payload);
  };
}
