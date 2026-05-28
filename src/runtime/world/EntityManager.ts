import type { Entity, EntityId } from '../ecs/Entity';

export class EntityManager {
  private entities = new Map<EntityId, Entity>();

  public createEntity(name: string = 'Unnamed Entity', id?: string): Entity {
    const entityId = id || crypto.randomUUID();
    const entity: Entity = {
      id: entityId,
      name,
      componentSignatures: new Set<string>(),
    };
    this.entities.set(entityId, entity);
    return entity;
  }

  public removeEntity(id: EntityId): void {
    this.entities.delete(id);
  }

  public getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  public hasEntity(id: EntityId): boolean {
    return this.entities.has(id);
  }

  public getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  public updateSignature(id: EntityId, componentType: string, added: boolean): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    if (added) {
      entity.componentSignatures.add(componentType);
    } else {
      entity.componentSignatures.delete(componentType);
    }
  }

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
      if (matches) {
        matched.push(entityId);
      }
    }
    return matched;
  }

  public clear(): void {
    this.entities.clear();
  }
}
