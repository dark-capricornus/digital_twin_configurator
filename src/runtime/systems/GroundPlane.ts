import * as THREE from 'three';

// ==========================================
// PLACEMENT SURFACE — Abstract interface for
// any surface models can be placed on.
//
// This abstraction supports future extensions:
// - Terrain heightmaps
// - Surface meshes
// - Multi-level floors
// - Collision-aware surfaces
// ==========================================

export interface PlacementSurface {
  /**
   * Returns the height of the surface at a given XZ position.
   * For a flat ground plane, this always returns 0.
   * For terrain, this would sample a heightmap.
   */
  getHeightAt(x: number, z: number): number;

  /**
   * Performs a raycast against this surface and returns the intersection point.
   * Returns null if the ray does not intersect the surface.
   */
  raycast(ray: THREE.Ray): THREE.Vector3 | null;

  /**
   * The surface normal at a given XZ position.
   * For a flat plane, this is always (0, 1, 0).
   */
  getNormalAt(x: number, z: number): THREE.Vector3;

  /**
   * Whether this surface extends infinitely or has finite bounds.
   */
  readonly isInfinite: boolean;
}

// ==========================================
// INFINITE GROUND PLANE — Default flat floor
// at a given Y height (default 0).
//
// - Infinite in XZ
// - Raycastable for drag-drop placement
// - Snapping-ready architecture
// ==========================================

export class InfiniteGroundPlane implements PlacementSurface {
  private readonly plane: THREE.Plane;
  private readonly height: number;

  public readonly isInfinite = true;

  /**
   * @param height The Y-coordinate of the ground plane (default: 0)
   */
  constructor(height: number = 0) {
    this.height = height;
    // THREE.Plane(normal, constant) — for Y=h, normal is (0,1,0) and constant is -h
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height);
  }

  public getHeightAt(_x: number, _z: number): number {
    return this.height;
  }

  public raycast(ray: THREE.Ray): THREE.Vector3 | null {
    const target = new THREE.Vector3();
    const result = ray.intersectPlane(this.plane, target);
    return result;
  }

  public getNormalAt(_x: number, _z: number): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0);
  }

  /**
   * Returns the underlying THREE.Plane for direct use with raycasters.
   */
  public getThreePlane(): THREE.Plane {
    return this.plane;
  }
}

// ==========================================
// GROUND PLANE MANAGER — Singleton managing
// the active placement surface.
//
// Future: supports swapping surfaces for
// terrain, multi-floor, or custom surfaces.
// ==========================================

export class GroundPlaneManager {
  private static instance: GroundPlaneManager;
  private activeSurface: PlacementSurface;

  private constructor() {
    this.activeSurface = new InfiniteGroundPlane(0);
  }

  public static getInstance(): GroundPlaneManager {
    if (!GroundPlaneManager.instance) {
      GroundPlaneManager.instance = new GroundPlaneManager();
    }
    return GroundPlaneManager.instance;
  }

  /**
   * Returns the current active placement surface.
   */
  public getActiveSurface(): PlacementSurface {
    return this.activeSurface;
  }

  /**
   * Replaces the active placement surface.
   * Future use: swap to terrain, elevated floor, etc.
   */
  public setActiveSurface(surface: PlacementSurface): void {
    this.activeSurface = surface;
  }

  /**
   * Convenience: Get the height at a given XZ position on the active surface.
   */
  public getHeightAt(x: number, z: number): number {
    return this.activeSurface.getHeightAt(x, z);
  }

  /**
   * Convenience: Raycast against the active surface.
   */
  public raycast(ray: THREE.Ray): THREE.Vector3 | null {
    return this.activeSurface.raycast(ray);
  }
}

export const groundPlaneManager = GroundPlaneManager.getInstance();
