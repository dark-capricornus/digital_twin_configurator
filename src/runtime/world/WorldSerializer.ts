import { RuntimeWorld } from './RuntimeWorld';

export class WorldSerializer {
  /**
   * Serializes the RuntimeWorld instance into a deterministic JSON object.
   */
  public static serializeToJSON(world: RuntimeWorld): Record<string, any> {
    const allEntities = [...world.getAllEntities()].sort((a, b) => a.id.localeCompare(b.id));
    
    // Build deterministic sorted entities
    const entitiesObj: Record<string, { name: string }> = {};
    for (const ent of allEntities) {
      entitiesObj[ent.id] = { name: ent.name };
    }

    // Build deterministic sorted components
    const componentsObj: Record<string, Record<string, any>> = {};
    const allStores = world.getAllStores();
    
    // Sort component store types alphabetically
    const sortedComponentTypes = Array.from(allStores.keys()).sort();
    
    for (const compType of sortedComponentTypes) {
      const store = allStores.get(compType)!;
      const componentMap = store.getMap();
      
      // Sort entity keys alphabetically for each component map
      const sortedEntityIds = Array.from(componentMap.keys()).sort();
      
      const storeObj: Record<string, any> = {};
      for (const entId of sortedEntityIds) {
        const comp = componentMap.get(entId)!;
        
        // Strip type and entityId fields since they are implicit in the schema dictionary hierarchy
        const { type, entityId, ...pureData } = comp;
        
        // Sort keys inside component pureData to make serialization perfectly deterministic
        const sortedCompData: Record<string, any> = {};
        Object.keys(pureData).sort().forEach(k => {
          sortedCompData[k] = (pureData as any)[k];
        });
        
        storeObj[entId] = sortedCompData;
      }
      
      componentsObj[compType] = storeObj;
    }

    return {
      version: '0.1.0',
      schema: 'digital-twin-scene',
      metadata: {
        timestamp: Date.now(),
      },
      entities: entitiesObj,
      components: componentsObj,
    };
  }

  /**
   * Serializes the RuntimeWorld instance to a deterministic JSON string with sorted formatting.
   */
  public static serialize(world: RuntimeWorld): string {
    const jsonObject = this.serializeToJSON(world);
    return JSON.stringify(jsonObject, null, 2);
  }
}
