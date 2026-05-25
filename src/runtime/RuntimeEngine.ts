import type { Entity, EntityId } from './ecs/Entity';
import type { Component } from './ecs/Component';
import type { System } from './ecs/System';
import type { IRuntimeEngine } from './ecs/IRuntimeEngine';

/**
 * The RuntimeEngine is the authoritative heart of the Digital Twin platform.
 * It manages the pure data state of all entities and ticks all systems.
 * It has NO dependency on React, Three.js (directly), or the Editor shell.
 */
export class RuntimeEngine implements IRuntimeEngine {
  private entities = new Map<EntityId, Entity>();
  // Map of componentType -> (Map of EntityId -> Component)
  private components = new Map<string, Map<EntityId, Component>>();
  private systems: System[] = [];
  
  private lastTick: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  // ==========================================
  // LIFECYCLE
  // ==========================================

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTick = performance.now();
    this.tick();
    console.info('[RuntimeEngine] Started.');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.info('[RuntimeEngine] Stopped.');
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    // Tick all registered systems
    for (const system of this.systems) {
      system.update(dt);
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  // ==========================================
  // SYSTEM MANAGEMENT
  // ==========================================

  public addSystem(system: System): void {
    this.systems.push(system);
    system.init();
  }

  public removeSystem(systemConstructor: any): void {
    const index = this.systems.findIndex(s => s instanceof systemConstructor);
    if (index !== -1) {
      this.systems[index].dispose();
      this.systems.splice(index, 1);
    }
  }

  // ==========================================
  // ENTITY & COMPONENT MANAGEMENT
  // ==========================================

  public addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  public removeEntity(entityId: EntityId): void {
    this.entities.delete(entityId);
    // Cleanup components
    for (const [_, entityMap] of this.components) {
      entityMap.delete(entityId);
    }
  }

  public addComponent(component: Component): void {
    if (!this.components.has(component.type)) {
      this.components.set(component.type, new Map<EntityId, Component>());
    }
    
    const entity = this.entities.get(component.entityId);
    if (entity) {
      entity.componentSignatures.add(component.type);
    }

    this.components.get(component.type)!.set(component.entityId, component);
  }

  public removeComponent(entityId: EntityId, componentType: string): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.componentSignatures.delete(componentType);
    }
    
    if (this.components.has(componentType)) {
      this.components.get(componentType)!.delete(entityId);
    }
  }

  public getComponent(entityId: EntityId, componentType: string): Component | undefined {
    return this.components.get(componentType)?.get(entityId);
  }

  /**
   * Queries the engine for all entities that possess a specific set of component types.
   */
  public queryEntities(signature: string[]): EntityId[] {
    const matched: EntityId[] = [];
    for (const [entityId, entity] of this.entities) {
      let matches = true;
      for (const reqType of signature) {
        if (!entity.componentSignatures.has(reqType)) {
          matches = false;
          break;
        }
      }
      if (matches) matched.push(entityId);
    }
    return matched;
  }
}
