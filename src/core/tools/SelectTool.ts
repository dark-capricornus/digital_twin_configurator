import type { PointerEventData } from './Tool';
import { Tool } from './Tool';

export class SelectTool extends Tool {
  public readonly id = 'select';
  public readonly name = 'Select Box';

  public onPointerDown(event: PointerEventData): void {
    if (event.originalEvent.button !== 0) return; // Only left click

  }
}
