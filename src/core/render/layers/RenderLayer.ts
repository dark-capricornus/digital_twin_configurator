/**
 * RenderLayer defines bitmasks for camera visibility layers.
 * 
 * Instead of traversing the scene graph to hide objects, we assign 
 * objects to specific bitmask layers and adjust the Camera's layer mask.
 */
export const RenderLayer = {
  DEFAULT: 0, // General scene objects (1 << 0 is usually default in Three.js)
  SCENE: 1,   // (1 << 1)
  GRID: 2,    // (1 << 2)
  GIZMO: 3,   // (1 << 3)
  SELECTION: 4, // (1 << 4) Outline/Highlight passes
  OVERLAY: 5,   // (1 << 5) 2D UI embedded in 3D
  DEBUG: 6      // (1 << 6) Collision meshes, octree bounds, etc.
} as const;

export type RenderLayer = typeof RenderLayer[keyof typeof RenderLayer];

/**
 * Utility to help manage Three.js layers.
 */
export class RenderLayerManager {
  public static setLayer(object3D: any, layer: RenderLayer, recursive: boolean = true): void {
    if (!object3D || !object3D.layers) return;
    object3D.layers.set(layer);
    if (recursive && object3D.children) {
      for (const child of object3D.children) {
        RenderLayerManager.setLayer(child, layer, true);
      }
    }
  }

  public static enableCameraLayer(camera: any, layer: RenderLayer): void {
    if (!camera || !camera.layers) return;
    camera.layers.enable(layer);
  }

  public static disableCameraLayer(camera: any, layer: RenderLayer): void {
    if (!camera || !camera.layers) return;
    camera.layers.disable(layer);
  }
}
