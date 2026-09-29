import * as THREE from 'three';

// ==========================================
// BOUNDING INFO — Reusable data type for
// bounding analysis results
// ==========================================

export interface BoundingInfo {
  /** World-space minimum corner */
  min: [number, number, number];
  /** World-space maximum corner */
  max: [number, number, number];
  /** World-space center */
  center: [number, number, number];
  /** Dimensions: width (X), height (Y), depth (Z) */
  dimensions: [number, number, number];
  /** XZ footprint: [width, depth] */
  footprint: [number, number];
  /** The lowest Y-coordinate in world space (critical for grounding) */
  minY: number;
}

// ==========================================
// PLACEMENT SYSTEM — Centralized service for
// asset placement, floor grounding, and
// pivot normalization.
//
// Framework-agnostic: pure Three.js + math.
// Usable from React rendering layer and
// imperative code paths alike.
// ==========================================

export class PlacementSystem {
  /**
   * Computes full bounding-box information for a Three.js object hierarchy.
   *
   * Handles:
   * - Nested meshes
   * - Transformed children with arbitrary local transforms
   * - Grouped GLBs with deep hierarchies
   * - Models with center, bottom, or arbitrary pivots
   *
   * Uses THREE.Box3.setFromObject() which recursively traverses the entire
   * hierarchy and accounts for all world-space transforms.
   */
  public static computeBoundingInfo(object: THREE.Object3D): BoundingInfo {
    const box = new THREE.Box3().setFromObject(object);

    // Guard against empty or degenerate bounding boxes
    // (e.g. empty groups, point-like geometry)
    if (box.isEmpty()) {
      return {
        min: [0, 0, 0],
        max: [0, 0, 0],
        center: [0, 0, 0],
        dimensions: [0, 0, 0],
        footprint: [0, 0],
        minY: 0,
      };
    }

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    return {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
      center: [center.x, center.y, center.z],
      dimensions: [size.x, size.y, size.z],
      footprint: [size.x, size.z],
      minY: box.min.y,
    };
  }

  /**
   * Computes the final grounded world position for a model.
   *
   * Given a loaded Three.js scene (from GLTFLoader) and a target drop point
   * on the ground plane, this method calculates the Y-offset needed so the
   * model's lowest geometry point sits exactly on the ground surface.
   *
   * This does NOT hardcode position.y = 0. Instead, it computes:
   *   yOffset = surfaceHeight - minY
   *
   * This correctly handles models with:
   * - Center pivots (origin at model center)
   * - Bottom pivots (origin at model base)
   * - Arbitrary/offset origins
   * - Nested transforms
   *
   * @param object The loaded Three.js scene/object to analyze
   * @param dropPoint The XZ target position on the surface (from raycast)
   * @param surfaceHeight The Y-height of the placement surface (default: 0 for ground)
   * @returns The grounded [x, y, z] position
   */
  public static computeGroundedPosition(
    object: THREE.Object3D,
    dropPoint: THREE.Vector3,
    surfaceHeight: number = 0,
  ): [number, number, number] {
    const boundingInfo = this.computeBoundingInfo(object);

    // yOffset: how much we need to shift Y so the model's lowest point
    // aligns with the surface. If minY is negative (model extends below
    // origin), this shifts it up. If minY is positive (model floats above
    // origin), this shifts it down.
    const yOffset = surfaceHeight - boundingInfo.minY;

    return [dropPoint.x, yOffset, dropPoint.z];
  }

  /**
   * Computes a grounded position centered at the origin.
   * Used when placing a model via the "Place Model" button (no cursor position).
   *
   * @param object The loaded Three.js scene/object to analyze
   * @param surfaceHeight The Y-height of the placement surface (default: 0)
   * @returns The grounded [x, y, z] position at origin
   */
  public static computeCenteredGroundedPosition(
    object: THREE.Object3D,
    surfaceHeight: number = 0,
  ): [number, number, number] {
    const boundingInfo = this.computeBoundingInfo(object);
    const yOffset = surfaceHeight - boundingInfo.minY;

    // Center on XZ, grounded on Y
    return [0, yOffset, 0];
  }

  /**
   * Computes the grounded Y value only (without requiring a drop point).
   * Useful when you already know the XZ position but need the correct Y.
   *
   * @param object The loaded Three.js scene/object
   * @param surfaceHeight Ground height (default: 0)
   * @returns The Y position that grounds the model
   */
  public static computeGroundedY(
    object: THREE.Object3D,
    surfaceHeight: number = 0,
  ): number {
    const boundingInfo = this.computeBoundingInfo(object);
    return surfaceHeight - boundingInfo.minY;
  }
}
