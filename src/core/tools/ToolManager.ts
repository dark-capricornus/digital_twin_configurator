import type { PointerEventData } from './Tool';
import { Tool } from './Tool';

class ToolManagerImpl {
  private tools = new Map<string, Tool>();
  private activeToolId: string | null = null;

  public registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  public setActiveTool(toolId: string | null): void {
    if (this.activeToolId === toolId) return;

    if (this.activeToolId) {
      const activeTool = this.tools.get(this.activeToolId);
      if (activeTool) activeTool.onDeactivate();
    }

    this.activeToolId = toolId;

    if (this.activeToolId) {
      const newTool = this.tools.get(this.activeToolId);
      if (newTool) newTool.onActivate();
    }

    // In a full implementation, we might emit a TOOL_CHANGED event here.
  }

  public getActiveTool(): Tool | null {
    if (!this.activeToolId) return null;
    return this.tools.get(this.activeToolId) || null;
  }

  // Event routing
  public handlePointerDown(event: PointerEventData): void {
    this.getActiveTool()?.onPointerDown(event);
  }

  public handlePointerMove(event: PointerEventData): void {
    this.getActiveTool()?.onPointerMove(event);
  }

  public handlePointerUp(event: PointerEventData): void {
    this.getActiveTool()?.onPointerUp(event);
  }
}

export const ToolManager = new ToolManagerImpl();
