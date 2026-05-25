import type { Command } from './CommandManager';
import { useSceneStore, type SceneNode } from '../../store/scene';

export class AddNodeCommand implements Command {
  public name = 'Add Node';
  private node: SceneNode;
  private parentId: string;
  constructor(node: SceneNode, parentId: string) {
    this.node = node;
    this.parentId = parentId;
  }

  execute() {
    useSceneStore.getState().addNode(this.node, this.parentId);
  }

  undo() {
    useSceneStore.getState().removeNode(this.node.id);
  }
}

export class RemoveNodeCommand implements Command {
  public name = 'Remove Node';
  private nodeBackup: SceneNode | null = null;
  private parentIdBackup: string | undefined = undefined;

  private nodeId: string;
  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  execute() {
    const state = useSceneStore.getState();
    const node = state.nodes[this.nodeId];
    if (node) {
      this.nodeBackup = JSON.parse(JSON.stringify(node));
      this.parentIdBackup = node.parentId;
      state.removeNode(this.nodeId);
    }
  }

  undo() {
    if (this.nodeBackup && this.parentIdBackup) {
      useSceneStore.getState().addNode(this.nodeBackup, this.parentIdBackup);
    }
  }
}

export class UpdateTransformCommand implements Command {
  public name = 'Update Transform';
  private previousTransform: any;

  private nodeId: string;
  private newTransform: Partial<SceneNode['transform']>;

  constructor(
    nodeId: string,
    newTransform: Partial<SceneNode['transform']>
  ) {
    this.nodeId = nodeId;
    this.newTransform = newTransform;
  }

  execute() {
    const state = useSceneStore.getState();
    const node = state.nodes[this.nodeId];
    if (!node) return;
    
    // Store previous state if not already stored
    if (!this.previousTransform) {
      this.previousTransform = {};
      if (this.newTransform.position) this.previousTransform.position = [...node.transform.position];
      if (this.newTransform.rotation) this.previousTransform.rotation = [...node.transform.rotation];
      if (this.newTransform.scale) this.previousTransform.scale = [...node.transform.scale];
    }
    
    state.updateNodeTransform(this.nodeId, this.newTransform);
  }

  undo() {
    if (this.previousTransform) {
      useSceneStore.getState().updateNodeTransform(this.nodeId, this.previousTransform);
    }
  }
}

export class UpdateComponentCommand implements Command {
  public name = 'Update Component';
  private previousComponents: Record<string, any>;

  private nodeId: string;
  private newComponents: Record<string, any>;

  constructor(
    nodeId: string,
    newComponents: Record<string, any>
  ) {
    this.nodeId = nodeId;
    this.newComponents = newComponents;
    this.previousComponents = {};
  }

  execute() {
    const state = useSceneStore.getState();
    const node = state.nodes[this.nodeId];
    if (!node) return;

    if (Object.keys(this.previousComponents).length === 0) {
      for (const key of Object.keys(this.newComponents)) {
        this.previousComponents[key] = node.components[key];
      }
    }

    state.updateNodeComponents(this.nodeId, this.newComponents);
  }

  undo() {
    useSceneStore.getState().updateNodeComponents(this.nodeId, this.previousComponents);
  }
}

export class ReparentNodeCommand implements Command {
  public name = 'Reparent Node';
  
  private nodeId: string;
  private newParentId: string;
  private oldParentId: string;
  
  constructor(
    nodeId: string,
    newParentId: string,
    oldParentId: string
  ) {
    this.nodeId = nodeId;
    this.newParentId = newParentId;
    this.oldParentId = oldParentId;
  }

  execute() {
    // This requires an implementation of `reparentNode` in SceneStore
    useSceneStore.getState().reparentNode(this.nodeId, this.newParentId);
  }

  undo() {
    useSceneStore.getState().reparentNode(this.nodeId, this.oldParentId);
  }
}
