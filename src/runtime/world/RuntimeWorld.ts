import type { Entity, EntityId } from '../ecs/Entity';
import type { Component } from '../ecs/Component';
import type { System } from '../ecs/System';
import { EntityManager } from './EntityManager';
import { ComponentStore } from './ComponentStore';

export class RuntimeWorld {
  private entityManager = new EntityManager();
  private stores = new Map<string, ComponentStore<any>>();
  private systems: System[] = [];

  public getEntityManager(): EntityManager {
    return this.entityManager;
  }

  // ==========================================
  // ENTITY OPERATIONS
  // ==========================================

  public createEntity(name?: string, id?: string): Entity {
    return this.entityManager.createEntity(name, id);
  }

  public removeEntity(entityId: EntityId): void {
    if (!this.entityManager.hasEntity(entityId)) return;

    // Delete all components of the entity
    for (const [_, store] of this.stores) {
      store.delete(entityId);
    }
    
    // Remove entity from manager
    this.entityManager.removeEntity(entityId);
  }

  public getEntity(entityId: EntityId): Entity | undefined {
    return this.entityManager.getEntity(entityId);
  }

  public getAllEntities(): Entity[] {
    return this.entityManager.getAllEntities();
  }

  public queryEntities(signature: string[]): EntityId[] {
    return this.entityManager.queryEntities(signature);
  }

  // ==========================================
  // COMPONENT OPERATIONS
  // ==========================================

  public getStore<T extends Component>(type: string): ComponentStore<T> {
    let store = this.stores.get(type);
    if (!store) {
      store = new ComponentStore<T>();
      this.stores.set(type, store);
    }
    return store;
  }

  public addComponent(component: Component): void {
    const store = this.getStore(component.type);
    store.set(component.entityId, component);
    this.entityManager.updateSignature(component.entityId, component.type, true);
  }

  public removeComponent(entityId: EntityId, type: string): void {
    const store = this.stores.get(type);
    if (store && store.delete(entityId)) {
      this.entityManager.updateSignature(entityId, type, false);
    }
  }

  public getComponent<T extends Component>(entityId: EntityId, type: string): T | undefined {
    const store = this.stores.get(type);
    return store ? (store.get(entityId) as T) : undefined;
  }

  public getAllStores(): Map<string, ComponentStore<any>> {
    return this.stores;
  }

  // ==========================================
  // SYSTEM OPERATIONS
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

  public tick(dt: number): void {
    for (const system of this.systems) {
      system.update(dt);
    }
  }

  public clear(): void {
    this.systems.forEach(s => s.dispose());
    this.systems = [];
    this.entityManager.clear();
    this.stores.clear();
  }
}
