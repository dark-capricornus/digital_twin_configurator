import type { PointerEventData } from './Tool';
import { Tool } from './Tool';
import { useEditorStore } from '../../store/editor';

export class AnnotateTool extends Tool {
  public readonly id = 'annotate';
  public readonly name = 'Annotate Pen';
  
  private isDrawing = false;
  private currentLinePoints: Array<[number, number, number]> = [];

  public onPointerDown(event: PointerEventData): void {
    if (event.originalEvent.button !== 0) return; // Only left click

    const p = event.point;
    this.isDrawing = true;
    this.currentLinePoints = [[p.x, p.y + 0.05, p.z]]; // Offset slightly upward from grid to prevent z-fighting
  }

  public onPointerMove(event: PointerEventData): void {
    if (!this.isDrawing) return;

    const p = event.point;
    const lastPoint = this.currentLinePoints[this.currentLinePoints.length - 1];
    
    // Minimum distance threshold to append a new point (reduces redundant points)
    const distSq = 
      Math.pow(p.x - lastPoint[0], 2) + 
      Math.pow(p.y + 0.05 - lastPoint[1], 2) + 
      Math.pow(p.z - lastPoint[2], 2);

    if (distSq > 0.005) {
      this.currentLinePoints.push([p.x, p.y + 0.05, p.z]);
    }
  }

  public onPointerUp(_event: PointerEventData): void {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    if (this.currentLinePoints.length > 1) {
      useEditorStore.getState().addAnnotation(this.currentLinePoints);
    }
    this.currentLinePoints = [];
  }
}
