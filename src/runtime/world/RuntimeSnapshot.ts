import { RuntimeWorld } from './RuntimeWorld';
import type { Component } from '../ecs/Component';

export interface WorldSnapshotData {
  entities: Array<{ id: string; name: string }>;
  components: Record<string, Record<string, Component>>;
}

export class RuntimeSnapshot {
  private data: WorldSnapshotData;

  private constructor(data: WorldSnapshotData) {
    this.data = data;
  }

  /**
   * Creates a deep-cloned snapshot of the current state of a RuntimeWorld.
   */
  public static create(world: RuntimeWorld): RuntimeSnapshot {
    const entitiesSnapshot = world.getAllEntities().map(e => ({
      id: e.id,
      name: e.name,
    }));

    const componentsSnapshot: Record<string, Record<string, Component>> = {};
    const stores = world.getAllStores();
    
    for (const [compType, store] of stores) {
      const compMap: Record<string, Component> = {};
      const componentMap = store.getMap();
      
      for (const [entId, comp] of componentMap) {
        // Deep clone pure component data to avoid mutation references
        compMap[entId] = JSON.parse(JSON.stringify(comp));
      }
      
      componentsSnapshot[compType] = compMap;
    }

    return new RuntimeSnapshot({
      entities: entitiesSnapshot,
      components: componentsSnapshot,
    });
  }

  /**
   * Restores a RuntimeWorld instance from a snapshot.
   */
  public restore(world: RuntimeWorld): void {
    world.clear();

    // Restore Entities
    for (const ent of this.data.entities) {
      world.createEntity(ent.name, ent.id);
    }

    // Restore Components
    for (const compMap of Object.values(this.data.components)) {
      for (const [entId, comp] of Object.entries(compMap)) {
        // Double-check entity existence
        if (!world.getEntity(entId)) continue;
        
        // Deep clone to isolate snapshot instance
        const componentInstance = JSON.parse(JSON.stringify(comp));
        world.addComponent(componentInstance);
      }
    }
  }

  /**
   * Serializes this snapshot to a lightweight JSON string.
   */
  public serialize(): string {
    return JSON.stringify(this.data);
  }

  /**
   * Deserializes a snapshot from a lightweight JSON string.
   */
  public static deserialize(serialized: string): RuntimeSnapshot {
    const parsed = JSON.parse(serialized) as WorldSnapshotData;
    return new RuntimeSnapshot(parsed);
  }

  /**
   * Computes a delta diff between this snapshot and another snapshot.
   * Useful for partial network replication updates.
   */
  public computeDelta(target: RuntimeSnapshot): Record<string, any> {
    const delta: Record<string, any> = {
      updatedComponents: [] as Component[],
      removedComponents: [] as Array<{ entityId: string; type: string }>,
      removedEntities: [] as string[],
    };

    // Calculate removed entities
    const currentEntityIds = new Set(this.data.entities.map(e => e.id));
    const targetEntityIds = new Set(target.data.entities.map(e => e.id));

    for (const id of currentEntityIds) {
      if (!targetEntityIds.has(id)) {
        delta.removedEntities.push(id);
      }
    }

    // Calculate updated/removed components
    for (const [compType, currentCompMap] of Object.entries(this.data.components)) {
      const targetCompMap = target.data.components[compType] || {};

      for (const [entId, currentComp] of Object.entries(currentCompMap)) {
        const targetComp = targetCompMap[entId];
        if (!targetComp) {
          delta.removedComponents.push({ entityId: entId, type: compType });
        } else if (JSON.stringify(currentComp) !== JSON.stringify(targetComp)) {
          delta.updatedComponents.push(JSON.parse(JSON.stringify(targetComp)));
        }
      }
    }

    // Capture newly added components
    for (const [compType, targetCompMap] of Object.entries(target.data.components)) {
      const currentCompMap = this.data.components[compType] || {};
      for (const [entId, targetComp] of Object.entries(targetCompMap)) {
        if (!currentCompMap[entId]) {
          delta.updatedComponents.push(JSON.parse(JSON.stringify(targetComp)));
        }
      }
    }

    return delta;
  }
}
