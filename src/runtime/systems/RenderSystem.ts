import { System } from '../ecs/System';
import type { RenderComponent } from '../ecs/Component';

export class RenderSystem extends System {
  constructor(engine: any) {
    super(engine, ['Render']);
  }

  public update(_dt: number): void {
    const entityIds = this.getEntities();
    
    // The RenderSystem does not perform WebGL calls.
    // It updates culling flags, LOD states, and prepares 
    // the display list for the bridging layer to consume.
    for (const id of entityIds) {
      const renderComp = this.getComponent<RenderComponent>(id, 'Render');
      if (!renderComp) continue;

      // E.g., if (distanceToCamera > LOD_THRESHOLD) renderComp.visible = false;
    }
  }
}
