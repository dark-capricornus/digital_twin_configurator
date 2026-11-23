import { System } from '../ecs/System';
import type { IRuntimeEngine } from '../ecs/IRuntimeEngine';
import type { TransformComponent, FootprintComponent } from '../ecs/Component';
import { EventBus } from '../../core/events';
import { FoundationGrid, type GridAABB } from './FoundationGrid';

export class FoundationSystem extends System {
  private grid: FoundationGrid;

  // The system listens to the EventBus, but we debounce updates to avoid 
  // excessive rebuilding during rapid consecutive commands (like drag moving).
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 50;
  
  private isDisposed = false;

  constructor(engine: IRuntimeEngine) {
    // We only care about entities that have BOTH Transform and Footprint
    super(engine, ['Transform', 'Footprint']);
    this.grid = new FoundationGrid();
  }

  public override init(): void {
    // We listen to editor events that might invalidate foundation footprint geometry
    EventBus.subscribe('MODEL_PLACED', this.scheduleFullRebuild);
    EventBus.subscribe('NODE_REMOVED', this.scheduleFullRebuild);
    EventBus.subscribe('NODE_TRANSFORM_UPDATED', this.scheduleFullRebuild);
    EventBus.subscribe('NODE_TRANSFORM_PREVIEW', this.handleTransformPreview);
    EventBus.subscribe('COMMAND_UNDONE', this.scheduleFullRebuild);
    EventBus.subscribe('COMMAND_REDONE', this.scheduleFullRebuild);
    
    // Initial build
    this.scheduleFullRebuild();
  }

  public override dispose(): void {
    this.isDisposed = true;
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer);

    EventBus.unsubscribe('MODEL_PLACED', this.scheduleFullRebuild);
    EventBus.unsubscribe('NODE_REMOVED', this.scheduleFullRebuild);
    EventBus.unsubscribe('NODE_TRANSFORM_UPDATED', this.scheduleFullRebuild);
    EventBus.unsubscribe('NODE_TRANSFORM_PREVIEW', this.handleTransformPreview);
    EventBus.unsubscribe('COMMAND_UNDONE', this.scheduleFullRebuild);
    EventBus.unsubscribe('COMMAND_REDONE', this.scheduleFullRebuild);
  }

  public override update(_dt: number): void {
    // Passive system: we do not compute grid layouts every frame.
    // Instead, we are completely event-driven to save CPU cycles.
  }

  // Use an arrow function so we can pass it directly to EventBus
  private handleTransformPreview = (payload: { nodeId: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] }) => {
    if (this.isDisposed) return;
    const transform = this.getComponent<TransformComponent>(payload.nodeId, 'Transform');
    if (transform) {
      if (payload.position) transform.position = payload.position;
      if (payload.rotation) transform.rotation = payload.rotation;
      if (payload.scale) transform.scale = payload.scale;
      this.scheduleFullRebuild();
    }
  };

  private scheduleFullRebuild = () => {
    if (this.isDisposed) return;
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
    
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = null;
      this.rebuildGrid();
    }, this.DEBOUNCE_MS);
  };

  private rebuildGrid(): void {
    this.grid.clear();

    const entityIds = this.getEntities();

    for (const id of entityIds) {
      const transform = this.getComponent<TransformComponent>(id, 'Transform');
      const footprint = this.getComponent<FootprintComponent>(id, 'Footprint');

      if (!transform || !footprint) continue;

      let gridAabb: GridAABB;

      if (footprint.mode === 'aabb') {
        const rotationY = transform.rotation[1]; // Extract Y rotation in radians
        // The Transform scale affects the local extents
        const scaledExtents: [number, number] = [
          footprint.localHalfExtentsXZ[0] * transform.scale[0],
          footprint.localHalfExtentsXZ[1] * transform.scale[2]
        ];

        gridAabb = this.grid.computeGridAABB(
          transform.position,
          rotationY,
          scaledExtents
        );
      } else {
        // Fallback for custom masks (to be implemented fully later)
        // For now, treat as a 1x1 cell
        gridAabb = this.grid.computeGridAABB(transform.position, 0, [0.5, 0.5]);
      }

      this.grid.registerFootprint(id, gridAabb, footprint.paddingOverride, transform.position[1]);
    }

    // After rebuild, emit snapshot to the rendering layer
    EventBus.emit('FOUNDATION_UPDATED', {
      cellCount: this.grid.getCellCount(),
      snapshot: this.grid.getSnapshot()
    });
  }
}
