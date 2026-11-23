// ==========================================
// FOUNDATION GRID — Pure data layer (Cache)
//
// Responsibilities:
//   - Grid occupancy tracking via CellFlags
//   - Object footprint (Transform + Footprint component) → cell conversion
//   - Padding cell generation
//   - Flood-fill region merging
//   - Lifecycle: register / unregister footprints
//
// No React. No Three.js rendering.
// Framework-agnostic math + data structures.
// Now acts as a derived cache, not primary state.
// ==========================================

// ---- Types ----

export interface FoundationConfig {
  /** Size of each grid cell in world units (meters). Default 1.0 */
  cellSize: number;
  /** Extra cells of padding around each object footprint. Default 1 */
  paddingCells: number;
  /** Y position of the foundation surface. Default 0.005 */
  foundationHeight: number;
}

export const CellFlags = {
  NONE: 0,
  OCCUPIED: 1 << 0,  // Object footprint
  PADDED: 1 << 1,    // Padding around footprint
  ROAD: 1 << 2,      // Future: Road/path
  CONVEYOR: 1 << 3,  // Future: Conveyor belt
  UTILITY: 1 << 4,   // Future: Utility corridor
  RESERVED: 1 << 5,  // Future: Reserved/restricted
} as const;

export type CellFlags = typeof CellFlags[keyof typeof CellFlags];

export interface FoundationCell {
  /** Grid X index */
  gx: number;
  /** Grid Z index */
  gz: number;
  /** Bitmask of cell properties */
  flags: CellFlags;
  /** Which merged region this cell belongs to (-1 = unassigned) */
  regionId: number;
  /** Set of scene node IDs that claim this cell (occupied or padded) */
  ownerNodeIds: Set<string>;
  /** World Y height of this cell */
  worldY: number;
}

/** Axis-aligned bounding box in XZ grid space */
export interface GridAABB {
  gxMin: number;
  gxMax: number;
  gzMin: number;
  gzMax: number;
}

/** Snapshot of cells for the renderer — plain arrays, no Sets */
export interface FoundationSnapshot {
  /** World-space X position for each cell center */
  worldX: Float32Array;
  /** World-space Y position for each cell surface */
  worldY: Float32Array;
  /** World-space Z position for each cell center */
  worldZ: Float32Array;
  /** Encoded CellFlags for each cell */
  cellFlags: Uint8Array;
  /** Region ID per cell */
  regionIds: Int32Array;
  /** Total active cell count */
  count: number;
}

// ---- Default Config ----

const DEFAULT_CONFIG: FoundationConfig = {
  cellSize: 1.0,
  paddingCells: 10,
  foundationHeight: 0.005,
};

// ---- Cell Key Helper ----
// Currently using strings. Intentionally kept simple for this scale.
// Future optimization: packed integers (gx << 16 | gz).

function cellKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

// ==========================================
// FOUNDATION GRID CLASS
// ==========================================

export class FoundationGrid {
  private config: FoundationConfig;

  /** Master cell map: key = "gx,gz" */
  private cells: Map<string, FoundationCell> = new Map();

  /**
   * Per-node cell tracking: which cell keys each node claims.
   * Separated into occupied keys and padded keys so unregister
   * can correctly decrement ownership.
   */
  private nodeOccupiedKeys: Map<string, Set<string>> = new Map();
  private nodePaddedKeys: Map<string, Set<string>> = new Map();

  /** Cached snapshot — invalidated on any mutation */
  private _snapshot: FoundationSnapshot | null = null;

