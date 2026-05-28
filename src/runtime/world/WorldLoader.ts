import { RuntimeWorld } from './RuntimeWorld';

export class WorldLoader {
  /**
   * Validates and loads a digital-twin-scene JSON string or object into a RuntimeWorld.
   */
  public static load(world: RuntimeWorld, source: string | Record<string, any>): void {
    let json: Record<string, any>;
    
    if (typeof source === 'string') {
      try {
        json = JSON.parse(source);
      } catch (err) {
        throw new Error(`[WorldLoader] Failed to parse JSON source: ${(err as Error).message}`);
      }
    } else {
      json = source;
    }

    // Schema validation
    if (json.schema !== 'digital-twin-scene') {
      throw new Error(`[WorldLoader] Invalid schema identifier: "${json.schema}". Expected "digital-twin-scene".`);
    }

    if (json.version !== '0.1.0') {
      console.warn(`[WorldLoader] Schema version mismatch (Loaded: "${json.version}", Expected: "0.1.0"). Trying to load anyway.`);
    }

    // Clear existing world state
    world.clear();

    const entities = json.entities || {};
    const components = json.components || {};

    // 1. Re-populate Entities
    for (const [entId, entData] of Object.entries(entities)) {
      const name = (entData as any).name || 'Unnamed Entity';
      world.createEntity(name, entId);
    }

    // 2. Re-populate Components
    for (const [compType, storeObj] of Object.entries(components)) {
      if (typeof storeObj !== 'object' || storeObj === null) continue;
      
      for (const [entId, compData] of Object.entries(storeObj)) {
        if (!world.getEntity(entId)) {
          console.warn(`[WorldLoader] Skipping component of type "${compType}" for unknown entity ID: "${entId}".`);
          continue;
        }

        // Add back standard properties
        const componentInstance = {
          type: compType,
          entityId: entId,
          ...(compData as any),
        };

        world.addComponent(componentInstance);
      }
    }
  }
}
