/* eslint-disable react-hooks/immutability */
import React from 'react';
import * as THREE from 'three';
import { useFoundationStore } from '../../store/foundation';
import { CellFlags } from '../../runtime/systems/FoundationGrid';

// ==========================================
// FOUNDATION RENDERER — High-performance
// instanced rendering of foundation tiles.
//
// Uses a single InstancedMesh with per-instance
// matrices and colors. No individual plane meshes.
//
// Visual style:
//   - Occupied cells: dark slate (#1e293b)
//   - Padded cells: darker slate (#0f172a)
//   - Grid gaps: 0.03m between cells
//   - Height: Y = foundationHeight (0.005)
// ==========================================

// ---- Constants ----
const MAX_INSTANCES = 10_000;
const CELL_SIZE = 1.0;
const FOUNDATION_HEIGHT = 0.005;

const COLOR_OCCUPIED = new THREE.Color('#ffffff'); // White for object area
const COLOR_PADDED = new THREE.Color('#f1f5f9');   // Slight gray for padded area

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0),
);
const tempScale = new THREE.Vector3(1, 1, 1);

// Generate a texture that looks like a Sims grid tile
function createGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#94a3b8'; // Slate 400 grid lines
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

const gridTexture = createGridTexture();

export const FoundationRenderer: React.FC = () => {
  const snapshot = useFoundationStore((s) => s.snapshot);

  const meshRef = React.useRef<THREE.InstancedMesh>(null);

  // Geometry: a gapless plane per cell
  const geometry = React.useMemo(() => {
    return new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
  }, []);

  // Material: shared across all instances, using the grid texture
  const material = React.useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: gridTexture,
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Update instance matrices and colors whenever the snapshot changes
  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { worldX, worldY, worldZ, cellFlags, count } = snapshot;
    const effectiveCount = Math.min(count, MAX_INSTANCES);

    for (let i = 0; i < effectiveCount; i++) {
      // Position: cell center X, object world Y + small offset for visibility, cell center Z
      tempPosition.set(worldX[i], worldY[i] + FOUNDATION_HEIGHT, worldZ[i]);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      mesh.setMatrixAt(i, tempMatrix);

      // Color by cell flag
      // If OCCUPIED bit is set, it's occupied. Otherwise if PADDED bit is set, it's padded.
      const isOccupied = (cellFlags[i] & CellFlags.OCCUPIED) !== 0;
      const color = isOccupied ? COLOR_OCCUPIED : COLOR_PADDED;
      mesh.setColorAt(i, color);
    }

    mesh.count = effectiveCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [snapshot]);

  // Don't render anything if no cells
  if (snapshot.count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_INSTANCES]}
      frustumCulled={false}
      receiveShadow
    />
  );
};
