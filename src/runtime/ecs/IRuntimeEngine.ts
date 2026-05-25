import type { EntityId } from './Entity';
import type { Component } from './Component';

export interface IRuntimeEngine {
  queryEntities(signature: string[]): EntityId[];
  getComponent(entityId: EntityId, componentType: string): Component | undefined;
}
