import type { Component } from '../ecs/Component';
import type { EntityId } from '../ecs/Entity';

export class ComponentStore<T extends Component> {
  private store = new Map<EntityId, T>();

  public set(entityId: EntityId, component: T): void {
    this.store.set(entityId, component);
  }

  public get(entityId: EntityId): T | undefined {
    return this.store.get(entityId);
  }

  public delete(entityId: EntityId): boolean {
    return this.store.delete(entityId);
  }

  public has(entityId: EntityId): boolean {
    return this.store.has(entityId);
  }

  public getAll(): T[] {
    return Array.from(this.store.values());
  }

  public getMap(): Map<EntityId, T> {
    return this.store;
  }

  public clear(): void {
    this.store.clear();
  }
}
