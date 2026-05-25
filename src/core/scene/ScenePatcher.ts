import type { SceneNode } from '../../store/scene';
import type { PatchOperation } from './SceneDiffer';

/**
 * Applies PatchOperations to a Scene Graph.
 */
export class ScenePatcher {
  /**
   * Applies patches to the scene graph in-place or returns a deep clone.
   * Modifying in-place is faster but dangerous if not synchronized with Zustand/React.
   */
  public static applyPatches(state: Record<string, SceneNode>, patches: PatchOperation[]): void {
    for (const patch of patches) {
      const parts = patch.path.split('/').filter(Boolean); // ['nodes', 'entity_1', 'transform']
      if (parts[0] !== 'nodes') continue;

      const entityId = parts[1];
      const field = parts[2];

      if (patch.op === 'add' && parts.length === 2) {
        state[entityId] = patch.value;
      } 
      else if (patch.op === 'remove' && parts.length === 2) {
        delete state[entityId];
      }
      else if (patch.op === 'replace' || patch.op === 'move') {
        if (!state[entityId]) continue;
        
        if (field === 'transform') {
          state[entityId].transform = patch.value;
        } else if (field === 'components') {
          state[entityId].components = patch.value;
        } else if (field === 'parentId') {
          state[entityId].parentId = patch.value;
        }
      }
    }
  }
}
