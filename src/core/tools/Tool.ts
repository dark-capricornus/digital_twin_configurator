import * as THREE from 'three';

export interface PointerEventData {
  raycaster: THREE.Raycaster;
  point: THREE.Vector3;
  normal?: THREE.Vector3;
  object?: THREE.Object3D;
  originalEvent: PointerEvent;
}

export abstract class Tool {
  public abstract readonly id: string;
  public abstract readonly name: string;
  
  public onActivate(): void {
    // Optional override
  }
  
  public onDeactivate(): void {
    // Optional override
  }

  public onPointerDown(_event: PointerEventData): void {}
  public onPointerMove(_event: PointerEventData): void {}
  public onPointerUp(_event: PointerEventData): void {}
  public onPointerCancel(_event: PointerEventData): void {}
}
