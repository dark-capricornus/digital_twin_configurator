import type { SceneNode } from '../../store/scene';

export interface PatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move';
  path: string; // JSON Pointer path, e.g., '/nodes/entity_1/transform/position'
  value?: any;
}

/**
 * Computes the delta between two Scene Graph snapshots.
 */
export class SceneDiffer {
  /**
   * Generates an array of PatchOperations to transform `base` into `target`.
   * For heavy scenes, this logic should run in a Web Worker.
   */
  public static diff(base: Record<string, SceneNode>, target: Record<string, SceneNode>): PatchOperation[] {
    const patches: PatchOperation[] = [];
    const baseIds = new Set(Object.keys(base));
    const targetIds = new Set(Object.keys(target));

    // 1. Check for adds and modifications
    for (const id of targetIds) {
      if (!baseIds.has(id)) {
        patches.push({ op: 'add', path: `/nodes/${id}`, value: target[id] });
      } else {
        // Simple top-level component diffing for demonstration.
        // A production differ would recursively traverse the object.
        const baseNode = base[id];
        const targetNode = target[id];

        if (JSON.stringify(baseNode.transform) !== JSON.stringify(targetNode.transform)) {
          patches.push({ op: 'replace', path: `/nodes/${id}/transform`, value: targetNode.transform });
        }
        
        if (JSON.stringify(baseNode.components) !== JSON.stringify(targetNode.components)) {
          patches.push({ op: 'replace', path: `/nodes/${id}/components`, value: targetNode.components });
        }

        if (baseNode.parentId !== targetNode.parentId) {
           patches.push({ op: 'move', path: `/nodes/${id}/parentId`, value: targetNode.parentId });
        }
      }
    }

    // 2. Check for removes
    for (const id of baseIds) {
      if (!targetIds.has(id)) {
        patches.push({ op: 'remove', path: `/nodes/${id}` });
      }
    }

    return patches;
  }
}
