import React from 'react';
import type { SceneNode } from '../../store/scene';

export interface InspectorComponentProps {
  node: SceneNode;
}

export type InspectorComponent = React.FC<InspectorComponentProps>;

class InspectorRegistryImpl {
  private inspectors = new Map<string, InspectorComponent>();

  public register(componentName: string, component: InspectorComponent): void {
    this.inspectors.set(componentName, component);
  }

  public get(componentName: string): InspectorComponent | undefined {
    return this.inspectors.get(componentName);
  }

  public getAllRegistered(): string[] {
    return Array.from(this.inspectors.keys());
  }
}

export const InspectorRegistry = new InspectorRegistryImpl();
