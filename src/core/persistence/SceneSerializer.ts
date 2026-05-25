import type { SceneNode } from '../../store/scene';

export interface SceneSchema {
  version: string;
  schema: 'digital-twin-scene';
  nodes: Record<string, SceneNode>;
  components: Record<string, any>;
  assets: Record<string, any>;
  metadata: {
    lastSaved: number;
    author?: string;
  };
}

export class SceneSerializer {
  private static readonly CURRENT_VERSION = '0.1.0';

  /**
   * Serializes the current active scene into the custom schema format.
   */
  public static serialize(nodes: Record<string, SceneNode>): string {
    const scenePayload: SceneSchema = {
      version: SceneSerializer.CURRENT_VERSION,
      schema: 'digital-twin-scene',
      nodes: nodes,
      components: {}, // Future component registry export
      assets: {},     // Future asset manifest export
      metadata: {
        lastSaved: Date.now()
      }
    };

    return JSON.stringify(scenePayload, null, 2);
  }

  /**
   * Parses and validates a serialized scene payload.
   */
  public static deserialize(payloadString: string): Record<string, SceneNode> {
    try {
      const payload: SceneSchema = JSON.parse(payloadString);
      
      if (payload.schema !== 'digital-twin-scene') {
        throw new Error('Invalid scene schema');
      }

      // Basic migration layer
      if (payload.version !== SceneSerializer.CURRENT_VERSION) {
        console.warn(`[SceneSerializer] Migrating scene from version ${payload.version} to ${SceneSerializer.CURRENT_VERSION}`);
        // Migration logic would go here
      }

      return payload.nodes;
    } catch (err) {
      console.error('[SceneSerializer] Failed to deserialize scene', err);
      throw err;
    }
  }
}
