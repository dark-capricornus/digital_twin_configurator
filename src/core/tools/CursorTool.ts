import type { PointerEventData } from './Tool';
import { Tool } from './Tool';
import { useEditorStore } from '../../store/editor';

export class CursorTool extends Tool {
  public readonly id = 'cursor';
  public readonly name = '3D Cursor';

  public onPointerDown(event: PointerEventData): void {
    if (event.originalEvent.button !== 0) return; // Only left click
    
    const p = event.point;
    useEditorStore.getState().setCursorPosition([p.x, p.y, p.z]);
  }
}
