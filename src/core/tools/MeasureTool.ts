import type { PointerEventData } from './Tool';
import { Tool } from './Tool';
import { useEditorStore } from '../../store/editor';

export class MeasureTool extends Tool {
  public readonly id = 'measure';
  public readonly name = 'Measure Ruler';
  private isDrawing = false;

  public onPointerDown(event: PointerEventData): void {
    if (event.originalEvent.button !== 0) return; // Only left click

    const p = event.point;
    const store = useEditorStore.getState();

    if (!this.isDrawing) {
      // Start measurement
      store.setMeasurementPoints([p.x, p.y, p.z], [p.x, p.y, p.z]);
      this.isDrawing = true;
    } else {
      // Complete/Lock measurement
      store.setMeasurementPoints(store.measurementStart, [p.x, p.y, p.z]);
      this.isDrawing = false;
    }
  }

  public onPointerMove(event: PointerEventData): void {
    if (!this.isDrawing) return;
    
    const p = event.point;
    const store = useEditorStore.getState();
    store.setMeasurementPoints(store.measurementStart, [p.x, p.y, p.z]);
  }

  public onDeactivate(): void {
    // Clear measurements when switching tools
    const store = useEditorStore.getState();
    store.setMeasurementPoints(null, null);
    this.isDrawing = false;
  }
}
