import { useEditorStore } from '../../store/editor';
import { EventBus } from '../events';

class SelectionServiceImpl {
  private hoveredNodeId: string | null = null;
  
  public selectNode(nodeId: string | null): void {
    const currentState = useEditorStore.getState();
    if (currentState.selectedNodeId === nodeId) return;

    // 1. Update store
    currentState.selectNode(nodeId);

    // 2. Emit event
    EventBus.emit('NODE_SELECTED', { nodeId });
  }

  public getSelectedNodeId(): string | null {
    return useEditorStore.getState().selectedNodeId;
  }

  public setHoveredNode(nodeId: string | null): void {
    if (this.hoveredNodeId === nodeId) return;
    this.hoveredNodeId = nodeId;
    // In the future, this might dispatch a hover event if UI needs to react
  }

  public getHoveredNode(): string | null {
    return this.hoveredNodeId;
  }
  
  // Future: multi-select support
  // public addToSelection(nodeId: string): void {}
  // public removeFromSelection(nodeId: string): void {}
  // public clearSelection(): void {}
}

export const SelectionService = new SelectionServiceImpl();
