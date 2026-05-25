import type { EntityId } from './Entity';
import type { Component } from './Component';
import type { IRuntimeEngine } from './IRuntimeEngine';
/**
 * Base System class.
 * Systems process entities that have a specific signature of components.
 */
export abstract class System {
  public readonly signature: string[];
  protected engine: IRuntimeEngine;

  constructor(engine: IRuntimeEngine, signature: string[]) {
    this.engine = engine;
    this.signature = signature;
  }

  /**
   * Initializes the system. Called once when added to the engine.
   */
  public init(): void {}

  /**
   * Called every frame/tick.
   * @param dt Delta time in milliseconds
   */
  public abstract update(dt: number): void;

  /**
   * Cleans up system resources. Called when system is removed.
   */
  public dispose(): void {}

  /**
   * Utility to query the engine for entities matching this system's signature.
   */
  protected getEntities(): EntityId[] {
    return this.engine.queryEntities(this.signature);
  }

  /**
   * Utility to safely fetch a component for an entity.
   */
  protected getComponent<T extends Component>(entityId: EntityId, componentType: string): T | undefined {
    return this.engine.getComponent(entityId, componentType) as T | undefined;
  }
}
