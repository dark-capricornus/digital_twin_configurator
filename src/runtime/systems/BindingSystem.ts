import { System } from '../ecs/System';
import type { BindingComponent, TransformComponent, RenderComponent } from '../ecs/Component';
import { BindingManager } from '../bindings/BindingManager';

export class BindingSystem extends System {
  constructor(engine: any) {
    super(engine, ['Binding']);
  }

  public override init(): void {
    // When the system starts, we should subscribe to all current bindings.
    // In a fully dynamic system, we'd watch for component adds/removes.
    const entityIds = this.getEntities();
    for (const id of entityIds) {
      const binding = this.getComponent<BindingComponent>(id, 'Binding');
      if (binding) {
        BindingManager.subscribe(binding.protocol, binding.topic);
      }
    }
  }

  public override dispose(): void {
    const entityIds = this.getEntities();
    for (const id of entityIds) {
      const binding = this.getComponent<BindingComponent>(id, 'Binding');
      if (binding) {
        BindingManager.unsubscribe(binding.protocol, binding.topic);
      }
    }
  }

  public update(_dt: number): void {
    const entityIds = this.getEntities();
    
    for (const id of entityIds) {
      const binding = this.getComponent<BindingComponent>(id, 'Binding');
      if (!binding) continue;

      const latestValue = BindingManager.getLatestValue(binding.topic);
      
      // Only process if the value changed
      if (latestValue !== undefined && binding.lastValue !== latestValue) {
        binding.lastValue = latestValue;
        binding.lastUpdated = Date.now();
        
        this.applyBinding(id, binding);
      }
    }
  }

  private applyBinding(entityId: string, binding: BindingComponent): void {
    // Simplistic target property resolver mapping e.g., 'transform.position.y' to actual component mutation
    if (binding.targetProperty.startsWith('transform.')) {
      const transform = this.getComponent<TransformComponent>(entityId, 'Transform');
      if (transform) {
        const prop = binding.targetProperty.split('.')[2]; // 'y'
        const type = binding.targetProperty.split('.')[1] as 'position' | 'rotation' | 'scale';
        if (prop === 'x') transform[type][0] = binding.lastValue;
        if (prop === 'y') transform[type][1] = binding.lastValue;
        if (prop === 'z') transform[type][2] = binding.lastValue;
      }
    } else if (binding.targetProperty.startsWith('render.')) {
      const render = this.getComponent<RenderComponent>(entityId, 'Render');
      if (render) {
        const prop = binding.targetProperty.split('.')[1] as keyof RenderComponent;
        (render as any)[prop] = binding.lastValue;
      }
    }
  }
}
