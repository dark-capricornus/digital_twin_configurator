import { System } from '../ecs/System';
import type { AnimationComponent } from '../ecs/Component';

export class AnimationSystem extends System {
  constructor(engine: any) {
    super(engine, ['Animation']);
  }

  public update(dt: number): void {
    const entityIds = this.getEntities();
    
    for (const id of entityIds) {
      const anim = this.getComponent<AnimationComponent>(id, 'Animation');
      if (!anim) continue;

      if (anim.activeClipId) {
        anim.time += (dt / 1000) * anim.speed;
        
        // Loop logic
        // if (anim.time > clipDuration && anim.loop) anim.time = 0;
        
        // At this point, the AnimationSystem would sample the animation curve
        // and push the evaluated values into the Entity's TransformComponent or BindingComponent.
      }
    }
  }
}
