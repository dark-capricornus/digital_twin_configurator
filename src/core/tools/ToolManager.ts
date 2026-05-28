import type { PointerEventData } from './Tool';
import { Tool } from './Tool';
import { SelectTool } from './SelectTool';
import { CursorTool } from './CursorTool';
import { AddTool } from './AddTool';
import { MeasureTool } from './MeasureTool';
import { AnnotateTool } from './AnnotateTool';

class ToolManagerImpl {
  private tools = new Map<string, Tool>();
  private activeToolId: string | null = null;

  constructor() {
    // Automatically register all editor tools
    this.registerTool(new SelectTool());
    this.registerTool(new CursorTool());
    this.registerTool(new AddTool());
    this.registerTool(new MeasureTool());
    this.registerTool(new AnnotateTool());
  }

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
