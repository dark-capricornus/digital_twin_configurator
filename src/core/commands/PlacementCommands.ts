import type { Command } from './CommandManager';
import { useSceneStore, type SceneNode } from '../../store/scene';
import { RuntimeContext } from '../../runtime/world/RuntimeContext';
import { EventBus } from '../events';
import type { BoundingInfo } from '../../runtime/systems/PlacementSystem';

/**
 * PlaceModelCommand — Undo/redo-safe command for placing a grounded model
 * into the scene. Unlike raw AddNodeCommand, this command takes a
 * pre-computed grounded position (from PlacementSystem) and stores
 * bounding metadata on the entity for future snapping/stacking.
 *
 * Flow:
 *   GLB loaded → PlacementSystem.computeGroundedPosition() → PlaceModelCommand
 *   → SceneStore.addNode() + RuntimeWorld entity creation
 */
export class PlaceModelCommand implements Command {
  public name = 'Place Model';

  private node: SceneNode;
  private parentId: string;
  private boundingInfo: BoundingInfo | null;

  /**
   * @param assetId The asset ID of the GLB model
   * @param assetName Display name of the model
   * @param groundedPosition The pre-computed grounded [x, y, z] position
   * @param parentId The parent node ID (usually root)
   * @param boundingInfo Optional bounding info for ECS storage
   * @param nodeId Optional explicit node ID (for determinism)
   */
  constructor(
    assetId: string,
    assetName: string,
    groundedPosition: [number, number, number],
    parentId: string,
    boundingInfo: BoundingInfo | null = null,
    nodeId?: string,
  ) {
    this.parentId = parentId;
    this.boundingInfo = boundingInfo;

    this.node = {
      id: nodeId || Math.random().toString(36).substr(2, 9),
      name: assetName,
      type: 'Model',
      parentId,
      transform: {
        position: groundedPosition,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: { assetId },
      children: [],
    };
  }

  public getNodeId(): string {
    return this.node.id;
  }

  execute(): void {
    // 1. Add node to scene store
    useSceneStore.getState().addNode(this.node, this.parentId);

    // 2. Synchronize to authoritative ECS RuntimeWorld
    RuntimeContext.runInWorldContext((world) => {
      world.createEntity(this.node.name, this.node.id);

      // Transform component — stores the grounded position
      world.addComponent({
        type: 'Transform',
        entityId: this.node.id,
        position: [...this.node.transform.position],
        rotation: [...this.node.transform.rotation],
        scale: [...this.node.transform.scale],
      } as any);

      // Render component
      world.addComponent({
        type: 'Render',
        entityId: this.node.id,
        visible: true,
        castShadow: true,
        receiveShadow: true,
      } as any);

      // Placement component — stores bounding metadata for future use
      if (this.boundingInfo) {
        world.addComponent({
          type: 'Placement',
          entityId: this.node.id,
          groundedY: this.node.transform.position[1],
          boundingMin: [...this.boundingInfo.min],
          boundingMax: [...this.boundingInfo.max],
          boundingCenter: [...this.boundingInfo.center],
          footprint: [...this.boundingInfo.footprint],
          pivotMode: 'auto',
        } as any);
      }
    });

    // 3. Emit placement event
    EventBus.emit('MODEL_PLACED', {
      nodeId: this.node.id,
      assetId: this.node.components.assetId as string,
      position: [...this.node.transform.position] as [number, number, number],
    });
  }

  undo(): void {
    // 1. Remove from scene store
    useSceneStore.getState().removeNode(this.node.id);

    // 2. Remove from ECS RuntimeWorld
    RuntimeContext.runInWorldContext((world) => {
      world.removeEntity(this.node.id);
    });
  }
}