  constructor(config?: Partial<FoundationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---- Accessors ----

  public getConfig(): Readonly<FoundationConfig> {
    return this.config;
  }

  public setConfig(patch: Partial<FoundationConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  public getCellCount(): number {
    return this.cells.size;
  }

  // ---- World ↔ Grid Conversion ----

  /** Convert a world-space X or Z coordinate to a grid index */
  public worldToGridIndex(worldCoord: number): number {
    return Math.floor(worldCoord / this.config.cellSize);
  }

  /** Convert a grid index back to the world-space center of that cell */
  public gridToWorldCenter(gridIndex: number): number {
    return (gridIndex + 0.5) * this.config.cellSize;
  }

  // ---- Footprint Registration ----

  /**
   * Compute the precise grid cells occupied by an entity,
   * taking rotation into account to compute a rotated world-space AABB.
   */
  public computeGridAABB(
    position: [number, number, number],
    rotationY: number, // Rotation around Y axis in radians
    localHalfExtentsXZ: [number, number]
  ): GridAABB {
    const { cellSize } = this.config;
    
    // 4 corners in local space
    const hx = localHalfExtentsXZ[0];
    const hz = localHalfExtentsXZ[1];
    
    const corners = [
      { x: -hx, z: -hz },
      { x: hx, z: -hz },
      { x: hx, z: hz },
      { x: -hx, z: hz }
    ];
    
    const cosR = Math.cos(rotationY);
    const sinR = Math.sin(rotationY);
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    
    // Rotate corners to world space and find AABB bounds
    for (const corner of corners) {
      const rx = corner.x * cosR - corner.z * sinR;
      const rz = corner.x * sinR + corner.z * cosR;
      
      const worldX = position[0] + rx;
      const worldZ = position[2] + rz;
      
      if (worldX < minX) minX = worldX;
      if (worldX > maxX) maxX = worldX;
      if (worldZ < minZ) minZ = worldZ;
      if (worldZ > maxZ) maxZ = worldZ;
    }
    
    // Convert to grid indices
    return {
      gxMin: Math.floor(minX / cellSize),
      gxMax: Math.ceil(maxX / cellSize) - 1,
      gzMin: Math.floor(minZ / cellSize),
      gzMax: Math.ceil(maxZ / cellSize) - 1,
    };
  }

  /**
   * Register a footprint for a scene node.
   * Converts the grid AABB to grid cells, marks occupied + padding, and recomputes regions.
   */
  public registerFootprint(nodeId: string, gridAabb: GridAABB, customPadding?: number | null, worldY: number = 0): void {
    // Unregister first if already registered (idempotent)
    if (this.nodeOccupiedKeys.has(nodeId)) {
      this.unregisterFootprint(nodeId);
    }

    const paddingCells = customPadding ?? this.config.paddingCells;

    const { gxMin, gxMax, gzMin, gzMax } = gridAabb;

    const occupiedKeys = new Set<string>();
    const paddedKeys = new Set<string>();

    // Mark occupied cells
    for (let gx = gxMin; gx <= gxMax; gx++) {
      for (let gz = gzMin; gz <= gzMax; gz++) {
        const key = cellKey(gx, gz);
        occupiedKeys.add(key);
        this.ensureCell(gx, gz, key);
        const cell = this.cells.get(key)!;
        cell.flags |= CellFlags.OCCUPIED;
        cell.ownerNodeIds.add(nodeId);
        cell.worldY = Math.max(cell.worldY, worldY); // Overlapping cells take the max height
      }
    }

    // Mark padding cells
    const padGxMin = gxMin - paddingCells;
    const padGxMax = gxMax + paddingCells;
    const padGzMin = gzMin - paddingCells;
    const padGzMax = gzMax + paddingCells;

    for (let gx = padGxMin; gx <= padGxMax; gx++) {
      for (let gz = padGzMin; gz <= padGzMax; gz++) {
        const key = cellKey(gx, gz);
        if (occupiedKeys.has(key)) continue; // already occupied, skip
        paddedKeys.add(key);
        this.ensureCell(gx, gz, key);
        const cell = this.cells.get(key)!;
        cell.flags |= CellFlags.PADDED;
        cell.ownerNodeIds.add(nodeId);
        cell.worldY = Math.max(cell.worldY, worldY); // Overlapping cells take the max height
      }
    }

    this.nodeOccupiedKeys.set(nodeId, occupiedKeys);
    this.nodePaddedKeys.set(nodeId, paddedKeys);

    this.recomputeRegions();
    this.invalidate();
  }

  /**
   * Remove all cells owned exclusively by a node.
   * Cells shared with other nodes retain their status.
   */
  public unregisterFootprint(nodeId: string): void {
    const occupiedKeys = this.nodeOccupiedKeys.get(nodeId);
    const paddedKeys = this.nodePaddedKeys.get(nodeId);

    if (!occupiedKeys && !paddedKeys) return;

    const allKeys = new Set<string>();
    if (occupiedKeys) occupiedKeys.forEach((k) => allKeys.add(k));
    if (paddedKeys) paddedKeys.forEach((k) => allKeys.add(k));

    for (const key of allKeys) {
      const cell = this.cells.get(key);
      if (!cell) continue;

      cell.ownerNodeIds.delete(nodeId);

      if (cell.ownerNodeIds.size === 0) {
        // No more owners — remove the cell entirely
        this.cells.delete(key);
      } else {
        // Re-derive occupied/padded from remaining owners
        this.rederiveCellFlags(cell, key);
      }
    }

    this.nodeOccupiedKeys.delete(nodeId);
    this.nodePaddedKeys.delete(nodeId);

    this.recomputeRegions();
    this.invalidate();
  }

  /** Clear all cells and node tracking */
  public clear(): void {
    this.cells.clear();
    this.nodeOccupiedKeys.clear();
    this.nodePaddedKeys.clear();
    this._snapshot = null;
  }

  // ---- Snapshot for Renderer ----

  /**
   * Returns a compact snapshot of all active cells for the renderer.
   * Cached until the next mutation.
   */
  public getSnapshot(): FoundationSnapshot {
    if (this._snapshot) return this._snapshot;

    const count = this.cells.size;
    const worldX = new Float32Array(count);
    const worldY = new Float32Array(count);
    const worldZ = new Float32Array(count);
    const cellFlags = new Uint8Array(count);
    const regionIds = new Int32Array(count);

    let i = 0;
    const { cellSize } = this.config;
    for (const cell of this.cells.values()) {
      worldX[i] = cell.gx * cellSize + cellSize / 2;
      worldY[i] = cell.worldY;
      worldZ[i] = cell.gz * cellSize + cellSize / 2;
      cellFlags[i] = cell.flags;
      regionIds[i] = cell.regionId;
      i++;
    }

    this._snapshot = { worldX, worldY, worldZ, cellFlags, regionIds, count };
    return this._snapshot;
  }

  // ---- Region Merging (Flood Fill) ----

  private recomputeRegions(): void {
    // Reset all region IDs
    for (const cell of this.cells.values()) {
      cell.regionId = -1;
    }

    let currentRegion = 0;

    for (const cell of this.cells.values()) {
      if (cell.regionId !== -1) continue;

      // BFS flood-fill from this cell
      const queue: FoundationCell[] = [cell];
      cell.regionId = currentRegion;

      while (queue.length > 0) {
        const current = queue.pop()!;

        // Check 4-connected neighbors
        const neighbors = [
          cellKey(current.gx + 1, current.gz),
          cellKey(current.gx - 1, current.gz),
          cellKey(current.gx, current.gz + 1),
          cellKey(current.gx, current.gz - 1),
        ];

        for (const nKey of neighbors) {
          const neighbor = this.cells.get(nKey);
          if (neighbor && neighbor.regionId === -1) {
            neighbor.regionId = currentRegion;
            queue.push(neighbor);
          }
        }
      }

      currentRegion++;
    }
  }

  // ---- Internal Helpers ----

  private ensureCell(gx: number, gz: number, key: string): void {
    if (!this.cells.has(key)) {
      this.cells.set(key, {
        gx,
        gz,
        flags: CellFlags.NONE,
        regionId: -1,
        ownerNodeIds: new Set(),
        worldY: 0,
      });
    }
  }

  /**
   * After removing a node from a shared cell, re-derive the cell flags
   * based on remaining owners.
   */
  private rederiveCellFlags(cell: FoundationCell, key: string): void {
    let hasOccupied = false;
    let hasPadded = false;

    for (const ownerId of cell.ownerNodeIds) {
      if (this.nodeOccupiedKeys.get(ownerId)?.has(key)) {
        hasOccupied = true;
      }
      if (this.nodePaddedKeys.get(ownerId)?.has(key)) {
        hasPadded = true;
      }
    }

    // Reset relevant bits
    cell.flags &= ~CellFlags.OCCUPIED;
    cell.flags &= ~CellFlags.PADDED;

    if (hasOccupied) {
      cell.flags |= CellFlags.OCCUPIED;
    } else if (hasPadded) {
      cell.flags |= CellFlags.PADDED;
    }
  }

  private invalidate(): void {
    this._snapshot = null;
  }
}
